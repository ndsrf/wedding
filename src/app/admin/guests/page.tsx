/**
 * Wedding Admin - Guest Management Page
 *
 * Page for managing guests with table, filters, and import/export
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GuestTable } from '@/components/admin/GuestTable';
import { GuestFilters } from '@/components/admin/GuestFilters';
import { GuestAdditionsReview } from '@/components/admin/GuestAdditionsReview';
import { GuestFormModal } from '@/components/admin/GuestFormModal';
import { GuestDeleteDialog } from '@/components/admin/GuestDeleteDialog';
import type { FamilyWithMembers, GiftStatus } from '@/types/models';
import type { FamilyMemberFormData } from '@/components/admin/FamilyMemberForm';

interface GuestWithStatus extends FamilyWithMembers {
  rsvp_status: string;
  attending_count: number;
  total_members: number;
  payment_status: GiftStatus | null;
}

interface GuestAddition {
  id: string;
  family_id: string;
  name: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  attending: boolean | null;
  age: number | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  added_by_guest: boolean;
  created_at: Date;
  family_name: string;
  is_new: boolean;
}

interface Filters {
  rsvp_status?: string;
  attendance?: string;
  channel?: string;
  payment_status?: string;
  search?: string;
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<GuestWithStatus[]>([]);
  const [guestAdditions, setGuestAdditions] = useState<GuestAddition[]>([]);
  const [guestAdditionsEnabled, setGuestAdditionsEnabled] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [additionsLoading, setAdditionsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'guests' | 'additions'>('guests');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedGuest, setSelectedGuest] = useState<GuestWithStatus | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<GuestWithStatus | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (filters.rsvp_status) params.set('rsvp_status', filters.rsvp_status);
      if (filters.attendance) params.set('attendance', filters.attendance);
      if (filters.channel) params.set('channel', filters.channel);
      if (filters.payment_status) params.set('payment_status', filters.payment_status);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/admin/guests?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setGuests(data.data.items);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchGuestAdditions = useCallback(async () => {
    setAdditionsLoading(true);
    try {
      const response = await fetch('/api/admin/guest-additions');
      const data = await response.json();

      if (data.success) {
        setGuestAdditions(data.data);
        setGuestAdditionsEnabled(data.meta?.feature_enabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching guest additions:', error);
    } finally {
      setAdditionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  useEffect(() => {
    fetchGuestAdditions();
  }, [fetchGuestAdditions]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/guests/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guests-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting guests:', error);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/guests/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'guest-import-template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleMarkAdditionReviewed = async (memberId: string) => {
    try {
      await fetch(`/api/admin/guest-additions/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_reviewed: true }),
      });
      fetchGuestAdditions();
    } catch (error) {
      console.error('Error marking addition reviewed:', error);
    }
  };

  const newAdditionsCount = guestAdditions.filter((a) => a.is_new).length;

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle add guest
  const handleAddGuest = () => {
    setFormMode('add');
    setSelectedGuest(null);
    setIsFormModalOpen(true);
  };

  // Handle edit guest
  const handleEditGuest = async (guestId: string) => {
    try {
      // Fetch full guest details with members
      const response = await fetch(`/api/admin/guests/${guestId}`);
      const data = await response.json();

      if (data.success) {
        setFormMode('edit');
        setSelectedGuest(data.data);
        setIsFormModalOpen(true);
      } else {
        showNotification('error', 'Failed to load guest details');
      }
    } catch (error) {
      console.error('Error loading guest:', error);
      showNotification('error', 'Failed to load guest details');
    }
  };

  // Handle delete guest
  const handleDeleteGuest = (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    if (guest) {
      setGuestToDelete(guest);
      setIsDeleteDialogOpen(true);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!guestToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/guests/${guestToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Guest deleted successfully');
        setIsDeleteDialogOpen(false);
        setGuestToDelete(null);
        fetchGuests();
      } else {
        showNotification('error', data.error?.message || 'Failed to delete guest');
      }
    } catch (error) {
      console.error('Error deleting guest:', error);
      showNotification('error', 'Failed to delete guest');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle form submit
  const handleFormSubmit = async (formData: {
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsapp_number?: string | null;
    channel_preference?: string | null;
    preferred_language: string;
    members: FamilyMemberFormData[];
  }) => {
    try {
      const url =
        formMode === 'add'
          ? '/api/admin/guests'
          : `/api/admin/guests/${selectedGuest?.id}`;
      const method = formMode === 'add' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showNotification(
          'success',
          formMode === 'add' ? 'Guest added successfully' : 'Guest updated successfully'
        );
        setIsFormModalOpen(false);
        setSelectedGuest(null);
        fetchGuests();
      } else {
        throw new Error(data.error?.message || 'Failed to save guest');
      }
    } catch (error) {
      throw error; // Re-throw to let modal handle it
    }
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
                <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {guests.length} guests • Page {page} of {totalPages}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Template
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Export
              </button>
              <label className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                Import
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                      const response = await fetch('/api/admin/guests/import', {
                        method: 'POST',
                        body: formData,
                      });
                      const data = await response.json();
                      if (data.success) {
                        showNotification(
                          'success',
                          `Imported successfully! ${data.data.familiesCreated} families created.`
                        );
                        fetchGuests();
                      } else {
                        showNotification('error', data.error?.message || 'Import failed');
                      }
                    } catch (error) {
                      console.error('Import error:', error);
                      showNotification('error', 'Import failed. Please try again.');
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                onClick={handleAddGuest}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
              >
                Add Guest
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('guests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'guests'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Guest List
            </button>
            <button
              onClick={() => setActiveTab('additions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'additions'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Guest Additions
              {newAdditionsCount > 0 && (
                <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                  {newAdditionsCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {activeTab === 'guests' ? (
          <>
            {/* Filters */}
            <GuestFilters filters={filters} onFilterChange={setFilters} />

            {/* Guest Table */}
            <GuestTable
              guests={guests}
              loading={loading}
              onEdit={handleEditGuest}
              onDelete={handleDeleteGuest}
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
          </>
        ) : (
          <GuestAdditionsReview
            additions={guestAdditions}
            featureEnabled={guestAdditionsEnabled}
            onMarkReviewed={handleMarkAdditionReviewed}
            loading={additionsLoading}
          />
        )}
      </main>

      {/* Guest Form Modal */}
      <GuestFormModal
        isOpen={isFormModalOpen}
        mode={formMode}
        initialData={
          selectedGuest
            ? {
                name: selectedGuest.name,
                email: selectedGuest.email,
                phone: selectedGuest.phone,
                whatsapp_number: selectedGuest.whatsapp_number,
                channel_preference: selectedGuest.channel_preference,
                preferred_language: selectedGuest.preferred_language,
                members: selectedGuest.members.map((m) => ({
                  id: m.id,
                  name: m.name,
                  type: m.type,
                  age: m.age,
                  dietary_restrictions: m.dietary_restrictions,
                  accessibility_needs: m.accessibility_needs,
                })),
              }
            : undefined
        }
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setIsFormModalOpen(false);
          setSelectedGuest(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <GuestDeleteDialog
        isOpen={isDeleteDialogOpen}
        familyName={guestToDelete?.name || ''}
        memberCount={guestToDelete?.total_members || 0}
        hasRsvp={guestToDelete?.rsvp_status === 'submitted'}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setGuestToDelete(null);
        }}
        loading={deleteLoading}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div
            className={`rounded-lg shadow-lg p-4 ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start">
              {notification.type === 'success' ? (
                <svg
                  className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <p
                className={`text-sm ${
                  notification.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {notification.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
