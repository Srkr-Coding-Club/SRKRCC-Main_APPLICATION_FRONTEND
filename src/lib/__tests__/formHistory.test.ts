import { describe, expect, it } from 'vitest';
import { describeFieldChange, impactWarnings, plural, showValue, type ChangeImpact, type FieldChange } from '../formHistory';

describe('showValue', () => {
  it('says blank, yes/no, lists and short text plainly', () => {
    expect(showValue(null)).toBe('nothing');
    expect(showValue('')).toBe('nothing');
    expect(showValue([])).toBe('nothing');
    expect(showValue(true)).toBe('yes');
    expect(showValue(false)).toBe('no');
    expect(showValue(['a', 'b'])).toBe('a, b');
    expect(showValue(5)).toBe('5');
    expect(showValue('x'.repeat(100))).toHaveLength(80);
    expect(showValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe('plural', () => {
  it('agrees with the number', () => {
    expect(plural(1, 'response')).toBe('1 response');
    expect(plural(3, 'response')).toBe('3 responses');
    expect(plural(0, 'answer')).toBe('0 answers');
  });
});

describe('describeFieldChange', () => {
  const change = (c: Partial<FieldChange> & { key: string; label: string }) => c as FieldChange;

  it('reads a plain change as before -> after', () => {
    expect(describeFieldChange(change({ key: 'label', label: 'Question', before: 'Name', after: 'Full name' } as any))).toBe('question: Name -> Full name');
  });

  it('says required in words', () => {
    expect(describeFieldChange(change({ key: 'is_required', label: 'Required', before: false, after: true } as any))).toBe('now required');
    expect(describeFieldChange(change({ key: 'is_required', label: 'Required', before: true, after: false } as any))).toBe('no longer required');
  });

  it('lists options added and removed', () => {
    expect(describeFieldChange(change({ key: 'options', label: 'Options', added: ['IoT'], removed: ['Web', 'AI'] } as any)))
      .toBe('options: added IoT; removed Web, AI');
    expect(describeFieldChange(change({ key: 'rows', label: 'Rows', added: ['R1'], removed: [] } as any))).toBe('rows: added R1');
  });

  it('describes rule changes one by one', () => {
    expect(describeFieldChange(change({
      key: 'validation_rules', label: 'Rules',
      changed: [{ rule: 'minLength', before: null, after: 2 }, { rule: 'maxLength', before: 10, after: 20 }, { rule: 'pattern', before: '[a-z]+', after: null }],
    } as any))).toBe('minLength set to 2; maxLength: 10 -> 20; pattern removed');
  });

  it('says whether conditions were added, edited or removed', () => {
    const rules = { logic: 'AND', rules: [{ field: 1 }] };
    expect(describeFieldChange(change({ key: 'conditional_logic', label: 'Conditions', before: {}, after: rules } as any))).toBe('conditions added');
    expect(describeFieldChange(change({ key: 'conditional_logic', label: 'Conditions', before: rules, after: { logic: 'OR' } } as any))).toBe('conditions edited');
    expect(describeFieldChange(change({ key: 'conditional_logic', label: 'Conditions', before: rules, after: {} } as any))).toBe('conditions removed');
  });
});

describe('impactWarnings', () => {
  const none: ChangeImpact = {
    response_count: 4, new_required: [], now_required: [], removed_with_answers: [], options_removed_with_answers: [], type_changes_blocked: [],
  };

  it('has nothing to say when nothing is at risk', () => {
    expect(impactWarnings(none)).toEqual([]);
  });

  it('warns about each way a change touches existing responses', () => {
    const warnings = impactWarnings({
      ...none,
      new_required: [{ id: null, label: 'Phone' }],
      now_required: [{ id: 2, label: 'Note' }],
      removed_with_answers: [{ id: 3, label: 'Old', answers: 1 }],
      options_removed_with_answers: [{ id: 4, label: 'Track', option: 'Web', answers: 2 }],
      type_changes_blocked: [{ id: 5, label: 'Age', from: 'TEXT', to: 'NUMBER', answers: 9 }],
    });
    expect(warnings).toEqual([
      '"Phone" is new and required, but the 4 existing responses will not have an answer to it.',
      '"Note" becomes required; some of the 4 existing responses left it empty.',
      '"Old" is removed. The answers already given (1) stay stored but are no longer shown.',
      'The option "Web" of "Track" is removed, but 2 responses chose it.',
      '"Age" cannot change from TEXT to NUMBER: it already has 9 answers.',
    ]);
  });
});
