'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown } from 'lucide-react';

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

interface Category {
  id: string;
  name: string;
  price_type: 'PER_PERSON' | 'GLOBAL';
}

interface ProviderExportButtonProps {
  categories: Category[];
  providers: Provider[];
  onExport?: (format: 'pdf' | 'excel') => void;
}

export function ProviderExportButton({ categories, providers, onExport }: ProviderExportButtonProps) {
  const t = useTranslations('planner.providers');
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const { exportProvidersLibraryToExcel } = await import('@/lib/providers/export');
      const result = exportProvidersLibraryToExcel(categories, providers);

      // Create blob and download
      const blob = new Blob([result.buffer], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onExport?.('excel');
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // Call server action to generate PDF
      const response = await fetch('/api/planner/providers/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          providers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `providers-library-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onExport?.('pdf');
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error exporting to PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting || providers.length === 0}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        {isExporting ? t('exporting') : t('export')}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 first:rounded-t-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📄 {t('exportPdf')}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 last:rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📊 {t('exportExcel')}
          </button>
        </div>
      )}
    </div>
  );
}
