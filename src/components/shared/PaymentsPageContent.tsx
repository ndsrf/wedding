/**
 * Shared Payments Page Content
 *
 * Contains all logic and JSX for the gift payments tracking page.
 * Used by both /admin/payments and /planner/weddings/:id/payments.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PaymentList } from '@/components/admin/PaymentList';
import { PaymentForm } from '@/components/admin/PaymentForm';
import type { GiftStatus } from '@/types/models';

export interface PaymentsApiPaths {
  /** /api/admin/payments  OR  /api/planner/weddings/:id/payments */
  payments: string;
  /** /api/admin/guests    OR  /api/planner/weddings/:id/guests */
  guests: string;
  /** /api/admin/wedding   OR  /api/planner/weddings/:id */
  wedding: string;
}

interface PaymentItem {
  id: string;
  family_id: string;
  wedding_id: string;
  amount: number;
  reference_code_used: string | null;
  auto_matched: boolean;
  status: GiftStatus;
  transaction_date: string; // JSON wire format — always a string from the API
  created_at: string;
  family: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface Family {
  id: string;
  name: string;
}

interface Filters {
  status?: GiftStatus;
}

type GuestStatusFilter = 'all' | 'attending' | 'not_attending';

interface PaymentsPageContentProps {
  apiPaths: PaymentsApiPaths;
  isReadOnly: boolean;
  header: ReactNode;
}

export function PaymentsPageContent({ apiPaths, isReadOnly, header }: PaymentsPageContentProps) {
  const t = useTranslations();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [guestStatusFilter, setGuestStatusFilter] = useState<GuestStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Planning fields
  const [plannedGuests, setPlannedGuests] = useState<number | ''>('');
  const [plannedGiftPerPerson, setPlannedGiftPerPerson] = useState<number | ''>('');
  const [savingPlanning, setSavingPlanning] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    received: 0,
    confirmed: 0,
    totalAmount: 0,
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (filters.status) params.set('status', filters.status);

      const response = await fetch(`${apiPaths.payments}?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.data.items);
        setTotalPages(data.data.pagination.totalPages);
        // Use server-computed stats so they reflect ALL payments, not just the current page
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters, apiPaths.payments]);

  const fetchFamilies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');

      if (guestStatusFilter === 'attending') {
        params.set('attendance', 'yes');
      } else if (guestStatusFilter === 'not_attending') {
        params.set('attendance', 'no');
      }

      const response = await fetch(`${apiPaths.guests}?${params.toString()}`);

      if (!response.ok) {
        console.error('Failed to fetch families - HTTP status:', response.status);
        setFamilies([]);
        return;
      }

      const data = await response.json();

      if (data.success && data.data?.items) {
        setFamilies(
          data.data.items.map((f: { id: string; name: string }) => ({
            id: f.id,
            name: f.name,
          }))
        );
      } else {
        console.error('Failed to fetch families:', data.error?.message || 'Unknown error');
        setFamilies([]);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
      setFamilies([]);
    }
  }, [guestStatusFilter, apiPaths.guests]);

  const fetchWeddingPlanning = useCallback(async () => {
    try {
      const res = await fetch(apiPaths.wedding);
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.planned_guests != null) setPlannedGuests(data.data.planned_guests);
        if (data.data.planned_gift_per_person != null)
          setPlannedGiftPerPerson(data.data.planned_gift_per_person);
      }
    } catch (error) {
      console.error('Error fetching wedding planning data:', error);
    }
  }, [apiPaths.wedding]);

  const handleSavePlanning = async () => {
    setSavingPlanning(true);
    try {
      const body: Record<string, unknown> = {};
      if (plannedGuests !== '') body.planned_guests = Number(plannedGuests);
      if (plannedGiftPerPerson !== '') body.planned_gift_per_person = Number(plannedGiftPerPerson);
      if (Object.keys(body).length > 0) {
        await fetch(apiPaths.wedding, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
    } catch (error) {
      console.error('Error saving planning data:', error);
    } finally {
      setSavingPlanning(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  useEffect(() => {
    fetchWeddingPlanning();
  }, [fetchWeddingPlanning]);

  const handleUpdateStatus = async (paymentId: string, status: GiftStatus) => {
    try {
      const response = await fetch(`${apiPaths.payments}/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchPayments();
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const handleRecordPayment = async (data: {
    family_id: string;
    amount: number;
    transaction_date: string;
    reference_code_used?: string;
  }) => {
    const response = await fetch(apiPaths.payments, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || t('common.errors.generic'));
    }

    setShowForm(false);
    fetchPayments();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {header}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action bar */}
        {!isReadOnly && (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-3 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
            >
              {showForm ? t('common.buttons.cancel') : t('admin.payments.record')}
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-600">{t('admin.payments.stats.totalPayments')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
            <p className="text-sm font-medium text-yellow-800">{t('admin.payments.statuses.pending')}</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
            <p className="text-sm font-medium text-blue-800">{t('admin.payments.statuses.received')}</p>
            <p className="text-2xl font-bold text-blue-900">{stats.received}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
            <p className="text-sm font-medium text-green-800">{t('admin.payments.statuses.confirmed')}</p>
            <p className="text-2xl font-bold text-green-900">{stats.confirmed}</p>
          </div>
        </div>

        {/* Planning card */}
        {(() => {
          const pg = plannedGuests !== '' ? Number(plannedGuests) : 0;
          const pgpp = plannedGiftPerPerson !== '' ? Number(plannedGiftPerPerson) : 0;
          const plannedIncome = pg * pgpp;
          const diff = plannedIncome - stats.totalAmount;
          const inputCls =
            'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900';
          return (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {t('admin.payments.planning.title')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('admin.payments.planning.plannedGuests')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={plannedGuests}
                    onChange={(e) =>
                      setPlannedGuests(e.target.value ? Number(e.target.value) : '')
                    }
                    onBlur={isReadOnly ? undefined : handleSavePlanning}
                    readOnly={isReadOnly}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('admin.payments.planning.giftPerPerson')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={plannedGiftPerPerson}
                    onChange={(e) =>
                      setPlannedGiftPerPerson(e.target.value ? Number(e.target.value) : '')
                    }
                    onBlur={isReadOnly ? undefined : handleSavePlanning}
                    readOnly={isReadOnly}
                    className={inputCls}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('admin.payments.planning.plannedIncome')}
                  </label>
                  <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-semibold text-violet-700">
                    {formatCurrency(plannedIncome)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('admin.payments.planning.difference')}
                  </label>
                  <div
                    className={`px-3 py-2 border rounded-md bg-gray-50 text-sm font-semibold ${diff >= 0 ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'}`}
                  >
                    {diff >= 0 ? '+' : ''}
                    {formatCurrency(diff)}
                  </div>
                </div>
              </div>
              {savingPlanning && (
                <p className="mt-2 text-xs text-gray-400">{t('admin.payments.planning.saving')}</p>
              )}
            </div>
          );
        })()}

        {/* Payment Form */}
        {!isReadOnly && showForm && (
          <div className="mb-6">
            {/* Guest Status Filter for Family Dropdown */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
              <label
                htmlFor="guestStatusFilter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('admin.payments.showFamilies')}
              </label>
              <select
                id="guestStatusFilter"
                value={guestStatusFilter}
                onChange={(e) => setGuestStatusFilter(e.target.value as GuestStatusFilter)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              >
                <option value="all">{t('admin.payments.filterFamilies.all')}</option>
                <option value="attending">{t('admin.payments.filterFamilies.attending')}</option>
                <option value="not_attending">
                  {t('admin.payments.filterFamilies.notAttending')}
                </option>
              </select>
              <p className="mt-1 text-xs text-gray-600">{t('admin.payments.filterFamiliesDesc')}</p>
            </div>
            <PaymentForm
              families={families}
              onSubmit={handleRecordPayment}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.payments.status')}
              </label>
              <select
                id="status"
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({ ...filters, status: (e.target.value as GiftStatus) || undefined })
                }
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              >
                <option value="">{t('admin.guests.filters.all')}</option>
                <option value="PENDING">{t('admin.payments.statuses.pending')}</option>
                <option value="RECEIVED">{t('admin.payments.statuses.received')}</option>
                <option value="CONFIRMED">{t('admin.payments.statuses.confirmed')}</option>
              </select>
            </div>
            {filters.status && (
              <button
                onClick={() => setFilters({})}
                className="text-sm text-purple-600 hover:text-purple-800 self-end pb-2"
              >
                {t('common.buttons.clearFilters')}
              </button>
            )}
          </div>
        </div>

        {/* Payment List */}
        <PaymentList
          payments={payments}
          onUpdateStatus={isReadOnly ? undefined : handleUpdateStatus}
          loading={loading}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-3 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.buttons.previous')}
              </button>
              <span className="relative inline-flex items-center px-4 py-3 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                {t('common.pagination.page')} {page} {t('common.pagination.of')} {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-2 py-3 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.buttons.next')}
              </button>
            </nav>
          </div>
        )}
      </main>
    </div>
  );
}
