import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import mime from 'mime';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePathParams = resolvedParams.path;
    
    // Construct the file path
    // We access the public/uploads directory directly
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...filePathParams);

    // Security check: Ensure the path is within the uploads directory
    // (Prevent directory traversal attacks)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(uploadsDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`[Uploads API] File not found: ${filePath}`);
      return new NextResponse('File not found', { status: 404 });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);

    // Determine content type
    const contentType = mime.getType(filePath) || 'application/octet-stream';

    // Create response with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        // Cache for 1 year, immutable
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Allow cross-origin (optional but good for images)
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Uploads API] Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
