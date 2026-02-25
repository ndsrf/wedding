'use client';

import { useEffect, useState } from 'react';
import TemplateRenderer from '@/components/guest/TemplateRenderer';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { TemplateDesign } from '@/types/invitation-template';

type Language = 'ES' | 'EN' | 'FR' | 'IT' | 'DE';

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'EN', name: 'English', flag: '🇬🇧' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
];

interface PreviewData {
  design: TemplateDesign;
  weddingData: {
    id?: string;
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
  const [activeLanguage, setActiveLanguage] = useState<Language>('EN');
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
      setActiveLanguage((data.language.toUpperCase() as Language) || 'EN');
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

  const { design, weddingData } = previewData;
  const weddingDate = weddingData.wedding_date instanceof Date
    ? weddingData.wedding_date.toISOString()
    : weddingData.wedding_date;

  return (
    <div className="min-h-screen relative">
      {/* Header bar with language selector and close button */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-2 flex justify-between items-center">
          <h1 className="text-sm font-medium text-gray-600">
            {weddingData.couple_names}
          </h1>
          <div className="flex items-center gap-3">
            <select
              value={activeLanguage}
              onChange={(e) => setActiveLanguage(e.target.value as Language)}
              className="appearance-none px-3 py-1.5 pr-8 text-sm font-semibold border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => window.close()}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition shadow-sm flex items-center gap-2 text-sm"
            >
              <span>×</span>
              <span>Close Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-12" />

      {/* Template Renderer */}
      <TemplateRenderer
        design={design}
        weddingDate={weddingDate}
        weddingTime={weddingData.wedding_time}
        location={weddingData.location}
        coupleNames={weddingData.couple_names}
        language={activeLanguage}
        weddingId={weddingData.id}
      />
    </div>
  );
}
