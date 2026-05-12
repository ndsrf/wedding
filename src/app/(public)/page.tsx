'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

function getDashboardPath(role: string): string {
  switch (role) {
    case 'master_admin': return '/master';
    case 'planner': return '/planner';
    default: return '/admin';
  }
}

export default function RootPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user?.role) {
      router.replace(getDashboardPath(session.user.role));
    }
  }, [status, session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <WeddingSpinner size="lg" />
    </div>
  );
}
