import { redirect } from 'next/navigation';
import PrivateHeader from '@/components/PrivateHeader';
import { requireRole } from '@/lib/auth/middleware';
import ClientsPage from '@/components/planner/ClientsPage';

export async function generateMetadata() {
  return { title: 'Nupci – Clients' };
}

export default async function ClientsServerPage() {
  try {
    await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  return (
    <div className="min-h-screen">
      <PrivateHeader />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">Clients</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage your clients and their quotes, contracts, invoices and weddings</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientsPage />
      </main>
    </div>
  );
}
