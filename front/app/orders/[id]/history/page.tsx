'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HistoryTimeline } from '@/components/history/HistoryTimeline';
import { VersionViewer } from '@/components/history/VersionViewer';
import { PointInTimeViewer } from '@/components/history/PointInTimeViewer';
import { DiffViewer } from '@/components/history/DiffViewer';

type Tab = 'timeline' | 'version' | 'at' | 'diff';

const TABS: { key: Tab; label: string }[] = [
  { key: 'timeline', label: '전체 이력' },
  { key: 'version', label: '버전 조회' },
  { key: 'at', label: '시점 조회' },
  { key: 'diff', label: '버전 비교' },
];

export default function HistoryPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const [tab, setTab] = useState<Tab>('timeline');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/orders/${orderId}`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← 발주서 상세로
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          이력 조회 (#{orderId})
        </h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div>
        {tab === 'timeline' && <HistoryTimeline orderId={orderId} />}
        {tab === 'version' && <VersionViewer orderId={orderId} />}
        {tab === 'at' && <PointInTimeViewer orderId={orderId} />}
        {tab === 'diff' && <DiffViewer orderId={orderId} />}
      </div>
    </div>
  );
}
