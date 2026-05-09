/**
 * Schedule Page — Shared Content Component
 *
 * Used by both /admin/schedule and /planner/weddings/[id]/schedule.
 * All API calls go through apiPaths — never hardcoded routes.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import type {
  ScheduleBlock,
  ScheduleBlockWithTimes,
  ScheduleStageWithTime,
  StageProvider,
} from '@/types/schedule';
import { computeScheduleWithTimes } from '@/types/schedule';

// ── API paths ─────────────────────────────────────────────────────────────────

export interface ScheduleApiPaths {
  schedule: string;       // e.g. /api/admin/schedule
  schedulePdf: string;    // e.g. /api/admin/schedule/pdf
  providersUrl?: string;  // e.g. /api/weddings/:id/providers — enables provider assignment
}

export interface SchedulePageContentProps {
  apiPaths: ScheduleApiPaths;
  isPlanner?: boolean;
  header: React.ReactNode;
  coupleNames?: string;
  weddingDate?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function providerLabel(p: StageProvider) {
  return p.name || p.category.name;
}

// ── Stage pill ────────────────────────────────────────────────────────────────

function StagePill({
  stage,
  blockColor,
  viewMode,
  providers,
  onProviderChange,
}: {
  stage: ScheduleStageWithTime;
  blockColor: string;
  viewMode: 'planner' | 'couple';
  providers: StageProvider[];
  onProviderChange?: (stageId: string, providerId: string | null) => void;
}) {
  const [showSelect, setShowSelect] = useState(false);
  const plannerOnly = !stage.visible_to_couple;
  const canAssign = viewMode === 'planner' && !!onProviderChange;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        plannerOnly && viewMode === 'planner'
          ? 'bg-violet-50 border-violet-100'
          : 'bg-white border-gray-100'
      }`}
    >
      {/* Time */}
      <div className="flex-shrink-0 w-14 text-right">
        <span className="text-sm font-bold text-gray-800">{stage.calculated_start_time}</span>
      </div>

      {/* Dot */}
      <div
        className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: blockColor }}
      />

      {/* Name + notes */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{stage.name}</p>
        {stage.notes && viewMode === 'planner' && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{stage.notes}</p>
        )}
      </div>

      {/* Duration */}
      <span className="text-xs text-gray-400 flex-shrink-0">{durationLabel(stage.duration_minutes)}</span>

      {/* Planner-only badge */}
      {plannerOnly && viewMode === 'planner' && (
        <span className="text-xs font-medium text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full flex-shrink-0">
          Solo planner
        </span>
      )}

      {/* Provider assignment */}
      {(stage.wedding_provider || canAssign) && (
        <div className="flex-shrink-0">
          {showSelect ? (
            <select
              autoFocus
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-300"
              value={stage.wedding_provider_id ?? ''}
              onChange={(e) => {
                onProviderChange!(stage.id, e.target.value || null);
                setShowSelect(false);
              }}
              onBlur={() => setShowSelect(false)}
            >
              <option value="">Sin proveedor</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {providerLabel(p)}
                </option>
              ))}
            </select>
          ) : stage.wedding_provider ? (
            <button
              type="button"
              title={canAssign ? 'Cambiar proveedor' : undefined}
              onClick={canAssign ? () => setShowSelect(true) : undefined}
              className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                canAssign
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-blue-600 bg-blue-50 cursor-default'
              }`}
            >
              {providerLabel(stage.wedding_provider)}
            </button>
          ) : canAssign ? (
            <button
              type="button"
              onClick={() => setShowSelect(true)}
              className="text-xs text-gray-300 hover:text-blue-400 transition-colors"
            >
              + Proveedor
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Block section ─────────────────────────────────────────────────────────────

function BlockSection({
  block,
  viewMode,
  providers,
  onProviderChange,
}: {
  block: ScheduleBlockWithTimes;
  viewMode: 'planner' | 'couple';
  providers: StageProvider[];
  onProviderChange?: (stageId: string, providerId: string | null) => void;
}) {
  const filteredStages = viewMode === 'couple'
    ? block.stages.filter((s) => s.visible_to_couple)
    : block.stages;

  if (filteredStages.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: block.color ?? '#6366f1' }}
        />
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{block.name}</h3>
        <span className="text-xs text-gray-400 ml-auto">
          {block.block_start_time} – {block.block_end_time}
        </span>
      </div>
      {filteredStages.map((stage) => (
        <StagePill
          key={stage.id}
          stage={stage}
          blockColor={block.color ?? '#6366f1'}
          viewMode={viewMode}
          providers={providers}
          onProviderChange={onProviderChange}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SchedulePageContent({
  apiPaths,
  isPlanner = false,
  header,
  coupleNames,
  weddingDate,
}: SchedulePageContentProps) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [startTime, setStartTime] = useState('10:00');
  const [viewMode, setViewMode] = useState<'planner' | 'couple'>('couple');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [providers, setProviders] = useState<StageProvider[]>([]);

  // ── Fetch schedule ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(apiPaths.schedule)
      .then((r) => r.json())
      .then((json) => {
        const data = json.data;
        setBlocks(data.blocks ?? []);
        setHasSchedule(!!data.schedule);
        if (data.schedule) setStartTime(data.schedule.start_time);
      })
      .catch(() => setError('Error al cargar el cronograma'))
      .finally(() => setLoading(false));
  }, [apiPaths.schedule]);

  // ── Fetch providers (optional) ──────────────────────────────────────────────

  useEffect(() => {
    if (!apiPaths.providersUrl) return;
    fetch(apiPaths.providersUrl)
      .then((r) => r.json())
      .then((json) => setProviders(json.data ?? []))
      .catch(() => {}); // providers are optional, fail silently
  }, [apiPaths.providersUrl]);

  const blocksWithTimes: ScheduleBlockWithTimes[] = computeScheduleWithTimes(blocks, startTime);

  // ── Apply template ──────────────────────────────────────────────────────────

  const applyTemplate = useCallback(async () => {
    setApplying(true);
    try {
      const res = await fetch(apiPaths.schedule, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'apply_template', start_time: startTime }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error));
      setBlocks(json.data.blocks ?? []);
      setHasSchedule(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }, [apiPaths.schedule, startTime]);

  // ── Save start time ─────────────────────────────────────────────────────────

  const saveStartTime = useCallback(async (time: string) => {
    setSaving(true);
    try {
      const res = await fetch(apiPaths.schedule, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'schedule', start_time: time }),
      });
      if (!res.ok) throw new Error('Error saving');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [apiPaths.schedule]);

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (hasSchedule) saveStartTime(val);
  };

  // ── Assign provider to stage ────────────────────────────────────────────────

  const handleProviderChange = useCallback(async (stageId: string, providerId: string | null) => {
    const providerObj = providerId ? (providers.find((p) => p.id === providerId) ?? null) : null;
    // Optimistic update
    setBlocks((prev) =>
      prev.map((block) => ({
        ...block,
        stages: block.stages.map((s) =>
          s.id === stageId
            ? { ...s, wedding_provider_id: providerId, wedding_provider: providerObj }
            : s
        ),
      }))
    );
    await fetch(apiPaths.schedule, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'stage', stage_id: stageId, wedding_provider_id: providerId }),
    });
  }, [apiPaths.schedule, providers]);

  // ── PDF export ──────────────────────────────────────────────────────────────

  const exportPdf = async (mode: 'planner' | 'couple') => {
    setExportingPdf(true);
    try {
      const res = await fetch(`${apiPaths.schedulePdf}?view=${mode}`);
      if (!res.ok) throw new Error('Error generating PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cronograma-${mode}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen">
        {header}
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!hasSchedule) {
    return (
      <div className="min-h-screen">
        {header}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="h-7 w-7 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Sin cronograma aún</h3>
              <p className="text-sm text-gray-500 mt-1">Genera el cronograma a partir de la plantilla del planner.</p>
            </div>
            <div className="flex items-center gap-3 justify-center">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hora de inicio</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
                />
              </div>
              <button
                type="button"
                onClick={applyTemplate}
                disabled={applying}
                className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md"
              >
                {applying ? 'Generando...' : 'Generar cronograma'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const effectiveViewMode = isPlanner ? viewMode : 'couple';
  const canAssignProviders = isPlanner && providers.length > 0;

  return (
    <div className="min-h-screen">
      {header}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Hora inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="px-3 py-2 text-sm font-bold text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
              />
              {saving && <span className="text-xs text-gray-400">Guardando...</span>}
            </div>

            <div className="flex-1" />

            {/* View toggle (planner only) */}
            {isPlanner && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('couple')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    viewMode === 'couple'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Vista novios
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('planner')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    viewMode === 'planner'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Vista planner
                </button>
              </div>
            )}

            {/* Export PDF */}
            <div className="relative group">
              <button
                type="button"
                disabled={exportingPdf}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
              >
                <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
              </button>
              {!exportingPdf && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 shadow-lg rounded-xl overflow-hidden z-10 hidden group-hover:block min-w-[160px]">
                  <button
                    type="button"
                    onClick={() => exportPdf('couple')}
                    className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2"
                  >
                    <span className="text-base">💑</span> Vista novios
                  </button>
                  {isPlanner && (
                    <button
                      type="button"
                      onClick={() => exportPdf('planner')}
                      className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2 border-t border-gray-50"
                    >
                      <span className="text-base">📋</span> Vista planner
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Couple names / wedding date */}
          {(coupleNames || weddingDate) && (
            <div className="flex items-center gap-3">
              {coupleNames && <h2 className="text-lg font-bold text-gray-900 font-playfair">{coupleNames}</h2>}
              {weddingDate && <span className="text-sm text-gray-400">· {weddingDate}</span>}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-gray-100 pointer-events-none" />
            <div className="space-y-8">
              {blocksWithTimes.map((block) => (
                <BlockSection
                  key={block.id}
                  block={block}
                  viewMode={effectiveViewMode}
                  providers={providers}
                  onProviderChange={canAssignProviders ? handleProviderChange : undefined}
                />
              ))}
            </div>
          </div>

          {/* Regenerate from template (planner only) */}
          {isPlanner && (
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={applyTemplate}
                disabled={applying}
                className="text-xs text-gray-400 hover:text-rose-500 transition-colors disabled:opacity-50"
              >
                Regenerar desde plantilla
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
