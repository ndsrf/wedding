/**
 * Payment Confirmation Email Template
 * Sent when a payment is received and confirmed
 */

import * as ReactEmail from '@react-email/components';
import {
  Body,
  Container,
  Head,
  Heading,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Language } from '../../i18n/config';

interface PaymentConfirmationEmailProps {
  language: Language;
  familyName: string;
  coupleNames: string;
  amount: string;
}

const translations = {
  es: {
    preview: 'Confirmación de pago recibido',
    greeting: 'Querida familia',
    intro: 'Hemos recibido tu generoso regalo para nuestra boda.',
    gratitude: '¡Muchas gracias por tu generosidad y por compartir este momento especial con nosotros!',
    paymentDetails: 'Detalles del pago:',
    amount: 'Monto:',
    status: 'Estado:',
    confirmed: 'Confirmado',
    message: 'Tu regalo significa mucho para nosotros y nos ayudará a comenzar nuestra vida juntos. Estamos muy agradecidos por tu apoyo y cariño.',
    lookingForward: 'Esperamos verte en la boda y celebrar juntos este día tan especial.',
    questions: 'Si tienes alguna pregunta sobre el pago, no dudes en contactarnos.',
    thanks: 'Con todo nuestro cariño y agradecimiento,',
  },
  en: {
    preview: 'Payment received confirmation',
    greeting: 'Dear',
    intro: 'We have received your generous gift for our wedding.',
    gratitude: 'Thank you so much for your generosity and for sharing this special moment with us!',
    paymentDetails: 'Payment details:',
    amount: 'Amount:',
    status: 'Status:',
    confirmed: 'Confirmed',
    message: 'Your gift means a lot to us and will help us start our life together. We are very grateful for your support and love.',
    lookingForward: 'We look forward to seeing you at the wedding and celebrating this special day together.',
    questions: 'If you have any questions about the payment, please do not hesitate to contact us.',
    thanks: 'With all our love and gratitude,',
  },
  fr: {
    preview: 'Confirmation de paiement reçu',
    greeting: 'Chère famille',
    intro: 'Nous avons reçu votre généreux cadeau pour notre mariage.',
    gratitude: 'Merci beaucoup pour votre générosité et pour partager ce moment spécial avec nous!',
    paymentDetails: 'Détails du paiement:',
    amount: 'Montant:',
    status: 'Statut:',
    confirmed: 'Confirmé',
    message: 'Votre cadeau signifie beaucoup pour nous et nous aidera à commencer notre vie ensemble. Nous sommes très reconnaissants pour votre soutien et votre amour.',
    lookingForward: 'Nous avons hâte de vous voir au mariage et de célébrer ensemble ce jour spécial.',
    questions: 'Si vous avez des questions sur le paiement, n\'hésitez pas à nous contacter.',
    thanks: 'Avec tout notre amour et notre gratitude,',
  },
  it: {
    preview: 'Conferma di pagamento ricevuto',
    greeting: 'Cara famiglia',
    intro: 'Abbiamo ricevuto il vostro generoso regalo per il nostro matrimonio.',
    gratitude: 'Grazie mille per la vostra generosità e per condividere questo momento speciale con noi!',
    paymentDetails: 'Dettagli del pagamento:',
    amount: 'Importo:',
    status: 'Stato:',
    confirmed: 'Confermato',
    message: 'Il vostro regalo significa molto per noi e ci aiuterà a iniziare la nostra vita insieme. Siamo molto grati per il vostro sostegno e amore.',
    lookingForward: 'Non vediamo l\'ora di vedervi al matrimonio e celebrare insieme questo giorno speciale.',
    questions: 'Se avete domande sul pagamento, non esitate a contattarci.',
    thanks: 'Con tutto il nostro amore e gratitudine,',
  },
  de: {
    preview: 'Zahlungsbestätigung erhalten',
    greeting: 'Liebe Familie',
    intro: 'Wir haben Ihr großzügiges Geschenk für unsere Hochzeit erhalten.',
    gratitude: 'Vielen Dank für Ihre Großzügigkeit und dafür, dass Sie diesen besonderen Moment mit uns teilen!',
    paymentDetails: 'Zahlungsdetails:',
    amount: 'Betrag:',
    status: 'Status:',
    confirmed: 'Bestätigt',
    message: 'Ihr Geschenk bedeutet uns sehr viel und wird uns helfen, unser gemeinsames Leben zu beginnen. Wir sind sehr dankbar für Ihre Unterstützung und Liebe.',
    lookingForward: 'Wir freuen uns darauf, Sie bei der Hochzeit zu sehen und diesen besonderen Tag gemeinsam zu feiern.',
    questions: 'Wenn Sie Fragen zur Zahlung haben, zögern Sie bitte nicht, uns zu kontaktieren.',
    thanks: 'Mit all unserer Liebe und Dankbarkeit,',
  },
};

export const PaymentConfirmationEmail = ({
  language = 'en',
  familyName = 'Smith',
  coupleNames = 'John & Jane',
  amount = '€100',
}: PaymentConfirmationEmailProps) => {
  const t = translations[language];

  return (
    <ReactEmail.Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={iconSection}>
            <Text style={icon}>💝</Text>
          </Section>
          
          <Heading style={h1}>{t.greeting} {familyName},</Heading>
          
          <Text style={text}>{t.intro}</Text>
          
          <Text style={gratitudeText}>{t.gratitude}</Text>
          
          <Section style={paymentBox}>
            <Text style={paymentTitle}>{t.paymentDetails}</Text>
            <Section style={paymentRow}>
              <Text style={paymentLabel}>{t.amount}</Text>
              <Text style={paymentValue}>{amount}</Text>
            </Section>
            <Section style={paymentRow}>
              <Text style={paymentLabel}>{t.status}</Text>
              <Text style={statusConfirmed}>{t.confirmed} ✓</Text>
            </Section>
          </Section>
          
          <Text style={text}>{t.message}</Text>
          
          <Text style={text}>{t.lookingForward}</Text>
          
          <Section style={footer}>
            <Text style={footerText}>{t.questions}</Text>
            <Text style={footerText}>
              {t.thanks}
              <br />
              {coupleNames}
            </Text>
          </Section>
        </Container>
      </Body>
    </ReactEmail.Html>
  );
};

export default PaymentConfirmationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const iconSection = {
  textAlign: 'center' as const,
  padding: '40px 0 20px',
};

const icon = {
  fontSize: '64px',
  margin: '0',
  lineHeight: '1',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '20px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const gratitudeText = {
  color: '#28a745',
  fontSize: '18px',
  fontWeight: 'bold',
  lineHeight: '28px',
  margin: '24px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const paymentBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 40px',
  border: '2px solid #28a745',
};

const paymentTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const paymentRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '12px 0',
  padding: '8px 0',
  borderBottom: '1px solid #dee2e6',
};

const paymentLabel = {
  color: '#666',
  fontSize: '15px',
  margin: '0',
  flex: '1',
};

const paymentValue = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'right' as const,
};

const statusConfirmed = {
  color: '#28a745',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'right' as const,
};

const footer = {
  borderTop: '1px solid #eaeaea',
  margin: '32px 0 0',
  padding: '24px 40px 0',
};

const footerText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};
