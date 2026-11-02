# 일러스트(roblox/art/*.png|jpg) → Roblox 개발용 raw RGBA(sprites/art_<키>.rgba) + 표(data/ArtMap.lua)
# 실행: python roblox/gen_art.py   (Pillow 필요). 파일이 없는 항목은 표에서 빠지고, 게임은 기존 도트로 대체 표시한다.
# 출시 땐 PNG 를 Roblox 에 업로드해 얻은 ID 를 ArtMap 의 id 에 적는다 (아래 IDS).
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
# 키: 영웅 "warrior" / 몬스터는 SpriteMap 시트 키(색조 0 일 때만 대체) / 보스 "boss<번호>" / 배경 "bg<지역>"
ART = [
    ('warrior', 'hero/warrior.png', (256, 256)),
    # 영웅 동작 그림 (전투에서 자세마다 바꿔 끼운다: Stage.setPose)
    *[(f'{h}_{p}', f'hero/{h}_{p}.png', (256, 256)) for h, ps in (('warrior', ('windup', 'slash', 'overhead')), ('mage', ('raise', 'cast'))) for p in ps],
    ('c_imp', 'mobs/imp.png', (256, 256)),
    ('c_goblin', 'mobs/goblin.png', (256, 256)),
    ('c_archer', 'mobs/archer.png', (256, 256)),
    ('c_shaman', 'mobs/shaman.png', (256, 256)),
    ('c_brute', 'mobs/brute.png', (256, 256)),
    ('boss0', 'bosses/groom.png', (256, 256)),
    *[(os.path.splitext(f)[0], 'mobs/' + f, (256, 256)) for f in sorted(os.listdir(os.path.join(HERE, 'art', 'mobs'))) if f.startswith('a') and '_' in f],   # 지역별 몬스터 a<지역>_<역할>
    *[(os.path.splitext(f)[0], 'bosses/' + f, (256, 256)) for f in sorted(os.listdir(os.path.join(HERE, 'art', 'bosses'))) if f.startswith('boss')],   # 보스 boss<번호>(_atk)
    ('bg1', 'bg/act1.jpg', (768, 320)),
    ('bg_raid', 'raid/raid_arena.jpg', (800, 450)), ('morgath', 'raid/morgath.png', (384, 384)), ('morgath_rage', 'raid/morgath_rage.png', (384, 384)), ('ward_crystal', 'raid/ward_crystal.png', (96, 192)),   # 모르가스 전용 전투 (Codex)
    ('bg8', 'bg/act8.png', (768, 320)),
    # 마을 · 월드맵 (개발용 전달 크기 ~1MB 이내로 줄임. 출시 땐 원본을 업로드해 id 사용)
    ('bg_town', 'bg/town.jpg', (800, 450)),   # 건물이 함께 그려진 마을 (2026-11-02, 건물 그림 따로 안 씀)
    ('bg_title', 'bg/title.jpg', (800, 450)), ('ui_logo', 'ui/logo.png', (512, 192)),   # 시작화면
    ('bg_world', 'map/world.jpg', (640, 392)),
    # 아이콘 (장비 슬롯 · 재화 · 배속 패스)
    # 스킬 소환 카드: 뒷면 · 등급별 타로 테두리(0 일반 ~ 4 사탄) · 공개 빛 폭발(2 전설 ~ 4 사탄)
    ('card_back', 'cards/back.png', (256, 384)),
    *[(f'card_f{r}', f'cards/frame{r}.png', (256, 384)) for r in range(5)],
    *[(f'card_burst{r}', f'cards/burst{r}.png', (384, 384)) for r in (2, 3, 4)],
    # UI 키트 (9-slice 로 늘려 씀, game/Skin.lua)
    ('ui_panel', 'ui/panel.png', (384, 384)), ('tut_corner', 'ui/tut_corner.png', (128, 128)), ('tut_arrow', 'ui/tut_arrow.png', (128, 128)), ('ui_title', 'ui/title.png', (384, 96)), ('ui_card', 'ui/card.png', (384, 96)),
    *[(f'ui_btn_{c}', f'ui/btn_{c}.png', (288, 96)) for c in ('gold', 'red', 'blue', 'gray', 'purple', 'green')],
    ('ui_tab', 'ui/tab.png', (128, 48)), ('ui_tab_on', 'ui/tab_on.png', (128, 48)), ('ui_close', 'ui/close.png', (64, 64)),
    ('ui_slot', 'ui/slot.png', (128, 128)), ('ui_pill', 'ui/pill.png', (192, 48)),
    ('ui_header', 'ui/header.png', (768, 69)), ('ui_divider', 'ui/divider.png', (768, 36)),   # 창 머리 띠 · 구분선
    ('summon_altar', 'summon/altar.png', (384, 480)), ('summon_deck', 'summon/deck.png', (384, 288)),   # 아르카나 소환 제단 · 덱
    ('hud_bar', 'hud/bar_frame.png', (512, 64)), ('hud_portrait', 'hud/portrait_frame.png', (192, 192)), ('hud_boss', 'hud/boss_frame.png', (768, 72)), ('hud_plate', 'hud/hud_plate.png', (384, 120)),   # 전투 HUD 틀
    # 메뉴 아이콘 (오른쪽 위 줄 · 오른쪽 아래 지도/마을 버튼)
    *[('m_' + k, f'menu/{k}.png', (128, 128)) for k in ('bag', 'skill', 'passive', 'stats', 'shop', 'quest', 'mail', 'gacha', 'settings', 'map', 'town')],
    # 배경 생동감 (game/Ambient.lua): 불꽃 8프레임 · 빛무리 · 구름 3 · 까마귀 4프레임
    ('fx_fire', 'fx/fire.png', (512, 96)), ('fx_glow', 'fx/glow.png', (64, 64)), ('fx_crow', 'fx/crow.png', (256, 48)),
    # 전투 이펙트 (gen_fx.py 로 그림: 흰 바탕 + 알파, 게임에서 색을 입힌다)
    ('fx_slash', 'fx/slash.png', (256, 128)), ('fx_ring', 'fx/ring.png', (128, 128)), ('fx_burst', 'fx/burst.png', (1024, 128)), ('fx_bolt', 'fx/bolt.png', (384, 256)),
    ('fx_spark', 'fx/spark.png', (32, 32)), ('fx_shard', 'fx/shard.png', (32, 64)), ('fx_circle', 'fx/circle.png', (256, 256)), ('fx_beam', 'fx/beam.png', (256, 32)), ('fx_claw', 'fx/claw.png', (128, 128)),
    *[(f'fx_cloud{i}', f'fx/cloud{i}.png', (512, 160)) for i in (1, 2, 3)],
    *[(f'fx_mc_{k}', f'fx/mc_{k}.png', (256, 256)) for k in ('main', 'runes', 'inner', 'sigil')],
    ('fx_phoenix', 'fx/phoenix.png', (384, 192)), ('fx_spear', 'fx/spear.png', (96, 384)), ('fx_voideye', 'fx/voideye.png', (384, 192)), ('fx_sun', 'fx/sun.png', (192, 192)),
    ('fx_rockspike', 'fx/rockspike.png', (96, 192)), ('fx_icespike', 'fx/icespike.png', (96, 192)), ('fx_xslash', 'fx/xslash.png', (192, 192)), ('fx_vslash', 'fx/vslash.png', (96, 384)),
    ('fx_windblade', 'fx/windblade.png', (192, 96)), ('fx_hydra', 'fx/hydra.png', (192, 192)), ('fx_comet', 'fx/comet.png', (192, 192)), ('fx_moon', 'fx/moon.png', (192, 192)),   # 아르카나 전용 연출 (Codex)   # 마법진 (Codex, 흰빛으로 바꿔 색을 입힘)
    # 지도 아이콘 · 패시브 아이콘 · 무기 종류 · 마법사
    *[('mi_' + os.path.splitext(f)[0], 'mapicon/' + f, (96, 96)) for f in sorted(os.listdir(os.path.join(HERE, 'art', 'mapicon')))],
    *[('p_' + os.path.splitext(f)[0], 'passive/' + f, (96, 96)) for f in sorted(os.listdir(os.path.join(HERE, 'art', 'passive')))],
    *[('card_s_' + os.path.splitext(f)[0], 'cards/skill/' + f, (160, 240)) for f in sorted(os.listdir(os.path.join(HERE, 'art', 'cards', 'skill')))],   # 스킬 타로 카드 그림
    ('i_staff', 'icons/staff.png', (96, 96)), ('mage', 'hero/mage.png', (256, 256)),
    *[('i_' + k, f'icons/{k}.png', (96, 96)) for k in ('weapon', 'helm', 'armor', 'gloves', 'boots', 'ring', 'neck', 'gold', 'ore', 'hone', 'chaos', 'divine', 'stone', 'speed', 'arcana', 'gem', 'shard')],
]
# 배경 불 패치 (fire_anim.py 가 만든 art/fx/<배경>_fires.json): 8프레임 시트, 배경 해상도 그대로
import json, glob
PATCHES = {}
for jf in sorted(glob.glob(os.path.join(HERE, 'art', 'fx', '*_fires.json'))):
    bgk = os.path.basename(jf)[:-len('_fires.json')]; PATCHES[bgk] = json.load(open(jf))
    for e in PATCHES[bgk]: ART.append((e['key'], 'fx/' + e['key'][3:] + '.png', (e['pw'] * 8, e['ph'])))
import json
# 업로드한 에셋 ID (art/asset_ids.json, 키 → rbxassetid). 있으면 게임이 HTTP 대신 그 에셋을 쓴다 (2026-11-03)
IDS = json.load(open(os.path.join(HERE, 'art', 'asset_ids.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'art', 'asset_ids.json')) else {}
os.makedirs(os.path.join(HERE, '_upload'), exist_ok=True)   # 업로드용 PNG (게임에 쓰는 크기 그대로, 커밋 안 함)
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
    im.save(os.path.join(HERE, '_upload', key + '.png'))
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
