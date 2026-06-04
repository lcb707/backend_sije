'use client';

import { useState } from 'react';
import { historyApi } from '@/lib/api';
import { fieldLabel } from '@/lib/constants';
import type { SnapshotState, VersionChangeLog } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { SnapshotView } from './SnapshotView';

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function VersionViewer({ orderId }: { orderId: number }) {
  const [version, setVersion] = useState('1');
  const [snapshot, setSnapshot] = useState<SnapshotState | null>(null);
  const [changes, setChanges] = useState<VersionChangeLog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const query = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSnapshot(null);
    setChanges(null);
    try {
      const v = Number(version);
      // 상태 스냅샷 + 그 버전의 변경 델타를 함께 조회.
      const [snap, chg] = await Promise.all([
        historyApi.getVersion(orderId, v),
        historyApi.getVersionChanges(orderId, v),
      ]);
      setSnapshot(snap);
      setChanges(chg);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={query} className="flex items-end gap-2">
        <div className="w-40">
          <Input
            label="버전 번호"
            type="number"
            min={1}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </div>
        <Button type="submit" loading={busy}>
          조회
        </Button>
      </form>
      <ErrorMessage error={error} />
      {snapshot && <SnapshotView s={snapshot} />}
      {changes && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            이 버전에서 바뀐 내용
          </p>
          {changes.changes.length === 0 ? (
            <p className="text-sm text-gray-400">
              최초 생성(버전1) — 변경 델타 없음
            </p>
          ) : (
            <ul className="space-y-1">
              {changes.changes.map((c, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-gray-700">
                    {fieldLabel(c.field, c.path)}
                  </span>
                  :{' '}
                  <span className="text-red-600 line-through">
                    {fmt(c.oldValue)}
                  </span>
                  {' → '}
                  <span className="text-green-700">{fmt(c.newValue)}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    ({c.reason})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
