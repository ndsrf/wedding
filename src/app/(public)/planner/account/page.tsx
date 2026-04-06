/**
 * Wedding Planner - Mi Cuenta Page
 *
 * Shows subscription status, plan limits and current usage.
 * Allows editing the planner's display name.
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getTranslations } from '@/lib/i18n/server';
import PrivateHeader from '@/components/PrivateHeader';
import PlannerNameEditor from '@/components/planner/PlannerNameEditor';

export async function generateMetadata() {
  const { t } = await getTranslations();
  return { title: `Nupci - ${t('planner.account.title')}` };
}

interface UsageBarProps {
  label: string;
  used: number | null;
  max: number | null;
  comingSoon?: boolean;
  comingSoonLabel: string;
  noLimitLabel: string;
}

function UsageBar({ label, used, max, comingSoon = false, comingSoonLabel, noLimitLabel }: UsageBarProps) {
  const percentage = used !== null && max !== null && max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const barColor = isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-rose-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {comingSoon ? (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{comingSoonLabel}</span>
        ) : used !== null && max !== null ? (
          <span className={`text-xs font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-500'}`}>
            {used} / {max}
          </span>
        ) : max !== null ? (
          <span className="text-xs text-gray-500">{max}</span>
        ) : (
          <span className="text-xs text-gray-400">{noLimitLabel}</span>
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

  const [{ t }, planner, activeWeddings, subAccountCount] = await Promise.all([
    getTranslations(),
    prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: {
        name: true,
        email: true,
        phone: true,
        bank_account: true,
        accepts_bizum: true,
        accepts_revolut: true,
        subscription_status: true,
        license: {
          select: { max_weddings: true, max_sub_planners: true },
        },
      },
    }),
    prisma.wedding.count({
      where: { planner_id: user.planner_id, status: 'ACTIVE', deleted_at: null, is_disabled: false },
    }),
    prisma.plannerSubAccount.count({
      where: { company_planner_id: user.planner_id, enabled: true },
    }),
  ]);

  if (!planner) redirect('/planner');

  const isActive = planner.subscription_status === 'ACTIVE';
  const statusLabel = isActive ? t('planner.account.subscriptionActive') : t('planner.account.subscriptionInactive');
  const statusColor = isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
  const statusDot = isActive ? 'bg-green-500' : 'bg-gray-400';

  const maxWeddings = planner.license?.max_weddings ?? null;
  const maxSubPlanners = planner.license?.max_sub_planners ?? null;
  const comingSoon = t('planner.account.comingSoon');
  const noLimit = t('planner.account.noLimit');

  return (
    <div className="min-h-screen">
      <PrivateHeader backUrl="/planner" />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">{t('planner.account.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t('planner.account.subtitle')}</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile editor (client component) */}
        <PlannerNameEditor
          initialName={planner.name}
          email={planner.email}
          initialPhone={planner.phone}
          initialBankAccount={planner.bank_account}
          initialAcceptsBizum={planner.accepts_bizum}
          initialAcceptsRevolut={planner.accepts_revolut}
        />

        {/* Subscription Status */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('planner.account.subscription')}</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{planner.email}</p>
            <span className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${statusColor}`}>
              <span className={`w-2 h-2 rounded-full ${statusDot}`} />
              {statusLabel}
            </span>
          </div>
        </section>

        {/* Usage */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('planner.account.usage')}</h2>
          <div className="space-y-5">
            <UsageBar label={t('planner.account.activeWeddings')} used={activeWeddings} max={maxWeddings} comingSoonLabel={comingSoon} noLimitLabel={noLimit} />
            <UsageBar label={t('planner.account.activeSubPlanners')} used={subAccountCount} max={maxSubPlanners} comingSoonLabel={comingSoon} noLimitLabel={noLimit} />
          </div>
        </section>

        {/* Limits */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('planner.account.limits')}</h2>
          <div className="space-y-0">
            {[
              { label: t('planner.account.simultaneousWeddings'), value: maxWeddings !== null ? String(maxWeddings) : '∞' },
              { label: t('planner.account.subPlanners'), value: maxSubPlanners !== null ? String(maxSubPlanners) : '∞' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
            {[
              t('planner.account.aiBasic'),
              t('planner.account.aiPremium'),
              t('planner.account.whatsapp'),
            ].map((label, i, arr) => (
              <div key={label} className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  {label}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{comingSoon}</span>
                </span>
                <span className="text-sm font-semibold text-gray-400">—</span>
              </div>
            ))}
          </div>
        </section>

        {/* AI & WhatsApp usage */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('planner.account.aiUsage')}</h2>
          <div className="space-y-5">
            <UsageBar label={t('planner.account.aiBasic')} used={null} max={null} comingSoon comingSoonLabel={comingSoon} noLimitLabel={noLimit} />
            <UsageBar label={t('planner.account.aiPremium')} used={null} max={null} comingSoon comingSoonLabel={comingSoon} noLimitLabel={noLimit} />
            <UsageBar label={t('planner.account.whatsapp')} used={null} max={null} comingSoon comingSoonLabel={comingSoon} noLimitLabel={noLimit} />
          </div>
        </section>
      </main>
    </div>
  );
}
