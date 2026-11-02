# 전투 이펙트 그림 (흰색 바탕 + 부드러운 알파: 게임에서 ImageColor3 로 색을 입힌다) → art/fx/*.png
# 실행: py roblox/gen_fx.py  →  그 다음 py roblox/gen_art.py
import os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'art', 'fx')
random.seed(7)

def glowify(mask, blur, core=1.0, halo=0.8):
    """흰 모양(L) → 가운데는 진하고 바깥은 번지는 RGBA"""
    g = mask.filter(ImageFilter.GaussianBlur(blur))
    a = ImageChops.add(mask.point(lambda v: int(v * core)), g.point(lambda v: int(v * halo)))
    im = Image.new('RGBA', mask.size, (255, 255, 255, 0)); im.putalpha(a); return im

def save(im, name): im.save(os.path.join(OUT, name + '.png')); print(name, im.size)

# 1) 베기 궤적: 초승달 (가운데 두껍고 끝으로 갈수록 가늘다)
S = 4; W, H = 256, 128
m = Image.new('L', (W * S, H * S), 0); d = ImageDraw.Draw(m)
d.ellipse([(-40) * S, 18 * S, (W + 40) * S, (H * 2 + 40) * S], fill=255)
d.ellipse([(-40) * S, 44 * S, (W + 40) * S, (H * 2 + 70) * S], fill=0)
m = m.resize((W, H), Image.LANCZOS)
taper = Image.new('L', (W, H)); tp = taper.load()
for x in range(W):
    v = math.sin(math.pi * x / (W - 1)) ** 0.8
    for y in range(H): tp[x, y] = int(255 * v)
m = ImageChops.multiply(m, taper)
save(glowify(m, 6, 1.0, 0.9), 'slash')

# 2) 충격파 고리
W = 128; m = Image.new('L', (W * S, W * S), 0); d = ImageDraw.Draw(m)
d.ellipse([8 * S, 8 * S, (W - 8) * S, (W - 8) * S], outline=255, width=6 * S)
save(glowify(m.resize((W, W), Image.LANCZOS), 4, 1.0, 0.9), 'ring')

# 3) 폭발 8프레임 (가운데 섬광 → 불꽃 덩어리가 퍼지며 사그라든다)
F, W = 8, 128; sheet = Image.new('RGBA', (W * F, W), (255, 255, 255, 0))
blobs = [(random.uniform(0, 6.28), random.uniform(0.5, 1.0), random.uniform(0.18, 0.32)) for _ in range(14)]
for f in range(F):
    k = f / (F - 1); m = Image.new('L', (W, W), 0); d = ImageDraw.Draw(m)
    R = W * (0.16 + 0.30 * (1 - (1 - k) ** 2)); a = int(255 * (1 - k) ** 1.2)
    for i in range(12, 0, -1):   # 가운데가 가장 밝은 둥근 빛 (안쪽으로 갈수록 진하게 겹친다)
        rr = R * 0.8 * i / 12; d.ellipse([W / 2 - rr, W / 2 - rr, W / 2 + rr, W / 2 + rr], fill=int(a * (1 - i / 13) ** 0.6))
    for ang, dist, rr in blobs:   # 바깥으로 튀는 불꽃 덩어리
        cx, cy = W / 2 + math.cos(ang) * R * dist, W / 2 + math.sin(ang) * R * dist; r = W * rr * (1 - k * 0.6) * 0.5
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=int(a * 0.8))
    if f < 3:   # 섬광 줄기
        for i in range(8):
            ang = i * math.pi / 4 + 0.2; L = R * (1.6 - f * 0.3)
            d.line([W / 2, W / 2, W / 2 + math.cos(ang) * L, W / 2 + math.sin(ang) * L], fill=int(255 * (1 - f / 3)), width=3)
    sheet.paste(glowify(m, 5, 1.0, 0.9), (f * W, 0))
save(sheet, 'burst')

# 4) 번개 4프레임 (세로, 위 → 아래 들쭉날쭉)
F, W, H = 4, 96, 256; sheet = Image.new('RGBA', (W * F, H), (255, 255, 255, 0))
def bolt(d, x0, y0, x1, y1, w, depth):
    pts = [(x0, y0), (x1, y1)]
    for _ in range(depth):
        np = [pts[0]]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            mx, my = (ax + bx) / 2 + random.uniform(-1, 1) * abs(by - ay) * 0.22, (ay + by) / 2; mx = min(max(mx, W * S * 0.15), W * S * 0.85); np += [(mx, my), (bx, by)]
        pts = np
    d.line(pts, fill=255, width=w); return pts
for f in range(F):
    m = Image.new('L', (W * S, H * S), 0); d = ImageDraw.Draw(m)
    pts = bolt(d, W / 2 * S, 0, W / 2 * S, H * S, 3 * S, 6)
    for _ in range(2):   # 가지
        i = random.randint(len(pts) // 4, len(pts) * 3 // 4); bx, by = pts[i]
        bolt(d, bx, by, min(max(bx + random.uniform(-1, 1) * W * 0.3 * S, W * S * 0.15), W * S * 0.85), by + H * 0.25 * S, 2 * S, 4)
    sheet.paste(glowify(m.resize((W, H), Image.LANCZOS), 4, 1.0, 1.0), (f * W, 0))
save(sheet, 'bolt')

# 5) 불꽃 튐 (네 갈래 별)
W = 32; m = Image.new('L', (W * S, W * S), 0); d = ImageDraw.Draw(m); c = W * S / 2
d.polygon([(c, 0), (c + 3 * S, c - 3 * S), (W * S, c), (c + 3 * S, c + 3 * S), (c, W * S), (c - 3 * S, c + 3 * S), (0, c), (c - 3 * S, c - 3 * S)], fill=255)
save(glowify(m.resize((W, W), Image.LANCZOS), 2, 1.0, 0.8), 'spark')

# 6) 얼음 파편 (세로로 긴 수정, 면마다 밝기 다르게)
W, H = 32, 64; im = Image.new('RGBA', (W, H), (255, 255, 255, 0)); d = ImageDraw.Draw(im)
d.polygon([(16, 0), (28, 22), (16, 63), (4, 22)], fill=(200, 235, 255, 230)); d.polygon([(16, 0), (28, 22), (16, 63)], fill=(255, 255, 255, 250))
d.line([(16, 0), (16, 63)], fill=(255, 255, 255, 255), width=1)
save(im, 'shard')

# 7) 마법진 (겹친 원 · 육망성 · 룬 눈금)
W = 256; m = Image.new('L', (W * S, W * S), 0); d = ImageDraw.Draw(m); c = W * S / 2
for r, w in ((0.47, 3), (0.42, 2), (0.27, 2)):
    R = W * S * r; d.ellipse([c - R, c - R, c + R, c + R], outline=255, width=w * S)
R = W * S * 0.40
for tri in (0, 1):
    pts = [(c + math.cos(math.pi / 2 + tri * math.pi / 3 + i * 2 * math.pi / 3) * R, c + math.sin(math.pi / 2 + tri * math.pi / 3 + i * 2 * math.pi / 3) * R) for i in range(3)]
    d.polygon(pts, outline=255, width=2 * S)
for i in range(36):   # 룬 눈금
    a = i * 2 * math.pi / 36; r0, r1 = W * S * 0.425, W * S * (0.465 if i % 3 == 0 else 0.448)
    d.line([c + math.cos(a) * r0, c + math.sin(a) * r0, c + math.cos(a) * r1, c + math.sin(a) * r1], fill=255, width=2 * S)
save(glowify(m.resize((W, W), Image.LANCZOS), 3, 1.0, 0.7), 'circle')

# 8) 광선 (가로: 가운데 진하고 양 끝 흐려짐)
W, H = 256, 32; m = Image.new('L', (W, H)); p = m.load()
for x in range(W):
    ex = min(1, x / 24, (W - 1 - x) / 40)
    for y in range(H): p[x, y] = int(255 * ex * math.exp(-((y - H / 2) / (H * 0.18)) ** 2))
save(glowify(m, 3, 1.0, 0.6), 'beam')

# 9) 할퀴기 (세 줄 사선)
W = 128; m = Image.new('L', (W * S, W * S), 0); d = ImageDraw.Draw(m)
for i in range(3):
    o = (i - 1) * 18 * S
    for t in range(40):
        k = t / 39; w = int((1 + 7 * math.sin(math.pi * k)) * S)
        x, y = (28 + 72 * k) * S + o, (104 - 80 * k) * S
        d.ellipse([x - w, y - w, x + w, y + w], fill=255)
save(glowify(m.resize((W, W), Image.LANCZOS), 3, 1.0, 0.8), 'claw')
