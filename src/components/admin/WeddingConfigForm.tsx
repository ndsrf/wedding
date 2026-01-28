/**
 * Wedding Configuration Form Component
 *
 * Wrapper component with tabbed interface for configuring wedding settings
 * Switches between Basic Settings and RSVP Settings tabs
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { UpdateWeddingConfigRequest } from '@/types/api';
import type { Theme, Wedding } from '@/types/models';
import { BasicSettingsForm } from './BasicSettingsForm';
import { RsvpSettingsForm } from './RsvpSettingsForm';

interface WeddingConfigFormProps {
  wedding: Wedding;
  themes: Theme[];
  onSubmit: (data: UpdateWeddingConfigRequest) => Promise<void>;
  onCancel: () => void;
}

export function WeddingConfigForm({ wedding, themes, onSubmit, onCancel }: WeddingConfigFormProps) {
  const t = useTranslations('admin.configure');
  const [activeTab, setActiveTab] = useState<'basic' | 'rsvp'>('basic');

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-0">
          <button
            onClick={() => setActiveTab('basic')}
            className={`${
              activeTab === 'basic'
                ? 'px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600'
                : 'px-4 py-2 font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 cursor-pointer'
            }`}
          >
            {t('tabs.basic')}
          </button>
          <button
            onClick={() => setActiveTab('rsvp')}
            className={`${
              activeTab === 'rsvp'
                ? 'px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600'
                : 'px-4 py-2 font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 cursor-pointer'
            }`}
          >
            {t('tabs.rsvp')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <BasicSettingsForm
          wedding={wedding}
          themes={themes}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}

      {activeTab === 'rsvp' && (
        <RsvpSettingsForm
          wedding={wedding}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}