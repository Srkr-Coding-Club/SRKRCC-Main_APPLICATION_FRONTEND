import { describe, expect, it } from 'vitest';
import { FORM_LANGUAGES, FORM_STRINGS, normalizeLanguage, translate, type FormLanguage } from '../i18n/formStrings';

const placeholders = (text: string) => (text.match(/\{\w+\}/g) || []).sort();
const languages = Object.keys(FORM_STRINGS) as FormLanguage[];
const keys = Object.keys(FORM_STRINGS.en) as (keyof typeof FORM_STRINGS.en)[];

describe('the form dictionaries', () => {
  it('offer exactly the languages the builder lists', () => {
    expect(languages.sort()).toEqual(FORM_LANGUAGES.map((l) => l.code).sort());
  });

  it.each(languages)('%s has every string, none blank', (language) => {
    expect(Object.keys(FORM_STRINGS[language]).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(FORM_STRINGS[language][key].trim(), `${language}.${key}`).not.toBe('');
  });

  it.each(languages)('%s keeps the same {placeholders} as English, so values are never lost', (language) => {
    for (const key of keys) expect(placeholders(FORM_STRINGS[language][key]), `${language}.${key}`).toEqual(placeholders(FORM_STRINGS.en[key]));
  });

  it('really are translated (not English copied over)', () => {
    for (const language of ['te', 'hi'] as const) {
      for (const key of ['back', 'next', 'submit', 'thanksTitle', 'signInButton'] as const) {
        expect(FORM_STRINGS[language][key], `${language}.${key}`).not.toBe(FORM_STRINGS.en[key]);
      }
    }
  });
});

describe('translate', () => {
  it('fills in values', () => {
    expect(translate('en', 'pageOf', { n: 2, total: 5 })).toBe('Page 2 of 5');
    expect(translate('hi', 'pageOf', { n: 2, total: 5 })).toBe('पृष्ठ 2 / 5');
    expect(translate('te', 'thanksDefault', { title: 'హ్యాక్ నైట్' })).toContain('హ్యాక్ నైట్');
  });

  it('leaves an unknown placeholder visible rather than printing "undefined"', () => {
    expect(translate('en', 'pageOf', { n: 1 })).toBe('Page 1 of {total}');
  });

  it('falls back to English for a language it does not know', () => {
    for (const odd of [undefined, null, '', 'fr', 42]) {
      expect(normalizeLanguage(odd)).toBe('en');
      expect(translate(odd, 'back')).toBe('Back');
    }
  });
});
