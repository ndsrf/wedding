/**
 * Planner Upcoming Tasks Widget Component
 *
 * Dashboard widget for wedding planners showing upcoming checklist tasks across all weddings,
 * split into two columns: tasks assigned to the planner vs tasks assigned to the couple.
 * Features:
 * - Two-column layout (side-by-side on sm+, stacked on mobile)
 * - Color coding: red (past due), orange (within 30 days), green (>30 days)
 * - Shows wedding name (couple names) for each task
 * - Click-to-navigate functionality to specific wedding checklist
 * - Loading and empty states per column
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { UpcomingTask } from '@/types/checklist';
import type { APIResponse } from '@/types/api';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface SplitUpcomingTasks {
  plannerTasks: UpcomingTask[];
  coupleTasks: UpcomingTask[];
  otherTasks: UpcomingTask[];
}

const getUrgencyStyles = (urgencyColor: string) => {
  switch (urgencyColor) {
    case 'red':
      return {
        border: 'border-l-4 border-red-400',
        bg: 'bg-red-50 hover:bg-red-100',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-800',
      };
    case 'orange':
      return {
        border: 'border-l-4 border-orange-400',
        bg: 'bg-orange-50 hover:bg-orange-100',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-800',
      };
    case 'green':
      return {
        border: 'border-l-4 border-green-400',
        bg: 'bg-green-50 hover:bg-green-100',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-800',
      };
    default:
      return {
        border: 'border-l-4 border-gray-300',
        bg: 'bg-gray-50 hover:bg-gray-100',
        text: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-800',
      };
  }
};

const formatDueDate = (dueDate: Date | null, daysUntilDue: number | null) => {
  if (!dueDate) return '—';
  const date = new Date(dueDate);
  const dateString = date.toLocaleDateString('es', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (daysUntilDue === null) return dateString;
  if (daysUntilDue < 0) return `${dateString} (${Math.abs(daysUntilDue)}d vencida)`;
  if (daysUntilDue === 0) return `${dateString} (hoy)`;
  return `${dateString} (${daysUntilDue}d)`;
};

const getUrgencyLabel = (urgencyColor: string, daysUntilDue: number | null) => {
  if (daysUntilDue === null) return 'Sin fecha';
  if (daysUntilDue < 0) return 'Vencida';
  if (daysUntilDue === 0) return 'Hoy';
  if (urgencyColor === 'orange') return 'Pronto';
  return 'Próxima';
};

interface TaskColumnProps {
  tasks: UpcomingTask[];
  title: string;
  emptyMessage: string;
  headerColor: string;
  headerBg: string;
  icon: React.ReactNode;
}

function TaskColumn({ tasks, title, emptyMessage, headerColor, headerBg, icon }: TaskColumnProps) {
  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${headerBg} border-b border-gray-100`}>
        <span className={`flex-shrink-0 ${headerColor}`}>{icon}</span>
        <h3 className={`text-sm font-semibold ${headerColor}`}>{title}</h3>
        {tasks.length > 0 && (
          <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full ${headerBg} ${headerColor} border border-current/20`}>
            {tasks.length}
          </span>
        )}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2 pt-2 min-h-[120px]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
            <svg
              className="h-8 w-8 text-gray-300 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-gray-400">{emptyMessage}</p>
          </div>
        ) : (
          tasks.map((task) => {
            const styles = getUrgencyStyles(task.urgency_color);
            const urgencyLabel = getUrgencyLabel(task.urgency_color, task.days_until_due);
            return (
              <Link
                key={task.id}
                href={`/planner/weddings/${task.wedding_id}/checklist`}
                prefetch={false}
                className={`block rounded-lg p-3 ${styles.bg} ${styles.border} transition-colors`}
                aria-label={`${task.title} — ${task.wedding_couple_names || 'Boda desconocida'}, ${urgencyLabel}`}
              >
                {/* Wedding name */}
                <p className="text-xs font-medium text-gray-500 truncate mb-0.5">
                  {task.wedding_couple_names || '—'}
                </p>
                {/* Task title */}
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {task.title}
                </p>
                {/* Section + due date row */}
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  {task.section_name && (
                    <p className="text-xs text-gray-400 truncate">{task.section_name}</p>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                    <span className={`text-xs ${styles.text} whitespace-nowrap`}>
                      {formatDueDate(task.due_date, task.days_until_due)}
                    </span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${styles.badge}`}>
                      {urgencyLabel}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export function UpcomingTasksWidget() {
  const t = useTranslations();
  const [data, setData] = useState<SplitUpcomingTasks>({ plannerTasks: [], coupleTasks: [], otherTasks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUpcomingTasks() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/planner/upcoming-tasks');
        const result: APIResponse<SplitUpcomingTasks> = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to fetch upcoming tasks');
        }

        setData(result.data ?? { plannerTasks: [], coupleTasks: [], otherTasks: [] });
      } catch (err) {
        console.error('Error fetching upcoming tasks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }

    fetchUpcomingTasks();
  }, []);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('planner.upcomingTasks.title')}</h2>
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <WeddingSpinner size="md" aria-hidden="true" />
          <span className="ml-3 text-gray-500">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('planner.upcomingTasks.title')}</h2>
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

  const { plannerTasks, coupleTasks, otherTasks } = data;
  const hasAnyTask = plannerTasks.length > 0 || coupleTasks.length > 0 || otherTasks.length > 0;

  if (!hasAnyTask) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('planner.upcomingTasks.title')}</h2>
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('planner.upcomingTasks.noTasks')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('planner.upcomingTasks.noTasksDescription')}</p>
          <div className="mt-6">
            <Link
              href="/planner/weddings"
              prefetch={false}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('planner.upcomingTasks.viewAllWeddings')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium text-gray-900">{t('planner.upcomingTasks.title')}</h2>
        <Link
          href="/planner/weddings"
          prefetch={false}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          {t('planner.upcomingTasks.viewAllWeddings')}
        </Link>
      </div>

      {/* Three-column grid — stacked on mobile, 2-col on sm, 3-col on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
        <TaskColumn
          tasks={plannerTasks}
          title={t('planner.upcomingTasks.plannerTasksTitle')}
          emptyMessage={t('planner.upcomingTasks.noPlannerTasks')}
          headerColor="text-blue-700"
          headerBg="bg-blue-50"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
        />

        <TaskColumn
          tasks={coupleTasks}
          title={t('planner.upcomingTasks.coupleTasksTitle')}
          emptyMessage={t('planner.upcomingTasks.noCoupleTasks')}
          headerColor="text-rose-700"
          headerBg="bg-rose-50"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          }
        />

        <TaskColumn
          tasks={otherTasks}
          title={t('planner.upcomingTasks.otherTasksTitle')}
          emptyMessage={t('planner.upcomingTasks.noOtherTasks')}
          headerColor="text-amber-700"
          headerBg="bg-amber-50"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
      </div>
    </div>
  );
}
