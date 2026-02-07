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
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/error',
  '/auth/signout',
  '/api/auth',
  '/contact',
  '/api/contact',
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

  // 1. Guest routes - CRITICAL PATH
  // Return early for guest RSVP routes to ensure maximum performance
  if (pathname.startsWith('/rsvp') || pathname.startsWith('/api/guest')) {
    const response = NextResponse.next();
    response.headers.set('x-priority', 'high');
    response.headers.set('x-route-type', 'rsvp');
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  // 2. Auth redirect for home page (Performance optimization)
  // Check if user is logged in when accessing root to redirect to dashboard
  if (pathname === '/' || routing.locales.some(locale => pathname === `/${locale}`)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://'),
    });

    if (token?.user?.role) {
      const role = (token.user as AuthenticatedUser).role;
      return NextResponse.redirect(new URL(getRedirectForRole(role), request.url));
    }
    
    // Fall through to intlMiddleware for non-authenticated users
  }

  // 3. Internationalization
  // This handles /about, /docs, etc. and redirects / to /[locale]
  // if not authenticated.
  const response = intlMiddleware(request);
  
  // If intlMiddleware wants to redirect (e.g. adding locale), return that
  // But we only want to apply intlMiddleware to specific public pages for SEO
  // The user only wanted /, /about, /docs, /privacy to be SEO friendly.
  const isSeoFriendlyPath = pathname === '/' || 
    pathname.startsWith('/about') || 
    pathname.startsWith('/docs') || 
    pathname.startsWith('/privacy') ||
    routing.locales.some(locale => pathname.startsWith(`/${locale}`));

  if (isSeoFriendlyPath) {
    return response;
  }

  // 4. Public routes (non-intl)
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 5. Authenticated routes
  // Get user session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://'),
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

  // Home page - allow access for landing page
  // The page itself will handle redirects for authenticated users
  if (pathname === '/') {
    return NextResponse.next();
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
