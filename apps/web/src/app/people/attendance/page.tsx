'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AttendanceRecord {
  id: string;
  employee: { id: string; firstName: string; lastName: string; employeeCode: string };
  date: string;
  status: string;
  firstClockIn?: string;
  lastClockOut?: string;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
}

interface AttendanceEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
}

type TabType = 'today' | 'my-attendance' | 'team' | 'all';

const TABS: { id: TabType; label: string }[] = [
  { id: 'today', label: "Today's Attendance" },
  { id: 'my-attendance', label: 'My Attendance' },
  { id: 'team', label: 'Team Attendance' },
  { id: 'all', label: 'All Employees' },
];

const STATUS_STYLES: { [key: string]: { bg: string; text: string; dot: string } } = {
  PRESENT: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ABSENT: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  HALF_DAY: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  LATE: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  EARLY_DEPARTURE: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  OVERTIME: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  ON_LEAVE: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  HOLIDAY: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  WEEK_OFF: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  INCOMPLETE: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
};

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [todayEvents, setTodayEvents] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);

      if (activeTab === 'today') {
        try {
          const todayData = await apiClient.get<{ data: AttendanceRecord; events: AttendanceEvent[] }>('/attendance/today');
          setTodayRecord(todayData.data);
          setTodayEvents(todayData.events || []);
        } catch {
          setTodayRecord(null);
          setTodayEvents([]);
        }
      }

      const responseData = await apiClient.get<{ data: AttendanceRecord[]; meta: { totalPages: number } }>(`/attendance?page=${page}&limit=10`);
      setAttendance(responseData.data || []);
      setTotalPages(responseData.meta?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleClockAction = async (action: string) => {
    try {
      setActionLoading(true);
      await apiClient.post(`/attendance/${action}`, { source: 'WEB' });
      await fetchAttendance();
    } catch (error) {
      console.error(`${action} failed:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusStyle = (status: string) => STATUS_STYLES[status] || STATUS_STYLES['PRESENT'];

  const formatTime = (iso?: string) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getEventIcon = (type: string) => {
    const icons: { [key: string]: { bg: string; icon: React.ReactNode } } = {
      CLOCK_IN: { 
        bg: 'bg-emerald-100 text-emerald-600',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
      },
      CLOCK_OUT: { 
        bg: 'bg-red-100 text-red-600',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
      },
      BREAK_START: { 
        bg: 'bg-amber-100 text-amber-600',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      BREAK_END: { 
        bg: 'bg-blue-100 text-blue-600',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
    };
    return icons[type] || icons['CLOCK_IN'];
  };

  const renderTodayView = () => (
    <div className="space-y-6">
      {/* Clock Controls - Premium Design */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h3 className="text-white font-semibold text-lg">Clock Controls</h3>
          <p className="text-blue-100 text-sm">Track your work hours</p>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleClockAction('clock-in')}
              disabled={actionLoading || !!todayRecord?.firstClockIn}
              className="group relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="font-semibold text-emerald-700">Clock In</span>
              <span className="text-xs text-emerald-600 mt-1">Start your day</span>
            </button>

            <button
              onClick={() => handleClockAction('clock-out')}
              disabled={actionLoading || !todayRecord?.firstClockIn || !!todayRecord?.lastClockOut}
              className="group relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-red-300 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-red-200">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="font-semibold text-red-700">Clock Out</span>
              <span className="text-xs text-red-600 mt-1">End your day</span>
            </button>

            <button
              onClick={() => handleClockAction('break-start')}
              disabled={actionLoading}
              className="group relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-semibold text-amber-700">Break Start</span>
              <span className="text-xs text-amber-600 mt-1">Take a break</span>
            </button>

            <button
              onClick={() => handleClockAction('break-end')}
              disabled={actionLoading}
              className="group relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Break End</span>
              <span className="text-xs text-blue-600 mt-1">Resume work</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                <div className="text-2xl font-bold">
                  {todayRecord?.status ? (
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(todayRecord.status)?.bg || ''} ${getStatusStyle(todayRecord.status)?.text || ''}`}>
                      <span className={`w-2 h-2 rounded-full ${getStatusStyle(todayRecord.status)?.dot || 'bg-gray-400'}`}></span>
                      {todayRecord.status}
                    </span>
                  ) : (
                    <span className="text-gray-400">No Record</span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-green-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Clock In</p>
                <p className="text-2xl font-bold text-emerald-600">{formatTime(todayRecord?.firstClockIn)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Clock Out</p>
                <p className="text-2xl font-bold text-red-600">{formatTime(todayRecord?.lastClockOut)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Worked Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {todayRecord ? formatDuration(todayRecord.totalWorkedMinutes) : '0m'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Break Time</p>
                <p className="text-xl font-bold text-gray-900">{formatDuration(todayRecord?.totalBreakMinutes || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Late</p>
                <p className="text-xl font-bold text-orange-600">{formatDuration(todayRecord?.lateMinutes || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Overtime</p>
                <p className="text-xl font-bold text-purple-600">{formatDuration(todayRecord?.overtimeMinutes || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Timeline */}
      {todayEvents.length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
            <h3 className="text-white font-semibold text-lg">Today's Timeline</h3>
            <p className="text-gray-300 text-sm">Your activity throughout the day</p>
          </div>
          <CardContent className="p-6">
            <div className="relative">
              {todayEvents.map((event, index) => {
                const eventStyle = getEventIcon(event.type) || { bg: 'bg-gray-100 text-gray-600', icon: null };
                return (
                  <div key={event.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                    {/* Timeline Line */}
                    {index < todayEvents.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200" />
                    )}
                    
                    {/* Event Icon */}
                    <div className={`relative z-10 w-12 h-12 rounded-full ${eventStyle.bg} flex items-center justify-center flex-shrink-0`}>
                      {eventStyle.icon}
                    </div>
                    
                    {/* Event Content */}
                    <div className="flex-1 bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{event.type.replace(/_/g, ' ')}</h4>
                          <p className="text-sm text-gray-500 mt-0.5">{formatTime(event.timestamp)}</p>
                        </div>
                        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                          {event.source}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderHistoryView = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock In</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock Out</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Worked</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Break</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Late</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overtime</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {attendance.map((record) => {
              const statusStyle = getStatusStyle(record.status) || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
              return (
                <tr key={record.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-emerald-600">{formatTime(record.firstClockIn)}</td>
                  <td className="px-6 py-4 font-medium text-red-600">{formatTime(record.lastClockOut)}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatDuration(record.totalWorkedMinutes)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDuration(record.totalBreakMinutes)}</td>
                  <td className="px-6 py-4 text-orange-600">{formatDuration(record.lateMinutes)}</td>
                  <td className="px-6 py-4 text-purple-600">{formatDuration(record.overtimeMinutes)}</td>
                </tr>
              );
            })}
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
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Loading attendance...</p>
              </div>
            </div>
          </Card>
        ) : activeTab === 'today' ? (
          renderTodayView()
        ) : (
          renderHistoryView()
        )}

        {/* Pagination */}
        {activeTab !== 'today' && !loading && attendance.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
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