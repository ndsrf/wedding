'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, FileText, DollarSign, Edit2, Check, X } from 'lucide-react';

type PriceType = 'PER_PERSON' | 'GLOBAL';

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
  category: {
    id: string;
    name: string;
    price_type: PriceType;
  };
  provider: {
    id: string;
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    social_media: string | null;
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

interface ProviderCategory {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  category_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_media: string | null;
  approx_price: number | null;
  category: {
    id: string;
    name: string;
  };
}

interface WeddingProvidersProps {
  weddingId: string;
  isPlanner: boolean;
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

  // Planned guests state
  const [plannedGuests, setPlannedGuests] = useState<number | ''>('');
  const [savingPlannedGuests, setSavingPlannedGuests] = useState(false);

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDocumentUrl, setPaymentDocumentUrl] = useState('');
  const [uploadingPaymentDoc, setUploadingPaymentDoc] = useState(false);

  // Provider Edit State
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WeddingProvider>>({});
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [provRes, weddingRes] = await Promise.all([
        fetch(`/api/weddings/${weddingId}/providers`),
        fetch('/api/admin/wedding'),
      ]);
      const provData = await provRes.json();
      if (provData.data) setProviders(provData.data);
      if (weddingRes.ok) {
        const weddingData = await weddingRes.json();
        if (weddingData.data?.planned_guests != null) {
          setPlannedGuests(weddingData.data.planned_guests);
        }
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchCategories = async () => {
    try {
      const categoriesRes = await fetch(`/api/weddings/${weddingId}/categories`);
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.data || []);
      }
      if (isPlanner) {
        const providersRes = await fetch('/api/planner/providers');
        if (providersRes.ok) {
          const data = await providersRes.json();
          setAllProviders(data.data || []);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSavePlannedGuests = async () => {
    if (plannedGuests === '') return;
    setSavingPlannedGuests(true);
    try {
      await fetch('/api/admin/wedding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned_guests: Number(plannedGuests) }),
      });
    } catch (error) {
      console.error('Error saving planned guests:', error);
    } finally {
      setSavingPlannedGuests(false);
    }
  };

  const handleAddProvider = async () => {
    if (!selectedCategoryId) return;
    try {
      const selectedProvider = selectedProviderId
        ? allProviders.find(p => p.id === selectedProviderId)
        : null;

      const body: Record<string, unknown> = { category_id: selectedCategoryId };
      if (selectedProvider) {
        body.provider_id = selectedProvider.id;
        body.name = selectedProvider.name;
        body.contact_name = selectedProvider.contact_name;
        body.email = selectedProvider.email;
        body.phone = selectedProvider.phone;
        body.website = selectedProvider.website;
        body.social_media = selectedProvider.social_media;
      }

      const res = await fetch(`/api/weddings/${weddingId}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchData();
        setShowAddProvider(false);
        setSelectedCategoryId('');
        setSelectedProviderId('');
      } else {
        const error = await res.json();
        alert(error.error || t('errorAddingProvider'));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateProvider = async (id: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      if (res.ok) {
        fetchData();
        setEditingProviderId(null);
        setEditForm({});
      } else {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage: string;
        if (Array.isArray(errorData.error)) {
          errorMessage = errorData.error
            .map((err: { path: string[]; message: string }) => `${err.path.join('.')}: ${err.message}`)
            .join('\n');
        } else {
          errorMessage = errorData.error || `Failed to update provider (${res.status})`;
        }
        console.error('Update failed:', errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error updating provider:', error);
      alert(t('errorUpdatingProvider') || 'Failed to update provider. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, providerId: string) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('weddingProviderId', providerId);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setEditForm(prev => ({ ...prev, contract_url: data.url }));
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePaymentDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, providerId: string) => {
    if (!e.target.files?.[0]) return;
    setUploadingPaymentDoc(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('weddingProviderId', providerId);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setPaymentDocumentUrl(data.url);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    } finally {
      setUploadingPaymentDoc(false);
    }
  };

  const handleAddPayment = async (providerId: string) => {
    if (!paymentAmount) return;
    try {
      const res = await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_provider_id: providerId,
          amount: Number(paymentAmount),
          method: paymentMethod,
          notes: paymentNotes,
          document_url: paymentDocumentUrl || undefined,
        }),
      });
      if (res.ok) {
        fetchData();
        setShowPaymentForm(null);
        setPaymentAmount('');
        setPaymentNotes('');
        setPaymentDocumentUrl('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm(t('confirmDeletePayment'))) return;
    try {
      const res = await fetch(`/api/weddings/${weddingId}/payments/${paymentId}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteProvider = async (providerId: string) => {
    if (!confirm(t('confirmDeleteProviderFromWedding'))) return;
    try {
      const res = await fetch(`/api/weddings/${weddingId}/providers/${providerId}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const getProjectedTotal = (wp: WeddingProvider): number => {
    const budgeted = wp.budgeted_price ? Number(wp.budgeted_price) : 0;
    if (!budgeted) return 0;
    if (wp.category.price_type === 'PER_PERSON' && plannedGuests) {
      return budgeted * Number(plannedGuests);
    }
    return budgeted;
  };

  // Compute totals
  const totalBudgeted = providers.reduce((sum, wp) => sum + getProjectedTotal(wp), 0);
  const totalReal = providers.reduce((sum, wp) => sum + (wp.total_price ? Number(wp.total_price) : 0), 0);
  const totalPaid = providers.reduce((sum, wp) => sum + wp.payments.reduce((s, p) => s + Number(p.amount), 0), 0);
  const totalPending = totalReal - totalPaid;

  if (isLoading) return <div>{t('loading')}</div>;

  return (
    <div className="space-y-8">
      {/* Planned guests input */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-blue-800 whitespace-nowrap">
            {t('plannedGuests')}
          </label>
          <Input
            type="number"
            min={1}
            value={plannedGuests}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPlannedGuests(e.target.value ? Number(e.target.value) : '')
            }
            onBlur={handleSavePlannedGuests}
            className="w-32 bg-white"
            placeholder="0"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSavePlannedGuests}
            disabled={savingPlannedGuests || plannedGuests === ''}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {savingPlannedGuests ? t('saving') : t('save')}
          </Button>
          <p className="text-xs text-blue-600">{t('plannedGuestsHint')}</p>
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">{t('weddingProvidersTitle')}</h2>
        <Button onClick={() => { setShowAddProvider(true); fetchCategories(); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addCategory')}
        </Button>
      </div>

      {showAddProvider && (
        <Card className="p-4 bg-gray-50 mb-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedProviderId('');
                }}
              >
                <option value="">{t('selectCategory') || 'Select a category'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {isPlanner && selectedCategoryId && (
              <div className="flex gap-2">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                >
                  <option value="">{t('selectProvider') || 'Select a provider (optional)'}</option>
                  {allProviders
                    .filter(p => p.category_id === selectedCategoryId)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAddProvider} disabled={!selectedCategoryId}>{t('add')}</Button>
              <Button variant="ghost" onClick={() => { setShowAddProvider(false); setSelectedCategoryId(''); setSelectedProviderId(''); }}>{t('cancel')}</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('name')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('contactPerson')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('email')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('phone')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('website')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('socialMedia')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('budgetedPrice')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('projectedTotal')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('totalPrice')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('paid')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pending')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('contract')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('notes')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {providers.map((wp) => {
              const paid = wp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
              const total = wp.total_price ? Number(wp.total_price) : 0;
              const pending = total - paid;
              const projected = getProjectedTotal(wp);
              const isEditing = editingProviderId === wp.id;

              return (
                <tr key={wp.id}>
                  {/* Category */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>{wp.category.name}</div>
                    <div className={`text-xs mt-0.5 ${wp.category.price_type === 'PER_PERSON' ? 'text-blue-500' : 'text-gray-400'}`}>
                      {wp.category.price_type === 'PER_PERSON' ? t('priceTypePerPerson') : t('priceTypeGlobal')}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input value={editForm.name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, name: e.target.value})} className="w-32" placeholder="Name" />
                    ) : (
                      <span>{wp.name || '-'}</span>
                    )}
                  </td>

                  {/* Contact Person */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input value={editForm.contact_name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, contact_name: e.target.value})} className="w-32" placeholder="Contact" />
                    ) : (
                      <span>{wp.contact_name || '-'}</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input type="email" value={editForm.email || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, email: e.target.value})} className="w-40" placeholder="email@example.com" />
                    ) : (
                      <span>{wp.email || '-'}</span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input value={editForm.phone || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, phone: e.target.value})} className="w-32" placeholder="Phone" />
                    ) : (
                      <span>{wp.phone || '-'}</span>
                    )}
                  </td>

                  {/* Website */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input value={editForm.website || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, website: e.target.value})} className="w-40" placeholder="https://" />
                    ) : (
                      wp.website ? <a href={wp.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a> : '-'
                    )}
                  </td>

                  {/* Social Media */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input value={editForm.social_media || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, social_media: e.target.value})} className="w-32" placeholder="@handle" />
                    ) : (
                      <span>{wp.social_media || '-'}</span>
                    )}
                  </td>

                  {/* Budgeted Price */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <div>
                        <Input
                          type="number"
                          value={editForm.budgeted_price ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, budgeted_price: e.target.value ? Number(e.target.value) : null})}
                          className="w-24"
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {wp.category.price_type === 'PER_PERSON' ? t('perPersonShort') : t('priceTypeGlobal')}
                        </div>
                      </div>
                    ) : (
                      <span>
                        {wp.budgeted_price ? `${Number(wp.budgeted_price).toLocaleString()} €` : '-'}
                        {wp.budgeted_price && wp.category.price_type === 'PER_PERSON' && (
                          <span className="text-xs text-gray-400 ml-1">/{t('perPersonShort')}</span>
                        )}
                      </span>
                    )}
                  </td>

                  {/* Projected Total (read-only) */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                    {projected ? `${projected.toLocaleString()} €` : '-'}
                  </td>

                  {/* Total Price */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.total_price ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, total_price: Number(e.target.value)})}
                        className="w-24"
                      />
                    ) : (
                      <span>{total.toLocaleString()} €</span>
                    )}
                  </td>

                  {/* Paid (read-only) */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{paid.toLocaleString()} €</td>

                  {/* Pending (read-only) */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{pending.toLocaleString()} €</td>

                  {/* Contract */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <Input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, wp.id)} disabled={uploading} className="w-36 text-xs" />
                        {uploading && <span className="text-xs text-blue-500">Uploading...</span>}
                        {editForm.contract_url && <span className="text-xs text-green-500">File attached</span>}
                      </div>
                    ) : (
                      wp.contract_url ? (
                        <a href={wp.contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                          <FileText className="w-4 h-4 mr-1" /> View
                        </a>
                      ) : '-'
                    )}
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input value={editForm.notes || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, notes: e.target.value})} className="w-40" placeholder="Notes" />
                    ) : (
                      <span className="max-w-xs truncate block" title={wp.notes || ''}>{wp.notes || '-'}</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleUpdateProvider(wp.id)} className="text-green-600 hover:text-green-900"><Check className="w-4 h-4" /></button>
                        <button type="button" onClick={() => { setEditingProviderId(null); setEditForm({}); }} className="text-gray-600 hover:text-gray-900"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setEditingProviderId(wp.id); setEditForm(wp); }} className="text-blue-600 hover:text-blue-900" title={t('edit')}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setShowPaymentForm(showPaymentForm === wp.id ? null : wp.id)} className="text-green-600 hover:text-green-900" title={t('addPayment')}>
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => deleteProvider(wp.id)} className="text-red-600 hover:text-red-900" title={t('remove')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals row */}
          {providers.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-sm font-bold text-gray-900 uppercase">{t('totals')}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-500">-</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-700">{totalBudgeted ? `${totalBudgeted.toLocaleString()} €` : '-'}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">{totalReal.toLocaleString()} €</td>
                <td className="px-4 py-3 text-sm font-bold text-green-700">{totalPaid.toLocaleString()} €</td>
                <td className="px-4 py-3 text-sm font-bold text-red-700">{totalPending.toLocaleString()} €</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Totals summary cards */}
      {providers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 text-center border-indigo-200 bg-indigo-50">
            <p className="text-xs text-indigo-600 font-medium uppercase mb-1">{t('totalProjected')}</p>
            <p className="text-xl font-bold text-indigo-800">{totalBudgeted.toLocaleString()} €</p>
          </Card>
          <Card className="p-4 text-center border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600 font-medium uppercase mb-1">{t('totalReal')}</p>
            <p className="text-xl font-bold text-gray-800">{totalReal.toLocaleString()} €</p>
          </Card>
          <Card className="p-4 text-center border-green-200 bg-green-50">
            <p className="text-xs text-green-600 font-medium uppercase mb-1">{t('totalPaid')}</p>
            <p className="text-xl font-bold text-green-800">{totalPaid.toLocaleString()} €</p>
          </Card>
          <Card className="p-4 text-center border-red-200 bg-red-50">
            <p className="text-xs text-red-600 font-medium uppercase mb-1">{t('totalPending')}</p>
            <p className="text-xl font-bold text-red-800">{totalPending.toLocaleString()} €</p>
          </Card>
        </div>
      )}

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">{t('recordPayment')}</h4>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="w-32">
              <label className="text-xs font-medium text-gray-700">{t('amount')}</label>
              <Input type="number" value={paymentAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="w-40">
              <label className="text-xs font-medium text-gray-700">{t('method')}</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="PAYPAL">Paypal</option>
                <option value="BIZUM">Bizum</option>
                <option value="REVOLUT">Revolut</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-700">{t('notes')}</label>
              <Input value={paymentNotes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentNotes(e.target.value)} placeholder={t('paymentNotesPlaceholder')} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-700">Document</label>
              <div className="flex gap-2 items-center">
                <Input type="file" onChange={(e) => handlePaymentDocumentUpload(e, showPaymentForm)} disabled={uploadingPaymentDoc} className="text-sm" />
                {paymentDocumentUrl && (
                  <a href={paymentDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm whitespace-nowrap">View</a>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleAddPayment(showPaymentForm)} className="bg-green-600 hover:bg-green-700" disabled={uploadingPaymentDoc}>{t('savePayment')}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowPaymentForm(null); setPaymentDocumentUrl(''); }}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Payments History */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('paymentsHistory')}</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('provider')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('amount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('method')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('notes')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providers.flatMap(wp => wp.payments.map(p => ({ ...p, providerName: wp.provider?.name || wp.category.name })))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(payment => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(payment.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.providerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{Number(payment.amount).toLocaleString()} €</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.method}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payment.notes}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {payment.document_url ? (
                        <a href={payment.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                          <FileText className="w-4 h-4 mr-1" /> View
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button type="button" onClick={() => deletePayment(payment.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              {providers.flatMap(wp => wp.payments).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 text-sm">{t('noPayments')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
