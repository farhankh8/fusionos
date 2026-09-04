'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cn('border-b border-border bg-card', className)}>
      <div className="px-5 py-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                {breadcrumbs.map((crumb, index) => (
                  <span key={index} className="flex items-center gap-1.5">
                    {index > 0 && <span>/</span>}
                    {crumb.href || crumb.onClick ? (
                      <button
                        onClick={crumb.onClick || (() => { if (crumb.href) window.location.href = crumb.href; })}
                        className="hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="font-medium text-foreground">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-[18px] font-semibold text-foreground">{title}</h1>
            {description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
