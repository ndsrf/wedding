/**
 * NextAuth.js Configuration
 *
 * Configures OAuth authentication with Google and Facebook/Instagram providers.
 * Implements custom callbacks for user session management and role detection.
 */

import NextAuth, { type NextAuthConfig, type User } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import { detectUserRole, mapAuthProvider } from '@/lib/auth/oauth';
import type { AuthenticatedUser } from '@/types/api';

// ============================================================================
// CONSTANTS
// ============================================================================

// How often to re-validate user role (in milliseconds)
const ROLE_REVALIDATION_INTERVAL = 60 * 1000; // 1 minute

// ============================================================================
// NEXTAUTH CONFIGURATION
// ============================================================================

export const authOptions: NextAuthConfig = {
  // We manage users manually, don't use adapter
  // adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // Only enable Facebook if credentials are provided
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET ? [
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      })
    ] : []),

    // E2E Testing Provider - ONLY enabled when NEXT_PUBLIC_IS_E2E=true
    // SECURITY: This provider MUST NEVER be enabled in production environments
    ...(process.env.NEXT_PUBLIC_IS_E2E === 'true' ? [
      CredentialsProvider({
        id: 'e2e-bypass',
        name: 'E2E Testing',
        credentials: {
          email: { label: "Email", type: "email" }
        },
        async authorize(credentials) {
          // Validate credentials exist
          if (!credentials?.email || typeof credentials.email !== 'string') {
            console.warn('[E2E Auth] Missing or invalid email in credentials');
            return null;
          }

          try {
            // Detect user role using existing function
            // This will create master admin if email is in MASTER_ADMIN_EMAILS
            const roleInfo = await detectUserRole(
              credentials.email,
              'GOOGLE' // Provider doesn't matter for E2E
            );

            return {
              id: roleInfo.id,
              email: credentials.email,
              name: roleInfo.name,
            } as User;
          } catch (error) {
            console.error('[E2E Auth] Authorization failed:', error);
            return null;
          }
        }
      })
    ] : []),
  ],

  // Custom pages
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // Base path for auth API
  basePath: '/api/auth',

  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Callbacks
  callbacks: {
    /**
     * Sign-in callback
     * Verifies user has appropriate role before allowing sign-in
     */
    async signIn({ user, account }) {
      if (!user.email || !account) {
        return false;
      }

      try {
        const authProvider = mapAuthProvider(account.provider);

        // Detect user role - this will throw if user is not authorized
        await detectUserRole(user.email, authProvider);

        return true;
      } catch (error) {
        console.error('Sign-in error:', error);

        // Redirect to error page with message
        if (error instanceof Error) {
          if (error.message.includes('PLANNER_DISABLED')) {
            return `/auth/error?error=PlannerDisabled`;
          }
          if (error.message.includes('UNAUTHORIZED')) {
            return `/auth/error?error=Unauthorized`;
          }
        }

        return false;
      }
    },

    /**
     * JWT callback
     * Adds user role and context to JWT token
     * Periodically revalidates role to detect changes (e.g., master admin config updates)
     */
    async jwt({ token, user, account, trigger }) {
      // Initial sign-in
      if (account && user?.email) {
        try {
          const authProvider = mapAuthProvider(account.provider);
          const roleInfo = await detectUserRole(user.email, authProvider);

          token.user = {
            id: roleInfo.id,
            email: user.email,
            name: roleInfo.name,
            role: roleInfo.role,
            wedding_id: roleInfo.wedding_id,
            planner_id: roleInfo.planner_id,
            preferred_language: roleInfo.preferred_language,
            last_login_provider: authProvider,
          } as AuthenticatedUser;
          token.lastRoleCheck = Date.now();
        } catch (error) {
          console.error('JWT callback error:', error);
          // Token will not have user info, which will fail session callback
        }
      }

      // Refresh role on update trigger (e.g., after wedding assignment changes)
      if (trigger === 'update' && token.user?.email) {
        try {
          const authProvider = mapAuthProvider(token.user.last_login_provider);
          const roleInfo = await detectUserRole(token.user.email, authProvider);

          token.user = {
            ...token.user,
            id: roleInfo.id,
            name: roleInfo.name,
            role: roleInfo.role,
            wedding_id: roleInfo.wedding_id,
            planner_id: roleInfo.planner_id,
            preferred_language: roleInfo.preferred_language,
          } as AuthenticatedUser;
          token.lastRoleCheck = Date.now();
        } catch (error) {
          console.error('JWT update error:', error);
        }
      }

      // Periodic role revalidation - detect config/database changes
      const lastCheck = (token.lastRoleCheck as number) || 0;
      const now = Date.now();
      if (token.user?.email && now - lastCheck > ROLE_REVALIDATION_INTERVAL) {
        try {
          const authProvider = mapAuthProvider(token.user.last_login_provider);
          const roleInfo = await detectUserRole(token.user.email, authProvider);

          // Check if role has changed
          if (roleInfo.role !== token.user.role) {
            console.log(
              `Role changed for ${token.user.email}: ${token.user.role} -> ${roleInfo.role}`
            );
            token.user = {
              ...token.user,
              id: roleInfo.id,
              name: roleInfo.name,
              role: roleInfo.role,
              wedding_id: roleInfo.wedding_id,
              planner_id: roleInfo.planner_id,
              preferred_language: roleInfo.preferred_language,
            } as AuthenticatedUser;
          }
          token.lastRoleCheck = now;
        } catch (error) {
          console.error('Role revalidation error:', error);
          // Keep existing token on error - don't break existing sessions
        }
      }

      return token;
    },

    /**
     * Session callback
     * Exposes authenticated user data to client
     */
    async session({ session, token }) {
      if (token && 'user' in token && token.user) {
        session.user = {
          ...token.user,
          emailVerified: null,
        };
      }

      return session;
    },
  },

  // Events
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
    async signOut(message) {
      if ('token' in message && message.token && 'user' in message.token && message.token.user) {
        console.log(`User signed out: ${message.token.user.email}`);
      }
    },
  },

  // Enable debug in development
  debug: process.env.NODE_ENV === 'development',

  // Trust host header (required for Docker/Proxy)
  trustHost: true,

  // Skip CSRF check in development if it's causing issues after logout
  // NOTE: skipCSRFCheck has type issues in NextAuth v5 beta, commenting out for now
  // skipCSRFCheck: process.env.NODE_ENV === 'development',

  // Force secure cookies ONLY in production/HTTPS (Cloudflare)
  // For localhost/HTTP, we let NextAuth use its defaults which work correctly
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://'),
};

// Export auth helper for server components
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
