import { describe, expect, it } from 'vitest';
import { MAX_URL_LENGTH, linkProblem, type LinkKind } from '../submissionLinks';

const OK: Record<LinkKind, string[]> = {
  any: ['https://smart-bins.vercel.app/', 'https://docs.google.com/presentation/d/abc/edit', 'https://example.org/a?b=1#c'],
  repo: ['https://github.com/owner/repo', 'https://www.github.com/owner/repo', 'https://gitlab.com/group/sub/repo', 'https://huggingface.co/spaces/o/app'],
  video: ['https://www.youtube.com/watch?v=abc', 'https://youtu.be/abc', 'https://drive.google.com/file/d/abc/view'],
  linkedin: ['https://www.linkedin.com/posts/x-activity-1', 'https://lnkd.in/abc'],
};
const BAD_ANY = [
  'http://example.org/', 'ftp://example.org/x', 'javascript:alert(1)', 'example.org', 'https://user:pass@example.org/', 'https://localhost/x',
  'https://127.0.0.1/x', 'https://10.0.0.5/x', 'https://192.168.1.10/x', 'https://172.16.0.1/x', 'https://169.254.169.254/x', 'https://[::1]/x',
  'https://printer.local/x', 'https://intranet/x', 'https://example.org/a b', `https://example.org/${'a'.repeat(MAX_URL_LENGTH)}`,
];

describe('linkProblem', () => {
  it('accepts good links of every kind', () => {
    for (const [kind, links] of Object.entries(OK)) for (const link of links) expect(linkProblem(link, 'Link', kind as LinkKind), `${kind} ${link}`).toBe('');
  });

  it('refuses unsafe or malformed links for every kind', () => {
    for (const kind of Object.keys(OK) as LinkKind[]) for (const link of BAD_ANY) expect(linkProblem(link, 'Link', kind), `${kind} ${link}`).not.toBe('');
  });

  it('wants a repository on a code host with owner and name', () => {
    for (const link of ['https://example.com/o/r', 'https://github.com/', 'https://github.com/owner', 'https://github.com.evil.com/o/r']) expect(linkProblem(link, 'Repo', 'repo')).not.toBe('');
  });

  it('keeps video and LinkedIn links to their sites', () => {
    expect(linkProblem('https://example.com/v.mp4', 'Video', 'video')).toContain('video site');
    expect(linkProblem('https://youtube.com.evil.com/w', 'Video', 'video')).not.toBe('');
    expect(linkProblem('https://example.org/post', 'Post', 'linkedin')).toContain('LinkedIn');
  });

  it('lets optional links be empty but not required ones', () => {
    expect(linkProblem('  ', 'Link')).toBe('');
    expect(linkProblem('', 'Link', 'any', true)).toBe('Link is required.');
  });
});
