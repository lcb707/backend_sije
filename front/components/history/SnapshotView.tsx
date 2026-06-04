import type { SnapshotState } from '@/lib/types';
import { StatusBadge } from '@/components/orders/StatusBadge';

/** 특정 버전/시점의 발주서 전체 상태를 표로 표시. */
export function SnapshotView({ s }: { s: SnapshotState }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">버전 {s.version}</span>
        <StatusBadge status={s.status} size="sm" />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Field label="상품명" value={s.productName} />
        <Field label="수량" value={`${s.quantity.toLocaleString()}벌`} />
        <Field label="단가" value={`₩${s.unitPrice.toLocaleString()}`} />
        <Field label="납기일" value={s.dueDate} />
        <Field
          label="사양"
          value={Object.entries(s.specs)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}
        />
      </dl>
      <p className="mt-3 text-xs text-gray-400">
        유효: {new Date(s.validFrom).toLocaleString('ko-KR')} ~{' '}
        {s.validTo ? new Date(s.validTo).toLocaleString('ko-KR') : '현재'}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
