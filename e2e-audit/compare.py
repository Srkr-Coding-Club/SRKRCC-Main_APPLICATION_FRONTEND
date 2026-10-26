"""(The skip link is a 1x1 visually-hidden anchor until focused; it is not counted as a small target.)
Compares two crawl JSON files (before / after) and prints markdown tables.
Usage: python e2e-audit/compare.py <before.json> <after.json> [--hack]
--hack restricts to the hackathon module routes (public, participant and admin).
"""
import collections
import json
import sys

before = json.load(open(sys.argv[1], encoding='utf-8'))
after = json.load(open(sys.argv[2], encoding='utf-8'))
HACK = '--hack' in sys.argv


def keep(row):
    return ('hackathons' in row['route']) if HACK else True


def key(row):
    return (row['vp'], row['role'], row['route'])


def summarize(rows):
    rows = [r for r in rows if keep(r) and 'error' not in r]
    out = {
        'pages': len(rows),
        'overflow_pages': sum(1 for r in rows if r.get('overflow', 0) > 0),
        'small_targets': sum(r.get('smallCount', 0) - sum(1 for s in r.get('small', []) if s.startswith('a.sr-only')) for r in rows),
        'tiny_text_nodes': sum(sum(n for _, n in r.get('tiny', [])) for r in rows),
        'unnamed_controls': sum(len(r.get('noName', [])) for r in rows),
        'console_errors': sum(len(r.get('consoleErrors', [])) for r in rows),
        'failed_requests': sum(len(r.get('failed', [])) for r in rows),
        'load_errors': sum(1 for r in rows if 'error' in r),
    }
    rules = collections.Counter()
    nodes = collections.Counter()
    for r in rows:
        for a in r.get('axe', []):
            rules[a['id']] += 1
            nodes[a['id']] += a['n']
    return out, rules, nodes


(b, br, bn), (a, ar, an) = summarize(before), summarize(after)
print('| Metric | Before | After |')
print('|---|---:|---:|')
for k in b:
    print(f'| {k.replace("_", " ")} | {b[k]} | {a[k]} |')
print()
print('| axe rule | pages before | pages after | nodes before | nodes after |')
print('|---|---:|---:|---:|---:|')
for rule in sorted(set(br) | set(ar), key=lambda x: -(br[x] + ar[x])):
    print(f'| {rule} | {br[rule]} | {ar[rule]} | {bn[rule]} | {an[rule]} |')
