'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface VideoHeroProps {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

const VIDEOS = [
  'https://v4cxderyhhfml6js.public.blob.vercel-storage.com/background2.mp4',
  'https://v4cxderyhhfml6js.public.blob.vercel-storage.com/background1.mp4',
];

export default function VideoHero({
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
}: VideoHeroProps) {
  const [currentVideo, setCurrentVideo] = useState(0);

  useEffect(() => {
    // Alternar entre los dos vídeos cada 15 segundos para dar tiempo a verlos
    const timer = setInterval(() => {
      setCurrentVideo((prev) => (prev === 0 ? 1 : 0));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[90vh] md:h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background Videos */}
      <div className="absolute inset-0 z-0">
        {VIDEOS.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 h-full w-full transition-opacity duration-[2000ms] ease-in-out ${
              currentVideo === index ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            >
              <source src={src} type="video/mp4" />
            </video>
          </div>
        ))}
      </div>

      {/* Overlay - Color corporativo #eabec3 con 30% opacidad */}
      <div 
        className="absolute inset-0 z-10"
        style={{ backgroundColor: 'rgba(234, 190, 195, 0.3)' }}
      />
      
      {/* Darker overlay for better text contrast */}
      <div className="absolute inset-0 z-10 bg-black/40" />

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 font-playfair drop-shadow-lg leading-tight">
            {title}
          </h1>
          <p className="text-xl md:text-2xl mb-12 font-light drop-shadow-md text-white/95 leading-relaxed">
            {subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              href="/contact"
              className="w-full sm:w-auto px-10 py-4 bg-white text-rose-600 rounded-full text-lg font-bold shadow-2xl hover:scale-105 transition-all duration-300 hover:bg-gray-50 flex items-center justify-center"
            >
              {ctaPrimary}
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            
            <a
              href="#features"
              className="w-full sm:w-auto px-10 py-4 bg-transparent border-2 border-white text-white rounded-full text-lg font-bold backdrop-blur-sm hover:bg-white/20 hover:scale-105 transition-all duration-300 flex items-center justify-center"
            >
              {ctaSecondary}
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce hidden md:block">
        <a href="#features" className="text-white opacity-80 hover:opacity-100 transition-opacity">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
