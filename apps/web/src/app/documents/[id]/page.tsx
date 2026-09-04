'use client';

/**
 * FusionOS Document Detail Page
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface DocumentDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  fileExtension: string | null;
  totalSize: number;
  currentVersionNum: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; color: string | null } | null;
  folder?: { id: string; name: string } | null;
  owner?: { id: string; firstName: string; lastName: string } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  versions: Array<{
    id: string; versionNumber: number; fileName: string; mimeType: string;
    fileSize: number; checksum: string | null; createdAt: string;
    uploadedBy?: { firstName: string; lastName: string } | null;
  }>;
  entityLinks: Array<{ id: string; entityType: string; entityId: string }>;
  _count: { permissions: number; activities: number };
}

const TABS = [
  { id: 'versions', label: 'Versions' },
  { id: 'activity', label: 'Activity' },
  { id: 'links', label: 'Linked Entities' },
];

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️',
  txt: '📃', csv: '📋', zip: '📦',
};

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = (params?.id ?? '') as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('versions');
  const [activities, setActivities] = useState<any[]>([]);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  const loadDocument = useCallback(async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const data = await apiClient.get<DocumentDetail>(`/documents/${documentId}`);
      setDoc(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const loadActivities = useCallback(async () => {
    if (!documentId) return;
    try {
      const data = await apiClient.get<{ items: any[] }>(`/documents/${documentId}/activity`);
      setActivities(data.items || []);
    } catch {}
  }, [documentId]);

  useEffect(() => { loadDocument(); }, [loadDocument]);
  useEffect(() => { if (activeTab === 'activity') loadActivities(); }, [activeTab, loadActivities]);

  const handleNewVersion = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingVersion(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/v1/documents/${documentId}/versions`, {
          method: 'POST',
          body: formData,
        }).then(async (r) => {
          if (!r.ok) throw new Error('Upload failed');
          return r.json();
        });
        loadDocument();
      } catch (err: any) {
        alert(err?.message || 'Failed to upload version');
      } finally {
        setUploadingVersion(false);
      }
    };
    input.click();
  };

  const handleDownload = async (versionId?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/v1/documents/${documentId}/download${versionId ? `?versionId=${versionId}` : ''}`;
      window.open(url, '_blank');
    } catch (err: any) {
      alert(err?.message || 'Download failed');
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#DDD0BB] border-t-[#064E3B]" /></div>;
  }

  if (error || !doc) {
    return <div className="flex min-h-[60vh] items-center justify-center"><EmptyState title="Document not found" description={error || 'The document you are looking for does not exist.'} /></div>;
  }

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title={doc.name}
        description={`${doc.fileExtension?.toUpperCase() || 'FILE'} · ${formatSize(doc.totalSize)} · v${doc.currentVersionNum}`}
        breadcrumbs={[
          { label: 'Documents', href: '/documents' },
          { label: doc.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => handleDownload()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDD0BB] bg-white px-3 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC]">
              Download
            </button>
            <button onClick={handleNewVersion} disabled={uploadingVersion} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] disabled:opacity-50">
              {uploadingVersion ? 'Uploading...' : 'New Version'}
            </button>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="border-b border-[#DDD0BB] bg-white px-5 lg:px-6">
        <nav className="flex gap-0.5" aria-label="Document tabs">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#064E3B] text-[#064E3B]' : 'border-transparent text-[#57534E] hover:text-[#1C1917]'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-5 py-4 lg:px-6">
        {/* Overview Info */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[#DDD0BB] bg-white p-4">
            <h3 className="mb-3 text-[13px] font-semibold text-[#1C1917]">Document Details</h3>
            <div className="space-y-2 text-[12px]">
              {[
                { label: 'Status', value: <StatusBadge status={doc.status} /> },
                { label: 'Category', value: doc.category?.name || '—' },
                { label: 'Folder', value: doc.folder?.name || 'Root' },
                { label: 'Owner', value: doc.owner ? `${doc.owner.firstName} ${doc.owner.lastName}` : '—' },
                { label: 'Uploaded By', value: doc.createdBy ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}` : '—' },
                { label: 'Versions', value: doc.versions.length },
                { label: 'Linked Entities', value: doc.entityLinks.length },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <span className="text-[#57534E]">{item.label}</span>
                  <span className="text-[#1C1917]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[#DDD0BB] bg-white p-4">
            <h3 className="mb-3 text-[13px] font-semibold text-[#1C1917]">File Info</h3>
            <div className="space-y-2 text-[12px]">
              {[
                { label: 'Type', value: doc.fileExtension?.toUpperCase() || '—' },
                { label: 'Size', value: formatSize(doc.totalSize) },
                { label: 'Current Version', value: `v${doc.currentVersionNum}` },
                { label: 'Created', value: new Date(doc.createdAt).toLocaleDateString() },
                { label: 'Updated', value: new Date(doc.updatedAt).toLocaleDateString() },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <span className="text-[#57534E]">{item.label}</span>
                  <span className="text-[#1C1917]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {doc.description && (
          <div className="mb-4 rounded-lg border border-[#DDD0BB] bg-white p-4">
            <h3 className="mb-2 text-[13px] font-semibold text-[#1C1917]">Description</h3>
            <p className="text-[13px] text-[#57534E] whitespace-pre-wrap">{doc.description}</p>
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div className="rounded-lg border border-[#DDD0BB] bg-white">
            {doc.versions.length === 0 ? (
              <EmptyState title="No versions" description="Upload a document to create the first version." />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                    <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Version</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">File Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Uploaded By</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#57534E]">Size</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Date</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[#57534E]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5E6CC]">
                  {doc.versions.map((v) => (
                    <tr key={v.id} className="hover:bg-[#FBF5EC]">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${v.versionNumber === doc.currentVersionNum ? 'bg-[#D1FAE5] text-[#064E3B]' : 'bg-[#F5E6CC] text-[#57534E]'}`}>
                          v{v.versionNumber}
                          {v.versionNumber === doc.currentVersionNum && ' (current)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#1C1917]">{v.fileName}</td>
                      <td className="px-4 py-3 text-[#57534E]">
                        {v.uploadedBy ? `${v.uploadedBy.firstName} ${v.uploadedBy.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#57534E]">{formatSize(v.fileSize)}</td>
                      <td className="px-4 py-3 text-[#57534E]">{new Date(v.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDownload(v.id)} className="text-[12px] text-[#064E3B] hover:underline">Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="rounded-lg border border-[#DDD0BB] bg-white">
            {activities.length === 0 ? (
              <EmptyState title="No activity" description="Document activity will appear here." />
            ) : (
              <div className="divide-y divide-[#DDD0BB]">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex gap-4 px-4 py-3 hover:bg-[#FBF5EC]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-[11px] font-semibold text-[#064E3B]">
                      {a.employee?.firstName?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[#1C1917]">{a.description || a.action}</p>
                      <p className="text-[11px] text-[#57534E]">
                        {a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : 'System'} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Links Tab */}
        {activeTab === 'links' && (
          <div className="rounded-lg border border-[#DDD0BB] bg-white">
            {doc.entityLinks.length === 0 ? (
              <EmptyState title="No linked entities" description="Link this document to employees, projects, invoices, etc." />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                    <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Entity Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Entity ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5E6CC]">
                  {doc.entityLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-[#FBF5EC]">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded bg-[#D1FAE5] px-1.5 py-0.5 text-[10px] font-medium text-[#064E3B]">
                          {link.entityType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#57534E]">{link.entityId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
