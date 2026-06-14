'use client';

import { useState, useEffect } from 'react';
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
  const baseSrc = typeof block.src === 'string'
    ? block.src
    : (block.src[language] || block.src['EN'] || Object.values(block.src).find(Boolean) || '');

  const [currentSrc, setCurrentSrc] = useState(baseSrc);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);

  // Update currentSrc if block.src changes (e.g. in editor)
  useEffect(() => {
    setCurrentSrc(baseSrc);
    setNextSrc(null);
    setIsFading(false);
  }, [baseSrc]);

  if (!currentSrc) return null;

  function handleHotspot(hotspot: ImageMapHotspot) {
    if (hotspot.action === 'open-panel' && hotspot.panelId) {
      onOpenPanel(hotspot.panelId);
    } else if (hotspot.action === 'scroll-to-rsvp') {
      onScrollToRsvp();
    } else if (hotspot.action === 'url' && hotspot.url) {
      window.open(hotspot.url, '_blank', 'noopener,noreferrer');
    } else if (hotspot.action === 'switch-image' && hotspot.targetImage) {
      const targetImage = hotspot.targetImage;
      if (hotspot.transition === 'fade') {
        setNextSrc(targetImage);
        // Small delay to allow DOM to render the next image with opacity 0
        setTimeout(() => {
          setIsFading(true);
        }, 20);

        // After transition duration, swap currentSrc and clean up
        setTimeout(() => {
          setCurrentSrc(targetImage);
          setNextSrc(null);
          setIsFading(false);
        }, 520);
      } else {
        setCurrentSrc(targetImage);
      }
    }
  }

  const containerClasses = block.fullScreen 
    ? "relative mx-auto flex justify-center bg-black/5" 
    : "relative w-full";

  const containerStyle = block.fullScreen
    ? { maxHeight: 'calc(100svh - 60px)', width: '100%' }
    : {};

  const imageClasses = block.fullScreen
    ? "max-w-full max-h-full w-auto h-auto block mx-auto"
    : "w-full h-auto block";

  const imageStyle = block.fullScreen
    ? { maxHeight: 'calc(100svh - 60px)', width: 'auto', height: 'auto' }
    : { width: '100%', height: 'auto' };

  return (
    <div className={containerClasses} style={containerStyle}>
      <div className={`relative ${block.fullScreen ? 'w-fit' : ''}`}>
        <Image
          src={currentSrc}
          alt={block.alt}
          width={0}
          height={0}
          sizes={block.fullScreen ? "100vh" : "100vw"}
          className={imageClasses}
          style={imageStyle}
          priority={isPriority}
          unoptimized
        />

        {/* Transitioning image overlay */}
        {nextSrc && (
          <div 
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionProperty: 'opacity' }}
          >
            <Image
              src={nextSrc}
              alt={block.alt}
              width={0}
              height={0}
              sizes={block.fullScreen ? "100vh" : "100vw"}
              className={imageClasses}
              style={imageStyle}
              unoptimized
            />
          </div>
        )}

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
    </div>
  );
}
