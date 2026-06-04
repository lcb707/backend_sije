/**
 * 변경 요청 상태.
 * PENDING(승인 대기) → APPROVED(승인·반영) 또는 REJECTED(반려).
 */
export enum ChangeRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
