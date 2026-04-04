
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { Prisma } from '@prisma/client';

type QuoteWithLineItems = Prisma.QuoteGetPayload<{
  include: { line_items: true; customer: true };
}>;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 6,
  },
  logo: {
    maxWidth: 120,
    maxHeight: 48,
    objectFit: 'contain',
  },
  brandName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#e11d48',
  },
  docTitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  metaRight: {
    textAlign: 'right',
  },
  metaLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  clientRow: {
    flexDirection: 'row',
    gap: 48,
    marginBottom: 24,
  },
  clientBlock: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDescription: { flex: 1 },
  colQty: { width: 50, textAlign: 'right' },
  colUnitPrice: { width: 70, textAlign: 'right' },
  colTotal: { width: 70, textAlign: 'right' },
  headerText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellText: { fontSize: 9 },
  cellSubText: { fontSize: 8, color: '#9ca3af', marginTop: 1 },
  totalsBlock: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: 240,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalsLabel: { fontSize: 9, color: '#6b7280' },
  totalsValue: { fontSize: 9 },
  totalFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: '#e11d48',
    marginTop: 4,
  },
  totalFinalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  totalFinalValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#e11d48' },
  notesSection: {
    marginTop: 32,
    backgroundColor: '#fdf2f8',
    borderRadius: 6,
    padding: 12,
  },
  notesText: { fontSize: 9, color: '#6b7280', lineHeight: 1.5 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 8,
    color: '#d1d5db',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

function formatCurrency(
  amount: number | string | { toNumber: () => number },
  currency: string,
  locale: string,
) {
  const num = typeof amount === 'object' && 'toNumber' in amount ? amount.toNumber() : Number(amount);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num);
}

export interface CompanyInfo {
  name: string;
  email?: string;
  logoUrl?: string;
  legalName?: string;
  vatNumber?: string;
  address?: string;
  phone?: string;
  website?: string;
}

export interface QuotePDFLabels {
  docTitle: string;
  quoteReference: string;
  issueDate: string;
  validUntil: string;
  quoteFor: string;
  from: string;
  services: string;
  description: string;
  qty: string;
  unitPrice: string;
  total: string;
  subtotal: string;
  discount: string;
  tax: string;
  notes: string;
  footer: string;
  event: string;
  vat: string;
  version: string;
}

interface QuotePDFProps {
  quote: QuoteWithLineItems;
  company: CompanyInfo;
  labels: QuotePDFLabels;
  locale: string;
}

export function QuotePDF({ quote, company, labels, locale }: QuotePDFProps) {
  const subtotal = Number(quote.subtotal);
  const discount = quote.discount ? Number(quote.discount) : 0;
  const taxRate = quote.tax_rate ? Number(quote.tax_rate) : 0;
  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const total = Number(quote.total);

  const fmt = (amount: number | string | { toNumber: () => number }) =>
    formatCurrency(amount, quote.currency, locale);

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logoUrl ? (
              <Image src={company.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.brandName}>{company.name}</Text>
            )}
            <Text style={styles.docTitle}>{labels.docTitle}</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>{labels.quoteReference}</Text>
            <Text style={styles.metaValue}>#{quote.id.slice(-8).toUpperCase()}</Text>
            <Text style={[styles.metaLabel, { marginTop: 8 }]}>{labels.issueDate}</Text>
            <Text style={styles.metaValue}>{fmtDate(quote.created_at)}</Text>
            {quote.expires_at && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>{labels.validUntil}</Text>
                <Text style={styles.metaValue}>{fmtDate(quote.expires_at)}</Text>
              </>
            )}
            {quote.version > 1 && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>{labels.version}</Text>
                <Text style={styles.metaValue}>v{quote.version}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client Info */}
        <View style={styles.clientRow}>
          <View style={styles.clientBlock}>
            <Text style={styles.sectionTitle}>{labels.quoteFor}</Text>
            <Text style={styles.clientName}>{quote.couple_names}</Text>
            {quote.customer?.email && <Text style={styles.clientDetail}>{quote.customer.email}</Text>}
            {quote.customer?.phone && <Text style={styles.clientDetail}>{quote.customer.phone}</Text>}
            {quote.customer?.address && <Text style={styles.clientDetail}>{quote.customer.address}</Text>}
            {quote.location && <Text style={styles.clientDetail}>{quote.location}</Text>}
            {quote.event_date && (
              <Text style={styles.clientDetail}>{labels.event} {fmtDate(quote.event_date)}</Text>
            )}
          </View>
          <View style={styles.clientBlock}>
            <Text style={styles.sectionTitle}>{labels.from}</Text>
            <Text style={styles.clientName}>{company.legalName ?? company.name}</Text>
            {company.vatNumber && <Text style={styles.clientDetail}>{labels.vat} {company.vatNumber}</Text>}
            {company.address && <Text style={styles.clientDetail}>{company.address}</Text>}
            {company.phone && <Text style={styles.clientDetail}>{company.phone}</Text>}
            {company.email && <Text style={styles.clientDetail}>{company.email}</Text>}
            {company.website && <Text style={styles.clientDetail}>{company.website}</Text>}
          </View>
        </View>

        {/* Line Items Table */}
        <Text style={styles.sectionTitle}>{labels.services}</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colDescription]}>{labels.description}</Text>
          <Text style={[styles.headerText, styles.colQty]}>{labels.qty}</Text>
          <Text style={[styles.headerText, styles.colUnitPrice]}>{labels.unitPrice}</Text>
          <Text style={[styles.headerText, styles.colTotal]}>{labels.total}</Text>
        </View>
        {quote.line_items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <View style={styles.colDescription}>
              <Text style={styles.cellText}>{item.name}</Text>
              {item.description && <Text style={styles.cellSubText}>{item.description}</Text>}
            </View>
            <Text style={[styles.cellText, styles.colQty]}>{Number(item.quantity)}</Text>
            <Text style={[styles.cellText, styles.colUnitPrice]}>{fmt(item.unit_price)}</Text>
            <Text style={[styles.cellText, styles.colTotal]}>{fmt(item.total)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{labels.subtotal}</Text>
            <Text style={styles.totalsValue}>{fmt(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{labels.discount}</Text>
              <Text style={styles.totalsValue}>- {fmt(discount)}</Text>
            </View>
          )}
          {taxRate > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{labels.tax.replace('{rate}', String(taxRate))}</Text>
              <Text style={styles.totalsValue}>{fmt(taxAmount)}</Text>
            </View>
          )}
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>{labels.total}</Text>
            <Text style={styles.totalFinalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>{labels.notes}</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}
