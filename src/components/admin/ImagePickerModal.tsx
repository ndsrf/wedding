'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { ImageFile } from '@/types/invitation-template';

interface ImagePickerModalProps {
  onClose: () => void;
  onSelectImage: (url: string) => void;
  requireAspectRatio?: boolean; // If true, validates aspect ratio on selection (for image blocks)
}

/**
 * ImagePickerModal - Modal for selecting/uploading invitation images
 *
 * Features:
 * - List existing images
 * - Upload new images
 * - Image selection
 * - Optional aspect ratio validation
 *
 * @component
 */
export function ImagePickerModal({ onClose, onSelectImage, requireAspectRatio = false }: ImagePickerModalProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images on mount
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/invitation-template/images');
      if (!res.ok) throw new Error('Failed to load images');
      const data = await res.json();
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/invitation-template/images', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { url } = await res.json();
      setImages((prev) => [...prev, { url, filename: file.name }]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      e.currentTarget.value = '';
    }
  };

  const handleSelectImage = async (url: string) => {
    // If aspect ratio validation is not required, select immediately
    if (!requireAspectRatio) {
      onSelectImage(url);
      return;
    }

    // Validate aspect ratio
    setError(null);
    const img = new window.Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const ratio = width / height;

      // Check if it matches 1:1 (with 5% tolerance)
      const isSquare = Math.abs(ratio - 1) <= 0.05;

      // Check if it matches 16:9 (with 5% tolerance)
      const isWide = Math.abs(ratio - 16 / 9) <= 0.05;

      if (!isSquare && !isWide) {
        const actualRatio = ratio.toFixed(2);
        setError(
          `Image aspect ratio (${actualRatio}:1) is not supported. Please use 1:1 (square) or 16:9 (wide) aspect ratio.`
        );
        return;
      }

      // Valid aspect ratio, proceed
      onSelectImage(url);
    };
    img.onerror = () => {
      setError('Failed to load image for validation');
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Select Image</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={isUploading}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer block"
            >
              <p className="text-gray-700 font-medium mb-2">Upload New Image</p>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop or click to select (JPEG, PNG, WebP, GIF)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Choose File'}
              </button>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Images Grid */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading images...</div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No images uploaded yet</p>
              <p className="text-sm mt-2">Upload an image to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <button
                  key={image.url}
                  onClick={() => handleSelectImage(image.url)}
                  className="relative group overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-500 transition"
                >
                  <div className="relative w-full h-32 bg-gray-100">
                    <Image
                      src={image.url}
                      alt={image.filename}
                      fill
                      className="object-cover group-hover:scale-110 transition"
                      unoptimized
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center">
                    <p className="text-white opacity-0 group-hover:opacity-100 transition font-medium">
                      Select
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
