'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type {
  TemplateDesign,
  TemplateBlock,
  TextBlock,
  ImageBlock,
  LocationBlock as LocationBlockType,
  CountdownBlock as CountdownBlockType,
  ButtonBlock as ButtonBlockType,
  GalleryBlock as GalleryBlockType,
  SpacerBlock as SpacerBlockType,
  EmbedBlock as EmbedBlockType,
  ImageMapBlock as ImageMapBlockType,
  PanelBlock as PanelBlockType,
  GiftBlock as GiftBlockType,
  MinisiteBlock as MinisiteBlockType,
  SupportedLanguage,
} from '@/types/invitation-template';
import { TextBlockEditor } from './TextBlockEditor';
import { ImageBlockEditor } from './ImageBlockEditor';
import { LocationBlockEditor } from './LocationBlockEditor';
import { CountdownBlockEditor } from './CountdownBlockEditor';
import { ButtonBlockEditor } from './ButtonBlockEditor';
import { GalleryBlockEditor } from './GalleryBlockEditor';
import { SpacerBlockEditor } from './SpacerBlockEditor';
import { EmbedBlockEditor } from './EmbedBlockEditor';
import { ImageMapBlockEditor } from './ImageMapBlockEditor';
import { PanelBlockEditor } from './PanelBlockEditor';
import { GiftBlockEditor } from './GiftBlockEditor';
import { MinisiteBlockEditor } from './MinisiteBlockEditor';
import { CountdownBlock } from '@/components/invitation/CountdownBlock';
import { LocationBlock } from '@/components/invitation/LocationBlock';
import { AddToCalendarBlock } from '@/components/invitation/AddToCalendarBlock';
import { ButtonBlock } from '@/components/invitation/ButtonBlock';
import { GalleryBlock } from '@/components/invitation/GalleryBlock';
import { GiftBlock } from '@/components/invitation/GiftBlock';
import { MinisiteBlock } from '@/components/invitation/MinisiteBlock';
import { ImagePickerModal } from './ImagePickerModal';

interface InvitationTemplateEditorProps {
  template: {
    id: string;
    design: TemplateDesign;
    name: string;
  };
  weddingData: {
    id: string;
    couple_names: string;
    wedding_date: Date;
    wedding_time: string;
    location: string;
    gift_iban?: string | null;
  };
  onSave: (design: TemplateDesign) => Promise<void>;
  apiBase?: string;
  previewUrl?: string;
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
  apiBase = '/api/admin',
  previewUrl = '/admin/invitation-builder/preview',
}: InvitationTemplateEditorProps) {
  const t = useTranslations('admin.invitationBuilder');
  const [design, setDesign] = useState<TemplateDesign>(template.design);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>('EN');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalBlockId, setImageModalBlockId] = useState<string | null>(null);
  const [imageModalHotspotId, setImageModalHotspotId] = useState<string | null>(null);
  const [isPaperBackgroundModalOpen, setIsPaperBackgroundModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get selected block
  const selectedBlock = useMemo(
    () => design.blocks.find((b) => b.id === selectedBlockId),
    [design.blocks, selectedBlockId]
  );

  const isSelectedBlockText = selectedBlock?.type === 'text';
  const isSelectedBlockLocation = selectedBlock?.type === 'location';
  const isSelectedBlockCountdown = selectedBlock?.type === 'countdown';
  const isSelectedBlockButton = selectedBlock?.type === 'button';
  const isSelectedBlockGallery = selectedBlock?.type === 'gallery';
  const isSelectedBlockSpacer = selectedBlock?.type === 'spacer';
  const isSelectedBlockEmbed = selectedBlock?.type === 'embed';
  const isSelectedBlockImageMap = selectedBlock?.type === 'image-map';
  const isSelectedBlockPanel = selectedBlock?.type === 'panel';
  const isSelectedBlockGift = selectedBlock?.type === 'gift';
  const isSelectedBlockMinisite = selectedBlock?.type === 'minisite';

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
          alignment: 'center',
          zoom: 100,
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
      } else if (type === 'button') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'button',
          text: { ES: '', EN: '', FR: '', IT: '', DE: '' },
          url: '',
          style: {
            buttonColor: '#D4AF37',
            textColor: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            alignment: 'center',
          },
        };
      } else if (type === 'gallery') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'gallery',
          columns: 1,
          showCaptions: false,
          showUploadButton: true,
          autoPlayMs: 4000,
          style: { borderRadius: '0.75rem' },
        };
      } else if (type === 'spacer') {
        newBlock = { id: crypto.randomUUID(), type: 'spacer', height: '2rem' };
      } else if (type === 'embed') {
        newBlock = { id: crypto.randomUUID(), type: 'embed', html: '' };
      } else if (type === 'image-map') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'image-map',
          src: '',
          alt: '',
          hotspots: [],
        };
      } else if (type === 'panel') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'panel',
          title: { ES: '', EN: '', FR: '', IT: '', DE: '' },
          content: { ES: '', EN: '', FR: '', IT: '', DE: '' },
          style: {
            backgroundColor: '#5C1A1A',
            textColor: '#F5ECD7',
            borderColor: '#C4976A',
            borderStyle: 'frame',
            fontFamily: 'Georgia, serif',
          },
        };
      } else if (type === 'gift') {
        newBlock = {
          id: crypto.randomUUID(),
          type: 'gift',
          style: {
            backgroundColor: 'transparent',
            textColor: '#111827',
            borderColor: '#E5E7EB',
            buttonColor: '#2563EB',
            buttonTextColor: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.75rem',
            alignment: 'center',
          },
        };
      } else if (type === 'minisite') {
        const hasMinisite = design.blocks.some((b) => b.type === 'minisite');
        if (hasMinisite) return;
        newBlock = {
          id: crypto.randomUUID(),
          type: 'minisite',
          folderNames: { ES: '', EN: '', FR: '', IT: '', DE: '' },
        };
      } else {
        return;
      }

      setDesign((prev) => ({
        ...prev,
        blocks: [...prev.blocks, newBlock],
      }));
      setSelectedBlockId(newBlock.id);
    },
    [design.globalStyle.backgroundColor, design.blocks]
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

  // Handle update button block
  const handleUpdateButtonBlock = useCallback((blockId: string, updates: Partial<ButtonBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'button' ? ({ ...b, ...updates } as ButtonBlockType) : b
      ),
    }));
  }, []);

  // Handle update gallery block
  const handleUpdateGalleryBlock = useCallback((blockId: string, updates: Partial<GalleryBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'gallery' ? ({ ...b, ...updates } as GalleryBlockType) : b
      ),
    }));
  }, []);

  const handleUpdateSpacerBlock = useCallback((blockId: string, updates: Partial<SpacerBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'spacer' ? ({ ...b, ...updates } as SpacerBlockType) : b
      ),
    }));
  }, []);

  const handleUpdateEmbedBlock = useCallback((blockId: string, updates: Partial<EmbedBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'embed' ? ({ ...b, ...updates } as EmbedBlockType) : b
      ),
    }));
  }, []);

  const handleUpdateImageMapBlock = useCallback((blockId: string, updates: Partial<ImageMapBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'image-map' ? ({ ...b, ...updates } as ImageMapBlockType) : b
      ),
    }));
  }, []);

  const handleUpdateMinisiteBlock = useCallback((blockId: string, updates: Partial<MinisiteBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'minisite' ? ({ ...b, ...updates } as MinisiteBlockType) : b
      ),
    }));
  }, []);

  const handleUpdatePanelBlock = useCallback((blockId: string, updates: Partial<PanelBlockType>) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.type === 'panel' ? ({ ...b, ...updates } as PanelBlockType) : b
      ),
    }));
  }, []);

  // Handle open image modal
  const handleOpenImageModal = useCallback((blockId: string, hotspotId?: string) => {
    setImageModalBlockId(blockId);
    setImageModalHotspotId(hotspotId || null);
    setIsImageModalOpen(true);
  }, []);

  // Handle select image from modal
  const handleSelectImage = useCallback((url: string) => {
    if (imageModalBlockId) {
      const targetBlock = design.blocks.find((b) => b.id === imageModalBlockId);
      
      if (imageModalHotspotId) {
        // Update a specific hotspot's targetImage
        if (targetBlock?.type === 'image-map') {
          const updatedHotspots = targetBlock.hotspots.map((h) =>
            h.id === imageModalHotspotId ? { ...h, targetImage: url } : h
          );
          handleUpdateImageMapBlock(imageModalBlockId, { hotspots: updatedHotspots });
        }
      } else {
        // Normal block image update
        if (targetBlock?.type === 'image-map') {
          const existingSrc = (targetBlock as ImageMapBlockType).src;
          const currentSrc = typeof existingSrc === 'string'
            ? url
            : { ...(existingSrc as Record<string, string>), [activeLanguage]: url } as import('@/types/invitation-template').LocalizedContent;
          handleUpdateImageMapBlock(imageModalBlockId, { src: currentSrc });
        } else if (targetBlock?.type === 'panel') {
          handleUpdatePanelBlock(imageModalBlockId, {
            style: { ...(targetBlock as PanelBlockType).style, backgroundImage: url },
          });
        } else {
          handleUpdateImageBlock(imageModalBlockId, { src: url });
        }
      }
    }
    setIsImageModalOpen(false);
    setImageModalBlockId(null);
    setImageModalHotspotId(null);
  }, [imageModalBlockId, imageModalHotspotId, activeLanguage, design.blocks, handleUpdateImageBlock, handleUpdateImageMapBlock, handleUpdatePanelBlock]);

  // Handle select paper background image
  const handleSelectPaperBackground = useCallback((url: string) => {
    setDesign((prev) => ({
      ...prev,
      globalStyle: {
        ...prev.globalStyle,
        paperBackgroundImage: url,
      },
    }));
    setIsPaperBackgroundModalOpen(false);
  }, []);

  // Handle remove paper background image
  const handleRemovePaperBackground = useCallback(() => {
    setDesign((prev) => ({
      ...prev,
      globalStyle: {
        ...prev.globalStyle,
        paperBackgroundImage: undefined,
      },
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(design);
    } finally {
      setIsSaving(false);
    }
  }, [design, onSave]);

  // Handle preview
  const handlePreview = useCallback(() => {
    try {
      // Store preview data in sessionStorage
      const previewData = {
        design,
        weddingData: {
          ...weddingData,
          gift_iban: weddingData.gift_iban ?? undefined,
        },
        language: activeLanguage.toLowerCase(),
      };
      sessionStorage.setItem('invitation-preview-data', JSON.stringify(previewData));

      // Open preview in new window
      window.open(previewUrl, '_blank', 'width=1200,height=800');
    } catch (err) {
      console.error('Failed to open preview:', err);
      alert('Failed to open preview. Please try again.');
    }
  }, [design, weddingData, activeLanguage, previewUrl]);

  // Check if location and countdown blocks exist
  const hasLocation = design.blocks.some((b) => b.type === 'location');
  const hasCountdown = design.blocks.some((b) => b.type === 'countdown');
  const hasAddToCalendar = design.blocks.some((b) => b.type === 'add-to-calendar');
  const hasGallery = design.blocks.some((b) => b.type === 'gallery');
  const hasMinisite = design.blocks.some((b) => b.type === 'minisite');

  // Compute available panels for hotspot configuration
  const availablePanels = useMemo(
    () =>
      design.blocks
        .filter((b): b is PanelBlockType => b.type === 'panel')
        .map((b) => ({ id: b.id, title: b.title['EN'] || b.title['ES'] || b.id })),
    [design.blocks]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Sidebar */}
      <div className="lg:col-span-1">
        {/* Add Block Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{t('addBlock')}</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleAddBlock('text')}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium"
            >
              + {t('blockText')}
            </button>
            <button
              onClick={() => handleAddBlock('image')}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium"
            >
              + {t('blockImage')}
            </button>
            <button
              onClick={() => handleAddBlock('location')}
              disabled={hasLocation}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + {t('blockLocation')}
            </button>
            <button
              onClick={() => handleAddBlock('countdown')}
              disabled={hasCountdown}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + {t('blockCountdown')}
            </button>
            <button
              onClick={() => handleAddBlock('add-to-calendar')}
              disabled={hasAddToCalendar}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + {t('blockAddToCalendar')}
            </button>
            <button
              onClick={() => handleAddBlock('button')}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium"
            >
              + Button
            </button>
            <button
              onClick={() => handleAddBlock('gallery')}
              disabled={hasGallery}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + {t('blockGallery')}
            </button>
            <button
              onClick={() => handleAddBlock('spacer')}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium"
            >
              + Spacer
            </button>
            <button
              onClick={() => handleAddBlock('embed')}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-gray-700 font-medium"
            >
              + Embed HTML
            </button>
            <button
              onClick={() => handleAddBlock('image-map')}
              className="w-full px-4 py-2 border border-purple-300 rounded hover:bg-purple-50 transition text-purple-700 font-medium"
            >
              + Image Map (with Hotspots)
            </button>
            <button
              onClick={() => handleAddBlock('panel')}
              className="w-full px-4 py-2 border border-purple-300 rounded hover:bg-purple-50 transition text-purple-700 font-medium"
            >
              + Panel (modal content)
            </button>
            <button
              onClick={() => handleAddBlock('gift')}
              className="w-full px-4 py-2 border border-amber-300 rounded hover:bg-amber-50 transition text-amber-700 font-medium"
            >
              + Gift (IBAN)
            </button>
            <button
              onClick={() => handleAddBlock('minisite')}
              disabled={hasMinisite}
              className="w-full px-4 py-2 border border-emerald-300 rounded hover:bg-emerald-50 transition text-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + {t('blockMinisite')}
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

        {isSelectedBlockButton && selectedBlock && selectedBlock.type === 'button' && (
          <ButtonBlockEditor
            block={selectedBlock}
            activeLanguage={activeLanguage}
            onLanguageChange={setActiveLanguage}
            onUpdate={handleUpdateButtonBlock}
          />
        )}

        {isSelectedBlockGallery && selectedBlock && selectedBlock.type === 'gallery' && (
          <GalleryBlockEditor
            block={selectedBlock}
            onUpdate={handleUpdateGalleryBlock}
          />
        )}

        {isSelectedBlockSpacer && selectedBlock && selectedBlock.type === 'spacer' && (
          <SpacerBlockEditor
            block={selectedBlock}
            onUpdate={handleUpdateSpacerBlock}
          />
        )}

        {isSelectedBlockEmbed && selectedBlock && selectedBlock.type === 'embed' && (
          <EmbedBlockEditor
            block={selectedBlock}
            onUpdate={handleUpdateEmbedBlock}
          />
        )}

        {isSelectedBlockImageMap && selectedBlock && selectedBlock.type === 'image-map' && (
          <ImageMapBlockEditor
            block={selectedBlock}
            activeLanguage={activeLanguage}
            onLanguageChange={setActiveLanguage}
            onUpdate={handleUpdateImageMapBlock}
            onOpenImageModal={handleOpenImageModal}
            availablePanels={availablePanels}
          />
        )}

        {isSelectedBlockPanel && selectedBlock && selectedBlock.type === 'panel' && (
          <PanelBlockEditor
            block={selectedBlock}
            activeLanguage={activeLanguage}
            onLanguageChange={setActiveLanguage}
            onUpdate={handleUpdatePanelBlock}
            onOpenImageModal={handleOpenImageModal}
          />
        )}

        {isSelectedBlockGift && selectedBlock && selectedBlock.type === 'gift' && (
          <GiftBlockEditor
            block={selectedBlock as GiftBlockType}
            onUpdate={(id, updates) => {
              setDesign((prev) => ({
                ...prev,
                blocks: prev.blocks.map((b) =>
                  b.id === id && b.type === 'gift' ? ({ ...b, ...updates } as GiftBlockType) : b
                ),
              }));
            }}
          />
        )}

        {isSelectedBlockMinisite && selectedBlock && selectedBlock.type === 'minisite' && (
          <MinisiteBlockEditor
            block={selectedBlock as MinisiteBlockType}
            activeLanguage={activeLanguage}
            onLanguageChange={setActiveLanguage}
            onUpdate={handleUpdateMinisiteBlock}
          />
        )}

        {/* Invitation Style */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Invitation Style</h3>
          <div className="space-y-4">
            {/* Background Image */}
            <div>
              <label className="block text-sm font-medium mb-1">Background Image</label>
              {design.globalStyle.paperBackgroundImage ? (
                <div className="space-y-2">
                  <div className="relative w-full h-24 bg-gray-100 rounded overflow-hidden">
                    <Image
                      src={design.globalStyle.paperBackgroundImage}
                      alt="Background"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPaperBackgroundModalOpen(true)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleRemovePaperBackground}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                      Remove
                    </button>
                  </div>
                  {/* Cover / Tile selector */}
                  <div className="flex rounded overflow-hidden border border-gray-300 text-sm">
                    {(['cover', 'tile'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() =>
                          setDesign((prev) => ({
                            ...prev,
                            globalStyle: { ...prev.globalStyle, paperBackgroundSize: mode },
                          }))
                        }
                        className={`flex-1 py-1.5 capitalize transition ${
                          (design.globalStyle.paperBackgroundSize ?? 'cover') === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {mode === 'cover' ? 'Cover (expand)' : 'Tile (repeat)'}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsPaperBackgroundModalOpen(true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-sm"
                >
                  + Choose Image
                </button>
              )}
              <p className="text-xs text-gray-500 mt-1">Applied to the page and header area.</p>
            </div>

            {/* Colors row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Background Color</label>
                <input
                  type="color"
                  value={design.globalStyle.backgroundColor}
                  onChange={(e) =>
                    setDesign((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, backgroundColor: e.target.value } }))
                  }
                  className="w-full h-9 rounded cursor-pointer border border-gray-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Text Color</label>
                <input
                  type="color"
                  value={design.globalStyle.textColor ?? '#111827'}
                  onChange={(e) =>
                    setDesign((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, textColor: e.target.value } }))
                  }
                  className="w-full h-9 rounded cursor-pointer border border-gray-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">RSVP Button</label>
                <input
                  type="color"
                  value={design.globalStyle.rsvpButtonColor ?? '#16a34a'}
                  onChange={(e) =>
                    setDesign((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, rsvpButtonColor: e.target.value } }))
                  }
                  className="w-full h-9 rounded cursor-pointer border border-gray-200"
                />
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="block text-sm font-medium mb-1">Font</label>
              <select
                value={design.globalStyle.fontFamily ?? ''}
                onChange={(e) =>
                  setDesign((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, fontFamily: e.target.value || undefined } }))
                }
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="">— Default (system font) —</option>
                <option value="Cormorant Garamond, serif">Cormorant Garamond</option>
                <option value="Crimson Text, serif">Crimson Text</option>
                <option value="EB Garamond, serif">EB Garamond</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Great Vibes, cursive">Great Vibes</option>
                <option value="Inter, sans-serif">Inter</option>
                <option value="Libre Baskerville, serif">Libre Baskerville</option>
                <option value="Lora, serif">Lora</option>
                <option value="Montserrat, sans-serif">Montserrat</option>
                <option value="Playfair Display, serif">Playfair Display</option>
              </select>
            </div>

            {design.globalStyle.backgroundImage && (
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Theme Pattern (read-only)</label>
                <p className="text-xs text-gray-400 truncate">{design.globalStyle.backgroundImage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handlePreview}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            👁️ Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Right Canvas */}
      <div className="lg:col-span-2">
        <div
          className="rounded-lg shadow overflow-hidden min-h-[600px] relative"
          style={{
            backgroundColor: design.globalStyle.backgroundColor,
            ...(design.globalStyle.fontFamily ? { fontFamily: design.globalStyle.fontFamily } : {}),
          }}
        >
          {/* Paper Background Image (user-uploaded) */}
          {design.globalStyle.paperBackgroundImage && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={
                (design.globalStyle.paperBackgroundSize ?? 'cover') === 'tile'
                  ? { backgroundImage: `url(${design.globalStyle.paperBackgroundImage})`, backgroundSize: 'auto', backgroundRepeat: 'repeat', backgroundPosition: 'top left' }
                  : { backgroundImage: `url(${design.globalStyle.paperBackgroundImage})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
              }
            />
          )}

          {/* Canvas Background Image (theme-based) */}
          {design.globalStyle.backgroundImage && (
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `url(${design.globalStyle.backgroundImage})`,
                backgroundSize: 'cover',
              }}
            />
          )}

          {/* Header preview strip */}
          <div
            className="relative z-10 px-4 py-2 flex justify-between items-center border-b"
            style={{
              borderColor: design.globalStyle.textColor ? design.globalStyle.textColor + '33' : '#e5e7eb',
            }}
          >
            <span className="text-sm font-semibold" style={{ color: design.globalStyle.textColor ?? '#111827' }}>
              {weddingData.couple_names}
            </span>
            <span className="text-xs px-2 py-0.5 rounded border" style={{ color: design.globalStyle.textColor ?? '#6b7280', borderColor: design.globalStyle.textColor ? design.globalStyle.textColor + '55' : '#d1d5db' }}>
              🌐 Language
            </span>
          </div>

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
                  } transition cursor-pointer mb-0`}
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  {/* Block Toolbar */}
                  <div className="absolute -top-8 left-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
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
                      language={activeLanguage}
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

                  {block.type === 'button' && (
                    <ButtonBlock
                      text={(block as ButtonBlockType).text}
                      url={(block as ButtonBlockType).url}
                      style={(block as ButtonBlockType).style}
                      language={activeLanguage}
                    />
                  )}

                  {block.type === 'gallery' && (
                    <GalleryBlock
                      weddingId={weddingData.id}
                      columns={(block as GalleryBlockType).columns ?? 1}
                      showCaptions={(block as GalleryBlockType).showCaptions ?? false}
                      showUploadButton={(block as GalleryBlockType).showUploadButton ?? true}
                      autoPlayMs={(block as GalleryBlockType).autoPlayMs ?? 4000}
                      style={(block as GalleryBlockType).style}
                    />
                  )}

                  {block.type === 'spacer' && selectedBlockId === block.id ? (
                    <SpacerBlockEditor
                      block={block as SpacerBlockType}
                      onUpdate={handleUpdateSpacerBlock}
                      canvasMode
                    />
                  ) : block.type === 'spacer' ? (
                    <div style={{ height: (block as SpacerBlockType).height, display: 'block' }} aria-hidden="true" />
                  ) : null}

                  {block.type === 'embed' && selectedBlockId === block.id ? (
                    <EmbedBlockEditor
                      block={block as EmbedBlockType}
                      onUpdate={handleUpdateEmbedBlock}
                      canvasMode
                    />
                  ) : block.type === 'embed' ? (
                    <div
                      className="w-full overflow-hidden"
                      style={(block as EmbedBlockType).height ? { minHeight: (block as EmbedBlockType).height } : undefined}
                      dangerouslySetInnerHTML={{ __html: (block as EmbedBlockType).html }}
                    />
                  ) : null}

                  {block.type === 'image-map' && (
                    <ImageMapBlockEditor
                      block={block as ImageMapBlockType}
                      activeLanguage={activeLanguage}
                      onLanguageChange={setActiveLanguage}
                      onUpdate={handleUpdateImageMapBlock}
                      onOpenImageModal={handleOpenImageModal}
                      availablePanels={availablePanels}
                    />
                  )}

                  {block.type === 'panel' && (
                    <div className="p-4 bg-purple-50 border border-dashed border-purple-300 rounded text-center">
                      <p className="text-sm text-purple-700 font-medium">
                        📋 Panel: &ldquo;{(block as PanelBlockType).title['EN'] || (block as PanelBlockType).title['ES'] || 'Untitled'}&rdquo;
                      </p>
                      <p className="text-xs text-purple-500 mt-1">Hidden in invitation — opens as modal when triggered</p>
                    </div>
                  )}

                  {block.type === 'gift' && (
                    <GiftBlock
                      block={block as GiftBlockType}
                      iban={weddingData.gift_iban ?? undefined}
                    />
                  )}

                  {block.type === 'minisite' && (
                    <MinisiteBlock
                      folderName={
                        (block as MinisiteBlockType).folderNames?.[activeLanguage] ||
                        (block as MinisiteBlockType).folderNames?.['EN'] ||
                        (block as MinisiteBlockType).folderNames?.['ES'] ||
                        ''
                      }
                      language={activeLanguage}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Image Picker Modal (for image blocks) */}
      {isImageModalOpen && (
        <ImagePickerModal
          onClose={() => {
            setIsImageModalOpen(false);
            setImageModalBlockId(null);
          }}
          onSelectImage={handleSelectImage}
          requireAspectRatio={false}
          apiBase={apiBase}
        />
      )}

      {/* Image Picker Modal (for paper background) */}
      {isPaperBackgroundModalOpen && (
        <ImagePickerModal
          onClose={() => setIsPaperBackgroundModalOpen(false)}
          onSelectImage={handleSelectPaperBackground}
          requireAspectRatio={false}
          apiBase={apiBase}
        />
      )}
    </div>
  );
}
