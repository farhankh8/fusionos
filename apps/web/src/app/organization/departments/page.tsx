'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string;
  status: string;
  company: { id: string; name: string };
  branch?: { id: string; name: string } | null;
  _count: { teams: number; employees: number; children: number };
  createdAt: string;
}

interface PaginationMeta {
  page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      const res = await fetch(`http://localhost:3001/api/v1/organization/departments?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setDepartments(data.data ?? []);
      setMeta(data.meta ?? null);
    } catch { setDepartments([]); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-full bg-background">
      <div className="p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Departments</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Manage organizational departments</p>
          </div>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/80">
            <Plus className="h-3.5 w-3.5" /> Add Department
          </button>
        </div>
        <div className="mb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search departments..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Teams</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Employees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-muted-foreground">Loading...</td></tr>
              ) : departments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center">
                  <Layers className="mx-auto h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                  <p className="mt-1 text-[13px] text-muted-foreground">No departments found</p>
                </td></tr>
              ) : departments.map((dept) => (
                <tr key={dept.id} className="transition-colors duration-120 hover:bg-muted/50">
                  <td className="px-4 py-2.5">
                    <p className="text-[13px] font-medium text-foreground">{dept.name}</p>
                    {dept.branch && <p className="text-[11px] text-muted-foreground">{dept.branch.name}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{dept.code}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium ${dept.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{dept.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{dept._count.teams}</td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{dept._count.employees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">Showing {((meta.page-1)*meta.limit)+1}–{Math.min(meta.page*meta.limit, meta.total)} of {meta.total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p=>p-1)} disabled={!meta.hasPrevious} className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <span className="px-2 text-[12px] text-muted-foreground">{meta.page} / {meta.totalPages}</span>
              <button onClick={() => setPage(p=>p+1)} disabled={!meta.hasNext} className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
