/**
 * Guest Table Component
 *
 * Displays a list of guests/families in a table or card format
 * Shows family name, members, RSVP status, and payment status
 */

'use client';

import React from 'react';
import type { FamilyWithMembers, Language, Channel, GiftStatus } from '@/types/models';

interface GuestWithStatus extends FamilyWithMembers {
  rsvp_status: string;
  attending_count: number;
  total_members: number;
  payment_status: GiftStatus | null;
}

interface GuestTableProps {
  guests: GuestWithStatus[];
  onEdit?: (guestId: string) => void;
  loading?: boolean;
}

const getLanguageLabel = (lang: Language): string => {
  const labels: Record<Language, string> = {
    ES: 'Spanish',
    EN: 'English',
    FR: 'French',
    IT: 'Italian',
    DE: 'German',
  };
  return labels[lang] || lang;
};

const getChannelLabel = (channel: Channel | null): string => {
  if (!channel) return '-';
  const labels: Record<Channel, string> = {
    WHATSAPP: 'WhatsApp',
    EMAIL: 'Email',
    SMS: 'SMS',
  };
  return labels[channel] || channel;
};

const getRsvpBadgeClass = (status: string): string => {
  return status === 'submitted'
    ? 'bg-green-100 text-green-800'
    : 'bg-yellow-100 text-yellow-800';
};

const getPaymentBadgeClass = (status: GiftStatus | null): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  const classes: Record<GiftStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    RECEIVED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

export function GuestTable({ guests, onEdit, loading }: GuestTableProps) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading guests...</p>
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No guests found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your filters or import a guest list.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Family
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RSVP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Channel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Language
              </th>
              {onEdit && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {guests.map((guest) => (
              <tr key={guest.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{guest.name}</span>
                    {guest.email && (
                      <span className="text-sm text-gray-500">{guest.email}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {guest.attending_count} / {guest.total_members}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">attending</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRsvpBadgeClass(guest.rsvp_status)}`}
                  >
                    {guest.rsvp_status === 'submitted' ? 'Submitted' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getChannelLabel(guest.channel_preference)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeClass(guest.payment_status)}`}
                  >
                    {guest.payment_status || 'None'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getLanguageLabel(guest.preferred_language)}
                </td>
                {onEdit && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(guest.id)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {guests.map((guest) => (
          <div key={guest.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{guest.name}</h3>
                {guest.email && (
                  <p className="text-sm text-gray-500">{guest.email}</p>
                )}
              </div>
              {onEdit && (
                <button
                  onClick={() => onEdit(guest.id)}
                  className="text-purple-600 hover:text-purple-900 text-sm"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRsvpBadgeClass(guest.rsvp_status)}`}
              >
                {guest.rsvp_status === 'submitted' ? 'Submitted' : 'Pending'}
              </span>
              <span className="text-xs text-gray-500">
                {guest.attending_count}/{guest.total_members} attending
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeClass(guest.payment_status)}`}
              >
                {guest.payment_status || 'No payment'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
