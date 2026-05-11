'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { CSS } from '@dnd-kit/utilities';
import type {
  ScheduleBlock,
  ScheduleBlockWithTimes,
  ScheduleStageWithTime,
  StageProvider,
} from '@/types/schedule';
import { computeScheduleWithTimes } from '@/types/schedule';

// ── API paths ─────────────────────────────────────────────────────────────────

export interface ScheduleApiPaths {
  schedule: string;
  schedulePdf: string;
  providersUrl?: string;
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
  return p.name ? `${p.name} (${p.category.name})` : p.category.name;
}

function providerDisplayName(p: StageProvider) {
  return p.name ?? p.category.name;
}

function findBlockForStage(stageId: string, blocks: ScheduleBlock[]): ScheduleBlock | undefined {
  return blocks.find((b) => b.stages.some((s) => s.id === stageId));
}

// ── Drag handle ───────────────────────────────────────────────────────────────

function DragHandle({
  listeners,
  attributes,
}: {
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}) {
  return (
    <button
      type="button"
      className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-500 transition-colors touch-none"
      {...listeners}
      {...attributes}
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7 2a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 8a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 14a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
      </svg>
    </button>
  );
}

// ── Sortable stage row ────────────────────────────────────────────────────────

function SortableStageRow({
  stage,
  blockColor,
  viewMode,
  providers,
  onProviderChange,
  onUpdate,
  onDelete,
}: {
  stage: ScheduleStageWithTime;
  blockColor: string;
  viewMode: 'planner' | 'couple';
  providers: StageProvider[];
  onProviderChange?: (stageId: string, providerId: string | null) => void;
  onUpdate: (stageId: string, updates: Record<string, unknown>) => void;
  onDelete: (stageId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id, data: { type: 'stage' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editName, setEditName] = useState(false);
  const [localName, setLocalName] = useState(stage.name);
  const [editDuration, setEditDuration] = useState(false);
  const [localDuration, setLocalDuration] = useState(String(stage.duration_minutes));
  const [editNotes, setEditNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(stage.notes ?? '');
  const [showProviderSelect, setShowProviderSelect] = useState(false);

  // Keep local state in sync if parent updates (e.g. after API save)
  const prevStage = useRef(stage);
  if (prevStage.current.id !== stage.id) {
    prevStage.current = stage;
    setLocalName(stage.name);
    setLocalDuration(String(stage.duration_minutes));
    setLocalNotes(stage.notes ?? '');
  }

  const canAssign = viewMode === 'planner' && !!onProviderChange;
  const plannerOnly = !stage.visible_to_couple;

  const saveName = () => {
    setEditName(false);
    const trimmed = localName.trim();
    if (trimmed && trimmed !== stage.name) onUpdate(stage.id, { name: trimmed });
    else setLocalName(stage.name);
  };

  const saveDuration = () => {
    setEditDuration(false);
    const mins = parseInt(localDuration, 10);
    if (!isNaN(mins) && mins >= 1 && mins !== stage.duration_minutes) {
      onUpdate(stage.id, { duration_minutes: mins });
    } else {
      setLocalDuration(String(stage.duration_minutes));
    }
  };

  const saveNotes = () => {
    setEditNotes(false);
    const val = localNotes.trim() || null;
    if (val !== stage.notes) onUpdate(stage.id, { notes: val });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
        isDragging ? 'opacity-30' : ''
      } ${
        plannerOnly && viewMode === 'planner'
          ? 'bg-violet-50 border-violet-100'
          : 'bg-white border-gray-100'
      }`}
    >
      {/* Drag handle */}
      <DragHandle listeners={listeners} attributes={attributes} />

      {/* Time */}
      <div className="flex-shrink-0 w-12 text-right pt-0.5">
        <span className="text-xs font-bold text-gray-600">{stage.calculated_start_time}</span>
      </div>

      {/* Colour dot */}
      <div
        className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
        style={{ backgroundColor: blockColor }}
      />

      {/* Name + notes */}
      <div className="flex-1 min-w-0">
        {editName ? (
          <input
            autoFocus
            className="w-full text-sm font-medium text-gray-800 bg-transparent border-b border-rose-300 focus:outline-none pb-0.5"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') { setLocalName(stage.name); setEditName(false); }
            }}
          />
        ) : (
          <p
            className="text-sm font-medium text-gray-800 cursor-text hover:text-rose-600 transition-colors"
            onClick={() => setEditName(true)}
          >
            {stage.name}
          </p>
        )}

        {/* Notes row */}
        {editNotes ? (
          <input
            autoFocus
            className="w-full text-xs text-gray-500 bg-transparent border-b border-gray-200 focus:outline-none mt-1 pb-0.5"
            placeholder="Añadir nota..."
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={saveNotes}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveNotes();
              if (e.key === 'Escape') { setLocalNotes(stage.notes ?? ''); setEditNotes(false); }
            }}
          />
        ) : (
          <p
            className={`text-xs mt-0.5 cursor-text transition-colors ${
              stage.notes
                ? 'text-gray-400 hover:text-gray-600'
                : 'text-gray-200 group-hover:text-gray-400'
            }`}
            onClick={() => setEditNotes(true)}
          >
            {stage.notes || '+ nota'}
          </p>
        )}
      </div>

      {/* Duration */}
      {editDuration ? (
        <input
          autoFocus
          type="number"
          min="1"
          max="1440"
          className="w-14 text-xs text-right text-gray-500 bg-transparent border-b border-rose-300 focus:outline-none pb-0.5"
          value={localDuration}
          onChange={(e) => setLocalDuration(e.target.value)}
          onBlur={saveDuration}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveDuration();
            if (e.key === 'Escape') { setLocalDuration(String(stage.duration_minutes)); setEditDuration(false); }
          }}
        />
      ) : (
        <span
          className="text-xs text-gray-500 flex-shrink-0 cursor-text hover:text-rose-500 transition-colors pt-0.5"
          onClick={() => setEditDuration(true)}
          title="Duración en minutos"
        >
          {durationLabel(stage.duration_minutes)}
        </span>
      )}

      {/* Planner-only eye icon */}
      {plannerOnly && viewMode === 'planner' && (
        <span title="Solo visible para el planner" className="flex-shrink-0 leading-none">
          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </span>
      )}

      {/* Provider assignment */}
      {(stage.wedding_provider || canAssign) && (
        <div className="flex-shrink-0">
          {showProviderSelect ? (
            <select
              autoFocus
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-300"
              value={stage.wedding_provider_id ?? ''}
              onChange={(e) => {
                onProviderChange!(stage.id, e.target.value || null);
                setShowProviderSelect(false);
              }}
              onBlur={() => setShowProviderSelect(false)}
            >
              <option value="">Sin proveedor</option>
              {[...providers].sort((a, b) => providerLabel(a).localeCompare(providerLabel(b), 'es')).map((p) => (
                <option key={p.id} value={p.id}>{providerLabel(p)}</option>
              ))}
            </select>
          ) : stage.wedding_provider ? (
            <button
              type="button"
              onClick={canAssign ? () => setShowProviderSelect(true) : undefined}
              className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                canAssign
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-blue-600 bg-blue-50 cursor-default'
              }`}
            >
              {providerDisplayName(stage.wedding_provider)}
            </button>
          ) : canAssign ? (
            <button
              type="button"
              onClick={() => setShowProviderSelect(true)}
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors"
            >
              + Proveedor
            </button>
          ) : null}
        </div>
      )}

      {/* Delete stage */}
      <button
        type="button"
        onClick={() => onDelete(stage.id)}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
        title="Eliminar paso"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Trash drop zone (shown while dragging) ────────────────────────────────────

function TrashDropZone({ visible }: { visible: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'trash-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-dashed shadow-lg transition-all duration-150 pointer-events-none ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${
        isOver
          ? 'border-red-400 bg-red-50 text-red-500 scale-105'
          : 'border-gray-300 bg-white/95 text-gray-400 backdrop-blur-sm'
      }`}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span className="text-sm font-medium">
        {isOver ? 'Suelta para eliminar' : 'Arrastrar aquí para eliminar'}
      </span>
    </div>
  );
}

// ── Offset helpers ─────────────────────────────────────────────────────────────

function offsetLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `+${h}h ${m}min desde inicio`;
  if (h > 0) return `+${h}h desde inicio`;
  return `+${m}min desde inicio`;
}

// ── Sortable block section ────────────────────────────────────────────────────

function SortableBlockSection({
  block,
  viewMode,
  providers,
  onProviderChange,
  onUpdateStage,
  onDeleteStage,
  onUpdateBlock,
  onDeleteBlock,
  onAddStage,
}: {
  block: ScheduleBlockWithTimes;
  viewMode: 'planner' | 'couple';
  providers: StageProvider[];
  onProviderChange?: (stageId: string, providerId: string | null) => void;
  onUpdateStage: (stageId: string, updates: Record<string, unknown>) => void;
  onDeleteStage: (stageId: string) => void;
  onUpdateBlock: (blockId: string, updates: Record<string, unknown>) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddStage: (blockId: string, name: string, durationMinutes: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, data: { type: 'block' } });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const [editName, setEditName] = useState(false);
  const [localName, setLocalName] = useState(block.name);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [editOffset, setEditOffset] = useState(false);
  const [offsetH, setOffsetH] = useState(0);
  const [offsetM, setOffsetM] = useState(0);

  const visibleStages = viewMode === 'couple'
    ? block.stages.filter((s) => s.visible_to_couple)
    : block.stages;

  const saveName = () => {
    setEditName(false);
    const trimmed = localName.trim();
    if (trimmed && trimmed !== block.name) onUpdateBlock(block.id, { name: trimmed });
    else setLocalName(block.name);
  };

  const submitAdd = () => {
    if (!newName.trim()) return;
    onAddStage(block.id, newName.trim(), parseInt(newDuration, 10) || 30);
    setNewName('');
    setNewDuration('30');
    setShowAdd(false);
  };

  const openOffsetEdit = () => {
    const cur = block.offset_minutes ?? null;
    setOffsetH(cur !== null ? Math.floor(cur / 60) : 0);
    setOffsetM(cur !== null ? cur % 60 : 0);
    setEditOffset(true);
  };

  const saveOffset = () => {
    const total = offsetH * 60 + offsetM;
    onUpdateBlock(block.id, { offset_minutes: total });
    setEditOffset(false);
  };

  const clearOffset = () => {
    onUpdateBlock(block.id, { offset_minutes: null });
    setEditOffset(false);
  };

  if (viewMode === 'couple' && visibleStages.length === 0) return null;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-30' : ''}>
      {/* Block header */}
      <div className="group flex items-center gap-2 mb-2">
        <DragHandle listeners={listeners} attributes={attributes} />
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: block.color ?? '#6366f1' }}
        />
        {editName ? (
          <input
            autoFocus
            className="flex-1 text-sm font-bold text-gray-700 uppercase tracking-wide bg-transparent border-b border-rose-300 focus:outline-none"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') { setLocalName(block.name); setEditName(false); }
            }}
          />
        ) : (
          <h3
            className="flex-1 text-sm font-bold text-gray-700 uppercase tracking-wide cursor-text hover:text-rose-600 transition-colors"
            onClick={() => setEditName(true)}
          >
            {block.name}
          </h3>
        )}
        <span className="text-xs text-gray-500">{block.block_start_time} – {block.block_end_time}</span>
        <button
          type="button"
          onClick={() => onDeleteBlock(block.id)}
          className="p-1 text-gray-200 hover:text-red-400 transition-colors"
          title="Eliminar sección"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Offset (start time) row — planner view only */}
      {viewMode === 'planner' && (
        <div className="pl-8 mb-2">
          {editOffset ? (
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <input
                type="number" min="0" max="23"
                className="w-10 text-xs text-center border border-gray-200 rounded-lg px-1 py-0.5 focus:outline-none focus:border-rose-300"
                value={offsetH}
                onChange={(e) => setOffsetH(Math.max(0, parseInt(e.target.value) || 0))}
                onKeyDown={(e) => { if (e.key === 'Enter') saveOffset(); if (e.key === 'Escape') setEditOffset(false); }}
              />
              <span className="text-xs text-gray-500">h</span>
              <input
                type="number" min="0" max="59"
                className="w-10 text-xs text-center border border-gray-200 rounded-lg px-1 py-0.5 focus:outline-none focus:border-rose-300"
                value={offsetM}
                onChange={(e) => setOffsetM(Math.max(0, parseInt(e.target.value) || 0))}
                onKeyDown={(e) => { if (e.key === 'Enter') saveOffset(); if (e.key === 'Escape') setEditOffset(false); }}
              />
              <span className="text-xs text-gray-500">min desde inicio</span>
              <button type="button" onClick={saveOffset} className="text-xs text-rose-500 hover:text-rose-600 font-medium">OK</button>
              <button type="button" onClick={clearOffset} className="text-xs text-gray-400 hover:text-gray-600">↩ fin anterior</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openOffsetEdit}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                block.offset_minutes !== null && block.offset_minutes !== undefined
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-gray-300 hover:text-gray-500'
              }`}
              title="Editar hora de inicio de esta sección"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {block.offset_minutes !== null && block.offset_minutes !== undefined
                ? offsetLabel(block.offset_minutes)
                : 'fin sección anterior'}
            </button>
          )}
        </div>
      )}

      {/* Stages */}
      <SortableContext items={block.stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5 pl-5">
          {visibleStages.map((stage) => (
            <SortableStageRow
              key={stage.id}
              stage={stage}
              blockColor={block.color ?? '#6366f1'}
              viewMode={viewMode}
              providers={providers}
              onProviderChange={onProviderChange}
              onUpdate={onUpdateStage}
              onDelete={onDeleteStage}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add stage row */}
      {viewMode === 'planner' && (
        <div className="pl-5 pt-1">
          {showAdd ? (
            <div className="flex items-center gap-2 py-1">
              <input
                autoFocus
                placeholder="Nombre del paso"
                className="flex-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-100"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitAdd();
                  if (e.key === 'Escape') setShowAdd(false);
                }}
              />
              <input
                type="number"
                min="1"
                placeholder="min"
                className="w-16 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-rose-300 text-center"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); }}
              />
              <button
                type="button"
                onClick={submitAdd}
                className="text-sm text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-xl transition-colors"
              >
                Añadir
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-rose-500 transition-colors py-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Añadir paso
            </button>
          )}
        </div>
      )}
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
  const [startTime, setStartTime] = useState('08:00');
  const [viewMode, setViewMode] = useState<'planner' | 'couple'>('planner');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement>(null);
  const [providers, setProviders] = useState<StageProvider[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'block' | 'stage' | null>(null);

  const dragOriginBlockId = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  // ── Fetch providers (optional, silent fail) ─────────────────────────────────

  useEffect(() => {
    if (!apiPaths.providersUrl) return;
    fetch(apiPaths.providersUrl)
      .then((r) => r.json())
      .then((json) => setProviders(json.data ?? []))
      .catch(() => {});
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
      await fetch(apiPaths.schedule, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'schedule', start_time: time }),
      });
    } catch {
      // non-fatal
    } finally {
      setSaving(false);
    }
  }, [apiPaths.schedule]);

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (hasSchedule) saveStartTime(val);
  };

  // ── DnD ─────────────────────────────────────────────────────────────────────

  function onDragStart({ active }: DragStartEvent) {
    const type = active.data.current?.type as 'block' | 'stage';
    setActiveDragId(active.id as string);
    setActiveDragType(type);
    if (type === 'stage') {
      const b = findBlockForStage(active.id as string, blocks);
      dragOriginBlockId.current = b?.id ?? null;
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;
    if (active.data.current?.type !== 'stage') return;

    const stageId = active.id as string;
    const overId = over.id as string;

    const activeBlock = findBlockForStage(stageId, blocks);
    const overBlock =
      over.data.current?.type === 'block'
        ? blocks.find((b) => b.id === overId)
        : findBlockForStage(overId, blocks);

    if (!activeBlock || !overBlock || activeBlock.id === overBlock.id) return;

    // Optimistically move stage to the new block
    setBlocks((prev) => {
      const aBlock = prev.find((b) => b.id === activeBlock.id)!;
      const oBlock = prev.find((b) => b.id === overBlock.id)!;
      const movingStage = aBlock.stages.find((s) => s.id === stageId)!;

      const newAStages = aBlock.stages
        .filter((s) => s.id !== stageId)
        .map((s, i) => ({ ...s, order: i }));

      let insertAt = oBlock.stages.findIndex((s) => s.id === overId);
      if (insertAt === -1) insertAt = oBlock.stages.length;

      const newOStages = [...oBlock.stages];
      newOStages.splice(insertAt, 0, movingStage);
      const newOStagesOrdered = newOStages.map((s, i) => ({ ...s, order: i }));

      return prev.map((b) => {
        if (b.id === activeBlock.id) return { ...b, stages: newAStages };
        if (b.id === overBlock.id) return { ...b, stages: newOStagesOrdered };
        return b;
      });
    });
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    const draggedId = active.id as string;
    const type = active.data.current?.type as 'block' | 'stage';
    setActiveDragId(null);
    setActiveDragType(null);

    if (!over) { dragOriginBlockId.current = null; return; }

    // ── Dropped on trash ────────────────────────────────────────────────────
    if (over.id === 'trash-zone') {
      dragOriginBlockId.current = null;
      if (type === 'stage') await handleDeleteStage(draggedId);
      else await handleDeleteBlock(draggedId);
      return;
    }

    const overId = over.id as string;

    // ── Block reorder ────────────────────────────────────────────────────────
    if (type === 'block') {
      if (draggedId === overId) return;
      setBlocks((prev) => {
        const oldIdx = prev.findIndex((b) => b.id === draggedId);
        const newIdx = prev.findIndex((b) => b.id === overId);
        const reordered = arrayMove(prev, oldIdx, newIdx).map((b, i) => ({ ...b, order: i }));
        fetch(apiPaths.schedule, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reorder', entity: 'blocks',
            updates: reordered.map((b) => ({ id: b.id, order: b.order })),
          }),
        });
        return reordered;
      });
      return;
    }

    // ── Stage reorder / cross-block move ─────────────────────────────────────
    if (type === 'stage') {
      const originBlockId = dragOriginBlockId.current;
      dragOriginBlockId.current = null;

      const currentBlock = findBlockForStage(draggedId, blocks);
      if (!currentBlock) return;

      const crossBlock = originBlockId && originBlockId !== currentBlock.id;

      if (crossBlock) {
        // Persist the new block_id
        await fetch(apiPaths.schedule, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'stage', stage_id: draggedId, block_id: currentBlock.id }),
        });
        // Persist order for current block
        await fetch(apiPaths.schedule, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reorder', entity: 'stages',
            updates: currentBlock.stages.map((s, i) => ({ id: s.id, order: i })),
          }),
        });
        // Persist order for the old block
        const oldBlock = blocks.find((b) => b.id === originBlockId);
        if (oldBlock) {
          await fetch(apiPaths.schedule, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'reorder', entity: 'stages',
              updates: oldBlock.stages.map((s, i) => ({ id: s.id, order: i })),
            }),
          });
        }
        return;
      }

      // Same block reorder
      if (draggedId === overId) return;
      setBlocks((prev) => {
        const blockIdx = prev.findIndex((b) => b.id === currentBlock.id);
        const stages = prev[blockIdx].stages;
        const oldIdx = stages.findIndex((s) => s.id === draggedId);
        const newIdx = stages.findIndex((s) => s.id === overId);
        if (oldIdx === -1 || newIdx === -1) return prev;
        const reordered = arrayMove(stages, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
        fetch(apiPaths.schedule, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reorder', entity: 'stages',
            updates: reordered.map((s) => ({ id: s.id, order: s.order })),
          }),
        });
        const newBlocks = [...prev];
        newBlocks[blockIdx] = { ...newBlocks[blockIdx], stages: reordered };
        return newBlocks;
      });
    }
  }

  // ── Stage/block CRUD ─────────────────────────────────────────────────────────

  const handleUpdateStage = useCallback(
    async (stageId: string, updates: Record<string, unknown>) => {
      setBlocks((prev) =>
        prev.map((b) => ({
          ...b,
          stages: b.stages.map((s) => (s.id === stageId ? { ...s, ...updates } : s)),
        }))
      );
      await fetch(apiPaths.schedule, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stage', stage_id: stageId, ...updates }),
      });
    },
    [apiPaths.schedule]
  );

  const handleUpdateBlock = useCallback(
    async (blockId: string, updates: Record<string, unknown>) => {
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)));
      await fetch(apiPaths.schedule, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'block', block_id: blockId, ...updates }),
      });
    },
    [apiPaths.schedule]
  );

  const handleDeleteStage = useCallback(
    async (stageId: string) => {
      setBlocks((prev) =>
        prev.map((b) => ({ ...b, stages: b.stages.filter((s) => s.id !== stageId) }))
      );
      await fetch(apiPaths.schedule, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stage', stage_id: stageId }),
      });
    },
    [apiPaths.schedule]
  );

  const handleDeleteBlock = useCallback(
    async (blockId: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      await fetch(apiPaths.schedule, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'block', block_id: blockId }),
      });
    },
    [apiPaths.schedule]
  );

  const handleAddStage = useCallback(
    async (blockId: string, name: string, durationMinutes: number) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const order = block.stages.length;
      const res = await fetch(apiPaths.schedule, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stage', block_id: blockId, name, duration_minutes: durationMinutes, order }),
      });
      const json = await res.json();
      if (json.data) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? { ...b, stages: [...b.stages, { ...json.data, wedding_provider: null }] }
              : b
          )
        );
      }
    },
    [blocks, apiPaths.schedule]
  );

  const handleAddBlock = useCallback(async () => {
    const order = blocks.length;
    const res = await fetch(apiPaths.schedule, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'block', name: 'Nueva sección', order, color: '#6366f1' }),
    });
    const json = await res.json();
    if (json.data) {
      setBlocks((prev) => [...prev, { ...json.data, stages: [] }]);
    }
  }, [blocks, apiPaths.schedule]);

  // ── Provider assignment ──────────────────────────────────────────────────────

  const handleProviderChange = useCallback(
    async (stageId: string, providerId: string | null) => {
      const providerObj = providerId ? (providers.find((p) => p.id === providerId) ?? null) : null;
      setBlocks((prev) =>
        prev.map((b) => ({
          ...b,
          stages: b.stages.map((s) =>
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
    },
    [apiPaths.schedule, providers]
  );

  // ── PDF export ───────────────────────────────────────────────────────────────

  // Close PDF menu when clicking outside
  useEffect(() => {
    if (!showPdfMenu) return;
    function handleOutside(e: MouseEvent) {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setShowPdfMenu(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showPdfMenu]);

  const exportPdf = async (mode: 'planner' | 'couple') => {
    setShowPdfMenu(false);
    setExportingPdf(true);
    try {
      const res = await fetch(`${apiPaths.schedulePdf}?view=${mode}`);
      if (!res.ok) throw new Error('Error al generar el PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cronograma-${mode}.pdf`;
      // Must be in DOM for Firefox to honour the download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────────

  const effectiveViewMode = viewMode;
  const canAssignProviders = providers.length > 0;

  // Find active item info for DragOverlay
  const activeStageDrag =
    activeDragType === 'stage'
      ? (() => {
          const b = blocksWithTimes.find((bl) => bl.stages.some((s) => s.id === activeDragId));
          const s = b?.stages.find((st) => st.id === activeDragId);
          return b && s ? { stage: s, block: b } : null;
        })()
      : null;
  const activeBlockDrag =
    activeDragType === 'block'
      ? blocksWithTimes.find((b) => b.id === activeDragId) ?? null
      : null;

  // ── Loading ──────────────────────────────────────────────────────────────────

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

  // ── Empty state ──────────────────────────────────────────────────────────────

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

  // ── Main view ────────────────────────────────────────────────────────────────

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
              {saving && <span className="text-xs text-gray-500">Guardando...</span>}
            </div>

            <div className="flex-1" />

            {/* View toggle (planner only) */}
            {isPlanner && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
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
              </div>
            )}

            {/* Export PDF */}
            <div className="relative" ref={pdfMenuRef}>
              <button
                type="button"
                disabled={exportingPdf}
                onClick={() => !exportingPdf && setShowPdfMenu((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
              >
                <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
              </button>
              {showPdfMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 shadow-lg rounded-xl overflow-hidden z-20 min-w-[160px]">
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
              {weddingDate && <span className="text-sm text-gray-500">· {weddingDate}</span>}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Timeline */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            {/* Trash drop zone — must be inside DndContext to register as a droppable */}
            <TrashDropZone visible={activeDragId !== null} />
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="relative">
                <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-gray-100 pointer-events-none" />
                <div className="space-y-8">
                  {blocksWithTimes.map((block) => (
                    <SortableBlockSection
                      key={block.id}
                      block={block}
                      viewMode={effectiveViewMode}
                      providers={providers}
                      onProviderChange={canAssignProviders ? handleProviderChange : undefined}
                      onUpdateStage={handleUpdateStage}
                      onDeleteStage={handleDeleteStage}
                      onUpdateBlock={handleUpdateBlock}
                      onDeleteBlock={handleDeleteBlock}
                      onAddStage={handleAddStage}
                    />
                  ))}
                </div>
              </div>
            </SortableContext>

            <DragOverlay>
              {activeStageDrag && (
                <div className="flex items-center gap-2 bg-white border border-rose-200 rounded-xl px-3 py-2.5 shadow-xl opacity-95">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeStageDrag.block.color ?? '#6366f1' }}
                  />
                  <span className="text-sm font-medium text-gray-800">{activeStageDrag.stage.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{durationLabel(activeStageDrag.stage.duration_minutes)}</span>
                </div>
              )}
              {activeBlockDrag && (
                <div className="flex items-center gap-2 bg-white border border-rose-200 rounded-xl px-3 py-2.5 shadow-xl opacity-95">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeBlockDrag.color ?? '#6366f1' }}
                  />
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{activeBlockDrag.name}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Add block / regenerate */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddBlock}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Añadir sección
            </button>
            {isPlanner && (
              <button
                type="button"
                onClick={applyTemplate}
                disabled={applying}
                className="text-xs text-gray-500 hover:text-rose-500 transition-colors disabled:opacity-50"
              >
                Regenerar desde plantilla
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
