/**
 * Task Row Component
 *
 * Reusable task row component for grid display with inline editing.
 * Used by both template editor and wedding checklist editor.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { DatePicker } from './DatePicker';
import type { TaskAssignment, TaskStatus } from '@/types/checklist';
import { TaskAssignment as TaskAssignmentEnum, TaskStatus as TaskStatusEnum } from '@prisma/client';

interface TaskRowProps {
  id: string;
  title: string;
  description: string | null;
  assigned_to: TaskAssignment;
  due_date: string | null; // ISO date string or relative format
  status: TaskStatus;
  completed: boolean;
  order: number;
  section_name?: string;
  dateMode?: 'absolute' | 'relative';
  showCheckbox?: boolean;
  showStatus?: boolean;
  onUpdate: (
    id: string,
    field: string,
    value: string | boolean | TaskAssignment | TaskStatus | null
  ) => void;
  onDelete: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (id: string) => void;
  isDragging?: boolean;
  disabled?: boolean;
}

export function TaskRow({
  id,
  title,
  description,
  assigned_to,
  due_date,
  status,
  completed,
  section_name,
  dateMode = 'absolute',
  showCheckbox = true,
  showStatus = true,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
  disabled = false,
}: TaskRowProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState(title);

  // Sync localTitle when title prop changes
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleFieldClick = useCallback(
    (field: string) => {
      if (!disabled) {
        setEditingField(field);
      }
    },
    [disabled]
  );

  const handleFieldBlur = useCallback((field: string) => {
    setEditingField(null);
    // Commit title changes on blur
    if (field === 'title' && localTitle !== title) {
      onUpdate(id, 'title', localTitle);
    }
  }, [id, localTitle, title, onUpdate]);

  const handleUpdate = useCallback(
    (field: string, value: string | boolean | TaskAssignment | TaskStatus | null) => {
      onUpdate(id, field, value);
      // Don't close editing for description (rich text editor handles its own state)
      if (field !== 'description') {
        setEditingField(null);
      }
    },
    [id, onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, field: string) => {
      if (e.key === 'Enter' && field === 'title') {
        e.preventDefault();
        // Commit changes on Enter
        if (localTitle !== title) {
          onUpdate(id, 'title', localTitle);
        }
        setEditingField(null);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Revert changes on Escape
        setLocalTitle(title);
        setEditingField(null);
      }
    },
    [id, localTitle, title, onUpdate]
  );

  return (
    <tr
      draggable={!disabled}
      onDragStart={() => onDragStart?.(id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={() => onDrop?.(id)}
      className={`border-b hover:bg-gray-50 transition-colors ${isDragging ? 'opacity-50' : ''} ${
        disabled ? 'bg-gray-50' : ''
      }`}
      data-task-id={id}
      data-status={status.toLowerCase()}
      role="row"
      aria-label={`Task: ${title}`}
    >
      {/* Drag Handle */}
      <td className="px-2 py-2 text-center w-8 sm:w-10" role="cell">
        <div
          className={`cursor-move text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
          aria-label={`Drag to reorder task "${title}"`}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Screen reader announcement for keyboard users
            }
          }}
        >
          <span aria-hidden="true">⋮⋮</span>
        </div>
      </td>

      {/* Checkbox (completion status) */}
      {showCheckbox && (
        <td className="px-2 py-2 text-center w-12 sm:w-14" role="cell">
          <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => handleUpdate('completed', e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label={`Mark task "${title}" as ${completed ? 'incomplete' : 'complete'}`}
              aria-checked={completed}
            />
          </div>
        </td>
      )}

      {/* Section Name (read-only, for display) */}
      {section_name && (
        <td className="px-3 py-2 text-sm text-gray-600 hidden sm:table-cell" role="cell">
          <div className="truncate max-w-[120px]" title={section_name} aria-label={`Section: ${section_name}`}>
            {section_name}
          </div>
        </td>
      )}

      {/* Title */}
      <td className="px-3 py-2 min-w-[150px]" onClick={() => handleFieldClick('title')} role="cell">
        {editingField === 'title' ? (
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => handleFieldBlur('title')}
            onKeyDown={(e) => handleKeyDown(e, 'title')}
            autoFocus
            className="w-full min-h-[44px] px-3 py-2 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Task title"
            aria-required="true"
            maxLength={200}
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded min-h-[44px] flex items-center"
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={title ? `Task title: ${title}. Click to edit` : 'Click to add task title'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFieldClick('title');
              }
            }}
          >
            {title || <span className="text-gray-400">Click to add title</span>}
          </div>
        )}
      </td>

      {/* Description */}
      <td className="px-3 py-2 hidden md:table-cell" onClick={() => handleFieldClick('description')} role="cell">
        {editingField === 'description' ? (
          <RichTextEditor
            value={description || ''}
            onChange={(value) => handleUpdate('description', value)}
            onBlur={() => setEditingField(null)}
            placeholder="Add description..."
            maxLength={2000}
            disabled={disabled}
            className="min-w-[250px] sm:min-w-[300px]"
            minHeight="100px"
            ariaLabel="Task description"
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-gray-100 px-3 py-2 rounded min-h-[44px] max-w-[300px] line-clamp-2 flex items-center"
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={description ? `Task description: ${description.replace(/<[^>]*>/g, '')}. Click to edit` : 'Click to add task description'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFieldClick('description');
              }
            }}
            dangerouslySetInnerHTML={{
              __html: description || '<span class="text-gray-400">Click to add description</span>',
            }}
          />
        )}
      </td>

      {/* Assigned To */}
      <td className="px-3 py-2" role="cell">
        <select
          value={assigned_to}
          onChange={(e) => handleUpdate('assigned_to', e.target.value as TaskAssignment)}
          disabled={disabled}
          className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
          aria-label={`Assigned to: ${assigned_to}`}
          aria-required="true"
        >
          <option value={TaskAssignmentEnum.WEDDING_PLANNER}>Wedding Planner</option>
          <option value={TaskAssignmentEnum.COUPLE}>Couple</option>
          <option value={TaskAssignmentEnum.OTHER}>Other</option>
        </select>
      </td>

      {/* Due Date */}
      <td className="px-3 py-2" role="cell">
        <DatePicker
          value={due_date || ''}
          onChange={(value) => handleUpdate(dateMode === 'relative' ? 'due_date_relative' : 'due_date', value)}
          allowRelative={dateMode === 'relative'}
          disabled={disabled}
          placeholder={dateMode === 'relative' ? 'WEDDING_DATE-90' : 'Select date'}
          ariaLabel={`Due date${due_date ? ': ' + due_date : ''}`}
        />
      </td>

      {/* Status */}
      {showStatus && (
        <td className="px-3 py-2 hidden lg:table-cell" role="cell">
          <select
            value={status}
            onChange={(e) => handleUpdate('status', e.target.value as TaskStatus)}
            disabled={disabled}
            className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
            aria-label={`Status: ${status}`}
            aria-required="true"
          >
            <option value={TaskStatusEnum.PENDING}>Pending</option>
            <option value={TaskStatusEnum.IN_PROGRESS}>In Progress</option>
            <option value={TaskStatusEnum.COMPLETED}>Completed</option>
          </select>
        </td>
      )}

      {/* Actions */}
      <td className="px-2 py-2 text-center w-12 sm:w-14" role="cell">
        <button
          type="button"
          onClick={() => onDelete(id)}
          disabled={disabled}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label={`Delete task "${title}"`}
        >
          <span aria-hidden="true">🗑️</span>
          <span className="sr-only">Delete</span>
        </button>
      </td>
    </tr>
  );
}
