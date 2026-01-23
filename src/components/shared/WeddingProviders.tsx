'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, FileText, DollarSign, Edit2, Check, X } from 'lucide-react';

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
  contract_url: string | null;
  notes: string | null;
  category: {
    id: string;
    name: string;
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
  const [allProviders, setAllProviders] = useState<Provider[]>([]); // All providers from planner's library
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // for dropdown
  const [selectedProviderId, setSelectedProviderId] = useState(''); // selected provider from dropdown

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null); // wedding_provider_id
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Provider Edit State
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WeddingProvider>>({});
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/providers`);
      const data = await res.json();
      if (data.data) {
        setProviders(data.data);
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
    if (!isPlanner) return;

    try {
      const [categoriesRes, providersRes] = await Promise.all([
        fetch('/api/planner/providers/categories'),
        fetch('/api/planner/providers'),
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.data || []);
      }

      if (providersRes.ok) {
        const data = await providersRes.json();
        setAllProviders(data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddProvider = async () => {
    if (!selectedCategoryId) return;

    try {
      // Find the selected provider details if one is selected
      const selectedProvider = selectedProviderId
        ? allProviders.find(p => p.id === selectedProviderId)
        : null;

      const body: Record<string, unknown> = {
        category_id: selectedCategoryId,
      };

      // If a provider is selected, copy its details
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

        // Handle Zod validation errors (array format)
        if (Array.isArray(errorData.error)) {
          errorMessage = errorData.error
            .map((err: { path: string[]; message: string }) =>
              `${err.path.join('.')}: ${err.message}`
            )
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
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
        }),
      });
      if (res.ok) {
        fetchData();
        setShowPaymentForm(null);
        setPaymentAmount('');
        setPaymentNotes('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm(t('confirmDeletePayment'))) return;
    try {
      const res = await fetch(`/api/weddings/${weddingId}/payments/${paymentId}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteProvider = async (providerId: string) => {
    if (!confirm(t('confirmDeleteProviderFromWedding'))) return;
    try {
        const res = await fetch(`/api/weddings/${weddingId}/providers/${providerId}`, {
            method: 'DELETE',
        });
        if (res.ok) fetchData();
    } catch (error) {
        console.error(error);
    }
  }

  if (isLoading) return <div>{t('loading')}</div>;

  return (
    <div className="space-y-8">
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedProviderId(''); // Reset provider selection when category changes
                }}
              >
                <option value="">{t('selectCategory') || 'Select a category'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Provider dropdown - only show for planners */}
            {isPlanner && selectedCategoryId && (
              <div className="flex gap-2">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category') || 'Category'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('name') || 'Name'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('contactPerson') || 'Contact Person'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('email') || 'Email'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('phone') || 'Phone'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('website') || 'Website'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('socialMedia') || 'Social Media'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('totalPrice') || 'Total Price'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('paid') || 'Paid'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pending') || 'Pending'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('contract') || 'Contract'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('notes') || 'Notes'}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {providers.map((wp) => {
              const paid = wp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
              const total = wp.total_price ? Number(wp.total_price) : 0;
              const pending = total - paid;
              const isEditing = editingProviderId === wp.id;

              return (
                <tr key={wp.id}>
                  {/* Category */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{wp.category.name}</td>

                  {/* Name */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input
                        value={editForm.name || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, name: e.target.value})}
                        className="w-32"
                        placeholder="Name"
                      />
                    ) : (
                      <span>{wp.name || '-'}</span>
                    )}
                  </td>

                  {/* Contact Person */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input
                        value={editForm.contact_name || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, contact_name: e.target.value})}
                        className="w-32"
                        placeholder="Contact"
                      />
                    ) : (
                      <span>{wp.contact_name || '-'}</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, email: e.target.value})}
                        className="w-40"
                        placeholder="email@example.com"
                      />
                    ) : (
                      <span>{wp.email || '-'}</span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input
                        value={editForm.phone || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, phone: e.target.value})}
                        className="w-32"
                        placeholder="Phone"
                      />
                    ) : (
                      <span>{wp.phone || '-'}</span>
                    )}
                  </td>

                  {/* Website */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input
                        value={editForm.website || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, website: e.target.value})}
                        className="w-40"
                        placeholder="https://"
                      />
                    ) : (
                      wp.website ? (
                        <a href={wp.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a>
                      ) : '-'
                    )}
                  </td>

                  {/* Social Media */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <Input
                        value={editForm.social_media || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, social_media: e.target.value})}
                        className="w-32"
                        placeholder="@handle"
                      />
                    ) : (
                      <span>{wp.social_media || '-'}</span>
                    )}
                  </td>

                  {/* Total Price */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.total_price || ''}
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
                        <Input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="w-36 text-xs" />
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
                      <Input
                        value={editForm.notes || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, notes: e.target.value})}
                        className="w-40"
                        placeholder="Notes"
                      />
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
        </table>
      </div>

      {/* Payment Form (Shared for all) */}
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
                <div className="flex gap-2">
                     <Button size="sm" onClick={() => handleAddPayment(showPaymentForm)} className="bg-green-600 hover:bg-green-700">{t('savePayment')}</Button>
                     <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm(null)}>{t('cancel')}</Button>
                </div>
            </div>
         </div>
      )}
      
      {/* SEPARATE PAYMENTS GRID as per requirement */}
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
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {providers.flatMap(wp => wp.payments.map(p => ({ ...p, providerName: wp.provider?.name || wp.category.name })))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(payment => (
                            <tr key={payment.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(payment.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {payment.providerName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                    {Number(payment.amount).toLocaleString()} €
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {payment.method}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {payment.notes}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button type="button" onClick={() => deletePayment(payment.id)} className="text-red-600 hover:text-red-900">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    }
                    {providers.flatMap(wp => wp.payments).length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">{t('noPayments')}</td>
                        </tr>
                    )}
                </tbody>
             </table>
        </div>
      </div>
    </div>
  );
}
