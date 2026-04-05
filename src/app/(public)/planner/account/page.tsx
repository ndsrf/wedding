/**
 * Wedding Planner - Mi Cuenta Page
 *
 * Shows the planner's subscription status, plan limits (read-only), and current usage.
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import PrivateHeader from '@/components/PrivateHeader';

export async function generateMetadata() {
  return { title: 'Nupci - Mi cuenta' };
}

const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE: {
    label: 'Activa',
    color: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
  INACTIVE: {
    label: 'Inactiva',
    color: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
  },
};

interface UsageBarProps {
  label: string;
  used: number | null;
  max: number | null;
  comingSoon?: boolean;
}

function UsageBar({ label, used, max, comingSoon = false }: UsageBarProps) {
  const percentage = used !== null && max !== null && max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const barColor = isAtLimit
    ? 'bg-red-500'
    : isNearLimit
    ? 'bg-amber-500'
    : 'bg-rose-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {comingSoon ? (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Próximamente</span>
        ) : used !== null && max !== null ? (
          <span className={`text-xs font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-500'}`}>
            {used} / {max}
          </span>
        ) : max !== null ? (
          <span className="text-xs text-gray-500">Límite: {max}</span>
        ) : (
          <span className="text-xs text-gray-400">Sin límite</span>
        )}
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        {comingSoon ? (
          <div className="h-full w-full bg-gray-200 rounded-full" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default async function PlannerAccountPage() {
  let user;
  try {
    user = await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  if (!user.planner_id) {
    redirect('/planner');
  }

  const [planner, activeWeddings, subAccountCount] = await Promise.all([
    prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: {
        name: true,
        email: true,
        subscription_status: true,
        license: {
          select: {
            max_weddings: true,
            max_sub_planners: true,
          },
        },
      },
    }),
    prisma.wedding.count({
      where: {
        planner_id: user.planner_id,
        status: 'ACTIVE',
        deleted_at: null,
        is_disabled: false,
      },
    }),
    prisma.plannerSubAccount.count({
      where: { company_planner_id: user.planner_id, enabled: true },
    }),
  ]);

  if (!planner) {
    redirect('/planner');
  }

  const statusInfo =
    SUBSCRIPTION_STATUS_LABELS[planner.subscription_status] ??
    SUBSCRIPTION_STATUS_LABELS.INACTIVE;

  const maxWeddings = planner.license?.max_weddings ?? null;
  const maxSubPlanners = planner.license?.max_sub_planners ?? null;

  return (
    <div className="min-h-screen">
      <PrivateHeader backUrl="/planner" />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">Mi cuenta</h1>
          <p className="mt-0.5 text-sm text-gray-500">Estado de tu suscripción y uso del plan</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Subscription Status */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Suscripción</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{planner.email}</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">{planner.name}</p>
            </div>
            <span className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${statusInfo.color}`}>
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
          </div>
        </section>

        {/* Usage */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Uso actual</h2>
            <span className="text-xs text-gray-400">Solo lectura</span>
          </div>
          <div className="space-y-5">
            <UsageBar
              label="Bodas activas"
              used={activeWeddings}
              max={maxWeddings}
            />
            <UsageBar
              label="Sub-planners activos"
              used={subAccountCount}
              max={maxSubPlanners}
            />
          </div>
        </section>

        {/* Limits */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Límites del plan</h2>
            <span className="text-xs text-gray-400">Solo lectura</span>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-700">Bodas simultáneas</span>
              <span className="text-sm font-semibold text-gray-900">
                {maxWeddings !== null ? maxWeddings : '∞'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-700">Sub-planners</span>
              <span className="text-sm font-semibold text-gray-900">
                {maxSubPlanners !== null ? maxSubPlanners : '∞'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-700 flex items-center gap-2">
                Llamadas IA básico
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Próximamente</span>
              </span>
              <span className="text-sm font-semibold text-gray-400">—</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-700 flex items-center gap-2">
                Llamadas IA premium
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Próximamente</span>
              </span>
              <span className="text-sm font-semibold text-gray-400">—</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700 flex items-center gap-2">
                Mensajes WhatsApp
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Próximamente</span>
              </span>
              <span className="text-sm font-semibold text-gray-400">—</span>
            </div>
          </div>
        </section>

        {/* AI & WhatsApp usage placeholders */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Uso de IA y WhatsApp</h2>
            <span className="text-xs text-gray-400">Solo lectura</span>
          </div>
          <div className="space-y-5">
            <UsageBar
              label="IA básico"
              used={null}
              max={null}
              comingSoon
            />
            <UsageBar
              label="IA premium"
              used={null}
              max={null}
              comingSoon
            />
            <UsageBar
              label="WhatsApp"
              used={null}
              max={null}
              comingSoon
            />
          </div>
        </section>
      </main>
    </div>
  );
}
