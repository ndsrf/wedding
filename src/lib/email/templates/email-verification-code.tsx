/**
 * Email Verification Code Template
 * Sent during trial signup to verify the user's email address.
 * Includes a 6-digit code and a note about OAuth-only login.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html as BaseEmailHtml,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Language } from '../../i18n/config';

interface EmailVerificationCodeProps {
  language: Language;
  code: string;
  plannerName: string;
}

const translations = {
  es: {
    preview: 'Tu código de verificación para la prueba gratuita',
    greeting: 'Hola',
    intro: 'Gracias por registrarte en la prueba gratuita. Para confirmar tu dirección de correo, introduce el siguiente código:',
    codeLabel: 'Tu código de verificación',
    expiry: 'Este código expira en 15 minutos.',
    oauthTitle: 'Importante: solo inicio de sesión con Google o Facebook/Meta',
    oauthNote: 'Una vez creada tu cuenta, solo podrás acceder a la plataforma iniciando sesión con tu cuenta de Google o Facebook/Meta. No se admiten contraseñas.',
    ignore: 'Si no has solicitado este código, puedes ignorar este correo de forma segura.',
    thanks: 'Gracias,',
    team: 'El equipo de Wedding Management Platform',
  },
  en: {
    preview: 'Your verification code for the free trial',
    greeting: 'Hello',
    intro: 'Thank you for signing up for the free trial. To confirm your email address, enter the following code:',
    codeLabel: 'Your verification code',
    expiry: 'This code expires in 15 minutes.',
    oauthTitle: 'Important: Google or Facebook/Meta login only',
    oauthNote: 'Once your account is created, you can only access the platform by signing in with your Google or Facebook/Meta account. Passwords are not supported.',
    ignore: 'If you did not request this code, you can safely ignore this email.',
    thanks: 'Thank you,',
    team: 'The Wedding Management Platform Team',
  },
  fr: {
    preview: 'Votre code de vérification pour l\'essai gratuit',
    greeting: 'Bonjour',
    intro: 'Merci de vous être inscrit pour l\'essai gratuit. Pour confirmer votre adresse e-mail, entrez le code suivant :',
    codeLabel: 'Votre code de vérification',
    expiry: 'Ce code expire dans 15 minutes.',
    oauthTitle: 'Important : connexion Google ou Facebook/Meta uniquement',
    oauthNote: 'Une fois votre compte créé, vous ne pourrez accéder à la plateforme qu\'en vous connectant avec votre compte Google ou Facebook/Meta. Les mots de passe ne sont pas pris en charge.',
    ignore: 'Si vous n\'avez pas demandé ce code, vous pouvez ignorer cet e-mail en toute sécurité.',
    thanks: 'Merci,',
    team: 'L\'équipe de Wedding Management Platform',
  },
  it: {
    preview: 'Il tuo codice di verifica per la prova gratuita',
    greeting: 'Ciao',
    intro: 'Grazie per esserti registrato alla prova gratuita. Per confermare il tuo indirizzo email, inserisci il seguente codice:',
    codeLabel: 'Il tuo codice di verifica',
    expiry: 'Questo codice scade in 15 minuti.',
    oauthTitle: 'Importante: solo accesso con Google o Facebook/Meta',
    oauthNote: 'Una volta creato il tuo account, potrai accedere alla piattaforma solo effettuando il login con il tuo account Google o Facebook/Meta. Le password non sono supportate.',
    ignore: 'Se non hai richiesto questo codice, puoi ignorare questa email in tutta sicurezza.',
    thanks: 'Grazie,',
    team: 'Il team di Wedding Management Platform',
  },
  de: {
    preview: 'Ihr Verifizierungscode für die kostenlose Testversion',
    greeting: 'Hallo',
    intro: 'Vielen Dank für Ihre Anmeldung zur kostenlosen Testversion. Um Ihre E-Mail-Adresse zu bestätigen, geben Sie den folgenden Code ein:',
    codeLabel: 'Ihr Verifizierungscode',
    expiry: 'Dieser Code läuft in 15 Minuten ab.',
    oauthTitle: 'Wichtig: Nur Anmeldung mit Google oder Facebook/Meta',
    oauthNote: 'Sobald Ihr Konto erstellt ist, können Sie nur über Ihr Google- oder Facebook/Meta-Konto auf die Plattform zugreifen. Passwörter werden nicht unterstützt.',
    ignore: 'Wenn Sie diesen Code nicht angefordert haben, können Sie diese E-Mail sicher ignorieren.',
    thanks: 'Vielen Dank,',
    team: 'Das Wedding Management Platform Team',
  },
};

export const EmailVerificationCodeEmail = ({
  language = 'en',
  code = '000000',
  plannerName = 'Wedding Planner',
}: EmailVerificationCodeProps) => {
  const t = translations[language];

  return (
    <BaseEmailHtml>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.greeting} {plannerName},</Heading>

          <Text style={text}>{t.intro}</Text>

          <Section style={codeSection}>
            <Text style={codeLabelStyle}>{t.codeLabel}</Text>
            <Text style={codeDisplay}>{code}</Text>
            <Text style={expiryText}>{t.expiry}</Text>
          </Section>

          <Section style={oauthSection}>
            <Text style={oauthTitleStyle}>⚠️ {t.oauthTitle}</Text>
            <Text style={oauthNoteStyle}>{t.oauthNote}</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>{t.ignore}</Text>
            <Text style={footerText}>
              {t.thanks}
              <br />
              {t.team}
            </Text>
          </Section>
        </Container>
      </Body>
    </BaseEmailHtml>
  );
};

export default EmailVerificationCodeEmail;

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

const codeSection = {
  background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
  border: '2px solid #f9a8d4',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
  textAlign: 'center' as const,
};

const codeLabelStyle = {
  color: '#9d174d',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  margin: '0 0 12px',
};

const codeDisplay = {
  color: '#be185d',
  fontSize: '48px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.3em',
  fontFamily: 'monospace',
  margin: '0 0 12px',
};

const expiryText = {
  color: '#9d174d',
  fontSize: '13px',
  margin: '0',
};

const oauthSection = {
  background: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px 20px',
};

const oauthTitleStyle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
};

const oauthNoteStyle = {
  color: '#78350f',
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
