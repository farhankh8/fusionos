'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LeaveRequest {
  id: string;
  leaveType: { id: string; name: string; code: string; isPaid: boolean };
  employee: { id: string; firstName: string; lastName: string; employeeCode: string };
  startDate: string;
  endDate: string;
  duration: number;
  status: string;
  reason?: string;
  createdAt: string;
}

interface LeaveBalance {
  id: string;
  leaveType: { id: string; name: string; code: string; isPaid: boolean };
  employee: { id: string; firstName: string; lastName: string };
  year: number;
  opening: number;
  accrued: number;
  used: number;
  pending: number;
  remaining: number;
}

type TabType = 'requests' | 'balances' | 'calendar' | 'types' | 'policies';

const TABS: { id: TabType; label: string }[] = [
  { id: 'requests', label: 'Leave Requests' },
  { id: 'balances', label: 'Balances' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'types', label: 'Leave Types' },
  { id: 'policies', label: 'Policies' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
};

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '10',
      };
      if (statusFilter) params['status'] = statusFilter;

      const responseData = await apiClient.get<{ data: LeaveRequest[]; meta: { totalPages: number } }>('/leave/requests', params);
      setRequests(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      const responseData = await apiClient.get<{ data: LeaveBalance[] }>('/leave/balances');
      setBalances(responseData.data || []);
    } catch (error) {
      console.error('Failed to fetch leave balances:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'balances') fetchBalances();
  }, [activeTab, fetchRequests, fetchBalances]);

  const getStatusStyle = (status: string) => STATUS_STYLES[status] || STATUS_STYLES['DRAFT'];

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const renderRequests = () => (
    <Card className="overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Leave Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dates</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">No leave requests found</p>
                </td>
              </tr>
            ) : (
              requests.map((request) => {
                const statusStyle = getStatusStyle(request.status) || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
                return (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                          {request.employee.firstName.charAt(0)}{request.employee.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{request.employee.firstName} {request.employee.lastName}</div>
                          <div className="text-xs text-gray-500">{request.employee.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{request.leaveType.name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.duration} day{request.duration !== 1 ? 's' : ''}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(request.startDate)} – {formatDate(request.endDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Approve</button>
                          <button className="text-xs font-medium text-red-600 hover:text-red-700">Reject</button>
                        </div>
                      )}
                      {request.status === 'DRAFT' && (
                        <button className="text-xs font-medium text-blue-600 hover:text-blue-700">Submit</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {requests.length > 0 && totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </Card>
  );

  const renderBalances = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Leave Type</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Entitled</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Used</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Pending</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Remaining</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {balances.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-gray-500">No leave balances found</p>
                </td>
              </tr>
            ) : (
              balances.map((balance) => (
                <tr key={balance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{balance.employee.firstName} {balance.employee.lastName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{balance.leaveType.name}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{balance.opening + balance.accrued + (balance as any).carryForward}</td>
                  <td className="px-6 py-4 text-sm text-center text-red-600">{balance.used}</td>
                  <td className="px-6 py-4 text-sm text-center text-amber-600">{balance.pending}</td>
                  <td className="px-6 py-4 text-sm text-center font-semibold text-emerald-600">{balance.remaining}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setPage(1); }}
                  className={`relative px-4 py-3.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Request
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          </Card>
        ) : activeTab === 'requests' ? (
          renderRequests()
        ) : activeTab === 'balances' ? (
          renderBalances()
        ) : (
          <Card>
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-sm text-gray-500">This section will be available soon.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}