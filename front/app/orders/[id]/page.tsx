'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { changeRequestsApi, ordersApi } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import type { ChangeRequest, Order } from '@/lib/types';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { StatusTransition } from '@/components/orders/StatusTransition';
import { ChangeRequestForm } from '@/components/change-requests/ChangeRequestForm';
import { ChangeRequestCard } from '@/components/change-requests/ChangeRequestCard';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Button } from '@/components/ui/Button';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const { currentUser } = useUser();

  const [order, setOrder] = useState<Order | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, crs] = await Promise.all([
        ordersApi.get(orderId),
        // 발주서당 변경요청은 보통 적으므로 한 페이지(최대 limit)로 모두 가져온다.
        changeRequestsApi.list(orderId, { limit: 100, offset: 0 }),
      ]);
      setOrder(o);
      setChangeRequests(crs.items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load, currentUser.username]);

  if (loading) {
    return <div className="py-20 text-center text-gray-400">불러오는 중...</div>;
  }
  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← 목록으로
        </Link>
        <ErrorMessage error={error} />
      </div>
    );
  }

  const canRequestChange =
    currentUser.role === 'BUYER' &&
    ['CONFIRMED', 'IN_PRODUCTION', 'COMPLETED'].includes(order.status);
  const hasPending = changeRequests.some((cr) => cr.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← 목록으로
        </Link>
        <Link href={`/orders/${orderId}/history`}>
          <Button variant="secondary" size="sm">
            이력 조회 →
          </Button>
        </Link>
      </div>

      {/* 현재 상태 */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400">#{order.id}</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {order.productName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-sm text-gray-400">v{order.currentVersion}</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Field label="수량" value={`${order.quantity.toLocaleString()}벌`} />
          <Field label="단가" value={`₩${order.unitPrice.toLocaleString()}`} />
          <Field label="납기일" value={order.dueDate} />
          <Field
            label="사양"
            value={Object.entries(order.specs)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')}
          />
        </dl>
      </section>

      {/* 상태 전이 */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">상태 전이</h2>
        <StatusTransition order={order} onDone={load} />
      </section>

      {/* 변경 요청 생성 (BUYER + CONFIRMED 이상) */}
      {canRequestChange && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            변경 요청 생성
          </h2>
          {hasPending ? (
            <p className="text-sm text-yellow-600">
              이미 검토 대기 중인 변경요청이 있어 신규 생성할 수 없습니다.
            </p>
          ) : (
            <ChangeRequestForm
              orderId={orderId}
              specKeys={Object.keys(order.specs)}
              onDone={load}
            />
          )}
        </section>
      )}

      {/* 변경 요청 목록 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          변경 요청 내역 ({changeRequests.length})
        </h2>
        {changeRequests.length === 0 ? (
          <p className="text-sm text-gray-400">변경 요청이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {changeRequests.map((cr) => (
              <ChangeRequestCard key={cr.id} cr={cr} onReviewed={load} />
            ))}
          </div>
        )}
      </section>
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
