'use client';

import type { GalleryBlock } from '@/types/invitation-template';

interface GalleryBlockEditorProps {
  block: GalleryBlock;
  onUpdate: (blockId: string, updates: Partial<GalleryBlock>) => void;
}

/**
 * GalleryBlockEditor – sidebar editor for the gallery carousel block.
 *
 * Controls: columns (1/2/3), captions visibility, upload button,
 * auto-play speed, and corner radius.
 */
export function GalleryBlockEditor({ block, onUpdate }: GalleryBlockEditorProps) {
  const update = (updates: Partial<GalleryBlock>) => onUpdate(block.id, updates);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
      <h3 className="text-lg font-semibold">Galería de fotos</h3>

      {/* Columns */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Columnas (fotos visibles)
        </label>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => update({ columns: n })}
              className={`flex-1 py-2 rounded border text-sm font-medium transition ${
                (block.columns ?? 1) === n
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-play */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Avance automático (segundos)
        </label>
        <select
          value={block.autoPlayMs ?? 4000}
          onChange={(e) => update({ autoPlayMs: parseInt(e.target.value) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value={0}>Sin avance automático</option>
          <option value={3000}>3 segundos</option>
          <option value={4000}>4 segundos</option>
          <option value={6000}>6 segundos</option>
          <option value={10000}>10 segundos</option>
        </select>
      </div>

      {/* Show captions */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => update({ showCaptions: !(block.showCaptions ?? false) })}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            block.showCaptions ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              block.showCaptions ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </div>
        <span className="text-sm">Mostrar descripciones</span>
      </label>

      {/* Show upload button */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => update({ showUploadButton: !(block.showUploadButton ?? true) })}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            (block.showUploadButton ?? true) ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              (block.showUploadButton ?? true) ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </div>
        <span className="text-sm">Botón "Añadir foto" para invitados</span>
      </label>

      {/* Border radius */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Radio de esquinas
        </label>
        <select
          value={block.style?.borderRadius ?? '0.75rem'}
          onChange={(e) =>
            update({ style: { ...(block.style ?? {}), borderRadius: e.target.value } })
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="0">Sin redondeo</option>
          <option value="0.375rem">Pequeño</option>
          <option value="0.75rem">Mediano</option>
          <option value="1.25rem">Grande</option>
          <option value="9999px">Circular</option>
        </select>
      </div>

      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Las fotos se cargan automáticamente desde la galería de la boda. Puedes gestionar las fotos en{' '}
        <strong>Configuración → Galería de fotos</strong>.
      </p>
    </div>
  );
}
