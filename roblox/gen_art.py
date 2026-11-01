# 일러스트(roblox/art/*.png|jpg) → Roblox 개발용 raw RGBA(sprites/art_<키>.rgba) + 표(data/ArtMap.lua)
# 실행: python roblox/gen_art.py   (Pillow 필요). 파일이 없는 항목은 표에서 빠지고, 게임은 기존 도트로 대체 표시한다.
# 출시 땐 PNG 를 Roblox 에 업로드해 얻은 ID 를 ArtMap 의 id 에 적는다 (아래 IDS).
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
# 키: 영웅 "warrior" / 몬스터는 SpriteMap 시트 키(색조 0 일 때만 대체) / 보스 "boss<번호>" / 배경 "bg<지역>"
ART = [
    ('warrior', 'hero/warrior.png', (256, 256)),
    ('c_imp', 'mobs/imp.png', (256, 256)),
    ('c_goblin', 'mobs/goblin.png', (256, 256)),
    ('c_archer', 'mobs/archer.png', (256, 256)),
    ('c_shaman', 'mobs/shaman.png', (256, 256)),
    ('c_brute', 'mobs/brute.png', (256, 256)),
    ('boss0', 'bosses/groom.png', (256, 256)),
    ('bg1', 'bg/act1.jpg', (768, 320)),
]
IDS = {}   # 예: 'warrior': 'rbxassetid://123'
lines = ['-- 자동 생성 (roblox/gen_art.py). 일러스트 표: 파일은 roblox/sprites/<file> (RGBA 8bit, w × h).',
         '-- id 를 채우면 업로드한 에셋을 우선 사용한다.', 'local M = {}', 'M.ART = {']
for key, src, size in ART:
    path = os.path.join(HERE, 'art', src)
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert('RGBA')
    if key.startswith('bg'):   # 배경: 비율 유지하며 가운데를 잘라 맞춘다
        tw, th = size; s = max(tw / im.width, th / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        l, t = (im.width - tw) // 2, (im.height - th) // 2
        im = im.crop((l, t, l + tw, t + th))
    else:
        im = im.resize(size, Image.LANCZOS)
    f = f'art_{key}.rgba'
    open(os.path.join(HERE, 'sprites', f), 'wb').write(im.tobytes())
    idv = f'"{IDS[key]}"' if key in IDS else 'nil'
    bb = im.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()   # 발밑 = 가장 아래 불투명 줄 (그림마다 여백이 달라서)
    foot = round(bb[3] / im.height, 3) if bb and not key.startswith('bg') else 1
    lines.append(f'  {key} = {{ w = {im.width}, h = {im.height}, foot = {foot}, file = "{f}", id = {idv} }},')
    print(key, im.size)
lines += ['}', 'return M']
open(os.path.join(HERE, 'data', 'ArtMap.lua'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
