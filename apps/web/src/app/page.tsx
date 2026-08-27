/**
 * FusionOS Home Page / Command Center
 *
 * The default landing page. Shows the application shell with a clean
 * starting point. No fake data — clearly indicates this is the foundation.
 */

export default function HomePage() {
  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Command Center</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to FusionOS — your AI-native Business Operating System.
        </p>
      </div>

      {/* Foundation Status */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatusCard
          title="System Status"
          description="Application foundation is operational."
          status="operational"
        />
        <StatusCard
          title="Modules"
          description="Business modules will appear here as they are implemented."
          status="planned"
        />
        <StatusCard
          title="AI Platform"
          description="AI agents and automation will be available in future phases."
          status="planned"
        />
      </div>

      {/* Phase Info */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Development Phase</h2>
        <p className="mt-2 text-sm text-gray-600">
          FusionOS is currently in <strong>Phase 1 — Foundation</strong>. The application shell,
          navigation, design system, API foundation, and shared packages are established. Business
          modules (HR, Attendance, Payroll, Finance, CRM, Projects, AI, Automation, Analytics) will
          be implemented in subsequent phases.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PhaseBadge phase="Phase 1" label="Foundation" active />
          <PhaseBadge phase="Phase 2" label="Database" />
          <PhaseBadge phase="Phase 3" label="Authentication" />
          <PhaseBadge phase="Phase 4" label="Multi-Tenancy" />
          <PhaseBadge phase="Phase 5+" label="Business Modules" />
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: 'operational' | 'planned' | 'degraded';
}) {
  const statusColors = {
    operational: 'bg-green-500',
    planned: 'bg-gray-300',
    degraded: 'bg-yellow-500',
  };

  const statusLabels = {
    operational: 'Operational',
    planned: 'Planned',
    degraded: 'In Progress',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${statusColors[status]}`} aria-hidden="true" />
          <span className="text-xs text-gray-500">{statusLabels[status]}</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function PhaseBadge({
  phase,
  label,
  active = false,
}: {
  phase: string;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {phase}: {label}
    </span>
  );
}
