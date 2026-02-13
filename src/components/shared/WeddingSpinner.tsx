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

  return (
    <div
      className={`inline-block rounded-full ${sizeClasses[size]} ${borderWidthClasses[size]} border-gray-200 border-t-gray-600 animate-spin ${className}`}
      style={{ animationDuration: '0.8s' }}
    />
  );
}
