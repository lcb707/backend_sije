import { ChangeableField } from '../common/enums/changeable-field.enum';
import {
  FIELD_ACCESSORS,
  isScalarField,
} from '../common/types/order-field.accessors';
import { ChangeableValue, OrderSpecs } from '../common/types/order-field.types';
import { PurchaseOrder } from '../orders/entities/purchase-order.entity';

/**
 * 변경 항목이 가리키는 "현재 값"을 읽는다.
 * path 가 있으면(specs 의 한 키) 그 키의 값을, 없으면 필드 전체 값을 반환한다.
 * specs 에 없는 키를 path 로 지정하면(신규 사양 추가) undefined 를 반환한다.
 *
 * 스칼라 필드 접근은 FIELD_ACCESSORS(단일 진실 소스)에 위임한다.
 */
export function readField(
  order: PurchaseOrder,
  field: ChangeableField,
  path?: string | null,
): ChangeableValue | undefined {
  if (field === ChangeableField.SPECS) {
    return path ? order.specs?.[path] : order.specs;
  }
  return FIELD_ACCESSORS[field].get(order);
}

/**
 * 변경 항목의 새 값을 발주서에 적용한다(검증은 DTO 단계에서 완료된 값 전제).
 * path 가 있으면 specs 의 그 키만 갱신하고, 다른 specs 키는 보존한다.
 *
 * 스칼라 필드 적용은 FIELD_ACCESSORS(단일 진실 소스)에 위임한다.
 */
export function applyField(
  order: PurchaseOrder,
  field: ChangeableField,
  value: ChangeableValue,
  path?: string | null,
): void {
  if (field === ChangeableField.SPECS) {
    if (path) {
      // 기존 사양을 보존한 채 해당 키만 교체(불변 갱신으로 TypeORM 변경 감지 보장).
      const nextSpecs: OrderSpecs = { ...(order.specs ?? {}) };
      nextSpecs[path] = value as string | number;
      order.specs = nextSpecs;
      return;
    }
    order.specs = value as OrderSpecs;
    return;
  }
  if (isScalarField(field)) {
    FIELD_ACCESSORS[field].set(order, value);
  }
}

/**
 * 값 동등 비교. specs(객체)는 직렬화 비교, 원시값은 직접 비교.
 * 신규 사양 키 추가 등으로 한쪽이 undefined 일 수 있다(이 경우 양쪽 모두 undefined 여야 동일).
 */
export function valuesEqual(
  a: ChangeableValue | undefined,
  b: ChangeableValue | undefined,
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}
