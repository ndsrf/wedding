'use client';

import { useState } from 'react';
import type { WeddingWithRelations } from '../WeddingWizard';

interface RsvpSettingsStepProps {
  wedding: WeddingWithRelations;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function RsvpSettingsStep({ wedding, onNext, onBack }: RsvpSettingsStepProps) {
  const [formData, setFormData] = useState({
    rsvp_cutoff_date: wedding.rsvp_cutoff_date
      ? new Date(wedding.rsvp_cutoff_date).toISOString().split('T')[0]
      : '',
    allow_guest_additions: wedding.allow_guest_additions,
    transportation_question_enabled: wedding.transportation_question_enabled,
    dietary_restrictions_enabled: wedding.dietary_restrictions_enabled,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/wedding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save RSVP settings');
      }

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">RSVP Settings</h2>
        <p className="mt-2 text-gray-600">
          Configure how guests will RSVP to your wedding.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* RSVP Cutoff Date */}
        <div>
          <label htmlFor="rsvp_cutoff_date" className="block text-sm font-medium text-gray-700">
            RSVP Cutoff Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="rsvp_cutoff_date"
            name="rsvp_cutoff_date"
            required
            value={formData.rsvp_cutoff_date}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          />
          <p className="mt-1 text-sm text-gray-500">
            The last date guests can submit their RSVP.
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="allow_guest_additions"
                name="allow_guest_additions"
                type="checkbox"
                checked={formData.allow_guest_additions}
                onChange={handleChange}
                className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="allow_guest_additions" className="font-medium text-gray-700">
                Allow guests to add additional attendees
              </label>
              <p className="text-gray-500">
                Let guests add extra people (e.g., plus-ones) when they RSVP.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="transportation_question_enabled"
                name="transportation_question_enabled"
                type="checkbox"
                checked={formData.transportation_question_enabled}
                onChange={handleChange}
                className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="transportation_question_enabled" className="font-medium text-gray-700">
                Ask about transportation needs
              </label>
              <p className="text-gray-500">
                Include a question asking if guests need transportation.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="dietary_restrictions_enabled"
                name="dietary_restrictions_enabled"
                type="checkbox"
                checked={formData.dietary_restrictions_enabled}
                onChange={handleChange}
                className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="dietary_restrictions_enabled" className="font-medium text-gray-700">
                Ask about dietary restrictions
              </label>
              <p className="text-gray-500">
                Let guests specify any dietary restrictions or preferences.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                You can configure more advanced RSVP settings (custom questions, extra info fields) later in the Configure page.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="mr-2 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !formData.rsvp_cutoff_date}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save & Continue'}
          <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
