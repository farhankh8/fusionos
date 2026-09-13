'use client';

import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, CheckCircle, Activity, BarChart3, Users, Briefcase, FolderKanban, Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface HealthSection {
  module: string;
  kpi: Record<string, number>;
  issues: string[];
  status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
}

interface Insight {
  category: string;
  title: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: string[];
  modules: string[];
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  category: string;
  overallRisk: string;
  stepCount: number;
  involvedModules: string[];
}

const moduleIcons: Record<string, React.ReactNode> = {
  Finance: <BarChart3 className="h-5 w-5" />,
  Workforce: <Users className="h-5 w-5" />,
  CRM: <Briefcase className="h-5 w-5" />,
  Projects: <FolderKanban className="h-5 w-5" />,
  Automation: <Zap className="h-5 w-5" />,
};

export default function IntelligencePage() {
  const [health, setHealth] = useState<{ sections: HealthSection[] } | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [healthRes, insightsRes, scenariosRes] = await Promise.all([
          fetch('/api/v1/intelligence/business-health').then(r => r.json()),
          fetch('/api/v1/intelligence/insights').then(r => r.json()),
          fetch('/api/v1/intelligence/scenarios').then(r => r.json()),
        ]);
        if (healthRes) setHealth(healthRes);
        if (insightsRes?.insights) setInsights(insightsRes.insights);
        if (Array.isArray(scenariosRes)) setScenarios(scenariosRes);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const overallStatus = health?.sections?.every((s) => s.status === 'HEALTHY') ? 'HEALTHY' : 'ATTENTION';

  return (
    <div className="min-h-screen bg-[#FBF5EC]">
      <PageHeader
        title="Business Intelligence"
        description="Cross-module business health, insights, and orchestrated scenarios."
      />

      <div className="p-5 lg:p-6">
        {/* Overall Status */}
        <div className="mb-5 rounded-lg border border-[#DDD0BB] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${overallStatus === 'HEALTHY' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              {overallStatus === 'HEALTHY' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[#1C1917]">Overall Business Health</h2>
              <p className="text-[12px] text-[#8E7E68]">
                {overallStatus === 'HEALTHY' ? 'All modules operating normally.' : 'Some modules require attention.'}
              </p>
            </div>
          </div>
        </div>

        {/* Module Health Cards */}
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-[#1C1917] mb-3">Module Health</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-[#DDD0BB] bg-white p-5">
                  <Skeleton className="h-5 w-24 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            ) : health?.sections?.map((section) => (
              <div key={section.module} className="rounded-lg border border-[#DDD0BB] bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${
                      section.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {moduleIcons[section.module] ?? <Activity className="h-5 w-5" />}
                    </div>
                    <h4 className="text-[13px] font-semibold text-[#1C1917]">{section.module}</h4>
                  </div>
                  <StatusBadge status={section.status} />
                </div>
                <div className="space-y-2">
                  {Object.entries(section.kpi).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[11px] text-[#8E7E68]">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-[12px] font-medium text-[#1C1917]">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
                {section.issues.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {section.issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {issue}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-[#1C1917] mb-3">Cross-Module Insights</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : insights.length === 0 ? (
            <div className="rounded-lg border border-[#DDD0BB] bg-white p-8">
              <EmptyState
                icon={Brain}
                title="No insights yet"
                description="Insights will appear as business data accumulates across modules."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="rounded-lg border border-[#DDD0BB] bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          insight.confidence === 'HIGH' ? 'bg-emerald-50 text-emerald-700' :
                          insight.confidence === 'MEDIUM' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-50 text-slate-700'
                        }`}>
                          {insight.confidence}
                        </span>
                        <span className="text-[11px] text-[#8E7E68]">{insight.category}</span>
                      </div>
                      <h4 className="text-[13px] font-medium text-[#1C1917]">{insight.title}</h4>
                      <p className="text-[12px] text-[#57534E] mt-0.5">{insight.description}</p>
                    </div>
                    <div className="flex gap-1">
                      {insight.modules.map((mod) => (
                        <span key={mod} className="rounded bg-[#F5E6CC] px-1.5 py-0.5 text-[9px] text-[#8E7E68]">
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scenarios */}
        <div>
          <h3 className="text-[13px] font-semibold text-[#1C1917] mb-3">Orchestration Scenarios</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#DDD0BB] bg-white">
              <div className="divide-y divide-[#F5E6CC]">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1C1917]">{scenario.name}</p>
                        <p className="text-[11px] text-[#8E7E68]">{scenario.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#F5E6CC] px-2 py-0.5 text-[10px] font-medium text-[#57534E]">
                          {scenario.category}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                          scenario.overallRisk === 'READ_ONLY' ? 'bg-emerald-50 text-emerald-700' :
                          scenario.overallRisk === 'LOW' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {scenario.overallRisk}
                        </span>
                        <span className="text-[11px] text-[#8E7E68]">{scenario.stepCount} steps</span>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {scenario.involvedModules.map((mod) => (
                        <span key={mod} className="rounded bg-[#FBF5EC] px-1.5 py-0.5 text-[9px] text-[#8E7E68]">
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
