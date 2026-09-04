'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bot, ArrowLeft, PlayCircle, Pause, Play, Settings, CheckCircle, XCircle, Clock, AlertTriangle, Eye, Brain } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  agentType: string;
  status: string;
  configuration: Record<string, unknown>;
  currentVersion: { id: string; versionNumber: number; status: string; configuration: Record<string, unknown> } | null;
  versions: Array<{ id: string; versionNumber: number; status: string; createdAt: string }>;
  createdBy: { id: string; firstName: string | null; lastName: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentTask {
  id: string;
  goal: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  toolCallCount: number;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  user: { id: string; firstName: string | null; lastName: string | null };
  createdAt: string;
}

interface Plan {
  goal: string;
  steps: Array<{ stepNumber: number; tool: string; purpose: string; riskLevel: string }>;
  requiresApproval: boolean;
  maxRiskLevel: string;
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = (params?.id as string) ?? '';

  const [agent, setAgent] = useState<Agent | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'versions'>('overview');
  const [taskGoal, setTaskGoal] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [createdTaskResult, setCreatedTaskResult] = useState<{ plan: Plan; task: { id: string } } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [agentRes, tasksRes] = await Promise.all([
          fetch(`/api/v1/ai/agents/${agentId}`).then(r => r.json()),
          fetch(`/api/v1/ai/agents/${agentId}/tasks`).then(r => r.json()),
        ]);
        if (agentRes) setAgent(agentRes);
        if (tasksRes.data) setTasks(tasksRes.data);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentId]);

  async function handleCreateTask() {
    if (!taskGoal.trim()) return;
    setCreatingTask(true);
    try {
      const res = await fetch(`/api/v1/ai/agents/${agentId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: taskGoal }),
      });
      const data = await res.json();
      if (data.task) {
        setCreatedTaskResult(data);
        setTaskGoal('');
        // Refresh tasks list
        const tasksRes = await fetch(`/api/v1/ai/agents/${agentId}/tasks`).then(r => r.json());
        if (tasksRes.data) setTasks(tasksRes.data);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleExecuteTask(taskId: string) {
    try {
      await fetch(`/api/v1/ai/agents/tasks/${taskId}/execute`, { method: 'POST' });
      const tasksRes = await fetch(`/api/v1/ai/agents/${agentId}/tasks`).then(r => r.json());
      if (tasksRes.data) setTasks(tasksRes.data);
    } catch (err) {
      console.error('Failed to execute task:', err);
    }
  }

  async function handlePublish() {
    try {
      await fetch(`/api/v1/ai/agents/${agentId}/publish`, { method: 'POST' });
      const agentRes = await fetch(`/api/v1/ai/agents/${agentId}`).then(r => r.json());
      if (agentRes) setAgent(agentRes);
    } catch (err) {
      console.error('Failed to publish agent:', err);
    }
  }

  async function handlePause() {
    try {
      await fetch(`/api/v1/ai/agents/${agentId}/pause`, { method: 'POST' });
      const agentRes = await fetch(`/api/v1/ai/agents/${agentId}`).then(r => r.json());
      if (agentRes) setAgent(agentRes);
    } catch (err) {
      console.error('Failed to pause agent:', err);
    }
  }

  async function handleResume() {
    try {
      await fetch(`/api/v1/ai/agents/${agentId}/resume`, { method: 'POST' });
      const agentRes = await fetch(`/api/v1/ai/agents/${agentId}`).then(r => r.json());
      if (agentRes) setAgent(agentRes);
    } catch (err) {
      console.error('Failed to resume agent:', err);
    }
  }

  const config = agent?.configuration as Record<string, unknown> | undefined;
  const allowedTools = (config?.['allowedTools'] as string[]) ?? [];

  return (
    <div className="min-h-screen bg-[#FBF5EC]">
      <PageHeader
        title={agent?.name ?? 'Agent Details'}
        description={agent?.description ?? `Type: ${agent?.agentType ?? 'Unknown'}`}
        actions={
          <div className="flex items-center gap-2">
            {agent?.status === 'DRAFT' && (
              <button
                onClick={handlePublish}
                className="inline-flex items-center gap-2 rounded-lg bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] transition-colors"
              >
                <PlayCircle className="h-4 w-4" />
                Publish
              </button>
            )}
            {agent?.status === 'ACTIVE' && (
              <button
                onClick={handlePause}
                className="inline-flex items-center gap-2 rounded-lg border border-[#DDD0BB] px-4 py-2 text-[13px] font-medium text-[#57534E] hover:border-[#1C1917] hover:text-[#1C1917] transition-colors"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
            )}
            {agent?.status === 'PAUSED' && (
              <button
                onClick={handleResume}
                className="inline-flex items-center gap-2 rounded-lg border border-[#DDD0BB] px-4 py-2 text-[13px] font-medium text-[#57534E] hover:border-[#1C1917] hover:text-[#1C1917] transition-colors"
              >
                <Play className="h-4 w-4" />
                Resume
              </button>
            )}
          </div>
        }
      />

      <div className="p-5 lg:p-6">
        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-lg border border-[#DDD0BB] bg-white p-1 w-fit">
          {(['overview', 'tasks', 'versions'] as const).map((tab) => (
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Status Card */}
            <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
              <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Status</h3>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8E7E68]">Status</span>
                    <StatusBadge status={agent?.status ?? 'UNKNOWN'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8E7E68]">Type</span>
                    <span className="text-[12px] font-medium text-[#1C1917]">{agent?.agentType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8E7E68]">Version</span>
                    <span className="text-[12px] font-medium text-[#1C1917]">
                      v{agent?.currentVersion?.versionNumber ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8E7E68]">Created by</span>
                    <span className="text-[12px] font-medium text-[#1C1917]">
                      {agent?.createdBy?.firstName} {agent?.createdBy?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8E7E68]">Created</span>
                    <span className="text-[12px] text-[#1C1917]">
                      {agent?.createdAt ? new Date(agent.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tools Card */}
            <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
              <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Allowed Tools</h3>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : allowedTools.length === 0 ? (
                <p className="text-[12px] text-[#8E7E68]">No tools configured.</p>
              ) : (
                <div className="space-y-2">
                  {allowedTools.map((tool) => (
                    <div key={tool} className="flex items-center gap-2 rounded bg-[#FBF5EC] px-3 py-2">
                      <Settings className="h-3 w-3 text-[#8E7E68]" />
                      <span className="text-[12px] font-mono text-[#57534E]">{tool}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Task Creator */}
            <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
              <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Create Task</h3>
              {agent?.status !== 'ACTIVE' ? (
                <p className="text-[12px] text-[#8E7E68]">Agent must be active to create tasks.</p>
              ) : (
                <>
                  <textarea
                    value={taskGoal}
                    onChange={(e) => setTaskGoal(e.target.value)}
                    placeholder="Describe what you want the agent to do..."
                    className="w-full rounded-lg border border-[#DDD0BB] px-3 py-2 text-[13px] text-[#1C1917] placeholder-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B] resize-none"
                    rows={4}
                  />
                  <button
                    onClick={handleCreateTask}
                    disabled={creatingTask || !taskGoal.trim()}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creatingTask ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Create Task
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Created Task Result */}
        {createdTaskResult && (
          <div className="mt-5 rounded-lg border border-[#064E3B]/20 bg-[#064E3B]/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-[#064E3B]">Task Created — Execution Plan</h3>
              <button
                onClick={() => handleExecuteTask(createdTaskResult.task.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors"
              >
                <PlayCircle className="h-3 w-3" />
                Execute Now
              </button>
            </div>
            <p className="text-[12px] text-[#57534E] mb-3">Goal: {createdTaskResult.plan.goal}</p>
            <div className="space-y-2">
              {createdTaskResult.plan.steps.map((step) => (
                <div key={step.stepNumber} className="flex items-center gap-3 rounded bg-white border border-[#DDD0BB] px-3 py-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#064E3B]/10 text-[10px] font-semibold text-[#064E3B]">
                    {step.stepNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#1C1917]">{step.tool}</p>
                    <p className="text-[11px] text-[#8E7E68]">{step.purpose}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    step.riskLevel === 'READ_ONLY' ? 'bg-emerald-50 text-emerald-700' :
                    step.riskLevel === 'LOW' ? 'bg-blue-50 text-blue-700' :
                    step.riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {step.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="rounded-lg border border-[#DDD0BB] bg-white">
            <div className="flex items-center justify-between border-b border-[#DDD0BB] px-5 py-3">
              <h2 className="text-[14px] font-semibold text-[#1C1917]">Tasks</h2>
              <span className="text-[12px] text-[#8E7E68]">{tasks.length} tasks</span>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No tasks yet"
                description="Create a task to see the agent in action."
              />
            ) : (
              <div className="divide-y divide-[#F5E6CC]">
                {tasks.map((task) => (
                  <div key={task.id} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1C1917] truncate">{task.goal}</p>
                        <p className="text-[11px] text-[#8E7E68]">
                          by {task.user?.firstName} {task.user?.lastName} · {new Date(task.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={task.status} />
                        <span className="text-[11px] text-[#8E7E68]">
                          Step {task.currentStep}/{task.totalSteps}
                        </span>
                        {task.status === 'WAITING_APPROVAL' && (
                          <button
                            onClick={() => {/* TODO: approval modal */}}
                            className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                    {task.duration && (
                      <p className="mt-1 text-[11px] text-[#8E7E68]">
                        Duration: {task.duration}ms · Tool calls: {task.toolCallCount}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div className="rounded-lg border border-[#DDD0BB] bg-white">
            <div className="border-b border-[#DDD0BB] px-5 py-3">
              <h2 className="text-[14px] font-semibold text-[#1C1917]">Versions</h2>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : agent?.versions?.length === 0 ? (
              <EmptyState
                icon={Settings}
                title="No versions"
                description="Publish the agent to create its first version."
              />
            ) : (
              <div className="divide-y divide-[#F5E6CC]">
                {agent?.versions?.map((version) => (
                  <div key={version.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E6CC] text-[11px] font-semibold text-[#57534E]">
                        v{version.versionNumber}
                      </span>
                      <div>
                        <p className="text-[12px] font-medium text-[#1C1917]">Version {version.versionNumber}</p>
                        <p className="text-[11px] text-[#8E7E68]">
                          Created {new Date(version.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={version.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
