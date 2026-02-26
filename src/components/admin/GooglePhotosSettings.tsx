'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface GalleryPhoto {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  source: string;
  sender_name?: string | null;
  caption?: string | null;
  approved: boolean;
  created_at: string;
}

interface GooglePhotosStatus {
  connected: boolean;
  share_url: string | null;
}

/**
 * GooglePhotosSettings – "Galería de fotos" tab in admin/configure.
 *
 * Features:
 * - Paste a Google Photos shared album link (no OAuth required)
 * - Show the album link + copy button
 * - View, approve/hide, and delete gallery photos
 * - Upload photos manually
 */
export function GooglePhotosSettings() {
  const t = useTranslations('admin.gallery');
  const [status, setStatus] = useState<GooglePhotosStatus | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkInput, setLinkInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Load status + photos ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, photosRes] = await Promise.all([
        fetch('/api/admin/gallery/google-photos'),
        fetch('/api/admin/gallery?limit=50'),
      ]);
      const [statusData, photosData] = await Promise.all([
        statusRes.json(),
        photosRes.json(),
      ]);
      if (statusData.success) setStatus(statusData.data);
      if (photosData.success) setPhotos(photosData.data ?? []);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Save album link ────────────────────────────────────────────────────────

  const handleSave = async () => {
    const url = linkInput.trim();
    if (!url) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/gallery/google-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_url: url }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
        setLinkInput('');
      } else {
        setSaveError(data.error?.message ?? t('saveError'));
      }
    } catch {
      setSaveError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  // ── Remove album link ─────────────────────────────────────────────────────

  const handleRemove = async () => {
    if (!confirm(t('removeConfirm'))) return;
    setRemoving(true);
    try {
      await fetch('/api/admin/gallery/google-photos', { method: 'DELETE' });
      setStatus({ connected: false, share_url: null });
    } finally {
      setRemoving(false);
    }
  };

  // ── Copy share URL ────────────────────────────────────────────────────────

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Toggle photo approval ─────────────────────────────────────────────────

  const handleToggleApproval = async (photo: GalleryPhoto) => {
    const res = await fetch(`/api/admin/gallery/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: !photo.approved }),
    });
    const data = await res.json();
    if (data.success) {
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, approved: !p.approved } : p)));
    }
  };

  // ── Delete photo ─────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // ── Manual upload ─────────────────────────────────────────────────────────

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/gallery', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setPhotos((prev) => [data.data, ...prev]);
      } else {
        setUploadError(data.error?.message ?? 'Error uploading');
      }
    } catch {
      setUploadError('Connection error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-48 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Google Photos album link card ───────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span>📷</span> {t('googlePhotosTitle')}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('googlePhotosDesc')}
            </p>
          </div>
          {status?.connected && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {t('connected')}
            </span>
          )}
        </div>

        {!status?.connected ? (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700 space-y-1">
              <p className="font-medium">{t('howItWorksTitle')}</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                <li>{t('step1')}</li>
                <li>{t('step2')}</li>
                <li>{t('step3')}</li>
                <li>{t('step4')}</li>
              </ol>
            </div>

            {/* Paste link input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('albumLinkLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                  placeholder="https://photos.google.com/share/..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !linkInput.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? t('saving') : t('saveButton')}
                </button>
              </div>
              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current album link */}
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={status.share_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('viewAlbum')}
              </a>
              <button
                onClick={() => handleCopy(status.share_url!)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? t('copied') : t('copyLink')}
              </button>
            </div>

            {/* Change / remove link */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">{t('changeLinkHint')}</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                  placeholder="https://photos.google.com/share/..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !linkInput.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? t('saving') : t('updateButton')}
                </button>
              </div>
              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}
            </div>

            {/* Remove link */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleRemove}
                disabled={removing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
              >
                {t('removeButton')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Manual upload ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h3 className="text-base font-semibold text-gray-900">{t('uploadTitle')}</h3>
        <p className="text-sm text-gray-500">
          {t('uploadDesc')}
        </p>
        <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition">
          {uploadingPhoto ? t('uploading') : t('selectPhoto')}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploadingPhoto}
            onChange={handleManualUpload}
          />
        </label>
        {uploadError && (
          <p className="text-sm text-red-600">{uploadError}</p>
        )}
      </div>

      {/* ── Photo grid ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {t('galleryCount', { count: photos.length })}
          </h3>
        </div>

        {photos.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            {t('noPhotos')}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                <Image
                  src={photo.thumbnail_url ?? photo.url}
                  alt={photo.caption ?? t('weddingPhoto')}
                  fill
                  className={`object-cover transition ${!photo.approved ? 'opacity-40' : ''}`}
                  unoptimized
                />

                {/* Source badge */}
                <div className="absolute top-1 left-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    photo.source === 'WHATSAPP'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {photo.source === 'WHATSAPP' ? 'WA' : '↑'}
                  </span>
                </div>

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                  {photo.sender_name && (
                    <p className="text-white text-xs text-center truncate w-full">{photo.sender_name}</p>
                  )}
                  <button
                    onClick={() => handleToggleApproval(photo)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      photo.approved
                        ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                        : 'bg-green-400 text-green-900 hover:bg-green-500'
                    } transition`}
                  >
                    {photo.approved ? t('hide') : t('show')}
                  </button>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="text-xs px-2 py-1 rounded-full font-medium bg-red-500 text-white hover:bg-red-600 transition"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> WhatsApp
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> {t('manualUpload')}
          </span>
        </p>
      </div>
    </div>
  );
}
