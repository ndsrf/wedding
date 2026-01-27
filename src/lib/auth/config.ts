/**
 * NextAuth.js Configuration
 *
 * Configures OAuth authentication with Google, Facebook/Instagram, and Apple providers.
 * Implements custom callbacks for user session management and role detection.
 */

import NextAuth, { type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import AppleProvider from 'next-auth/providers/apple';
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

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),

    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
  ],

  // Custom pages
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

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

        console.log(`Sign-in callback success for: ${user.email}`);

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

  // Force secure cookies in production (Cloudflare terminates SSL, but we want secure cookies)
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://'),
  
  cookies: {
    sessionToken: {
      name: `${process.env.NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        domain: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined,
      },
    },
  },
};

// Export auth helper for server components
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
