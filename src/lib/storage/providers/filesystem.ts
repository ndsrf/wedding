/**
 * Local Filesystem Storage Provider
 */

import { mkdir, writeFile, unlink, readFile, stat } from 'fs/promises';
import { existsSync, statSync, readFileSync } from 'fs';
import path from 'path';
import type { StorageProvider, UploadResult, FileStats, UploadOptions } from '../types';

export class FilesystemStorageProvider implements StorageProvider {
  getName(): string {
    return 'filesystem';
  }

  async uploadFile(
    filepath: string,
    buffer: Buffer,
    _options?: UploadOptions
  ): Promise<UploadResult> {
    const publicPath = path.join(process.cwd(), 'public', filepath);
    const publicDir = path.dirname(publicPath);

    // Create directory if it doesn't exist
    await mkdir(publicDir, { recursive: true });

    // Write file to disk
    await writeFile(publicPath, buffer);

    // Return URL relative to public directory
    return {
      url: `/${filepath}`,
      pathname: filepath,
    };
  }

  async deleteFile(filepath: string): Promise<void> {
    const publicPath = filepath.startsWith('/')
      ? path.join(process.cwd(), 'public', filepath)
      : path.join(process.cwd(), 'public', filepath);

    if (existsSync(publicPath)) {
      await unlink(publicPath);
    }
  }

  async readFile(filepath: string): Promise<Buffer> {
    const publicPath = filepath.startsWith('/')
      ? path.join(process.cwd(), 'public', filepath)
      : path.join(process.cwd(), 'public', filepath);

    return await readFile(publicPath);
  }

  /**
   * Synchronously reads a file (for backward compatibility)
   */
  readFileSync(filepath: string): Buffer {
    const publicPath = filepath.startsWith('/')
      ? path.join(process.cwd(), 'public', filepath)
      : path.join(process.cwd(), 'public', filepath);

    return readFileSync(publicPath);
  }

  async fileExists(filepath: string): Promise<boolean> {
    const publicPath = filepath.startsWith('/')
      ? path.join(process.cwd(), 'public', filepath)
      : path.join(process.cwd(), 'public', filepath);

    return existsSync(publicPath);
  }

  /**
   * Synchronously checks if a file exists (for backward compatibility)
   */
  fileExistsSync(filepath: string): boolean {
    const publicPath = filepath.startsWith('/')
      ? path.join(process.cwd(), 'public', filepath)
      : path.join(process.cwd(), 'public', filepath);

    return existsSync(publicPath);
  }

  async getFileStats(filepath: string): Promise<FileStats> {
    const publicPath = filepath.startsWith('/')
      ? path.join(process.cwd(), 'public', filepath)
      : path.join(process.cwd(), 'public', filepath);

    try {
      const stats = await stat(publicPath);
      return { size: stats.size, exists: true };
    } catch {
      return { size: 0, exists: false };
    }
  }

  /**
   * Synchronously gets file statistics (for backward compatibility)
   */
  getFileStatsSync(filepath: string): FileStats {
    const publicPath = filepath.startsWith('/')
      ? path.join(process.cwd(), 'public', filepath)
      : path.join(process.cwd(), 'public', filepath);

    try {
      const stats = statSync(publicPath);
      return { size: stats.size, exists: true };
    } catch {
      return { size: 0, exists: false };
    }
  }
}
