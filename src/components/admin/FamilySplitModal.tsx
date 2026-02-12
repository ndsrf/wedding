'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FamilyMember } from '@/types/models';

interface FamilySplitModalProps {
  familyId: string;
  familyName: string;
  members: FamilyMember[];
  onClose: () => void;
  onUpdate: () => void;
  apiBase?: string;
}

export function FamilySplitModal({
  familyId,
  familyName,
  members,
  onClose,
  onUpdate,
  apiBase = '/api/admin',
}: FamilySplitModalProps) {
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  
  // Local state for assignments to sub-groups
  const [memberGroups, setMemberGroups] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, m.seating_group || 'default']))
  );

  const [groupNames, setGroupNames] = useState<string[]>(() => {
    const existing = Array.from(new Set(members.map((m) => m.seating_group).filter(Boolean))) as string[];
    return existing.length > 0 ? existing : ['default', t('admin.seating.split.children')];
  });

  const addGroup = () => {
    setGroupNames([...groupNames, `${t('admin.seating.split.group')} ${groupNames.length + 1}`]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const groups = groupNames.map((name) => ({
        name,
        guest_ids: Object.entries(memberGroups)
          .filter(([_, groupName]) => groupName === name)
          .map(([id]) => id),
      }));

      const response = await fetch(`${apiBase}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          groups,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error splitting family:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            {t('admin.seating.split.title')}: {familyName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-500">{t('admin.seating.split.description')}</p>

          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{member.name}</span>
                <select
                  value={memberGroups[member.id]}
                  onChange={(e) => setMemberGroups({ ...memberGroups, [member.id]: e.target.value })}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-purple-500 focus:border-purple-500"
                >
                  {groupNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-700">Sub-groups</span>
              <button
                onClick={addGroup}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                + {t('admin.seating.split.addGroup')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {groupNames.map((name, index) => (
                <div key={index} className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-xs">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...groupNames];
                      newNames[index] = e.target.value;
                      setGroupNames(newNames);
                    }}
                    className="bg-transparent border-none p-0 focus:ring-0 w-20"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('common.buttons.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? t('common.loading') : t('admin.seating.split.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
