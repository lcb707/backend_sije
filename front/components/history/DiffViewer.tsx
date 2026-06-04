'use client';

import { useState } from 'react';
import { historyApi } from '@/lib/api';
import { fieldLabel } from '@/lib/constants';
import type { DiffResponse } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function DiffViewer({ orderId }: { orderId: number }) {
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('2');
  const [result, setResult] = useState<DiffResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const query = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await historyApi.diff(orderId, Number(from), Number(to)));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={query} className="flex items-end gap-2">
        <div className="w-28">
          <Input
            label="from 버전"
            type="number"
            min={1}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-28">
          <Input
            label="to 버전"
            type="number"
            min={1}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button type="submit" loading={busy}>
          비교
        </Button>
      </form>

      <ErrorMessage error={error} />

      {result && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            버전 {result.fromVersion} → 버전 {result.toVersion}
          </p>
          {result.differences.length === 0 ? (
            <p className="text-sm text-gray-400">두 버전 간 차이가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">필드</th>
                  <th className="pb-2">이전</th>
                  <th className="pb-2"></th>
                  <th className="pb-2">변경 후</th>
                </tr>
              </thead>
              <tbody>
                {result.differences.map((d) => (
                  <tr
                    key={`${d.field}.${d.path ?? ''}`}
                    className="border-t border-gray-100"
                  >
                    <td className="py-2 font-medium text-gray-800">
                      {fieldLabel(d.field, d.path)}
                    </td>
                    <td className="py-2 text-red-600">{fmt(d.from)}</td>
                    <td className="py-2 text-gray-400">→</td>
                    <td className="py-2 text-green-700">{fmt(d.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
