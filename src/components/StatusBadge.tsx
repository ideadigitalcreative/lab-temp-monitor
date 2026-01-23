import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'critical';
  className?: string;
}

const statusLabels = {
  normal: 'Normal',
  warning: 'Peringatan',
  critical: 'Kritis',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        status === 'normal' && 'status-badge-normal',
        status === 'warning' && 'status-badge-warning',
        status === 'critical' && 'status-badge-critical',
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
