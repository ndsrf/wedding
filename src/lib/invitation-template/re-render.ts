import { prisma } from '@/lib/db/prisma';
import { preRenderTemplate } from './pre-renderer';
import { getSystemThemeById } from '@/lib/theme/presets';
import type { TemplateDesign } from '@/types/invitation-template';
import type { Prisma } from '@prisma/client';

/**
 * Re-renders all invitation templates for a specific wedding.
 * This should be called when the wedding theme changes to ensure
 * pre-rendered HTML and design colors are updated to match the new theme.
 * 
 * @param weddingId The ID of the wedding to re-render templates for
 */
export async function reRenderWeddingTemplates(weddingId: string): Promise<void> {
  try {
    // 1. Fetch wedding with its theme
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        theme: true,
      },
    });

    if (!wedding) {
      console.warn(`[Re-render] Wedding ${weddingId} not found`);
      return;
    }

    // 2. Get theme configuration
    let themeConfig: any = null;
    if (wedding.theme) {
      themeConfig = wedding.theme.config;
    } else if (wedding.theme_id) {
      const systemTheme = getSystemThemeById(wedding.theme_id);
      if (systemTheme) {
        themeConfig = systemTheme.config;
      }
    }

    if (!themeConfig) {
      console.warn(`[Re-render] No theme config found for wedding ${weddingId}`);
      // Even without theme, we might want to re-render to be safe,
      // but usually this is called because the theme changed.
    }

    // 3. Fetch all invitation templates for this wedding
    const templates = await prisma.invitationTemplate.findMany({
      where: { wedding_id: weddingId },
    });

    if (templates.length === 0) {
      return;
    }

    console.log(`[Re-render] Re-rendering ${templates.length} templates for wedding ${weddingId}`);

    // 4. Update each template
    for (const template of templates) {
      const design = template.design as unknown as TemplateDesign;
      
      // Update globalStyle from new theme if available
      if (themeConfig) {
        design.globalStyle.backgroundColor = themeConfig.colors.background;
        design.globalStyle.backgroundImage = themeConfig.images?.background || undefined;
        // Note: paperBackgroundImage is user-uploaded, so we keep it
      }

      // Re-render HTML
      const pre_rendered_html = preRenderTemplate(design);

      await prisma.invitationTemplate.update({
        where: { id: template.id },
        data: {
          design: design as unknown as Prisma.InputJsonValue,
          pre_rendered_html: pre_rendered_html as unknown as Prisma.InputJsonValue,
        },
      });
    }

    console.log(`[Re-render] Successfully re-rendered all templates for wedding ${weddingId}`);
  } catch (error) {
    console.error(`[Re-render] Failed to re-render templates for wedding ${weddingId}:`, error);
  }
}
