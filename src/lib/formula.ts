/**
 * Arithmetic for calculated questions, the browser's twin of the server's `validation/formula.py`.
 *
 * A formula is numbers, `{<question id>}` references, `+ - * /` and brackets - nothing else, so there is
 * nothing to evaluate that could do anything but sums. Shared test vectors keep the two in step:
 *   - a blank or missing reference counts as 0;
 *   - a reference to something that is not a number makes the whole result empty (`null`);
 *   - division by zero, or a result of 10**15 or more, gives `null`;
 *   - the result is rounded half away from zero to `decimals` places (0-6).
 */

import type { FormField } from './types';
import { asNum, isEmpty } from './formConditional';

export const MAX_FORMULA_LENGTH = 300;
const MAX_REFERENCES = 30;
const MAX_DEPTH = 20;
const MAX_RESULT = 1e15;
const MAX_DECIMALS = 6;

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'ref'; id: number }
  | { kind: 'neg'; operand: Node }
  | { kind: 'op'; op: '+' | '-' | '*' | '/'; left: Node; right: Node };

type Token = { kind: 'num'; value: number } | { kind: 'ref'; id: number } | { kind: 'sym'; value: string };

export class FormulaError extends Error {}

const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|\{(\d+)\}|([-+*/()]))/y;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const source = text.replace(/\s+$/, '');
  TOKEN.lastIndex = 0;
  let position = 0;
  while (position < source.length) {
    TOKEN.lastIndex = position;
    const match = TOKEN.exec(source);
    if (!match) throw new FormulaError(`Unexpected character at position ${position + 1}.`);
    if (match[1] !== undefined) tokens.push({ kind: 'num', value: Number(match[1]) });
    else if (match[2] !== undefined) tokens.push({ kind: 'ref', id: Number(match[2]) });
    else tokens.push({ kind: 'sym', value: match[3] });
    position = TOKEN.lastIndex;
  }
  return tokens;
}

function parseTokens(tokens: Token[]): Node {
  let index = 0;
  let depth = 0;
  const peek = () => tokens[index];
  const isSym = (token: Token | undefined, symbols: string) => token?.kind === 'sym' && symbols.includes(token.value);

  function factor(): Node {
    const token = tokens[index++];
    if (!token) throw new FormulaError('The formula ends unexpectedly.');
    if (token.kind === 'num') return { kind: 'num', value: token.value };
    if (token.kind === 'ref') return { kind: 'ref', id: token.id };
    if (token.value === '-') return { kind: 'neg', operand: factor() };
    if (token.value === '(') {
      if (++depth > MAX_DEPTH) throw new FormulaError('Too many nested brackets.');
      const inner = expression();
      const closing = tokens[index++];
      if (!(closing?.kind === 'sym' && closing.value === ')')) throw new FormulaError('A bracket is not closed.');
      depth--;
      return inner;
    }
    throw new FormulaError(`Unexpected '${token.value}'.`);
  }

  function term(): Node {
    let node = factor();
    while (isSym(peek(), '*/')) {
      const op = (tokens[index++] as { value: string }).value as '*' | '/';
      node = { kind: 'op', op, left: node, right: factor() };
    }
    return node;
  }

  function expression(): Node {
    let node = term();
    while (isSym(peek(), '+-')) {
      const op = (tokens[index++] as { value: string }).value as '+' | '-';
      node = { kind: 'op', op, left: node, right: term() };
    }
    return node;
  }

  if (!tokens.length) throw new FormulaError('The formula is empty.');
  const tree = expression();
  if (index < tokens.length) throw new FormulaError('Unexpected token after the end of the formula.');
  return tree;
}

const cache = new Map<string, Node | FormulaError>();

export function parseFormula(formula: string): Node {
  let cached = cache.get(formula);
  if (!cached) {
    try {
      if (formula.length > MAX_FORMULA_LENGTH) throw new FormulaError(`A formula can be at most ${MAX_FORMULA_LENGTH} characters.`);
      const tree = parseTokens(tokenize(formula));
      if (formulaReferences(tree).size > MAX_REFERENCES) throw new FormulaError(`A formula can use at most ${MAX_REFERENCES} questions.`);
      cached = tree;
    } catch (error) {
      cached = error instanceof FormulaError ? error : new FormulaError('The formula is not valid.');
    }
    if (cache.size > 500) cache.clear();
    cache.set(formula, cached);
  }
  if (cached instanceof FormulaError) throw cached;
  return cached;
}

export function formulaReferences(node: Node): Set<number> {
  switch (node.kind) {
    case 'ref': return new Set([node.id]);
    case 'num': return new Set();
    case 'neg': return formulaReferences(node.operand);
    default: return new Set([...formulaReferences(node.left), ...formulaReferences(node.right)]);
  }
}

class Empty extends Error {}

function valueOf(node: Node, values: Record<string, any>): number {
  switch (node.kind) {
    case 'num': return node.value;
    case 'ref': {
      const raw = values[String(node.id)];
      if (raw === undefined || raw === null || isEmpty(raw)) return 0;
      if (typeof raw === 'object') throw new Empty();
      const n = asNum(raw);
      if (n === null) throw new Empty();
      return n;
    }
    case 'neg': return -valueOf(node.operand, values);
    default: {
      const left = valueOf(node.left, values);
      const right = valueOf(node.right, values);
      if (node.op === '+') return left + right;
      if (node.op === '-') return left - right;
      if (node.op === '*') return left * right;
      if (right === 0) throw new Empty();
      return left / right;
    }
  }
}

/** Round half away from zero without the binary-float surprises of `x * 100` (2.675 must give 2.68). */
function roundHalfAwayFromZero(value: number, places: number): number {
  const sign = value < 0 ? -1 : 1;
  const shifted = Math.round(Number(`${Math.abs(value)}e${places}`));
  return sign * Number(`${shifted}e-${places}`);
}

/** The formula's value for `values` ({question id as text: answer}), or null when it has no value. */
export function evaluateFormula(formula: string, values: Record<string, any>, decimals: number = 2): number | null {
  let result: number;
  try {
    result = valueOf(parseFormula(formula), values);
  } catch {
    return null;
  }
  if (!Number.isFinite(result) || Math.abs(result) >= MAX_RESULT) return null;
  const places = Math.min(Math.max(Math.trunc(Number(decimals)) || 0, 0), MAX_DECIMALS);
  const rounded = roundHalfAwayFromZero(result, places);
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Value of every visible CALCULATED question, from the answers so far. `null` means no result (the question
 * is then empty). Questions that are hidden count as blank, and a chain of calculated questions settles in
 * one pass per question.
 */
export function calculatedValues(
  fields: FormField[],
  valuesByStrId: Record<string, any>,
  visible: Set<string>,
): Map<string, number | null> {
  const calculated = fields.filter((f) => !f.is_deleted && f.type === 'CALCULATED' && visible.has(String(f.id)));
  const out = new Map<string, number | null>();
  if (!calculated.length) return out;

  const known: Record<string, any> = {};
  for (const [key, value] of Object.entries(valuesByStrId)) if (visible.has(key)) known[key] = value;
  for (const f of calculated) delete known[String(f.id)]; // never feed on a stale result

  for (let pass = 0; pass < calculated.length; pass++) {
    for (const f of calculated) {
      const rules = f.validation_rules || {};
      const result = evaluateFormula(String(rules.formula ?? ''), known, Number(rules.decimals ?? 2));
      if (result === null) delete known[String(f.id)]; else known[String(f.id)] = result;
      out.set(String(f.id), result);
    }
  }
  return out;
}
