'use client';

import { useState, useEffect } from 'react';

const CDN = process.env.NEXT_PUBLIC_CDN_STORAGE ?? '';
const VIDEOS = [
  `${CDN}/background2.mp4`,
  `${CDN}/background1.mp4`,
];

export default function VideoBackground() {
  const [currentVideo, setCurrentVideo] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentVideo((prev) => (prev + 1) % VIDEOS.length);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      {VIDEOS.map((src, index) => (
        <div
          key={src}
          style={{ willChange: 'opacity' }}
          className={`absolute inset-0 h-full w-full transition-opacity duration-[2000ms] ease-in-out ${
            currentVideo === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            preload={index === 0 ? 'metadata' : 'none'}
            className="h-full w-full object-cover"
          >
            <source src={src.replace('.mp4', '.webm')} type="video/webm" />
            <source src={src} type="video/mp4" />
          </video>
        </div>
      ))}
    </div>
  );
}
