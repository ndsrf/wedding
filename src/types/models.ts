/**
 * Database Model Types
 *
 * TypeScript type definitions for database entities.
 * These types match the Prisma schema but are intended for application use.
 * For Prisma-generated types, import from @prisma/client.
 */

import type { ThemeConfig } from './theme';

// ============================================================================
// ENUMS - Import and re-export from Prisma for convenience
// ============================================================================

import type {
  Language,
  AuthProvider,
  PaymentMode,
  WeddingStatus,
  MemberType,
  EventType,
  Channel,
  GiftStatus,
  TranslationContext,
  SubscriptionStatus,
} from '@prisma/client';

export type {
  Language,
  AuthProvider,
  PaymentMode,
  WeddingStatus,
  MemberType,
  EventType,
  Channel,
  GiftStatus,
  TranslationContext,
  SubscriptionStatus,
};

// ============================================================================
// PLATFORM MANAGEMENT MODELS
// ============================================================================

export interface MasterAdmin {
  id: string;
  email: string;
  name: string;
  preferred_language: Language;
  created_at: Date;
}

export interface WeddingPlanner {
  id: string;
  email: string;
  name: string;
  google_id: string | null;
  auth_provider: AuthProvider;
  last_login_provider: AuthProvider | null;
  preferred_language: Language;
  logo_url: string | null;
  enabled: boolean;
  subscription_status: SubscriptionStatus;
  created_at: Date;
  created_by: string;
  last_login_at: Date | null;
}

// ============================================================================
// THEME MODELS
// ============================================================================

export interface Theme {
  id: string;
  planner_id: string | null;
  name: string;
  description: string;
  is_default: boolean;
  is_system_theme: boolean;
  config: ThemeConfig; // JSONB field
  preview_image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

// ThemeConfig is imported from theme.ts and used here
export type { ThemeConfig };

// ============================================================================
// WEDDING MANAGEMENT MODELS
// ============================================================================

export interface Wedding {
  id: string;
  planner_id: string;
  theme_id: string | null;
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
  status: WeddingStatus;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string | null;
}

export interface WeddingAdmin {
  id: string;
  email: string;
  name: string;
  google_id: string | null;
  auth_provider: AuthProvider;
  last_login_provider: AuthProvider | null;
  preferred_language: Language;
  wedding_id: string;
  invited_by: string;
  invited_at: Date;
  accepted_at: Date | null;
  last_login_at: Date | null;
  created_at: Date;
}

// ============================================================================
// GUEST MANAGEMENT MODELS
// ============================================================================

export interface Family {
  id: string;
  wedding_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  magic_token: string;
  reference_code: string | null;
  channel_preference: Channel | null;
  preferred_language: Language;
  created_at: Date;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  type: MemberType;
  attending: boolean | null;
  age: number | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  added_by_guest: boolean;
  created_at: Date;
}

// ============================================================================
// TRACKING & NOTIFICATIONS MODELS
// ============================================================================

export interface TrackingEvent {
  id: string;
  family_id: string;
  wedding_id: string;
  event_type: EventType;
  channel: Channel | null;
  metadata: Record<string, any> | null; // JSONB field
  admin_triggered: boolean;
  timestamp: Date;
}

export interface Notification {
  id: string;
  wedding_id: string;
  family_id: string | null;
  event_type: EventType;
  channel: Channel | null;
  details: Record<string, any>; // JSONB field
  read: boolean;
  read_at: Date | null;
  admin_id: string;
  created_at: Date;
}

// ============================================================================
// PAYMENT MODELS
// ============================================================================

export interface Gift {
  id: string;
  family_id: string;
  wedding_id: string;
  amount: number; // Decimal(10, 2) in DB
  reference_code_used: string | null;
  auto_matched: boolean;
  status: GiftStatus;
  transaction_date: Date;
  created_at: Date;
}

// ============================================================================
// INTERNATIONALIZATION MODELS
// ============================================================================

export interface Translation {
  id: string;
  key: string;
  language: Language;
  value: string;
  context: TranslationContext;
  updated_at: Date;
}

// ============================================================================
// EXTENDED MODELS WITH RELATIONS (for API responses)
// ============================================================================

export interface FamilyWithMembers extends Family {
  members: FamilyMember[];
}

export interface FamilyWithRelations extends Family {
  members: FamilyMember[];
  wedding: Wedding;
  tracking_events?: TrackingEvent[];
  gifts?: Gift[];
}

export interface WeddingWithRelations extends Wedding {
  planner: WeddingPlanner;
  theme: Theme | null;
  wedding_admins: WeddingAdmin[];
}

export interface WeddingWithStats extends Wedding {
  guest_count: number;
  rsvp_count: number;
  rsvp_completion_percentage: number;
  attending_count: number;
  payment_received_count: number;
}

export interface GiftWithFamily extends Gift {
  family: Pick<Family, 'id' | 'name' | 'email'>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Create types (omit auto-generated fields)
export type CreateFamily = Omit<Family, 'id' | 'created_at' | 'magic_token'>;
export type CreateFamilyMember = Omit<FamilyMember, 'id' | 'created_at'>;
export type CreateWedding = Omit<Wedding, 'id' | 'created_at' | 'updated_at'>;
export type CreateWeddingAdmin = Omit<WeddingAdmin, 'id' | 'created_at' | 'invited_at' | 'accepted_at' | 'last_login_at'>;
export type CreateGift = Omit<Gift, 'id' | 'created_at'>;
export type CreateTrackingEvent = Omit<TrackingEvent, 'id' | 'timestamp'>;

// Update types (partial updates, exclude immutable fields)
export type UpdateFamily = Partial<Omit<Family, 'id' | 'wedding_id' | 'created_at' | 'magic_token'>>;
export type UpdateFamilyMember = Partial<Omit<FamilyMember, 'id' | 'family_id' | 'created_at'>>;
export type UpdateWedding = Partial<Omit<Wedding, 'id' | 'planner_id' | 'created_at' | 'created_by'>>;
export type UpdateGift = Partial<Omit<Gift, 'id' | 'family_id' | 'wedding_id' | 'created_at'>>;

// Filter types for queries
export interface FamilyFilter {
  wedding_id: string;
  rsvp_status?: 'pending' | 'submitted';
  attendance?: 'yes' | 'no' | 'partial';
  channel?: Channel;
  payment_status?: GiftStatus;
  search?: string; // Search by family name or email
}

export interface TrackingEventFilter {
  wedding_id: string;
  family_id?: string;
  event_type?: EventType[];
  channel?: Channel;
  date_from?: Date;
  date_to?: Date;
  admin_triggered?: boolean;
}

export interface NotificationFilter {
  wedding_id: string;
  family_id?: string;
  event_type?: EventType;
  channel?: Channel;
  read?: boolean;
  date_from?: Date;
  date_to?: Date;
}
