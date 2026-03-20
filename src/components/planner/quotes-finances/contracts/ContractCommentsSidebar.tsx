'use client';

import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';

export interface CommentData {
  id: string;
  selectedText: string;
  text: string;
  authorName: string;
  authorColor: string;
  timestamp: number;
}

interface ContractCommentsSidebarProps {
  ydocRef: React.MutableRefObject<Y.Doc>;
  authorName: string;
  authorColor: string;
  /** Planner view: can delete/resolve comments */
  isPlanner?: boolean;
  /** Currently selected text in the editor (passed from onSelectionChange) */
  pendingSelectedText?: string;
}

export function ContractCommentsSidebar({
  ydocRef,
  authorName,
  authorColor,
  isPlanner = false,
  pendingSelectedText = '',
}: ContractCommentsSidebarProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync comments from Y.Array on every change
  useEffect(() => {
    const ydoc = ydocRef.current;
    const commentsArray = ydoc.getArray<CommentData>('comments');

    const sync = () => setComments(commentsArray.toArray());
    sync();
    commentsArray.observe(sync);
    return () => commentsArray.unobserve(sync);
  }, [ydocRef]);

  // Auto-open compose when text is selected
  useEffect(() => {
    if (pendingSelectedText.trim().length > 0 && !isPlanner) {
      setAddingComment(true);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [pendingSelectedText, isPlanner]);

  function handleAddComment() {
    if (!newComment.trim()) return;

    const commentsArray = ydocRef.current.getArray<CommentData>('comments');
    const comment: CommentData = {
      id: Math.random().toString(36).slice(2),
      selectedText: pendingSelectedText.trim(),
      text: newComment.trim(),
      authorName,
      authorColor,
      timestamp: Date.now(),
    };
    commentsArray.push([comment]);
    setNewComment('');
    setAddingComment(false);
  }

  function handleResolve(index: number) {
    const commentsArray = ydocRef.current.getArray<CommentData>('comments');
    commentsArray.delete(index, 1);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Comments
          {comments.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
              {comments.length}
            </span>
          )}
        </h3>
        {!isPlanner && !addingComment && (
          <button
            onClick={() => setAddingComment(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        )}
      </div>

      {/* Compose */}
      {!isPlanner && addingComment && (
        <div className="mb-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
          {pendingSelectedText && (
            <div className="mb-2 px-2 py-1.5 bg-yellow-100 border-l-2 border-yellow-400 rounded text-xs text-gray-700 italic line-clamp-3">
              &ldquo;{pendingSelectedText}&rdquo;
            </div>
          )}
          <textarea
            ref={textareaRef}
            rows={3}
            className="w-full text-xs border border-violet-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none bg-white"
            placeholder={pendingSelectedText ? 'Comment on the selected text…' : 'Write a comment or suggestion…'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment();
              if (e.key === 'Escape') { setAddingComment(false); setNewComment(''); }
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-3 py-1 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              Submit
            </button>
            <button
              onClick={() => { setAddingComment(false); setNewComment(''); }}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Ctrl+Enter to submit · Esc to cancel</p>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-3 overflow-y-auto lg:flex-1">
        {comments.length === 0 && !addingComment && (
          <div className="text-center py-8">
            <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs text-gray-400">
              {isPlanner ? 'No comments from the client yet.' : 'Select text in the contract to comment on it, or click Add to leave a general note.'}
            </p>
          </div>
        )}

        {comments.map((comment, index) => (
          <div key={comment.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            {/* Author */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: comment.authorColor }}
                >
                  {comment.authorName.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-gray-800">{comment.authorName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400">
                  {new Date(comment.timestamp).toLocaleDateString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                {isPlanner && (
                  <button
                    onClick={() => handleResolve(index)}
                    title="Resolve comment"
                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-green-600 transition-colors rounded"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Quoted text */}
            {comment.selectedText && (
              <div className="mb-2 px-2 py-1.5 bg-yellow-50 border-l-2 border-yellow-400 rounded text-xs text-gray-600 italic line-clamp-3">
                &ldquo;{comment.selectedText}&rdquo;
              </div>
            )}

            {/* Comment body */}
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{comment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
