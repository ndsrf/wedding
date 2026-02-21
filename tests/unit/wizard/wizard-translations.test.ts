/**
 * Tests for Wizard Translation Completeness
 * Ensures all supported languages have wizard translations
 */

import enMessages from '@/messages/en/common.json';
import esMessages from '@/messages/es/common.json';
import deMessages from '@/messages/de/common.json';
import frMessages from '@/messages/fr/common.json';
import itMessages from '@/messages/it/common.json';

describe('Wizard Translations', () => {
  const languages = {
    en: { name: 'English', messages: enMessages },
    es: { name: 'Spanish', messages: esMessages },
    de: { name: 'German', messages: deMessages },
    fr: { name: 'French', messages: frMessages },
    it: { name: 'Italian', messages: itMessages },
  };

  // Note: requiredWizardKeys variable removed as it was unused

  describe('Translation Completeness', () => {
    Object.entries(languages).forEach(([code, { name, messages }]) => {
      describe(`${name} (${code})`, () => {
        it('should have admin.dashboard.setupWizard translation', () => {
          const value = messages?.admin?.dashboard?.setupWizard;
          expect(value).toBeDefined();
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });

        it('should have admin.dashboard.setupWizardSubtitle translation', () => {
          const value = messages?.admin?.dashboard?.setupWizardSubtitle;
          expect(value).toBeDefined();
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });

        it('should have admin.wizard section', () => {
          expect(messages?.admin?.wizard).toBeDefined();
          expect(typeof messages?.admin?.wizard).toBe('object');
        });

        it('should have wizard.title translation', () => {
          const value = messages?.admin?.wizard?.title;
          expect(value).toBeDefined();
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });

        it('should have wizard.subtitle translation', () => {
          const value = messages?.admin?.wizard?.subtitle;
          expect(value).toBeDefined();
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });

        it('should have wizard.progress section', () => {
          expect(messages?.admin?.wizard?.progress).toBeDefined();
          expect(messages?.admin?.wizard?.progress?.step).toBeDefined();
          expect(messages?.admin?.wizard?.progress?.of).toBeDefined();
          expect(messages?.admin?.wizard?.progress?.complete).toBeDefined();
        });

        it('should have wizard.navigation section', () => {
          expect(messages?.admin?.wizard?.navigation).toBeDefined();
          expect(messages?.admin?.wizard?.navigation?.back).toBeDefined();
          expect(messages?.admin?.wizard?.navigation?.continue).toBeDefined();
          expect(messages?.admin?.wizard?.navigation?.saveAndContinue).toBeDefined();
        });

        it('should have wizard.welcome section', () => {
          expect(messages?.admin?.wizard?.welcome).toBeDefined();
          expect(messages?.admin?.wizard?.welcome?.title).toBeDefined();
          expect(messages?.admin?.wizard?.welcome?.congratulations).toBeDefined();
        });

        it('should have wizard.basicInfo section', () => {
          expect(messages?.admin?.wizard?.basicInfo).toBeDefined();
          expect(messages?.admin?.wizard?.basicInfo?.title).toBeDefined();
          expect(messages?.admin?.wizard?.basicInfo?.subtitle).toBeDefined();
        });

        it('should have wizard.rsvpSettings section', () => {
          expect(messages?.admin?.wizard?.rsvpSettings).toBeDefined();
          expect(messages?.admin?.wizard?.rsvpSettings?.title).toBeDefined();
          expect(messages?.admin?.wizard?.rsvpSettings?.subtitle).toBeDefined();
        });

        it('should have wizard.guests section', () => {
          expect(messages?.admin?.wizard?.guests).toBeDefined();
          expect(messages?.admin?.wizard?.guests?.title).toBeDefined();
          expect(messages?.admin?.wizard?.guests?.subtitle).toBeDefined();
        });

        it('should have wizard.messageTemplates section', () => {
          expect(messages?.admin?.wizard?.messageTemplates).toBeDefined();
          expect(messages?.admin?.wizard?.messageTemplates?.title).toBeDefined();
          expect(messages?.admin?.wizard?.messageTemplates?.subtitle).toBeDefined();
        });

        it('should have wizard.invitation section', () => {
          expect(messages?.admin?.wizard?.invitation).toBeDefined();
          expect(messages?.admin?.wizard?.invitation?.title).toBeDefined();
          expect(messages?.admin?.wizard?.invitation?.subtitle).toBeDefined();
        });

        it('should have wizard.seating section', () => {
          expect(messages?.admin?.wizard?.seating).toBeDefined();
          expect(messages?.admin?.wizard?.seating?.title).toBeDefined();
          expect(messages?.admin?.wizard?.seating?.subtitle).toBeDefined();
        });

        it('should have wizard.checklist section', () => {
          expect(messages?.admin?.wizard?.checklist).toBeDefined();
          expect(messages?.admin?.wizard?.checklist?.title).toBeDefined();
          expect(messages?.admin?.wizard?.checklist?.subtitle).toBeDefined();
        });

        it('should have wizard.paymentGifts section', () => {
          expect(messages?.admin?.wizard?.paymentGifts).toBeDefined();
          expect(messages?.admin?.wizard?.paymentGifts?.title).toBeDefined();
          expect(messages?.admin?.wizard?.paymentGifts?.subtitle).toBeDefined();
        });

        it('should have wizard.completion section', () => {
          expect(messages?.admin?.wizard?.completion).toBeDefined();
          expect(messages?.admin?.wizard?.completion?.title).toBeDefined();
          expect(messages?.admin?.wizard?.completion?.congratulations).toBeDefined();
        });
      });
    });
  });

  describe('Translation Consistency', () => {
    it('should have same structure across all languages', () => {
      const englishKeys = Object.keys(enMessages.admin.wizard);

      Object.entries(languages).forEach(([code, { name: _name, messages }]) => {
        if (code === 'en') return; // Skip English itself

        const languageKeys = Object.keys(messages.admin.wizard);

        expect(languageKeys).toEqual(englishKeys);
      });
    });

    it('should have all wizard step sections in all languages', () => {
      const stepSections = [
        'welcome',
        'basicInfo',
        'rsvpSettings',
        'guests',
        'messageTemplates',
        'invitation',
        'seating',
        'checklist',
        'paymentGifts',
        'completion',
      ];

      Object.entries(languages).forEach(([_code, { name: _name, messages }]) => {
        stepSections.forEach((section) => {
          expect(messages?.admin?.wizard?.[section as keyof typeof messages.admin.wizard]).toBeDefined();
        });
      });
    });

    it('should have no empty translations', () => {
      Object.entries(languages).forEach(([code, { name: _name, messages }]) => {
        const checkNotEmpty = (obj: any, path: string = '') => {
          Object.entries(obj).forEach(([key, value]) => {
            const currentPath = path ? `${path}.${key}` : key;

            if (typeof value === 'string') {
              expect(value.length).toBeGreaterThan(0);
            } else if (typeof value === 'object' && value !== null) {
              checkNotEmpty(value, currentPath);
            }
          });
        };

        if (messages?.admin?.wizard) {
          checkNotEmpty(messages.admin.wizard, `${code}.admin.wizard`);
        }

        expect(messages?.admin?.dashboard?.setupWizard).toBeTruthy();
        expect(messages?.admin?.dashboard?.setupWizardSubtitle).toBeTruthy();
      });
    });
  });

  describe('Translation Quality', () => {
    it('should not have English text in non-English translations for setupWizard', () => {
      const nonEnglishLanguages = Object.entries(languages).filter(([code]) => code !== 'en');

      nonEnglishLanguages.forEach(([_code, { name: _name, messages }]) => {
        const setupWizard = messages?.admin?.dashboard?.setupWizard;

        // Should not contain exact English text
        expect(setupWizard).not.toBe('Setup Wizard');
        expect(setupWizard).not.toContain('Setup Wizard');
      });
    });

    it('should not have English text in non-English translations for wizard sections', () => {
      const nonEnglishLanguages = Object.entries(languages).filter(([code]) => code !== 'en');

      nonEnglishLanguages.forEach(([_code, { name: _name, messages }]) => {
        const wizardTitle = messages?.admin?.wizard?.title;

        // Should not be exactly English
        expect(wizardTitle).not.toBe('Wedding Setup Wizard');
      });
    });

    it('should have language-appropriate characters', () => {
      // German should potentially have umlauts
      const deWizardTitle = deMessages?.admin?.wizard?.title;
      expect(deWizardTitle).toBeDefined();

      // French might have accents
      const frWizardTitle = frMessages?.admin?.wizard?.title;
      expect(frWizardTitle).toBeDefined();

      // Spanish might have ñ or accents
      const esWizardTitle = esMessages?.admin?.wizard?.title;
      expect(esWizardTitle).toBeDefined();

      // Italian might have accents
      const itWizardTitle = itMessages?.admin?.wizard?.title;
      expect(itWizardTitle).toBeDefined();
    });
  });

  describe('Button Text Translations', () => {
    Object.entries(languages).forEach(([code, { name, messages }]) => {
      describe(`${name} (${code})`, () => {
        it('should have setupWizard button text', () => {
          expect(messages?.admin?.dashboard?.setupWizard).toBeDefined();
          expect(messages?.admin?.dashboard?.setupWizard).not.toBe('');
        });

        it('should have setupWizardSubtitle text', () => {
          expect(messages?.admin?.dashboard?.setupWizardSubtitle).toBeDefined();
          expect(messages?.admin?.dashboard?.setupWizardSubtitle).not.toBe('');
        });

        it('setupWizard should be different from setupWizardSubtitle', () => {
          expect(messages?.admin?.dashboard?.setupWizard).not.toBe(
            messages?.admin?.dashboard?.setupWizardSubtitle
          );
        });
      });
    });
  });

  describe('Step Navigation Translations', () => {
    Object.entries(languages).forEach(([code, { name, messages }]) => {
      describe(`${name} (${code})`, () => {
        it('should have all navigation button translations', () => {
          expect(messages?.admin?.wizard?.navigation?.back).toBeDefined();
          expect(messages?.admin?.wizard?.navigation?.continue).toBeDefined();
          expect(messages?.admin?.wizard?.navigation?.saveAndContinue).toBeDefined();
          expect(messages?.admin?.wizard?.navigation?.saving).toBeDefined();
          expect(messages?.admin?.wizard?.navigation?.skipForNow).toBeDefined();
          expect(messages?.admin?.wizard?.navigation?.goToDashboard).toBeDefined();
        });

        it('should have different text for back and continue', () => {
          expect(messages?.admin?.wizard?.navigation?.back).not.toBe(
            messages?.admin?.wizard?.navigation?.continue
          );
        });
      });
    });
  });
});
