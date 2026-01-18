/**
 * Planner Invitation Email Template
 * Sent when a master admin invites a new wedding planner to the platform
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html as EmailHtml,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Language } from '../../i18n/config';

interface PlannerInvitationEmailProps {
  language: Language;
  plannerName: string;
  oauthLink: string;
}

const translations = {
  es: {
    preview: 'Has sido invitado a la Plataforma de Gestión de Bodas',
    greeting: 'Hola',
    intro: 'Has sido invitado a unirte a nuestra Plataforma de Gestión de Bodas como Wedding Planner.',
    description: 'Con esta plataforma podrás gestionar múltiples bodas, invitar a parejas como administradores, y proporcionar a tus clientes una experiencia RSVP moderna y sin complicaciones.',
    features: 'Características principales:',
    feature1: 'Gestiona múltiples bodas desde un solo panel',
    feature2: 'Invita a parejas como administradores de boda',
    feature3: 'Sistema RSVP con enlaces mágicos para invitados',
    feature4: 'Seguimiento de pagos y notificaciones en tiempo real',
    feature5: 'Soporte multiidioma (Español, Inglés, Francés, Italiano, Alemán)',
    cta: 'Para comenzar, haz clic en el botón de abajo para iniciar sesión con tu cuenta de Google, Facebook o Apple:',
    button: 'Acceder a la Plataforma',
    alternative: 'O copia y pega este enlace en tu navegador:',
    footer: 'Si no esperabas este correo, puedes ignorarlo de forma segura.',
    thanks: 'Gracias,',
    team: 'El equipo de Wedding Management Platform',
  },
  en: {
    preview: 'You have been invited to the Wedding Management Platform',
    greeting: 'Hello',
    intro: 'You have been invited to join our Wedding Management Platform as a Wedding Planner.',
    description: 'With this platform, you can manage multiple weddings, invite couples as administrators, and provide your clients with a modern, hassle-free RSVP experience.',
    features: 'Key features:',
    feature1: 'Manage multiple weddings from a single dashboard',
    feature2: 'Invite couples as wedding administrators',
    feature3: 'RSVP system with magic links for guests',
    feature4: 'Payment tracking and real-time notifications',
    feature5: 'Multi-language support (Spanish, English, French, Italian, German)',
    cta: 'To get started, click the button below to sign in with your Google, Facebook, or Apple account:',
    button: 'Access Platform',
    alternative: 'Or copy and paste this link into your browser:',
    footer: 'If you were not expecting this email, you can safely ignore it.',
    thanks: 'Thank you,',
    team: 'The Wedding Management Platform Team',
  },
  fr: {
    preview: 'Vous avez été invité à la Plateforme de Gestion de Mariages',
    greeting: 'Bonjour',
    intro: 'Vous avez été invité à rejoindre notre Plateforme de Gestion de Mariages en tant que Wedding Planner.',
    description: 'Avec cette plateforme, vous pouvez gérer plusieurs mariages, inviter des couples en tant qu\'administrateurs et offrir à vos clients une expérience RSVP moderne et sans tracas.',
    features: 'Fonctionnalités principales:',
    feature1: 'Gérez plusieurs mariages depuis un seul tableau de bord',
    feature2: 'Invitez des couples en tant qu\'administrateurs de mariage',
    feature3: 'Système RSVP avec liens magiques pour les invités',
    feature4: 'Suivi des paiements et notifications en temps réel',
    feature5: 'Support multilingue (Espagnol, Anglais, Français, Italien, Allemand)',
    cta: 'Pour commencer, cliquez sur le bouton ci-dessous pour vous connecter avec votre compte Google, Facebook ou Apple:',
    button: 'Accéder à la Plateforme',
    alternative: 'Ou copiez et collez ce lien dans votre navigateur:',
    footer: 'Si vous n\'attendiez pas cet email, vous pouvez l\'ignorer en toute sécurité.',
    thanks: 'Merci,',
    team: 'L\'équipe de Wedding Management Platform',
  },
  it: {
    preview: 'Sei stato invitato alla Piattaforma di Gestione Matrimoni',
    greeting: 'Ciao',
    intro: 'Sei stato invitato a unirti alla nostra Piattaforma di Gestione Matrimoni come Wedding Planner.',
    description: 'Con questa piattaforma puoi gestire più matrimoni, invitare coppie come amministratori e fornire ai tuoi clienti un\'esperienza RSVP moderna e senza problemi.',
    features: 'Caratteristiche principali:',
    feature1: 'Gestisci più matrimoni da un\'unica dashboard',
    feature2: 'Invita coppie come amministratori di matrimonio',
    feature3: 'Sistema RSVP con link magici per gli ospiti',
    feature4: 'Tracciamento pagamenti e notifiche in tempo reale',
    feature5: 'Supporto multilingue (Spagnolo, Inglese, Francese, Italiano, Tedesco)',
    cta: 'Per iniziare, clicca sul pulsante qui sotto per accedere con il tuo account Google, Facebook o Apple:',
    button: 'Accedi alla Piattaforma',
    alternative: 'Oppure copia e incolla questo link nel tuo browser:',
    footer: 'Se non ti aspettavi questa email, puoi ignorarla in sicurezza.',
    thanks: 'Grazie,',
    team: 'Il team di Wedding Management Platform',
  },
  de: {
    preview: 'Sie wurden zur Hochzeitsverwaltungsplattform eingeladen',
    greeting: 'Hallo',
    intro: 'Sie wurden eingeladen, unserer Hochzeitsverwaltungsplattform als Wedding Planner beizutreten.',
    description: 'Mit dieser Plattform können Sie mehrere Hochzeiten verwalten, Paare als Administratoren einladen und Ihren Kunden ein modernes, problemloses RSVP-Erlebnis bieten.',
    features: 'Hauptmerkmale:',
    feature1: 'Verwalten Sie mehrere Hochzeiten von einem Dashboard aus',
    feature2: 'Laden Sie Paare als Hochzeitsadministratoren ein',
    feature3: 'RSVP-System mit magischen Links für Gäste',
    feature4: 'Zahlungsverfolgung und Echtzeit-Benachrichtigungen',
    feature5: 'Mehrsprachige Unterstützung (Spanisch, Englisch, Französisch, Italienisch, Deutsch)',
    cta: 'Um zu beginnen, klicken Sie auf die Schaltfläche unten, um sich mit Ihrem Google-, Facebook- oder Apple-Konto anzumelden:',
    button: 'Zur Plattform',
    alternative: 'Oder kopieren Sie diesen Link in Ihren Browser:',
    footer: 'Wenn Sie diese E-Mail nicht erwartet haben, können Sie sie sicher ignorieren.',
    thanks: 'Vielen Dank,',
    team: 'Das Wedding Management Platform Team',
  },
};

export const PlannerInvitationEmail = ({
  language = 'en',
  plannerName = 'Wedding Planner',
  oauthLink = 'https://app.weddingplatform.com/auth/signin',
}: PlannerInvitationEmailProps) => {
  const t = translations[language];

  return (
    <EmailHtml>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.greeting} {plannerName},</Heading>
          
          <Text style={text}>{t.intro}</Text>
          
          <Text style={text}>{t.description}</Text>
          
          <Section style={featuresSection}>
            <Text style={featuresTitle}>{t.features}</Text>
            <ul style={featuresList}>
              <li style={featureItem}>{t.feature1}</li>
              <li style={featureItem}>{t.feature2}</li>
              <li style={featureItem}>{t.feature3}</li>
              <li style={featureItem}>{t.feature4}</li>
              <li style={featureItem}>{t.feature5}</li>
            </ul>
          </Section>
          
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
    </EmailHtml>
  );
};

export default PlannerInvitationEmail;

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

const featuresSection = {
  padding: '0 40px',
  margin: '24px 0',
};

const featuresTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '16px 0 8px',
};

const featuresList = {
  margin: '0',
  padding: '0 0 0 20px',
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
