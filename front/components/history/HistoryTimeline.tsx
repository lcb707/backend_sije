'use client';

import { useCallback, useEffect, useState } from 'react';
import { historyApi } from '@/lib/api';
import { CR_STATUS_META, fieldLabel } from '@/lib/constants';
import type { ChangeLog, HistoryEntry, SnapshotState } from '@/lib/types';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** 델타 한 줄: 필드(+path) old→new + 사유. */
function ChangeLine({ c }: { c: ChangeLog }) {
  return (
    <li className="text-sm">
      <span className="font-medium text-gray-700">
        {fieldLabel(c.field, c.path)}
      </span>
      : <span className="text-red-600 line-through">{fmt(c.oldValue)}</span>
      {' → '}
      <span className="text-green-700">{fmt(c.newValue)}</span>
      <span className="ml-2 text-xs text-gray-400">({c.reason})</span>
    </li>
  );
}

/** 그 버전/시점의 발주서 전체 상세(품명·수량·단가·납기·사양). 이력 항목마다 펼쳐 보여준다. */
function StateDetails({ s }: { s: SnapshotState }) {
  return (
    <dl className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-2 text-xs sm:grid-cols-3">
      <DetailField label="상품명" value={s.productName} />
      <DetailField label="수량" value={`${s.quantity.toLocaleString()}벌`} />
      <DetailField label="단가" value={`₩${s.unitPrice.toLocaleString()}`} />
      <DetailField label="납기일" value={s.dueDate} />
      <DetailField
        label="사양"
        value={Object.entries(s.specs)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}
      />
    </dl>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-800">{value}</dd>
    </div>
  );
}

/** 승인되어 버전이 생긴 이력 항목. */
function VersionEntry({ entry }: { entry: HistoryEntry }) {
  return (
    <li className="relative">
      <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
        {entry.version}
      </span>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">
            버전 {entry.version}
          </span>
          <div className="flex items-center gap-2">
            {entry.state && <StatusBadge status={entry.state.status} size="sm" />}
            <span className="text-xs text-gray-400">
              {new Date(entry.occurredAt).toLocaleString('ko-KR')}
            </span>
          </div>
        </div>

        {entry.changes.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">최초 생성</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {entry.changes.map((c, i) => (
              <ChangeLine key={i} c={c} />
            ))}
          </ul>
        )}

        {/* 해당 버전의 발주서 전체 상세를 함께 표시. */}
        {entry.state && <StateDetails s={entry.state} />}
      </div>
    </li>
  );
}

/** 발주서에 반영되지 않은 변경요청(거절/대기) 이력 항목. */
function ChangeRequestEntry({ entry }: { entry: HistoryEntry }) {
  const meta = entry.changeRequestStatus
    ? CR_STATUS_META[entry.changeRequestStatus]
    : null;
  return (
    <li className="relative">
      <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-white">
        ·
      </span>
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            변경요청 #{entry.changeRequestId}{' '}
            <span className="text-xs text-gray-400">(발주서 미반영)</span>
          </span>
          <div className="flex items-center gap-2">
            {meta && <Badge label={meta.label} colorClass={meta.color} size="sm" />}
            <span className="text-xs text-gray-400">
              {new Date(entry.occurredAt).toLocaleString('ko-KR')}
            </span>
          </div>
        </div>
        {entry.changes.length > 0 && (
          <ul className="mt-2 space-y-1">
            {entry.changes.map((c, i) => (
              <ChangeLine key={i} c={c} />
            ))}
          </ul>
        )}
        {/* 미반영이지만 그 시점 발주서 상세를 함께 보여준다(요청 당시 기준값 맥락). */}
        {entry.state && <StateDetails s={entry.state} />}
      </div>
    </li>
  );
}

export function HistoryTimeline({ orderId }: { orderId: number }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [includeRejected, setIncludeRejected] = useState(false);
  const [includePending, setIncludePending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await historyApi.list(orderId, {
        includeRejected,
        includePending,
      });
      setEntries(res.items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [orderId, includeRejected, includePending]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* 거절/대기 변경요청 포함 토글 */}
      <div className="flex gap-4 text-sm text-gray-600">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={includeRejected}
            onChange={(e) => setIncludeRejected(e.target.checked)}
          />
          반려된 요청 포함
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={includePending}
            onChange={(e) => setIncludePending(e.target.checked)}
          />
          대기 중 요청 포함
        </label>
      </div>

      {loading ? (
        <p className="text-gray-400">불러오는 중...</p>
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        <ol className="relative space-y-6 border-l-2 border-gray-200 pl-6">
          {entries.map((entry, i) =>
            entry.kind === 'VERSION' ? (
              <VersionEntry key={`v${entry.version}`} entry={entry} />
            ) : (
              <ChangeRequestEntry
                key={`cr${entry.changeRequestId}-${i}`}
                entry={entry}
              />
            ),
          )}
        </ol>
      )}
    </div>
  );
}
