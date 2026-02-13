'use client';

import { useEffect, useState } from 'react';
import TemplateRenderer from '@/components/guest/TemplateRenderer';
import type { TemplateDesign } from '@/types/invitation-template';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface PreviewData {
  design: TemplateDesign;
  weddingData: {
    couple_names: string;
    wedding_date: Date | string;
    wedding_time: string;
    location: string;
  };
  language: string;
}

/**
 * Invitation Template Preview Page
 *
 * Displays a full-screen preview of the invitation template being built.
 * Reads design data from sessionStorage.
 */
export default function InvitationPreviewPage() {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Read preview data from sessionStorage
      const storedData = sessionStorage.getItem('invitation-preview-data');
      if (!storedData) {
        setError('No preview data found. Please open preview from the editor.');
        return;
      }

      const data = JSON.parse(storedData) as PreviewData;
      setPreviewData(data);
    } catch (err) {
      console.error('Failed to load preview data:', err);
      setError('Failed to load preview data.');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Preview Error</h1>
          <p className="text-lg text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.close()}
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <WeddingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  const { design, weddingData, language } = previewData;
  const weddingDate = weddingData.wedding_date instanceof Date
    ? weddingData.wedding_date.toISOString()
    : weddingData.wedding_date;

  return (
    <div className="min-h-screen relative">
      {/* Close button overlay */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => window.close()}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition shadow-lg flex items-center gap-2"
        >
          <span>×</span>
          <span>Close Preview</span>
        </button>
      </div>

      {/* Template Renderer */}
      <TemplateRenderer
        design={design}
        weddingDate={weddingDate}
        weddingTime={weddingData.wedding_time}
        location={weddingData.location}
        coupleNames={weddingData.couple_names}
        language={(language.toUpperCase() as 'ES' | 'EN' | 'FR' | 'IT' | 'DE')}
      />
    </div>
  );
}
