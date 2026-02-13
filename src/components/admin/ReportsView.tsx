/**
 * Reports View Component
 *
 * Reusable component for displaying and generating wedding reports
 * Used in both admin and planner sections
 */

'use client';

import { useState } from 'react';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import { useTranslations } from 'next-intl';
import { FileText, Users, LayoutGrid, Download, Eye, ChevronLeft, Calendar } from 'lucide-react';

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

interface ReportsViewProps {
  /** Optional custom base URL for API endpoints (defaults to /api/admin/reports) */
  apiBasePath?: string;
}

export function ReportsView({ apiBasePath = '/api/admin/reports' }: ReportsViewProps) {
  const t = useTranslations();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<any[] | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loadingData, setLoadingData] = useState(false);

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

  const handleDownload = async (report: ReportConfig, format: ExportFormat) => {
    const downloadKey = `${report.id}-${format}`;
    setDownloading(downloadKey);

    try {
      const response = await fetch(`${report.endpoint}?format=${format}`);

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `report-${report.id}.${format}`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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

  const getColorClasses = (colorClass: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; hover: string; ring: string }> = {
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

  const renderTable = () => {
    if (!reportData || !viewing) return null;

    const currentReport = reports.find(r => r.id === viewing);
    if (!currentReport) return null;

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
                {reportData.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.familyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.memberName} ({item.type})</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attending}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tableName || '-'}</td>
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
                {reportData.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.adminName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.totalGuests}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attendingGuests}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.pendingGuests}</td>
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
                {reportData.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.tableName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.guestName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.familyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attending}</td>
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
                {reportData.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.groupType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.groupName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.averageAge !== null ? item.averageAge : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.guestCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.minAge !== null ? item.minAge : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.maxAge !== null ? item.maxAge : '-'}</td>
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

  if (viewing && (reportData || loadingData)) {
    const currentReport = reports.find(r => r.id === viewing)!;
    const colors = getColorClasses(currentReport.colorClass);

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

  return (
    <div className="space-y-8">
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
                  {/* View Button */}
                  <button
                    onClick={() => handleView(report)}
                    disabled={loadingData}
                    className={`w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('admin.reports.viewReport')}
                  </button>

                  {/* Download Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownload(report, 'xlsx')}
                      disabled={downloading === `${report.id}-xlsx`}
                      className={`flex items-center justify-center px-3 py-2 border ${colors.border} rounded-md text-sm font-medium ${colors.text} ${colors.bg} ${colors.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {downloading === `${report.id}-xlsx`
                        ? '...'
                        : 'Excel'}
                    </button>

                    <button
                      onClick={() => handleDownload(report, 'csv')}
                      disabled={downloading === `${report.id}-csv`}
                      className={`flex items-center justify-center px-3 py-2 border ${colors.border} rounded-md text-sm font-medium ${colors.text} ${colors.bg} ${colors.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {downloading === `${report.id}-csv`
                        ? '...'
                        : 'CSV'}
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