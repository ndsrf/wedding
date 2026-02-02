/**
 * Tests for WhatsApp variable mapping
 */

import {
  mapToWhatsAppVariables,
  getWhatsAppVariableMappingDisplay,
} from "../whatsapp-mapper";
import type { TemplateVariables } from "../renderer";

describe("WhatsApp Variable Mapper", () => {
  describe("mapToWhatsAppVariables", () => {
    it("should map all template variables to WhatsApp positions", () => {
      const variables: TemplateVariables = {
        familyName: "Smith Family",
        coupleNames: "John & Jane Doe",
        weddingDate: "Saturday, June 15, 2024",
        weddingTime: "4:00 PM",
        location: "Grand Ballroom",
        magicLink: "https://wedding.com/rsvp/abc123",
        rsvpCutoffDate: "Friday, May 31, 2024",
        referenceCode: "REF-12345",
      };

      const result = mapToWhatsAppVariables(variables);

      expect(result["1"]).toBe("Smith Family");
      expect(result["2"]).toBe("John & Jane Doe");
      expect(result["3"]).toBe("Saturday, June 15, 2024");
      expect(result["4"]).toBe("4:00 PM");
      expect(result["5"]).toBe(""); // No image URL provided
      expect(result["6"]).toBe("https://wedding.com/rsvp/abc123");
      expect(result["7"]).toBe("Friday, May 31, 2024");
      expect(result["8"]).toBe("REF-12345");
    });

    it("should extract filename from image URL for position 5", () => {
      const variables: TemplateVariables = {
        familyName: "Smith",
        coupleNames: "John & Jane",
        weddingDate: "June 15, 2024",
        weddingTime: "4:00 PM",
        location: "Ballroom",
        magicLink: "https://wedding.com/rsvp/abc",
        rsvpCutoffDate: "May 31, 2024",
      };

      const imageUrl =
        "https://cdn.example.com/images/wedding-invitation-2024.png";
      const result = mapToWhatsAppVariables(variables, imageUrl);

      expect(result["5"]).toBe("wedding-invitation-2024.png");
    });

    it("should handle relative image URLs", () => {
      const variables: TemplateVariables = {
        familyName: "Smith",
        coupleNames: "John & Jane",
        weddingDate: "June 15, 2024",
        weddingTime: "4:00 PM",
        location: "Ballroom",
        magicLink: "https://wedding.com/rsvp/abc",
        rsvpCutoffDate: "May 31, 2024",
      };

      const imageUrl = "/uploads/images/invitation.jpg";
      const result = mapToWhatsAppVariables(variables, imageUrl);

      expect(result["5"]).toBe("invitation.jpg");
    });

    it("should handle missing optional variables", () => {
      const variables: TemplateVariables = {
        familyName: "Smith",
        coupleNames: "John & Jane",
        weddingDate: "June 15, 2024",
        weddingTime: "4:00 PM",
        location: "Ballroom",
        magicLink: "https://wedding.com/rsvp/abc",
        rsvpCutoffDate: "May 31, 2024",
        // referenceCode is optional and missing
      };

      const result = mapToWhatsAppVariables(variables);

      expect(result["1"]).toBe("Smith");
      expect(result["8"]).toBe(""); // Empty string for missing optional variable
    });

    it("should handle empty image URL", () => {
      const variables: TemplateVariables = {
        familyName: "Smith",
        coupleNames: "John & Jane",
        weddingDate: "June 15, 2024",
        weddingTime: "4:00 PM",
        location: "Ballroom",
        magicLink: "https://wedding.com/rsvp/abc",
        rsvpCutoffDate: "May 31, 2024",
      };

      const result = mapToWhatsAppVariables(variables, "");

      expect(result["5"]).toBe("");
    });

    it("should handle undefined image URL", () => {
      const variables: TemplateVariables = {
        familyName: "Smith",
        coupleNames: "John & Jane",
        weddingDate: "June 15, 2024",
        weddingTime: "4:00 PM",
        location: "Ballroom",
        magicLink: "https://wedding.com/rsvp/abc",
        rsvpCutoffDate: "May 31, 2024",
      };

      const result = mapToWhatsAppVariables(variables, undefined);

      expect(result["5"]).toBe("");
    });
  });

  describe("getWhatsAppVariableMappingDisplay", () => {
    it("should return correct mapping display structure", () => {
      const display = getWhatsAppVariableMappingDisplay();

      expect(display).toHaveLength(8);
      expect(display[0]).toEqual({
        position: 1,
        appVariable: "familyName",
        placeholder: "{{1}}",
        description: "Family name",
      });
    });

    it("should have all positions from 1 to 8", () => {
      const display = getWhatsAppVariableMappingDisplay();

      for (let i = 0; i < 8; i++) {
        expect(display[i].position).toBe(i + 1);
      }
    });

    it("should have correct placeholder format", () => {
      const display = getWhatsAppVariableMappingDisplay();

      display.forEach((mapping) => {
        expect(mapping.placeholder).toMatch(/^\{\{[1-8]\}\}$/);
      });
    });
  });
});
