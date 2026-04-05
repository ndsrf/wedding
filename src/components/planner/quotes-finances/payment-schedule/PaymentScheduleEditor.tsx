'use client';

import { useState, useCallback } from 'react';

export type ReferenceDate = 'WEDDING_DATE' | 'SIGNING_DATE' | 'FIXED_DATE';
export type AmountType = 'FIXED' | 'PERCENTAGE';

export interface ScheduleItem {
  id?: string;
  order: number;
  days_offset: number;
  reference_date: ReferenceDate;
  fixed_date: string | null; // ISO date string
  description: string;
  amount_type: AmountType;
  amount_value: number;
}

interface Props {
  items: ScheduleItem[];
  onChange: (items: ScheduleItem[]) => void;
  /** Currency for display hints */
  currency?: string;
  /** If provided, shows computed dates in a helper column */
  weddingDate?: string | null;
  signingDate?: string | null;
  /** Show reference date fields (wedding/signing). Template mode hides actual dates. */
  compact?: boolean;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function computeItemDate(item: ScheduleItem, weddingDate?: string | null, signingDate?: string | null): string | null {
  if (item.reference_date === 'FIXED_DATE') return item.fixed_date ? item.fixed_date.split('T')[0] : null;
  if (item.reference_date === 'WEDDING_DATE' && weddingDate) return addDays(weddingDate, item.days_offset);
  if (item.reference_date === 'SIGNING_DATE' && signingDate) return addDays(signingDate, item.days_offset);
  return null;
}

const REFERENCE_DATE_LABELS: Record<ReferenceDate, string> = {
  WEDDING_DATE: 'Fecha boda',
  SIGNING_DATE: 'Fecha firma',
  FIXED_DATE: 'Fecha fija',
};

export function PaymentScheduleEditor({ items, onChange, currency = 'EUR', weddingDate, signingDate, compact = false }: Props) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const updateItem = useCallback((idx: number, patch: Partial<ScheduleItem>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  }, [items, onChange]);

  function addItem() {
    const newItem: ScheduleItem = {
      order: items.length,
      days_offset: 0,
      reference_date: 'WEDDING_DATE',
      fixed_date: null,
      description: '',
      amount_type: 'FIXED',
      amount_value: 0,
    };
    onChange([...items, newItem]);
  }

  function removeItem(idx: number) {
    const next = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i }));
    onChange(next);
  }

  function moveItem(from: number, to: number) {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((it, i) => ({ ...it, order: i })));
  }

  const showComputedDate = !compact && (weddingDate || signingDate);

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="text-xs text-gray-400 italic py-2">Sin hitos de pago. Pulsa «+ Añadir hito» para empezar.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const computedDate = showComputedDate ? computeItemDate(item, weddingDate, signingDate) : null;
            return (
              <div
                key={idx}
                draggable
                onDragStart={() => setDraggingIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={() => { if (draggingIdx !== null) { moveItem(draggingIdx, idx); setDraggingIdx(null); setDragOverIdx(null); } }}
                onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null); }}
                className={`bg-gray-50 rounded-lg border p-3 transition-all ${dragOverIdx === idx ? 'border-rose-300 bg-rose-50' : 'border-gray-200'}`}
              >
                <div className="flex items-start gap-2">
                  {/* Drag handle */}
                  <div className="mt-1 cursor-grab text-gray-300 hover:text-gray-500 select-none flex-shrink-0" title="Arrastrar para reordenar">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Row 1: Description */}
                    <input
                      type="text"
                      placeholder="Descripción (se usará como concepto de la factura)"
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />

                    {/* Row 2: Date config */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={item.reference_date}
                        onChange={(e) => updateItem(idx, { reference_date: e.target.value as ReferenceDate, fixed_date: null })}
                        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                      >
                        <option value="WEDDING_DATE">Fecha boda</option>
                        <option value="SIGNING_DATE">Fecha firma</option>
                        <option value="FIXED_DATE">Fecha fija</option>
                      </select>

                      {item.reference_date === 'FIXED_DATE' ? (
                        <input
                          type="date"
                          value={item.fixed_date ? item.fixed_date.split('T')[0] : ''}
                          onChange={(e) => updateItem(idx, { fixed_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={item.days_offset}
                            onChange={(e) => updateItem(idx, { days_offset: parseInt(e.target.value) || 0 })}
                            className="w-20 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 text-center"
                          />
                          <span className="text-xs text-gray-500">días</span>
                          <span className="text-xs text-gray-400">
                            ({item.days_offset >= 0
                              ? `+${item.days_offset} después de ${REFERENCE_DATE_LABELS[item.reference_date].toLowerCase()}`
                              : `${item.days_offset} antes de ${REFERENCE_DATE_LABELS[item.reference_date].toLowerCase()}`})
                          </span>
                        </div>
                      )}

                      {computedDate && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium">
                          📅 {new Date(computedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {showComputedDate && !computedDate && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                          Fecha pendiente
                        </span>
                      )}
                    </div>

                    {/* Row 3: Amount */}
                    <div className="flex items-center gap-2">
                      <select
                        value={item.amount_type}
                        onChange={(e) => updateItem(idx, { amount_type: e.target.value as AmountType })}
                        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                      >
                        <option value="FIXED">Importe fijo ({currency})</option>
                        <option value="PERCENTAGE">% del importe restante</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max={item.amount_type === 'PERCENTAGE' ? 100 : undefined}
                        step={item.amount_type === 'PERCENTAGE' ? 1 : 0.01}
                        value={item.amount_value}
                        onChange={(e) => updateItem(idx, { amount_value: parseFloat(e.target.value) || 0 })}
                        className="w-24 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 text-right"
                      />
                      <span className="text-xs text-gray-500">{item.amount_type === 'PERCENTAGE' ? '%' : currency}</span>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                    title="Eliminar hito"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-dashed border-rose-200"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        + Añadir hito de pago
      </button>
    </div>
  );
}
