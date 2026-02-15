/**
 * AMP (Accelerated Mobile Pages) utilities for Next.js 15 App Router
 *
 * Since Next.js 15 removed built-in AMP support, we implement AMP compatibility manually
 */

import { Metadata } from 'next';

interface AMPConfig {
  canonical?: string;
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

/**
 * Generate AMP-compatible metadata for a page
 * Adds proper canonical links, structured data, and Open Graph tags
 * Note: For amphtml link, add it directly in the layout <head> section
 */
export function generateAMPMetadata(config: AMPConfig): Metadata {
  const {
    canonical,
    title,
    description,
    image,
    type = 'website',
    publishedTime,
    modifiedTime,
  } = config;

  return {
    title,
    description,
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
    openGraph: {
      title,
      description,
      type,
      images: image ? [{ url: image }] : undefined,
      publishedTime,
      modifiedTime,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * Get AMP boilerplate styles (required for valid AMP pages)
 */
export const AMP_BOILERPLATE_STYLE = `body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}`;

export const AMP_BOILERPLATE_NOSCRIPT_STYLE = `body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}`;

/**
 * Generate structured data (JSON-LD) for a page
 */
export function generateStructuredData(config: {
  type: 'WebSite' | 'WebPage' | 'Article' | 'Organization';
  name: string;
  description: string;
  url: string;
  image?: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': config.type,
    name: config.name,
    description: config.description,
    url: config.url,
    ...(config.image && { image: config.image }),
  };

  if (config.type === 'Article') {
    return {
      ...baseData,
      author: config.author
        ? {
            '@type': 'Person',
            name: config.author,
          }
        : undefined,
      datePublished: config.datePublished,
      dateModified: config.dateModified,
    };
  }

  return baseData;
}

/**
 * Check if a component is AMP-compatible
 * AMP has strict requirements: no inline styles, specific tags, etc.
 */
export function isAMPCompatible(): boolean {
  // In a real implementation, you'd validate the HTML structure
  // For now, we'll assume pages are optimized for AMP
  return true;
}

/**
 * AMP Script component placeholder
 * Use this to mark where AMP scripts should be injected
 *
 * Note: amp-img is a built-in component and doesn't require a separate script tag
 */
export const AMPScripts = {
  base: '<!doctype html><html amp lang="en">',
  required: [
    '<script async src="https://cdn.ampproject.org/v0.js"></script>',
  ],
  components: {
    'amp-carousel': '<script async custom-element="amp-carousel" src="https://cdn.ampproject.org/v0/amp-carousel-0.2.js"></script>',
    'amp-video': '<script async custom-element="amp-video" src="https://cdn.ampproject.org/v0/amp-video-0.1.js"></script>',
    'amp-sidebar': '<script async custom-element="amp-sidebar" src="https://cdn.ampproject.org/v0/amp-sidebar-0.1.js"></script>',
    'amp-accordion': '<script async custom-element="amp-accordion" src="https://cdn.ampproject.org/v0/amp-accordion-0.1.js"></script>',
  },
};

/**
 * Generate AMP-compatible image props
 * Converts Next.js Image props to AMP amp-img compatible props
 */
export function getAMPImageProps(props: {
  src: string;
  alt: string;
  width: number;
  height: number;
  layout?: 'responsive' | 'fixed' | 'fill' | 'intrinsic';
}) {
  return {
    src: props.src,
    alt: props.alt,
    width: props.width,
    height: props.height,
    layout: props.layout || 'responsive',
    // AMP requires explicit dimensions
    style: `width: ${props.width}px; height: ${props.height}px;`,
  };
}

/**
 * Convert standard HTML to AMP-compatible HTML
 * Simple implementation for basic tags
 */
export function convertToAMPHtml(html: string): string {
  if (!html) return '';

  return html
    // Convert <img> to <amp-img>
    .replace(/<img([^>]*)>/gi, (_match, attrs) => {
      // Extract width and height if they exist
      const widthMatch = attrs.match(/width="([^"]*)"/i);
      const heightMatch = attrs.match(/height="([^"]*)"/i);
      const srcMatch = attrs.match(/src="([^"]*)"/i);
      const altMatch = attrs.match(/alt="([^"]*)"/i);

      const src = srcMatch ? srcMatch[1] : '';
      const alt = altMatch ? altMatch[1] : '';
      const width = widthMatch ? widthMatch[1] : '800';
      const height = heightMatch ? heightMatch[1] : '600';

      return `<amp-img src="${src}" alt="${alt}" width="${width}" height="${height}" layout="responsive"></amp-img>`;
    })
    // Remove disallowed attributes
    .replace(/\s(loading|fetchpriority|decoding)="[^"]*"/gi, '')
    // Remove style attributes (AMP requires all styles in <style amp-custom>)
    .replace(/\sstyle="[^"]*"/gi, '');
}

/**
 * Render a full AMP HTML document
 */
export function renderAMPPage(config: {
  locale: string;
  title: string;
  canonical: string;
  description: string;
  content: string;
  styles?: string;
  scripts?: string[];
}): string {
  const {
    locale,
    title,
    canonical,
    description,
    content,
    styles = '',
    scripts = [],
  } = config;

  const scriptTags = [
    ...AMPScripts.required,
    ...Array.from(new Set(scripts || [])).map(s => AMPScripts.components[s as keyof typeof AMPScripts.components] || ''),
  ].join('\n');

  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  return `<!doctype html>
<html amp lang="${locale}">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="canonical" href="${canonical}">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <meta name="description" content="${description}">
  ${scriptTags}
  <style amp-boilerplate>${AMP_BOILERPLATE_STYLE}</style>
  <noscript><style amp-boilerplate>${AMP_BOILERPLATE_NOSCRIPT_STYLE}</style></noscript>
  <style amp-custom>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 0;
      margin: 0;
      background-color: #fffafb;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #fff;
      min-height: 100vh;
    }
    header {
      background: #fff;
      border-bottom: 1px solid #ffe4e6;
      padding: 10px 20px;
      text-align: center;
    }
    .logo-img {
      margin: 0 auto;
    }
    h1 { font-family: serif; color: #111; margin-top: 30px; }
    h2 { font-family: serif; color: #333; margin-top: 25px; }
    .hero-image { margin: 20px 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .cta-button {
      display: inline-block;
      background: linear-gradient(to right, #f43f5e, #ec4899);
      color: #fff;
      padding: 14px 32px;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 20px;
      box-shadow: 0 4px 6px rgba(225, 29, 72, 0.2);
    }
    footer {
      background: #111;
      color: #999;
      padding: 40px 20px;
      margin-top: 40px;
      text-align: center;
      font-size: 14px;
    }
    ${styles}
  </style>
</head>
<body>
  <header>
    <a href="/${locale}">
      <amp-img src="/images/nupci.webp" width="150" height="60" layout="intrinsic" alt="${commercialName}" class="logo-img"></amp-img>
    </a>
  </header>
  <div class="container">
    ${content}
  </div>
  <footer>
    <p>© 2026 ${commercialName}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}
