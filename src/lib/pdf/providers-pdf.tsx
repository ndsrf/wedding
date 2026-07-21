/**
 * Providers PDF Report Component
 * Generates a PDF report of providers, costs, and payments
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Table,
  TableCell,
  Image as PDFImage,
} from '@react-pdf/renderer';

export interface ProvidersPDFLabels {
  title: string;
  generatedBy: string;
  category: string;
  provider: string;
  contact: string;
  email: string;
  phone: string;
  budgeted: string;
  projected: string;
  total: string;
  paid: string;
  pending: string;
  notes: string;
  totals: string;
  plannedGuests: string;
}

interface Category {
  id: string;
  name: string;
  price_type: 'PER_PERSON' | 'GLOBAL';
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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 15,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 3,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
  },
  table: {
    width: '100%',
    marginBottom: 15,
    border: 1,
    borderColor: '#d1d5db',
  },
  tableHeader: {
    backgroundColor: '#374151',
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
    flex: 1,
  },
  tableCellRight: {
    textAlign: 'right',
  },
  totalsRow: {
    fontWeight: 'bold',
    backgroundColor: '#e0e7ff',
    color: '#1e1b4b',
  },
  footer: {
    marginTop: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 9,
  },
  currency: {
    textAlign: 'right',
  },
});

interface ProvidersPDFProps {
  weddingProviders: WeddingProvider[];
  logoUrl?: string | null;
  labels: ProvidersPDFLabels;
  plannedGuests?: number;
}

export function ProvidersPDF({ weddingProviders, logoUrl, labels, plannedGuests = 0 }: ProvidersPDFProps) {
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

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate totals
  let totalBudgeted = 0;
  let totalReal = 0;
  let totalPaid = 0;

  for (const wp of weddingProviders) {
    const paid = wp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    totalBudgeted += getProjected(wp);
    totalReal += getRealTotal(wp);
    totalPaid += paid;
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with logo */}
        <View style={styles.header}>
          {logoUrl && (
            <PDFImage
              src={logoUrl}
              style={styles.logo}
              cache={false}
              onError={() => console.warn('Logo failed to load')}
            />
          )}
          <View style={styles.headerContent}>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.subtitle}>{new Date().toLocaleDateString()}</Text>
            {plannedGuests > 0 && (
              <Text style={styles.subtitle}>
                {labels.plannedGuests}: {plannedGuests}
              </Text>
            )}
          </View>
        </View>

        {/* Providers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.title}</Text>

          {/* Table */}
          <View style={styles.table}>
            {/* Header Row */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={[styles.tableCell, { flex: 1.5 }]}>
                <Text>{labels.category}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 2 }]}>
                <Text>{labels.provider}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text>{labels.contact}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                <Text>{labels.budgeted}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                <Text>{labels.projected}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                <Text>{labels.total}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.2, ...styles.tableCellRight }]}>
                <Text>{labels.paid}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.2, ...styles.tableCellRight }]}>
                <Text>{labels.pending}</Text>
              </View>
            </View>

            {/* Data Rows */}
            {weddingProviders.map((wp, index) => {
              const paid = wp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
              const total = getRealTotal(wp);
              const projected = getProjected(wp);
              const pending = total - paid;

              return (
                <View key={wp.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  <View style={[styles.tableCell, { flex: 1.5 }]}>
                    <Text>{wp.category.name}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text>{wp.name || wp.provider?.name || ''}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text>{wp.contact_name || wp.provider?.contact_name || ''}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                    <Text>{wp.budgeted_price ? `${formatCurrency(Number(wp.budgeted_price))}` : '—'}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                    <Text>{projected > 0 ? formatCurrency(projected) : '—'}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                    <Text>{total > 0 ? formatCurrency(total) : '—'}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.2, ...styles.tableCellRight }]}>
                    <Text>{paid > 0 ? formatCurrency(paid) : '—'}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.2, ...styles.tableCellRight }]}>
                    <Text>{pending > 0 ? formatCurrency(pending) : '—'}</Text>
                  </View>
                </View>
              );
            })}

            {/* Totals Row */}
            <View style={[styles.tableRow, styles.totalsRow]}>
              <View style={[styles.tableCell, { flex: 1.5 }]}>
                <Text>{labels.totals}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 2 }]}>
                <Text></Text>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text></Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                <Text></Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                <Text>{formatCurrency(totalBudgeted)}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.5, ...styles.tableCellRight }]}>
                <Text>{formatCurrency(totalReal)}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.2, ...styles.tableCellRight }]}>
                <Text>{formatCurrency(totalPaid)}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.2, ...styles.tableCellRight }]}>
                <Text>{formatCurrency(totalReal - totalPaid)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{labels.generatedBy}</Text>
        </View>
      </Page>
    </Document>
  );
}
