import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthUser } from '../common/auth/auth-user';
import { ClockService } from '../common/clock/clock.service';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { isAtLeast } from '../common/constants/order-status-rank';
import { ChangeRequestStatus } from '../common/enums/change-request-status.enum';
import { ChangeableField } from '../common/enums/changeable-field.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderSpecs } from '../common/types/order-field.types';
import { OrderChangeLog } from '../history/entities/order-change-log.entity';
import { SnapshotService } from '../history/snapshot.service';
import { PurchaseOrder } from '../orders/entities/purchase-order.entity';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ChangeRequestItem } from './entities/change-request-item.entity';
import { ChangeRequest } from './entities/change-request.entity';
import { applyField, readField, valuesEqual } from './order-field.util';

@Injectable()
export class ChangeRequestsService {
  constructor(
    @InjectRepository(ChangeRequest)
    private readonly changeRequestRepo: Repository<ChangeRequest>,
    @InjectRepository(PurchaseOrder)
    private readonly orderRepo: Repository<PurchaseOrder>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly snapshotService: SnapshotService,
    private readonly clock: ClockService,
  ) {}

  /**
   * 변경 요청 생성(주문자). 검증 순서:
   *  1) 발주서 존재(404)  2) CONFIRMED 이상(409)  3) PENDING 변경요청 중복(409)
   * (역할=BUYER 와 items>=1 은 가드/DTO 에서 1차 차단된다.)
   */
  async create(
    orderId: number,
    dto: CreateChangeRequestDto,
    buyerId: string,
  ): Promise<ChangeRequest> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(ERROR_MESSAGES.ORDER_NOT_FOUND);
    }
    if (!isAtLeast(order.status, OrderStatus.CONFIRMED)) {
      throw new ConflictException(
        ERROR_MESSAGES.CHANGE_REQUEST_REQUIRES_CONFIRMED,
      );
    }
    // 완료된 발주서는 더 이상 변경 대상이 아니다(승인해도 반영할 수 없으므로 생성 단계에서 차단).
    if (order.status === OrderStatus.COMPLETED) {
      throw new ConflictException(
        ERROR_MESSAGES.CHANGE_REQUEST_NOT_ALLOWED_WHEN_COMPLETED,
      );
    }
    const pendingExists = await this.changeRequestRepo.exists({
      where: { orderId, status: ChangeRequestStatus.PENDING },
    });
    if (pendingExists) {
      throw new ConflictException(ERROR_MESSAGES.PENDING_CHANGE_REQUEST_EXISTS);
    }

    // specs 변경은 발주서 생성 시 정의된 키만 대상으로 한다(신규 사양 키 추가 불가).
    this.assertKnownSpecKeys(order, dto);

    const changeRequest = this.changeRequestRepo.create({
      orderId,
      reason: dto.reason,
      status: ChangeRequestStatus.PENDING,
      requestedBy: buyerId,
      items: dto.items.map(
        (item) =>
          ({
            field: item.field,
            path: item.path ?? null,
            newValue: item.newValue,
          }) as ChangeRequestItem,
      ),
    });
    return this.changeRequestRepo.save(changeRequest);
  }

  /** 발주서별 변경요청 목록(최신순) + 전체 개수. 페이지네이션은 limit/offset. */
  async listByOrder(
    orderId: number,
    limit: number,
    offset: number,
  ): Promise<[ChangeRequest[], number]> {
    return this.changeRequestRepo.findAndCount({
      where: { orderId },
      relations: { items: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * 승인(소싱). 발주서 업데이트 + 스냅샷 + 델타 저장을 단일 트랜잭션으로.
   * 검증: 변경요청 존재(404), PENDING 여부(409). (역할=SOURCING 은 가드에서 차단.)
   */
  async approve(
    changeRequestId: number,
    reviewComment: string,
    reviewer: AuthUser,
  ): Promise<ChangeRequest> {
    const now = this.clock.now();
    return this.dataSource.transaction(async (manager) => {
      const cr = await this.loadPendingForReview(manager, changeRequestId);

      const orderRepo = manager.getRepository(PurchaseOrder);
      const order = await orderRepo.findOne({ where: { id: cr.orderId } });
      if (!order) {
        // 변경요청이 가리키는 발주서가 사라진 경우(정상 흐름에선 발생하지 않음).
        throw new NotFoundException(ERROR_MESSAGES.ORDER_NOT_FOUND);
      }
      // PROD-NOTE: 실서비스에서는 동시 승인 충돌(lost update) 방지를 위해 PurchaseOrder 에
      // @VersionColumn 낙관적 락 + 충돌 시 재시도가 필요. 과제 범위 제외로 미구현.
      // (근거: docs/DESIGN_DECISIONS.md §5)

      // 완료된 발주서는 더 이상 변경을 반영하지 않는다(완료 시 PENDING 자동 반려와 짝을 이루는 방어).
      if (order.status === OrderStatus.COMPLETED) {
        throw new ConflictException(ERROR_MESSAGES.ORDER_ALREADY_COMPLETED);
      }

      const newVersion = order.currentVersion + 1;

      // 실제로 값이 바뀐 필드만 델타로 기록(요청했으나 동일 값이면 제외).
      const logs: OrderChangeLog[] = [];
      const logRepo = manager.getRepository(OrderChangeLog);
      for (const item of cr.items) {
        const oldValue = readField(order, item.field, item.path);
        if (valuesEqual(oldValue, item.newValue)) {
          continue;
        }
        applyField(order, item.field, item.newValue, item.path);
        logs.push(
          logRepo.create({
            orderId: order.id,
            version: newVersion,
            changeRequestId: cr.id,
            field: item.field,
            path: item.path,
            oldValue: oldValue ?? null,
            newValue: item.newValue,
            reason: cr.reason,
            changedBy: reviewer.userId,
          }),
        );
      }

      // 실질 변경이 없으면(모든 항목이 기존값과 동일) 빈 버전을 만들지 않고 거부한다.
      // 스냅샷·버전 증가 이전에 던져 트랜잭션 전체를 롤백한다.
      if (logs.length === 0) {
        throw new UnprocessableEntityException(
          ERROR_MESSAGES.NO_EFFECTIVE_CHANGE,
        );
      }

      // 직전 최신 스냅샷 구간을 now 로 닫고(=새 버전 validFrom), 본체 갱신 → 새 스냅샷 → 델타 저장.
      await this.snapshotService.closeCurrentSnapshot(manager, order.id, now);
      order.currentVersion = newVersion;
      await orderRepo.save(order);
      await this.snapshotService.createSnapshot(
        manager,
        order,
        newVersion,
        now,
        cr.id,
      );
      await logRepo.save(logs);

      // 승인은 발주서 상태를 바꾸지 않는다(생산중→생산중, 확정→확정). 그러나 "언제 변경이
      // 승인·반영됐는지"를 상태 이력에서도 추적할 수 있도록, 현재 구간을 now 로 닫고 동일
      // 상태로 새 구간을 연다. → 시점 조회 시 승인 경계가 status_history 에 구간으로 남는다.
      await this.snapshotService.closeStatusInterval(manager, order.id, now);
      await this.snapshotService.openStatusInterval(
        manager,
        order.id,
        order.status,
        now,
        reviewer.userId,
      );

      cr.status = ChangeRequestStatus.APPROVED;
      cr.reviewedBy = reviewer.userId;
      cr.reviewComment = reviewComment;
      cr.reviewedAt = now;
      cr.resultingVersion = newVersion;
      return manager.getRepository(ChangeRequest).save(cr);
    });
  }

  /** 반려(소싱). 변경요청만 REJECTED 로 갱신, 발주서·스냅샷·델타는 불변. */
  async reject(
    changeRequestId: number,
    reviewComment: string,
    reviewer: AuthUser,
  ): Promise<ChangeRequest> {
    const now = this.clock.now();
    const cr = await this.loadPendingForReview(
      this.dataSource.manager,
      changeRequestId,
    );
    cr.status = ChangeRequestStatus.REJECTED;
    cr.reviewedBy = reviewer.userId;
    cr.reviewComment = reviewComment;
    cr.reviewedAt = now;
    return this.changeRequestRepo.save(cr);
  }

  /**
   * 변경요청의 specs 항목이 발주서에 이미 존재하는 키만 대상으로 하는지 검증한다.
   * - path 지정(키 하나 변경): 그 키가 기존 specs 에 없으면 422.
   * - path 없음(specs 전체 교체): 교체본의 키가 기존 specs 키 집합을 벗어나면 422.
   * (신규 사양 키 추가는 발주서 변경요청 범위 밖 — 생성 시 정의한 키만 변경 가능.)
   */
  private assertKnownSpecKeys(
    order: PurchaseOrder,
    dto: CreateChangeRequestDto,
  ): void {
    const existingKeys = new Set(Object.keys(order.specs ?? {}));
    for (const item of dto.items) {
      if (item.field !== ChangeableField.SPECS) {
        continue;
      }
      if (item.path) {
        if (!existingKeys.has(item.path)) {
          throw new UnprocessableEntityException(
            ERROR_MESSAGES.UNKNOWN_SPEC_KEY,
          );
        }
        continue;
      }
      // path 없는 전체 교체: 새 객체의 키가 모두 기존 키 집합에 속해야 한다.
      const replacement = item.newValue as OrderSpecs;
      for (const key of Object.keys(replacement)) {
        if (!existingKeys.has(key)) {
          throw new UnprocessableEntityException(
            ERROR_MESSAGES.UNKNOWN_SPEC_KEY,
          );
        }
      }
    }
  }

  /** 승인/반려 대상 변경요청을 로드하고 PENDING 인지 검증한다. */
  private async loadPendingForReview(
    manager: EntityManager,
    changeRequestId: number,
  ): Promise<ChangeRequest> {
    const cr = await manager.getRepository(ChangeRequest).findOne({
      where: { id: changeRequestId },
      relations: { items: true },
    });
    if (!cr) {
      throw new NotFoundException(ERROR_MESSAGES.CHANGE_REQUEST_NOT_FOUND);
    }
    if (cr.status !== ChangeRequestStatus.PENDING) {
      throw new ConflictException(ERROR_MESSAGES.ONLY_PENDING_CAN_BE_REVIEWED);
    }
    return cr;
  }
}
