/**
 * Wedding Planner - Checklist Template Editor Page
 *
 * Dedicated page for wedding planners to manage their task templates
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { ChecklistTemplateEditor } from '@/components/planner/ChecklistTemplateEditor';

export default async function ChecklistTemplatePage() {
  // Check authentication - redirect if not planner
  try {
    await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/planner" className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('planner.checklistTemplate.title')}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('planner.checklistTemplate.subtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChecklistTemplateEditor />
      </main>
    </div>
  );
}
