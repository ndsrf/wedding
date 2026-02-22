'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

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
  album_url: string | null;
  share_url: string | null;
}

/**
 * GooglePhotosSettings – "Galería de fotos" tab in admin/configure.
 *
 * Features:
 * - Connect/disconnect Google Photos (OAuth flow)
 * - Show shareable album link + QR code
 * - Sync photos from Google Photos album
 * - View, approve/hide, and delete gallery photos
 * - Upload photos manually
 */
export function GooglePhotosSettings() {
  const [status, setStatus] = useState<GooglePhotosStatus | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
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

  // ── Google Photos connect ──────────────────────────────────────────────────

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/admin/gallery/google-photos', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.auth_url) {
        window.location.href = data.data.auth_url;
      }
    } catch { /* ignore */ }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar Google Photos? Las fotos sincronizadas permanecerán en la galería.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/admin/gallery/google-photos', { method: 'DELETE' });
      setStatus((s) => s ? { ...s, connected: false, album_id: null, album_url: null, share_url: null } : s);
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Sync from Google Photos ───────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/gallery/google-photos/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`${data.data.synced} foto(s) nuevas importadas (total en álbum: ${data.data.total})`);
        await loadData();
      } else {
        setSyncResult(`Error: ${data.error?.message}`);
      }
    } catch {
      setSyncResult('Error de conexión');
    } finally {
      setSyncing(false);
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
    if (!confirm('¿Eliminar esta foto de la galería?')) return;
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

      {/* ── Google Photos connection card ──────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span>📷</span> Google Photos
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Conecta un álbum compartido para que los invitados puedan añadir fotos.
            </p>
          </div>
          {status?.connected && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              ✓ Conectado
            </span>
          )}
        </div>

        {!status?.connected ? (
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700 space-y-1">
              <p className="font-medium">¿Cómo funciona?</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                <li>Conectamos tu cuenta de Google y creamos un álbum compartido.</li>
                <li>Cualquier persona con el enlace puede añadir fotos al álbum.</li>
                <li>Importa las fotos a la galería de la boda con un clic.</li>
                <li>El bloque galería en la invitación muestra todas las fotos aprobadas.</li>
              </ul>
            </div>
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Conectar con Google Photos
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Album URL */}
            {status.album_url && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Álbum en Google Photos</p>
                <a
                  href={status.album_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {status.album_url}
                </a>
              </div>
            )}

            {/* Share URL */}
            {status.share_url && (
              <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-purple-700 mb-1">
                    Enlace para que los invitados añadan fotos
                  </p>
                  <p className="text-xs text-purple-600 break-all font-mono">
                    {status.share_url}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(status.share_url!)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition"
                >
                  {copied ? '✓ Copiado' : 'Copiar enlace'}
                </button>
              </div>
            )}

            {/* Sync button */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                {syncing ? 'Sincronizando...' : '↻ Sincronizar fotos de Google Photos'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Desconectar
              </button>
            </div>

            {syncResult && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                {syncResult}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Manual upload ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h3 className="text-base font-semibold text-gray-900">Subir foto manualmente</h3>
        <p className="text-sm text-gray-500">
          Sube fotos directamente desde tu dispositivo a la galería.
        </p>
        <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition">
          {uploadingPhoto ? 'Subiendo...' : '+ Seleccionar foto'}
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
            Galería ({photos.length} foto{photos.length !== 1 ? 's' : ''})
          </h3>
        </div>

        {photos.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No hay fotos todavía. Conecta Google Photos o sube una foto para empezar.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                <Image
                  src={photo.thumbnail_url ?? photo.url}
                  alt={photo.caption ?? 'Foto de boda'}
                  fill
                  className={`object-cover transition ${!photo.approved ? 'opacity-40' : ''}`}
                  unoptimized
                />

                {/* Source badge */}
                <div className="absolute top-1 left-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    photo.source === 'WHATSAPP'
                      ? 'bg-green-500 text-white'
                      : photo.source === 'GOOGLE_PHOTOS'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {photo.source === 'WHATSAPP' ? 'WA' : photo.source === 'GOOGLE_PHOTOS' ? 'GP' : '↑'}
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
                    {photo.approved ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="text-xs px-2 py-1 rounded-full font-medium bg-red-500 text-white hover:bg-red-600 transition"
                  >
                    Eliminar
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
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Google Photos
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Subida manual
          </span>
        </p>
      </div>
    </div>
  );
}
