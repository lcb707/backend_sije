'use client';

import { useState } from 'react';
import { historyApi } from '@/lib/api';
import type { SnapshotState } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { SnapshotView } from './SnapshotView';

/** 오늘 날짜 오전 00시를 datetime-local 형식(YYYY-MM-DDT00:00)으로 반환. */
function todayMidnight(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00`;
}

export function PointInTimeViewer({ orderId }: { orderId: number }) {
  // datetime-local 기본값 = 오늘 0시(예: 2025-06-04T00:00)
  const [dt, setDt] = useState(todayMidnight);
  const [result, setResult] = useState<SnapshotState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const query = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // datetime-local 은 로컬 시각 → ISO(UTC)로 변환해 전송
      const iso = new Date(dt).toISOString();
      setResult(await historyApi.getAt(orderId, iso));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={query} className="flex items-end gap-2">
        <div className="w-64">
          <Input
            label="조회 시점"
            type="datetime-local"
            value={dt}
            onChange={(e) => setDt(e.target.value)}
          />
        </div>
        <Button type="submit" loading={busy}>
          조회
        </Button>
      </form>
      <p className="text-xs text-gray-400">
        입력 시각(로컬)을 UTC로 변환해 전송합니다. 해당 시점에 유효했던 버전을 반환합니다.
      </p>
      <ErrorMessage error={error} />
      {result && <SnapshotView s={result} />}
    </div>
  );
}
