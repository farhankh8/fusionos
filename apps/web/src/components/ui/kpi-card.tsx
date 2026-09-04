'use client';

import { cn } from '@/lib/utils';
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiTrend {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  label?: string;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  subtitle?: string;
  trend?: KpiTrend;
  loading?: boolean;
  className?: string;
}

export function KpiCard({ label, value, icon: Icon, iconBg = 'bg-info-light', iconColor = 'text-primary', subtitle, trend, loading, className }: KpiCardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:shadow-sm hover:border-border-strong/50',
      className,
    )}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded bg-secondary" />
          ) : (
            <p className="mt-1.5 text-[24px] font-bold text-foreground leading-tight">{value}</p>
          )}
          {trend && !loading && (
            <div className="mt-1.5 flex items-center gap-1">
              {trend.direction === 'up' && (
                <>
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-[11px] font-medium text-success">+{trend.value}%</span>
                </>
              )}
              {trend.direction === 'down' && (
                <>
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span className="text-[11px] font-medium text-destructive">-{trend.value}%</span>
                </>
              )}
              {trend.direction === 'neutral' && (
                <>
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">0%</span>
                </>
              )}
              {trend.label && (
                <span className="text-[11px] text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
          {subtitle && <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-105', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}
