'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Plus, Trash2, FileText, DollarSign, Edit2, Check, X,
  ChevronDown, ChevronUp, Mail, Phone, Globe, AtSign,
} from 'lucide-react';

type PriceType = 'PER_PERSON' | 'GLOBAL';
// Local helper type for input change events (avoids implicit any without React types in env)
type IE = { target: { value: string; files?: FileList | null } };

interface WeddingProvider {
  id: string;
  wedding_id: string;
  category_id: string;
  provider_id: string | null;
  name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_media: string | null;
  total_price: number | null;
  budgeted_price: number | null;
  contract_url: string | null;
  notes: string | null;
  category: { id: string; name: string; price_type: PriceType };
  provider: {
    id: string; name: string; contact_name: string | null;
    email: string | null; phone: string | null;
    website: string | null; social_media: string | null;
  } | null;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  notes: string | null;
  document_url: string | null;
}

interface ProviderCategory { id: string; name: string; }

interface Provider {
  id: string; category_id: string; name: string;
  contact_name: string | null; email: string | null;
  phone: string | null; website: string | null;
  social_media: string | null; approx_price: number | null;
  category: { id: string; name: string };
}

interface WeddingProvidersProps {
  weddingId: string;
  isPlanner: boolean;
}

// ─── Field label+input used in edit form ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Field({ label, children }: { label: string; children?: any }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export function WeddingProviders({ weddingId, isPlanner }: WeddingProvidersProps) {
  const t = useTranslations('planner.providers');

  const [providers, setProviders] = useState<WeddingProvider[]>([]);
  const [categories, setCategories] = useState<ProviderCategory[]>([]);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');

  // planned guests (admin only)
  const [plannedGuests, setPlannedGuests] = useState<number | ''>('');
  const [savingPlannedGuests, setSavingPlannedGuests] = useState(false);

  // which card is in edit / payment / history-expanded mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WeddingProvider>>({});
  const [uploading, setUploading] = useState(false);

  const [paymentProviderId, setPaymentProviderId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDocumentUrl, setPaymentDocumentUrl] = useState('');
  const [uploadingPaymentDoc, setUploadingPaymentDoc] = useState(false);

  const [expandedPayments, setExpandedPayments] = useState<string | null>(null);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const promises = [
        fetch(`/api/weddings/${weddingId}/providers`),
        ...(!isPlanner ? [fetch('/api/admin/wedding')] : []),
      ] as [Promise<Response>, ...Promise<Response>[]];

      const [provRes, weddingRes] = await Promise.all(promises);
      const provData = await provRes.json();
      if (provData.data) setProviders(provData.data);
      if (weddingRes?.ok) {
        const wData = await weddingRes.json();
        if (wData.data?.planned_guests != null) setPlannedGuests(wData.data.planned_guests);
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [weddingId, isPlanner]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/categories`);
      if (res.ok) setCategories((await res.json()).data ?? []);
      if (isPlanner) {
        const pr = await fetch('/api/planner/providers');
        if (pr.ok) setAllProviders((await pr.json()).data ?? []);
      }
    } catch (err) { console.error(err); }
  };

  // ── planned guests ────────────────────────────────────────────────────────
  const handleSavePlannedGuests = async () => {
    if (plannedGuests === '') return;
    setSavingPlannedGuests(true);
    try {
      await fetch('/api/admin/wedding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned_guests: Number(plannedGuests) }),
      });
    } catch (err) { console.error(err); }
    finally { setSavingPlannedGuests(false); }
  };

  // ── add provider ──────────────────────────────────────────────────────────
  const handleAddProvider = async () => {
    if (!selectedCategoryId) return;
    const sp = selectedProviderId ? allProviders.find((p: Provider) => p.id === selectedProviderId) : null;
    const body: Record<string, unknown> = { category_id: selectedCategoryId };
    if (sp) {
      body.provider_id = sp.id; body.name = sp.name;
      body.contact_name = sp.contact_name; body.email = sp.email;
      body.phone = sp.phone; body.website = sp.website; body.social_media = sp.social_media;
    }
    const res = await fetch(`/api/weddings/${weddingId}/providers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) {
      fetchData(); setShowAddProvider(false); setSelectedCategoryId(''); setSelectedProviderId('');
    } else {
      const err = await res.json();
      alert(err.error || t('errorAddingProvider'));
    }
  };

  // ── update provider ───────────────────────────────────────────────────────
  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/weddings/${weddingId}/providers/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        contact_name: editForm.contact_name,
        email: editForm.email,
        phone: editForm.phone,
        website: editForm.website,
        social_media: editForm.social_media,
        total_price: editForm.total_price != null ? Number(editForm.total_price) : null,
        budgeted_price: editForm.budgeted_price != null ? Number(editForm.budgeted_price) : null,
        notes: editForm.notes,
        contract_url: editForm.contract_url,
      }),
    });
    if (res.ok) { fetchData(); setEditingId(null); setEditForm({}); }
    else {
      const ed = await res.json().catch(() => ({}));
      alert(Array.isArray(ed.error)
        ? ed.error.map((e: { path: string[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('\n')
        : ed.error || `Failed to update (${res.status})`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteProviderFromWedding'))) return;
    const res = await fetch(`/api/weddings/${weddingId}/providers/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  // ── file upload ───────────────────────────────────────────────────────────
  const handleContractUpload = async (e: IE, id: string) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', e.target.files[0]); fd.append('weddingProviderId', id);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (res.ok) {
      const data = await res.json();
      setEditForm((prev: Partial<WeddingProvider>) => ({ ...prev, contract_url: data.url }));
    }
    setUploading(false);
  };

  const handlePaymentDocUpload = async (e: IE, id: string) => {
    if (!e.target.files?.[0]) return;
    setUploadingPaymentDoc(true);
    const fd = new FormData();
    fd.append('file', e.target.files[0]); fd.append('weddingProviderId', id);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (res.ok) setPaymentDocumentUrl((await res.json()).url);
    else alert('Upload failed');
    setUploadingPaymentDoc(false);
  };

  // ── payments ──────────────────────────────────────────────────────────────
  const handleAddPayment = async (providerId: string) => {
    if (!paymentAmount) return;
    const res = await fetch(`/api/weddings/${weddingId}/payments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wedding_provider_id: providerId, amount: Number(paymentAmount),
        method: paymentMethod, notes: paymentNotes,
        document_url: paymentDocumentUrl || undefined,
      }),
    });
    if (res.ok) {
      fetchData(); setPaymentProviderId(null);
      setPaymentAmount(''); setPaymentNotes(''); setPaymentDocumentUrl('');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm(t('confirmDeletePayment'))) return;
    const res = await fetch(`/api/weddings/${weddingId}/payments/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const getProjected = (wp: WeddingProvider) => {
    const b = wp.budgeted_price ? Number(wp.budgeted_price) : 0;
    if (!b) return 0;
    return wp.category.price_type === 'PER_PERSON' && plannedGuests ? b * Number(plannedGuests) : b;
  };

  const totalBudgeted = providers.reduce((s: number, wp: WeddingProvider) => s + getProjected(wp), 0);
  const totalReal = providers.reduce((s: number, wp: WeddingProvider) => s + (wp.total_price ? Number(wp.total_price) : 0), 0);
  const totalPaid = providers.reduce((s: number, wp: WeddingProvider) => s + wp.payments.reduce((ps: number, p: Payment) => ps + Number(p.amount), 0), 0);
  const totalPending = totalReal - totalPaid;

  const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  if (isLoading) return <div className="p-8 text-center text-gray-500">{t('loading')}</div>;

  return (
    <div className="space-y-6">

      {/* ── Planned guests (admin only) ── */}
      {!isPlanner && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-blue-800 whitespace-nowrap">
              {t('plannedGuests')}
            </label>
            <Input
              type="number" min={1}
              value={plannedGuests}
              onChange={(e: IE) => setPlannedGuests(e.target.value ? Number(e.target.value) : '')}
              onBlur={handleSavePlannedGuests}
              className="w-28 bg-white"
              placeholder="0"
            />
            <Button size="sm" variant="outline"
              onClick={handleSavePlannedGuests}
              disabled={savingPlannedGuests || plannedGuests === ''}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              {savingPlannedGuests ? t('saving') : t('save')}
            </Button>
            <p className="text-xs text-blue-600">{t('plannedGuestsHint')}</p>
          </div>
        </Card>
      )}

      {/* ── Header + add button ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">{t('weddingProvidersTitle')}</h2>
        <Button onClick={() => { setShowAddProvider(true); fetchCategories(); }}>
          <Plus className="w-4 h-4 mr-2" />{t('addCategory')}
        </Button>
      </div>

      {/* ── Add provider form ── */}
      {showAddProvider && (
        <Card className="p-4 bg-gray-50 space-y-3">
          <select className={selectClass} value={selectedCategoryId}
            onChange={(e: IE) => { setSelectedCategoryId(e.target.value); setSelectedProviderId(''); }}
          >
            <option value="">{t('selectCategory')}</option>
            {categories.map((c: ProviderCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isPlanner && selectedCategoryId && (
            <select className={selectClass} value={selectedProviderId}
              onChange={(e: IE) => setSelectedProviderId(e.target.value)}
            >
              <option value="">{t('selectProvider')}</option>
              {allProviders.filter((p: Provider) => p.category_id === selectedCategoryId)
                .map((p: Provider) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <Button onClick={handleAddProvider} disabled={!selectedCategoryId}>{t('add')}</Button>
            <Button variant="ghost" onClick={() => { setShowAddProvider(false); setSelectedCategoryId(''); setSelectedProviderId(''); }}>
              {t('cancel')}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Provider cards ── */}
      <div className="space-y-3">
        {providers.map((wp: WeddingProvider) => {
          const paid = wp.payments.reduce((s: number, p: Payment) => s + Number(p.amount), 0);
          const total = wp.total_price ? Number(wp.total_price) : 0;
          const pending = total - paid;
          const projected = getProjected(wp);
          const isEditing = editingId === wp.id;
          const isPayment = paymentProviderId === wp.id;
          const isPaymentsOpen = expandedPayments === wp.id;

          return (
            <Card key={wp.id} className={`overflow-hidden transition-shadow ${isEditing ? 'ring-2 ring-blue-300 shadow-md' : 'hover:shadow-sm'}`}>

              {/* ── Card header: category + name + actions ── */}
              <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      wp.category.price_type === 'PER_PERSON'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {wp.category.name}
                      {wp.category.price_type === 'PER_PERSON' && (
                        <span className="ml-1 opacity-70">· {t('priceTypePerPerson')}</span>
                      )}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 truncate">
                    {wp.name || wp.provider?.name || <span className="text-gray-400 font-normal italic">{t('notAssigned')}</span>}
                  </p>
                  {wp.contact_name && <p className="text-sm text-gray-500 mt-0.5">{wp.contact_name}</p>}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleUpdate(wp.id)}
                        className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200" title={t('save')}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditingId(null); setEditForm({}); }}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" title={t('cancel')}>
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(wp.id); setEditForm(wp); setPaymentProviderId(null); }}
                        className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600" title={t('edit')}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setPaymentProviderId(isPayment ? null : wp.id); setEditingId(null); }}
                        className="p-2 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600" title={t('addPayment')}>
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(wp.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" title={t('remove')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── View mode: contact + financial summary ── */}
              {!isEditing && (
                <>
                  {/* Contact row */}
                  {(wp.email || wp.phone || wp.website || wp.social_media) && (
                    <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1">
                      {wp.email && (
                        <a href={`mailto:${wp.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
                          <Mail className="w-3 h-3" />{wp.email}
                        </a>
                      )}
                      {wp.phone && (
                        <a href={`tel:${wp.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
                          <Phone className="w-3 h-3" />{wp.phone}
                        </a>
                      )}
                      {wp.website && (
                        <a href={wp.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
                          <Globe className="w-3 h-3" />Web
                        </a>
                      )}
                      {wp.social_media && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <AtSign className="w-3 h-3" />{wp.social_media}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Financial summary bar */}
                  <div className="border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
                    {!isPlanner && (
                      <div className="px-3 py-2 text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-medium mb-0.5">{t('budgetedPrice')}</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {wp.budgeted_price ? `${Number(wp.budgeted_price).toLocaleString()} €` : '—'}
                          {wp.budgeted_price && wp.category.price_type === 'PER_PERSON' && (
                            <span className="text-[10px] text-gray-400 ml-0.5">/{t('perPersonShort')}</span>
                          )}
                        </p>
                      </div>
                    )}
                    {!isPlanner && (
                      <div className="px-3 py-2 text-center">
                        <p className="text-[10px] text-indigo-500 uppercase font-medium mb-0.5">{t('projectedTotal')}</p>
                        <p className="text-sm font-semibold text-indigo-600">
                          {projected ? `${projected.toLocaleString()} €` : '—'}
                        </p>
                      </div>
                    )}
                    <div className="px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-0.5">{t('totalPrice')}</p>
                      <p className="text-sm font-semibold text-gray-800">{total.toLocaleString()} €</p>
                    </div>
                    <div className="px-3 py-2 text-center">
                      <p className="text-[10px] text-green-500 uppercase font-medium mb-0.5">{t('paid')}</p>
                      <p className="text-sm font-semibold text-green-700">{paid.toLocaleString()} €</p>
                    </div>
                    <div className="px-3 py-2 text-center">
                      <p className="text-[10px] text-red-400 uppercase font-medium mb-0.5">{t('pending')}</p>
                      <p className="text-sm font-semibold text-red-600">{pending.toLocaleString()} €</p>
                    </div>
                  </div>

                  {/* Contract + notes row */}
                  {(wp.contract_url || wp.notes) && (
                    <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-4">
                      {wp.contract_url && (
                        <a href={wp.contract_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <FileText className="w-3 h-3" />{t('contract')}
                        </a>
                      )}
                      {wp.notes && (
                        <p className="text-xs text-gray-500 italic truncate max-w-xs" title={wp.notes}>{wp.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Payments toggle */}
                  {wp.payments.length > 0 && (
                    <button
                      onClick={() => setExpandedPayments(isPaymentsOpen ? null : wp.id)}
                      className="w-full px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50"
                    >
                      <span>{wp.payments.length} {t('paymentsHistory').toLowerCase()}</span>
                      {isPaymentsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}

                  {/* Inline payment list */}
                  {isPaymentsOpen && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {wp.payments
                        .slice().sort((a: Payment, b: Payment) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((p: Payment) => (
                          <div key={p.id} className="px-4 py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-green-700">{Number(p.amount).toLocaleString()} €</span>
                              <span className="text-xs text-gray-400 ml-2">{p.method}</span>
                              <span className="text-xs text-gray-400 ml-2">{new Date(p.date).toLocaleDateString()}</span>
                              {p.notes && <span className="text-xs text-gray-400 ml-2 italic">{p.notes}</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {p.document_url && (
                                <a href={p.document_url} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700">
                                  <FileText className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button onClick={() => handleDeletePayment(p.id)}
                                className="text-gray-300 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Edit mode: inline form ── */}
              {isEditing && (
                <div className="px-4 pb-4 border-t border-blue-100 pt-3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t('name')}>
                      <Input value={editForm.name || ''} placeholder={t('providerName')}
                        onChange={(e: IE) => setEditForm({ ...editForm, name: e.target.value })} />
                    </Field>
                    <Field label={t('contactPerson')}>
                      <Input value={editForm.contact_name || ''} placeholder={t('contactName')}
                        onChange={(e: IE) => setEditForm({ ...editForm, contact_name: e.target.value })} />
                    </Field>
                    <Field label={t('email')}>
                      <Input type="email" value={editForm.email || ''} placeholder="email@example.com"
                        onChange={(e: IE) => setEditForm({ ...editForm, email: e.target.value })} />
                    </Field>
                    <Field label={t('phone')}>
                      <Input value={editForm.phone || ''} placeholder="+34 600 000 000"
                        onChange={(e: IE) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </Field>
                    <Field label={t('website')}>
                      <Input value={editForm.website || ''} placeholder="https://"
                        onChange={(e: IE) => setEditForm({ ...editForm, website: e.target.value })} />
                    </Field>
                    <Field label={t('socialMedia')}>
                      <Input value={editForm.social_media || ''} placeholder="@handle"
                        onChange={(e: IE) => setEditForm({ ...editForm, social_media: e.target.value })} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {!isPlanner && (
                      <Field label={`${t('budgetedPrice')}${wp.category.price_type === 'PER_PERSON' ? ` (/${t('perPersonShort')})` : ''}`}>
                        <Input type="number" value={editForm.budgeted_price ?? ''}
                          onChange={(e: IE) => setEditForm({ ...editForm, budgeted_price: e.target.value ? Number(e.target.value) : null })} />
                      </Field>
                    )}
                    <Field label={t('totalPrice')}>
                      <Input type="number" value={editForm.total_price ?? ''}
                        onChange={(e: IE) => setEditForm({ ...editForm, total_price: e.target.value ? Number(e.target.value) : null })} />
                    </Field>
                    <Field label={t('notes')}>
                      <Input value={editForm.notes || ''} placeholder="…"
                        onChange={(e: IE) => setEditForm({ ...editForm, notes: e.target.value })} />
                    </Field>
                  </div>

                  <Field label={t('contract')}>
                    <div className="flex items-center gap-3">
                      <Input type="file" accept=".pdf"
                        onChange={(e: IE) => handleContractUpload(e, wp.id)}
                        disabled={uploading} className="text-sm" />
                      {uploading && <span className="text-xs text-blue-500">{t('saving')}</span>}
                      {(editForm.contract_url || wp.contract_url) && (
                        <a href={editForm.contract_url || wp.contract_url!}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline whitespace-nowrap">
                          <FileText className="w-3 h-3" />Ver
                        </a>
                      )}
                    </div>
                  </Field>

                  <div className="flex gap-2 pt-1">
                    <Button onClick={() => handleUpdate(wp.id)} size="sm" className="flex-1 sm:flex-none">
                      <Check className="w-4 h-4 mr-1" />{t('save')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditForm({}); }}>
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Add payment form (inline) ── */}
              {isPayment && !isEditing && (
                <div className="px-4 pb-4 border-t border-green-100 pt-3 space-y-3 bg-green-50/50">
                  <h4 className="text-sm font-semibold text-green-800">{t('recordPayment')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('amount')}>
                      <Input type="number" value={paymentAmount}
                        onChange={(e: IE) => setPaymentAmount(e.target.value)} placeholder="0.00" />
                    </Field>
                    <Field label={t('method')}>
                      <select className={selectClass} value={paymentMethod}
                        onChange={(e: IE) => setPaymentMethod(e.target.value)}>
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="PAYPAL">Paypal</option>
                        <option value="BIZUM">Bizum</option>
                        <option value="REVOLUT">Revolut</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </Field>
                  </div>
                  <Field label={t('notes')}>
                    <Input value={paymentNotes}
                      onChange={(e: IE) => setPaymentNotes(e.target.value)}
                      placeholder={t('paymentNotesPlaceholder')} />
                  </Field>
                  <Field label="Document">
                    <div className="flex items-center gap-2">
                      <Input type="file"
                        onChange={(e: IE) => handlePaymentDocUpload(e, wp.id)}
                        disabled={uploadingPaymentDoc} className="text-sm" />
                      {paymentDocumentUrl && (
                        <a href={paymentDocumentUrl} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs whitespace-nowrap">View</a>
                      )}
                    </div>
                  </Field>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAddPayment(wp.id)}
                      className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                      disabled={uploadingPaymentDoc}>
                      {t('savePayment')}
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => { setPaymentProviderId(null); setPaymentDocumentUrl(''); }}>
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {providers.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">{t('noCategories')}</div>
        )}
      </div>

      {/* ── Summary totals ── */}
      {providers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {!isPlanner && (
            <Card className="p-4 text-center border-indigo-200 bg-indigo-50">
              <p className="text-[11px] text-indigo-600 font-medium uppercase mb-1">{t('totalProjected')}</p>
              <p className="text-lg font-bold text-indigo-800">{totalBudgeted.toLocaleString()} €</p>
            </Card>
          )}
          <Card className="p-4 text-center border-gray-200 bg-gray-50">
            <p className="text-[11px] text-gray-500 font-medium uppercase mb-1">{t('totalReal')}</p>
            <p className="text-lg font-bold text-gray-800">{totalReal.toLocaleString()} €</p>
          </Card>
          <Card className="p-4 text-center border-green-200 bg-green-50">
            <p className="text-[11px] text-green-600 font-medium uppercase mb-1">{t('totalPaid')}</p>
            <p className="text-lg font-bold text-green-800">{totalPaid.toLocaleString()} €</p>
          </Card>
          <Card className="p-4 text-center border-red-200 bg-red-50">
            <p className="text-[11px] text-red-500 font-medium uppercase mb-1">{t('totalPending')}</p>
            <p className="text-lg font-bold text-red-800">{totalPending.toLocaleString()} €</p>
          </Card>
        </div>
      )}

      {/* ── Payments history ── */}
      <div className="pt-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">{t('paymentsHistory')}</h2>
        <div className="space-y-2">
          {providers.flatMap((wp: WeddingProvider) =>
            wp.payments.map((p: Payment) => ({
              ...p,
              providerName: wp.provider?.name || wp.name || wp.category.name,
            }))
          )
            .sort((a: Payment, b: Payment) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((payment: Payment & { providerName: string | null }) => (
              <Card key={payment.id} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-green-700 text-sm">{Number(payment.amount).toLocaleString()} €</span>
                    <span className="text-xs text-gray-500">{payment.method}</span>
                    <span className="text-xs text-gray-400">{new Date(payment.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {payment.providerName}
                    {payment.notes && <span className="italic ml-1">· {payment.notes}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {payment.document_url && (
                    <a href={payment.document_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700">
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => handleDeletePayment(payment.id)}
                    className="text-gray-300 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          {providers.flatMap((wp: WeddingProvider) => wp.payments).length === 0 && (
            <p className="text-sm text-center text-gray-400 py-6">{t('noPayments')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
