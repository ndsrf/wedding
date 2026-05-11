'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ScheduleTemplate, ScheduleBlock, ScheduleStage } from '@/types/schedule';

// ── Colour palette for blocks ─────────────────────────────────────────────────
const BLOCK_COLORS = [
  '#ec4899', '#8b5cf6', '#6366f1', '#3b82f6',
  '#10b981', '#f59e0b', '#ef4444', '#14b8a6',
];

// ── Small inline icon helpers ─────────────────────────────────────────────────
function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function GripIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
  );
}
function EyeIcon({ crossed }: { crossed?: boolean }) {
  return crossed ? (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

// ── Stage row ─────────────────────────────────────────────────────────────────

interface StageRowProps {
  stage: ScheduleStage;
  onUpdate: (data: Partial<ScheduleStage>) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, stageId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetStageId: string) => void;
}

function StageRow({ stage, onUpdate, onDelete, onDragStart, onDragOver, onDrop }: StageRowProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, stage.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
      onDrop={(e) => onDrop(e, stage.id)}
      className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg p-2 group hover:border-gray-200 transition-colors"
    >
      <span className="flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
        <GripIcon />
      </span>

      {/* Name */}
      <input
        type="text"
        value={stage.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Nombre de la etapa"
        className="flex-1 text-sm text-gray-800 bg-transparent border-0 outline-none focus:ring-0 placeholder-gray-300 min-w-0"
      />

      {/* Duration */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <input
          type="number"
          min={1}
          max={1440}
          value={stage.duration_minutes}
          onChange={(e) => onUpdate({ duration_minutes: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-14 text-sm text-center text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
        />
        <span className="text-xs text-gray-400">min</span>
      </div>

      {/* Visible to couple toggle */}
      <button
        type="button"
        title={stage.visible_to_couple ? 'Visible para novios' : 'Solo planner'}
        onClick={() => onUpdate({ visible_to_couple: !stage.visible_to_couple })}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          stage.visible_to_couple
            ? 'text-teal-500 hover:text-teal-600'
            : 'text-gray-300 hover:text-gray-400'
        }`}
      >
        <EyeIcon crossed={!stage.visible_to_couple} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// ── Block card ────────────────────────────────────────────────────────────────

interface BlockCardProps {
  block: ScheduleBlock;
  onUpdateBlock: (data: Partial<ScheduleBlock>) => void;
  onDeleteBlock: () => void;
  onAddStage: () => void;
  onUpdateStage: (stageId: string, data: Partial<ScheduleStage>) => void;
  onDeleteStage: (stageId: string) => void;
  onStageDragStart: (e: React.DragEvent, stageId: string, blockId: string) => void;
  onStageDragOver: (e: React.DragEvent) => void;
  onStageDrop: (e: React.DragEvent, targetStageId: string, blockId: string) => void;
  onBlockDragStart: (e: React.DragEvent, blockId: string) => void;
  onBlockDragOver: (e: React.DragEvent) => void;
  onBlockDrop: (e: React.DragEvent, targetBlockId: string) => void;
}

function BlockCard({
  block, onUpdateBlock, onDeleteBlock, onAddStage,
  onUpdateStage, onDeleteStage,
  onStageDragStart, onStageDragOver, onStageDrop,
  onBlockDragStart, onBlockDragOver, onBlockDrop,
}: BlockCardProps) {
  const totalMinutes = block.stages.reduce((s, st) => s + st.duration_minutes, 0);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationLabel = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}min` : ''}` : `${mins}min`;

  return (
    <div
      draggable
      onDragStart={(e) => onBlockDragStart(e, block.id)}
      onDragOver={(e) => { e.preventDefault(); onBlockDragOver(e); }}
      onDrop={(e) => onBlockDrop(e, block.id)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Block header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-50">
        <span className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300">
          <GripIcon />
        </span>
        {/* Colour dot picker */}
        <div className="relative group/colorpicker flex-shrink-0">
          <div
            className="w-5 h-5 rounded-full cursor-pointer ring-2 ring-white ring-offset-1 shadow-sm"
            style={{ backgroundColor: block.color ?? '#6366f1' }}
          />
          <div className="absolute left-0 top-7 z-10 hidden group-hover/colorpicker:flex flex-wrap gap-1 bg-white border border-gray-100 shadow-lg rounded-xl p-2 w-28">
            {BLOCK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdateBlock({ color: c })}
                className="w-5 h-5 rounded-full ring-2 ring-white ring-offset-1 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <input
          type="text"
          value={block.name}
          onChange={(e) => onUpdateBlock({ name: e.target.value })}
          placeholder="Nombre del bloque"
          className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 outline-none focus:ring-0 placeholder-gray-300 min-w-0"
        />

        <span className="text-xs text-gray-400 flex-shrink-0">{durationLabel}</span>

        <button
          type="button"
          onClick={onDeleteBlock}
          title="Eliminar bloque"
          className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Stages */}
      <div className="p-3 space-y-2">
        {block.stages.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Añade etapas a este bloque
          </p>
        )}
        {block.stages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            onUpdate={(data) => onUpdateStage(stage.id, data)}
            onDelete={() => onDeleteStage(stage.id)}
            onDragStart={(e, sid) => onStageDragStart(e, sid, block.id)}
            onDragOver={onStageDragOver}
            onDrop={(e, tid) => onStageDrop(e, tid, block.id)}
          />
        ))}
        <button
          type="button"
          onClick={onAddStage}
          className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors mt-1"
        >
          <PlusIcon />
          Añadir etapa
        </button>
      </div>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function ScheduleTemplateEditor() {
  const [template, setTemplate] = useState<ScheduleTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag state refs (avoids re-renders during drag)
  const dragBlockId = useRef<string | null>(null);
  const dragStageId = useRef<string | null>(null);
  const dragStageBlockId = useRef<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/planner/schedule-template')
      .then((r) => r.json())
      .then((json) => { setTemplate(json.data); setLoading(false); })
      .catch(() => { setError('Error al cargar la plantilla'); setLoading(false); });
  }, []);

  // ── API helpers ─────────────────────────────────────────────────────────────
  const api = useCallback(async (method: string, body: object) => {
    setSaving(true);
    try {
      const res = await fetch('/api/planner/schedule-template', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return json.data;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Block operations ────────────────────────────────────────────────────────
  const addBlock = async () => {
    if (!template) return;
    const newOrder = template.blocks.length;
    const created = await api('POST', {
      type: 'block',
      name: 'Nuevo bloque',
      order: newOrder,
      color: BLOCK_COLORS[newOrder % BLOCK_COLORS.length],
    });
    setTemplate((t) => t ? { ...t, blocks: [...t.blocks, { ...created, stages: [] }] } : t);
  };

  const updateBlock = async (blockId: string, data: Partial<ScheduleBlock>) => {
    setTemplate((t) => t ? {
      ...t,
      blocks: t.blocks.map((b) => b.id === blockId ? { ...b, ...data } : b),
    } : t);
    await api('PATCH', { type: 'block', block_id: blockId, ...data });
  };

  const deleteBlock = async (blockId: string) => {
    if (!confirm('¿Eliminar este bloque y todas sus etapas?')) return;
    setTemplate((t) => t ? { ...t, blocks: t.blocks.filter((b) => b.id !== blockId) } : t);
    await api('DELETE', { type: 'block', block_id: blockId });
  };

  // ── Stage operations ────────────────────────────────────────────────────────
  const addStage = async (blockId: string) => {
    if (!template) return;
    const block = template.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const created = await api('POST', {
      type: 'stage',
      block_id: blockId,
      name: 'Nueva etapa',
      duration_minutes: 30,
      order: block.stages.length,
      visible_to_couple: true,
    });
    setTemplate((t) => t ? {
      ...t,
      blocks: t.blocks.map((b) =>
        b.id === blockId ? { ...b, stages: [...b.stages, created] } : b
      ),
    } : t);
  };

  const updateStage = async (stageId: string, data: Partial<ScheduleStage>) => {
    setTemplate((t) => t ? {
      ...t,
      blocks: t.blocks.map((b) => ({
        ...b,
        stages: b.stages.map((s) => s.id === stageId ? { ...s, ...data } : s),
      })),
    } : t);
    await api('PATCH', { type: 'stage', stage_id: stageId, ...data });
  };

  const deleteStage = async (stageId: string) => {
    setTemplate((t) => t ? {
      ...t,
      blocks: t.blocks.map((b) => ({
        ...b,
        stages: b.stages.filter((s) => s.id !== stageId),
      })),
    } : t);
    await api('DELETE', { type: 'stage', stage_id: stageId });
  };

  // ── Drag & drop — blocks ────────────────────────────────────────────────────
  const onBlockDragStart = (_e: React.DragEvent, blockId: string) => {
    dragBlockId.current = blockId;
    dragStageId.current = null;
  };
  const onBlockDragOver = (e: React.DragEvent) => e.preventDefault();
  const onBlockDrop = async (_e: React.DragEvent, targetBlockId: string) => {
    if (!template || !dragBlockId.current || dragBlockId.current === targetBlockId) return;
    const src = dragBlockId.current;
    const blocks = [...template.blocks];
    const srcIdx = blocks.findIndex((b) => b.id === src);
    const tgtIdx = blocks.findIndex((b) => b.id === targetBlockId);
    const [moved] = blocks.splice(srcIdx, 1);
    blocks.splice(tgtIdx, 0, moved);
    const updated = blocks.map((b, i) => ({ ...b, order: i }));
    setTemplate((t) => t ? { ...t, blocks: updated } : t);
    dragBlockId.current = null;
    await api('POST', { type: 'reorder', entity: 'blocks', updates: updated.map((b) => ({ id: b.id, order: b.order })) });
  };

  // ── Drag & drop — stages ────────────────────────────────────────────────────
  const onStageDragStart = (_e: React.DragEvent, stageId: string, blockId: string) => {
    dragStageId.current = stageId;
    dragStageBlockId.current = blockId;
    dragBlockId.current = null;
  };
  const onStageDragOver = (e: React.DragEvent) => e.preventDefault();
  const onStageDrop = async (_e: React.DragEvent, targetStageId: string, blockId: string) => {
    if (!template || !dragStageId.current || dragStageId.current === targetStageId) return;
    if (dragStageBlockId.current !== blockId) return; // only within same block
    const src = dragStageId.current;
    const newBlocks = template.blocks.map((b) => {
      if (b.id !== blockId) return b;
      const stages = [...b.stages];
      const srcIdx = stages.findIndex((s) => s.id === src);
      const tgtIdx = stages.findIndex((s) => s.id === targetStageId);
      const [moved] = stages.splice(srcIdx, 1);
      stages.splice(tgtIdx, 0, moved);
      return { ...b, stages: stages.map((s, i) => ({ ...s, order: i })) };
    });
    setTemplate((t) => t ? { ...t, blocks: newBlocks } : t);
    dragStageId.current = null;
    const block = newBlocks.find((b) => b.id === blockId);
    if (block) {
      await api('POST', { type: 'reorder', entity: 'stages', updates: block.stages.map((s) => ({ id: s.id, order: s.order })) });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Arrastra para reordenar · El ojo
            <span className="inline-flex mx-1 align-middle text-teal-500"><EyeIcon /></span>
            controla si la etapa es visible para los novios
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-lg">{error}</span>
          )}
          {saving && <span className="text-xs text-gray-400">Guardando...</span>}
          {saved && !saving && <span className="text-xs text-teal-600 font-medium">✓ Guardado</span>}
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        {(template?.blocks ?? []).map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            onUpdateBlock={(data) => updateBlock(block.id, data)}
            onDeleteBlock={() => deleteBlock(block.id)}
            onAddStage={() => addStage(block.id)}
            onUpdateStage={(sid, data) => updateStage(sid, data)}
            onDeleteStage={(sid) => deleteStage(sid)}
            onStageDragStart={onStageDragStart}
            onStageDragOver={onStageDragOver}
            onStageDrop={onStageDrop}
            onBlockDragStart={onBlockDragStart}
            onBlockDragOver={onBlockDragOver}
            onBlockDrop={onBlockDrop}
          />
        ))}
      </div>

      {/* Add block */}
      <button
        type="button"
        onClick={addBlock}
        className="flex items-center gap-2 w-full justify-center py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-rose-300 hover:text-rose-500 transition-all"
      >
        <PlusIcon />
        Añadir bloque
      </button>
    </div>
  );
}
