/**
 * OAuth Configuration and Utilities
 *
 * Provides OAuth provider configurations and helper functions for NextAuth.js
 * Supports Google, Facebook/Instagram, and Apple Sign-In.
 */

import type { AuthProvider, Language } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// ============================================================================
// MASTER ADMIN CONFIGURATION
// ============================================================================

/**
 * Check if an email is configured as a master admin
 * Reads from MASTER_ADMIN_EMAILS environment variable (comma-separated list)
 *
 * @param email - Email to check
 * @returns true if email is in master admin list
 */
export function isMasterAdmin(email: string): boolean {
  try {
    const masterAdminEmailsEnv = process.env.MASTER_ADMIN_EMAILS;

    if (!masterAdminEmailsEnv) {
      console.warn('MASTER_ADMIN_EMAILS environment variable not set');
      return false;
    }

    // Parse comma-separated emails
    const masterAdminEmails = masterAdminEmailsEnv
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    // Case-insensitive email comparison
    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = masterAdminEmails.some(
      (adminEmail) => adminEmail.toLowerCase().trim() === normalizedEmail
    );

    console.log('Master admin check:', {
      email: normalizedEmail,
      masterAdminEmails,
      isAdmin
    });

    return isAdmin;
  } catch (error) {
    console.error('Error reading master admin emails:', error);
    return false;
  }
}

// ============================================================================
// USER ROLE DETECTION
// ============================================================================

/**
 * Detect user role based on email and database records
 * Checks in order: master admin config → wedding planner → wedding admin
 *
 * @param email - User email
 * @param authProvider - OAuth provider used
 * @returns User role and associated IDs
 */
export async function detectUserRole(email: string, authProvider: AuthProvider) {
  // Check master admin first (no caching, always check config file)
  if (isMasterAdmin(email)) {
    // Check if master admin record exists, create if not
    let masterAdmin = await prisma.masterAdmin.findUnique({
      where: { email },
    });

    if (!masterAdmin) {
      // Create master admin record on first login
      masterAdmin = await prisma.masterAdmin.create({
        data: {
          email,
          name: email.split('@')[0], // Use email prefix as default name
          preferred_language: 'EN' as Language,
        },
      });
    }

    return {
      role: 'master_admin' as const,
      id: masterAdmin.id,
      name: masterAdmin.name,
      preferred_language: masterAdmin.preferred_language,
      wedding_id: undefined,
      planner_id: undefined,
    };
  }

  // Check wedding planner
  const planner = await prisma.weddingPlanner.findUnique({
    where: { email },
  });

  if (planner) {
    // Update last login info
    await prisma.weddingPlanner.update({
      where: { id: planner.id },
      data: {
        last_login_at: new Date(),
        last_login_provider: authProvider,
      },
    });

    // Check if planner is enabled
    if (!planner.enabled) {
      throw new Error('PLANNER_DISABLED: Your planner account has been disabled. Please contact support.');
    }

    return {
      role: 'planner' as const,
      id: planner.id,
      name: planner.name,
      preferred_language: planner.preferred_language,
      wedding_id: undefined,
      planner_id: planner.id,
    };
  }

  // Check wedding admin (may have access to multiple weddings, but we'll get the first one)
  const weddingAdmin = await prisma.weddingAdmin.findFirst({
    where: { email },
    orderBy: { created_at: 'desc' }, // Get most recent wedding assignment
  });

  if (weddingAdmin) {
    // Update last login info and accepted_at if first login
    await prisma.weddingAdmin.update({
      where: { id: weddingAdmin.id },
      data: {
        last_login_at: new Date(),
        last_login_provider: authProvider,
        accepted_at: weddingAdmin.accepted_at ?? new Date(), // Set accepted_at on first login
      },
    });

    return {
      role: 'wedding_admin' as const,
      id: weddingAdmin.id,
      name: weddingAdmin.name,
      preferred_language: weddingAdmin.preferred_language,
      wedding_id: weddingAdmin.wedding_id,
      planner_id: undefined,
    };
  }

  // No role found - user is not authorized
  throw new Error('UNAUTHORIZED: No account found for this email. Please contact your wedding planner for access.');
}

// ============================================================================
// PROVIDER MAPPING
// ============================================================================

/**
 * Map NextAuth provider ID to our AuthProvider enum
 */
export function mapAuthProvider(providerId: string): AuthProvider {
  const providerMap: Record<string, AuthProvider> = {
    google: 'GOOGLE',
    facebook: 'FACEBOOK',
    apple: 'APPLE',
  };

  return providerMap[providerId] || 'GOOGLE';
}
