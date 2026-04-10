import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { ResourceType, Language } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { getChatModel } from '@/lib/ai/provider';
import { checkResourceLimit, recordResourceUsage, formatLimitError } from '@/lib/license/usage';

interface CommentData {
  id: string;
  selectedText: string;
  text: string;
  authorName: string;
  authorColor: string;
  timestamp: number;
  isAiFilled?: boolean;
  aiValue?: string;
  aiDescription?: string;
  aiSourceField?: string;
}

// ---------------------------------------------------------------------------
// TipTap ProseMirror JSON helpers
// ---------------------------------------------------------------------------

interface TipTapNode {
  type: string;
  text?: string;
  content?: TipTapNode[];
  [key: string]: unknown;
}

function extractText(node: TipTapNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.content) {
    const text = node.content.map(extractText).join('');
    // Add newlines for block elements to help AI understand structure
    if (['paragraph', 'heading', 'listItem', 'blockquote'].includes(node.type)) {
      return text + '\n';
    }
    return text;
  }
  return '';
}

/**
 * Merges adjacent text nodes with identical marks to prevent placeholders
 * from being split across nodes (which breaks simple replaceAll).
 */
function normalizeContent(node: TipTapNode): TipTapNode {
  if (!node.content) return node;

  const newContent: TipTapNode[] = [];
  let lastNode: TipTapNode | null = null;

  for (let child of node.content) {
    child = normalizeContent(child);

    if (
      lastNode &&
      lastNode.type === 'text' &&
      child.type === 'text' &&
      JSON.stringify(lastNode.marks) === JSON.stringify(child.marks)
    ) {
      // Create a new object for lastNode to avoid in-place mutation of the original array items if they are reused
      const mergedNode: TipTapNode = { ...lastNode, text: (lastNode.text ?? '') + (child.text ?? '') };
      newContent[newContent.length - 1] = mergedNode;
      lastNode = mergedNode;
    } else {
      newContent.push(child);
      lastNode = child;
    }
  }

  return { ...node, content: newContent };
}

function replacePlaceholder(node: TipTapNode, placeholder: string, value: string): TipTapNode {
  if (node.type === 'text' && node.text) {
    return { ...node, text: node.text.replaceAll(placeholder, value) };
  }
  if (node.content) {
    return { ...node, content: node.content.map((c) => replacePlaceholder(c, placeholder, value)) };
  }
  return node;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    // Check AI Premium limit
    const result = await checkResourceLimit({
      plannerId: user.planner_id,
      type: ResourceType.AI_PREMIUM,
    });

    if (!result.allowed) {
      const errorMessage = await formatLimitError({
        resourceType: result.resourceType!,
        limit: result.limit!,
        used: result.used!,
        role: 'planner',
        language: user.preferred_language as Language || 'ES',
      });

      return NextResponse.json({
        success: false,
        error: {
          code: 'LIMIT_REACHED',
          message: errorMessage,
        },
      }, { status: 403 });
    }

    // Load contract with related data
    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
      include: {
        quote: { include: { line_items: true } },
        customer: { select: { name: true, couple_names: true, email: true, phone: true, id_number: true, address: true, notes: true } },
        weddings: { select: { id: true }, take: 1 },
      },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Load planner profile (company info)
    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: {
        name: true,
        legal_name: true,
        email: true,
        company_email: true,
        phone: true,
        address: true,
        vat_number: true,
        website: true,
      },
    });

    const quote = contract.quote;
    const customer = contract.customer;
    const todayDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const plannerInfo = [
      `Wedding Planner / Company:`,
      `  Name: ${planner?.legal_name ?? planner?.name ?? 'Unknown'}`,
      planner?.company_email ? `  Email: ${planner.company_email}` : null,
      planner?.email ? `  Personal email: ${planner.email}` : null,
      planner?.phone ? `  Phone: ${planner.phone}` : null,
      planner?.address ? `  Address: ${planner.address}` : null,
      planner?.vat_number ? `  VAT/Tax number: ${planner.vat_number}` : null,
      planner?.website ? `  Website: ${planner.website}` : null,
    ].filter(Boolean).join('\n');

    const clientInfo = [
      `Client / Couple:`,
      `  Name: ${customer?.name ?? quote?.couple_names ?? 'Unknown'}`,
      customer?.couple_names ? `  Couple names: ${customer.couple_names}` : (quote?.couple_names && quote.couple_names !== customer?.name ? `  Couple names: ${quote.couple_names}` : null),
      customer?.email ? `  Email: ${customer.email}` : null,
      customer?.phone ? `  Phone: ${customer.phone}` : null,
      customer?.id_number ? `  ID/Passport number: ${customer.id_number}` : null,
      customer?.address ? `  Address: ${customer.address}` : null,
      customer?.notes ? `  Notes: ${customer.notes}` : null,
    ].filter(Boolean).join('\n');

    const eventInfo = quote ? [
      `Event / Quote:`,
      quote.event_date ? `  Event date: ${new Date(quote.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : null,
      quote.location ? `  Location/Venue: ${quote.location}` : null,
      `  Total amount: ${new Intl.NumberFormat('en', { style: 'currency', currency: quote.currency }).format(Number(quote.total))}`,
      quote.line_items?.length ? `  Services included:\n${quote.line_items.map((li: { name: string; description: string | null; quantity: unknown; unit_price: unknown }) => `    - ${li.name}${li.description ? ': ' + li.description : ''} (${li.quantity} × ${li.unit_price} ${quote.currency})`).join('\n')}` : null,
    ].filter(Boolean).join('\n') : '';

    const contractText = extractText(contract.content as TipTapNode);

    const prompt = `You are an assistant that helps fill in contract placeholder values for a wedding planning business.

The planner has a contract template with placeholders (typically written as [PLACEHOLDER], {{PLACEHOLDER}}, or similar bracketed formats). Your job is to:
1. Detect the language of the contract text (e.g. English, Spanish, German, French, Italian)
2. Identify ALL text enclosed in brackets [] or {{}} as placeholders
3. For each placeholder, determine if it can be filled using the provided data
4. For placeholders that CAN be filled automatically, provide the fill value AND the sourceField key
5. For placeholders that CANNOT be filled (missing data), explain what needs to be provided

## Available Data

Today's Date: ${todayDate}

${plannerInfo}

${clientInfo}

${eventInfo}

## Contract Text

${contractText}

## Instructions

Return a JSON object with this exact structure:
{
  "detectedLanguage": "the language of the contract (e.g. Spanish)",
  "locale": "the BCP 47 language tag (e.g. es-ES, en-GB, de-DE, fr-FR, it-IT)",
  "placeholders": [
    {
      "placeholder": "exact placeholder text as it appears in the contract, e.g. [CLIENT_NAME]",
      "filled": true,
      "value": "the actual value to insert, translated/formatted to the contract's language",
      "description": "brief explanation of what was used to fill this, in the contract's language",
      "sourceField": "couple_names"
    },
    {
      "placeholder": "[VENUE_ADDRESS]",
      "filled": false,
      "value": null,
      "description": "Venue full address — not available in the data, in the contract's language",
      "sourceField": null
    }
  ]
}

Rules:
- Include EVERY bracketed placeholder you find in the contract, even if you cannot fill it. Be thorough.
- Use the exact placeholder text as it appears in the contract (including brackets).
- ALL returned text (values, descriptions) MUST be in the same language as the contract.
- For dates, use the appropriate format and month names for the detected language (e.g. "15 de junio de 2025" for Spanish, "15. Juni 2025" for German).
- For amounts, include the currency symbol.
- Only return the JSON object, no other text.
- client_name is the legal/physical person who signs the contract (the one whose ID number and address appear on the contract). Use client_name for placeholders like [CLIENT NAME], [NOMBRE DEL CLIENTE], [CONTRATANTE], etc.
- couple_names is the combined name of both partners (e.g. "Ana & Carlos"). Only use couple_names when the placeholder clearly refers to the couple together, such as [COUPLE], [NOVIOS], [BRIDE AND GROOM], etc. Do NOT use couple_names for generic "client" or "name" placeholders.
- For placeholders referring to the "Wedding", "Event", "Enlace", "Boda", etc., use the provided Event / Quote data. For example, [WEDDING_DATE], [FECHA DE LA BODA], or [FECHA DEL ENLACE] MUST use the event_date.
- For placeholders referring to the "Location", "Venue", "Lugar", "Ciudad", etc., use the event_location from the Event / Quote data if available.
- For sourceField, use ONLY one of these exact keys (or null if not mappable):
  planner_name, planner_email, planner_phone, planner_address, planner_vat, planner_website,
  couple_names, client_name, client_email, client_phone, client_id_number, client_address, client_notes,
  event_date, event_location, total_amount, today_date`;

    const { text } = await generateText({
      model: getChatModel(),
      prompt,
      temperature: 0,
    });

    // Record AI Premium usage
    void recordResourceUsage({
      plannerId: user.planner_id,
      weddingId: contract.weddings[0]?.id || null,
      type: ResourceType.AI_PREMIUM,
    });

    // Parse AI response
    let placeholders: Array<{
      placeholder: string;
      filled: boolean;
      value: string | null;
      description: string;
      sourceField: string | null;
    }> = [];
    let detectedLocale = 'en-GB';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        placeholders = parsed.placeholders ?? [];
        if (parsed.locale) detectedLocale = parsed.locale;
      }
    } catch (error) {
      console.error('Failed to parse AI response JSON:', { error, text });
    }

    // Apply AI fills to contract content
    let updatedContent = normalizeContent(contract.content as TipTapNode);
    for (const p of placeholders) {
      if (p.filled && p.value) {
        updatedContent = replacePlaceholder(updatedContent, p.placeholder, p.value);
      }
    }

    // Save updated content to DB (and maybe save the detected language for future use)
    if (placeholders.some((p) => p.filled)) {
      await prisma.contract.update({
        where: { id },
        data: { content: updatedContent as object, pdf_url: null },
      });
    }

    // Build comments for all placeholders (filled and unfilled)
    const comments: CommentData[] = placeholders.map((p) => ({
      id: Math.random().toString(36).slice(2),
      selectedText: p.placeholder,
      text: p.filled
        ? (detectedLocale.startsWith('es') ? `✅ Auto-completado: "${p.value}"\n${p.description}` : `✅ Auto-filled: "${p.value}"\n${p.description}`)
        : (detectedLocale.startsWith('es') ? `⚠️ Requiere completado manual\n${p.description}` : `⚠️ Needs manual fill\n${p.description}`),
      authorName: 'AI Assistant',
      authorColor: '#7c3aed',
      timestamp: Date.now(),
      isAiFilled: p.filled,
      aiValue: p.filled ? (p.value ?? undefined) : undefined,
      aiDescription: p.description,
      aiSourceField: p.sourceField ?? undefined,
    }));

    return NextResponse.json({ data: { comments, filledCount: placeholders.filter((p) => p.filled).length, totalCount: placeholders.length } });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
