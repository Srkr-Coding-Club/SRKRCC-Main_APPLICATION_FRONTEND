import { describe, expect, it } from 'vitest';
import { fileLimitHint } from '../uploadConfig';

const config = { direct_upload: true, default_mb: 2, max_mb: 25 };

describe('fileLimitHint', () => {
  it('says what a blank box means and the largest allowed size', () => {
    expect(fileLimitHint(config, undefined)).toBe('Blank = 2 MB. Largest allowed: 25 MB.');
    expect(fileLimitHint(config, 10)).toBe('Blank = 2 MB. Largest allowed: 25 MB.');
  });

  it('warns when the chosen size is over the platform maximum', () => {
    expect(fileLimitHint(config, 26)).toContain('will not save');
    expect(fileLimitHint(config, '30')).toContain('25 MB');
  });

  it('does not warn at exactly the maximum', () => {
    expect(fileLimitHint(config, 25)).not.toContain('will not save');
  });
});
