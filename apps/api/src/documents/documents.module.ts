/**
 * FusionOS Documents Module
 * Document Management & File Infrastructure.
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './services/documents.service';
import { LocalStorageProvider } from './storage/storage-provider';

const DOCUMENTS_PRISMA = {
  provide: 'DocumentsPrismaClient',
  useFactory: () => new PrismaClient(),
};

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    DOCUMENTS_PRISMA,
    DocumentsService,
    { provide: 'StorageProvider', useClass: LocalStorageProvider },
    LocalStorageProvider,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
