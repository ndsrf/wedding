/**
 * NextAuth Type Extensions
 *
 * Extends NextAuth types to include our custom AuthenticatedUser in sessions
 */

import 'next-auth';
import 'next-auth/jwt';
import type { AuthenticatedUser } from './api';

declare module 'next-auth' {
  interface Session {
    user: AuthenticatedUser;
  }

  interface User {
    id: string;
    email: string;
    name: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user?: AuthenticatedUser;
  }
}
