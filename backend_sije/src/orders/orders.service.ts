import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChangeRequest } from '../change-requests/entities/change-request.entity';
import { ClockService } from '../common/clock/clock.service';
import {
  AUTO_REJECT_ON_COMPLETION_COMMENT,
  ERROR_MESSAGES,
} from '../common/constants/error-messages';
import { canTransition } from '../common/constants/order-status-transitions';
import { ChangeRequestStatus } from '../common/enums/change-request-status.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { SnapshotService } from '../history/snapshot.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { SpecKeyService } from './spec-key.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly orderRepo: Repository<PurchaseOrder>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly snapshotService: SnapshotService,
    private readonly specKeyService: SpecKeyService,
    private readonly clock: ClockService,
  ) {}

  /**
   * 발주서 생성 + 버전1 스냅샷을 단일 트랜잭션으로 저장한다.
   * 생성 시점에 버전1 스냅샷을 만들어야 초기 버전 조회/비교가 가능하다.
   *
   * specs 키는 허용 마스터(spec_keys)에 정의된 키만 받는다(미정의 키 → 422).
   */
  async create(dto: CreateOrderDto, buyerId: string): Promise<PurchaseOrder> {
    // 트랜잭션 진입 전에 키 허용 여부를 검증한다(읽기 전용 조회, 쓰기 경합 없음).
    await this.specKeyService.assertKeysAllowed(Object.keys(dto.specs ?? {}));

    const now = this.clock.now();
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(PurchaseOrder);
      const order = orderRepo.create({
        productName: dto.productName,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        specs: dto.specs,
        dueDate: dto.dueDate,
        status: OrderStatus.DRAFT,
        currentVersion: 1,
        createdBy: buyerId,
      });
      const saved = await orderRepo.save(order);

      await this.snapshotService.createSnapshot(manager, saved, 1, now, null);
      // 상태 이력의 시작 구간(DRAFT). 시점 조회 status 보정의 기준점이 된다.
      await this.snapshotService.openStatusInterval(
        manager,
        saved.id,
        OrderStatus.DRAFT,
        now,
        buyerId,
      );
      return saved;
    });
  }

  /** 발주서 목록(최신 생성순) + 전체 개수. 페이지네이션은 limit/offset. */
  async findAll(
    limit: number,
    offset: number,
  ): Promise<[PurchaseOrder[], number]> {
    return this.orderRepo.findAndCount({
      order: { id: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /** 현재 상태 조회. 없으면 404. */
  async findOne(id: number): Promise<PurchaseOrder> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(ERROR_MESSAGES.ORDER_NOT_FOUND);
    }
    return order;
  }

  /**
   * 상태 전이. 허용되지 않은 전이는 409, 역할 위반은 403.
   *
   * 권한: 발주서 제출(DRAFT→PENDING)은 주문자(BUYER), 그 외 전이(확정·생산·완료)는 소싱(SOURCING).
   * (plan.md: 확정은 소싱이 수행. 제출은 주문자가 자신의 작성본을 검토 요청하는 행위로 본다.)
   *
   * 상태만 바뀌는 경우 새 스냅샷(값 버전)은 만들지 않는다(버전 = 내용 변경 이력이라는 정의 유지).
   * 대신 상태 전이는 order_status_history 에 [valid_from, valid_to) 구간으로 기록해
   * 시점 조회 시 status 가 실제와 어긋나지 않도록 한다.
   *
   * COMPLETED 전이 시 미결(PENDING) 변경요청은 자동 반려한다(완료 후 잔존/모순 방지).
   * 위 작업들은 단일 트랜잭션으로 묶는다.
   */
  async updateStatus(
    id: number,
    next: OrderStatus,
    actor: { role: UserRole; userId: string },
  ): Promise<PurchaseOrder> {
    const now = this.clock.now();
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(PurchaseOrder);
      const order = await orderRepo.findOne({ where: { id } });
      if (!order) {
        throw new NotFoundException(ERROR_MESSAGES.ORDER_NOT_FOUND);
      }
      if (order.status === next || !canTransition(order.status, next)) {
        throw new ConflictException(
          `${ERROR_MESSAGES.INVALID_STATUS_TRANSITION} (${order.status} → ${next})`,
        );
      }

      const requiredRole =
        order.status === OrderStatus.DRAFT ? UserRole.BUYER : UserRole.SOURCING;
      if (actor.role !== requiredRole) {
        throw new ForbiddenException(
          `이 상태 전이는 ${requiredRole} 역할만 수행할 수 있습니다.`,
        );
      }

      // 완료 처리 시 미결 변경요청을 자동 반려한다(검토 의견·시각 기록).
      if (next === OrderStatus.COMPLETED) {
        await manager.getRepository(ChangeRequest).update(
          { orderId: id, status: ChangeRequestStatus.PENDING },
          {
            status: ChangeRequestStatus.REJECTED,
            reviewedBy: actor.userId,
            reviewComment: AUTO_REJECT_ON_COMPLETION_COMMENT,
            reviewedAt: now,
          },
        );
      }

      order.status = next;
      const saved = await orderRepo.save(order);

      // 직전 상태 구간을 now 로 닫고 새 상태 구간을 연다.
      await this.snapshotService.closeStatusInterval(manager, id, now);
      await this.snapshotService.openStatusInterval(
        manager,
        id,
        next,
        now,
        actor.userId,
      );
      return saved;
    });
  }
}
