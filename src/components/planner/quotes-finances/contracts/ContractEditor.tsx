'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import { ySyncPluginKey, yXmlFragmentToProsemirrorJSON } from '@tiptap/y-tiptap';
import { useEffect, useRef } from 'react';
import * as Y from 'yjs';

// Fragment name TipTap's Collaboration extension uses in the Yjs doc
const YJS_FRAGMENT = 'default';

/** Returns true when the node array is exactly two identical halves (Yjs CRDT duplication artifact). */
function isDoubledContent(nodes: unknown[]): boolean {
  if (nodes.length < 2 || nodes.length % 2 !== 0) return false;
  const mid = nodes.length / 2;
  return JSON.stringify(nodes.slice(0, mid)) === JSON.stringify(nodes.slice(mid));
}

/**
 * Returns true when the fragment is effectively empty — either truly empty or containing
 * only the single empty paragraph that TipTap's ySyncPlugin inserts into a blank Y.Doc
 * when the editor is first created (before Liveblocks has had a chance to sync).
 */
function isFragmentEffectivelyEmpty(fragment: Y.XmlFragment): boolean {
  if (fragment.length === 0) return true;
  try {
    const json = yXmlFragmentToProsemirrorJSON(fragment) as { content?: { type: string; content?: unknown[] }[] };
    const nodes = json.content ?? [];
    if (nodes.length === 0) return true;
    if (nodes.length === 1 && nodes[0].type === 'paragraph' && !nodes[0].content?.length) return true;
  } catch {
    // If we can't parse, assume not empty
  }
  return false;
}

interface ContractEditorProps {
  contractId: string;
  initialContent?: object | null;
  onChange?: (content: object) => void;
  readOnly?: boolean;
  currentUser?: { id: string; name: string; color?: string };
  /** Extra fields forwarded to the liveblocks-auth request body (e.g. share_token for clients) */
  authExtra?: Record<string, unknown>;
  /** Use an externally-managed Y.Doc so a sibling component (e.g. comments sidebar)
   *  can share the same Liveblocks connection. */
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

  // Refs so the Liveblocks effect can access the latest editor, content and callbacks
  // without needing them as effect dependencies (they're stable after mount).
  const editorRef = useRef<Editor | null>(null);
  const initialContentRef = useRef(initialContent);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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

          // Seed template/DB content into the Yjs doc the first time this room is opened.
          // The Collaboration extension owns the editor content through the Yjs doc; passing
          // `content` to useEditor is ignored, and editor.commands.setContent() is unreliable
          // when the ySyncPlugin is active (it can reset ProseMirror back to Y.Doc state).
          //
          // Correct approach: inject content DIRECTLY into the Y.Doc using y-prosemirror.
          // The ySyncPlugin observes Y.Doc changes and updates the editor automatically.
          //
          // We must wait until the provider has fully synced before checking emptiness —
          // so we use provider.synced / 'sync' event rather than room.status 'connected'.
          let seedCalled = false;

          /**
           * Writes initialContent directly into the Y.Doc XmlFragment so the
           * ySyncPlugin picks it up and renders it in the editor.
           */
          async function seedContentIntoYDoc(): Promise<void> {
            if (destroyed || !editorRef.current || !initialContentRef.current) return;
            try {
              // y-prosemirror is a transitive dep of @tiptap/extension-collaboration
              // and is always bundled on the client side.
              const { prosemirrorJSONToYDoc } = await import('y-prosemirror');
              if (destroyed || !editorRef.current) return;

              const schema = editorRef.current.schema;
              // Build a temporary Y.Doc containing the initial content.
              const tempDoc = prosemirrorJSONToYDoc(
                schema,
                initialContentRef.current as Record<string, unknown>,
                YJS_FRAGMENT,
              );

              // Clear any existing content in the fragment (e.g. the ySyncPlugin's
              // initial empty paragraph) before applying the seed content.
              ydocRef.current.transact(() => {
                const frag = ydocRef.current.getXmlFragment(YJS_FRAGMENT);
                if (frag.length > 0) frag.delete(0, frag.length);
              });

              // Merge the seed content into our Y.Doc. The ySyncPlugin observes
              // this change and updates ProseMirror automatically.
              Y.applyUpdate(ydocRef.current, Y.encodeStateAsUpdate(tempDoc));

              // Persist to DB — onUpdate is filtered for Y.Doc-origin transactions,
              // so we call onChange manually after the Y.Doc update propagates.
              setTimeout(() => {
                if (!destroyed && editorRef.current) {
                  onChangeRef.current?.(editorRef.current.getJSON());
                }
              }, 50);
            } catch (err) {
              // Fallback: y-prosemirror unavailable — use setContent directly.
              console.warn('ContractEditor: y-prosemirror seeding failed, using setContent fallback', err);
              if (!destroyed && editorRef.current && initialContentRef.current) {
                editorRef.current.commands.setContent(
                  initialContentRef.current as Parameters<Editor['commands']['setContent']>[0],
                );
              }
            }
          }

          function seedIfEmpty() {
            if (destroyed) return;
            // With immediatelyRender: false the editor is created in a useEffect.
            // Retry until the ref is populated (up to ~1 s).
            if (!editorRef.current) {
              setTimeout(seedIfEmpty, 50);
              return;
            }
            if (seedCalled) return;
            seedCalled = true;

            const fragment = ydocRef.current.getXmlFragment(YJS_FRAGMENT);

            if (isFragmentEffectivelyEmpty(fragment) && initialContentRef.current) {
              // Fresh room — seed from DB / template content directly into the Y.Doc.
              void seedContentIntoYDoc();
            } else if (fragment.length > 0) {
              // Room has content. Detect the CRDT duplication artifact (two identical
              // halves) caused by an older bug and repair it.
              try {
                const fragmentJSON = yXmlFragmentToProsemirrorJSON(fragment) as { content?: unknown[] };
                const nodes = fragmentJSON.content ?? [];
                if (isDoubledContent(nodes)) {
                  const fixed = { ...fragmentJSON, content: nodes.slice(0, nodes.length / 2) };
                  editorRef.current.commands.setContent(
                    fixed as Parameters<Editor['commands']['setContent']>[0],
                    { emitUpdate: false },
                  );
                  onChangeRef.current?.(fixed as object);
                }
              } catch (err) {
                console.warn('ContractEditor: could not check/repair doubled content', err);
              }
            }
          }

          // Cast to access standard Yjs Observable API.
          const typedProvider = provider as unknown as {
            synced: boolean;
            on: (event: string, fn: () => void) => void;
          };

          if (typedProvider.synced) {
            // Already synced (e.g. empty room with no stored state).
            seedIfEmpty();
          } else {
            // Guard: only seed when the provider reports fully synced.
            // Both 'sync' and 'synced' are emitted simultaneously by LiveblocksYjsProvider;
            // we register both as a safety net but check .synced to avoid acting on
            // 'sync' events emitted with isSynced=false during reconnects.
            const onSync = () => {
              if (!typedProvider.synced) return;
              seedIfEmpty();
            };
            typedProvider.on('sync', onSync);
            typedProvider.on('synced', onSync);
          }

          // Hard fallback: if neither event fires within 5 s, seed anyway.
          const fallbackTimer = setTimeout(() => {
            if (!seedCalled) seedIfEmpty();
          }, 5000);

          cleanup = () => {
            clearTimeout(fallbackTimer);
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
  }, [contractId]); // authExtra and currentUser are intentionally excluded — stable after mount

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder: 'Start writing the contract...' }),
        Collaboration.configure({ document: ydocRef.current }),
      ],
      // Do NOT pass content here — the Collaboration extension owns the editor
      // content entirely through the Yjs document. Initial seeding is handled
      // via direct Y.Doc manipulation in the Liveblocks effect above.
      content: undefined,
      editable: !readOnly,
      onUpdate: ({ editor, transaction }) => {
        // Skip saves that originated from Yjs / Liveblocks — those are not user
        // edits and would overwrite the DB with whatever Liveblocks has.
        if (transaction.getMeta(ySyncPluginKey)?.isChangeOrigin) return;
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

  // Keep the ref in sync so the Liveblocks effect can always access the current editor
  editorRef.current = editor;

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
