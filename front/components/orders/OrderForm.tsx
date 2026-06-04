'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

/** 오늘 날짜를 로컬 시간대 기준 YYYY-MM-DD 로 반환. */
function todayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function OrderForm() {
  const router = useRouter();
  const [productName, setProductName] = useState('티셔츠');
  const [quantity, setQuantity] = useState('1000');
  const [unitPrice, setUnitPrice] = useState('5000');
  const [color, setColor] = useState('white');
  const [size, setSize] = useState('L');
  const [dueDate, setDueDate] = useState(todayDate);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const order = await ordersApi.create({
        productName,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        specs: { color, size },
        dueDate,
      });
      router.push(`/orders/${order.id}`);
    } catch (e) {
      setError(e);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorMessage error={error} />

      <Input
        label="상품명"
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="수량"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        <Input
          label="단가 (원)"
          type="number"
          min={0}
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="색상 (사양)"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <Input
          label="사이즈 (사양)"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
      </div>

      <Input
        label="납기일 (YYYY-MM-DD)"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        placeholder="2025-03-15"
        required
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          발주서 생성
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/')}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
