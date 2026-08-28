'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  employmentType: string;
  designation?: { name: string };
  department?: { name: string };
  branch?: { name: string };
  createdAt: string;
}

interface EmployeeResponse {
  data: Employee[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type TabType = 'active' | 'inactive' | 'all';

const TABS: { id: TabType; label: string; count?: number }[] = [
  { id: 'active', label: 'Employees' },
  { id: 'inactive', label: 'Contractors' },
  { id: 'all', label: 'All Staff' },
];

const STATUS_COLORS: { [key: string]: { bg: string; text: string; dot: string } } = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  INACTIVE: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  DRAFT: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ON_LEAVE: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  SUSPENDED: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  TERMINATED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  RESIGNED: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };

      if (search) params['search'] = search;
      if (activeTab === 'active') params['status'] = 'ACTIVE';
      if (activeTab === 'inactive') params['status'] = 'INACTIVE';
      if (departmentFilter) params['departmentId'] = departmentFilter;
      if (branchFilter) params['branchId'] = branchFilter;
      if (typeFilter) params['employmentType'] = typeFilter;

      const responseData = await apiClient.get<EmployeeResponse>('/employees', params);
      setEmployees(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
      setTotalCount(responseData.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab, departmentFilter, branchFilter, typeFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(employees.map(e => e.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const getStatusStyle = (status: string) => STATUS_COLORS[status] || STATUS_COLORS['ACTIVE'];

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      {/* Professional Illustration */}
      <div className="relative mb-8">
        <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 flex items-center justify-center">
          <svg className="w-20 h-20 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
      
      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Get your employees onboard</h3>
      <p className="text-gray-500 text-center max-w-lg mb-8 text-base leading-relaxed">
        Capture all necessary details about your employees and manage their salary, allowances and reimbursement details in this module.
      </p>
      
      <div className="flex gap-4 mb-12">
        <Button 
          onClick={() => router.push('/people/employees/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </Button>
        <Button 
          variant="outline" 
          className="px-6 py-2.5 rounded-lg font-medium border-gray-300"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Employees
        </Button>
      </div>
      
      {/* Key Benefits Grid */}
      <div className="w-full max-w-2xl">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center uppercase tracking-wider">Key Benefits</h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '👥', text: 'Centralized employee records' },
            { icon: '⏰', text: 'Track attendance & leaves' },
            { icon: '💰', text: 'Manage payroll & benefits' },
            { icon: '🔐', text: 'Role-based access control' },
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <span className="text-xl">{benefit.icon}</span>
              <span className="text-sm text-gray-600">{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50/80">
          <tr>
            <th className="w-12 px-4 py-3">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={selectedRows.size === employees.length && employees.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID</span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</span>
            </th>
            <th className="w-12 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {employees.map((employee) => {
            const statusStyle = getStatusStyle(employee.status) || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
            return (
              <tr 
                key={employee.id} 
                className="hover:bg-blue-50/50 cursor-pointer transition-colors duration-150"
                onClick={() => router.push(`/people/employees/${employee.id}`)}
              >
                <td className="px-4 py-4">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedRows.has(employee.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectRow(employee.id, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    {employee.employeeCode}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {employee.department?.name || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {employee.designation?.name || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                    {employee.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {employee.employmentType}
                </td>
                <td className="px-4 py-4">
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors" onClick={(e) => e.stopPropagation()}>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {employees.map((employee) => {
        const statusStyle = getStatusStyle(employee.status) || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
        return (
          <Card 
            key={employee.id} 
            className="hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group"
            onClick={() => router.push(`/people/employees/${employee.id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                  {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                  {employee.status}
                </span>
              </div>
              
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 text-base group-hover:text-blue-600 transition-colors">
                  {employee.firstName} {employee.lastName}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{employee.email}</p>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">ID</span>
                  <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">{employee.employeeCode}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Department</span>
                  <span className="text-gray-700">{employee.department?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Designation</span>
                  <span className="text-gray-700">{employee.designation?.name || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6">
          {/* Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                    setSelectedRows(new Set());
                  }}
                  className={`relative px-4 py-3.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Right Actions */}
            <div className="flex items-center gap-3 py-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search in Employees ( / )"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-72 pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-400"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <kbd className="absolute right-3 top-2.5 text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">/</kbd>
              </div>
              
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
              </div>
              
              {/* Filter */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-all ${
                  showFilters ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              
              {/* More Options */}
              <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {/* Add Button */}
              <Button 
                onClick={() => router.push('/people/employees/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filters:</span>
              <select 
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All Departments</option>
              </select>
              <select 
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
              </select>
              <select 
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
              <button 
                onClick={() => {
                  setDepartmentFilter('');
                  setBranchFilter('');
                  setTypeFilter('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Stats Bar */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === 'active' ? 'Active' : activeTab === 'inactive' ? 'Inactive' : 'All'} Employees
                <span className="text-gray-400 ml-1">▾</span>
              </h2>
              <span className="text-sm text-gray-500">{totalCount} records</span>
            </div>
            {selectedRows.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                <span className="text-sm text-blue-700 font-medium">{selectedRows.size} selected</span>
                <button className="text-blue-600 hover:text-blue-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Loading employees...</p>
              </div>
            </div>
          </Card>
        ) : employees.length === 0 ? (
          renderEmptyState()
        ) : viewMode === 'list' ? (
          <Card className="overflow-hidden">
            {renderListView()}
          </Card>
        ) : (
          renderGridView()
        )}

        {/* Pagination */}
        {!loading && employees.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 12) + 1} to {Math.min(page * 12, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-gray-400">...</span>}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}