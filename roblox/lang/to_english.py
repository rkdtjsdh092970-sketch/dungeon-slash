# (한 번만 쓰는 변환기, 2026-11-03) 코드 속 한국어 문자열을 lang/en.tsv 의 영어로 바꾸고, 반대 방향 번역표 lang/ko.tsv (영어<TAB>한국어)를 만든다.
# 이후 원문은 영어, 한국어는 번역. 줄에 'lang ==' 가 있으면(이미 두 언어를 직접 고르는 줄) 건드리지 않는다.
import os, re, glob, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
HANGUL = re.compile('[\uac00-\ud7a3]')
def unesc(s): return s.replace('\\n', '\n').replace('\\\\', '\\')
def esc(s): return s.replace('\\', '\\\\').replace('\n', '\\n')
tr = {}
for line in open(os.path.join(HERE, 'en.tsv'), encoding='utf-8'):
    line = line.rstrip('\n')
    if '\t' in line: k, e = line.split('\t', 1); tr[unesc(k)] = unesc(e)
KEEP = {'🌐 EN  |  한국어', '🌐 한국어  |  EN', '한국어'}

def literals(src):   # (시작, 끝, 따옴표, 내용) — 주석 제외
    i, n, out = 0, len(src), []
    while i < n:
        if src.startswith('--', i):
            m = re.match(r'--\[(=*)\[', src[i:])
            if m: j = src.find(']' + m.group(1) + ']', i); i = n if j < 0 else j + len(m.group(1)) + 2
            else: j = src.find('\n', i); i = n if j < 0 else j
            continue
        c = src[i]
        if c in '"\'':
            j, buf, odd = i + 1, [], False
            while j < n and src[j] != c:
                if src[j] == '\\' and j + 1 < n:
                    e = src[j + 1]
                    if e in 'nt\\"\'': buf.append({'n': '\n', 't': '\t', '\\': '\\', '"': '"', "'": "'"}[e])
                    else: buf.append('\\' + e); odd = True
                    j += 2
                else: buf.append(src[j]); j += 1
            out.append((i, j + 1, c, ''.join(buf), odd)); i = j + 1; continue
        m = re.match(r'\[(=*)\[', src[i:])
        if m:
            j = src.find(']' + m.group(1) + ']', i); out.append((i, j + len(m.group(1)) + 2, 'long', src[i + len(m.group(0)): j], False)); i = j + len(m.group(1)) + 2; continue
        i += 1
    return out

def lua_lit(s, q):
    if q == 'long': q = '"'
    return q + s.replace('\\', '\\\\').replace(q, '\\' + q).replace('\n', '\\n').replace('\t', '\\t') + q

if __name__ == '__main__':   # 이미 실행함 — 다시 돌리면 ko.tsv 를 덮어쓰므로 주의
    pairs = collections.defaultdict(collections.Counter)   # 영어 → {한국어: 횟수}
    missing, skipped, changed = [], 0, 0
    files = sorted(glob.glob(os.path.join(ROOT, 'game', '*.lua')) + glob.glob(os.path.join(ROOT, 'data', '*.lua')))
    for f in files:
        if os.path.basename(f) in ('Passives.lua', 'LangEn.lua', 'LangKo.lua', 'SpriteMap.lua', 'ArtMap.lua'): continue
        src = open(f, encoding='utf-8').read(); out, pos = [], 0
        for a, b, q, s, odd in literals(src):
            if not HANGUL.search(s) or s in KEEP: continue
            ls = src.rfind('\n', 0, a) + 1; le = src.find('\n', b); line = src[ls: le if le >= 0 else len(src)]
            if 'lang ==' in line or 'lang~=' in line or 'lang ~=' in line: skipped += 1; continue
            if odd: missing.append((os.path.basename(f), 'ODD ESCAPE ' + s[:40])); continue
            e = tr.get(s)
            if e is None: missing.append((os.path.basename(f), s[:60])); continue
            pairs[e][s] += 1
            out.append(src[pos:a]); out.append(lua_lit(e, q)); pos = b; changed += 1
        out.append(src[pos:])
        new = ''.join(out)
        if new != src: open(f, 'w', encoding='utf-8', newline='').write(new)
    with open(os.path.join(HERE, 'ko.tsv'), 'w', encoding='utf-8', newline='\n') as w:
        for e in sorted(pairs):
            ko = pairs[e].most_common(1)[0][0]
            w.write(esc(e) + '\t' + esc(ko) + '\n')
    print('바꿈', changed, '· 건너뜀(lang==)', skipped, '· 번역표', len(pairs))
    for m in missing[:40]: print('못 바꿈:', m)
    print('못 바꿈 합계', len(missing))
