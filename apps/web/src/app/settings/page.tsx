'use client';

/**
 * FusionOS Settings Page
 * Enterprise settings workspace with user profile and application settings.
 */

import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Building2, Shield, Bell, Palette, User } from 'lucide-react';
import { useState } from 'react';

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'company', label: 'Company' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Settings"
        description="Manage your account and application settings"
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <div className="px-5 py-4 lg:px-6">
        {/* Tabs */}
        <Tabs tabs={SETTINGS_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="pt-4">
          {activeTab === 'profile' && (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Profile Info */}
              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#E2E8F0] px-4 py-3">
                  <h2 className="text-[13px] font-semibold text-[#0F172A]">Personal Information</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB] text-[20px] font-semibold text-white">
                      {user?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#0F172A]">{user?.firstName} {user?.lastName}</p>
                      <p className="text-[12px] text-[#64748B]">{user?.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-[#E2E8F0] pt-4 space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#64748B] mb-1">First Name</label>
                      <input
                        type="text"
                        defaultValue={user?.firstName || ''}
                        className="h-8 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#64748B] mb-1">Last Name</label>
                      <input
                        type="text"
                        defaultValue={user?.lastName || ''}
                        className="h-8 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#64748B] mb-1">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        disabled
                        className="h-8 w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[13px] text-[#94A3B8] cursor-not-allowed"
                      />
                      <p className="mt-1 text-[11px] text-[#94A3B8]">Email cannot be changed</p>
                    </div>
                    <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-[12px] font-medium text-white hover:bg-[#1D4ED8] transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#E2E8F0] px-4 py-3">
                  <h2 className="text-[13px] font-semibold text-[#0F172A]">Account Details</h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#64748B]">User ID</span>
                    <span className="text-[12px] font-mono text-[#475569]">{user?.id?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#64748B]">Email</span>
                    <span className="text-[12px] text-[#0F172A]">{user?.email}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="border-b border-[#E2E8F0] px-4 py-3">
                  <h2 className="text-[13px] font-semibold text-[#0F172A]">Quick Actions</h2>
                </div>
                <div className="p-4 space-y-2">
                  <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                    <Shield className="h-4 w-4 text-[#64748B]" />
                    Change Password
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                    <Bell className="h-4 w-4 text-[#64748B]" />
                    Notification Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Company Settings</h2>
              </div>
              <div className="p-8 text-center">
                <Building2 className="mx-auto h-10 w-10 text-[#E2E8F0]" strokeWidth={1.5} />
                <p className="mt-3 text-[14px] font-medium text-[#0F172A]">Manage company settings</p>
                <p className="mt-1 text-[12px] text-[#64748B]">Company information is managed in the Organization section.</p>
                <a
                  href="/organization/company"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1D4ED8]"
                >
                  Go to Company
                </a>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Security Settings</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] p-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-[#64748B]" />
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">Two-Factor Authentication</p>
                      <p className="text-[12px] text-[#64748B]">Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] p-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-[#64748B]" />
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">Password</p>
                      <p className="text-[12px] text-[#64748B]">Last changed: Unknown</p>
                    </div>
                  </div>
                  <button className="inline-flex h-7 items-center gap-1 rounded border border-[#E2E8F0] px-2.5 text-[11px] font-medium text-[#64748B] hover:bg-[#F8FAFC]">
                    Change
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Notification Preferences</h2>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { label: 'Leave request notifications', description: 'Get notified when leave requests need approval' },
                  { label: 'Payroll notifications', description: 'Get notified about payroll runs and approvals' },
                  { label: 'Attendance alerts', description: 'Get notified about attendance exceptions' },
                  { label: 'System announcements', description: 'Important system updates and maintenance notices' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-md border border-[#E2E8F0] p-3">
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">{item.label}</p>
                      <p className="text-[12px] text-[#64748B]">{item.description}</p>
                    </div>
                    <button className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-[#2563EB] transition-colors">
                      <span className="pointer-events-none inline-block h-4 w-4 translate-x-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="rounded-lg border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#0F172A]">Appearance Settings</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] mb-2">Theme</label>
                  <div className="flex gap-3">
                    <button className="flex h-20 w-32 flex-col items-center justify-center rounded-lg border-2 border-[#2563EB] bg-white p-3">
                      <Palette className="h-5 w-5 text-[#2563EB] mb-1" />
                      <span className="text-[11px] font-medium text-[#0F172A]">Light</span>
                    </button>
                    <button className="flex h-20 w-32 flex-col items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 opacity-50 cursor-not-allowed">
                      <Palette className="h-5 w-5 text-[#64748B] mb-1" />
                      <span className="text-[11px] text-[#64748B]">Dark</span>
                      <span className="text-[9px] text-[#94A3B8]">Soon</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] mb-2">Sidebar</label>
                  <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] p-3">
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">Collapsed by default</p>
                      <p className="text-[12px] text-[#64748B]">Start with sidebar collapsed</p>
                    </div>
                    <button className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-[#CBD5E1] transition-colors">
                      <span className="pointer-events-none inline-block h-4 w-4 translate-x-0.5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
