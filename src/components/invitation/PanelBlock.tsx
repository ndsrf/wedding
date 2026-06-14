'use client';

import type React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import type { PanelBlock as PanelBlockType, SupportedLanguage } from '@/types/invitation-template';

interface PanelModalProps {
  block: PanelBlockType;
  language: SupportedLanguage;
  onClose: () => void;
}

/** Ornate SVG frame border — renders as an absolutely-positioned overlay around the panel content */
function OrnateFrame({ color }: { color: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 300"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main border rect */}
      <rect x="8" y="8" width="384" height="284" rx="4" ry="4"
        fill="none" stroke={color} strokeWidth="1.5" />
      {/* Inner rect */}
      <rect x="16" y="16" width="368" height="268" rx="2" ry="2"
        fill="none" stroke={color} strokeWidth="0.75" />

      {/* Corner flourish — top-left */}
      <g transform="translate(8,8)" stroke={color} fill="none" strokeWidth="1.2">
        <path d="M0,20 Q0,0 20,0" />
        <circle cx="0" cy="0" r="3" fill={color} stroke="none" />
        <path d="M5,0 L0,5 M0,10 L10,0" strokeWidth="0.6" />
      </g>
      {/* Corner flourish — top-right */}
      <g transform="translate(392,8)" stroke={color} fill="none" strokeWidth="1.2">
        <path d="M0,20 Q0,0 -20,0" />
        <circle cx="0" cy="0" r="3" fill={color} stroke="none" />
        <path d="M-5,0 L0,5 M0,10 L-10,0" strokeWidth="0.6" />
      </g>
      {/* Corner flourish — bottom-left */}
      <g transform="translate(8,292)" stroke={color} fill="none" strokeWidth="1.2">
        <path d="M0,-20 Q0,0 20,0" />
        <circle cx="0" cy="0" r="3" fill={color} stroke="none" />
        <path d="M5,0 L0,-5 M0,-10 L10,0" strokeWidth="0.6" />
      </g>
      {/* Corner flourish — bottom-right */}
      <g transform="translate(392,292)" stroke={color} fill="none" strokeWidth="1.2">
        <path d="M0,-20 Q0,0 -20,0" />
        <circle cx="0" cy="0" r="3" fill={color} stroke="none" />
        <path d="M-5,0 L0,-5 M0,-10 L-10,0" strokeWidth="0.6" />
      </g>

      {/* Side decorative lines */}
      <line x1="8" y1="40" x2="8" y2="260" stroke={color} strokeWidth="0.5" strokeDasharray="2,4" />
      <line x1="392" y1="40" x2="392" y2="260" stroke={color} strokeWidth="0.5" strokeDasharray="2,4" />
      <line x1="40" y1="8" x2="360" y2="8" stroke={color} strokeWidth="0.5" strokeDasharray="2,4" />
      <line x1="40" y1="292" x2="360" y2="292" stroke={color} strokeWidth="0.5" strokeDasharray="2,4" />

      {/* Center top ornament */}
      <g transform="translate(200,8)" stroke={color} fill={color} strokeWidth="0.8">
        <path d="M-12,0 Q-6,-8 0,-5 Q6,-8 12,0" fill="none" />
        <circle cx="0" cy="-5" r="1.5" />
      </g>
      {/* Center bottom ornament */}
      <g transform="translate(200,292)" stroke={color} fill={color} strokeWidth="0.8">
        <path d="M-12,0 Q-6,8 0,5 Q6,8 12,0" fill="none" />
        <circle cx="0" cy="5" r="1.5" />
      </g>

      {/* Leaf sprigs at bottom corners */}
      <g transform="translate(60,280)" stroke={color} fill="none" strokeWidth="0.8">
        <path d="M0,0 Q-8,-6 -12,-2" />
        <path d="M0,0 Q-5,-10 -2,-14" />
        <path d="M0,0 Q4,-8 8,-6" />
      </g>
      <g transform="translate(340,280)" stroke={color} fill="none" strokeWidth="0.8">
        <path d="M0,0 Q8,-6 12,-2" />
        <path d="M0,0 Q5,-10 2,-14" />
        <path d="M0,0 Q-4,-8 -8,-6" />
      </g>
    </svg>
  );
}

export function PanelModal({ block, language, onClose }: PanelModalProps) {
  const title = block.title[language] || block.title['EN'] || '';
  const rawContent = block.content[language] || block.content['EN'] || '';
  const safeContent = DOMPurify.sanitize(rawContent);
  const { backgroundColor, backgroundImage, backgroundSize, textColor, borderColor, borderStyle, fontFamily } = block.style;

  const cardStyle: React.CSSProperties = backgroundImage
    ? (backgroundSize ?? 'cover') === 'tile'
      ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'auto', backgroundRepeat: 'repeat', backgroundPosition: 'top left', color: textColor, fontFamily }
      : { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', color: textColor, fontFamily }
    : { backgroundColor, color: textColor, fontFamily };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      {/* Panel card */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {borderStyle === 'frame' && <OrnateFrame color={borderColor} />}

        <div className="relative z-10 p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-xl leading-none opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: textColor }}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Title */}
          {title && (
            <h2
              className="text-2xl font-semibold text-center mb-1"
              style={{ color: textColor, fontFamily }}
            >
              {title}
            </h2>
          )}

          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-3 my-3">
            <div className="h-px w-12" style={{ backgroundColor: borderColor }} />
            <span style={{ color: borderColor }}>♥</span>
            <div className="h-px w-12" style={{ backgroundColor: borderColor }} />
          </div>

          {/* Content */}
          <div
            className="text-sm leading-relaxed text-center"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />
        </div>
      </div>
    </div>
  );
}
