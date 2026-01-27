import sharp from 'sharp';

export const ALLOWED_ASPECT_RATIOS = {
  SQUARE: { ratio: 1, label: '1:1', width: 1000, height: 1000 },
  WIDE: { ratio: 16 / 9, label: '16:9', width: 1600, height: 900 },
} as const;

const ASPECT_RATIO_TOLERANCE = 0.05; // 5% tolerance for aspect ratio matching

export interface ImageProcessingResult {
  success: boolean;
  buffer?: Buffer;
  mimeType?: string;
  width?: number;
  height?: number;
  detectedAspectRatio?: string;
  error?: string;
}

/**
 * Detects the aspect ratio of an image
 */
function detectAspectRatio(width: number, height: number): keyof typeof ALLOWED_ASPECT_RATIOS | null {
  const imageRatio = width / height;

  // Check if it matches 1:1
  if (Math.abs(imageRatio - ALLOWED_ASPECT_RATIOS.SQUARE.ratio) <= ASPECT_RATIO_TOLERANCE) {
    return 'SQUARE';
  }

  // Check if it matches 16:9
  if (Math.abs(imageRatio - ALLOWED_ASPECT_RATIOS.WIDE.ratio) <= ASPECT_RATIO_TOLERANCE) {
    return 'WIDE';
  }

  return null;
}

/**
 * Processes an image: validates aspect ratio, converts to PNG, and resizes
 * @param fileBuffer - The input image buffer
 * @param originalMimeType - The original MIME type of the image
 * @returns ImageProcessingResult with processed image or error
 */
export async function processTemplateImage(
  fileBuffer: Buffer,
  _originalMimeType: string
): Promise<ImageProcessingResult> {
  try {
    // Load the image with sharp
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return {
        success: false,
        error: 'Unable to determine image dimensions',
      };
    }

    // Detect aspect ratio
    const detectedRatio = detectAspectRatio(metadata.width, metadata.height);

    if (!detectedRatio) {
      const actualRatio = (metadata.width / metadata.height).toFixed(2);
      return {
        success: false,
        error: `Image aspect ratio (${actualRatio}:1) is not supported. Please use 1:1 (square) or 16:9 (wide) aspect ratio.`,
      };
    }

    const targetDimensions = ALLOWED_ASPECT_RATIOS[detectedRatio];

    // Resize and convert to PNG
    const processedBuffer = await image
      .resize(targetDimensions.width, targetDimensions.height, {
        fit: 'cover',
        position: 'center',
      })
      .png({
        quality: 90,
        compressionLevel: 9,
      })
      .toBuffer();

    return {
      success: true,
      buffer: processedBuffer,
      mimeType: 'image/png',
      width: targetDimensions.width,
      height: targetDimensions.height,
      detectedAspectRatio: targetDimensions.label,
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing image',
    };
  }
}

/**
 * Validates if a file is an image
 */
export function isValidImageType(mimeType: string): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(mimeType.toLowerCase());
}

/**
 * Gets the file extension for a MIME type
 */
export function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return extensions[mimeType.toLowerCase()] || 'png';
}
