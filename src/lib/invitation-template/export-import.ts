/**
 * Invitation Template Export/Import
 *
 * Exports an invitation template (design + images) to a .nupcinv file
 * (which is a ZIP archive with a custom extension) and imports it back.
 *
 * File format (inside the ZIP):
 *   manifest.json  - metadata (format version, export date, template name)
 *   design.json    - TemplateDesign with versioned blocks and an imageMap
 *   images/        - all user-uploaded images referenced by the template
 *
 * Block versioning:
 *   Every block carries a `_version` field in the exported design.json.
 *   On import, missing fields are filled with safe defaults so that old
 *   exports stay compatible when new block properties are added in the future.
 */

import path from 'path';
import { randomUUID } from 'crypto';
import { createZip, parseZip } from '@/lib/zip';
import { uploadFile, readStorageFile } from '@/lib/storage';
import type {
  TemplateDesign,
  TemplateBlock,
  TextBlock,
  ImageBlock,
  LocationBlock,
  CountdownBlock,
  AddToCalendarBlock,
  ButtonBlock,
  GalleryBlock,
  SpacerBlock,
  EmbedBlock,
} from '@/types/invitation-template';

// ============================================================================
// BLOCK VERSIONS
// ============================================================================

/**
 * Current version number for each block type.
 * Increment the version for a type whenever you add/remove/rename fields so
 * that the import migration logic can handle old files gracefully.
 */
export const BLOCK_VERSIONS: Record<TemplateBlock['type'], number> = {
  text: 1,
  image: 1,
  location: 1,
  countdown: 1,
  'add-to-calendar': 1,
  button: 1,
  gallery: 1,
  spacer: 1,
  embed: 1,
} as const;

/** Current format version for the .nupcinv manifest */
export const FORMAT_VERSION = '1.0';

// ============================================================================
// TYPES
// ============================================================================

export interface NupcinvManifest {
  /** Format version of the .nupcinv file (not the app version) */
  format_version: string;
  /** ISO date string of when the export was created */
  exported_at: string;
  /** Human-readable template name */
  template_name: string;
}

/**
 * TemplateBlock with an extra `_version` field added on export,
 * and an optional `_version` field expected on import.
 */
export type VersionedBlock = TemplateBlock & { _version: number };

export interface ExportedDesign {
  globalStyle: TemplateDesign['globalStyle'];
  blocks: VersionedBlock[];
  /**
   * Maps original image references (URL or path from the exported environment)
   * to the ZIP-internal path (e.g. "images/filename.png").
   * Only includes images that were successfully bundled.
   */
  imageMap: Record<string, string>;
}

// ============================================================================
// BLOCK DEFAULTS / MIGRATION
// ============================================================================

/**
 * Returns a TemplateBlock with all optional fields set to safe defaults.
 * Called during import so that old blocks exported before new fields were
 * added will still work correctly.
 */
export function migrateBlock(raw: Record<string, unknown>): TemplateBlock {
  const type = raw.type as TemplateBlock['type'];
  // Strip the internal version field before returning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _version, ...block } = raw as { _version?: number } & Record<string, unknown>;

  switch (type) {
    case 'text': {
      const b = block as Partial<TextBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'text',
        content: b.content ?? { ES: '', EN: '', FR: '', IT: '', DE: '' },
        style: {
          fontFamily: b.style?.fontFamily ?? 'Georgia, serif',
          fontSize: b.style?.fontSize ?? '1rem',
          color: b.style?.color ?? '#000000',
          textAlign: b.style?.textAlign ?? 'center',
          fontStyle: b.style?.fontStyle,
          fontWeight: b.style?.fontWeight,
          textDecoration: b.style?.textDecoration,
          backgroundImage: b.style?.backgroundImage,
        },
      };
    }

    case 'image': {
      const b = block as Partial<ImageBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'image',
        src: b.src ?? '',
        alt: b.alt ?? '',
        alignment: b.alignment ?? 'center',
        zoom: b.zoom ?? 100,
      };
    }

    case 'location': {
      const b = block as Partial<LocationBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'location',
        style: b.style
          ? {
              fontFamily: b.style.fontFamily,
              fontSize: b.style.fontSize,
              color: b.style.color,
              mapStyle: b.style.mapStyle,
              fontStyle: b.style.fontStyle,
              fontWeight: b.style.fontWeight,
              textDecoration: b.style.textDecoration,
            }
          : undefined,
      };
    }

    case 'countdown': {
      const b = block as Partial<CountdownBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'countdown',
        style: b.style
          ? {
              fontFamily: b.style.fontFamily,
              fontSize: b.style.fontSize,
              color: b.style.color,
              fontStyle: b.style.fontStyle,
              fontWeight: b.style.fontWeight,
              textDecoration: b.style.textDecoration,
              labelFontSize: b.style.labelFontSize,
              labelColor: b.style.labelColor,
            }
          : undefined,
      };
    }

    case 'add-to-calendar': {
      const b = block as Partial<AddToCalendarBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'add-to-calendar',
      };
    }

    case 'button': {
      const b = block as Partial<ButtonBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'button',
        text: b.text ?? { ES: '', EN: '', FR: '', IT: '', DE: '' },
        url: b.url ?? '',
        style: {
          buttonColor: b.style?.buttonColor ?? '#D4AF37',
          textColor: b.style?.textColor ?? '#FFFFFF',
          fontFamily: b.style?.fontFamily ?? 'Inter, sans-serif',
          alignment: b.style?.alignment ?? 'center',
        },
      };
    }

    case 'gallery': {
      const b = block as Partial<GalleryBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'gallery',
        columns: b.columns ?? 1,
        showCaptions: b.showCaptions ?? false,
        showUploadButton: b.showUploadButton ?? true,
        autoPlayMs: b.autoPlayMs ?? 4000,
        style: b.style ?? { borderRadius: '0.75rem' },
      };
    }

    case 'spacer': {
      const b = block as Partial<SpacerBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'spacer',
        height: b.height ?? '2rem',
      };
    }

    case 'embed': {
      const b = block as Partial<EmbedBlock>;
      return {
        id: b.id ?? randomUUID(),
        type: 'embed',
        html: b.html ?? '',
        height: b.height,
      };
    }

    default: {
      // Unknown block type from a future version of the app — pass through as-is
      // so an old app doesn't crash when it encounters a block it doesn't know.
      // The editor will simply not render it and it will be preserved on re-export.
      return block as unknown as TemplateBlock;
    }
  }
}

// ============================================================================
// IMAGE EXTRACTION HELPERS
// ============================================================================

/**
 * Collects every image reference in a TemplateDesign.
 * Returns an array of unique image references (URL or local path).
 */
export function extractImageRefs(design: TemplateDesign): string[] {
  const refs = new Set<string>();

  if (design.globalStyle.backgroundImage) {
    refs.add(design.globalStyle.backgroundImage);
  }
  if (design.globalStyle.paperBackgroundImage) {
    refs.add(design.globalStyle.paperBackgroundImage);
  }

  for (const block of design.blocks) {
    if (block.type === 'image' && block.src) {
      refs.add(block.src);
    }
    if (block.type === 'text' && block.style.backgroundImage) {
      refs.add(block.style.backgroundImage);
    }
  }

  return Array.from(refs);
}

/**
 * Attempts to read an image from storage.
 * Returns null if the image cannot be read (e.g. external URL without fetch support
 * or a missing file) so callers can skip gracefully.
 */
async function fetchImageBuffer(ref: string): Promise<Buffer | null> {
  try {
    // External http/https URL — fetch it
    if (ref.startsWith('http://') || ref.startsWith('https://')) {
      const res = await fetch(ref);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    // Internal path — read from storage layer
    return await readStorageFile(ref);
  } catch {
    return null;
  }
}

/**
 * Derives a safe ZIP-internal filename from an image reference.
 * Keeps the original basename to make the archive human-readable.
 */
function imageRefToZipName(ref: string): string {
  const base = path.basename(ref.split('?')[0]); // strip query string
  return `images/${base}`;
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Exports a template to a .nupcinv buffer (ZIP archive).
 *
 * @param design       - The TemplateDesign to export
 * @param templateName - Human-readable name embedded in the manifest
 * @returns Buffer containing the complete .nupcinv archive
 */
export async function exportInvitationTemplate(
  design: TemplateDesign,
  templateName: string
): Promise<Buffer> {
  // --- Collect and bundle images ---
  const imageRefs = extractImageRefs(design);
  const imageMap: Record<string, string> = {};
  const zipEntries: { name: string; data: Buffer }[] = [];

  // Track used zip names to avoid collisions when two refs have the same basename
  const usedZipNames = new Set<string>();

  for (const ref of imageRefs) {
    const buf = await fetchImageBuffer(ref);
    if (!buf) continue; // skip images we can't read

    let zipName = imageRefToZipName(ref);
    // Handle basename collision
    if (usedZipNames.has(zipName)) {
      const ext = path.extname(zipName);
      const base = zipName.slice(0, zipName.length - ext.length);
      zipName = `${base}_${randomUUID().split('-')[0]}${ext}`;
    }
    usedZipNames.add(zipName);

    imageMap[ref] = zipName;
    zipEntries.push({ name: zipName, data: buf });
  }

  // --- Build versioned blocks with remapped image refs ---
  const versionedBlocks: VersionedBlock[] = design.blocks.map((block) => {
    const version = BLOCK_VERSIONS[block.type] ?? 1;

    if (block.type === 'image') {
      return {
        ...block,
        src: imageMap[block.src] ?? block.src,
        _version: version,
      };
    }

    if (block.type === 'text' && block.style.backgroundImage) {
      return {
        ...block,
        style: {
          ...block.style,
          backgroundImage: imageMap[block.style.backgroundImage] ?? block.style.backgroundImage,
        },
        _version: version,
      };
    }

    return { ...block, _version: version };
  });

  // --- Remap global style images ---
  const exportedGlobalStyle = {
    ...design.globalStyle,
    backgroundImage: design.globalStyle.backgroundImage
      ? (imageMap[design.globalStyle.backgroundImage] ?? design.globalStyle.backgroundImage)
      : undefined,
    paperBackgroundImage: design.globalStyle.paperBackgroundImage
      ? (imageMap[design.globalStyle.paperBackgroundImage] ?? design.globalStyle.paperBackgroundImage)
      : undefined,
  };

  // --- Build design.json ---
  const exportedDesign: ExportedDesign = {
    globalStyle: exportedGlobalStyle,
    blocks: versionedBlocks,
    imageMap,
  };

  // --- Build manifest.json ---
  const manifest: NupcinvManifest = {
    format_version: FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    template_name: templateName,
  };

  // --- Assemble ZIP ---
  zipEntries.unshift(
    { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
    { name: 'design.json', data: Buffer.from(JSON.stringify(exportedDesign, null, 2), 'utf8') }
  );

  return createZip(zipEntries);
}

// ============================================================================
// IMPORT
// ============================================================================

export interface ImportResult {
  design: TemplateDesign;
  templateName: string;
  warnings: string[];
}

/**
 * Parses a .nupcinv buffer, uploads bundled images to the new environment,
 * and returns the migrated TemplateDesign ready to be persisted.
 *
 * @param nupcinvBuffer - Raw buffer of the .nupcinv file
 * @param weddingId     - ID of the wedding/environment receiving the import
 * @returns ImportResult with the reconstructed design and any warnings
 */
export async function importInvitationTemplate(
  nupcinvBuffer: Buffer,
  weddingId: string
): Promise<ImportResult> {
  const warnings: string[] = [];

  // --- Parse ZIP ---
  let files: Map<string, Buffer>;
  try {
    files = parseZip(nupcinvBuffer);
  } catch (err) {
    throw new Error(
      `Failed to parse .nupcinv file: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // --- Read manifest ---
  const manifestBuf = files.get('manifest.json');
  if (!manifestBuf) {
    throw new Error('Invalid .nupcinv file: manifest.json is missing');
  }
  let manifest: NupcinvManifest;
  try {
    manifest = JSON.parse(manifestBuf.toString('utf8'));
  } catch {
    throw new Error('Invalid .nupcinv file: manifest.json is not valid JSON');
  }
  if (!manifest.format_version) {
    throw new Error('Invalid .nupcinv file: manifest.json is missing format_version');
  }

  // --- Read design ---
  const designBuf = files.get('design.json');
  if (!designBuf) {
    throw new Error('Invalid .nupcinv file: design.json is missing');
  }
  let exportedDesign: ExportedDesign;
  try {
    exportedDesign = JSON.parse(designBuf.toString('utf8'));
  } catch {
    throw new Error('Invalid .nupcinv file: design.json is not valid JSON');
  }
  if (!exportedDesign.globalStyle || !Array.isArray(exportedDesign.blocks)) {
    throw new Error('Invalid .nupcinv file: design.json must have globalStyle and blocks array');
  }

  const imageMap = exportedDesign.imageMap ?? {};

  // --- Upload bundled images and build a remapping table ---
  // zipName (e.g. "images/foo.png") -> new URL in the current environment
  const uploadedImageMap: Record<string, string> = {};

  for (const [zipName, imageBuf] of files.entries()) {
    if (!zipName.startsWith('images/')) continue;

    const origFilename = path.basename(zipName);
    const timestamp = Date.now();
    const randomId = randomUUID().split('-')[0];
    const newFilename = `invitation_${weddingId}_${timestamp}_${randomId}_${origFilename}`;
    const filepath = `uploads/invitation-images/${weddingId}/${newFilename}`;

    try {
      const uploadResult = await uploadFile(filepath, imageBuf, { contentType: 'image/png' });
      uploadedImageMap[zipName] = uploadResult.url;
    } catch (err) {
      warnings.push(
        `Failed to upload image "${zipName}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Build the final ref -> new URL mapping (original ref -> zipName -> new URL)
  const finalImageMap: Record<string, string> = {};
  for (const [origRef, zipName] of Object.entries(imageMap)) {
    const newUrl = uploadedImageMap[zipName];
    if (newUrl) {
      finalImageMap[origRef] = newUrl;
    }
    // Also allow direct zipName -> new URL lookup (for in-zip refs)
    if (uploadedImageMap[zipName]) {
      finalImageMap[zipName] = uploadedImageMap[zipName];
    }
  }

  // --- Migrate and remap blocks ---
  const migratedBlocks: TemplateBlock[] = exportedDesign.blocks.map((rawBlock) => {
    const block = migrateBlock(rawBlock as unknown as Record<string, unknown>);

    // Remap image references
    if (block.type === 'image' && block.src) {
      block.src = finalImageMap[block.src] ?? block.src;
    }
    if (block.type === 'text' && block.style.backgroundImage) {
      block.style = {
        ...block.style,
        backgroundImage: finalImageMap[block.style.backgroundImage] ?? block.style.backgroundImage,
      };
    }

    return block;
  });

  // --- Remap global style images ---
  const globalStyle = {
    ...exportedDesign.globalStyle,
    backgroundImage: exportedDesign.globalStyle.backgroundImage
      ? (finalImageMap[exportedDesign.globalStyle.backgroundImage] ??
         exportedDesign.globalStyle.backgroundImage)
      : undefined,
    paperBackgroundImage: exportedDesign.globalStyle.paperBackgroundImage
      ? (finalImageMap[exportedDesign.globalStyle.paperBackgroundImage] ??
         exportedDesign.globalStyle.paperBackgroundImage)
      : undefined,
  };

  const design: TemplateDesign = {
    globalStyle,
    blocks: migratedBlocks,
  };

  return {
    design,
    templateName: manifest.template_name ?? 'Imported Template',
    warnings,
  };
}
