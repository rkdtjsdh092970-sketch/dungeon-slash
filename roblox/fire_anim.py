# 배경에 그려진 불을 그대로 일렁이게: 배경(게임에 쓰는 해상도)에서 불 주변을 잘라 8프레임으로 변형한다 → art/fx/<이름>_fire<i>.png + 위치표
# 불꽃 픽셀(밝은 주황·노랑)만 위로 일렁이고 밝기가 출렁인다. 나머지 픽셀은 그대로라 배경과 이어진다. 실행: py roblox/fire_anim.py
import os, math, json
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
# 배경 키, 원본, 게임 해상도, 불 자리(그림 기준 비율 x, y = 불꽃 가운데 근처)
JOBS = [('bg_town', 'bg/town.jpg', (640, 360), [(0.1875, 0.415), (0.348, 0.415), (0.433, 0.398), (0.757, 0.448), (0.103, 0.412)])]
FR = 8

def flameness(p):
    r, g, b = p[:3]
    if r < 150 or r - b < 70: return 0.0
    return min(1.0, (r - 150) / 80) * min(1.0, (r - b - 70) / 80 + 0.3)

for key, src, size, spots in JOBS:
    im = Image.open(os.path.join(HERE, 'art', src)).convert('RGB').resize(size, Image.LANCZOS)
    W, H = im.size; px = im.load(); out = []
    for n, (fx, fy) in enumerate(spots):
        cx, cy = int(fx * W), int(fy * H)
        # 불꽃 픽셀의 범위를 찾는다 (주변 18px 안)
        xs, ys = [], []
        for y in range(max(0, cy - 18), min(H, cy + 18)):
            for x in range(max(0, cx - 14), min(W, cx + 14)):
                if flameness(px[x, y]) > 0.25: xs.append(x); ys.append(y)
        if not xs: print('불 없음', key, n); continue
        x0, x1 = max(0, min(xs) - 4), min(W, max(xs) + 5); y0, y1 = max(0, min(ys) - 8), min(H, max(ys) + 3)
        w, h = x1 - x0, y1 - y0
        base = im.crop((x0, y0, x1, y1)); bp = base.load()
        sheet = Image.new('RGBA', (w * FR, h))
        for f in range(FR):
            t = f / FR * 2 * math.pi
            fr = Image.new('RGBA', (w, h)); fp = fr.load()
            for y in range(h):
                for x in range(w):
                    k = flameness(bp[x, y])
                    if k <= 0: fp[x, y] = bp[x, y] + (0,); continue   # 불이 아니면 투명 (배경 그대로 보임)
                    up = 1 - y / h   # 위쪽일수록 많이 흔들림
                    sx = x + round(math.sin(t + y * 0.55) * 1.6 * up)
                    sy = y + round((math.sin(t * 2 + x * 0.7) * 0.5 + 0.5) * 1.5 * up)
                    sx = min(w - 1, max(0, sx)); sy = min(h - 1, max(0, sy))
                    r, g, b = bp[sx, sy]
                    m = 0.88 + 0.22 * (0.5 + 0.5 * math.sin(t + n + y * 0.2))
                    fp[x, y] = (min(255, int(r * m)), min(255, int(g * m)), min(255, int(b * m * 0.95)), int(255 * min(1, k * 1.4)))
            sheet.paste(fr, (f * w, 0))
        name = f'{key}_fire{n}'
        sheet.save(os.path.join(HERE, 'art', 'fx', name + '.png'))
        out.append({ 'key': 'fx_' + name, 'x': x0 / W, 'y': y0 / H, 'w': w / W, 'h': h / H, 'pw': w, 'ph': h })
        print(name, (x0, y0, w, h))
    json.dump(out, open(os.path.join(HERE, 'art', 'fx', key + '_fires.json'), 'w'), indent=1)
