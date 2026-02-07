/**
 * Integration Tests - Wedding Configuration API Route
 *
 * Tests the /api/admin/wedding route handlers with database integration
 */

import { GET, PATCH } from '@/app/(public)/api/admin/wedding/route';
import { prisma } from '@/lib/db/prisma';
import { NextRequest } from 'next/server';

// Mock the auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  requireRole: jest.fn(),
}));

const { requireRole } = require('@/lib/auth/middleware');

describe('Integration Tests - Wedding Configuration API', () => {
  let testWeddingId: string;
  let testAdminId: string;
  let testPlannerId: string;

  beforeAll(async () => {
    // Create test planner
    const planner = await prisma.weddingPlanner.create({
      data: {
        name: 'Test Planner Wedding Config',
        email: 'planner-weddingconfig@test.com',
        auth_provider: 'GOOGLE',
        created_by: 'system',
      },
    });
    testPlannerId = planner.id;

    // Create test wedding
    const wedding = await prisma.wedding.create({
      data: {
        planner_id: testPlannerId,
        couple_names: 'Config Test Couple',
        wedding_date: new Date('2026-08-15'),
        wedding_time: '17:00',
        location: 'Config Test Location',
        rsvp_cutoff_date: new Date('2026-08-01'),
        default_language: 'EN',
        dress_code: 'Formal',
        additional_info: 'Test additional info',
        transportation_question_enabled: false,
        dietary_restrictions_enabled: true,
        save_the_date_enabled: false,
        created_by: testPlannerId,
      },
    });
    testWeddingId = wedding.id;

    // Create test wedding admin
    const weddingAdmin = await prisma.weddingAdmin.create({
      data: {
        name: 'Test Wedding Admin',
        email: 'wedding-admin-config@test.com',
        auth_provider: 'GOOGLE',
        wedding_id: testWeddingId,
        invited_by: testPlannerId,
      },
    });
    testAdminId = weddingAdmin.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.weddingAdmin.deleteMany({
      where: { id: testAdminId },
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
      email: 'wedding-admin-config@test.com',
      role: 'wedding_admin',
      wedding_id: testWeddingId,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/wedding', () => {
    it('should return wedding details with stats', async () => {
      // Create some test families for stats
      const family = await prisma.family.create({
        data: {
          wedding_id: testWeddingId,
          name: 'Stats Test Family',
          preferred_language: 'EN',
        },
      });

      await prisma.familyMember.createMany({
        data: [
          {
            family_id: family.id,
            name: 'Member Stats 1',
            type: 'ADULT',
            attending: true,
          },
          {
            family_id: family.id,
            name: 'Member Stats 2',
            type: 'ADULT',
            attending: null,
          },
        ],
      });

      const response = await GET();
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify wedding details
      const wedding = data.data;
      expect(wedding.id).toBe(testWeddingId);
      expect(wedding.couple_names).toBe('Config Test Couple');
      expect(wedding.location).toBe('Config Test Location');
      expect(wedding.dress_code).toBe('Formal');
      expect(wedding.default_language).toBe('EN');

      // Verify stats
      expect(wedding).toHaveProperty('guest_count');
      expect(wedding).toHaveProperty('rsvp_count');
      expect(wedding).toHaveProperty('rsvp_completion_percentage');
      expect(wedding).toHaveProperty('attending_count');
      expect(typeof wedding.guest_count).toBe('number');
      expect(wedding.guest_count).toBeGreaterThanOrEqual(2); // At least 2 members we created

      // Verify RSVP configuration
      expect(wedding.transportation_question_enabled).toBe(false);
      expect(wedding.dietary_restrictions_enabled).toBe(true);
      expect(wedding.save_the_date_enabled).toBe(false);

      // Verify available themes
      expect(wedding).toHaveProperty('available_themes');
      expect(Array.isArray(wedding.available_themes)).toBe(true);
      expect(wedding.available_themes.length).toBeGreaterThan(0);

      // Clean up
      await prisma.familyMember.deleteMany({ where: { family_id: family.id } });
      await prisma.family.delete({ where: { id: family.id } });
    });

    it('should return 404 for non-existent wedding', async () => {
      // Mock user with non-existent wedding
      requireRole.mockResolvedValue({
        id: testAdminId,
        email: 'wedding-admin-config@test.com',
        role: 'wedding_admin',
        wedding_id: '00000000-0000-0000-0000-000000000000',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 for unauthenticated user', async () => {
      requireRole.mockRejectedValue(new Error('UNAUTHORIZED'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /api/admin/wedding', () => {
    it('should update wedding basic configuration', async () => {
      const updateData = {
        dress_code: 'Smart Casual',
        additional_info: 'Updated additional info',
        allow_guest_additions: true,
      };

      const request = new NextRequest('http://localhost:3000/api/admin/wedding', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PATCH(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dress_code).toBe('Smart Casual');
      expect(data.data.additional_info).toBe('Updated additional info');
      expect(data.data.allow_guest_additions).toBe(true);

      // Verify in database
      const weddingInDb = await prisma.wedding.findUnique({
        where: { id: testWeddingId },
      });
      expect(weddingInDb?.dress_code).toBe('Smart Casual');
      expect(weddingInDb?.additional_info).toBe('Updated additional info');
      expect(weddingInDb?.allow_guest_additions).toBe(true);
    });

    it('should update RSVP configuration', async () => {
      const updateData = {
        transportation_question_enabled: true,
        transportation_question_text: 'Do you need a ride?',
        dietary_restrictions_enabled: true,
        extra_question_1_enabled: true,
        extra_question_1_text: 'Will you attend the rehearsal dinner?',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/wedding', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transportation_question_enabled).toBe(true);
      expect(data.data.transportation_question_text).toBe('Do you need a ride?');
      expect(data.data.extra_question_1_enabled).toBe(true);
      expect(data.data.extra_question_1_text).toBe('Will you attend the rehearsal dinner?');

      // Verify in database
      const weddingInDb = await prisma.wedding.findUnique({
        where: { id: testWeddingId },
      });
      expect(weddingInDb?.transportation_question_enabled).toBe(true);
      expect(weddingInDb?.extra_question_1_enabled).toBe(true);
    });

    it('should update extra info fields configuration', async () => {
      const updateData = {
        extra_info_1_enabled: true,
        extra_info_1_label: 'Hotel Name',
        extra_info_2_enabled: true,
        extra_info_2_label: 'Flight Number',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/wedding', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.extra_info_1_enabled).toBe(true);
      expect(data.data.extra_info_1_label).toBe('Hotel Name');
      expect(data.data.extra_info_2_enabled).toBe(true);
      expect(data.data.extra_info_2_label).toBe('Flight Number');
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        payment_tracking_mode: 'INVALID_MODE',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/wedding', {
        method: 'PATCH',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
    });

    it('should return 401 for unauthenticated user', async () => {
      requireRole.mockRejectedValue(new Error('UNAUTHORIZED'));

      const request = new NextRequest('http://localhost:3000/api/admin/wedding', {
        method: 'PATCH',
        body: JSON.stringify({ dress_code: 'Casual' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });
});
