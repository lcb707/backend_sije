import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthUser } from '../common/auth/auth-user';
import { ClockService } from '../common/clock/clock.service';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { ChangeRequestStatus } from '../common/enums/change-request-status.enum';
import { ChangeableField } from '../common/enums/changeable-field.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { OrderChangeLog } from '../history/entities/order-change-log.entity';
import { SnapshotService } from '../history/snapshot.service';
import { PurchaseOrder } from '../orders/entities/purchase-order.entity';
import { ChangeRequestsService } from './change-requests.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ChangeRequest } from './entities/change-request.entity';

/**
 * ChangeRequestsService 단위 테스트(DB 없이 Repository/DataSource 모킹).
 *
 * e2e 는 통합 플로우 검증이 본업이라 단일 MySQL 스키마를 공유해 순차 실행이 강제된다
 * (ARCHITECTURE.md §11). 비즈니스 규칙(권한/상태/중복 PENDING/실질변경)은 DB 없이도
 * 검증 가능하므로, 빠르고 병렬 가능한 단위 테스트로 분기별 규칙을 촘촘히 덮는다.
 */
describe('ChangeRequestsService (unit)', () => {
  const FIXED_NOW = new Date('2025-02-16T00:00:00.000Z');
  const REVIEWER: AuthUser = { userId: 'sourcing-1', role: UserRole.SOURCING };

  let service: ChangeRequestsService;
  let changeRequestRepo: jest.Mocked<Repository<ChangeRequest>>;
  let orderRepo: jest.Mocked<Repository<PurchaseOrder>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction' | 'manager'>>;
  let snapshotService: jest.Mocked<
    Pick<
      SnapshotService,
      | 'closeCurrentSnapshot'
      | 'createSnapshot'
      | 'closeStatusInterval'
      | 'openStatusInterval'
    >
  >;
  let clock: jest.Mocked<Pick<ClockService, 'now'>>;

  /** 트랜잭션 콜백에 넘길 가짜 manager. getRepository 로 엔티티별 repo 를 돌려준다. */
  let txManager: { getRepository: jest.Mock };
  let txOrderRepo: jest.Mocked<Repository<PurchaseOrder>>;
  let txChangeRequestRepo: jest.Mocked<Repository<ChangeRequest>>;
  let txLogRepo: jest.Mocked<Repository<OrderChangeLog>>;

  function mockRepo<T extends object>(): jest.Mocked<Repository<T>> {
    return {
      findOne: jest.fn(),
      find: jest.fn(),
      exists: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => x),
    } as unknown as jest.Mocked<Repository<T>>;
  }

  function buildOrder(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
    return {
      id: 1,
      productName: '면 티셔츠',
      quantity: 1000,
      unitPrice: 5000,
      specs: { color: 'white' },
      dueDate: '2025-03-15',
      status: OrderStatus.CONFIRMED,
      currentVersion: 1,
      createdBy: 'buyer-1',
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      ...overrides,
    } as PurchaseOrder;
  }

  function buildPendingChangeRequest(
    overrides: Partial<ChangeRequest> = {},
  ): ChangeRequest {
    return {
      id: 10,
      orderId: 1,
      reason: '고객사 추가 주문으로 수량 상향',
      status: ChangeRequestStatus.PENDING,
      requestedBy: 'buyer-1',
      items: [
        {
          id: 1,
          changeRequestId: 10,
          field: ChangeableField.QUANTITY,
          path: null,
          newValue: 1500,
        },
      ],
      ...overrides,
    } as ChangeRequest;
  }

  beforeEach(() => {
    changeRequestRepo = mockRepo<ChangeRequest>();
    orderRepo = mockRepo<PurchaseOrder>();

    txOrderRepo = mockRepo<PurchaseOrder>();
    txChangeRequestRepo = mockRepo<ChangeRequest>();
    txLogRepo = mockRepo<OrderChangeLog>();
    txManager = {
      getRepository: jest.fn((entity) => {
        if (entity === PurchaseOrder) return txOrderRepo;
        if (entity === ChangeRequest) return txChangeRequestRepo;
        if (entity === OrderChangeLog) return txLogRepo;
        throw new Error(`unexpected entity in test: ${String(entity)}`);
      }),
    };

    dataSource = {
      // 트랜잭션 콜백을 가짜 manager 로 즉시 실행한다.
      transaction: jest.fn((cb) =>
        (cb as (m: EntityManager) => unknown)(
          txManager as unknown as EntityManager,
        ),
      ),
      // reject 는 dataSource.manager 를 직접 쓴다.
      manager: txManager as unknown as EntityManager,
    } as unknown as jest.Mocked<Pick<DataSource, 'transaction' | 'manager'>>;

    snapshotService = {
      closeCurrentSnapshot: jest.fn(),
      createSnapshot: jest.fn(),
      closeStatusInterval: jest.fn(),
      openStatusInterval: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<
        SnapshotService,
        | 'closeCurrentSnapshot'
        | 'createSnapshot'
        | 'closeStatusInterval'
        | 'openStatusInterval'
      >
    >;
    clock = { now: jest.fn(() => FIXED_NOW) };

    service = new ChangeRequestsService(
      changeRequestRepo,
      orderRepo,
      dataSource as unknown as DataSource,
      snapshotService as unknown as SnapshotService,
      clock as unknown as ClockService,
    );
  });

  describe('create', () => {
    const dto: CreateChangeRequestDto = {
      reason: '고객사 추가 주문으로 수량 상향',
      items: [{ field: ChangeableField.QUANTITY, path: null, newValue: 1500 }],
    } as unknown as CreateChangeRequestDto;

    it('발주서가 없으면 404', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.create(1, dto, 'buyer-1')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.ORDER_NOT_FOUND),
      );
    });

    it('CONFIRMED 미만이면 409', async () => {
      orderRepo.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.DRAFT }),
      );

      await expect(service.create(1, dto, 'buyer-1')).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.CHANGE_REQUEST_REQUIRES_CONFIRMED),
      );
    });

    it('COMPLETED 발주서면 409', async () => {
      orderRepo.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.COMPLETED }),
      );

      await expect(service.create(1, dto, 'buyer-1')).rejects.toThrow(
        new ConflictException(
          ERROR_MESSAGES.CHANGE_REQUEST_NOT_ALLOWED_WHEN_COMPLETED,
        ),
      );
    });

    it('PENDING 변경요청이 이미 있으면 409', async () => {
      orderRepo.findOne.mockResolvedValue(buildOrder());
      changeRequestRepo.exists.mockResolvedValue(true);

      await expect(service.create(1, dto, 'buyer-1')).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.PENDING_CHANGE_REQUEST_EXISTS),
      );
    });

    it('규칙을 모두 통과하면 PENDING 변경요청을 저장한다', async () => {
      orderRepo.findOne.mockResolvedValue(buildOrder());
      changeRequestRepo.exists.mockResolvedValue(false);

      await service.create(1, dto, 'buyer-1');

      expect(changeRequestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 1,
          status: ChangeRequestStatus.PENDING,
          requestedBy: 'buyer-1',
        }),
      );
      expect(changeRequestRepo.save).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('변경요청이 없으면 404', async () => {
      txChangeRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.approve(10, '승인합니다', REVIEWER)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.CHANGE_REQUEST_NOT_FOUND),
      );
    });

    it('PENDING 이 아니면 409', async () => {
      txChangeRequestRepo.findOne.mockResolvedValue(
        buildPendingChangeRequest({ status: ChangeRequestStatus.APPROVED }),
      );

      await expect(service.approve(10, '승인합니다', REVIEWER)).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.ONLY_PENDING_CAN_BE_REVIEWED),
      );
    });

    it('COMPLETED 발주서면 409 이고 스냅샷을 만들지 않는다', async () => {
      txChangeRequestRepo.findOne.mockResolvedValue(
        buildPendingChangeRequest(),
      );
      txOrderRepo.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.COMPLETED }),
      );

      await expect(service.approve(10, '승인합니다', REVIEWER)).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.ORDER_ALREADY_COMPLETED),
      );
      expect(snapshotService.createSnapshot).not.toHaveBeenCalled();
    });

    it('요청값이 기존값과 모두 같으면 422(실질 변경 없음)', async () => {
      txChangeRequestRepo.findOne.mockResolvedValue(
        buildPendingChangeRequest({
          items: [
            {
              id: 1,
              changeRequestId: 10,
              field: ChangeableField.QUANTITY,
              path: null,
              newValue: 1000, // 발주서 현재 수량과 동일
            },
          ],
        } as Partial<ChangeRequest>),
      );
      txOrderRepo.findOne.mockResolvedValue(buildOrder({ quantity: 1000 }));

      await expect(service.approve(10, '승인합니다', REVIEWER)).rejects.toThrow(
        new UnprocessableEntityException(ERROR_MESSAGES.NO_EFFECTIVE_CHANGE),
      );
      expect(snapshotService.createSnapshot).not.toHaveBeenCalled();
    });

    it('여러 필드를 한 버전으로 반영하고 델타·스냅샷을 함께 저장한다', async () => {
      txChangeRequestRepo.findOne.mockResolvedValue(
        buildPendingChangeRequest({
          items: [
            {
              id: 1,
              changeRequestId: 10,
              field: ChangeableField.QUANTITY,
              path: null,
              newValue: 1500,
            },
            {
              id: 2,
              changeRequestId: 10,
              field: ChangeableField.DUE_DATE,
              path: null,
              newValue: '2025-03-25',
            },
          ],
        } as Partial<ChangeRequest>),
      );
      const order = buildOrder({ currentVersion: 1 });
      txOrderRepo.findOne.mockResolvedValue(order);

      const result = await service.approve(10, '승인합니다', REVIEWER);

      // 단일 버전 증가(여러 필드 변경 → 하나의 버전).
      expect(order.currentVersion).toBe(2);
      expect(order.quantity).toBe(1500);
      expect(order.dueDate).toBe('2025-03-25');

      // 직전 스냅샷 닫기 → 새 스냅샷 생성이 같은 트랜잭션에서 일어난다.
      expect(snapshotService.closeCurrentSnapshot).toHaveBeenCalledWith(
        txManager,
        1,
        FIXED_NOW,
      );
      expect(snapshotService.createSnapshot).toHaveBeenCalledWith(
        txManager,
        order,
        2,
        FIXED_NOW,
        10,
      );

      // 변경된 두 필드만큼 델타 로그가 저장된다.
      const savedLogs = txLogRepo.save.mock.calls[0][0] as OrderChangeLog[];
      expect(savedLogs).toHaveLength(2);

      expect(result.status).toBe(ChangeRequestStatus.APPROVED);
      expect(result.resultingVersion).toBe(2);
      expect(result.reviewedBy).toBe(REVIEWER.userId);

      // 승인은 발주서 상태를 바꾸지 않지만(CONFIRMED 유지), 상태 이력에는 승인 시점을
      // 동일 상태 구간으로 기록한다(직전 구간 닫고 같은 상태로 새 구간 열기).
      expect(order.status).toBe(OrderStatus.CONFIRMED);
      expect(snapshotService.closeStatusInterval).toHaveBeenCalledWith(
        txManager,
        1,
        FIXED_NOW,
      );
      expect(snapshotService.openStatusInterval).toHaveBeenCalledWith(
        txManager,
        1,
        OrderStatus.CONFIRMED,
        FIXED_NOW,
        REVIEWER.userId,
      );
    });
  });

  describe('reject', () => {
    it('변경요청을 REJECTED 로 바꾸고 발주서·스냅샷은 건드리지 않는다', async () => {
      txChangeRequestRepo.findOne.mockResolvedValue(
        buildPendingChangeRequest(),
      );

      const result = await service.reject(10, '반려합니다', REVIEWER);

      expect(result.status).toBe(ChangeRequestStatus.REJECTED);
      expect(result.reviewedBy).toBe(REVIEWER.userId);
      expect(result.reviewComment).toBe('반려합니다');
      expect(snapshotService.createSnapshot).not.toHaveBeenCalled();
      expect(changeRequestRepo.save).toHaveBeenCalled();
    });

    it('PENDING 이 아니면 409', async () => {
      txChangeRequestRepo.findOne.mockResolvedValue(
        buildPendingChangeRequest({ status: ChangeRequestStatus.REJECTED }),
      );

      await expect(service.reject(10, '반려합니다', REVIEWER)).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.ONLY_PENDING_CAN_BE_REVIEWED),
      );
    });
  });
});
