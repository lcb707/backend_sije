import { OrderStatus } from '../enums/order-status.enum';

/**
 * "CONFIRMED 이상" 같은 순서 비교를 위한 순위 맵.
 * 라이프사이클 진행 순서대로 단조 증가한다.
 */
export const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  [OrderStatus.DRAFT]: 0,
  [OrderStatus.PENDING]: 1,
  [OrderStatus.CONFIRMED]: 2,
  [OrderStatus.IN_PRODUCTION]: 3,
  [OrderStatus.COMPLETED]: 4,
};

/** status 가 기준 상태 이상인지(>=) 판정. 변경 요청 가능 조건(CONFIRMED 이상) 등에 사용. */
export function isAtLeast(status: OrderStatus, minimum: OrderStatus): boolean {
  return ORDER_STATUS_RANK[status] >= ORDER_STATUS_RANK[minimum];
}
