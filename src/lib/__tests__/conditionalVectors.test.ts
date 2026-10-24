/**
 * Runs the conditional-engine test vectors shared with the backend
 * (apps/forms/tests/fixtures/conditional_vectors.json). Both engines must give the same answers, so
 * the fixture file is kept byte-identical in both repos.
 */
import { describe, expect, it } from 'vitest';
import vectors from './fixtures/conditional-vectors.json';
import { computeLayout, evaluateOperator } from '../formConditional';
import { evaluateFormula } from '../formula';
import type { FormField } from '../types';

describe('operator vectors', () => {
  for (const c of vectors.operators) {
    it(c.name, () => {
      expect(evaluateOperator(c.op, c.left, c.right)).toBe(c.expect);
    });
  }
});

describe('layout vectors', () => {
  for (const scenario of vectors.layouts) {
    for (const c of scenario.cases as any[]) {
      it(`${scenario.name} / ${JSON.stringify(c.values)}`, () => {
        const fields = (scenario.fields as any[]).map((f) => ({
          label: `Q${f.id}`, order: f.id, is_required: false, conditional_logic: {}, ...f,
        })) as FormField[];
        const layout = computeLayout(fields, c.values);
        expect([...layout.visible].map(Number).sort((a, b) => a - b)).toEqual(c.visible);
        if (c.required) expect(Object.fromEntries(layout.requiredOverrides)).toEqual(c.required);
        if (c.set_values) expect(Object.fromEntries(layout.setValues)).toEqual(c.set_values);
        if (c.allowed_options) expect(Object.fromEntries(layout.allowedOptions)).toEqual(c.allowed_options);
        if (c.messages) expect(Object.fromEntries(layout.messages)).toEqual(c.messages);
        if (c.skipped_pages) expect([...layout.skippedPages].sort((a, b) => a - b)).toEqual(c.skipped_pages);
      });
    }
  }
});

describe('formula vectors', () => {
  for (const c of (vectors as any).formulas as { name: string; formula: string; values: Record<string, any>; decimals: number; expect: number | null }[]) {
    it(c.name, () => {
      const result = evaluateFormula(c.formula, c.values, c.decimals);
      if (c.expect === null) expect(result).toBeNull();
      else expect(result).toBeCloseTo(c.expect, 9);
    });
  }
});
