import type { Page, Route } from '@playwright/test';

export const user = { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'NON_AFFILIATE' };
export const adminUser = { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true };

export interface Question {
  id: number; label: string; type: string; order: number; is_required?: boolean; options?: string[];
  rows?: string[]; description?: string; placeholder?: string; validation_rules?: Record<string, unknown>;
  conditional_logic?: Record<string, unknown>; min_value?: number; max_value?: number; profile_field?: string | null;
}

export const makeForm = (fields: Question[], extra: Record<string, unknown> = {}) => ({
  id: 55, title: 'Hack Night', slug: 'demo', description: 'Sign up', status: 'PUBLISHED', version: 1,
  allow_multiple_responses: false, allow_response_editing: true, enable_prefill: false, fields, ...extra,
});

export interface Backend {
  /** Bodies of the submissions the page sent (POST). */
  submissions: any[];
  /** Bodies of edits to an existing response (PATCH). */
  edits: any[];
  /** Bodies of the draft saves. */
  drafts: any[];
  draft: any;
  /** Every request the page made, "METHOD path". */
  requests: string[];
}

export interface FormOptions {
  /** Answer a submission differently; return null to go offline (network error). */
  onSubmit?: (body: any, count: number) => { status: number; body: unknown } | null;
  /** null = nobody is signed in. */
  asUser?: object | null;
  /** What /my-response/ says; default: has not submitted. */
  myResponse?: object;
  availability?: Record<string, Record<string, number>>;
  /** Wait this long (ms) before answering a submission. */
  submitDelay?: number;
  path?: string;
}

/**
 * Pretends to be the API for one form: signs the visitor in (the site keeps its user in localStorage), serves the form
 * and answers everything else the page asks for.
 */
export async function openForm(page: Page, form: object, options: FormOptions = {}): Promise<Backend> {
  const backend: Backend = { submissions: [], edits: [], drafts: [], draft: null, requests: [] };
  const who = options.asUser === undefined ? user : options.asUser;
  await page.addInitScript((u) => { if (u) localStorage.setItem('srkrcc_user', JSON.stringify(u)); }, who);

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/api/proxy/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/proxy', '');
    const method = request.method();
    backend.requests.push(`${method} ${path}`);
    if (path === '/forms/demo/') return json(route, form);
    if (path.startsWith('/forms/demo/my-response')) return json(route, options.myResponse ?? { has_submitted: false, can_edit: true, response: null });
    if (path === '/forms/demo/availability/') return json(route, options.availability ?? {});
    if (path === '/forms/demo/draft/') {
      if (method === 'PUT') {
        backend.draft = JSON.parse(request.postData() || '{}');
        backend.drafts.push(backend.draft);
        return json(route, { saved_at: new Date().toISOString(), dropped: [] });
      }
      return json(route, { draft: backend.draft });
    }
    if (path === '/forms/submissions/' && method === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      backend.submissions.push(body);
      if (options.submitDelay) await new Promise((r) => setTimeout(r, options.submitDelay));
      const reply = options.onSubmit ? options.onSubmit(body, backend.submissions.length) : { status: 201, body: { id: 1, answers: [] } };
      if (reply === null) return route.abort('internetdisconnected');
      return json(route, reply.body, reply.status);
    }
    if (/^\/forms\/submissions\/\d+\/$/.test(path) && method === 'PATCH') {
      backend.edits.push(JSON.parse(request.postData() || '{}'));
      return json(route, { id: 1, answers: [] });
    }
    return json(route, {});
  });

  await page.goto(options.path ?? '/forms/demo');
  return backend;
}
