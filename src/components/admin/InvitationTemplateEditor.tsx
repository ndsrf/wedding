'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  TemplateDesign,
  TemplateBlock,
  TextBlock,
  ImageBlock,
  LocationBlock as LocationBlockType,
  CountdownBlock as CountdownBlockType,
  SupportedLanguage,
} from '@/types/invitation-template';
import { TextBlockEditor } from './TextBlockEditor';
import { ImageBlockEditor } from './ImageBlockEditor';
import { LocationBlockEditor } from './LocationBlockEditor';
import { CountdownBlockEditor } from './CountdownBlockEditor';
import { CountdownBlock } from '@/components/invitation/CountdownBlock';
import { LocationBlock } from '@/components/invitation/LocationBlock';
import { AddToCalendarBlock } from '@/components/invitation/AddToCalendarBlock';
import { ImagePickerModal } from './ImagePickerModal';

interface InvitationTemplateEditorProps {
  template: {
    id: string;
    design: TemplateDesign;
    name: string;
  };
  weddingData: {
    couple_names: string;
    wedding_date: Date;
    wedding_time: string;
    location: string;
  };
  onSave: (design: TemplateDesign) => Promise<void>;
}

/**
 * InvitationTemplateEditor - Visual editor for invitation templates
 *
 * Provides a two-panel interface:
 * - Left sidebar: Add blocks, style editor, canvas settings
 * - Right canvas: Preview with editable blocks
 *
 * @component
 */
export function InvitationTemplateEditor({
  template,
  weddingData,
  onSave,
}: InvitationTemplateEditorProps) {
  const [design, setDesign] = useState<TemplateDesign>(template.design);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>('EN');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalBlockId, setImageModalBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Get selected block
  const selectedBlock = useMemo(
    () => design.blocks.find((b) => b.id === selectedBlockId),
    [design.blocks, selectedBlockId]
  );

  const isSelectedBlockText = selectedBlock?.type === 'text';
  const isSelectedBlockLocation = selectedBlock?.type === 'location';
  const isSelectedBlockCountdown = selectedBlock?.type === 'countdown';

  // Handle add block
  const handleAddBlock = useCallback(
    (type: TemplateBlock['type']) => {
      let newBlock: TemplateBlock;

      if (type === 'text') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'text',
          content: { ES: '', EN: '', FR: '', IT: '', DE: '' },
          style: {
            fontFamily: design.globalStyle.backgroundColor ? 'Georgia, serif' : 'Inter, sans-serif',
            fontSize: '1rem',
            color: '#000000',
            textAlign: 'center',
          },
        };
      } else if (type === 'image') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'image',
          src: '',
          alt: '',
        };
      } else if (type === 'location') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'location',
          style: {
            fontFamily: 'Lora, serif',
            fontSize: '1.25rem',
            color: '#3A4F3C',
            mapStyle: 'color',
          },
        };
      } else if (type === 'countdown') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'countdown',
          style: {
            fontFamily: 'Lora, serif',
            fontSize: '2.25rem',
            color: '#D4AF37',
          },
        };
      } else if (type === 'add-to-calendar') {
        newBlock = { id: crypto.randomUUID(), type: 'add-to-calendar' };
      } else {
        return;
      }

      setDesign((prev) => ({
        ...prev,
        blocks: [...prev.blocks, newBlock],
      }));
      setSelectedBlockId(newBlock.id);
    },
    [design.globalStyle.backgroundColor]
  );

  // Handle delete block
  const handleDeleteBlock = useCallback((blockId: string) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== blockId),
    }));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId]);

  // Handle move block
  const handleMoveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setDesign((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === blockId);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.blocks.length - 1) return prev;

      const newBlocks = [...prev.blocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

      return { ...prev, blocks: newBlocks };
    });
  }, []);

  // Handle update text block
  const handleUpdateTextBlock = useCallback((blockId: string, updates: Partial<TextBlock>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'text' ? ({ ...b, ...updates } as TextBlock) : b
      ),
    }));
  }, []);

  // Handle update image block
  const handleUpdateImageBlock = useCallback((blockId: string, updates: Partial<ImageBlock>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'image' ? ({ ...b, ...updates } as ImageBlock) : b
      ),
    }));
  }, []);

  // Handle update location block
  const handleUpdateLocationBlock = useCallback((blockId: string, updates: Partial<LocationBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'location' ? ({ ...b, ...updates } as LocationBlockType) : b
      ),
    }));
  }, []);

  // Handle update countdown block
  const handleUpdateCountdownBlock = useCallback((blockId: string, updates: Partial<CountdownBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'countdown' ? ({ ...b, ...updates } as CountdownBlockType) : b
      ),
    }));
  }, []);

  // Handle open image modal
  const handleOpenImageModal = useCallback((blockId: string) => {
    setImageModalBlockId(blockId);
    setIsImageModalOpen(true);
  }, []);

  // Handle select image from modal
  const handleSelectImage = useCallback((url: string) => {
    if (imageModalBlockId) {
      handleUpdateImageBlock(imageModalBlockId, { src: url });
    }
    setIsImageModalOpen(false);
    setImageModalBlockId(null);
  }, [imageModalBlockId, handleUpdateImageBlock]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(design);
    } finally {
      setIsSaving(false);
    }
  }, [design, onSave]);

  // Check if location and countdown blocks exist
  const hasLocation = design.blocks.some((b) => b.type === 'location');
  const hasCountdown = design.blocks.some((b) => b.type === 'countdown');
  const hasAddToCalendar = design.blocks.some((b) => b.type === 'add-to-calendar');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Sidebar */}
      <div className="lg:col-span-1">
        {/* Add Block Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add Block</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleAddBlock('text')}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
            >
              + Text
            </button>
            <button
              onClick={() => handleAddBlock('image')}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
            >
              + Image
            </button>
            <button
              onClick={() => handleAddBlock('location')}
              disabled={hasLocation}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Location
            </button>
            <button
              onClick={() => handleAddBlock('countdown')}
              disabled={hasCountdown}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Countdown
            </button>
            <button
              onClick={() => handleAddBlock('add-to-calendar')}
              disabled={hasAddToCalendar}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add to Calendar
            </button>
          </div>
        </div>

        {/* Style Editor (conditional) */}
        {isSelectedBlockText && selectedBlock && selectedBlock.type === 'text' && (
          <TextBlockEditor
            block={selectedBlock}
            activeLanguage={activeLanguage}
            onLanguageChange={setActiveLanguage}
            onUpdate={handleUpdateTextBlock}
          />
        )}

        {isSelectedBlockLocation && selectedBlock && selectedBlock.type === 'location' && (
          <LocationBlockEditor
            block={selectedBlock}
            onUpdate={handleUpdateLocationBlock}
          />
        )}

        {isSelectedBlockCountdown && selectedBlock && selectedBlock.type === 'countdown' && (
          <CountdownBlockEditor
            block={selectedBlock}
            onUpdate={handleUpdateCountdownBlock}
          />
        )}

        {/* Canvas Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Canvas Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Background Color</label>
              <input
                type="color"
                value={design.globalStyle.backgroundColor}
                onChange={(e) =>
                  setDesign((prev) => ({
                    ...prev,
                    globalStyle: {
                      ...prev.globalStyle,
                      backgroundColor: e.target.value,
                    },
                  }))
                }
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            {design.globalStyle.backgroundImage && (
              <div>
                <label className="block text-sm font-medium mb-2">Background Image</label>
                <p className="text-sm text-gray-600 truncate">
                  {design.globalStyle.backgroundImage}
                </p>
                <p className="text-xs text-gray-500 mt-1">(from theme - read-only)</p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSaving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      {/* Right Canvas */}
      <div className="lg:col-span-2">
        <div
          className="rounded-lg shadow overflow-hidden min-h-[600px]"
          style={{ backgroundColor: design.globalStyle.backgroundColor }}
        >
          {/* Canvas Background Image */}
          {design.globalStyle.backgroundImage && (
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `url(${design.globalStyle.backgroundImage})`,
                backgroundSize: 'cover',
              }}
            />
          )}

          {/* Canvas Content */}
          <div className="relative z-10">
            {design.blocks.length === 0 ? (
              <div className="flex items-center justify-center h-[600px] text-gray-400">
                <p>No blocks added yet. Add a block from the sidebar.</p>
              </div>
            ) : (
              design.blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`relative group border-2 ${
                    selectedBlockId === block.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-transparent hover:border-gray-300'
                  } transition cursor-pointer`}
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  {/* Block Toolbar */}
                  <div className="absolute -top-8 left-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    {index > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveBlock(block.id, 'up');
                        }}
                        className="px-2 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-800"
                      >
                        ↑
                      </button>
                    )}
                    {index < design.blocks.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveBlock(block.id, 'down');
                        }}
                        className="px-2 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-800"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlock(block.id);
                      }}
                      className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>

                  {/* Block Content */}
                  {block.type === 'text' && (
                    <TextBlockEditor
                      block={block as TextBlock}
                      activeLanguage={activeLanguage}
                      onLanguageChange={setActiveLanguage}
                      onUpdate={handleUpdateTextBlock}
                      canvasMode
                    />
                  )}

                  {block.type === 'image' && (
                    <ImageBlockEditor
                      block={block as ImageBlock}
                      onUpdate={handleUpdateImageBlock}
                      onOpenPicker={() => handleOpenImageModal(block.id)}
                      canvasMode
                    />
                  )}

                  {block.type === 'location' && (
                    <LocationBlock
                      location={weddingData.location}
                      weddingTime={weddingData.wedding_time}
                      style={(block as LocationBlockType).style}
                    />
                  )}

                  {block.type === 'countdown' && (
                    <CountdownBlock
                      weddingDate={
                        weddingData.wedding_date instanceof Date
                          ? weddingData.wedding_date.toISOString()
                          : new Date(weddingData.wedding_date).toISOString()
                      }
                      weddingTime={weddingData.wedding_time}
                      style={(block as CountdownBlockType).style}
                    />
                  )}

                  {block.type === 'add-to-calendar' && (
                    <AddToCalendarBlock
                      title={`${weddingData.couple_names}'s Wedding`}
                      date={
                        (weddingData.wedding_date instanceof Date
                          ? weddingData.wedding_date
                          : new Date(weddingData.wedding_date)
                        )
                          .toISOString()
                          .split('T')[0]
                      }
                      time={weddingData.wedding_time}
                      location={weddingData.location}
                      description={`Join us as we celebrate our wedding day`}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Image Picker Modal */}
      {isImageModalOpen && (
        <ImagePickerModal
          onClose={() => {
            setIsImageModalOpen(false);
            setImageModalBlockId(null);
          }}
          onSelectImage={handleSelectImage}
        />
      )}
    </div>
  );
}
