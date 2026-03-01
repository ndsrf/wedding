/**
 * Admin Upcoming Tasks Widget Component
 *
 * Dashboard widget for wedding admins showing their upcoming checklist tasks.
 * Displays next 5 tasks assigned to the couple with color-coded due dates.
 * Features:
 * - Color coding: red (past due), orange (within 30 days), green (>30 days)
 * - Sortable by due date
 * - Click-to-navigate functionality to checklist page
 * - Responsive design for mobile dashboards
 * - Loading and empty states
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { UpcomingTask } from '@/types/checklist';
import type { APIResponse } from '@/types/api';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

type SortField = 'due_date' | 'title';
type SortDirection = 'asc' | 'desc';

export function UpcomingTasksWidget() {
  const t = useTranslations('admin.tasks');
  const [tasks, setTasks] = useState<UpcomingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    async function fetchUpcomingTasks() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/upcoming-tasks');
        const data: APIResponse<UpcomingTask[]> = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to fetch upcoming tasks');
        }

        setTasks(data.data || []);
      } catch (err) {
        console.error('Error fetching upcoming tasks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }

    fetchUpcomingTasks();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTasks = React.useMemo(() => {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'due_date') {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        comparison = aDate - bDate;
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [tasks, sortField, sortDirection]);

  const getUrgencyStyles = (urgencyColor: string) => {
    switch (urgencyColor) {
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-l-4 border-red-500',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          border: 'border-l-4 border-orange-500',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-800',
        };
      case 'green':
        return {
          bg: 'bg-green-50',
          border: 'border-l-4 border-green-500',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-l-4 border-gray-500',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const formatDueDate = (dueDate: Date | null, daysUntilDue: number | null) => {
    if (!dueDate) return t('noDueDate');

    const date = new Date(dueDate);
    const dateString = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (daysUntilDue === null) return dateString;

    if (daysUntilDue < 0) {
      return `${dateString} (${Math.abs(daysUntilDue)} ${t('daysOverdue')})`;
    } else if (daysUntilDue === 0) {
      return `${dateString} (${t('dueToday')})`;
    } else {
      return `${dateString} (${daysUntilDue} ${t('daysRemaining')})`;
    }
  };

  const getUrgencyLabel = (urgencyColor: string, daysUntilDue: number | null) => {
    if (daysUntilDue === null) return t('noDeadline');
    if (daysUntilDue < 0) return t('overdue');
    if (daysUntilDue === 0) return t('dueToday');
    if (urgencyColor === 'orange') return t('dueSoon');
    return t('upcoming');
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('title')}</h2>
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <WeddingSpinner size="md" className="mx-auto" />
          <span className="ml-3 text-gray-500">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('title')}</h2>
        <div className="text-center py-8" role="alert" aria-live="assertive">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">{t('title')}</h2>
        <Link
          href="/admin/checklist"
          className="text-sm font-medium text-purple-600 hover:text-purple-500"
        >
          View all
        </Link>
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto" role="region" aria-label="Upcoming tasks table">
        <table className="min-w-full divide-y divide-gray-200" role="table">
          <thead>
            <tr role="row">
              <th
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('title')}
                role="columnheader"
                aria-sort={sortField === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort('title');
                  }
                }}
              >
                <div className="flex items-center">
                  {t('tableHeaderTask')}
                  {sortField === 'title' && (
                    <span className="ml-1" aria-hidden="true">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" role="columnheader">
                {t('tableHeaderSection')}
              </th>
              <th
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('due_date')}
                role="columnheader"
                aria-sort={sortField === 'due_date' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort('due_date');
                  }
                }}
              >
                <div className="flex items-center">
                  {t('tableHeaderDueDate')}
                  {sortField === 'due_date' && (
                    <span className="ml-1" aria-hidden="true">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" role="columnheader">
                {t('tableHeaderStatus')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.map((task) => {
              const styles = getUrgencyStyles(task.urgency_color);
              const urgencyLabel = getUrgencyLabel(task.urgency_color, task.days_until_due);
              return (
                <tr
                  key={task.id}
                  className={`${styles.bg} ${styles.border} hover:opacity-75 cursor-pointer transition-opacity`}
                  onClick={() => {
                    window.location.href = "/admin/checklist";
                  }}
                  role="row"
                  tabIndex={0}
                  aria-label={`Task: ${task.title}, ${urgencyLabel}. Click to view in checklist`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      window.location.href = "/admin/checklist";
                    }
                  }}
                >
                  <td className="px-3 py-4 whitespace-nowrap" role="cell">
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap" role="cell">
                    <div className="text-sm text-gray-500">
                      {task.section_name || t('noSection')}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap" role="cell">
                    <div className={`text-sm ${styles.text}`}>
                      {formatDueDate(task.due_date, task.days_until_due)}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap" role="cell">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles.badge}`}
                      role="status"
                      aria-label={`Priority: ${urgencyLabel}`}
                    >
                      {urgencyLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {sortedTasks.map((task) => {
          const styles = getUrgencyStyles(task.urgency_color);
          return (
            <Link
              key={task.id}
              href="/admin/checklist"
              className={`block ${styles.bg} ${styles.border} rounded-lg p-4 hover:opacity-75 transition-opacity`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {task.section_name || t('noSection')}
                  </p>
                  <p className={`text-xs ${styles.text} mt-2`}>
                    {formatDueDate(task.due_date, task.days_until_due)}
                  </p>
                </div>
                <span
                  className={`ml-2 px-2 py-1 text-xs leading-5 font-semibold rounded-full ${styles.badge}`}
                  aria-label={`Priority: ${getUrgencyLabel(task.urgency_color, task.days_until_due)}`}
                >
                  {getUrgencyLabel(task.urgency_color, task.days_until_due)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
