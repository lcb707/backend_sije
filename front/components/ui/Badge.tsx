interface BadgeProps {
  label: string;
  colorClass: string; // 예: 'bg-blue-100 text-blue-800'
  size?: 'sm' | 'md';
}

export function Badge({ label, colorClass, size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${colorClass}`}>
      {label}
    </span>
  );
}
