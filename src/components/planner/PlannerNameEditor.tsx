'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  initialName: string;
  email: string;
  initialPhone: string | null;
  initialBankAccount: string | null;
  initialAcceptsBizum: boolean;
  initialAcceptsRevolut: boolean;
}

export default function PlannerNameEditor({
  initialName,
  email,
  initialPhone,
  initialBankAccount,
  initialAcceptsBizum,
  initialAcceptsRevolut,
}: Props) {
  const t = useTranslations('planner.account');
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [bankAccount, setBankAccount] = useState(initialBankAccount ?? '');
  const [acceptsBizum, setAcceptsBizum] = useState(initialAcceptsBizum);
  const [acceptsRevolut, setAcceptsRevolut] = useState(initialAcceptsRevolut);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/planner/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          bank_account: bankAccount.trim() || null,
          accepts_bizum: acceptsBizum,
          accepts_revolut: acceptsRevolut,
        }),
      });
      if (!res.ok) throw new Error('Error saving');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">{t('personalData')}</h2>
      <div className="space-y-4">
        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{email}</p>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="planner-name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('name')}
          </label>
          <input
            id="planner-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        {/* Phone + Bizum/Revolut checkboxes */}
        <div>
          <label htmlFor="planner-phone" className="block text-sm font-medium text-gray-700 mb-1">
            {t('phone')}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="planner-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptsBizum}
                  onChange={(e) => setAcceptsBizum(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700">{t('acceptsBizum')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptsRevolut}
                  onChange={(e) => setAcceptsRevolut(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700">{t('acceptsRevolut')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Bank account */}
        <div>
          <label htmlFor="planner-bank" className="block text-sm font-medium text-gray-700 mb-1">
            {t('bankAccount')}
          </label>
          <input
            id="planner-bank"
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder={t('bankAccountPlaceholder')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('saving') : t('saveChanges')}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">{t('changesSaved')}</span>}
        </div>
      </div>
    </section>
  );
}
