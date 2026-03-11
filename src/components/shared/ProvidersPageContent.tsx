import { type ReactNode } from 'react';
import { WeddingProviders } from '@/components/shared/WeddingProviders';

interface ProvidersPageContentProps {
  weddingId: string;
  isPlanner: boolean;
  header: ReactNode;
}

export function ProvidersPageContent({ weddingId, isPlanner, header }: ProvidersPageContentProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {header}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WeddingProviders weddingId={weddingId} isPlanner={isPlanner} />
      </main>
    </div>
  );
}
