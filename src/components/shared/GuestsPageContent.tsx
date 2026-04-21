/**
 * Shared Guest Management Page Content
 *
 * Used by both the Wedding Admin (/admin/guests) and Wedding Planner
 * (/planner/weddings/[id]/guests) routes. All API paths and role-specific
 * configuration are injected via props — this component is role-agnostic.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GuestTable } from '@/components/admin/GuestTable';
import { GuestFilters } from '@/components/admin/GuestFilters';
import { GuestAdditionsReview } from '@/components/admin/GuestAdditionsReview';
import { GuestFormModal } from '@/components/admin/GuestFormModal';
import { GuestDeleteDialog } from '@/components/admin/GuestDeleteDialog';
import { ReminderModal } from '@/components/admin/ReminderModal';
import { GuestTimelineModal } from '@/components/admin/GuestTimelineModal';
import { BulkEditModal, type BulkEditUpdates } from '@/components/admin/BulkEditModal';
import type { FamilyWithMembers, GiftStatus, Language, Channel, GuestLabel } from '@/types/models';
import type { FamilyMemberFormData } from '@/components/admin/FamilyMemberForm';
import { CheckmarkIcon, XMarkIcon } from '@/components/shared/NavIcons';

// ============================================================================
// TYPES
// ============================================================================

interface ReminderFamily {
  id: string;
  name: string;
  preferred_language: Language;
  channel_preference: Channel | null;
}

interface GuestWithStatus extends FamilyWithMembers {
  rsvp_status: string;
  attending_count: number;
  total_members: number;
  payment_status: GiftStatus | null;
  invitation_sent: boolean;
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
  invited_by_admin_id?: string;
  label_id?: string;
  label_id_invert?: boolean;
  search?: string;
}

interface WeddingQuestionConfig {
  save_the_date_enabled: boolean;
  transportation_question_enabled: boolean;
  transportation_question_text: string | null;
  extra_question_1_enabled: boolean;
  extra_question_1_text: string | null;
  extra_question_2_enabled: boolean;
  extra_question_2_text: string | null;
  extra_question_3_enabled: boolean;
  extra_question_3_text: string | null;
  extra_info_1_enabled: boolean;
  extra_info_1_label: string | null;
  extra_info_2_enabled: boolean;
  extra_info_2_label: string | null;
  extra_info_3_enabled: boolean;
  extra_info_3_label: string | null;
}

// ============================================================================
// PROPS
// ============================================================================

/**
 * All API paths required by this page. Built by the caller (thin page) so
 * this component never needs to know which role is active.
 *
 * Pattern:
 *   Admin  → apiBase = '/api/admin',  guests = '/api/admin/guests', ...
 *   Planner→ apiBase = '/api/planner/weddings/:id',
 *             guests = '/api/planner/weddings/:id/guests', ...
 */
export interface GuestApiPaths {
  /** Base used by modals (ReminderModal, GuestTimelineModal) */
  apiBase: string;
  /** Guest CRUD  (GET list, POST create, PATCH :id, DELETE :id) */
  guests: string;
  /** Guest labels CRUD */
  labels?: string;
  /** Guest-additions review endpoint */
  guestAdditions: string;
  /** Wedding config (question flags, gift IBAN, short code) */
  wedding: string;
  /** Admins list (for filter + form invited-by dropdown) */
  admins: string;
  /** Reminders / save-the-date */
  reminders: string;
  saveTheDate: string;
}

export interface GuestsPageContentProps {
  apiPaths: GuestApiPaths;
  /** Whether the page should be in read-only mode (disabled wedding). */
  isReadOnly: boolean;
  /**
   * Header slot — each role renders its own navigation.
   * Admin: <PrivateHeader>  |  Planner: breadcrumb back to wedding detail.
   */
  header: React.ReactNode;
  /**
   * When true, a 404 response from the guest-additions endpoint is treated as
   * "feature not available" rather than an error. Set to true for planner
   * routes where the endpoint may not yet exist.
   */
  guestAdditionsOptional?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildFilterParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.rsvp_status) params.set('rsvp_status', filters.rsvp_status);
  if (filters.attendance) params.set('attendance', filters.attendance);
  if (filters.channel) params.set('channel', filters.channel);
  if (filters.payment_status) params.set('payment_status', filters.payment_status);
  if (filters.invited_by_admin_id) params.set('invited_by_admin_id', filters.invited_by_admin_id);
  if (filters.label_id) params.set('label_id', filters.label_id);
  if (filters.label_id_invert) params.set('label_id_invert', 'true');
  if (filters.search) params.set('search', filters.search);
  return params;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GuestsPageContent({
  apiPaths,
  isReadOnly,
  header,
  guestAdditionsOptional = false,
}: GuestsPageContentProps) {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const [guests, setGuests] = useState<GuestWithStatus[]>([]);
  const [guestAdditions, setGuestAdditions] = useState<GuestAddition[]>([]);
  const [guestAdditionsEnabled, setGuestAdditionsEnabled] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [additionsLoading, setAdditionsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGuests, setTotalGuests] = useState(0);
  const [limit, setLimit] = useState(50);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'guests' | 'additions'>('guests');
  const [weddingConfig, setWeddingConfig] = useState<WeddingQuestionConfig | null>(null);
  const [weddingGiftIban, setWeddingGiftIban] = useState<string | null>(null);
  const [weddingShortCode, setWeddingShortCode] = useState<string | null>(null);
  const [copiedGeneralLink, setCopiedGeneralLink] = useState(false);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [labels, setLabels] = useState<GuestLabel[]>([]);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedGuest, setSelectedGuest] = useState<GuestWithStatus | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<GuestWithStatus | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [importingVcf, setImportingVcf] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Reminder modal state
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderFamily, setReminderFamily] = useState<ReminderFamily | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderMode, setReminderMode] = useState<'reminder' | 'save_the_date'>('reminder');

  // Timeline modal state
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedTimelineFamilyId, setSelectedTimelineFamilyId] = useState<string | null>(null);
  const [selectedTimelineFamilyName, setSelectedTimelineFamilyName] = useState<string | null>(null);

  const [isExtraActionsExpanded, setIsExtraActionsExpanded] = useState(false);
  // Bulk reminder state
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const selectedGuestIdsRef = useRef(selectedGuestIds);
  useEffect(() => { selectedGuestIdsRef.current = selectedGuestIds; }, [selectedGuestIds]);

  // -------------------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------------------

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams(filters);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const response = await fetch(`${apiPaths.guests}?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        setGuests(data.data.items);
        setTotalPages(data.data.pagination.totalPages);
        setTotalGuests(data.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  }, [apiPaths.guests, page, limit, filters]);

  const fetchGuestAdditions = useCallback(async () => {
    setAdditionsLoading(true);
    try {
      const response = await fetch(apiPaths.guestAdditions);
      if (!response.ok) {
        if (guestAdditionsOptional) {
          setGuestAdditions([]);
          setGuestAdditionsEnabled(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      if (data.success) {
        setGuestAdditions(data.data);
        setGuestAdditionsEnabled(data.meta?.feature_enabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching guest additions:', error);
      if (guestAdditionsOptional) {
        setGuestAdditions([]);
        setGuestAdditionsEnabled(false);
      }
    } finally {
      setAdditionsLoading(false);
    }
  }, [apiPaths.guestAdditions, guestAdditionsOptional]);

  const fetchWeddingConfig = useCallback(async () => {
    try {
      const response = await fetch(apiPaths.wedding);
      const data = await response.json();

      if (data.success) {
        setWeddingConfig({
          save_the_date_enabled: data.data.save_the_date_enabled || false,
          transportation_question_enabled: data.data.transportation_question_enabled,
          transportation_question_text: data.data.transportation_question_text,
          extra_question_1_enabled: data.data.extra_question_1_enabled,
          extra_question_1_text: data.data.extra_question_1_text,
          extra_question_2_enabled: data.data.extra_question_2_enabled,
          extra_question_2_text: data.data.extra_question_2_text,
          extra_question_3_enabled: data.data.extra_question_3_enabled,
          extra_question_3_text: data.data.extra_question_3_text,
          extra_info_1_enabled: data.data.extra_info_1_enabled,
          extra_info_1_label: data.data.extra_info_1_label,
          extra_info_2_enabled: data.data.extra_info_2_enabled,
          extra_info_2_label: data.data.extra_info_2_label,
          extra_info_3_enabled: data.data.extra_info_3_enabled,
          extra_info_3_label: data.data.extra_info_3_label,
        });
        setWeddingGiftIban(data.data.gift_iban || null);
        setWeddingShortCode(data.data.short_url_initials || null);
      }
    } catch (error) {
      console.error('Error fetching wedding config:', error);
    }
  }, [apiPaths.wedding]);

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetch(apiPaths.admins);
      const data = await response.json();
      if (data.success) {
        setAdmins(data.data);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  }, [apiPaths.admins]);

  const fetchLabels = useCallback(async () => {
    if (!apiPaths.labels) return;
    try {
      const response = await fetch(apiPaths.labels);
      const data = await response.json();
      if (data.success) {
        setLabels(data.data);
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  }, [apiPaths.labels]);

  const handleCreateLabel = useCallback(async (name: string): Promise<GuestLabel> => {
    if (!apiPaths.labels) throw new Error('Labels endpoint not configured');
    const response = await fetch(apiPaths.labels, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to create label');
    setLabels((prev) => [...prev, data.data]);
    return data.data as GuestLabel;
  }, [apiPaths.labels]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  // Initialize filters from URL search params
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setFilters((prev) => ({ ...prev, search }));
    }
  }, [searchParams]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);
  useEffect(() => { fetchGuestAdditions(); }, [fetchGuestAdditions]);
  useEffect(() => { fetchWeddingConfig(); }, [fetchWeddingConfig]);
  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);
  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  // -------------------------------------------------------------------------
  // EXPORT / IMPORT
  // -------------------------------------------------------------------------

  const handleExport = async () => {
    try {
      const response = await fetch(`${apiPaths.guests}/export`);
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
      const response = await fetch(`${apiPaths.guests}/template`);
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
      await fetch(`${apiPaths.guestAdditions}/${memberId}`, {
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

  // -------------------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------------------

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // -------------------------------------------------------------------------
  // GUEST CRUD
  // -------------------------------------------------------------------------

  const handleAddGuest = () => {
    setFormMode('add');
    setSelectedGuest(null);
    setIsFormModalOpen(true);
  };

  const handleEditGuest = async (guestId: string) => {
    try {
      const response = await fetch(`${apiPaths.guests}/${guestId}`);
      const data = await response.json();

      if (data.success) {
        setFormMode('edit');
        setSelectedGuest(data.data);
        setIsFormModalOpen(true);
      } else {
        showNotification('error', t('common.errors.generic'));
      }
    } catch (error) {
      console.error('Error loading guest:', error);
      showNotification('error', t('common.errors.generic'));
    }
  };

  const handleCopyGeneralInvLink = async () => {
    if (!weddingShortCode) return;
    const url = `${window.location.origin}/w/${weddingShortCode}`;
    await navigator.clipboard.writeText(url);
    setCopiedGeneralLink(true);
    setTimeout(() => setCopiedGeneralLink(false), 2000);
  };

  const handleCopyInvLink = async (guestId: string): Promise<string> => {
    const response = await fetch(`${apiPaths.guests}/${guestId}/inv-link`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch invitation link');
    return data.data.path as string;
  };

  const handleCopyWhatsAppText = async (guestId: string): Promise<string> => {
    const response = await fetch(`${apiPaths.guests}/${guestId}/whatsapp-text`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch WhatsApp text');
    return data.data.text as string;
  };

  const handleDeleteGuest = (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    if (guest) {
      setGuestToDelete(guest);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!guestToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`${apiPaths.guests}/${guestToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        showNotification('success', t('common.success.deleted'));
        setIsDeleteDialogOpen(false);
        setGuestToDelete(null);
        fetchGuests();
      } else {
        showNotification('error', data.error?.message || t('common.errors.generic'));
      }
    } catch (error) {
      console.error('Error deleting guest:', error);
      showNotification('error', t('common.errors.generic'));
    } finally {
      setDeleteLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // REMINDERS
  // -------------------------------------------------------------------------

  const handleSendReminder = (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    if (guest) {
      setReminderFamily({
        id: guest.id,
        name: guest.name,
        preferred_language: guest.preferred_language,
        channel_preference: guest.channel_preference,
      });
      setReminderMode('reminder');
      setIsReminderModalOpen(true);
    }
  };

  const handleViewTimeline = (guestId: string, guestName: string) => {
    setSelectedTimelineFamilyId(guestId);
    setSelectedTimelineFamilyName(guestName);
    setIsTimelineModalOpen(true);
  };

  const handleSendSaveTheDate = async (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    if (guest) {
      setReminderFamily({
        id: guest.id,
        name: guest.name,
        preferred_language: guest.preferred_language,
        channel_preference: guest.channel_preference,
      });
      setReminderMode('save_the_date');
      setIsReminderModalOpen(true);
    }
  };

  const handleSendReminders = async (channel: Channel | 'PREFERRED', validFamilyIds?: string[]) => {
    if (!reminderFamily) return;

    setReminderLoading(true);
    try {
      const endpoint = reminderMode === 'save_the_date' ? apiPaths.saveTheDate : apiPaths.reminders;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          family_ids: validFamilyIds || [reminderFamily.id],
        }),
      });
      const data = await response.json();

      if (data.success) {
        if (data.data.wa_links && data.data.wa_links.length > 0) {
          data.data.wa_links.forEach((item: { wa_link: string }) => {
            window.open(item.wa_link, '_blank');
          });
        }
        
        if (data.data.sent_count > 0) {
          if (reminderMode === 'save_the_date') {
            showNotification('success', t('admin.saveTheDate.sent', { count: data.data.sent_count }));
            fetchGuests();
          } else {
            showNotification('success', t('admin.reminders.sent', { count: data.data.sent_count }));
          }
        } else if (data.data.failed_count > 0) {
          showNotification('error', t('common.errors.generic'));
        }
      } else {
        throw new Error(data.error?.message || t('common.errors.generic'));
      }
    } catch (error) {
      throw error;
    } finally {
      setReminderLoading(false);
    }
  };

  const handleBulkReminderSend = async (channel: Channel | 'PREFERRED', validFamilyIds?: string[]) => {
    setReminderLoading(true);
    try {
      const response = await fetch(apiPaths.reminders, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          family_ids: validFamilyIds || selectedGuestIds,
        }),
      });
      const data = await response.json();

      if (data.success) {
        if (data.data.wa_links && data.data.wa_links.length > 0) {
          data.data.wa_links.forEach((item: { wa_link: string }) => {
            window.open(item.wa_link, '_blank');
          });
        }
        
        if (data.data.sent_count > 0) {
          showNotification('success', t('admin.reminders.sent', { count: data.data.sent_count }));
          setSelectedGuestIds([]);
        } else if (data.data.failed_count > 0) {
          showNotification('error', t('common.errors.generic'));
        }
      } else {
        throw new Error(data.error?.message || t('common.errors.generic'));
      }
    } catch (error) {
      throw error;
    } finally {
      setReminderLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // SELECTION & BULK ACTIONS
  // -------------------------------------------------------------------------

  const handleSelectGuest = (guestId: string, selected: boolean) => {
    setSelectedGuestIds(prev =>
      selected ? [...prev, guestId] : prev.filter(id => id !== guestId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const selectableIds = guests
        .filter(g => g.rsvp_status !== 'submitted')
        .map(g => g.id);
      setSelectedGuestIds(selectableIds);
    } else {
      setSelectedGuestIds([]);
    }
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageSelectableIds = guests
      .filter(g => g.rsvp_status !== 'submitted')
      .map(g => g.id);
    const allCurrentPageSelected = currentPageSelectableIds.length > 0 &&
      currentPageSelectableIds.every(id => selectedGuestIds.includes(id));
    if (allCurrentPageSelected) {
      setSelectedGuestIds(prev => prev.filter(id => !currentPageSelectableIds.includes(id)));
    } else {
      setSelectedGuestIds(prev => Array.from(new Set([...prev, ...currentPageSelectableIds])));
    }
  };

  const handleSelectAllItems = useCallback(async () => {
    if (selectedGuestIdsRef.current.length > 0) {
      setSelectedGuestIds([]);
      return;
    }
    setIsSelectingAll(true);
    try {
      const params = buildFilterParams(filters);
      params.set('ids_only', 'true');
      const response = await fetch(`${apiPaths.guests}?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setSelectedGuestIds(data.data.ids);
      }
    } catch (error) {
      console.error('Error fetching all guest IDs:', error);
      showNotification('error', t('common.errors.generic'));
    } finally {
      setIsSelectingAll(false);
    }
  }, [apiPaths.guests, filters]);

  const handleOpenBulkReminderModal = () => {
    setReminderFamily(null);
    setReminderMode('reminder');
    setIsReminderModalOpen(true);
  };

  const [isBulkActionsExpanded, setIsBulkActionsExpanded] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  const handleBulkEdit = async (updates: BulkEditUpdates) => {
    if (selectedGuestIds.length === 0) return;

    try {
      const response = await fetch(`${apiPaths.guests}/bulk-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_ids: selectedGuestIds, updates }),
      });
      const data = await response.json();

      if (data.success) {
        showNotification('success', t('admin.guests.bulkEdit.updateSuccess', { count: data.data.updated_families }));
        setIsBulkEditModalOpen(false);
        fetchGuests();
      } else {
        throw new Error(data.error?.message || t('common.errors.generic'));
      }
    } catch (error) {
      console.error('Error bulk updating guests:', error);
      throw error;
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGuestIds.length === 0) return;

    setBulkDeleteLoading(true);
    try {
      const response = await fetch(`${apiPaths.guests}/bulk-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_ids: selectedGuestIds }),
      });
      const data = await response.json();

      if (data.success) {
        showNotification('success', t('admin.guests.deleteSuccess', { count: data.data.deleted_count }));
        setIsBulkDeleteDialogOpen(false);
        setSelectedGuestIds([]);
        fetchGuests();
      } else {
        showNotification('error', data.error?.message || t('common.errors.generic'));
      }
    } catch (error) {
      console.error('Error bulk deleting guests:', error);
      showNotification('error', t('common.errors.generic'));
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // FORM SUBMIT
  // -------------------------------------------------------------------------

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
          ? apiPaths.guests
          : `${apiPaths.guests}/${selectedGuest?.id}`;
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
          formMode === 'add' ? t('common.success.created') : t('common.success.updated')
        );
        setIsFormModalOpen(false);
        setSelectedGuest(null);
        fetchGuests();
      } else {
        throw new Error(data.error?.message || t('common.errors.generic'));
      }
    } catch (error) {
      throw error;
    }
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {header}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-white shadow-sm rounded-lg p-4 border border-gray-100">
          <div>
            <p className="text-sm text-gray-600">
              {totalGuests} {t('admin.guests.list')} • {t('common.pagination.page')} {page} {t('common.pagination.of')} {totalPages}
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={handleAddGuest}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-rose-600 border border-transparent rounded-md hover:bg-rose-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('admin.guests.add')}
            </button>
          )}
        </div>

        {/* Secondary Actions (Import/Export) - Collapsible on mobile */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {/* Mobile Toggle */}
          <button
            onClick={() => setIsExtraActionsExpanded(!isExtraActionsExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 lg:hidden"
          >
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('common.buttons.export')} / {t('common.buttons.import')}
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${isExtraActionsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Actions Content */}
          <div className={`${isExtraActionsExpanded ? 'block' : 'hidden'} lg:block p-4`}>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('admin.guests.template')}
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.buttons.export')}
              </button>
              {!isReadOnly && (
                <label className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer text-center">
                  {t('common.buttons.import')}
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
                        const response = await fetch(`${apiPaths.guests}/import`, {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await response.json();
                        if (data.success) {
                          showNotification('success', t('admin.guests.importSuccess'));
                          fetchGuests();
                        } else {
                          showNotification('error', data.error?.message || t('admin.guests.importError'));
                        }
                      } catch (error) {
                        console.error('Import error:', error);
                        showNotification('error', t('admin.guests.importError'));
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
              {!isReadOnly && (
                <label
                  className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md text-center inline-flex items-center gap-2 ${
                    importingVcf
                      ? 'opacity-60 cursor-not-allowed pointer-events-none'
                      : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  {importingVcf ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-gray-500 shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t('admin.guests.importingVcf')}
                    </>
                  ) : (
                    t('admin.guests.importVcf')
                  )}
                  <input
                    type="file"
                    accept=".vcf"
                    className="hidden"
                    disabled={importingVcf}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append('file', file);
                      setImportingVcf(true);

                      try {
                        const response = await fetch(`${apiPaths.guests}/import-vcf`, {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await response.json();
                        if (data.success) {
                          showNotification(
                            'success',
                            `${data.data.familiesCreated} ${data.data.familiesCreated === 1 ? 'family' : 'families'} imported successfully`
                          );
                          fetchGuests();
                        } else {
                          showNotification('error', data.error?.message || 'VCF import failed');
                        }
                      } catch (error) {
                        console.error('VCF import error:', error);
                        showNotification('error', 'VCF import failed');
                      } finally {
                        setImportingVcf(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('guests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'guests'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('admin.guests.list')}
            </button>
            <button
              onClick={() => setActiveTab('additions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'additions'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('admin.guestAdditions.title')}
              {newAdditionsCount > 0 && (
                <span className="ml-2 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-xs">
                  {newAdditionsCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {activeTab === 'guests' ? (
          <>
            {/* Filters */}
            <GuestFilters filters={filters} admins={admins} labels={labels} onFilterChange={handleFilterChange} />

            {/* Bulk Actions Section */}
            {!isReadOnly && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
                {/* Mobile Toggle Header */}
                <button
                  onClick={() => setIsBulkActionsExpanded(!isBulkActionsExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 lg:hidden"
                >
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      {t('admin.guests.bulkActions')}
                    </h3>
                    {selectedGuestIds.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        {selectedGuestIds.length}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isBulkActionsExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Bulk Actions Content */}
                <div className={`${isBulkActionsExpanded ? 'block' : 'hidden'} lg:block p-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="hidden lg:flex items-center gap-4">
                      <h3 className="text-sm font-medium text-gray-900">
                        {t('admin.guests.bulkActions')}
                      </h3>
                      {selectedGuestIds.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                          {selectedGuestIds.length} {t('admin.guests.selected')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                      <button
                        onClick={handleSelectAllCurrentPage}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {t('admin.guests.selectPage')}
                      </button>
                      <button
                        onClick={handleSelectAllItems}
                        disabled={isSelectingAll}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isSelectingAll ? '…' : selectedGuestIds.length > 0 ? t('admin.guests.deselectAll') : t('admin.guests.selectAll')}
                      </button>
                      {weddingShortCode && (
                        <button
                          onClick={handleCopyGeneralInvLink}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                        >
                          {copiedGeneralLink ? '✓' : t('admin.guests.copyGeneralInvitationLink')}
                        </button>
                      )}
                      <button
                        onClick={() => setIsBulkDeleteDialogOpen(true)}
                        disabled={selectedGuestIds.length === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('admin.guests.deleteSelected')}
                      </button>
                      <button
                        onClick={() => setIsBulkEditModalOpen(true)}
                        disabled={selectedGuestIds.length === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('admin.guests.bulkEdit.button')}
                      </button>
                      <button
                        onClick={handleOpenBulkReminderModal}
                        disabled={selectedGuestIds.length === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-rose-600 border border-transparent rounded-md hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('admin.reminders.send')}
                      </button>
                    </div>
                  </div>
                  {selectedGuestIds.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {t('admin.guests.selectGuestsHint')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Top pagination nav — always visible so mobile users know controls exist */}
            {totalGuests > 0 && (
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500">{t('common.pagination.total', { count: totalGuests })}</span>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                    title={t('common.pagination.first')}
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                  >
                    {t('common.buttons.previous')}
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 whitespace-nowrap">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                  >
                    {t('common.buttons.next')}
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                    title={t('common.pagination.last')}
                  >
                    »»
                  </button>
                </nav>
              </div>
            )}

            {/* Guest Table */}
            <GuestTable
              guests={guests}
              loading={loading}
              onEdit={handleEditGuest}
              onDelete={handleDeleteGuest}
              onSendReminder={handleSendReminder}
              onSendSaveTheDate={weddingConfig?.save_the_date_enabled ? handleSendSaveTheDate : undefined}
              onViewTimeline={handleViewTimeline}
              onCopyInvLink={handleCopyInvLink}
              onCopyWhatsAppText={handleCopyWhatsAppText}
              showCheckboxes={!isReadOnly}
              selectedGuestIds={selectedGuestIds}
              onSelectGuest={handleSelectGuest}
              onSelectAll={handleSelectAll}
            />

            {/* Bottom pagination: rows-per-page + full nav */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Rows per page */}
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>{t('common.pagination.rowsPerPage')}</span>
                <select
                  value={limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-gray-500">{t('common.pagination.total', { count: totalGuests })}</span>
              </div>

              {/* Page navigation — always visible */}
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                  title={t('common.pagination.first')}
                >
                  ««
                </button>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                >
                  {t('common.buttons.previous')}
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {t('common.pagination.page')} {page} {t('common.pagination.of')} {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                >
                  {t('common.buttons.next')}
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                  title={t('common.pagination.last')}
                >
                  »»
                </button>
              </nav>
            </div>
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
        admins={admins}
        labels={labels}
        onCreateLabel={apiPaths.labels ? handleCreateLabel : undefined}
        initialData={
          selectedGuest
            ? {
                name: selectedGuest.name,
                email: selectedGuest.email,
                phone: selectedGuest.phone,
                whatsapp_number: selectedGuest.whatsapp_number,
                channel_preference: selectedGuest.channel_preference,
                preferred_language: selectedGuest.preferred_language,
                invited_by_admin_id: selectedGuest.invited_by_admin_id || null,
                private_notes: selectedGuest.private_notes || null,
                label_ids: (selectedGuest.labels || []).map((l) => l.id),
                members: selectedGuest.members.map((m) => ({
                  id: m.id,
                  name: m.name,
                  type: m.type,
                  age: m.age,
                  attending: m.attending,
                  dietary_restrictions: m.dietary_restrictions,
                  accessibility_needs: m.accessibility_needs,
                })),
                transportation_answer: selectedGuest.transportation_answer,
                extra_question_1_answer: selectedGuest.extra_question_1_answer,
                extra_question_2_answer: selectedGuest.extra_question_2_answer,
                extra_question_3_answer: selectedGuest.extra_question_3_answer,
                extra_info_1_value: selectedGuest.extra_info_1_value,
                extra_info_2_value: selectedGuest.extra_info_2_value,
                extra_info_3_value: selectedGuest.extra_info_3_value,
              }
            : undefined
        }
        weddingConfig={weddingConfig || undefined}
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

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setReminderFamily(null);
        }}
        eligibleFamilies={
          reminderFamily
            ? [reminderFamily]
            : guests
                .filter(g => selectedGuestIds.includes(g.id))
                .map(g => ({
                  id: g.id,
                  name: g.name,
                  preferred_language: g.preferred_language,
                  channel_preference: g.channel_preference,
                }))
        }
        onSendReminders={reminderFamily ? handleSendReminders : handleBulkReminderSend}
        loading={reminderLoading}
        weddingGiftIban={weddingGiftIban}
        mode={reminderMode}
        apiBase={apiPaths.apiBase}
      />

      {/* Timeline Modal */}
      <GuestTimelineModal
        isOpen={isTimelineModalOpen}
        familyId={selectedTimelineFamilyId}
        familyName={selectedTimelineFamilyName}
        onClose={() => {
          setIsTimelineModalOpen(false);
          setSelectedTimelineFamilyId(null);
          setSelectedTimelineFamilyName(null);
        }}
        apiBase={apiPaths.apiBase}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedCount={selectedGuestIds.length}
        admins={admins}
        labels={labels}
        onSave={handleBulkEdit}
      />

      {/* Bulk Delete Confirmation Dialog */}
      {isBulkDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !bulkDeleteLoading && setIsBulkDeleteDialogOpen(false)} />

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      {t('admin.guests.bulkDeleteTitle')}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {t('admin.guests.bulkDeleteConfirm', { count: selectedGuestIds.length })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteLoading}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkDeleteLoading ? t('common.buttons.deleting') : t('common.buttons.delete')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteDialogOpen(false)}
                  disabled={bulkDeleteLoading}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.buttons.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <CheckmarkIcon
                  className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0"
                />
              ) : (
                <XMarkIcon
                  className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                />
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
