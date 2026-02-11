/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for file storage that works with multiple providers:
 * - Local Filesystem (default)
 * - Vercel Blob Storage (when BLOB_READ_WRITE_TOKEN is set)
 * - AWS S3 (future - when AWS credentials are set)
 * - Other providers can be easily added by implementing the StorageProvider interface
 *
 * The storage provider is automatically selected based on environment variables.
 */

import { randomBytes } from 'crypto';
import path from 'path';
import type { StorageProvider, UploadResult, FileStats, UploadOptions } from './types';
import { FilesystemStorageProvider } from './providers/filesystem';
import { VercelBlobStorageProvider } from './providers/vercel-blob';
// import { S3StorageProvider } from './providers/s3'; // Uncomment when implementing

/**
 * Storage provider selection logic
 * Priority order:
 * 1. AWS S3 (if AWS_S3_BUCKET is set) - Future implementation
 * 2. Vercel Blob (if BLOB_READ_WRITE_TOKEN is set)
 * 3. Local Filesystem (default)
 */
function getStorageProvider(): StorageProvider {
  // Future: Check for S3 configuration
  // if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
  //   return new S3StorageProvider();
  // }

  // Check for Vercel Blob configuration
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStorageProvider();
  }

  // Default to filesystem
  return new FilesystemStorageProvider();
}

// Singleton storage provider instance
const storageProvider = getStorageProvider();

console.log(`[Storage] Using provider: ${storageProvider.getName()}`);

/**
 * Re-export types for convenience
 */
export type { UploadResult, FileStats, UploadOptions, StorageProvider } from './types';

/**
 * Uploads a file to storage (Vercel Blob, S3, or local filesystem)
 * @param filepath - Target path/name for the file (e.g., "uploads/image.png")
 * @param buffer - File content as Buffer
 * @param options - Upload options
 * @returns Upload result with URL and pathname
 */
export async function uploadFile(
  filepath: string,
  buffer: Buffer,
  options?: UploadOptions
): Promise<UploadResult> {
  return storageProvider.uploadFile(filepath, buffer, options);
}

/**
 * Deletes a file from storage
 * @param filepath - File path (for filesystem) or URL (for Vercel Blob/S3)
 *
 * IMPORTANT: For Vercel Blob and S3 storage, you must store the full URL (not just the pathname)
 * in your database to enable deletion.
 */
export async function deleteFile(filepath: string): Promise<void> {
  return storageProvider.deleteFile(filepath);
}

/**
 * Reads a file from storage
 * @param filepath - File path (for filesystem) or URL (for Vercel Blob/S3)
 * @returns File content as Buffer
 */
export async function readStorageFile(filepath: string): Promise<Buffer> {
  return storageProvider.readFile(filepath);
}

/**
 * Synchronously reads a file from local storage (only works with filesystem)
 * @param filepath - File path relative to public directory
 * @returns File content as Buffer
 * @throws Error if not using filesystem provider
 */
export function readStorageFileSync(filepath: string): Buffer {
  if (!(storageProvider instanceof FilesystemStorageProvider)) {
    throw new Error('Synchronous file reading is only supported with filesystem storage');
  }

  return storageProvider.readFileSync(filepath);
}

/**
 * Checks if a file exists in storage
 * @param filepath - File path (for filesystem) or URL (for Vercel Blob/S3)
 * @returns True if file exists
 */
export async function fileExists(filepath: string): Promise<boolean> {
  return storageProvider.fileExists(filepath);
}

/**
 * Synchronously checks if a file exists (only works with filesystem)
 * @param filepath - File path relative to public directory
 * @returns True if file exists
 * @throws Error if not using filesystem provider
 */
export function fileExistsSync(filepath: string): boolean {
  if (!(storageProvider instanceof FilesystemStorageProvider)) {
    throw new Error('Synchronous file existence check is only supported with filesystem storage');
  }

  return storageProvider.fileExistsSync(filepath);
}

/**
 * Gets file statistics
 * @param filepath - File path (for filesystem) or URL (for Vercel Blob/S3)
 * @returns File statistics
 */
export async function getFileStats(filepath: string): Promise<FileStats> {
  return storageProvider.getFileStats(filepath);
}

/**
 * Synchronously gets file statistics (only works with filesystem)
 * @param filepath - File path relative to public directory
 * @returns File statistics
 * @throws Error if not using filesystem provider
 */
export function getFileStatsSync(filepath: string): FileStats {
  if (!(storageProvider instanceof FilesystemStorageProvider)) {
    throw new Error('Synchronous file stats are only supported with filesystem storage');
  }

  return storageProvider.getFileStatsSync(filepath);
}

/**
 * Generates a unique filename with timestamp and random suffix
 * @param originalFilename - Original filename
 * @returns Unique filename
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomSuffix = randomBytes(8).toString('hex');
  const ext = path.extname(originalFilename);
  const nameWithoutExt = path.basename(originalFilename, ext);
  return `${timestamp}-${randomSuffix}-${nameWithoutExt}${ext}`;
}

/**
 * Returns whether the application is using Blob storage
 */
export function isUsingBlobStorage(): boolean {
  return storageProvider instanceof VercelBlobStorageProvider;
}

/**
 * Returns whether the application is using filesystem storage
 */
export function isUsingFilesystemStorage(): boolean {
  return storageProvider instanceof FilesystemStorageProvider;
}

/**
 * Returns whether the application is using S3 storage
 */
export function isUsingS3Storage(): boolean {
  // Uncomment when S3 is implemented
  // return storageProvider instanceof S3StorageProvider;
  return false;
}

/**
 * Returns the current storage provider name
 */
export function getStorageProviderName(): string {
  return storageProvider.getName();
}

/**
 * Returns the current storage provider instance
 * Use this for provider-specific operations not covered by the generic interface
 */
export function getProvider(): StorageProvider {
  return storageProvider;
}
