import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { getChatModel } from '@/lib/ai/provider';
import type { CommentData } from '@/components/planner/quotes-finances/contracts/ContractCommentsSidebar';

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
  if (node.content) return node.content.map(extractText).join(' ');
  return '';
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

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;

    // Load contract with related data
    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
      include: {
        quote: { include: { line_items: true } },
        customer: true,
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
      `  Couple names: ${quote?.couple_names ?? customer?.name ?? 'Unknown'}`,
      (customer?.name && customer.name !== quote?.couple_names) ? `  Customer name: ${customer.name}` : null,
      (customer?.email ?? quote?.client_email) ? `  Email: ${customer?.email ?? quote?.client_email}` : null,
      (customer?.phone ?? quote?.client_phone) ? `  Phone: ${customer?.phone ?? quote?.client_phone}` : null,
      customer?.id_number ? `  ID/Passport number: ${customer.id_number}` : null,
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
1. Identify ALL placeholders in the contract text
2. For each placeholder, determine if it can be filled using the provided data
3. For placeholders that CAN be filled automatically, provide the fill value AND the sourceField key
4. For placeholders that CANNOT be filled (missing data), explain what needs to be provided

## Available Data

${plannerInfo}

${clientInfo}

${eventInfo}

## Contract Text

${contractText}

## Instructions

Return a JSON object with this exact structure:
{
  "placeholders": [
    {
      "placeholder": "exact placeholder text as it appears in the contract, e.g. [CLIENT_NAME]",
      "filled": true,
      "value": "the actual value to insert",
      "description": "brief explanation of what was used to fill this",
      "sourceField": "couple_names"
    },
    {
      "placeholder": "[VENUE_ADDRESS]",
      "filled": false,
      "value": null,
      "description": "Venue full address — not available in the data, needs to be filled manually",
      "sourceField": null
    }
  ]
}

Rules:
- Include EVERY placeholder you find in the contract, even if you cannot fill it
- Use the exact placeholder text as it appears in the contract (including brackets)
- For dates, use the format "Day Month Year" (e.g. "15 June 2025")
- For amounts, include the currency symbol
- Only return the JSON object, no other text
- For sourceField, use ONLY one of these exact keys (or null if not mappable):
  planner_name, planner_email, planner_phone, planner_address, planner_vat, planner_website,
  couple_names, client_email, client_phone, client_id_number,
  event_date, event_location, total_amount`;

    const { text } = await generateText({
      model: getChatModel(),
      prompt,
      temperature: 0,
    });

    // Parse AI response
    let placeholders: Array<{
      placeholder: string;
      filled: boolean;
      value: string | null;
      description: string;
      sourceField: string | null;
    }> = [];

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        placeholders = parsed.placeholders ?? [];
      }
    } catch (error) {
      console.error('Failed to parse AI response JSON:', { error, text });
    }

    // Apply AI fills to contract content
    let updatedContent = contract.content as TipTapNode;
    for (const p of placeholders) {
      if (p.filled && p.value) {
        updatedContent = replacePlaceholder(updatedContent, p.placeholder, p.value);
      }
    }

    // Save updated content to DB
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
        ? `✅ Auto-filled: "${p.value}"\n${p.description}`
        : `⚠️ Needs manual fill\n${p.description}`,
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
