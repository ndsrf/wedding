import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// ─── Types ───────────────────────────────────────────────────────────────────

import type { PdfImageSrc } from './tasting-report-pdf';

export interface MenuDishData {
  id: string;
  name: string;
  description?: string | null;
  image_url?: PdfImageSrc | null;
}

export interface MenuSectionData {
  id: string;
  name: string;
  dishes: MenuDishData[];
}

export interface WeddingInfo {
  coupleNames?: string | null;
  weddingDate?: string | null;
}

export interface MenuPlannerInfo {
  name: string;
  logoUrl?: PdfImageSrc | null;
}

interface TastingMenuPDFProps {
  sections: MenuSectionData[];
  wedding: WeddingInfo;
  planner: MenuPlannerInfo;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ROSE = '#e11d48';
const GRAY_900 = '#111827';
const GRAY_500 = '#6b7280';
const GRAY_300 = '#d1d5db';
const GRAY_100 = '#f3f4f6';
const GRAY_50 = '#f9fafb';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    color: GRAY_900,
    backgroundColor: '#ffffff',
  },

  // ── Header ──
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    maxWidth: 110,
    maxHeight: 50,
    objectFit: 'contain',
    marginBottom: 10,
  },
  plannerName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: ROSE,
    marginBottom: 10,
  },
  coupleNames: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_900,
    textAlign: 'center',
  },
  weddingDate: {
    fontSize: 9,
    color: GRAY_500,
    marginTop: 4,
    textAlign: 'center',
  },
  menuSelectedTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: ROSE,
    textAlign: 'center',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: ROSE,
    marginBottom: 20,
    marginTop: 8,
  },

  // ── Section ──
  sectionContainer: {
    marginBottom: 14,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: ROSE,
    marginBottom: 8,
    paddingBottom: 3,
  },
  sectionName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: ROSE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Dish grid (2 columns) ──
  dishesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dishCard: {
    width: '48%',
    backgroundColor: GRAY_50,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: GRAY_100,
    marginBottom: 8,
    marginRight: '2%',
  },
  dishImage: {
    width: '100%',
    height: 60,
    objectFit: 'cover',
    borderRadius: 4,
  },
  dishBody: {
    padding: 6,
  },
  dishName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_900,
    marginBottom: 2,
  },
  dishDesc: {
    fontSize: 7.5,
    color: GRAY_500,
    lineHeight: 1.4,
  },
  dishNoImage: {
    height: 4,
    backgroundColor: ROSE,
    borderRadius: 2,
  },

  // ── Footer (every page) ──
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: GRAY_300,
    borderTopWidth: 0.5,
    borderTopColor: GRAY_100,
    paddingTop: 5,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TastingMenuPDF({ sections, wedding, planner }: TastingMenuPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          {planner.logoUrl ? (
            <Image src={planner.logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.plannerName}>{planner.name}</Text>
          )}
          {wedding.coupleNames && (
            <Text style={styles.coupleNames}>{wedding.coupleNames}</Text>
          )}
          {wedding.weddingDate && (
            <Text style={styles.weddingDate}>{formatDate(wedding.weddingDate)}</Text>
          )}
          <Text style={styles.menuSelectedTitle}>Menú Seleccionado</Text>
        </View>

        <View style={styles.divider} />

        {/* ── Sections ── */}
        {sections.map((section) => (
          <View key={section.id} style={styles.sectionContainer} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionName}>{section.name}</Text>
            </View>

            <View style={styles.dishesGrid}>
              {section.dishes.map((dish) => (
                <View key={dish.id} style={styles.dishCard}>
                  {dish.image_url ? (
                    <Image src={dish.image_url} style={styles.dishImage} />
                  ) : (
                    <View style={styles.dishNoImage} />
                  )}
                  <View style={styles.dishBody}>
                    <Text style={styles.dishName}>{dish.name}</Text>
                    {dish.description && (
                      <Text style={styles.dishDesc}>{dish.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── Footer: every page ── */}
        <Text fixed style={styles.footer}>Generado por Nupci</Text>
      </Page>
    </Document>
  );
}
