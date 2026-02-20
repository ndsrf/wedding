'use client';

import Link from 'next/link';
import type { WeddingWithRelations } from '../WeddingWizard';

interface GuestsStepProps {
  wedding: WeddingWithRelations;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function GuestsStep({ wedding, onNext, onBack }: GuestsStepProps) {
  const guestCount = wedding.families.reduce((sum, family) => sum + family.members.length, 0);
  const hasGuests = guestCount > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Guest List</h2>
        <p className="mt-2 text-gray-600">
          Add your wedding guests. You can import them from a file or add them manually.
        </p>
      </div>

      {/* Current Status */}
      <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Current Guest Count</p>
            <p className="mt-1 text-3xl font-bold text-purple-600">{guestCount}</p>
            <p className="mt-1 text-sm text-gray-500">
              {wedding.families.length} {wedding.families.length === 1 ? 'family' : 'families'}
            </p>
          </div>
          <svg className="h-16 w-16 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      </div>

      {/* Guest Management Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">How to add guests:</h3>

        {/* Import Guests */}
        <Link
          href="/admin/guests?action=import"
          target="_blank"
          className="block p-6 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-lg font-medium text-gray-900 group-hover:text-purple-600">
                Import from File
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                Upload a CSV or VCF file with your guest list. Great for importing from spreadsheets or contacts.
              </p>
              <div className="mt-2 flex items-center text-sm text-purple-600 group-hover:underline">
                <span>Open import page</span>
                <svg className="ml-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Manual Entry */}
        <Link
          href="/admin/guests"
          target="_blank"
          className="block p-6 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-lg font-medium text-gray-900 group-hover:text-purple-600">
                Add Guests Manually
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                Add guests one by one or in family groups. Perfect for smaller guest lists or adding missing guests.
              </p>
              <div className="mt-2 flex items-center text-sm text-purple-600 group-hover:underline">
                <span>Open guest list page</span>
                <svg className="ml-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
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
              <strong>Tip:</strong> {hasGuests ? "You can continue to the next step and add more guests later." : "You can skip adding guests now and do it later, but we recommend adding at least a few to get started."}
            </p>
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
          onClick={onNext}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Continue
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
