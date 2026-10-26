"""Light-theme status text that misses 4.5:1 on white, paired with its existing dark-theme shade.

text-rose-500  (#F43F5E) on white = 3.76:1  ->  text-rose-600 dark:text-rose-400   (4.7:1 / 7:1)
text-amber-600 (#D97706) on white = 3.19:1  ->  text-amber-700 dark:text-amber-400 (5.0:1 / 9:1)
A class string that already has a `dark:text-` colour only gets the light shade swapped. Run from the repo root.
"""
import glob
import re
import sys

WRITE = '--write' in sys.argv
QUOTES = '\'"`'
RULES = [
    (re.compile(r'(?<![\w:/-])text-rose-500(?![\w/-])'), 'text-rose-600', 'dark:text-rose-400'),
    (re.compile(r'(?<![\w:/-])text-amber-600(?![\w/-])'), 'text-amber-700', 'dark:text-amber-400'),
]


def enclosing(text, pos):
    left = max(text.rfind(q, 0, pos) for q in QUOTES)
    rights = [i for i in (text.find(q, pos) for q in QUOTES) if i != -1]
    return left, (min(rights) if rights else len(text))


total = 0
for path in glob.glob('src/**/*.tsx', recursive=True):
    path = path.replace(chr(92), '/')
    if '__tests__' in path or '/hero-intro/' in path:
        continue
    text = open(path, encoding='utf-8').read()
    for pattern, light, dark in RULES:
        out, last = [], 0
        for match in pattern.finditer(text):
            left, right = enclosing(text, match.start())
            segment = text[left:right]
            out.append(text[last:match.start()])
            out.append(light if 'dark:text-' in segment else f'{light} {dark}')
            last = match.end()
            total += 1
        out.append(text[last:])
        text = ''.join(out)
    if WRITE:
        open(path, 'w', encoding='utf-8').write(text)
print(total, 'replacements', '(written)' if WRITE else '(dry run)')
