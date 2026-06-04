'use client';

import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { OrderForm } from '@/components/orders/OrderForm';
import { Button } from '@/components/ui/Button';

export default function NewOrderPage() {
  const { currentUser } = useUser();

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← 목록으로
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">발주서 생성</h1>
      </div>

      {currentUser.role !== 'BUYER' ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-6 text-center">
          <p className="text-yellow-800">
            발주서 생성은 <strong>주문자(BUYER)</strong>만 가능합니다.
          </p>
          <p className="mt-1 text-sm text-yellow-600">
            상단에서 buyer1 / buyer2 계정으로 전환하세요.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="secondary">목록으로</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <OrderForm />
        </div>
      )}
    </div>
  );
}
