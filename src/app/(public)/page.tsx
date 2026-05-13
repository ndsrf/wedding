'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import { getRedirectForRole } from '@/lib/auth/redirect';

export default function RootPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
      return;
    }
    if (session?.user?.role) {
      router.replace(getRedirectForRole(session.user.role));
    }
  }, [status, session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <WeddingSpinner size="lg" />
    </div>
  );
}
