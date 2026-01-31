/**
 * Database Analysis Script for wed4 vs wed5
 *
 * This script analyzes both databases to understand:
 * 1. Current state of each database (table counts, data volumes)
 * 2. Complete wedding structure in wed4
 * 3. Data patterns for EXISTING_WEDDING seed mode
 *
 * Usage: npx ts-node scripts/analyze-databases.ts
 */

import { PrismaClient } from '@prisma/client';

// Create two Prisma clients with different connection strings
const createClient = (url: string) => {
  process.env.DATABASE_URL = url;
  return new PrismaClient();
};

const wed4Client = createClient('postgresql://wedding:wedding@postgresql.lan:5432/wed4');
const wed5Client = createClient('postgresql://wedding:wedding@postgresql.lan:5432/wed5');

interface TableCount {
  tableName: string;
  count: number;
}

interface DatabaseStats {
  name: string;
  tables: TableCount[];
  totalRecords: number;
}

/**
 * Count records in all tables for a database
 */
async function countAllTables(client: PrismaClient, dbName: string): Promise<DatabaseStats> {
  console.log(`\n📊 Counting records in ${dbName}...\n`);

  const counts: TableCount[] = [];
  let total = 0;

  // Count each table using Prisma models
  const tables = [
    { name: 'MasterAdmin', fn: () => client.masterAdmin.count() },
    { name: 'WeddingPlanner', fn: () => client.weddingPlanner.count() },
    { name: 'Theme', fn: () => client.theme.count() },
    { name: 'Wedding', fn: () => client.wedding.count() },
    { name: 'WeddingAdmin', fn: () => client.weddingAdmin.count() },
    { name: 'MessageTemplate', fn: () => client.messageTemplate.count() },
    { name: 'Family', fn: () => client.family.count() },
    { name: 'FamilyMember', fn: () => client.familyMember.count() },
    { name: 'TrackingEvent', fn: () => client.trackingEvent.count() },
    { name: 'Notification', fn: () => client.notification.count() },
    { name: 'Gift', fn: () => client.gift.count() },
    { name: 'Translation', fn: () => client.translation.count() },
    { name: 'Table', fn: () => client.table.count() },
    { name: 'ChecklistTemplate', fn: () => client.checklistTemplate.count() },
    { name: 'ChecklistSection', fn: () => client.checklistSection.count() },
    { name: 'ChecklistTask', fn: () => client.checklistTask.count() },
    { name: 'ProviderCategory', fn: () => client.providerCategory.count() },
    { name: 'Provider', fn: () => client.provider.count() },
    { name: 'WeddingProvider', fn: () => client.weddingProvider.count() },
    { name: 'Payment', fn: () => client.payment.count() },
  ];

  for (const table of tables) {
    try {
      const count = await table.fn();
      counts.push({ tableName: table.name, count });
      total += count;
      console.log(`  ${table.name.padEnd(20)}: ${count.toString().padStart(6)} records`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ${table.name.padEnd(20)}: ERROR - ${errorMessage}`);
      counts.push({ tableName: table.name, count: 0 });
    }
  }

  console.log(`  ${'TOTAL'.padEnd(20)}: ${total.toString().padStart(6)} records`);

  return { name: dbName, tables: counts, totalRecords: total };
}

/**
 * Analyze MasterAdmin records
 */
async function analyzeMasterAdmins(client: PrismaClient) {
  console.log('\n👤 MASTER ADMIN RECORDS:\n');

  const admins = await client.masterAdmin.findMany();

  if (admins.length === 0) {
    console.log('  No master admins found.');
    return;
  }

  for (const admin of admins) {
    console.log(`  ID: ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Language: ${admin.preferred_language}`);
    console.log(`  Created: ${admin.created_at}`);
    console.log('  ---');
  }
}

/**
 * Analyze WeddingPlanner records
 */
async function analyzePlanners(client: PrismaClient) {
  console.log('\n💍 WEDDING PLANNER RECORDS:\n');

  const planners = await client.weddingPlanner.findMany({
    include: {
      weddings: true,
      themes: true,
      provider_categories: true,
    }
  });

  if (planners.length === 0) {
    console.log('  No planners found.');
    return;
  }

  for (const planner of planners) {
    console.log(`  ID: ${planner.id}`);
    console.log(`  Email: ${planner.email}`);
    console.log(`  Name: ${planner.name}`);
    console.log(`  Auth Provider: ${planner.auth_provider}`);
    console.log(`  Language: ${planner.preferred_language}`);
    console.log(`  Enabled: ${planner.enabled}`);
    console.log(`  Subscription: ${planner.subscription_status}`);
    console.log(`  Weddings: ${planner.weddings.length}`);
    console.log(`  Custom Themes: ${planner.themes.length}`);
    console.log(`  Provider Categories: ${planner.provider_categories.length}`);
    console.log(`  Created: ${planner.created_at}`);
    console.log(`  Last Login: ${planner.last_login_at || 'Never'}`);
    console.log('  ---');
  }
}

/**
 * Analyze Wedding records with full details
 */
async function analyzeWeddings(client: PrismaClient) {
  console.log('\n💒 WEDDING RECORDS (COMPLETE ANALYSIS):\n');

  const weddings = await client.wedding.findMany({
    include: {
      planner: { select: { name: true, email: true } },
      theme: { select: { name: true, is_system_theme: true } },
      wedding_admins: true,
      families: {
        include: {
          members: true,
        }
      },
      tables: {
        include: {
          assigned_guests: true,
        }
      },
      message_templates: true,
      tracking_events: true,
      notifications: true,
      checklist_sections: {
        include: {
          tasks: true,
        }
      },
      checklist_tasks: true,
      providers: {
        include: {
          category: true,
          payments: true,
        }
      },
    }
  });

  if (weddings.length === 0) {
    console.log('  No weddings found.');
    return;
  }

  for (const wedding of weddings) {
    console.log(`\n  ========== WEDDING: ${wedding.couple_names} ==========`);
    console.log(`  ID: ${wedding.id}`);
    console.log(`  Planner: ${wedding.planner.name} (${wedding.planner.email})`);
    console.log(`  Date: ${wedding.wedding_date}`);
    console.log(`  Time: ${wedding.wedding_time}`);
    console.log(`  Location: ${wedding.location}`);
    console.log(`  RSVP Cutoff: ${wedding.rsvp_cutoff_date}`);
    console.log(`  Default Language: ${wedding.default_language}`);
    console.log(`  Status: ${wedding.status}`);
    console.log(`  Disabled: ${wedding.is_disabled}`);
    console.log(`  Created: ${wedding.created_at}`);
    console.log(`  Updated: ${wedding.updated_at}`);

    // Theme
    console.log(`\n  THEME:`);
    if (wedding.theme) {
      console.log(`    Name: ${wedding.theme.name}`);
      console.log(`    System Theme: ${wedding.theme.is_system_theme}`);
    } else {
      console.log(`    No theme assigned`);
    }

    // Configuration
    console.log(`\n  CONFIGURATION:`);
    console.log(`    Payment Mode: ${wedding.payment_tracking_mode}`);
    console.log(`    Allow Guest Additions: ${wedding.allow_guest_additions}`);
    console.log(`    Dress Code: ${wedding.dress_code || 'Not specified'}`);
    console.log(`    Additional Info: ${wedding.additional_info || 'None'}`);
    console.log(`    Gift IBAN: ${wedding.gift_iban || 'Not set'}`);
    console.log(`    Couple Table ID: ${wedding.couple_table_id || 'Not assigned'}`);

    // Feature Flags
    console.log(`\n  FEATURES ENABLED:`);
    console.log(`    Save the Date: ${wedding.save_the_date_enabled}`);
    console.log(`    Transportation Question: ${wedding.transportation_question_enabled}`);
    console.log(`    Dietary Restrictions: ${wedding.dietary_restrictions_enabled}`);
    console.log(`    Extra Question 1: ${wedding.extra_question_1_enabled}${wedding.extra_question_1_text ? ' - ' + wedding.extra_question_1_text : ''}`);
    console.log(`    Extra Question 2: ${wedding.extra_question_2_enabled}${wedding.extra_question_2_text ? ' - ' + wedding.extra_question_2_text : ''}`);
    console.log(`    Extra Question 3: ${wedding.extra_question_3_enabled}${wedding.extra_question_3_text ? ' - ' + wedding.extra_question_3_text : ''}`);
    console.log(`    Extra Info 1: ${wedding.extra_info_1_enabled}${wedding.extra_info_1_label ? ' - ' + wedding.extra_info_1_label : ''}`);
    console.log(`    Extra Info 2: ${wedding.extra_info_2_enabled}${wedding.extra_info_2_label ? ' - ' + wedding.extra_info_2_label : ''}`);
    console.log(`    Extra Info 3: ${wedding.extra_info_3_enabled}${wedding.extra_info_3_label ? ' - ' + wedding.extra_info_3_label : ''}`);

    // Wedding Admins
    console.log(`\n  WEDDING ADMINS (${wedding.wedding_admins.length}):`);
    for (const admin of wedding.wedding_admins) {
      console.log(`    - ${admin.name} (${admin.email})`);
      console.log(`      Auth: ${admin.auth_provider}, Language: ${admin.preferred_language}`);
      console.log(`      Invited: ${admin.invited_at}, Accepted: ${admin.accepted_at || 'Pending'}`);
    }

    // Families and Members
    const totalMembers = wedding.families.reduce((sum, f) => sum + f.members.length, 0);
    const familiesWithRSVP = wedding.families.filter(f => f.members.some(m => m.attending !== null)).length;
    const attendingMembers = wedding.families.flatMap(f => f.members).filter(m => m.attending === true).length;

    console.log(`\n  GUESTS:`);
    console.log(`    Families: ${wedding.families.length}`);
    console.log(`    Total Members: ${totalMembers}`);
    console.log(`    Families with RSVP: ${familiesWithRSVP}`);
    console.log(`    Attending Members: ${attendingMembers}`);

    // Sample a few families
    if (wedding.families.length > 0) {
      console.log(`\n  SAMPLE FAMILIES (first 3):`);
      const sampleFamilies = wedding.families.slice(0, 3);
      for (const family of sampleFamilies) {
        console.log(`    Family: ${family.name}`);
        console.log(`      Email: ${family.email || 'N/A'}`);
        console.log(`      Phone: ${family.phone || 'N/A'}`);
        console.log(`      WhatsApp: ${family.whatsapp_number || 'N/A'}`);
        console.log(`      Language: ${family.preferred_language}`);
        console.log(`      Channel Pref: ${family.channel_preference || 'N/A'}`);
        console.log(`      Reference Code: ${family.reference_code || 'N/A'}`);
        console.log(`      Magic Token: ${family.magic_token.substring(0, 8)}...`);
        console.log(`      Members: ${family.members.length}`);
        for (const member of family.members) {
          console.log(`        - ${member.name} (${member.type}, ${member.age || 'age N/A'})`);
          console.log(`          Attending: ${member.attending === null ? 'No response' : member.attending}`);
          console.log(`          Dietary: ${member.dietary_restrictions || 'None'}`);
          console.log(`          Table: ${member.table_id || 'Not assigned'}`);
        }
      }
    }

    // Tables
    console.log(`\n  TABLES (${wedding.tables.length}):`);
    for (const table of wedding.tables) {
      const assigned = table.assigned_guests.length;
      console.log(`    Table ${table.number}: ${table.name || 'Unnamed'} - ${assigned}/${table.capacity} seats`);
    }

    // Message Templates
    console.log(`\n  MESSAGE TEMPLATES (${wedding.message_templates.length}):`);
    const templatesByType = wedding.message_templates.reduce((acc, t) => {
      const key = `${t.type}_${t.channel}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    for (const [key, count] of Object.entries(templatesByType)) {
      console.log(`    ${key}: ${count} languages`);
    }

    // Tracking Events
    console.log(`\n  TRACKING EVENTS (${wedding.tracking_events.length}):`);
    const eventsByType = wedding.tracking_events.reduce((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    for (const [type, count] of Object.entries(eventsByType)) {
      console.log(`    ${type}: ${count}`);
    }

    // Notifications
    const unreadNotifications = wedding.notifications.filter(n => !n.read).length;
    console.log(`\n  NOTIFICATIONS: ${wedding.notifications.length} total, ${unreadNotifications} unread`);

    // Checklist
    console.log(`\n  CHECKLIST:`);
    console.log(`    Sections: ${wedding.checklist_sections.length}`);
    console.log(`    Tasks: ${wedding.checklist_tasks.length}`);
    const completedTasks = wedding.checklist_tasks.filter(t => t.completed).length;
    console.log(`    Completed: ${completedTasks}/${wedding.checklist_tasks.length}`);

    // Providers
    console.log(`\n  PROVIDERS (${wedding.providers.length}):`);
    for (const provider of wedding.providers) {
      const providerName = provider.name || (provider as any).provider?.name || 'Custom';
      console.log(`    ${provider.category.name}: ${providerName}`);
      console.log(`      Total Price: ${provider.total_price || 'N/A'}`);
      console.log(`      Payments: ${provider.payments.length}`);
      const paidAmount = provider.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      console.log(`      Paid: ${paidAmount}`);
    }

    console.log(`\n  ========== END WEDDING ==========\n`);
  }
}

/**
 * Analyze Themes
 */
async function analyzeThemes(client: PrismaClient) {
  console.log('\n🎨 THEMES:\n');

  const themes = await client.theme.findMany({
    include: {
      _count: {
        select: { weddings: true }
      }
    }
  });

  if (themes.length === 0) {
    console.log('  No themes found.');
    return;
  }

  const systemThemes = themes.filter(t => t.is_system_theme);
  const customThemes = themes.filter(t => !t.is_system_theme);

  console.log(`  System Themes: ${systemThemes.length}`);
  console.log(`  Custom Themes: ${customThemes.length}`);

  console.log(`\n  SYSTEM THEMES:`);
  for (const theme of systemThemes) {
    console.log(`    - ${theme.name}: ${theme.description}`);
    console.log(`      Used by ${theme._count.weddings} wedding(s)`);
    console.log(`      Preview: ${theme.preview_image_url || 'No preview'}`);
  }

  if (customThemes.length > 0) {
    console.log(`\n  CUSTOM THEMES:`);
    for (const theme of customThemes) {
      console.log(`    - ${theme.name}: ${theme.description}`);
      console.log(`      Planner: ${theme.planner_id}`);
      console.log(`      Used by ${theme._count.weddings} wedding(s)`);
    }
  }
}

/**
 * Analyze Gift/Payment patterns
 */
async function analyzeGifts(client: PrismaClient) {
  console.log('\n💰 GIFT/PAYMENT ANALYSIS:\n');

  const gifts = await client.gift.findMany({
    include: {
      family: {
        select: { name: true, reference_code: true }
      }
    },
    take: 10,
  });

  if (gifts.length === 0) {
    console.log('  No gifts found.');
    return;
  }

  const totalGifts = await client.gift.count();
  const statusCounts = await client.gift.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log(`  Total Gifts: ${totalGifts}`);
  console.log(`\n  By Status:`);
  for (const status of statusCounts) {
    console.log(`    ${status.status}: ${status._count}`);
  }

  console.log(`\n  Sample Gifts (first 10):`);
  for (const gift of gifts) {
    console.log(`    Family: ${gift.family.name}`);
    console.log(`      Amount: €${gift.amount}`);
    console.log(`      Reference: ${gift.reference_code_used || 'N/A'}`);
    console.log(`      Auto-matched: ${gift.auto_matched}`);
    console.log(`      Status: ${gift.status}`);
    console.log(`      Date: ${gift.transaction_date}`);
    console.log('    ---');
  }
}

/**
 * Main analysis function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DATABASE ANALYSIS: wed4 (full) vs wed5 (empty)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Count all tables in both databases
    const wed4Stats = await countAllTables(wed4Client, 'wed4 (FULL)');
    const wed5Stats = await countAllTables(wed5Client, 'wed5 (EMPTY)');

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  COMPARISON SUMMARY                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n  wed4 Total Records: ${wed4Stats.totalRecords}`);
    console.log(`  wed5 Total Records: ${wed5Stats.totalRecords}`);
    console.log(`  Difference: ${wed4Stats.totalRecords - wed5Stats.totalRecords} records\n`);

    // Detailed analysis of wed4 (full database)
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              DETAILED ANALYSIS OF wed4 (FULL)             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    await analyzeMasterAdmins(wed4Client);
    await analyzePlanners(wed4Client);
    await analyzeWeddings(wed4Client);
    await analyzeThemes(wed4Client);
    await analyzeGifts(wed4Client);

    // Recommendations
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        RECOMMENDATIONS FOR EXISTING_WEDDING SEED          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`
  Based on the analysis of wed4, a complete wedding should include:

  1. CORE ENTITIES:
     - 1 Master Admin (platform owner)
     - 1 Wedding Planner (manages weddings)
     - 1-2 Wedding Admins per wedding (invited to manage)
     - 5 System Themes (Classic, Garden, Modern, Rustic, Beach)

  2. PER WEDDING:
     - Basic Info: couple names, date, time, location, RSVP cutoff
     - Theme: Select from system themes
     - Configuration: Payment mode (manual/automated), guest additions
     - Feature Flags: Save the date, transportation, dietary, extra questions

  3. GUEST DATA:
     - 20-50 families (realistic size)
     - 2-5 members per family (mix of adults, children, infants)
     - Contact info: Email, phone, WhatsApp (at least one)
     - Preferences: Language, channel preference
     - Unique: Magic token (UUID), reference code (if automated payment)

  4. RSVP DATA:
     - 60-80% of families with RSVP responses
     - Attending flags (true/false/null)
     - Dietary restrictions for attending members
     - Accessibility needs for some members

  5. SEATING:
     - 8-12 tables with capacity 8-10 each
     - Table names or numbers
     - Some members assigned to tables

  6. MESSAGE TEMPLATES:
     - For each type (INVITATION, REMINDER, CONFIRMATION, SAVE_THE_DATE)
     - For each channel (EMAIL, WHATSAPP, SMS)
     - In default language at minimum (ES)
     - Optional: Multiple languages

  7. TRACKING & ENGAGEMENT:
     - LINK_OPENED events (tracking channel attribution)
     - RSVP_SUBMITTED events
     - RSVP_UPDATED events
     - INVITATION_SENT events
     - REMINDER_SENT events

  8. PAYMENTS (if automated mode):
     - Reference codes for families
     - Some gifts received with status PENDING/RECEIVED/CONFIRMED
     - Auto-matched vs manual matching examples

  9. CHECKLIST (optional but recommended):
     - 3-5 sections (Planning, Venue, Catering, etc.)
     - 10-20 tasks per wedding
     - Mix of pending/in_progress/completed

  10. PROVIDERS (optional):
      - 3-5 provider categories (Venue, Catering, Photography, etc.)
      - 1-2 providers per category
      - Some with payments recorded

  KEY DATA PATTERNS:
  - Magic tokens: Always UUID v4 format
  - Reference codes: Short alphanumeric (if payment mode = AUTOMATED)
  - Languages: Use ES as default, support EN, FR, IT, DE
  - Channels: Mix of EMAIL, WHATSAPP, SMS preferences
  - Member types: Realistic age distribution (adults > children > infants)
  - RSVP timing: Track events with timestamps
  - Wedding status: ACTIVE (default)
  - Planner status: enabled=true, subscription=ACTIVE
    `);

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ANALYSIS COMPLETE                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Error during analysis:', error);
    throw error;
  } finally {
    await wed4Client.$disconnect();
    await wed5Client.$disconnect();
  }
}

// Run the analysis
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
