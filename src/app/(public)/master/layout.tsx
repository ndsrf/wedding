import type { ReactNode } from 'react';
import Footer from '@/components/Footer';

export default function MasterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-pink-50">
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
    </div>
  );
}
