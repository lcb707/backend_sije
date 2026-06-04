import { OrderStatus } from '../enums/order-status.enum';

/**
 * 허용된 상태 전이 맵. 키 상태에서 값 배열의 상태로만 이동할 수 있다.
 * 정의되지 않은 전이는 모두 거부(409).
 */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING],
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]: [OrderStatus.IN_PRODUCTION],
  [OrderStatus.IN_PRODUCTION]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}
