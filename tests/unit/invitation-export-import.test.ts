/**
 * Unit Tests for Invitation Template Export/Import
 *
 * Tests:
 * 1. ZIP utility - create and parse round-trips
 * 2. Block migration - backwards compatibility when new fields are added
 * 3. Image reference extraction
 * 4. Export - creates correct archive structure
 * 5. Import - reconstructs design, migrates old blocks, remaps images
 * 6. Backwards compatibility - old exports work in a system with new block types
 */

import {
  BLOCK_VERSIONS,
  FORMAT_VERSION,
  migrateBlock,
  extractImageRefs,
  exportInvitationTemplate,
  importInvitationTemplate,
} from '@/lib/invitation-template/export-import';
import { createZip, parseZip } from '@/lib/zip';
import type { TemplateDesign } from '@/types/invitation-template';

// ============================================================================
// Mock storage layer
// ============================================================================

jest.mock('@/lib/storage', () => ({
  readStorageFile: jest.fn(),
  uploadFile: jest.fn(),
}));

import { readStorageFile as mockReadFileImport, uploadFile as mockUploadFileImport } from '@/lib/storage';
const mockReadFile = mockReadFileImport as jest.MockedFunction<typeof mockReadFileImport>;
const mockUploadFile = mockUploadFileImport as jest.MockedFunction<typeof mockUploadFileImport>;

// ============================================================================
// Fixtures
// ============================================================================

const SAMPLE_IMAGE_BUF = Buffer.from('fake-png-data');

const sampleDesign: TemplateDesign = {
  globalStyle: {
    backgroundColor: '#FFFFFF',
    backgroundImage: '/themes/garden/bg.svg',
    paperBackgroundImage: '/uploads/invitation-images/w1/paper.png',
  },
  blocks: [
    {
      id: 'text-1',
      type: 'text',
      content: { ES: 'Hola', EN: 'Hello', FR: 'Bonjour', IT: 'Ciao', DE: 'Hallo' },
      style: {
        fontFamily: 'Georgia, serif',
        fontSize: '1.5rem',
        color: '#000000',
        textAlign: 'center',
        backgroundImage: '/uploads/invitation-images/w1/text-bg.png',
      },
    },
    {
      id: 'img-1',
      type: 'image',
      src: '/uploads/invitation-images/w1/couple.png',
      alt: 'The couple',
      alignment: 'center',
      zoom: 100,
    },
    {
      id: 'loc-1',
      type: 'location',
      style: { color: '#3A4F3C', mapStyle: 'color' },
    },
    {
      id: 'cd-1',
      type: 'countdown',
      style: { color: '#D4AF37' },
    },
    {
      id: 'cal-1',
      type: 'add-to-calendar',
    },
    {
      id: 'btn-1',
      type: 'button',
      text: { ES: 'Confirmar', EN: 'RSVP', FR: 'Confirmer', IT: 'Conferma', DE: 'Bestätigen' },
      url: 'https://example.com/rsvp',
      style: {
        buttonColor: '#D4AF37',
        textColor: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
        alignment: 'center',
      },
    },
    {
      id: 'gal-1',
      type: 'gallery',
      columns: 2,
      showCaptions: true,
      showUploadButton: false,
      autoPlayMs: 4000,
      style: { borderRadius: '0.75rem' },
    },
  ],
};

// ============================================================================
// ZIP utility tests
// ============================================================================

describe('ZIP utility', () => {
  it('round-trips a single text file', () => {
    const data = Buffer.from('Hello, World!', 'utf8');
    const zip = createZip([{ name: 'hello.txt', data }]);
    const parsed = parseZip(zip);
    expect(parsed.get('hello.txt')?.toString('utf8')).toBe('Hello, World!');
  });

  it('round-trips multiple files', () => {
    const entries = [
      { name: 'a.txt', data: Buffer.from('AAA') },
      { name: 'b/c.txt', data: Buffer.from('BBB') },
      { name: 'images/photo.png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
    ];
    const zip = createZip(entries);
    const parsed = parseZip(zip);
    expect(parsed.size).toBe(3);
    expect(parsed.get('a.txt')?.toString()).toBe('AAA');
    expect(parsed.get('b/c.txt')?.toString()).toBe('BBB');
    expect(parsed.get('images/photo.png')?.[0]).toBe(0x89);
  });

  it('round-trips binary data faithfully', () => {
    const binary = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    const zip = createZip([{ name: 'bin.dat', data: binary }]);
    const parsed = parseZip(zip);
    expect(parsed.get('bin.dat')).toEqual(binary);
  });

  it('round-trips empty file', () => {
    const zip = createZip([{ name: 'empty.txt', data: Buffer.alloc(0) }]);
    const parsed = parseZip(zip);
    expect(parsed.get('empty.txt')).toEqual(Buffer.alloc(0));
  });

  it('round-trips large JSON content', () => {
    const largeData = Buffer.from(JSON.stringify({ x: 'a'.repeat(10000) }), 'utf8');
    const zip = createZip([{ name: 'large.json', data: largeData }]);
    const parsed = parseZip(zip);
    const result = parsed.get('large.json');
    expect(result).toEqual(largeData);
  });

  it('throws on invalid ZIP buffer', () => {
    expect(() => parseZip(Buffer.from('not a zip file'))).toThrow();
  });
});

// ============================================================================
// Block migration tests
// ============================================================================

describe('migrateBlock', () => {
  describe('text block', () => {
    it('migrates a complete v1 text block', () => {
      const raw = {
        _version: 1,
        id: 'text-1',
        type: 'text',
        content: { ES: 'Hola', EN: 'Hello', FR: 'Bonjour', IT: 'Ciao', DE: 'Hallo' },
        style: {
          fontFamily: 'Georgia, serif',
          fontSize: '1rem',
          color: '#000000',
          textAlign: 'center' as const,
        },
      };
      const migrated = migrateBlock(raw);
      expect(migrated.type).toBe('text');
      expect((migrated as any)._version).toBeUndefined();
      expect(migrated.id).toBe('text-1');
    });

    it('fills missing style fields with defaults', () => {
      const raw = { type: 'text', content: { ES: '', EN: '', FR: '', IT: '', DE: '' }, style: {} };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.style.fontFamily).toBe('Georgia, serif');
      expect(migrated.style.fontSize).toBe('1rem');
      expect(migrated.style.color).toBe('#000000');
      expect(migrated.style.textAlign).toBe('center');
    });

    it('fills missing content with empty strings', () => {
      const raw = { type: 'text', style: { fontFamily: 'x', fontSize: '1rem', color: '#000', textAlign: 'center' } };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.content).toEqual({ ES: '', EN: '', FR: '', IT: '', DE: '' });
    });

    it('generates a UUID when id is missing', () => {
      const raw = { type: 'text', style: {} };
      const migrated = migrateBlock(raw);
      expect(typeof migrated.id).toBe('string');
      expect(migrated.id.length).toBeGreaterThan(0);
    });
  });

  describe('image block', () => {
    it('fills missing optional fields with defaults', () => {
      const raw = { type: 'image', src: '/img.png', alt: 'img' };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.alignment).toBe('center');
      expect(migrated.zoom).toBe(100);
    });
  });

  describe('location block', () => {
    it('preserves style when present', () => {
      const raw = { type: 'location', id: 'loc-1', style: { color: '#000', mapStyle: 'color' } };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.style.color).toBe('#000');
      expect(migrated.style.mapStyle).toBe('color');
    });

    it('returns undefined style when not present', () => {
      const raw = { type: 'location', id: 'loc-1' };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.style).toBeUndefined();
    });
  });

  describe('countdown block', () => {
    it('preserves all style fields', () => {
      const raw = {
        type: 'countdown',
        id: 'cd-1',
        style: { color: '#D4AF37', labelFontSize: '0.75rem', labelColor: '#666' },
      };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.style.color).toBe('#D4AF37');
      expect(migrated.style.labelFontSize).toBe('0.75rem');
      expect(migrated.style.labelColor).toBe('#666');
    });
  });

  describe('button block', () => {
    it('fills missing style with defaults', () => {
      const raw = {
        type: 'button',
        id: 'btn-1',
        text: { ES: '', EN: '', FR: '', IT: '', DE: '' },
        url: 'https://example.com',
        style: {},
      };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.style.buttonColor).toBe('#D4AF37');
      expect(migrated.style.textColor).toBe('#FFFFFF');
      expect(migrated.style.alignment).toBe('center');
    });
  });

  describe('gallery block', () => {
    it('fills missing fields with defaults', () => {
      const raw = { type: 'gallery', id: 'gal-1' };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.columns).toBe(1);
      expect(migrated.showCaptions).toBe(false);
      expect(migrated.showUploadButton).toBe(true);
      expect(migrated.autoPlayMs).toBe(4000);
    });
  });

  describe('add-to-calendar block', () => {
    it('migrates correctly', () => {
      const raw = { type: 'add-to-calendar', id: 'cal-1' };
      const migrated = migrateBlock(raw);
      expect(migrated.type).toBe('add-to-calendar');
      expect(migrated.id).toBe('cal-1');
    });
  });

  describe('unknown future block type', () => {
    it('passes through an unknown block type without crashing', () => {
      const raw = { type: 'future-block-type', id: 'future-1', someField: 'value' };
      const migrated = migrateBlock(raw) as any;
      expect(migrated.type).toBe('future-block-type');
      expect(migrated.someField).toBe('value');
      expect(migrated._version).toBeUndefined();
    });
  });
});

// ============================================================================
// Image reference extraction tests
// ============================================================================

describe('extractImageRefs', () => {
  it('extracts all image references from a design', () => {
    const refs = extractImageRefs(sampleDesign);
    expect(refs).toContain('/themes/garden/bg.svg');
    expect(refs).toContain('/uploads/invitation-images/w1/paper.png');
    expect(refs).toContain('/uploads/invitation-images/w1/text-bg.png');
    expect(refs).toContain('/uploads/invitation-images/w1/couple.png');
    expect(refs).toHaveLength(4);
  });

  it('returns empty array for design with no images', () => {
    const design: TemplateDesign = {
      globalStyle: { backgroundColor: '#fff' },
      blocks: [
        {
          id: 'loc-1',
          type: 'location',
        },
      ],
    };
    expect(extractImageRefs(design)).toHaveLength(0);
  });

  it('deduplicates references that appear multiple times', () => {
    const design: TemplateDesign = {
      globalStyle: {
        backgroundColor: '#fff',
        backgroundImage: '/img/shared.png',
        paperBackgroundImage: '/img/shared.png',
      },
      blocks: [],
    };
    const refs = extractImageRefs(design);
    expect(refs).toHaveLength(1);
  });
});

// ============================================================================
// BLOCK_VERSIONS completeness test
// ============================================================================

describe('BLOCK_VERSIONS', () => {
  it('defines a version for every known block type', () => {
    const knownTypes = ['text', 'image', 'location', 'countdown', 'add-to-calendar', 'button', 'gallery'];
    for (const type of knownTypes) {
      expect(BLOCK_VERSIONS[type as keyof typeof BLOCK_VERSIONS]).toBeGreaterThanOrEqual(1);
    }
  });
});

// ============================================================================
// Export tests
// ============================================================================

describe('exportInvitationTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockResolvedValue(SAMPLE_IMAGE_BUF);
  });

  it('produces a valid ZIP buffer', async () => {
    const buf = await exportInvitationTemplate(sampleDesign, 'Test Template');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    // ZIP magic bytes PK\x03\x04
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
  });

  it('contains manifest.json, design.json and images', async () => {
    const buf = await exportInvitationTemplate(sampleDesign, 'Test Template');
    const files = parseZip(buf);

    expect(files.has('manifest.json')).toBe(true);
    expect(files.has('design.json')).toBe(true);

    // There are 4 image refs in sampleDesign (all readable by mock)
    const imageFiles = Array.from(files.keys()).filter((k) => k.startsWith('images/'));
    expect(imageFiles.length).toBe(4);
  });

  it('manifest contains correct format version and template name', async () => {
    const buf = await exportInvitationTemplate(sampleDesign, 'My Wedding');
    const files = parseZip(buf);
    const manifest = JSON.parse(files.get('manifest.json')!.toString('utf8'));

    expect(manifest.format_version).toBe(FORMAT_VERSION);
    expect(manifest.template_name).toBe('My Wedding');
    expect(typeof manifest.exported_at).toBe('string');
  });

  it('design.json contains versioned blocks', async () => {
    const buf = await exportInvitationTemplate(sampleDesign, 'Test');
    const files = parseZip(buf);
    const design = JSON.parse(files.get('design.json')!.toString('utf8'));

    expect(Array.isArray(design.blocks)).toBe(true);
    for (const block of design.blocks) {
      expect(typeof block._version).toBe('number');
      expect(block._version).toBeGreaterThanOrEqual(1);
    }
  });

  it('design.json contains an imageMap', async () => {
    const buf = await exportInvitationTemplate(sampleDesign, 'Test');
    const files = parseZip(buf);
    const design = JSON.parse(files.get('design.json')!.toString('utf8'));

    expect(typeof design.imageMap).toBe('object');
    expect(Object.keys(design.imageMap).length).toBeGreaterThan(0);
  });

  it('image srcs in design.json are remapped to ZIP paths', async () => {
    const buf = await exportInvitationTemplate(sampleDesign, 'Test');
    const files = parseZip(buf);
    const design = JSON.parse(files.get('design.json')!.toString('utf8'));

    const imageBlock = design.blocks.find((b: any) => b.type === 'image');
    expect(imageBlock.src).toMatch(/^images\//);
  });

  it('skips images that cannot be read without failing', async () => {
    mockReadFile.mockRejectedValue(new Error('File not found'));
    // Should still succeed, just with empty imageMap
    const buf = await exportInvitationTemplate(sampleDesign, 'Test');
    const files = parseZip(buf);
    const design = JSON.parse(files.get('design.json')!.toString('utf8'));
    expect(typeof design.imageMap).toBe('object');
  });
});

// ============================================================================
// Import tests
// ============================================================================

describe('importInvitationTemplate', () => {
  const WEDDING_ID = 'wedding-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockResolvedValue(SAMPLE_IMAGE_BUF);
    mockUploadFile.mockResolvedValue({
      url: `https://storage.example.com/uploads/invitation-images/${WEDDING_ID}/uploaded.png`,
      pathname: `uploads/invitation-images/${WEDDING_ID}/uploaded.png`,
    });
  });

  async function makeNupcinv(design: TemplateDesign, name = 'Test'): Promise<Buffer> {
    return exportInvitationTemplate(design, name);
  }

  it('reconstructs the design with correct block types', async () => {
    const nupcinv = await makeNupcinv(sampleDesign);
    const { design } = await importInvitationTemplate(nupcinv, WEDDING_ID);

    const types = design.blocks.map((b) => b.type);
    expect(types).toContain('text');
    expect(types).toContain('image');
    expect(types).toContain('location');
    expect(types).toContain('countdown');
    expect(types).toContain('add-to-calendar');
    expect(types).toContain('button');
    expect(types).toContain('gallery');
  });

  it('returns the template name from the manifest', async () => {
    const nupcinv = await makeNupcinv(sampleDesign, 'Lovely Wedding');
    const { templateName } = await importInvitationTemplate(nupcinv, WEDDING_ID);
    expect(templateName).toBe('Lovely Wedding');
  });

  it('uploads bundled images and remaps block src to new URL', async () => {
    const nupcinv = await makeNupcinv(sampleDesign);
    const { design } = await importInvitationTemplate(nupcinv, WEDDING_ID);

    const imageBlock = design.blocks.find((b) => b.type === 'image') as any;
    expect(imageBlock.src).toMatch(/^https:\/\/storage/);
  });

  it('remaps globalStyle images to new URLs', async () => {
    const nupcinv = await makeNupcinv(sampleDesign);
    const { design } = await importInvitationTemplate(nupcinv, WEDDING_ID);

    // paperBackgroundImage should be remapped (it was uploaded)
    if (design.globalStyle.paperBackgroundImage) {
      expect(design.globalStyle.paperBackgroundImage).toMatch(/^https:\/\/storage/);
    }
  });

  it('does not include _version in migrated blocks', async () => {
    const nupcinv = await makeNupcinv(sampleDesign);
    const { design } = await importInvitationTemplate(nupcinv, WEDDING_ID);

    for (const block of design.blocks) {
      expect((block as any)._version).toBeUndefined();
    }
  });

  it('collects warnings when upload fails but still succeeds', async () => {
    mockUploadFile.mockRejectedValue(new Error('Upload failed'));
    const nupcinv = await makeNupcinv(sampleDesign);
    const { design, warnings } = await importInvitationTemplate(nupcinv, WEDDING_ID);

    expect(Array.isArray(warnings)).toBe(true);
    expect(design.blocks.length).toBeGreaterThan(0);
  });

  it('throws on non-ZIP input', async () => {
    await expect(
      importInvitationTemplate(Buffer.from('not a zip'), WEDDING_ID)
    ).rejects.toThrow(/parse/i);
  });

  it('throws when manifest.json is missing', async () => {
    const zip = createZip([
      { name: 'design.json', data: Buffer.from('{}') },
    ]);
    await expect(importInvitationTemplate(zip, WEDDING_ID)).rejects.toThrow(/manifest/i);
  });

  it('throws when design.json is missing', async () => {
    const manifest = { format_version: '1.0', exported_at: new Date().toISOString(), template_name: 'X' };
    const zip = createZip([
      { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)) },
    ]);
    await expect(importInvitationTemplate(zip, WEDDING_ID)).rejects.toThrow(/design/i);
  });

  it('throws on invalid JSON in design.json', async () => {
    const manifest = { format_version: '1.0', exported_at: new Date().toISOString(), template_name: 'X' };
    const zip = createZip([
      { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)) },
      { name: 'design.json', data: Buffer.from('NOT JSON') },
    ]);
    await expect(importInvitationTemplate(zip, WEDDING_ID)).rejects.toThrow(/not valid JSON/i);
  });
});

// ============================================================================
// Backwards compatibility tests
// ============================================================================

describe('Backwards compatibility', () => {
  const WEDDING_ID = 'wedding-bc';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadFile.mockResolvedValue({
      url: `https://storage.example.com/img.png`,
      pathname: `uploads/invitation-images/${WEDDING_ID}/img.png`,
    });
  });

  /**
   * Simulates an old .nupcinv file that was exported before new fields were added to blocks.
   * The blocks have _version: 1 but are missing fields that hypothetically were added later.
   */
  function makeOldNupcinvBuffer(extraDesignFields: Record<string, unknown> = {}): Buffer {
    const manifest = {
      format_version: '1.0',
      exported_at: '2025-01-01T00:00:00.000Z',
      template_name: 'Old Template',
    };
    const design = {
      globalStyle: { backgroundColor: '#FFF' },
      blocks: [
        // text block missing fontStyle, fontWeight, textDecoration (added hypothetically later)
        {
          _version: 1,
          id: 'text-old',
          type: 'text',
          content: { ES: 'Hola', EN: 'Hi', FR: 'Salut', IT: 'Ciao', DE: 'Hi' },
          style: {
            fontFamily: 'Arial',
            fontSize: '1rem',
            color: '#000',
            textAlign: 'left',
            // fontStyle, fontWeight, textDecoration intentionally absent
          },
        },
        // image block missing alignment and zoom
        {
          _version: 1,
          id: 'img-old',
          type: 'image',
          src: 'images/old-img.png',
          alt: 'Old image',
          // alignment and zoom intentionally absent
        },
        // button block missing alignment
        {
          _version: 1,
          id: 'btn-old',
          type: 'button',
          text: { ES: '', EN: 'Click', FR: '', IT: '', DE: '' },
          url: 'https://example.com',
          style: {
            buttonColor: '#D4AF37',
            textColor: '#FFF',
            fontFamily: 'Inter',
            // alignment intentionally absent
          },
        },
        // A block type that doesn't exist in the current system (future block)
        {
          _version: 1,
          id: 'unknown-1',
          type: 'video-embed',
          url: 'https://youtube.com/embed/abc',
        },
      ],
      imageMap: { '/old/path/img.png': 'images/old-img.png' },
      ...extraDesignFields,
    };
    return createZip([
      { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)) },
      { name: 'design.json', data: Buffer.from(JSON.stringify(design)) },
      { name: 'images/old-img.png', data: Buffer.from('fake-image') },
    ]);
  }

  it('successfully imports an old .nupcinv file without crashing', async () => {
    const buf = makeOldNupcinvBuffer();
    await expect(importInvitationTemplate(buf, WEDDING_ID)).resolves.toBeDefined();
  });

  it('fills missing optional fields with safe defaults', async () => {
    const buf = makeOldNupcinvBuffer();
    const { design } = await importInvitationTemplate(buf, WEDDING_ID);

    const img = design.blocks.find((b) => b.type === 'image') as any;
    expect(img.alignment).toBe('center');
    expect(img.zoom).toBe(100);

    const btn = design.blocks.find((b) => b.type === 'button') as any;
    expect(btn.style.alignment).toBe('center');
  });

  it('preserves unknown future block types without crashing', async () => {
    const buf = makeOldNupcinvBuffer();
    const { design } = await importInvitationTemplate(buf, WEDDING_ID);

    const unknown = design.blocks.find((b) => b.type === 'video-embed' as any) as any;
    expect(unknown).toBeDefined();
    expect(unknown.url).toBe('https://youtube.com/embed/abc');
  });

  it('does not require blocks to have a _version field', async () => {
    // Simulate a very old file where _version was not yet added
    const manifest = {
      format_version: '1.0',
      exported_at: '2025-01-01T00:00:00.000Z',
      template_name: 'Very Old',
    };
    const design = {
      globalStyle: { backgroundColor: '#FFF' },
      blocks: [
        // No _version at all
        {
          id: 'text-no-ver',
          type: 'text',
          content: { ES: '', EN: 'Hi', FR: '', IT: '', DE: '' },
          style: { fontFamily: 'Arial', fontSize: '1rem', color: '#000', textAlign: 'center' },
        },
      ],
      imageMap: {},
    };
    const zip = createZip([
      { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)) },
      { name: 'design.json', data: Buffer.from(JSON.stringify(design)) },
    ]);

    const { design: imported } = await importInvitationTemplate(zip, WEDDING_ID);
    expect(imported.blocks.length).toBe(1);
    expect(imported.blocks[0].type).toBe('text');
  });

  it('can import a file even when new block types exist in the system but not in the file', async () => {
    // File was created before 'gallery' block existed — it just won't have any gallery blocks
    const manifest = {
      format_version: '1.0',
      exported_at: '2025-01-01T00:00:00.000Z',
      template_name: 'Pre-gallery',
    };
    const design = {
      globalStyle: { backgroundColor: '#FFF' },
      blocks: [
        {
          _version: 1,
          id: 'text-1',
          type: 'text',
          content: { ES: '', EN: 'Hi', FR: '', IT: '', DE: '' },
          style: { fontFamily: 'Arial', fontSize: '1rem', color: '#000', textAlign: 'center' },
        },
      ],
      imageMap: {},
    };
    const zip = createZip([
      { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)) },
      { name: 'design.json', data: Buffer.from(JSON.stringify(design)) },
    ]);

    const { design: imported } = await importInvitationTemplate(zip, WEDDING_ID);
    expect(imported.blocks.length).toBe(1);
    expect(imported.blocks.find((b) => b.type === 'gallery')).toBeUndefined();
  });
});

// ============================================================================
// Round-trip test
// ============================================================================

describe('Export → Import round-trip', () => {
  const WEDDING_ID = 'wedding-rt';

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockResolvedValue(Buffer.from('fake-img'));
    mockUploadFile.mockImplementation(async (filepath) => ({
      url: `https://storage.example.com/${filepath}`,
      pathname: filepath,
    }));
  });

  it('preserves block count and types through a full round-trip', async () => {
    const nupcinv = await exportInvitationTemplate(sampleDesign, 'Round Trip');
    const { design } = await importInvitationTemplate(nupcinv, WEDDING_ID);

    expect(design.blocks.length).toBe(sampleDesign.blocks.length);
    const originalTypes = sampleDesign.blocks.map((b) => b.type).sort();
    const importedTypes = design.blocks.map((b) => b.type).sort();
    expect(importedTypes).toEqual(originalTypes);
  });

  it('preserves global style background color', async () => {
    const nupcinv = await exportInvitationTemplate(sampleDesign, 'Round Trip');
    const { design } = await importInvitationTemplate(nupcinv, WEDDING_ID);
    expect(design.globalStyle.backgroundColor).toBe(sampleDesign.globalStyle.backgroundColor);
  });

  it('preserves text block content', async () => {
    const nupcinv = await exportInvitationTemplate(sampleDesign, 'Round Trip');
    const { design } = await importInvitationTemplate(nupcinv, WEDDING_ID);

    const originalText = sampleDesign.blocks.find((b) => b.type === 'text') as any;
    const importedText = design.blocks.find((b) => b.type === 'text') as any;
    expect(importedText.content.EN).toBe(originalText.content.EN);
    expect(importedText.style.fontFamily).toBe(originalText.style.fontFamily);
  });

  it('preserves button block URL', async () => {
    const nupcinv = await exportInvitationTemplate(sampleDesign, 'Round Trip');
    const { design } = await importInvitationTemplate(nupcinv, WEDDING_ID);

    const importedBtn = design.blocks.find((b) => b.type === 'button') as any;
    expect(importedBtn.url).toBe('https://example.com/rsvp');
  });
});
