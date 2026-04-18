
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 80,
    paddingBottom: 56,
    paddingHorizontal: 56,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  // Fixed header shown on every content page
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 56,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e11d48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  pageHeaderLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  logo: {
    maxWidth: 100,
    maxHeight: 36,
    objectFit: 'contain',
  },
  brandName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#e11d48',
  },
  contractTitle: {
    fontSize: 11,
    color: '#6b7280',
  },
  contractMeta: {
    textAlign: 'right',
  },
  metaItem: { fontSize: 9, color: '#6b7280' },
  metaBold: { fontFamily: 'Helvetica-Bold' },
  content: { marginTop: 8 },
  paragraph: { marginBottom: 12, fontSize: 10 },
  heading1: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 20,
    color: '#1a1a1a',
  },
  heading2: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    marginTop: 16,
    color: '#374151',
  },
  heading3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    marginTop: 12,
    color: '#4b5563',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  bullet: { width: 16, fontSize: 10 },
  listText: { flex: 1, fontSize: 10 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    textAlign: 'center',
    fontSize: 8,
    color: '#d1d5db',
  },

  // ── Dedicated signature page ───────────────────────────────────────────────
  signaturePage: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 80,
    paddingBottom: 56,
    paddingHorizontal: 56,
    color: '#1a1a1a',
  },
  sigPageTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  sigPageSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 48,
    lineHeight: 1.5,
  },
  sigRow: {
    flexDirection: 'row',
    gap: 32,
  },
  sigBlock: {
    flex: 1,
  },
  sigRole: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sigName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  // The actual line where DocuSeal overlays the signature widget
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    marginBottom: 6,
    height: 48,
  },
  sigImage: {
    maxWidth: 180,
    maxHeight: 56,
    objectFit: 'contain',
    marginBottom: 6,
  },
  sigDateLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
  },
  sigPageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    textAlign: 'center',
    fontSize: 8,
    color: '#d1d5db',
  },
});

// TipTap ProseMirror JSON node types
type TextMark = { type: string; attrs?: Record<string, unknown> };
type TextNode = { type: 'text'; text: string; marks?: TextMark[] };
type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: TextMark[];
};

function renderInlineText(node: DocNode): React.ReactNode {
  if (node.type !== 'text') return null;
  const text = node.text ?? '';
  if (!node.marks || node.marks.length === 0) return text;

  let style: Record<string, unknown> = {};
  const marks = node.marks ?? [];
  for (const mark of marks) {
    if (mark.type === 'bold') style = { ...style, fontFamily: 'Helvetica-Bold' };
    if (mark.type === 'italic') style = { ...style, fontStyle: 'italic' };
    if (mark.type === 'underline') style = { ...style, textDecoration: 'underline' };
  }

  return <Text style={style as never}>{text}</Text>;
}

function renderNode(node: DocNode, index: number): React.ReactNode {
  switch (node.type) {
    case 'paragraph': {
      const children = (node.content ?? []).map((child, i) => (
        <React.Fragment key={i}>{renderInlineText(child as TextNode)}</React.Fragment>
      ));
      return (
        <Text key={index} style={styles.paragraph}>
          {children}
        </Text>
      );
    }
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const headingStyle =
        level === 1 ? styles.heading1 : level === 2 ? styles.heading2 : styles.heading3;
      const children = (node.content ?? []).map((child, i) => (
        <React.Fragment key={i}>{renderInlineText(child as TextNode)}</React.Fragment>
      ));
      return (
        <Text key={index} style={headingStyle}>
          {children}
        </Text>
      );
    }
    case 'bulletList': {
      return (
        <View key={index}>
          {(node.content ?? []).map((item, i) => {
            const paragraphs = (item.content ?? []).flatMap((p) =>
              (p.content ?? []).map((c, ci) => (
                <React.Fragment key={ci}>{renderInlineText(c as TextNode)}</React.Fragment>
              ))
            );
            return (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{paragraphs}</Text>
              </View>
            );
          })}
        </View>
      );
    }
    case 'orderedList': {
      return (
        <View key={index}>
          {(node.content ?? []).map((item, i) => {
            const paragraphs = (item.content ?? []).flatMap((p) =>
              (p.content ?? []).map((c, ci) => (
                <React.Fragment key={ci}>{renderInlineText(c as TextNode)}</React.Fragment>
              ))
            );
            return (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>{i + 1}.</Text>
                <Text style={styles.listText}>{paragraphs}</Text>
              </View>
            );
          })}
        </View>
      );
    }
    case 'hardBreak':
      return <Text key={index}>{'\n'}</Text>;
    default:
      return null;
  }
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
  signatureUrl?: string;
}

export interface ContractPDFLabels {
  dateLabel: string;
  footer: string;
  sigPageTitle: string;
  sigPageSubtitle: string;
  weddingPlanner: string;
  clientSigner: string;
  signatureDate: string;
}

interface ContractPDFProps {
  title: string;
  content: { type: string; content?: DocNode[] };
  company: CompanyInfo;
  signerName?: string;
  createdAt?: Date;
  signedAt?: Date;
  labels: ContractPDFLabels;
  locale: string;
}

export function ContractPDF({ title, content, company, signerName, createdAt, signedAt, labels, locale }: ContractPDFProps) {
  const nodes = content?.content ?? [];

  return (
    <Document>
      {/* ── Page 1+: Contract content ─────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        {/* Fixed header on every content page */}
        <View style={styles.pageHeader} fixed>
          <View style={styles.pageHeaderLeft}>
            {company.logoUrl ? (
              <Image src={company.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.brandName}>{company.name}</Text>
            )}
            <Text style={styles.contractTitle}>{title}</Text>
          </View>
          {createdAt && (
            <View style={styles.contractMeta}>
              <Text style={styles.metaItem}>
                {labels.dateLabel}{' '}
                <Text style={styles.metaBold}>
                  {new Date(createdAt).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {nodes.map((node, i) => renderNode(node, i))}
        </View>

        <Text style={styles.footer} fixed>
          {labels.footer}
        </Text>
      </Page>

      {/* ── Dedicated signature page (always the final page) ──────────────── */}
      {/*
       * This page is always the last page of the PDF.
       * When submitting to DocuSeal for online signing, the signature fields
       * are placed at known coordinates on this page (x≈0.52, y≈0.25, w≈0.38, h≈0.10).
       * For manual/offline signing, the lines and labels serve as guidance.
       */}
      <Page size="A4" style={styles.signaturePage}>
        {/* Header on signature page too */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            {company.logoUrl ? (
              <Image src={company.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.brandName}>{company.name}</Text>
            )}
          </View>
        </View>

        <Text style={styles.sigPageTitle}>{labels.sigPageTitle}</Text>
        <Text style={styles.sigPageSubtitle}>{labels.sigPageSubtitle}</Text>

        <View style={styles.sigRow}>
          {/* Left: Planner signature (static — pre-signed or stamped) */}
          <View style={styles.sigBlock}>
            <Text style={styles.sigRole}>{labels.weddingPlanner}</Text>
            <Text style={styles.sigName}>{company.legalName ?? company.name}</Text>
            {company.signatureUrl ? (
              <Image src={company.signatureUrl} style={styles.sigImage} />
            ) : (
              <View style={styles.sigLine} />
            )}
            <Text style={styles.sigDateLabel}>
              {labels.signatureDate}
              {signedAt && (
                <>
                  {' '}
                  <Text style={styles.metaBold}>
                    {signedAt.toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </>
              )}
            </Text>
          </View>

          {/* Right: Client signature — DocuSeal overlays its widget here */}
          <View style={styles.sigBlock}>
            <Text style={styles.sigRole}>{labels.clientSigner}</Text>
            <Text style={styles.sigName}>{signerName ?? 'Client'}</Text>
            {/*
             * DocuSeal signature field target area.
             * DocuSeal places the interactive signature widget here when
             * the template is created with:
             *   areas: [{ x: 0.52, y: 0.25, w: 0.38, h: 0.10, page: <lastPage> }]
             */}
            <View style={styles.sigLine} />
            <Text style={styles.sigDateLabel}>{labels.signatureDate}</Text>
          </View>
        </View>

        <Text style={styles.sigPageFooter}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}
