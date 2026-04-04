'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import * as Y from 'yjs';

export interface CommentData {
  id: string;
  selectedText: string;
  text: string;
  authorName: string;
  authorColor: string;
  timestamp: number;
  /** True when the AI successfully auto-filled this placeholder */
  isAiFilled?: boolean;
  /** The value the AI filled in */
  aiValue?: string;
  /** The AI description of how the value was derived */
  aiDescription?: string;
  /** Machine-readable source field key, e.g. "couple_names", "event_date" */
  aiSourceField?: string;
}

interface ContractCommentsSidebarProps {
  ydocRef: React.MutableRefObject<Y.Doc>;
  authorName: string;
  authorColor: string;
  /** Planner view: can delete/resolve comments */
  isPlanner?: boolean;
  /** Currently selected text in the editor (passed from onSelectionChange) */
  pendingSelectedText?: string;
  /** Contract template ID — enables the "remember" feature */
  contractTemplateId?: string | null;
  /** Called after a comment is successfully added */
  onCommentAdded?: (comment: CommentData) => void;
  /** Called after a comment is resolved/deleted (single or bulk) */
  onCommentResolved?: (comments: CommentData[]) => void;
}

export function ContractCommentsSidebar({
  ydocRef,
  authorName,
  authorColor,
  isPlanner = false,
  pendingSelectedText = '',
  contractTemplateId,
  onCommentAdded,
  onCommentResolved,
}: ContractCommentsSidebarProps) {
  const t = useTranslations('planner.quotesFinances.contracts.commentsSidebar');
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filters
  const [filterAuthor, setFilterAuthor] = useState<string>('');
  const [filterAiFilled, setFilterAiFilled] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Remember state
  const [rememberingId, setRememberingId] = useState<string | null>(null);
  const [rememberedIds, setRememberedIds] = useState<Set<string>>(new Set());

  // Sync comments from Y.Array on every change
  useEffect(() => {
    const ydoc = ydocRef.current;
    const commentsArray = ydoc.getArray<CommentData>('comments');

    const sync = () => setComments(commentsArray.toArray());
    sync();
    commentsArray.observe(sync);
    return () => commentsArray.unobserve(sync);
  }, [ydocRef]);

  // Clear selection when comments change (e.g. after bulk resolve)
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set(comments.map((c) => c.id));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [comments]);

  // Auto-open compose when text is selected
  useEffect(() => {
    if (pendingSelectedText.trim().length > 0 && !isPlanner) {
      setAddingComment(true);
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [pendingSelectedText, isPlanner]);

  // Derived: unique authors for filter dropdown
  const authors = useMemo(() => {
    const names = [...new Set(comments.map((c) => c.authorName))].sort();
    return names;
  }, [comments]);

  // Derived: filtered comments
  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (filterAuthor && c.authorName !== filterAuthor) return false;
      if (filterAiFilled && !isEffectivelyAiFilled(c)) return false;
      return true;
    });
  }, [comments, filterAuthor, filterAiFilled]);

  // Whether all visible comments are selected
  const allChecked = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someChecked = filtered.some((c) => selectedIds.has(c.id));
  const selectedVisibleCount = useMemo(() => {
    const filteredIds = new Set(filtered.map((c) => c.id));
    return [...selectedIds].filter((id) => filteredIds.has(id)).length;
  }, [selectedIds, filtered]);

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
    onCommentAdded?.(comment);
  }

  function resolveById(id: string) {
    const commentsArray = ydocRef.current.getArray<CommentData>('comments');
    const all = commentsArray.toArray();
    const idx = all.findIndex((c) => c.id === id);
    if (idx !== -1) commentsArray.delete(idx, 1);
  }

  function handleResolve(id: string) {
    const commentsArray = ydocRef.current.getArray<CommentData>('comments');
    const resolved = commentsArray.toArray().find((c) => c.id === id);
    resolveById(id);
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    if (resolved) onCommentResolved?.([resolved]);
  }

  function handleCompleteSelected() {
    const toRemove = [...selectedIds];
    const commentsArray = ydocRef.current.getArray<CommentData>('comments');
    const all = commentsArray.toArray();
    const resolved = all.filter((c) => toRemove.includes(c.id));
    // Delete in reverse index order to avoid shifting issues
    const indices = toRemove
      .map((id) => all.findIndex((c) => c.id === id))
      .filter((i) => i !== -1)
      .sort((a, b) => b - a);
    for (const idx of indices) {
      commentsArray.delete(idx, 1);
    }
    setSelectedIds(new Set());
    if (resolved.length > 0) onCommentResolved?.(resolved);
  }

  async function handleRemember(comment: CommentData) {
    if (!contractTemplateId) return;
    setRememberingId(comment.id);
    try {
      const res = await fetch(`/api/planner/contract-templates/${contractTemplateId}/placeholder-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholder: comment.selectedText,
          description: comment.aiDescription ?? comment.text,
          sourceField: comment.aiSourceField,
        }),
      });
      if (!res.ok) throw new Error('Failed to save rule');
      setRememberedIds((prev) => new Set([...prev, comment.id]));
      // Resolve the comment after remembering
      handleResolve(comment.id);
    } catch {
      // Keep the comment if save failed
    } finally {
      setRememberingId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...filtered.map((c) => c.id)]));
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {t('title')}
          {comments.length > 0 && (
            <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
              {filtered.length !== comments.length ? `${filtered.length}/${comments.length}` : comments.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1.5">
          {isPlanner && someChecked && (
            <button
              onClick={handleCompleteSelected}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              title={t('resolveAllSelected')}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {t('complete', { count: selectedIds.size })}
            </button>
          )}
          {!isPlanner && !addingComment && (
            <button
              onClick={() => setAddingComment(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('add')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {comments.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {/* Author filter */}
            <select
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-700"
            >
              <option value="">{t('allAuthors')}</option>
              {authors.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* AI filled filter */}
            <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={filterAiFilled}
                onChange={(e) => setFilterAiFilled(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-300"
              />
              <span className="text-xs text-gray-600 whitespace-nowrap">{t('aiFilled')}</span>
            </label>
          </div>

          {/* Select all row — only shown in planner view when there are filtered comments */}
          {isPlanner && filtered.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-300 cursor-pointer"
              />
              <span className="text-xs text-gray-500">
                {allChecked ? t('deselectAll') : t('selectAll')}
                {someChecked && !allChecked && ` ${t('selectedCountSuffix', { count: selectedVisibleCount })}`}
              </span>
            </div>
          )}
        </div>
      )}

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
            placeholder={pendingSelectedText ? t('commentOnSelectedText') : t('writeCommentOrSuggestion')}
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
              {t('submit')}
            </button>
            <button
              onClick={() => { setAddingComment(false); setNewComment(''); }}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">{t('ctrlEnterHint')}</p>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-3 overflow-y-auto lg:flex-1">
        {filtered.length === 0 && !addingComment && (
          <div className="text-center py-8">
            <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs text-gray-400">
              {comments.length > 0
                ? t('noCommentsMatchFilters')
                : isPlanner
                  ? t('noCommentsFromClient')
                  : t('selectTextToComment')}
            </p>
          </div>
        )}

        {filtered.map((comment) => {
          const aiFilled = isEffectivelyAiFilled(comment);
          const isChecked = selectedIds.has(comment.id);

          return (
            <div
              key={comment.id}
              className={`bg-white rounded-xl border p-3 shadow-sm transition-colors ${
                isChecked ? 'border-violet-300 bg-violet-50/30' : 'border-gray-100'
              }`}
            >
              {/* Author row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Checkbox (planner only) */}
                  {isPlanner && (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(comment.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-300 cursor-pointer flex-shrink-0"
                    />
                  )}
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: comment.authorColor }}
                  >
                    {comment.authorName.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-gray-800">{comment.authorName}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">
                    {new Date(comment.timestamp).toLocaleDateString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Remember button — only for AI-filled comments when a template is linked */}
                  {isPlanner && aiFilled && contractTemplateId && (
                    <button
                      onClick={() => handleRemember(comment)}
                      disabled={rememberingId === comment.id || rememberedIds.has(comment.id)}
                      title={t('rememberFillRule')}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-violet-600 disabled:opacity-40 transition-colors rounded"
                    >
                      {rememberingId === comment.id ? (
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        /* Brain icon */
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-3.16Z" />
                          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-3.16Z" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Resolve button */}
                  {isPlanner && (
                    <button
                      onClick={() => handleResolve(comment.id)}
                      title={t('resolveComment')}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-green-600 transition-colors rounded"
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
          );
        })}
      </div>
    </div>
  );
}

/** Detect whether a comment represents a successful AI fill (new flag or legacy text prefix) */
function isEffectivelyAiFilled(comment: CommentData): boolean {
  if (comment.isAiFilled === true) return true;
  // Legacy detection for comments created before the isAiFilled field was added
  return comment.authorName === 'AI Assistant' && comment.text.startsWith('✅');
}
