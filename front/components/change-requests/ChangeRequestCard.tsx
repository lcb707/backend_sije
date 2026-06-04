'use client';

import { useState } from 'react';
import { changeRequestsApi } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { CR_STATUS_META, fieldLabel } from '@/lib/constants';
import type { ChangeRequest } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

function formatValue(v: unknown): string {
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return String(v);
}

export function ChangeRequestCard({
  cr,
  onReviewed,
}: {
  cr: ChangeRequest;
  onReviewed: () => void;
}) {
  const { currentUser } = useUser();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const meta = CR_STATUS_META[cr.status];
  const canReview =
    cr.status === 'PENDING' && currentUser.role === 'SOURCING';

  const review = async (kind: 'approve' | 'reject') => {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'approve') {
        await changeRequestsApi.approve(cr.id, comment || '승인');
      } else {
        await changeRequestsApi.reject(cr.id, comment || '반려');
      }
      onReviewed();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400">변경요청 #{cr.id}</p>
          <p className="mt-0.5 text-sm text-gray-700">{cr.reason}</p>
        </div>
        <Badge label={meta.label} colorClass={meta.color} size="sm" />
      </div>

      <ul className="mt-3 space-y-1">
        {cr.items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600">
            <span className="font-medium text-gray-800">
              {fieldLabel(item.field, item.path)}
            </span>
            {' → '}
            <span className="text-blue-700">{formatValue(item.newValue)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 text-xs text-gray-400">
        요청자: {cr.requestedBy} · {new Date(cr.createdAt).toLocaleString('ko-KR')}
        {cr.reviewedBy && ` · 검토자: ${cr.reviewedBy}`}
        {cr.reviewedAt &&
          ` · 검토 ${new Date(cr.reviewedAt).toLocaleString('ko-KR')}`}
        {cr.resultingVersion && ` · 생성 버전: v${cr.resultingVersion}`}
      </div>
      {cr.reviewComment && (
        <p className="mt-1 text-xs text-gray-500">
          검토 의견: {cr.reviewComment}
        </p>
      )}

      {canReview && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <ErrorMessage error={error} />
          <Input
            placeholder="검토 의견 (선택)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" loading={busy} onClick={() => review('approve')}>
              승인
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={busy}
              onClick={() => review('reject')}
            >
              반려
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
