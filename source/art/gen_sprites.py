#!/usr/bin/env python3
"""전사 / 고블린 도트 스프라이트 생성기 (32x32, 파츠를 좌표로 그려 프레임별 포즈를 만든다)"""
import json, math, sys
from PIL import Image

W = H = 32
OUT = (26, 18, 36, 255)

# ---------- 기본 도구 ----------
def rect_pts(x0, y0, x1, y1):
    return {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}

def line_pts(x0, y0, x1, y1, th=1):
    pts = set()
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx - dy
    x, y = x0, y0
    while True:
        pts.add((x, y))
        if th >= 2:
            if dx >= dy: pts.add((x, y + 1))
            else: pts.add((x + 1, y))
        if x == x1 and y == y1: break
        e2 = 2 * err
        if e2 > -dy: err -= dy; x += sx
        if e2 < dx: err += dx; y += sy
    return pts

def ellipse_pts(cx, cy, rx, ry):
    pts = set()
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                pts.add((x, y))
    return pts

def shift(pts, dx, dy):
    return {(x + dx, y + dy) for x, y in pts}

class Canvas:
    def __init__(self):
        self.g = [[None] * W for _ in range(H)]
    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H: self.g[y][x] = c
    def paint(self, pts, base, light=None, dark=None):
        """파츠를 칠한다. 같은 파츠 안에서 위쪽 가장자리는 밝게, 아래쪽 가장자리는 어둡게 자동 음영."""
        S = set(pts)
        for (x, y) in S:
            c = base
            if light and (x, y - 1) not in S: c = light
            elif dark and (x, y + 1) not in S: c = dark
            self.put(x, y, c)
    def dots(self, lst, c):
        for x, y in lst: self.put(x, y, c)
    def outline(self):
        filled = {(x, y) for y in range(H) for x in range(W) if self.g[y][x] is not None}
        ol = set()
        for (x, y) in filled:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in filled and 0 <= n[0] < W and 0 <= n[1] < H: ol.add(n)
        for x, y in ol: self.g[y][x] = OUT
    def image(self):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for y in range(H):
            for x in range(W):
                c = self.g[y][x]
                if c is not None: im.putpixel((x, y), c + (255,) if len(c) == 3 else c)
        return im

def C(r, g, b): return (r, g, b)

# ---------- 전사 ----------
WP = dict(
    armor=C(74, 110, 176), armor_l=C(126, 168, 232), armor_d=C(44, 70, 122),
    steel=C(204, 214, 230), steel_l=C(246, 250, 255), steel_d=C(138, 150, 172),
    skin=C(232, 176, 132), skin_l=C(252, 208, 168), skin_d=C(188, 130, 96),
    gold=C(238, 196, 64), gold_d=C(168, 118, 32),
    plume=C(210, 52, 64), plume_d=C(146, 30, 46),
    boot=C(112, 72, 52), boot_d=C(70, 44, 34),
    wood=C(150, 98, 58), wood_d=C(104, 66, 40),
    cloth=C(160, 40, 56),
)

def warrior(bob=0, lean=0, hand=(21, 17), tip=(25, 6), back_leg=0, front_leg=0, lift=0, slash=None, eyes_shut=False, behind=False):
    c = Canvas(); P = WP
    ub = lambda pts: shift(pts, lean, bob)             # 상체 이동(숨쉬기/기울기)
    # 다리
    bl = rect_pts(12 + back_leg, 22, 14 + back_leg, 27)
    fl = rect_pts(17 + front_leg, 22 - lift, 19 + front_leg, 27 - lift)
    c.paint(bl, P['armor_d'], None, P['armor_d'])
    c.paint(fl, P['armor'], P['armor_l'], P['armor_d'])
    c.paint(rect_pts(12 + back_leg, 27, 15 + back_leg, 28), P['boot_d'], None, None)
    c.paint(rect_pts(17 + front_leg, 27 - lift, 20 + front_leg, 28 - lift), P['boot'], None, P['boot_d'])
    # 방패(등 뒤)
    sh = ub(ellipse_pts(10.5, 17, 3.2, 4.2))
    c.paint(sh, P['wood'], P['steel'], P['wood_d'])
    c.dots([(x, y) for (x, y) in ub({(10, 16), (10, 17), (11, 17)})], P['gold'])
    # 망토
    cape = ub(rect_pts(9, 14, 12, 23) | {(8, 19), (8, 20), (8, 21), (9, 24)})
    c.paint(cape, P['cloth'], None, P['plume_d'])
    # 몸통
    torso = ub(rect_pts(12, 14, 19, 22))
    c.paint(torso, P['armor'], P['armor_l'], P['armor_d'])
    c.paint(ub(rect_pts(12, 21, 19, 22)), P['gold_d'], P['gold'], None)          # 허리띠
    c.dots([(x + lean, y + bob) for (x, y) in ((15, 17), (16, 17), (15, 18), (16, 18))], P['armor_l'])  # 가슴 장식
    c.paint(ub(rect_pts(11, 14, 13, 16) | rect_pts(18, 14, 20, 16)), P['steel'], P['steel_l'], P['steel_d'])  # 어깨받이
    # 머리 (오른쪽을 본다)
    head = ub(rect_pts(12, 6, 18, 13))
    c.paint(head, P['steel'], P['steel_l'], P['steel_d'])
    face = ub(rect_pts(15, 9, 18, 12))
    c.paint(face, P['skin'], P['skin_l'], P['skin_d'])
    c.put(17 + lean, 10 + bob, (30, 24, 40) if not eyes_shut else P['skin_d'])
    c.put(18 + lean, 10 + bob, (30, 24, 40) if not eyes_shut else P['skin_d'])
    c.dots([(x + lean, y + bob) for (x, y) in ((15, 9), (16, 9), (17, 9), (18, 9))], P['steel_d'])  # 투구 챙
    # 깃털
    plume = ub({(11, 5), (12, 4), (13, 3), (14, 3), (10, 6), (11, 6), (9, 7), (10, 7), (12, 5), (13, 4)})
    c.paint(plume, P['plume'], None, P['plume_d'])
    # 슬래시 효과(칼 아래 층)
    if slash:
        for (x, y, col) in slash: c.put(x, y, col)
    # 오른팔 + 칼 (behind=True면 칼날을 몸 뒤에 그린다)
    shoulder = (19 + lean, 15 + bob)
    dxv, dyv = tip[0] - hand[0], tip[1] - hand[1]
    L = max(1, math.hypot(dxv, dyv)); ux, uy = dxv / L, dyv / L
    gx, gy = round(hand[0] + ux * 2), round(hand[1] + uy * 2)       # 날밑 위치
    blade = line_pts(gx, gy, tip[0], tip[1], 2)
    px_, py_ = -uy, ux                                                # 날밑(칼에 수직)
    guard = {(round(gx + px_ * k), round(gy + py_ * k)) for k in (-2, -1, 0, 1, 2)}
    def draw_blade(cv):
        cv.paint(blade, P['steel'], P['steel_l'], P['steel_d'])
        cv.dots([(tip[0], tip[1])], P['steel_l'])
        cv.paint(guard, P['gold'], None, P['gold_d'])
    if behind:
        # 몸 뒤: 이미 그려진 픽셀이 없는 곳에만 칼날을 깔고 몸을 다시 덮는다
        tmp = Canvas(); draw_blade(tmp)
        for y in range(H):
            for x in range(W):
                if tmp.g[y][x] is not None and c.g[y][x] is None: c.g[y][x] = tmp.g[y][x]
    arm = line_pts(shoulder[0], shoulder[1], hand[0], hand[1], 2)
    c.paint(arm, P['armor_l'], None, P['armor'])
    c.paint({hand, (hand[0] + 1, hand[1])}, P['skin'])
    if not behind: draw_blade(c)
    c.dots([(round(hand[0] - ux), round(hand[1] - uy))], P['wood_d'])   # 손잡이 끝
    c.outline()
    return c

def crescent(cx, cy, r0, r1, a0, a1):
    """칼이 지나간 자리를 남기는 초승달 모양 잔상 (바깥쪽이 밝고 안쪽이 연하다)"""
    out = []
    for y in range(H):
        for x in range(W):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if r0 <= r <= r1:
                a = math.degrees(math.atan2(dy, dx))
                if a0 <= a <= a1:
                    t = (a - a0) / max(1e-6, (a1 - a0))        # 칼 쪽(1)으로 갈수록 진하게
                    outer = r > (r0 + r1) / 2
                    col = (236, 248, 255) if outer and t > 0.35 else (150, 196, 240)
                    if t > 0.12: out.append((x, y, col))
    return out

def arc_pts(cx, cy, r, a0, a1, steps=22):
    pts = set()
    for i in range(steps + 1):
        a = math.radians(a0 + (a1 - a0) * i / steps)
        pts.add((round(cx + r * math.cos(a)), round(cy + r * math.sin(a))))
    return pts

def warrior_frames():
    fr = {}
    fr['idle'] = [warrior(bob=0, hand=(21, 17), tip=(25, 6)),
                  warrior(bob=0, hand=(21, 16), tip=(26, 6)),
                  warrior(bob=1, hand=(21, 18), tip=(25, 7)),
                  warrior(bob=1, hand=(21, 17), tip=(24, 7))]
    fr['attack'] = [
        warrior(lean=-1, hand=(18, 12), tip=(12, 3), back_leg=-1, behind=True),            # 준비
        warrior(lean=0, hand=(22, 12), tip=(27, 4)),                                      # 치켜듦
        warrior(lean=1, hand=(24, 16), tip=(30, 18), front_leg=1, slash=crescent(19, 15, 10.2, 13.8, -55, 2)),   # 휘두름
        warrior(lean=2, bob=1, hand=(23, 20), tip=(27, 27), front_leg=1, slash=crescent(19, 15, 10.2, 13.8, 12, 46)),  # 마무리
        warrior(lean=1, hand=(22, 18), tip=(26, 9)),                                      # 복귀
    ]
    fr['hurt'] = [warrior(lean=-2, bob=1, hand=(20, 19), tip=(22, 27), eyes_shut=True)]
    return fr

# ---------- 고블린 ----------
GP = dict(
    skin=C(112, 172, 72), skin_l=C(158, 214, 104), skin_d=C(70, 122, 52),
    eye=C(252, 232, 84), pupil=C(40, 20, 30), teeth=C(246, 246, 228),
    cloth=C(132, 88, 52), cloth_d=C(90, 56, 36), wood=C(142, 96, 56), wood_d=C(96, 62, 36),
    stud=C(176, 176, 190), ear_in=C(196, 130, 120),
)

def goblin(bob=0, lean=0, hand=(21, 19), tip=(24, 12), back_leg=0, front_leg=0, lift_b=0, lift_f=0, mouth_open=False, eyes_shut=False):
    c = Canvas(); P = GP
    ub = lambda pts: shift(pts, lean, bob)
    # 다리
    c.paint(rect_pts(13 + back_leg, 23 - lift_b, 14 + back_leg, 27 - lift_b), P['skin_d'])
    c.paint(rect_pts(13 + back_leg, 27 - lift_b, 15 + back_leg, 28 - lift_b), P['skin_d'])
    c.paint(rect_pts(17 + front_leg, 23 - lift_f, 18 + front_leg, 27 - lift_f), P['skin'], None, P['skin_d'])
    c.paint(rect_pts(17 + front_leg, 27 - lift_f, 19 + front_leg, 28 - lift_f), P['skin_d'])
    # 몸통 + 허리천
    c.paint(ub(rect_pts(13, 16, 19, 22)), P['skin'], P['skin_l'], P['skin_d'])
    cloth = ub(rect_pts(13, 21, 19, 23))
    c.paint(cloth, P['cloth'], None, P['cloth_d'])
    c.dots([(x + lean, 24 + bob) for x in (13, 15, 17, 19)], P['cloth_d'])
    # 귀 (뒤/앞)
    c.paint(ub(line_pts(11, 9, 4, 6, 2)), P['skin'], P['skin_l'], P['skin_d'])
    c.paint(ub(line_pts(21, 8, 27, 5, 2)), P['skin'], P['skin_l'], P['skin_d'])
    c.dots([(x + lean, y + bob) for (x, y) in ((8, 8), (7, 7))], P['ear_in'])
    # 머리
    c.paint(ub(ellipse_pts(16, 10, 5.4, 4.6)), P['skin'], P['skin_l'], P['skin_d'])
    # 코
    c.paint(ub({(21, 10), (22, 11), (21, 11), (22, 12)}), P['skin'], P['skin_l'], P['skin_d'])
    # 눈
    if eyes_shut:
        c.dots([(x + lean, y + bob) for (x, y) in ((16, 9), (17, 9), (19, 9), (20, 9))], P['pupil'])
    else:
        c.dots([(x + lean, y + bob) for (x, y) in ((17, 9), (18, 9), (19, 9), (20, 9))], P['eye'])
        c.dots([(x + lean, y + bob) for (x, y) in ((18, 9), (20, 9))], P['pupil'])
        c.dots([(x + lean, y + bob) for (x, y) in ((16, 8), (17, 8), (19, 8), (20, 8))], P['skin_d'])     # 찌푸린 눈썹
    # 입
    if mouth_open:
        c.dots([(x + lean, y + bob) for (x, y) in ((17, 13), (18, 13), (19, 13), (20, 13), (17, 14), (18, 14), (19, 14))], P['pupil'])
        c.dots([(x + lean, y + bob) for (x, y) in ((18, 13), (20, 13))], P['teeth'])
    else:
        c.dots([(x + lean, y + bob) for (x, y) in ((17, 13), (18, 13), (19, 13), (20, 13))], P['pupil'])
        c.dots([(x + lean, y + bob) for (x, y) in ((18, 14), (20, 14))], P['teeth'])
    # 팔 + 몽둥이
    sh = (18 + lean, 17 + bob)
    c.paint(line_pts(sh[0], sh[1], hand[0], hand[1], 1), P['skin'], None, P['skin_d'])
    dxv, dyv = tip[0] - hand[0], tip[1] - hand[1]
    club = line_pts(hand[0], hand[1], tip[0], tip[1], 2) | ellipse_pts(tip[0], tip[1], 2.4, 2.4)
    c.paint(club, P['wood'], None, P['wood_d'])
    c.dots([(tip[0] + 1, tip[1] - 1), (tip[0] - 1, tip[1] + 1)], P['stud'])
    c.paint({hand}, P['skin'])
    c.outline()
    return c

def goblin_frames():
    fr = {}
    fr['idle'] = [goblin(bob=0, hand=(21, 19), tip=(24, 12)), goblin(bob=0, hand=(21, 19), tip=(24, 12)),
                  goblin(bob=1, hand=(21, 20), tip=(24, 13)), goblin(bob=1, hand=(21, 20), tip=(24, 13))]
    fr['walk'] = [goblin(bob=0, back_leg=-1, front_leg=1, hand=(21, 19), tip=(25, 13)),
                  goblin(bob=-1, lift_b=1, hand=(21, 18), tip=(25, 12)),
                  goblin(bob=0, back_leg=1, front_leg=-1, hand=(21, 19), tip=(25, 13)),
                  goblin(bob=-1, lift_f=1, hand=(21, 18), tip=(25, 12))]
    fr['attack'] = [goblin(lean=-1, hand=(18, 13), tip=(13, 6), mouth_open=True),
                    goblin(lean=0, hand=(20, 12), tip=(25, 5), mouth_open=True),
                    goblin(lean=2, hand=(23, 18), tip=(28, 23), front_leg=1, mouth_open=True),
                    goblin(lean=2, bob=1, hand=(22, 21), tip=(26, 27), front_leg=1),
                    goblin(lean=1, hand=(21, 19), tip=(25, 14))]
    fr['hurt'] = [goblin(lean=-2, bob=1, hand=(19, 20), tip=(20, 27), mouth_open=True, eyes_shut=True)]
    return fr

# ---------- 합성/후처리 ----------
def tint_white(im, amt=0.55):
    out = im.copy()
    for y in range(H):
        for x in range(W):
            r, g, b, a = out.getpixel((x, y))
            if a: out.putpixel((x, y), (int(r + (255 - r) * amt), int(g + (255 - g) * amt), int(b + (255 - b) * amt), a))
    return out

def add_shadow(im, cx=16, cy=28, rx=8, ry=1.6):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0: sh.putpixel((x, y), (0, 0, 0, 80))
    return Image.alpha_composite(sh, im)

def rotate_fall(im, angle, bottom=28, x_off=0):
    """몸 중심을 축으로 뒤로 쓰러뜨린 뒤, 바닥(bottom)에 맞춰 캔버스 안에 배치한다."""
    big = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    big.paste(im, (16, 16))
    r = big.rotate(angle, resample=Image.NEAREST, center=(32, 34))
    bb = r.getbbox()
    piece = r.crop(bb)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = max(0, min(W - piece.width, (W - piece.width) // 2 + x_off))
    py = bottom - piece.height + 1
    out.paste(piece, (px, py))
    return out

def build(kind):
    fr = warrior_frames() if kind == 'warrior' else goblin_frames()
    anims = {k: [add_shadow(f.image()) for f in v] for k, v in fr.items()}
    hurt_base = fr['hurt'][0].image()
    anims['hurt'] = [add_shadow(tint_white(hurt_base))]
    anims['death'] = [add_shadow(rotate_fall(tint_white(hurt_base, 0.35), 22, 28, -1)),
                      add_shadow(rotate_fall(hurt_base, 58, 28, -2), cx=15, rx=9),
                      add_shadow(rotate_fall(hurt_base, 90, 28, -1), cx=15, rx=12)]
    return anims

SPEC = {  # 애니메이션: (프레임 수, fps, 반복)
    'warrior': [('idle', 4, 4, True), ('attack', 5, 12, False), ('hurt', 1, 6, False), ('death', 3, 6, False)],
    'goblin':  [('idle', 4, 4, True), ('walk', 4, 8, True), ('attack', 5, 10, False), ('hurt', 1, 6, False), ('death', 3, 6, False)],
}

def sheet(anims, order):
    cols = 5
    sh = Image.new("RGBA", (cols * W, len(order) * H), (0, 0, 0, 0))
    for r, name in enumerate(order):
        for i, im in enumerate(anims[name]): sh.paste(im, (i * W, r * H))
    return sh

def main(outdir):
    meta = {"frame_size": [W, H], "columns": 5, "characters": {}}
    for kind in ('warrior', 'goblin'):
        anims = build(kind)
        order = [s[0] for s in SPEC[kind]]
        sh = sheet(anims, order)
        sh.save(f"{outdir}/{kind}_sheet.png")
        # 오른쪽을 보는 원본 / 왼쪽을 보는 반전 시트(적은 왼쪽으로 진행)
        flipped = Image.new("RGBA", sh.size, (0, 0, 0, 0))
        for r in range(len(order)):
            for i in range(5):
                tile = sh.crop((i * W, r * H, (i + 1) * W, (r + 1) * H)).transpose(Image.FLIP_LEFT_RIGHT)
                flipped.paste(tile, (i * W, r * H))
        flipped.save(f"{outdir}/{kind}_sheet_flipped.png")
        meta["characters"][kind] = {"facing": "right", "animations": {n: {"row": r, "frames": f, "fps": fps, "loop": lp} for r, (n, f, fps, lp) in enumerate(SPEC[kind])}}
        # 확대 미리보기
        big = sh.resize((sh.width * 6, sh.height * 6), Image.NEAREST)
        bg = Image.new("RGBA", big.size, (44, 48, 64, 255)); bg.alpha_composite(big)
        bg.save(f"{outdir}/{kind}_preview_x6.png")
    json.dump(meta, open(f"{outdir}/sprites.json", "w"), ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
