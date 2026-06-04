/**
 * 변경 요청으로 바꿀 수 있는 발주서 필드.
 * 값(문자열)은 PurchaseOrder/스냅샷의 프로퍼티명과 1:1로 맞춰, 적용·비교 시 키로 직접 사용한다.
 */
export enum ChangeableField {
  PRODUCT_NAME = 'productName',
  QUANTITY = 'quantity',
  UNIT_PRICE = 'unitPrice',
  SPECS = 'specs',
  DUE_DATE = 'dueDate',
}
