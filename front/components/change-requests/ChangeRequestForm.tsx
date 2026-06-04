'use client';

import { useState } from 'react';
import { changeRequestsApi } from '@/lib/api';
import { CHANGEABLE_FIELD_LABELS } from '@/lib/constants';
import type { ChangeableField } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

/** 오늘 날짜를 로컬 시간대 기준 YYYY-MM-DD 로 반환(dueDate placeholder 용). */
function todayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 변경 가능 필드. specs 는 키(path) 단위로 변경한다(예: color).
const FIELD_OPTIONS: { value: ChangeableField; label: string }[] = [
  { value: 'productName', label: CHANGEABLE_FIELD_LABELS.productName },
  { value: 'quantity', label: CHANGEABLE_FIELD_LABELS.quantity },
  { value: 'unitPrice', label: CHANGEABLE_FIELD_LABELS.unitPrice },
  { value: 'dueDate', label: CHANGEABLE_FIELD_LABELS.dueDate },
  { value: 'specs', label: CHANGEABLE_FIELD_LABELS.specs },
];

interface ItemRow {
  field: ChangeableField;
  path: string; // specs 일 때만 사용
  value: string;
}

// 필드 → newValue 타입 변환(quantity/unitPrice 는 숫자). specs 키 값은 숫자면 숫자로.
function coerce(field: ChangeableField, raw: string): string | number {
  if (field === 'quantity' || field === 'unitPrice') return Number(raw);
  // specs 키 값이 순수 숫자 문자열이면 숫자로(예: 두께 '3' → 3).
  if (field === 'specs' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return raw;
}

export function ChangeRequestForm({
  orderId,
  specKeys,
  onDone,
}: {
  orderId: number;
  // 발주서에 존재하는 사양 키 목록. specs 변경 시 이 키들만 드롭다운으로 선택 가능
  // (백엔드도 생성 시 정의된 키만 변경 허용 → UI 에서 미리 제약).
  specKeys: string[];
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { field: 'quantity', path: '', value: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const updateItem = (idx: number, patch: Partial<ItemRow>) =>
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  const addItem = () =>
    setItems((prev) => [...prev, { field: 'dueDate', path: '', value: '' }]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await changeRequestsApi.create(orderId, {
        reason,
        items: items.map((it) => ({
          field: it.field,
          // specs 일 때만 path 전송(빈 path 는 보내지 않음).
          ...(it.field === 'specs' && it.path.trim()
            ? { path: it.path.trim() }
            : {}),
          newValue: coerce(it.field, it.value),
        })),
      });
      setReason('');
      setItems([{ field: 'quantity', path: '', value: '' }]);
      onDone();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorMessage error={error} />

      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-end gap-2">
            <div className="w-28">
              <Select
                label={idx === 0 ? '변경 필드' : undefined}
                value={it.field}
                options={FIELD_OPTIONS}
                onChange={(e) => {
                  const field = e.target.value as ChangeableField;
                  // specs 로 바꾸면 첫 사양 키를 기본 선택(키가 없으면 빈 값).
                  updateItem(idx, {
                    field,
                    path: field === 'specs' ? (specKeys[0] ?? '') : '',
                  });
                }}
              />
            </div>
            {it.field === 'specs' && (
              <div className="w-28">
                <Select
                  label={idx === 0 ? '사양 키' : undefined}
                  value={it.path}
                  options={
                    specKeys.length > 0
                      ? specKeys.map((k) => ({ value: k, label: k }))
                      : [{ value: '', label: '사양 키 없음' }]
                  }
                  onChange={(e) => updateItem(idx, { path: e.target.value })}
                  disabled={specKeys.length === 0}
                />
              </div>
            )}
            <div className="flex-1">
              <Input
                label={idx === 0 ? '새 값' : undefined}
                value={it.value}
                onChange={(e) => updateItem(idx, { value: e.target.value })}
                placeholder={
                  it.field === 'dueDate'
                    ? todayDate()
                    : it.field === 'specs'
                      ? 'black'
                      : '새 값 입력'
                }
                required
              />
            </div>
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(idx)}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-blue-600 hover:underline"
        >
          + 변경 필드 추가
        </button>
      </div>

      <Input
        label="변경 사유"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="예: 고객사 추가 주문으로 수량 상향"
        required
      />

      <Button type="submit" loading={busy}>
        변경 요청 제출
      </Button>
    </form>
  );
}
