/**
 * Wedding-themed Loading Spinner
 * An elegant spinner with rotating hearts for wedding-related loading states
 */

'use client';

interface WeddingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function WeddingSpinner({ size = 'md', className = '' }: WeddingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const heartSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {/* Rotating ring with hearts */}
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
        {/* Top heart */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className={`${heartSizes[size]}`} style={{ color: '#f472b6' }}>💕</span>
        </div>
        {/* Right heart */}
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2">
          <span className={`${heartSizes[size]}`} style={{ color: '#ec4899' }}>💕</span>
        </div>
        {/* Bottom heart */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <span className={`${heartSizes[size]}`} style={{ color: '#f472b6' }}>💕</span>
        </div>
        {/* Left heart */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2">
          <span className={`${heartSizes[size]}`} style={{ color: '#ec4899' }}>💕</span>
        </div>
      </div>

      {/* Center ring */}
      <div className="absolute inset-0 flex items-center justify-center animate-pulse">
        <span className={`${heartSizes[size]}`} style={{ color: '#be185d' }}>💍</span>
      </div>
    </div>
  );
}
