/**
 * Integration Tests - Guests API Route
 *
 * Tests the /api/admin/guests route handlers with database integration
 * These tests call the route handler functions directly
 */

import { GET, POST } from '@/app/api/admin/guests/route';
import { prisma } from '@/lib/db/prisma';
import { NextRequest } from 'next/server';

// Mock the auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  requireRole: jest.fn(),
}));

const { requireRole } = require('@/lib/auth/middleware');

describe('Integration Tests - Guests API', () => {
  let testWeddingId: string;
  let testAdminId: string;
  let testPlannerId: string;

  beforeAll(async () => {
    // Create test planner
    const planner = await prisma.weddingPlanner.create({
      data: {
        name: 'Test Planner Integration',
        email: 'planner-integration@test.com',
        auth_provider: 'EMAIL',
        created_by: 'system',
      },
    });
    testPlannerId = planner.id;

    // Create test wedding
    const wedding = await prisma.wedding.create({
      data: {
        planner_id: testPlannerId,
        couple_names: 'Test Couple Integration',
        wedding_date: new Date('2026-12-31'),
        wedding_time: '18:00',
        location: 'Test Venue',
        rsvp_cutoff_date: new Date('2026-12-20'),
        default_language: 'EN',
        created_by: testPlannerId,
      },
    });
    testWeddingId = wedding.id;

    // Create test wedding admin
    const weddingAdmin = await prisma.weddingAdmin.create({
      data: {
        name: 'Test Wedding Admin',
        email: 'wedding-admin-integration@test.com',
        auth_provider: 'EMAIL',
        wedding_id: testWeddingId,
        invited_by: testPlannerId,
      },
    });
    testAdminId = weddingAdmin.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.weddingAdmin.deleteMany({
      where: { id: testAdminId },
    });
    await prisma.family.deleteMany({
      where: { wedding_id: testWeddingId },
    });
    await prisma.wedding.delete({
      where: { id: testWeddingId },
    });
    await prisma.weddingPlanner.delete({
      where: { id: testPlannerId },
    });
  });

  beforeEach(() => {
    // Mock requireRole to return our test user
    requireRole.mockResolvedValue({
      id: testAdminId,
      email: 'wedding-admin-integration@test.com',
      role: 'wedding_admin',
      wedding_id: testWeddingId,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/guests', () => {
    it('should return guests list with pagination', async () => {
      // Create test families
      const family1 = await prisma.family.create({
        data: {
          wedding_id: testWeddingId,
          name: 'Family Alpha',
          email: 'alpha@test.com',
          preferred_language: 'EN',
        },
      });

      const family2 = await prisma.family.create({
        data: {
          wedding_id: testWeddingId,
          name: 'Family Beta',
          email: 'beta@test.com',
          preferred_language: 'ES',
        },
      });

      // Create members for the families
      await prisma.familyMember.createMany({
        data: [
          { family_id: family1.id, name: 'Alpha Member 1', type: 'ADULT', attending: true },
          { family_id: family1.id, name: 'Alpha Member 2', type: 'ADULT', attending: false },
          { family_id: family2.id, name: 'Beta Member 1', type: 'ADULT', attending: null },
        ],
      });

      const url = 'http://localhost:3000/api/admin/guests?page=1';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('items');
      expect(data.data).toHaveProperty('pagination');
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(2);

      // Verify pagination
      expect(data.data.pagination).toHaveProperty('total');
      expect(data.data.pagination).toHaveProperty('page');
      expect(data.data.pagination).toHaveProperty('totalPages');

      // Verify guest data structure
      const firstGuest = data.data.items[0];
      expect(firstGuest).toHaveProperty('id');
      expect(firstGuest).toHaveProperty('name');
      expect(firstGuest).toHaveProperty('preferred_language');
      expect(firstGuest).toHaveProperty('rsvp_status');
      expect(firstGuest).toHaveProperty('attending_count');
      expect(firstGuest).toHaveProperty('total_members');

      // Clean up
      await prisma.familyMember.deleteMany({ where: { family_id: family1.id } });
      await prisma.familyMember.deleteMany({ where: { family_id: family2.id } });
      await prisma.family.delete({ where: { id: family1.id } });
      await prisma.family.delete({ where: { id: family2.id } });
    });

    it('should filter guests by RSVP status', async () => {
      // Create test family with submitted RSVP
      const family = await prisma.family.create({
        data: {
          wedding_id: testWeddingId,
          name: 'Family With RSVP',
          preferred_language: 'EN',
        },
      });

      await prisma.familyMember.create({
        data: {
          family_id: family.id,
          name: 'RSVP Member',
          type: 'ADULT',
          attending: true, // RSVP submitted
        },
      });

      const url = 'http://localhost:3000/api/admin/guests?page=1&rsvp_status=submitted';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify filtered results
      const foundFamily = data.data.items.find((g: any) => g.name === 'Family With RSVP');
      expect(foundFamily).toBeDefined();
      expect(foundFamily.rsvp_status).toBe('submitted');

      // Clean up
      await prisma.familyMember.deleteMany({ where: { family_id: family.id } });
      await prisma.family.delete({ where: { id: family.id } });
    });

    it('should return 401 for unauthenticated user', async () => {
      requireRole.mockRejectedValue(new Error('UNAUTHORIZED'));

      const url = 'http://localhost:3000/api/admin/guests?page=1';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/admin/guests', () => {
    it('should create a new family with members', async () => {
      const familyData = {
        name: 'New Test Family',
        email: 'newtest@family.com',
        phone: '+34600000001',
        preferred_language: 'ES',
        members: [
          {
            name: 'John Doe',
            type: 'ADULT',
            age: 35,
          },
          {
            name: 'Jane Doe',
            type: 'ADULT',
            age: 32,
          },
        ],
      };

      const url = 'http://localhost:3000/api/admin/guests';
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(familyData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe('New Test Family');
      expect(data.data.members).toHaveLength(2);

      // Verify in database
      const familyInDb = await prisma.family.findUnique({
        where: { id: data.data.id },
        include: { members: true },
      });
      expect(familyInDb).toBeDefined();
      expect(familyInDb?.name).toBe('New Test Family');
      expect(familyInDb?.members).toHaveLength(2);

      // Clean up
      await prisma.familyMember.deleteMany({ where: { family_id: data.data.id } });
      await prisma.family.delete({ where: { id: data.data.id } });
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        // Missing required name field
        email: 'invalid@test.com',
      };

      const url = 'http://localhost:3000/api/admin/guests';
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for unauthenticated user', async () => {
      requireRole.mockRejectedValue(new Error('UNAUTHORIZED'));

      const familyData = {
        name: 'Test Family',
        preferred_language: 'EN',
        members: [],
      };

      const url = 'http://localhost:3000/api/admin/guests';
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(familyData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });
});
