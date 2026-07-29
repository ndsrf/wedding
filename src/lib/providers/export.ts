/**
 * Providers Export Utility
 * Exports providers data to Excel or PDF format
 */

import * as XLSX from 'xlsx';

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

interface Category {
  id: string;
  name: string;
  price_type: 'PER_PERSON' | 'GLOBAL';
}

interface Provider {
  id: string;
  category_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  social_media?: string;
  approx_price?: number;
}

interface WeddingProvider {
  id: string;
  wedding_id: string;
  category_id: string;
  provider_id: string | null;
  name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_media: string | null;
  total_price: number | null;
  budgeted_price: number | null;
  contract_url: string | null;
  notes: string | null;
  category: { id: string; name: string; price_type: 'PER_PERSON' | 'GLOBAL' };
  provider: {
    id: string; name: string; contact_name: string | null;
    email: string | null; phone: string | null;
    website: string | null; social_media: string | null;
  } | null;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  notes: string | null;
  document_url: string | null;
}

/**
 * Export providers library to Excel
 */
export function exportProvidersLibraryToExcel(
  categories: Category[],
  providers: Provider[]
): ExportResult {
  const exportRows: (string | number)[][] = [];

  // Header row
  exportRows.push([
    'Category',
    'Price Type',
    'Provider Name',
    'Contact Person',
    'Email',
    'Phone',
    'Website',
    'Social Media',
    'Approx. Price (€)'
  ]);

  // Add data rows
  for (const category of categories) {
    const categoryProviders = providers.filter(p => p.category_id === category.id);

    if (categoryProviders.length === 0) {
      // Add category header even if no providers
      exportRows.push([category.name, category.price_type, '', '', '', '', '', '', '']);
    } else {
      categoryProviders.forEach((provider, index) => {
        exportRows.push([
          index === 0 ? category.name : '',
          index === 0 ? category.price_type : '',
          provider.name,
          provider.contact_name || '',
          provider.email || '',
          provider.phone || '',
          provider.website || '',
          provider.social_media || '',
          provider.approx_price || ''
        ]);
      });
    }
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Category
    { wch: 15 }, // Price Type
    { wch: 25 }, // Provider Name
    { wch: 20 }, // Contact Person
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 25 }, // Website
    { wch: 20 }, // Social Media
    { wch: 15 }  // Approx. Price
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Providers Library');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const timestamp = new Date().toISOString().split('T')[0];

  return {
    buffer: Buffer.from(buffer),
    filename: `providers-library-${timestamp}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/**
 * Export wedding providers with costs and payments to Excel
 */
export function exportWeddingProvidersToExcel(
  weddingProviders: WeddingProvider[],
  plannedGuests: number = 0
): ExportResult {
  const exportRows: (string | number)[][] = [];

  // Helper functions
  const getProjected = (wp: WeddingProvider): number => {
    const b = wp.budgeted_price ? Number(wp.budgeted_price) : 0;
    if (!b) return 0;
    return wp.category.price_type === 'PER_PERSON' && plannedGuests ? b * plannedGuests : b;
  };

  const getRealTotal = (wp: WeddingProvider): number => {
    const r = wp.total_price ? Number(wp.total_price) : 0;
    if (!r) return 0;
    return wp.category.price_type === 'PER_PERSON' && plannedGuests ? r * plannedGuests : r;
  };

  // Header row
  exportRows.push([
    'Category',
    'Provider Name',
    'Contact Person',
    'Email',
    'Phone',
    'Budgeted Price (€)',
    'Projected Total (€)',
    'Total Price (€)',
    'Paid (€)',
    'Pending (€)',
    'Notes'
  ]);

  // Calculate totals
  let totalBudgeted = 0;
  let totalReal = 0;
  let totalPaid = 0;

  // Add data rows
  for (const wp of weddingProviders) {
    const paid = wp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const total = getRealTotal(wp);
    const projected = getProjected(wp);
    const pending = total - paid;

    totalBudgeted += projected;
    totalReal += total;
    totalPaid += paid;

    exportRows.push([
      wp.category.name,
      wp.name || wp.provider?.name || '',
      wp.contact_name || wp.provider?.contact_name || '',
      wp.email || wp.provider?.email || '',
      wp.phone || wp.provider?.phone || '',
      wp.budgeted_price || '',
      projected,
      total,
      paid,
      pending,
      wp.notes || ''
    ]);
  }

  // Add totals row
  exportRows.push([
    '',
    '',
    '',
    '',
    'TOTALS:',
    '',
    totalBudgeted,
    totalReal,
    totalPaid,
    totalReal - totalPaid,
    ''
  ]);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Category
    { wch: 25 }, // Provider Name
    { wch: 20 }, // Contact Person
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // Budgeted
    { wch: 15 }, // Projected
    { wch: 15 }, // Total
    { wch: 12 }, // Paid
    { wch: 12 }, // Pending
    { wch: 30 }  // Notes
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Wedding Providers');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const timestamp = new Date().toISOString().split('T')[0];

  return {
    buffer: Buffer.from(buffer),
    filename: `wedding-providers-${timestamp}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
