# Email Templates

This directory contains React Email templates for all transactional emails in the Wedding Management Platform.

## Templates

### 1. Planner Invitation (`planner-invitation.tsx`)
Sent when a master admin invites a new wedding planner to the platform.

**Variables:**
- `plannerName`: Name of the invited planner
- `oauthLink`: OAuth sign-in link with invitation token

**Use Case:** Master admin creates new planner account

---

### 2. Admin Invitation (`admin-invitation.tsx`)
Sent when a planner invites a couple to manage their wedding.

**Variables:**
- `adminName`: Name of the invited admin
- `coupleNames`: Names of the couple (e.g., "John & Jane")
- `weddingDate`: Formatted wedding date
- `oauthLink`: OAuth sign-in link with wedding access token

**Use Case:** Planner grants wedding admin access to couple

---

### 3. RSVP Reminder (`rsvp-reminder.tsx`)
Sent to families who haven't confirmed their attendance.

**Variables:**
- `familyName`: Family surname
- `coupleNames`: Names of the couple
- `weddingDate`: Formatted wedding date
- `magicLink`: Personal magic link for RSVP

**Use Case:** Wedding admin sends manual reminders to pending families

---

### 4. RSVP Confirmation (`rsvp-confirmation.tsx`)
Sent after a family confirms their attendance.

**Variables:**
- `familyName`: Family surname
- `coupleNames`: Names of the couple
- `weddingDate`: Formatted wedding date

**Use Case:** Automatic confirmation after RSVP submission

---

### 5. Payment Confirmation (`payment-confirmation.tsx`)
Sent when a payment is received and confirmed.

**Variables:**
- `familyName`: Family surname
- `coupleNames`: Names of the couple
- `amount`: Payment amount with currency (e.g., "€100")

**Use Case:** Manual or automated payment confirmation

---

## Multi-Language Support

All templates support 5 languages:
- **Spanish (es)** - Primary language for Spanish market
- **English (en)** - Platform default and fallback
- **French (fr)** - Support for French-speaking guests
- **Italian (it)** - Support for Italian-speaking guests
- **German (de)** - Support for German-speaking guests

Each template includes complete translations for all UI text, ensuring a native experience for users in their preferred language.

## Design Principles

1. **Mobile-First**: Optimized for mobile email clients and WhatsApp in-app browser
2. **Responsive**: Adapts to different screen sizes
3. **Accessible**: High contrast, large text, clear CTAs
4. **Compatible**: Works across all major email clients
5. **Elderly-Friendly**: Simple language, clear instructions, large buttons

## Usage

Import and use templates through the email service:

```typescript
import { sendEmail, EmailTemplate } from '@/lib/email/resend';

await sendEmail({
  to: 'user@example.com',
  template: EmailTemplate.RSVP_REMINDER,
  language: 'es',
  variables: {
    familyName: 'García',
    coupleNames: 'Juan & María',
    weddingDate: '15 de Junio, 2024',
    magicLink: 'https://app.weddingplatform.com/rsvp/token123',
  },
});
```

## Development

To preview templates during development:

1. Use React Email CLI: `npx react-email dev`
2. Templates will be available at `http://localhost:3000`
3. Test all language variants
4. Verify responsive design on different screen sizes

## Testing

Test templates in multiple email clients:
- Gmail (web, iOS, Android)
- Outlook (web, desktop, mobile)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- WhatsApp in-app browser

## Styling

All templates use inline styles for maximum compatibility. Common styles are defined at the bottom of each template file.

**Color Palette:**
- Primary: `#5469d4` (blue)
- Success: `#28a745` (green)
- Warning: `#ffc107` (yellow)
- Text: `#333` (dark gray)
- Background: `#f6f9fc` (light blue-gray)

## Best Practices

1. Keep subject lines under 50 characters
2. Use clear, action-oriented CTAs
3. Include fallback text links for buttons
4. Test with images disabled
5. Ensure text is readable without images
6. Include contact information in footer
7. Use emoji sparingly for visual interest
8. Maintain consistent branding across templates

## Maintenance

When updating templates:
1. Update all 5 language variants
2. Test in multiple email clients
3. Verify mobile responsiveness
4. Check accessibility
5. Update this README if adding new templates
