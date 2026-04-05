'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BUILTIN_ALERTS, builtinRuleName } from '@/lib/alerts/definitions';
import type { AlertDefinition } from '@/lib/alerts/definitions';

// ── Types ─────────────────────────────────────────────────────────────────────

type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP';

interface AlertRowState {
  ruleId: string | null;
  enabled: boolean;
  channels: Channel[];
  saving: boolean;
  error: boolean;
}

type AlertStates = Record<string, AlertRowState>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Planner preferred_language (e.g. 'EN', 'ES') — used to pick template language */
  plannerLanguage: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AlertSettingsPage({ plannerLanguage }: Props) {
  const t = useTranslations('planner.alertSettings');

  // Pre-populate all rows with disabled defaults — rows are visible immediately.
  // The useEffect below merges in real DB values once the fetch completes.
  const [states, setStates] = useState<AlertStates>(() => {
    const initial: AlertStates = {};
    for (const def of BUILTIN_ALERTS) {
      initial[def.builtinId] = {
        ruleId: null,
        enabled: false,
        channels: [...def.defaultChannels],
        saving: false,
        error: false,
      };
    }
    return initial;
  });

  // ── Load existing rules ────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/planner/alert-rules');
        if (!res.ok) throw new Error('Failed to load');
        const { rules } = await res.json() as { rules: Array<{ id: string; name: string; enabled: boolean; channels: Channel[] }> };

        setStates((prev) => {
          const next = { ...prev };
          for (const def of BUILTIN_ALERTS) {
            const existing = rules.find((r) => r.name === builtinRuleName(def.builtinId));
            next[def.builtinId] = {
              ruleId: existing?.id ?? null,
              enabled: existing?.enabled ?? false,
              channels: existing?.channels?.length ? existing.channels : [...def.defaultChannels],
              saving: false,
              error: false,
            };
          }
          return next;
        });
      } catch (err) {
        console.error('[AlertSettings] Failed to load rules', err);
      }
    }
    load();
  }, []);

  // ── Save helpers ───────────────────────────────────────────────────────────

  async function persistAlert(
    builtinId: string,
    patch: { enabled?: boolean; channels?: Channel[] },
  ) {
    const current = states[builtinId];
    if (!current) return;

    // Optimistic update
    setStates((prev) => ({
      ...prev,
      [builtinId]: { ...prev[builtinId], ...patch, saving: true, error: false },
    }));

    try {
      const def = BUILTIN_ALERTS.find((d) => d.builtinId === builtinId)!;
      const lang = plannerLanguage.toUpperCase();
      const mergedChannels = patch.channels ?? current.channels;
      const mergedEnabled = patch.enabled ?? current.enabled;

      let ruleId = current.ruleId;

      if (!ruleId) {
        const res = await fetch('/api/planner/alert-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: builtinRuleName(builtinId),
            event_type: def.event_type,
            subject: def.subject[lang] ?? def.subject['EN'],
            body: def.body[lang] ?? def.body['EN'],
            notify_planner: true,
            notify_master_admin: false,
            notify_couple: false,
            notify_guest_ids: [],
            channels: mergedChannels,
            enabled: mergedEnabled,
          }),
        });
        if (!res.ok) throw new Error('Create failed');
        const data = await res.json() as { rule: { id: string } };
        ruleId = data.rule.id;
      } else {
        const res = await fetch(`/api/planner/alert-rules/${ruleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channels: mergedChannels,
            enabled: mergedEnabled,
          }),
        });
        if (!res.ok) throw new Error('Update failed');
      }

      setStates((prev) => ({
        ...prev,
        [builtinId]: { ...prev[builtinId], ...patch, ruleId, saving: false },
      }));
    } catch (err) {
      console.error('[AlertSettings] Save error', err);
      // Revert
      setStates((prev) => ({
        ...prev,
        [builtinId]: { ...current, saving: false, error: true },
      }));
    }
  }

  function handleToggle(builtinId: string) {
    const current = states[builtinId];
    if (!current || current.saving) return;
    persistAlert(builtinId, { enabled: !current.enabled });
  }

  function handleChannel(builtinId: string, ch: Channel) {
    const current = states[builtinId];
    if (!current || current.saving) return;
    const has = current.channels.includes(ch);
    // Keep at least one channel active
    if (has && current.channels.length === 1) return;
    const next = has
      ? current.channels.filter((c) => c !== ch)
      : [...current.channels, ch];
    persistAlert(builtinId, { channels: next });
  }

  // ── Sub-components ─────────────────────────────────────────────────────────

  function Toggle({ enabled, saving }: { enabled: boolean; saving: boolean }) {
    return (
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          saving ? 'opacity-60 cursor-wait' : 'cursor-pointer'
        } ${enabled ? 'bg-rose-500' : 'bg-gray-200'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    );
  }

  const CHANNEL_STYLES: Record<Channel, { active: string; inactive: string; label: string }> = {
    EMAIL: {
      active: 'bg-blue-100 text-blue-700 border-blue-300',
      inactive: 'bg-gray-50 text-gray-400 border-gray-200',
      label: t('channelEmail'),
    },
    SMS: {
      active: 'bg-green-100 text-green-700 border-green-300',
      inactive: 'bg-gray-50 text-gray-400 border-gray-200',
      label: t('channelSms'),
    },
    WHATSAPP: {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      inactive: 'bg-gray-50 text-gray-400 border-gray-200',
      label: t('channelWhatsapp'),
    },
  };

  function AlertRow({
    def,
    nameKey,
    descKey,
  }: {
    def: AlertDefinition;
    nameKey: string;
    descKey: string;
  }) {
    const state = states[def.builtinId];
    const { enabled, channels, saving, error } = state;

    return (
      <div className="flex items-start gap-4 py-4 px-5 last:pb-5">
        {/* Toggle */}
        <button
          type="button"
          onClick={() => handleToggle(def.builtinId)}
          disabled={saving}
          className="mt-0.5 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 rounded-full"
          aria-checked={enabled}
          role="switch"
          aria-label={t(nameKey as Parameters<typeof t>[0])}
        >
          <Toggle enabled={enabled} saving={saving} />
        </button>

        {/* Text + Channels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
              {t(nameKey as Parameters<typeof t>[0])}
            </span>
            {saving && (
              <svg className="h-3.5 w-3.5 text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {error && (
              <span className="text-xs text-red-500">⚠</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {t(descKey as Parameters<typeof t>[0])}
          </p>

          {/* Channel pills — only visible when enabled */}
          {enabled && (
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {(['EMAIL', 'SMS', 'WHATSAPP'] as Channel[]).map((ch) => {
                const style = CHANNEL_STYLES[ch];
                const isActive = channels.includes(ch);
                const isLast = isActive && channels.length === 1;
                return (
                  <button
                    key={ch}
                    type="button"
                    disabled={saving || isLast}
                    onClick={() => handleChannel(def.builtinId, ch)}
                    title={isLast ? t('channelHint') : undefined}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                      isActive ? style.active : style.inactive
                    } ${saving || isLast ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                  >
                    {ch === 'WHATSAPP' && (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    )}
                    {style.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Section: Para ti ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">{t('forYou')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('forYouSubtitle')}</p>

        {/* Sub-section: Control financiero */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{t('financialControl')}</h3>
                <p className="text-xs text-gray-400">{t('financialControlSubtitle')}</p>
              </div>
            </div>
          </div>

          {/* Alert rows */}
          <div className="divide-y divide-gray-50">
            <AlertRow
              def={BUILTIN_ALERTS.find((d) => d.builtinId === 'quote_expired')!}
              nameKey="quoteExpiredName"
              descKey="quoteExpiredDescription"
            />
          </div>
        </div>
      </section>

      {/* Footer hint */}
      <p className="text-xs text-gray-400 text-center pb-4">
        {t('footer')}{' '}
        <Link href="/planner/company-profile" className="underline hover:text-gray-600">
          {t('footerLink')}
        </Link>
      </p>
    </div>
  );
}
