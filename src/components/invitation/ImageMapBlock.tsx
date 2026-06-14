'use client';

import Image from 'next/image';
import type { ImageMapBlock as ImageMapBlockType, ImageMapHotspot, SupportedLanguage } from '@/types/invitation-template';

interface ImageMapBlockProps {
  block: ImageMapBlockType;
  language: SupportedLanguage;
  onOpenPanel: (panelId: string) => void;
  onScrollToRsvp: () => void;
  isPriority?: boolean;
}

export function ImageMapBlock({ block, language, onOpenPanel, onScrollToRsvp, isPriority = false }: ImageMapBlockProps) {
  const src = typeof block.src === 'string'
    ? block.src
    : (block.src[language] || block.src['EN'] || Object.values(block.src).find(Boolean) || '');

  if (!src) return null;

  function handleHotspot(hotspot: ImageMapHotspot) {
    if (hotspot.action === 'open-panel' && hotspot.panelId) {
      onOpenPanel(hotspot.panelId);
    } else if (hotspot.action === 'scroll-to-rsvp') {
      onScrollToRsvp();
    } else if (hotspot.action === 'url' && hotspot.url) {
      window.open(hotspot.url, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className="relative w-full">
      <Image
        src={src}
        alt={block.alt}
        width={0}
        height={0}
        sizes="100vw"
        className="w-full h-auto block"
        style={{ width: '100%', height: 'auto' }}
        priority={isPriority}
        unoptimized
      />
      {block.hotspots.map((hotspot) => {
        const label = hotspot.label
          ? (hotspot.label[language] || hotspot.label['EN'] || '')
          : '';
        return (
          <button
            key={hotspot.id}
            className="absolute cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{
              top: `${hotspot.top}%`,
              left: `${hotspot.left}%`,
              width: `${hotspot.width}%`,
              height: `${hotspot.height}%`,
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            onClick={() => handleHotspot(hotspot)}
            aria-label={label || hotspot.action}
          >
            {label && (
              <span className="sr-only">{label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
