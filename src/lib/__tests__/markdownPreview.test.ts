import { describe, expect, it } from 'vitest';
import { toPlainPreview } from '../markdownPreview';

describe('toPlainPreview', () => {
  it('drops pictures and headings, keeping the words', () => {
    expect(toPlainPreview('# HACKOVERFLOW\n\n![banner](https://x.test/b.png)\n\nJoin us.')).toBe('HACKOVERFLOW Join us.');
  });

  it('keeps the label of a link and drops its address', () => {
    expect(toPlainPreview('Read the [rules](https://x.test/rules) first.')).toBe('Read the rules first.');
  });

  it('removes emphasis and list markers', () => {
    expect(toPlainPreview('- **Bold** and *italic* and `code`')).toBe('Bold and italic and code');
  });

  it('drops fenced code blocks', () => {
    expect(toPlainPreview('Intro\n```\nconst a = 1;\n```\nEnd')).toBe('Intro End');
  });

  it('collapses whitespace, and returns an empty string for an empty description', () => {
    expect(toPlainPreview('  one\n\n\ntwo  ')).toBe('one two');
    expect(toPlainPreview('')).toBe('');
  });
});
