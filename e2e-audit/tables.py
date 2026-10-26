"""Markdown tables for the audit reports from the crawl JSON files.
Usage: python e2e-audit/tables.py viewports <before.json> <after.json>
       python e2e-audit/tables.py tabs <before-tabs.json> <after-tabs.json>
"""
import collections
import json
import sys

mode, before_path, after_path = sys.argv[1:4]
before = json.load(open(before_path, encoding='utf-8'))
after = json.load(open(after_path, encoding='utf-8'))


def contrast_nodes(row):
    return sum(a['n'] for a in row.get('axe', []) if a['id'] == 'color-contrast')


if mode == 'viewports':
    order = ['320x568', '375x812', '430x932', '768x1024', '1024x768', '1366x768', '1440x900', '1920x1080']
    names = {'320x568': 'Small mobile', '375x812': 'Standard mobile', '430x932': 'Large mobile', '768x1024': 'Small tablet',
             '1024x768': 'Large tablet', '1366x768': 'Laptop', '1440x900': 'Desktop', '1920x1080': 'Wide desktop'}

    def agg(rows, vp):
        rs = [r for r in rows if r['vp'] == vp and 'error' not in r]
        return {
            'pages': len(rs),
            'overflow': sum(1 for r in rs if r.get('overflow', 0) > 1),
            'worst': max([r.get('overflow', 0) for r in rs] or [0]),
            'small': sum(r.get('smallCount', 0) - sum(1 for s in r.get('small', []) if s.startswith('a.sr-only')) for r in rs),
            'contrast': sum(contrast_nodes(r) for r in rs),
            'axe_pages': sum(1 for r in rs if r.get('axe')),
            'axe_nodes': sum(a['n'] for r in rs for a in r.get('axe', [])),
        }

    print('| Viewport | Category | Pages | Pages scrolling sideways (before -> after) | Worst overflow px (b -> a) | Targets <24px (b -> a) | Contrast nodes (b -> a) | All axe nodes (b -> a) |')
    print('|---|---|---:|---|---|---|---|---|')
    for vp in order:
        b, a = agg(before, vp), agg(after, vp)
        if not a['pages']:
            continue
        print(f"| {vp} | {names[vp]} | {a['pages']} | {b['overflow']} -> {a['overflow']} | {b['worst']} -> {a['worst']} | {b['small']} -> {a['small']} | {b['contrast']} -> {a['contrast']} | {b['axe_nodes']} -> {a['axe_nodes']} |")
    print()
    remaining = [(r['vp'], r['role'], r['route'], r['overflow']) for r in after if r.get('overflow', 0) > 1]
    print('Pages still scrolling sideways after the fixes:', remaining if remaining else 'none')
elif mode == 'tabs':
    after_by = {e['tab']: e for e in after}
    print('| Tab | Targets <24px | Inputs <16px | Unlabeled controls | axe rules before | axe rules after |')
    print('|---|---|---|---|---|---|')
    for e in before:
        x = after_by[e['tab']]
        bs = ', '.join(f"{r['id']}:{r['n']}" for r in e['axe']) or 'none'
        as_ = ', '.join(f"{r['id']}:{r['n']}" for r in x['axe']) or 'none'
        print(f"| {e['tab']} | {e['smallCount']} -> {x['smallCount']} | {e['zoomCount']} -> {x['zoomCount']} | {e['unlabeledCount']} -> {x['unlabeledCount']} | {bs} | {as_} |")
