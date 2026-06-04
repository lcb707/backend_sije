/**
 * 발주서 사양(색상/사이즈 등). 가변 속성이므로 문자열 키-값 맵으로 둔다(스냅샷에 JSON 저장).
 * 허용 키는 spec_keys 마스터 테이블로 제한한다(검증은 SpecKeyService, 쓰기 경로에서만).
 */
export type OrderSpecs = Record<string, string | number>;

/**
 * 변경 가능한 필드가 가질 수 있는 값의 합 타입. `any` 대신 사용한다.
 * - productName: string
 * - quantity / unitPrice: number
 * - dueDate: ISO 날짜 문자열(예: '2025-03-15')
 * - specs: OrderSpecs
 */
export type ChangeableValue = string | number | OrderSpecs;
