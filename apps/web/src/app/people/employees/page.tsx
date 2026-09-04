'use client';

/**
 * FusionOS Employee List Page
 * Enterprise employee management workspace.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Users, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  employmentType: string;
  designation?: { name: string };
  department?: { name: string };
  branch?: { name: string };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  INACTIVE: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  DRAFT: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ON_LEAVE: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  TERMINATED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  RESIGNED: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-emerald-500' },
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: Employee[]; meta?: { total: number; totalPages: number } }>('/employees', params);
      setEmployees(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const getStatusStyle = (status: string) => STATUS_STYLES[status] || STATUS_STYLES['ACTIVE'];

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      {/* Header */}
      <div className="border-b border-[#DDD0BB] bg-white">
        <div className="px-5 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#57534E]">
                <span>People</span>
                <span>/</span>
                <span className="font-medium text-[#1C1917]">Employees</span>
              </div>
              <p className="mt-0.5 text-[13px] text-[#57534E]">Manage your organization&apos;s employees</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDD0BB] px-2.5 text-[12px] font-medium text-[#57534E] transition-colors hover:bg-[#FBF5EC] ${showFilters ? 'bg-[#D1FAE5] text-[#064E3B] border-[#BFDBFE]' : ''}`}
              >
                Filters
              </button>
              <button
                onClick={() => router.push('/people/employees/new')}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Employee
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 lg:px-6">
        {/* Search + Filters */}
        <div className="mb-3 flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8E7E68]" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-8 w-full rounded-md border border-[#DDD0BB] bg-white pl-8 pr-3 text-[13px] text-[#1C1917] placeholder:text-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
            />
          </div>
          {showFilters && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-8 rounded-md border border-[#DDD0BB] bg-white px-2.5 text-[12px] text-[#1C1917] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
                <option value="TERMINATED">Terminated</option>
              </select>
              <button
                onClick={() => { setStatusFilter(''); setSearch(''); setPage(1); }}
                className="text-[12px] text-[#064E3B] hover:text-[#047857]"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-[#DDD0BB] bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#DDD0BB] border-t-[#064E3B]" />
                <p className="text-[12px] text-[#57534E]">Loading employees...</p>
              </div>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-10 w-10 text-[#DDD0BB]" strokeWidth={1.5} />
              <p className="mt-3 text-[14px] font-medium text-[#1C1917]">No employees found</p>
              <p className="mt-1 text-[12px] text-[#57534E]">Add your first employee to get started</p>
              <button
                onClick={() => router.push('/people/employees/new')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Employee
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#57534E]">Employee</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#57534E]">Code</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#57534E]">Department</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#57534E]">Designation</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#57534E]">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#57534E]">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5E6CC]">
                {employees.map((emp) => {
                  const s = getStatusStyle(emp.status) || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
                  return (
                    <tr
                      key={emp.id}
                      className="cursor-pointer transition-colors hover:bg-[#FBF5EC]"
                      onClick={() => router.push(`/people/employees/${emp.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#064E3B] text-[11px] font-semibold text-white">
                            {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-[#1C1917]">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[11px] text-[#57534E]">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-[#F5E6CC] px-1.5 py-0.5 text-[11px] font-mono text-[#57534E]">{emp.employeeCode}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#57534E]">{emp.department?.name || '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-[#57534E]">{emp.designation?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#57534E]">{emp.employmentType || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && employees.length > 0 && totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] text-[#57534E]">Showing {((page - 1) * 12) + 1}–{Math.min(page * 12, totalCount)} of {totalCount}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#DDD0BB] text-[#57534E] hover:bg-[#FBF5EC] disabled:opacity-50">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-[12px] text-[#57534E]">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#DDD0BB] text-[#57534E] hover:bg-[#FBF5EC] disabled:opacity-50">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
