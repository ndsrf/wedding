/**
 * Template module exports
 */

// Defaults
export {
  getDefaultTemplate,
  getAllDefaultTemplates,
  DEFAULT_TEMPLATES,
  type DefaultTemplate,
  type TemplateDefaults,
} from "./defaults";

// Renderer
export {
  renderTemplate,
  getPlaceholders,
  hasAllPlaceholders,
  getAvailablePlaceholders,
  type TemplateVariables,
} from "./renderer";

// Validation
export {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  previewTemplateSchema,
  validateCreateTemplate,
  validateUpdateTemplate,
  validateListTemplatesQuery,
  validatePreviewTemplate,
  type CreateTemplateRequest,
  type UpdateTemplateRequest,
  type ListTemplatesQuery,
  type PreviewTemplateRequest,
} from "./validation";
