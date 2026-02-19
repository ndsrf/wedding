/**
 * WhatsAppMessageBubble
 *
 * Renders an incoming WhatsApp guest message and the optional AI reply
 * in two colour-coded bubbles. Long messages are truncated to `maxLength`
 * characters and can be expanded inline with a toggle button.
 *
 * Used by both NotificationList and GuestTimelineModal so the rendering
 * stays consistent across the admin UI.
 */

'use client';

import React, { useState } from 'react';

const TRUNCATE_LENGTH = 120;

interface BubbleProps {
  text: string;
  colorClass: string;
  label: string;
  maxLength?: number;
}

function Bubble({ text, colorClass, label, maxLength = TRUNCATE_LENGTH }: BubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = text.length > maxLength;
  const displayed = expanded || !isTruncated ? text : text.slice(0, maxLength);

  return (
    <div className={`mt-1 rounded px-2 py-1 border text-xs text-gray-700 ${colorClass}`}>
      <p className="font-medium mb-0.5 opacity-60 uppercase tracking-wide" style={{ fontSize: '0.65rem' }}>
        {label}
      </p>
      <p className="whitespace-pre-wrap break-words">
        {displayed}
        {isTruncated && !expanded && (
          <span className="text-gray-400">…</span>
        )}
      </p>
      {isTruncated && (
        <button
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setExpanded((v: boolean) => !v); }}
          className="mt-1 text-gray-500 hover:text-gray-700 underline"
          style={{ fontSize: '0.65rem' }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

interface WhatsAppMessageBubbleProps {
  /** The guest's incoming message */
  message: string;
  /** The AI-generated reply, if available */
  aiReply?: string | null;
  /** Max chars before truncation (default 120) */
  maxLength?: number;
  /** Label shown above the guest message bubble */
  messageLabel?: string;
  /** Label shown above the AI reply bubble */
  replyLabel?: string;
}

export function WhatsAppMessageBubble({
  message,
  aiReply,
  maxLength = TRUNCATE_LENGTH,
  messageLabel = 'Guest',
  replyLabel = 'AI Reply',
}: WhatsAppMessageBubbleProps) {
  return (
    <div className="space-y-1">
      <Bubble
        text={message}
        colorClass="bg-violet-50 border-violet-100"
        label={messageLabel}
        maxLength={maxLength}
      />
      {aiReply && (
        <Bubble
          text={aiReply}
          colorClass="bg-sky-50 border-sky-100"
          label={replyLabel}
          maxLength={maxLength}
        />
      )}
    </div>
  );
}
