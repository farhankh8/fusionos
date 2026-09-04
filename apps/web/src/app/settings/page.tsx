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
    <div className="min-h-full bg-[#FBF5EC]">
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
              <div className="rounded-lg border border-[#DDD0BB] bg-white">
                <div className="border-b border-[#DDD0BB] px-4 py-3">
                  <h2 className="text-[13px] font-semibold text-[#1C1917]">Personal Information</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#064E3B] text-[20px] font-semibold text-white">
                      {user?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#1C1917]">{user?.firstName} {user?.lastName}</p>
                      <p className="text-[12px] text-[#57534E]">{user?.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-[#DDD0BB] pt-4 space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#57534E] mb-1">First Name</label>
                      <input
                        type="text"
                        defaultValue={user?.firstName || ''}
                        className="h-8 w-full rounded-md border border-[#DDD0BB] bg-white px-3 text-[13px] text-[#1C1917] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#57534E] mb-1">Last Name</label>
                      <input
                        type="text"
                        defaultValue={user?.lastName || ''}
                        className="h-8 w-full rounded-md border border-[#DDD0BB] bg-white px-3 text-[13px] text-[#1C1917] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#57534E] mb-1">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        disabled
                        className="h-8 w-full rounded-md border border-[#DDD0BB] bg-[#FBF5EC] px-3 text-[13px] text-[#8E7E68] cursor-not-allowed"
                      />
                      <p className="mt-1 text-[11px] text-[#8E7E68]">Email cannot be changed</p>
                    </div>
                    <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="rounded-lg border border-[#DDD0BB] bg-white">
                <div className="border-b border-[#DDD0BB] px-4 py-3">
                  <h2 className="text-[13px] font-semibold text-[#1C1917]">Account Details</h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#57534E]">User ID</span>
                    <span className="text-[12px] font-mono text-[#57534E]">{user?.id?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[#57534E]">Email</span>
                    <span className="text-[12px] text-[#1C1917]">{user?.email}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-lg border border-[#DDD0BB] bg-white">
                <div className="border-b border-[#DDD0BB] px-4 py-3">
                  <h2 className="text-[13px] font-semibold text-[#1C1917]">Quick Actions</h2>
                </div>
                <div className="p-4 space-y-2">
                  <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-[#1C1917] hover:bg-[#FBF5EC] transition-colors">
                    <Shield className="h-4 w-4 text-[#57534E]" />
                    Change Password
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-[#1C1917] hover:bg-[#FBF5EC] transition-colors">
                    <Bell className="h-4 w-4 text-[#57534E]" />
                    Notification Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="rounded-lg border border-[#DDD0BB] bg-white">
              <div className="border-b border-[#DDD0BB] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#1C1917]">Company Settings</h2>
              </div>
              <div className="p-8 text-center">
                <Building2 className="mx-auto h-10 w-10 text-[#DDD0BB]" strokeWidth={1.5} />
                <p className="mt-3 text-[14px] font-medium text-[#1C1917]">Manage company settings</p>
                <p className="mt-1 text-[12px] text-[#57534E]">Company information is managed in the Organization section.</p>
                <a
                  href="/organization/company"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"
                >
                  Go to Company
                </a>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="rounded-lg border border-[#DDD0BB] bg-white">
              <div className="border-b border-[#DDD0BB] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#1C1917]">Security Settings</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between rounded-md border border-[#DDD0BB] p-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-[#57534E]" />
                    <div>
                      <p className="text-[13px] font-medium text-[#1C1917]">Two-Factor Authentication</p>
                      <p className="text-[12px] text-[#57534E]">Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-[#DDD0BB] p-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-[#57534E]" />
                    <div>
                      <p className="text-[13px] font-medium text-[#1C1917]">Password</p>
                      <p className="text-[12px] text-[#57534E]">Last changed: Unknown</p>
                    </div>
                  </div>
                  <button className="inline-flex h-7 items-center gap-1 rounded border border-[#DDD0BB] px-2.5 text-[11px] font-medium text-[#57534E] hover:bg-[#FBF5EC]">
                    Change
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="rounded-lg border border-[#DDD0BB] bg-white">
              <div className="border-b border-[#DDD0BB] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#1C1917]">Notification Preferences</h2>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { label: 'Leave request notifications', description: 'Get notified when leave requests need approval' },
                  { label: 'Payroll notifications', description: 'Get notified about payroll runs and approvals' },
                  { label: 'Attendance alerts', description: 'Get notified about attendance exceptions' },
                  { label: 'System announcements', description: 'Important system updates and maintenance notices' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-md border border-[#DDD0BB] p-3">
                    <div>
                      <p className="text-[13px] font-medium text-[#1C1917]">{item.label}</p>
                      <p className="text-[12px] text-[#57534E]">{item.description}</p>
                    </div>
                    <button className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-[#064E3B] transition-colors">
                      <span className="pointer-events-none inline-block h-4 w-4 translate-x-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="rounded-lg border border-[#DDD0BB] bg-white">
              <div className="border-b border-[#DDD0BB] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#1C1917]">Appearance Settings</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-2">Theme</label>
                  <div className="flex gap-3">
                    <button className="flex h-20 w-32 flex-col items-center justify-center rounded-lg border-2 border-[#064E3B] bg-white p-3">
                      <Palette className="h-5 w-5 text-[#064E3B] mb-1" />
                      <span className="text-[11px] font-medium text-[#1C1917]">Light</span>
                    </button>
                    <button className="flex h-20 w-32 flex-col items-center justify-center rounded-lg border border-[#DDD0BB] bg-[#FBF5EC] p-3 opacity-50 cursor-not-allowed">
                      <Palette className="h-5 w-5 text-[#57534E] mb-1" />
                      <span className="text-[11px] text-[#57534E]">Dark</span>
                      <span className="text-[9px] text-[#8E7E68]">Soon</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-2">Sidebar</label>
                  <div className="flex items-center justify-between rounded-md border border-[#DDD0BB] p-3">
                    <div>
                      <p className="text-[13px] font-medium text-[#1C1917]">Collapsed by default</p>
                      <p className="text-[12px] text-[#57534E]">Start with sidebar collapsed</p>
                    </div>
                    <button className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-[#A7F3D0] transition-colors">
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
