'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import DOMPurify from 'isomorphic-dompurify';

/**
 * RichTextEditor Props
 */
export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
  ariaLabel?: string;
  maxLength?: number;
}

/**
 * Formatting button configuration
 */
interface FormatButton {
  command: string;
  icon: string;
  label: string;
  value?: string;
}

const FORMAT_BUTTONS: FormatButton[] = [
  { command: 'bold', icon: 'B', label: 'Bold' },
  { command: 'italic', icon: 'I', label: 'Italic' },
  { command: 'underline', icon: 'U', label: 'Underline' },
  { command: 'insertUnorderedList', icon: '•', label: 'Bullet List' },
  { command: 'insertOrderedList', icon: '1.', label: 'Numbered List' },
  { command: 'formatBlock', icon: 'H', label: 'Heading', value: 'h3' },
];

/**
 * RichTextEditor Component
 *
 * A WCAG 2.1 AA compliant rich text editor with formatting capabilities.
 * Features:
 * - Bold, italic, underline formatting
 * - Bullet and numbered lists
 * - Heading support
 * - URL support
 * - XSS prevention via DOMPurify sanitization
 * - Keyboard navigation (Ctrl+B, Ctrl+I, Ctrl+U)
 * - Touch-friendly buttons (≥44px)
 * - Mobile responsive design
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Enter text...',
  className = '',
  disabled = false,
  minHeight = '150px',
  ariaLabel = 'Rich text editor',
  maxLength,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      const sanitized = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [
          'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
      editorRef.current.innerHTML = sanitized;
    }
  }, [value]);

  /**
   * Handle content changes in the editor
   */
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });

      // Enforce maxLength if specified (check text content length)
      if (maxLength && editorRef.current.textContent && editorRef.current.textContent.length > maxLength) {
        // Don't update if exceeds max length
        return;
      }

      onChange(sanitized);
    }
  }, [onChange, maxLength]);

  /**
   * Execute a formatting command
   */
  const executeCommand = useCallback(
    (command: string, value?: string) => {
      if (disabled) return;

      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleInput();
    },
    [disabled, handleInput]
  );

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      // Ctrl+B for bold
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        executeCommand('bold');
      }
      // Ctrl+I for italic
      else if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        executeCommand('italic');
      }
      // Ctrl+U for underline
      else if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        executeCommand('underline');
      }
      // Ctrl+K for link
      else if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const url = window.prompt('Enter URL:');
        if (url) {
          executeCommand('createLink', url);
        }
      }
    },
    [disabled, executeCommand]
  );

  /**
   * Insert a link
   */
  const insertLink = useCallback(() => {
    if (disabled) return;

    const url = window.prompt('Enter URL:');
    if (url) {
      // Validate URL format
      try {
        new URL(url);
        executeCommand('createLink', url);
      } catch {
        alert('Please enter a valid URL (e.g., https://example.com)');
      }
    }
  }, [disabled, executeCommand]);

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div
        className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b"
        role="toolbar"
        aria-label="Text formatting toolbar"
      >
        {FORMAT_BUTTONS.map((button) => (
          <button
            key={button.command}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand(button.command, button.value);
            }}
            disabled={disabled}
            className={`
              min-w-[44px] min-h-[44px] px-3 py-2
              font-semibold text-sm
              bg-white border border-gray-300 rounded
              hover:bg-gray-100 active:bg-gray-200
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              transition-colors
              ${button.command === 'formatBlock' ? 'text-lg' : ''}
            `}
            aria-label={button.label}
            title={button.label}
          >
            {button.icon}
          </button>
        ))}

        {/* Link button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            insertLink();
          }}
          disabled={disabled}
          className={`
            min-w-[44px] min-h-[44px] px-3 py-2
            font-semibold text-sm
            bg-white border border-gray-300 rounded
            hover:bg-gray-100 active:bg-gray-200
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
            transition-colors
          `}
          aria-label="Insert Link"
          title="Insert Link (Ctrl+K)"
        >
          🔗
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        className={`
          p-4 outline-none overflow-auto
          prose prose-sm max-w-none
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''}
        `}
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        /* Ensure links are styled */
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
        }

        /* List styling */
        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        [contenteditable] li {
          margin: 0.25rem 0;
        }

        /* Heading styling */
        [contenteditable] h1,
        [contenteditable] h2,
        [contenteditable] h3 {
          font-weight: 600;
          margin: 0.5rem 0;
        }

        [contenteditable] h1 {
          font-size: 1.5rem;
        }

        [contenteditable] h2 {
          font-size: 1.25rem;
        }

        [contenteditable] h3 {
          font-size: 1.125rem;
        }

        /* Paragraph spacing */
        [contenteditable] p {
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}
