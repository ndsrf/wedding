/**
 * Wedding Lookup Form (Client Component)
 *
 * Shows wedding details and lets guests find their personalised
 * invitation. Phone (with country-prefix selector) is the primary
 * input; email is the alternative. Only one is required.
 *
 * Includes a standalone header (logo + language selector) and footer
 * that mirror the landing-page chrome without depending on next-intl,
 * since this route is outside the [locale] segment.
 *
 * Language priority:
 *   1. navigator.language  (browser – refined on mount)
 *   2. serverLanguage      (Accept-Language header, detected server-side)
 *   3. defaultLanguage     (wedding's configured default language)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { Language } from '@/lib/i18n/config';
import { COUNTRIES, COUNTRY_PHONE_PREFIXES } from '@/lib/phone-utils';

// ── Translation table ─────────────────────────────────────────────────────────

interface Translations {
  formTitle: string;
  subtitle: (coupleNames: string) => string;
  phoneLabel: string;
  phonePlaceholder: string;
  orSeparator: string;
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  submitting: string;
  notFound: string;
  error: string;
  emptyInput: string;
  dateLabel: string;
  locationLabel: string;
  dressCodeLabel: string;
  footer: {
    tagline: string;
    product: string;
    company: string;
    support: string;
    features: string;
    pricing: string;
    testimonials: string;
    news: string;
    about: string;
    contact: string;
    privacy: string;
    help: string;
    docs: string;
    rights: string;
  };
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    formTitle: 'Find your invitation',
    subtitle: (n) => `Enter your phone number or email address to access your invitation to ${n}'s wedding.`,
    phoneLabel: 'Phone number',
    phonePlaceholder: '612 345 678',
    orSeparator: 'or',
    emailLabel: 'Email address',
    emailPlaceholder: 'name@example.com',
    submit: 'Find my invitation',
    submitting: 'Searching…',
    notFound: "We couldn't find an invitation with those details. Please double-check or contact the wedding organiser.",
    error: 'Something went wrong. Please try again.',
    emptyInput: 'Please enter your phone number or email address.',
    dateLabel: 'Date',
    locationLabel: 'Venue',
    dressCodeLabel: 'Dress code',
    footer: {
      tagline: 'Empowering wedding planners to create unforgettable celebrations.',
      product: 'Product', company: 'Company', support: 'Support',
      features: 'Features', pricing: 'Pricing', testimonials: 'Testimonials',
      news: 'News & Resources', about: 'About', contact: 'Contact',
      privacy: 'Privacy Policy', help: 'Help Center', docs: 'Documentation',
      rights: 'All rights reserved.',
    },
  },
  es: {
    formTitle: 'Encuentra tu invitación',
    subtitle: (n) => `Introduce tu número de teléfono o email para acceder a tu invitación a la boda de ${n}.`,
    phoneLabel: 'Número de teléfono',
    phonePlaceholder: '612 345 678',
    orSeparator: 'o',
    emailLabel: 'Dirección de email',
    emailPlaceholder: 'nombre@ejemplo.com',
    submit: 'Buscar mi invitación',
    submitting: 'Buscando…',
    notFound: 'No encontramos ninguna invitación con esos datos. Verifica tus datos o contacta con los organizadores.',
    error: 'Algo salió mal. Por favor, inténtalo de nuevo.',
    emptyInput: 'Por favor, introduce tu número de teléfono o email.',
    dateLabel: 'Fecha',
    locationLabel: 'Lugar',
    dressCodeLabel: 'Código de vestimenta',
    footer: {
      tagline: 'Empoderando a wedding planners para crear celebraciones inolvidables.',
      product: 'Producto', company: 'Empresa', support: 'Soporte',
      features: 'Características', pricing: 'Precios', testimonials: 'Testimonios',
      news: 'Noticias y Recursos', about: 'Acerca de', contact: 'Contacto',
      privacy: 'Política de Privacidad', help: 'Centro de Ayuda', docs: 'Documentación',
      rights: 'Todos los derechos reservados.',
    },
  },
  fr: {
    formTitle: 'Trouver votre invitation',
    subtitle: (n) => `Entrez votre numéro de téléphone ou adresse e-mail pour accéder à votre invitation au mariage de ${n}.`,
    phoneLabel: 'Numéro de téléphone',
    phonePlaceholder: '6 12 34 56 78',
    orSeparator: 'ou',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'nom@exemple.com',
    submit: 'Trouver mon invitation',
    submitting: 'Recherche…',
    notFound: "Nous n'avons pas trouvé d'invitation avec ces informations. Vérifiez vos données ou contactez les organisateurs.",
    error: 'Une erreur est survenue. Veuillez réessayer.',
    emptyInput: 'Veuillez entrer votre numéro de téléphone ou adresse e-mail.',
    dateLabel: 'Date',
    locationLabel: 'Lieu',
    dressCodeLabel: 'Tenue vestimentaire',
    footer: {
      tagline: 'Permettre aux organisateurs de mariages de créer des célébrations inoubliables.',
      product: 'Produit', company: 'Entreprise', support: 'Support',
      features: 'Fonctionnalités', pricing: 'Tarifs', testimonials: 'Témoignages',
      news: 'Actualités et Ressources', about: 'À Propos', contact: 'Contact',
      privacy: 'Politique de Confidentialité', help: "Centre d'Aide", docs: 'Documentation',
      rights: 'Tous droits réservés.',
    },
  },
  it: {
    formTitle: 'Trova il tuo invito',
    subtitle: (n) => `Inserisci il tuo numero di telefono o indirizzo e-mail per accedere al tuo invito al matrimonio di ${n}.`,
    phoneLabel: 'Numero di telefono',
    phonePlaceholder: '612 345 678',
    orSeparator: 'o',
    emailLabel: 'Indirizzo e-mail',
    emailPlaceholder: 'nome@esempio.com',
    submit: 'Trova il mio invito',
    submitting: 'Ricerca…',
    notFound: 'Non abbiamo trovato un invito con quei dati. Controlla le tue informazioni o contatta gli organizzatori.',
    error: 'Si è verificato un errore. Riprova.',
    emptyInput: 'Inserisci il tuo numero di telefono o indirizzo e-mail.',
    dateLabel: 'Data',
    locationLabel: 'Luogo',
    dressCodeLabel: 'Dress code',
    footer: {
      tagline: 'Potenziare gli organizzatori di matrimoni per creare celebrazioni indimenticabili.',
      product: 'Prodotto', company: 'Azienda', support: 'Supporto',
      features: 'Caratteristiche', pricing: 'Prezzi', testimonials: 'Testimonianze',
      news: 'Notizie e Risorse', about: 'Chi Siamo', contact: 'Contatto',
      privacy: 'Privacy Policy', help: 'Centro Assistenza', docs: 'Documentazione',
      rights: 'Tutti i diritti riservati.',
    },
  },
  de: {
    formTitle: 'Ihre Einladung finden',
    subtitle: (n) => `Geben Sie Ihre Telefonnummer oder E-Mail-Adresse ein, um Ihre Einladung zur Hochzeit von ${n} aufzurufen.`,
    phoneLabel: 'Telefonnummer',
    phonePlaceholder: '612 345 678',
    orSeparator: 'oder',
    emailLabel: 'E-Mail-Adresse',
    emailPlaceholder: 'name@beispiel.de',
    submit: 'Einladung finden',
    submitting: 'Suche läuft…',
    notFound: 'Wir konnten keine Einladung mit diesen Daten finden. Bitte prüfen Sie Ihre Angaben oder kontaktieren Sie die Veranstalter.',
    error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    emptyInput: 'Bitte geben Sie Ihre Telefonnummer oder E-Mail-Adresse ein.',
    dateLabel: 'Datum',
    locationLabel: 'Ort',
    dressCodeLabel: 'Kleiderordnung',
    footer: {
      tagline: 'Hochzeitsplaner befähigen, unvergessliche Feiern zu schaffen.',
      product: 'Produkt', company: 'Unternehmen', support: 'Support',
      features: 'Funktionen', pricing: 'Preise', testimonials: 'Referenzen',
      news: 'Neuigkeiten und Ressourcen', about: 'Über Uns', contact: 'Kontakt',
      privacy: 'Datenschutzrichtlinie', help: 'Hilfecenter', docs: 'Dokumentation',
      rights: 'Alle Rechte vorbehalten.',
    },
  },
};

// ── Language detection ────────────────────────────────────────────────────────

const SUPPORTED: Language[] = ['es', 'en', 'fr', 'it', 'de'];

const LANGUAGE_OPTIONS: { code: Language; name: string; flag: string }[] = [
  { code: 'es', name: 'Español',  flag: '🇪🇸' },
  { code: 'en', name: 'English',  flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch',  flag: '🇩🇪' },
];

function pickLanguage(browserLang: string | null, serverLang: Language, defaultLang: Language): Language {
  if (browserLang) {
    const base = browserLang.split('-')[0].toLowerCase();
    if (SUPPORTED.includes(base as Language)) return base as Language;
  }
  if (SUPPORTED.includes(serverLang)) return serverLang;
  return defaultLang;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LanguageBar({ lang, onChange }: { lang: Language; onChange: (l: Language) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGE_OPTIONS.find((l) => l.code === lang) ?? LANGUAGE_OPTIONS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Select language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-xl">{current.flag}</span>
        <span className="hidden sm:inline text-sm font-medium text-gray-700">{current.code.toUpperCase()}</span>
        <svg className={`w-4 h-4 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div role="listbox" className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {LANGUAGE_OPTIONS.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              onClick={() => { onChange(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${l.code === lang ? 'bg-rose-50 text-rose-700' : 'text-gray-700'}`}
            >
              <span className="text-xl">{l.flag}</span>
              <span className="text-sm font-medium">{l.name}</span>
              {l.code === lang && (
                <svg className="w-4 h-4 ml-auto text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SiteFooter({ t, lang }: { t: Translations['footer']; lang: Language }) {
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8 text-left">
          <div>
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {commercialName}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">{t.tagline}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t.product}</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href={`/${lang}/#features`} className="hover:text-white transition-colors">{t.features}</Link></li>
              <li><Link href={`/${lang}/#pricing`} className="hover:text-white transition-colors">{t.pricing}</Link></li>
              <li><Link href={`/${lang}/#testimonials`} className="hover:text-white transition-colors">{t.testimonials}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t.company}</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href={`/${lang}/about`} className="hover:text-white transition-colors">{t.about}</Link></li>
              <li><Link href={`/${lang}/news`} className="hover:text-white transition-colors">{t.news}</Link></li>
              <li><Link href={`/${lang}/contact`} className="hover:text-white transition-colors">{t.contact}</Link></li>
              <li><Link href={`/${lang}/privacy`} className="hover:text-white transition-colors">{t.privacy}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t.support}</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href={`/${lang}/contact`} className="hover:text-white transition-colors">{t.help}</Link></li>
              <li><Link href={`/${lang}/docs`} className="hover:text-white transition-colors">{t.docs}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
          <p>© {year} {commercialName}. {t.rights}</p>
        </div>
      </div>
    </footer>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeddingData {
  coupleNames: string;
  weddingDate: string;
  weddingTime: string;
  location?: string;
  dressCode?: string;
  additionalInfo?: string;
  defaultLanguage: Language;
  weddingCountry: string;
}

interface Props {
  initials: string;
  serverLanguage: Language;
  wedding: WeddingData;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WeddingLookupForm({ initials, serverLanguage, wedding }: Props) {
  const router = useRouter();
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  const [lang, setLang] = useState<Language>(
    pickLanguage(null, serverLanguage, wedding.defaultLanguage),
  );

  // Phone prefix defaults to the wedding country's calling code
  const defaultPrefix = COUNTRY_PHONE_PREFIXES[wedding.weddingCountry] ?? '+34';

  // Country list: wedding country first, rest alphabetically
  const sortedCountries = [
    ...COUNTRIES.filter((c) => c.code === wedding.weddingCountry),
    ...COUNTRIES.filter((c) => c.code !== wedding.weddingCountry),
  ];

  const [phonePrefix, setPhonePrefix] = useState(defaultPrefix);
  const [localPhone, setLocalPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const browserLang = typeof navigator !== 'undefined' ? navigator.language : null;
    setLang(pickLanguage(browserLang, serverLanguage, wedding.defaultLanguage));
  }, [serverLanguage, wedding.defaultLanguage]);

  const t = TRANSLATIONS[lang];

  const formattedDate = new Intl.DateTimeFormat(lang, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(wedding.weddingDate));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Phone takes priority; strip spaces and leading zeros from the local part
    const cleanLocal = localPhone.trim().replace(/\D/g, '').replace(/^0+/, '');
    const trimmedEmail = email.trim();

    if (!cleanLocal && !trimmedEmail) {
      setError(t.emptyInput);
      return;
    }

    // Build the contact string: full international phone or raw email
    const contact = cleanLocal ? `${phonePrefix}${cleanLocal}` : trimmedEmail;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/guest/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initials, contact }),
      });

      if (res.status === 404) { setError(t.notFound); return; }
      if (!res.ok)            { setError(t.error);    return; }

      const data: { shortCode: string } = await res.json();
      router.push(`/inv/${initials}/${data.shortCode}`);
    } catch {
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 via-white to-rose-50">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/nupci.webp"
                alt={commercialName}
                width={400}
                height={160}
                className="h-12 w-auto"
                priority
              />
            </Link>
            <LanguageBar lang={lang} onChange={setLang} />
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 pt-28">

        {/* Couple header */}
        <div className="text-center mb-8 max-w-lg">
          <h1
            className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight"
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

        {/* Wedding details card */}
        {(wedding.location || wedding.dressCode) && (
          <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm border border-rose-100 p-6 mb-8 w-full max-w-md space-y-4">
            {wedding.location && (
              <div className="flex items-start gap-3">
                <span className="text-rose-400 mt-0.5 text-lg select-none" aria-hidden>📍</span>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">{t.locationLabel}</p>
                  <p className="text-gray-700">{wedding.location}</p>
                </div>
              </div>
            )}
            {wedding.dressCode && (
              <div className="flex items-start gap-3">
                <span className="text-rose-400 mt-0.5 text-lg select-none" aria-hidden>👗</span>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">{t.dressCodeLabel}</p>
                  <p className="text-gray-700">{wedding.dressCode}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lookup form */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 w-full max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.formTitle}</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">{t.subtitle(wedding.coupleNames)}</p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* ── Phone field (primary) ────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.phoneLabel}
              </label>
              <div className="flex">
                {/* Country prefix select */}
                <select
                  value={phonePrefix}
                  onChange={(e) => setPhonePrefix(e.target.value)}
                  disabled={isLoading}
                  className="flex-shrink-0 px-3 py-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent disabled:opacity-50 cursor-pointer"
                  aria-label="Country phone prefix"
                >
                  {sortedCountries.map((c) => (
                    <option key={c.code} value={c.prefix}>
                      {c.prefix} ({c.code})
                    </option>
                  ))}
                </select>
                {/* Local number */}
                <input
                  type="tel"
                  value={localPhone}
                  onChange={(e) => { setLocalPhone(e.target.value); if (error) setError(null); }}
                  placeholder={t.phonePlaceholder}
                  disabled={isLoading}
                  className="flex-1 min-w-0 px-4 py-3 border border-gray-200 rounded-r-xl bg-white text-gray-800 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-shadow disabled:opacity-50"
                  autoComplete="tel-national"
                  inputMode="tel"
                  aria-label={t.phoneLabel}
                />
              </div>
            </div>

            {/* ── OR separator ────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400 font-medium">{t.orSeparator}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── Email field (secondary) ──────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                placeholder={t.emailPlaceholder}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-gray-800 text-base placeholder:text-gray-400 transition-shadow disabled:opacity-50"
                autoComplete="email"
                inputMode="email"
                aria-label={t.emailLabel}
              />
            </div>

            {/* ── Error message ────────────────────────────────────────────── */}
            {error && (
              <div role="alert" className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 leading-relaxed">
                {error}
              </div>
            )}

            {/* ── Submit ───────────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 text-white font-semibold transition-colors text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><WeddingSpinner size="sm" /><span>{t.submitting}</span></>
              ) : (
                t.submit
              )}
            </button>
          </form>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <SiteFooter t={t.footer} lang={lang} />
    </div>
  );
}
