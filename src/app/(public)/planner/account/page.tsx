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

/**
 * Local UsageBar component to avoid import issues
 */
function UsageBar({ 
  label, 
  used, 
  max, 
  comingSoonLabel, 
  noLimitLabel 
}: { 
  label: string; 
  used: number; 
  max: number | null; 
  comingSoonLabel: string; 
  noLimitLabel: string; 
}) {
  const isComingSoon = max === -1;
  const isNoLimit = max === null;
  const percentage = isNoLimit || isComingSoon ? 0 : Math.min(Math.round((used / max) * 100), 100);
  
  const barColor = percentage > 90 ? 'bg-red-500' : percentage > 75 ? 'bg-amber-500' : 'bg-purple-500';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {isComingSoon ? (
            <span className="text-gray-400 font-normal italic">{comingSoonLabel}</span>
          ) : isNoLimit ? (
            <span>{used} <span className="text-gray-400 font-normal">/ {noLimitLabel}</span></span>
          ) : (
            <span>{used} <span className="text-gray-400 font-normal">/ {max}</span></span>
          )}
        </span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${barColor}`} 
          style={{ width: `${isComingSoon || isNoLimit ? 0 : percentage}%` }}
        />
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
          select: {
            max_weddings: true,
            max_sub_planners: true,
            max_whatsapp_per_month: true,
            max_standard_ai_calls: true,
            max_premium_ai_calls: true,
            max_emails_per_month: true,
            max_contracts_per_month: true,
            can_delete_weddings: true,
          },
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

  // Fetch current month's usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageData = await prisma.resourceUsage.groupBy({
    by: ['type'],
    where: {
      planner_id: user.planner_id,
      timestamp: { gte: startOfMonth },
    },
    _sum: {
      quantity: true,
    },
  });

  const getUsage = (type: string) => {
    return usageData.find((u) => u.type === type)?._sum.quantity || 0;
  };

  const whatsappUsed = getUsage('WHATSAPP');
  const standardAIUsed = getUsage('AI_STANDARD');
  const premiumAIUsed = getUsage('AI_PREMIUM');
  const emailsUsed = getUsage('EMAIL');
  const contractsUsed = getUsage('CONTRACT');

  const isActive = planner.subscription_status === 'ACTIVE';
  const statusLabel = isActive ? t('planner.account.subscriptionActive') : t('planner.account.subscriptionInactive');
  const statusColor = isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
  const statusDot = isActive ? 'bg-green-500' : 'bg-gray-400';

  const maxWeddings = planner.license?.max_weddings ?? 10;
  const maxSubPlanners = planner.license?.max_sub_planners ?? 2;
  const maxWhatsApp = planner.license?.max_whatsapp_per_month ?? 100;
  const maxStandardAI = planner.license?.max_standard_ai_calls ?? 100;
  const maxPremiumAI = planner.license?.max_premium_ai_calls ?? 50;
  const maxEmails = planner.license?.max_emails_per_month ?? 1000;
  const maxContracts = planner.license?.max_contracts_per_month ?? 100;
  const canDeleteWeddings = planner.license?.can_delete_weddings ?? true;

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
              { label: t('planner.account.aiBasic'), value: maxStandardAI !== null ? String(maxStandardAI) : '∞' },
              { label: t('planner.account.aiPremium'), value: maxPremiumAI !== null ? String(maxPremiumAI) : '∞' },
              { label: t('planner.account.whatsapp'), value: maxWhatsApp !== null ? String(maxWhatsApp) : '∞' },
              { label: t('planner.account.emails'), value: maxEmails !== null ? String(maxEmails) : '∞' },
              { label: t('planner.account.contracts'), value: maxContracts !== null ? String(maxContracts) : '∞' },
              { label: t('master.license.canDeleteWeddings'), value: canDeleteWeddings ? t('common.yes') : t('common.no') },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* AI & WhatsApp & Email usage */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('planner.account.aiUsage')}</h2>
          <div className="space-y-5">
            <UsageBar
              label={t('planner.account.aiBasic')}
              used={Number(standardAIUsed)}
              max={maxStandardAI}
              comingSoonLabel={comingSoon}
              noLimitLabel={noLimit}
            />
            <UsageBar
              label={t('planner.account.aiPremium')}
              used={Number(premiumAIUsed)}
              max={maxPremiumAI}
              comingSoonLabel={comingSoon}
              noLimitLabel={noLimit}
            />
            <UsageBar
              label={t('planner.account.whatsapp')}
              used={Number(whatsappUsed)}
              max={maxWhatsApp}
              comingSoonLabel={comingSoon}
              noLimitLabel={noLimit}
            />
            <UsageBar
              label={t('planner.account.emails')}
              used={Number(emailsUsed)}
              max={maxEmails}
              comingSoonLabel={comingSoon}
              noLimitLabel={noLimit}
            />
            <UsageBar
              label={t('planner.account.contracts')}
              used={Number(contractsUsed)}
              max={maxContracts}
              comingSoonLabel={comingSoon}
              noLimitLabel={noLimit}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
