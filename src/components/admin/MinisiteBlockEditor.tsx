'use client';

import type { MinisiteBlock, SupportedLanguage } from '@/types/invitation-template';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ES', 'EN', 'FR', 'IT', 'DE'];

interface MinisiteBlockEditorProps {
  block: MinisiteBlock;
  activeLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onUpdate: (blockId: string, updates: Partial<MinisiteBlock>) => void;
  canvasMode?: boolean;
}

/**
 * MinisiteBlockEditor - Editor configuration for Nupci minisite block with multi-language support.
 *
 * @component
 */
export function MinisiteBlockEditor({
  block,
  activeLanguage,
  onLanguageChange,
  onUpdate,
  canvasMode,
}: MinisiteBlockEditorProps) {
  const currentFolderName = block.folderNames?.[activeLanguage] || '';

  const handleFolderChange = (val: string) => {
    onUpdate(block.id, {
      folderNames: {
        ...block.folderNames,
        [activeLanguage]: val,
      },
    });
  };

  const folderEditor = (
    <div className="space-y-4">
      {/* Language Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isFilled = block.folderNames?.[lang] && block.folderNames[lang].trim().length > 0;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => onLanguageChange(lang)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                activeLanguage === lang
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } relative`}
            >
              {lang}
              {isFilled && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Folder Name ({activeLanguage})
        </label>
        <input
          type="text"
          value={currentFolderName}
          onChange={(e) => handleFolderChange(e.target.value)}
          placeholder={`e.g. laujavi`}
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-900"
        />
        <p className="text-xs text-gray-500">
          Enter the folder name inside <code>public/invitation/</code> containing the static mini-site for this language.
        </p>
      </div>
    </div>
  );

  if (canvasMode) {
    return (
      <div className="p-4 space-y-3 bg-gray-50 border rounded-lg shadow-sm">
        <p className="text-sm font-semibold text-gray-800">Nupci Minisite Block</p>
        {folderEditor}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-1 text-gray-800">Nupci Minisite</h3>
      <p className="text-sm text-gray-500 mb-4">
        Configure the folder name containing the static self-contained mini-site per language.
      </p>
      {folderEditor}
    </div>
  );
}
