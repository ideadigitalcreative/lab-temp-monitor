import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  iconClassName?: string;
}

export function StatCard({ title, value, subtitle, icon, className, iconClassName }: StatCardProps) {
  return (
    <div className={cn('glass-card rounded-xl p-5 animate-slide-up', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1 font-mono">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-2 md:p-3 rounded-lg", iconClassName || "bg-accent text-primary")}>
          {icon}
        </div>
      </div>
    </div>
  );
}
