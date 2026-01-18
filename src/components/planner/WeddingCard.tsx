/**
 * Wedding Card Component
 *
 * Displays a wedding summary card with key information
 * Used in the wedding list to show each wedding's details
 */

'use client';

import React from 'react';
import Link from 'next/link';
import type { WeddingWithStats } from '@/types/models';

interface WeddingCardProps {
  wedding: WeddingWithStats;
}

export function WeddingCard({ wedding }: WeddingCardProps) {
  const weddingDate = new Date(wedding.wedding_date);
  const formattedDate = weddingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Determine status badge color
  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
  };

  return (
    <Link href={`/planner/weddings/${wedding.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {wedding.couple_names}
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formattedDate} at {wedding.wedding_time}
            </div>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {wedding.location}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                statusColors[wedding.status]
              }`}
            >
              {wedding.status}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 mb-1">Guests</p>
            <p className="text-lg font-semibold text-gray-900">{wedding.guest_count}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">RSVP</p>
            <p className="text-lg font-semibold text-gray-900">
              {wedding.rsvp_completion_percentage}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Attending</p>
            <p className="text-lg font-semibold text-gray-900">{wedding.attending_count}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Payments</p>
            <p className="text-lg font-semibold text-gray-900">
              {wedding.payment_received_count}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
