/**
 * Guest Filters Component
 *
 * Filter controls for the guest list
 * Supports RSVP status, attendance, channel, and payment status filters
 */

'use client';

import React from 'react';

interface GuestFiltersProps {
  filters: {
    rsvp_status?: string;
    attendance?: string;
    channel?: string;
    payment_status?: string;
    search?: string;
  };
  onFilterChange: (filters: GuestFiltersProps['filters']) => void;
}

export function GuestFilters({ filters, onFilterChange }: GuestFiltersProps) {
  const handleChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Name or email..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          />
        </div>

        {/* RSVP Status */}
        <div>
          <label htmlFor="rsvp_status" className="block text-sm font-medium text-gray-700 mb-1">
            RSVP Status
          </label>
          <select
            id="rsvp_status"
            value={filters.rsvp_status || ''}
            onChange={(e) => handleChange('rsvp_status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>

        {/* Attendance */}
        <div>
          <label htmlFor="attendance" className="block text-sm font-medium text-gray-700 mb-1">
            Attendance
          </label>
          <select
            id="attendance"
            value={filters.attendance || ''}
            onChange={(e) => handleChange('attendance', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          >
            <option value="">All</option>
            <option value="yes">Attending</option>
            <option value="no">Not Attending</option>
            <option value="partial">Partial</option>
          </select>
        </div>

        {/* Channel */}
        <div>
          <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-1">
            Channel
          </label>
          <select
            id="channel"
            value={filters.channel || ''}
            onChange={(e) => handleChange('channel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          >
            <option value="">All</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>

        {/* Payment Status */}
        <div>
          <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700 mb-1">
            Payment
          </label>
          <select
            id="payment_status"
            value={filters.payment_status || ''}
            onChange={(e) => handleChange('payment_status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="RECEIVED">Received</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {(filters.rsvp_status || filters.attendance || filters.channel || filters.payment_status || filters.search) && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onFilterChange({})}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
