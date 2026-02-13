/**
 * Discrete Loading Spinner
 * A clean, minimal grayscale spinner for loading states
 */

'use client';

interface WeddingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function WeddingSpinner({ size = 'md', className = '' }: WeddingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const borderWidthClasses = {
    sm: 'border-2',
    md: 'border-3',
    lg: 'border-4',
  };

  const centerDotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Spinning ring */}
      <div
        className={`rounded-full ${sizeClasses[size]} ${borderWidthClasses[size]} border-gray-200 border-t-gray-600 animate-spin`}
        style={{ animationDuration: '0.8s' }}
      />
      {/* Subtle center dot (represents a diamond) */}
      <div className={`absolute ${centerDotSize[size]} rounded-full bg-gray-400`} />
    </div>
  );
}
