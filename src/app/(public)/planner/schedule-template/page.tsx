import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/middleware';
import { ScheduleTemplateEditor } from '@/components/planner/ScheduleTemplateEditor';
import PrivateHeader from '@/components/PrivateHeader';

export async function generateMetadata() {
  return { title: 'Nupci - Plantilla de Cronograma' };
}

export default async function ScheduleTemplatePage() {
  try {
    await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  return (
    <div className="min-h-screen">
      <PrivateHeader backUrl="/planner" />

      {/* Page header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Plantilla de Cronograma</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Define los bloques y etapas por defecto para tus bodas.
                El ojo <span className="text-teal-500">◉</span> indica si la etapa es visible para los novios.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScheduleTemplateEditor />
      </main>
    </div>
  );
}
