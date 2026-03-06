/**
 * Integration Tests - Invitation Template Export/Import API Routes
 *
 * Tests:
 * 1. GET /api/admin/invitation-template/[id]/export — downloads .nupcinv file
 * 2. POST /api/admin/invitation-template/import — creates template from .nupcinv
 * 3. Auth checks (403 for wrong wedding, 401 for missing auth)
 * 4. Validation (422 for invalid file, 400 for missing file)
 * 5. Backwards compatibility round-trip via the API layer
 */

import { GET as exportRoute } from '@/app/(public)/api/admin/invitation-template/[id]/export/route';
import { POST as importRoute } from '@/app/(public)/api/admin/invitation-template/import/route';
import { prisma } from '@/lib/db/prisma';
import { NextRequest } from 'next/server';
import { createZip } from '@/lib/zip';
import type { TemplateDesign } from '@/types/invitation-template';

// ============================================================================
// Mocks
// ============================================================================

jest.mock('@/lib/auth/middleware', () => ({
  requireRole: jest.fn(),
}));

jest.mock('@/lib/cache/rsvp-page', () => ({
  invalidateWeddingPageCache: jest.fn(),
}));

jest.mock('@/lib/cache/revalidate-rsvp', () => ({
  revalidateWeddingRSVPPages: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/storage', () => ({
  readStorageFile: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  uploadFile: jest.fn().mockImplementation(async (filepath: string) => ({
    url: `https://storage.example.com/${filepath}`,
    pathname: filepath,
  })),
}));

jest.mock('@/lib/invitation-template/pre-renderer', () => ({
  preRenderTemplate: jest.fn().mockReturnValue({ EN: '<html></html>' }),
}));

const { requireRole } = require('@/lib/auth/middleware');

// ============================================================================
// Test helpers
// ============================================================================

function makeRequest(method = 'GET', body?: FormData | string): NextRequest {
  if (body instanceof FormData) {
    return new NextRequest('http://localhost/api/test', { method, body });
  }
  return new NextRequest('http://localhost/api/test', {
    method,
    body,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

function makeFormDataRequest(file: Blob, filename: string): NextRequest {
  const formData = new FormData();
  formData.append('file', file, filename);
  return new NextRequest('http://localhost/api/test', { method: 'POST', body: formData });
}

/** Converts a Buffer (Node.js) to a plain Uint8Array<ArrayBuffer> accepted by Blob. */
function toUint8Array(buf: Buffer): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(buf.length);
  arr.set(buf);
  return arr;
}

/** Creates a minimal valid .nupcinv buffer */
function makeMinimalNupcinv(name = 'Test Template', blocks: any[] = []): Buffer {
  const manifest = {
    format_version: '1.0',
    exported_at: new Date().toISOString(),
    template_name: name,
  };
  const design = {
    globalStyle: { backgroundColor: '#FFFFFF' },
    blocks,
    imageMap: {},
  };
  return createZip([
    { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)) },
    { name: 'design.json', data: Buffer.from(JSON.stringify(design)) },
  ]);
}

/** Creates a Blob from a Node.js Buffer for use in FormData. */
function bufferToBlob(buf: Buffer): Blob {
  return new Blob([toUint8Array(buf)], { type: 'application/octet-stream' });
}

// ============================================================================
// Test setup / teardown
// ============================================================================

describe('Integration Tests - Invitation Export/Import API', () => {
  let testWeddingId: string;
  let testAdminId: string;
  let testPlannerId: string;
  let testTemplateId: string;

  const sampleDesign: TemplateDesign = {
    globalStyle: { backgroundColor: '#FFFFFF' },
    blocks: [
      {
        id: 'text-int-1',
        type: 'text',
        content: { ES: 'Hola', EN: 'Hello', FR: 'Bonjour', IT: 'Ciao', DE: 'Hallo' },
        style: { fontFamily: 'Georgia', fontSize: '1rem', color: '#000', textAlign: 'center' },
      },
      {
        id: 'loc-int-1',
        type: 'location',
        style: { color: '#333' },
      },
    ],
  };

  beforeAll(async () => {
    // Create test planner
    const planner = await prisma.weddingPlanner.create({
      data: {
        name: 'Export Import Test Planner',
        email: `planner-export-import-${Date.now()}@test.com`,
        auth_provider: 'GOOGLE',
        created_by: 'system',
      },
    });
    testPlannerId = planner.id;

    // Create test wedding
    const wedding = await prisma.wedding.create({
      data: {
        planner_id: testPlannerId,
        couple_names: 'Export Import Couple',
        wedding_date: new Date('2027-06-15'),
        wedding_time: '18:00',
        location: 'Test Venue',
        rsvp_cutoff_date: new Date('2027-06-01'),
        default_language: 'EN',
        created_by: testPlannerId,
      },
    });
    testWeddingId = wedding.id;

    // Create test admin
    const admin = await prisma.weddingAdmin.create({
      data: {
        name: 'Export Import Test Admin',
        email: `admin-export-import-${Date.now()}@test.com`,
        auth_provider: 'GOOGLE',
        wedding_id: testWeddingId,
        invited_by: testPlannerId,
      },
    });
    testAdminId = admin.id;

    // Create test template
    const template = await prisma.invitationTemplate.create({
      data: {
        wedding_id: testWeddingId,
        name: 'Integration Test Template',
        design: sampleDesign as any,
        is_system_template: false,
      },
    });
    testTemplateId = template.id;
  });

  afterAll(async () => {
    await prisma.invitationTemplate.deleteMany({ where: { wedding_id: testWeddingId } });
    await prisma.weddingAdmin.deleteMany({ where: { id: testAdminId } });
    await prisma.wedding.delete({ where: { id: testWeddingId } });
    await prisma.weddingPlanner.delete({ where: { id: testPlannerId } });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticated as the test wedding admin
    requireRole.mockResolvedValue({ id: testAdminId, wedding_id: testWeddingId });
  });

  // ============================================================================
  // Export route tests
  // ============================================================================

  describe('GET /api/admin/invitation-template/[id]/export', () => {
    it('returns 200 with binary content for an existing template', async () => {
      const req = makeRequest('GET');
      const res = await exportRoute(req, { params: Promise.resolve({ id: testTemplateId }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
      expect(res.headers.get('Content-Disposition')).toMatch(/\.nupcinv/);
    });

    it('exported buffer is a valid ZIP containing manifest.json', async () => {
      const req = makeRequest('GET');
      const res = await exportRoute(req, { params: Promise.resolve({ id: testTemplateId }) });

      const arrayBuffer = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);

      // Must start with PK signature
      expect(buf[0]).toBe(0x50);
      expect(buf[1]).toBe(0x4b);

      // Import to verify contents
      const { parseZip } = require('@/lib/zip');
      const files = parseZip(buf);
      expect(files.has('manifest.json')).toBe(true);
      expect(files.has('design.json')).toBe(true);
    });

    it('returns 403 when user does not own the template', async () => {
      requireRole.mockResolvedValue({ id: 'other-admin', wedding_id: 'other-wedding' });
      const req = makeRequest('GET');
      const res = await exportRoute(req, { params: Promise.resolve({ id: testTemplateId }) });
      expect(res.status).toBe(403);
    });

    it('returns 404 for a non-existent template', async () => {
      const req = makeRequest('GET');
      const res = await exportRoute(req, {
        params: Promise.resolve({ id: 'non-existent-id-xyz' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 403 when wedding_id is missing from session', async () => {
      requireRole.mockResolvedValue({ id: testAdminId, wedding_id: null });
      const req = makeRequest('GET');
      const res = await exportRoute(req, { params: Promise.resolve({ id: testTemplateId }) });
      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // Import route tests
  // ============================================================================

  describe('POST /api/admin/invitation-template/import', () => {
    it('returns 201 and creates a template from a valid .nupcinv file', async () => {
      const nupcinvBuf = makeMinimalNupcinv('Imported Template');
      const blob = bufferToBlob(nupcinvBuf);
      const req = makeFormDataRequest(blob, 'test.nupcinv');

      const res = await importRoute(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.template).toBeDefined();
      expect(body.template.name).toBe('Imported Template');
      expect(body.template.wedding_id).toBe(testWeddingId);
    });

    it('persists the imported template in the database', async () => {
      const nupcinvBuf = makeMinimalNupcinv('DB Persist Test');
      const blob = bufferToBlob(nupcinvBuf);
      const req = makeFormDataRequest(blob, 'test.nupcinv');

      const res = await importRoute(req);
      const body = await res.json();
      const templateId = body.template.id;

      const stored = await prisma.invitationTemplate.findUnique({ where: { id: templateId } });
      expect(stored).toBeDefined();
      expect(stored!.name).toBe('DB Persist Test');
      expect(stored!.wedding_id).toBe(testWeddingId);
    });

    it('imports a template with blocks and preserves types', async () => {
      const nupcinvBuf = makeMinimalNupcinv('With Blocks', [
        {
          _version: 1,
          id: 'text-1',
          type: 'text',
          content: { ES: '', EN: 'Hello', FR: '', IT: '', DE: '' },
          style: { fontFamily: 'Arial', fontSize: '1rem', color: '#000', textAlign: 'center' },
        },
        {
          _version: 1,
          id: 'loc-1',
          type: 'location',
          style: { color: '#333' },
        },
      ]);
      const blob = bufferToBlob(nupcinvBuf);
      const req = makeFormDataRequest(blob, 'blocks.nupcinv');

      const res = await importRoute(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      const design = body.template.design as TemplateDesign;
      expect(design.blocks.length).toBe(2);
      const types = design.blocks.map((b: any) => b.type);
      expect(types).toContain('text');
      expect(types).toContain('location');
    });

    it('returns 400 when no file is provided', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: new FormData(),
      });
      const res = await importRoute(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/No file/i);
    });

    it('returns 422 for a file that is not a valid ZIP', async () => {
      const blob = bufferToBlob(Buffer.from('not a zip file'));
      const req = makeFormDataRequest(blob, 'bad.nupcinv');
      const res = await importRoute(req);
      expect(res.status).toBe(422);
    });

    it('returns 422 when manifest.json is missing from archive', async () => {
      const zip = createZip([
        { name: 'design.json', data: Buffer.from('{}') },
      ]);
      const blob = bufferToBlob(zip);
      const req = makeFormDataRequest(blob, 'no-manifest.nupcinv');
      const res = await importRoute(req);
      expect(res.status).toBe(422);
    });

    it('returns 422 when design.json is missing from archive', async () => {
      const manifest = { format_version: '1.0', exported_at: new Date().toISOString(), template_name: 'X' };
      const zip = createZip([
        { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)) },
      ]);
      const blob = bufferToBlob(zip);
      const req = makeFormDataRequest(blob, 'no-design.nupcinv');
      const res = await importRoute(req);
      expect(res.status).toBe(422);
    });

    it('returns 400 when wedding_id is missing from session', async () => {
      requireRole.mockResolvedValue({ id: testAdminId, wedding_id: null });
      const nupcinvBuf = makeMinimalNupcinv('Test');
      const blob = bufferToBlob(nupcinvBuf);
      const req = makeFormDataRequest(blob, 'test.nupcinv');
      const res = await importRoute(req);
      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // Full round-trip via API
  // ============================================================================

  describe('Export → Import round-trip via API', () => {
    it('restores a template with the same block count after a full round-trip', async () => {
      // 1. Export
      const exportReq = makeRequest('GET');
      const exportRes = await exportRoute(exportReq, {
        params: Promise.resolve({ id: testTemplateId }),
      });
      expect(exportRes.status).toBe(200);

      const archiveBuffer = Buffer.from(await exportRes.arrayBuffer());

      // 2. Import
      const blob = bufferToBlob(archiveBuffer);
      const importReq = makeFormDataRequest(blob, 'exported.nupcinv');
      const importRes = await importRoute(importReq);

      expect(importRes.status).toBe(201);
      const importBody = await importRes.json();
      const importedDesign = importBody.template.design as TemplateDesign;

      expect(importedDesign.blocks.length).toBe(sampleDesign.blocks.length);
      expect(importedDesign.globalStyle.backgroundColor).toBe(sampleDesign.globalStyle.backgroundColor);
    });

    it('imported template is retrievable from the database', async () => {
      // Export
      const exportRes = await exportRoute(makeRequest('GET'), {
        params: Promise.resolve({ id: testTemplateId }),
      });
      const archiveBuffer = Buffer.from(await exportRes.arrayBuffer());

      // Import
      const blob = bufferToBlob(archiveBuffer);
      const importRes = await importRoute(makeFormDataRequest(blob, 'round-trip.nupcinv'));
      const { template } = await importRes.json();

      // Verify in DB
      const stored = await prisma.invitationTemplate.findUnique({ where: { id: template.id } });
      expect(stored).toBeDefined();
      expect(stored!.wedding_id).toBe(testWeddingId);
    });
  });

  // ============================================================================
  // Backwards compatibility integration test
  // ============================================================================

  describe('Backwards compatibility - old .nupcinv files with future block types', () => {
    it('imports a file that contains a block type unknown to the system', async () => {
      const nupcinvBuf = makeMinimalNupcinv('Future Blocks', [
        // Known block
        {
          _version: 1,
          id: 'text-1',
          type: 'text',
          content: { ES: '', EN: 'Hello', FR: '', IT: '', DE: '' },
          style: { fontFamily: 'Arial', fontSize: '1rem', color: '#000', textAlign: 'center' },
        },
        // Unknown future block type — should be passed through, not crash
        {
          _version: 99,
          id: 'future-1',
          type: 'hologram-display',
          src: 'https://example.com/holo.glb',
        },
      ]);

      const blob = bufferToBlob(nupcinvBuf);
      const req = makeFormDataRequest(blob, 'future.nupcinv');
      const res = await importRoute(req);

      // Should succeed — not fail because of the unknown block
      expect(res.status).toBe(201);
      const body = await res.json();
      const design = body.template.design as TemplateDesign;
      // The text block must be present
      expect(design.blocks.some((b: any) => b.type === 'text')).toBe(true);
    });

    it('imports a file missing optional block fields (old format)', async () => {
      const nupcinvBuf = makeMinimalNupcinv('Old Format', [
        // image block without zoom/alignment (as if exported before those fields existed)
        {
          _version: 1,
          id: 'img-1',
          type: 'image',
          src: '',
          alt: 'test',
          // zoom and alignment absent
        },
        // button block without alignment
        {
          _version: 1,
          id: 'btn-1',
          type: 'button',
          text: { ES: '', EN: 'Click', FR: '', IT: '', DE: '' },
          url: 'https://example.com',
          style: { buttonColor: '#D4AF37', textColor: '#FFF', fontFamily: 'Arial' },
          // alignment absent
        },
      ]);

      const blob = bufferToBlob(nupcinvBuf);
      const req = makeFormDataRequest(blob, 'old-format.nupcinv');
      const res = await importRoute(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      const design = body.template.design as TemplateDesign;

      const img = design.blocks.find((b: any) => b.type === 'image') as any;
      expect(img.alignment).toBe('center');
      expect(img.zoom).toBe(100);

      const btn = design.blocks.find((b: any) => b.type === 'button') as any;
      expect(btn.style.alignment).toBe('center');
    });
  });
});
