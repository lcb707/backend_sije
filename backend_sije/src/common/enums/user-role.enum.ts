/**
 * 요청 주체의 역할.
 * - BUYER(주문자): 발주서 생성, 변경 요청 생성
 * - SOURCING(소싱팀): 발주서 확정, 변경 요청 승인/반려
 * - MANUFACTURER(생산자): 읽기 전용
 */
export enum UserRole {
  BUYER = 'BUYER',
  SOURCING = 'SOURCING',
  MANUFACTURER = 'MANUFACTURER',
}
