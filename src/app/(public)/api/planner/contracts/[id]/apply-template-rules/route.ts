import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { PlaceholderRule } from '@/app/(public)/api/planner/contract-templates/[id]/placeholder-rules/route';

// ---------------------------------------------------------------------------
// TipTap helpers
// ---------------------------------------------------------------------------

interface TipTapNode {
  type: string;
  text?: string;
  content?: TipTapNode[];
  [key: string]: unknown;
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
// Source-field resolver
// Maps the machine-readable key stored in PlaceholderRule.sourceField to the
// actual value from planner / quote / customer data.
// ---------------------------------------------------------------------------

type ResolveContext = {
  planner: {
    name: string | null;
    legal_name: string | null;
    email: string | null;
    company_email: string | null;
    phone: string | null;
    address: string | null;
    vat_number: string | null;
    website: string | null;
  } | null;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    id_number: string | null;
  } | null;
  quote: {
    couple_names: string;
    client_email: string | null;
    client_phone: string | null;
    event_date: Date | null;
    location: string | null;
    total: unknown;
    currency: string;
  } | null;
};

function resolveSourceField(sourceField: string, ctx: ResolveContext): string | null {
  const { planner, customer, quote } = ctx;
  switch (sourceField) {
    case 'planner_name':     return planner?.legal_name ?? planner?.name ?? null;
    case 'planner_email':    return planner?.company_email ?? planner?.email ?? null;
    case 'planner_phone':    return planner?.phone ?? null;
    case 'planner_address':  return planner?.address ?? null;
    case 'planner_vat':      return planner?.vat_number ?? null;
    case 'planner_website':  return planner?.website ?? null;
    case 'couple_names':     return quote?.couple_names ?? customer?.name ?? null;
    case 'client_email':     return customer?.email ?? quote?.client_email ?? null;
    case 'client_phone':     return customer?.phone ?? quote?.client_phone ?? null;
    case 'client_id_number': return customer?.id_number ?? null;
    case 'event_date':
      return quote?.event_date
        ? new Date(quote.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
    case 'event_location':   return quote?.location ?? null;
    case 'total_amount':
      return quote
        ? new Intl.NumberFormat('en', { style: 'currency', currency: quote.currency }).format(Number(quote.total))
        : null;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/planner/contracts/[id]/apply-template-rules
 *
 * Silently applies remembered placeholder rules from the contract's template
 * to the contract content. Runs without AI, generates no comments.
 * Safe to call on every page load — it is idempotent (already-replaced
 * placeholders are no longer present in the text so replaceAll is a no-op).
 * Does not modify SIGNED or CANCELLED contracts.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
      include: {
        quote: true,
        customer: true,
        template: { select: { placeholder_rules: true } },
      },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Do not touch signed or cancelled contracts
    if (contract.status === 'SIGNED' || contract.status === 'CANCELLED') {
      return NextResponse.json({ data: { filledCount: 0, content: contract.content } });
    }

    const rules = (contract.template?.placeholder_rules ?? []) as PlaceholderRule[];
    if (rules.length === 0) {
      return NextResponse.json({ data: { filledCount: 0, content: contract.content } });
    }

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: {
        name: true, legal_name: true, email: true, company_email: true,
        phone: true, address: true, vat_number: true, website: true,
      },
    });

    const ctx: ResolveContext = {
      planner: planner ?? null,
      customer: contract.customer,
      quote: contract.quote,
    };

    let content = contract.content as TipTapNode;
    let filledCount = 0;

    for (const rule of rules) {
      if (!rule.sourceField) continue;
      const value = resolveSourceField(rule.sourceField, ctx);
      if (!value) continue;
      content = replacePlaceholder(content, rule.placeholder, value);
      filledCount++;
    }

    if (filledCount > 0) {
      await prisma.contract.update({
        where: { id },
        data: { content: content as object, pdf_url: null },
      });
    }

    return NextResponse.json({ data: { filledCount, content } });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
