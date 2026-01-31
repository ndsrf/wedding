/**
 * Prisma Database Seeding Script
 *
 * Supports two modes via SEED_MODE environment variable:
 *
 * 1. NEW_USER (default): Minimal platform setup
 *    - 1 Master Admin
 *    - 1 Wedding Planner with system themes and provider categories
 *    - Empty checklist template structure
 *
 * 2. EXISTING_WEDDING: Complete wedding scenario
 *    - All data from NEW_USER mode
 *    - 1 Complete Wedding with:
 *      - Wedding Admin (couple account)
 *      - 40-50 families with 120-150 members
 *      - Realistic RSVP patterns (~75% completion)
 *      - Table assignments (8-10 tables)
 *      - Message templates
 *      - Tracking events
 *      - Checklist with sections and tasks
 *      - Providers and payments
 *
 * Usage:
 *   SEED_MODE=NEW_USER npx ts-node prisma/seed.ts
 *   SEED_MODE=EXISTING_WEDDING npx ts-node prisma/seed.ts
 */

import { PrismaClient, Prisma, Language, AuthProvider, Channel, MemberType, TemplateType, EventType, TaskAssignment, PaymentMethod, TaskStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Initialize Prisma with the same adapter configuration as the app
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prismaClientOptions: Prisma.PrismaClientOptions = {
  adapter,
};

const prisma = new PrismaClient(prismaClientOptions);

// ============================================================================
// CONFIGURATION
// ============================================================================

const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || 'master@example.com';
const PLANNER_EMAIL = process.env.PLANNER_EMAIL || 'planner@example.com';
const WEDDING_ADMIN_EMAIL = process.env.WEDDING_ADMIN_EMAIL || 'admin@example.com';

const SEED_MODE = process.env.SEED_MODE || 'NEW_USER';

// Spanish names for realistic test data
const SPANISH_FIRST_NAMES = [
  'María', 'José', 'Juan', 'Antonio', 'Francisco', 'Manuel', 'Carlos', 'Luis',
  'Ana', 'Carmen', 'Rosa', 'Isabel', 'Juana', 'Elena', 'Dolores', 'María Luisa',
  'Pedro', 'Miguel', 'Andrés', 'Rafael', 'Julio', 'Ramón', 'Roberto', 'Ricardo'
];

const SPANISH_LAST_NAMES = [
  'García', 'Martínez', 'González', 'Rodríguez', 'Pérez', 'López', 'Sánchez', 'Díaz',
  'Hernández', 'Jiménez', 'Torres', 'Ramírez', 'Flores', 'Morales', 'Reyes', 'Ruiz',
  'Gutierrez', 'Ortega', 'Vargas', 'Castro', 'Ramos', 'Campos', 'Méndez', 'Duran'
];

const PROVIDER_CATEGORIES = [
  'Venue',
  'Catering',
  'Photography',
  'Music/DJ',
  'Flowers',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomName(): { first: string; last: string } {
  return {
    first: getRandomElement(SPANISH_FIRST_NAMES),
    last: getRandomElement(SPANISH_LAST_NAMES),
  };
}

// Note: generateEmail is a utility function that might be used for future enhancements
// function generateEmail(base: string, suffix?: string): string {
//   if (suffix) {
//     return `${base.replace('@', '+' + suffix + '@')}`;
//   }
//   return base;
// }

function generateMagicToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRandomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedNewUser() {
  console.log('\n📋 [NEW_USER MODE] Seeding minimal platform setup...\n');

  // 1. Create Master Admin
  console.log('👤 Creating Master Admin...');
  const masterAdmin = await prisma.masterAdmin.upsert({
    where: { email: MASTER_ADMIN_EMAIL },
    create: {
      email: MASTER_ADMIN_EMAIL,
      name: 'Master Administrator',
      preferred_language: 'EN' as Language,
    },
    update: {
      name: 'Master Administrator',
    },
  });
  console.log(`   ✓ Master Admin created: ${masterAdmin.email}`);

  // 2. Create Wedding Planner
  console.log('💼 Creating Wedding Planner...');
  const planner = await prisma.weddingPlanner.upsert({
    where: { email: PLANNER_EMAIL },
    create: {
      email: PLANNER_EMAIL,
      name: 'Wedding Planner',
      auth_provider: 'GOOGLE' as AuthProvider,
      preferred_language: 'ES' as Language,
      created_by: masterAdmin.id,
      enabled: true,
    },
    update: {
      enabled: true,
    },
  });
  console.log(`   ✓ Wedding Planner created: ${planner.email}`);

  // 3. Seed system themes (using existing function from lib/db/seed)
  console.log('🎨 Seeding system themes...');
  const themeCount = await prisma.theme.count({
    where: { is_system_theme: true },
  });
  if (themeCount === 0) {
    // We'll rely on the existing seedSystemThemes function from lib/db/seed.ts
    console.log('   ℹ️ System themes will be seeded by the application startup');
  } else {
    console.log(`   ✓ System themes already seeded (${themeCount} themes)`);
  }

  // 4. Create Provider Categories
  console.log('🏢 Creating provider categories...');
  let createdCategories = 0;
  for (const categoryName of PROVIDER_CATEGORIES) {
    const existing = await prisma.providerCategory.findFirst({
      where: {
        planner_id: planner.id,
        name: categoryName,
      },
    });

    if (!existing) {
      await prisma.providerCategory.create({
        data: {
          planner_id: planner.id,
          name: categoryName,
        },
      });
      createdCategories++;
    }
  }
  console.log(`   ✓ Provider categories created: ${createdCategories}`);

  // 5. Create empty Checklist Template
  console.log('📝 Creating checklist template...');
  await prisma.checklistTemplate.upsert({
    where: { planner_id: planner.id },
    create: {
      planner_id: planner.id,
    },
    update: {},
  });
  console.log(`   ✓ Checklist template created`);

  return { masterAdmin, planner };
}

async function seedExistingWedding(planner: any) {
  console.log('\n🎉 [EXISTING_WEDDING MODE] Seeding complete wedding scenario...\n');

  const weddingDate = new Date('2025-08-15T18:00:00');
  const rsvpCutoffDate = new Date('2025-08-01');

  // 1. Create Wedding first (needed for foreign key)
  console.log('💒 Creating wedding...');
  const wedding = await prisma.wedding.create({
    data: {
      planner_id: planner.id,
      couple_names: 'Sofia & Miguel',
      wedding_date: weddingDate,
      wedding_time: '18:00',
      location: 'Granada, Spain',
      rsvp_cutoff_date: rsvpCutoffDate,
      dress_code: 'Cocktail attire',
      additional_info: 'We look forward to celebrating with you!',
      default_language: 'ES' as Language,
      created_by: planner.id,
      transportation_question_enabled: true,
      transportation_question_text: 'Do you need transportation?',
      dietary_restrictions_enabled: true,
      save_the_date_enabled: true,
      extra_question_1_enabled: true,
      extra_question_1_text: 'How many children will attend?',
    },
  });
  console.log(`   ✓ Wedding created: ${wedding.couple_names}`);

  // 2. Create Wedding Admin (couple) with valid wedding_id
  console.log('👰 Creating Wedding Admin (couple)...');
  await prisma.weddingAdmin.create({
    data: {
      email: WEDDING_ADMIN_EMAIL,
      name: 'Sofia & Miguel García',
      auth_provider: 'GOOGLE' as AuthProvider,
      preferred_language: 'ES' as Language,
      invited_by: planner.id,
      wedding_id: wedding.id,
    },
  });

  // 3. Create Tables (8 tables, 15 capacity each)
  console.log('🍽️  Creating tables...');
  const tables = [];
  for (let i = 1; i <= 8; i++) {
    const table = await prisma.table.create({
      data: {
        wedding_id: wedding.id,
        number: i,
        capacity: 15,
      },
    });
    tables.push(table);
  }
  console.log(`   ✓ Created ${tables.length} tables`);

  // 4. Create Families and Members (45 families, ~130 members)
  console.log('👨‍👩‍👧‍👦 Creating families and members...');
  const families = [];
  for (let i = 0; i < 45; i++) {
    const familyName = generateRandomName();
    const familyFullName = `${familyName.first} ${familyName.last}`;
    const magicToken = generateMagicToken();
    const referenceCode = generateReferenceCode();

    const family = await prisma.family.create({
      data: {
        wedding_id: wedding.id,
        name: familyFullName,
        email: `family${i + 1}@example.com`,
        phone: `+34 6${String(Math.random()).slice(2, 11)}`,
        magic_token: magicToken,
        reference_code: referenceCode,
        channel_preference: getRandomElement(['EMAIL', 'WHATSAPP'] as Channel[]),
        preferred_language: 'ES' as Language,
        transportation_answer: getRandomBoolean(0.6),
        extra_question_1_answer: getRandomBoolean(0.7),
      },
    });
    families.push(family);

    // Create family members (2-4 per family)
    const memberCount = Math.floor(Math.random() * 3) + 2;
    for (let j = 0; j < memberCount; j++) {
      const memberName = generateRandomName();
      const memberType = j === 0 ? 'ADULT' : getRandomElement(['ADULT', 'CHILD', 'INFANT'] as MemberType[]);
      const age = memberType === 'ADULT' ? Math.floor(Math.random() * 30) + 25 : Math.floor(Math.random() * 17);

      // Assign to table (75% are assigned)
      const assignedTable = getRandomBoolean(0.75) ? tables[Math.floor(Math.random() * tables.length)] : null;

      await prisma.familyMember.create({
        data: {
          family_id: family.id,
          name: `${memberName.first} ${memberName.last}`,
          type: memberType as MemberType,
          attending: getRandomBoolean(0.75),
          age: age > 0 ? age : undefined,
          dietary_restrictions: getRandomBoolean(0.2) ? 'Vegetarian' : undefined,
          table_id: assignedTable?.id,
        },
      });
    }
  }
  console.log(`   ✓ Created ${families.length} families with members`);

  // 5. Create Message Templates
  console.log('💬 Creating message templates...');
  const templateTypes: TemplateType[] = ['SAVE_THE_DATE', 'INVITATION', 'REMINDER', 'CONFIRMATION'];
  const languages: Language[] = ['ES', 'EN'];
  const channels: Channel[] = ['EMAIL', 'WHATSAPP'];

  let templateCount = 0;
  for (const type of templateTypes) {
    for (const lang of languages) {
      for (const channel of channels) {
        // Skip some combinations to be realistic
        if (type === 'SAVE_THE_DATE' && channel === 'WHATSAPP') continue;

        await prisma.messageTemplate.upsert({
          where: {
            wedding_id_type_language_channel: {
              wedding_id: wedding.id,
              type,
              language: lang,
              channel,
            },
          },
          create: {
            wedding_id: wedding.id,
            type,
            language: lang,
            channel,
            subject: `${type} - ${lang}`,
            body: `This is a ${type} message in ${lang === 'ES' ? 'Spanish' : 'English'} via ${channel}.`,
          },
          update: {},
        });
        templateCount++;
      }
    }
  }
  console.log(`   ✓ Created ${templateCount} message templates`);

  // 6. Create Tracking Events
  console.log('📊 Creating tracking events...');
  let eventCount = 0;
  for (const family of families.slice(0, 30)) {
    const eventTypes = ['LINK_OPENED', 'RSVP_STARTED', 'RSVP_SUBMITTED', 'GUEST_ADDED'];
    for (const eventType of eventTypes) {
      if (Math.random() < 0.6) {
        // 60% probability of each event
        const timestamp = getRandomDate(new Date('2025-07-01'), new Date('2025-08-01'));
        await prisma.trackingEvent.create({
          data: {
            family_id: family.id,
            wedding_id: wedding.id,
            event_type: eventType as EventType,
            channel: Math.random() < 0.5 ? 'EMAIL' : 'WHATSAPP',
            timestamp,
          },
        });
        eventCount++;
      }
    }
  }
  console.log(`   ✓ Created ${eventCount} tracking events`);

  // 7. Create Checklist Sections and Tasks
  console.log('✅ Creating checklist sections and tasks...');
  const sections = [
    { name: 'Planning', tasks: ['Choose venue', 'Set date', 'Decide on guest list'] },
    { name: 'Coordination', tasks: ['Book vendors', 'Send invitations', 'Track RSVPs'] },
    { name: 'Details', tasks: ['Final head count', 'Seating arrangement', 'Confirm with vendors'] },
  ];

  let sectionCount = 0;
  let taskCount = 0;
  for (let i = 0; i < sections.length; i++) {
    const section = await prisma.checklistSection.create({
      data: {
        wedding_id: wedding.id,
        name: sections[i].name,
        order: i + 1,
      },
    });
    sectionCount++;

    for (let j = 0; j < sections[i].tasks.length; j++) {
      const daysBeforeWedding = Math.floor(Math.random() * 30) + 30;
      const dueDate = new Date(weddingDate);
      dueDate.setDate(dueDate.getDate() - daysBeforeWedding);

      await prisma.checklistTask.create({
        data: {
          section_id: section.id,
          wedding_id: wedding.id,
          title: sections[i].tasks[j],
          assigned_to: 'COUPLE' as TaskAssignment,
          due_date: dueDate,
          status: 'PENDING' as TaskStatus,
          order: j + 1,
        },
      });
      taskCount++;
    }
  }
  console.log(`   ✓ Created ${sectionCount} sections with ${taskCount} tasks`);

  // 8. Create Providers and Payments
  console.log('💰 Creating providers and payments...');
  const categories = await prisma.providerCategory.findMany({
    where: { planner_id: planner.id },
  });

  let providerCount = 0;
  let paymentCount = 0;
  for (const category of categories) {
    // Create 2-3 providers per category
    const numProviders = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numProviders; i++) {
      const providerName = generateRandomName();
      const provider = await prisma.provider.create({
        data: {
          planner_id: planner.id,
          category_id: category.id,
          name: `${category.name} - ${providerName.last}`,
          contact_name: `${providerName.first} ${providerName.last}`,
          email: `provider${i}@example.com`,
          phone: `+34 6${String(Math.random()).slice(2, 11)}`,
          approx_price: Math.floor(Math.random() * 5000) + 500,
        },
      });
      providerCount++;

      // Create wedding provider assignment
      const weddingProvider = await prisma.weddingProvider.create({
        data: {
          wedding_id: wedding.id,
          category_id: category.id,
          provider_id: provider.id,
          name: provider.name,
          contact_name: provider.contact_name,
          email: provider.email,
          phone: provider.phone,
          total_price: Math.floor(Math.random() * 4000) + 1000,
        },
      });

      // Create 1-3 payments
      const numPayments = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numPayments; j++) {
        const paymentDate = getRandomDate(new Date('2025-06-01'), new Date('2025-08-10'));
        await prisma.payment.create({
          data: {
            wedding_provider_id: weddingProvider.id,
            amount: Math.floor(Math.random() * 2000) + 100,
            date: paymentDate,
            method: getRandomElement(['BANK_TRANSFER', 'CASH', 'BIZUM'] as PaymentMethod[]),
          },
        });
        paymentCount++;
      }
    }
  }
  console.log(`   ✓ Created ${providerCount} providers with ${paymentCount} payments`);

  console.log(`\n✅ Wedding seeding complete!\n`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        WEDDING PLANNER DATABASE SEEDING SCRIPT             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📌 Mode: ${SEED_MODE}`);
    console.log(`📌 Master Admin: ${MASTER_ADMIN_EMAIL}`);
    console.log(`📌 Planner Email: ${PLANNER_EMAIL}`);
    if (SEED_MODE === 'EXISTING_WEDDING') {
      console.log(`📌 Wedding Admin: ${WEDDING_ADMIN_EMAIL}`);
    }

    // Seed NEW_USER data first
    const { planner } = await seedNewUser();

    // If EXISTING_WEDDING mode, seed the full wedding
    if (SEED_MODE === 'EXISTING_WEDDING') {
      await seedExistingWedding(planner);
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ SEEDING COMPLETED SUCCESSFULLY!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
