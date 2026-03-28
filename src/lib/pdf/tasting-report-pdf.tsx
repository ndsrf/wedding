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

export interface TastingScoreData {
  score: number;
  notes?: string | null;
  participant: { name: string };
}

export interface TastingDishData {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  scores: TastingScoreData[];
  average_score?: number | null;
  score_count?: number;
}

export interface TastingSectionData {
  id: string;
  name: string;
  dishes: TastingDishData[];
}

export interface TastingReportData {
  title: string;
  tasting_date?: string | null;
  sections: TastingSectionData[];
  participants: string[];
}

export interface PlannerInfo {
  name: string;
  logoUrl?: string | null;
}

export interface WeddingInfo {
  coupleNames?: string | null;
  weddingDate?: string | null;
}

export interface TastingReportLabels {
  ratings: string;
  rating: string;
  ratingsPlural: string;
  footer: string;
  participants: string;
  weddingDate: string;
  tastingDate: string;
}

interface TastingReportPDFProps {
  report: TastingReportData;
  planner: PlannerInfo;
  wedding: WeddingInfo;
  labels: TastingReportLabels;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ROSE = '#e11d48';
const GRAY_900 = '#111827';
const GRAY_700 = '#374151';
const GRAY_500 = '#6b7280';
const GRAY_300 = '#d1d5db';
const GRAY_100 = '#f3f4f6';
const GRAY_50 = '#f9fafb';
const AMBER = '#f59e0b';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    // Extra top padding so the fixed running header never overlaps content
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: 40,
    color: GRAY_900,
    backgroundColor: '#ffffff',
  },

  // ── Fixed running header (pages 2+) ──
  runningHeader: {
    position: 'absolute',
    top: 10,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_100,
    paddingBottom: 4,
  },
  runningLogo: {
    maxWidth: 50,
    maxHeight: 18,
    objectFit: 'contain',
  },
  runningPlannerName: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: ROSE,
  },
  runningRight: {
    textAlign: 'right',
  },
  runningText: {
    fontSize: 7,
    color: GRAY_500,
  },

  // ── First-page header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logo: {
    maxWidth: 100,
    maxHeight: 40,
    objectFit: 'contain',
  },
  plannerName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: ROSE,
  },
  headerRight: {
    textAlign: 'right',
  },
  coupleNames: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_900,
    textAlign: 'right',
  },
  menuMeta: {
    fontSize: 8,
    color: GRAY_500,
    marginTop: 3,
    textAlign: 'right',
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: GRAY_300,
    marginBottom: 12,
  },

  // ── Participants strip ──
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: GRAY_50,
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: GRAY_100,
  },
  participantsLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 6,
    flexShrink: 0,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  participantChip: {
    fontSize: 7,
    color: GRAY_700,
    marginRight: 8,
  },

  // ── Section ──
  sectionHeader: {
    backgroundColor: ROSE,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // ── Dish ──
  dishCard: {
    backgroundColor: GRAY_50,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GRAY_100,
  },
  dishTopRow: {
    flexDirection: 'row',
    padding: 8,
  },
  dishImage: {
    width: 52,
    height: 52,
    borderRadius: 4,
    objectFit: 'cover',
    flexShrink: 0,
    marginRight: 8,
  },
  dishImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: GRAY_100,
    flexShrink: 0,
    marginRight: 8,
  },
  dishInfo: {
    flex: 1,
  },
  dishNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dishName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_900,
    flex: 1,
    marginRight: 8,
  },
  scoreBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  scoreAvg: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: ROSE,
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: 7,
    color: GRAY_500,
    textAlign: 'right',
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  starDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 1,
  },
  dishDesc: {
    fontSize: 8,
    color: GRAY_500,
    marginTop: 3,
    lineHeight: 1.4,
  },
  scoreCountText: {
    fontSize: 7,
    color: GRAY_500,
    marginTop: 2,
  },

  // ── Scores table ──
  scoresArea: {
    borderTopWidth: 1,
    borderTopColor: GRAY_100,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
  },
  scoresTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  scoreParticipantName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_700,
    width: 80,
    flexShrink: 0,
    marginRight: 6,
  },
  scoreValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: ROSE,
    width: 32,
    flexShrink: 0,
    marginRight: 6,
  },
  scoreNotes: {
    fontSize: 7,
    color: GRAY_500,
    flex: 1,
    lineHeight: 1.3,
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

function Stars({ score, max = 10 }: { score: number; max?: number }) {
  const stars5 = Math.round((score / max) * 5);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }, (_, i) => (
        <View key={i} style={[styles.starDot, { backgroundColor: i < stars5 ? AMBER : GRAY_300 }]} />
      ))}
    </View>
  );
}

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

export function TastingReportPDF({ report, planner, wedding, labels }: TastingReportPDFProps) {
  const runningRight = [
    wedding.coupleNames,
    wedding.weddingDate ? formatDate(wedding.weddingDate) : null,
    report.tasting_date ? `${labels.tastingDate}: ${formatDate(report.tasting_date)}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Running header: visible on pages 2+ only ── */}
        <View fixed style={styles.runningHeader}>
          {/* Logo side */}
          {planner.logoUrl ? (
            <Image src={planner.logoUrl} style={styles.runningLogo} />
          ) : (
            <Text style={styles.runningPlannerName}>
              {/* Only show on page 2+ — page 1 already has the full header */}
              <Text render={({ pageNumber }) => pageNumber > 1 ? planner.name : ''} />
            </Text>
          )}
          {/* Couple + dates — hidden on page 1 */}
          <View style={styles.runningRight}>
            <Text
              style={styles.runningText}
              render={({ pageNumber }) => pageNumber > 1 ? runningRight : ''}
            />
          </View>
        </View>

        {/* ── First-page header ── */}
        <View style={styles.header}>
          <View>
            {planner.logoUrl ? (
              <Image src={planner.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.plannerName}>{planner.name}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {wedding.coupleNames && (
              <Text style={styles.coupleNames}>{wedding.coupleNames}</Text>
            )}
            {wedding.weddingDate && (
              <Text style={styles.menuMeta}>
                {labels.weddingDate}: {formatDate(wedding.weddingDate)}
              </Text>
            )}
            {report.tasting_date && (
              <Text style={styles.menuMeta}>
                {labels.tastingDate}: {formatDate(report.tasting_date)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Participants strip ── */}
        {report.participants.length > 0 && (
          <View style={styles.participantsRow}>
            <Text style={styles.participantsLabel}>{labels.participants}:</Text>
            <View style={styles.participantsList}>
              {report.participants.map((name, i) => (
                <Text key={i} style={styles.participantChip}>
                  {name}{i < report.participants.length - 1 ? '  ·' : ''}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ── Sections ── */}
        {report.sections.map((section) => (
          <View key={section.id}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionName}>{section.name}</Text>
            </View>

            {section.dishes.map((dish) => {
              const hasScores = dish.scores && dish.scores.length > 0;
              return (
                <View key={dish.id} style={styles.dishCard} wrap={false}>
                  <View style={styles.dishTopRow}>
                    {dish.image_url ? (
                      <Image src={dish.image_url} style={styles.dishImage} />
                    ) : (
                      <View style={styles.dishImagePlaceholder} />
                    )}
                    <View style={styles.dishInfo}>
                      <View style={styles.dishNameRow}>
                        <Text style={styles.dishName}>{dish.name}</Text>
                        {dish.average_score != null && (
                          <View style={styles.scoreBlock}>
                            <Text style={styles.scoreAvg}>{dish.average_score.toFixed(1)}</Text>
                            <Text style={styles.scoreLabel}>/10</Text>
                            <Stars score={dish.average_score} />
                          </View>
                        )}
                      </View>
                      {dish.description && (
                        <Text style={styles.dishDesc}>{dish.description}</Text>
                      )}
                      {dish.score_count != null && dish.score_count > 0 && (
                        <Text style={styles.scoreCountText}>
                          {dish.score_count}{' '}
                          {dish.score_count === 1 ? labels.rating : labels.ratingsPlural}
                        </Text>
                      )}
                    </View>
                  </View>

                  {hasScores && (
                    <View style={styles.scoresArea}>
                      <Text style={styles.scoresTitle}>{labels.ratings}</Text>
                      {dish.scores.map((s, idx) => (
                        <View key={idx} style={styles.scoreRow}>
                          <Text style={styles.scoreParticipantName}>{s.participant.name}</Text>
                          <Text style={styles.scoreValue}>{s.score}/10</Text>
                          <Text style={styles.scoreNotes}>{s.notes ?? ''}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* ── Footer: every page ── */}
        <Text fixed style={styles.footer}>Generado por Nupci</Text>
      </Page>
    </Document>
  );
}
