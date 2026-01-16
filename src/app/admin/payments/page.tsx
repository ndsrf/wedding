/**
 * Wedding Admin - Payments Page
 *
 * Page for managing and tracking gift payments
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PaymentList } from '@/src/components/admin/PaymentList';
import { PaymentForm } from '@/src/components/admin/PaymentForm';
import type { GiftStatus } from '@/src/types/models';

interface PaymentItem {
  id: string;
  family_id: string;
  wedding_id: string;
  amount: number;
  reference_code_used: string | null;
  auto_matched: boolean;
  status: GiftStatus;
  transaction_date: Date;
  created_at: Date;
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [guestStatusFilter, setGuestStatusFilter] = useState<GuestStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

      const response = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.data.items);
        setTotalPages(data.data.pagination.totalPages);

        // Calculate stats
        const allPayments = data.data.items as PaymentItem[];
        setStats({
          total: allPayments.length,
          pending: allPayments.filter((p) => p.status === 'PENDING').length,
          received: allPayments.filter((p) => p.status === 'RECEIVED').length,
          confirmed: allPayments.filter((p) => p.status === 'CONFIRMED').length,
          totalAmount: allPayments.reduce((sum, p) => sum + p.amount, 0),
        });
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchFamilies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');

      // Map guest status filter to API attendance parameter
      if (guestStatusFilter === 'attending') {
        params.set('attendance', 'yes');
      } else if (guestStatusFilter === 'not_attending') {
        params.set('attendance', 'no');
      }
      // 'all' doesn't set any filter

      const response = await fetch(`/api/admin/guests?${params.toString()}`);

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
        console.error('Failed to fetch families:', data.error?.message || 'Unknown error', 'Full response:', JSON.stringify(data));
        setFamilies([]);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
      setFamilies([]);
    }
  }, [guestStatusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleUpdateStatus = async (paymentId: string, status: GiftStatus) => {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
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
    const response = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to record payment');
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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Tracking</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {stats.total} payments • {formatCurrency(stats.totalAmount)} total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
              >
                {showForm ? 'Cancel' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-600">Total Payments</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
            <p className="text-sm font-medium text-yellow-800">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
            <p className="text-sm font-medium text-blue-800">Received</p>
            <p className="text-2xl font-bold text-blue-900">{stats.received}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
            <p className="text-sm font-medium text-green-800">Confirmed</p>
            <p className="text-2xl font-bold text-green-900">{stats.confirmed}</p>
          </div>
        </div>

        {/* Payment Form */}
        {showForm && (
          <div className="mb-6">
            {/* Guest Status Filter for Family Dropdown */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
              <label htmlFor="guestStatusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Show Families
              </label>
              <select
                id="guestStatusFilter"
                value={guestStatusFilter}
                onChange={(e) => setGuestStatusFilter(e.target.value as GuestStatusFilter)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                <option value="all">All Families</option>
                <option value="attending">Attending Only</option>
                <option value="not_attending">Not Attending Only</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Filter which families appear in the dropdown below
              </p>
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
                Status
              </label>
              <select
                id="status"
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value as GiftStatus || undefined })
                }
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="RECEIVED">Received</option>
                <option value="CONFIRMED">Confirmed</option>
              </select>
            </div>
            {filters.status && (
              <button
                onClick={() => setFilters({})}
                className="text-sm text-purple-600 hover:text-purple-800 self-end pb-2"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Payment List */}
        <PaymentList
          payments={payments}
          onUpdateStatus={handleUpdateStatus}
          loading={loading}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </main>
    </div>
  );
}
