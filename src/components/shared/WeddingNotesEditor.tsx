'use client';

import {
  useEditor,
  EditorContent,
  ReactRenderer,
  type Editor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import Mention from '@tiptap/extension-mention';
import { ySyncPluginKey } from '@tiptap/y-tiptap';
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  createPortal,
} from 'react';
import * as Y from 'yjs';
import type { NotesUser } from '@/app/(public)/api/planner/weddings/[id]/notes-users/route';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeddingNotesEditorProps {
  weddingId: string;
  /** POST endpoint that returns { token } for Liveblocks */
  authEndpoint: string;
  /** GET endpoint that returns { data: NotesUser[] } */
  usersEndpoint: string;
  currentUser?: { id: string; name: string; color?: string };
}

interface MentionSuggestionItem {
  id: string;
  name: string;
  email: string;
  role: 'planner' | 'admin';
}

interface MentionListProps {
  items: MentionSuggestionItem[];
  command: (item: { id: string; label: string }) => void;
  clientRect?: (() => DOMRect | null) | null;
}

interface MentionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

// ---------------------------------------------------------------------------
// Mention dropdown (pure React, no tippy)
// ---------------------------------------------------------------------------

const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  function MentionList({ items, command, clientRect }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    // Re-compute position whenever the cursor rect changes
    useEffect(() => {
      if (!clientRect) return;
      const rect = clientRect();
      if (!rect) return;
      setPos({
        top: rect.bottom + window.scrollY + 4,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - 240),
      });
    }, [clientRect]);

    // Reset selected index when item list changes
    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) command({ id: item.id, label: item.name });
      },
      [items, command],
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (!items.length || !pos) return null;

    return createPortal(
      <div
        style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
        className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-56"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
              index === selectedIndex ? 'bg-teal-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => selectItem(index)}
          >
            <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: item.role === 'planner' ? '#e11d48' : '#7c3aed' }}>
              {item.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-400 truncate">{item.email}</p>
            </div>
          </button>
        ))}
      </div>,
      document.body,
    );
  },
);

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolbarButton({
  action,
  label,
  isActive,
}: {
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
          ? 'bg-teal-100 text-teal-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const YJS_FRAGMENT = 'default';

export function WeddingNotesEditor({
  weddingId,
  authEndpoint,
  usersEndpoint,
  currentUser,
}: WeddingNotesEditorProps) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const editorRef = useRef<Editor | null>(null);
  const [users, setUsers] = useState<NotesUser[]>([]);
  const [mentionToast, setMentionToast] = useState<string | null>(null);

  // Load taggable users once on mount
  useEffect(() => {
    fetch(usersEndpoint)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setUsers(json.data);
      })
      .catch(() => {/* non-critical */});
  }, [usersEndpoint]);

  // Create a checklist task when someone is mentioned
  const handleMention = useCallback(
    async (mentionedUser: MentionSuggestionItem, contextText: string) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await fetch('/api/admin/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wedding_id: weddingId,
            section_id: null,
            title: `Mención en el bloque de notas: @${mentionedUser.name}`,
            description: contextText.trim() ? `Contexto del bloque de notas:\n\n"${contextText.trim()}"` : null,
            assigned_to: mentionedUser.role === 'planner' ? 'WEDDING_PLANNER' : 'COUPLE',
            due_date: today.toISOString(),
            status: 'PENDING',
            order: 0,
          }),
        });

        setMentionToast(`Tarea creada para @${mentionedUser.name}`);
        setTimeout(() => setMentionToast(null), 3000);
      } catch {
        // non-critical — don't interrupt the user's writing
      }
    },
    [weddingId],
  );

  // Build suggestion config — wraps `users` in a stable ref so the mention
  // extension doesn't need to be re-created when the user list updates.
  const usersRef = useRef<NotesUser[]>([]);
  usersRef.current = users;

  const suggestionConfig = useRef({
    items: ({ query }: { query: string }) => {
      const q = query.toLowerCase();
      return usersRef.current.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      ) as MentionSuggestionItem[];
    },
    render: () => {
      let componentRef: ReactRenderer<MentionListHandle, MentionListProps> | null = null;

      return {
        onStart: (props: MentionListProps) => {
          componentRef = new ReactRenderer(MentionList, {
            props,
            editor: props as unknown as Editor,
          });
          document.body.appendChild(componentRef.element);
        },
        onUpdate: (props: MentionListProps) => {
          componentRef?.updateProps(props);
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === 'Escape') {
            componentRef?.destroy();
            document.body.removeChild(componentRef!.element);
            componentRef = null;
            return true;
          }
          return componentRef?.ref?.onKeyDown(props.event) ?? false;
        },
        onExit: () => {
          if (componentRef) {
            if (document.body.contains(componentRef.element)) {
              document.body.removeChild(componentRef.element);
            }
            componentRef.destroy();
            componentRef = null;
          }
        },
      };
    },
  }).current;

  // Liveblocks initialisation (same pattern as ContractEditor)
  useEffect(() => {
    let destroyed = false;
    let cleanup: (() => void) | undefined;

    async function initLiveblocks() {
      try {
        const { createClient } = await import('@liveblocks/client');
        const { LiveblocksYjsProvider } = await import('@liveblocks/yjs');

        const authRes = await fetch(authEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!authRes.ok || destroyed) return;
        const { token } = await authRes.json();

        const roomId = `notes-${weddingId}`;
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

          // Seed empty doc to prevent blank-editor on first open
          const typedProvider = provider as unknown as {
            synced: boolean;
            on: (event: string, fn: (isSynced: boolean) => void) => void;
          };
          const seedIfEmpty = () => {
            if (destroyed) return;
            const fragment = ydocRef.current.getXmlFragment(YJS_FRAGMENT);
            if (fragment.length === 0 && editorRef.current) {
              // Leave intentionally empty — this is a blank notes pad
            }
          };
          if (typedProvider.synced) {
            seedIfEmpty();
          } else {
            typedProvider.on('sync', (isSynced: boolean) => {
              if (isSynced) seedIfEmpty();
            });
          }

          cleanup = () => {
            provider.destroy();
            room.disconnect();
          };
        }
      } catch (err) {
        console.error('WeddingNotesEditor Liveblocks init error:', err);
      }
    }

    initLiveblocks();
    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, [authEndpoint, weddingId, currentUser]);

  const handleMentionRef = useRef(handleMention);
  handleMentionRef.current = handleMention;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Placeholder.configure({ placeholder: 'Escribe tus notas aquí… Usa @ para mencionar a alguien.' }),
        Collaboration.configure({ document: ydocRef.current }),
        Mention.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          suggestion: {
            ...suggestionConfig,
            command: ({ editor: ed, range, props }) => {
              const mentionedItem = props as MentionSuggestionItem;

              // Capture context text (up to 200 chars) around the current cursor
              const { from } = range;
              const docSize = ed.state.doc.content.size;
              const contextStart = Math.max(0, from - 100);
              const contextEnd = Math.min(docSize, from + 100);
              let contextText = '';
              try {
                contextText = ed.state.doc.textBetween(contextStart, contextEnd, ' ');
              } catch {
                // ignore
              }

              // Insert the mention node
              ed.chain()
                .focus()
                .insertContentAt(range, [
                  { type: 'mention', attrs: { id: mentionedItem.id, label: mentionedItem.name } },
                  { type: 'text', text: ' ' },
                ])
                .run();

              // Trigger async task creation
              handleMentionRef.current(mentionedItem, contextText);
            },
          },
        }),
      ],
      content: undefined,
      editable: true,
      onUpdate: ({ transaction }) => {
        // Skip Yjs-originated updates (they're not local edits)
        if (transaction.getMeta(ySyncPluginKey)?.isChangeOrigin) return;
      },
      immediatelyRender: false,
    },
    [],
  );

  editorRef.current = editor;

  if (!editor) return null;

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <ToolbarButton
              action={() => editor.chain().focus().toggleBold().run()}
              label="B"
              isActive={editor.isActive('bold')}
            />
            <ToolbarButton
              action={() => editor.chain().focus().toggleItalic().run()}
              label="I"
              isActive={editor.isActive('italic')}
            />
          </div>
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <ToolbarButton
              action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              label="H2"
              isActive={editor.isActive('heading', { level: 2 })}
            />
            <ToolbarButton
              action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              label="H3"
              isActive={editor.isActive('heading', { level: 3 })}
            />
          </div>
          <div className="flex items-center gap-1">
            <ToolbarButton
              action={() => editor.chain().focus().toggleBulletList().run()}
              label="• Lista"
              isActive={editor.isActive('bulletList')}
            />
            <ToolbarButton
              action={() => editor.chain().focus().toggleOrderedList().run()}
              label="1. Lista"
              isActive={editor.isActive('orderedList')}
            />
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="font-mono bg-gray-100 text-gray-500 px-1 rounded">@</span>
              para mencionar
            </span>
          </div>
        </div>

        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none px-6 py-4 min-h-[400px] focus-within:outline-none [&_.mention]:text-teal-600 [&_.mention]:font-semibold [&_.mention]:bg-teal-50 [&_.mention]:px-1 [&_.mention]:rounded"
        />
      </div>

      {/* Toast notification for mention task */}
      {mentionToast && (
        <div className="fixed bottom-6 right-6 bg-teal-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {mentionToast}
        </div>
      )}
    </div>
  );
}
