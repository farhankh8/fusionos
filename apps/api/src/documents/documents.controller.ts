/**
 * FusionOS Documents Controller
 * REST endpoints for the complete Document Management system.
 */

import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, Res, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { DocumentsService } from './services/documents.service';
import {
  CreateDocumentDto, UpdateDocumentDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateFolderDto, UpdateFolderDto,
  LinkEntityDto, UpdatePermissionDto,
} from './dto/documents.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ── Dashboard ─────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('document:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId?: string) {
    return this.documentsService.getDashboard(ctx, companyId);
  }

  // ── Documents CRUD ────────────────────────────────────────────────────

  @Get()
  @RequirePermission('document:read')
  async listDocuments(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('folderId') folderId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('ownerId') ownerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.listDocuments(ctx, {
      companyId, categoryId, folderId, status, search, ownerId,
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post()
  @RequirePermission('document:create')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @CurrentTenant() ctx: TenantContext,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const dto: CreateDocumentDto = {
      name: body.name,
      description: body.description,
      companyId: body.companyId,
      categoryId: body.categoryId,
      folderId: body.folderId,
      ownerId: body.ownerId,
    };
    return this.documentsService.createDocument(ctx, dto, file);
  }

  @Get(':id')
  @RequirePermission('document:read')
  async getDocument(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getDocument(ctx, id);
  }

  @Patch(':id')
  @RequirePermission('document:update')
  async updateDocument(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermission('document:delete')
  @HttpCode(HttpStatus.OK)
  async deleteDocument(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.deleteDocument(ctx, id);
  }

  @Post(':id/restore')
  @RequirePermission('document:restore')
  @HttpCode(HttpStatus.OK)
  async restoreDocument(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.restoreDocument(ctx, id);
  }

  @Post(':id/archive')
  @RequirePermission('document:update')
  @HttpCode(HttpStatus.OK)
  async archiveDocument(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.archiveDocument(ctx, id);
  }

  // ── Versions ──────────────────────────────────────────────────────────

  @Get(':id/versions')
  @RequirePermission('document:read')
  async listVersions(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.listVersions(ctx, id);
  }

  @Post(':id/versions')
  @RequirePermission('document:create')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async createVersion(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.createVersion(ctx, id, file);
  }

  @Get(':id/download')
  @RequirePermission('document:download')
  async downloadDocument(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('versionId') versionId?: string,
    @Res() res?: Response,
  ) {
    const result = await this.documentsService.getDownloadUrl(ctx, id, versionId);
    if (res) {
      res.set({
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      });
      res.send(result.buffer);
    }
    return result;
  }

  // ── Entity Links ──────────────────────────────────────────────────────

  @Get(':id/links')
  @RequirePermission('document:read')
  async listEntityLinks(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.listEntityLinks(ctx, id);
  }

  @Post(':id/links')
  @RequirePermission('document:update')
  @HttpCode(HttpStatus.CREATED)
  async linkEntity(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkEntityDto,
  ) {
    return this.documentsService.linkEntity(ctx, id, dto);
  }

  @Delete(':id/links/:linkId')
  @RequirePermission('document:update')
  @HttpCode(HttpStatus.OK)
  async unlinkEntity(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    return this.documentsService.unlinkEntity(ctx, id, linkId);
  }

  // ── Permissions ───────────────────────────────────────────────────────

  @Get(':id/permissions')
  @RequirePermission('document.permission:read')
  async listPermissions(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.listPermissions(ctx, id);
  }

  @Patch(':id/permissions')
  @RequirePermission('document.permission:manage')
  async updatePermission(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.documentsService.updatePermission(ctx, id, dto);
  }

  // ── Activity ──────────────────────────────────────────────────────────

  @Get(':id/activity')
  @RequirePermission('document:read')
  async listActivities(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.listActivities(ctx, id, {
      page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50,
    });
  }

  // ── Categories ────────────────────────────────────────────────────────

  @Get('categories/list')
  @RequirePermission('document:read')
  async listCategories(@CurrentTenant() ctx: TenantContext) {
    return this.documentsService.listCategories(ctx);
  }

  @Post('categories')
  @RequirePermission('document:create')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateCategoryDto) {
    return this.documentsService.createCategory(ctx, dto);
  }

  @Patch('categories/:id')
  @RequirePermission('document:update')
  async updateCategory(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.documentsService.updateCategory(ctx, id, dto);
  }

  @Delete('categories/:id')
  @RequirePermission('document:delete')
  @HttpCode(HttpStatus.OK)
  async deleteCategory(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.deleteCategory(ctx, id);
  }

  // ── Folders ───────────────────────────────────────────────────────────

  @Get('folders/list')
  @RequirePermission('document.folder:read')
  async listFolders(@CurrentTenant() ctx: TenantContext, @Query('parentId') parentId?: string) {
    return this.documentsService.listFolders(ctx, parentId);
  }

  @Get('folders/tree')
  @RequirePermission('document.folder:read')
  async getFolderTree(@CurrentTenant() ctx: TenantContext) {
    return this.documentsService.getFolderTree(ctx);
  }

  @Post('folders')
  @RequirePermission('document.folder:create')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateFolderDto) {
    return this.documentsService.createFolder(ctx, dto);
  }

  @Patch('folders/:id')
  @RequirePermission('document.folder:update')
  async updateFolder(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.documentsService.updateFolder(ctx, id, dto);
  }

  @Delete('folders/:id')
  @RequirePermission('document.folder:delete')
  @HttpCode(HttpStatus.OK)
  async deleteFolder(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.deleteFolder(ctx, id);
  }
}
