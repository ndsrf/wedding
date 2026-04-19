/**
 * API Key Authentication Helpers
 *
 * Generates, hashes, and validates API keys for programmatic access
 * (MCP server, etc.). Keys are stored as SHA-256 hashes; the raw key
 * is only returned at creation time. Keys expire after a configurable
 * TTL (default 30 days).
 */

import { createHash, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const API_KEY_TTL_DAYS = 30;

export function generateApiKey(): string {
  const bytes = randomBytes(32).toString('base64url');
  return `npci_${bytes}`;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function defaultExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + API_KEY_TTL_DAYS);
  return d;
}

export interface ApiKeyContext {
  role: 'wedding_admin' | 'planner';
  wedding_id?: string;
  planner_id?: string;
}

export async function validateApiKey(key: string): Promise<ApiKeyContext | null> {
  const hash = hashApiKey(key);
  const record = await prisma.weddingApiKey.findUnique({ where: { key_hash: hash } });
  if (!record) return null;

  // Check expiry
  if (record.expires_at && record.expires_at < new Date()) return null;

  // Update last_used_at (fire-and-forget)
  void prisma.weddingApiKey.update({
    where: { id: record.id },
    data: { last_used_at: new Date() },
  }).catch(() => undefined);

  return {
    role: record.role as 'wedding_admin' | 'planner',
    wedding_id: record.wedding_id ?? undefined,
    planner_id: record.planner_id ?? undefined,
  };
}

/**
 * Extract and validate a Bearer API key from the request.
 * Throws with UNAUTHORIZED/FORBIDDEN prefixes so callers can map to HTTP status.
 */
export async function requireApiKeyAuth(
  request: NextRequest,
  requiredRole: 'wedding_admin' | 'planner',
): Promise<ApiKeyContext> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED: Bearer token required');
  }

  const key = authHeader.slice(7);
  const ctx = await validateApiKey(key);

  if (!ctx) {
    throw new Error('UNAUTHORIZED: Invalid or expired API key');
  }

  if (ctx.role !== requiredRole) {
    throw new Error(`FORBIDDEN: ${requiredRole} role required`);
  }

  return ctx;
}
