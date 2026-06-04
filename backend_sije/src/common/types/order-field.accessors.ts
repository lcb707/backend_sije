import { ChangeableField } from '../enums/changeable-field.enum';
import { PurchaseOrderSnapshot } from '../../history/entities/purchase-order-snapshot.entity';
import { PurchaseOrder } from '../../orders/entities/purchase-order.entity';
import { ChangeableValue } from './order-field.types';

/**
 * 변경 가능 필드 중 specs 를 제외한 "스칼라" 필드.
 * specs 는 path(하위 키) 기반 부분 갱신·키별 비교가 특수해 별도 분기로 다룬다.
 */
export type ScalarChangeableField = Exclude<
  ChangeableField,
  ChangeableField.SPECS
>;

/** 발주서/스냅샷은 변경 가능 필드의 프로퍼티명을 공유하므로 읽기는 공용 소스로 받는다. */
type FieldSource = PurchaseOrder | PurchaseOrderSnapshot;

interface FieldAccessor {
  /** 발주서/스냅샷에서 해당 필드의 현재 값을 읽는다. */
  get(source: FieldSource): ChangeableValue;
  /** 발주서에 새 값을 적용한다(쓰기는 발주서에만 일어난다). */
  set(order: PurchaseOrder, value: ChangeableValue): void;
}

/**
 * "필드 → 접근자" 단일 진실 소스.
 * 필드 읽기/쓰기 switch 를 한 곳으로 모아, 필드가 추가되면 여기에만 항목을 더하면 된다.
 * Record 키를 enum 으로 강제하므로 누락 시 컴파일 에러로 막힌다.
 */
export const FIELD_ACCESSORS: Record<ScalarChangeableField, FieldAccessor> = {
  [ChangeableField.PRODUCT_NAME]: {
    get: (s) => s.productName,
    set: (o, v) => {
      o.productName = v as string;
    },
  },
  [ChangeableField.QUANTITY]: {
    get: (s) => s.quantity,
    set: (o, v) => {
      o.quantity = v as number;
    },
  },
  [ChangeableField.UNIT_PRICE]: {
    get: (s) => s.unitPrice,
    set: (o, v) => {
      o.unitPrice = v as number;
    },
  },
  [ChangeableField.DUE_DATE]: {
    get: (s) => s.dueDate,
    set: (o, v) => {
      o.dueDate = v as string;
    },
  },
};

/** field 가 specs 가 아닌 스칼라 필드인지 좁히는 타입 가드. */
export function isScalarField(
  field: ChangeableField,
): field is ScalarChangeableField {
  return field !== ChangeableField.SPECS;
}
