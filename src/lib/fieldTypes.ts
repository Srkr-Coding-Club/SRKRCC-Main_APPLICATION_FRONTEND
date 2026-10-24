import type { FieldType } from './types';

/** Structure only: a section header or a page break carries a title, never an answer. */
export function isNonAnswerType(type: FieldType | string | undefined): boolean {
  return type === 'SECTION' || type === 'PAGE_BREAK';
}

/** A saved question has a real database id; a new one in the builder only has a temporary timestamp id. */
export function isSavedFieldId(id: number | string | undefined): boolean {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 && n < 2147483647;
}
