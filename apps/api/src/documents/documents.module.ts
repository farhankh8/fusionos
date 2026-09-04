/**
 * FusionOS Documents Module
 * Document Management & File Infrastructure.
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './services/documents.service';
import { LocalStorageProvider, type StorageProvider } from './storage/storage-provider';

const STORAGE_PROVIDER = {
  provide: 'StorageProvider',
  useClass: LocalStorageProvider,
};

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    { provide: PrismaClient, useValue: new PrismaClient() },
    STORAGE_PROVIDER,
    LocalStorageProvider,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
