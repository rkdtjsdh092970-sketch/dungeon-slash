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
    ('bg8', 'bg/act8.png', (768, 320)),
    # 마을 · 월드맵 (개발용 전달 크기 ~1MB 이내로 줄임. 출시 땐 원본을 업로드해 id 사용)
    ('bg_town', 'bg/town.jpg', (640, 360)),
    ('bg_title', 'bg/title.jpg', (800, 450)), ('ui_logo', 'ui/logo.png', (512, 192)),   # 시작화면
    ('bg_world', 'map/world.jpg', (640, 392)),
    ('b_skill_hall', 'town/skill_hall.png', (192, 192)),
    ('b_forge', 'town/forge.png', (192, 192)),
    ('b_shop', 'town/shop.png', (192, 192)),
    ('b_quest_board', 'town/quest_board.png', (192, 192)),
    ('b_skill_shop', 'town/skill_shop.png', (192, 192)),
    ('b_guild', 'town/guild.png', (192, 192)),
    ('b_trainer', 'town/trainer.png', (192, 192)),
    ('b_notice', 'town/notice.png', (192, 192)),
    # 아이콘 (장비 슬롯 · 재화 · 배속 패스)
    # 스킬 소환 카드: 뒷면 · 등급별 타로 테두리(0 일반 ~ 4 사탄) · 공개 빛 폭발(2 전설 ~ 4 사탄)
    ('card_back', 'cards/back.png', (256, 384)),
    *[(f'card_f{r}', f'cards/frame{r}.png', (256, 384)) for r in range(5)],
    *[(f'card_burst{r}', f'cards/burst{r}.png', (384, 384)) for r in (2, 3, 4)],
    # UI 키트 (9-slice 로 늘려 씀, game/Skin.lua)
    ('ui_panel', 'ui/panel.png', (384, 384)), ('ui_title', 'ui/title.png', (384, 96)), ('ui_card', 'ui/card.png', (384, 96)),
    *[(f'ui_btn_{c}', f'ui/btn_{c}.png', (192, 64)) for c in ('gold', 'red', 'blue', 'gray')],
    ('ui_tab', 'ui/tab.png', (128, 48)), ('ui_tab_on', 'ui/tab_on.png', (128, 48)), ('ui_close', 'ui/close.png', (64, 64)),
    ('ui_slot', 'ui/slot.png', (128, 128)), ('ui_pill', 'ui/pill.png', (192, 48)),
    # 메뉴 아이콘 (오른쪽 위 줄 · 오른쪽 아래 지도/마을 버튼)
    *[('m_' + k, f'menu/{k}.png', (128, 128)) for k in ('bag', 'skill', 'passive', 'stats', 'shop', 'quest', 'mail', 'gacha', 'settings', 'map', 'town')],
    # 배경 생동감 (game/Ambient.lua): 불꽃 8프레임 · 빛무리 · 구름 3 · 까마귀 4프레임
    ('fx_fire', 'fx/fire.png', (512, 96)), ('fx_glow', 'fx/glow.png', (64, 64)), ('fx_crow', 'fx/crow.png', (256, 48)),
    *[(f'fx_cloud{i}', f'fx/cloud{i}.png', (512, 160)) for i in (1, 2, 3)],
    # 지도 아이콘 · 패시브 아이콘 · 무기 종류 · 마법사
    *[('mi_' + os.path.splitext(f)[0], 'mapicon/' + f, (96, 96)) for f in sorted(os.listdir(os.path.join(HERE, 'art', 'mapicon')))],
    *[('p_' + os.path.splitext(f)[0], 'passive/' + f, (96, 96)) for f in sorted(os.listdir(os.path.join(HERE, 'art', 'passive')))],
    *[('card_s_' + os.path.splitext(f)[0], 'cards/skill/' + f, (160, 240)) for f in sorted(os.listdir(os.path.join(HERE, 'art', 'cards', 'skill')))],   # 스킬 타로 카드 그림
    ('i_staff', 'icons/staff.png', (96, 96)), ('mage', 'hero/mage.png', (256, 256)),
    *[('i_' + k, f'icons/{k}.png', (96, 96)) for k in ('weapon', 'helm', 'armor', 'gloves', 'boots', 'ring', 'neck', 'gold', 'ore', 'hone', 'chaos', 'divine', 'stone', 'speed')],
]
# 배경 불 패치 (fire_anim.py 가 만든 art/fx/<배경>_fires.json): 8프레임 시트, 배경 해상도 그대로
import json, glob
PATCHES = {}
for jf in sorted(glob.glob(os.path.join(HERE, 'art', 'fx', '*_fires.json'))):
    bgk = os.path.basename(jf)[:-len('_fires.json')]; PATCHES[bgk] = json.load(open(jf))
    for e in PATCHES[bgk]: ART.append((e['key'], 'fx/' + e['key'][3:] + '.png', (e['pw'] * 8, e['ph'])))
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
lines += ['}', 'M.PATCHES = {']
for bgk, L in PATCHES.items():
    lines.append(f'  {bgk} = {{')
    for e in L: lines.append(f'    {{ key = "{e["key"]}", x = {e["x"]:.5f}, y = {e["y"]:.5f}, w = {e["w"]:.5f}, h = {e["h"]:.5f} }},')
    lines.append('  },')
lines += ['}', 'return M']
open(os.path.join(HERE, 'data', 'ArtMap.lua'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
