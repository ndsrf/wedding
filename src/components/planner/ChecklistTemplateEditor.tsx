/**
 * Checklist Template Editor Component
 *
 * Provides planner interface for managing task templates with:
 * - Grid interface for template editing
 * - Section management (create, rename, delete, drag-drop)
 * - Excel import/export functionality
 * - Manual save functionality
 * - Optimistic UI updates with rollback on error
 * - Keyboard navigation support
 * - Drag-and-drop for sections and tasks
 * - Relative date format validation
 * - Mobile responsive (card layout on small screens)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { TaskRow } from '@/components/ui/TaskRow';
import type {
  ChecklistTemplateWithSections,
  CreateTemplateSectionData,
  CreateTemplateTaskData,
  SaveTemplateRequest,
} from '@/types/checklist';
import type { APIResponse } from '@/types/api';
import { TaskAssignment, TaskStatus } from '@prisma/client';
import { isValidRelativeDateFormat } from '@/types/checklist';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface ChecklistTemplateEditorProps {
  className?: string;
}

// Local state types for optimistic updates
interface LocalSection extends Omit<CreateTemplateSectionData, 'tasks'> {
  id: string; // Temporary ID for local state
  tasks: LocalTask[];
  isNew?: boolean;
}

interface LocalTask extends CreateTemplateTaskData {
  id: string; // Temporary ID for local state
  section_id: string;
  isNew?: boolean;
}

export function ChecklistTemplateEditor({ className = '' }: ChecklistTemplateEditorProps) {
  const t = useTranslations('planner.checklistTemplate');
  const [sections, setSections] = useState<LocalSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  /**
   * Load template from API
   */
  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/planner/checklist-template');
      const data: APIResponse<ChecklistTemplateWithSections> = await response.json();

      if (response.ok && data.success && data.data) {
        // Convert server data to local state
        const localSections: LocalSection[] = data.data.sections.map((section) => ({
          id: section.id,
          name: section.name,
          order: section.order,
          tasks: section.tasks.map((task) => ({
            id: task.id,
            section_id: section.id,
            title: task.title,
            description: task.description,
            assigned_to: task.assigned_to,
            due_date_relative: task.due_date_relative,
            order: task.order,
          })),
        }));

        setSections(localSections);
      } else if (response.status === 404) {
        // No template exists yet - start with empty state
        setSections([]);
      } else {
        throw new Error(data.error?.message || 'Failed to load template');
      }
    } catch (err) {
      console.error('Error loading template:', err);
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save template to API
   */
  const saveTemplate = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Validate before saving
      if (sections.length === 0) {
        setError('Template must have at least one section');
        setIsDirty(false); // Clear dirty flag to prevent auto-save loop
        return;
      }

      // Validate that each section has at least one task
      const sectionsWithoutTasks = sections.filter(s => s.tasks.length === 0);
      if (sectionsWithoutTasks.length > 0) {
        setError('Each section must have at least one task. Please add tasks or delete empty sections.');
        setIsDirty(false); // Clear dirty flag to prevent auto-save loop
        return;
      }

      // Convert local state to API format
      const requestData: SaveTemplateRequest = {
        sections: sections.map((section) => ({
          name: section.name,
          order: section.order,
          tasks: section.tasks.map((task) => ({
            title: task.title,
            description: task.description,
            assigned_to: task.assigned_to,
            due_date_relative: task.due_date_relative,
            order: task.order,
          })),
        })),
      };

      const response = await fetch('/api/planner/checklist-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data: APIResponse<ChecklistTemplateWithSections> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save template');
      }

      // Update local state with server IDs
      if (data.data) {
        const localSections: LocalSection[] = data.data.sections.map((section) => ({
          id: section.id,
          name: section.name,
          order: section.order,
          tasks: section.tasks.map((task) => ({
            id: task.id,
            section_id: section.id,
            title: task.title,
            description: task.description,
            assigned_to: task.assigned_to,
            due_date_relative: task.due_date_relative,
            order: task.order,
          })),
        }));

        setSections(localSections);
      }

      setIsDirty(false);
      setSuccessMessage('Template saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
      setIsDirty(false); // Clear dirty flag to prevent auto-save loop

      // Rollback on error - reload template
      loadTemplate();
    } finally {
      setSaving(false);
    }
  }, [sections, loadTemplate]);

  // Load template on mount
  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  /**
   * Add new section
   */
  const addSection = useCallback(() => {
    const newSection: LocalSection = {
      id: `temp-section-${Date.now()}`,
      name: '',
      order: sections.length,
      tasks: [],
      isNew: true,
    };

    setSections((prev) => [...prev, newSection]);
    setIsDirty(true);
  }, [sections.length]);

  /**
   * Update section name
   */
  const updateSectionName = useCallback((sectionId: string, newName: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, name: newName } : section
      )
    );
    setIsDirty(true);
  }, []);

  /**
   * Delete section
   */
  const deleteSection = useCallback((sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section and all its tasks?')) {
      return;
    }

    setSections((prev) => {
      const filtered = prev.filter((s) => s.id !== sectionId);
      // Reorder remaining sections
      return filtered.map((s, index) => ({ ...s, order: index }));
    });
    setIsDirty(true);
  }, []);

  /**
   * Add new task to section
   */
  const addTask = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId) {
          const newTask: LocalTask = {
            id: `temp-task-${Date.now()}`,
            section_id: sectionId,
            title: '',
            description: null,
            assigned_to: TaskAssignment.WEDDING_PLANNER,
            due_date_relative: null,
            order: section.tasks.length,
            isNew: true,
          };

          return {
            ...section,
            tasks: [...section.tasks, newTask],
          };
        }
        return section;
      })
    );
    setIsDirty(true);
  }, []);

  /**
   * Update task field
   */
  const updateTask = useCallback(
    (taskId: string, field: string, value: string | boolean | TaskAssignment | TaskStatus | null) => {
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          tasks: section.tasks.map((task) => {
            if (task.id === taskId) {
              // Validate relative date format
              if (field === 'due_date_relative' && value && typeof value === 'string') {
                if (!isValidRelativeDateFormat(value)) {
                  setError(`Invalid date format: ${value}. Use WEDDING_DATE, WEDDING_DATE-90, etc.`);
                  setTimeout(() => setError(null), 3000);
                  return task;
                }
              }

              return { ...task, [field]: value };
            }
            return task;
          }),
        }))
      );
      setIsDirty(true);
    },
    []
  );

  /**
   * Delete task
   */
  const deleteTask = useCallback((taskId: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        tasks: section.tasks.filter((t) => t.id !== taskId).map((t, index) => ({ ...t, order: index })),
      }))
    );
    setIsDirty(true);
  }, []);

  /**
   * Section drag-and-drop handlers
   */
  const handleSectionDragStart = useCallback((sectionId: string) => {
    setDraggedSection(sectionId);
  }, []);

  const handleSectionDragEnd = useCallback(() => {
    setDraggedSection(null);
  }, []);

  const handleSectionDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleSectionDrop = useCallback(
    (targetSectionId: string) => {
      if (!draggedSection || draggedSection === targetSectionId) return;

      setSections((prev) => {
        const draggedIndex = prev.findIndex((s) => s.id === draggedSection);
        const targetIndex = prev.findIndex((s) => s.id === targetSectionId);

        if (draggedIndex === -1 || targetIndex === -1) return prev;

        const newSections = [...prev];
        const [removed] = newSections.splice(draggedIndex, 1);
        newSections.splice(targetIndex, 0, removed);

        // Reorder
        return newSections.map((s, index) => ({ ...s, order: index }));
      });

      setIsDirty(true);
      setDraggedSection(null);
    },
    [draggedSection]
  );

  /**
   * Task drag-and-drop handlers
   */
  const handleTaskDragStart = useCallback((taskId: string) => {
    setDraggedTask(taskId);
  }, []);

  const handleTaskDragEnd = useCallback(() => {
    setDraggedTask(null);
  }, []);

  const handleTaskDrop = useCallback(
    (targetTaskId: string) => {
      if (!draggedTask || draggedTask === targetTaskId) return;

      setSections((prev) => {
        // Find sections containing dragged and target tasks
        let draggedSectionId: string | null = null;
        let targetSectionId: string | null = null;

        for (const section of prev) {
          if (section.tasks.some((t) => t.id === draggedTask)) {
            draggedSectionId = section.id;
          }
          if (section.tasks.some((t) => t.id === targetTaskId)) {
            targetSectionId = section.id;
          }
        }

        if (!draggedSectionId || !targetSectionId) return prev;

        return prev.map((section) => {
          // If both tasks are in the same section
          if (section.id === draggedSectionId && section.id === targetSectionId) {
            const draggedIndex = section.tasks.findIndex((t) => t.id === draggedTask);
            const targetIndex = section.tasks.findIndex((t) => t.id === targetTaskId);

            const newTasks = [...section.tasks];
            const [removed] = newTasks.splice(draggedIndex, 1);
            newTasks.splice(targetIndex, 0, removed);

            return {
              ...section,
              tasks: newTasks.map((t, index) => ({ ...t, order: index })),
            };
          }

          // If dragging to a different section
          if (section.id === draggedSectionId) {
            return {
              ...section,
              tasks: section.tasks
                .filter((t) => t.id !== draggedTask)
                .map((t, index) => ({ ...t, order: index })),
            };
          }

          if (section.id === targetSectionId) {
            const targetIndex = section.tasks.findIndex((t) => t.id === targetTaskId);
            const draggedTaskData = prev
              .find((s) => s.id === draggedSectionId)
              ?.tasks.find((t) => t.id === draggedTask);

            if (!draggedTaskData) return section;

            const newTasks = [...section.tasks];
            newTasks.splice(targetIndex, 0, { ...draggedTaskData, section_id: section.id });

            return {
              ...section,
              tasks: newTasks.map((t, index) => ({ ...t, order: index })),
            };
          }

          return section;
        });
      });

      setIsDirty(true);
      setDraggedTask(null);
    },
    [draggedTask]
  );

  /**
   * Export template to Excel
   */
  const exportToExcel = async () => {
    try {
      const response = await fetch('/api/planner/checklist-template/export');

      if (!response.ok) {
        throw new Error('Failed to export template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-template-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('Template exported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error exporting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to export template');
      setTimeout(() => setError(null), 3000);
    }
  };

  /**
   * Import template from Excel
   */
  const importFromExcel = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/planner/checklist-template/import', {
        method: 'POST',
        body: formData,
      });

      const data: APIResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to import template');
      }

      // Reload template after import
      await loadTemplate();

      setSuccessMessage('Template imported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error importing template:', err);
      setError(err instanceof Error ? err.message : 'Failed to import template');
      setTimeout(() => setError(null), 3000);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importFromExcel(file);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  /**
   * Manual save
   */
  const handleManualSave = () => {
    saveTemplate();
  };

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <WeddingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading template...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Checklist Template</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create your default checklist template. It will be copied to new weddings with dates converted.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Export Button */}
            <button
              type="button"
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
              aria-label="Export template to Excel file"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>

            {/* Import Button */}
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 cursor-pointer min-h-[44px]">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Import template from Excel file"
              />
            </label>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleManualSave}
              disabled={!isDirty || saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              aria-label={saving ? 'Saving template' : isDirty ? 'Save template now' : 'Template saved'}
              aria-live="polite"
            >
              {saving ? (
                <>
                  <WeddingSpinner size="sm" className="mr-2" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {isDirty ? 'Save Now' : 'Saved'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="assertive">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md" role="status" aria-live="polite">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {isDirty && !saving && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md" role="status" aria-live="polite">
            <p className="text-sm text-yellow-700">
              You have unsaved changes. Click &quot;Save Now&quot; to save your work.
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {sections.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No template yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first section.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Section
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sections */}
            {sections.map((section) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleSectionDragStart(section.id)}
                onDragEnd={handleSectionDragEnd}
                onDragOver={handleSectionDragOver}
                onDrop={() => handleSectionDrop(section.id)}
                className={`border rounded-lg ${
                  draggedSection === section.id ? 'opacity-50' : ''
                }`}
              >
                {/* Section Header */}
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="cursor-move text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      role="button"
                      tabIndex={0}
                      aria-label={`Drag to reorder section "${section.name}"`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                        }
                      }}
                    >
                      <span aria-hidden="true">⋮⋮</span>
                    </div>
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => updateSectionName(section.id, e.target.value)}
                      className="flex-1 px-3 py-2 text-lg font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      placeholder={t('fields.taskTitle') || 'Section name'}
                      aria-label="Section name"
                      aria-required="true"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addTask(section.id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
                      aria-label={`Add task to section "${section.name}"`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Task
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSection(section.id)}
                      className="inline-flex items-center p-2 border border-red-300 rounded-md shadow-sm text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[44px] min-w-[44px]"
                      aria-label={`Delete section "${section.name}"`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="sr-only">Delete</span>
                    </button>
                  </div>
                </div>

                {/* Section Tasks - Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto" role="region" aria-label={`Tasks in section ${section.name}`}>
                  {section.tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500" role="status">
                      No tasks in this section. Click &quot;Add Task&quot; to create one.
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200" role="table" aria-label={`Task list for ${section.name}`}>
                      <thead className="bg-gray-50">
                        <tr role="row">
                          <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10" role="columnheader">
                            {t('fields.drag') || 'Drag'}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]" role="columnheader">
                            {t('fields.title') || 'Title'}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[250px]" role="columnheader">
                            {t('fields.description') || 'Description'}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[150px]" role="columnheader">
                            {t('fields.assignedTo') || 'Assigned To'}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[180px]" role="columnheader">
                            {t('fields.dueDate') || 'Due Date (Relative)'}
                          </th>
                          <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-14" role="columnheader">
                            {t('fields.actions') || 'Actions'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {section.tasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            id={task.id}
                            title={task.title}
                            description={task.description}
                            assigned_to={task.assigned_to}
                            due_date={task.due_date_relative}
                            status={TaskStatus.PENDING}
                            completed={false}
                            order={task.order}
                            dateMode="relative"
                            showCheckbox={false}
                            showStatus={false}
                            onUpdate={updateTask}
                            onDelete={deleteTask}
                            onDragStart={handleTaskDragStart}
                            onDragEnd={handleTaskDragEnd}
                            onDragOver={handleSectionDragOver}
                            onDrop={handleTaskDrop}
                            isDragging={draggedTask === task.id}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section Tasks - Mobile Card View */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {section.tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No tasks in this section. Click &quot;Add Task&quot; to create one.
                    </div>
                  ) : (
                    section.tasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleTaskDragStart(task.id)}
                        onDragEnd={handleTaskDragEnd}
                        onDragOver={handleSectionDragOver}
                        onDrop={() => handleTaskDrop(task.id)}
                        className={`p-4 space-y-3 ${
                          draggedTask === task.id ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Drag Handle */}
                        <div className="flex items-center gap-2">
                          <div
                            className="cursor-move text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            role="button"
                            tabIndex={0}
                            aria-label="Drag to reorder task"
                          >
                            ⋮⋮
                          </div>
                          <div className="flex-1 font-medium text-gray-900">Task #{task.order + 1}</div>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            aria-label="Delete task"
                          >
                            🗑️
                          </button>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('fields.title') || 'Title'}
                          </label>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                            placeholder={t('fields.taskTitle') || 'Task title'}
                          />
                        </div>

                        {/* Assigned To */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('fields.assignedTo') || 'Assigned To'}
                          </label>
                          <select
                            value={task.assigned_to}
                            onChange={(e) => updateTask(task.id, 'assigned_to', e.target.value as TaskAssignment)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                          >
                            <option value={TaskAssignment.WEDDING_PLANNER}>{t('assignment.weddingPlanner') || 'Wedding Planner'}</option>
                            <option value={TaskAssignment.COUPLE}>{t('assignment.couple') || 'Couple'}</option>
                            <option value={TaskAssignment.OTHER}>{t('assignment.other') || 'Other'}</option>
                          </select>
                        </div>

                        {/* Due Date (Relative) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('fields.dueDate') || 'Due Date (Relative)'}
                          </label>
                          <input
                            type="text"
                            value={task.due_date_relative || ''}
                            onChange={(e) => updateTask(task.id, 'due_date_relative', e.target.value || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                            placeholder={t('fields.dueDatePlaceholder') || 'e.g., WEDDING_DATE-90'}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            {t('fields.dueDateExamples') || 'Examples: WEDDING_DATE, WEDDING_DATE-90, WEDDING_DATE+7'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {/* Add Section Button */}
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Section
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
