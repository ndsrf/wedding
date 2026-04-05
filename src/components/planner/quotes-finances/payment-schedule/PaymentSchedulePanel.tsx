'use client';

import { useState, useEffect, useCallback } from 'react';
import { PaymentScheduleEditor, type ScheduleItem } from './PaymentScheduleEditor';

interface Props {
  contractId: string;
  contractTitle: string;
  /** Pre-populate from quote event_date or contract.signed_at */
  defaultWeddingDate?: string | null;
  defaultSigningDate?: string | null;
  currency?: string;
  onClose: () => void;
}

export function PaymentSchedulePanel({
  contractId,
  contractTitle,
  defaultWeddingDate,
  defaultSigningDate,
  currency = 'EUR',
  onClose,
}: Props) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [weddingDate, setWeddingDate] = useState(defaultWeddingDate ? defaultWeddingDate.split('T')[0] : '');
  const [signingDate, setSigningDate] = useState(defaultSigningDate ? defaultSigningDate.split('T')[0] : '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planner/contracts/${contractId}/payment-schedule`);
      if (res.ok) {
        const { data } = await res.json();
        if (data.wedding_date) setWeddingDate(data.wedding_date.split('T')[0]);
        if (data.signing_date) setSigningDate(data.signing_date.split('T')[0]);
        setItems(
          (data.items ?? []).map((it: ScheduleItem & { amount_value: unknown }) => ({
            ...it,
            amount_value: Number(it.amount_value),
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/planner/contracts/${contractId}/payment-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_date: weddingDate ? new Date(weddingDate).toISOString() : null,
          signing_date: signingDate ? new Date(signingDate).toISOString() : null,
          items: items.map((it, i) => ({
            order: i,
            days_offset: it.days_offset,
            reference_date: it.reference_date,
            fixed_date: it.fixed_date ?? null,
            description: it.description,
            amount_type: it.amount_type,
            amount_value: it.amount_value,
          })),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Error al guardar el calendario');
      } else {
        onClose();
      }
    } catch {
      setError('Error de red — comprueba tu conexión');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Calendario de pagos</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">{contractTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Reference dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Fecha de la boda
                  </label>
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Fecha de firma del contrato
                  </label>
                  <input
                    type="date"
                    value={signingDate}
                    onChange={(e) => setSigningDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-100 pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Hitos de pago</h3>
                <PaymentScheduleEditor
                  items={items}
                  onChange={setItems}
                  currency={currency}
                  weddingDate={weddingDate || null}
                  signingDate={signingDate || null}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar calendario'}
          </button>
        </div>
      </div>
    </div>
  );
}
