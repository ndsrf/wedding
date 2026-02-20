/**
 * Wedding Setup Wizard Page
 *
 * Guided onboarding flow for couples to set up their wedding management
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { WeddingWizard } from '@/components/admin/wizard/WeddingWizard';

export default async function WizardPage() {
  let user;
  try {
    user = await requireRole('wedding_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  if (!user.wedding_id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">No Wedding Found</h1>
          <p className="mt-2 text-gray-500">Please contact your wedding planner.</p>
        </div>
      </div>
    );
  }

  // Fetch wedding data
  const wedding = await prisma.wedding.findUnique({
    where: { id: user.wedding_id },
    include: {
      theme: true,
      families: {
        include: {
          members: true,
        },
      },
      message_templates: true,
      invitation_templates: true,
      tables: true,
      checklist_tasks: true,
    },
  });

  if (!wedding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Wedding Not Found</h1>
          <p className="mt-2 text-gray-500">Please contact your wedding planner.</p>
        </div>
      </div>
    );
  }

  // If wizard is already completed, redirect to dashboard
  if (wedding.wizard_completed && !wedding.wizard_skipped) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <WeddingWizard wedding={wedding} currentStep={wedding.wizard_current_step || 0} />
    </div>
  );
}
