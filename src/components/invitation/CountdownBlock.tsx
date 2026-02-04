'use client';

import { useState, useEffect } from 'react';

interface CountdownBlockProps {
  weddingDate: string;
  weddingTime?: string;
  style?: {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
    fontStyle?: 'normal' | 'italic';
    fontWeight?: 'normal' | 'bold';
    textDecoration?: 'none' | 'underline';
  };
}

/**
 * CountdownBlock - Displays countdown to wedding date
 *
 * Extracts countdown logic from EnvelopeReveal component.
 * Shows days, hours, minutes, and seconds remaining.
 *
 * @component
 */
export function CountdownBlock({ weddingDate, weddingTime, style }: CountdownBlockProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Countdown timer
  useEffect(() => {
    if (!weddingDate) return;

    const calculateTimeLeft = () => {
      // Handle both ISO string (YYYY-MM-DDTHH:mm:ss.sssZ) and simple date string (YYYY-MM-DD)
      const datePart = weddingDate.includes('T') ? weddingDate.split('T')[0] : weddingDate;
      const timePart = weddingTime ? weddingTime : '00:00';
      // Create date object treating the time as local to the user's browser
      const weddingDateTime = new Date(`${datePart}T${timePart}:00`);

      const now = new Date();
      const difference = weddingDateTime.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [weddingDate, weddingTime]);

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto text-center">

        <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
          {/* Days */}
          <div className="flex flex-col items-center">
            <div
              className="text-4xl md:text-5xl font-bold mb-2"
              style={{
                fontFamily: style?.fontFamily || 'var(--font-heading, serif)',
                fontSize: style?.fontSize || '2.25rem',
                color: style?.color || 'var(--color-accent, #D4AF37)',
                fontWeight: style?.fontWeight === 'bold' ? 'bold' : (style?.fontWeight ? style.fontWeight : 'bold'),
                fontStyle: style?.fontStyle || 'normal',
                textDecoration: style?.textDecoration || 'none',
              }}
            >
              {timeLeft.days}
            </div>
            <div className="text-sm md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Days
            </div>
          </div>

          {/* Hours */}
          <div className="flex flex-col items-center">
            <div
              className="text-4xl md:text-5xl font-bold mb-2"
              style={{
                fontFamily: style?.fontFamily || 'var(--font-heading, serif)',
                fontSize: style?.fontSize || '2.25rem',
                color: style?.color || 'var(--color-accent, #D4AF37)',
                fontWeight: style?.fontWeight === 'bold' ? 'bold' : (style?.fontWeight ? style.fontWeight : 'bold'),
                fontStyle: style?.fontStyle || 'normal',
                textDecoration: style?.textDecoration || 'none',
              }}
            >
              {timeLeft.hours}
            </div>
            <div className="text-sm md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Hours
            </div>
          </div>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <div
              className="text-4xl md:text-5xl font-bold mb-2"
              style={{
                fontFamily: style?.fontFamily || 'var(--font-heading, serif)',
                fontSize: style?.fontSize || '2.25rem',
                color: style?.color || 'var(--color-accent, #D4AF37)',
                fontWeight: style?.fontWeight === 'bold' ? 'bold' : (style?.fontWeight ? style.fontWeight : 'bold'),
                fontStyle: style?.fontStyle || 'normal',
                textDecoration: style?.textDecoration || 'none',
              }}
            >
              {timeLeft.minutes}
            </div>
            <div className="text-sm md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Minutes
            </div>
          </div>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <div
              className="text-4xl md:text-5xl font-bold mb-2"
              style={{
                fontFamily: style?.fontFamily || 'var(--font-heading, serif)',
                fontSize: style?.fontSize || '2.25rem',
                color: style?.color || 'var(--color-accent, #D4AF37)',
                fontWeight: style?.fontWeight === 'bold' ? 'bold' : (style?.fontWeight ? style.fontWeight : 'bold'),
                fontStyle: style?.fontStyle || 'normal',
                textDecoration: style?.textDecoration || 'none',
              }}
            >
              {timeLeft.seconds}
            </div>
            <div className="text-sm md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
