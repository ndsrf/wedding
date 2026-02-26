'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

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
  album_id: string | null;
  share_url: string | null;
}

interface MigrationStatus {
  pending: number;
  total: number;
  migrated: number;
}

/**
 * GooglePhotosSettings – "Galería de fotos" tab in admin/configure.
 */
export function GooglePhotosSettings() {
  const t = useTranslations('admin.gallery');
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<GooglePhotosStatus | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [migration, setMigration] = useState<MigrationStatus | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationErrors, setMigrationErrors] = useState<string[]>([]);
  const [shareInput, setShareInput] = useState('');
  const [savingShare, setSavingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Handle OAuth redirect params ──────────────────────────────────────────

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const msgs: Record<string, string> = {
        google_photos_denied: t('oauthDenied'),
        token_exchange_failed: t('oauthTokenFailed'),
        no_refresh_token: t('oauthNoToken'),
        connection_failed: t('connectError'),
      };
      setConnectError(msgs[error] ?? t('connectError'));
    }
  }, [searchParams, t]);

  // ── Load status + photos ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, photosRes] = await Promise.all([
        fetch('/api/admin/gallery/google-photos'),
        fetch('/api/admin/gallery?limit=50'),
      ]);
      const [statusData, photosData] = await Promise.all([statusRes.json(), photosRes.json()]);
      if (statusData.success) setStatus(statusData.data);
      if (photosData.success) setPhotos(photosData.data ?? []);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Migration status ──────────────────────────────────────────────────────

  const loadMigration = useCallback(async () => {
    const res = await fetch('/api/admin/gallery/google-photos/migrate');
    const data = await res.json();
    if (data.success) setMigration(data.data);
  }, []);

  useEffect(() => {
    if (status?.connected) loadMigration();
  }, [status?.connected, loadMigration]);

  // ── OAuth connect ─────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch('/api/admin/gallery/google-photos', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.auth_url) {
        window.location.href = data.data.auth_url;
      } else {
        setConnectError(data.error?.message ?? t('connectError'));
        setConnecting(false);
      }
    } catch {
      setConnectError(t('connectError'));
      setConnecting(false);
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    if (!confirm(t('disconnectConfirm'))) return;
    setDisconnecting(true);
    try {
      await fetch('/api/admin/gallery/google-photos', { method: 'DELETE' });
      setStatus({ connected: false, album_id: null, share_url: null });
      setMigration(null);
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Migration ─────────────────────────────────────────────────────────────

  const runMigrationBatch = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/admin/gallery/google-photos/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_size: 10 }),
    });
    const data = await res.json();
    if (!data.success) return false;

    const { remaining, errors } = data.data as { migrated: number; remaining: number; errors: string[] };
    if (errors?.length) setMigrationErrors((prev) => [...prev, ...errors]);
    setMigration((prev) => prev ? { ...prev, pending: remaining, migrated: prev.total - remaining } : null);
    return remaining > 0;
  }, []);

  const startMigration = useCallback(async () => {
    setMigrationErrors([]);
    setMigrating(true);
    try {
      let hasMore = true;
      while (hasMore) {
        hasMore = await runMigrationBatch();
        if (hasMore) await new Promise((r) => setTimeout(r, 300));
      }
      await loadData();
    } finally {
      setMigrating(false);
    }
  }, [runMigrationBatch, loadData]);

  // ── Share URL ─────────────────────────────────────────────────────────────

  const handleSaveShare = async () => {
    const url = shareInput.trim();
    if (!url) return;
    setSavingShare(true);
    setShareError(null);
    try {
      const res = await fetch('/api/admin/gallery/google-photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_url: url }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus((s) => s ? { ...s, share_url: data.data.share_url } : s);
        setShareInput('');
      } else {
        setShareError(data.error?.message ?? t('saveError'));
      }
    } catch {
      setShareError(t('saveError'));
    } finally {
      setSavingShare(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Photo management ──────────────────────────────────────────────────────

  const handleToggleApproval = async (photo: GalleryPhoto) => {
    const res = await fetch(`/api/admin/gallery/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: !photo.approved }),
    });
    const data = await res.json();
    if (data.success) setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, approved: !p.approved } : p));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

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
      if (data.success) setPhotos((prev) => [data.data, ...prev]);
      else setUploadError(data.error?.message ?? 'Error uploading');
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

  const migrationDone = migration ? migration.pending === 0 : false;
  const migrationPercent = migration && migration.total > 0
    ? Math.round((migration.migrated / migration.total) * 100) : 0;

  return (
    <div className="space-y-8">

      {/* ── Connection card ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span>📷</span> {t('googlePhotosTitle')}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('googlePhotosDesc')}</p>
          </div>
          {status?.connected && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {t('connected')}
            </span>
          )}
        </div>

        {!status?.connected ? (
          /* ── Not connected ─────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700 space-y-1">
              <p className="font-medium">{t('howItWorksTitle')}</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                <li>{t('step1')}</li>
                <li>{t('step2')}</li>
                <li>{t('step3')}</li>
              </ol>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition text-sm"
            >
              {connecting
                ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              }
              {connecting ? t('connecting') : t('connectButton')}
            </button>
            {connectError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{connectError}</p>}
          </div>
        ) : (
          /* ── Connected ─────────────────────────────────────────────────── */
          <div className="space-y-5">

            {/* Migration */}
            {migration && migration.total > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-amber-900">{t('migrationTitle')}</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {migrationDone
                        ? t('migrationDone', { total: migration.total })
                        : t('migrationPending', { pending: migration.pending, total: migration.total })}
                    </p>
                  </div>
                  {!migrationDone
                    ? <button onClick={startMigration} disabled={migrating} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 transition">
                        {migrating ? t('migrating') : t('migrateButton')}
                      </button>
                    : <span className="text-green-600 text-sm">✓</span>
                  }
                </div>
                <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${migrationPercent}%` }} />
                </div>
                {migrationErrors.length > 0 && (
                  <details className="text-xs text-red-700">
                    <summary className="cursor-pointer">{t('migrationErrors', { count: migrationErrors.length })}</summary>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside">
                      {migrationErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {/* Share URL */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{t('shareUrlTitle')}</p>
              <p className="text-xs text-gray-500">{t('shareUrlDesc')}</p>
              {status.share_url && (
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={status.share_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    {t('viewAlbum')}
                  </a>
                  <button onClick={() => handleCopy(status.share_url!)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition">
                    {copied ? t('copied') : t('copyLink')}
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={shareInput}
                  onChange={(e) => setShareInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShare(); }}
                  placeholder="https://photos.google.com/share/..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleSaveShare} disabled={savingShare || !shareInput.trim()} className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition">
                  {savingShare ? t('saving') : (status.share_url ? t('updateButton') : t('saveButton'))}
                </button>
              </div>
              {shareError && <p className="text-sm text-red-600">{shareError}</p>}
            </div>

            {/* Disconnect */}
            <div className="pt-2 border-t border-gray-100">
              <button onClick={handleDisconnect} disabled={disconnecting} className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition">
                {t('disconnectButton')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Manual upload ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h3 className="text-base font-semibold text-gray-900">{t('uploadTitle')}</h3>
        <p className="text-sm text-gray-500">{t('uploadDesc')}</p>
        <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition">
          {uploadingPhoto ? t('uploading') : t('selectPhoto')}
          <input type="file" accept="image/*" className="sr-only" disabled={uploadingPhoto} onChange={handleManualUpload} />
        </label>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </div>

      {/* ── Photo grid ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{t('galleryCount', { count: photos.length })}</h3>
        {photos.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">{t('noPhotos')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                <Image src={photo.thumbnail_url ?? photo.url} alt={photo.caption ?? t('weddingPhoto')} fill className={`object-cover transition ${!photo.approved ? 'opacity-40' : ''}`} unoptimized />
                <div className="absolute top-1 left-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${photo.source === 'WHATSAPP' ? 'bg-green-500 text-white' : 'bg-gray-600 text-white'}`}>
                    {photo.source === 'WHATSAPP' ? 'WA' : '↑'}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                  {photo.sender_name && <p className="text-white text-xs text-center truncate w-full">{photo.sender_name}</p>}
                  <button onClick={() => handleToggleApproval(photo)} className={`text-xs px-2 py-1 rounded-full font-medium ${photo.approved ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500' : 'bg-green-400 text-green-900 hover:bg-green-500'} transition`}>
                    {photo.approved ? t('hide') : t('show')}
                  </button>
                  <button onClick={() => handleDelete(photo.id)} className="text-xs px-2 py-1 rounded-full font-medium bg-red-500 text-white hover:bg-red-600 transition">
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400">
          <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> WhatsApp</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> {t('manualUpload')}</span>
        </p>
      </div>
    </div>
  );
}
