'use client';

import type { MinisiteBlock } from '@/types/invitation-template';

interface MinisiteBlockEditorProps {
  block: MinisiteBlock;
  onUpdate: (blockId: string, updates: Partial<MinisiteBlock>) => void;
  canvasMode?: boolean;
}

/**
 * MinisiteBlockEditor - Editor configuration for Nupci minisite block.
 *
 * @component
 */
export function MinisiteBlockEditor({ block, onUpdate, canvasMode }: MinisiteBlockEditorProps) {
  const folderEditor = (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Folder Name</label>
      <input
        type="text"
        value={block.folderName}
        onChange={(e) => onUpdate(block.id, { folderName: e.target.value })}
        placeholder="e.g. laujavi"
        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-900"
      />
      <p className="text-xs text-gray-500">
        Enter the name of the folder inside <code>public/invitation/</code> containing the static mini-site (e.g. <code>laujavi</code>).
      </p>
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
        Configure the folder name containing the static self-contained mini-site.
      </p>
      {folderEditor}
    </div>
  );
}
