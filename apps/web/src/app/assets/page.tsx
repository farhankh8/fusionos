'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { Package, CheckCircle2, Users, Wrench, AlertTriangle, ArrowRight, Plus, Search } from 'lucide-react';

interface DashboardData {
  total: number; active: number; assigned: number; available: number;
  inMaintenance: number; disposed: number; retired: number;
  overdueMaintenance: number; expiringWarranty: number;
}

interface Asset {
  id: string; assetCode: string; name: string; status: string; condition: string;
  category?: { name: string } | null; location?: { name: string } | null;
  assignments?: { employee?: { firstName: string; lastName: string } | null }[];
  currentBookValue: number; currency: string; purchaseDate?: string;
}

export default function AssetsPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashData, assetData] = await Promise.all([
        apiClient.get<DashboardData>('/assets/dashboard'),
        apiClient.get<{ data: Asset[] }>('/assets', { page: '1', limit: '20', ...(search && { search }), ...(statusFilter && { status: statusFilter }) }),
      ]);
      setDashboard(dashData);
      setAssets(assetData.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-emerald-50 text-emerald-700', AVAILABLE: 'bg-blue-50 text-blue-700',
      ASSIGNED: 'bg-violet-50 text-violet-700', IN_MAINTENANCE: 'bg-amber-50 text-amber-700',
      DRAFT: 'bg-gray-50 text-gray-600', RETIRED: 'bg-red-50 text-red-700',
      DISPOSED: 'bg-red-50 text-red-700', LOST: 'bg-red-50 text-red-700',
    };
    return colors[status] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Asset Management"
        description="Manage company assets, equipment, and inventory"
        actions={<button onClick={() => router.push('/assets/new')} className="flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors"><Plus className="h-3.5 w-3.5" />New Asset</button>}
      />
      <div className="px-5 py-4 lg:px-6">
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {loading ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />) : dashboard && (
            <>
              <KpiCard label="Total Assets" value={dashboard.total} icon={Package} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
              <KpiCard label="Active" value={dashboard.active} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Assigned" value={dashboard.assigned} icon={Users} iconBg="bg-violet-50" iconColor="text-violet-600" />
              <KpiCard label="In Maintenance" value={dashboard.inMaintenance} icon={Wrench} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard label="Overdue" value={dashboard.overdueMaintenance} icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-600" />
            </>
          )}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8E7E68]" />
            <input type="text" placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-[#DDD0BB] bg-white pl-8 pr-3 py-1.5 text-[12px] text-[#1C1917] outline-none focus:border-[#064E3B]" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[#DDD0BB] bg-white px-2.5 py-1.5 text-[12px] text-[#57534E] outline-none">
            <option value="">All Status</option>
            {['DRAFT', 'ACTIVE', 'AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'IN_REPAIR', 'RETIRED', 'DISPOSED', 'LOST'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div className="rounded-lg border border-[#DDD0BB] bg-white">
          {loading ? (
            <div className="p-8 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#DDD0BB] border-t-[#064E3B]" /></div>
          ) : assets.length === 0 ? (
            <EmptyState icon={Package} title="No assets found" description="Create your first asset to get started." action={<button onClick={() => router.push('/assets/new')} className="rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]">Create Asset</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead><tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                  <th className="px-4 py-2.5 font-medium text-[#57534E]">Asset</th>
                  <th className="px-4 py-2.5 font-medium text-[#57534E]">Code</th>
                  <th className="px-4 py-2.5 font-medium text-[#57534E]">Category</th>
                  <th className="px-4 py-2.5 font-medium text-[#57534E]">Status</th>
                  <th className="px-4 py-2.5 font-medium text-[#57534E]">Assigned To</th>
                  <th className="px-4 py-2.5 font-medium text-[#57534E]">Location</th>
                  <th className="px-4 py-2.5 font-medium text-[#57534E]">Book Value</th>
                  <th className="px-4 py-2.5 font-medium text-[#57534E]"></th>
                </tr></thead>
                <tbody className="divide-y divide-[#DDD0BB]">
                  {assets.map(asset => (
                    <tr key={asset.id} className="hover:bg-[#FBF5EC] cursor-pointer" onClick={() => router.push(`/assets/${asset.id}`)}>
                      <td className="px-4 py-2.5 font-medium text-[#1C1917]">{asset.name}</td>
                      <td className="px-4 py-2.5 text-[#57534E] font-mono text-[12px]">{asset.assetCode}</td>
                      <td className="px-4 py-2.5 text-[#57534E]">{asset.category?.name ?? '—'}</td>
                      <td className="px-4 py-2.5"><span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(asset.status)}`}>{asset.status.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-2.5 text-[#57534E]">{asset.assignments?.[0]?.employee ? `${asset.assignments[0].employee.firstName} ${asset.assignments[0].employee.lastName}` : '—'}</td>
                      <td className="px-4 py-2.5 text-[#57534E]">{asset.location?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-[#57534E]">{asset.currency} {(asset.currentBookValue / 100).toLocaleString()}</td>
                      <td className="px-4 py-2.5"><ArrowRight className="h-3.5 w-3.5 text-[#8E7E68]" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
