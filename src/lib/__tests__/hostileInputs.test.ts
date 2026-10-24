import { describe, expect, it } from 'vitest';
import type { FormField } from '../types';
import { validateFieldValue, validateSubmission } from '../formValidation';
import { computeLayout, evaluateOperator, normalizeConditional } from '../formConditional';
import { calculatedValues, evaluateFormula } from '../formula';
import { pipeText } from '../formPiping';
import { cleanQueryValue, defaultAnswers, hiddenAnswers } from '../formDefaults';
import { persistableAnswers } from '../hooks/useFormDraft';

// The browser side of the same sweep the server gets (apps/forms/tests/test_hostile_inputs.py): nothing may throw or hang.
const NASTY: any[] = [
  null, undefined, '', ' ', '   \t\n', 0, -1, 1, 2 ** 70, 1.5, Infinity, -Infinity, NaN, true, false,
  '0', '-0', '1e999', 'NaN', 'Infinity', '١٢٣', '１２３', '12abc', '0x10', '1_000', ' 12 ', '12,5',
  'a'.repeat(100_000), '\u0000', 'a\u0000b', '‮evil', '😀'.repeat(2000), '<script>alert(1)</script>', "'; DROP TABLE x; --",
  '{{1}}', '{1}', '${7*7}', '../../etc/passwd', 'javascript:alert(1)',
  [], [null], ['a', 'a'], Array(5000).fill('a'), [[]], [{}], {}, { a: 1 }, { '': '' }, { a: { b: { c: [] } } }, JSON.parse('{"__proto__": 1}'),
  '2026-02-30', '2026-13-01', '0000-00-00', '9999-12-31', '24:00', '23:60', '99:99', '2026-10-22T10:00:00Z',
  () => 1, Symbol.iterator.toString(), new Date('invalid'), new Date(0),
];

const TYPES: [string, Partial<FormField>][] = [
  ['TEXT', {}], ['TEXT', { validation_rules: { minLength: 2, maxLength: 5, pattern: '[a-z]+' } }], ['PARAGRAPH', {}], ['EMAIL', {}], ['PHONE', {}],
  ['URL', {}], ['NUMBER', { min_value: 1, max_value: 10 }], ['NUMBER', { validation_rules: { integerOnly: true, decimals: 2 } }],
  ['DROPDOWN', { options: ['A', 'B'] }], ['RADIO', { options: ['A', 'B'] }], ['CHECKBOX', { options: ['A', 'B'] }], ['DATE', {}], ['TIME', {}],
  ['RATING', { max_value: 5 }], ['LINEAR_SCALE', { min_value: 1, max_value: 7 }],
  ['MATRIX_RADIO', { options: ['Lo', 'Hi'], rows: ['r1', 'r2'] }], ['MATRIX_CHECKBOX', { options: ['Lo', 'Hi'], rows: ['r1', 'r2'] }],
  ['FILE', {}], ['MULTI_FILE', {}], ['SIGNATURE', {}], ['CLUB_ID', {}], ['HIDDEN', {}], ['CALCULATED', { validation_rules: { formula: '1 + 1' } }],
];

const field = (id: number, type: string, extra: Partial<FormField> = {}): FormField =>
  ({ id, label: `Q${id}`, type, is_required: false, order: id, options: [], validation_rules: {}, conditional_logic: {}, ...extra }) as FormField;

describe('every question type against nasty answers', () => {
  it('never throws, and always answers with a message or nothing', () => {
    const failures: string[] = [];
    for (const [type, extra] of TYPES) {
      for (const required of [true, false]) {
        for (const value of NASTY) {
          try {
            const message = validateFieldValue(field(1, type, { ...extra, is_required: required }), value, required);
            if (message !== null && typeof message !== 'string') failures.push(`${type}: returned ${typeof message}`);
          } catch (e: any) {
            failures.push(`${type} ${String(typeof value === 'string' ? value.slice(0, 20) : value)}: ${e?.message}`);
          }
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('a required question is never satisfied by emptiness', () => {
    for (const [type, extra] of TYPES) {
      if (type === 'HIDDEN' || type === 'CALCULATED') continue;
      for (const empty of [null, undefined, '', '   ', [], {}, '\n\t']) {
        expect(validateFieldValue(field(1, type, { ...extra, is_required: true }), empty, true), `${type} accepted ${JSON.stringify(empty)}`).toBeTruthy();
      }
    }
  });

  it('a whole submission with junk for every answer is checked without throwing', () => {
    const fields = TYPES.map(([type, extra], i) => field(i + 1, type, extra));
    for (const value of NASTY) {
      const answers = Object.fromEntries(fields.map((f) => [String(f.id), value]));
      expect(() => validateSubmission(fields, answers)).not.toThrow();
      const layout = computeLayout(fields, answers);
      expect(layout.visible.size).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('conditions written by hand', () => {
  const junk: any[] = [
    null, '', 'x', 5, [], [null], {}, { rules: 'x' }, { rules: [null] }, { rules: [{}] }, { rules: [{ field: 'a', operator: 5 }] },
    { logic: 7, rules: [] }, { action: [], rules: [{ field: 2 }] }, { rules: [{ field: 1, operator: 'equals', value: { a: [] } }] },
    { rules: [{ rules: [{ rules: [{ rules: [] }] }] }] },
  ];

  it('are normalised and evaluated without throwing', () => {
    for (const condition of junk) {
      const fields = [field(1, 'TEXT'), field(2, 'TEXT', { conditional_logic: condition })];
      expect(() => normalizeConditional(condition)).not.toThrow();
      expect(() => computeLayout(fields, { '1': 'x' })).not.toThrow();
    }
  });

  it('a condition nested hundreds of groups deep does not overflow the stack', () => {
    let node: any = { field: 1, operator: 'equals', value: 'x' };
    for (let i = 0; i < 500; i++) node = { logic: 'AND', rules: [node] };
    const fields = [field(1, 'TEXT'), field(2, 'TEXT', { conditional_logic: node })];
    expect(() => computeLayout(fields, { '1': 'x' })).not.toThrow();
  });

  it('every operator copes with every kind of value on either side', () => {
    const operators = ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'gt', 'gte', 'lt', 'lte', 'between', 'is_empty', 'is_not_empty', 'in', 'not_in', 'regex', 'nonsense', ''];
    for (const op of operators) {
      for (const left of NASTY.slice(0, 40)) {
        for (const right of NASTY.slice(0, 40)) {
          expect(() => evaluateOperator(op, left, right), `${op}`).not.toThrow();
        }
      }
    }
  });

  it('questions that depend on each other in a circle still settle', () => {
    const a = field(1, 'TEXT', { conditional_logic: { logic: 'AND', action: 'show', rules: [{ field: 2, operator: 'equals', value: 'x' }] } });
    const b = field(2, 'TEXT', { conditional_logic: { logic: 'AND', action: 'show', rules: [{ field: 1, operator: 'equals', value: 'x' }] } });
    const started = performance.now();
    expect(() => computeLayout([a, b], { '1': 'x', '2': 'x' })).not.toThrow();
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('formulas', () => {
  const evil = ['', ' ', '(', ')', '((((', '{', '{}', '{abc}', '{1', '1 +', '+ 1', '1 / 0', '0 / 0', '1 / {1}', '{1} * {1} * {1} * {1}', '-', '--1', '1e999', '1e999 * 0',
    '9'.repeat(400), '(' .repeat(2000) + '1' + ')'.repeat(2000), '1 + '.repeat(5000) + '1', '{1}'.repeat(500), 'alert(1)', 'constructor', '{__proto__}', '1 % 0', '1 ** 2', "1; process.exit()"];

  it('never throw and answer null for what cannot be computed', () => {
    for (const formula of evil) {
      for (const value of [undefined, '', 'abc', '0', '5', 0, 5, NaN, Infinity, [], {}]) {
        let result: unknown;
        expect(() => { result = evaluateFormula(formula, { '1': value }); }, formula.slice(0, 30)).not.toThrow();
        expect(result === null || (typeof result === 'number' && Number.isFinite(result)), `${formula.slice(0, 30)} -> ${String(result)}`).toBe(true);
      }
    }
  });

  it('totals that depend on each other in a circle do not loop forever', () => {
    const a = field(1, 'CALCULATED', { validation_rules: { formula: '{2} + 1' } });
    const b = field(2, 'CALCULATED', { validation_rules: { formula: '{1} + 1' } });
    const started = performance.now();
    expect(() => calculatedValues([a, b], {}, new Set(['1', '2']))).not.toThrow();
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('text that gets piped into the page', () => {
  it('is only ever text and survives odd answers', () => {
    const fields = new Map([['1', field(1, 'TEXT')]]);
    for (const value of NASTY) {
      expect(() => pipeText('Hello {{1}} and {{2}} and {{', { '1': value }, fields)).not.toThrow();
    }
    expect(pipeText('{{1}}', { '1': '<img src=x onerror=alert(1)>' }, fields)).toBe('<img src=x onerror=alert(1)>');
    expect(pipeText('{{1}}'.repeat(1000), { '1': 'a' }, fields)).toHaveLength(1000);
  });
});

describe('values that arrive from the link and the saved draft', () => {
  it('cleanQueryValue / hiddenAnswers / defaultAnswers cope with junk', () => {
    const fields = [field(1, 'HIDDEN', { validation_rules: { queryParam: 'ref', defaultValue: 'd' } }), field(2, 'TEXT', { validation_rules: { defaultValue: 5 as any } })];
    for (const search of ['', '?', '?ref', '?ref=', '?ref=%E0%A4%A', '?ref=' + 'a'.repeat(10_000), '?ref=a&ref=b', '?ref[]=1', '?__proto__=1', '?ref=%00']) {
      expect(() => hiddenAnswers(fields, search, {})).not.toThrow();
    }
    for (const raw of NASTY.filter((v) => typeof v === 'string' || v == null)) expect(() => cleanQueryValue(raw as any)).not.toThrow();
    expect(() => defaultAnswers(fields, { '2': 'kept' })).not.toThrow();
  });

  it('a saved draft with answers for questions that no longer exist or have changed type is filtered', () => {
    const fields = [field(1, 'TEXT'), field(2, 'FILE')];
    const kept = persistableAnswers(fields, { '1': 'ok', '2': [{ name: 'x' }], '99': 'ghost', constructor: 'x', __proto__: { a: 1 } } as any);
    expect(kept).toEqual({ '1': 'ok' });
  });
});
