/**
 * FusionOS Documents Service
 * Complete document management — CRUD, versions, folders, categories,
 * entity links, permissions, search, archive, restore, soft delete.
 *
 * Storage is abstracted through StorageProvider — business logic never
 * knows if files are local, S3, or Azure Blob.
 */

import {
  Injectable, BadRequestException, NotFoundException, ConflictException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { EventPublisherService } from '../../common/services/event-publisher.service';
import { StorageProvider } from '../storage/storage-provider';
import {
  CreateDocumentDto, UpdateDocumentDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateFolderDto, UpdateFolderDto,
  LinkEntityDto, UpdatePermissionDto,
} from '../dto/documents.dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip',
]);

@Injectable()
export class DocumentsService {
  constructor(
    @Inject('DocumentsPrismaClient') private readonly prisma: PrismaClient,
    @Inject('StorageProvider') private readonly storage: StorageProvider,
    private readonly auditLog: AuditLogService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENT CRUD
  // ══════════════════════════════════════════════════════════════════════════

  async createDocument(ctx: TenantContext, dto: CreateDocumentDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');

    // Validate file
    this.validateFile(file);

    const document = await this.prisma.$transaction(async (tx) => {
      // Create document record
      const doc = await tx.document.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: dto.companyId,
          name: dto.name || file.originalname,
          description: dto.description,
          categoryId: dto.categoryId,
          folderId: dto.folderId,
          ownerId: dto.ownerId || ctx.employeeId,
          createdById: ctx.employeeId,
          fileExtension: this.getExtension(file.originalname),
          status: 'ACTIVE',
          currentVersionNum: 1,
        },
      });

      // Store file
      const storageResult = await this.storage.upload(file.buffer, {
        fileName: file.originalname,
        mimeType: file.mimetype,
        tenantId: ctx.tenantId,
      });

      // Create version 1
      const version = await tx.documentVersion.create({
        data: {
          tenantId: ctx.tenantId,
          documentId: doc.id,
          versionNumber: 1,
          fileName: file.originalname,
          storageKey: storageResult.storageKey,
          mimeType: storageResult.mimeType,
          fileSize: storageResult.fileSize,
          checksum: storageResult.checksum,
          uploadedById: ctx.employeeId,
        },
      });

      // Update document with current version
      const updated = await tx.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id, totalSize: storageResult.fileSize },
        include: {
          category: true,
          folder: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { versions: true, entityLinks: true } },
        },
      });

      // Record activity
      await tx.documentActivity.create({
        data: {
          tenantId: ctx.tenantId,
          documentId: doc.id,
          employeeId: ctx.employeeId,
          action: 'DOCUMENT_CREATED',
          description: `Document "${doc.name}" created with version 1`,
        },
      });

      return updated;
    });

    // Audit
    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'DOCUMENT_CREATED',
      entityType: 'Document',
      entityId: document.id,
      newValue: { name: document.name, status: document.status },
    });

    // Event
    await this.eventPublisher.publish(ctx, {
      eventType: 'document.created',
      aggregateType: 'document',
      aggregateId: document.id,
      payload: { documentId: document.id, name: document.name },
    });

    return document;
  }

  async listDocuments(ctx: TenantContext, opts: {
    companyId?: string; categoryId?: string; folderId?: string;
    status?: string; search?: string; ownerId?: string;
    page?: number; limit?: number;
  } = {}) {
    const { companyId, categoryId, folderId, status = 'ACTIVE', search, ownerId, page = 1, limit = 20 } = opts;
    const where: any = { tenantId: ctx.tenantId, deletedAt: null };
    if (companyId) where.companyId = companyId;
    if (categoryId) where.categoryId = categoryId;
    if (folderId) where.folderId = folderId;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
          folder: { select: { id: true, name: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { versions: true, entityLinks: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDocument(ctx: TenantContext, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
      include: {
        category: true,
        folder: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
        entityLinks: true,
        _count: { select: { permissions: true, activities: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async updateDocument(ctx: TenantContext, id: string, dto: UpdateDocumentDto) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === 'TRASHED') throw new BadRequestException('Cannot edit a trashed document');

    return this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.folderId !== undefined && { folderId: dto.folderId }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
      },
      include: {
        category: true,
        folder: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async deleteDocument(ctx: TenantContext, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // Soft delete — move to trash
    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.document.update({
        where: { id },
        data: { status: 'TRASHED', deletedAt: new Date() },
      });

      await tx.documentActivity.create({
        data: {
          tenantId: ctx.tenantId,
          documentId: id,
          employeeId: ctx.employeeId,
          action: 'DOCUMENT_DELETED',
          description: 'Document moved to trash',
        },
      });

      return d;
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'DOCUMENT_DELETED',
      entityType: 'Document',
      entityId: id,
    });

    return updated;
  }

  async restoreDocument(ctx: TenantContext, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: { not: null } },
    });
    if (!doc) throw new NotFoundException('Trashed document not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.document.update({
        where: { id },
        data: { status: 'ACTIVE', deletedAt: null },
      });

      await tx.documentActivity.create({
        data: {
          tenantId: ctx.tenantId,
          documentId: id,
          employeeId: ctx.employeeId,
          action: 'DOCUMENT_RESTORED',
          description: 'Document restored from trash',
        },
      });

      return d;
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'DOCUMENT_RESTORED',
      entityType: 'Document',
      entityId: id,
    });

    return updated;
  }

  async archiveDocument(ctx: TenantContext, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === 'TRASHED') throw new BadRequestException('Cannot archive a trashed document');

    return this.prisma.$transaction(async (tx) => {
      const d = await tx.document.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      await tx.documentActivity.create({
        data: {
          tenantId: ctx.tenantId,
          documentId: id,
          employeeId: ctx.employeeId,
          action: 'DOCUMENT_ARCHIVED',
          description: 'Document archived',
        },
      });

      return d;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VERSIONS
  // ══════════════════════════════════════════════════════════════════════════

  async listVersions(ctx: TenantContext, documentId: string) {
    await this.ensureDocumentExists(documentId, ctx.tenantId);
    return this.prisma.documentVersion.findMany({
      where: { documentId, tenantId: ctx.tenantId },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async createVersion(ctx: TenantContext, documentId: string, file: Express.Multer.File) {
    this.validateFile(file);

    const doc = await this.ensureDocumentExists(documentId, ctx.tenantId);
    if (doc.status === 'TRASHED') throw new BadRequestException('Cannot add version to a trashed document');

    const newVersionNum = doc.currentVersionNum + 1;

    const version = await this.prisma.$transaction(async (tx) => {
      // Store file
      const storageResult = await this.storage.upload(file.buffer, {
        fileName: file.originalname,
        mimeType: file.mimetype,
        tenantId: ctx.tenantId,
      });

      // Create version
      const v = await tx.documentVersion.create({
        data: {
          tenantId: ctx.tenantId,
          documentId,
          versionNumber: newVersionNum,
          fileName: file.originalname,
          storageKey: storageResult.storageKey,
          mimeType: storageResult.mimeType,
          fileSize: storageResult.fileSize,
          checksum: storageResult.checksum,
          uploadedById: ctx.employeeId,
        },
      });

      // Update document
      await tx.document.update({
        where: { id: documentId },
        data: {
          currentVersionId: v.id,
          currentVersionNum: newVersionNum,
          totalSize: { increment: storageResult.fileSize },
        },
      });

      // Record activity
      await tx.documentActivity.create({
        data: {
          tenantId: ctx.tenantId,
          documentId,
          employeeId: ctx.employeeId,
          action: 'DOCUMENT_VERSION_CREATED',
          description: `Version ${newVersionNum} uploaded`,
        },
      });

      return v;
    });

    return version;
  }

  async getDownloadUrl(ctx: TenantContext, documentId: string, versionId?: string) {
    const doc = await this.ensureDocumentExists(documentId, ctx.tenantId);
    if (doc.status === 'TRASHED') throw new BadRequestException('Cannot download a trashed document');

    let version;
    if (versionId) {
      version = await this.prisma.documentVersion.findFirst({
        where: { id: versionId, documentId, tenantId: ctx.tenantId },
      });
    } else {
      version = await this.prisma.documentVersion.findFirst({
        where: { id: doc.currentVersionId!, tenantId: ctx.tenantId },
      });
    }
    if (!version) throw new NotFoundException('Version not found');

    // Record download activity
    await this.prisma.documentActivity.create({
      data: {
        tenantId: ctx.tenantId,
        documentId,
        employeeId: ctx.employeeId,
        action: 'DOCUMENT_DOWNLOADED',
        description: `Version ${version.versionNumber} downloaded`,
      },
    });

    // Return file content (in production, return signed URL)
    const buffer = await this.storage.download(version.storageKey);
    return { buffer, fileName: version.fileName, mimeType: version.mimeType };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════

  async listCategories(ctx: TenantContext) {
    return this.prisma.documentCategory.findMany({
      where: { tenantId: ctx.tenantId },
      include: { _count: { select: { documents: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(ctx: TenantContext, dto: CreateCategoryDto) {
    const existing = await this.prisma.documentCategory.findFirst({
      where: { tenantId: ctx.tenantId, name: dto.name },
    });
    if (existing) throw new ConflictException(`Category "${dto.name}" already exists`);

    return this.prisma.documentCategory.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateCategory(ctx: TenantContext, id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.documentCategory.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    return this.prisma.documentCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteCategory(ctx: TenantContext, id: string) {
    const cat = await this.prisma.documentCategory.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    // Check if category has documents
    const docCount = await this.prisma.document.count({ where: { categoryId: id, tenantId: ctx.tenantId } });
    if (docCount > 0) throw new BadRequestException('Cannot delete category with documents');

    await this.prisma.documentCategory.delete({ where: { id } });
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOLDERS
  // ══════════════════════════════════════════════════════════════════════════

  async listFolders(ctx: TenantContext, parentId?: string) {
    const where: any = { tenantId: ctx.tenantId };
    if (parentId) where.parentId = parentId;
    else where.parentId = null; // Root folders

    return this.prisma.documentFolder.findMany({
      where,
      include: {
        _count: { select: { children: true, documents: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFolderTree(ctx: TenantContext) {
    const allFolders = await this.prisma.documentFolder.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: 'asc' },
    });

    // Build tree
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const f of allFolders) {
      map.set(f.id, { ...f, children: [] });
    }
    for (const f of allFolders) {
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children.push(map.get(f.id));
      } else {
        roots.push(map.get(f.id));
      }
    }

    return roots;
  }

  async createFolder(ctx: TenantContext, dto: CreateFolderDto) {
    // Prevent circular hierarchy
    if (dto.parentId) {
      const parent = await this.prisma.documentFolder.findFirst({
        where: { id: dto.parentId, tenantId: ctx.tenantId },
      });
      if (!parent) throw new NotFoundException('Parent folder not found');
    }

    // Check uniqueness
    const existing = await this.prisma.documentFolder.findFirst({
      where: { tenantId: ctx.tenantId, name: dto.name, parentId: dto.parentId || null },
    });
    if (existing) throw new ConflictException(`Folder "${dto.name}" already exists in this location`);

    return this.prisma.documentFolder.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
      },
    });
  }

  async updateFolder(ctx: TenantContext, id: string, dto: UpdateFolderDto) {
    const folder = await this.prisma.documentFolder.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    return this.prisma.documentFolder.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async deleteFolder(ctx: TenantContext, id: string) {
    const folder = await this.prisma.documentFolder.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    // Check for child folders
    const childCount = await this.prisma.documentFolder.count({ where: { parentId: id } });
    if (childCount > 0) throw new BadRequestException('Cannot delete folder with subfolders');

    // Check for documents
    const docCount = await this.prisma.document.count({ where: { folderId: id, tenantId: ctx.tenantId } });
    if (docCount > 0) throw new BadRequestException('Cannot delete folder with documents');

    await this.prisma.documentFolder.delete({ where: { id } });
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENTITY LINKS
  // ══════════════════════════════════════════════════════════════════════════

  async linkEntity(ctx: TenantContext, documentId: string, dto: LinkEntityDto) {
    await this.ensureDocumentExists(documentId, ctx.tenantId);

    const existing = await this.prisma.documentEntityLink.findFirst({
      where: {
        tenantId: ctx.tenantId,
        documentId,
        entityType: dto.entityType as any,
        entityId: dto.entityId,
      },
    });
    if (existing) throw new ConflictException('Entity already linked to this document');

    return this.prisma.documentEntityLink.create({
      data: {
        tenantId: ctx.tenantId,
        documentId,
        entityType: dto.entityType as any,
        entityId: dto.entityId,
      },
    });
  }

  async unlinkEntity(ctx: TenantContext, documentId: string, linkId: string) {
    const link = await this.prisma.documentEntityLink.findFirst({
      where: { id: linkId, documentId, tenantId: ctx.tenantId },
    });
    if (!link) throw new NotFoundException('Entity link not found');

    await this.prisma.documentEntityLink.delete({ where: { id: linkId } });
    return { success: true };
  }

  async listEntityLinks(ctx: TenantContext, documentId: string) {
    await this.ensureDocumentExists(documentId, ctx.tenantId);
    return this.prisma.documentEntityLink.findMany({
      where: { documentId, tenantId: ctx.tenantId },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ══════════════════════════════════════════════════════════════════════════

  async listPermissions(ctx: TenantContext, documentId: string) {
    await this.ensureDocumentExists(documentId, ctx.tenantId);
    return this.prisma.documentPermission.findMany({
      where: { documentId, tenantId: ctx.tenantId },
      include: {
        // Note: no employee relation on DocumentPermission, just IDs
      },
    });
  }

  async updatePermission(ctx: TenantContext, documentId: string, dto: UpdatePermissionDto) {
    await this.ensureDocumentExists(documentId, ctx.tenantId);

    return this.prisma.documentPermission.upsert({
      where: {
        tenantId_documentId_employeeId: {
          tenantId: ctx.tenantId,
          documentId,
          employeeId: dto.employeeId,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        documentId,
        employeeId: dto.employeeId,
        canRead: dto.canRead ?? true,
        canDownload: dto.canDownload ?? false,
        canEdit: dto.canEdit ?? false,
        canDelete: dto.canDelete ?? false,
        canManage: dto.canManage ?? false,
        grantedById: ctx.userId,
      },
      update: {
        ...(dto.canRead !== undefined && { canRead: dto.canRead }),
        ...(dto.canDownload !== undefined && { canDownload: dto.canDownload }),
        ...(dto.canEdit !== undefined && { canEdit: dto.canEdit }),
        ...(dto.canDelete !== undefined && { canDelete: dto.canDelete }),
        ...(dto.canManage !== undefined && { canManage: dto.canManage }),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITY
  // ══════════════════════════════════════════════════════════════════════════

  async listActivities(ctx: TenantContext, documentId: string, opts: { page?: number; limit?: number } = {}) {
    await this.ensureDocumentExists(documentId, ctx.tenantId);
    const { page = 1, limit = 50 } = opts;

    const [items, total] = await Promise.all([
      this.prisma.documentActivity.findMany({
        where: { documentId, tenantId: ctx.tenantId },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentActivity.count({ where: { documentId, tenantId: ctx.tenantId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext, companyId?: string) {
    const where = companyId ? { tenantId: ctx.tenantId, companyId, deletedAt: null } : { tenantId: ctx.tenantId, deletedAt: null };

    const [totalDocuments, activeDocuments, archivedDocuments, trashedDocuments, recentUploads] = await Promise.all([
      this.prisma.document.count({ where: { tenantId: ctx.tenantId, deletedAt: null } }),
      this.prisma.document.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.document.count({ where: { ...where, status: 'ARCHIVED' } }),
      this.prisma.document.count({ where: { ...where, status: 'TRASHED' } }),
      this.prisma.document.count({ where: { ...where, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]);

    // Storage usage
    const versions = await this.prisma.documentVersion.findMany({
      where: { tenantId: ctx.tenantId },
      select: { fileSize: true },
    });
    const totalStorageBytes = versions.reduce((sum, v) => sum + v.fileSize, 0);

    return {
      kpis: {
        totalDocuments,
        activeDocuments,
        archivedDocuments,
        trashedDocuments,
        recentUploads,
        totalStorageBytes,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  private async ensureDocumentExists(id: string, tenantId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  private validateFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    // Validate filename — no path traversal
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }
  }

  private getExtension(filename: string): string {
    const idx = filename.lastIndexOf('.');
    return idx >= 0 ? filename.substring(idx + 1).toLowerCase() : '';
  }
}
