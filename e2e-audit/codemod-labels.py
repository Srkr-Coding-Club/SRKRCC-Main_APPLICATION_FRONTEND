"""Names the control that follows an unbound `<label className={LABEL}>text</label>` by adding aria-label="text" to it.
Works inside .map() lists (no ids to collide). Skips controls that already have aria-label/aria-labelledby/id.
Run from the repo root: python e2e-audit/codemod-labels.py [--write]
"""
import glob, re, sys
WRITE = '--write' in sys.argv
pat = re.compile(r'(<label className=\{LABEL\}>((?:(?!</label>).)*?)</label>\s*)<(input|select|textarea|FormSelect|TagInput)\b', re.S)
total = 0
for f in glob.glob('src/**/*.tsx', recursive=True):
    f = f.replace(chr(92), '/')
    t = open(f, encoding='utf-8').read()
    def rep(m):
        global total
        text = re.sub(r'<[^>]*>|\{[^}]*\}', '', m.group(2))
        text = re.sub(r'\s+', ' ', text).replace('*', '').strip(' :')
        if not text or '"' in text:
            return m.group(0)
        tail = t[m.end(): m.end() + 400]
        head = tail.split('/>')[0].split('>')[0]
        if re.search(r'aria-label|aria-labelledby|\bid=', head):
            return m.group(0)
        total += 1
        return f'{m.group(1)}<{m.group(3)} aria-label="{text}"'
    n = pat.sub(rep, t)
    if n != t and WRITE:
        open(f, 'w', encoding='utf-8').write(n)
print(total, 'controls named', '(written)' if WRITE else '(dry run)')
