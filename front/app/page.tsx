'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import type { Order } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { OrderCard } from '@/components/orders/OrderCard';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

const PAGE_SIZE = 20;

export default function HomePage() {
  const { currentUser } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // 첫 페이지 로드(또는 새로고침). 누적 목록을 초기화한다.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.list({ limit: PAGE_SIZE, offset: 0 });
      setOrders(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  // 다음 페이지를 현재 목록 뒤에 이어 붙인다.
  const loadMore = async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const res = await ordersApi.list({
        limit: PAGE_SIZE,
        offset: orders.length,
      });
      setOrders((prev) => [...prev, ...res.items]);
      setTotal(res.total);
    } catch (e) {
      setError(e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load();
    // 역할(계정) 전환 시 다시 로드
  }, [currentUser.username]);

  const hasMore = orders.length < total;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          발주서 목록
          {!loading && total > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              {orders.length} / {total}
            </span>
          )}
        </h1>
        {currentUser.role === 'BUYER' && (
          <Link href="/orders/new">
            <Button>+ 발주서 생성</Button>
          </Link>
        )}
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorMessage error={error} />
        </div>
      ) : null}

      {loading ? (
        <div className="py-20 text-center text-gray-400">불러오는 중...</div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center">
          <p className="mb-4 text-gray-400">발주서가 없습니다.</p>
          {currentUser.role === 'BUYER' && (
            <Link href="/orders/new">
              <Button variant="secondary">첫 발주서 만들기</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                variant="secondary"
                loading={loadingMore}
                onClick={loadMore}
              >
                더보기 ({total - orders.length}개 남음)
              </Button>
            </div>
          )}
        </>
      )}

      <div className="mt-6 text-right">
        <button
          onClick={load}
          className="text-sm text-gray-400 underline hover:text-gray-600"
        >
          새로고침
        </button>
      </div>
    </div>
  );
}
