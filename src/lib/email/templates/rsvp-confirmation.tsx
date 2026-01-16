/**
 * RSVP Confirmation Email Template
 * Sent after a family confirms their attendance
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Language } from '../../i18n/config';

interface RSVPConfirmationEmailProps {
  language: Language;
  familyName: string;
  coupleNames: string;
  weddingDate: string;
}

const translations = {
  es: {
    preview: '¡Gracias por confirmar tu asistencia!',
    greeting: 'Querida familia',
    intro: '¡Gracias por confirmar su asistencia a nuestra boda!',
    excited: 'Estamos muy emocionados de celebrar este día especial con ustedes.',
    weddingInfo: 'Detalles de la boda:',
    couple: 'Pareja:',
    date: 'Fecha:',
    nextSteps: 'Próximos pasos:',
    step1: 'Hemos recibido tu confirmación de asistencia',
    step2: 'Recibirás más información sobre el evento próximamente',
    step3: 'Si deseas realizar un regalo, encontrarás los detalles de pago en tu página de confirmación',
    step4: 'Puedes actualizar tu confirmación en cualquier momento usando tu enlace personal',
    important: 'Importante:',
    importantText: 'Si tus planes cambian o necesitas actualizar alguna información (como restricciones dietéticas o necesidades de accesibilidad), puedes hacerlo fácilmente accediendo a tu página de confirmación con el enlace que recibiste anteriormente.',
    lookingForward: 'Esperamos verte pronto y compartir este momento tan especial contigo.',
    questions: 'Si tienes alguna pregunta, no dudes en contactarnos.',
    thanks: 'Con cariño,',
  },
  en: {
    preview: 'Thank you for confirming your attendance!',
    greeting: 'Dear',
    intro: 'Thank you for confirming your attendance to our wedding!',
    excited: 'We are very excited to celebrate this special day with you.',
    weddingInfo: 'Wedding details:',
    couple: 'Couple:',
    date: 'Date:',
    nextSteps: 'Next steps:',
    step1: 'We have received your attendance confirmation',
    step2: 'You will receive more information about the event soon',
    step3: 'If you wish to give a gift, you will find payment details on your confirmation page',
    step4: 'You can update your confirmation at any time using your personal link',
    important: 'Important:',
    importantText: 'If your plans change or you need to update any information (such as dietary restrictions or accessibility needs), you can easily do so by accessing your confirmation page with the link you received earlier.',
    lookingForward: 'We look forward to seeing you soon and sharing this special moment with you.',
    questions: 'If you have any questions, please do not hesitate to contact us.',
    thanks: 'With love,',
  },
  fr: {
    preview: 'Merci d\'avoir confirmé votre présence!',
    greeting: 'Chère famille',
    intro: 'Merci d\'avoir confirmé votre présence à notre mariage!',
    excited: 'Nous sommes très heureux de célébrer ce jour spécial avec vous.',
    weddingInfo: 'Détails du mariage:',
    couple: 'Couple:',
    date: 'Date:',
    nextSteps: 'Prochaines étapes:',
    step1: 'Nous avons reçu votre confirmation de présence',
    step2: 'Vous recevrez bientôt plus d\'informations sur l\'événement',
    step3: 'Si vous souhaitez offrir un cadeau, vous trouverez les détails de paiement sur votre page de confirmation',
    step4: 'Vous pouvez mettre à jour votre confirmation à tout moment en utilisant votre lien personnel',
    important: 'Important:',
    importantText: 'Si vos plans changent ou si vous devez mettre à jour des informations (comme des restrictions alimentaires ou des besoins d\'accessibilité), vous pouvez facilement le faire en accédant à votre page de confirmation avec le lien que vous avez reçu précédemment.',
    lookingForward: 'Nous avons hâte de vous voir bientôt et de partager ce moment spécial avec vous.',
    questions: 'Si vous avez des questions, n\'hésitez pas à nous contacter.',
    thanks: 'Avec affection,',
  },
  it: {
    preview: 'Grazie per aver confermato la tua presenza!',
    greeting: 'Cara famiglia',
    intro: 'Grazie per aver confermato la tua presenza al nostro matrimonio!',
    excited: 'Siamo molto emozionati di celebrare questo giorno speciale con voi.',
    weddingInfo: 'Dettagli del matrimonio:',
    couple: 'Coppia:',
    date: 'Data:',
    nextSteps: 'Prossimi passi:',
    step1: 'Abbiamo ricevuto la tua conferma di presenza',
    step2: 'Riceverai presto maggiori informazioni sull\'evento',
    step3: 'Se desideri fare un regalo, troverai i dettagli di pagamento sulla tua pagina di conferma',
    step4: 'Puoi aggiornare la tua conferma in qualsiasi momento usando il tuo link personale',
    important: 'Importante:',
    importantText: 'Se i tuoi piani cambiano o devi aggiornare qualsiasi informazione (come restrizioni dietetiche o esigenze di accessibilità), puoi farlo facilmente accedendo alla tua pagina di conferma con il link che hai ricevuto in precedenza.',
    lookingForward: 'Non vediamo l\'ora di vederti presto e condividere questo momento speciale con te.',
    questions: 'Se hai domande, non esitare a contattarci.',
    thanks: 'Con affetto,',
  },
  de: {
    preview: 'Vielen Dank für Ihre Bestätigung!',
    greeting: 'Liebe Familie',
    intro: 'Vielen Dank für die Bestätigung Ihrer Teilnahme an unserer Hochzeit!',
    excited: 'Wir freuen uns sehr, diesen besonderen Tag mit Ihnen zu feiern.',
    weddingInfo: 'Hochzeitsdetails:',
    couple: 'Paar:',
    date: 'Datum:',
    nextSteps: 'Nächste Schritte:',
    step1: 'Wir haben Ihre Teilnahmebestätigung erhalten',
    step2: 'Sie erhalten bald weitere Informationen zur Veranstaltung',
    step3: 'Wenn Sie ein Geschenk machen möchten, finden Sie die Zahlungsdetails auf Ihrer Bestätigungsseite',
    step4: 'Sie können Ihre Bestätigung jederzeit über Ihren persönlichen Link aktualisieren',
    important: 'Wichtig:',
    importantText: 'Wenn sich Ihre Pläne ändern oder Sie Informationen aktualisieren müssen (wie Ernährungseinschränkungen oder Barrierefreiheitsbedürfnisse), können Sie dies einfach tun, indem Sie mit dem zuvor erhaltenen Link auf Ihre Bestätigungsseite zugreifen.',
    lookingForward: 'Wir freuen uns darauf, Sie bald zu sehen und diesen besonderen Moment mit Ihnen zu teilen.',
    questions: 'Wenn Sie Fragen haben, zögern Sie bitte nicht, uns zu kontaktieren.',
    thanks: 'Mit herzlichen Grüßen,',
  },
};

export const RSVPConfirmationEmail = ({
  language = 'en',
  familyName = 'Smith',
  coupleNames = 'John & Jane',
  weddingDate = 'June 15, 2024',
}: RSVPConfirmationEmailProps) => {
  const t = translations[language];

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={checkmarkSection}>
            <Text style={checkmark}>✓</Text>
          </Section>
          
          <Heading style={h1}>{t.greeting} {familyName},</Heading>
          
          <Text style={text}>{t.intro}</Text>
          
          <Text style={text}>{t.excited}</Text>
          
          <Section style={infoBox}>
            <Text style={infoTitle}>{t.weddingInfo}</Text>
            <Text style={infoText}>
              <strong>{t.couple}</strong> {coupleNames}
            </Text>
            <Text style={infoText}>
              <strong>{t.date}</strong> {weddingDate}
            </Text>
          </Section>
          
          <Text style={sectionTitle}>{t.nextSteps}</Text>
          
          <ul style={stepsList}>
            <li style={stepItem}>{t.step1}</li>
            <li style={stepItem}>{t.step2}</li>
            <li style={stepItem}>{t.step3}</li>
            <li style={stepItem}>{t.step4}</li>
          </ul>
          
          <Section style={importantBox}>
            <Text style={importantTitle}>{t.important}</Text>
            <Text style={importantText}>{t.importantText}</Text>
          </Section>
          
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
    </Html>
  );
};

export default RSVPConfirmationEmail;

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

const checkmarkSection = {
  textAlign: 'center' as const,
  padding: '40px 0 20px',
};

const checkmark = {
  fontSize: '64px',
  color: '#28a745',
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

const sectionTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '24px 0 12px',
  padding: '0 40px',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 40px',
};

const infoTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const infoText = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const stepsList = {
  margin: '16px 0',
  padding: '0 40px 0 60px',
};

const stepItem = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '12px 0',
};

const importantBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  padding: '16px 20px',
  margin: '24px 40px',
};

const importantTitle = {
  color: '#856404',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const importantText = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
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
