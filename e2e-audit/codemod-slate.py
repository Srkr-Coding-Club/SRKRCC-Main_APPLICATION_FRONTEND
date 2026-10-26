"""Usage: python e2e-audit/codemod-slate.py [--write] [--slate-400-in-scope]
--slate-400-in-scope turns light-theme text-slate-400 (#94A3B8, 2.5:1 on white) into text-slate-500 + dark:text-slate-400 in the
hackathon module and the shared ui components only.

Pairs a dark-theme text colour with Tailwind slate text classes that fail contrast on the dark ground (#0D0E15).

text-slate-500 (#64748B) on #0D0E15 is 4.04:1 (fails 4.5:1). Adding `dark:text-slate-400` (#94A3B8, ~7.7:1) keeps the light
theme untouched. A class string that already carries a `dark:text-` colour is left alone.
Run from the repo root: python e2e-audit/codemod-slate.py [--write]
"""
import glob
import re
import sys

WRITE = '--write' in sys.argv
SCOPED = '--slate-400-in-scope' in sys.argv
TOKEN = re.compile(r'(?<![\w:/-])text-slate-400(?![\w/-])' if SCOPED else r'(?<![\w:/-])text-slate-500(?![\w/-])')
SCOPE = ('src/components/ui/', 'src/components/hackathons/', 'src/components/admin/hackathon/', 'src/app/hackathons/', 'src/app/admin/hackathons/', 'src/components/HackathonCard.tsx', 'src/components/PublicListingCard.tsx')
QUOTES = '\'"`'


def enclosing_string(text: str, pos: int) -> tuple[int, int]:
    left = max(text.rfind(q, 0, pos) for q in QUOTES)
    rights = [i for i in (text.find(q, pos) for q in QUOTES) if i != -1]
    return left, (min(rights) if rights else len(text))


changed_files = 0
total = 0
for path in glob.glob('src/**/*.tsx', recursive=True):
    path = path.replace('\\', '/')
    if '__tests__' in path or '/hero-intro/' in path:
        continue
    if SCOPED and not path.startswith(SCOPE):
        continue
    text = open(path, encoding='utf-8').read()
    out, last, count = [], 0, 0
    for match in TOKEN.finditer(text):
        left, right = enclosing_string(text, match.start())
        segment = text[left:right]
        if 'dark:text-' in segment:
            continue
        if SCOPED:
            out.append(text[last:match.start()])
            out.append('text-slate-500 dark:text-slate-400')
        else:
            out.append(text[last:match.end()])
            out.append(' dark:text-slate-400')
        last = match.end()
        count += 1
    if count:
        out.append(text[last:])
        total += count
        changed_files += 1
        if WRITE:
            open(path, 'w', encoding='utf-8').write(''.join(out))
print(f'{total} replacements in {changed_files} files', '(written)' if WRITE else '(dry run)')
