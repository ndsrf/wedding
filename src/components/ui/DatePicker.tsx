'use client';

import { useCallback, useState, useMemo, useEffect } from 'react';
import { isValidRelativeDateFormat } from '@/types/checklist';

/**
 * DatePicker Props
 */
export interface DatePickerProps {
  value: string; // Can be relative (WEDDING_DATE-90) or absolute (YYYY-MM-DD)
  onChange: (value: string) => void;
  allowRelative?: boolean; // Whether to allow relative date format
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
}

/**
 * DatePicker Component
 *
 * A flexible date picker supporting both absolute and relative date formats.
 * Features:
 * - Absolute date input (YYYY-MM-DD)
 * - Relative date input for templates (WEDDING_DATE-90, WEDDING_DATE+7)
 * - Date format validation
 * - Keyboard navigation
 * - Mobile responsive
 * - WCAG 2.1 AA compliant
 * - Touch-friendly (≥44px height)
 */
export function DatePicker({
  value,
  onChange,
  allowRelative = false,
  className = '',
  disabled = false,
  placeholder: _placeholder = 'Select date',
  ariaLabel = 'Date picker',
  required = false,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'absolute' | 'relative'>(() => {
    // If value exists and is relative format, use relative mode
    if (value && isValidRelativeDateFormat(value)) {
      return 'relative';
    }
    // If allowRelative is true and no value, default to relative mode
    if (allowRelative && !value) {
      return 'relative';
    }
    // Otherwise use absolute mode
    return 'absolute';
  });

  // Sync inputValue when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  /**
   * Validate date format
   */
  const validateDate = useCallback(
    (dateStr: string): { valid: boolean; error?: string } => {
      if (!dateStr) {
        return { valid: !required, error: required ? 'Date is required' : undefined };
      }

      // Check if it's a relative date format
      if (isValidRelativeDateFormat(dateStr)) {
        if (!allowRelative) {
          return { valid: false, error: 'Relative dates are not allowed' };
        }
        return { valid: true };
      }

      // Validate absolute date format (YYYY-MM-DD)
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(dateStr)) {
        return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD' };
      }

      // Check if it's a valid date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return { valid: false, error: 'Invalid date' };
      }

      // Check min/max constraints
      if (minDate) {
        const min = new Date(minDate);
        if (date < min) {
          return { valid: false, error: `Date must be after ${minDate}` };
        }
      }

      if (maxDate) {
        const max = new Date(maxDate);
        if (date > max) {
          return { valid: false, error: `Date must be before ${maxDate}` };
        }
      }

      return { valid: true };
    },
    [required, allowRelative, minDate, maxDate]
  );

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Clear error on input
      setError(null);

      // Validate and update
      const validation = validateDate(newValue);
      if (validation.valid) {
        onChange(newValue);
        setError(null);
      } else {
        setError(validation.error || null);
      }
    },
    [onChange, validateDate]
  );

  /**
   * Handle blur - validate final value
   */
  const handleBlur = useCallback(() => {
    const validation = validateDate(inputValue);
    if (!validation.valid) {
      setError(validation.error || 'Invalid date');
    }
  }, [inputValue, validateDate]);

  /**
   * Handle mode toggle
   */
  const handleModeToggle = useCallback(() => {
    const newMode = inputMode === 'absolute' ? 'relative' : 'absolute';
    setInputMode(newMode);
    setInputValue('');
    setError(null);
    onChange('');
  }, [inputMode, onChange]);

  /**
   * Generate placeholder based on mode
   */
  const dynamicPlaceholder = useMemo(() => {
    if (allowRelative && inputMode === 'relative') {
      return 'e.g., WEDDING_DATE-90';
    }
    return 'YYYY-MM-DD';
  }, [allowRelative, inputMode]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex gap-2">
        {/* Date Input */}
        {inputMode === 'absolute' ? (
          <input
            type="date"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            min={minDate}
            max={maxDate}
            aria-label={ariaLabel}
            aria-invalid={!!error}
            aria-describedby={error ? 'date-error' : undefined}
            className={`
              flex-1 min-h-[44px] px-3 py-2
              border rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-300'}
            `}
          />
        ) : (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            placeholder={dynamicPlaceholder}
            aria-label={ariaLabel}
            aria-invalid={!!error}
            aria-describedby={error ? 'date-error' : undefined}
            className={`
              flex-1 min-h-[44px] px-3 py-2
              border rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-300'}
            `}
          />
        )}

        {/* Mode Toggle Button */}
        {allowRelative && (
          <button
            type="button"
            onClick={handleModeToggle}
            disabled={disabled}
            className="
              min-w-[44px] min-h-[44px] px-3
              text-sm font-medium
              bg-gray-100 border border-gray-300 rounded-md
              hover:bg-gray-200 active:bg-gray-300
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              transition-colors
              whitespace-nowrap
            "
            aria-label={`Switch to ${inputMode === 'absolute' ? 'relative' : 'absolute'} date mode`}
            title={`Switch to ${inputMode === 'absolute' ? 'relative' : 'absolute'} date`}
          >
            {inputMode === 'absolute' ? '📅→⏱️' : '⏱️→📅'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p
          id="date-error"
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Helper Text */}
      {allowRelative && inputMode === 'relative' && !error && (
        <p className="text-xs text-gray-500">
          Examples: WEDDING_DATE, WEDDING_DATE-90 (90 days before), WEDDING_DATE+7 (7 days after)
        </p>
      )}
    </div>
  );
}

/**
 * Parse relative date string
 * Returns the offset in days from the wedding date
 */
export function parseRelativeDate(dateStr: string): number | null {
  if (!isValidRelativeDateFormat(dateStr)) {
    return null;
  }

  if (dateStr === 'WEDDING_DATE') {
    return 0;
  }

  const match = dateStr.match(/^WEDDING_DATE([+-])(\d+)$/);
  if (!match) {
    return null;
  }

  const sign = match[1] === '+' ? 1 : -1;
  const days = parseInt(match[2], 10);

  return sign * days;
}

/**
 * Convert relative date to absolute date
 */
export function relativeToAbsoluteDate(
  relativeDate: string,
  weddingDate: Date
): Date | null {
  const offset = parseRelativeDate(relativeDate);
  if (offset === null) {
    return null;
  }

  const absoluteDate = new Date(weddingDate);
  absoluteDate.setDate(absoluteDate.getDate() + offset);

  return absoluteDate;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
