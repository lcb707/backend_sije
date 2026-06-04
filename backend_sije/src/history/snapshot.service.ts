import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PurchaseOrder } from '../orders/entities/purchase-order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { PurchaseOrderSnapshot } from './entities/purchase-order-snapshot.entity';

/**
 * 스냅샷 생성/버전 닫기 공용 로직. orders(생성)와 change-requests(승인)에서 주입해 쓴다.
 *
 * 모든 메서드는 호출자의 트랜잭션 `EntityManager` 를 받아 그 안에서 실행한다.
 * (CLAUDE.md §5: 트랜잭션 내부에서는 전달받은 manager 를 사용한다.)
 */
@Injectable()
export class SnapshotService {
  /**
   * 발주서의 현재 상태를 그대로 복제한 스냅샷을 만든다(버전 적용 시각 = validFrom).
   * 최신 버전이므로 validTo = null.
   */
  async createSnapshot(
    manager: EntityManager,
    order: PurchaseOrder,
    version: number,
    validFrom: Date,
    changeRequestId: number | null,
  ): Promise<PurchaseOrderSnapshot> {
    const repo = manager.getRepository(PurchaseOrderSnapshot);
    const snapshot = repo.create({
      orderId: order.id,
      version,
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      specs: order.specs,
      dueDate: order.dueDate,
      status: order.status,
      validFrom,
      validTo: null,
      changeRequestId,
    });
    return repo.save(snapshot);
  }

  /**
   * 직전 최신 스냅샷(valid_to IS NULL)의 구간을 closeAt 시각으로 닫는다.
   * 새 버전의 validFrom 과 동일한 시각을 넘겨 [from, to) 경계를 빈틈없이 잇는다.
   */
  async closeCurrentSnapshot(
    manager: EntityManager,
    orderId: number,
    closeAt: Date,
  ): Promise<void> {
    await manager
      .getRepository(PurchaseOrderSnapshot)
      .createQueryBuilder()
      .update(PurchaseOrderSnapshot)
      .set({ validTo: closeAt })
      .where('order_id = :orderId AND valid_to IS NULL', { orderId })
      .execute();
  }

  /**
   * 새 상태 구간을 연다(valid_to = NULL). 발주서 생성 시 초기 DRAFT 구간,
   * 상태 전이 시 새 상태 구간을 만들 때 호출한다.
   */
  async openStatusInterval(
    manager: EntityManager,
    orderId: number,
    status: OrderStatus,
    validFrom: Date,
    changedBy: string,
  ): Promise<OrderStatusHistory> {
    const repo = manager.getRepository(OrderStatusHistory);
    const interval = repo.create({
      orderId,
      status,
      validFrom,
      validTo: null,
      changedBy,
    });
    return repo.save(interval);
  }

  /** 현재 열린 상태 구간(valid_to IS NULL)을 closeAt 으로 닫는다. */
  async closeStatusInterval(
    manager: EntityManager,
    orderId: number,
    closeAt: Date,
  ): Promise<void> {
    await manager
      .getRepository(OrderStatusHistory)
      .createQueryBuilder()
      .update(OrderStatusHistory)
      .set({ validTo: closeAt })
      .where('order_id = :orderId AND valid_to IS NULL', { orderId })
      .execute();
  }

  /**
   * 특정 시점에 유효한 상태를 반환한다([valid_from, valid_to) 반열림).
   * 시점 조회의 status 보정에 쓰인다. 해당 구간이 없으면 null.
   */
  async getStatusAt(
    manager: EntityManager,
    orderId: number,
    timestamp: Date,
  ): Promise<OrderStatus | null> {
    const interval = await manager
      .getRepository(OrderStatusHistory)
      .createQueryBuilder('h')
      .where('h.order_id = :orderId', { orderId })
      .andWhere('h.valid_from <= :t', { t: timestamp })
      .andWhere('(h.valid_to IS NULL OR h.valid_to > :t)', { t: timestamp })
      .orderBy('h.valid_from', 'DESC')
      .getOne();
    return interval?.status ?? null;
  }
}
