'use client';

import { useState, useEffect, useRef } from 'react';

const CDN = process.env.NEXT_PUBLIC_CDN_STORAGE ?? '';
const VIDEOS = [
  `${CDN}/background2.mp4`,
  `${CDN}/background1.mp4`,
];

// TODO: Replace with actual first-frame poster images extracted from each video
// (e.g. background2-poster.webp, background1-poster.webp) for a pixel-perfect
// initial paint. Until then, a dark-grey fill prevents a white flash on load.
const DARK_POSTER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';

export default function VideoBackground() {
  const [currentVideo, setCurrentVideo] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Play the current video, pause all others.
  // preload="none" means the browser won't fetch video data until we call load().
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === currentVideo) {
        video.load();
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [currentVideo]);

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
          {/* preload="none" defers all network requests until play() is called */}
          <video
            ref={(el) => { videoRefs.current[index] = el; }}
            muted
            loop
            playsInline
            preload="none"
            poster={DARK_POSTER}
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
