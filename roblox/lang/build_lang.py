# lang/en.tsv (한국어<TAB>영어, 줄바꿈은 \n) → data/LangEn.lua 생성 + 검사.
# 검사: ko_strings.txt 의 모든 문자열이 번역됨 / 영어에 한글 없음 / % 표시(%d %s %.0f %% 등)의 종류·순서가 같음.
# 실행: python roblox/lang/build_lang.py   (실패하면 종료 코드 1)
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
HANGUL = re.compile('[\uac00-\ud7a3]')
SPEC = re.compile(r'%[-+ #0]*\d*(?:\.\d+)?[a-zA-Z%]')   # Lua string.format 표시

def unesc(s): return s.replace('\\n', '\n').replace('\\\\', '\\')
KEEP = {'🌐 EN  |  한국어', '🌐 한국어  |  EN', '한국어'}   # 언어 버튼: 번역하지 않음 (영어 칸에 원문 그대로)
keys = [unesc(l.rstrip('\n')) for l in open(os.path.join(HERE, 'ko_strings.txt'), encoding='utf-8') if l.strip()]
tr, errs = {}, []
for i, line in enumerate(open(os.path.join(HERE, 'en.tsv'), encoding='utf-8'), 1):
    line = line.rstrip('\n')
    if not line.strip(): continue
    if '\t' not in line: errs.append(f'en.tsv:{i}: 탭 없음'); continue
    ko, en = line.split('\t', 1); tr[unesc(ko)] = unesc(en)
for k in keys:
    if k not in tr: errs.append('번역 없음: ' + repr(k)); continue
    e = tr[k]
    if not e.strip(): errs.append('빈 번역: ' + repr(k))
    if HANGUL.search(e) and k not in KEEP: errs.append('영어에 한글: ' + repr(k) + ' → ' + repr(e))
    if SPEC.findall(k) != SPEC.findall(e): errs.append('% 표시 다름: ' + repr(k) + ' → ' + repr(e))
if errs:
    print('\n'.join(errs[:60])); print(f'오류 {len(errs)}개'); sys.exit(1)

def lua(s): return '"' + s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'
def pat(ko):   # string.format 틀 → 앵커된 Lua 패턴 (표시마다 캡처 하나)
    out, pos = '^', 0
    for m in SPEC.finditer(ko):
        out += re.sub(r'([\^\$\(\)\%\.\[\]\*\+\-\?])', r'%\1', ko[pos:m.start()])
        out += '%%' if m.group(0) == '%%' else '(.-)'
        pos = m.end()
    return out + re.sub(r'([\^\$\(\)\%\.\[\]\*\+\-\?])', r'%\1', ko[pos:]) + '$'
def repl(en):   # 영어 틀의 표시 → %1 %2 ... (%% 는 % 그대로)
    n = [0]
    def f(m):
        if m.group(0) == '%%': return '%%'
        n[0] += 1; return '%' + str(n[0])
    return SPEC.sub(f, en)

exact, fmt = [], []
for k in keys:
    specs = [s for s in SPEC.findall(k) if s != '%%']
    if specs: fmt.append((k, pat(k), repl(tr[k])))
    else: exact.append((k, tr[k]))
fmt.sort(key=lambda x: -len(x[0]))
frag = sorted([(k, e) for k, e in exact if len(HANGUL.findall(k)) >= 2 and '\n' not in k], key=lambda x: -len(x[0]))
L = ['-- 자동 생성 (roblox/lang/build_lang.py). 한국어 → 영어 번역표. 직접 고치지 말고 lang/en.tsv 를 고친다.', 'local M = {}', 'M.exact = {']
L += [f'  [{lua(k)}] = {lua(e)},' for k, e in exact]
L += ['}', '-- string.format 틀: { 패턴, 영어(%1..%n = 캡처) }', 'M.fmt = {']
L += [f'  {{ {lua(p)}, {lua(r)} }},' for _, p, r in fmt]
L += ['}', '-- 이어 붙인 문장용 조각 (긴 것부터)', 'M.frag = {']
L += [f'  {{ {lua(k)}, {lua(e)} }},' for k, e in frag]
L += ['}', 'return M']
open(os.path.join(ROOT, 'data', 'LangEn.lua'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')
print(f'ok: 문장 {len(exact)} · 틀 {len(fmt)} · 조각 {len(frag)}')
