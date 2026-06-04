import Link from 'next/link';
import type { Order } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm
                 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">#{order.id}</p>
          <h3 className="font-semibold text-gray-900">{order.productName}</h3>
        </div>
        <StatusBadge status={order.status} size="sm" />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-gray-500">수량</dt>
          <dd className="font-medium text-gray-900">{order.quantity.toLocaleString()}벌</dd>
        </div>
        <div>
          <dt className="text-gray-500">단가</dt>
          <dd className="font-medium text-gray-900">₩{order.unitPrice.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-gray-500">납기일</dt>
          <dd className="font-medium text-gray-900">{order.dueDate}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>버전 {order.currentVersion} · 요청자 {order.createdBy}</span>
        <span>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
    </Link>
  );
}
