#!/usr/bin/env python3
"""어둡고 섬뜩한 적 5종 (48x48, 오른쪽을 봄): 구울 / 해골 궁수 / 강령술사 / 학살자 / 마귀"""
import math, sys
from PIL import Image, ImageDraw

S = 48
OUT = (14, 8, 18, 255)

def sh(c, f): return tuple(max(0, min(255, int(v * f))) for v in c)
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def cap(x0, y0, x1, y1, r0, r1=None):
    r1 = r0 if r1 is None else r1
    pts = set(); n = max(2, int(math.hypot(x1 - x0, y1 - y0) * 2))
    for i in range(n + 1):
        t = i / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t; r = r0 + (r1 - r0) * t
        for yy in range(int(y - r) - 1, int(y + r) + 2):
            for xx in range(int(x - r) - 1, int(x + r) + 2):
                if (xx - x) ** 2 + (yy - y) ** 2 <= r * r + 0.3: pts.add((xx, yy))
    return pts

def blob(cx, cy, rx, ry):
    return {(x, y) for y in range(int(cy - ry) - 1, int(cy + ry) + 2) for x in range(int(cx - rx) - 1, int(cx + rx) + 2)
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0}

def poly(points):
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).polygon(points, fill=255)
    return {(x, y) for y in range(S) for x in range(S) if m.getpixel((x, y))}

def line(x0, y0, x1, y1):
    n = max(abs(x1 - x0), abs(y1 - y0), 1) * 2
    return {(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)}

def sft(pts, dx, dy): return {(x + dx, y + dy) for x, y in pts}

class Cv:
    def __init__(self): self.g = [[None] * S for _ in range(S)]
    def put(self, x, y, c):
        if 0 <= x < S and 0 <= y < S: self.g[y][x] = c
    def paint(self, pts, base, light=None, dark=None, rim=None):
        P = set(pts)
        for (x, y) in P:
            c = base
            if light and (x, y - 1) not in P: c = light
            elif dark and (x, y + 1) not in P: c = dark
            elif rim and (x - 1, y) not in P: c = rim
            self.put(x, y, c)
    def dots(self, lst, c):
        for x, y in lst: self.put(x, y, c)
    def outline(self, col=OUT):
        f = {(x, y) for y in range(S) for x in range(S) if self.g[y][x] is not None}
        for (x, y) in f:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in f and 0 <= n[0] < S and 0 <= n[1] < S: self.g[n[1]][n[0]] = col
    def glow(self, pts, col):  # 눈빛 번짐 (빈 칸에만)
        for (x, y) in pts:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if 0 <= x + dx < S and 0 <= y + dy < S and self.g[y + dy][x + dx] is None: self.g[y + dy][x + dx] = col
    def image(self):
        im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        for y in range(S):
            for x in range(S):
                c = self.g[y][x]
                if c is not None: im.putpixel((x, y), c if len(c) == 4 else c + (255,))
        return im

# ---------------------------------------------------------------- 구울 (고블린 자리)
def ghoul(bob=0, lean=0, hand=(36, 31), hand2=(30, 33), jaw=0, bl=0, fl=0, lift=0, eyes_shut=False):
    c = Cv()
    SK = (116, 124, 104); SKL = (158, 168, 138); SKD = (66, 74, 62); CL = (54, 38, 42); CLD = (32, 22, 28)
    BONE = (228, 218, 190); BLOOD = (138, 26, 30); EYE = (255, 54, 40); EYEL = (255, 200, 150)
    gy = 44
    # 뒷다리/앞다리
    c.paint(cap(20, 31 + bob, 18 + bl, 38, 2.3, 1.6) | cap(18 + bl, 38, 17 + bl, gy - 1, 1.6, 1.4) | blob(18 + bl, gy - 1, 3.5, 1.2) | {(21 + bl, gy - 1), (21 + bl, gy)}, SKD, None, SK)
    c.paint(cap(25, 31 + bob, 27 + fl, 38 - lift, 2.5, 1.7) | cap(27 + fl, 38 - lift, 28 + fl, gy - 1 - lift, 1.7, 1.5) | blob(29 + fl, gy - 1 - lift, 3.8, 1.3) | {(32 + fl, gy - 1 - lift), (32 + fl, gy - lift)}, SK, SKL, SKD)
    c.dots([(32 + fl, gy - lift), (33 + fl, gy - lift), (21 + bl, gy)], BONE)
    # 누더기 허리천
    c.paint(poly([(18, 30 + bob), (28, 30 + bob), (29, 37), (26, 36), (24, 40), (21, 36), (18, 38)]), CL, (84, 62, 62), CLD)
    c.dots([(20, 33), (24, 35), (27, 33)], BLOOD)
    # 등이 굽은 상체
    torso = poly([(15 + lean, 22 + bob), (19 + lean, 16 + bob), (27 + lean, 16 + bob), (30 + lean, 23 + bob), (27, 31 + bob), (20, 31 + bob)])
    c.paint(torso, SK, SKL, SKD, SKD)
    c.dots([(14 + lean, 21 + bob), (15 + lean, 18 + bob), (17 + lean, 15 + bob)], BONE)   # 척추 돌기
    for i, yy in enumerate((20, 23, 26, 29)):  # 갈비뼈
        c.dots([(x + lean // 2, yy + bob) for x in range(22, 28 - (i == 3))], SKD)
        c.dots([(x + lean // 2, yy + bob - 0) for x in (23, 25, 27) if i % 2 == 0], BONE)
    c.dots([(23, 24 + bob), (24, 24 + bob), (24, 25 + bob)], BLOOD)
    # 뒷팔
    c.paint(cap(21 + lean, 19 + bob, hand2[0] - 3, hand2[1] - 5, 1.6, 1.3) | cap(hand2[0] - 3, hand2[1] - 5, hand2[0], hand2[1], 1.3, 1.1), SKD)
    c.dots([(hand2[0] + 1, hand2[1] + 1), (hand2[0] + 2, hand2[1] + 2), (hand2[0] + 1, hand2[1] + 2)], BONE)
    # 머리 (앞으로 숙임)
    hx, hy = 32 + lean, 15 + bob
    head = blob(hx, hy, 5.4, 4.6)
    c.paint(head, SK, SKL, SKD)
    c.paint(poly([(hx + 1, hy + 3), (hx + 7, hy + 3), (hx + 6, hy + 6 + jaw), (hx + 2, hy + 6 + jaw)]), SKD, SK, (40, 40, 38))   # 턱
    c.dots([(hx + 7, hy + 2), (hx + 8, hy + 3)], SK)
    mouth_y = hy + 4
    c.dots([(x, mouth_y) for x in range(hx + 2, hx + 8)], (28, 8, 12))
    if jaw: c.dots([(x, mouth_y + 1) for x in range(hx + 2, hx + 7)], (28, 8, 12))
    c.dots([(hx + 3, mouth_y - 1), (hx + 5, mouth_y - 1), (hx + 7, mouth_y - 1)], BONE)
    c.dots([(hx + 3, mouth_y + 1 + (1 if jaw else 0)), (hx + 6, mouth_y + 1 + (1 if jaw else 0))], BONE)
    sock = [(hx + 2, hy - 1), (hx + 3, hy - 1), (hx + 5, hy - 1), (hx + 6, hy - 1), (hx + 2, hy), (hx + 3, hy), (hx + 5, hy), (hx + 6, hy)]
    c.dots(sock, (24, 22, 24))
    if not eyes_shut:
        c.dots([(hx + 3, hy), (hx + 6, hy)], EYE); c.dots([(hx + 3, hy - 1), (hx + 6, hy - 1)], EYEL)
    c.dots([(hx - 4, hy - 3), (hx - 5, hy - 1), (hx - 5, hy + 1), (hx - 6, hy + 3), (hx - 4, hy + 4), (hx - 3, hy - 4)], (34, 28, 30))  # 헝클어진 머리칼
    c.dots([(hx - 1, hy - 4), (hx - 2, hy + 4)], (34, 28, 30))
    # 앞팔 + 갈고리 손톱
    c.paint(cap(26 + lean, 19 + bob, (26 + hand[0]) // 2 + 1, (19 + hand[1]) // 2 - 2, 1.9, 1.5) | cap((26 + hand[0]) // 2 + 1, (19 + hand[1]) // 2 - 2, hand[0], hand[1], 1.5, 1.2), SK, SKL, SKD)
    for k in (-1, 0, 1):
        c.paint(line(hand[0], hand[1], hand[0] + 4, hand[1] + 3 + k * 2), BONE)
    c.dots([(hand[0] + 4, hand[1] + 3 + k * 2) for k in (-1, 0, 1)], (255, 250, 232))
    c.outline()
    c.glow([(hx + 3, hy), (hx + 6, hy)] if not eyes_shut else [], (150, 20, 22))
    return c

def ghoul_frames():
    G = ghoul
    fr = {}
    fr['idle'] = [G(), G(bob=0, hand=(36, 32), hand2=(30, 34)), G(bob=1, hand=(36, 32), hand2=(30, 34), jaw=1), G(bob=1, hand=(36, 31), hand2=(30, 33))]
    fr['walk'] = [G(bl=-2, fl=2, hand=(35, 30), hand2=(31, 34)), G(bob=-1, lift=2, hand=(36, 32), hand2=(30, 33)), G(bl=2, fl=-2, hand=(37, 31), hand2=(29, 33)), G(bob=-1, hand=(36, 32), hand2=(30, 34))]
    fr['attack'] = [G(lean=-2, hand=(30, 14), hand2=(27, 22), jaw=1), G(lean=-3, bob=-1, hand=(33, 8), hand2=(26, 20), jaw=2), G(lean=3, hand=(40, 28), hand2=(31, 26), jaw=3, fl=2),
                    G(lean=4, bob=1, hand=(42, 35), hand2=(33, 30), jaw=3, fl=2), G(lean=1, hand=(38, 34), hand2=(31, 33), jaw=1)]
    fr['hurt'] = [G(lean=-3, bob=1, hand=(32, 36), hand2=(26, 34), jaw=3, eyes_shut=True)]
    return fr

# ---------------------------------------------------------------- 해골 궁수
def skel_archer(bob=0, lean=0, pull=0, bl=0, fl=0, lift=0, jaw=0, eyes_shut=False, draw=False):
    c = Cv()
    B = (210, 202, 178); BL = (242, 236, 214); BD = (130, 120, 104); CL = (36, 30, 46); CLL = (62, 54, 78); EYE = (90, 255, 200); WOOD = (84, 54, 40); WL = (130, 90, 60)
    gy = 44
    # 망토(뒤)
    c.paint(poly([(18 + lean, 15 + bob), (26 + lean, 15 + bob), (24, 30), (23, 43), (21, 40), (19, 44), (16, 39), (14, 42), (14, 28)]), CL, CLL, (22, 18, 30))
    c.dots([(15, 33), (17, 38), (20, 41)], (22, 18, 30))
    # 다리 뼈
    c.paint(cap(21, 31 + bob, 20 + bl, 38, 1.2) | cap(20 + bl, 38, 19 + bl, gy - 1, 1.1) | {(20 + bl, 38), (19 + bl, 37), (19 + bl, gy), (20 + bl, gy), (21 + bl, gy), (22 + bl, gy)}, BD)
    c.paint(cap(25, 31 + bob, 26 + fl, 38 - lift, 1.3) | cap(26 + fl, 38 - lift, 27 + fl, gy - 1 - lift, 1.2) | {(26 + fl, 38 - lift), (27 + fl, gy - lift), (28 + fl, gy - lift), (29 + fl, gy - lift), (30 + fl, gy - lift)}, B, BL, BD)
    # 골반 / 갈비뼈
    c.paint(blob(23, 31 + bob, 4.2, 2.4), B, BL, BD)
    c.dots([(23, 31 + bob), (23, 32 + bob)], (30, 24, 30))
    c.paint(cap(23, 16 + bob, 23, 30 + bob, 0.9), BD)   # 척추
    rib = blob(24 + lean, 21 + bob, 5.2, 6)
    c.paint(rib, (60, 52, 58))
    for yy in (17, 19, 21, 23, 25):
        c.paint(line(20 + lean, yy + bob, 28 + lean, yy + bob + 1), B)
    c.paint(cap(24 + lean, 15 + bob, 24 + lean, 27 + bob, 0.7), BL)
    # 어깨뼈 / 두건 망토 앞
    c.paint(poly([(19 + lean, 14 + bob), (29 + lean, 14 + bob), (30 + lean, 18 + bob), (18 + lean, 18 + bob)]), CL, CLL, (22, 18, 30))
    # 해골 머리 + 두건
    hx, hy = 28 + lean, 10 + bob
    c.paint(poly([(hx - 6, hy + 6), (hx - 5, hy - 5), (hx, hy - 8), (hx + 5, hy - 5), (hx + 6, hy + 6)]), CL, CLL, (22, 18, 30))
    c.paint(blob(hx + 2, hy + 1, 4.2, 4.3), B, BL, BD)
    c.paint(poly([(hx + 3, hy + 4), (hx + 7, hy + 4), (hx + 6, hy + 6 + jaw), (hx + 3, hy + 6 + jaw)]), BD, B, (80, 72, 66))
    c.dots([(hx + 3, hy + 5), (hx + 4, hy + 5), (hx + 5, hy + 5), (hx + 6, hy + 5)], (30, 24, 30))
    c.dots([(hx + 3, hy + 4), (hx + 5, hy + 4), (hx + 7, hy + 4)], BL)
    c.dots([(hx + 1, hy), (hx + 2, hy), (hx + 4, hy), (hx + 5, hy), (hx + 1, hy + 1), (hx + 2, hy + 1), (hx + 4, hy + 1), (hx + 5, hy + 1)], (14, 12, 18))
    if not eyes_shut: c.dots([(hx + 2, hy + 1), (hx + 5, hy + 1)], EYE)
    c.dots([(hx + 3, hy + 3)], (24, 20, 24))
    # 활
    bx = 38 + lean
    bow = set()
    for dy in range(-12, 13):
        bow |= {(bx + round(4 * (1 - (dy / 12) ** 2)) - 1 + (1 if abs(dy) > 8 else 0), 20 + bob + dy), (bx + round(4 * (1 - (dy / 12) ** 2)), 20 + bob + dy)}
    c.paint(bow, WOOD, WL, (50, 30, 24))
    sx = bx - pull
    c.paint(line(bx + 1, 8 + bob, sx, 20 + bob) | line(sx, 20 + bob, bx + 1, 32 + bob), (210, 210, 200))
    if draw: c.paint(line(sx, 20 + bob, bx + 8, 20 + bob), (120, 90, 64)); c.dots([(bx + 9, 20 + bob), (bx + 10, 20 + bob), (bx + 9, 19 + bob), (bx + 9, 21 + bob)], (196, 196, 210)); c.dots([(sx + 1, 19 + bob), (sx + 1, 21 + bob)], (200, 60, 50))
    # 팔뼈
    c.paint(cap(26 + lean, 17 + bob, bx, 20 + bob, 1.1), B, BL, BD)   # 앞팔(활 쥠)
    c.paint(cap(24 + lean, 18 + bob, sx + 1, 20 + bob, 0.9), BD)      # 시위 당기는 팔
    c.outline()
    c.glow([(hx + 2, hy + 1), (hx + 5, hy + 1)] if not eyes_shut else [], (24, 120, 96))
    return c

def archer_frames():
    G = skel_archer
    fr = {}
    fr['idle'] = [G(), G(), G(bob=1, jaw=1), G(bob=1)]
    fr['walk'] = [G(bl=-2, fl=2), G(bob=-1, lift=2), G(bl=2, fl=-2), G(bob=-1)]
    fr['attack'] = [G(pull=1), G(lean=-1, pull=3, draw=True), G(lean=-2, pull=5, draw=True, jaw=2), G(lean=1, pull=1, jaw=1), G()]
    fr['hurt'] = [G(lean=-3, bob=1, eyes_shut=True, jaw=3)]
    return fr

# ---------------------------------------------------------------- 강령술사 (주술사 자리)
def necro(bob=0, lean=0, orb=3, raise_=0, sway=0, eyes_shut=False, jaw=0):
    c = Cv()
    R = (46, 28, 70); RL = (88, 56, 130); RD = (26, 14, 42); TRIM = (170, 110, 230); B = (222, 214, 192); BD = (140, 130, 112); EYE = (210, 110, 255); WOOD = (70, 48, 36)
    # 로브
    robe = poly([(19 + lean, 14 + bob), (28 + lean, 14 + bob), (31, 26), (32 + sway, 43), (29, 41), (26, 44), (23, 41), (20, 44), (16 + sway, 41), (15, 43), (16, 27)])
    c.paint(robe, R, RL, RD, (36, 20, 56))
    c.dots([(x, 30 + (x % 2)) for x in range(17, 31)], TRIM)
    c.dots([(x, 43 - (x % 3 == 0)) for x in range(17, 31, 2)], TRIM)
    c.dots([(23, 20 + bob), (23, 22 + bob), (23, 24 + bob), (23, 26 + bob), (23, 28 + bob)], RD)
    # 해골 허리띠
    for xx in (19, 24, 28):
        c.paint(blob(xx, 31, 1.7, 1.7), B, None, BD); c.dots([(xx - 1, 31), (xx + 1, 31)], (20, 12, 28))
    # 어깨 망토 + 뿔
    c.paint(poly([(16 + lean, 16 + bob), (31 + lean, 14 + bob), (33 + lean, 20 + bob), (14 + lean, 21 + bob)]), RD, (60, 36, 92), (14, 8, 22))
    c.paint(poly([(13 + lean, 17 + bob), (11 + lean, 10 + bob), (16 + lean, 15 + bob)]), B, None, BD)
    c.paint(poly([(33 + lean, 16 + bob), (36 + lean, 10 + bob), (30 + lean, 14 + bob)]), B, None, BD)
    # 후드 + 해골 가면
    hx, hy = 26 + lean, 10 + bob
    c.paint(poly([(hx - 7, hy + 7), (hx - 6, hy - 3), (hx - 1, hy - 10), (hx + 5, hy - 6), (hx + 7, hy + 2), (hx + 6, hy + 8)]), R, RL, RD)
    c.paint(blob(hx + 2, hy + 1, 4.2, 4.6), (18, 10, 24))
    c.paint(blob(hx + 3, hy + 1, 3.4, 3.8), B, (244, 238, 218), BD)
    c.dots([(hx + 2, hy + 1), (hx + 3, hy + 1), (hx + 5, hy + 1), (hx + 6, hy + 1), (hx + 2, hy + 2), (hx + 5, hy + 2)], (12, 8, 16))
    if not eyes_shut: c.dots([(hx + 3, hy + 1), (hx + 6, hy + 1)], EYE)
    c.dots([(hx + 4, hy + 3), (hx + 4, hy + 4 + jaw), (hx + 3, hy + 5 + jaw), (hx + 5, hy + 5 + jaw)], BD if not jaw else (20, 10, 24))
    # 지팡이 + 구체
    px = 36 + lean
    c.paint(cap(px, 44, px - 1, 14 - raise_ + bob, 1.1), WOOD, (116, 84, 60))
    c.paint(blob(px - 1, 12 - raise_ + bob, 2.4, 2.8), B, None, BD)
    c.dots([(px - 2, 12 - raise_ + bob), (px, 12 - raise_ + bob)], (20, 12, 28))
    oy = 6 - raise_ + bob
    for rr, col in ((orb + 3, (90, 40, 140)), (orb + 1, (160, 80, 230)), (max(1, orb - 1), (240, 200, 255))):
        c.paint(blob(px - 1, oy, rr * 0.9, rr * 0.9), col)
    for (dx, dy) in ((-6, -2), (5, 1), (-4, 5), (6, -4)):
        c.dots([(px + dx, oy + dy)], (210, 140, 255))
    # 손 (뼈만 남은)
    hx2, hy2 = px - 1, 22 + bob
    c.paint(cap(27 + lean, 20 + bob, hx2, hy2, 1.4, 1.1), RD)
    c.paint(blob(hx2, hy2, 1.7, 1.7), (178, 168, 178))
    c.paint(cap(22, 20 + bob, 28 - raise_ // 2, 25 - raise_ + bob, 1.4, 1.1), RD)
    c.paint(blob(28 - raise_ // 2, 25 - raise_ + bob, 1.6, 1.6), (178, 168, 178))
    c.outline()
    c.glow([(hx + 3, hy + 1), (hx + 6, hy + 1)] if not eyes_shut else [], (110, 40, 150))
    return c

def necro_frames():
    G = necro
    fr = {}
    fr['idle'] = [G(), G(sway=1, orb=3), G(bob=1, orb=4), G(bob=1, sway=-1, orb=3)]
    fr['walk'] = [G(sway=1), G(bob=-1), G(sway=-1), G(bob=-1)]
    fr['attack'] = [G(raise_=0, orb=3), G(lean=-1, raise_=3, orb=4, jaw=1), G(lean=-2, raise_=6, orb=6, jaw=2), G(lean=1, raise_=2, orb=4, jaw=1), G(orb=3)]
    fr['hurt'] = [G(lean=-3, bob=1, eyes_shut=True, jaw=2)]
    return fr

# ---------------------------------------------------------------- 학살자 (정예 오크 자리)
def brute(bob=0, lean=0, weapon=(40, 30), shoulder=0, bl=0, fl=0, lift=0, jaw=0, eyes_shut=False, wtip=None):
    c = Cv()
    SK = (132, 66, 58); SKL = (182, 102, 86); SKD = (80, 38, 40); IRON = (78, 80, 94); IRL = (150, 154, 170); IRD = (44, 46, 58); BONE = (224, 214, 188)
    EYE = (255, 190, 50); BLOOD = (150, 24, 26); gy = 45
    # 다리
    c.paint(cap(19, 31 + bob, 18 + bl, 39, 3.6, 2.8) | cap(18 + bl, 39, 17 + bl, gy - 1, 2.8, 2.4) | blob(19 + bl, gy - 1, 4.2, 1.5), SKD, None, (50, 24, 28))
    c.paint(cap(27, 31 + bob, 28 + fl, 39 - lift, 3.8, 2.9) | cap(28 + fl, 39 - lift, 29 + fl, gy - 1 - lift, 2.9, 2.5) | blob(30 + fl, gy - 1 - lift, 4.6, 1.6), SK, SKL, SKD)
    c.paint(poly([(17 + bl, 38), (21 + bl, 38), (21 + bl, 41), (17 + bl, 41)]), IRD, IRL)
    c.paint(poly([(27 + fl, 38 - lift), (32 + fl, 38 - lift), (32 + fl, 42 - lift), (27 + fl, 42 - lift)]), IRON, IRL, IRD)
    # 허리 / 사슬 가죽
    c.paint(poly([(16, 30 + bob), (31, 30 + bob), (32, 38), (24, 40), (15, 38)]), (62, 44, 40), (100, 70, 62), (36, 24, 24))
    c.dots([(x, 33 + bob) for x in range(17, 31, 2)], (150, 150, 166))
    # 상체 (거대)
    c.paint(poly([(13 + lean, 17 + bob), (20 + lean, 12 + bob), (30 + lean, 13 + bob), (35 + lean, 19 + bob), (32, 31 + bob), (17, 31 + bob)]), SK, SKL, SKD, SKD)
    for (x0, y0, x1, y1) in ((20, 18, 24, 24), (27, 16, 29, 22), (22, 26, 28, 28)):   # 흉터
        c.dots(list(line(x0 + lean, y0 + bob, x1 + lean, y1 + bob)), (214, 170, 150))
    c.dots([(24, 20 + bob), (25, 21 + bob), (26, 20 + bob)], BLOOD)
    c.paint(line(18, 16 + bob, 32 + lean, 26 + bob) | line(18, 17 + bob, 32 + lean, 27 + bob), (74, 60, 56))   # 가슴 가죽끈
    c.dots([(24, 21 + bob), (26, 22 + bob)], (178, 178, 192))
    # 뒷팔
    c.paint(cap(16 + lean, 18 + bob, 12, 28 + bob, 3, 2.3), SKD)
    c.paint(blob(12, 30 + bob, 2.8, 2.6), SKD)
    # 머리
    hx, hy = 28 + lean, 9 + bob
    c.paint(blob(hx, hy, 5, 4.8), SK, SKL, SKD)
    c.paint(poly([(hx - 5, hy - 2), (hx + 5, hy - 2), (hx + 6, hy - 6), (hx - 6, hy - 6)]), IRON, IRL, IRD)   # 투구 상단
    c.paint(poly([(hx - 5, hy - 5), (hx - 8, hy - 10), (hx - 4, hy - 7)]), BONE, None, (150, 140, 120))
    c.paint(poly([(hx + 5, hy - 5), (hx + 9, hy - 10), (hx + 4, hy - 7)]), BONE, None, (150, 140, 120))
    c.paint(poly([(hx + 1, hy + 2), (hx + 7, hy + 2), (hx + 6, hy + 5 + jaw), (hx + 1, hy + 5 + jaw)]), SKD, SK, (40, 18, 22))
    c.dots([(hx + 2, hy + 3), (hx + 3, hy + 3), (hx + 4, hy + 3), (hx + 5, hy + 3), (hx + 6, hy + 3)], (26, 8, 12))
    c.dots([(hx + 2, hy + 2), (hx + 6, hy + 2), (hx + 3, hy + 4 + jaw), (hx + 5, hy + 4 + jaw)], BONE)
    c.dots([(hx + 1, hy - 1), (hx + 2, hy - 1), (hx + 4, hy - 1), (hx + 5, hy - 1)], (30, 14, 16))
    if not eyes_shut: c.dots([(hx + 2, hy), (hx + 5, hy)], EYE); c.dots([(hx + 2, hy - 1), (hx + 5, hy - 1)], (255, 250, 200))
    c.dots(list(line(hx - 1, hy + 1, hx + 1, hy + 4)), (210, 160, 140))
    # 어깨 갑옷 (가시)
    c.paint(poly([(28 + lean, 12 + bob - shoulder), (37 + lean, 14 + bob), (38 + lean, 20 + bob), (28 + lean, 19 + bob)]), IRON, IRL, IRD)
    for k in range(3):
        c.paint(poly([(30 + k * 3 + lean, 13 + bob - shoulder), (31 + k * 3 + lean, 8 + bob - shoulder), (32 + k * 3 + lean, 13 + bob - shoulder)]), IRL, None, IRON)
    # 앞팔 + 대형 도끼/식칼
    wx, wy = weapon
    c.paint(cap(32 + lean, 18 + bob, wx - 2, wy - 3, 3, 2.4), SK, SKL, SKD)
    c.paint(blob(wx - 1, wy - 2, 3, 3), SK, SKL, SKD)
    tx, ty = wtip if wtip else (wx + 5, wy - 18)
    c.paint(cap(wx - 1, wy - 1, tx, ty, 1.4), (88, 60, 44), (130, 94, 66))
    dx, dy = tx - (wx - 1), ty - (wy - 1); L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
    blade = poly([(tx + nx * 1, ty + ny * 1), (tx + nx * 9 + dx / L * 2, ty + ny * 9 + dy / L * 2), (tx + nx * 8 - dx / L * 9, ty + ny * 8 - dy / L * 9), (tx - dx / L * 3, ty - dy / L * 3)])
    c.paint(blade, (170, 176, 188), (232, 236, 244), (92, 96, 112))
    c.dots(list(line(round(tx + nx * 4 - dx / L * 3), round(ty + ny * 4 - dy / L * 3), round(tx + nx * 7 - dx / L * 5), round(ty + ny * 7 - dy / L * 5))), BLOOD)
    c.outline()
    c.glow([(hx + 2, hy), (hx + 5, hy)] if not eyes_shut else [], (140, 70, 20))
    return c

def brute_frames():
    G = brute
    fr = {}
    fr['idle'] = [G(), G(bob=0, weapon=(40, 31)), G(bob=1, weapon=(40, 32)), G(bob=1, weapon=(40, 31))]
    fr['walk'] = [G(bl=-2, fl=2), G(bob=-1, lift=2), G(bl=2, fl=-2), G(bob=-1)]
    fr['attack'] = [G(lean=-2, weapon=(34, 14), wtip=(30, 2), shoulder=2, jaw=1), G(lean=-3, bob=-1, weapon=(34, 10), wtip=(36, 0), shoulder=3, jaw=2),
                    G(lean=3, weapon=(42, 28), wtip=(46, 40), jaw=3, fl=2), G(lean=4, bob=1, weapon=(42, 34), wtip=(44, 46), jaw=3, fl=2), G(lean=1, weapon=(40, 32), jaw=1)]
    fr['hurt'] = [G(lean=-3, bob=1, weapon=(36, 36), eyes_shut=True, jaw=3)]
    return fr

# ---------------------------------------------------------------- 마귀 (임프 자리, 공중 부유)
def fiend(bob=0, wing=0, lean=0, lunge=0, eyes_shut=False, jaw=0):
    c = Cv()
    SK = (66, 44, 74); SKL = (110, 76, 122); SKD = (34, 22, 44); WG = (104, 28, 58); WGD = (58, 14, 38); VEIN = (255, 70, 50); BONE = (232, 222, 196); EYE = (255, 70, 50)
    cx, cy = 24 + lean + lunge, 25 + bob
    up = [-9, -3, 3][wing]
    for (sx, sgn) in ((-1, 1), (1, 1)):
        pass
    # 날개 (뒤쪽 큰 날개 + 앞쪽 작은 날개)
    wb = poly([(cx - 4, cy - 2), (cx - 20, cy + up - 10), (cx - 17, cy + up - 3), (cx - 14, cy + up + 4), (cx - 9, cy + up + 2), (cx - 5, cy + 8)])
    c.paint(wb, WG, (150, 50, 84), WGD)
    for tipx, tipy in ((cx - 20, cy + up - 10), (cx - 17, cy + up - 3), (cx - 14, cy + up + 4)):
        c.paint(line(cx - 4, cy - 2, tipx, tipy), (30, 14, 28))
    wf = poly([(cx + 2, cy - 3), (cx + 12, cy + up - 12), (cx + 12, cy + up - 4), (cx + 9, cy + up + 2), (cx + 4, cy + 6)])
    c.paint(wf, WG, (170, 60, 96), WGD)
    for tipx, tipy in ((cx + 12, cy + up - 12), (cx + 12, cy + up - 4)):
        c.paint(line(cx + 2, cy - 3, tipx, tipy), (30, 14, 28))
    # 꼬리
    c.paint(line(cx - 3, cy + 7, cx - 9, cy + 14) | line(cx - 9, cy + 14, cx - 6, cy + 18) | line(cx - 6, cy + 18, cx - 11, cy + 20), SKD)
    c.paint(poly([(cx - 12, cy + 19), (cx - 8, cy + 18), (cx - 10, cy + 23)]), VEIN)
    # 몸통 (마른, 갈비뼈 드러남)
    c.paint(poly([(cx - 4, cy - 4), (cx + 4, cy - 4), (cx + 3, cy + 8), (cx - 3, cy + 8)]), SK, SKL, SKD)
    for yy in (cy - 2, cy + 1, cy + 4):
        c.dots([(cx - 2, yy), (cx - 1, yy), (cx, yy), (cx + 1, yy)], SKD)
    c.dots([(cx, cy - 3), (cx, cy), (cx - 1, cy + 3)], VEIN)
    # 다리 (갈고리)
    c.paint(cap(cx - 2, cy + 8, cx - 3, cy + 13, 1.3, 0.8), SKD); c.paint(cap(cx + 2, cy + 8, cx + 4, cy + 13, 1.3, 0.8), SK)
    c.dots([(cx - 3, cy + 14), (cx - 4, cy + 14), (cx + 4, cy + 14), (cx + 5, cy + 14)], BONE)
    # 머리 (길쭉한 주둥이 + 뿔)
    hx, hy = cx + 3, cy - 10
    c.paint(blob(hx, hy, 4.4, 4), SK, SKL, SKD)
    c.paint(poly([(hx + 2, hy), (hx + 9, hy + 2), (hx + 8, hy + 5 + jaw), (hx + 1, hy + 5 + jaw)]), SKD, SK, (22, 12, 30))
    c.dots([(x, hy + 3) for x in range(hx + 3, hx + 9)], (22, 6, 14))
    c.dots([(hx + 4, hy + 2), (hx + 6, hy + 2), (hx + 8, hy + 3), (hx + 4, hy + 4 + jaw), (hx + 7, hy + 4 + jaw)], BONE)
    c.paint(poly([(hx - 3, hy - 3), (hx - 6, hy - 10), (hx - 1, hy - 5)]), BONE, None, (150, 140, 120))
    c.paint(poly([(hx + 2, hy - 4), (hx + 3, hy - 11), (hx + 5, hy - 4)]), BONE, None, (150, 140, 120))
    c.dots([(hx - 4, hy - 1), (hx - 5, hy + 1)], SKD)   # 귀
    if eyes_shut: c.dots([(hx + 1, hy - 1), (hx + 2, hy - 1), (hx + 4, hy - 1), (hx + 5, hy - 1)], (20, 10, 20))
    else:
        c.dots([(hx + 1, hy - 1), (hx + 2, hy - 1), (hx + 4, hy - 1), (hx + 5, hy - 1)], EYE); c.dots([(hx + 2, hy - 1), (hx + 5, hy - 1)], (255, 230, 200))
    # 팔 + 갈고리 손톱
    ax, ay = cx + 6 + lunge, cy + 2
    c.paint(cap(cx + 3, cy - 1, ax, ay, 1.4, 1.0), SK, SKL, SKD)
    c.dots(list(line(ax, ay, ax + 4, ay + 2)) + list(line(ax, ay, ax + 3, ay + 4)) + list(line(ax, ay, ax + 4, ay - 1)), BONE)
    c.outline()
    c.glow([(hx + 1, hy - 1), (hx + 2, hy - 1), (hx + 4, hy - 1), (hx + 5, hy - 1)] if not eyes_shut else [], (120, 24, 24))
    return c

def fiend_frames():
    G = fiend
    fr = {}
    fr['idle'] = [G(wing=0), G(bob=-1, wing=1), G(bob=-2, wing=2), G(bob=-1, wing=1)]
    fr['walk'] = [G(bob=-1, wing=2), G(bob=0, wing=1), G(bob=-1, wing=0), G(bob=0, wing=1)]
    fr['attack'] = [G(lean=-2, wing=0, jaw=1), G(lean=-3, wing=2, jaw=2), G(lunge=5, wing=1, jaw=3), G(lunge=8, wing=0, jaw=3), G(lunge=3, wing=1, jaw=1)]
    fr['hurt'] = [G(lean=-3, bob=1, eyes_shut=True, jaw=3)]
    return fr

# ---------------------------------------------------------------- 시트 조립
def tint_white(im, amt=0.55):
    out = im.copy()
    for y in range(S):
        for x in range(S):
            r, g, b, a = out.getpixel((x, y))
            if a: out.putpixel((x, y), (int(r + (255 - r) * amt), int(g + (255 - g) * amt), int(b + (255 - b) * amt), a))
    return out

def add_shadow(im, cx=23, cy=44, rx=13, ry=2.2):
    s = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0: s.putpixel((x, y), (0, 0, 0, 90))
    return Image.alpha_composite(s, im)

def rotate_fall(im, angle, bottom=44, x_off=0):
    big = Image.new("RGBA", (S * 2, S * 2), (0, 0, 0, 0)); big.paste(im, (S // 2, S // 2))
    r = big.rotate(angle, resample=Image.NEAREST, center=(S, S + 6)); bb = r.getbbox(); piece = r.crop(bb)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    px = max(0, min(S - piece.width, (S - piece.width) // 2 + x_off)); py = bottom - piece.height + 1
    out.paste(piece, (px, py)); return out

def build_sheet(fr, order=('idle', 'walk', 'attack', 'hurt', 'death'), floaty=False):
    anims = {k: [add_shadow(f.image()) for f in v] for k, v in fr.items()}
    hurt = fr['hurt'][0].image()
    anims['hurt'] = [add_shadow(tint_white(hurt))]
    if floaty:   # 공중 몹: 떨어져 눕는다
        anims['death'] = [add_shadow(rotate_fall(tint_white(hurt, 0.35), 20, 44, -1)), add_shadow(rotate_fall(hurt, 60, 44, -2), cx=22, rx=12), add_shadow(rotate_fall(hurt, 90, 44, -1), cx=22, rx=15)]
    else:
        anims['death'] = [add_shadow(rotate_fall(tint_white(hurt, 0.35), 22, 44, -1)), add_shadow(rotate_fall(hurt, 58, 44, -2), cx=22, rx=14), add_shadow(rotate_fall(hurt, 90, 44, -1), cx=22, rx=18)]
    sheet = Image.new("RGBA", (5 * S, len(order) * S), (0, 0, 0, 0))
    for r, name in enumerate(order):
        for i, im in enumerate(anims[name]): sheet.paste(im, (i * S, r * S))
    return sheet

def main(out):
    spec = {'goblin': (ghoul_frames, False), 'archer': (archer_frames, False), 'shaman': (necro_frames, False), 'brute': (brute_frames, False), 'imp': (fiend_frames, True)}
    for name, (fn, fl) in spec.items():
        sh_ = build_sheet(fn(), floaty=fl); sh_.save(f'{out}/{name}_sheet48.png')
    # 미리보기
    names = list(spec)
    pv = Image.new("RGBA", (S * 5 * 4 // 2 + 10, S * 4 * len(names) // 2 + 10), (46, 40, 56, 255))
    for r, n in enumerate(names):
        im = Image.open(f'{out}/{n}_sheet48.png')
        for k, (row, fr_) in enumerate([(0, 0), (0, 2), (2, 2), (2, 3), (3, 0), (4, 1)]):
            tile = im.crop((fr_ * S, row * S, fr_ * S + S, row * S + S)).resize((S * 3, S * 3), Image.NEAREST)
            pv.paste(tile, (k * S * 3, r * S * 3), tile)
    pv = pv.crop((0, 0, S * 3 * 6, S * 3 * len(names))); pv.save(f'{out}/monsters_preview.png')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
