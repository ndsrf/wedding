'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface GalleryPhoto {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  sender_name?: string | null;
  caption?: string | null;
}

interface GalleryBlockProps {
  weddingId: string;
  /** Number of photos visible at once (default: 1 on mobile, 3 on desktop) */
  columns?: 1 | 2 | 3;
  /** Whether to show photo captions */
  showCaptions?: boolean;
  /** Whether to show the "Add photo" button */
  showUploadButton?: boolean;
  /** Auto-advance interval in ms (0 = manual only) */
  autoPlayMs?: number;
  style?: {
    borderRadius?: string;
    gap?: string;
  };
}

/**
 * GalleryBlock – Photo carousel for invitation pages.
 *
 * Fetches approved photos from the public gallery API and displays them in a
 * touch-friendly carousel. Optionally shows an "Add your photo" button that
 * opens an upload modal so guests can contribute directly from the invitation.
 */
export function GalleryBlock({
  weddingId,
  columns = 1,
  showCaptions = false,
  showUploadButton = true,
  autoPlayMs = 4000,
  style,
}: GalleryBlockProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSenderName, setUploadSenderName] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Fetch photos ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!weddingId) return;
    setLoading(true);
    fetch(`/api/public/gallery/${weddingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPhotos(data.data ?? []);
      })
      .catch(() => {/* silently fail */})
      .finally(() => setLoading(false));
  }, [weddingId]);

  // ── Carousel navigation ───────────────────────────────────────────────────

  const total = photos.length;
  const maxIndex = Math.max(0, total - columns);

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((i) => Math.min(maxIndex, i + 1));
  }, [maxIndex]);

  // Auto-play
  useEffect(() => {
    if (!autoPlayMs || total <= columns) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, autoPlayMs);
    return () => clearInterval(interval);
  }, [autoPlayMs, total, columns, maxIndex]);

  // Touch swipe support
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
    setTouchStartX(null);
  };

  // ── Upload handler ────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      if (uploadSenderName) fd.append('sender_name', uploadSenderName);
      if (uploadCaption) fd.append('caption', uploadCaption);

      const res = await fetch(`/api/public/gallery/${weddingId}/upload`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!data.success) {
        setUploadError(data.error?.message ?? 'Error uploading photo');
        return;
      }

      // Prepend new photo to gallery
      setPhotos((prev) => [data.data, ...prev]);
      setUploadSuccess(true);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
        setUploadFile(null);
        setUploadSenderName('');
        setUploadCaption('');
      }, 2000);
    } catch {
      setUploadError('Connection error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Empty states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-current opacity-50 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && photos.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <p className="text-sm opacity-60 mb-3">No hay fotos todavía</p>
        {showUploadButton && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-black/10 hover:bg-black/20 transition"
          >
            📷 Añadir primera foto
          </button>
        )}
        {showUploadModal && (
          <UploadModal
            uploading={uploading}
            uploadSuccess={uploadSuccess}
            uploadError={uploadError}
            uploadFile={uploadFile}
            senderName={uploadSenderName}
            caption={uploadCaption}
            onFileChange={setUploadFile}
            onSenderNameChange={setUploadSenderName}
            onCaptionChange={setUploadCaption}
            onUpload={handleUpload}
            onClose={() => { setShowUploadModal(false); setUploadError(null); }}
          />
        )}
      </div>
    );
  }

  // ── Carousel rendering ────────────────────────────────────────────────────

  const visiblePhotos = photos.slice(currentIndex, currentIndex + columns);
  const borderRadius = style?.borderRadius ?? '0.75rem';
  const gap = style?.gap ?? '0.5rem';

  return (
    <div className="py-4 px-2 select-none">
      {/* Carousel track */}
      <div
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex"
          style={{ gap }}
        >
          {visiblePhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative flex-1 min-w-0"
              style={{
                paddingTop: columns === 1 ? '66.66%' : columns === 2 ? '100%' : '80%',
                borderRadius,
                overflow: 'hidden',
              }}
            >
              <Image
                src={photo.thumbnail_url ?? photo.url}
                alt={photo.caption ?? `Foto de ${photo.sender_name ?? 'invitado'}`}
                fill
                className="object-cover"
                unoptimized
              />
              {showCaptions && (photo.caption || photo.sender_name) && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs p-2 leading-tight">
                  {photo.caption && <p>{photo.caption}</p>}
                  {photo.sender_name && (
                    <p className="opacity-70">— {photo.sender_name}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Prev/Next arrows */}
        {total > columns && (
          <>
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              aria-label="Anterior"
              className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-20 transition"
            >
              ‹
            </button>
            <button
              onClick={next}
              disabled={currentIndex >= maxIndex}
              aria-label="Siguiente"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-20 transition"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Ir a foto ${i + 1}`}
              className={`w-2 h-2 rounded-full transition ${
                i === currentIndex ? 'bg-current opacity-100' : 'bg-current opacity-30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Add photo button */}
      {showUploadButton && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-black/10 hover:bg-black/20 transition"
          >
            📷 Añadir tu foto
          </button>
        </div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <UploadModal
          uploading={uploading}
          uploadSuccess={uploadSuccess}
          uploadError={uploadError}
          uploadFile={uploadFile}
          senderName={uploadSenderName}
          caption={uploadCaption}
          onFileChange={setUploadFile}
          onSenderNameChange={setUploadSenderName}
          onCaptionChange={setUploadCaption}
          onUpload={handleUpload}
          onClose={() => { setShowUploadModal(false); setUploadError(null); }}
        />
      )}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({
  uploading,
  uploadSuccess,
  uploadError,
  uploadFile,
  senderName,
  caption,
  onFileChange,
  onSenderNameChange,
  onCaptionChange,
  onUpload,
  onClose,
}: {
  uploading: boolean;
  uploadSuccess: boolean;
  uploadError: string | null;
  uploadFile: File | null;
  senderName: string;
  caption: string;
  onFileChange: (f: File | null) => void;
  onSenderNameChange: (s: string) => void;
  onCaptionChange: (c: string) => void;
  onUpload: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        {uploadSuccess ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-gray-800">¡Foto añadida!</p>
            <p className="text-sm text-gray-500">Gracias por compartir este momento.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Añadir tu foto</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* File input */}
            <label className="block cursor-pointer">
              <div className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
                uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'
              }`}>
                {uploadFile ? (
                  <p className="text-sm text-green-700 font-medium truncate">{uploadFile.name}</p>
                ) : (
                  <>
                    <p className="text-2xl mb-1">📷</p>
                    <p className="text-sm text-gray-600">Toca para seleccionar o tomar una foto</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
            </label>

            {/* Sender name */}
            <input
              type="text"
              placeholder="Tu nombre (opcional)"
              value={senderName}
              onChange={(e) => onSenderNameChange(e.target.value)}
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {/* Caption */}
            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              maxLength={300}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {uploadError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
            )}

            <button
              onClick={onUpload}
              disabled={!uploadFile || uploading}
              className="w-full py-2.5 rounded-xl font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {uploading ? 'Subiendo...' : 'Enviar foto'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
