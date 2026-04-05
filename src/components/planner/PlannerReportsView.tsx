/**
 * Planner Reports View
 *
 * Cross-wedding reports and financials for wedding planners.
 * Shows 4 predefined reports (weddings summary, guests summary, provider payments,
 * revenue) plus a natural-language query box scoped to all the planner's data.
 *
 * This is the planner-level counterpart of ReportsView (which is per-wedding).
 */

'use client';

import { useState, useRef } from 'react';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Users,
  CreditCard,
  TrendingUp,
  Download,
  Eye,
  ChevronLeft,
  MessageSquare,
  Send,
  Code,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

// ───────��─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────��────────────────────────────��──

type PlannerReportId = 'weddings-summary' | 'guests-summary' | 'provider-payments' | 'revenue';
type ExportFormat = 'xlsx' | 'csv';

interface ReportConfig {
  id: PlannerReportId;
  titleKey: string;
  descriptionKey: string;
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

// ─────────────────────────────────────────────────────���───────────────────────
// Helper
// ──────────────────────────────────────────��─────────────────────────────────��

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

// ───────────────���─────────────────────────────��───────────────────────────────
// Color helpers
// ────────────────────────────────────────���──────────────────────────────��─────

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; hover: string; ring: string }> = {
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-100',
    ring: 'focus:ring-indigo-500',
  },
  teal: {
    bg: 'bg-teal-100',
    text: 'text-teal-600',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-100',
    ring: 'focus:ring-teal-500',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-100',
    ring: 'focus:ring-amber-500',
  },
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    hover: 'hover:bg-emerald-100',
    ring: 'focus:ring-emerald-500',
  },
};

function getColors(colorClass: string) {
  return COLOR_MAP[colorClass] || COLOR_MAP.indigo;
}

// ──────────────────────────────────────────────────────────���──────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────��───

const BASE_PATH = '/api/planner/reports';

export function PlannerReportsView() {
  const t = useTranslations();

  // ── Standard report state ──────────���─────────────────────────────────────
  const [downloading, setDownloading] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PlannerReportId | null>(null);
  const [reportData, setReportData] = useState<unknown[] | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // ── NL query state ──────────────────────────���────────────────────────────
  const [nlQuestion, setNlQuestion] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlResult, setNlResult] = useState<NLResult | null>(null);
  const [nlShowSql, setNlShowSql] = useState(false);
  const [nlExporting, setNlExporting] = useState<string | null>(null);
  const nlInputRef = useRef<HTMLTextAreaElement>(null);

  const reports: ReportConfig[] = [
    {
      id: 'weddings-summary',
      titleKey: 'planner.reports.weddingsSummary.title',
      descriptionKey: 'planner.reports.weddingsSummary.description',
      icon: <FileText className="h-6 w-6" />,
      colorClass: 'indigo',
      endpoint: `${BASE_PATH}/weddings-summary`,
    },
    {
      id: 'guests-summary',
      titleKey: 'planner.reports.guestsSummary.title',
      descriptionKey: 'planner.reports.guestsSummary.description',
      icon: <Users className="h-6 w-6" />,
      colorClass: 'teal',
      endpoint: `${BASE_PATH}/guests-summary`,
    },
    {
      id: 'provider-payments',
      titleKey: 'planner.reports.providerPayments.title',
      descriptionKey: 'planner.reports.providerPayments.description',
      icon: <CreditCard className="h-6 w-6" />,
      colorClass: 'amber',
      endpoint: `${BASE_PATH}/provider-payments`,
    },
    {
      id: 'revenue',
      titleKey: 'planner.reports.revenue.title',
      descriptionKey: 'planner.reports.revenue.description',
      icon: <TrendingUp className="h-6 w-6" />,
      colorClass: 'emerald',
      endpoint: `${BASE_PATH}/revenue`,
    },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDownload = async (report: ReportConfig, format: ExportFormat) => {
    const key = `${report.id}-${format}`;
    setDownloading(key);
    try {
      const res = await fetch(`${report.endpoint}?format=${format}`);
      if (!res.ok) throw new Error('Failed to generate report');
      await downloadBlob(res, `${report.id}.${format}`);
    } catch {
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
      const res = await fetch(`${report.endpoint}?format=json`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setReportData(data);
    } catch {
      alert(t('admin.reports.downloadError'));
      setViewing(null);
    } finally {
      setLoadingData(false);
    }
  };

  const handleNlQuery = async () => {
    const question = nlQuestion.trim();
    if (!question) return;
    setNlLoading(true);
    setNlError(null);
    setNlResult(null);
    setNlShowSql(false);
    try {
      const res = await fetch(`${BASE_PATH}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, format: 'json' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to run query');
      setNlResult({ ...json, question });
    } catch (err) {
      setNlError(err instanceof Error ? err.message : t('admin.reports.nlQuery.error'));
    } finally {
      setNlLoading(false);
    }
  };

  const handleNlExport = async (format: 'xlsx' | 'csv') => {
    if (!nlResult) return;
    setNlExporting(format);
    try {
      const res = await fetch(`${BASE_PATH}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: nlResult.sql, format }),
      });
      if (!res.ok) throw new Error('Export failed');
      await downloadBlob(res, `planner-report.${format}`);
    } catch {
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

  const resetNlQuery = () => {
    setNlResult(null);
    setNlError(null);
    setNlQuestion('');
    setNlShowSql(false);
  };

  // ── Table renderers ────────────────────────��──────────────────────────────

  const renderReportTable = () => {
    if (!reportData || !viewing) return null;
    const rows = reportData as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      return <p className="p-8 text-center text-gray-500 text-sm">{t('planner.reports.noData')}</p>;
    }
    const cols = Object.keys(rows[0]);
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {cols.map((col) => (
                <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.replace(/([A-Z])/g, ' $1').trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {cols.map((col) => (
                  <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {row[col] === null || row[col] === undefined ? '-' : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── View: report detail ───────────────────────────────────────────────────

  if (viewing && (reportData || loadingData)) {
    const currentReport = reports.find((r) => r.id === viewing)!;
    const colors = getColors(currentReport.colorClass);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setViewing(null); setReportData(null); }}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('admin.reports.backToReports')}
          </button>
          <div className="flex space-x-2">
            {(['xlsx', 'csv'] as ExportFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleDownload(currentReport, fmt)}
                disabled={downloading === `${currentReport.id}-${fmt}`}
                className={`flex items-center px-3 py-2 border ${colors.border} rounded-md text-sm font-medium ${colors.text} ${colors.bg} ${colors.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50`}
              >
                <Download className="h-4 w-4 mr-1" />
                {fmt === 'xlsx' ? 'Excel' : 'CSV'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {t(currentReport.titleKey)}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{t(currentReport.descriptionKey)}</p>
          </div>
          {loadingData ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <WeddingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-500">{t('admin.reports.generating')}</p>
            </div>
          ) : (
            renderReportTable()
          )}
        </div>
      </div>
    );
  }

  // ── View: NL query results ─────────────────────────────���──────────────────

  if (nlResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={resetNlQuery}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('admin.reports.backToReports')}
          </button>
          <div className="flex space-x-2">
            {(['xlsx', 'csv'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleNlExport(fmt)}
                disabled={nlExporting === fmt}
                className="flex items-center px-3 py-2 border border-rose-200 rounded-md text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-1" />
                {nlExporting === fmt ? '...' : fmt === 'xlsx' ? 'Excel' : 'CSV'}
              </button>
            ))}
          </div>
        </div>

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
          {nlResult.data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">{t('admin.reports.nlQuery.noData')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {nlResult.columns.map((col) => (
                      <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        const display = val === null || val === undefined ? '-' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                        return (
                          <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
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

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setNlShowSql((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              {t('admin.reports.nlQuery.generatedSql')}
            </span>
            {nlShowSql ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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

  // ── View: report list + NL query ──────────────────────────────────────────

  const examples = [
    t('planner.reports.nlQuery.example1'),
    t('planner.reports.nlQuery.example2'),
    t('planner.reports.nlQuery.example3'),
    t('planner.reports.nlQuery.example4'),
  ];

  return (
    <div className="space-y-8">
      {/* NL Query chat box */}
      <div className="bg-white border-2 border-rose-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-200">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-rose-100 text-rose-600 rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('planner.reports.nlQuery.title')}</h3>
              <p className="text-sm text-gray-600">{t('planner.reports.nlQuery.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t('admin.reports.nlQuery.examples')}
            </p>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setNlQuestion(ex); nlInputRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <textarea
              ref={nlInputRef}
              value={nlQuestion}
              onChange={(e) => setNlQuestion(e.target.value)}
              onKeyDown={handleNlKeyDown}
              placeholder={t('planner.reports.nlQuery.placeholder')}
              rows={2}
              className="flex-1 block w-full rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-rose-400 focus:ring-rose-400 focus:outline-none focus:ring-2 resize-none"
            />
            <button
              onClick={handleNlQuery}
              disabled={nlLoading || !nlQuestion.trim()}
              className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {nlLoading ? <WeddingSpinner size="sm" className="text-white" /> : <Send className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">
                {nlLoading ? t('admin.reports.nlQuery.loading') : t('admin.reports.nlQuery.ask')}
              </span>
            </button>
          </div>

          {nlError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {nlError}
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <span>{t('planner.reports.nlQuery.securityNote')}</span>
          </div>
        </div>
      </div>

      {/* Predefined report cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2">
        {reports.map((report) => {
          const colors = getColors(report.colorClass);
          return (
            <div
              key={report.id}
              className={`bg-white border-2 ${colors.border} rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow`}
            >
              <div className="p-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 ${colors.bg} ${colors.text} rounded-lg mb-4`}>
                  {report.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(report.titleKey)}</h3>
                <p className="text-sm text-gray-600 mb-6">{t(report.descriptionKey)}</p>

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
                    {(['xlsx', 'csv'] as ExportFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleDownload(report, fmt)}
                        disabled={downloading === `${report.id}-${fmt}`}
                        className={`flex items-center justify-center px-3 py-2 border ${colors.border} rounded-md text-sm font-medium ${colors.text} ${colors.bg} ${colors.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {downloading === `${report.id}-${fmt}` ? '...' : fmt === 'xlsx' ? 'Excel' : 'CSV'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">{t('planner.reports.infoTitle')}</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>{t('planner.reports.info1')}</li>
          <li>{t('planner.reports.info2')}</li>
          <li>{t('planner.reports.info3')}</li>
        </ul>
      </div>
    </div>
  );
}
