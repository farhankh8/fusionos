'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';

interface Category { id: string; name: string; code: string; }
interface Location { id: string; name: string; code: string; }
interface Asset {
  id: string; assetCode: string; name: string; description?: string; status: string;
  serialNumber?: string; manufacturer?: string; model?: string; purchaseDate?: string;
  purchaseCost: number; currency: string; currentBookValue: number;
  usefulLife?: number; residualValue: number; inServiceDate?: string; notes?: string;
  categoryId?: string; locationId?: string; vendorId?: string;
}

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id ?? '') as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [original, setOriginal] = useState<Asset | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', serialNumber: '', manufacturer: '', model: '',
    categoryId: '', locationId: '', usefulLife: '', residualValue: '', notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [asset, cats, locs] = await Promise.all([
        apiClient.get<Asset>(`/assets/${id}`),
        apiClient.get<Category[]>('/assets/categories/list'),
        apiClient.get<Location[]>('/assets/locations/list'),
      ]);
      setOriginal(asset);
      setCategories(Array.isArray(cats) ? cats : []);
      setLocations(Array.isArray(locs) ? locs : []);
      setForm({
        name: asset.name, description: asset.description ?? '', serialNumber: asset.serialNumber ?? '',
        manufacturer: asset.manufacturer ?? '', model: asset.model ?? '',
        categoryId: asset.categoryId ?? '', locationId: asset.locationId ?? '',
        usefulLife: asset.usefulLife?.toString() ?? '', residualValue: (asset.residualValue / 100).toString(),
        notes: asset.notes ?? '',
      });
    } catch { router.push('/assets'); } finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const hasChanges = original ? (
    form.name !== original.name ||
    form.description !== (original.description ?? '') ||
    form.serialNumber !== (original.serialNumber ?? '') ||
    form.manufacturer !== (original.manufacturer ?? '') ||
    form.model !== (original.model ?? '') ||
    form.categoryId !== (original.categoryId ?? '') ||
    form.locationId !== (original.locationId ?? '') ||
    form.usefulLife !== (original.usefulLife?.toString() ?? '') ||
    parseFloat(form.residualValue || '0') * 100 !== original.residualValue ||
    form.notes !== (original.notes ?? '')
  ) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name, description: form.description || undefined,
        serialNumber: form.serialNumber || undefined, manufacturer: form.manufacturer || undefined,
        model: form.model || undefined, categoryId: form.categoryId || undefined,
        locationId: form.locationId || undefined,
        usefulLife: form.usefulLife ? parseInt(form.usefulLife) : undefined,
        residualValue: Math.round(parseFloat(form.residualValue || '0') * 100),
        notes: form.notes || undefined,
      };
      await apiClient.patch(`/assets/${id}`, payload);
      router.push(`/assets/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update asset');
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

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#2563EB]" /></div>;
  if (!original) return null;

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title={`Edit ${original.name}`}
        description={`Asset Code: ${original.assetCode}`}
        breadcrumbs={[{ label: 'Assets', href: '/assets' }, { label: original.name, href: `/assets/${id}` }, { label: 'Edit' }]}
        actions={
          <button onClick={() => router.push(`/assets/${id}`)} className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]">
            <ArrowLeft className="h-3.5 w-3.5" />Back
          </button>
        }
      />
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-5 py-4 lg:px-6">
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
        {original.status === 'DISPOSED' || original.status === 'RETIRED' ? (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />This asset is {original.status.toLowerCase()} and cannot be edited.
          </div>
        ) : null}

        <Section title="Basic Information">
          <div className="sm:col-span-2">
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
          </div>
          <div>
            <label className={labelCls}>Serial Number</label>
            <input className={inputCls} value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Manufacturer</label>
            <input className={inputCls} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <input className={inputCls} value={form.model} onChange={e => set('model', e.target.value)} />
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
          <Section title="Financial Information">
            <div>
              <label className={labelCls}>Useful Life (months)</label>
              <input type="number" min="0" className={inputCls} value={form.usefulLife} onChange={e => set('usefulLife', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Residual Value</label>
              <input type="number" step="0.01" min="0" className={inputCls} value={form.residualValue} onChange={e => set('residualValue', e.target.value)} />
            </div>
          </Section>
        </div>

        <div className="mt-4">
          <Section title="Notes">
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
            </div>
          </Section>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => router.push(`/assets/${id}`)} className="rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
          <button type="submit" disabled={saving || !hasChanges} className="flex items-center gap-1.5 rounded-md bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50">
            <Save className="h-3.5 w-3.5" />{saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
