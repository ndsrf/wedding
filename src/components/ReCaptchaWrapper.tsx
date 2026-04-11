'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export default function ReCaptchaWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  if (!recaptchaSiteKey || process.env.NODE_ENV === 'development') {
    if (process.env.NODE_ENV !== 'development') {
      console.error('❌ NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not configured - reCAPTCHA will not work!');
      console.error('Please set this environment variable in your Vercel project settings or .env file');
    }
    // Skip reCAPTCHA in development or when key is missing
    return <>{children}</>;
  }

  console.log('✅ reCAPTCHA v3 initialized with site key');

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaSiteKey}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: 'head',
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
