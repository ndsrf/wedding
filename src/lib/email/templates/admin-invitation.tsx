/**
 * Admin Invitation Email Template
 * Sent when a planner invites a couple to manage their wedding
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

interface AdminInvitationEmailProps {
  language: Language;
  adminName: string;
  coupleNames: string;
  weddingDate: string;
  oauthLink: string;
}

const translations = {
  es: {
    preview: 'Invitación para administrar tu boda',
    greeting: 'Hola',
    intro: 'Has sido invitado a administrar tu boda en nuestra plataforma.',
    weddingInfo: 'Detalles de la boda:',
    couple: 'Pareja:',
    date: 'Fecha:',
    description: 'Como administrador de boda, podrás:',
    feature1: 'Importar y gestionar tu lista de invitados',
    feature2: 'Ver confirmaciones de asistencia en tiempo real',
    feature3: 'Enviar recordatorios personalizados',
    feature4: 'Hacer seguimiento de pagos y regalos',
    feature5: 'Recibir notificaciones de todas las actividades',
    cta: 'Para acceder a tu panel de administración, haz clic en el botón de abajo para iniciar sesión:',
    button: 'Administrar Mi Boda',
    alternative: 'O copia y pega este enlace en tu navegador:',
    footer: 'Si no esperabas este correo, por favor contacta con tu wedding planner.',
    thanks: 'Gracias,',
    team: 'El equipo de Wedding Management Platform',
  },
  en: {
    preview: 'Invitation to manage your wedding',
    greeting: 'Hello',
    intro: 'You have been invited to manage your wedding on our platform.',
    weddingInfo: 'Wedding details:',
    couple: 'Couple:',
    date: 'Date:',
    description: 'As a wedding administrator, you will be able to:',
    feature1: 'Import and manage your guest list',
    feature2: 'View RSVP confirmations in real-time',
    feature3: 'Send personalized reminders',
    feature4: 'Track payments and gifts',
    feature5: 'Receive notifications of all activities',
    cta: 'To access your admin panel, click the button below to sign in:',
    button: 'Manage My Wedding',
    alternative: 'Or copy and paste this link into your browser:',
    footer: 'If you were not expecting this email, please contact your wedding planner.',
    thanks: 'Thank you,',
    team: 'The Wedding Management Platform Team',
  },
  fr: {
    preview: 'Invitation à gérer votre mariage',
    greeting: 'Bonjour',
    intro: 'Vous avez été invité à gérer votre mariage sur notre plateforme.',
    weddingInfo: 'Détails du mariage:',
    couple: 'Couple:',
    date: 'Date:',
    description: 'En tant qu\'administrateur de mariage, vous pourrez:',
    feature1: 'Importer et gérer votre liste d\'invités',
    feature2: 'Voir les confirmations RSVP en temps réel',
    feature3: 'Envoyer des rappels personnalisés',
    feature4: 'Suivre les paiements et les cadeaux',
    feature5: 'Recevoir des notifications de toutes les activités',
    cta: 'Pour accéder à votre panneau d\'administration, cliquez sur le bouton ci-dessous pour vous connecter:',
    button: 'Gérer Mon Mariage',
    alternative: 'Ou copiez et collez ce lien dans votre navigateur:',
    footer: 'Si vous n\'attendiez pas cet email, veuillez contacter votre wedding planner.',
    thanks: 'Merci,',
    team: 'L\'équipe de Wedding Management Platform',
  },
  it: {
    preview: 'Invito a gestire il tuo matrimonio',
    greeting: 'Ciao',
    intro: 'Sei stato invitato a gestire il tuo matrimonio sulla nostra piattaforma.',
    weddingInfo: 'Dettagli del matrimonio:',
    couple: 'Coppia:',
    date: 'Data:',
    description: 'Come amministratore del matrimonio, potrai:',
    feature1: 'Importare e gestire la tua lista degli ospiti',
    feature2: 'Visualizzare le conferme RSVP in tempo reale',
    feature3: 'Inviare promemoria personalizzati',
    feature4: 'Tracciare pagamenti e regali',
    feature5: 'Ricevere notifiche di tutte le attività',
    cta: 'Per accedere al tuo pannello di amministrazione, clicca sul pulsante qui sotto per accedere:',
    button: 'Gestisci il Mio Matrimonio',
    alternative: 'Oppure copia e incolla questo link nel tuo browser:',
    footer: 'Se non ti aspettavi questa email, contatta il tuo wedding planner.',
    thanks: 'Grazie,',
    team: 'Il team di Wedding Management Platform',
  },
  de: {
    preview: 'Einladung zur Verwaltung Ihrer Hochzeit',
    greeting: 'Hallo',
    intro: 'Sie wurden eingeladen, Ihre Hochzeit auf unserer Plattform zu verwalten.',
    weddingInfo: 'Hochzeitsdetails:',
    couple: 'Paar:',
    date: 'Datum:',
    description: 'Als Hochzeitsadministrator können Sie:',
    feature1: 'Ihre Gästeliste importieren und verwalten',
    feature2: 'RSVP-Bestätigungen in Echtzeit anzeigen',
    feature3: 'Personalisierte Erinnerungen senden',
    feature4: 'Zahlungen und Geschenke verfolgen',
    feature5: 'Benachrichtigungen über alle Aktivitäten erhalten',
    cta: 'Um auf Ihr Admin-Panel zuzugreifen, klicken Sie auf die Schaltfläche unten, um sich anzumelden:',
    button: 'Meine Hochzeit Verwalten',
    alternative: 'Oder kopieren Sie diesen Link in Ihren Browser:',
    footer: 'Wenn Sie diese E-Mail nicht erwartet haben, kontaktieren Sie bitte Ihren Hochzeitsplaner.',
    thanks: 'Vielen Dank,',
    team: 'Das Wedding Management Platform Team',
  },
};

export const AdminInvitationEmail = ({
  language = 'en',
  adminName = 'Admin',
  coupleNames = 'John & Jane',
  weddingDate = 'June 15, 2024',
  oauthLink = 'https://app.weddingplatform.com/auth/signin',
}: AdminInvitationEmailProps) => {
  const t = translations[language];

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.greeting} {adminName},</Heading>
          
          <Text style={text}>{t.intro}</Text>
          
          <Section style={infoBox}>
            <Text style={infoTitle}>{t.weddingInfo}</Text>
            <Text style={infoText}>
              <strong>{t.couple}</strong> {coupleNames}
            </Text>
            <Text style={infoText}>
              <strong>{t.date}</strong> {weddingDate}
            </Text>
          </Section>
          
          <Text style={text}>{t.description}</Text>
          
          <ul style={featuresList}>
            <li style={featureItem}>{t.feature1}</li>
            <li style={featureItem}>{t.feature2}</li>
            <li style={featureItem}>{t.feature3}</li>
            <li style={featureItem}>{t.feature4}</li>
            <li style={featureItem}>{t.feature5}</li>
          </ul>
          
          <Text style={text}>{t.cta}</Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={oauthLink}>
              {t.button}
            </Button>
          </Section>
          
          <Text style={text}>{t.alternative}</Text>
          <Link href={oauthLink} style={link}>
            {oauthLink}
          </Link>
          
          <Section style={footer}>
            <Text style={footerText}>{t.footer}</Text>
            <Text style={footerText}>
              {t.thanks}
              <br />
              {t.team}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AdminInvitationEmail;

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

const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 40px',
};

const infoTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const infoText = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const featuresList = {
  margin: '16px 0',
  padding: '0 40px 0 60px',
};

const featureItem = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const buttonContainer = {
  padding: '27px 40px',
};

const button = {
  backgroundColor: '#5469d4',
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
