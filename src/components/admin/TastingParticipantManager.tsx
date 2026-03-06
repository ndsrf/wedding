/**
 * TastingParticipantManager — Add, list, and send links to tasting participants.
 * Supports WhatsApp (LINKS and BUSINESS modes), Email, and SMS.
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface TastingParticipant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  channel_preference: 'WHATSAPP' | 'EMAIL' | 'SMS' | null;
  magic_token: string;
  invite_sent_at: string | null;
}

interface Props {
  participants: TastingParticipant[];
  apiBase: string;
  onParticipantsChange: (participants: TastingParticipant[]) => void;
  readOnly?: boolean;
}

interface AddForm {
  name: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  channel_preference: 'WHATSAPP' | 'EMAIL' | 'SMS' | '';
}

const EMPTY_FORM: AddForm = { name: '', email: '', phone: '', whatsapp_number: '', channel_preference: '' };

function getTastingUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/tasting/${token}`;
  }
  return `/tasting/${token}`;
}

export function TastingParticipantManager({ participants, apiBase, onParticipantsChange, readOnly = false }: Props) {
  const t = useTranslations('admin.tastingMenu');

  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Send modal state
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendChannel, setSendChannel] = useState<'WHATSAPP' | 'EMAIL' | 'SMS'>('WHATSAPP');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);

  // Copy link
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${apiBase}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email || undefined,
          phone: form.phone || undefined,
          whatsapp_number: form.whatsapp_number || undefined,
          channel_preference: form.channel_preference || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      onParticipantsChange([...participants, data.data]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('participants.deleteConfirm'))) return;
    const res = await fetch(`${apiBase}/participants/${id}`, { method: 'DELETE' });
    if (res.ok) {
      onParticipantsChange(participants.filter(p => p.id !== id));
    }
  };

  const handleSend = async (participant: TastingParticipant) => {
    setSendingId(participant.id);
    setSendSuccess(null);
    setSendError(null);
    setWaUrl(null);
    const channel = participant.channel_preference ?? sendChannel;
    try {
      const res = await fetch(`${apiBase}/participants/${participant.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? 'Failed to send');
      if (data.data?.mode === 'LINKS' && data.data?.wa_url) {
        setWaUrl(data.data.wa_url);
      } else {
        setSendSuccess(t('participants.sent'));
        onParticipantsChange(participants.map(p =>
          p.id === participant.id ? { ...p, invite_sent_at: new Date().toISOString() } : p
        ));
        setTimeout(() => { setSendingId(null); setSendSuccess(null); }, 2500);
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleCopyLink = (participant: TastingParticipant) => {
    const url = getTastingUrl(participant.magic_token);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(participant.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const preferredChannel = (p: TastingParticipant) => p.channel_preference ?? sendChannel;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{t('participants.title')}</h3>
        {!readOnly && (
          <button onClick={() => setShowForm(v => !v)}
            className="text-sm px-3 py-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700">
            + {t('participants.add')}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && !readOnly && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('participants.name')} *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500 focus:border-rose-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('participants.email')}</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500 focus:border-rose-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('participants.whatsapp')}</label>
              <input type="tel" value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                placeholder="+34 612 345 678"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500 focus:border-rose-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('participants.phone')}</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500 focus:border-rose-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('participants.channel')}</label>
              <select value={form.channel_preference} onChange={e => setForm(f => ({ ...f, channel_preference: e.target.value as AddForm['channel_preference'] }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-rose-500 focus:border-rose-500">
                <option value="">— Default —</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={adding || !form.name.trim()}
              className="px-4 py-2 bg-rose-600 text-white text-sm rounded-md hover:bg-rose-700 disabled:opacity-50">
              {adding ? '…' : t('participants.save')}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50">
              {t('participants.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Participant list */}
      {participants.length === 0 && <p className="text-sm text-gray-500 italic">{t('participants.empty')}</p>}

      <div className="space-y-2">
        {participants.map(p => (
          <div key={p.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {p.email && <span className="text-xs text-gray-500">✉ {p.email}</span>}
                  {p.whatsapp_number && <span className="text-xs text-gray-500">📱 {p.whatsapp_number}</span>}
                  {p.phone && !p.whatsapp_number && <span className="text-xs text-gray-500">📞 {p.phone}</span>}
                  {p.channel_preference && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.channel_preference}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {p.invite_sent_at
                    ? t('participants.sentAt', { date: new Date(p.invite_sent_at).toLocaleDateString() })
                    : t('participants.notSent')}
                </p>

                {/* Show WA URL if we got LINKS response for this participant */}
                {sendingId === p.id && waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700">
                    📲 {t('participants.inviteModal.whatsappButton')}
                  </a>
                )}
                {sendingId === p.id && sendSuccess && (
                  <p className="text-xs text-green-600 mt-1">{sendSuccess}</p>
                )}
                {sendingId === p.id && sendError && (
                  <p className="text-xs text-red-600 mt-1">{sendError}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Copy link */}
                <button onClick={() => handleCopyLink(p)}
                  title={t('participants.copyLink')}
                  className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:text-gray-700 hover:border-gray-300">
                  {copiedId === p.id ? '✓' : '🔗'}
                </button>

                {/* Channel selector + send */}
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    {!p.channel_preference && (
                      <select value={sendChannel} onChange={e => setSendChannel(e.target.value as typeof sendChannel)}
                        className="text-xs border border-gray-200 rounded px-1 py-1">
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                      </select>
                    )}
                    <button
                      onClick={() => handleSend(p)}
                      disabled={sendingId === p.id && !waUrl}
                      title={`${t('participants.send')} via ${preferredChannel(p)}`}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                      {sendingId === p.id && !waUrl && !sendSuccess && !sendError ? '…' : '↗ Send'}
                    </button>
                  </div>
                )}

                {!readOnly && (
                  <button onClick={() => handleDelete(p.id)}
                    className="text-xs text-red-400 hover:text-red-600">{t('participants.delete')}</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
