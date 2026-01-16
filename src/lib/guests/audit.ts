/**
 * Guest Management - Audit Logging
 *
 * Functions for logging guest CRUD operations for audit trail
 */

import { prisma } from '@/lib/db/prisma';

export type AuditAction = 'create' | 'update' | 'delete';

interface AuditLogEntry {
  action: AuditAction;
  family_id: string;
  wedding_id: string;
  admin_id: string;
  details: Record<string, unknown>;
}

/**
 * Log audit event for guest management operations
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Create a tracking event for audit purposes
    await prisma.trackingEvent.create({
      data: {
        family_id: entry.family_id,
        wedding_id: entry.wedding_id,
        event_type: 'RSVP_UPDATED', // Using existing enum, could be extended
        admin_triggered: true,
        metadata: {
          audit_action: entry.action,
          admin_id: entry.admin_id,
          details: entry.details,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('Failed to log audit event:', error);
  }
}
