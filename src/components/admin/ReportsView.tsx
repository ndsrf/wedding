/**
 * Reports View Component
 *
 * Reusable component for displaying and generating wedding reports.
 * Used in both admin and planner sections.
 *
 * Includes a natural-language query chat box that lets users ask questions
 * about their wedding data in plain English and export the results.
 */

'use client';

import { useState, useRef } from 'react';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Users,
  LayoutGrid,
  Download,
  Eye,
  ChevronLeft,
  Calendar,
  MessageSquare,
  Send,
  Code,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

type ReportType = 'attendees' | 'guests-per-admin' | 'seating-plan' | 'age-average';
type ExportFormat = 'xlsx' | 'csv' | 'json';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  endpoint: string;
}

interface NLResult {
  data: Record<string, unknown>[];
  sql: string;
  columns: string[];
  question: string;
}

interface ReportsViewProps {
  /** Optional custom base URL for API endpoints (defaults to /api/admin/reports) */
  apiBasePath?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: trigger a file download from an API response
// ─────────────────────────────────────────────────────────────────────────────
async function downloadBlob(response: Response, fallbackName: string) {
  const contentDisposition = response.headers.get('Content-Disposition');
  const match = contentDisposition?.match(/filename="(.+)"/);
  const filename = match ? match[1] : fallbackName;

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function ReportsView({ apiBasePath = '/api/admin/reports' }: ReportsViewProps) {
  const t = useTranslations();

  // ── Standard report state ────────────────────────────────────────────────
  const [downloading, setDownloading] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<unknown[] | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // ── Natural-language query state ─────────────────────────────────────────
  const [nlQuestion, setNlQuestion] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlResult, setNlResult] = useState<NLResult | null>(null);
  const [nlShowSql, setNlShowSql] = useState(false);
  const [nlExporting, setNlExporting] = useState<string | null>(null);
  const nlInputRef = useRef<HTMLTextAreaElement>(null);

  const reports: ReportConfig[] = [
    {
      id: 'attendees',
      title: t('admin.reports.attendeeList.title'),
      description: t('admin.reports.attendeeList.description'),
      icon: <FileText className="h-6 w-6" />,
      colorClass: 'purple',
      endpoint: `${apiBasePath}/attendees`,
    },
    {
      id: 'guests-per-admin',
      title: t('admin.reports.guestsPerAdmin.title'),
      description: t('admin.reports.guestsPerAdmin.description'),
      icon: <Users className="h-6 w-6" />,
      colorClass: 'blue',
      endpoint: `${apiBasePath}/guests-per-admin`,
    },
    {
      id: 'seating-plan',
      title: t('admin.reports.seatingPlan.title'),
      description: t('admin.reports.seatingPlan.description'),
      icon: <LayoutGrid className="h-6 w-6" />,
      colorClass: 'green',
      endpoint: `${apiBasePath}/seating-plan`,
    },
    {
      id: 'age-average',
      title: t('admin.reports.ageAverage.title'),
      description: t('admin.reports.ageAverage.description'),
      icon: <Calendar className="h-6 w-6" />,
      colorClass: 'orange',
      endpoint: `${apiBasePath}/guest-age-average`,
    },
  ];

  // ── Color helpers ────────────────────────────────────────────────────────
  const getColorClasses = (colorClass: string) => {
    const colorMap: Record<
      string,
      { bg: string; text: string; border: string; hover: string; ring: string }
    > = {
      purple: {
        bg: 'bg-purple-100',
        text: 'text-purple-600',
        border: 'border-purple-200',
        hover: 'hover:bg-purple-100',
        ring: 'focus:ring-purple-500',
      },
      blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-100',
        ring: 'focus:ring-blue-500',
      },
      green: {
        bg: 'bg-green-100',
        text: 'text-green-600',
        border: 'border-green-200',
        hover: 'hover:bg-green-100',
        ring: 'focus:ring-green-500',
      },
      orange: {
        bg: 'bg-orange-100',
        text: 'text-orange-600',
        border: 'border-orange-200',
        hover: 'hover:bg-orange-100',
        ring: 'focus:ring-orange-500',
      },
    };
    return colorMap[colorClass] || colorMap.purple;
  };

  // ── Standard report handlers ─────────────────────────────────────────────
  const handleDownload = async (report: ReportConfig, format: ExportFormat) => {
    const downloadKey = `${report.id}-${format}`;
    setDownloading(downloadKey);

    try {
      const response = await fetch(`${report.endpoint}?format=${format}`);
      if (!response.ok) throw new Error('Failed to generate report');
      await downloadBlob(response, `report-${report.id}.${format}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert(t('admin.reports.downloadError'));
    } finally {
      setDownloading(null);
    }
  };

  const handleView = async (report: ReportConfig) => {
    setViewing(report.id);
    setLoadingData(true);
    setReportData(null);

    try {
      const response = await fetch(`${report.endpoint}?format=json`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error viewing report:', error);
      alert(t('admin.reports.downloadError'));
      setViewing(null);
    } finally {
      setLoadingData(false);
    }
  };

  // ── NL query handlers ────────────────────────────────────────────────────
  const handleNlQuery = async () => {
    const question = nlQuestion.trim();
    if (!question) return;

    setNlLoading(true);
    setNlError(null);
    setNlResult(null);
    setNlShowSql(false);

    try {
      const response = await fetch(`${apiBasePath}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, format: 'json' }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to run query');
      }

      setNlResult({ ...json, question });
    } catch (error) {
      console.error('[NL-QUERY] Error:', error);
      setNlError(error instanceof Error ? error.message : t('admin.reports.nlQuery.error'));
    } finally {
      setNlLoading(false);
    }
  };

  const handleNlExport = async (format: 'xlsx' | 'csv') => {
    if (!nlResult) return;
    setNlExporting(format);

    try {
      const response = await fetch(`${apiBasePath}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: nlResult.sql, format }),
      });

      if (!response.ok) throw new Error('Export failed');
      await downloadBlob(response, `custom-report.${format}`);
    } catch (error) {
      console.error('[NL-QUERY] Export error:', error);
      alert(t('admin.reports.downloadError'));
    } finally {
      setNlExporting(null);
    }
  };

  const handleNlKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNlQuery();
    }
  };

  const handleExampleClick = (example: string) => {
    setNlQuestion(example);
    nlInputRef.current?.focus();
  };

  const resetNlQuery = () => {
    setNlResult(null);
    setNlError(null);
    setNlQuestion('');
    setNlShowSql(false);
  };

  // ── Existing report table rendering ──────────────────────────────────────
  const renderTable = () => {
    if (!reportData || !viewing) return null;

    switch (viewing) {
      case 'attendees':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.guests.familyName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.guests.table.members')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.guests.table.rsvp')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.seating.config.tableName')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(reportData as Array<Record<string, unknown>>).map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(item.familyName ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.memberName ?? '')} ({String(item.type ?? '')})</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.attending ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.tableName ?? '') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'guests-per-admin':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.guests.invitedBy')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.master.weddings.guestCount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.weddings.attending')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status.pending')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(reportData as Array<Record<string, unknown>>).map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(item.adminName ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.totalGuests ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.attendingGuests ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.pendingGuests ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'seating-plan':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.seating.config.tableName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.guests.table.members')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.guests.familyName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.guests.table.rsvp')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(reportData as Array<Record<string, unknown>>).map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(item.tableName ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.guestName ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.familyName ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.attending ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'age-average':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.reports.ageAverage.groupType')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.reports.ageAverage.groupName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.reports.ageAverage.averageAge')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.reports.ageAverage.guestCount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.reports.ageAverage.minAge')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.reports.ageAverage.maxAge')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(reportData as Array<Record<string, unknown>>).map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.groupType ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(item.groupName ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.averageAge !== null ? String(item.averageAge) : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{String(item.guestCount ?? '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.minAge !== null ? String(item.minAge) : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.maxAge !== null ? String(item.maxAge) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  // ── View: standard report detail ─────────────────────────────────────────
  if (viewing && (reportData || loadingData)) {
    const currentReport = reports.find((r) => r.id === viewing)!;
    const colors = getColorClasses(currentReport.colorClass);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setViewing(null);
              setReportData(null);
            }}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('admin.reports.backToReports')}
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => handleDownload(currentReport, 'xlsx')}
              disabled={downloading === `${currentReport.id}-xlsx`}
              className={`flex items-center px-3 py-2 border ${colors.border} rounded-md text-sm font-medium ${colors.text} ${colors.bg} ${colors.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50`}
            >
              <Download className="h-4 w-4 mr-1" />
              Excel
            </button>
            <button
              onClick={() => handleDownload(currentReport, 'csv')}
              disabled={downloading === `${currentReport.id}-csv`}
              className={`flex items-center px-3 py-2 border ${colors.border} rounded-md text-sm font-medium ${colors.text} ${colors.bg} ${colors.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50`}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium leading-6 text-gray-900">{currentReport.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{currentReport.description}</p>
          </div>

          {loadingData ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <WeddingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-500">{t('admin.reports.generating')}</p>
            </div>
          ) : (
            renderTable()
          )}
        </div>
      </div>
    );
  }

  // ── View: NL query results ───────────────────────────────────────────────
  if (nlResult) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={resetNlQuery}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('admin.reports.backToReports')}
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => handleNlExport('xlsx')}
              disabled={nlExporting === 'xlsx'}
              className="flex items-center px-3 py-2 border border-rose-200 rounded-md text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-1" />
              {nlExporting === 'xlsx' ? '...' : 'Excel'}
            </button>
            <button
              onClick={() => handleNlExport('csv')}
              disabled={nlExporting === 'csv'}
              className="flex items-center px-3 py-2 border border-rose-200 rounded-md text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-1" />
              {nlExporting === 'csv' ? '...' : 'CSV'}
            </button>
          </div>
        </div>

        {/* Results card */}
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-rose-500" />
                  {t('admin.reports.nlQuery.resultsTitle')}
                </h3>
                <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{nlResult.question}&rdquo;</p>
              </div>
              <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                {nlResult.data.length} {t('admin.reports.nlQuery.rows')}
              </span>
            </div>
          </div>

          {/* Dynamic results table */}
          {nlResult.data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              {t('admin.reports.nlQuery.noData')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {nlResult.columns.map((col) => (
                      <th
                        key={col}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nlResult.data.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {nlResult.columns.map((col) => {
                        const val = row[col];
                        const display =
                          val === null || val === undefined
                            ? '-'
                            : typeof val === 'object'
                            ? JSON.stringify(val)
                            : String(val);
                        return (
                          <td
                            key={col}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Generated SQL (collapsible) */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setNlShowSql((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              {t('admin.reports.nlQuery.generatedSql')}
            </span>
            {nlShowSql ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {nlShowSql && (
            <pre className="px-4 pb-4 text-xs font-mono text-gray-700 bg-gray-50 overflow-x-auto whitespace-pre-wrap break-all border-t border-gray-200">
              {nlResult.sql}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // ── View: report list + NL query chat box ────────────────────────────────
  const examples = [
    t('admin.reports.nlQuery.example5'), // "my side" — first to highlight the admin-scoped capability
    t('admin.reports.nlQuery.example1'),
    t('admin.reports.nlQuery.example2'),
    t('admin.reports.nlQuery.example3'),
    t('admin.reports.nlQuery.example4'),
  ];

  return (
    <div className="space-y-8">
      {/* Natural Language Query Chat Box — top of page */}
      <div className="bg-white border-2 border-rose-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-200">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-rose-100 text-rose-600 rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('admin.reports.nlQuery.title')}
              </h3>
              <p className="text-sm text-gray-600">{t('admin.reports.nlQuery.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Example chips */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t('admin.reports.nlQuery.examples')}
            </p>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleExampleClick(ex)}
                  className="text-xs px-3 py-1.5 rounded-full border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Input + button */}
          <div className="flex gap-3">
            <textarea
              ref={nlInputRef}
              value={nlQuestion}
              onChange={(e) => setNlQuestion(e.target.value)}
              onKeyDown={handleNlKeyDown}
              placeholder={t('admin.reports.nlQuery.placeholder')}
              rows={2}
              className="flex-1 block w-full rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-rose-400 focus:ring-rose-400 focus:outline-none focus:ring-2 resize-none"
            />
            <button
              onClick={handleNlQuery}
              disabled={nlLoading || !nlQuestion.trim()}
              className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {nlLoading ? (
                <WeddingSpinner size="sm" className="text-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">
                {nlLoading ? t('admin.reports.nlQuery.loading') : t('admin.reports.nlQuery.ask')}
              </span>
            </button>
          </div>

          {/* Error message */}
          {nlError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {nlError}
            </div>
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <span>{t('admin.reports.nlQuery.securityNote')}</span>
          </div>
        </div>
      </div>

      {/* Standard report cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const colors = getColorClasses(report.colorClass);

          return (
            <div
              key={report.id}
              className={`bg-white border-2 ${colors.border} rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow`}
            >
              <div className="p-6">
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 ${colors.bg} ${colors.text} rounded-lg mb-4`}
                >
                  {report.icon}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>

                <p className="text-sm text-gray-600 mb-6">{report.description}</p>

                <div className="space-y-3">
                  <button
                    onClick={() => handleView(report)}
                    disabled={loadingData}
                    className={`w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('admin.reports.viewReport')}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownload(report, 'xlsx')}
                      disabled={downloading === `${report.id}-xlsx`}
                      className={`flex items-center justify-center px-3 py-2 border ${colors.border} rounded-md text-sm font-medium ${colors.text} ${colors.bg} ${colors.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {downloading === `${report.id}-xlsx` ? '...' : 'Excel'}
                    </button>

                    <button
                      onClick={() => handleDownload(report, 'csv')}
                      disabled={downloading === `${report.id}-csv`}
                      className={`flex items-center justify-center px-3 py-2 border ${colors.border} rounded-md text-sm font-medium ${colors.text} ${colors.bg} ${colors.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {downloading === `${report.id}-csv` ? '...' : 'CSV'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          {t('admin.reports.infoTitle')}
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>{t('admin.reports.info1')}</li>
          <li>{t('admin.reports.info2')}</li>
          <li>{t('admin.reports.info3')}</li>
        </ul>
      </div>
    </div>
  );
}
