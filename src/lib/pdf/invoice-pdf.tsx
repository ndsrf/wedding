
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Prisma } from '@prisma/client';

type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: { line_items: true; payments: true };
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
    marginBottom: 32,
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

function formatCurrency(amount: number | string | { toNumber: () => number }, currency: string) {
  const num = typeof amount === 'object' && 'toNumber' in amount ? amount.toNumber() : Number(amount);
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(num);
}

interface InvoicePDFProps {
  invoice: InvoiceWithDetails;
  plannerName: string;
  plannerEmail?: string;
}

export function InvoicePDF({ invoice, plannerName, plannerEmail }: InvoicePDFProps) {
  const total = Number(invoice.total);
  const amountPaid = Number(invoice.amount_paid);
  const balanceDue = total - amountPaid;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{plannerName}</Text>
            <Text style={styles.docTitle}>Invoice</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>Invoice Number</Text>
            <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
            {invoice.issued_at && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>Issue Date</Text>
                <Text style={styles.metaValue}>{new Date(invoice.issued_at).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </>
            )}
            {invoice.due_date && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>Due Date</Text>
                <Text style={styles.metaValue}>{new Date(invoice.due_date).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client & From */}
        <View style={styles.clientRow}>
          <View style={styles.clientBlock}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.clientName}>{invoice.client_name}</Text>
            {invoice.client_email && <Text style={styles.clientDetail}>{invoice.client_email}</Text>}
          </View>
          <View style={styles.clientBlock}>
            <Text style={styles.sectionTitle}>From</Text>
            <Text style={styles.clientName}>{plannerName}</Text>
            {plannerEmail && <Text style={styles.clientDetail}>{plannerEmail}</Text>}
          </View>
        </View>

        {/* Line Items */}
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colDescription]}>Description</Text>
          <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
          <Text style={[styles.headerText, styles.colUnitPrice]}>Unit Price</Text>
          <Text style={[styles.headerText, styles.colTotal]}>Total</Text>
        </View>
        {invoice.line_items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <View style={styles.colDescription}>
              <Text style={styles.cellText}>{item.name}</Text>
              {item.description && <Text style={styles.cellSubText}>{item.description}</Text>}
            </View>
            <Text style={[styles.cellText, styles.colQty]}>{Number(item.quantity)}</Text>
            <Text style={[styles.cellText, styles.colUnitPrice]}>{formatCurrency(item.unit_price, invoice.currency)}</Text>
            <Text style={[styles.cellText, styles.colTotal]}>{formatCurrency(item.total, invoice.currency)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.subtotal, invoice.currency)}</Text>
          </View>
          {invoice.tax_rate && Number(invoice.tax_rate) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({Number(invoice.tax_rate)}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoice.tax_amount ?? 0, invoice.currency)}</Text>
            </View>
          )}
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(total, invoice.currency)}</Text>
          </View>
          {amountPaid > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Amount Paid</Text>
              <Text style={[styles.totalsValue, { color: '#16a34a' }]}>- {formatCurrency(amountPaid, invoice.currency)}</Text>
            </View>
          )}
        </View>

        {balanceDue > 0 && (
          <View style={styles.balanceDue}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balanceDue, invoice.currency)}</Text>
          </View>
        )}

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <View style={styles.paymentsSection}>
            <Text style={styles.sectionTitle}>Payments Received</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { width: 100 }]}>Date</Text>
              <Text style={[styles.headerText, { flex: 1 }]}>Method</Text>
              <Text style={[styles.headerText, { flex: 1 }]}>Reference</Text>
              <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Amount</Text>
            </View>
            {invoice.payments.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <Text style={styles.paymentDate}>{new Date(p.payment_date).toLocaleDateString('en')}</Text>
                <Text style={styles.paymentMethod}>{p.method.replace('_', ' ')}</Text>
                <Text style={styles.paymentRef}>{p.reference ?? '—'}</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(p.amount, p.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        {invoice.description && (
          <View style={[styles.bankDetails, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.bankText}>{invoice.description}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Thank you for your business. Please contact us if you have any questions about this invoice.
        </Text>
      </Page>
    </Document>
  );
}
