/**
 * Reports Export Service
 *
 * Generates various reports for wedding administration with Excel export functionality
 */

import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db/prisma';
import type { ExportFormat } from '@/lib/excel/export';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface AttendeeData {
  familyName: string;
  memberName: string;
  type: string;
  age: number | null;
  email: string;
  phone: string;
  whatsapp: string;
  language: string;
  channel: string | null;
  invitedByAdmin: string;
  attending: string;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  tableName: string;
  addedByGuest: boolean;
}

export interface GuestsPerAdminData {
  adminName: string;
  adminEmail: string;
  totalFamilies: number;
  totalGuests: number;
  attendingGuests: number;
  notAttendingGuests: number;
  pendingGuests: number;
}

export interface SeatingPlanData {
  tableName: string;
  tableCapacity: number;
  guestName: string;
  guestType: string;
  familyName: string;
  attending: string;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  otherDetails: string;
}

export interface AgeAverageData {
  groupType: 'Administrator' | 'Table';
  groupName: string;
  averageAge: number | null;
  guestCount: number;
  minAge: number | null;
  maxAge: number | null;
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetch attendee list data
 */
export async function fetchAttendeeList(wedding_id: string): Promise<AttendeeData[]> {
  const [families, weddingAdmins] = await Promise.all([
    prisma.family.findMany({
      where: { wedding_id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp_number: true,
        preferred_language: true,
        channel_preference: true,
        invited_by_admin_id: true,
        members: {
          select: {
            id: true,
            name: true,
            type: true,
            age: true,
            attending: true,
            dietary_restrictions: true,
            accessibility_needs: true,
            added_by_guest: true,
            table_id: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.weddingAdmin.findMany({
      where: { wedding_id },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const tableIds = families.flatMap((f) => f.members.map((m) => m.table_id).filter(Boolean));
  const tables = await prisma.table.findMany({
    where: { id: { in: tableIds as string[] } },
    select: { id: true, name: true },
  });
  const tableMap = new Map(tables.map((t) => [t.id, t.name]));
  const adminMap = new Map(weddingAdmins.map((a) => [a.id, a.name || a.email]));

  const attendees: AttendeeData[] = [];
  for (const family of families) {
    const invitedBy = family.invited_by_admin_id
      ? adminMap.get(family.invited_by_admin_id) || ''
      : '';

    for (const member of family.members) {
      attendees.push({
        familyName: family.name,
        memberName: member.name,
        type: member.type,
        age: member.age,
        email: family.email || '',
        phone: family.phone || '',
        whatsapp: family.whatsapp_number || '',
        language: family.preferred_language,
        channel: family.channel_preference,
        invitedByAdmin: invitedBy,
        attending: member.attending === null ? 'Pending' : member.attending ? 'Yes' : 'No',
        dietaryRestrictions: member.dietary_restrictions || '',
        accessibilityNeeds: member.accessibility_needs || '',
        tableName: member.table_id ? tableMap.get(member.table_id) || '' : '',
        addedByGuest: member.added_by_guest,
      });
    }
  }
  return attendees;
}

/**
 * Fetch guests per administrator data
 */
export async function fetchGuestsPerAdmin(wedding_id: string): Promise<GuestsPerAdminData[]> {
  const weddingAdmins = await prisma.weddingAdmin.findMany({
    where: { wedding_id },
    select: { id: true, name: true, email: true },
  });

  const reportData: GuestsPerAdminData[] = [];

  for (const admin of weddingAdmins) {
    const families = await prisma.family.findMany({
      where: { wedding_id, invited_by_admin_id: admin.id },
      select: {
        id: true,
        members: { select: { attending: true } },
      },
    });

    let totalGuests = 0;
    let attendingGuests = 0;
    let notAttendingGuests = 0;
    let pendingGuests = 0;

    for (const family of families) {
      totalGuests += family.members.length;
      for (const member of family.members) {
        if (member.attending === true) attendingGuests++;
        else if (member.attending === false) notAttendingGuests++;
        else pendingGuests++;
      }
    }

    reportData.push({
      adminName: admin.name || 'N/A',
      adminEmail: admin.email,
      totalFamilies: families.length,
      totalGuests,
      attendingGuests,
      notAttendingGuests,
      pendingGuests,
    });
  }

  return reportData.sort((a, b) => b.totalGuests - a.totalGuests);
}

/**
 * Fetch seating plan data
 */
export async function fetchSeatingPlan(wedding_id: string): Promise<SeatingPlanData[]> {
  const tables = await prisma.table.findMany({
    where: { wedding_id },
    select: {
      id: true,
      name: true,
      number: true,
      capacity: true,
      assigned_guests: {
        select: {
          id: true,
          name: true,
          type: true,
          attending: true,
          dietary_restrictions: true,
          accessibility_needs: true,
          family: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const seatingData: SeatingPlanData[] = [];
  for (const table of tables) {
    for (const member of table.assigned_guests) {
      const otherDetails: string[] = [];
      if (member.dietary_restrictions) otherDetails.push(`Diet: ${member.dietary_restrictions}`);
      if (member.accessibility_needs) otherDetails.push(`Access: ${member.accessibility_needs}`);

      seatingData.push({
        tableName: table.name || `Table ${table.number}`,
        tableCapacity: table.capacity,
        guestName: member.name,
        guestType: member.type,
        familyName: member.family.name,
        attending: member.attending === null ? 'Pending' : member.attending ? 'Yes' : 'No',
        dietaryRestrictions: member.dietary_restrictions || '',
        accessibilityNeeds: member.accessibility_needs || '',
        otherDetails: otherDetails.join(' | '),
      });
    }
  }
  return seatingData;
}

/**
 * Fetch guest age average data
 */
export async function fetchAgeAverage(wedding_id: string): Promise<AgeAverageData[]> {
  // Get all members with age and their grouping info
  const members = await prisma.familyMember.findMany({
    where: { family: { wedding_id } },
    select: {
      age: true,
      table_id: true,
      family: {
        select: {
          invited_by_admin_id: true,
        },
      },
    },
  });

  const tables = await prisma.table.findMany({
    where: { wedding_id },
    select: { id: true, name: true },
  });
  const tableMap = new Map(tables.map(t => [t.id, t.name]));

  const admins = await prisma.weddingAdmin.findMany({
    where: { wedding_id },
    select: { id: true, name: true, email: true },
  });
  const adminMap = new Map(admins.map(a => [a.id, a.name || a.email]));

  const adminStats = new Map<string, { ages: number[], count: number }>();
  const tableStats = new Map<string, { ages: number[], count: number }>();

  for (const member of members) {
    const age = member.age;
    
    // Group by Admin
    const adminId = member.family.invited_by_admin_id || 'none';
    const adminName = adminMap.get(adminId) || (adminId === 'none' ? 'Not Assigned' : 'Unknown');
    if (!adminStats.has(adminName)) adminStats.set(adminName, { ages: [], count: 0 });
    const aStat = adminStats.get(adminName)!;
    aStat.count++;
    if (age !== null) aStat.ages.push(age);

    // Group by Table
    const tableId = member.table_id || 'none';
    const tableName = tableMap.get(tableId) || (tableId === 'none' ? 'Not Seated' : 'Unknown');
    if (!tableStats.has(tableName)) tableStats.set(tableName, { ages: [], count: 0 });
    const tStat = tableStats.get(tableName)!;
    tStat.count++;
    if (age !== null) tStat.ages.push(age);
  }

  const result: AgeAverageData[] = [];

  // Add Admin stats
  adminStats.forEach((stat, name) => {
    const avg = stat.ages.length > 0 ? stat.ages.reduce((a, b) => a + b, 0) / stat.ages.length : null;
    result.push({
      groupType: 'Administrator',
      groupName: name,
      averageAge: avg !== null ? Math.round(avg * 10) / 10 : null,
      guestCount: stat.count,
      minAge: stat.ages.length > 0 ? Math.min(...stat.ages) : null,
      maxAge: stat.ages.length > 0 ? Math.max(...stat.ages) : null,
    });
  });

  // Add Table stats
  tableStats.forEach((stat, name) => {
    const avg = stat.ages.length > 0 ? stat.ages.reduce((a, b) => a + b, 0) / stat.ages.length : null;
    result.push({
      groupType: 'Table',
      groupName: name,
      averageAge: avg !== null ? Math.round(avg * 10) / 10 : null,
      guestCount: stat.count,
      minAge: stat.ages.length > 0 ? Math.min(...stat.ages) : null,
      maxAge: stat.ages.length > 0 ? Math.max(...stat.ages) : null,
    });
  });

  return result;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export attendee list
 */
export async function exportAttendeeList(
  wedding_id: string,
  format: ExportFormat = 'xlsx'
): Promise<ExportResult> {
  const attendees = await fetchAttendeeList(wedding_id);
  const rows: (string | number)[][] = [[
    'Family Name', 'Guest Name', 'Type', 'Age', 'Email', 'Phone', 'WhatsApp',
    'Language', 'Channel', 'Invited By', 'Attending', 'Dietary Restrictions',
    'Accessibility Needs', 'Table', 'Added By Guest'
  ]];

  attendees.forEach(a => {
    rows.push([
      a.familyName, a.memberName, a.type, a.age || '', a.email, a.phone, a.whatsapp,
      a.language, a.channel || '', a.invitedByAdmin, a.attending, a.dietaryRestrictions,
      a.accessibilityNeeds, a.tableName, a.addedByGuest ? 'Yes' : 'No'
    ]);
  });

  return generateExcelFile(rows, 'Attendee List', 'attendee-list', format);
}

/**
 * Export guests per administrator
 */
export async function exportGuestsPerAdmin(
  wedding_id: string,
  format: ExportFormat = 'xlsx'
): Promise<ExportResult> {
  const data = await fetchGuestsPerAdmin(wedding_id);
  const rows: (string | number)[][] = [[
    'Administrator Name', 'Email', 'Total Families', 'Total Guests', 'Attending', 'Not Attending', 'Pending'
  ]];

  data.forEach(d => {
    rows.push([d.adminName, d.adminEmail, d.totalFamilies, d.totalGuests, d.attendingGuests, d.notAttendingGuests, d.pendingGuests]);
  });

  const totals = data.reduce((acc, r) => ({
    totalFamilies: acc.totalFamilies + r.totalFamilies,
    totalGuests: acc.totalGuests + r.totalGuests,
    attendingGuests: acc.attendingGuests + r.attendingGuests,
    notAttendingGuests: acc.notAttendingGuests + r.notAttendingGuests,
    pendingGuests: acc.pendingGuests + r.pendingGuests,
  }), { totalFamilies: 0, totalGuests: 0, attendingGuests: 0, notAttendingGuests: 0, pendingGuests: 0 });

  rows.push(['TOTAL', '', totals.totalFamilies, totals.totalGuests, totals.attendingGuests, totals.notAttendingGuests, totals.pendingGuests]);

  return generateExcelFile(rows, 'Guests Per Admin', 'guests-per-admin', format);
}

/**
 * Export seating plan
 */
export async function exportSeatingPlan(
  wedding_id: string,
  format: ExportFormat = 'xlsx'
): Promise<ExportResult> {
  const data = await fetchSeatingPlan(wedding_id);
  const rows: (string | number)[][] = [[
    'Table Name', 'Table Capacity', 'Guest Name', 'Type', 'Family Name', 'Attending', 'Dietary Restrictions', 'Accessibility Needs', 'Other Details'
  ]];

  data.forEach(d => {
    rows.push([d.tableName, d.tableCapacity, d.guestName, d.guestType, d.familyName, d.attending, d.dietaryRestrictions, d.accessibilityNeeds, d.otherDetails]);
  });

  return generateExcelFile(rows, 'Seating Plan', 'seating-plan', format);
}

/**
 * Export age average report
 */
export async function exportAgeAverage(
  wedding_id: string,
  format: ExportFormat = 'xlsx'
): Promise<ExportResult> {
  const data = await fetchAgeAverage(wedding_id);
  const rows: (string | number)[][] = [[
    'Group Type', 'Group Name', 'Average Age', 'Guest Count', 'Min Age', 'Max Age'
  ]];

  data.forEach(d => {
    rows.push([d.groupType, d.groupName, d.averageAge || 'N/A', d.guestCount, d.minAge || 'N/A', d.maxAge || 'N/A']);
  });

  return generateExcelFile(rows, 'Age Average', 'age-average', format);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateExcelFile(
  rows: (string | number)[][],
  sheetName: string,
  filePrefix: string,
  format: ExportFormat
): ExportResult {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  const columnWidths = rows[0].map((_, colIndex) => {
    const maxLength = Math.max(...rows.map((row) => String(row[colIndex] || '').length));
    return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
  });

  worksheet['!cols'] = columnWidths;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename: `${filePrefix}-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  } else {
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: Buffer.from(buffer),
      filename: `${filePrefix}-${timestamp}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}