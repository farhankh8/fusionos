'use client';

import { useState, useEffect } from 'react';
import { Server, Cpu, Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';

interface RuntimeStatus {
  provider: string;
  status: string;
  ollama: {
    reachable: boolean;
    baseUrl: string;
    configuredModel: string;
    modelInstalled: boolean;
    installedModels: string[];
    lastHealthCheck: string | null;
    latencyMs: number;
  };
  capabilities: {
    textGeneration: boolean;
    structuredOutput: boolean;
    contextSources: number;
    tools: number;
  };
  usage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatencyMs: number;
    totalTokensUsed: number;
    lastRequestAt: string | null;
  };
}

export default function AIRuntimeSettingsPage() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthChecking, setHealthChecking] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await fetch('/api/v1/ai/runtime/status');
      const data = await res.json();
      if (data) setStatus(data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  async function handleHealthCheck() {
    setHealthChecking(true);
    try {
      await fetch('/api/v1/ai/runtime/health', { method: 'POST' });
      await loadStatus();
    } catch {
      // Silent fail
    } finally {
      setHealthChecking(false);
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'READY': return 'text-emerald-600 bg-emerald-50';
      case 'UNAVAILABLE': return 'text-red-600 bg-red-50';
      case 'MODEL_MISSING': return 'text-amber-600 bg-amber-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF5EC]">
      <PageHeader
        title="AI Runtime Settings"
        description="Monitor and configure the Ollama AI runtime."
        actions={
          <button
            onClick={handleHealthCheck}
            disabled={healthChecking}
            className="inline-flex items-center gap-2 rounded-lg border border-[#DDD0BB] px-4 py-2 text-[13px] font-medium text-[#57534E] hover:border-[#1C1917] hover:text-[#1C1917] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${healthChecking ? 'animate-spin' : ''}`} />
            {healthChecking ? 'Checking...' : 'Health Check'}
          </button>
        }
      />

      <div className="p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Connection Status */}
          <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4 flex items-center gap-2">
              <Server className="h-4 w-4 text-[#8E7E68]" />
              AI Runtime
            </h3>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Provider</span>
                  <span className="text-[12px] font-medium text-[#1C1917]">{status?.provider ?? 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Status</span>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${statusColor(status?.status ?? 'UNKNOWN')}`}>
                    {status?.status ?? 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Ollama Reachable</span>
                  {status?.ollama.reachable ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Base URL</span>
                  <span className="text-[12px] font-mono text-[#57534E]">{status?.ollama.baseUrl ?? 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Latency</span>
                  <span className="text-[12px] text-[#57534E]">{status?.ollama.latencyMs ?? 0}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Last Health Check</span>
                  <span className="text-[12px] text-[#57534E]">
                    {status?.ollama.lastHealthCheck ? new Date(status.ollama.lastHealthCheck).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Model Info */}
          <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#8E7E68]" />
              Model
            </h3>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Configured Model</span>
                  <span className="text-[12px] font-medium text-[#1C1917]">{status?.ollama.configuredModel ?? 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Model Installed</span>
                  {status?.ollama.modelInstalled ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                {status?.ollama.installedModels && status.ollama.installedModels.length > 0 && (
                  <div>
                    <span className="text-[12px] text-[#8E7E68] block mb-2">Installed Models</span>
                    <div className="space-y-1">
                      {status.ollama.installedModels.map((model) => (
                        <div key={model} className="flex items-center gap-2 rounded bg-[#FBF5EC] px-2 py-1">
                          <Cpu className="h-3 w-3 text-[#8E7E68]" />
                          <span className="text-[11px] font-mono text-[#57534E]">{model}</span>
                          {model === status?.ollama.configuredModel && (
                            <span className="rounded bg-[#064E3B]/10 px-1 text-[9px] font-medium text-[#064E3B]">DEFAULT</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Capabilities */}
          <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#8E7E68]" />
              Capabilities
            </h3>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Text Generation</span>
                  {status?.capabilities.textGeneration ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Structured Output</span>
                  {status?.capabilities.structuredOutput ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Context Sources</span>
                  <span className="text-[12px] font-medium text-[#1C1917]">{status?.capabilities.contextSources ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Tools</span>
                  <span className="text-[12px] font-medium text-[#1C1917]">{status?.capabilities.tools ?? 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          <div className="rounded-lg border border-[#DDD0BB] bg-white p-5">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#8E7E68]" />
              Usage Statistics
            </h3>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Total Requests</span>
                  <span className="text-[12px] font-medium text-[#1C1917]">{status?.usage.totalRequests ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Successful</span>
                  <span className="text-[12px] font-medium text-emerald-600">{status?.usage.successfulRequests ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Failed</span>
                  <span className="text-[12px] font-medium text-red-600">{status?.usage.failedRequests ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Avg Latency</span>
                  <span className="text-[12px] text-[#57534E]">{status?.usage.averageLatencyMs ?? 0}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Total Tokens</span>
                  <span className="text-[12px] text-[#57534E]">{(status?.usage.totalTokensUsed ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#8E7E68]">Last Request</span>
                  <span className="text-[12px] text-[#57534E]">
                    {status?.usage.lastRequestAt ? new Date(status.usage.lastRequestAt).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
