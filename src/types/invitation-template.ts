/**
 * Invitation Template Types
 *
 * Type definitions for the invitation template builder system.
 * Includes template design, block types, and related interfaces.
 */

// ============================================================================
// GLOBAL CANVAS STYLE
// ============================================================================

export interface TemplateDesignGlobalStyle {
  backgroundColor: string; // from theme.colors.background
  backgroundImage?: string; // from theme.images?.background (e.g. '/themes/garden-birds/botanical-pattern.svg')
}

// ============================================================================
// TOP-LEVEL DESIGN
// ============================================================================

export interface TemplateDesign {
  globalStyle: TemplateDesignGlobalStyle;
  blocks: TemplateBlock[];
}

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

export type SupportedLanguage = 'ES' | 'EN' | 'FR' | 'IT' | 'DE';

export type LocalizedContent = Record<SupportedLanguage, string>;

// ============================================================================
// BLOCK TYPES
// ============================================================================

export interface TextBlock {
  id: string;
  type: 'text';
  content: LocalizedContent; // e.g. { ES: "Nos casamos", EN: "We're getting married", ... }
  style: {
    fontFamily: string; // e.g. 'Crimson Text, serif'
    fontSize: string; // e.g. '2rem'
    color: string; // hex
    textAlign: 'left' | 'center' | 'right';
  };
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string; // e.g. '/uploads/invitation-images/invitation_abc_1234_xy.png'
  alt: string;
}

export interface LocationBlock {
  id: string;
  type: 'location';
}

export interface CountdownBlock {
  id: string;
  type: 'countdown';
}

export interface AddToCalendarBlock {
  id: string;
  type: 'add-to-calendar';
}

export type TemplateBlock = TextBlock | ImageBlock | LocationBlock | CountdownBlock | AddToCalendarBlock;

// ============================================================================
// SYSTEM TEMPLATE SEED
// ============================================================================

export interface SystemTemplateSeed {
  id: string; // ThemePreset value, e.g. 'garden-birds'
  name: string; // e.g. 'Garden Birds'
  description: string;
  primaryColor: string; // for the preview swatch in the picker UI
  accentColor: string;
  design: TemplateDesign; // the pre-populated design
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

export interface ImageFile {
  url: string;
  filename: string;
}
