/**
 * Next.js Middleware
 *
 * Implements route protection based on user roles.
 * Protects master admin, planner, and wedding admin routes.
 * Allows public access to guest RSVP pages and auth routes.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { AuthenticatedUser } from '@/types/api';

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/error',
  '/auth/signout',
  '/api/auth',
];

// Routes that require specific roles
const PROTECTED_ROUTES = {
  master_admin: ['/master', '/api/master'],
  planner: ['/planner', '/api/planner'],
  wedding_admin: ['/admin', '/api/admin'],
};

// Shared routes accessible by multiple roles
// These are checked before role-specific routes
const SHARED_ROUTES = {
  // Checklist routes accessible by both planners and wedding admins
  planner_and_admin: [
    '/api/admin/checklist',
    '/api/admin/checklist/export',
    '/api/admin/checklist/import',
  ],
};

// Guest routes (use magic link authentication)
const GUEST_ROUTES = ['/rsvp', '/api/guest'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if path matches any of the patterns
 */
function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/*')) {
      return path.startsWith(pattern.slice(0, -2));
    }
    return path === pattern || path.startsWith(`${pattern}/`);
  });
}

/**
 * Check if route is public
 */
function isPublicRoute(path: string): boolean {
  return matchesAnyPattern(path, PUBLIC_ROUTES);
}

/**
 * Check if route is for guests
 */
function isGuestRoute(path: string): boolean {
  return matchesAnyPattern(path, GUEST_ROUTES);
}

/**
 * Check if route is shared and if user has access
 */
function hasSharedRouteAccess(path: string, userRole: string): boolean {
  for (const [allowedRoles, patterns] of Object.entries(SHARED_ROUTES)) {
    if (matchesAnyPattern(path, patterns)) {
      // Check if user role is in allowed roles
      if (allowedRoles === 'planner_and_admin') {
        return userRole === 'planner' || userRole === 'wedding_admin';
      }
      // Add more shared route combinations as needed
      return false;
    }
  }
  return false;
}

/**
 * Get required role for path
 */
function getRequiredRole(path: string): keyof typeof PROTECTED_ROUTES | null {
  for (const [role, patterns] of Object.entries(PROTECTED_ROUTES)) {
    if (matchesAnyPattern(path, patterns)) {
      return role as keyof typeof PROTECTED_ROUTES;
    }
  }
  return null;
}

/**
 * Get redirect URL based on user role
 */
function getRedirectForRole(role: string): string {
  switch (role) {
    case 'master_admin':
      return '/master';
    case 'planner':
      return '/planner';
    case 'wedding_admin':
      return '/admin';
    default:
      return '/auth/signin';
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Guest routes use magic link authentication (handled in API routes)
  if (isGuestRoute(pathname)) {
    return NextResponse.next();
  }

  // Get user session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const user = token?.user as AuthenticatedUser | undefined;

  // Check if this is a shared route (accessible by multiple roles)
  const isShared = Object.values(SHARED_ROUTES)
    .flat()
    .some((pattern) => matchesAnyPattern(pathname, [pattern]));

  if (isShared) {
    // Shared route - requires authentication
    if (!user) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Check if user has access to this shared route
    if (hasSharedRouteAccess(pathname, user.role)) {
      return NextResponse.next();
    } else {
      // User doesn't have access - redirect to their dashboard
      const redirectUrl = new URL(getRedirectForRole(user.role), request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Check if route requires authentication
  const requiredRole = getRequiredRole(pathname);

  if (requiredRole) {
    // Route requires authentication
    if (!user) {
      // Not authenticated - redirect to sign in
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Check if user has required role
    if (user.role !== requiredRole) {
      // Wrong role - redirect to appropriate dashboard
      const redirectUrl = new URL(getRedirectForRole(user.role), request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // User has correct role - allow access
    return NextResponse.next();
  }

  // Home page - redirect based on role
  if (pathname === '/') {
    if (user) {
      const redirectUrl = new URL(getRedirectForRole(user.role), request.url);
      return NextResponse.redirect(redirectUrl);
    } else {
      // Not authenticated - show landing page or redirect to sign in
      const signInUrl = new URL('/auth/signin', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Default: allow access
  return NextResponse.next();
}

// ============================================================================
// MIDDLEWARE CONFIG
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
