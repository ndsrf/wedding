/**
 * RSVP Reminder Email Template
 * Sent to families who haven't confirmed their attendance
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Language } from '../../i18n/config';

interface RSVPReminderEmailProps {
  language: Language;
  familyName: string;
  coupleNames: string;
  weddingDate: string;
  magicLink: string;
}

const translations = {
  es: {
    preview: 'Recordatorio: Confirma tu asistencia a la boda',
    greeting: 'Hola familia',
    intro: 'Esperamos que estén bien. Les escribimos para recordarles que aún no hemos recibido la confirmación de su asistencia a la boda de',
    weddingDate: 'Fecha de la boda:',
    importance: 'Su confirmación es muy importante para nosotros, ya que nos ayuda a planificar mejor el evento y asegurarnos de que todos nuestros invitados tengan una experiencia maravillosa.',
    easy: 'Confirmar su asistencia es muy fácil y solo toma unos minutos:',
    step1: 'Haz clic en el botón de abajo',
    step2: 'Selecciona quién de tu familia asistirá',
    step3: 'Indica cualquier necesidad especial (dieta, accesibilidad)',
    step4: '¡Listo! Recibirás una confirmación inmediata',
    cta: 'Haz clic aquí para confirmar tu asistencia:',
    button: 'Confirmar Asistencia',
    alternative: 'O copia y pega este enlace en tu navegador:',
    note: 'Este enlace es personal y único para tu familia. Puedes usarlo en cualquier momento para ver o actualizar tu confirmación.',
    footer: 'Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.',
    thanks: 'Con cariño,',
  },
  en: {
    preview: 'Reminder: Confirm your attendance to the wedding',
    greeting: 'Hello',
    intro: 'We hope you are well. We are writing to remind you that we have not yet received confirmation of your attendance to the wedding of',
    weddingDate: 'Wedding date:',
    importance: 'Your confirmation is very important to us, as it helps us better plan the event and ensure that all our guests have a wonderful experience.',
    easy: 'Confirming your attendance is very easy and only takes a few minutes:',
    step1: 'Click the button below',
    step2: 'Select who from your family will attend',
    step3: 'Indicate any special needs (diet, accessibility)',
    step4: 'Done! You will receive immediate confirmation',
    cta: 'Click here to confirm your attendance:',
    button: 'Confirm Attendance',
    alternative: 'Or copy and paste this link into your browser:',
    note: 'This link is personal and unique to your family. You can use it at any time to view or update your confirmation.',
    footer: 'If you have any questions or need help, please do not hesitate to contact us.',
    thanks: 'With love,',
  },
  fr: {
    preview: 'Rappel: Confirmez votre présence au mariage',
    greeting: 'Bonjour famille',
    intro: 'Nous espérons que vous allez bien. Nous vous écrivons pour vous rappeler que nous n\'avons pas encore reçu la confirmation de votre présence au mariage de',
    weddingDate: 'Date du mariage:',
    importance: 'Votre confirmation est très importante pour nous, car elle nous aide à mieux planifier l\'événement et à nous assurer que tous nos invités vivent une expérience merveilleuse.',
    easy: 'Confirmer votre présence est très facile et ne prend que quelques minutes:',
    step1: 'Cliquez sur le bouton ci-dessous',
    step2: 'Sélectionnez qui de votre famille assistera',
    step3: 'Indiquez tout besoin spécial (régime, accessibilité)',
    step4: 'Terminé! Vous recevrez une confirmation immédiate',
    cta: 'Cliquez ici pour confirmer votre présence:',
    button: 'Confirmer la Présence',
    alternative: 'Ou copiez et collez ce lien dans votre navigateur:',
    note: 'Ce lien est personnel et unique à votre famille. Vous pouvez l\'utiliser à tout moment pour voir ou mettre à jour votre confirmation.',
    footer: 'Si vous avez des questions ou besoin d\'aide, n\'hésitez pas à nous contacter.',
    thanks: 'Avec affection,',
  },
  it: {
    preview: 'Promemoria: Conferma la tua presenza al matrimonio',
    greeting: 'Ciao famiglia',
    intro: 'Speriamo che stiate bene. Vi scriviamo per ricordarvi che non abbiamo ancora ricevuto la conferma della vostra presenza al matrimonio di',
    weddingDate: 'Data del matrimonio:',
    importance: 'La vostra conferma è molto importante per noi, poiché ci aiuta a pianificare meglio l\'evento e ad assicurarci che tutti i nostri ospiti abbiano un\'esperienza meravigliosa.',
    easy: 'Confermare la vostra presenza è molto facile e richiede solo pochi minuti:',
    step1: 'Clicca sul pulsante qui sotto',
    step2: 'Seleziona chi della tua famiglia parteciperà',
    step3: 'Indica eventuali esigenze speciali (dieta, accessibilità)',
    step4: 'Fatto! Riceverai una conferma immediata',
    cta: 'Clicca qui per confermare la tua presenza:',
    button: 'Conferma Presenza',
    alternative: 'Oppure copia e incolla questo link nel tuo browser:',
    note: 'Questo link è personale e unico per la tua famiglia. Puoi usarlo in qualsiasi momento per visualizzare o aggiornare la tua conferma.',
    footer: 'Se hai domande o hai bisogno di aiuto, non esitare a contattarci.',
    thanks: 'Con affetto,',
  },
  de: {
    preview: 'Erinnerung: Bestätigen Sie Ihre Teilnahme an der Hochzeit',
    greeting: 'Hallo Familie',
    intro: 'Wir hoffen, es geht Ihnen gut. Wir schreiben Ihnen, um Sie daran zu erinnern, dass wir noch keine Bestätigung Ihrer Teilnahme an der Hochzeit von',
    weddingDate: 'Hochzeitsdatum:',
    importance: 'Ihre Bestätigung ist uns sehr wichtig, da sie uns hilft, die Veranstaltung besser zu planen und sicherzustellen, dass alle unsere Gäste ein wunderbares Erlebnis haben.',
    easy: 'Die Bestätigung Ihrer Teilnahme ist sehr einfach und dauert nur wenige Minuten:',
    step1: 'Klicken Sie auf die Schaltfläche unten',
    step2: 'Wählen Sie aus, wer aus Ihrer Familie teilnehmen wird',
    step3: 'Geben Sie besondere Bedürfnisse an (Diät, Barrierefreiheit)',
    step4: 'Fertig! Sie erhalten eine sofortige Bestätigung',
    cta: 'Klicken Sie hier, um Ihre Teilnahme zu bestätigen:',
    button: 'Teilnahme Bestätigen',
    alternative: 'Oder kopieren Sie diesen Link in Ihren Browser:',
    note: 'Dieser Link ist persönlich und einzigartig für Ihre Familie. Sie können ihn jederzeit verwenden, um Ihre Bestätigung anzuzeigen oder zu aktualisieren.',
    footer: 'Wenn Sie Fragen haben oder Hilfe benötigen, zögern Sie bitte nicht, uns zu kontaktieren.',
    thanks: 'Mit herzlichen Grüßen,',
  },
};

export const RSVPReminderEmail = ({
  language = 'en',
  familyName = 'Smith',
  coupleNames = 'John & Jane',
  weddingDate = 'June 15, 2024',
  magicLink = 'https://app.weddingplatform.com/rsvp/abc123',
}: RSVPReminderEmailProps) => {
  const t = translations[language];

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.greeting} {familyName},</Heading>
          
          <Text style={text}>
            {t.intro} <strong>{coupleNames}</strong>.
          </Text>
          
          <Section style={dateBox}>
            <Text style={dateText}>
              <strong>{t.weddingDate}</strong> {weddingDate}
            </Text>
          </Section>
          
          <Text style={text}>{t.importance}</Text>
          
          <Text style={text}>{t.easy}</Text>
          
          <ol style={stepsList}>
            <li style={stepItem}>{t.step1}</li>
            <li style={stepItem}>{t.step2}</li>
            <li style={stepItem}>{t.step3}</li>
            <li style={stepItem}>{t.step4}</li>
          </ol>
          
          <Text style={text}>{t.cta}</Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={magicLink}>
              {t.button}
            </Button>
          </Section>
          
          <Text style={text}>{t.alternative}</Text>
          <Link href={magicLink} style={link}>
            {magicLink}
          </Link>
          
          <Section style={noteBox}>
            <Text style={noteText}>{t.note}</Text>
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>{t.footer}</Text>
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

export default RSVPReminderEmail;

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

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const dateBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  padding: '16px 20px',
  margin: '24px 40px',
};

const dateText = {
  color: '#856404',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const stepsList = {
  margin: '16px 0',
  padding: '0 40px 0 60px',
  counterReset: 'step-counter',
};

const stepItem = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '12px 0',
};

const buttonContainer = {
  padding: '27px 40px',
};

const button = {
  backgroundColor: '#28a745',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '14px 20px',
};

const link = {
  color: '#5469d4',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  padding: '0 40px',
  display: 'block',
  margin: '16px 0',
};

const noteBox = {
  backgroundColor: '#e7f3ff',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 40px',
};

const noteText = {
  color: '#004085',
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
