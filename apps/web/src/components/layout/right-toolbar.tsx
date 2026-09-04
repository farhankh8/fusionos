'use client';

/**
 * FusionOS Right Toolbar
 *
 * AI and intelligence tools docked to the right edge,
 * similar to Zoho's right-side assistant panel.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Zap,
  BarChart3,
  Brain,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface ToolItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const aiTools: ToolItem[] = [
  {
    label: 'AI Command Center',
    href: '/ai',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Central hub for all AI features and models',
    color: 'text-violet-500',
  },
  {
    label: 'AI Agents',
    href: '/ai/agents',
    icon: <Bot className="h-5 w-5" />,
    description: 'Deploy and manage autonomous AI agents',
    color: 'text-blue-500',
  },
  {
    label: 'AI Runtime',
    href: '/ai/settings',
    icon: <Brain className="h-5 w-5" />,
    description: 'Configure AI providers and model settings',
    color: 'text-cyan-500',
  },
  {
    label: 'Automation',
    href: '/automation',
    icon: <Zap className="h-5 w-5" />,
    description: 'Build workflows and automate tasks',
    color: 'text-amber-500',
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    description: 'Real-time analytics and dashboards',
    color: 'text-emerald-500',
  },
  {
    label: 'Business Intelligence',
    href: '/intelligence',
    icon: <BarChart3 className="h-5 w-5" />,
    description: 'Deep insights and reporting',
    color: 'text-orange-500',
  },
];

export function RightToolbar() {
  const pathname = usePathname() || '/';
  const [expanded, setExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const handleItemClick = (href: string) => {
    if (activeItem === href) {
      setActiveItem(null);
      setExpanded(false);
    } else {
      setActiveItem(href);
      setExpanded(true);
    }
  };

  const handleClose = () => {
    setActiveItem(null);
    setExpanded(false);
  };

  const activeTool = aiTools.find(t => t.href === activeItem);

  return (
    <div className="relative flex h-full">
      {/* Expanded Panel */}
      {expanded && activeTool && (
        <div className="w-[300px] border-l border-border bg-card flex flex-col animate-in slide-in-from-right duration-200">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-secondary', activeTool.color)}>
                {activeTool.icon}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{activeTool.label}</p>
                <p className="text-[11px] text-muted-foreground">{activeTool.description}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <Link
              href={activeTool.href}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-secondary', activeTool.color)}>
                {activeTool.icon}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-foreground">Open {activeTool.label}</p>
                <p className="text-[11px] text-muted-foreground">{activeTool.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">All AI Tools</p>
              <div className="space-y-1">
                {aiTools.map(tool => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                      pathname === tool.href
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <span className={tool.color}>{tool.icon}</span>
                    {tool.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Icon Rail */}
      <div className="flex w-[52px] flex-col items-center border-l border-border bg-card py-3 gap-1">
        {/* Toggle expand */}
        <button
          onClick={() => {
            if (expanded) {
              handleClose();
            } else {
              setExpanded(true);
              setActiveItem(null);
            }
          }}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors mb-2',
            expanded
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
          aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
        >
          {expanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className="h-px w-6 bg-border mb-2" />

        {/* Tool Icons */}
        {aiTools.map(tool => (
          <Link
            key={tool.href}
            href={tool.href}
            onClick={(e) => {
              e.preventDefault();
              handleItemClick(tool.href);
            }}
            className={cn(
              'group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150',
              activeItem === tool.href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
            title={tool.label}
          >
            {tool.icon}
            {/* Tooltip */}
            <span className="pointer-events-none absolute right-full mr-2 hidden w-max rounded-md bg-foreground px-2.5 py-1.5 text-[12px] font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
              {tool.label}
            </span>
          </Link>
        ))}

        {/* Bottom divider */}
        <div className="mt-auto h-px w-6 bg-border mb-2" />

        {/* Settings shortcut */}
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
