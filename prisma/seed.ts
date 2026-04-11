/**
 * Prisma Database Seeding Script
 *
 * Uses the shared planner-demo-seed module so that the same data
 * is created here, via the trial-signup API, and in E2E Playwright setup.
 */

import {
  PrismaClient,
  AuthProvider,
  Channel,
  TemplateType,
  SubscriptionStatus,
  Language,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedPlannerDemoBasics, seedPlannerDemoData } from '../src/lib/seed/planner-demo-seed';

// Initialize Prisma
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

// ============================================================================
// CONFIGURATION
// ============================================================================

const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || 'master@example.com';
const PLANNER_EMAIL = process.env.PLANNER_EMAIL || 'planner@example.com';

const DEMO_PLANNER_ID = process.env.DEMO_PLANNER_ID || 'demo-planner-id';
const DEMO_PLANNER_EMAIL = process.env.DEMO_PLANNER_EMAIL || 'demo@weddingplanner.com';
const DEMO_PLANNER_NAME = process.env.DEMO_PLANNER_NAME || 'Prestige Wedding Events';

const SEED_MODE = process.env.SEED_MODE || 'NEW_USER';

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function ensureMasterAdmin() {
  const existing = await prisma.masterAdmin.findFirst({
    where: { email: MASTER_ADMIN_EMAIL }
  });
  if (existing) return existing;
  return await prisma.masterAdmin.create({
    data: { email: MASTER_ADMIN_EMAIL, name: 'Master Administrator', preferred_language: Language.EN },
  });
}

async function seedMasterTemplates() {
  const count = await prisma.masterMessageTemplate.count();
  if (count > 0) return;

  console.log('📜 Seeding Master Message Templates...');
  for (const type of [TemplateType.SAVE_THE_DATE, TemplateType.INVITATION, TemplateType.REMINDER, TemplateType.CONFIRMATION, TemplateType.TASTING_MENU]) {
    for (const lang of [Language.ES, Language.EN]) {
      for (const channel of [Channel.WHATSAPP, Channel.EMAIL]) {
        await prisma.masterMessageTemplate.create({
          data: { type, language: lang, channel, subject: `Default ${type} - ${lang}`, body: `Hola! Esto es una notificación de ${type}.` }
        });
      }
    }
  }
}

async function seedPlannerBasics(plannerId: string, email: string, name: string, creatorId: string) {
  console.log(`💼 Seeding basics for planner: ${name}`);

  let planner = await prisma.weddingPlanner.findUnique({ where: { id: plannerId } });
  if (planner) {
    planner = await prisma.weddingPlanner.update({
      where: { id: plannerId },
      data: { enabled: true, subscription_status: SubscriptionStatus.ACTIVE }
    });
  } else {
    planner = await prisma.weddingPlanner.create({
      data: {
        id: plannerId, email, name, auth_provider: AuthProvider.GOOGLE, preferred_language: Language.ES,
        created_by: creatorId, enabled: true, subscription_status: SubscriptionStatus.ACTIVE, invoice_series: 'FAC',
      }
    });
  }

  const existingLicense = await prisma.plannerLicense.findUnique({ where: { planner_id: planner.id } });
  if (!existingLicense) {
    await prisma.plannerLicense.create({
      data: { planner_id: planner.id, max_weddings: 50 }
    });
  }

  // Use the shared module for categories, checklist, templates, and contracts
  await seedPlannerDemoBasics(prisma, planner.id);

  return planner;
}

async function seedNewUser() {
  const masterAdmin = await ensureMasterAdmin();
  await seedMasterTemplates();
  const planner = await seedPlannerBasics('default-planner', PLANNER_EMAIL, 'Wedding Planner S.L.', masterAdmin.id);
  return { masterAdmin, planner };
}

async function main() {
  try {
    console.log(`\n📌 Mode: ${SEED_MODE}`);
    if (SEED_MODE === 'DEMO_PLANNER') {
      const masterAdmin = await ensureMasterAdmin();
      await seedMasterTemplates();
      const planner = await seedPlannerBasics(DEMO_PLANNER_ID, DEMO_PLANNER_EMAIL, DEMO_PLANNER_NAME, masterAdmin.id);
      await seedPlannerDemoData(prisma, planner.id);
    } else {
      const { planner } = await seedNewUser();
      if (SEED_MODE === 'EXISTING_WEDDING') {
        await seedPlannerDemoData(prisma, planner.id);
      }
    }
    console.log('\n✅ SEEDING COMPLETED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
