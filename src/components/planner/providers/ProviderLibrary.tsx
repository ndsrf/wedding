'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Edit2, Trash2, Globe, Mail, Phone } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  category_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  social_media?: string;
  approx_price?: number;
}

export function ProviderLibrary() {
  const t = useTranslations('planner.providers');
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [isEditingProvider, setIsEditingProvider] = useState<string | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState<string | null>(null); // category_id
  const [providerForm, setProviderForm] = useState<Partial<Provider>>({});

  const fetchData = useCallback(async () => {
    try {
      const [catRes, provRes] = await Promise.all([
        fetch('/api/planner/providers/categories'),
        fetch('/api/planner/providers'),
      ]);
      const catData = await catRes.json();
      const provData = await provRes.json();
      
      if (catData.data) setCategories(catData.data);
      if (provData.data) setProviders(provData.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      if (isEditingCategory) {
        const res = await fetch('/api/planner/providers/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: isEditingCategory, name: newCategoryName }),
        });
        if (res.ok) {
          fetchData();
          setIsEditingCategory(null);
          setNewCategoryName('');
        }
      } else {
        const res = await fetch('/api/planner/providers/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCategoryName }),
        });
        if (res.ok) {
          fetchData();
          setIsAddingCategory(false);
          setNewCategoryName('');
        }
      }
    } catch (error) {
      console.error('Error saving category', error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(t('confirmDeleteCategory'))) return;
    try {
      const res = await fetch(`/api/planner/providers/categories?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting category', error);
    }
  };

  const saveProvider = async () => {
    if (!providerForm.name?.trim() || !providerForm.category_id) return;

    try {
      const payload = {
        ...providerForm,
        approx_price: providerForm.approx_price ? Number(providerForm.approx_price) : undefined,
      };

      if (isEditingProvider) {
        const res = await fetch(`/api/planner/providers/${isEditingProvider}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchData();
          setIsEditingProvider(null);
          setProviderForm({});
        }
      } else {
        const res = await fetch('/api/planner/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchData();
          setIsAddingProvider(null);
          setProviderForm({});
        }
      }
    } catch (error) {
      console.error('Error saving provider', error);
    }
  };

  const deleteProvider = async (id: string) => {
    if (!confirm(t('confirmDeleteProvider'))) return;
    try {
      const res = await fetch(`/api/planner/providers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting provider', error);
    }
  };

  if (isLoading) return <div>{t('loading')}</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">{t('title')}</h2>
        <Button onClick={() => setIsAddingCategory(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {t('addCategory')}
        </Button>
      </div>

      {isAddingCategory && (
        <Card className="p-4 bg-gray-50">
          <div className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
              placeholder={t('categoryNamePlaceholder')}
              className="max-w-md"
            />
            <Button onClick={saveCategory}>{t('save')}</Button>
            <Button variant="ghost" onClick={() => setIsAddingCategory(false)}>{t('cancel')}</Button>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              {isEditingCategory === category.id ? (
                <div className="flex gap-2 items-center flex-1">
                  <Input
                    value={newCategoryName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
                    className="max-w-md"
                  />
                  <Button size="sm" onClick={saveCategory}>{t('save')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsEditingCategory(null); setNewCategoryName(''); }}>{t('cancel')}</Button>
                </div>
              ) : (
                <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2">
                  {category.name}
                  <div className="flex gap-1 ml-4 opacity-50 hover:opacity-100 transition-opacity">
                    <button onClick={() => { setIsEditingCategory(category.id); setNewCategoryName(category.name); }} className="p-1 hover:text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteCategory(category.id)} className="p-1 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </h3>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setIsAddingProvider(category.id); setProviderForm({ category_id: category.id }); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('addProvider')}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isAddingProvider === category.id && (
                <Card className="p-4 border-dashed border-2 bg-gray-50">
                   <ProviderForm
                    form={providerForm}
                    onChange={setProviderForm}
                    onSave={saveProvider}
                    onCancel={() => { setIsAddingProvider(null); setProviderForm({}); }}
                    t={t}
                  />
                </Card>
              )}

              {providers
                .filter((p) => p.category_id === category.id)
                .map((provider) => (
                  <Card key={provider.id} className="p-4 hover:shadow-md transition-shadow">
                    {isEditingProvider === provider.id ? (
                      <ProviderForm
                        form={providerForm}
                        onChange={setProviderForm}
                        onSave={saveProvider}
                        onCancel={() => { setIsEditingProvider(null); setProviderForm({}); }}
                        t={t}
                      />
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setIsEditingProvider(provider.id); setProviderForm(provider); }}
                              className="text-gray-400 hover:text-blue-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteProvider(provider.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {provider.contact_name && <p className="text-sm text-gray-600">{provider.contact_name}</p>}
                        
                        <div className="space-y-1 pt-2">
                          {provider.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="w-4 h-4 mr-2" />
                              <a href={`mailto:${provider.email}`} className="hover:underline">{provider.email}</a>
                            </div>
                          )}
                          {provider.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="w-4 h-4 mr-2" />
                              <a href={`tel:${provider.phone}`} className="hover:underline">{provider.phone}</a>
                            </div>
                          )}
                          {provider.website && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Globe className="w-4 h-4 mr-2" />
                              <a href={provider.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px]">{provider.website}</a>
                            </div>
                          )}
                        </div>

                        {provider.approx_price && (
                          <div className="pt-2 mt-2 border-t text-sm font-medium text-gray-900">
                            ~ {provider.approx_price.toLocaleString()} €
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          </div>
        ))}
        {categories.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            {t('noCategories')}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProviderFormProps {
  form: Partial<Provider>;
  onChange: (form: Partial<Provider>) => void;
  onSave: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}

function ProviderForm({ form, onChange, onSave, onCancel, t }: ProviderFormProps) {
  return (
    <div className="space-y-3">
      <Input
        placeholder={t('providerName')}
        value={form.name || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, name: e.target.value })}
      />
      <Input
        placeholder={t('contactName')}
        value={form.contact_name || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, contact_name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder={t('email')}
          value={form.email || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, email: e.target.value })}
        />
        <Input
          placeholder={t('phone')}
          value={form.phone || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, phone: e.target.value })}
        />
      </div>
      <Input
        placeholder={t('website')}
        value={form.website || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, website: e.target.value })}
      />
      <Input
        placeholder={t('socialMedia')}
        value={form.social_media || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, social_media: e.target.value })}
      />
      <Input
        type="number"
        placeholder={t('approxPrice')}
        value={form.approx_price || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...form, approx_price: e.target.value ? parseFloat(e.target.value) : undefined })}
      />
      <div className="flex gap-2 justify-end pt-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
        <Button size="sm" onClick={onSave}>{t('save')}</Button>
      </div>
    </div>
  );
}