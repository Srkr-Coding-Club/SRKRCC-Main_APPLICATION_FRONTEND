import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MarkdownRenderer } from '../MarkdownRenderer';

afterEach(cleanup);

const doc = '# Title\n\n## Section\n\n### Sub\n\n#### Tiny\n\nText with **bold**.\n\n- one\n- two\n\n1. first\n2. second\n\n---\n\n| A | B |\n| --- | --- |\n| 1 | 2 |';

describe('MarkdownRenderer', () => {
  it('renders four heading levels, lists, a rule and a table', () => {
    const { container } = render(<MarkdownRenderer content={doc} />);
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'hr', 'table']) expect(container.querySelector(tag), tag).toBeTruthy();
    expect(container.querySelectorAll('li')).toHaveLength(4);
  });

  it('keeps the compact look by default and uses the theme tokens only in the article variant', () => {
    const compact = render(<MarkdownRenderer content={doc} />).container;
    expect(compact.innerHTML).not.toContain('journey-');
    cleanup();
    const article = render(<MarkdownRenderer content={doc} variant="article" />).container;
    expect(article.innerHTML).toContain('text-journey-text');
    expect(article.querySelector('h2')!.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(article.querySelector('ol li')!.className).toContain('counter(step)');
  });

  it('renders nothing for empty content', () => {
    expect(render(<MarkdownRenderer content="  " variant="article" />).container.innerHTML).toBe('');
  });
});
