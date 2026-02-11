/**
 * Storage provider types and interfaces
 */

export interface UploadResult {
  /** Public URL to access the uploaded file */
  url: string;
  /** File path (for filesystem) or storage pathname */
  pathname: string;
}

export interface FileStats {
  size: number;
  exists: boolean;
}

export interface UploadOptions {
  contentType?: string;
  access?: 'public' | 'private';
}

/**
 * Storage provider interface
 * Implement this interface to add new storage providers (S3, Azure, etc.)
 */
export interface StorageProvider {
  /** Upload a file to storage */
  uploadFile(filepath: string, buffer: Buffer, options?: UploadOptions): Promise<UploadResult>;

  /** Delete a file from storage */
  deleteFile(filepath: string): Promise<void>;

  /** Read a file from storage */
  readFile(filepath: string): Promise<Buffer>;

  /** Check if a file exists in storage */
  fileExists(filepath: string): Promise<boolean>;

  /** Get file statistics */
  getFileStats(filepath: string): Promise<FileStats>;

  /** Get the storage provider name */
  getName(): string;
}
