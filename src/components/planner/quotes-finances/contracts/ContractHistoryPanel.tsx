'use client';

import { useEffect, useState } from 'react';

export interface HistoryEvent {
  id: string;
  contract_id: string;
  actor_name: string;
  actor_color: string;
  event_type: 'edit' | 'comment_added' | 'comment_resolved';
  description: string | null;
  created_at: string;
}

interface ContractHistoryPanelProps {
  contractId: string;
  onClose: () => void;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  edit: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  comment_added: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  comment_resolved: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

const EVENT_LABEL: Record<string, string> = {
  edit: 'Edited the contract',
  comment_added: 'Added a comment',
  comment_resolved: 'Resolved a comment',
};

const EVENT_COLOR: Record<string, string> = {
  edit: 'bg-blue-100 text-blue-700',
  comment_added: 'bg-violet-100 text-violet-700',
  comment_resolved: 'bg-green-100 text-green-700',
};

function groupByDate(events: HistoryEvent[]): { label: string; events: HistoryEvent[] }[] {
  const groups: Map<string, HistoryEvent[]> = new Map();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const event of events) {
    const d = new Date(event.created_at);
    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = d.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(event);
  }

  return Array.from(groups.entries()).map(([label, evs]) => ({ label, events: evs }));
}

export function ContractHistoryPanel({ contractId, onClose }: ContractHistoryPanelProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/planner/contracts/${contractId}/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => setEvents(res.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [contractId]);

  const groups = groupByDate(events);

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Change History
          {events.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              {events.length}
            </span>
          )}
        </h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="Close history"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto lg:flex-1 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-10">
            <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-400">No changes recorded yet.</p>
          </div>
        )}

        {!loading && groups.map(({ label, events: dayEvents }) => (
          <div key={label}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="space-y-2">
              {dayEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                    style={{ backgroundColor: event.actor_color }}
                  >
                    {event.actor_name.charAt(0).toUpperCase()}
                  </span>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-800">{event.actor_name}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${EVENT_COLOR[event.event_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {EVENT_ICONS[event.event_type]}
                        {EVENT_LABEL[event.event_type] ?? event.event_type}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(event.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
