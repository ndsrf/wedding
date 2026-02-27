/**
 * Wedding Lookup Form (Client Component)
 *
 * Shows wedding details and lets guests find their personalised
 * invitation by entering their phone number or email address.
 *
 * Language priority:
 *   1. navigator.language (browser – detected on mount)
 *   2. serverLanguage     (Accept-Language header detected server-side)
 *   3. defaultLanguage    (the wedding's configured default language)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { Language } from '@/lib/i18n/config';

// ── Inline translations (5 languages) ────────────────────────────────────────

interface Translations {
  title: string;
  subtitle: (coupleNames: string) => string;
  placeholder: string;
  submit: string;
  submitting: string;
  notFound: string;
  error: string;
  emptyInput: string;
  dateLabel: string;
  locationLabel: string;
  dressCodeLabel: string;
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    title: 'Find your invitation',
    subtitle: (n) =>
      `Enter your phone number or email address to access your invitation to ${n}'s wedding.`,
    placeholder: 'Phone number or email address',
    submit: 'Find my invitation',
    submitting: 'Searching…',
    notFound:
      "We couldn't find an invitation with those details. Please double-check or contact the wedding organiser.",
    error: 'Something went wrong. Please try again.',
    emptyInput: 'Please enter your phone number or email address.',
    dateLabel: 'Date',
    locationLabel: 'Venue',
    dressCodeLabel: 'Dress code',
  },
  es: {
    title: 'Encuentra tu invitación',
    subtitle: (n) =>
      `Introduce tu número de teléfono o email para acceder a tu invitación a la boda de ${n}.`,
    placeholder: 'Número de teléfono o email',
    submit: 'Buscar mi invitación',
    submitting: 'Buscando…',
    notFound:
      'No encontramos ninguna invitación con esos datos. Verifica tus datos o contacta con los organizadores.',
    error: 'Algo salió mal. Por favor, inténtalo de nuevo.',
    emptyInput: 'Por favor, introduce tu teléfono o email.',
    dateLabel: 'Fecha',
    locationLabel: 'Lugar',
    dressCodeLabel: 'Código de vestimenta',
  },
  fr: {
    title: 'Trouver votre invitation',
    subtitle: (n) =>
      `Entrez votre numéro de téléphone ou adresse e-mail pour accéder à votre invitation au mariage de ${n}.`,
    placeholder: 'Numéro de téléphone ou adresse e-mail',
    submit: 'Trouver mon invitation',
    submitting: 'Recherche…',
    notFound:
      "Nous n'avons pas trouvé d'invitation avec ces informations. Vérifiez vos données ou contactez les organisateurs.",
    error: 'Une erreur est survenue. Veuillez réessayer.',
    emptyInput: 'Veuillez entrer votre numéro de téléphone ou adresse e-mail.',
    dateLabel: 'Date',
    locationLabel: 'Lieu',
    dressCodeLabel: 'Tenue vestimentaire',
  },
  it: {
    title: 'Trova il tuo invito',
    subtitle: (n) =>
      `Inserisci il tuo numero di telefono o indirizzo e-mail per accedere al tuo invito al matrimonio di ${n}.`,
    placeholder: 'Numero di telefono o indirizzo e-mail',
    submit: 'Trova il mio invito',
    submitting: 'Ricerca…',
    notFound:
      'Non abbiamo trovato un invito con quei dati. Controlla le tue informazioni o contatta gli organizzatori.',
    error: 'Si è verificato un errore. Riprova.',
    emptyInput: 'Inserisci il tuo numero di telefono o indirizzo e-mail.',
    dateLabel: 'Data',
    locationLabel: 'Luogo',
    dressCodeLabel: 'Dress code',
  },
  de: {
    title: 'Ihre Einladung finden',
    subtitle: (n) =>
      `Geben Sie Ihre Telefonnummer oder E-Mail-Adresse ein, um Ihre Einladung zur Hochzeit von ${n} aufzurufen.`,
    placeholder: 'Telefonnummer oder E-Mail-Adresse',
    submit: 'Einladung finden',
    submitting: 'Suche läuft…',
    notFound:
      'Wir konnten keine Einladung mit diesen Daten finden. Bitte prüfen Sie Ihre Angaben oder kontaktieren Sie die Veranstalter.',
    error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    emptyInput: 'Bitte geben Sie Ihre Telefonnummer oder E-Mail-Adresse ein.',
    dateLabel: 'Datum',
    locationLabel: 'Ort',
    dressCodeLabel: 'Kleiderordnung',
  },
};

const SUPPORTED: Language[] = ['es', 'en', 'fr', 'it', 'de'];

function pickLanguage(
  browserLang: string | null,
  serverLang: Language,
  defaultLang: Language,
): Language {
  if (browserLang) {
    const base = browserLang.split('-')[0].toLowerCase();
    if (SUPPORTED.includes(base as Language)) return base as Language;
  }
  if (SUPPORTED.includes(serverLang)) return serverLang;
  return defaultLang;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeddingData {
  coupleNames: string;
  weddingDate: string; // ISO string
  weddingTime: string;
  location?: string;
  dressCode?: string;
  additionalInfo?: string;
  defaultLanguage: Language;
}

interface Props {
  initials: string;
  serverLanguage: Language;
  wedding: WeddingData;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeddingLookupForm({ initials, serverLanguage, wedding }: Props) {
  const router = useRouter();

  // Start with the server-detected language (avoids layout shift on hydration)
  // then immediately refine with the browser language on mount.
  const [lang, setLang] = useState<Language>(
    pickLanguage(null, serverLanguage, wedding.defaultLanguage),
  );
  const [contact, setContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refine language using navigator.language (client-only)
  useEffect(() => {
    const browserLang = typeof navigator !== 'undefined' ? navigator.language : null;
    setLang(pickLanguage(browserLang, serverLanguage, wedding.defaultLanguage));
  }, [serverLanguage, wedding.defaultLanguage]);

  const t = TRANSLATIONS[lang];

  const formattedDate = new Intl.DateTimeFormat(lang, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(wedding.weddingDate));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = contact.trim();
    if (!trimmed) {
      setError(t.emptyInput);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/guest/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initials, contact: trimmed }),
      });

      if (res.status === 404) {
        setError(t.notFound);
        return;
      }

      if (!res.ok) {
        setError(t.error);
        return;
      }

      const data: { shortCode: string } = await res.json();
      router.push(`/inv/${initials}/${data.shortCode}`);
    } catch {
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex flex-col items-center justify-center p-4 py-12">

      {/* ── Couple header ─────────────────────────────────────────────────── */}
      <div className="text-center mb-8 max-w-lg">
        <h1
          className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-gray-800 leading-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {wedding.coupleNames}
        </h1>
        <div className="w-16 h-px bg-rose-300 mx-auto my-5" />
        <p className="text-gray-500 text-lg capitalize">{formattedDate}</p>
        {wedding.weddingTime && (
          <p className="text-gray-400 text-base mt-1">{wedding.weddingTime}</p>
        )}
      </div>

      {/* ── Wedding details card ──────────────────────────────────────────── */}
      {(wedding.location || wedding.dressCode) && (
        <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm border border-rose-100 p-6 mb-8 w-full max-w-md space-y-4">
          {wedding.location && (
            <div className="flex items-start gap-3">
              <span className="text-rose-400 mt-0.5 text-lg select-none" aria-hidden>📍</span>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                  {t.locationLabel}
                </p>
                <p className="text-gray-700">{wedding.location}</p>
              </div>
            </div>
          )}
          {wedding.dressCode && (
            <div className="flex items-start gap-3">
              <span className="text-rose-400 mt-0.5 text-lg select-none" aria-hidden>👗</span>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                  {t.dressCodeLabel}
                </p>
                <p className="text-gray-700">{wedding.dressCode}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Lookup form ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.title}</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          {t.subtitle(wedding.coupleNames)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <input
              type="text"
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t.placeholder}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-gray-800 text-base placeholder:text-gray-400 transition-shadow disabled:opacity-50"
              disabled={isLoading}
              autoComplete="email tel"
              inputMode="email"
              aria-label={t.placeholder}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 leading-relaxed"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 text-white font-semibold transition-colors text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <WeddingSpinner size="sm" />
                <span>{t.submitting}</span>
              </>
            ) : (
              t.submit
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
