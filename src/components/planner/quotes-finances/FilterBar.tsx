'use client';

import { useState, useRef, useEffect } from 'react';

interface StatusOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  nameValue: string;
  onNameChange: (value: string) => void;
  namePlaceholder?: string;
  statusOptions: StatusOption[];
  selectedStatuses: string[];
  onStatusChange: (statuses: string[]) => void;
  statusLabel: string;
  clearFiltersLabel: string;
}

export function FilterBar({
  nameValue,
  onNameChange,
  namePlaceholder = 'Search by name…',
  statusOptions,
  selectedStatuses,
  onStatusChange,
  statusLabel = 'Status',
  clearFiltersLabel = 'Clear filters',
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function toggleStatus(value: string) {
    if (selectedStatuses.includes(value)) {
      onStatusChange(selectedStatuses.filter((s) => s !== value));
    } else {
      onStatusChange([...selectedStatuses, value]);
    }
  }

  const hasFilters = nameValue.length > 0 || selectedStatuses.length > 0;

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {/* Name search */}
      <div className="relative flex-1 min-w-40">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          type="text"
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
        />
      </div>

      {/* Status multi-select */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors whitespace-nowrap ${
            selectedStatuses.length > 0
              ? 'border-rose-300 bg-rose-50 text-rose-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          {statusLabel}
          {selectedStatuses.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold bg-rose-500 text-white rounded-full">
              {selectedStatuses.length}
            </span>
          )}
          <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-40">
            {statusOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(opt.value)}
                  onChange={() => toggleStatus(opt.value)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-rose-500 focus:ring-rose-300"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => { onNameChange(''); onStatusChange([]); }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
        >
          {clearFiltersLabel}
        </button>
      )}
    </div>
  );
}
