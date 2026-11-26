import { describe, expect, it } from 'vitest';
import { isPowerPoint, officeViewerUrl, previewKindOf } from '../filePreview';

describe('filePreview', () => {
  it('previews PDFs and images in the browser, but not PowerPoint', () => {
    expect(previewKindOf('application/pdf', 'deck.pdf')).toBe('pdf');
    expect(previewKindOf('image/png', 'pay.png')).toBe('image');
    expect(previewKindOf('application/vnd.ms-powerpoint', 'deck.ppt')).toBeNull();
  });

  it('recognises PowerPoint slides by their extension', () => {
    expect(isPowerPoint('Deck.PPTX')).toBe(true);
    expect(isPowerPoint('deck.ppt')).toBe(true);
    expect(isPowerPoint('deck.pdf')).toBe(false);
    expect(isPowerPoint(undefined)).toBe(false);
  });

  it('builds the Office viewer address with the file link encoded', () => {
    expect(officeViewerUrl('https://api.example/office-view/a:b/deck.pptx')).toBe(
      'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fapi.example%2Foffice-view%2Fa%3Ab%2Fdeck.pptx',
    );
  });
});
