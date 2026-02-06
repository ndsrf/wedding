'use client';

interface LocationBlockProps {
  location: string;
  style?: {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
    mapStyle?: 'color' | 'grayscale';
    fontStyle?: 'normal' | 'italic';
    fontWeight?: 'normal' | 'bold';
    textDecoration?: 'none' | 'underline';
  };
}

/**
 * LocationBlock - Displays wedding location with Google Maps embed
 *
 * Extracts location display and map iframe logic from EnvelopeReveal component.
 *
 * @component
 */
export function LocationBlock({ location, style }: LocationBlockProps) {
  const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const directionsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=directions`;
  const isGrayscale = style?.mapStyle === 'grayscale';

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Clickable Location Icon and Name */}
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-8 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {/* Location Icon */}
          <div className="mb-6">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
              style={{ background: 'rgba(139, 142, 110, 0.15)' }}
            >
              <span className="text-4xl">📍</span>
            </div>
          </div>

          <p
            className="text-xl md:text-2xl"
            style={{
              fontFamily: style?.fontFamily || 'var(--font-body, serif)',
              fontSize: style?.fontSize || '1.25rem',
              color: style?.color || 'var(--color-text, #3A4F3C)',
              fontWeight: style?.fontWeight === 'bold' ? 'bold' : (style?.fontWeight ? style.fontWeight : 600),
              fontStyle: style?.fontStyle || 'normal',
              textDecoration: style?.textDecoration || 'none',
            }}
          >
            {location}
          </p>
        </a>

        {/* Google Maps Embed */}
        <div
          className="rounded-lg overflow-hidden shadow-lg max-w-2xl mx-auto h-[350px] relative z-0"
          style={{
            filter: isGrayscale ? 'grayscale(100%)' : 'none',
          }}
        >
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={mapsUrl}
          />
        </div>
      </div>
    </div>
  );
}
