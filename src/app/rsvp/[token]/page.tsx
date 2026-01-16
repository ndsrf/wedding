/**
 * Guest RSVP Page
 * /rsvp/[token]
 *
 * Main RSVP page for guests accessed via magic link.
 * Mobile-first, elderly-friendly design optimized for WhatsApp in-app browser.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import RSVPForm from '@/components/guest/RSVPForm';
import PaymentInfo from '@/components/guest/PaymentInfo';
import LanguageSelector from '@/components/guest/LanguageSelector';
import ConfirmationMessage from '@/components/guest/ConfirmationMessage';
import type { GuestRSVPPageData } from '@/types/api';

export default function GuestRSVPPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const channel = searchParams.get('channel');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GuestRSVPPageData | null>(null);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  useEffect(() => {
    async function loadRSVPData() {
      try {
        setLoading(true);
        setError(null);

        const url = `/api/guest/${token}${channel ? `?channel=${channel}` : ''}`;
        const response = await fetch(url);
        const result = await response.json();

        if (!result.success) {
          setError(result.error?.message || 'Failed to load RSVP page');
          return;
        }

        setData(result.data);
        setRsvpSubmitted(result.data.has_submitted_rsvp);
      } catch (err) {
        console.error('Load RSVP data error:', err);
        setError('Unable to load RSVP page. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadRSVPData();
  }, [token, channel]);

  async function handleRSVPSuccess() {
    setRsvpSubmitted(true);
    // Reload data to get updated status
    try {
      const url = `/api/guest/${token}${channel ? `?channel=${channel}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Reload RSVP data error:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to Load RSVP
          </h1>
          <p className="text-lg text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { family, wedding, theme, rsvp_cutoff_passed } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Apply theme CSS */}
      <style jsx global>{`
        :root {
          --color-primary: ${theme.config.colors.primary};
          --color-secondary: ${theme.config.colors.secondary};
          --color-accent: ${theme.config.colors.accent};
          --color-background: ${theme.config.colors.background};
          --color-text: ${theme.config.colors.text};
          --font-heading: ${theme.config.fonts.heading};
          --font-body: ${theme.config.fonts.body};
          --button-radius: ${theme.config.styles.buttonRadius};
          --card-shadow: ${theme.config.styles.cardShadow};
          --spacing: ${theme.config.styles.spacing};
        }
      `}</style>

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            {wedding.couple_names}
          </h1>
          <LanguageSelector
            token={token}
            currentLanguage={family.preferred_language}
            onLanguageChange={() => window.location.reload()}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Hello, {family.name} Family! 👋
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            Please confirm your attendance to the wedding
          </p>
          <div className="space-y-2 text-lg text-gray-700">
            <p>
              <strong>Couple:</strong> {wedding.couple_names}
            </p>
            <p>
              <strong>Date:</strong>{' '}
              {new Date(wedding.wedding_date).toLocaleDateString()}
            </p>
            <p>
              <strong>Time:</strong> {wedding.wedding_time}
            </p>
            <p>
              <strong>Location:</strong> {wedding.location}
            </p>
            {wedding.dress_code && (
              <p>
                <strong>Dress Code:</strong> {wedding.dress_code}
              </p>
            )}
          </div>
          {wedding.additional_info && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-lg text-gray-700">{wedding.additional_info}</p>
            </div>
          )}
        </div>

        {/* RSVP Form or Confirmation */}
        {rsvpSubmitted ? (
          <ConfirmationMessage
            familyName={family.name}
            canEdit={!rsvp_cutoff_passed}
            cutoffDate={wedding.rsvp_cutoff_date}
            onEdit={() => setRsvpSubmitted(false)}
          />
        ) : (
          <RSVPForm
            token={token}
            family={family}
            wedding={wedding}
            rsvpCutoffPassed={rsvp_cutoff_passed}
            onSuccess={handleRSVPSuccess}
          />
        )}

        {/* Payment Information */}
        {rsvpSubmitted && (
          <PaymentInfo
            token={token}
            paymentMode={data.wedding.payment_tracking_mode || 'MANUAL'}
          />
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">
        <p className="text-base">
          If you have any questions, please contact the couple directly.
        </p>
      </div>
    </div>
  );
}
