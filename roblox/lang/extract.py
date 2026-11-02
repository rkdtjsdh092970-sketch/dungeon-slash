# 화면에 보일 수 있는 한국어 문자열(코드 안 따옴표 문자열)을 모두 뽑아 lang/ko_strings.txt 에 한 줄씩 쓴다.
# 주석(--)은 제외. 번역은 lang/en.tsv (한국어<TAB>영어) 에 채우고 build_lang.py 로 data/LangEn.lua 를 만든다.
# 실행: python roblox/lang/extract.py
import os, re, glob
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
HANGUL = re.compile('[가-힣]')

def strings(src):   # Lua 문자열 리터럴만 (주석 제외)
    i, n, out = 0, len(src), []
    while i < n:
        c = src[i]
        if src.startswith('--', i):
            m = re.match(r'--\[(=*)\[', src[i:])
            if m: j = src.find(']' + m.group(1) + ']', i); i = n if j < 0 else j + len(m.group(1)) + 2
            else: j = src.find('\n', i); i = n if j < 0 else j
            continue
        if c in '"\'':
            j, buf = i + 1, []
            while j < n and src[j] != c:
                if src[j] == '\\' and j + 1 < n:
                    e = src[j + 1]; buf.append({'n': '\n', 't': '\t', '\\': '\\', '"': '"', "'": "'"}.get(e, '\\' + e)); j += 2
                else: buf.append(src[j]); j += 1
            out.append(''.join(buf)); i = j + 1; continue
        m = re.match(r'\[(=*)\[', src[i:])
        if m:
            j = src.find(']' + m.group(1) + ']', i); out.append(src[i + len(m.group(0)): j]); i = j + len(m.group(1)) + 2; continue
        i += 1
    return out

found = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'game', '*.lua')) + glob.glob(os.path.join(ROOT, 'data', '*.lua'))):
    if os.path.basename(f) in ('Passives.lua', 'LangEn.lua'): continue   # 패시브는 데이터에 영어(name_en · text_en)가 함께 있다
    if os.path.basename(f) in ('LangEn.lua', 'SpriteMap.lua', 'ArtMap.lua'): continue
    for s in strings(open(f, encoding='utf-8').read()):
        if HANGUL.search(s): found.setdefault(s, os.path.basename(f))
keys = sorted(found)
with open(os.path.join(HERE, 'ko_strings.txt'), 'w', encoding='utf-8', newline='\n') as w:
    for k in keys: w.write(k.replace('\\', '\\\\').replace('\n', '\\n') + '\n')
print(len(keys), 'strings')
