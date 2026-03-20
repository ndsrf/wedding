'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import { useEffect, useRef } from 'react';
import * as Y from 'yjs';

interface ContractEditorProps {
  contractId: string;
  initialContent?: object | null;
  onChange?: (content: object) => void;
  readOnly?: boolean;
  currentUser?: { id: string; name: string; color?: string };
  /** Extra fields forwarded to the liveblocks-auth request body (e.g. share_token for clients) */
  authExtra?: Record<string, unknown>;
  /** Use an externally-managed Y.Doc so a sibling component (e.g. comments sidebar)
   *  can share the same Yjs document without a second Liveblocks connection. */
  externalYdocRef?: React.MutableRefObject<Y.Doc>;
  /** Called once after the Liveblocks provider is initialised and the Y.Doc is ready */
  onYDocReady?: (ydoc: Y.Doc) => void;
  /** Called when selection changes – useful for the comment-on-selection feature */
  onSelectionChange?: (selectedText: string) => void;
}

function ToolbarButton({
  action,
  label,
  isActive,
}: {
  editor?: Editor;
  action: () => void;
  label: string;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        action();
      }}
      className={`px-2.5 py-1.5 text-sm rounded transition-colors font-medium ${
        isActive
          ? 'bg-rose-100 text-rose-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
}

export function ContractEditor({
  contractId,
  initialContent,
  onChange,
  readOnly = false,
  currentUser,
  authExtra,
  externalYdocRef,
  onYDocReady,
  onSelectionChange,
}: ContractEditorProps) {
  const internalYdocRef = useRef<Y.Doc>(new Y.Doc());
  const ydocRef = externalYdocRef ?? internalYdocRef;

  useEffect(() => {
    let destroyed = false;
    let cleanup: (() => void) | undefined;

    async function initLiveblocks() {
      try {
        const { createClient } = await import('@liveblocks/client');
        const { LiveblocksYjsProvider } = await import('@liveblocks/yjs');

        const roomId = `contract-${contractId}`;

        const authRes = await fetch(`/api/planner/contracts/${contractId}/liveblocks-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authExtra ?? {}),
        });
        if (!authRes.ok || destroyed) return;
        const { token } = await authRes.json();

        const client = createClient({ authEndpoint: async () => ({ token }) });
        const { room } = client.enterRoom(roomId);
        const provider = new LiveblocksYjsProvider(room, ydocRef.current);

        if (!destroyed) {
          if (currentUser) {
            (provider.awareness as {
              setLocalStateField: (k: string, v: unknown) => void;
            }).setLocalStateField('user', {
              id: currentUser.id,
              name: currentUser.name,
              color: currentUser.color ?? '#e11d48',
            });
          }

          onYDocReady?.(ydocRef.current);

          cleanup = () => {
            provider.destroy();
            room.disconnect();
          };
        }
      } catch (err) {
        console.error('Liveblocks init error:', err);
      }
    }

    initLiveblocks();

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, [contractId]); // authExtra and currentUser are intentionally excluded — they are stable after mount

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder: 'Start writing the contract...' }),
        Collaboration.configure({ document: ydocRef.current }),
      ],
      content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      editable: !readOnly,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getJSON());
      },
      onSelectionUpdate: ({ editor }) => {
        if (!onSelectionChange) return;
        const { from, to } = editor.state.selection;
        if (from === to) {
          onSelectionChange('');
        } else {
          onSelectionChange(editor.state.doc.textBetween(from, to, ' '));
        }
      },
      immediatelyRender: false,
    },
    []
  );

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleBold().run()} label="B" isActive={editor.isActive('bold')} />
            <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleItalic().run()} label="I" isActive={editor.isActive('italic')} />
            <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleUnderline().run()} label="U" isActive={editor.isActive('underline')} />
          </div>
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="H1" isActive={editor.isActive('heading', { level: 1 })} />
            <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" isActive={editor.isActive('heading', { level: 2 })} />
            <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" isActive={editor.isActive('heading', { level: 3 })} />
          </div>
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleBulletList().run()} label="• List" isActive={editor.isActive('bulletList')} />
            <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleOrderedList().run()} label="1. List" isActive={editor.isActive('orderedList')} />
          </div>
          <div className="flex items-center gap-1">
            <ToolbarButton editor={editor} action={() => editor.chain().focus().setTextAlign('left').run()} label="Left" isActive={editor.isActive({ textAlign: 'left' })} />
            <ToolbarButton editor={editor} action={() => editor.chain().focus().setTextAlign('center').run()} label="Center" isActive={editor.isActive({ textAlign: 'center' })} />
            <ToolbarButton editor={editor} action={() => editor.chain().focus().setTextAlign('right').run()} label="Right" isActive={editor.isActive({ textAlign: 'right' })} />
          </div>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-6 py-4 min-h-[400px] focus-within:outline-none"
      />
    </div>
  );
}
