'use client';

import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';

export interface ItineraryStepItem {
  id: string | number;
  locationName: string;
  dateTime: string | Date;
  itemType: string;
  isMain?: boolean;
  googleMapsUrl?: string | null;
  notes?: string | null;
}

interface ItineraryTimelineProps {
  items: ItineraryStepItem[];
  showReadOnlyToast?: boolean;
}

export function ItineraryTimeline({ items, showReadOnlyToast }: ItineraryTimelineProps) {
  const t = useTranslations();
  const { showToast } = useToast();

  const sorted = [...items].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );

  if (sorted.length === 0) return null;

  const handleItemClick = showReadOnlyToast
    ? () => showToast('Esta información solo puede ser modificada por tu wedding planner.', 'info')
    : undefined;

  return (
    <div className="flex overflow-x-auto pb-1 gap-0">
      {sorted.map((item, idx) => {
        const isLast = idx === sorted.length - 1;

        return (
          <div
            key={item.id}
            className={`flex-shrink-0 ${handleItemClick ? 'cursor-pointer' : ''}`}
            style={{ minWidth: 'calc(25vw - 8px)', maxWidth: '140px' }}
            onClick={handleItemClick}
          >
            {/* Dot + connector line */}
            <div className="flex items-center h-3 mb-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white ${
                  item.isMain ? 'bg-purple-500' : 'bg-gray-400'
                }`}
              />
              {!isLast && <div className="flex-1 h-px bg-gray-300" />}
            </div>

            {/* Content */}
            <div className="pr-2">
              <p className="text-[10px] leading-tight text-gray-500 tabular-nums">
                {(() => {
                  const d = new Date(item.dateTime);
                  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                })()}
              </p>
              <p
                className={`text-xs leading-snug font-semibold truncate ${
                  item.isMain ? 'text-purple-800' : 'text-gray-900'
                }`}
                title={item.locationName}
              >
                {item.locationName}
              </p>
              {item.itemType !== 'EVENT' && (
                <p
                  className={`text-[10px] leading-tight ${
                    item.isMain ? 'text-purple-600' : 'text-gray-500'
                  }`}
                >
                  {t(`planner.weddings.itinerary.eventTypes.${item.itemType}`)}
                </p>
              )}
              {item.googleMapsUrl && (
                <a
                  href={item.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-500 hover:text-blue-700 leading-tight"
                  onClick={(e) => e.stopPropagation()}
                >
                  Maps ↗
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
