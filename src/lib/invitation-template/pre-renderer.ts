import type { 
  TemplateDesign, 
  TemplateBlock, 
  SupportedLanguage, 
  TextBlock, 
  ImageBlock
} from '@/types/invitation-template';

/**
 * Pre-renders an invitation template to static HTML for all supported languages.
 * Returns a map of language code to a map of block IDs to their HTML strings.
 */
export function preRenderTemplate(
  design: TemplateDesign
): Record<SupportedLanguage, Record<string, string>> {
  const languages: SupportedLanguage[] = ['ES', 'EN', 'FR', 'IT', 'DE'];
  const result: Record<string, Record<string, string>> = {};

  for (const lang of languages) {
    result[lang] = {};
    for (const block of design.blocks) {
      if (block.type === 'text' || block.type === 'image') {
        result[lang][block.id] = renderBlockToHTML(block, lang);
      }
    }
  }

  return result as Record<SupportedLanguage, Record<string, string>>;
}

/**
 * Renders a single block to a static HTML string.
 */
function renderBlockToHTML(
  block: TemplateBlock,
  language: SupportedLanguage
): string {
  if (block.type === 'text') {
    const textBlock = block as TextBlock;
    const textContent = textBlock.content[language] || textBlock.content['EN'] || '';
    
    // Minify HTML to avoid whitespace issues with pre-line
    return `<div style="position:relative;font-family:${textBlock.style.fontFamily};font-size:${textBlock.style.fontSize};color:${textBlock.style.color};text-align:${textBlock.style.textAlign};white-space:pre-line;padding:0 1rem;margin:0;">${textBlock.style.backgroundImage ? `<div style="position:absolute;inset:0;z-index:-10;background-image:url(${textBlock.style.backgroundImage});background-size:cover;background-position:center;background-repeat:no-repeat;"></div>` : ''}${textContent}</div>`;
  }

  if (block.type === 'image') {
    const imageBlock = block as ImageBlock;
    const alignment = imageBlock.alignment || 'center';
    const zoom = imageBlock.zoom || 100;
    const alignmentStyle = 
      alignment === 'left' ? 'text-align:left;' :
      alignment === 'right' ? 'text-align:right;' :
      'text-align:center;';

    return `<div style="${alignmentStyle}margin:0;line-height:0;"><img src="${imageBlock.src}" alt="${imageBlock.alt || ''}" style="width:${zoom}%;height:auto;border-radius:0.5rem;display:inline-block;vertical-align:middle;margin:0;" /></div>`;
  }

  return '';
}

