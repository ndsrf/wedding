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
  let testUserId: string;
  let testPlannerId: string;

  beforeAll(async () => {
    // Create test planner
    const planner = await prisma.weddingPlanner.create({
      data: {
        name: 'Test Planner Integration',
        email: 'planner-integration@test.com',
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
        default_language: 'EN',
      },
    });
    testWeddingId = wedding.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'wedding-admin-integration@test.com',
        role: 'wedding_admin',
      },
    });
    testUserId = user.id;

    // Link user to wedding as admin
    await prisma.weddingAdmin.create({
      data: {
        user_id: testUserId,
        wedding_id: testWeddingId,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.weddingAdmin.deleteMany({
      where: { user_id: testUserId },
    });
    await prisma.family.deleteMany({
      where: { wedding_id: testWeddingId },
    });
    await prisma.wedding.delete({
      where: { id: testWeddingId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.weddingPlanner.delete({
      where: { id: testPlannerId },
    });
  });

  beforeEach(() => {
    // Mock requireRole to return our test user
    requireRole.mockResolvedValue({
      id: testUserId,
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
          name: 'Integration Test Family 1',
          email: 'family1@test.com',
          preferred_language: 'EN',
          members: {
            create: [
              {
                name: 'Member 1',
                type: 'ADULT',
              },
            ],
          },
        },
        include: { members: true },
      });

      const family2 = await prisma.family.create({
        data: {
          wedding_id: testWeddingId,
          name: 'Integration Test Family 2',
          email: 'family2@test.com',
          preferred_language: 'ES',
          members: {
            create: [
              {
                name: 'Member 2',
                type: 'ADULT',
              },
            ],
          },
        },
        include: { members: true },
      });

      // Create mock request
      const url = 'http://localhost:3000/api/admin/guests?page=1&limit=10';
      const request = new NextRequest(url);

      // Call the GET handler
      const response = await GET(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('items');
      expect(data.data).toHaveProperty('pagination');
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(2);

      // Verify pagination
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(10);
      expect(data.data.pagination.total).toBeGreaterThanOrEqual(2);

      // Verify item structure
      const firstItem = data.data.items[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('wedding_id', testWeddingId);
      expect(firstItem).toHaveProperty('members');
      expect(firstItem).toHaveProperty('rsvp_status');
      expect(firstItem).toHaveProperty('attending_count');
      expect(firstItem).toHaveProperty('total_members');

      // Clean up
      await prisma.member.deleteMany({
        where: {
          OR: [{ family_id: family1.id }, { family_id: family2.id }],
        },
      });
      await prisma.family.deleteMany({
        where: {
          id: { in: [family1.id, family2.id] },
        },
      });
    });

    it('should filter guests by search query', async () => {
      // Create test family with unique name
      const family = await prisma.family.create({
        data: {
          wedding_id: testWeddingId,
          name: 'UniqueSearchName Integration',
          email: 'uniquesearch@test.com',
          preferred_language: 'EN',
          members: {
            create: [
              {
                name: 'John Unique',
                type: 'ADULT',
              },
            ],
          },
        },
        include: { members: true },
      });

      // Search for the unique name
      const url = 'http://localhost:3000/api/admin/guests?search=UniqueSearchName';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeGreaterThan(0);

      // Verify the family is in results
      const foundFamily = data.data.items.find((item: any) => item.id === family.id);
      expect(foundFamily).toBeDefined();
      expect(foundFamily.name).toBe('UniqueSearchName Integration');

      // Clean up
      await prisma.member.deleteMany({ where: { family_id: family.id } });
      await prisma.family.delete({ where: { id: family.id } });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Mock requireRole to throw authentication error
      requireRole.mockRejectedValue(new Error('UNAUTHORIZED'));

      const url = 'http://localhost:3000/api/admin/guests';
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
      const newFamilyData = {
        name: 'New Integration Family',
        email: 'newintegration@test.com',
        phone: '+34600111222',
        preferred_language: 'EN',
        channel_preference: 'EMAIL',
        members: [
          {
            name: 'John New',
            type: 'ADULT',
            age: 30,
          },
          {
            name: 'Jane New',
            type: 'ADULT',
            age: 28,
          },
        ],
      };

      // Create mock request
      const url = 'http://localhost:3000/api/admin/guests';
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(newFamilyData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Call the POST handler
      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe('New Integration Family');
      expect(data.data.email).toBe('newintegration@test.com');
      expect(data.data.wedding_id).toBe(testWeddingId);
      expect(data.data).toHaveProperty('magic_token');
      expect(data.data).toHaveProperty('reference_code');
      expect(data.data.members.length).toBe(2);

      // Verify members were created
      expect(data.data.members[0].name).toBe('John New');
      expect(data.data.members[1].name).toBe('Jane New');

      // Verify in database
      const familyInDb = await prisma.family.findUnique({
        where: { id: data.data.id },
        include: { members: true },
      });
      expect(familyInDb).toBeDefined();
      expect(familyInDb?.members.length).toBe(2);

      // Clean up
      await prisma.member.deleteMany({ where: { family_id: data.data.id } });
      await prisma.family.delete({ where: { id: data.data.id } });
    });

    it('should return validation error for invalid family data', async () => {
      const invalidData = {
        // Missing required 'name' field
        email: 'not-an-email', // Invalid email
        preferred_language: 'INVALID', // Invalid language
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
      expect(data.error.details).toBeDefined();
      expect(Array.isArray(data.error.details)).toBe(true);
      expect(data.error.details.length).toBeGreaterThan(0);
    });

    it('should create family without members', async () => {
      const familyData = {
        name: 'No Members Family',
        email: 'nomembers@test.com',
        preferred_language: 'ES',
        members: [], // Empty members array
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

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('No Members Family');
      expect(data.data.members.length).toBe(0);

      // Clean up
      await prisma.family.delete({ where: { id: data.data.id } });
    });

    it('should return 401 for unauthenticated request', async () => {
      requireRole.mockRejectedValue(new Error('UNAUTHORIZED'));

      const url = 'http://localhost:3000/api/admin/guests';
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
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
