import type { FormField } from './types';
import { isEmpty } from './formConditional';

/**
 * `{{12}}` in a question, section or page title, description or note is replaced by what the person
 * answered to question 12 - "Hi {{1}}, which course are you taking?". Display only: the server never sees it.
 */

const TOKEN = /\{\{\s*(\d+)\s*\}\}/g;
const NOTHING_YET = '...';

function display(value: unknown): string {
  if (isEmpty(value)) return NOTHING_YET;
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return NOTHING_YET; // a grid or a file: nothing sensible to print inline
  return String(value).trim() || NOTHING_YET;
}

export function pipeText(
  text: string | undefined,
  valuesByStrId: Record<string, any>,
  fieldsById: Map<string, FormField>,
  visible?: Set<string>,
): string | undefined {
  if (!text || !text.includes('{{')) return text;
  return text.replace(TOKEN, (_match, id: string) => {
    const field = fieldsById.get(id);
    if (!field || field.is_deleted || field.profile_field || (visible && !visible.has(id))) return NOTHING_YET;
    if (field.type === 'SECTION' || field.type === 'PAGE_BREAK') return NOTHING_YET;
    return display(valuesByStrId[id]);
  });
}
