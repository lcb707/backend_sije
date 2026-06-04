/**
 * 발주서 상태. plan.md 의 라이프사이클을 그대로 표현한다.
 * DRAFT → PENDING → CONFIRMED → IN_PRODUCTION → COMPLETED
 */
export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  COMPLETED = 'COMPLETED',
}
