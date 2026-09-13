'use client';

/**
 * FusionOS Documents Page
 * Enterprise document management workspace.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiSkeleton } from '@/components/ui/skeleton';
import { FileStack, FolderOpen, Archive, Clock, Upload, Search, Eye, Trash2, RotateCcw, FolderPlus } from 'lucide-react';

interface Document {
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
  _count: { versions: number; entityLinks: number };
}

interface Folder {
  id: string;
  name: string;
  _count: { children: number; documents: number };
}

interface Category {
  id: string;
  name: string;
  color: string | null;
  _count: { documents: number };
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️',
  txt: '📃', csv: '📋', zip: '📦',
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [companyId, setCompanyId] = useState('');
  const [kpis, setKpis] = useState({ totalDocuments: 0, activeDocuments: 0, archivedDocuments: 0, trashedDocuments: 0, recentUploads: 0, totalStorageBytes: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', categoryId: '', folderId: '' });

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await apiClient.get<{ id: string }[]>('/organization/companies');
        const companies = Array.isArray(res) ? res : [];
        if (companies.length > 0) setCompanyId(companies[0]!.id);
      } catch {}
    };
    loadCompany();
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (companyId) params['companyId'] = companyId;
      if (search) params['search'] = search;
      if (statusFilter) params['status'] = statusFilter;
      if (categoryFilter) params['categoryId'] = categoryFilter;
      if (folderFilter) params['folderId'] = folderFilter;
      const res = await apiClient.get<{ items: Document[]; total: number; totalPages: number }>(`/documents?${new URLSearchParams(params)}`);
      setDocuments(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, search, statusFilter, categoryFilter, folderFilter]);

  const loadKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const params = companyId ? `?companyId=${companyId}` : '';
      const res = await apiClient.get<{ kpis: typeof kpis }>(`/documents/dashboard${params}`);
      setKpis(res.kpis);
    } catch {}
    setKpiLoading(false);
  }, [companyId]);

  const loadFolders = useCallback(async () => {
    try {
      const res = await apiClient.get<Folder[]>('/documents/folders/list');
      setFolders(Array.isArray(res) ? res : []);
    } catch {}
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await apiClient.get<Category[]>('/documents/categories/list');
      setCategories(Array.isArray(res) ? res : []);
    } catch {}
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);
  useEffect(() => { loadKpis(); }, [loadKpis]);
  useEffect(() => { loadFolders(); loadCategories(); }, [loadFolders, loadCategories]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', uploadForm.name || selectedFile.name);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.categoryId) formData.append('categoryId', uploadForm.categoryId);
      if (uploadForm.folderId) formData.append('folderId', uploadForm.folderId);

      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/v1/documents`, {
        method: 'POST',
        body: formData,
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: { message: 'Upload failed' } }));
          throw new Error(err.error?.message || 'Upload failed');
        }
        return r.json();
      });

      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ name: '', description: '', categoryId: '', folderId: '' });
      loadDocuments();
      loadKpis();
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await apiClient.post('/documents/folders', { name: newFolderName });
      setShowNewFolder(false);
      setNewFolderName('');
      loadFolders();
    } catch (err: any) {
      alert(err?.message || 'Failed to create folder');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiClient.post(`/documents/${id}/restore`);
      loadDocuments();
      loadKpis();
    } catch (err: any) {
      alert(err?.message || 'Failed to restore');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await apiClient.post(`/documents/${id}/archive`);
      loadDocuments();
      loadKpis();
    } catch (err: any) {
      alert(err?.message || 'Failed to archive');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Move this document to trash?')) return;
    try {
      await apiClient.delete(`/documents/${id}`);
      loadDocuments();
      loadKpis();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete');
    }
  };

  return (
    <div className="min-h-full bg-[#FBF5EC]">
      <PageHeader
        title="Documents"
        description="Manage files, records, and business documents across your organization"
        breadcrumbs={[{ label: 'Business' }, { label: 'Documents' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolder(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDD0BB] bg-white px-3 text-[12px] font-medium text-[#57534E] hover:bg-[#FBF5EC] transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              New Folder
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#064E3B] px-3 text-[12px] font-medium text-white hover:bg-[#047857] transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Document
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setUploadForm({ ...uploadForm, name: file.name });
                  setShowUpload(true);
                }
                e.target.value = '';
              }}
            />
          </div>
        }
      />

      <div className="px-5 py-4 lg:px-6">
        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {kpiLoading ? (
            Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Total Documents" value={kpis.totalDocuments} icon={FileStack} iconBg="bg-[#D1FAE5]" iconColor="text-[#064E3B]" />
              <KpiCard label="Active" value={kpis.activeDocuments} icon={FileStack} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <KpiCard label="Archived" value={kpis.archivedDocuments} icon={Archive} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard label="Recent Uploads" value={kpis.recentUploads} icon={Clock} iconBg="bg-purple-50" iconColor="text-purple-600" />
              <KpiCard label="Storage" value={formatSize(kpis.totalStorageBytes)} icon={FolderOpen} iconBg="bg-orange-50" iconColor="text-orange-600" />
            </>
          )}
        </div>

        <div className="flex gap-4">
          {/* Folder Sidebar */}
          <div className="w-[200px] shrink-0">
            <div className="rounded-lg border border-[#DDD0BB] bg-white p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">Folders</h3>
              <button
                onClick={() => { setFolderFilter(''); setPage(1); }}
                className={`mb-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                  !folderFilter ? 'bg-[#D1FAE5] text-[#064E3B] font-medium' : 'text-[#57534E] hover:bg-[#FBF5EC]'
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                All Files
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setFolderFilter(f.id); setPage(1); }}
                  className={`mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                    folderFilter === f.id ? 'bg-[#D1FAE5] text-[#064E3B] font-medium' : 'text-[#57534E] hover:bg-[#FBF5EC]'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="text-[11px] text-[#8E7E68]">{f._count.documents}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8E7E68]" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="h-8 w-full rounded-md border border-[#DDD0BB] bg-white pl-8 pr-3 text-[13px] text-[#1C1917] placeholder:text-[#8E7E68] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-8 rounded-md border border-[#DDD0BB] bg-white px-2.5 text-[12px] text-[#1C1917]"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
                <option value="TRASHED">Trashed</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="h-8 rounded-md border border-[#DDD0BB] bg-white px-2.5 text-[12px] text-[#1C1917]"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {(search || statusFilter || categoryFilter || folderFilter) && (
                <button onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); setFolderFilter(''); setPage(1); }} className="text-[12px] text-[#064E3B] hover:text-[#047857]">
                  Clear
                </button>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <div className="rounded-lg border border-[#DDD0BB] bg-white p-8">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-[#FBF5EC] rounded animate-pulse" />)}
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-lg border border-[#DDD0BB] bg-white">
                <EmptyState
                  icon={FileStack}
                  title="No documents found"
                  description="Upload your first document to get started."
                  action={
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#064E3B] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#047857]"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Document
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="rounded-lg border border-[#DDD0BB] bg-white overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#DDD0BB] bg-[#FBF5EC]">
                      <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Document</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Category</th>
                      <th className="text-center px-4 py-2.5 font-medium text-[#57534E]">Version</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[#57534E]">Size</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Uploaded By</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[#57534E]">Updated</th>
                      <th className="text-center px-4 py-2.5 font-medium text-[#57534E]">Status</th>
                      <th className="text-center px-4 py-2.5 font-medium text-[#57534E]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5E6CC]">
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="cursor-pointer hover:bg-[#FBF5EC] transition-colors"
                        onClick={() => router.push(`/documents/${doc.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{FILE_ICONS[doc.fileExtension || ''] || '📄'}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-[#1C1917] truncate max-w-[300px]">{doc.name}</p>
                              <p className="text-[11px] text-[#57534E]">{doc.fileExtension?.toUpperCase() || 'FILE'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {doc.category ? (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${doc.category.color || '#DDD0BB'}20`, color: doc.category.color || '#57534E' }}>
                              {doc.category.name}
                            </span>
                          ) : <span className="text-[#8E7E68]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-[#57534E]">v{doc.currentVersionNum}</td>
                        <td className="px-4 py-3 text-right text-[#57534E]">{formatSize(doc.totalSize)}</td>
                        <td className="px-4 py-3 text-[#57534E]">
                          {doc.createdBy ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#57534E]">
                          {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={doc.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/documents/${doc.id}`); }} className="p-1 text-[#57534E] hover:text-[#064E3B] rounded hover:bg-[#D1FAE5]">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {doc.status === 'TRASHED' ? (
                              <button onClick={(e) => { e.stopPropagation(); handleRestore(doc.id); }} className="p-1 text-[#57534E] hover:text-[#16A34A] rounded hover:bg-[#F0FDF4]">
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            ) : doc.status === 'ACTIVE' ? (
                              <button onClick={(e) => { e.stopPropagation(); handleArchive(doc.id); }} className="p-1 text-[#57534E] hover:text-[#D97706] rounded hover:bg-[#FFFBEB]">
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                            {doc.status !== 'TRASHED' && (
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="p-1 text-[#57534E] hover:text-[#DC2626] rounded hover:bg-[#FEF2F2]">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-[#DDD0BB] px-4 py-3 text-[12px] text-[#57534E]">
                    <span>Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, totalCount)} of {totalCount}</span>
                    <div className="flex gap-1">
                      <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#DDD0BB] disabled:opacity-40">←</button>
                      <span className="px-2 text-[12px]">{page} / {totalPages}</span>
                      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#DDD0BB] disabled:opacity-40">→</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowUpload(false)}>
          <div className="w-[520px] rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#DDD0BB] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#1C1917]">Upload Document</h2>
            </div>
            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="rounded-md bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#DC2626]">{uploadError}</div>
              )}
              {selectedFile && (
                <div className="flex items-center gap-3 rounded-lg border border-[#DDD0BB] bg-[#FBF5EC] p-3">
                  <span className="text-xl">{FILE_ICONS[selectedFile.name.split('.').pop() || ''] || '📄'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#1C1917] truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-[#57534E]">{formatSize(selectedFile.size)}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[12px] font-medium text-[#57534E] mb-1">Document Name</label>
                <input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  className="w-full rounded-md border border-[#DDD0BB] px-3 py-2 text-[13px] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
                  placeholder="Document name"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#57534E] mb-1">Description</label>
                <input
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full rounded-md border border-[#DDD0BB] px-3 py-2 text-[13px] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Category</label>
                  <select
                    value={uploadForm.categoryId}
                    onChange={(e) => setUploadForm({ ...uploadForm, categoryId: e.target.value })}
                    className="w-full rounded-md border border-[#DDD0BB] px-3 py-2 text-[13px]"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#57534E] mb-1">Folder</label>
                  <select
                    value={uploadForm.folderId}
                    onChange={(e) => setUploadForm({ ...uploadForm, folderId: e.target.value })}
                    className="w-full rounded-md border border-[#DDD0BB] px-3 py-2 text-[13px]"
                  >
                    <option value="">No folder</option>
                    {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-[#DDD0BB] px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-[13px] text-[#57534E] hover:text-[#1C1917]">Cancel</button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewFolder(false)}>
          <div className="w-[400px] rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#DDD0BB] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#1C1917]">New Folder</h2>
            </div>
            <div className="p-6">
              <label className="block text-[12px] font-medium text-[#57534E] mb-1">Folder Name</label>
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full rounded-md border border-[#DDD0BB] px-3 py-2 text-[13px] focus:border-[#064E3B] focus:outline-none focus:ring-1 focus:ring-[#064E3B]"
                placeholder="e.g. HR Documents"
                autoFocus
              />
            </div>
            <div className="border-t border-[#DDD0BB] px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowNewFolder(false)} className="px-4 py-2 text-[13px] text-[#57534E]">Cancel</button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="rounded-md bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] disabled:opacity-50"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
