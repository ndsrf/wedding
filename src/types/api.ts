/**
 * API Request/Response Types
 *
 * TypeScript type definitions for API endpoints.
 * Includes request bodies, response formats, and the generic APIResponse wrapper.
 */

import type {
  Wedding,
  WeddingPlanner,
  WeddingAdmin,
  Family,
  FamilyMember,
  Gift,
  Theme,
  TrackingEvent,
  Notification,
  Language,
  Channel,
  PaymentMode,
  GiftStatus,
  EventType,
  WeddingWithStats,
  FamilyWithMembers,
  GiftWithFamily,
  UpdateFamily,
  FamilyFilter,
  NotificationFilter,
  Table,
} from './models';
import type { ThemeConfig } from './theme';

// ============================================================================
// GENERIC API RESPONSE WRAPPER
// ============================================================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

export interface APIMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

// Helper type for paginated responses
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'master_admin' | 'planner' | 'wedding_admin';
  wedding_id?: string; // null for master admin and planners
  planner_id?: string; // null for master admin
  preferred_language: Language;
  last_login_provider: string;
}

export interface MagicLinkValidation {
  valid: boolean;
  family?: FamilyWithMembers;
  wedding?: Wedding;
  theme?: Theme;
}

// ============================================================================
// MASTER ADMIN API TYPES
// ============================================================================

// POST /api/master/planners
export interface CreatePlannerRequest {
  name: string;
  email: string;
  logo_url?: string;
}

export type CreatePlannerResponse = APIResponse<WeddingPlanner>;

// GET /api/master/planners
export interface ListPlannersQuery {
  page?: number;
  limit?: number;
}

export type ListPlannersResponse = APIResponse<PaginatedResponse<WeddingPlanner>>;

// PATCH /api/master/planners/:id
export interface UpdatePlannerRequest {
  enabled?: boolean;
}

export type UpdatePlannerResponse = APIResponse<WeddingPlanner>;

// GET /api/master/weddings
export interface ListMasterWeddingsQuery {
  page?: number;
  limit?: number;
  planner_id?: string;
}

// Extended wedding type for master admin view with planner info
export interface MasterWeddingOverview {
  id: string;
  planner_id: string;
  planner_name: string;
  planner_email: string;
  theme_id: string | null;
  theme_name: string | null;
  couple_names: string;
  wedding_date: Date;
  wedding_time: string;
  location: string;
  rsvp_cutoff_date: Date;
  dress_code: string | null;
  additional_info: string | null;
  payment_tracking_mode: PaymentMode;
  allow_guest_additions: boolean;
  default_language: Language;
  status: string;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string | null;
  family_count: number;
  admin_count: number;
}

export type ListMasterWeddingsResponse = APIResponse<PaginatedResponse<MasterWeddingOverview>>;

// GET /api/master/analytics
export interface MasterAnalytics {
  total_planners: number;
  active_planners: number;
  total_weddings: number;
  total_guests: number;
}

export type MasterAnalyticsResponse = APIResponse<MasterAnalytics>;

// ============================================================================
// PLANNER API TYPES
// ============================================================================

// POST /api/planner/weddings
export interface CreateWeddingRequest {
  couple_names: string;
  wedding_date: string; // ISO date string
  wedding_time: string;
  location: string;
  rsvp_cutoff_date: string; // ISO date string
  dress_code?: string;
  additional_info?: string;
  theme_id?: string | null;
  payment_tracking_mode: PaymentMode;
  allow_guest_additions: boolean;
  default_language: Language;
  wedding_country?: string;
  whatsapp_mode?: import('@prisma/client').WhatsAppMode;
}

export type CreateWeddingResponse = APIResponse<Wedding>;

// GET /api/planner/weddings
export interface ListPlannerWeddingsQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export type ListPlannerWeddingsResponse = APIResponse<PaginatedResponse<WeddingWithStats>>;

// GET /api/planner/weddings/:id
export type GetWeddingResponse = APIResponse<WeddingWithStats>;

// PATCH /api/planner/weddings/:id
export type UpdateWeddingRequest = Partial<CreateWeddingRequest>;
export type UpdateWeddingResponse = APIResponse<Wedding>;

// PATCH /api/planner/weddings/:id/status
export interface UpdateWeddingStatusRequest {
  action: 'disable' | 'enable' | 'delete' | 'undelete';
}

export interface UpdateWeddingStatusResponse extends APIResponse {
  success: true;
  data: {
    id: string;
    status: string;
    is_disabled: boolean;
    disabled_at: Date | null;
    deleted_at: Date | null;
  };
}

// GET /api/planner/weddings/deleted
export type ListDeletedWeddingsResponse = APIResponse<PaginatedResponse<WeddingWithStats>>;

// POST /api/planner/weddings/:id/admins
export interface InviteWeddingAdminRequest {
  email: string;
  name: string;
}

export type InviteWeddingAdminResponse = APIResponse<WeddingAdmin>;

// DELETE /api/planner/weddings/:id/admins/:admin_id
export type RemoveWeddingAdminResponse = APIResponse<{ success: boolean }>;

// GET /api/planner/stats
export interface PlannerStats {
  wedding_count: number;
  total_guests: number;
  rsvp_completion_percentage: number;
  upcoming_weddings: Wedding[];
}

export type PlannerStatsResponse = APIResponse<PlannerStats>;

// ============================================================================
// THEME API TYPES
// ============================================================================

// GET /api/planner/themes
export type ListThemesResponse = APIResponse<Theme[]>;

// POST /api/planner/themes
export interface CreateThemeRequest {
  name: string;
  description: string;
  config: ThemeConfig;
  preview_image_url?: string;
}

export type CreateThemeResponse = APIResponse<Theme>;

// PATCH /api/planner/themes/:id
export interface UpdateThemeRequest {
  name?: string;
  description?: string;
  config?: ThemeConfig;
  preview_image_url?: string;
}

export type UpdateThemeResponse = APIResponse<Theme>;

// DELETE /api/planner/themes/:id
export interface DeleteThemeResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
    wedding_count?: number;
  };
}

// ============================================================================
// WEDDING ADMIN API TYPES
// ============================================================================

// GET /api/admin/wedding
export interface WeddingDetails extends WeddingWithStats {
  planner_name: string;
  admin_count: number;
  available_themes: Theme[];
}

export type GetWeddingDetailsResponse = APIResponse<WeddingDetails>;

// PATCH /api/admin/wedding
export interface UpdateWeddingConfigRequest {
  rsvp_cutoff_date?: string; // ISO date string
  payment_tracking_mode?: PaymentMode;
  gift_iban?: string | null;
  theme_id?: string | null;
  allow_guest_additions?: boolean;
  dress_code?: string | null;
  additional_info?: string | null;
  wedding_country?: string | null;

  // RSVP Configuration - Transportation question
  transportation_question_enabled?: boolean;
  transportation_question_text?: string | null;

  // RSVP Configuration - Dietary restrictions
  dietary_restrictions_enabled?: boolean;

  // Messaging Configuration - Save the Date
  save_the_date_enabled?: boolean;

  // RSVP Configuration - Extra Yes/No questions (up to 3)
  extra_question_1_enabled?: boolean;
  extra_question_1_text?: string | null;
  extra_question_2_enabled?: boolean;
  extra_question_2_text?: string | null;
  extra_question_3_enabled?: boolean;
  extra_question_3_text?: string | null;

  // RSVP Configuration - Extra mandatory info fields (up to 3)
  extra_info_1_enabled?: boolean;
  extra_info_1_label?: string | null;
  extra_info_2_enabled?: boolean;
  extra_info_2_label?: string | null;
  extra_info_3_enabled?: boolean;
  extra_info_3_label?: string | null;
}

export type UpdateWeddingConfigResponse = APIResponse<Wedding>;

// GET /api/admin/guests
export interface ListGuestsQuery extends Partial<FamilyFilter> {
  page?: number;
  limit?: number;
}

export type ListGuestsResponse = APIResponse<PaginatedResponse<FamilyWithMembers>>;

// PATCH /api/admin/guests/:id
export type UpdateGuestRequest = UpdateFamily;
export type UpdateGuestResponse = APIResponse<Family>;

// POST /api/admin/guests/import
export interface ImportGuestsResult {
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}

export type ImportGuestsResponse = APIResponse<ImportGuestsResult>;

// GET /api/admin/guests/export
// Returns file download (Excel/CSV)

// GET /api/admin/guests/template
// Returns file download (Excel template)

// ============================================================================
// NOTIFICATION & REMINDER API TYPES
// ============================================================================

// GET /api/admin/notifications
export interface ListNotificationsQuery extends Partial<NotificationFilter> {
  page?: number;
  limit?: number;
}

export interface NotificationWithUnreadCount {
  notifications: Notification[];
  unread_count: number;
}

export type ListNotificationsResponse = APIResponse<PaginatedResponse<Notification> & { unread_count: number }>;

// PATCH /api/admin/notifications/:id/read
export type MarkNotificationReadResponse = APIResponse<Notification>;

// POST /api/admin/notifications/export
export interface ExportNotificationsRequest {
  format: 'excel' | 'csv';
  filters?: Partial<NotificationFilter>;
}
// Returns file download

// POST /api/admin/reminders
export interface SendRemindersRequest {
  channel: Channel | 'PREFERRED';
  message_template?: string; // Optional custom message
  family_ids?: string[]; // Optional: specific families to send to
}

export interface SendRemindersResult {
  sent_count: number;
  failed_count: number;
  recipient_families: string[]; // Family IDs
}

export type SendRemindersResponse = APIResponse<SendRemindersResult>;

// POST /api/admin/reminders/validate
export interface ValidateRemindersRequest {
  channel: Channel | 'PREFERRED';
  family_ids?: string[];
}

export interface ValidateRemindersResult {
  valid_families: Array<{
    id: string;
    name: string;
    channel: Channel;
  }>;
  invalid_families: Array<{
    id: string;
    name: string;
    missing_info: 'email' | 'phone' | 'whatsapp_number';
    expected_channel: Channel;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

export type ValidateRemindersResponse = APIResponse<ValidateRemindersResult>;

// GET /api/admin/reminders/preview
export interface ReminderPreview {
  eligible_families: number;
  families: Array<{
    id: string;
    name: string;
    preferred_language: Language;
    channel_preference: Channel | null;
  }>;
}

export type ReminderPreviewResponse = APIResponse<ReminderPreview>;

// ============================================================================
// PAYMENT API TYPES
// ============================================================================

// GET /api/admin/payments
export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  status?: GiftStatus;
  family_id?: string;
}

export type ListPaymentsResponse = APIResponse<PaginatedResponse<GiftWithFamily>>;

// POST /api/admin/payments
export interface RecordPaymentRequest {
  family_id: string;
  amount: number;
  transaction_date: string; // ISO date string
  reference_code_used?: string;
}

export type RecordPaymentResponse = APIResponse<Gift>;

// PATCH /api/admin/payments/:id
export interface UpdatePaymentRequest {
  status?: GiftStatus;
  amount?: number;
  transaction_date?: string;
}

export type UpdatePaymentResponse = APIResponse<Gift>;

// ============================================================================
// GUEST ADDITION REVIEW API TYPES
// ============================================================================

// GET /api/admin/guest-additions
export interface GuestAddition extends FamilyMember {
  family_name: string;
  is_new: boolean; // True if not yet reviewed
}

export type ListGuestAdditionsResponse = APIResponse<GuestAddition[]>;

// PATCH /api/admin/guest-additions/:id
export interface UpdateGuestAdditionRequest {
  name?: string;
  type?: string;
  age?: number;
}

export type UpdateGuestAdditionResponse = APIResponse<FamilyMember>;

// GET /api/guest/:token
export interface GuestRSVPPageData {
  family: FamilyWithMembers;
  wedding: {
    id: string;
    couple_names: string;
    wedding_date: string;
    wedding_time: string;
    location: string;
    rsvp_cutoff_date: string;
    dress_code: string | null;
    additional_info: string | null;
    allow_guest_additions: boolean;
    default_language: Language;
    payment_tracking_mode: PaymentMode;
    gift_iban: string | null;

    // RSVP Configuration - Transportation question
    transportation_question_enabled: boolean;
    transportation_question_text: string | null;

    // RSVP Configuration - Dietary restrictions
    dietary_restrictions_enabled: boolean;

    // RSVP Configuration - Extra Yes/No questions (up to 3)
    extra_question_1_enabled: boolean;
    extra_question_1_text: string | null;
    extra_question_2_enabled: boolean;
    extra_question_2_text: string | null;
    extra_question_3_enabled: boolean;
    extra_question_3_text: string | null;

    // RSVP Configuration - Extra mandatory info fields (up to 3)
    extra_info_1_enabled: boolean;
    extra_info_1_label: string | null;
    extra_info_2_enabled: boolean;
    extra_info_2_label: string | null;
    extra_info_3_enabled: boolean;
    extra_info_3_label: string | null;
  };
  theme: Theme;
  invitation_template?: {
    id: string;
    name: string;
    design: unknown; // TemplateDesign (stored as JSON in DB)
  };
  rsvp_cutoff_passed: boolean;
  has_submitted_rsvp: boolean;
}

export type GetGuestRSVPPageResponse = APIResponse<GuestRSVPPageData>;

// POST /api/guest/:token/rsvp
export interface SubmitRSVPRequest {
  members: Array<{
    id: string;
    attending: boolean;
    dietary_restrictions?: string;
    accessibility_needs?: string;
  }>;
  // RSVP Question Answers (family-level)
  transportation_answer?: boolean;
  extra_question_1_answer?: boolean;
  extra_question_2_answer?: boolean;
  extra_question_3_answer?: boolean;
  extra_info_1_value?: string;
  extra_info_2_value?: string;
  extra_info_3_value?: string;
}

export interface SubmitRSVPResult {
  success: boolean;
  confirmation_message: string;
}

export type SubmitRSVPResponse = APIResponse<SubmitRSVPResult>;

// POST /api/guest/:token/member
export interface AddFamilyMemberRequest {
  name: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  age?: number;
}

export type AddFamilyMemberResponse = APIResponse<FamilyMember>;

// PATCH /api/guest/:token/language
export interface UpdateLanguageRequest {
  language: Language;
}

export type UpdateLanguageResponse = APIResponse<{ preferred_language: Language }>;

// GET /api/guest/:token/payment
export interface PaymentInfo {
  payment_mode: PaymentMode;
  iban: string;
  reference_code: string | null; // Only for AUTOMATED mode
  payment_status: GiftStatus | null;
  amount_paid: number | null;
}

export type GetPaymentInfoResponse = APIResponse<PaymentInfo>;

// ============================================================================
// TRACKING API TYPES (Internal use)
// ============================================================================

export interface CreateTrackingEventRequest {
  family_id: string;
  wedding_id: string;
  event_type: EventType;
  channel?: Channel;
  metadata?: Record<string, unknown>;
  admin_triggered?: boolean;
}

export type CreateTrackingEventResponse = APIResponse<TrackingEvent>;

// ============================================================================
// MESSAGE TEMPLATE API TYPES
// ============================================================================

import type { MessageTemplate, TemplateType } from '@prisma/client';

// GET /api/admin/templates
export interface ListTemplatesQuery {
  type?: TemplateType;
  language?: Language;
  channel?: Channel;
  page?: number;
  limit?: number;
}

export type ListTemplatesResponse = APIResponse<PaginatedResponse<MessageTemplate>>;

// GET /api/admin/templates/:id
export type GetTemplateResponse = APIResponse<MessageTemplate>;

// POST /api/admin/templates
export interface CreateTemplateRequest {
  type: TemplateType;
  language: Language;
  channel: Channel;
  subject: string;
  body: string;
}

export type CreateTemplateResponse = APIResponse<MessageTemplate>;

// PATCH /api/admin/templates/:id
export interface UpdateTemplateRequest {
  subject?: string;
  body?: string;
}

export type UpdateTemplateResponse = APIResponse<MessageTemplate>;

// DELETE /api/admin/templates/:id
export type DeleteTemplateResponse = APIResponse<{ id: string }>;

// POST /api/admin/templates/preview
export interface PreviewTemplateRequest {
  template_id?: string;
  type?: TemplateType;
  language?: Language;
  channel?: Channel;
  subject?: string;
  body?: string;
  sampleData?: {
    familyName?: string;
    coupleNames?: string;
    weddingDate?: string;
    weddingTime?: string;
    location?: string;
    magicLink?: string;
    rsvpCutoffDate?: string;
    referenceCode?: string;
  };
}

export interface PreviewTemplateResult {
  subject: string;
  body: string;
  variables: {
    familyName: string;
    coupleNames: string;
    weddingDate: string;
    weddingTime: string;
    location: string;
    magicLink: string;
    rsvpCutoffDate: string;
    referenceCode: string;
  };
  raw: {
    subject: string;
    body: string;
  };
}

export type PreviewTemplateResponse = APIResponse<PreviewTemplateResult>;

// ============================================================================
// SEATING PLAN API TYPES
// ============================================================================

export interface TableWithGuests extends Table {
  assigned_guests: Array<FamilyMember & { family_name: string }>;
}

export interface SeatingPlanData {
  tables: TableWithGuests[];
  unassigned_guests: Array<FamilyMember & { family_name: string }>;
  stats: {
    total_guests: number;
    confirmed_guests: number;
    total_seats: number;
    assigned_seats: number;
  };
}

export type GetSeatingPlanResponse = APIResponse<SeatingPlanData>;

export interface UpsertTablesRequest {
  tables: Array<{
    id?: string;
    number: number;
    name?: string | null;
    capacity: number;
  }>;
  delete_ids?: string[];
}

export type UpsertTablesResponse = APIResponse<Table[]>;

export interface AssignGuestsRequest {
  assignments: Array<{
    guest_id: string;
    table_id: string | null;
  }>;
}

export type AssignGuestsResponse = APIResponse<{ success: boolean }>;

export interface SplitFamilyRequest {
  family_id: string;
  groups: Array<{
    name: string;
    guest_ids: string[];
  }>;
}

export type SplitFamilyResponse = APIResponse<{ success: boolean }>;

// ============================================================================
// ERROR CODES (for consistent error handling)
// ============================================================================

export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business logic errors
  RSVP_CUTOFF_PASSED: 'RSVP_CUTOFF_PASSED',
  GUEST_ADDITIONS_DISABLED: 'GUEST_ADDITIONS_DISABLED',
  THEME_IN_USE: 'THEME_IN_USE',
  PLANNER_DISABLED: 'PLANNER_DISABLED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type APIErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
