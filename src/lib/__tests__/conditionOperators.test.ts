import { describe, expect, it } from 'vitest';
import { OPERATOR_LABELS, operatorsFor, operatorValueKind, ruleProblem } from '../conditionOperators';
import { normalizeConditional } from '../formConditional';

describe('operatorsFor', () => {
  it('offers date operators only for date questions', () => {
    expect(operatorsFor('DATE')).toContain('before');
    expect(operatorsFor('TEXT')).not.toContain('before');
    expect(operatorsFor('NUMBER')).not.toContain('before');
  });

  it('offers selection operators only for choice questions', () => {
    expect(operatorsFor('CHECKBOX')).toContain('includes_any');
    expect(operatorsFor('RADIO')).toContain('selected');
    expect(operatorsFor('TEXT')).not.toContain('includes');
    expect(operatorsFor('NUMBER')).not.toContain('includes_any');
  });

  it('offers numeric comparisons for numbers, ratings and dates but not free text', () => {
    for (const type of ['NUMBER', 'RATING', 'LINEAR_SCALE', 'DATE'] as const) expect(operatorsFor(type)).toContain('between');
    expect(operatorsFor('TEXT')).not.toContain('gt');
    expect(operatorsFor('EMAIL')).toContain('contains');
  });

  it('always offers the basics and never repeats an operator', () => {
    for (const type of ['TEXT', 'NUMBER', 'DATE', 'CHECKBOX', 'FILE'] as const) {
      const ops = operatorsFor(type);
      for (const basic of ['equals', 'not_equals', 'is_empty', 'is_not_empty']) expect(ops).toContain(basic);
      expect(new Set(ops).size).toBe(ops.length);
    }
  });

  it('has a label for every operator it offers', () => {
    for (const type of ['TEXT', 'NUMBER', 'DATE', 'CHECKBOX', 'RADIO'] as const) {
      for (const op of operatorsFor(type)) expect(OPERATOR_LABELS[op]).toBeTruthy();
    }
  });
});

describe('operatorValueKind', () => {
  it('knows how many values an operator takes', () => {
    expect(operatorValueKind('is_empty')).toBe('none');
    expect(operatorValueKind('between')).toBe('range');
    expect(operatorValueKind('date_between')).toBe('range');
    expect(operatorValueKind('includes_all')).toBe('list');
    expect(operatorValueKind('equals')).toBe('single');
  });
});

describe('ruleProblem', () => {
  it('flags the same gaps the backend refuses at publish time', () => {
    expect(ruleProblem({ field: null, operator: 'equals', value: 'x' })).toMatch(/question/);
    expect(ruleProblem({ field: 1, operator: 'equals', value: '' })).toMatch(/value/);
    expect(ruleProblem({ field: 1, operator: 'between', value: ['1'] })).toMatch(/start and an end/);
    expect(ruleProblem({ field: 1, operator: 'includes_any', value: [] })).toMatch(/option/);
  });

  it('accepts complete rules, including a comparison with another question', () => {
    expect(ruleProblem({ field: 1, operator: 'equals', value: 'x' })).toBeNull();
    expect(ruleProblem({ field: 1, operator: 'gt', value: 0 })).toBeNull();
    expect(ruleProblem({ field: 1, operator: 'between', value: ['1', '5'] })).toBeNull();
    expect(ruleProblem({ field: 1, operator: 'is_empty' })).toBeNull();
    expect(ruleProblem({ field: 1, operator: 'before', value_field: 2 })).toBeNull();
  });
});

describe('normalizeConditional keeps what the builder writes', () => {
  it('keeps value_field and action_value', () => {
    const n = normalizeConditional({
      logic: 'OR', action: 'restrict_options', action_value: ['A'],
      rules: [{ field: 1, operator: 'before', value_field: 2 }, { logic: 'AND', rules: [{ field: 3, operator: 'is_empty' }] }],
    });
    expect(n?.action_value).toEqual(['A']);
    expect((n?.rules[0] as any).value_field).toBe(2);
    expect((n?.rules[1] as any).rules).toHaveLength(1);
  });
});
