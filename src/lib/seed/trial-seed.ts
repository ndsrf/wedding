/**
 * Trial Planner Seeding - thin wrappers around the shared demo-seed module.
 *
 * Uses the app's shared Prisma client (@/lib/db) so this can be called
 * directly from API routes without subprocess overhead.
 */

import { prisma } from '@/lib/db';
import { seedPlannerDemoBasics, seedPlannerDemoData } from './planner-demo-seed';

export async function seedTrialPlannerBasics(plannerId: string): Promise<void> {
  await seedPlannerDemoBasics(prisma, plannerId);
}

export async function seedTrialDemoData(plannerId: string): Promise<void> {
  await seedPlannerDemoData(prisma, plannerId);
}
