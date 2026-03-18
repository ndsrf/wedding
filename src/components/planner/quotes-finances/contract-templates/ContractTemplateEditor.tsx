'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';

interface ContractTemplateEditorProps {
  content?: object | null;
  onChange?: (content: object) => void;
  readOnly?: boolean;
  placeholder?: string;
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

export function ContractTemplateEditor({
  content,
  onChange,
  readOnly = false,
  placeholder = 'Start writing your contract template...',
}: ContractTemplateEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
          {/* Text style */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().toggleBold().run()}
              label="B"
              isActive={editor.isActive('bold')}
            />
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().toggleItalic().run()}
              label="I"
              isActive={editor.isActive('italic')}
            />
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().toggleUnderline().run()}
              label="U"
              isActive={editor.isActive('underline')}
            />
          </div>
          {/* Headings */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              label="H1"
              isActive={editor.isActive('heading', { level: 1 })}
            />
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              label="H2"
              isActive={editor.isActive('heading', { level: 2 })}
            />
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              label="H3"
              isActive={editor.isActive('heading', { level: 3 })}
            />
          </div>
          {/* Lists */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().toggleBulletList().run()}
              label="• List"
              isActive={editor.isActive('bulletList')}
            />
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().toggleOrderedList().run()}
              label="1. List"
              isActive={editor.isActive('orderedList')}
            />
          </div>
          {/* Align */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().setTextAlign('left').run()}
              label="Left"
              isActive={editor.isActive({ textAlign: 'left' })}
            />
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().setTextAlign('center').run()}
              label="Center"
              isActive={editor.isActive({ textAlign: 'center' })}
            />
            <ToolbarButton
              editor={editor}
              action={() => editor.chain().focus().setTextAlign('right').run()}
              label="Right"
              isActive={editor.isActive({ textAlign: 'right' })}
            />
          </div>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-6 py-4 min-h-[320px] focus-within:outline-none"
      />
    </div>
  );
}
