# Plan: Quotes & Finances Feature

## Summary

Add a **Quotes & Finances** section to the `/planner` page (new route `/planner/quotes-finances`) containing three sub-sections:
1. **Contract Templates** – reusable editable contract documents
2. **Quotes** – lightweight pre-wedding lead records with PDF generation
3. **Invoices & Payments** – invoice tracking with payment recording

---

## Recommended Libraries & External Services

### PDF Generation — `@react-pdf/renderer`
- **Why**: Native React/Next.js integration, runs server-side in Node, generates structured PDFs from JSX-like components. Already consistent with the project's React ecosystem. The alternative (puppeteer) is 300 MB+ and overkill for structured quotes/invoices.
- **Cost**: Free, MIT licence.
- **Used for**: Quote PDFs and Invoice PDFs.

### Rich-Text Contract Editor — `@tiptap/react` + core extensions
- **Why**: ProseMirror-based, excellent Next.js support, produces portable JSON content (easy to store in Prisma `Json` fields, consistent with `InvitationTemplate` blocks already in the schema). Has built-in collaboration extensions.
- **Cost**: Free (core). Collaboration extensions are also free when paired with Liveblocks.

### Real-Time Collaboration — Liveblocks (`@liveblocks/client`, `@liveblocks/react`, `@liveblocks/node`, `@liveblocks/yjs`)
- **Why**: Fully managed YJS backend – no separate WebSocket server needed (no infrastructure change). Has a first-class TipTap integration (`@liveblocks/react-tiptap`). Includes presence/cursors. The free tier covers **1,500 MAU** which is more than enough for a wedding-planner SaaS.
- **Cost**: Free tier (1,500 MAU/month). Next paid tier starts at $29/month.
- **Used for**: Collaborative contract editing – planner and client share a Liveblocks room URL, both see each other's cursors and changes live.
- **Note**: Requires `LIVEBLOCKS_SECRET` env var.

### eSignature — Dropbox Sign (HelloSign API)
- **Why**: REST API, embedded signing widget (no redirect away from the app), webhooks for completion. Much simpler integration than DocuSign. The `hellosign-sdk` npm package works well in Node.
- **Cost**: 3 signature requests/month free; $20/month for unlimited.
- **Note**: Requires `DROPBOX_SIGN_API_KEY` env var. The contract PDF is generated with `@react-pdf/renderer`, uploaded to Vercel Blob, then passed to the Dropbox Sign API as the document to sign.

---

## Database Schema Changes

### New Enums (add to `schema.prisma`)

```prisma
enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
}

enum ContractStatus {
  DRAFT
  SHARED
  SIGNING
  SIGNED
  CANCELLED
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PARTIAL
  PAID
  OVERDUE
  CANCELLED
}

enum PaymentMethod {
  BANK_TRANSFER
  CASH
  CREDIT_CARD
  CHECK
  OTHER
}
```

### New Models (add to `schema.prisma`)

```prisma
// Reusable contract text template (authored by the planner)
model ContractTemplate {
  id          String         @id @default(uuid())
  planner_id  String
  name        String
  content     Json           // TipTap ProseMirror JSON
  is_default  Boolean        @default(false)
  created_at  DateTime       @default(now())
  updated_at  DateTime       @updatedAt
  planner     WeddingPlanner @relation(fields: [planner_id], references: [id], onDelete: Cascade)
  contracts   Contract[]

  @@index([planner_id])
  @@map("contract_templates")
}

// Lightweight quote / lead record
model Quote {
  id                        String         @id @default(uuid())
  planner_id                String
  couple_names              String
  event_date                DateTime?
  location                  String?
  client_email              String?
  client_phone              String?
  notes                     String?        @db.Text
  status                    QuoteStatus    @default(DRAFT)
  currency                  String         @default("EUR")
  subtotal                  Decimal        @db.Decimal(10, 2)
  discount                  Decimal?       @db.Decimal(10, 2)
  tax_rate                  Decimal?       @db.Decimal(5, 2)
  total                     Decimal        @db.Decimal(10, 2)
  pdf_url                   String?
  expires_at                DateTime?
  converted_to_wedding_id   String?
  created_at                DateTime       @default(now())
  updated_at                DateTime       @updatedAt
  planner                   WeddingPlanner @relation(fields: [planner_id], references: [id], onDelete: Cascade)
  line_items                QuoteLineItem[]
  contract                  Contract?
  invoices                  Invoice[]

  @@index([planner_id])
  @@index([status])
  @@map("quotes")
}

model QuoteLineItem {
  id          String  @id @default(uuid())
  quote_id    String
  name        String
  description String?
  quantity    Decimal @db.Decimal(10, 2)
  unit_price  Decimal @db.Decimal(10, 2)
  total       Decimal @db.Decimal(10, 2)
  quote       Quote   @relation(fields: [quote_id], references: [id], onDelete: Cascade)

  @@index([quote_id])
  @@map("quote_line_items")
}

// Contract instance per quote/client (created from a ContractTemplate)
model Contract {
  id                   String           @id @default(uuid())
  planner_id           String
  quote_id             String?          @unique
  contract_template_id String?
  title                String
  content              Json             // TipTap ProseMirror JSON (working copy)
  status               ContractStatus   @default(DRAFT)
  share_token          String           @unique @default(uuid())  // public share URL token
  liveblocks_room_id   String?          @unique
  signing_request_id   String?          // Dropbox Sign request ID
  signing_url          String?          // URL for client to sign
  signed_pdf_url       String?
  signed_at            DateTime?
  signer_email         String?
  created_at           DateTime         @default(now())
  updated_at           DateTime         @updatedAt
  planner              WeddingPlanner   @relation(fields: [planner_id], references: [id], onDelete: Cascade)
  quote                Quote?           @relation(fields: [quote_id], references: [id], onDelete: SetNull)
  template             ContractTemplate? @relation(fields: [contract_template_id], references: [id], onDelete: SetNull)

  @@index([planner_id])
  @@index([status])
  @@map("contracts")
}

// Invoice (can be linked to a Quote)
model Invoice {
  id             String          @id @default(uuid())
  planner_id     String
  quote_id       String?
  invoice_number String          @unique
  client_name    String
  client_email   String?
  description    String?         @db.Text
  currency       String          @default("EUR")
  subtotal       Decimal         @db.Decimal(10, 2)
  tax_rate       Decimal?        @db.Decimal(5, 2)
  tax_amount     Decimal?        @db.Decimal(10, 2)
  total          Decimal         @db.Decimal(10, 2)
  amount_paid    Decimal         @default(0) @db.Decimal(10, 2)
  status         InvoiceStatus   @default(DRAFT)
  issued_at      DateTime?
  due_date       DateTime?
  pdf_url        String?
  created_at     DateTime        @default(now())
  updated_at     DateTime        @updatedAt
  planner        WeddingPlanner  @relation(fields: [planner_id], references: [id], onDelete: Cascade)
  quote          Quote?          @relation(fields: [quote_id], references: [id], onDelete: SetNull)
  line_items     InvoiceLineItem[]
  payments       Payment[]

  @@index([planner_id])
  @@index([status])
  @@index([quote_id])
  @@map("invoices")
}

model InvoiceLineItem {
  id          String  @id @default(uuid())
  invoice_id  String
  name        String
  description String?
  quantity    Decimal @db.Decimal(10, 2)
  unit_price  Decimal @db.Decimal(10, 2)
  total       Decimal @db.Decimal(10, 2)
  invoice     Invoice @relation(fields: [invoice_id], references: [id], onDelete: Cascade)

  @@index([invoice_id])
  @@map("invoice_line_items")
}

// Payment received against an invoice
model Payment {
  id           String        @id @default(uuid())
  invoice_id   String
  amount       Decimal       @db.Decimal(10, 2)
  currency     String        @default("EUR")
  payment_date DateTime
  method       PaymentMethod @default(BANK_TRANSFER)
  reference    String?
  notes        String?       @db.Text
  created_at   DateTime      @default(now())
  invoice      Invoice       @relation(fields: [invoice_id], references: [id], onDelete: Cascade)

  @@index([invoice_id])
  @@map("payments")
}
```

### Relations to add to existing models

- `WeddingPlanner`: add `contract_templates ContractTemplate[]`, `quotes Quote[]`, `contracts Contract[]`, `invoices Invoice[]`

---

## File Structure

```
prisma/
  migrations/
    YYYYMMDDHHMMSS_quotes_finances/   ← new migration

src/
  app/(public)/
    planner/
      quotes-finances/
        page.tsx                      ← main page (tabs: templates / quotes / invoices)
        contract-templates/
          [id]/
            page.tsx                  ← contract template editor (TipTap)
        contracts/
          [shareToken]/
            page.tsx                  ← public shared contract view/edit (Liveblocks)
    api/
      planner/
        contract-templates/
          route.ts                    ← GET list, POST create
          [id]/
            route.ts                  ← GET, PATCH, DELETE
        quotes/
          route.ts                    ← GET list, POST create
          [id]/
            route.ts                  ← GET, PATCH, DELETE
            generate-pdf/
              route.ts                ← POST → returns PDF blob URL
            contract/
              route.ts                ← POST create contract from template
        contracts/
          [id]/
            route.ts                  ← GET, PATCH
            generate-pdf/
              route.ts                ← POST → returns PDF blob URL
            send-for-signing/
              route.ts                ← POST → calls Dropbox Sign API
            liveblocks-auth/
              route.ts                ← POST → Liveblocks auth token for this room
        invoices/
          route.ts                    ← GET list, POST create
          [id]/
            route.ts                  ← GET, PATCH, DELETE
            generate-pdf/
              route.ts
            payments/
              route.ts                ← POST record payment
              [paymentId]/
                route.ts              ← DELETE payment
      webhooks/
        dropbox-sign/
          route.ts                    ← POST signing completion callback

  components/
    planner/
      quotes-finances/
        QuotesFinancesPage.tsx        ← tab controller component
        contract-templates/
          ContractTemplatesList.tsx
          ContractTemplateCard.tsx
          ContractTemplateEditor.tsx  ← TipTap editor (collaborative via Liveblocks)
        quotes/
          QuotesList.tsx
          QuoteCard.tsx
          QuoteForm.tsx               ← create/edit quote with line items
          QuotePDFPreview.tsx
        contracts/
          ContractsList.tsx
          ContractCard.tsx
          ContractEditor.tsx          ← TipTap editor with Liveblocks presence
          ContractSigningStatus.tsx
        invoices/
          InvoicesList.tsx
          InvoiceCard.tsx
          InvoiceForm.tsx
          InvoiceDetail.tsx           ← shows payments received, balance due
          PaymentForm.tsx             ← record a payment modal

  lib/
    pdf/
      quote-pdf.tsx                   ← @react-pdf/renderer components
      invoice-pdf.tsx
      contract-pdf.tsx                ← convert TipTap JSON → PDF for signing
    signing/
      dropbox-sign.ts                 ← Dropbox Sign API wrapper
    collaboration/
      liveblocks.ts                   ← Liveblocks client + server config
```

---

## Implementation Steps

### Phase 1 — Schema & Migration
1. Add new enums and models to `prisma/schema.prisma`
2. Add relations on `WeddingPlanner`
3. Run `prisma migrate dev --name quotes_finances`
4. Update Prisma client types

### Phase 2 — PDF Layer (`@react-pdf/renderer`)
1. Install `@react-pdf/renderer`
2. Create `src/lib/pdf/quote-pdf.tsx` — branded quote template using planner logo, couple names, line items table, totals, expiry
3. Create `src/lib/pdf/invoice-pdf.tsx` — invoice with payment history table, amount due
4. Create `src/lib/pdf/contract-pdf.tsx` — converts TipTap JSON blocks to `@react-pdf/renderer` text components
5. Create API routes `generate-pdf` for quotes, invoices, and contracts (uploads result to Vercel Blob, returns URL)

### Phase 3 — Contract Template Editor (TipTap, non-collaborative)
1. Install `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`
2. Build `ContractTemplateEditor.tsx` — standard single-user TipTap editor for creating/editing reusable contract templates (no real-time collaboration needed here, only the planner edits)
3. Add API routes for contract templates CRUD
4. Build `ContractTemplatesList.tsx` and `ContractTemplateCard.tsx`

### Phase 4 — Collaborative Contract Editor (Liveblocks)
1. Install `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/react-tiptap`, `@liveblocks/node`, `@liveblocks/yjs`
2. Create `src/lib/collaboration/liveblocks.ts` — configure Liveblocks client and server (room auth)
3. Add `LIVEBLOCKS_SECRET` to env vars
4. Build `ContractEditor.tsx` — TipTap editor wrapped with Liveblocks provider; shows collaborator cursors with names/colours
5. Create `/api/planner/contracts/[id]/liveblocks-auth/route.ts` — validates that requester is either the planner or holds the valid `share_token`, then returns a Liveblocks access token for the room
6. Create `/planner/contracts/[shareToken]/page.tsx` — public-facing page the planner sends the client; loads the contract via share token (no auth required), joins the Liveblocks room as an anonymous collaborator with the client's name (captured via a small entry form)
7. Add contract CRUD API routes and `ContractsList.tsx` / `ContractCard.tsx`

### Phase 5 — eSignature (Dropbox Sign)
1. Install `@dropbox/sign` (official npm package)
2. Create `src/lib/signing/dropbox-sign.ts` — `createSignatureRequest(contractPdfUrl, signerEmail, signerName, title)` function; supports embedded signing URL creation
3. Add `DROPBOX_SIGN_API_KEY` and `DROPBOX_SIGN_CLIENT_ID` env vars
4. Add `/api/planner/contracts/[id]/send-for-signing/route.ts` — generates PDF → uploads to Blob → creates Dropbox Sign request → stores `signing_request_id`, `signing_url`, sets status to `SIGNING`
5. Add `/api/webhooks/dropbox-sign/route.ts` — handles `signature_request_signed` event: updates contract status to `SIGNED`, stores `signed_pdf_url`, sets `signed_at`
6. Build `ContractSigningStatus.tsx` — displays signing status badge, a "Send for Signing" button, and an embedded signing iframe (via Dropbox Sign embedded flow) or a "Open signing link" button

### Phase 6 — Quotes CRUD + PDF
1. Build `QuoteForm.tsx` — form with couple names, date, location, contact info, dynamic line-items table (add/remove rows), currency selector, discount, tax rate, computed totals, expiry date
2. Build `QuotesList.tsx` + `QuoteCard.tsx` — status badge, total, couple names, action buttons (edit, generate PDF, create contract/invoice, mark accepted/rejected)
3. Add quotes API routes (GET list, POST create, GET/PATCH/DELETE single, POST generate-pdf)

### Phase 7 — Invoices & Payments
1. Build `InvoiceForm.tsx` — can be pre-populated from a Quote; same line-items pattern; adds due date and issued date
2. Build `InvoiceDetail.tsx` — shows invoice summary, payment history table, amount paid vs. balance due progress bar, "Record Payment" button
3. Build `PaymentForm.tsx` — amount, date, method (BANK_TRANSFER / CASH / CREDIT_CARD / CHECK / OTHER), reference, notes
4. Add invoice/payment API routes
5. Auto-compute `amount_paid` and update `Invoice.status` (`PARTIAL` / `PAID`) when payments are recorded or deleted

### Phase 8 — Quotes & Finances Page + Dashboard Integration
1. Create `/planner/quotes-finances/page.tsx` — server component fetching summary counts; renders `QuotesFinancesPage.tsx`
2. Build `QuotesFinancesPage.tsx` — tabbed layout ("Contract Templates" / "Quotes" / "Invoices & Payments") matching the existing card/section style from the planner dashboard
3. Add financial KPI cards at the top: Total Quotes (this month), Accepted Quotes, Invoiced Amount, Amount Received
4. Add a **Quotes & Finances** quick-link card to `/planner/page.tsx` (amber/yellow colour theme)
5. Add i18n keys for all new UI strings under `planner.quotesFinances.*`

---

## Environment Variables Required

```
LIVEBLOCKS_SECRET=sk_...          # from liveblocks.io dashboard
DROPBOX_SIGN_API_KEY=...          # from app.hellosign.com API settings
DROPBOX_SIGN_CLIENT_ID=...        # for embedded signing
DROPBOX_SIGN_WEBHOOK_SECRET=...   # for webhook signature verification
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Quote = separate model | `Quote` model (not a Wedding) | User requested lightweight record; avoids polluting the Wedding model with QUOTE status leads |
| PDF library | `@react-pdf/renderer` | Server-side, no Chromium, consistent with React codebase |
| Collaboration | Liveblocks (hosted YJS) | No additional server infrastructure; free tier generous; first-class TipTap support |
| Signing | Dropbox Sign | Simpler API than DocuSign; free for low volume; embedded signing possible |
| Contract content storage | TipTap ProseMirror JSON in `Json` field | Consistent with how `InvitationTemplate` stores block configs; human-readable diff-friendly |
| PDF for signing | Generated on-demand via `@react-pdf/renderer` from TipTap JSON | One pipeline for both preview and legally-submitted document |
