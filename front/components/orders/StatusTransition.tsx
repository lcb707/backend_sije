'use client';

import { useState } from 'react';
import { ordersApi } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { ROLE_LABELS, STATUS_TRANSITIONS } from '@/lib/constants';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export function StatusTransition({
  order,
  onDone,
}: {
  order: Order;
  onDone: () => void;
}) {
  const { currentUser } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const transitions = STATUS_TRANSITIONS[order.status];

  if (transitions.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        완료된 발주서입니다. 더 이상 전이할 수 없습니다.
      </p>
    );
  }

  const run = async (next: Parameters<typeof ordersApi.updateStatus>[1]) => {
    setBusy(true);
    setError(null);
    try {
      await ordersApi.updateStatus(order.id, next);
      onDone();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <ErrorMessage error={error} />
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => {
          const allowed = currentUser.role === t.requiredRole;
          return (
            <Button
              key={t.next}
              onClick={() => run(t.next)}
              disabled={!allowed}
              loading={busy}
              title={
                allowed
                  ? undefined
                  : `${ROLE_LABELS[t.requiredRole]} 역할만 가능합니다`
              }
            >
              {t.label}
              {!allowed && (
                <span className="text-xs opacity-70">
                  ({ROLE_LABELS[t.requiredRole]})
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
