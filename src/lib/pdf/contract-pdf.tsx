
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#e11d48',
    paddingBottom: 16,
    marginBottom: 24,
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#e11d48',
    marginBottom: 4,
  },
  contractTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  contractMeta: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 8,
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
  signatureSection: {
    marginTop: 48,
    flexDirection: 'row',
    gap: 32,
  },
  signatureBlock: { flex: 1 },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    marginBottom: 6,
    marginTop: 24,
  },
  signatureLabel: { fontSize: 9, color: '#6b7280' },
  footer: {
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

interface ContractPDFProps {
  title: string;
  content: { type: string; content?: DocNode[] };
  plannerName: string;
  signerName?: string;
  createdAt?: Date;
}

export function ContractPDF({ title, content, plannerName, signerName, createdAt }: ContractPDFProps) {
  const nodes = content?.content ?? [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brandName}>{plannerName}</Text>
          <Text style={styles.contractTitle}>{title}</Text>
          <View style={styles.contractMeta}>
            {createdAt && (
              <Text style={styles.metaItem}>
                Date: <Text style={styles.metaBold}>{new Date(createdAt).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </Text>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {nodes.map((node, i) => renderNode(node, i))}
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Wedding Planner – {plannerName}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Client – {signerName ?? 'Client'}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This document is confidential and constitutes a binding agreement upon signature by both parties.
        </Text>
      </Page>
    </Document>
  );
}
