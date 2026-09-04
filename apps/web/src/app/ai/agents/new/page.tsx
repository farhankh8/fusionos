'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, ArrowLeft, Save, Settings, Shield, Clock, Target } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentProfile {
  name: string;
  type: string;
  description: string;
  purpose: string;
  allowedTools: string[];
  suggestedGoals: string[];
}

export default function NewAgentPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState<string>('HR');
  const [selectedProfile, setSelectedProfile] = useState<AgentProfile | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/ai/agents/profiles');
        const data = await res.json();
        if (data) setProfiles(data);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleSelectProfile(profile: AgentProfile) {
    setSelectedProfile(profile);
    setAgentType(profile.type);
    setName(`${profile.name}`);
    setDescription(profile.description);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);

    try {
      const config: Record<string, unknown> = {};
      if (selectedProfile) {
        config['allowedTools'] = selectedProfile.allowedTools;
        config['contextSources'] = [];
        config['riskPolicy'] = {
          maxRiskLevel: 'LOW',
          requiresApprovalAbove: 'LOW',
        };
        config['limits'] = {
          maxSteps: 5,
          maxToolCalls: 5,
          maxExecutionDurationMs: 30000,
          maxRetries: 2,
        };
      }

      const res = await fetch('/api/v1/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          agentType,
          configuration: config,
        }),
      });

      const data = await res.json();
      if (data.id) {
        router.push(`/ai/agents/${data.id}`);
      }
    } catch (err) {
      console.error('Failed to create agent:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF5EC]">
      <PageHeader
        title="Create AI Agent"
        description="Configure a new AI agent for your business."
        actions={
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Creating...' : 'Create Agent'}
          </button>
        }
      />

      <div className="p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Profile Selection */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
              <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Choose Agent Profile</h3>
              {loading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {profiles.map((profile) => (
                    <button
                      key={profile.type}
                      onClick={() => handleSelectProfile(profile)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        selectedProfile?.type === profile.type
                          ? 'border-[#064E3B] bg-[#064E3B]/5'
                          : 'border-[#DDD0BB] hover:border-[#A7F3D0]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className={`h-4 w-4 ${
                          selectedProfile?.type === profile.type ? 'text-[#064E3B]' : 'text-[#8E7E68]'
                        }`} />
                        <span className="text-[12px] font-semibold text-[#1C1917]">{profile.name}</span>
                      </div>
                      <p className="text-[11px] text-[#57534E] line-clamp-2">{profile.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {profile.allowedTools.slice(0, 3).map((tool) => (
                          <span key={tool} className="rounded bg-[#F5E6CC] px-1.5 py-0.5 text-[9px] font-mono text-[#8E7E68]">
                            {tool.replace('get_', '')}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Configuration Form */}
            <div className="mt-5 rounded-lg border border-[#DDD0BB] bg-white p-5">
              <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Agent Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Agent Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Finance Intelligence Agent"
                    className="w-full rounded-lg border border-[#DDD0BB] px-3 py-2 text-[13px] text-[#1C1917] placeholder-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this agent do?"
                    className="w-full rounded-lg border border-[#DDD0BB] px-3 py-2 text-[13px] text-[#1C1917] placeholder-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B] resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Agent Type</label>
                  <select
                    value={agentType}
                    onChange={(e) => setAgentType(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD0BB] px-3 py-2 text-[13px] text-[#1C1917] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
                  >
                    <option value="HR">HR / Workforce</option>
                    <option value="FINANCE">Finance</option>
                    <option value="CRM">CRM / Sales</option>
                    <option value="PROJECTS">Projects</option>
                    <option value="OPERATIONS">Operations</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="space-y-5">
            <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
              <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Configuration Summary</h3>
              {selectedProfile ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-[#8E7E68]" />
                      <span className="text-[12px] font-medium text-[#57534E]">Allowed Tools</span>
                    </div>
                    <div className="space-y-1">
                      {selectedProfile.allowedTools.map((tool) => (
                        <div key={tool} className="flex items-center gap-2 rounded bg-[#FBF5EC] px-2 py-1">
                          <Settings className="h-3 w-3 text-[#8E7E68]" />
                          <span className="text-[11px] font-mono text-[#57534E]">{tool}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-[#8E7E68]" />
                      <span className="text-[12px] font-medium text-[#57534E]">Risk Policy</span>
                    </div>
                    <p className="text-[11px] text-[#57534E]">
                      Max risk: LOW. Approval required for write operations.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-[#8E7E68]" />
                      <span className="text-[12px] font-medium text-[#57534E]">Limits</span>
                    </div>
                    <p className="text-[11px] text-[#57534E]">
                      Max 5 steps, 5 tool calls, 30s execution, 2 retries.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-[#8E7E68]">Select a profile to see configuration details.</p>
              )}
            </div>

            {/* Suggested Goals */}
            {selectedProfile && (
              <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
                <h3 className="text-[13px] font-semibold text-[#1C1917] mb-3">Suggested Goals</h3>
                <ul className="space-y-2">
                  {selectedProfile.suggestedGoals.map((goal, i) => (
                    <li key={i} className="text-[12px] text-[#57534E]">• {goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
