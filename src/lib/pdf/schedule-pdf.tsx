import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { ScheduleBlockWithTimes, ScheduleStageWithTime } from '@/types/schedule';

export interface PdfItineraryItem {
  id: string;
  dateTime: string;
  itemType: string;
  locationName: string;
  address?: string | null;
  notes?: string | null;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  CEREMONY: 'Ceremonia',
  PRE_EVENT: 'Pre-boda',
  POST_EVENT: 'Post-boda',
  EVENT: 'Evento',
};

// ─── Colours ─────────────────────────────────────────────────────────────────
const ROSE      = '#e11d48';
const GRAY_900  = '#111827';
const GRAY_700  = '#374151';
const GRAY_500  = '#6b7280';
const GRAY_200  = '#e5e7eb';
const GRAY_100  = '#f3f4f6';
const GRAY_50   = '#f9fafb';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 40,
    color: GRAY_900,
    backgroundColor: '#ffffff',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: ROSE,
  },
  headerLeft: { flex: 1 },
  coupleNames: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_900,
    letterSpacing: -0.5,
  },
  weddingDate: {
    fontSize: 10,
    color: GRAY_500,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 6,
  },
  plannerLogo: {
    width: 72,
    height: 36,
    objectFit: 'contain',
  },
  plannerName: {
    fontSize: 9,
    color: GRAY_500,
    textAlign: 'right',
  },

  // ── Wedding itinerary (locations / events) ────────────────────────────────
  weddingItinerary: {
    marginBottom: 24,
  },
  wItineraryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    gap: 10,
  },
  wItineraryTime: {
    width: 62,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_700,
    flexShrink: 0,
  },
  wItineraryBody: { flex: 1 },
  wItineraryLocation: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_900,
  },
  wItineraryType: {
    fontSize: 8,
    color: ROSE,
    marginTop: 1,
  },
  wItineraryAddress: {
    fontSize: 7.5,
    color: GRAY_500,
    marginTop: 1,
  },
  wItineraryNotes: {
    fontSize: 7.5,
    color: GRAY_500,
    fontStyle: 'italic',
    marginTop: 1,
  },

  // ── Schedule summary ─────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_500,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  itinerary: {
    marginBottom: 24,
    backgroundColor: GRAY_50,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  itineraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
  },
  itineraryRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itineraryDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 8 },
  itineraryName: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_900,
  },
  itineraryTime: { fontSize: 9, color: GRAY_700, width: 90, textAlign: 'right' },

  // ── Detailed schedule ─────────────────────────────────────────────────────
  block: { marginBottom: 18 },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  blockDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  blockName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: GRAY_900, flex: 1 },
  blockTime: { fontSize: 8, color: GRAY_500 },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 2,
    backgroundColor: GRAY_50,
    borderRadius: 4,
  },
  stageTime: { width: 40, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GRAY_700 },
  stageName: { flex: 1, fontSize: 9, color: GRAY_900, paddingHorizontal: 8 },
  stageDuration: { fontSize: 8, color: GRAY_500, width: 38, textAlign: 'right' },
  stageNotes: {
    fontSize: 7,
    color: GRAY_500,
    marginLeft: 56,
    marginBottom: 3,
    fontStyle: 'italic',
  },
  stageProvider: {
    fontSize: 7,
    color: GRAY_700,
    marginLeft: 56,
    marginBottom: 3,
  },
  plannerOnlyBadge: {
    fontSize: 6,
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: GRAY_500 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// ─── Stage Row ────────────────────────────────────────────────────────────────

function StageRow({ stage, viewMode }: { stage: ScheduleStageWithTime; viewMode: 'planner' | 'couple' }) {
  const isPlannerOnly = viewMode === 'planner' && !stage.visible_to_couple;
  const p = stage.wedding_provider;
  const providerLine = p
    ? [
        p.name ?? p.category.name,
        p.contact_name,
        p.phone,
        p.email,
      ].filter(Boolean).join(' · ')
    : null;
  return (
    <>
      <View style={styles.stageRow}>
        <Text style={styles.stageTime}>{stage.calculated_start_time}</Text>
        <Text style={styles.stageName}>{stage.name}</Text>
        {isPlannerOnly && <Text style={styles.plannerOnlyBadge}>Solo planner</Text>}
        <Text style={styles.stageDuration}>{durationLabel(stage.duration_minutes)}</Text>
      </View>
      {providerLine && (
        <Text style={styles.stageProvider}>{providerLine}</Text>
      )}
      {stage.notes && (
        <Text style={styles.stageNotes}>{stage.notes}</Text>
      )}
    </>
  );
}

// ─── Main PDF Component ───────────────────────────────────────────────────────

export interface SchedulePDFProps {
  blocks: ScheduleBlockWithTimes[];
  coupleNames: string;
  weddingDate?: string | null;
  startTime: string;
  viewMode: 'planner' | 'couple';
  plannerName?: string | null;
  plannerLogo?: string | null;
  itineraryItems?: PdfItineraryItem[];
}

export function SchedulePDF({
  blocks,
  coupleNames,
  weddingDate,
  viewMode,
  plannerName,
  plannerLogo,
  itineraryItems = [],
}: SchedulePDFProps) {
  const filteredBlocks = blocks
    .map((block) => ({
      ...block,
      stages: viewMode === 'couple'
        ? block.stages.filter((s) => s.visible_to_couple)
        : block.stages,
    }))
    .filter((b) => b.stages.length > 0);

  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.coupleNames}>{coupleNames}</Text>
            {weddingDate && <Text style={styles.weddingDate}>{weddingDate}</Text>}
          </View>
          {(plannerLogo || plannerName) && (
            <View style={styles.headerRight}>
              {plannerLogo && (
                <Image src={plannerLogo} style={styles.plannerLogo} />
              )}
              {plannerName && (
                <Text style={styles.plannerName}>{plannerName}</Text>
              )}
            </View>
          )}
        </View>

        {/* ── Wedding itinerary (locations) ── */}
        {itineraryItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Itinerario de la boda</Text>
            <View style={styles.weddingItinerary}>
              {itineraryItems.map((item) => {
                const dt = new Date(item.dateTime);
                const time = `${dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} ${dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
                return (
                  <View key={item.id} style={styles.wItineraryRow}>
                    <Text style={styles.wItineraryTime}>{time}</Text>
                    <View style={styles.wItineraryBody}>
                      <Text style={styles.wItineraryLocation}>{item.locationName}</Text>
                      <Text style={styles.wItineraryType}>
                        {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
                      </Text>
                      {item.address && (
                        <Text style={styles.wItineraryAddress}>{item.address}</Text>
                      )}
                      {item.notes && (
                        <Text style={styles.wItineraryNotes}>{item.notes}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Schedule summary ── */}
        <Text style={styles.sectionTitle}>Itinerario</Text>
        <View style={styles.itinerary}>
          {filteredBlocks.map((block, idx) => {
            const isLast = idx === filteredBlocks.length - 1;
            return (
              <View key={block.id} style={isLast ? styles.itineraryRowLast : styles.itineraryRow}>
                <View style={[styles.itineraryDot, { backgroundColor: block.color ?? ROSE }]} />
                <Text style={styles.itineraryName}>{block.name}</Text>
                <Text style={styles.itineraryTime}>
                  {block.block_start_time} – {block.block_end_time}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Detailed schedule ── */}
        <Text style={styles.sectionTitle}>Cronograma detallado</Text>
        {filteredBlocks.map((block) => (
          <View key={block.id} style={styles.block} wrap={false}>
            <View style={styles.blockHeader}>
              <View style={[styles.blockDot, { backgroundColor: block.color ?? ROSE }]} />
              <Text style={styles.blockName}>{block.name}</Text>
              <Text style={styles.blockTime}>
                {block.block_start_time} – {block.block_end_time}
              </Text>
            </View>
            {block.stages.map((stage) => (
              <StageRow key={stage.id} stage={stage} viewMode={viewMode} />
            ))}
          </View>
        ))}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {plannerName ?? 'Cronograma de boda'} · {today}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
