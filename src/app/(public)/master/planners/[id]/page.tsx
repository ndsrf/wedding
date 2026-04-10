/**
 * Master Admin - Planner Detail Page
 *
 * Shows license settings and sub-account management for a single planner company.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { useNamespacedTranslations, useFormatDate } from '@/lib/i18n/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Planner {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
  wedding_count: number;
  created_at: string;
}

interface License {
  id: string;
  planner_id: string;
  max_weddings: number;
  max_sub_planners: number;
  can_delete_weddings: boolean;
  max_whatsapp_per_month: number;
  max_whatsapp_per_wedding_per_month: number;
  max_standard_ai_calls: number;
  max_premium_ai_calls: number;
  max_emails_per_month: number;
  max_contracts_per_month: number;
}

interface SubAccount {
  id: string;
  email: string;
  name: string;
  enabled: boolean;
  created_at: string;
  last_login_at: string | null;
  preferred_language: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlannerDetailPage() {
  const t = useNamespacedTranslations('master');
  const tCommon = useNamespacedTranslations('common');
  const { success: showToastSuccess, error: showToastError } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const plannerId = params.id;
  const formatDate = useFormatDate();

  // Planner
  const [planner, setPlanner] = useState<Planner | null>(null);
  // License
  const [license, setLicense] = useState<License | null>(null);
  const [licenseForm, setLicenseForm] = useState({
    max_weddings: 10,
    max_sub_planners: 2,
    can_delete_weddings: true,
    max_whatsapp_per_month: 100,
    max_whatsapp_per_wedding_per_month: 100,
    max_standard_ai_calls: 100,
    max_premium_ai_calls: 50,
    max_emails_per_month: 1000,
    max_contracts_per_month: 100,
  });
  const [savingLicense, setSavingLicense] = useState(false);
  // Sub-accounts
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [newSubAccount, setNewSubAccount] = useState({ name: '', email: '' });
  const [addingSubAccount, setAddingSubAccount] = useState(false);
  const [actioningSubId, setActioningSubId] = useState<string | null>(null);
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch planner info ──────────────────────────────────────────────────────
  const fetchPlanner = useCallback(async () => {
    const res = await fetch(`/api/master/planners/${plannerId}`);
    if (!res.ok) {
      if (res.status === 401) { router.push('/api/auth/signin'); return; }
      throw new Error('Failed to load planner');
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Planner not found');
    setPlanner(data.data);
  }, [plannerId, router]);

  // ─── Fetch license ───────────────────────────────────────────────────────────
  const fetchLicense = useCallback(async () => {
    const res = await fetch(`/api/master/planners/${plannerId}/license`);
    if (!res.ok) throw new Error('Failed to load license');
    const data = await res.json();
    if (data.success) {
      setLicense(data.data);
      setLicenseForm({
        max_weddings: data.data.max_weddings,
        max_sub_planners: data.data.max_sub_planners,
        can_delete_weddings: data.data.can_delete_weddings ?? true,
        max_whatsapp_per_month: data.data.max_whatsapp_per_month ?? 100,
        max_whatsapp_per_wedding_per_month: data.data.max_whatsapp_per_wedding_per_month ?? 100,
        max_standard_ai_calls: data.data.max_standard_ai_calls ?? 100,
        max_premium_ai_calls: data.data.max_premium_ai_calls ?? 50,
        max_emails_per_month: data.data.max_emails_per_month ?? 1000,
        max_contracts_per_month: data.data.max_contracts_per_month ?? 100,
      });
    }
  }, [plannerId]);

  // ─── Fetch sub-accounts ──────────────────────────────────────────────────────
  const fetchSubAccounts = useCallback(async () => {
    const res = await fetch(`/api/master/planners/${plannerId}/sub-accounts`);
    if (!res.ok) throw new Error('Failed to load sub-accounts');
    const data = await res.json();
    if (data.success) setSubAccounts(data.data);
  }, [plannerId]);

  // ─── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchPlanner(), fetchLicense(), fetchSubAccounts()])
      .catch((err) => setError(err instanceof Error ? err.message : 'An error occurred'))
      .finally(() => setIsLoading(false));
  }, [fetchPlanner, fetchLicense, fetchSubAccounts]);

  // ─── Save license ────────────────────────────────────────────────────────────
  const handleSaveLicense = async () => {
    if (!license) return;

    const willDeleteWeddings =
      licenseForm.max_weddings < license.max_weddings &&
      planner &&
      planner.wedding_count > licenseForm.max_weddings;

    const willDisableSubAccounts =
      licenseForm.max_sub_planners < license.max_sub_planners &&
      subAccounts.filter((s) => s.enabled).length > licenseForm.max_sub_planners;

    let confirmMsg = t('license.confirmSave');
    if (willDeleteWeddings) {
      confirmMsg += '\n\n' + t('license.warnDeleteWeddings', { count: String(planner!.wedding_count - licenseForm.max_weddings) });
    }
    if (willDisableSubAccounts) {
      confirmMsg += '\n\n' + t('license.warnDisableSubAccounts');
    }

    if ((willDeleteWeddings || willDisableSubAccounts) && !confirm(confirmMsg)) return;

    setSavingLicense(true);
    try {
      const res = await fetch(`/api/master/planners/${plannerId}/license`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(licenseForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to save license');
      setLicense(data.data);
      await Promise.all([fetchPlanner(), fetchSubAccounts()]);
      showToastSuccess(tCommon('success.updated'));
    } catch (err) {
      showToastError(err instanceof Error ? err.message : tCommon('errors.generic'));
    } finally {
      setSavingLicense(false);
    }
  };

  // ─── Add sub-account ─────────────────────────────────────────────────────────
  const handleAddSubAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSubAccount(true);
    try {
      const res = await fetch(`/api/master/planners/${plannerId}/sub-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubAccount),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to add sub-account');
      setNewSubAccount({ name: '', email: '' });
      await fetchSubAccounts();
      showToastSuccess(tCommon('success.created'));
    } catch (err) {
      showToastError(err instanceof Error ? err.message : tCommon('errors.generic'));
    } finally {
      setAddingSubAccount(false);
    }
  };

  // ─── Toggle sub-account ──────────────────────────────────────────────────────
  const handleToggleSubAccount = async (subId: string, currentEnabled: boolean) => {
    setActioningSubId(subId);
    try {
      const res = await fetch(`/api/master/planners/${plannerId}/sub-accounts/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update sub-account');
      await fetchSubAccounts();
    } catch (err) {
      showToastError(err instanceof Error ? err.message : tCommon('errors.generic'));
    } finally {
      setActioningSubId(null);
    }
  };

  // ─── Delete sub-account ──────────────────────────────────────────────────────
  const handleDeleteSubAccount = async (subId: string) => {
    if (!confirm(t('subAccounts.confirmDelete'))) return;
    setActioningSubId(subId);
    try {
      const res = await fetch(`/api/master/planners/${plannerId}/sub-accounts/${subId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to delete sub-account');
      await fetchSubAccounts();
    } catch (err) {
      showToastError(err instanceof Error ? err.message : tCommon('errors.generic'));
    } finally {
      setActioningSubId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <p className="text-base text-gray-500">{tCommon('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {planner?.name ?? '…'}
              </h1>
              <p className="mt-1 text-base text-gray-600">{planner?.email}</p>
            </div>
            <Link
              href="/master/planners"
              className="px-5 py-2.5 border-2 border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
            >
              {tCommon('buttons.back')}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl text-base">
            {error}
          </div>
        )}

        {/* ── License Section ─────────────────────────────────────────────── */}
        <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 border border-pink-100">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t('license.title')}</h2>
          <p className="text-base text-gray-600 mb-6">{t('license.description')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Max Weddings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('license.maxWeddings')}
                {planner && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({t('license.currentlyUsing', { count: String(planner.wedding_count) })})
                  </span>
                )}
              </label>
              <input
                type="number"
                min={0}
                value={licenseForm.max_weddings}
                onChange={(e) => setLicenseForm((f) => ({ ...f, max_weddings: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            {/* Max Sub-Planners */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('license.maxSubPlanners')}
                <span className="ml-2 text-xs text-gray-500">
                  ({t('license.currentlyUsing', { count: String(subAccounts.filter((s) => s.enabled).length) })})
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={licenseForm.max_sub_planners}
                onChange={(e) => setLicenseForm((f) => ({ ...f, max_sub_planners: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            {/* Can Delete Weddings */}
            <div className="flex items-center space-x-3 pt-4">
              <input
                id="can_delete_weddings"
                type="checkbox"
                checked={licenseForm.can_delete_weddings}
                onChange={(e) => setLicenseForm((f) => ({ ...f, can_delete_weddings: e.target.checked }))}
                className="h-5 w-5 text-pink-600 border-2 border-pink-200 rounded focus:ring-purple-400"
              />
              <label htmlFor="can_delete_weddings" className="text-sm font-medium text-gray-700">
                {t('license.canDeleteWeddings')}
              </label>
            </div>

            <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-pink-100">
              {/* Max WhatsApp Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('license.maxWhatsAppPerMonth')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={licenseForm.max_whatsapp_per_month}
                  onChange={(e) => setLicenseForm((f) => ({ ...f, max_whatsapp_per_month: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              {/* Max WhatsApp Wedding Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('license.maxWhatsAppPerWeddingPerMonth')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={licenseForm.max_whatsapp_per_wedding_per_month}
                  onChange={(e) => setLicenseForm((f) => ({ ...f, max_whatsapp_per_wedding_per_month: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              {/* Max Standard AI Calls */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('license.maxStandardAICalls')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={licenseForm.max_standard_ai_calls}
                  onChange={(e) => setLicenseForm((f) => ({ ...f, max_standard_ai_calls: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              {/* Max Premium AI Calls */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('license.maxPremiumAICalls')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={licenseForm.max_premium_ai_calls}
                  onChange={(e) => setLicenseForm((f) => ({ ...f, max_premium_ai_calls: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              {/* Max Emails per Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('license.maxEmailsPerMonth')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={licenseForm.max_emails_per_month}
                  onChange={(e) => setLicenseForm((f) => ({ ...f, max_emails_per_month: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              {/* Max Contracts per Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('license.maxContractsPerMonth')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={licenseForm.max_contracts_per_month}
                  onChange={(e) => setLicenseForm((f) => ({ ...f, max_contracts_per_month: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Downgrade warnings */}
          {license && licenseForm.max_weddings < license.max_weddings && planner && planner.wedding_count > licenseForm.max_weddings && (
            <div className="bg-amber-50 border-2 border-amber-200 text-amber-800 px-5 py-3 rounded-xl text-sm mb-4">
              {t('license.warnDeleteWeddings', { count: String(planner.wedding_count - licenseForm.max_weddings) })}
            </div>
          )}
          {license && licenseForm.max_sub_planners < license.max_sub_planners && subAccounts.filter((s) => s.enabled).length > licenseForm.max_sub_planners && (
            <div className="bg-amber-50 border-2 border-amber-200 text-amber-800 px-5 py-3 rounded-xl text-sm mb-4">
              {t('license.warnDisableSubAccounts')}
            </div>
          )}

          <button
            onClick={handleSaveLicense}
            disabled={savingLicense}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {savingLicense ? tCommon('loading') : tCommon('buttons.save')}
          </button>
        </div>

        {/* ── Sub-Accounts Section ─────────────────────────────────────────── */}
        <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 border border-pink-100">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t('subAccounts.title')}</h2>
          <p className="text-base text-gray-600 mb-6">
            {t('subAccounts.description')}
            {license && (
              <span className="ml-1 font-medium text-purple-700">
                ({subAccounts.filter((s) => s.enabled).length} / {license.max_sub_planners})
              </span>
            )}
          </p>

          {/* Add Sub-Account Form */}
          <form onSubmit={handleAddSubAccount} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('subAccounts.name')}</label>
              <input
                type="text"
                required
                value={newSubAccount.name}
                onChange={(e) => setNewSubAccount((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('subAccounts.namePlaceholder')}
                className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('subAccounts.email')}</label>
              <input
                type="email"
                required
                value={newSubAccount.email}
                onChange={(e) => setNewSubAccount((f) => ({ ...f, email: e.target.value }))}
                placeholder={t('subAccounts.emailPlaceholder')}
                className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl text-base focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addingSubAccount}
                className="w-full px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {addingSubAccount ? tCommon('loading') : t('subAccounts.add')}
              </button>
            </div>
          </form>

          {/* Sub-Account List */}
          {subAccounts.length === 0 ? (
            <div className="text-center py-8 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-dashed border-purple-300">
              <p className="text-base text-gray-600">{t('subAccounts.empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-pink-200 border-2 border-pink-200 rounded-2xl overflow-hidden">
                <thead className="bg-gradient-to-r from-pink-50 to-purple-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('subAccounts.name')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('subAccounts.email')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('planners.status')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('planners.lastLogin')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('planners.added')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-pink-100">
                  {subAccounts.map((sub) => (
                    <tr key={sub.id} className="hover:bg-pink-50/50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap font-semibold text-gray-900">{sub.name}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-gray-600">{sub.email}</td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1.5 inline-flex text-sm leading-5 font-semibold rounded-full ${sub.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {sub.enabled ? t('planners.enabled') : t('planners.disabled')}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-gray-600">
                        {sub.last_login_at ? formatDate(sub.last_login_at, { dateStyle: 'short' }) : 'Never'}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-gray-600">
                        {formatDate(sub.created_at, { dateStyle: 'short' })}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-base flex gap-4">
                        <button
                          onClick={() => handleToggleSubAccount(sub.id, sub.enabled)}
                          disabled={actioningSubId === sub.id}
                          className={`font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${sub.enabled ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {actioningSubId === sub.id
                            ? tCommon('loading')
                            : sub.enabled
                              ? t('planners.disable')
                              : t('planners.enable')}
                        </button>
                        <button
                          onClick={() => handleDeleteSubAccount(sub.id)}
                          disabled={actioningSubId === sub.id}
                          className="font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {t('subAccounts.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
