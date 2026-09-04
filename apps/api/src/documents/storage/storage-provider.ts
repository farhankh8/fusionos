/**
 * FusionOS Storage Abstraction
 *
 * Provides a clean interface for file storage. Business logic must NOT know
 * whether files are stored locally, in S3, GCS, or Azure Blob.
 * Future storage providers replace LocalStorageProvider without rewriting
 * document business logic.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StorageResult {
  storageKey: string;
  fileSize: number;
  checksum: string;
  mimeType: string;
}

export interface StorageProvider {
  upload(buffer: Buffer, metadata: { fileName: string; mimeType: string; tenantId: string }): Promise<StorageResult>;
  download(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}

/**
 * Local storage provider — stores files on local disk.
 * Suitable for development. Replace with S3/GCS/Azure in production.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(buffer: Buffer, metadata: { fileName: string; mimeType: string; tenantId: string }): Promise<StorageResult> {
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = path.extname(metadata.fileName);
    const safeFileName = `${crypto.randomUUID()}${ext}`;
    const tenantDir = path.join(this.baseDir, metadata.tenantId);

    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const storageKey = `${metadata.tenantId}/${safeFileName}`;
    const filePath = path.join(this.baseDir, storageKey);

    await fs.promises.writeFile(filePath, buffer);

    this.logger.debug(`File stored: ${storageKey} (${buffer.length} bytes)`);

    return {
      storageKey,
      fileSize: buffer.length,
      checksum,
      mimeType: metadata.mimeType,
    };
  }

  async download(storageKey: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, storageKey);

    // Prevent path traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error('Path traversal detected');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${storageKey}`);
    }

    return fs.promises.readFile(filePath);
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(this.baseDir, storageKey);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error('Path traversal detected');
    }

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, storageKey);
    return fs.existsSync(filePath);
  }
}
