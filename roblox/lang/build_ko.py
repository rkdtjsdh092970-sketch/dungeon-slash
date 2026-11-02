# 원문은 영어 (2026-11-03부터). lang/ko.tsv (영어<TAB>한국어, 줄바꿈은 \n) → data/LangKo.lua 생성 + 검사.
# 검사: 빈 번역 / % 표시(%d %s %.0f %% 등)의 종류 · 순서가 같음 / 코드에 있는 영어 문장 중 ko.tsv 에 없는 것(경고, lang/ko_missing.txt).
# 실행: py roblox/lang/build_ko.py   (오류가 있으면 종료 코드 1)
import os, re, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SPEC = re.compile(r'%[-+ #0]*\d*(?:\.\d+)?[a-zA-Z%]')
def unesc(s): return s.replace('\\n', '\n').replace('\\\\', '\\')
tr, errs = {}, []
for i, line in enumerate(open(os.path.join(HERE, 'ko.tsv'), encoding='utf-8'), 1):
    line = line.rstrip('\n')
    if not line.strip(): continue
    if '\t' not in line: errs.append(f'ko.tsv:{i}: 탭 없음'); continue
    en, ko = line.split('\t', 1); en, ko = unesc(en), unesc(ko)
    if not ko.strip(): errs.append('빈 번역: ' + repr(en))
    if SPEC.findall(en) != SPEC.findall(ko): errs.append('% 표시 다름: ' + repr(en) + ' → ' + repr(ko))
    tr[en] = ko
if errs:
    print('\n'.join(errs[:60])); print(f'오류 {len(errs)}개'); sys.exit(1)

# 경고: 코드 속 영어 문장(띄어쓰기가 있거나 대문자로 시작하는 2글자 이상)인데 번역표에 없는 것
sys.path.insert(0, HERE)
from to_english import literals   # 같은 문자열 찾기 규칙
miss = set()
for f in sorted(glob.glob(os.path.join(ROOT, 'game', '*.lua')) + glob.glob(os.path.join(ROOT, 'data', '*.lua'))):
    if os.path.basename(f) in ('Passives.lua', 'LangEn.lua', 'LangKo.lua', 'SpriteMap.lua', 'ArtMap.lua', 'Config.lua'): continue
    for a, b, q, s, odd in literals(open(f, encoding='utf-8').read()):
        if s in tr or not re.search('[A-Za-z]{2}', s) or re.fullmatch(r'[a-z_0-9:%.]+', s) or re.fullmatch(r'[A-Za-z]+[A-Z][A-Za-z]*', s): continue
        if ' ' in s or re.match('[A-Z][a-z]', s): miss.add(s)
open(os.path.join(HERE, 'ko_missing.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(sorted(miss)) + '\n')

def lua(s): return '"' + s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'
def pat(en):
    out, pos = '^', 0
    for m in SPEC.finditer(en):
        out += re.sub(r'([\^\$\(\)\%\.\[\]\*\+\-\?])', r'%\1', en[pos:m.start()])
        out += '%%' if m.group(0) == '%%' else '(.-)'
        pos = m.end()
    return out + re.sub(r'([\^\$\(\)\%\.\[\]\*\+\-\?])', r'%\1', en[pos:]) + '$'
def repl(ko):
    n = [0]
    def f(m):
        if m.group(0) == '%%': return '%%'
        n[0] += 1; return '%' + str(n[0])
    return SPEC.sub(f, ko)
exact, fmt = [], []
for en, ko in sorted(tr.items()):
    if [s for s in SPEC.findall(en) if s != '%%']: fmt.append((en, pat(en), repl(ko)))
    else: exact.append((en, ko))
fmt.sort(key=lambda x: -len(x[0]))
L = ['-- 자동 생성 (roblox/lang/build_ko.py). 영어 → 한국어 번역표. 직접 고치지 말고 lang/ko.tsv 를 고친다.', 'local M = {}', 'M.exact = {']
L += [f'  [{lua(k)}] = {lua(e)},' for k, e in exact]
L += ['}', '-- string.format 틀: { 패턴, 한국어(%1..%n = 캡처) }', 'M.fmt = {']
L += [f'  {{ {lua(p)}, {lua(r)} }},' for _, p, r in fmt]
L += ['}', 'return M']
open(os.path.join(ROOT, 'data', 'LangKo.lua'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')
print(f'ok: 문장 {len(exact)} · 틀 {len(fmt)} · 번역표에 없는 영어 문장 {len(miss)}개 (lang/ko_missing.txt 확인)')
