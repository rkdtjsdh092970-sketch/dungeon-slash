# 로블록스판 그림(roblox/art)을 웹판용 크기로 줄여 webart/ 에 저장한다 (webp, 투명 유지).
# 웹판은 이 폴더를 GitHub 에서 직접 불러온다 (src/art.js). 그림을 바꾸면 이 스크립트를 다시 돌리고 webart/ 를 커밋.
import os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(D, '..', 'roblox', 'art'); O = os.path.join(D, '..', 'webart')
os.makedirs(O, exist_ok=True)
J = []   # (키, 원본, 최대 크기)
for f in sorted(os.listdir(os.path.join(R, 'mobs'))):
    k = os.path.splitext(f)[0]
    J.append((k if k.startswith('a') else 'c_' + k, 'mobs/' + f, 192))
for f in sorted(os.listdir(os.path.join(R, 'bosses'))):
    k = os.path.splitext(f)[0]
    J.append(('boss0' if k == 'groom' else k, 'bosses/' + f, 320))
for f in sorted(os.listdir(os.path.join(R, 'hero'))):
    J.append((os.path.splitext(f)[0], 'hero/' + f, 256))
J += [('bg1', 'bg/act1.jpg', 960), ('bg8', 'bg/act8.png', 960), ('bg_title', 'bg/title.jpg', 960), ('bg_town', 'bg/town.jpg', 960), ('bg_world', 'map/world.jpg', 1800),
      ('bg_raid', 'raid/raid_arena.jpg', 960), ('cardback', 'cards/back.png', 300), ('cardf0', 'cards/frame0.png', 300), ('cardf1', 'cards/frame1.png', 300), ('cardf2', 'cards/frame2.png', 300), ('cardf3', 'cards/frame3.png', 300), ('cardf4', 'cards/frame4.png', 300), ('cburst2', 'cards/burst2.png', 300), ('cburst3', 'cards/burst3.png', 300), ('cburst4', 'cards/burst4.png', 300), ('morgath', 'raid/morgath.png', 512), ('morgath_rage', 'raid/morgath_rage.png', 512), ('ward_crystal', 'raid/ward_crystal.png', 160)]
for f in sorted(os.listdir(os.path.join(R, 'cards', 'skill'))):   # 스킬(아르카나) 카드 그림
    J.append(('card_s_' + os.path.splitext(f)[0], 'cards/skill/' + f, 300))
for sub, pre, mx in (('icons', 'i_', 96), ('mapicon', 'mi_', 96), ('menu', 'm_', 96)):
    for f in sorted(os.listdir(os.path.join(R, sub))):
        if f.endswith('.png'): J.append((pre + os.path.splitext(f)[0], sub + '/' + f, mx))
import sys
only = sys.argv[1] if len(sys.argv) > 1 else None   # 예: py make_webart.py card_  → 이름이 card_ 로 시작하는 것만
if only: J = [j for j in J if j[0].startswith(only)]
total = 0
for k, src, mx in J:
    im = Image.open(os.path.join(R, src)); bg = k.startswith('bg') or k.startswith('card_s_')
    im = im.convert('RGB' if bg else 'RGBA')
    if not bg and not k.startswith('card_'):   # 투명 여백 잘라내기 (발밑 기준 정렬이 정확해진다)
        bb = im.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox()
        if bb: im = im.crop(bb)
    im.thumbnail((mx, mx) if not bg else (mx, mx * 9 // 16 + 200), Image.LANCZOS)
    p = os.path.join(O, k + '.webp'); im.save(p, 'WEBP', quality=82 if bg else 88, method=4)
    total += os.path.getsize(p)
print(len(J), 'files', total // 1024, 'KB')
