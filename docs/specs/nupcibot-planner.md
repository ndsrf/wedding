# NupciBot — Planner Variant Implementation Spec

## Context

NupciBot currently exists only in the `/admin` section. This spec covers adding it to the `/planner`
section with a different menu, different system prompt focus, and planner-specific AI tools.

### Settled design decisions

- **No outer-layout bot**: `NupciBot` is NOT added to `planner/layout.tsx` (the top-level planner
  shell). It only appears inside `/planner/weddings/[id]/` pages, where the wedding context is known.
- **Wedding-specific sub-layout**: A new `layout.tsx` at `/planner/weddings/[id]/layout.tsx` is the
  injection point. It extracts the wedding ID from `params` and passes it to the bot.
- **Single parameterized component**: `NupciBot` is extended with props rather than duplicated.
  The existing admin usage must not change.
- **Session storage isolation**: Admin and planner use separate storage keys to avoid state collision.
- **Message limit**: 5 user messages per session — same as admin.
- **No "message planner" screen**: Replaced by a "Contact Support" screen that emails Nupci support.
- **Chat API**: `/api/planner/nupcibot/chat` already exists and is ready. No changes needed there.

---

## Files to change

### 1. `src/components/shared/NupciBot.tsx`

Add four optional props:

```ts
interface NupciBotProps {
  variant?: 'admin' | 'planner';   // default: 'admin'
  apiEndpoint?: string;            // default: '/api/admin/nupcibot/chat'
  storageKey?: string;             // default: 'nupcibot_admin_state'
  weddingId?: string;              // optional — passed to chat API body
}

export function NupciBot({
  variant = 'admin',
  apiEndpoint = '/api/admin/nupcibot/chat',
  storageKey = 'nupcibot_admin_state',
  weddingId,
}: NupciBotProps) { ... }
```

**i18n namespace**: Switch namespace based on `variant`:
```ts
// Replace the hardcoded useTranslations('admin.nupcibot') with:
const t = useTranslations(variant === 'planner' ? 'planner.nupcibot' : 'admin.nupcibot');
```

**Session storage key**: Replace the hardcoded `'nupcibot_state'` constant with the `storageKey` prop.
Pass `storageKey` into `loadBotState`, `saveBotState`, and `clearBotState` (or make them use a
closure over a variable set at module scope driven by the prop).

The simplest implementation: convert the three storage helpers to accept a key parameter:
```ts
function loadBotState(key: string): typeof DEFAULT_BOT_STATE { ... }
function saveBotState(key: string, state: ...) { ... }
function clearBotState(key: string) { ... }
```

**Chat fetch**: Pass `weddingId` in the POST body when it is set:
```ts
body: JSON.stringify({
  message: trimmed,
  history: chatHistory,
  language: locale.toUpperCase(),
  userName,
  ...(weddingId ? { weddingId } : {}),
}),
```

Replace the hardcoded `'/api/admin/nupcibot/chat'` URL with `apiEndpoint`.

**Menu screen (`renderMenu`)**: Render different action buttons based on `variant`.

Admin variant (unchanged):
- Help configure my wedding → `router.push('/admin/wizard')`
- View and print lists → `router.push('/admin/reports')`
- Message my wedding planner → `setScreen('message-planner')`

Planner variant (new):
- View my weddings → `router.push('/planner/weddings')`
- View reports → `router.push('/planner/reports')`  
- Contact support → `setScreen('contact-support')`

**New screen: `'contact-support'`**:

Add `'contact-support'` to the `Screen` type:
```ts
type Screen = 'menu' | 'message-planner' | 'chat' | 'contact-support';
```

Add to `VALID_SCREENS`:
```ts
const VALID_SCREENS: Screen[] = ['menu', 'message-planner', 'chat', 'contact-support'];
```

Add to `screenTitles`:
```ts
'contact-support': {
  title: t('contactSupport.title'),
  subtitle: t('contactSupport.subtitle'),
},
```

The contact support screen is a simple form that posts to `/api/planner/nupcibot/contact-support`
(see section 3 below). It mirrors the structure of the existing `renderMessagePlanner` screen:
- Text field: topic / subject
- Textarea: message  
- Submit button → POST to `/api/planner/nupcibot/contact-support`
- Success state with back button

Add `renderContactSupport()` method that is analogous to `renderMessagePlanner()`, but calls the
new endpoint instead.

Update the panel content dispatcher:
```tsx
{screen === 'contact-support' && renderContactSupport()}
```

Update `handleBack` — it already resets to `'menu'`, which covers the new screen.

**Floating button label**: No change needed — "NupciBot" is correct for both variants.

---

### 2. `src/app/(public)/planner/weddings/[id]/layout.tsx` _(new file)_

This layout wraps all `/planner/weddings/[id]/*` pages and injects the wedding-scoped bot.

```tsx
'use client';

import { use } from 'react';
import type { ReactNode } from 'react';
import { NupciBot } from '@/components/shared/NupciBot';

interface WeddingLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default function WeddingLayout({ children, params }: WeddingLayoutProps) {
  const { id } = use(params);

  return (
    <>
      {children}
      <NupciBot
        variant="planner"
        apiEndpoint="/api/planner/nupcibot/chat"
        storageKey={`nupcibot_planner_${id}`}
        weddingId={id}
      />
    </>
  );
}
```

Note: `storageKey` is scoped per wedding ID so that switching between two weddings in the same
browser session does not mix chat histories.

---

### 3. `src/app/(public)/api/planner/nupcibot/contact-support/route.ts` _(new file)_

Contact support endpoint. Mirrors the structure of
`/api/admin/nupcibot/message-planner/route.ts` but sends to a Nupci support address rather than
the planner's couple.

```ts
/**
 * POST /api/planner/nupcibot/contact-support
 * Body: { topic: string, message: string }
 * Sends a support email to the Nupci support address on behalf of the planner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { resend } from '@/lib/email/resend';  // adjust import to match project pattern
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@nupci.com';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');

    const body = await request.json();
    const { topic, message } = body as { topic?: string; message?: string };

    if (!topic?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Topic and message are required' } },
        { status: 400 },
      );
    }

    await resend.emails.send({
      from: 'NupciBot <noreply@nupci.com>',   // adjust to match project's from address
      to: SUPPORT_EMAIL,
      subject: `[Planner Support] ${topic.trim()}`,
      text: `From: ${user.email}\n\n${message.trim()}`,
    });

    const response: APIResponse = { success: true };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } },
        { status: 401 },
      );
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner role required' } },
        { status: 403 },
      );
    }
    console.error('[NUPCIBOT] Contact support error:', error);
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to send message' } },
      { status: 500 },
    );
  }
}
```

Verify how `resend` is imported in other planner API routes (e.g. `message-planner/route.ts`) and
match the same pattern.

---

### 4. `src/lib/ai/rag-chat.ts`

Extend `buildSystemPrompt` to accept `role` and produce a planner-specific prompt when the caller
is a planner.

```ts
function buildSystemPrompt(
  language: string,
  role: 'wedding_admin' | 'planner',
  userName?: string,
  weddingDate?: string,
  coupleNames?: string,
): string {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS['EN'];
  const userLine = userName ? `You are talking to ${userName}. Address them by name when appropriate.\n` : '';
  const today = new Date().toISOString().split('T')[0];

  if (role === 'planner') {
    const weddingLine =
      weddingDate && coupleNames
        ? `You are currently viewing the wedding for ${coupleNames} (date: ${weddingDate}). `
        : 'No specific wedding is in context — you can answer general planner questions or help navigate the platform. ';

    return `You are NupciBot, a professional assistant for wedding planners on the Nupci platform.
Today's date is ${today}. ${weddingLine}
${userLine}
${langInstruction}

Your role is to help wedding planners manage their business: weddings, clients, invoices, contracts, providers, locations, and the Nupci platform itself.

## Instructions
1. ${langInstruction}
2. Be warm, concise, and professional. Use 1–3 short paragraphs.
3. ALWAYS call search_knowledge_base before answering any question that could be covered by available documentation. This includes platform features, ways of working, contract templates, payment workflows, provider management, and any other topic where a document or manual might exist.
4. Use get_guest_list and get_rsvp_status to answer questions about guests and RSVPs for the current wedding (when weddingId is available).
5. Use update_family_rsvp to manually change guest attendance when requested.
6. Use get_planner_weddings to get an overview of all weddings you manage.
7. Use get_wedding_invoices to look up invoice and payment information for the current wedding.
8. Use get_wedding_providers to look up providers assigned to the current wedding.
9. Use add_reminder to add reminders or tasks to the wedding checklist.
   - Resolve relative dates (tomorrow, next week, 1 month before the wedding) to absolute YYYY-MM-DD using today (${today}).
   - For dates relative to the wedding date, use dueDateRelative with format "WEDDING_DATE-30".
10. If update_family_rsvp returns multiple matching families, list them and ask which one to update.
11. Only answer questions relevant to wedding planning and business management.
12. IMPORTANT — answer specificity:
    - If search_knowledge_base or a data tool returns relevant results, ground your answer in that content.
    - If the tools return nothing relevant, say so explicitly. Do not guess or give a generic answer.
13. IMPORTANT — References: (same rules as admin prompt — only append when citing documents)
    Format exactly as:

References
- filename.pdf|https://url.com

    Omit the References section entirely when no document content was cited.`;
  }

  // ── Admin prompt (existing logic, unchanged) ──────────────────────────────
  const weddingLine =
    weddingDate && coupleNames
      ? `The wedding for ${coupleNames} is on ${weddingDate}. `
      : '';

  return `You are NupciBot, a professional wedding assistant for the Nupci platform.
Today's date is ${today}. ${weddingLine}
${userLine}
${langInstruction}
... (existing prompt body unchanged) ...`;
}
```

Update the two call sites in `streamRagChat` and `generateRagReply`:
```ts
const system = buildSystemPrompt(language, role, userName, weddingDate, coupleNames);
```

---

### 5. `src/lib/ai/tools.ts`

Add three planner-specific tools inside `buildTools`. They are only functional when the context
has a `plannerId` (and optionally a `weddingId`).

#### `get_planner_weddings`

```ts
get_planner_weddings: tool({
  description:
    'Get a list of all weddings managed by this planner. Returns wedding names, dates, guest counts, and RSVP completion.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    if (!ctx.plannerId) return { error: 'No planner context available' };
    try {
      const weddings = await prisma.wedding.findMany({
        where: { planner_id: ctx.plannerId },
        select: {
          id: true,
          couple_names: true,
          wedding_date: true,
          _count: { select: { families: true } },
        },
        orderBy: { wedding_date: 'asc' },
      });

      // For each wedding compute RSVP completion
      const results = await Promise.all(
        weddings.map(async (w) => {
          const families = await prisma.family.findMany({
            where: { wedding_id: w.id },
            include: { members: { select: { attending: true } } },
          });
          const total = families.length;
          const submitted = families.filter((f) => f.members.some((m) => m.attending !== null)).length;
          return {
            id: w.id,
            coupleNames: w.couple_names,
            weddingDate: w.wedding_date.toISOString().split('T')[0],
            totalFamilies: total,
            rsvpSubmitted: submitted,
            rsvpPending: total - submitted,
            completionPct: total > 0 ? Math.round((submitted / total) * 100) : 0,
          };
        }),
      );

      return results;
    } catch (err) {
      console.error('[TOOLS] get_planner_weddings error:', err);
      return { error: 'Failed to retrieve weddings' };
    }
  },
}),
```

#### `get_wedding_invoices`

```ts
get_wedding_invoices: tool({
  description:
    'Get a summary of invoices and payments for the current wedding. Returns invoice status, amounts, and outstanding balances.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    if (!ctx.weddingId) return { error: 'No wedding context available' };
    try {
      const invoices = await prisma.invoice.findMany({
        where: { wedding_id: ctx.weddingId },
        include: {
          line_items: { select: { description: true, quantity: true, unit_price: true } },
          payments: { select: { amount: true, paid_at: true } },
        },
        orderBy: { created_at: 'desc' },
      });

      return invoices.map((inv) => {
        const total = inv.line_items.reduce((sum, li) => sum + li.quantity * Number(li.unit_price), 0);
        const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        return {
          id: inv.id,
          status: inv.status,
          total,
          paid,
          outstanding: total - paid,
          lineItemCount: inv.line_items.length,
          paymentCount: inv.payments.length,
        };
      });
    } catch (err) {
      console.error('[TOOLS] get_wedding_invoices error:', err);
      return { error: 'Failed to retrieve invoices' };
    }
  },
}),
```

#### `get_wedding_providers`

```ts
get_wedding_providers: tool({
  description:
    'Get the list of providers (vendors) assigned to the current wedding, including their category and payment status.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    if (!ctx.weddingId) return { error: 'No wedding context available' };
    try {
      const weddingProviders = await prisma.weddingProvider.findMany({
        where: { wedding_id: ctx.weddingId },
        include: {
          provider: {
            select: {
              name: true,
              category: { select: { name: true } },
              phone: true,
              email: true,
            },
          },
          payments: { select: { amount: true, paid_at: true } },
        },
        orderBy: { created_at: 'asc' },
      });

      return weddingProviders.map((wp) => {
        const totalPaid = wp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        return {
          providerName: wp.provider.name,
          category: wp.provider.category?.name ?? 'Unknown',
          agreedAmount: wp.agreed_amount ? Number(wp.agreed_amount) : null,
          totalPaid,
          outstanding: wp.agreed_amount ? Number(wp.agreed_amount) - totalPaid : null,
          phone: wp.provider.phone,
          email: wp.provider.email,
        };
      });
    } catch (err) {
      console.error('[TOOLS] get_wedding_providers error:', err);
      return { error: 'Failed to retrieve providers' };
    }
  },
}),
```

**Important**: Before copying these queries verbatim, verify the Prisma field names against
`prisma/schema.prisma`. Field names to check:
- `Invoice`: `status`, `created_at`, relation to `line_items`, `payments`
- `InvoiceLineItem`: `description`, `quantity`, `unit_price`
- `InvoicePayment`: `amount`, `paid_at`
- `WeddingProvider`: `agreed_amount`, `created_at`, relation to `payments`
- `Payment` (on WeddingProvider): `amount`, `paid_at`
- `Provider`: `name`, `phone`, `email`, relation `category`
- `ProviderCategory`: `name`

---

### 6. i18n — `src/messages/*/common.json`

Add the `planner.nupcibot` block to all five locale files. Add it inside the existing `"planner": {}`
object (create it if it doesn't exist).

The `contactSupport` section replaces `messagePlanner` from the admin variant.
The `referencesTitle` and `chat` keys are shared across variants but must still be present in
both namespaces.

#### English (`en/common.json`)

```json
"planner": {
  "nupcibot": {
    "subtitle": "Your planning assistant",
    "close": "Close",
    "referencesTitle": "References",
    "greeting": "Hi! I'm NupciBot, your planning assistant. I can help with guests, invoices, providers, and anything about your weddings.",
    "viewWeddings": "View my weddings",
    "viewReports": "View reports",
    "contactSupport": {
      "button": "Contact Nupci support",
      "title": "Contact Support",
      "subtitle": "Send a message to the Nupci team",
      "description": "Have a question or issue? Send us a message and we'll get back to you by email.",
      "topicLabel": "Topic / Subject",
      "topicPlaceholder": "e.g. Question about invoices",
      "messageLabel": "Your message",
      "messagePlaceholder": "Write your message here...",
      "send": "Send Message",
      "sending": "Sending...",
      "back": "Back to menu",
      "successTitle": "Message sent!",
      "successDesc": "The Nupci team will reply to your email shortly.",
      "errorGeneric": "Failed to send message. Please try again."
    },
    "chat": {
      "title": "NupciBot Chat",
      "subtitle": "Ask me anything",
      "greeting": "Hi! Ask me anything — guest lists, RSVPs, invoices, providers, or how the platform works.",
      "menuPlaceholder": "Ask me anything...",
      "placeholder": "Type a question...",
      "errorReply": "Sorry, I couldn't generate a reply right now. Please try again.",
      "limitReached": "You've reached the limit of 5 questions per session. Please close the chat and open it again to start a new conversation."
    }
  }
}
```

#### Spanish (`es/common.json`)

```json
"planner": {
  "nupcibot": {
    "subtitle": "Tu asistente de planificación",
    "close": "Cerrar",
    "referencesTitle": "Referencias",
    "greeting": "¡Hola! Soy NupciBot, tu asistente de planificación. Puedo ayudarte con invitados, facturas, proveedores y todo sobre tus bodas.",
    "viewWeddings": "Ver mis bodas",
    "viewReports": "Ver informes",
    "contactSupport": {
      "button": "Contactar soporte de Nupci",
      "title": "Contactar soporte",
      "subtitle": "Envía un mensaje al equipo de Nupci",
      "description": "¿Tienes una pregunta o problema? Envíanos un mensaje y te responderemos por email.",
      "topicLabel": "Tema / Asunto",
      "topicPlaceholder": "ej. Pregunta sobre facturas",
      "messageLabel": "Tu mensaje",
      "messagePlaceholder": "Escribe tu mensaje aquí...",
      "send": "Enviar mensaje",
      "sending": "Enviando...",
      "back": "Volver al menú",
      "successTitle": "¡Mensaje enviado!",
      "successDesc": "El equipo de Nupci responderá a tu email en breve.",
      "errorGeneric": "No se pudo enviar el mensaje. Inténtalo de nuevo."
    },
    "chat": {
      "title": "Chat con NupciBot",
      "subtitle": "Pregúntame lo que quieras",
      "greeting": "¡Hola! Pregúntame lo que quieras: listas de invitados, RSVPs, facturas, proveedores o cómo funciona la plataforma.",
      "menuPlaceholder": "Pregúntame lo que quieras...",
      "placeholder": "Escribe una pregunta...",
      "errorReply": "Lo siento, no pude generar una respuesta ahora mismo. Inténtalo de nuevo.",
      "limitReached": "Has alcanzado el límite de 5 preguntas por sesión. Por favor, cierra el chat y ábrelo de nuevo para iniciar una nueva conversación."
    }
  }
}
```

#### French (`fr/common.json`)

```json
"planner": {
  "nupcibot": {
    "subtitle": "Votre assistant de planification",
    "close": "Fermer",
    "referencesTitle": "Références",
    "greeting": "Bonjour ! Je suis NupciBot, votre assistant de planification. Je peux vous aider avec les invités, les factures, les prestataires et tout ce qui concerne vos mariages.",
    "viewWeddings": "Voir mes mariages",
    "viewReports": "Voir les rapports",
    "contactSupport": {
      "button": "Contacter le support Nupci",
      "title": "Contacter le support",
      "subtitle": "Envoyez un message à l'équipe Nupci",
      "description": "Vous avez une question ou un problème ? Envoyez-nous un message et nous vous répondrons par email.",
      "topicLabel": "Sujet",
      "topicPlaceholder": "ex. Question sur les factures",
      "messageLabel": "Votre message",
      "messagePlaceholder": "Écrivez votre message ici...",
      "send": "Envoyer le message",
      "sending": "Envoi en cours...",
      "back": "Retour au menu",
      "successTitle": "Message envoyé !",
      "successDesc": "L'équipe Nupci vous répondra par email sous peu.",
      "errorGeneric": "Impossible d'envoyer le message. Veuillez réessayer."
    },
    "chat": {
      "title": "Chat NupciBot",
      "subtitle": "Posez-moi n'importe quelle question",
      "greeting": "Bonjour ! Posez-moi toutes vos questions — listes d'invités, RSVPs, factures, prestataires ou fonctionnement de la plateforme.",
      "menuPlaceholder": "Demandez-moi ce que vous voulez...",
      "placeholder": "Posez une question...",
      "errorReply": "Désolé, je n'ai pas pu générer de réponse pour l'instant. Veuillez réessayer.",
      "limitReached": "Vous avez atteint la limite de 5 questions par session. Veuillez fermer le chat et le rouvrir pour démarrer une nouvelle conversation."
    }
  }
}
```

#### Italian (`it/common.json`)

```json
"planner": {
  "nupcibot": {
    "subtitle": "Il tuo assistente di pianificazione",
    "close": "Chiudi",
    "referencesTitle": "Riferimenti",
    "greeting": "Ciao! Sono NupciBot, il tuo assistente di pianificazione. Posso aiutarti con gli ospiti, le fatture, i fornitori e tutto ciò che riguarda i tuoi matrimoni.",
    "viewWeddings": "Vedi i miei matrimoni",
    "viewReports": "Vedi i rapporti",
    "contactSupport": {
      "button": "Contatta il supporto Nupci",
      "title": "Contatta il supporto",
      "subtitle": "Invia un messaggio al team Nupci",
      "description": "Hai una domanda o un problema? Inviaci un messaggio e ti risponderemo via email.",
      "topicLabel": "Argomento / Oggetto",
      "topicPlaceholder": "es. Domanda sulle fatture",
      "messageLabel": "Il tuo messaggio",
      "messagePlaceholder": "Scrivi il tuo messaggio qui...",
      "send": "Invia messaggio",
      "sending": "Invio in corso...",
      "back": "Torna al menu",
      "successTitle": "Messaggio inviato!",
      "successDesc": "Il team Nupci ti risponderà via email a breve.",
      "errorGeneric": "Impossibile inviare il messaggio. Riprova."
    },
    "chat": {
      "title": "Chat NupciBot",
      "subtitle": "Chiedimi qualsiasi cosa",
      "greeting": "Ciao! Chiedimi qualsiasi cosa — liste ospiti, RSVP, fatture, fornitori o come funziona la piattaforma.",
      "menuPlaceholder": "Chiedimi quello che vuoi...",
      "placeholder": "Fai una domanda...",
      "errorReply": "Mi dispiace, non ho potuto generare una risposta in questo momento. Riprova.",
      "limitReached": "Hai raggiunto il limite di 5 domande per sessione. Per favore, chiudi la chat e riaprila per iniziare una nuova conversazione."
    }
  }
}
```

#### German (`de/common.json`)

```json
"planner": {
  "nupcibot": {
    "subtitle": "Ihr Planungsassistent",
    "close": "Schließen",
    "referencesTitle": "Referenzen",
    "greeting": "Hallo! Ich bin NupciBot, Ihr Planungsassistent. Ich helfe Ihnen mit Gästen, Rechnungen, Dienstleistern und allem rund um Ihre Hochzeiten.",
    "viewWeddings": "Meine Hochzeiten anzeigen",
    "viewReports": "Berichte anzeigen",
    "contactSupport": {
      "button": "Nupci-Support kontaktieren",
      "title": "Support kontaktieren",
      "subtitle": "Nachricht an das Nupci-Team senden",
      "description": "Haben Sie eine Frage oder ein Problem? Schicken Sie uns eine Nachricht und wir antworten per E-Mail.",
      "topicLabel": "Betreff",
      "topicPlaceholder": "z.B. Frage zu Rechnungen",
      "messageLabel": "Ihre Nachricht",
      "messagePlaceholder": "Schreiben Sie hier Ihre Nachricht...",
      "send": "Nachricht senden",
      "sending": "Wird gesendet...",
      "back": "Zurück zum Menü",
      "successTitle": "Nachricht gesendet!",
      "successDesc": "Das Nupci-Team wird Ihnen in Kürze per E-Mail antworten.",
      "errorGeneric": "Nachricht konnte nicht gesendet werden. Bitte erneut versuchen."
    },
    "chat": {
      "title": "NupciBot Chat",
      "subtitle": "Stellen Sie mir beliebige Fragen",
      "greeting": "Hallo! Stellen Sie mir beliebige Fragen — Gästelisten, RSVPs, Rechnungen, Dienstleister oder die Funktionsweise der Plattform.",
      "menuPlaceholder": "Fragen Sie mich alles...",
      "placeholder": "Frage eingeben...",
      "errorReply": "Entschuldigung, ich konnte gerade keine Antwort generieren. Bitte erneut versuchen.",
      "limitReached": "Sie haben das Limit von 5 Fragen pro Sitzung erreicht. Bitte schließen Sie den Chat und öffnen Sie ihn erneut, um eine neue Unterhaltung zu beginnen."
    }
  }
}
```

---

## Implementation order

Follow this sequence to keep the app buildable at every step.

1. **i18n first** — Add `planner.nupcibot` keys to all five locale files. Nothing breaks; keys are
   just unused until the component uses them.

2. **Extend `NupciBot` props** — Add the four props with their defaults. The admin call site in
   `planner/layout.tsx` is a TODO/comment and not rendered yet, so existing admin usage is unchanged.
   Verify the admin section still works.

3. **Extend `buildSystemPrompt`** in `rag-chat.ts` — Add the planner branch. No UI change; just
   tested by calling the planner chat API.

4. **Add planner tools** in `tools.ts` — Verify Prisma field names before committing. Test each
   tool manually via the planner chat API (curl or Postman) before wiring the UI.

5. **New contact-support API route** — Port from the message-planner route. Smoke test with a
   curl POST.

6. **Create wedding sub-layout** at `/planner/weddings/[id]/layout.tsx`. Test that navigating to
   a wedding detail page shows the floating bot button.

7. **Planner menu items + contact-support screen in `NupciBot`** — Add the planner menu buttons
   and the `renderContactSupport` screen. Test the full flow end-to-end.

---

## Existing admin call site — no changes needed

`src/app/(public)/admin/layout.tsx` currently renders:
```tsx
<NupciBot />
```

After the props are added with defaults, this remains valid and functionally identical. No changes
are needed to the admin layout.

---

## Environment variable

The contact-support route uses `process.env.SUPPORT_EMAIL`. Add this to `.env` and any
deployment environment:

```
SUPPORT_EMAIL=support@nupci.com
```
