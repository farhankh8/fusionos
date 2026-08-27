/**
 * FusionOS Command Center
 *
 * Enterprise dashboard landing. Functional, data-driven, professional.
 * No decorative cards, no gradients, no glassmorphism.
 * Answers business questions, not visual flair.
 */

import {
  Users,
  Clock,
  FolderKanban,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-full bg-background">
      <div className="p-4 lg:p-6">
        {/* Page Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Command Center
            </h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              System overview and development status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">
              Last updated: just now
            </span>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="System Status"
            value="Operational"
            icon={CheckCircle2}
            iconColor="text-success"
          />
          <MetricCard
            label="Active Modules"
            value="0 / 9"
            icon={FolderKanban}
            iconColor="text-muted-foreground"
          />
          <MetricCard
            label="Users"
            value="5"
            icon={Users}
            iconColor="text-muted-foreground"
          />
          <MetricCard
            label="Current Phase"
            value="Phase 1"
            icon={Circle}
            iconColor="text-primary"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Development Roadmap — spans 2 cols */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h2 className="text-[13px] font-semibold text-foreground">
                  Development Roadmap
                </h2>
              </div>
              <div className="divide-y divide-border">
                <RoadmapRow
                  phase="Phase 1"
                  label="Foundation"
                  description="Application shell, navigation, design system, API"
                  status="active"
                />
                <RoadmapRow
                  phase="Phase 2"
                  label="Database"
                  description="Schema, migrations, seed data, ORM"
                  status="done"
                />
                <RoadmapRow
                  phase="Phase 3"
                  label="Authentication"
                  description="Sessions, JWT, MFA, email verification"
                  status="done"
                />
                <RoadmapRow
                  phase="Phase 4"
                  label="Multi-Tenancy"
                  description="Tenant isolation, RBAC, authorization guards"
                  status="done"
                />
                <RoadmapRow
                  phase="Phase 5"
                  label="Organization"
                  description="Company, branch, department, team management"
                  status="upcoming"
                />
                <RoadmapRow
                  phase="Phase 6"
                  label="Employees"
                  description="Employee profiles, onboarding, org chart"
                  status="upcoming"
                />
              </div>
            </div>
          </div>

          {/* Quick Links — spans 1 col */}
          <div>
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-4 py-2.5">
                <h2 className="text-[13px] font-semibold text-foreground">
                  Quick Links
                </h2>
              </div>
              <div className="divide-y divide-border">
                <QuickLink
                  label="Database Schema"
                  description="Prisma schema and migrations"
                  href="#"
                />
                <QuickLink
                  label="API Documentation"
                  description="Backend endpoints and auth"
                  href="#"
                />
                <QuickLink
                  label="Security Docs"
                  description="Multi-tenancy and RBAC"
                  href="#"
                />
                <QuickLink
                  label="Shared Packages"
                  description="Types, validation, config"
                  href="#"
                />
              </div>
            </div>

            {/* System Info */}
            <div className="mt-3 rounded-lg border border-border">
              <div className="border-b border-border px-4 py-2.5">
                <h2 className="text-[13px] font-semibold text-foreground">
                  System Info
                </h2>
              </div>
              <div className="px-4 py-3">
                <dl className="space-y-2">
                  <InfoRow label="Version" value="v0.1.0" />
                  <InfoRow label="Framework" value="Next.js 15 + NestJS" />
                  <InfoRow label="Database" value="PostgreSQL + Prisma" />
                  <InfoRow label="Auth" value="JWT + MFA (TOTP)" />
                  <InfoRow label="Tenants" value="2 (dev + test)" />
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts / Notes */}
        <div className="mt-3 rounded-lg border border-warning/20 bg-warning-light p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Development Mode
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                This is a development environment. Business modules (HR, Finance, CRM, Projects)
                are planned for subsequent phases.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Metric Card ────────────────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconColor: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.5} />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 text-[16px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

/* ── Roadmap Row ────────────────────────────────────────────────────────── */

function RoadmapRow({
  phase,
  label,
  description,
  status,
}: {
  phase: string;
  label: string;
  description: string;
  status: 'active' | 'upcoming' | 'done';
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-120 hover:bg-muted/50">
      <span
        className={`inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[10px] font-semibold ${
          status === 'active'
            ? 'bg-primary text-white'
            : status === 'done'
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {phase}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">{label}</span>
          {status === 'active' && (
            <span className="text-[10px] font-medium text-primary">Current</span>
          )}
          {status === 'done' && (
            <CheckCircle2 className="h-3 w-3 text-success" />
          )}
        </div>
        <p className="text-[12px] text-muted-foreground truncate">{description}</p>
      </div>
      {status === 'active' && (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary/50" />
      )}
    </div>
  );
}

/* ── Quick Link ─────────────────────────────────────────────────────────── */

function QuickLink({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between px-4 py-2.5 transition-colors duration-120 hover:bg-muted/50"
    >
      <div>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="text-[12px] text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
    </a>
  );
}

/* ── Info Row ───────────────────────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-[12px] font-medium text-foreground">{value}</dd>
    </div>
  );
}
