/**
 * WhatsApp Content Template Variable Mapping
 * Maps application variables to Twilio WhatsApp {{1}}-{{9}} variable placeholders
 */

import path from "path";
import type { TemplateVariables } from "./renderer";

/**
 * Mapping of app variables to WhatsApp template variable positions
 */
export const WHATSAPP_VARIABLE_MAPPING = {
  familyName: { position: 1, description: "Family name" },
  coupleNames: { position: 2, description: "Couple names" },
  weddingDate: { position: 3, description: "Wedding date" },
  weddingTime: { position: 4, description: "Wedding time" },
  inviteImageName: { position: 5, description: "Invite image filename" },
  magicLink: { position: 6, description: "Magic link for RSVP" },
  rsvpCutoffDate: { position: 7, description: "RSVP cutoff date" },
  referenceCode: { position: 8, description: "Family reference code" },
  location: { position: 9, description: "Wedding location" },
} as const;

/**
 * Convert template variables to WhatsApp variable format
 * Extracts filename from imageUrl for position 5
 */
export function mapToWhatsAppVariables(
  variables: TemplateVariables,
  imageUrl?: string
): Record<string, string> {
  const result: Record<string, string> = {};

  // Determine if using Vercel Blob Storage
  const isVercel =
    process.env.PLATFORM_OPTIMIZATION?.toLowerCase() === "vercel" ||
    !!process.env.BLOB_READ_WRITE_TOKEN;

  // Extract filename from image URL if provided
  let inviteImageName = "";
  if (imageUrl) {
    if (isVercel) {
      // For Vercel: pass the full URL as-is (with query parameters)
      inviteImageName = imageUrl;
    } else {
      // For non-Vercel: extract just the filename
      try {
        // Parse URL to handle query parameters correctly
        const url = new URL(imageUrl);
        // Get pathname and extract just the filename without query params
        inviteImageName = path.basename(url.pathname);
      } catch {
        // Fallback to path.basename if URL parsing fails (for relative paths)
        inviteImageName = path.basename(imageUrl);
      }
    }
  }

  // Map each variable to its position
  result["1"] = variables.familyName || "";
  result["2"] = variables.coupleNames || "";
  result["3"] = variables.weddingDate || "";
  result["4"] = variables.weddingTime || "";
  result["5"] = inviteImageName;
  result["6"] = variables.magicLink || "";
  result["7"] = variables.rsvpCutoffDate || "";
  result["8"] = variables.referenceCode || "";
  result["9"] = variables.location || "";

  return result;
}

/**
 * Get mapping information for display in UI
 */
export function getWhatsAppVariableMappingDisplay() {
  return [
    {
      position: 1,
      appVariable: "familyName",
      placeholder: "{{1}}",
      description: "Family name",
    },
    {
      position: 2,
      appVariable: "coupleNames",
      placeholder: "{{2}}",
      description: "Couple names",
    },
    {
      position: 3,
      appVariable: "weddingDate",
      placeholder: "{{3}}",
      description: "Wedding date",
    },
    {
      position: 4,
      appVariable: "weddingTime",
      placeholder: "{{4}}",
      description: "Wedding time",
    },
    {
      position: 5,
      appVariable: "inviteImageName",
      placeholder: "{{5}}",
      description: "Image filename (extracted from URL)",
    },
    {
      position: 6,
      appVariable: "magicLink",
      placeholder: "{{6}}",
      description: "Magic link for RSVP",
    },
    {
      position: 7,
      appVariable: "rsvpCutoffDate",
      placeholder: "{{7}}",
      description: "RSVP cutoff date",
    },
    {
      position: 8,
      appVariable: "referenceCode",
      placeholder: "{{8}}",
      description: "Family reference code",
    },
    {
      position: 9,
      appVariable: "location",
      placeholder: "{{9}}",
      description: "Wedding location",
    },
  ];
}
