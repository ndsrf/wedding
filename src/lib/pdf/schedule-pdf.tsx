import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ScheduleBlockWithTimes, ScheduleStageWithTime } from '@/types/schedule';

// ─── Colours ─────────────────────────────────────────────────────────────────
const ROSE = '#e11d48';
const GRAY_900 = '#111827';
const GRAY_700 = '#374151';
const GRAY_500 = '#6b7280';
const GRAY_200 = '#e5e7eb';
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  headerLeft: { flex: 1 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: ROSE },
  coupleNames: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: GRAY_900, marginTop: 4 },
  headerMeta: { fontSize: 8, color: GRAY_500, marginTop: 2 },
  title: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_700,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  block: { marginBottom: 20 },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 3,
    backgroundColor: GRAY_50,
    borderRadius: 4,
  },
  stageTime: { width: 42, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GRAY_700 },
  stageName: { flex: 1, fontSize: 9, color: GRAY_900, paddingHorizontal: 8 },
  stageDuration: { fontSize: 8, color: GRAY_500, width: 40, textAlign: 'right' },
  stageNotes: { fontSize: 7, color: GRAY_500, marginLeft: 50, marginBottom: 4, fontStyle: 'italic' },
  coupleOnlyBadge: {
    fontSize: 6,
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: GRAY_500 },
});

// ─── Stage Row ────────────────────────────────────────────────────────────────

function StageRow({ stage, viewMode }: { stage: ScheduleStageWithTime; viewMode: 'planner' | 'couple' }) {
  const showPlannerBadge = viewMode === 'planner' && !stage.visible_to_couple;
  return (
    <>
      <View style={styles.stageRow}>
        <Text style={styles.stageTime}>{stage.calculated_start_time}</Text>
        <Text style={styles.stageName}>{stage.name}</Text>
        {showPlannerBadge && <Text style={styles.coupleOnlyBadge}>Solo planner</Text>}
        <Text style={styles.stageDuration}>{stage.duration_minutes} min</Text>
      </View>
      {stage.notes && viewMode === 'planner' && (
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
}

export function SchedulePDF({
  blocks,
  coupleNames,
  weddingDate,
  startTime,
  viewMode,
  plannerName,
}: SchedulePDFProps) {
  const filteredBlocks = blocks.map((block) => ({
    ...block,
    stages: viewMode === 'couple'
      ? block.stages.filter((s) => s.visible_to_couple)
      : block.stages,
  })).filter((b) => b.stages.length > 0);

  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>Nupci</Text>
            <Text style={styles.coupleNames}>{coupleNames}</Text>
            {weddingDate && <Text style={styles.headerMeta}>{weddingDate}</Text>}
            <Text style={styles.headerMeta}>
              Inicio: {startTime}  ·  {viewMode === 'planner' ? 'Vista Planner' : 'Vista Novios'}
            </Text>
          </View>
          {plannerName && <Text style={styles.headerMeta}>{plannerName}</Text>}
        </View>

        {/* Title */}
        <Text style={styles.title}>Cronograma de Boda</Text>

        {/* Blocks */}
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

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generado con Nupci · {today}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
