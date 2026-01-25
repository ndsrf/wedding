'use client';

import { useState } from 'react';

interface EnvelopeRevealProps {
  children: React.ReactNode;
  coupleNames: string;
}

/**
 * EnvelopeReveal - Interactive envelope animation for Garden Birds template
 *
 * Displays an elegant envelope that opens with animation to reveal
 * the wedding details and RSVP form when clicked.
 *
 * @component
 */
export function EnvelopeReveal({ children, coupleNames }: EnvelopeRevealProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

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
                    Tap to open
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl content-enter">
            {/* Decorative header with birds */}
            <div className="text-center mb-6 header-enter">
              <div className="flex justify-center items-center gap-4 mb-4">
                <span className="text-3xl">🐦</span>
                <div className="flex gap-2">
                  <span className="text-2xl">🌿</span>
                  <span className="text-2xl">🍃</span>
                  <span className="text-2xl">🌿</span>
                </div>
                <span className="text-3xl">🕊️</span>
              </div>
            </div>

            {/* Main Content */}
            <div>
              {children}
            </div>

            {/* Decorative footer */}
            <div className="text-center mt-8 footer-enter">
              <div className="flex justify-center gap-2">
                <span className="text-xl">🌸</span>
                <span className="text-xl">🌺</span>
                <span className="text-xl">🌸</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
