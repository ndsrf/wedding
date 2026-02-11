# Storage Provider System

This application uses a flexible storage provider system that supports multiple storage backends. The storage backend is automatically selected based on environment configuration.

## Supported Storage Providers

1. **Local Filesystem** (default) - For development and self-hosted deployments
2. **Vercel Blob Storage** - For Vercel deployments (recommended for production on Vercel)
3. **AWS S3** - Template provided for future implementation

The system automatically selects the appropriate provider based on environment variables.

## Features

- **Automatic provider selection**: Chooses the right storage provider based on environment variables
- **Unified API**: Same code works across all storage providers
- **File types supported**: Images, documents, Excel files, and all other uploads
- **Full compatibility**: Existing filesystem-based uploads continue to work
- **Extensible**: Easy to add new storage providers (S3, Azure, Google Cloud, etc.)
- **Type-safe**: Full TypeScript support with proper interfaces

## Provider Selection Priority

The system selects the storage provider in this order:

1. **AWS S3** - If `AWS_S3_BUCKET` and `AWS_ACCESS_KEY_ID` are set (future)
2. **Vercel Blob** - If `BLOB_READ_WRITE_TOKEN` is set
3. **Filesystem** - Default if no cloud storage is configured

## Setup

### Option 1: Local Filesystem (Default)

No configuration needed. Files are stored in the `public/uploads/` directory.

**Pros**: Simple, no external dependencies, works offline
**Cons**: Not suitable for serverless deployments, limited by disk space

### Option 2: Vercel Blob Storage

Add the following to your `.env` file:

```bash
# Vercel Blob Storage (Optional)
# When set, file uploads will use Vercel Blob Storage instead of local filesystem
# Get this token from your Vercel project settings: https://vercel.com/docs/storage/vercel-blob
BLOB_READ_WRITE_TOKEN="your-vercel-blob-read-write-token"
```

**Pros**: Serverless-friendly, globally distributed CDN, auto-scaling
**Cons**: Requires internet, usage-based pricing

### 2. Get Your Vercel Blob Token

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Blob**
3. Create a new Blob store (if you haven't already)
4. Copy the `BLOB_READ_WRITE_TOKEN` from the connection string
5. Add it to your `.env` file

### Option 3: AWS S3 (Future Implementation)

To implement S3 storage:

1. Install the AWS SDK:
```bash
npm install @aws-sdk/client-s3
```

2. Add environment variables to your `.env`:
```bash
# AWS S3 Storage (Optional)
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"
```

3. Implement the S3StorageProvider class in `src/lib/storage/providers/s3.ts` (template provided)

4. Update `src/lib/storage/index.ts` to uncomment the S3 provider selection logic

**Pros**: Very cost-effective at scale, powerful management features
**Cons**: Requires AWS account, more complex setup

### Deploy to Production

**For Vercel:**
1. Add `BLOB_READ_WRITE_TOKEN` to your environment variables in the Vercel dashboard
2. Deploy your application
3. All new file uploads will automatically use Vercel Blob Storage

**For AWS/Self-hosted:**
1. Use filesystem storage or implement S3 provider
2. Ensure `public/uploads/` directory has write permissions (for filesystem)
3. Configure appropriate environment variables

## What Gets Uploaded

The following file types are automatically handled by the storage system:

### Images
- **Template images**: Message template images (e.g., wedding invitations)
- **Invitation builder images**: Custom images used in the invitation builder
- **General uploads**: Any images uploaded via the `/api/upload` endpoint

### Documents
- **Payment documents**: Receipts and payment-related documents
- **Provider contracts**: Vendor contract documents

### Temporary Uploads (Not Stored)
These files are processed immediately and not stored:
- Guest list imports (Excel/CSV)
- VCF contact imports
- Checklist imports

## Migration from Filesystem to Blob Storage

### For New Deployments
Simply set `BLOB_READ_WRITE_TOKEN` and all uploads will go to Blob storage.

### For Existing Deployments

**Important**: When you enable Blob storage on an existing deployment:

1. **New uploads** will go to Vercel Blob Storage
2. **Existing files** will remain on the filesystem
3. **File retrieval** works for both:
   - Blob URLs (starting with `https://`) are fetched from Vercel
   - Filesystem paths (starting with `/`) are served from local storage

**Database Considerations**:
- New uploads store the full Blob URL (e.g., `https://xxx.public.blob.vercel-storage.com/...`)
- Old uploads store relative paths (e.g., `/uploads/...`)
- Both formats work correctly

**Migration Script** (Optional):
If you want to migrate existing files to Blob storage, you'll need to:

1. Read each file from the filesystem
2. Upload it to Blob storage using the storage utility
3. Update the database with the new Blob URL
4. Optionally delete the old filesystem file

Example migration code:

```typescript
import { uploadFile } from '@/lib/storage';
import { readFileSync } from 'fs';
import { prisma } from '@/lib/db/prisma';

async function migrateFilesToBlob() {
  // Example: Migrate template images
  const templates = await prisma.messageTemplate.findMany({
    where: {
      image_url: {
        not: null,
        startsWith: '/',
      },
    },
  });

  for (const template of templates) {
    if (!template.image_url) continue;

    // Read file from filesystem
    const filePath = path.join(process.cwd(), 'public', template.image_url);
    const buffer = readFileSync(filePath);

    // Upload to blob
    const result = await uploadFile(
      template.image_url.substring(1), // Remove leading slash
      buffer,
      { contentType: 'image/png' }
    );

    // Update database
    await prisma.messageTemplate.update({
      where: { id: template.id },
      data: { image_url: result.url },
    });

    console.log(`Migrated: ${template.image_url} -> ${result.url}`);
  }
}
```

## Architecture

The storage system uses a provider-based architecture:

```
src/lib/storage/
├── index.ts                      # Main API and provider selection
├── types.ts                      # TypeScript interfaces
└── providers/
    ├── filesystem.ts             # Local filesystem provider
    ├── vercel-blob.ts            # Vercel Blob Storage provider
    └── s3.ts                     # AWS S3 provider (template)
```

### Adding a New Storage Provider

To add a new storage provider (e.g., Azure Blob, Google Cloud Storage):

1. Create a new file in `src/lib/storage/providers/`
2. Implement the `StorageProvider` interface from `types.ts`
3. Update `getStorageProvider()` in `index.ts` to include your provider

Example:

```typescript
// src/lib/storage/providers/azure.ts
import type { StorageProvider } from '../types';

export class AzureBlobStorageProvider implements StorageProvider {
  getName(): string {
    return 'azure-blob';
  }

  async uploadFile(filepath, buffer, options) {
    // Implement Azure upload logic
  }

  async deleteFile(filepath) {
    // Implement Azure delete logic
  }

  // ... implement other methods
}
```

Then update `index.ts`:

```typescript
function getStorageProvider(): StorageProvider {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    return new AzureBlobStorageProvider();
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStorageProvider();
  }

  return new FilesystemStorageProvider();
}
```

## Storage API

The storage abstraction is located in `/src/lib/storage/index.ts` and provides the following functions:

### `uploadFile(filepath, buffer, options?)`

Uploads a file to storage.

```typescript
const result = await uploadFile('uploads/image.png', buffer, {
  contentType: 'image/png',
  access: 'public',
});

console.log(result.url); // Full URL to access the file
console.log(result.pathname); // Pathname (for filesystem) or blob pathname
```

### `deleteFile(filepath)`

Deletes a file from storage.

```typescript
await deleteFile('/uploads/image.png'); // Filesystem path
await deleteFile('https://xxx.blob.vercel-storage.com/...'); // Blob URL
```

**Important**: For Blob storage, you must store the full URL (not just the pathname) to enable deletion.

### `readStorageFile(filepath)`

Reads a file from storage.

```typescript
const buffer = await readStorageFile('https://xxx.blob.vercel-storage.com/...');
```

### `fileExists(filepath)`

Checks if a file exists.

```typescript
const exists = await fileExists('/uploads/image.png');
```

### `getFileStats(filepath)`

Gets file metadata.

```typescript
const stats = await getFileStats('/uploads/image.png');
console.log(stats.size); // File size in bytes
console.log(stats.exists); // Boolean
```

### `generateUniqueFilename(originalFilename)`

Generates a unique filename with timestamp and random suffix.

```typescript
const filename = generateUniqueFilename('photo.jpg');
// Returns: 1234567890-abc123def456-photo.jpg
```

### `isUsingBlobStorage()`

Returns whether Blob storage is currently enabled.

```typescript
if (isUsingBlobStorage()) {
  console.log('Using Vercel Blob Storage');
} else {
  console.log('Using a different provider');
}
```

### `isUsingFilesystemStorage()`

Returns whether filesystem storage is currently enabled.

```typescript
if (isUsingFilesystemStorage()) {
  console.log('Using local filesystem');
}
```

### `isUsingS3Storage()`

Returns whether S3 storage is currently enabled (future).

```typescript
if (isUsingS3Storage()) {
  console.log('Using AWS S3');
}
```

### `getStorageProviderName()`

Returns the name of the current storage provider.

```typescript
const provider = getStorageProviderName();
console.log(`Using ${provider} storage`); // "filesystem", "vercel-blob", or "s3"
```

### `getProvider()`

Returns the current storage provider instance for provider-specific operations.

```typescript
const provider = getProvider();

// For provider-specific features:
if (provider instanceof VercelBlobStorageProvider) {
  const blobs = await provider.listFiles('uploads/');
}
```

## File Upload Endpoints

The following API endpoints have been updated to support Blob storage:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | General file upload |
| `/api/admin/templates/[id]/image` | POST | Upload template image |
| `/api/admin/templates/[id]/image` | DELETE | Delete template image |
| `/api/admin/invitation-template/images` | GET | List invitation images |
| `/api/admin/invitation-template/images` | POST | Upload invitation image |
| `/api/weddings/[id]/payments/[paymentId]` | DELETE | Delete payment (and document) |
| `/api/weddings/[id]/providers/[providerId]` | DELETE | Delete provider (and documents) |

## Troubleshooting

### Files not uploading to Blob storage

- Verify `BLOB_READ_WRITE_TOKEN` is set correctly
- Check the token has read/write permissions
- Ensure the token is from the correct Vercel project

### Old files not accessible after enabling Blob storage

- Old filesystem files are served from `/api/uploads/[...path]`
- This endpoint is preserved for backward compatibility
- Only works when files still exist on the filesystem

### File deletion not working

- For Blob storage, ensure the full URL is stored in the database
- Legacy filesystem paths cannot be deleted when using Blob storage
- Consider running a migration to update database records

## Performance Considerations

### Vercel Blob Storage
- **Pros**:
  - Globally distributed CDN
  - No storage on serverless functions
  - Automatic scaling
  - Better for production deployments
- **Cons**:
  - Requires internet connection
  - Additional cost for storage and bandwidth

### Filesystem Storage
- **Pros**:
  - No additional cost
  - Works offline
  - Simpler for local development
- **Cons**:
  - Not suitable for serverless deployments
  - Storage limited by server disk space
  - No CDN benefits

## Best Practices

1. **Use Blob storage for production**: Vercel Blob is designed for serverless deployments
2. **Use filesystem for development**: Faster and doesn't require internet
3. **Store full URLs**: Always store the full blob URL in the database for proper deletion
4. **Test both modes**: Ensure your application works with both storage backends
5. **Monitor costs**: Keep track of Blob storage usage and bandwidth

## References

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Blob SDK](https://github.com/vercel/storage/tree/main/packages/blob)
- [Pricing](https://vercel.com/docs/storage/vercel-blob/usage-and-pricing)
