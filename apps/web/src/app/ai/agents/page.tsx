'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bot, Plus, PlayCircle, Clock, CheckCircle, XCircle, AlertTriangle, Settings, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardData {
  activeAgents: number;
  runningTasks: number;
  awaitingApproval: number;
  completedToday: number;
  failedTasks: number;
}

interface Agent {
  id: string;
  name: string;
  description: string | null;
  agentType: string;
  status: string;
  currentVersion: { id: string; versionNumber: number; status: string } | null;
  createdBy: { id: string; firstName: string | null; lastName: string | null } | null;
  _count: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

interface AgentProfile {
  name: string;
  type: string;
  description: string;
  suggestedGoals: string[];
}

export default function AIAgentsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'profiles'>('dashboard');

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, agentsRes, profilesRes] = await Promise.all([
          fetch('/api/v1/ai/agents/dashboard').then(r => r.json()),
          fetch('/api/v1/ai/agents').then(r => r.json()),
          fetch('/api/v1/ai/agents/profiles').then(r => r.json()),
        ]);
        if (dashRes.data) setDashboard(dashRes.data);
        if (agentsRes.data) setAgents(agentsRes.data);
        if (profilesRes) setProfiles(profilesRes);
      } catch {
        // Silent fail — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF5EC]">
      <PageHeader
        title="AI Agents"
        description="Intelligent business agents powered by AI — analyze, plan, and execute with approval controls."
        actions={
          <Link
            href="/ai/agents/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Agent
          </Link>
        }
      />

      <div className="p-5 lg:p-6">
        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-lg border border-[#DDD0BB] bg-white p-1 w-fit">
          {(['dashboard', 'agents', 'profiles'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#064E3B] text-white'
                  : 'text-[#57534E] hover:bg-[#F5E6CC] hover:text-[#1C1917]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {loading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-[#DDD0BB] bg-white p-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="mt-2 h-7 w-16" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <KpiCard
                    label="Active Agents"
                    value={dashboard?.activeAgents ?? 0}
                    icon={Bot}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                  />
                  <KpiCard
                    label="Running Tasks"
                    value={dashboard?.runningTasks ?? 0}
                    icon={PlayCircle}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                  />
                  <KpiCard
                    label="Awaiting Approval"
                    value={dashboard?.awaitingApproval ?? 0}
                    icon={Clock}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                  />
                  <KpiCard
                    label="Completed Today"
                    value={dashboard?.completedToday ?? 0}
                    icon={CheckCircle}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                  />
                  <KpiCard
                    label="Failed Tasks"
                    value={dashboard?.failedTasks ?? 0}
                    icon={XCircle}
                    iconBg="bg-red-50"
                    iconColor="text-red-600"
                  />
                </>
              )}
            </div>

            {/* Agent Profiles */}
            <div className="mt-6">
              <h2 className="text-[14px] font-semibold text-[#1C1917] mb-3">Available Agent Profiles</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.type}
                    className="rounded-lg border border-[#DDD0BB] bg-white p-5 hover:border-[#064E3B] transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-lg bg-[#064E3B]/10 p-2">
                        <Bot className="h-5 w-5 text-[#064E3B]" />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-[#1C1917]">{profile.name}</h3>
                        <p className="text-[11px] text-[#8E7E68]">{profile.type} Agent</p>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#57534E] mb-3">{profile.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.suggestedGoals.slice(0, 2).map((goal, i) => (
                        <span key={i} className="rounded bg-[#F5E6CC] px-2 py-0.5 text-[10px] text-[#57534E]">
                          {goal.length > 50 ? goal.substring(0, 50) + '...' : goal}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="rounded-lg border border-[#DDD0BB] bg-white">
            <div className="flex items-center justify-between border-b border-[#DDD0BB] px-5 py-3">
              <h2 className="text-[14px] font-semibold text-[#1C1917]">All Agents</h2>
              <span className="text-[12px] text-[#8E7E68]">{agents.length} agents</span>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : agents.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No agents yet"
                description="Create your first AI agent to start intelligent business automation."
              />
            ) : (
              <div className="divide-y divide-[#F5E6CC]">
                {agents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/ai/agents/${agent.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-[#FBF5EC] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-[#064E3B]/10 p-2">
                        <Bot className="h-4 w-4 text-[#064E3B]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1C1917] truncate">{agent.name}</p>
                        <p className="text-[11px] text-[#8E7E68]">
                          {agent.agentType} · {agent.description ? agent.description.substring(0, 60) : 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={agent.status} />
                      <span className="text-[11px] text-[#8E7E68] whitespace-nowrap">
                        {agent._count.tasks} tasks
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#A7F3D0]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profiles Tab */}
        {activeTab === 'profiles' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <div
                key={profile.type}
                className="rounded-lg border border-[#DDD0BB] bg-white p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-[#064E3B]/10 p-2">
                    <Bot className="h-5 w-5 text-[#064E3B]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#1C1917]">{profile.name}</h3>
                    <p className="text-[11px] text-[#8E7E68]">{profile.type}</p>
                  </div>
                </div>
                <p className="text-[12px] text-[#57534E] mb-4">{profile.description}</p>
                <div className="mb-4">
                  <p className="text-[11px] font-medium text-[#8E7E68] mb-2">SUGGESTED GOALS</p>
                  <ul className="space-y-1">
                    {profile.suggestedGoals.map((goal, i) => (
                      <li key={i} className="text-[12px] text-[#57534E]">• {goal}</li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/ai/agents/new?profile=${profile.type}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#DDD0BB] px-3 py-1.5 text-[12px] font-medium text-[#57534E] hover:border-[#064E3B] hover:text-[#064E3B] transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Create from Profile
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
