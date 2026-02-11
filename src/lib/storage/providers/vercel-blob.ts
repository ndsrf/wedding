/**
 * Vercel Blob Storage Provider
 */

import { put, del, list } from '@vercel/blob';
import type { StorageProvider, UploadResult, FileStats, UploadOptions } from '../types';

export class VercelBlobStorageProvider implements StorageProvider {
  getName(): string {
    return 'vercel-blob';
  }

  async uploadFile(
    filepath: string,
    buffer: Buffer,
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Vercel Blob only supports 'public' access
    // If 'private' is requested, log a warning but still use 'public'
    if (options?.access === 'private') {
      console.warn('Vercel Blob does not support private access. File will be public.');
    }

    const blob = await put(filepath, buffer, {
      access: 'public',
      contentType: options?.contentType,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  }

  async deleteFile(filepath: string): Promise<void> {
    // For Vercel Blob, we need the full URL
    if (filepath.startsWith('http')) {
      await del(filepath);
    } else if (filepath.startsWith('/')) {
      // Legacy filesystem path format - skip deletion
      console.warn(`Cannot delete blob file with legacy filesystem path: ${filepath}`);
    } else {
      console.warn(`Cannot delete blob file - invalid path format: ${filepath}`);
    }
  }

  async readFile(filepath: string): Promise<Buffer> {
    // For Vercel Blob, fetch the file content
    if (filepath.startsWith('http')) {
      const response = await fetch(filepath);
      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      throw new Error('Blob storage requires full URL to read files');
    }
  }

  async fileExists(filepath: string): Promise<boolean> {
    try {
      if (filepath.startsWith('http')) {
        const response = await fetch(filepath, { method: 'HEAD' });
        return response.ok;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getFileStats(filepath: string): Promise<FileStats> {
    try {
      if (filepath.startsWith('http')) {
        const response = await fetch(filepath, { method: 'HEAD' });
        if (!response.ok) {
          return { size: 0, exists: false };
        }
        const size = parseInt(response.headers.get('content-length') || '0', 10);
        return { size, exists: true };
      }
      return { size: 0, exists: false };
    } catch {
      return { size: 0, exists: false };
    }
  }

  /**
   * Lists files with a given prefix (useful for migration and management)
   */
  async listFiles(prefix: string) {
    const { blobs } = await list({ prefix });
    return blobs;
  }
}
