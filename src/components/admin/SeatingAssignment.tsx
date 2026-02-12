'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FamilySplitModal } from './FamilySplitModal';
import type { SeatingPlanData } from '@/types/api';

interface SeatingAssignmentProps {
  data: SeatingPlanData;
  onUpdate: () => void;
  apiBase?: string;
}

export function SeatingAssignment({ data, onUpdate, apiBase = '/api/admin' }: SeatingAssignmentProps) {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [randomAssigning, setRandomAssigning] = useState(false);
  const [splittingFamily, setSplittingFamily] = useState<{ id: string; name: string; members: SeatingPlanData['unassigned_guests'] } | null>(null);

  // Group unassigned guests by family
  const unassignedByFamily = data.unassigned_guests.reduce((acc, guest) => {
    if (!acc[guest.family_id]) {
      acc[guest.family_id] = {
        name: guest.family_name,
        members: [],
      };
    }
    acc[guest.family_id].members.push(guest);
    return acc;
  }, {} as Record<string, { name: string; members: typeof data.unassigned_guests }>);

  const filteredFamilies = Object.entries(unassignedByFamily).filter(([_, family]) =>
    family.name.toLowerCase().includes(search.toLowerCase()) ||
    family.members.some((m) => m.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAssign = async (guestId: string, tableId: string | null) => {
    setAssigning(true);
    try {
      const response = await fetch(`${apiBase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: [{ guest_id: guestId, table_id: tableId }],
        }),
      });
      const result = await response.json();
      if (result.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error assigning guest:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignFamily = async (familyId: string, tableId: string | null) => {
    const family = unassignedByFamily[familyId];
    if (!family) return;

    setAssigning(true);
    try {
      const response = await fetch(`${apiBase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: family.members.map((m) => ({ guest_id: m.id, table_id: tableId })),
        }),
      });
      const result = await response.json();
      if (result.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error assigning family:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignFamilyFromTable = async (familyId: string, tableId: string) => {
    const table = data.tables.find(t => t.id === tableId);
    if (!table) return;

    const familyGuestsOnTable = table.assigned_guests.filter(g => g.family_id === familyId);
    if (familyGuestsOnTable.length === 0) return;

    setAssigning(true);
    try {
      const response = await fetch(`${apiBase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: familyGuestsOnTable.map((m) => ({ guest_id: m.id, table_id: null })),
        }),
      });
      const result = await response.json();
      if (result.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error unassigning family:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleRandomAssign = async () => {
    if (!confirm(t('admin.seating.assignment.randomAssignConfirm'))) return;
    
    setRandomAssigning(true);
    try {
      const response = await fetch(`${apiBase}/random`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        onUpdate();
      } else {
        alert(result.error.message);
      }
    } catch (error) {
      console.error('Error in random assignment:', error);
    } finally {
      setRandomAssigning(false);
    }
  };

  if (data.tables.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{t('admin.seating.assignment.noTables')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {splittingFamily && (
        <FamilySplitModal
          familyId={splittingFamily.id}
          familyName={splittingFamily.name}
          members={splittingFamily.members}
          onClose={() => setSplittingFamily(null)}
          onUpdate={onUpdate}
          apiBase={apiBase}
        />
      )}
      <div className="flex justify-end">
        <button
          onClick={handleRandomAssign}
          disabled={randomAssigning || data.unassigned_guests.length === 0}
          className={`flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {randomAssigning ? t('common.loading') : t('admin.seating.assignment.randomAssign')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tables List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.tables.map((table) => (
              <div key={table.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {table.name || `Table ${table.number}`}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {table.assigned_guests.length} / {table.capacity} {t('admin.seating.stats.assignedSeats')}
                    </p>
                  </div>
                  <div className={`h-2 w-16 rounded-full bg-gray-200 overflow-hidden`}>
                    <div
                      className={`h-full ${
                        table.assigned_guests.length > table.capacity
                          ? 'bg-red-500'
                          : table.assigned_guests.length === table.capacity
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (table.assigned_guests.length / table.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="p-4 min-h-[100px]">
                  {table.assigned_guests.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">
                      No guests assigned
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {table.assigned_guests.map((guest) => (
                        <li key={guest.id} className="py-2 flex justify-between items-center group">
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">{guest.name}</span>
                            <span className="ml-2 text-gray-500 text-xs">({guest.family_name})</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleUnassignFamilyFromTable(guest.family_id, table.id)}
                              title={t('admin.seating.assignment.unassignFamily')}
                              disabled={assigning}
                              className="text-gray-400 hover:text-red-700 mr-1"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAssign(guest.id, null)}
                              title={t('admin.seating.assignment.unassignGuest')}
                              disabled={assigning}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unassigned Guests List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-bold text-gray-900 mb-3">{t('admin.seating.assignment.unassigned')}</h4>
            <div className="relative">
              <input
                type="text"
                placeholder={t('admin.guests.filters.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {filteredFamilies.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                {search ? t('admin.guests.table.emptyTitle') : 'All guests assigned!'}
              </p>
            ) : (
              <div className="space-y-6">
                {filteredFamilies.map(([familyId, family]) => (
                  <div key={familyId} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h5 className="text-sm font-bold text-gray-900">{family.name}</h5>
                        {familyId !== 'couple-family' && (
                          <button
                            onClick={() => setSplittingFamily({ id: familyId, name: family.name, members: family.members })}
                            className="text-[10px] text-purple-600 hover:text-purple-700 font-medium"
                          >
                            {t('admin.seating.assignment.split')}
                          </button>
                        )}
                      </div>
                      <select
                        onChange={(e) => handleAssignFamily(familyId, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        value=""
                      >
                        <option value="">{t('admin.seating.assignment.assigned')}...</option>
                        {data.tables.map((table) => (
                          <option key={table.id} value={table.id}>
                            {table.name || `Table ${table.number}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ul className="space-y-1">
                      {family.members.map((member) => (
                        <li key={member.id} className="flex justify-between items-center text-xs text-gray-600">
                          <span className="flex items-center">
                            {member.family_id === 'couple-family' ? (
                              <span className="font-bold flex items-center">
                                {member.name}
                                <span className="ml-1" title="Couple">💍</span>
                              </span>
                            ) : (
                              member.name
                            )}
                            {member.seating_group && member.seating_group !== 'default' && (
                              <span className="ml-1 text-[8px] bg-purple-100 text-purple-600 px-1 rounded">
                                {member.seating_group}
                              </span>
                            )}
                          </span>
                          <select
                            onChange={(e) => handleAssign(member.id, e.target.value)}
                            className="text-[10px] border-none bg-transparent focus:ring-0 p-0"
                            value=""
                          >
                            <option value="">{t('admin.seating.assignment.move')}...</option>
                            {data.tables.map((table) => (
                              <option key={table.id} value={table.id}>
                                {table.name || table.number}
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

