import { describe, expect, it } from 'vitest';
import { validateFieldValue, validateSubmission } from '../formValidation';
import { pipeText } from '../formPiping';
import { calculatedValues } from '../formula';
import { computeLayout } from '../formConditional';
import type { FormField } from '../types';

const field = (id: number, over: Partial<FormField> = {}): FormField => ({
  id, label: `Q${id}`, type: 'TEXT', is_required: false, order: id, ...over,
});

describe('custom error messages', () => {
  it('words a missing required answer the admin\'s way', () => {
    const q = field(1, { is_required: true, validation_rules: { messages: { required: 'We do need your name.' } } });
    expect(validateFieldValue(q, '')).toBe('We do need your name.');
    expect(validateFieldValue(field(2, { is_required: true }), '')).toBe("'Q2' is required.");
  });

  it('replaces only the rule that failed', () => {
    const q = field(1, { validation_rules: { minLength: 5, maxLength: 8, messages: { minLength: 'Give us a bit more!' } } });
    expect(validateFieldValue(q, 'ab')).toBe('Give us a bit more!');
    expect(validateFieldValue(q, 'abcdefghij')).toBe('Must be at most 8 characters.');
  });

  it('uses the "type" wording for malformed values and "options" for choices', () => {
    const email = field(1, { type: 'EMAIL', validation_rules: { messages: { type: 'That does not look like an email.' } } });
    expect(validateFieldValue(email, 'nope')).toBe('That does not look like an email.');
    const radio = field(2, { type: 'RADIO', options: ['a', 'b'], validation_rules: { messages: { options: 'Pick one of the buttons.', type: 'ignored' } } });
    expect(validateFieldValue(radio, 'z')).toBe('Pick one of the buttons.');
  });

  it('lets a rule message beat the older pattern message', () => {
    const q = field(1, { validation_rules: { pattern: '[0-9]+', patternError: 'Digits only', messages: { pattern: 'Numbers please' } } });
    expect(validateFieldValue(q, 'abc')).toBe('Numbers please');
    const legacy = field(2, { validation_rules: { pattern: '[0-9]+', patternError: 'Digits only' } });
    expect(validateFieldValue(legacy, 'abc')).toBe('Digits only');
  });

  it('carries the wording into whole-form validation', () => {
    const q = field(1, { is_required: true, validation_rules: { messages: { required: 'Name please' } } });
    expect(validateSubmission([q], {}).errors[0].message).toBe('Name please');
  });
});

describe('hidden and calculated questions', () => {
  it('are never required', () => {
    const fields = [field(1, { type: 'HIDDEN', is_required: true }), field(2, { type: 'CALCULATED', is_required: true })];
    expect(validateSubmission(fields, {}).errors).toEqual([]);
    expect(validateFieldValue(fields[0], '')).toBeNull();
  });
});

describe('calculatedValues', () => {
  const fields = [
    field(1, { type: 'NUMBER' }),
    field(2, { type: 'NUMBER' }),
    field(3, { type: 'CALCULATED', validation_rules: { formula: '{1} * {2}', decimals: 2 } }),
    field(4, { type: 'CALCULATED', validation_rules: { formula: '{3} * 1.18', decimals: 2 } }),
  ];

  it('works out each calculated question, including ones built on others', () => {
    const values = { '1': '100', '2': '1' };
    const layout = computeLayout(fields, values);
    const out = calculatedValues(fields, values, layout.visible);
    expect(out.get('3')).toBe(100);
    expect(out.get('4')).toBe(118);
  });

  it('gives no value when the formula has no result, and ignores a question that is hidden', () => {
    const gated = [
      field(1, { type: 'NUMBER' }),
      field(5, { type: 'NUMBER', conditional_logic: { logic: 'AND', action: 'show', rules: [{ field: 1, operator: 'equals', value: 'yes' }] } }),
      field(6, { type: 'CALCULATED', validation_rules: { formula: '{1} + {5}' } }),
    ];
    const values = { '1': '5', '5': '9' };
    const layout = computeLayout(gated, values);
    expect(calculatedValues(gated, values, layout.visible).get('6')).toBe(5); // 5 is hidden, so counts as blank
    expect(calculatedValues([field(7, { type: 'CALCULATED', validation_rules: { formula: '1 / 0' } })], {}, new Set(['7'])).get('7')).toBeNull();
  });
});

describe('pipeText', () => {
  const fields = [
    field(1, { label: 'Name' }),
    field(2, { type: 'CHECKBOX', options: ['a', 'b'] }),
    field(3, { type: 'SECTION' }),
    field(4, { profile_field: 'email' }),
  ];
  const byId = new Map(fields.map((f) => [String(f.id), f]));

  it('puts earlier answers into the text', () => {
    expect(pipeText('Hi {{1}}, you picked {{2}}.', { '1': ' Dana ', '2': ['a', 'b'] }, byId)).toBe('Hi Dana, you picked a, b.');
  });

  it('shows "..." for blank, unknown, hidden, structural and profile-filled questions', () => {
    expect(pipeText('{{1}}|{{99}}|{{3}}|{{4}}', { '1': '', '4': 'x@y.z' }, byId)).toBe('...|...|...|...');
    expect(pipeText('Hi {{1}}', { '1': 'Dana' }, byId, new Set(['2']))).toBe('Hi ...');
  });

  it('leaves text without tokens alone', () => {
    expect(pipeText('Plain text', {}, byId)).toBe('Plain text');
    expect(pipeText(undefined, {}, byId)).toBeUndefined();
    expect(pipeText('{{ 1 }}', { '1': 'x' }, byId)).toBe('x');
  });
});
