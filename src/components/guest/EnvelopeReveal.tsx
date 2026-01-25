'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface EnvelopeRevealProps {
  children: React.ReactNode;
  coupleNames: string;
  weddingDate?: string;
  weddingTime?: string;
  location?: string;
  additionalInfo?: string;
}

/**
 * EnvelopeReveal - Interactive envelope animation for Garden Birds template
 *
 * Displays an elegant envelope that opens with animation to reveal
 * the wedding details and RSVP form when clicked.
 *
 * @component
 */
export function EnvelopeReveal({ children, coupleNames, weddingDate, weddingTime, location, additionalInfo }: EnvelopeRevealProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const t = useTranslations('guest.gardenBirds');

  const handleOpen = () => {
    setIsOpen(true);
  };

  // Parse couple names (handle formats like "Mar & Jaume", "Mar y Jaume", "Mar and Jaume")
  const getCoupleNamesArray = () => {
    const separators = [' & ', ' y ', ' and ', ' e '];
    for (const sep of separators) {
      if (coupleNames.includes(sep)) {
        return coupleNames.split(sep);
      }
    }
    // Fallback: split by space and take first and last
    const parts = coupleNames.split(' ');
    if (parts.length >= 2) {
      return [parts[0], parts[parts.length - 1]];
    }
    return [coupleNames, ''];
  };

  const [firstName, secondName] = getCoupleNamesArray();

  // Format wedding date nicely
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Countdown timer
  useEffect(() => {
    if (!weddingDate) return;

    const calculateTimeLeft = () => {
      const weddingDateTime = new Date(weddingDate + (weddingTime ? `T${weddingTime}` : 'T00:00:00'));
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
    <>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(-5px); }
          50% { transform: translateY(5px); }
        }

        @keyframes floatReverse {
          0%, 100% { transform: translateY(5px); }
          50% { transform: translateY(-5px); }
        }

        @keyframes rotate {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }

        @keyframes rotateReverse {
          0%, 100% { transform: rotate(5deg); }
          50% { transform: rotate(-5deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        @keyframes pulseFast {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 4px 12px rgba(232, 184, 109, 0.4); }
          50% { box-shadow: 0 6px 20px rgba(232, 184, 109, 0.6); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.1); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(10px); }
        }

        .bird-1 { animation: float 3s ease-in-out infinite; }
        .bird-2 { animation: floatReverse 2.5s ease-in-out infinite; animation-delay: 0.5s; }
        .leaf-1 { animation: rotate 2s ease-in-out infinite; }
        .leaf-2 { animation: rotateReverse 2.5s ease-in-out infinite; animation-delay: 0.3s; }
        .pulse-text { animation: pulse 2s ease-in-out infinite; }
        .pulse-cta { animation: pulseFast 1.5s ease-in-out infinite; }
        .glow { animation: glow 2s ease-in-out infinite; }
        .envelope-enter { animation: fadeIn 0.5s ease-out; }
        .envelope-exit { animation: fadeOut 0.5s ease-out; }
        .content-enter { animation: slideUp 0.6s ease-out; }
        .header-enter { animation: slideDown 0.5s ease-out 0.3s both; }
        .footer-enter { animation: slideDown 0.5s ease-out 0.7s both; }
        .bounce-arrow { animation: bounce 2s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center p-4">
        {!isOpen ? (
          <div
            className="relative cursor-pointer envelope-enter hover:scale-105 transition-transform duration-200"
            onClick={handleOpen}
          >
            {/* Envelope Container */}
            <div className="relative w-[350px] h-[250px] md:w-[450px] md:h-[320px]">
              {/* Decorative birds and leaves */}
              <div className="absolute -top-12 -left-8 text-4xl bird-1">
                🐦
              </div>
              <div className="absolute -top-8 -right-6 text-3xl bird-2">
                🕊️
              </div>
              <div className="absolute -bottom-6 -left-4 text-3xl leaf-1">
                🍃
              </div>
              <div className="absolute -bottom-4 -right-6 text-2xl leaf-2">
                🌿
              </div>

              {/* Main Envelope Body */}
              <div
                className="absolute inset-0 rounded-lg shadow-2xl"
                style={{
                  background: 'linear-gradient(to bottom, #F5F1E8 0%, #EBE5D8 100%)',
                  border: '2px solid #D4C9B8',
                }}
              >
                {/* Envelope Flap (back) */}
                <div
                  className="absolute top-0 left-0 right-0 h-[50%]"
                  style={{
                    background: 'linear-gradient(to bottom, #E8DFD0 0%, #D9CFC0 100%)',
                    clipPath: 'polygon(0 0, 50% 70%, 100% 0)',
                    borderBottom: '1px solid #C9B8A8',
                  }}
                />

                {/* Wax Seal */}
                <div
                  className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full shadow-lg flex items-center justify-center glow hover:scale-110 transition-transform duration-200"
                  style={{
                    background: 'radial-gradient(circle, #E8B86D 0%, #D4A359 100%)',
                    border: '2px solid #C09647',
                  }}
                >
                  <div className="text-center">
                    <div className="text-white text-2xl mb-1">💌</div>
                  </div>
                </div>

                {/* Couple Names on Envelope */}
                <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                  <p
                    className="font-serif text-lg md:text-xl pulse-text"
                    style={{ color: '#6B8E6F', fontFamily: 'var(--font-heading, Crimson Text, serif)' }}
                  >
                    {coupleNames}
                  </p>
                </div>

                {/* Click to Open Text */}
                <div className="absolute bottom-2 left-0 right-0 text-center pulse-cta">
                  <p className="text-sm md:text-base" style={{ color: '#6E7F70' }}>
                    {t('tapToOpen')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full content-enter">
            {/* Hero Welcome Section */}
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12 header-enter">
              {/* Decorative string lights */}
              <div className="flex justify-center items-center gap-3 mb-8">
                <span className="text-2xl">💡</span>
                <span className="text-xl">💡</span>
                <span className="text-2xl">💡</span>
                <span className="text-xl">💡</span>
                <span className="text-2xl">💡</span>
              </div>

              {/* Birds decorations */}
              <div className="flex justify-center items-center gap-6 mb-6">
                <span className="text-3xl bird-1">🐦</span>
                <div className="flex gap-2">
                  <span className="text-2xl leaf-1">🌿</span>
                  <span className="text-2xl">🍃</span>
                  <span className="text-2xl leaf-2">🌿</span>
                </div>
                <span className="text-3xl bird-2">🕊️</span>
              </div>

              {/* Main heading */}
              <h1 className="text-sm uppercase tracking-widest mb-6" style={{
                color: 'var(--color-text-secondary, #6E7F70)',
                fontFamily: 'var(--font-body, serif)',
                letterSpacing: '0.3em'
              }}>
                {t('weAreGettingMarried')}
              </h1>

              {/* Couple names */}
              <div className="mb-8">
                <h2 className="text-5xl md:text-7xl mb-4" style={{
                  fontFamily: 'var(--font-heading, Crimson Text, serif)',
                  color: 'var(--color-primary, #6B8E6F)',
                  fontWeight: 400,
                  fontStyle: 'italic'
                }}>
                  {firstName}
                </h2>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="h-px w-12 bg-current" style={{ color: 'var(--color-accent, #E8B86D)' }}></div>
                  <span className="text-3xl" style={{ color: 'var(--color-accent, #E8B86D)' }}>✦</span>
                  <div className="h-px w-12 bg-current" style={{ color: 'var(--color-accent, #E8B86D)' }}></div>
                </div>
                <h2 className="text-5xl md:text-7xl" style={{
                  fontFamily: 'var(--font-heading, Crimson Text, serif)',
                  color: 'var(--color-primary, #6B8E6F)',
                  fontWeight: 400,
                  fontStyle: 'italic'
                }}>
                  {secondName}
                </h2>
              </div>

              {/* Decorative fountain element */}
              <div className="mb-6">
                <div className="text-4xl mb-2">⛲</div>
                <div className="flex gap-2 justify-center mb-4">
                  <span className="text-xl">🌸</span>
                  <span className="text-xl">🌺</span>
                  <span className="text-xl">🌸</span>
                </div>
              </div>

              {/* Wedding Date */}
              {weddingDate && (
                <div className="mb-8">
                  <p className="text-xl md:text-2xl" style={{
                    fontFamily: 'var(--font-body, serif)',
                    color: 'var(--color-text, #3A4F3C)',
                    fontStyle: 'italic'
                  }}>
                    {formatDate(weddingDate)}
                  </p>
                </div>
              )}

              {/* Scroll indicator */}
              <div className="mt-12">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm pulse-cta" style={{ color: 'var(--color-text-secondary, #6E7F70)' }}>
                    {t('scrollForDetails')}
                  </p>
                  <div className="text-2xl bounce-arrow">↓</div>
                </div>
              </div>
            </div>

            {/* Countdown Section */}
            {weddingDate && (
              <div className="py-16 px-4" style={{ background: 'linear-gradient(to bottom, #8B9B7E 0%, #7A8B6E 100%)' }}>
                <div className="max-w-4xl mx-auto text-center">
                  <h2 className="text-3xl md:text-4xl mb-4" style={{
                    fontFamily: 'var(--font-heading, Crimson Text, serif)',
                    color: '#F5F1E8',
                    fontStyle: 'italic'
                  }}>
                    {t('countdown')}
                  </h2>
                  <p className="text-lg mb-8" style={{ color: '#E8E4D8' }}>
                    {t('countdownSubtitle')}
                  </p>

                  {/* Countdown Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                    <div className="backdrop-blur-sm rounded-lg p-6" style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="text-5xl md:text-6xl font-bold mb-2" style={{ color: '#F5F1E8' }}>
                        {timeLeft.days}
                      </div>
                      <div className="text-sm uppercase tracking-widest" style={{ color: '#E8E4D8' }}>
                        {t('days')}
                      </div>
                    </div>
                    <div className="backdrop-blur-sm rounded-lg p-6" style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="text-5xl md:text-6xl font-bold mb-2" style={{ color: '#F5F1E8' }}>
                        {timeLeft.hours}
                      </div>
                      <div className="text-sm uppercase tracking-widest" style={{ color: '#E8E4D8' }}>
                        {t('hours')}
                      </div>
                    </div>
                    <div className="backdrop-blur-sm rounded-lg p-6" style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="text-5xl md:text-6xl font-bold mb-2" style={{ color: '#F5F1E8' }}>
                        {timeLeft.minutes}
                      </div>
                      <div className="text-sm uppercase tracking-widest" style={{ color: '#E8E4D8' }}>
                        {t('minutes')}
                      </div>
                    </div>
                    <div className="backdrop-blur-sm rounded-lg p-6" style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="text-5xl md:text-6xl font-bold mb-2" style={{ color: '#F5F1E8' }}>
                        {timeLeft.seconds}
                      </div>
                      <div className="text-sm uppercase tracking-widest" style={{ color: '#E8E4D8' }}>
                        {t('seconds')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location Section */}
            {location && (
              <div className="py-16 px-4" style={{ background: '#F5F1E8' }}>
                <div className="max-w-4xl mx-auto text-center">
                  {/* Location Icon */}
                  <div className="mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{
                      background: 'rgba(139, 142, 110, 0.15)'
                    }}>
                      <span className="text-4xl">📍</span>
                    </div>
                  </div>

                  <h2 className="text-3xl md:text-4xl mb-4" style={{
                    fontFamily: 'var(--font-heading, Crimson Text, serif)',
                    color: 'var(--color-primary, #6B8E6F)',
                    fontStyle: 'italic'
                  }}>
                    {t('location')}
                  </h2>

                  <p className="text-xl md:text-2xl mb-4" style={{
                    fontFamily: 'var(--font-body, serif)',
                    color: 'var(--color-text, #3A4F3C)',
                    fontWeight: 600
                  }}>
                    {location}
                  </p>

                  {weddingTime && (
                    <div className="flex items-center justify-center gap-2 mb-8">
                      <span className="text-lg">🕐</span>
                      <p className="text-lg" style={{ color: 'var(--color-text-secondary, #6E7F70)' }}>
                        {t('timeRange', { startTime: weddingTime })}
                      </p>
                    </div>
                  )}

                  {/* Placeholder for venue image/map */}
                  <div className="rounded-lg overflow-hidden shadow-lg mb-6 max-w-2xl mx-auto" style={{
                    background: 'linear-gradient(to bottom, #D4C9B8 0%, #C9B8A8 100%)',
                    minHeight: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div className="text-center p-8">
                      <span className="text-6xl mb-4 block">🏛️</span>
                      <p className="text-lg" style={{ color: '#5A6B5C' }}>
                        {location}
                      </p>
                    </div>
                  </div>

                  {additionalInfo && (
                    <div className="text-center max-w-2xl mx-auto">
                      <p className="text-base" style={{ color: 'var(--color-text-secondary, #6E7F70)' }}>
                        {additionalInfo}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Details Section */}
            <div className="py-16 px-4" style={{ background: '#FFFFFF' }}>
              <div className="max-w-4xl mx-auto text-center mb-12">
                <h2 className="text-3xl md:text-4xl mb-4" style={{
                  fontFamily: 'var(--font-heading, Crimson Text, serif)',
                  color: 'var(--color-primary, #6B8E6F)',
                  fontStyle: 'italic'
                }}>
                  {t('details')}
                </h2>
                <p className="text-lg" style={{ color: 'var(--color-text-secondary, #6E7F70)' }}>
                  {t('detailsSubtitle')}
                </p>
              </div>

              {/* Main Content - RSVP Form */}
              <div className="max-w-4xl mx-auto px-4">
                {children}
              </div>
            </div>

            {/* Decorative footer */}
            <div className="text-center py-8 footer-enter" style={{ background: '#FAF9F5' }}>
              <div className="flex justify-center gap-3 mb-4">
                <span className="text-2xl leaf-1">🌿</span>
                <span className="text-2xl">🍃</span>
                <span className="text-2xl leaf-2">🌿</span>
              </div>
              <div className="flex justify-center gap-2">
                <span className="text-xl">🐦</span>
                <span className="text-xl">🕊️</span>
                <span className="text-xl">🐦</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
