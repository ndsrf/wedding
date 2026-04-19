'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ExistingKey {
  id: string;
  name: string;
  expires_at: string | null;
  last_used_at: string | null;
}

interface Props {
  existingKey: ExistingKey | null;
  mcpUrl: string;
}

export default function PlannerApiKeySection({ existingKey, mcpUrl }: Props) {
  const t = useTranslations('planner.account.apiKey');

  const [key, setKey] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(existingKey?.expires_at ?? null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const hasActiveKey = !!(existingKey && (!existingKey.expires_at || new Date(existingKey.expires_at) > new Date()));

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/planner/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Claude Desktop' }),
      });
      const data = await res.json();
      if (data.success) {
        setKey(data.data.key);
        setExpiresAt(data.data.expires_at);
      }
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const configSnippet = key
    ? JSON.stringify({
        mcpServers: {
          nupci: {
            command: 'npx',
            args: ['mcp-remote', mcpUrl, '--header', `Authorization: Bearer ${key}`],
          },
        },
      }, null, 2)
    : '';

  function copyConfig() {
    navigator.clipboard.writeText(configSnippet);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{t('title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
      </div>

      {!key && hasActiveKey && (
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            <span className="font-medium text-gray-900">{existingKey!.name}</span>
            {expiresAt && (
              <span className="ml-2 text-gray-400">
                · {t('expiresOn')} {new Date(expiresAt).toLocaleDateString()}
              </span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Active
          </span>
        </div>
      )}

      {!key && !hasActiveKey && (
        <p className="text-sm text-gray-500 mb-4">{t('noKey')}</p>
      )}

      {key && (
        <div className="mb-5 space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-800">{t('warningOnce')}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('keyLabel')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={key}
                className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800 focus:outline-none"
              />
              <button
                onClick={copyKey}
                className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
              >
                {copied ? t('copied') : t('copy')}
              </button>
            </div>
            {expiresAt && (
              <p className="mt-1.5 text-xs text-gray-400">
                {t('expiresOn')} {new Date(expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-500">{t('configLabel')}</label>
              <button
                onClick={copyConfig}
                className="text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                {copiedConfig ? t('copied') : t('copy')}
              </button>
            </div>
            <pre className="rounded-lg bg-gray-950 text-gray-100 text-xs p-4 overflow-x-auto leading-relaxed">
              {configSnippet}
            </pre>
            <p className="mt-1.5 text-xs text-gray-400">{t('configNote')}</p>
          </div>
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 transition-colors"
      >
        {loading ? t('generating') : hasActiveKey && !key ? t('regenerate') : t('generate')}
      </button>
    </section>
  );
}
