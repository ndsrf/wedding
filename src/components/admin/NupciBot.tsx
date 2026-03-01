'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { ChatMessage } from '@/lib/ai/nupcibot';

// ── Message renderer ────────────────────────────────────────────────────────
// Parses assistant replies that may include a trailing [LINKS] block.
// Format: text...\n[LINKS]\n/path|Label\n/path|Label
interface ParsedMessage {
  text: string;
  links: Array<{ path: string; label: string }>;
}

function parseMessageContent(raw: string): ParsedMessage {
  const marker = '[LINKS]';
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) return { text: raw.trim(), links: [] };

  const text = raw.slice(0, markerIndex).trim();
  const linksSection = raw.slice(markerIndex + marker.length).trim();
  const links = linksSection
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipeIndex = line.indexOf('|');
      if (pipeIndex === -1) return { path: line, label: line };
      return { path: line.slice(0, pipeIndex).trim(), label: line.slice(pipeIndex + 1).trim() };
    })
    .filter(({ path }) => path.startsWith('/'));

  return { text, links };
}

function LinkIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function AssistantMessage({ content }: { content: string }) {
  const { text, links } = parseMessageContent(content);
  return (
    <div className="flex flex-col gap-1.5 max-w-[85%]">
      <div className="bg-gray-50 text-gray-700 rounded-xl rounded-bl-none px-3 py-2 text-sm leading-relaxed">
        {text}
      </div>
      {links.length > 0 && (
        <div className="flex flex-col gap-1">
          {links.map(({ path, label }) => (
            <Link
              key={path}
              href={path}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-medium text-rose-700 transition-colors group"
            >
              <LinkIcon className="h-3 w-3 flex-shrink-0 text-rose-400 group-hover:text-rose-600 transition-colors" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

type Screen = 'menu' | 'message-planner' | 'chat';

// ── Icons ──────────────────────────────────────────────────────────────────

function BotIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CloseIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BackIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function SendIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

function PanelHeader({
  title,
  subtitle,
  onClose,
  onBack,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="text-white/70 hover:text-white transition-colors p-1 -ml-1"
            aria-label="Back"
          >
            <BackIcon className="h-4 w-4" />
          </button>
        )}
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <BotIcon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">{title}</p>
          <p className="text-rose-100 text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-white/70 hover:text-white transition-colors p-1"
        aria-label="Close"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function NupciBot() {
  const t = useTranslations('admin.nupcibot');
  const locale = useLocale();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Message Planner state
  const [topic, setTopic] = useState('');
  const [plannerMessage, setPlannerMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [sendError, setSendError] = useState('');

  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screen === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, screen]);

  function handleOpen() {
    setIsOpen((v) => !v);
  }

  function handleClose() {
    setIsOpen(false);
    // Reset screens when closing
    setTimeout(() => {
      setScreen('menu');
      setMessageSent(false);
      setSendError('');
      setTopic('');
      setPlannerMessage('');
    }, 300);
  }

  function handleBack() {
    setScreen('menu');
    setMessageSent(false);
    setSendError('');
  }

  // ── Navigate: configure wizard ──
  async function handleHelpConfigure() {
    setIsLoading(true);
    try {
      await fetch('/api/admin/wizard/reset', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/admin/wizard');
  }

  // ── Navigate: reports ──
  function handleViewReports() {
    handleClose();
    router.push('/admin/reports');
  }

  // ── Send message to planner ──
  async function handleSendToPlanner() {
    if (!topic.trim() || !plannerMessage.trim()) return;
    setIsLoading(true);
    setSendError('');
    try {
      const res = await fetch('/api/admin/nupcibot/message-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), message: plannerMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessageSent(true);
        setTopic('');
        setPlannerMessage('');
      } else {
        setSendError(data.error?.message || t('messagePlanner.errorGeneric'));
      }
    } catch {
      setSendError(t('messagePlanner.errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  }

  const limitReached = chatHistory.filter((m) => m.role === 'user').length >= 5;

  // ── Chat submit ──
  async function handleChatSubmit() {
    const trimmed = chatInput.trim();
    if (!trimmed || isChatLoading || limitReached) return;

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: trimmed }];
    const userMsgCount = newHistory.filter((m) => m.role === 'user').length;
    setChatHistory(newHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/admin/nupcibot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory,
          language: locale.toUpperCase(),
          userName,
        }),
      });
      const data = await res.json();
      const replyContent = data.success && data.data?.reply ? data.data.reply : t('chat.errorReply');
      const updatedHistory: ChatMessage[] = [...newHistory, { role: 'assistant', content: replyContent }];
      if (userMsgCount >= 5) {
        updatedHistory.push({ role: 'assistant', content: t('chat.limitReached') });
      }
      setChatHistory(updatedHistory);
    } catch {
      setChatHistory([...newHistory, { role: 'assistant', content: t('chat.errorReply') }]);
    } finally {
      setIsChatLoading(false);
    }
  }

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  }

  // ── Render screens ──────────────────────────────────────────────────────

  function renderMenu() {
    return (
      <div className="p-4 flex flex-col gap-2">
        {/* Greeting bubble */}
        <div className="flex items-start gap-2.5 mb-2">
          <div className="flex-shrink-0 w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center mt-0.5">
            <BotIcon className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="bg-gray-50 rounded-xl rounded-tl-none px-3 py-2.5 flex-1">
            <p className="text-sm text-gray-700 leading-relaxed">{t('greeting')}</p>
          </div>
        </div>

        {/* Option: configure wedding */}
        <button
          onClick={handleHelpConfigure}
          disabled={isLoading}
          className="w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 border-rose-100 hover:border-rose-300 hover:bg-rose-50 transition-all disabled:opacity-50 group"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-rose-50 group-hover:bg-rose-100 rounded-lg flex items-center justify-center transition-colors">
            <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-800 flex-1">
            {isLoading ? '...' : t('helpConfigure')}
          </span>
          {!isLoading && <ChevronIcon className="h-4 w-4 text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0" />}
        </button>

        {/* Option: view reports */}
        <button
          onClick={handleViewReports}
          className="w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-emerald-50 group-hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors">
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-800 flex-1">{t('viewReports')}</span>
          <ChevronIcon className="h-4 w-4 text-gray-300 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
        </button>

        {/* Option: message planner */}
        <button
          onClick={() => setScreen('message-planner')}
          className="w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-800 flex-1">{t('messagePlanner.button')}</span>
          <ChevronIcon className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
        </button>

        {/* Option: chat */}
        <button
          onClick={() => setScreen('chat')}
          className="w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-all group"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-purple-50 group-hover:bg-purple-100 rounded-lg flex items-center justify-center transition-colors">
            <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-800 flex-1">{t('chat.button')}</span>
          <ChevronIcon className="h-4 w-4 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
        </button>
      </div>
    );
  }

  function renderMessagePlanner() {
    return (
      <div className="p-4 flex flex-col gap-3">
        {messageSent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">{t('messagePlanner.successTitle')}</p>
            <p className="text-xs text-gray-500">{t('messagePlanner.successDesc')}</p>
            <button
              onClick={handleBack}
              className="mt-4 text-sm text-rose-600 hover:text-rose-700 font-medium"
            >
              {t('messagePlanner.back')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 leading-relaxed">{t('messagePlanner.description')}</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('messagePlanner.topicLabel')}</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('messagePlanner.topicPlaceholder')}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('messagePlanner.messageLabel')}</label>
              <textarea
                value={plannerMessage}
                onChange={(e) => setPlannerMessage(e.target.value)}
                placeholder={t('messagePlanner.messagePlaceholder')}
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none"
              />
            </div>
            {sendError && (
              <p className="text-xs text-red-500">{sendError}</p>
            )}
            <button
              onClick={handleSendToPlanner}
              disabled={isLoading || !topic.trim() || !plannerMessage.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-semibold rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>{t('messagePlanner.sending')}</span>
              ) : (
                <>
                  <SendIcon className="h-4 w-4" />
                  {t('messagePlanner.send')}
                </>
              )}
            </button>
          </>
        )}
      </div>
    );
  }

  function renderChat() {
    return (
      <div className="flex flex-col" style={{ height: '340px' }}>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {chatHistory.length === 0 && (
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center mt-0.5">
                <BotIcon className="h-3.5 w-3.5 text-rose-600" />
              </div>
              <div className="bg-gray-50 rounded-xl rounded-tl-none px-3 py-2.5 flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">{t('chat.greeting')}</p>
              </div>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center mb-0.5">
                  <BotIcon className="h-3 w-3 text-rose-600" />
                </div>
              )}
              {msg.role === 'assistant' ? (
                <AssistantMessage content={msg.content} />
              ) : (
                <div className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed bg-rose-500 text-white rounded-br-none">
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {isChatLoading && (
            <div className="flex items-end gap-2">
              <div className="flex-shrink-0 w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center mb-0.5">
                <BotIcon className="h-3 w-3 text-rose-600" />
              </div>
              <div className="bg-gray-50 rounded-xl rounded-bl-none px-3 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder={limitReached ? '' : t('chat.placeholder')}
            disabled={isChatLoading || limitReached}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            onClick={handleChatSubmit}
            disabled={isChatLoading || !chatInput.trim() || limitReached}
            className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-xl flex items-center justify-center hover:from-rose-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Panel content by screen ──────────────────────────────────────────────

  const screenTitles: Record<Screen, { title: string; subtitle: string }> = {
    menu: { title: 'NupciBot', subtitle: t('subtitle') },
    'message-planner': { title: t('messagePlanner.title'), subtitle: t('messagePlanner.subtitle') },
    chat: { title: t('chat.title'), subtitle: t('chat.subtitle') },
  };

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col">
          <PanelHeader
            title={screenTitles[screen].title}
            subtitle={screenTitles[screen].subtitle}
            onClose={handleClose}
            onBack={screen !== 'menu' ? handleBack : undefined}
          />
          <div className="flex-1 overflow-hidden">
            {screen === 'menu' && renderMenu()}
            {screen === 'message-planner' && renderMessagePlanner()}
            {screen === 'chat' && renderChat()}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full shadow-lg shadow-rose-200 flex items-center justify-center hover:shadow-xl hover:shadow-rose-300 hover:scale-105 transition-all"
        aria-label="NupciBot"
      >
        {isOpen ? (
          <CloseIcon className="h-6 w-6 text-white" />
        ) : (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </>
  );
}
