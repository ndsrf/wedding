'use client';

import { useEffect, useRef, useState } from 'react';

export function ArcadeEmbed() {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', paddingBottom: 'calc(52.734375% + 41px)', height: '0', width: '100%' }}
    >
      {visible ? (
        <iframe
          src="https://demo.arcade.software/TuUuS1WL6Tva8tH4EZSL?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
          title="Panel del wedding planner"
          frameBorder="0"
          allowFullScreen
          allow="clipboard-write"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', colorScheme: 'light' }}
        />
      ) : (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          className="animate-pulse bg-gray-100 rounded-2xl flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4 opacity-40">
            <div className="w-16 h-16 rounded-full bg-gray-300" />
            <div className="w-48 h-3 rounded-full bg-gray-300" />
            <div className="w-32 h-3 rounded-full bg-gray-300" />
          </div>
        </div>
      )}
    </div>
  );
}
