'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Save, Package } from 'lucide-react';

interface Category { id: string; name: string; code: string; }
interface Location { id: string; name: string; code: string; }

export default function NewAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    assetCode: '', name: '', description: '', serialNumber: '', manufacturer: '', model: '',
    purchaseDate: '', purchaseCost: '', currency: 'USD', categoryId: '', locationId: '',
    usefulLife: '', residualValue: '', inServiceDate: '', notes: '',
  });

  const fetchMeta = useCallback(async () => {
    try {
      const [cats, locs] = await Promise.all([
        apiClient.get<Category[]>('/assets/categories/list'),
        apiClient.get<Location[]>('/assets/locations/list'),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setLocations(Array.isArray(locs) ? locs : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.assetCode || !form.name) { setError('Asset code and name are required'); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        assetCode: form.assetCode, name: form.name, description: form.description || undefined,
        serialNumber: form.serialNumber || undefined, manufacturer: form.manufacturer || undefined,
        model: form.model || undefined, purchaseDate: form.purchaseDate || undefined,
        purchaseCost: form.purchaseCost ? Math.round(parseFloat(form.purchaseCost) * 100) : 0,
        currency: form.currency, categoryId: form.categoryId || undefined,
        locationId: form.locationId || undefined, usefulLife: form.usefulLife ? parseInt(form.usefulLife) : undefined,
        residualValue: form.residualValue ? Math.round(parseFloat(form.residualValue) * 100) : 0,
        inServiceDate: form.inServiceDate || undefined, notes: form.notes || undefined,
      };
      await apiClient.post('/assets', payload);
      router.push('/assets');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create asset');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#0F172A] outline-none focus:border-[#2563EB] transition-colors';
  const labelCls = 'block text-[12px] font-medium text-[#64748B] mb-1';
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
      <h3 className="mb-3 text-[13px] font-semibold text-[#0F172A]">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Create Asset"
        description="Register a new company asset"
        breadcrumbs={[{ label: 'Assets', href: '/assets' }, { label: 'New Asset' }]}
        actions={
          <button onClick={() => router.push('/assets')} className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]">
            <ArrowLeft className="h-3.5 w-3.5" />Back
          </button>
        }
      />
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-5 py-4 lg:px-6">
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}

        <Section title="Basic Information">
          <div>
            <label className={labelCls}>Asset Code *</label>
            <input className={inputCls} value={form.assetCode} onChange={e => set('assetCode', e.target.value)} placeholder="e.g. AST-001" required />
          </div>
          <div>
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Asset name" required />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Description" />
          </div>
          <div>
            <label className={labelCls}>Serial Number</label>
            <input className={inputCls} value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} placeholder="Serial number" />
          </div>
          <div>
            <label className={labelCls}>Manufacturer</label>
            <input className={inputCls} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="Manufacturer" />
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <input className={inputCls} value={form.model} onChange={e => set('model', e.target.value)} placeholder="Model" />
          </div>
        </Section>

        <div className="mt-4">
          <Section title="Classification">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <select className={inputCls} value={form.locationId} onChange={e => set('locationId', e.target.value)}>
                <option value="">Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
              </select>
            </div>
          </Section>
        </div>

        <div className="mt-4">
          <Section title="Purchase Information">
            <div>
              <label className={labelCls}>Purchase Date</label>
              <input type="date" className={inputCls} value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Purchase Cost</label>
              <input type="number" step="0.01" min="0" className={inputCls} value={form.purchaseCost} onChange={e => set('purchaseCost', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select className={inputCls} value={form.currency} onChange={e => set('currency', e.target.value)}>
                {['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>In Service Date</label>
              <input type="date" className={inputCls} value={form.inServiceDate} onChange={e => set('inServiceDate', e.target.value)} />
            </div>
          </Section>
        </div>

        <div className="mt-4">
          <Section title="Financial Information">
            <div>
              <label className={labelCls}>Useful Life (months)</label>
              <input type="number" min="0" className={inputCls} value={form.usefulLife} onChange={e => set('usefulLife', e.target.value)} placeholder="e.g. 60" />
            </div>
            <div>
              <label className={labelCls}>Residual Value</label>
              <input type="number" step="0.01" min="0" className={inputCls} value={form.residualValue} onChange={e => set('residualValue', e.target.value)} placeholder="0.00" />
            </div>
          </Section>
        </div>

        <div className="mt-4">
          <Section title="Additional Notes">
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Additional notes" />
            </div>
          </Section>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => router.push('/assets')} className="rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-md bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50">
            <Save className="h-3.5 w-3.5" />{saving ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  );
}
