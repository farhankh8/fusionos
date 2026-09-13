'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, MessageSquare, Trash2, Lightbulb, AlertCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface Conversation {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Insight {
  category: string;
  title: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: string[];
}

const SUGGESTED_QUESTIONS = [
  'How many employees are currently active?',
  'Which invoices are overdue?',
  'How is the CRM pipeline performing?',
  'Show failed automation executions.',
  'Summarize business performance.',
];

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: 'bg-emerald-50 text-emerald-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  LOW: 'bg-slate-50 text-slate-700',
};

export default function AICommandCenterPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/ai/conversations');
        const data = await res.json();
        setConversations(data);
      } catch {
        setConversations([]);
      }
    }
    load();
  }, []);

  // Load insights
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/ai/insights');
        const data = await res.json();
        setInsights(data.insights ?? []);
      } catch {
        setInsights([]);
      } finally {
        setLoadingInsights(false);
      }
    }
    load();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message?: string) => {
    const text = message ?? input;
    if (!text.trim() || loading) return;

    setInput('');
    setLoading(true);
    setError(null);

    // Add user message optimistically
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/v1/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: activeConversationId,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      }

      // Update conversation ID if new
      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
        // Reload conversations
        const convRes = await fetch('/api/v1/ai/conversations');
        const convData = await convRes.json();
        setConversations(convData);
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: `temp-${Date.now() + 1}`,
        role: 'ASSISTANT',
        content: data.response,
        metadata: { sources: data.sources, latencyMs: data.latencyMs },
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.filter((m) => !m.id.startsWith('temp-')), userMsg, assistantMsg]);
    } catch {
      setError('Failed to process your request. Please try again.');
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/ai/conversations/${id}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/v1/ai/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewConversation();
      }
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF5EC]">
      <PageHeader
        title="AI Command Center"
        description="Your intelligent interface to FusionOS"
      />

      <div className="flex h-[calc(100vh-120px)]">
        {/* Left: Conversation History */}
        <div className="w-64 border-r border-[#DDD0BB] bg-white flex flex-col">
          <div className="p-3 border-b border-[#DDD0BB]">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#064E3B] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#047857] transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              New Conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-[12px] text-[#8E7E68]">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F5E6CC]">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#FBF5EC] transition-colors ${
                      activeConversationId === conv.id ? 'bg-[#D1FAE5]' : ''
                    }`}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <MessageSquare className="h-4 w-4 text-[#8E7E68] shrink-0" />
                    <span className="flex-1 text-[12px] text-[#1C1917] truncate">
                      {conv.title ?? 'New Conversation'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="rounded p-1 text-[#8E7E68] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Conversation Area */}
        <div className="flex-1 flex flex-col">
          {messages.length === 0 && !loading ? (
            /* Welcome State */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D1FAE5] mb-4">
                <Sparkles className="h-8 w-8 text-[#064E3B]" />
              </div>
              <h2 className="text-[20px] font-semibold text-[#1C1917] mb-1">
                AI Command Center
              </h2>
              <p className="text-[13px] text-[#57534E] mb-6 text-center max-w-md">
                Ask questions about your business data. Get insights from workforce,
                finance, CRM, projects, and automation.
              </p>

              {/* Suggested Questions */}
              <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="flex items-center gap-3 rounded-lg border border-[#DDD0BB] bg-white px-4 py-3 text-left text-[13px] text-[#1C1917] hover:border-[#064E3B] hover:bg-[#FBF5EC] transition-colors"
                  >
                    <Lightbulb className="h-4 w-4 text-[#064E3B] shrink-0" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-3 ${
                      msg.role === 'USER'
                        ? 'bg-[#064E3B] text-white'
                        : 'bg-white border border-[#DDD0BB] text-[#1C1917]'
                    }`}
                  >
                    <p className="text-[13px] whitespace-pre-wrap">{msg.content}</p>
                    {msg.metadata && (
                      <div className="mt-2 pt-2 border-t border-[#DDD0BB]/30">
                        <div className="flex flex-wrap gap-1.5">
                          {(msg.metadata.sources as string[])?.map((source, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded bg-[#D1FAE5] px-1.5 py-0.5 text-[10px] font-medium text-[#064E3B]"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#DDD0BB] rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-[13px] text-[#57534E]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-start">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-[13px] text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[#DDD0BB] bg-white p-4">
            <div className="flex items-center gap-2 max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about your business..."
                disabled={loading}
                className="flex-1 rounded-lg border border-[#DDD0BB] bg-white px-4 py-2.5 text-[13px] text-[#1C1917] placeholder-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B] disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="rounded-lg bg-[#064E3B] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[#047857] disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Insights */}
        <div className="w-72 border-l border-[#DDD0BB] bg-white flex flex-col">
          <div className="p-3 border-b border-[#DDD0BB]">
            <h3 className="text-[13px] font-semibold text-[#1C1917]">Insights</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingInsights ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : insights.length === 0 ? (
              <EmptyState
                icon={Lightbulb}
                title="No insights yet"
                description="Ask a question to generate insights."
              />
            ) : (
              insights.map((insight, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#DDD0BB] p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium text-[#57534E] uppercase">
                      {insight.category}
                    </span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium ${CONFIDENCE_COLORS[insight.confidence]}`}>
                      {insight.confidence}
                    </span>
                  </div>
                  <p className="text-[12px] font-medium text-[#1C1917] mb-0.5">
                    {insight.title}
                  </p>
                  <p className="text-[11px] text-[#57534E]">
                    {insight.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
