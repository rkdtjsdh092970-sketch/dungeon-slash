#!/usr/bin/env python3
"""지역 몬스터: 슬라임 / 버섯 / 박쥐 / 전갈 / 늑대 / 눈알 / 골렘 / 두꺼비  (48x48, 오른쪽을 봄)
귀여움(초반) -> 섬뜩함(후반)은 mood 파라미터와 팔레트로 표현한다."""
import math, sys
from PIL import Image
sys.path.insert(0, '/home/claude/art')
from art3 import *

# ---------------------------------------------------------------- 슬라임
def slime(pal, mood='cute', sq=0.0, stretch=0.0, lift=0, lunge=0, mouth=0, hurt=False, flat=0.0, drip=0):
    c = Cv(); B, BL, BD, IN = pal
    ry = 10 - sq * 3 + stretch * 4; rx = 14 + sq * 3 - stretch * 2
    cx = 23 + lunge; cy = 44 - ry * 0.95 - lift
    if flat:
        ry = 10 * (1 - flat) + 2; rx = 14 + flat * 8; cy = 44 - ry * 0.95
    body = {(x, y) for (x, y) in blob(cx, cy, rx, ry) if y <= 44}
    c.paint(body, B, BL, BD, BD)
    c.paint({(x, y) for (x, y) in blob(cx, cy + 1, rx - 4, ry - 4)}, IN)
    c.dots([(int(cx - rx * 0.5), int(cy - ry * 0.55)), (int(cx - rx * 0.5) + 1, int(cy - ry * 0.55)), (int(cx - rx * 0.5), int(cy - ry * 0.55) + 1)], (255, 255, 255))   # 광택
    if drip:
        c.paint(cap(cx - 6, cy + ry - 2, cx - 6, 44, 1.2) | cap(cx + 8, cy + ry - 2, cx + 8, 44, 1.0), B)
    if flat < 0.6:
        ex, ey = int(cx + 3), int(cy - 1)
        if mood == 'cute':
            if hurt:
                c.dots([(ex - 5, ey - 1), (ex - 4, ey), (ex - 5, ey + 1), (ex - 3, ey - 1), (ex - 3, ey + 1), (ex + 3, ey - 1), (ex + 4, ey), (ex + 3, ey + 1), (ex + 5, ey - 1), (ex + 5, ey + 1)], (40, 30, 50))
            else:
                for dx in (-5, 3):
                    c.paint(blob(ex + dx + 1, ey, 2.4, 3), (255, 255, 255)); c.dots([(ex + dx + 2, ey), (ex + dx + 2, ey + 1), (ex + dx + 1, ey + 1)], (30, 24, 44)); c.dots([(ex + dx + 2, ey - 1)], (255, 255, 255))
            my = ey + 5
            if mouth: c.paint(blob(ex, my, 2.5, 1.8 + mouth * 0.5), (80, 24, 40)); c.dots([(ex, my + 1)], (240, 120, 130))
            else: c.dots([(ex - 2, my), (ex - 1, my + 1), (ex, my + 1), (ex + 1, my + 1), (ex + 2, my)], (60, 30, 50))
            c.dots([(ex - 7, ey + 3), (ex - 6, ey + 3), (ex + 5, ey + 3), (ex + 6, ey + 3)], (255, 150, 160))
        else:
            for dx in (-5, 3):
                c.dots([(ex + dx, ey - 2), (ex + dx + 1, ey - 1), (ex + dx + 2, ey - 1), (ex + dx + 3, ey - 1 - (dx > 0) * 0), (ex + dx + 4, ey - 2 + 1)], (20, 8, 14))
                c.paint(blob(ex + dx + 2, ey + 1, 1.8, 1.8), (255, 70, 40)); c.dots([(ex + dx + 2, ey)], (255, 230, 180))
            my = ey + 5
            c.paint(blob(ex, my, 5, 2 + mouth), (24, 6, 12))
            c.dots([(ex - 3, my - 1), (ex - 1, my - 1), (ex + 1, my - 1), (ex + 3, my - 1), (ex - 2, my + 2), (ex + 2, my + 2)], (240, 232, 214))
            c.paint(blob(int(cx - 4), int(cy + 3), 2.2, 2.6), (230, 224, 206)); c.dots([(int(cx - 5), int(cy + 3)), (int(cx - 3), int(cy + 3))], (20, 10, 16))   # 몸속 해골
    c.outline()
    if mood != 'cute' and flat < 0.6: c.glow([(int(cx + 3) - 5 + 2, int(cy - 1) + 1), (int(cx + 3) + 3 + 2, int(cy - 1) + 1)], tuple(min(255, v) for v in (120, 20, 20)))
    return c

def slime_frames(pal, mood):
    G = lambda **k: slime(pal, mood, **k)
    fr = {}
    fr['idle'] = [G(), G(sq=0.5), G(sq=1.0), G(sq=0.5)]
    fr['walk'] = [G(sq=1.0), G(stretch=1.0, lift=4), G(stretch=0.6, lift=2), G(sq=1.0, lunge=2)]
    fr['attack'] = [G(sq=1.0, lunge=-2), G(sq=1.2, lunge=-3), G(stretch=1.2, lunge=7, mouth=2), G(stretch=0.8, lunge=10, mouth=2), G(lunge=3)]
    fr['hurt'] = [G(sq=1.6, hurt=True, lunge=-2)]
    fr['_death'] = [G(sq=2, flat=0.3), G(flat=0.6, drip=1), G(flat=0.9, drip=1)]
    return fr

SLIME_G = ((126, 214, 96), (190, 250, 150), (60, 140, 70), (160, 230, 120))
SLIME_T = ((110, 120, 70), (164, 176, 100), (56, 64, 44), (140, 90, 140))
SLIME_L = ((210, 70, 40), (255, 150, 70), (110, 24, 20), (255, 190, 60))

# ---------------------------------------------------------------- 버섯
def mush(pal, mood='cute', bob=0, lean=0, bl=0, fl=0, lift=0, arm=0, spore=0, mouth=0, hurt=False):
    c = Cv(); CAP, CAPL, CAPD, SPOT, STEM, STEMD = pal
    cx = 23 + lean
    # 다리
    c.paint(cap(20, 38, 19 + bl, 43, 1.8, 1.4) | blob(19 + bl, 44, 3, 1.2), STEMD)
    c.paint(cap(27, 38, 28 + fl, 43 - lift, 2, 1.5) | blob(29 + fl, 44 - lift, 3.2, 1.2), STEM, None, STEMD)
    # 줄기 몸
    c.paint(poly([(cx - 6, 24 + bob), (cx + 6, 24 + bob), (cx + 7, 38), (cx - 7, 38)]), STEM, (250, 236, 210), STEMD)
    # 갓
    capp = {(x, y) for (x, y) in blob(cx, 20 + bob, 15, 11) if y <= 26 + bob}
    c.paint(capp, CAP, CAPL, CAPD, CAPD)
    for (dx, dy, r) in ((-7, 14, 2.2), (2, 11, 2.6), (9, 17, 2), (-1, 19, 1.5), (-10, 20, 1.4)):
        c.paint(blob(cx + dx, dy + bob, r, r), SPOT)
    # 얼굴
    ex, ey = cx + 2, 30 + bob
    if mood == 'cute':
        if hurt: c.dots([(ex - 4, ey - 1), (ex - 3, ey), (ex - 4, ey + 1), (ex + 3, ey - 1), (ex + 4, ey), (ex + 3, ey + 1)], (40, 30, 40))
        else:
            for dx in (-4, 3): c.paint(blob(ex + dx, ey, 1.6, 2.2), (30, 24, 36)); c.dots([(ex + dx, ey - 1)], (255, 255, 255))
        c.dots([(ex - 1, ey + 3), (ex, ey + 4), (ex + 1, ey + 3)] if not mouth else [(ex - 1, ey + 3), (ex, ey + 3), (ex + 1, ey + 3), (ex, ey + 4)], (80, 40, 50))
        c.dots([(ex - 6, ey + 2), (ex + 5, ey + 2)], (255, 150, 150))
    else:
        for dx in (-4, 3):
            c.dots([(ex + dx - 1, ey - 2), (ex + dx, ey - 1), (ex + dx + 1, ey - 1), (ex + dx + 2, ey - 2)], (20, 8, 20)); c.paint(blob(ex + dx + 0.5, ey, 1.5, 1.5), (200, 255, 80))
        c.paint(blob(ex, ey + 4, 3.5, 1.6 + mouth), (20, 6, 16)); c.dots([(ex - 2, ey + 3), (ex, ey + 3), (ex + 2, ey + 3)], (230, 230, 200))
    # 팔
    c.paint(cap(cx + 6, 28 + bob, cx + 11 + arm, 31 + bob - arm // 2, 1.6, 1.3), STEM, None, STEMD)
    c.paint(cap(cx - 6, 28 + bob, cx - 10, 32 + bob, 1.5, 1.2), STEMD)
    if spore:
        for i in range(spore * 5):
            c.dots([(cx + 10 + (i * 5) % 14, 22 + (i * 7) % 12 + bob)], (210, 255, 120) if mood != 'cute' else (255, 236, 180))
    c.outline()
    return c

def mush_frames(pal, mood):
    G = lambda **k: mush(pal, mood, **k)
    fr = {}
    fr['idle'] = [G(), G(bob=1), G(bob=1, arm=1), G(bob=0, arm=1)]
    fr['walk'] = [G(bl=-2, fl=2), G(bob=-1, lift=2), G(bl=2, fl=-2), G(bob=-1)]
    fr['attack'] = [G(lean=-2, arm=-2), G(lean=-3, bob=-1, spore=1), G(lean=2, mouth=2, spore=2), G(lean=3, mouth=2, spore=3), G(spore=2)]
    fr['hurt'] = [G(lean=-3, bob=1, hurt=True, mouth=1)]
    return fr

MUSH_C = ((220, 64, 64), (255, 130, 120), (140, 30, 44), (255, 244, 230), (246, 226, 190), (176, 140, 110))
MUSH_T = ((96, 60, 120), (150, 100, 170), (50, 26, 70), (190, 255, 90), (150, 140, 110), (80, 74, 60))

# ---------------------------------------------------------------- 박쥐
def bat(pal, mood='dark', bob=0, wing=0, lean=0, lunge=0, mouth=0, hurt=False):
    c = Cv(); B, BL, BD, WG, WGD = pal
    cx, cy = 24 + lean + lunge, 24 + bob
    up = [-10, -3, 4][wing]
    wb = poly([(cx - 3, cy - 1), (cx - 22, cy + up - 8), (cx - 18, cy + up), (cx - 14, cy + up + 3), (cx - 10, cy + up + 8), (cx - 4, cy + 6)])
    c.paint(wb, WG, None, WGD)
    for tx, ty in ((cx - 22, cy + up - 8), (cx - 18, cy + up), (cx - 14, cy + up + 3)): c.paint(line(cx - 3, cy - 1, tx, ty), (30, 14, 26))
    wf = poly([(cx + 2, cy - 2), (cx + 15, cy + up - 12), (cx + 14, cy + up - 3), (cx + 10, cy + up + 3), (cx + 4, cy + 5)])
    c.paint(wf, WG, (WG[0] + 40, WG[1] + 20, WG[2] + 30), WGD)
    c.paint(blob(cx, cy + 2, 5.5, 6), B, BL, BD)
    c.paint(blob(cx + 3, cy - 6, 5, 4.5), B, BL, BD)
    c.paint(poly([(cx, cy - 9), (cx - 2, cy - 15), (cx + 3, cy - 10)]), B, None, BD); c.paint(poly([(cx + 4, cy - 10), (cx + 7, cy - 15), (cx + 8, cy - 8)]), B, None, BD)
    c.paint(poly([(cx + 6, cy - 5), (cx + 11, cy - 4), (cx + 6, cy - 2)]), BD)
    if mood == 'cute':
        for dx in (1, 5):
            c.paint(blob(cx + dx + 1, cy - 6, 1.5, 2), (255, 255, 255)); c.dots([(cx + dx + 2, cy - 6)], (30, 20, 40))
        c.dots([(cx + 8, cy - 3)], (40, 20, 30))
    else:
        c.dots([(cx + 1, cy - 7), (cx + 2, cy - 7), (cx + 4, cy - 7), (cx + 5, cy - 7)], (255, 70, 60)); c.dots([(cx + 2, cy - 7), (cx + 5, cy - 7)], (255, 230, 200))
        c.dots([(cx + 7, cy - 3), (cx + 7, cy - 2 + mouth), (cx + 9, cy - 3), (cx + 9, cy - 2 + mouth)], (240, 235, 215))
    c.paint(cap(cx - 1, cy + 7, cx - 2, cy + 12, 1.1, 0.7) | cap(cx + 2, cy + 7, cx + 3, cy + 12, 1.1, 0.7), BD)
    c.outline()
    if mood != 'cute': c.glow([(cx + 1, cy - 7), (cx + 2, cy - 7), (cx + 4, cy - 7), (cx + 5, cy - 7)], (120, 24, 24))
    return c

def bat_frames(pal, mood):
    G = lambda **k: bat(pal, mood, **k)
    fr = {}
    fr['idle'] = [G(wing=0), G(bob=-1, wing=1), G(bob=-2, wing=2), G(bob=-1, wing=1)]
    fr['walk'] = fr['idle']
    fr['attack'] = [G(lean=-2, wing=0), G(lean=-3, wing=2, mouth=1), G(lunge=6, wing=1, mouth=2), G(lunge=9, wing=0, mouth=2), G(lunge=3, wing=1)]
    fr['hurt'] = [G(lean=-3, bob=1, wing=2, hurt=True)]
    return fr

BAT_D = ((70, 52, 84), (118, 90, 132), (36, 26, 48), (92, 36, 70), (52, 18, 44))
BAT_C = ((150, 110, 190), (200, 170, 230), (96, 66, 130), (170, 130, 210), (110, 76, 150))

# ---------------------------------------------------------------- 전갈
def scorp(pal, bob=0, lean=0, tail=0, claw=0, legs=0, mouth=0, hurt=False):
    c = Cv(); B, BL, BD, CL = pal
    cx = 22 + lean; gy = 43
    for i, lx in enumerate((14, 18, 22, 26)):   # 다리 8개 (앞뒤)
        ph = (legs + i) % 2
        c.paint(line(lx, 36 + bob, lx - 3, 40) | line(lx - 3, 40, lx - 4 + ph, gy), BD)
        c.paint(line(lx + 2, 36 + bob, lx + 5, 40) | line(lx + 5, 40, lx + 6 - ph, gy), BD)
    # 몸통
    c.paint(blob(cx, 34 + bob, 11, 5.5), B, BL, BD)
    c.paint(blob(cx - 12, 35 + bob, 4, 3.5), B, None, BD)
    for sx in (-5, 0, 5):
        c.dots([(cx + sx, 30 + bob), (cx + sx, 31 + bob), (cx + sx + 1, 32 + bob)], BD)
    # 꼬리 (마디 + 독침)
    tx, ty = cx - 15, 33 + bob
    segs = [(tx, ty), (tx - 3, ty - 6), (tx - 2, ty - 12 - tail), (tx + 3, ty - 17 - tail), (tx + 9, ty - 17 - tail - 1)]
    for i in range(len(segs) - 1):
        c.paint(cap(segs[i][0], segs[i][1], segs[i + 1][0], segs[i + 1][1], 2.6 - i * 0.3, 2.3 - i * 0.3), B, BL, BD)
    sx_, sy_ = segs[-1]
    c.paint(poly([(sx_ + 1, sy_ - 2), (sx_ + 6, sy_ + 3), (sx_ + 2, sy_ + 3)]), (240, 230, 200), None, (150, 140, 110))
    c.dots([(sx_ + 6, sy_ + 4), (sx_ + 6, sy_ + 5)], (120, 255, 90))
    # 집게
    hx = cx + 12 + lean
    c.paint(cap(cx + 8, 32 + bob, hx + claw, 31 + bob - claw, 2.2, 1.8), B, BL, BD)
    c.paint(poly([(hx + claw, 28 + bob - claw), (hx + claw + 6, 30 + bob - claw), (hx + claw + 2, 33 + bob - claw)]), CL, (255, 150, 120), BD)
    c.paint(poly([(hx + claw, 35 + bob - claw), (hx + claw + 6, 34 + bob - claw), (hx + claw + 2, 32 + bob - claw)]), CL, None, BD)
    # 머리 (눈)
    c.paint(blob(cx + 9, 31 + bob, 3.5, 3), B, BL, BD)
    c.dots([(cx + 9, 30 + bob), (cx + 11, 30 + bob)], (255, 70, 40)); c.dots([(cx + 8, 29 + bob), (cx + 12, 29 + bob)], (26, 10, 14))
    c.outline()
    return c

def scorp_frames(pal):
    G = lambda **k: scorp(pal, **k)
    fr = {}
    fr['idle'] = [G(), G(bob=0, tail=1), G(bob=1, tail=2, claw=1), G(bob=0, tail=1)]
    fr['walk'] = [G(legs=0, bob=0), G(legs=1, bob=-1), G(legs=0, bob=0), G(legs=1, bob=-1)]
    fr['attack'] = [G(tail=3, lean=-2), G(tail=5, lean=-3, claw=-2), G(tail=-3, lean=3, claw=3), G(tail=-4, lean=4, claw=4, bob=1), G(tail=0)]
    fr['hurt'] = [G(lean=-3, bob=1, tail=4, hurt=True)]
    return fr

SCORP = ((184, 140, 70), (230, 190, 110), (110, 74, 36), (210, 90, 50))

# ---------------------------------------------------------------- 늑대 / 지옥견
def wolf(pal, bob=0, lean=0, legs=0, jaw=0, tail=0, hurt=False, crouch=0, fire=False):
    c = Cv(); B, BL, BD, EYE, MANE = pal
    gy = 44
    body_y = 28 + crouch + bob
    # 뒷다리/앞다리 (두 쌍)
    for (hx, k, col) in ((12, 0, BD), (17, 1, B), (26, 0, BD), (31, 1, B)):
        ph = (legs + k) % 2
        c.paint(cap(hx, body_y + 4, hx - 2 + ph * 3, body_y + 11, 2.4, 1.6) | cap(hx - 2 + ph * 3, body_y + 11, hx - 1 + ph * 4, gy - 1, 1.6, 1.3) | blob(hx + ph * 4, gy - 1, 3, 1.2), col, BL if col == B else None, BD)
    # 몸통 + 갈기
    c.paint(poly([(8, body_y + 2), (14, body_y - 6), (28, body_y - 6), (36, body_y - 2), (36, body_y + 6), (22, body_y + 8), (9, body_y + 6)]), B, BL, BD)
    for i in range(7):
        c.paint(poly([(14 + i * 3, body_y - 6), (15 + i * 3, body_y - 10 - (i % 2) * 2), (17 + i * 3, body_y - 6)]), MANE, None, BD)
    # 꼬리
    c.paint(cap(9, body_y, 3, body_y - 4 - tail, 2.2, 1.0) | cap(3, body_y - 4 - tail, 1, body_y - 9 - tail, 1.0, 0.6), B, None, BD)
    # 머리
    hx, hy = 38 + lean, body_y - 4
    c.paint(blob(hx, hy, 5, 4.5), B, BL, BD)
    c.paint(poly([(hx + 2, hy - 1), (hx + 11, hy + 1), (hx + 10, hy + 4), (hx + 2, hy + 4)]), B, BL, BD)
    c.paint(poly([(hx + 2, hy + 3), (hx + 10, hy + 4), (hx + 9, hy + 6 + jaw), (hx + 2, hy + 6 + jaw)]), BD, B, (30, 20, 24))
    c.dots([(x, hy + 4) for x in range(hx + 3, hx + 10)], (26, 8, 12))
    c.dots([(hx + 4, hy + 3), (hx + 6, hy + 3), (hx + 8, hy + 3), (hx + 5, hy + 5 + jaw), (hx + 8, hy + 5 + jaw)], (244, 240, 224))
    c.dots([(hx + 11, hy), (hx + 11, hy + 1)], (20, 10, 14))
    c.paint(poly([(hx - 2, hy - 4), (hx - 3, hy - 10), (hx + 2, hy - 5)]), B, BL, BD); c.paint(poly([(hx + 2, hy - 5), (hx + 4, hy - 10), (hx + 6, hy - 4)]), B, BL, BD)
    c.dots([(hx + 3, hy - 1), (hx + 4, hy - 1), (hx + 5, hy - 1)], (20, 10, 14)); c.dots([(hx + 4, hy - 1), (hx + 5, hy - 1)], EYE)
    c.outline()
    c.glow([(hx + 4, hy - 1), (hx + 5, hy - 1)], tuple(int(v * 0.5) for v in EYE))
    return c

def wolf_frames(pal):
    G = lambda **k: wolf(pal, **k)
    fr = {}
    fr['idle'] = [G(), G(bob=0, tail=1), G(bob=1, tail=2, jaw=1), G(bob=0, tail=1)]
    fr['walk'] = [G(legs=0, bob=0), G(legs=1, bob=-1), G(legs=0, bob=0), G(legs=1, bob=-1)]
    fr['attack'] = [G(lean=-2, crouch=3, tail=2), G(lean=-3, crouch=4, jaw=1), G(lean=5, crouch=-2, jaw=3, legs=1), G(lean=7, crouch=-3, jaw=3, legs=0, bob=1), G(lean=2, jaw=1)]
    fr['hurt'] = [G(lean=-3, bob=2, jaw=3, hurt=True)]
    return fr

WOLF_I = ((196, 214, 230), (244, 250, 255), (120, 146, 176), (80, 220, 255), (150, 190, 230))
WOLF_H = ((42, 30, 34), (92, 56, 54), (20, 14, 18), (255, 120, 30), (255, 90, 30))

# ---------------------------------------------------------------- 눈알
def eye(pal, bob=0, lean=0, blink=0, pupil=0, beam=0, hurt=False, tent=0):
    c = Cv(); FL, FLD, VEIN, IRIS, TENT = pal
    cx, cy = 24 + lean, 22 + bob
    for i, ox in enumerate((-9, -4, 2, 8)):
        sw = ((tent + i) % 2) * 2 - 1
        c.paint(line(cx + ox, cy + 8, cx + ox + sw * 2, cy + 16) | line(cx + ox + sw * 2, cy + 16, cx + ox - sw * 2, cy + 23) | line(cx + ox - sw * 2, cy + 23, cx + ox + sw, cy + 28), TENT)
        c.paint(line(cx + ox + 1, cy + 8, cx + ox + sw * 2 + 1, cy + 16), TENT)
    c.paint(blob(cx, cy, 13, 13), FL, (255, 250, 240), FLD, FLD)
    for (x0, y0, x1, y1) in ((cx - 12, cy - 4, cx - 5, cy - 2), (cx - 11, cy + 6, cx - 4, cy + 4), (cx - 3, cy - 12, cx - 1, cy - 6), (cx + 6, cy - 11, cx + 3, cy - 6), (cx - 2, cy + 12, cx, cy + 7)):
        c.dots(list(line(x0, y0, x1, y1)), VEIN)
    ix, iy = cx + 4 + pupil, cy
    if blink >= 2: c.paint(line(cx - 8, cy, cx + 12, cy) | line(cx - 8, cy + 1, cx + 12, cy + 1), FLD)
    else:
        ry = 8 if blink == 0 else 4
        c.paint(blob(ix, iy, 8, ry), IRIS, (min(255, IRIS[0] + 60), min(255, IRIS[1] + 60), min(255, IRIS[2] + 60)), tuple(v // 2 for v in IRIS))
        c.paint(blob(ix + 1, iy, 3, ry * 0.7), (12, 6, 14))
        c.dots([(ix - 2, iy - 3), (ix - 3, iy - 2)], (255, 255, 255))
    if beam:
        c.paint(poly([(ix + 3, iy - 1), (46, iy - 3 - beam), (46, iy + 3 + beam), (ix + 3, iy + 1)]), (255, 90, 60), (255, 210, 160), (160, 20, 20))
    c.outline()
    if not beam: c.glow([(ix + 1, iy)], tuple(v // 2 for v in IRIS))
    return c

def eye_frames(pal):
    G = lambda **k: eye(pal, **k)
    fr = {}
    fr['idle'] = [G(), G(bob=-1, tent=1), G(bob=-2, tent=2, pupil=1), G(bob=-1, tent=1, blink=1)]
    fr['walk'] = [G(tent=0), G(bob=-1, tent=1), G(tent=2), G(bob=-1, tent=3)]
    fr['attack'] = [G(lean=-2, pupil=-2), G(lean=-3, pupil=-3, blink=0), G(lean=1, beam=1, pupil=2), G(lean=2, beam=3, pupil=2), G(lean=0, beam=1)]
    fr['hurt'] = [G(lean=-3, bob=1, blink=2)]
    return fr

EYE_P = ((236, 226, 224), (170, 130, 140), (190, 40, 60), (170, 80, 255), (96, 40, 90))

# ---------------------------------------------------------------- 골렘
def golem(pal, bob=0, lean=0, legs=0, arm=(36, 34), jaw=0, shoulder=0, hurt=False):
    c = Cv(); R, RL, RD, GLOW, CR = pal
    gy = 45
    c.paint(cap(19, 34 + bob, 18 + legs, 40, 4.2, 3.6) | blob(18 + legs, 43, 5.2, 2.4), RD, None, (30, 24, 28))
    c.paint(cap(28, 34 + bob, 29 - legs, 40, 4.4, 3.8) | blob(30 - legs, 43, 5.6, 2.4), R, RL, RD)
    c.paint(poly([(12 + lean, 18 + bob), (36 + lean, 17 + bob), (38 + lean, 29 + bob), (31, 38 + bob), (17, 38 + bob), (11 + lean, 29 + bob)]), R, RL, RD, RD)
    for (x0, y0, x1, y1) in ((18, 22, 23, 28), (30, 20, 28, 27), (22, 31, 29, 33)):
        c.dots(list(line(x0 + lean, y0 + bob, x1 + lean, y1 + bob)), CR)
    c.paint(blob(24 + lean, 28 + bob, 3, 3), GLOW); c.dots([(24 + lean, 28 + bob), (23 + lean, 27 + bob)], (255, 255, 230))
    # 머리
    hx, hy = 28 + lean, 11 + bob
    c.paint(poly([(hx - 6, hy + 5), (hx - 7, hy - 3), (hx + 7, hy - 3), (hx + 8, hy + 5)]), R, RL, RD)
    c.dots([(hx - 3, hy), (hx - 2, hy), (hx + 2, hy), (hx + 3, hy), (hx - 3, hy + 1), (hx + 2, hy + 1)], (20, 14, 18)); c.dots([(hx - 2, hy), (hx + 3, hy)], GLOW)
    c.dots([(x, hy + 4) for x in range(hx - 3, hx + 5)], (20, 14, 18)); c.dots([(hx - 2, hy + 4 + jaw), (hx + 1, hy + 4 + jaw), (hx + 4, hy + 4 + jaw)], RL)
    # 어깨 바위 + 팔
    c.paint(blob(34 + lean, 20 + bob - shoulder, 5.5, 5), R, RL, RD)
    c.paint(blob(13 + lean, 21 + bob, 5, 5), RD)
    c.paint(cap(34 + lean, 22 + bob, arm[0] - 2, arm[1] - 6, 4.2, 3.8) | blob(arm[0], arm[1], 5.4, 5.4), R, RL, RD)
    c.dots([(arm[0] - 1, arm[1] - 1), (arm[0] + 2, arm[1] + 1)], CR)
    c.paint(cap(13 + lean, 24 + bob, 11, 34 + bob, 3.8, 3.4) | blob(11, 37 + bob, 4.6, 4.6), RD)
    c.outline()
    c.glow([(24 + lean, 28 + bob)], tuple(v // 2 for v in GLOW))
    return c

def golem_frames(pal):
    G = lambda **k: golem(pal, **k)
    fr = {}
    fr['idle'] = [G(), G(bob=0, arm=(36, 35)), G(bob=1, arm=(36, 36)), G(bob=1, arm=(36, 35))]
    fr['walk'] = [G(legs=-2), G(bob=-1), G(legs=2), G(bob=-1)]
    fr['attack'] = [G(lean=-2, arm=(31, 14), shoulder=3, jaw=1), G(lean=-3, bob=-1, arm=(33, 8), shoulder=4, jaw=2), G(lean=3, arm=(42, 30), jaw=3), G(lean=4, bob=1, arm=(44, 38), jaw=3), G(lean=1, arm=(38, 35), jaw=1)]
    fr['hurt'] = [G(lean=-3, bob=1, arm=(34, 40), jaw=3, hurt=True)]
    return fr

GOLEM_R = ((120, 112, 108), (170, 162, 156), (66, 60, 62), (255, 170, 60), (40, 34, 36))
GOLEM_I = ((150, 196, 226), (226, 246, 255), (76, 118, 160), (110, 230, 255), (50, 80, 120))
GOLEM_M = ((58, 44, 46), (110, 76, 70), (26, 18, 20), (255, 110, 30), (255, 150, 40))

# ---------------------------------------------------------------- 두꺼비
def frog(pal, bob=0, lean=0, jump=0, mouth=0, tongue=0, hurt=False, bl=0):
    c = Cv(); B, BL, BD, EYE = pal
    cx = 22 + lean; by = 36 + bob - jump
    c.paint(cap(14 + bl, by + 4, 10 + bl, 40 - jump, 3.2, 2.2) | cap(10 + bl, 40 - jump, 6 + bl, 44, 2.2, 1.6) | blob(8 + bl, 44, 5, 1.4), BD)
    c.paint(cap(30, by + 4, 34, 41 - jump, 3, 2.1) | blob(35, 44, 4.5, 1.4), B, BL, BD)
    c.paint(blob(cx, by, 15, 9), B, BL, BD, BD)
    for (dx, dy, r) in ((-6, -4, 1.4), (-1, -6, 1.2), (6, -3, 1.5), (-9, 1, 1.1)):
        c.paint(blob(cx + dx, by + dy, r, r), BD)
    c.paint(blob(cx, by + 3, 11, 5), (206, 214, 150) if B[1] > 100 else (170, 150, 190))
    hx = cx + 11
    c.paint(blob(hx, by - 4, 6, 5), B, BL, BD)
    c.paint(blob(hx - 1, by - 10, 3.4, 3.4), B, BL, BD); c.paint(blob(hx + 5, by - 10, 3.4, 3.4), B, BL, BD)
    for ex in (hx - 1, hx + 5):
        c.paint(blob(ex, by - 10, 2.2, 2.2), (240, 230, 160)); c.dots([(ex + 1, by - 10), (ex + 1, by - 9)], (20, 10, 16)); c.dots([(ex, by - 11)], EYE)
    c.paint(blob(hx + 2, by - 2, 7, 2.6 + mouth), (80, 20, 36))
    c.dots([(hx - 3, by - 2), (hx - 1, by - 2), (hx + 5, by - 2), (hx + 7, by - 2)], (240, 236, 220))
    if tongue: c.paint(cap(hx + 4, by - 1, hx + 4 + tongue * 6, by - 2, 1.4, 1.0) | blob(hx + 5 + tongue * 6, by - 2, 2.2, 2.2), (240, 90, 120))
    c.outline()
    return c

def frog_frames(pal):
    G = lambda **k: frog(pal, **k)
    fr = {}
    fr['idle'] = [G(), G(bob=1), G(bob=1, mouth=1), G(bob=0)]
    fr['walk'] = [G(bl=0), G(jump=5, bl=-2), G(jump=3, bl=-1), G(bl=0, bob=1)]
    fr['attack'] = [G(lean=-2, bob=2), G(lean=-3, bob=3, mouth=1), G(lean=1, mouth=3, tongue=2), G(lean=2, mouth=3, tongue=4), G(lean=0, mouth=1, tongue=1)]
    fr['hurt'] = [G(lean=-3, bob=2, mouth=2, hurt=True)]
    return fr

FROG_P = ((100, 120, 70), (150, 170, 100), (50, 66, 44), (255, 80, 60))

# ---------------------------------------------------------------- 시트
def build_custom(fr, floaty=False):
    d = fr.pop('_death', None)
    sheet = build_sheet(fr, floaty=floaty)
    if d:   # 슬라임 등: 녹아내리는 죽음
        for i, f in enumerate(d):
            im = add_shadow(f.image(), rx=14 + i * 3)
            sheet.paste(Image.new("RGBA", (S, S), (0, 0, 0, 0)), (i * S, 4 * S)); sheet.paste(im, (i * S, 4 * S))
    return sheet

def main(out):
    jobs = {
        'slime': slime_frames(SLIME_G, 'cute'), 'slimeT': slime_frames(SLIME_T, 'angry'), 'slimeL': slime_frames(SLIME_L, 'angry'),
        'mush': mush_frames(MUSH_C, 'cute'), 'mushT': mush_frames(MUSH_T, 'angry'),
        'bat': bat_frames(BAT_D, 'dark'), 'batC': bat_frames(BAT_C, 'cute'),
        'scorp': scorp_frames(SCORP), 'wolf': wolf_frames(WOLF_I), 'wolfH': wolf_frames(WOLF_H),
        'eye': eye_frames(EYE_P), 'golem': golem_frames(GOLEM_R), 'golemI': golem_frames(GOLEM_I), 'golemM': golem_frames(GOLEM_M), 'frog': frog_frames(FROG_P),
    }
    for name, fr in jobs.items():
        build_custom(fr, floaty=name in ('bat', 'batC', 'eye')).save(f'{out}/{name}_sheet48.png')
    names = list(jobs)
    cols = 6
    pv = Image.new("RGBA", (S * 2 * cols, S * 2 * len(names)), (46, 40, 56, 255))
    for r, n in enumerate(names):
        im = Image.open(f'{out}/{n}_sheet48.png')
        for k, (row, fr_) in enumerate([(0, 0), (0, 2), (1, 1), (2, 3), (3, 0), (4, 2)]):
            t = im.crop((fr_ * S, row * S, fr_ * S + S, row * S + S)).resize((S * 2, S * 2), Image.NEAREST); pv.paste(t, (k * S * 2, r * S * 2), t)
    pv.save(f'{out}/region_preview.png')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
