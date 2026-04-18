'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Edit2, Trash2, ExternalLink, Tag, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface LocationWedding {
  id: string;
  couple_names: string;
  wedding_date: string;
  status: string;
}

interface Location {
  id: string;
  name: string;
  url?: string | null;
  notes?: string | null;
  google_maps_url?: string | null;
  address?: string | null;
  tags?: string[];
  _count?: {
    weddings: number;
    itinerary_items: number;
  };
  weddings?: LocationWedding[];
}

type LocationFormData = Omit<Location, 'id' | '_count' | 'weddings'>;

function TagInput({ tags, onChange, placeholder, hint }: { tags: string[]; onChange: (tags: string[]) => void; placeholder: string; hint: string }) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (value: string) => {
    const trimmed = value.trim().replace(/,$/, '').trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) addTag(inputValue);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 min-h-[42px]">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-blue-600">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function WeddingPanel({
  weddings,
  activeLabel,
  pastLabel,
  noActiveLabel,
  noPastLabel,
  locale,
}: {
  weddings: LocationWedding[];
  activeLabel: string;
  pastLabel: string;
  noActiveLabel: string;
  noPastLabel: string;
  locale: string;
}) {
  const [openPanel, setOpenPanel] = useState<'active' | 'past' | null>(null);

  const { activeWeddings, pastWeddings } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      activeWeddings: weddings.filter((w) => new Date(w.wedding_date) >= today),
      pastWeddings: weddings.filter((w) => new Date(w.wedding_date) < today),
    };
  }, [weddings]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toggle = (panel: 'active' | 'past') => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
      <div>
        <button
          onClick={() => toggle('active')}
          className="flex items-center justify-between w-full text-xs text-left text-green-700 font-medium hover:text-green-900 py-0.5"
        >
          <span>{t('activeWeddings', { count: activeWeddings.length })}</span>
          {openPanel === 'active' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {openPanel === 'active' && (
          <ul className="mt-1 space-y-1 pl-2">
            {activeWeddings.length === 0 ? (
              <li className="text-xs text-gray-400 italic">{noActiveLabel}</li>
            ) : (
              activeWeddings.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/planner/weddings/${w.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{w.couple_names}</span>
                    <span className="text-gray-500 whitespace-nowrap">{formatDate(w.wedding_date)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div>
        <button
          onClick={() => toggle('past')}
          className="flex items-center justify-between w-full text-xs text-left text-gray-500 font-medium hover:text-gray-700 py-0.5"
        >
          <span>{t('pastWeddings', { count: pastWeddings.length })}</span>
          {openPanel === 'past' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {openPanel === 'past' && (
          <ul className="mt-1 space-y-1 pl-2">
            {pastWeddings.length === 0 ? (
              <li className="text-xs text-gray-400 italic">{t('noPastWeddings')}</li>
            ) : (
              pastWeddings.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/planner/weddings/${w.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{w.couple_names}</span>
                    <span className="text-gray-500 whitespace-nowrap">{formatDate(w.wedding_date)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const t = useTranslations('planner.locations');
  const commonT = useTranslations('common.buttons');
  const locale = useLocale();
  useDocumentTitle(`Nupci - ${t('pageTitle')}`);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    url: '',
    notes: '',
    google_maps_url: '',
    address: '',
    tags: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/planner/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(data.data);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((l) => l.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [locations]);

  const filteredLocations = useMemo(() => {
    let result = locations;
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      result = result.filter((l) => l.name.toLowerCase().includes(q));
    }
    if (tagFilter.size > 0) {
      result = result.filter((l) => l.tags?.some((tag) => tagFilter.has(tag)));
    }
    return result;
  }, [locations, nameFilter, tagFilter]);

  const toggleTagFilter = (tag: string) => {
    setTagFilter((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) { next.delete(tag); } else { next.add(tag); }
      return next;
    });
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingLocation
        ? `/api/planner/locations/${editingLocation.id}`
        : '/api/planner/locations';
      const method = editingLocation ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save location');
      }

      await fetchLocations();
      handleCancelForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      url: location.url || '',
      notes: location.notes || '',
      google_maps_url: location.google_maps_url || '',
      address: location.address || '',
      tags: location.tags ?? [],
    });
    setShowForm(true);
  };

  const handleDelete = async (location: Location) => {
    if (location._count && (location._count.weddings > 0 || location._count.itinerary_items > 0)) {
      alert(t('deleteError', { weddings: location._count.weddings, items: location._count.itinerary_items }));
      return;
    }

    if (!confirm(t('deleteConfirm', { name: location.name }))) return;

    try {
      const response = await fetch(`/api/planner/locations/${location.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete location');
      }

      await fetchLocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete location');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      url: '',
      notes: '',
      google_maps_url: '',
      address: '',
      tags: [],
    });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Link */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Link
            href="/planner"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToDashboard')}
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                {t('pageTitle')}
              </h1>
              <p className="mt-1 text-sm text-gray-600">{t('pageSubtitle')}</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('addLocation')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        {!loading && locations.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder={t('filterByName')}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {nameFilter && (
                <button
                  onClick={() => setNameFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {t('tags')}:
                </span>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      tagFilter.has(tag)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {tag}
                    {tagFilter.has(tag) && <X className="h-3 w-3" />}
                  </button>
                ))}
                {tagFilter.size > 0 && (
                  <button
                    onClick={() => setTagFilter(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    {t('clearFilters')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <WeddingSpinner size="md" />
            <p className="mt-2 text-sm text-gray-600">{t('loading')}</p>
          </div>
        )}

        {!loading && locations.length === 0 && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noLocations')}</h3>
            <p className="mt-1 text-sm text-gray-600">{t('noLocationsSubtitle')}</p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('addLocation')}
              </button>
            </div>
          </div>
        )}

        {!loading && locations.length > 0 && filteredLocations.length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">{t('noResults')}</p>
          </div>
        )}

        {!loading && filteredLocations.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLocations.map((location) => (
              <div key={location.id} className="bg-white shadow rounded-lg p-6 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{location.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title={t('edit')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(location)}
                      className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30"
                      title={t('delete')}
                      disabled={!!(location._count && (location._count.weddings > 0 || location._count.itinerary_items > 0))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                {location.tags && location.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {location.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {location.address && (
                  <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                )}

                {location.notes && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{location.notes}</p>
                )}

                <div className="flex flex-col gap-2 mt-auto">
                  {location.google_maps_url && (
                    <a
                      href={location.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      {t('viewOnGoogleMaps')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {location.url && (
                    <a
                      href={location.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {t('visitWebsite')}
                    </a>
                  )}
                </div>

                {/* Wedding panels */}
                {location.weddings !== undefined && (
                  <WeddingPanel
                    weddings={location.weddings}
                    activeLabel={t('activeWeddings')}
                    pastLabel={t('pastWeddings')}
                    noActiveLabel={t('noActiveWeddings')}
                    noPastLabel={t('noPastWeddings')}
                    locale={locale}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500/75 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingLocation ? t('editTitle') : t('createTitle')}
            </h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('locationName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('namePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('address')}
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('addressPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('googleMapsUrl')}
                </label>
                <input
                  type="url"
                  value={formData.google_maps_url || ''}
                  onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://maps.google.com/..."
                />
                <p className="mt-1 text-xs text-gray-500">{t('googleMapsHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('websiteUrl')}
                </label>
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('notes')}
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('notesPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {t('tags')}
                </label>
                <TagInput
                  tags={formData.tags ?? []}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  placeholder={t('tagInputPlaceholder')}
                  hint={t('tagInputHint')}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {commonT('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? t('saving') : editingLocation ? t('update') : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
