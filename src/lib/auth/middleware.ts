/**
 * Authentication Middleware Helpers
 *
 * Provides role-based access control helpers and user context extraction.
 * Used by Next.js middleware and API routes to enforce authorization.
 */

import { auth } from '@/src/lib/auth/config';
import type { AuthenticatedUser } from '@/src/types/api';

// ============================================================================
// SESSION AND USER CONTEXT
// ============================================================================

/**
 * Get the current authenticated user from session
 * Use this in API routes and server components
 *
 * @returns Authenticated user or null if not logged in
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  return session?.user || null;
}

/**
 * Extract user context from request
 * For use in middleware - delegates to getCurrentUser
 *
 * @returns Authenticated user from session token if available
 */
export async function extractUserContext(): Promise<AuthenticatedUser | null> {
  return getCurrentUser();
}

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================

export type UserRole = 'master_admin' | 'planner' | 'wedding_admin';

/**
 * Check if user has required role
 *
 * @param user - Authenticated user
 * @param requiredRole - Required role
 * @returns true if user has required role
 */
export function hasRole(user: AuthenticatedUser | null, requiredRole: UserRole): boolean {
  if (!user) return false;
  return user.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 *
 * @param user - Authenticated user
 * @param requiredRoles - Array of acceptable roles
 * @returns true if user has any of the required roles
 */
export function hasAnyRole(user: AuthenticatedUser | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes
 *
 * @returns Authenticated user
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  return user;
}

/**
 * Require specific role - throws error if user doesn't have role
 * Use this in API routes
 *
 * @param requiredRole - Required role
 * @returns Authenticated user with required role
 * @throws Error if not authenticated or wrong role
 */
export async function requireRole(requiredRole: UserRole): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!hasRole(user, requiredRole)) {
    throw new Error(`FORBIDDEN: ${requiredRole} role required`);
  }

  return user;
}

/**
 * Require any of the specified roles
 * Use this in API routes
 *
 * @param requiredRoles - Array of acceptable roles
 * @returns Authenticated user with one of the required roles
 * @throws Error if not authenticated or no matching role
 */
export async function requireAnyRole(requiredRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!hasAnyRole(user, requiredRoles)) {
    throw new Error(`FORBIDDEN: One of [${requiredRoles.join(', ')}] roles required`);
  }

  return user;
}

// ============================================================================
// WEDDING-SPECIFIC ACCESS CONTROL
// ============================================================================

/**
 * Check if user has access to a specific wedding
 * Master admins have access to all weddings
 * Planners have access to their weddings
 * Wedding admins have access only to their assigned wedding
 *
 * @param user - Authenticated user
 * @param wedding_id - Wedding ID to check access for
 * @param planner_id - Optional planner ID (for planner role check)
 * @returns true if user has access to the wedding
 */
export function hasWeddingAccess(
  user: AuthenticatedUser | null,
  wedding_id: string,
  planner_id?: string
): boolean {
  if (!user) return false;

  // Master admins have access to all weddings
  if (user.role === 'master_admin') {
    return true;
  }

  // Planners have access to weddings they created
  if (user.role === 'planner' && planner_id) {
    return user.planner_id === planner_id;
  }

  // Wedding admins have access only to their assigned wedding
  if (user.role === 'wedding_admin') {
    return user.wedding_id === wedding_id;
  }

  return false;
}

/**
 * Require access to a specific wedding - throws error if no access
 * Use this in API routes
 *
 * @param wedding_id - Wedding ID to check access for
 * @param planner_id - Optional planner ID (for planner role check)
 * @returns Authenticated user with wedding access
 * @throws Error if user doesn't have access to wedding
 */
export async function requireWeddingAccess(
  wedding_id: string,
  planner_id?: string
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!hasWeddingAccess(user, wedding_id, planner_id)) {
    throw new Error('FORBIDDEN: No access to this wedding');
  }

  return user;
}

// ============================================================================
// ROUTE MATCHING HELPERS
// ============================================================================

/**
 * Check if a path matches a route pattern
 *
 * @param path - Request path
 * @param pattern - Route pattern (e.g., '/master/*', '/admin/*')
 * @returns true if path matches pattern
 */
export function matchesRoute(path: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return path.startsWith(prefix);
  }
  return path === pattern;
}

/**
 * Get required role for a route path
 *
 * @param path - Request path
 * @returns Required role for the route, or null if public
 */
export function getRequiredRoleForPath(path: string): UserRole | null {
  if (matchesRoute(path, '/master/*') || matchesRoute(path, '/api/master/*')) {
    return 'master_admin';
  }

  if (matchesRoute(path, '/planner/*') || matchesRoute(path, '/api/planner/*')) {
    return 'planner';
  }

  if (matchesRoute(path, '/admin/*') || matchesRoute(path, '/api/admin/*')) {
    return 'wedding_admin';
  }

  // Public routes: /rsvp/*, /auth/*, /api/guest/*, /api/auth/*
  return null;
}
