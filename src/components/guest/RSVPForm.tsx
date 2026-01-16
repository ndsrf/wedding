/**
 * RSVP Form Component
 *
 * Form for guests to select attending family members and provide dietary/accessibility info.
 * Mobile-first, elderly-friendly design with large touch targets and clear feedback.
 */

'use client';

import { useState } from 'react';
import FamilyMemberCard from './FamilyMemberCard';
import type { FamilyWithMembers } from '@/types/models';

interface RSVPFormProps {
  token: string;
  family: FamilyWithMembers;
  wedding: {
    allow_guest_additions: boolean;
    rsvp_cutoff_date: string;
  };
  rsvpCutoffPassed: boolean;
  onSuccess: () => void;
}

interface MemberUpdate {
  id: string;
  attending: boolean;
  dietary_restrictions?: string;
  accessibility_needs?: string;
}

export default function RSVPForm({
  token,
  family,
  wedding,
  rsvpCutoffPassed,
  onSuccess,
}: RSVPFormProps) {
  const [members, setMembers] = useState<MemberUpdate[]>(
    family.members.map((m) => ({
      id: m.id,
      attending: m.attending ?? false,
      dietary_restrictions: m.dietary_restrictions || '',
      accessibility_needs: m.accessibility_needs || '',
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    type: 'ADULT' as 'ADULT' | 'CHILD' | 'INFANT',
    age: '',
  });

  function handleMemberChange(
    id: string,
    field: keyof MemberUpdate,
    value: boolean | string
  ) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: value,
              // Clear dietary/accessibility if not attending
              ...(field === 'attending' && !value
                ? { dietary_restrictions: '', accessibility_needs: '' }
                : {}),
            }
          : m
      )
    );
  }

  async function handleAddMember() {
    if (!newMember.name.trim()) {
      setError('Please enter a name for the new member');
      return;
    }

    try {
      const response = await fetch(`/api/guest/${token}/member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMember.name.trim(),
          type: newMember.type,
          age: newMember.age ? parseInt(newMember.age) : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || 'Failed to add member');
        return;
      }

      // Add new member to local state
      setMembers((prev) => [
        ...prev,
        {
          id: result.data.id,
          attending: false,
          dietary_restrictions: '',
          accessibility_needs: '',
        },
      ]);

      // Reset form
      setNewMember({ name: '', type: 'ADULT', age: '' });
      setShowAddMember(false);
      setError(null);
    } catch (err) {
      console.error('Add member error:', err);
      setError('Failed to add member. Please try again.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/guest/${token}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || 'Failed to submit RSVP');
        return;
      }

      onSuccess();
    } catch (err) {
      console.error('RSVP submission error:', err);
      setError('Failed to submit RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (rsvpCutoffPassed) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-yellow-900 mb-2">
          RSVP Deadline Passed
        </h3>
        <p className="text-lg text-yellow-800">
          The RSVP deadline has passed. Please contact the couple directly to
          confirm your attendance.
        </p>
      </div>
    );
  }

  const attendingCount = members.filter((m) => m.attending).length;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        Confirm Attendance
      </h3>
      <p className="text-lg text-gray-600 mb-6">
        Please select who from your family will attend the wedding.
      </p>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <p className="text-lg text-red-800">{error}</p>
        </div>
      )}

      {/* Family Members */}
      <div className="space-y-4 mb-6">
        {family.members.map((member) => {
          const memberUpdate = members.find((m) => m.id === member.id);
          if (!memberUpdate) return null;

          return (
            <FamilyMemberCard
              key={member.id}
              member={member}
              attending={memberUpdate.attending}
              dietaryRestrictions={memberUpdate.dietary_restrictions || ''}
              accessibilityNeeds={memberUpdate.accessibility_needs || ''}
              onAttendingChange={(attending: boolean) =>
                handleMemberChange(member.id, 'attending', attending)
              }
              onDietaryChange={(value: string) =>
                handleMemberChange(member.id, 'dietary_restrictions', value)
              }
              onAccessibilityChange={(value: string) =>
                handleMemberChange(member.id, 'accessibility_needs', value)
              }
            />
          );
        })}
      </div>

      {/* Add Member Section */}
      {wedding.allow_guest_additions && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          {!showAddMember ? (
            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              className="w-full py-4 px-6 bg-white border-2 border-gray-300 rounded-lg text-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Add Family Member
            </button>
          ) : (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-gray-900">
                Add Family Member
              </h4>
              <input
                type="text"
                placeholder="Name"
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <select
                value={newMember.type}
                onChange={(e) =>
                  setNewMember({
                    ...newMember,
                    type: e.target.value as 'ADULT' | 'CHILD' | 'INFANT',
                  })
                }
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="ADULT">Adult</option>
                <option value="CHILD">Child</option>
                <option value="INFANT">Infant</option>
              </select>
              <input
                type="number"
                placeholder="Age (optional)"
                value={newMember.age}
                onChange={(e) =>
                  setNewMember({ ...newMember, age: e.target.value })
                }
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMember({ name: '', type: 'ADULT', age: '' });
                    setError(null);
                  }}
                  className="flex-1 py-3 px-6 bg-gray-300 text-gray-700 rounded-lg text-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-xl font-semibold text-blue-900">
          {attendingCount === 0
            ? 'No one attending'
            : `${attendingCount} ${attendingCount === 1 ? 'person' : 'people'} attending`}
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-5 px-6 bg-green-600 text-white rounded-lg text-xl font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
      >
        {submitting ? 'Submitting...' : 'Confirm Attendance'}
      </button>

      <p className="mt-4 text-center text-base text-gray-500">
        You can edit your RSVP until{' '}
        {new Date(wedding.rsvp_cutoff_date).toLocaleDateString()}
      </p>
    </form>
  );
}
