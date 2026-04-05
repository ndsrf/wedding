'use client';

import { useState } from 'react';
import type { StatsFilterType, StatsFilterValue } from '@/lib/stats-filter';

export type { StatsFilterType, StatsFilterValue };

export interface StatsDateFilterLabels {
  all: string;
  thisYear: string;
  thisMonth: string;
  custom: string;
  from: string;
  to: string;
  apply: string;
}

interface StatsDateFilterProps {
  value: StatsFilterValue;
  onChange: (filter: StatsFilterValue) => void;
  labels: StatsDateFilterLabels;
}

export function StatsDateFilter({ value, onChange, labels }: StatsDateFilterProps) {
  const [customStart, setCustomStart] = useState(value.startDate ?? '');
  const [customEnd, setCustomEnd] = useState(value.endDate ?? '');

  const options: { key: StatsFilterType; label: string }[] = [
    { key: 'all', label: labels.all },
    { key: 'this_year', label: labels.thisYear },
    { key: 'this_month', label: labels.thisMonth },
    { key: 'custom', label: labels.custom },
  ];

  function handleTypeChange(type: StatsFilterType) {
    if (type === 'custom') {
      onChange({ type, startDate: customStart || undefined, endDate: customEnd || undefined });
    } else {
      onChange({ type });
    }
  }

  function handleApplyCustom() {
    onChange({ type: 'custom', startDate: customStart || undefined, endDate: customEnd || undefined });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleTypeChange(opt.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              value.type === opt.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value.type === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">{labels.from}</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-xs text-gray-700 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-300 bg-transparent"
              aria-label={labels.from}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">{labels.to}</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-xs text-gray-700 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-300 bg-transparent"
              aria-label={labels.to}
            />
          </div>
          <button
            onClick={handleApplyCustom}
            className="px-2.5 py-1 text-xs font-medium text-white bg-rose-500 rounded-md hover:bg-rose-600 transition-colors"
          >
            {labels.apply}
          </button>
        </div>
      )}
    </div>
  );
}
