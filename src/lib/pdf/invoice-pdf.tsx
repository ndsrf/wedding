
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

type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: { line_items: true; payments: true; customer: true };
}>;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 64,
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
  metaRight: { textAlign: 'right' },
  metaLabel: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 24 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  clientRow: { flexDirection: 'row', gap: 48, marginBottom: 24 },
  clientBlock: { flex: 1 },
  clientName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  clientDetail: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
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
  balanceDue: {
    backgroundColor: '#fdf2f8',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  balanceValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#e11d48' },
  paymentsSection: {
    marginTop: 24,
  },
  paymentRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentDate: { width: 100, fontSize: 9 },
  paymentMethod: { flex: 1, fontSize: 9, color: '#6b7280' },
  paymentRef: { flex: 1, fontSize: 9, color: '#6b7280' },
  paymentAmount: { width: 80, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#16a34a' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 8,
    color: '#d1d5db',
  },
  bankDetails: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  bankText: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
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

export interface InvoicePDFLabels {
  docTitle: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  billTo: string;
  from: string;
  services: string;
  description: string;
  qty: string;
  unitPrice: string;
  total: string;
  subtotal: string;
  discount: string;
  tax: string;
  amountPaid: string;
  balanceDue: string;
  paymentsReceived: string;
  date: string;
  method: string;
  reference: string;
  amount: string;
  notes: string;
  footer: string;
  idPrefix: string;
  vat: string;
}

interface InvoicePDFProps {
  invoice: InvoiceWithDetails;
  company: CompanyInfo;
  labels: InvoicePDFLabels;
  locale: string;
}

export function InvoicePDF({ invoice, company, labels, locale }: InvoicePDFProps) {
  const total = Number(invoice.total);
  const amountPaid = Number(invoice.amount_paid);
  const balanceDue = total - amountPaid;

  const fmt = (amount: number | string | { toNumber: () => number }) =>
    formatCurrency(amount, invoice.currency, locale);

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
            <Text style={styles.metaLabel}>{labels.invoiceNumber}</Text>
            <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
            {invoice.issued_at && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>{labels.issueDate}</Text>
                <Text style={styles.metaValue}>{fmtDate(invoice.issued_at)}</Text>
              </>
            )}
            {invoice.due_date && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>{labels.dueDate}</Text>
                <Text style={styles.metaValue}>{fmtDate(invoice.due_date)}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client & From */}
        <View style={styles.clientRow}>
          <View style={styles.clientBlock}>
            <Text style={styles.sectionTitle}>{labels.billTo}</Text>
            <Text style={styles.clientName}>{invoice.customer?.name ?? ''}</Text>
            {invoice.customer?.id_number && <Text style={styles.clientDetail}>{labels.idPrefix} {invoice.customer.id_number}</Text>}
            {invoice.customer?.email && <Text style={styles.clientDetail}>{invoice.customer.email}</Text>}
            {invoice.customer?.phone && <Text style={styles.clientDetail}>{invoice.customer.phone}</Text>}
            {invoice.customer?.address && <Text style={styles.clientDetail}>{invoice.customer.address}</Text>}
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

        {/* Line Items */}
        <Text style={styles.sectionTitle}>{labels.services}</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colDescription]}>{labels.description}</Text>
          <Text style={[styles.headerText, styles.colQty]}>{labels.qty}</Text>
          <Text style={[styles.headerText, styles.colUnitPrice]}>{labels.unitPrice}</Text>
          <Text style={[styles.headerText, styles.colTotal]}>{labels.total}</Text>
        </View>
        {invoice.line_items.map((item) => (
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
            <Text style={styles.totalsValue}>{fmt(invoice.subtotal)}</Text>
          </View>
          {invoice.discount && Number(invoice.discount) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{labels.discount}</Text>
              <Text style={styles.totalsValue}>- {fmt(invoice.discount)}</Text>
            </View>
          )}
          {invoice.tax_rate && Number(invoice.tax_rate) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{labels.tax.replace('{rate}', String(Number(invoice.tax_rate)))}</Text>
              <Text style={styles.totalsValue}>{fmt(invoice.tax_amount ?? 0)}</Text>
            </View>
          )}
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>{labels.total}</Text>
            <Text style={styles.totalFinalValue}>{fmt(total)}</Text>
          </View>
          {amountPaid > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{labels.amountPaid}</Text>
              <Text style={[styles.totalsValue, { color: '#16a34a' }]}>- {fmt(amountPaid)}</Text>
            </View>
          )}
        </View>

        {balanceDue > 0 && (
          <View style={styles.balanceDue}>
            <Text style={styles.balanceLabel}>{labels.balanceDue}</Text>
            <Text style={styles.balanceValue}>{fmt(balanceDue)}</Text>
          </View>
        )}

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <View style={styles.paymentsSection}>
            <Text style={styles.sectionTitle}>{labels.paymentsReceived}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { width: 100 }]}>{labels.date}</Text>
              <Text style={[styles.headerText, { flex: 1 }]}>{labels.method}</Text>
              <Text style={[styles.headerText, { flex: 1 }]}>{labels.reference}</Text>
              <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>{labels.amount}</Text>
            </View>
            {invoice.payments.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <Text style={styles.paymentDate}>{new Date(p.payment_date).toLocaleDateString(locale)}</Text>
                <Text style={styles.paymentMethod}>{p.method.replace('_', ' ')}</Text>
                <Text style={styles.paymentRef}>{p.reference ?? '—'}</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(p.amount, p.currency, locale)}</Text>
              </View>
            ))}
          </View>
        )}

        {invoice.description && (
          <View style={[styles.bankDetails, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>{labels.notes}</Text>
            <Text style={styles.bankText}>{invoice.description}</Text>
          </View>
        )}

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}
