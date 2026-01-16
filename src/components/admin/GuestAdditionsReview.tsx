/**
 * Guest Additions Review Component
 *
 * Displays and allows review of family members added by guests
 */

'use client';

import React from 'react';
import type { MemberType } from '@/src/types/models';

interface GuestAddition {
  id: string;
  family_id: string;
  name: string;
  type: MemberType;
  attending: boolean | null;
  age: number | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  added_by_guest: boolean;
  created_at: Date;
  family_name: string;
  is_new: boolean;
}

interface GuestAdditionsReviewProps {
  additions: GuestAddition[];
  featureEnabled: boolean;
  onMarkReviewed?: (memberId: string) => void;
  onEdit?: (memberId: string) => void;
  loading?: boolean;
}

const getMemberTypeLabel = (type: MemberType): string => {
  const labels: Record<MemberType, string> = {
    ADULT: 'Adult',
    CHILD: 'Child',
    INFANT: 'Infant',
  };
  return labels[type] || type;
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function GuestAdditionsReview({
  additions,
  featureEnabled,
  onMarkReviewed,
  onEdit,
  loading,
}: GuestAdditionsReviewProps) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading guest additions...</p>
      </div>
    );
  }

  if (!featureEnabled) {
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
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Feature Disabled</h3>
        <p className="mt-1 text-sm text-gray-500">
          Guest additions are disabled for this wedding.
        </p>
      </div>
    );
  }

  if (additions.length === 0) {
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
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No guest additions</h3>
        <p className="mt-1 text-sm text-gray-500">
          When guests add family members, they will appear here for review.
        </p>
      </div>
    );
  }

  const newAdditions = additions.filter((a) => a.is_new);
  const reviewedAdditions = additions.filter((a) => !a.is_new);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{additions.length}</span> total additions
              {newAdditions.length > 0 && (
                <span className="ml-2">
                  (<span className="text-purple-600 font-medium">{newAdditions.length}</span> new)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* New Additions */}
      {newAdditions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs mr-2">
              NEW
            </span>
            Pending Review
          </h3>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {newAdditions.map((addition) => (
                <li key={addition.id} className="p-4 bg-purple-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{addition.name}</h4>
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {getMemberTypeLabel(addition.type)}
                          {addition.age && ` (${addition.age}y)`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Added to: <span className="font-medium">{addition.family_name}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(addition.created_at)}
                      </p>
                      {(addition.dietary_restrictions || addition.accessibility_needs) && (
                        <div className="mt-2 text-xs text-gray-500">
                          {addition.dietary_restrictions && (
                            <p>Diet: {addition.dietary_restrictions}</p>
                          )}
                          {addition.accessibility_needs && (
                            <p>Accessibility: {addition.accessibility_needs}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(addition.id)}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                      )}
                      {onMarkReviewed && (
                        <button
                          onClick={() => onMarkReviewed(addition.id)}
                          className="text-sm text-purple-600 hover:text-purple-900"
                        >
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Reviewed Additions */}
      {reviewedAdditions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Previously Reviewed</h3>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {reviewedAdditions.map((addition) => (
                <li key={addition.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{addition.name}</h4>
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {getMemberTypeLabel(addition.type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Family: {addition.family_name}
                      </p>
                    </div>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(addition.id)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
