/**
 * Returns the dashboard path for a given role, or the sign-in page if the
 * role is unknown. Used in both middleware (server) and client components so
 * that the mapping stays in one place.
 */
export function getRedirectForRole(role: string): string {
  switch (role) {
    case 'master_admin': return '/master';
    case 'planner': return '/planner';
    case 'wedding_admin': return '/admin';
    default: return '/auth/signin';
  }
}
