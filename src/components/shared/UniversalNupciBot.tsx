'use client';

import { usePathname, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NupciBot } from './NupciBot';

/**
 * UniversalNupciBot
 * 
 * A wrapper around NupciBot that automatically detects the context (admin vs planner)
 * and wedding ID from the URL or session. This allows us to place the bot in a
 * single top-level layout while maintaining context-awareness.
 */
export function UniversalNupciBot() {
  const pathname = usePathname();
  const params = useParams();
  const { data: session } = useSession();
  
  // 1. Determine variant based on pathname or user role
  const isPlannerPath = pathname?.startsWith('/planner');
  const isAdminPath = pathname?.startsWith('/admin');
  const userRole = session?.user?.role;
  
  // If not in a dashboard and not logged in, don't show the bot
  if (!isPlannerPath && !isAdminPath && !userRole) {
    return null;
  }
  
  // Determine variant: prefer pathname detection, fallback to role
  const variant = isPlannerPath || userRole === 'planner' ? 'planner' : 'admin';
  
  // 2. Determine wedding ID
  // For planners, it might be in the URL params ([id])
  // For admins, it might be in the session
  const weddingId = (params?.id as string | undefined) || session?.user?.wedding_id;
  
  // 3. Determine API endpoint and storage key
  const apiEndpoint = variant === 'planner'
    ? '/api/planner/nupcibot/chat' 
    : '/api/admin/nupcibot/chat';
    
  const storageKey = variant === 'planner'
    ? 'nupcibot_planner_state'
    : 'nupcibot_admin_state';

  return (
    <NupciBot
      variant={variant}
      apiEndpoint={apiEndpoint}
      storageKey={storageKey}
      weddingId={weddingId}
    />
  );
}
