/**
 * Turns a markdown description into one line of plain text for a listing card.
 * Cards have a fixed height, so pictures, code blocks and big headings are dropped and only the words are kept.
 */
export function toPlainPreview(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/gm, '')
    .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')
    .replace(/(\*|_|`)(.+?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();
}
