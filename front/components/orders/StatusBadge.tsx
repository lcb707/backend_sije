import { Badge } from '@/components/ui/Badge';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/constants';
import type { OrderStatus } from '@/lib/types';

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: OrderStatus;
  size?: 'sm' | 'md';
}) {
  return (
    <Badge
      label={ORDER_STATUS_LABELS[status]}
      colorClass={ORDER_STATUS_COLORS[status]}
      size={size}
    />
  );
}
