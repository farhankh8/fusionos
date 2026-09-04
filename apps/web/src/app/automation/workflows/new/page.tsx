'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Play, Plus, Trash2, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

interface TriggerOption {
  eventType: string;
  entityType: string;
  entityLabel: string;
  eventLabel: string;
  module: string;
  availableFields: Array<{
    entity: string;
    field: string;
    label: string;
    type: string;
    enumValues?: string[];
  }>;
}

interface ConditionRow {
  entity: string;
  field: string;
  operator: string;
  value: string;
}

interface ActionRow {
  type: string;
  config: Record<string, string>;
}

interface TriggerConfig {
  type: string;
  entityType: string;
  eventType: string;
}

interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Array<{ entity: string; field: string; operator: string; value: unknown }>;
}

interface ActionConfig {
  type: string;
  config: Record<string, unknown>;
}

const OPERATORS_BY_TYPE: Record<string, string[]> = {
  STRING: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  NUMBER: ['equals', 'notEquals', 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual'],
  ENUM: ['equals', 'notEquals', 'in', 'notIn'],
  DATE: ['before', 'after', 'on', 'beforeOrEqual', 'afterOrEqual', 'between'],
  BOOLEAN: ['equals'],
  NULL: ['isNull', 'isNotNull'],
};

export default function NewWorkflowPage() {
  const router = useRouter();

  // Step tracking
  const [step, setStep] = useState<'configure' | 'review'>('configure');

  // Workflow meta
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Trigger
  const [triggers, setTriggers] = useState<TriggerOption[]>([]);
  const [selectedEventType, setSelectedEventType] = useState('');
  const [loadingTriggers, setLoadingTriggers] = useState(true);

  // Conditions
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<ConditionRow[]>([]);

  // Actions
  const [actions, setActions] = useState<ActionRow[]>([]);

  // Validation & Saving
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    async function loadTriggers() {
      try {
        const res = await fetch('/api/v1/automation/triggers');
        const data = await res.json();
        setTriggers(data);
      } catch {
        setTriggers([]);
      } finally {
        setLoadingTriggers(false);
      }
    }
    loadTriggers();
  }, []);

  const selectedTrigger = triggers.find((t) => t.eventType === selectedEventType);

  const addCondition = () => {
    setConditions([...conditions, { entity: '', field: '', operator: 'equals', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: { entity?: string; field?: string; operator?: string; value?: string }) => {
    setConditions(prev => prev.map((c, i) => i === index ? {
      entity: updates.entity ?? c.entity,
      field: updates.field ?? c.field,
      operator: updates.operator ?? c.operator,
      value: updates.value ?? c.value,
    } : c));
  };

  const addAction = (actionType: string) => {
    const newAction: ActionRow = { type: actionType, config: {} };
    setActions([...actions, newAction]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateActionConfig = (index: number, key: string, value: string) => {
    setActions(prev => prev.map((a, i) => i === index ? {
      ...a,
      config: { ...a.config, [key]: value },
    } : a));
  };

  const handleSave = async (publish: boolean = false) => {
    if (!name.trim() || !selectedEventType) return;

    setSaving(true);
    try {
      // 1. Create workflow
      const wfRes = await fetch('/api/v1/automation/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const wfData = await wfRes.json();
      const workflowId = wfData.id;

      // 2. Save version config
      const triggerConfig: TriggerConfig = {
        type: 'DOMAIN_EVENT',
        entityType: selectedTrigger?.entityType ?? '',
        eventType: selectedEventType,
      };

      const conditionGroup: ConditionGroup | undefined = conditions.length > 0
        ? {
            logic: conditionLogic,
            conditions: conditions
              .filter((c) => c.entity && c.field)
              .map((c) => ({
                entity: c.entity,
                field: c.field,
                operator: c.operator,
                value: c.value,
              })),
          }
        : undefined;

      const actionsConfig: ActionConfig[] = actions.map((a) => ({
        type: a.type,
        config: a.config,
      }));

      await fetch(`/api/v1/automation/workflows/${workflowId}/versions/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerConfig,
          conditionConfig: conditionGroup,
          actionsConfig,
        }),
      });

      // 3. Optionally publish
      if (publish) {
        await fetch(`/api/v1/automation/workflows/${workflowId}/publish`, {
          method: 'POST',
        });
      }

      router.push(`/automation/workflows/${workflowId}`);
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageHeader
        title="Create Workflow"
        description="Build a new automation workflow"
        breadcrumbs={[
          { label: 'Automation', href: '/automation' },
          { label: 'Workflows', href: '/automation/workflows' },
          { label: 'New' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !name.trim() || !selectedEventType}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-medium text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> Save as Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !name.trim() || !selectedEventType}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Publish
            </button>
          </div>
        }
      />

      <div className="p-5 lg:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Step 1: Workflow Name */}
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
            <h3 className="text-[14px] font-semibold text-[#0F172A] mb-3">Workflow Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Invoice Overdue Notification"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional description..."
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Trigger */}
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
            <h3 className="text-[14px] font-semibold text-[#0F172A] mb-3">
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#2563EB]" />
                Trigger
              </span>
            </h3>
            {loadingTriggers ? (
              <div className="animate-pulse space-y-2">
                <div className="h-10 w-full rounded bg-[#F1F5F9]" />
              </div>
            ) : (
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1">Event *</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="">Select an event...</option>
                  {Object.entries(
                    triggers.reduce<Record<string, TriggerOption[]>>((acc, t) => {
                      (acc[t.module] ??= []).push(t);
                      return acc;
                    }, {}),
                  ).map(([module, options]) => (
                    <optgroup key={module} label={module}>
                      {options.map((t) => (
                        <option key={t.eventType} value={t.eventType}>
                          {t.entityLabel} — {t.eventLabel}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {selectedTrigger && (
                  <p className="mt-2 text-[12px] text-[#64748B]">
                    When a <strong>{selectedTrigger.entityLabel}</strong> {selectedTrigger.eventLabel.toLowerCase()} event fires
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Step 3: Conditions */}
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-[#0F172A]">Conditions</h3>
              <button
                onClick={addCondition}
                disabled={!selectedTrigger}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add Condition
              </button>
            </div>

            {conditions.length > 0 && (
              <div className="mb-3">
                <select
                  value={conditionLogic}
                  onChange={(e) => setConditionLogic(e.target.value as 'AND' | 'OR')}
                  className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="AND">ALL conditions must match (AND)</option>
                  <option value="OR">ANY condition can match (OR)</option>
                </select>
              </div>
            )}

            {conditions.length === 0 ? (
              <p className="text-[13px] text-[#94A3B8]">No conditions — workflow will always run when triggered.</p>
            ) : (
              <div className="space-y-2">
                {conditions.map((cond, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && (
                      <span className="text-[11px] font-semibold text-[#64748B] w-8">{conditionLogic}</span>
                    )}
                    <select
                      value={cond.field ? `${cond.entity}.${cond.field}` : ''}
                      onChange={(e) => {
                        const [entity, field] = e.target.value.split('.');
                        updateCondition(i, { entity: entity ?? '', field: field ?? '' });
                      }}
                      className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                    >
                      <option value="">Select field...</option>
                      {selectedTrigger?.availableFields.map((f) => (
                        <option key={`${f.entity}.${f.field}`} value={`${f.entity}.${f.field}`}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(i, { operator: e.target.value })}
                      className="w-40 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                    >
                      {(OPERATORS_BY_TYPE[
                        selectedTrigger?.availableFields.find((f) => f.entity === cond.entity && f.field === cond.field)?.type ?? 'STRING'
                      ] ?? ['equals']).map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    {!['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(cond.operator) && (
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => updateCondition(i, { value: e.target.value })}
                        placeholder="Value"
                        className="w-40 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
                      />
                    )}
                    <button
                      onClick={() => removeCondition(i)}
                      className="rounded p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 4: Actions */}
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
            <h3 className="text-[14px] font-semibold text-[#0F172A] mb-3">Actions</h3>

            {actions.length === 0 ? (
              <p className="text-[13px] text-[#94A3B8] mb-3">No actions added yet.</p>
            ) : (
              <div className="space-y-3 mb-3">
                {actions.map((action, i) => (
                  <div key={i} className="rounded-lg border border-[#E2E8F0] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-semibold text-[#0F172A]">
                        {i + 1}. {action.type.replace(/_/g, ' ')}
                      </span>
                      <button
                        onClick={() => removeAction(i)}
                        className="rounded p-1 text-[#94A3B8] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Action-specific config */}
                    {action.type === 'SEND_NOTIFICATION' && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={action.config['title'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'title', e.target.value)}
                          placeholder="Notification title"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={action.config['message'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'message', e.target.value)}
                          placeholder="Notification message"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                        <select
                          value={action.config['recipientType'] ?? 'workflow_owner'}
                          onChange={(e) => updateActionConfig(i, 'recipientType', e.target.value)}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        >
                          <option value="workflow_owner">Workflow Owner</option>
                          <option value="manager">Manager</option>
                        </select>
                      </div>
                    )}

                    {action.type === 'CREATE_TASK' && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={action.config['title'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'title', e.target.value)}
                          placeholder="Task title"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={action.config['description'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'description', e.target.value)}
                          placeholder="Task description"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                        <select
                          value={action.config['priority'] ?? 'MEDIUM'}
                          onChange={(e) => updateActionConfig(i, 'priority', e.target.value)}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        >
                          <option value="LOW">Low Priority</option>
                          <option value="MEDIUM">Medium Priority</option>
                          <option value="HIGH">High Priority</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    )}

                    {action.type === 'REQUEST_APPROVAL' && (
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          value={action.config['approverUserId'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'approverUserId', e.target.value)}
                          placeholder="Approver User ID"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={action.config['reason'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'reason', e.target.value)}
                          placeholder="Approval reason"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                      </div>
                    )}

                    {action.type === 'UPDATE_ENTITY' && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <select
                          value={action.config['entityType'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'entityType', e.target.value)}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        >
                          <option value="">Select entity...</option>
                          <option value="Employee">Employee</option>
                          <option value="Project">Project</option>
                          <option value="ProjectTask">Project Task</option>
                        </select>
                        <input
                          type="text"
                          value={action.config['field'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'field', e.target.value)}
                          placeholder="Field to update"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={action.config['value'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'value', e.target.value)}
                          placeholder="New value"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                      </div>
                    )}

                    {action.type === 'CREATE_AUDIT_EVENT' && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={action.config['action'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'action', e.target.value)}
                          placeholder="Audit action name"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={action.config['entityType'] ?? ''}
                          onChange={(e) => updateActionConfig(i, 'entityType', e.target.value)}
                          placeholder="Entity type"
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] focus:border-[#2563EB] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {['SEND_NOTIFICATION', 'CREATE_TASK', 'REQUEST_APPROVAL', 'UPDATE_ENTITY', 'CREATE_AUDIT_EVENT'].map((type) => (
                <button
                  key={type}
                  onClick={() => addAction(type)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                >
                  <Plus className="h-3 w-3" /> {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
