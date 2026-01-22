'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Table } from '@/types/models';

interface SeatingConfigProps {
  tables: Table[];
  onUpdate: () => void;
}

export function SeatingConfig({ tables, onUpdate }: SeatingConfigProps) {
  const t = useTranslations();
  const [localTables, setLocalTables] = useState<Partial<Table>[]>(
    tables.length > 0 ? tables : [{ number: 1, capacity: 10 }]
  );
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const addTable = () => {
    const nextNumber = Math.max(0, ...localTables.map((t) => t.number || 0)) + 1;
    setLocalTables([...localTables, { number: nextNumber, capacity: 10 }]);
  };

  const removeTable = (index: number) => {
    const tableToRemove = localTables[index];
    if (tableToRemove.id) {
      setDeleteIds([...deleteIds, tableToRemove.id]);
    }
    setLocalTables(localTables.filter((_, i) => i !== index));
  };

  const updateTable = (index: number, field: keyof Table, value: string | number | null | undefined) => {
    const updated = [...localTables];
    updated[index] = { ...updated[index], [field]: value };
    setLocalTables(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/seating/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: localTables,
          delete_ids: deleteIds,
        }),
      });
      const result = await response.json();
      if (result.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving tables:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">{t('admin.seating.config.title')}</h3>
        <button
          onClick={addTable}
          className="flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
        >
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('admin.seating.config.addTable')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.seating.config.tableNumber')}
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.seating.config.tableName')}
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.seating.config.capacity')}
              </th>
              <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.seating.config.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {localTables.map((table, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={table.number || ''}
                    onChange={(e) => updateTable(index, 'number', parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="text"
                    value={table.name || ''}
                    onChange={(e) => updateTable(index, 'name', e.target.value)}
                    placeholder={`Table ${table.number}`}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={table.capacity || ''}
                    onChange={(e) => updateTable(index, 'capacity', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => removeTable(index)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
            saving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {saving ? t('admin.seating.config.saving') : t('admin.seating.config.save')}
        </button>
      </div>
    </div>
  );
}
