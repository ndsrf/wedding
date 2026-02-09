/**
 * Font loading utilities for optimal performance
 *
 * Critical fonts (Playfair Display) are loaded via @font-face in globals.css
 * Non-critical fonts are lazy-loaded only when needed (e.g., invitation templates)
 */

const FONT_URLS = {
  // Elegant Serif Fonts (for invitation templates)
  'Crimson Text': 'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap',
  'Cormorant Garamond': 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap',
  'Lora': 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400;1,700&display=swap',
  'EB Garamond': 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap',
  'Libre Baskerville': 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap',

  // Script & Cursive Fonts (for invitation templates)
  'Alex Brush': 'https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap',
  'Great Vibes': 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap',
  'Dancing Script': 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap',
  'Parisienne': 'https://fonts.googleapis.com/css2?family=Parisienne&display=swap',
  'Sacramento': 'https://fonts.googleapis.com/css2?family=Sacramento&display=swap',
  'Allura': 'https://fonts.googleapis.com/css2?family=Allura&display=swap',
  'Tangerine': 'https://fonts.googleapis.com/css2?family=Tangerine:wght@400;700&display=swap',

  // Modern Sans-Serif Fonts (for invitation templates)
  'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
  'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap',
  'Montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap',
} as const;

type FontName = keyof typeof FONT_URLS;

const loadedFonts = new Set<FontName>();

/**
 * Lazy load a font by dynamically injecting a link element
 * Only loads each font once (cached in memory)
 */
export function loadFont(fontName: FontName): void {
  if (typeof document === 'undefined') return; // SSR guard

  if (loadedFonts.has(fontName)) return; // Already loaded

  const url = FONT_URLS[fontName];
  if (!url) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.media = 'print';
  link.onload = function() {
    // @ts-expect-error - this.media is defined on HTMLLinkElement
    this.media = 'all';
  };

  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

/**
 * Load multiple fonts at once
 */
export function loadFonts(fontNames: FontName[]): void {
  fontNames.forEach(loadFont);
}

/**
 * Get all available font names
 */
export function getAvailableFonts(): readonly FontName[] {
  return Object.keys(FONT_URLS) as FontName[];
}
