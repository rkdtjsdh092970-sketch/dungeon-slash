#!/usr/bin/env python3
"""추가 적(궁수·주술사·정예·임프)과 보스 10종 도트 생성기"""
import math, json, sys
from PIL import Image, ImageDraw
sys.path.insert(0, '/home/claude/art')
from gen_sprites import rect_pts, line_pts, ellipse_pts, shift, tint_white, rotate_fall, add_shadow, WP, OUT, SPEC

W = H = 32
def C(r, g, b): return (r, g, b)

class Cv:
    def __init__(self, w=32, h=32):
        self.w, self.h = w, h
        self.g = [[None] * w for _ in range(h)]
    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h: self.g[y][x] = c
    def get(self, x, y):
        return self.g[y][x] if 0 <= x < self.w and 0 <= y < self.h else None
    def paint(self, pts, base, light=None, dark=None):
        S = set(pts)
        for (x, y) in S:
            c = base
            if light and (x, y - 1) not in S: c = light
            elif dark and (x, y + 1) not in S: c = dark
            self.put(x, y, c)
    def dots(self, lst, c):
        for x, y in lst: self.put(x, y, c)
    def outline(self, col=OUT):
        filled = {(x, y) for y in range(self.h) for x in range(self.w) if self.g[y][x] is not None}
        ol = set()
        for (x, y) in filled:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in filled and 0 <= n[0] < self.w and 0 <= n[1] < self.h: ol.add(n)
        for x, y in ol: self.g[y][x] = col
    def image(self):
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                c = self.g[y][x]
                if c is not None: im.putpixel((x, y), c + (255,) if len(c) == 3 else c)
        return im

def poly_pts(points, w=64, h=64):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return {(x, y) for y in range(h) for x in range(w) if m.getpixel((x, y))}

def sh(c, f):  # 색 밝기 조절
    return tuple(max(0, min(255, int(v * f))) for v in c)

# =====================================================================
# 소형 적 (32x32, 오른쪽을 봄): 고블린 계열 변형
# =====================================================================
def mk_pal(skin, cloth=(132, 88, 52), wood=(142, 96, 56)):
    return dict(skin=skin, skin_l=sh(skin, 1.35), skin_d=sh(skin, 0.62), eye=(252, 232, 84), pupil=(40, 20, 30),
                teeth=(246, 246, 228), cloth=cloth, cloth_d=sh(cloth, 0.68), wood=wood, wood_d=sh(wood, 0.68),
                stud=(176, 176, 190), ear_in=(196, 130, 120), bone=(236, 228, 204), orb=(120, 230, 255), robe=(96, 60, 150), robe_d=(62, 36, 104),
                gold=(238, 196, 64))

def gob_var(variant, bob=0, lean=0, hand=(21, 19), tip=(24, 12), back_leg=0, front_leg=0, lift_b=0, lift_f=0,
            mouth_open=False, eyes_shut=False, pull=0, orb=2):
    c = Cv();
    P = {'archer': mk_pal((138, 168, 80), (92, 120, 60)), 'shaman': mk_pal((98, 160, 150), (96, 60, 150)),
         'brute': mk_pal((196, 112, 72), (90, 60, 44), (120, 84, 54))}[variant]
    bulk = 1 if variant == 'brute' else 0
    ub = lambda pts: shift(pts, lean, bob)
    # 다리
    c.paint(rect_pts(13 - bulk + back_leg, 23 - lift_b, 14 + back_leg, 27 - lift_b), P['skin_d'])
    c.paint(rect_pts(13 - bulk + back_leg, 27 - lift_b, 15 + back_leg, 28 - lift_b), P['skin_d'])
    c.paint(rect_pts(17 + front_leg, 23 - lift_f, 18 + bulk + front_leg, 27 - lift_f), P['skin'], None, P['skin_d'])
    c.paint(rect_pts(17 + front_leg, 27 - lift_f, 19 + bulk + front_leg, 28 - lift_f), P['skin_d'])
    # 몸통
    if variant == 'shaman':
        c.paint(ub(rect_pts(12, 16, 20, 25)), P['robe'], P['robe'], P['robe_d'])
        c.dots([(x + lean, 21 + bob) for x in range(12, 21)], P['gold'])
        c.dots([(x + lean, 25 + bob) for x in (12, 14, 16, 18, 20)], P['robe_d'])
    else:
        c.paint(ub(rect_pts(13 - bulk, 16, 19 + bulk, 22)), P['skin'], P['skin_l'], P['skin_d'])
        c.paint(ub(rect_pts(13 - bulk, 21, 19 + bulk, 23)), P['cloth'], None, P['cloth_d'])
        c.dots([(x + lean, 24 + bob) for x in (13, 15, 17, 19)], P['cloth_d'])
    if variant == 'archer':
        c.paint(ub(rect_pts(14, 16, 16, 21)), P['wood_d'])      # 화살통 끈
        c.dots([(x + lean, y + bob) for (x, y) in ((11, 14), (12, 14), (12, 13), (13, 13))], P['wood'])
    if variant == 'brute':
        c.paint(ub(rect_pts(12, 15, 20, 17)), (150, 150, 165), (200, 200, 215), (100, 100, 116))   # 어깨 갑옷
        c.dots([(x + lean, y + bob) for (x, y) in ((16, 18), (16, 19))], P['gold'])
    # 귀
    c.paint(ub(line_pts(11, 9, 5 if variant != 'shaman' else 4, 7, 2)), P['skin'], P['skin_l'], P['skin_d'])
    c.paint(ub(line_pts(21, 8, 26, 6, 2)), P['skin'], P['skin_l'], P['skin_d'])
    # 머리
    c.paint(ub(ellipse_pts(16, 10, 5.4 + (0.6 if bulk else 0), 4.6)), P['skin'], P['skin_l'], P['skin_d'])
    c.paint(ub({(21, 10), (22, 11), (21, 11), (22, 12)}), P['skin'], P['skin_l'], P['skin_d'])
    if eyes_shut:
        c.dots([(x + lean, y + bob) for (x, y) in ((16, 9), (17, 9), (19, 9), (20, 9))], P['pupil'])
    else:
        c.dots([(x + lean, y + bob) for (x, y) in ((17, 9), (18, 9), (19, 9), (20, 9))], P['eye'])
        c.dots([(x + lean, y + bob) for (x, y) in ((18, 9), (20, 9))], P['pupil'])
        c.dots([(x + lean, y + bob) for (x, y) in ((16, 8), (17, 8), (19, 8), (20, 8))], P['skin_d'])
    if mouth_open:
        c.dots([(x + lean, y + bob) for (x, y) in ((17, 13), (18, 13), (19, 13), (20, 13), (17, 14), (18, 14), (19, 14))], P['pupil'])
        c.dots([(x + lean, y + bob) for (x, y) in ((18, 13), (20, 13))], P['teeth'])
    else:
        c.dots([(x + lean, y + bob) for (x, y) in ((17, 13), (18, 13), (19, 13), (20, 13))], P['pupil'])
        c.dots([(x + lean, y + bob) for (x, y) in ((18, 14), (20, 14))], P['teeth'])
    # 모자/뿔
    if variant == 'shaman':
        hat = ub({(x, 5) for x in range(10, 23)} | {(x, 4) for x in range(12, 21)} | {(x, 3) for x in range(13, 20)} | {(x, 2) for x in range(14, 19)} | {(x, 1) for x in range(15, 18)} | {(16, 0)})
        c.paint(hat, P['robe'], (150, 110, 210), P['robe_d'])
        c.dots([(x + lean, 5 + bob) for x in range(10, 23)], P['robe_d'])
        c.dots([(16 + lean, 3 + bob)], P['gold'])
    if variant == 'brute':
        c.paint(ub(rect_pts(12, 5, 20, 7)), (150, 150, 165), (210, 210, 225), (96, 96, 112))
        c.paint(ub({(11, 5), (10, 4), (10, 3), (9, 2)}), P['bone'], None, None)
        c.paint(ub({(21, 5), (22, 4), (22, 3), (23, 2)}), P['bone'], None, None)
    # 팔/무기
    sx, sy = 18 + lean, 17 + bob
    c.paint(line_pts(sx, sy, hand[0], hand[1], 2 if bulk else 1), P['skin'], None, P['skin_d'])
    if variant == 'brute':
        club = line_pts(hand[0], hand[1], tip[0], tip[1], 2) | ellipse_pts(tip[0], tip[1], 3.2, 3.2)
        c.paint(club, P['wood'], None, P['wood_d'])
        c.dots([(tip[0] + 1, tip[1] - 1), (tip[0] - 1, tip[1] + 1), (tip[0] + 2, tip[1] + 1)], P['stud'])
    elif variant == 'archer':
        hx, hy = hand[0] + 2, hand[1] - 1
        bow = {(hx + round(2 * (1 - (dy / 6) ** 2)), hy + dy) for dy in range(-6, 7)}
        c.paint(bow, P['wood'], None, P['wood_d'])
        sx2 = hx - pull
        c.paint(line_pts(hx + 0, hy - 6, sx2, hy, 1) | line_pts(sx2, hy, hx + 0, hy + 6, 1), (230, 230, 220))
        if pull >= 2: c.paint(line_pts(sx2, hy, hx + 5, hy, 1), P['wood'])   # 화살
    elif variant == 'shaman':
        c.paint(line_pts(hand[0], hand[1] + 6, hand[0], hand[1] - 8, 1), P['wood'], None, P['wood_d'])
        c.paint(ellipse_pts(hand[0], hand[1] - 10, orb, orb), P['orb'], (200, 250, 255), (60, 170, 210))
    c.paint({hand}, P['skin'])
    c.outline()
    return c

def var_frames(variant):
    G = lambda **k: gob_var(variant, **k)
    wp = {'brute': dict(hand=(21, 19), tip=(25, 12)), 'archer': dict(hand=(21, 18), tip=(0, 0)), 'shaman': dict(hand=(22, 18), tip=(0, 0))}[variant]
    hh = wp['hand']
    fr = {}
    fr['idle'] = [G(bob=0, hand=hh, tip=wp['tip']), G(bob=0, hand=hh, tip=wp['tip']), G(bob=1, hand=(hh[0], hh[1] + 1), tip=(wp['tip'][0], wp['tip'][1] + 1)), G(bob=1, hand=(hh[0], hh[1] + 1), tip=(wp['tip'][0], wp['tip'][1] + 1))]
    fr['walk'] = [G(bob=0, back_leg=-1, front_leg=1, hand=hh, tip=wp['tip']), G(bob=-1, lift_b=1, hand=hh, tip=wp['tip']),
                  G(bob=0, back_leg=1, front_leg=-1, hand=hh, tip=wp['tip']), G(bob=-1, lift_f=1, hand=hh, tip=wp['tip'])]
    if variant == 'brute':
        fr['attack'] = [G(lean=-1, hand=(18, 13), tip=(13, 6), mouth_open=True), G(hand=(20, 12), tip=(25, 5), mouth_open=True),
                        G(lean=2, hand=(23, 18), tip=(28, 23), front_leg=1, mouth_open=True), G(lean=2, bob=1, hand=(22, 21), tip=(26, 27), front_leg=1), G(lean=1, hand=(21, 19), tip=(25, 14))]
        fr['hurt'] = [G(lean=-2, bob=1, hand=(19, 20), tip=(20, 27), mouth_open=True, eyes_shut=True)]
    elif variant == 'archer':
        fr['attack'] = [G(hand=hh, tip=(0, 0), pull=1), G(lean=-1, hand=hh, tip=(0, 0), pull=3), G(lean=-1, hand=hh, tip=(0, 0), pull=4, mouth_open=True), G(lean=1, hand=hh, tip=(0, 0), pull=0), G(hand=hh, tip=(0, 0))]
        fr['hurt'] = [G(lean=-2, bob=1, hand=(20, 19), tip=(0, 0), eyes_shut=True, mouth_open=True)]
    else:
        fr['attack'] = [G(hand=hh, tip=(0, 0), orb=2), G(lean=-1, hand=(21, 16), tip=(0, 0), orb=3), G(lean=1, hand=(23, 17), tip=(0, 0), orb=4, mouth_open=True), G(lean=1, hand=(23, 18), tip=(0, 0), orb=3), G(hand=hh, tip=(0, 0), orb=2)]
        fr['hurt'] = [G(lean=-2, bob=1, hand=(20, 19), tip=(0, 0), eyes_shut=True, mouth_open=True)]
    return fr

# 임프(작은 박쥐 악마)
def imp(bob=0, wing=0, lean=0, lunge=0, eyes_shut=False, mouth_open=False):
    c = Cv(); P = dict(skin=(178, 70, 90), skin_l=(224, 120, 130), skin_d=(112, 40, 64), wing=(110, 50, 110), wing_d=(70, 30, 82), eye=(255, 236, 90), horn=(240, 230, 200))
    cx, cy = 16 + lean + lunge, 19 + bob
    # 날개
    up = -4 if wing == 0 else 2
    wl = poly_pts([(cx - 4, cy - 2), (cx - 13, cy + up - 4), (cx - 11, cy + up + 2), (cx - 7, cy + up + 1), (cx - 4, cy + 4)], 32, 32)
    wr = poly_pts([(cx + 3, cy - 2), (cx + 10, cy + up - 5), (cx + 9, cy + up + 1), (cx + 6, cy + up), (cx + 3, cy + 4)], 32, 32)
    c.paint(wl, P['wing'], None, P['wing_d']); c.paint(wr, P['wing'], None, P['wing_d'])
    # 꼬리
    c.paint(line_pts(cx - 4, cy + 4, cx - 9, cy + 7, 1) | {(cx - 10, cy + 6), (cx - 10, cy + 8)}, P['skin_d'])
    # 몸/머리
    c.paint(ellipse_pts(cx, cy + 1, 4.6, 5), P['skin'], P['skin_l'], P['skin_d'])
    c.paint(ellipse_pts(cx + 1, cy - 6, 4.2, 3.8), P['skin'], P['skin_l'], P['skin_d'])
    c.dots([(cx - 2, cy - 11), (cx - 3, cy - 12), (cx + 4, cy - 11), (cx + 5, cy - 12)], P['horn'])
    if eyes_shut: c.dots([(cx + 1, cy - 7), (cx + 3, cy - 7)], (30, 20, 30))
    else: c.dots([(cx + 1, cy - 7), (cx + 3, cy - 7), (cx + 2, cy - 7)], P['eye'])
    c.dots([(cx + 2, cy - 4), (cx + 3, cy - 4)] if not mouth_open else [(cx + 1, cy - 4), (cx + 2, cy - 4), (cx + 3, cy - 4), (cx + 2, cy - 3)], (40, 16, 34))
    # 팔(갈고리 손)
    c.paint(line_pts(cx + 3, cy, cx + 7 + lunge, cy + 2, 1), P['skin_d'])
    # 다리
    c.paint({(cx - 1, cy + 6), (cx - 1, cy + 7), (cx + 2, cy + 6), (cx + 2, cy + 7)}, P['skin_d'])
    c.outline()
    return c

def imp_frames():
    fr = {}
    fr['idle'] = [imp(bob=0, wing=0), imp(bob=-1, wing=1), imp(bob=0, wing=0), imp(bob=-1, wing=1)]
    fr['walk'] = [imp(bob=-1, wing=1, lean=0), imp(bob=0, wing=0), imp(bob=-1, wing=1), imp(bob=0, wing=0)]
    fr['attack'] = [imp(lean=-2, wing=1), imp(lean=-1, wing=0, mouth_open=True), imp(lunge=5, wing=1, mouth_open=True), imp(lunge=7, wing=0, mouth_open=True), imp(lunge=2, wing=1)]
    fr['hurt'] = [imp(lean=-2, bob=1, eyes_shut=True, mouth_open=True)]
    return fr

def build_sheet(frames_dict, order):
    anims = {k: [add_shadow(f.image()) for f in v] for k, v in frames_dict.items()}
    hurt = frames_dict['hurt'][0].image()
    anims['hurt'] = [add_shadow(tint_white(hurt))]
    anims['death'] = [add_shadow(rotate_fall(tint_white(hurt, 0.35), 22, 28, -1)),
                      add_shadow(rotate_fall(hurt, 58, 28, -2), cx=15, rx=9),
                      add_shadow(rotate_fall(hurt, 90, 28, -1), cx=15, rx=12)]
    cols = 5
    sh_ = Image.new("RGBA", (cols * W, len(order) * H), (0, 0, 0, 0))
    for r, name in enumerate(order):
        for i, im in enumerate(anims[name]): sh_.paste(im, (i * W, r * H))
    return sh_

# =====================================================================
# 보스 (64x64, 왼쪽을 봄)
# =====================================================================
def limb(cv, x0, y0, x1, y1, th, base, l=None, d=None):
    pts = set()
    for dx in range(-(th // 2), th - th // 2):
        for dy in range(-(th // 2), th - th // 2):
            pts |= shift(line_pts(x0, y0, x1, y1, 1), dx, dy)
    cv.paint(pts, base, l, d)

def eye_pair(cv, x1, x2, y, col=(255, 236, 90), pup=(40, 12, 20)):
    for x in (x1, x2):
        cv.dots([(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)], col); cv.put(x, y + 1, pup)

def boss_giant(name, skin, armor, crown=False, horns=False, wings=False, beard=False, shards=False, flame=False, weapon='club', glow=(255, 210, 90)):
    c = Cv(64, 64)
    sk, sl, sd = skin, sh(skin, 1.3), sh(skin, 0.6)
    ar, al, ad = armor, sh(armor, 1.35), sh(armor, 0.6)
    if wings:   # 박쥐 날개
        for sgn in (-1, 1):
            base = 32 + sgn * 6
            pts = poly_pts([(base, 22), (32 + sgn * 30, 4), (32 + sgn * 28, 20), (32 + sgn * 22, 18), (32 + sgn * 22, 30), (32 + sgn * 14, 26), (base, 36)])
            c.paint(pts, sh(armor, 0.7), None, sh(armor, 0.45))
    # 다리
    c.paint(rect_pts(22, 44, 30, 60), sd, sk, sd); c.paint(rect_pts(34, 44, 42, 60), sk, sl, sd)
    c.paint(rect_pts(20, 58, 31, 62), (80, 56, 44), (120, 90, 70), (50, 34, 28)); c.paint(rect_pts(33, 58, 44, 62), (80, 56, 44), (120, 90, 70), (50, 34, 28))
    # 몸통 + 갑옷
    c.paint(ellipse_pts(32, 36, 15, 14), sk, sl, sd)
    c.paint(rect_pts(20, 30, 44, 46), ar, al, ad)
    c.paint(rect_pts(20, 42, 44, 45), (200, 160, 60), (240, 200, 90), (140, 100, 30))
    c.paint(rect_pts(30, 33, 34, 40), al, None, ad)
    # 어깨
    c.paint(ellipse_pts(18, 30, 6, 5), ar, al, ad); c.paint(ellipse_pts(46, 30, 6, 5), ar, al, ad)
    if shards:
        for (x, y, h_) in ((14, 26, 8), (19, 24, 10), (46, 24, 10), (50, 26, 8)):
            c.paint(poly_pts([(x - 2, y), (x, y - h_), (x + 2, y)]), (180, 230, 255), (240, 252, 255), (110, 170, 220))
    # 머리
    c.paint(ellipse_pts(32, 20, 10, 9), sk, sl, sd)
    c.paint(rect_pts(22, 14, 42, 16), sh(ar, 0.9), al, ad) if horns else None
    eye_pair(c, 27, 34, 19, col=glow)
    c.paint(rect_pts(27, 25, 37, 26), (40, 16, 24)); c.dots([(29, 26), (32, 26), (35, 26)], (240, 240, 220))
    if beard: c.paint(poly_pts([(24, 24), (40, 24), (36, 38), (32, 42), (28, 38)]), (232, 240, 250), (255, 255, 255), (170, 190, 212))
    if crown:
        c.paint(poly_pts([(23, 13), (23, 6), (27, 10), (32, 4), (37, 10), (41, 6), (41, 13)]), (238, 196, 64), (255, 232, 130), (170, 118, 32))
        c.dots([(32, 8), (26, 10), (38, 10)], (210, 50, 70))
    if horns:
        for sgn in (-1, 1):
            c.paint(poly_pts([(32 + sgn * 8, 14), (32 + sgn * 16, 4), (32 + sgn * 13, 14)]), (240, 230, 200), (255, 250, 230), (170, 156, 120))
            c.paint(poly_pts([(32 + sgn * 14, 8), (32 + sgn * 20, 2), (32 + sgn * 16, 9)]), (240, 230, 200), (255, 250, 230), (170, 156, 120))
    if flame:
        for i, x in enumerate(range(24, 41, 4)):
            c.paint(poly_pts([(x - 2, 12), (x, 0 + (i % 2) * 3), (x + 2, 12)]), (255, 150, 40), (255, 230, 120), (210, 70, 20))
    # 귀(고블린형)
    if name == 'groom':
        c.paint(poly_pts([(22, 18), (6, 10), (10, 20)]), sk, sl, sd); c.paint(poly_pts([(42, 18), (58, 8), (54, 20)]), sk, sl, sd)
    # 무기 (왼쪽 팔 앞)
    limb(c, 18, 32, 10, 44, 5, sk, sl, sd)
    if weapon == 'club':
        limb(c, 10, 44, 5, 20, 4, (142, 96, 56), (190, 140, 90), (96, 62, 36)); c.paint(ellipse_pts(5, 17, 5, 6), (142, 96, 56), (190, 140, 90), (96, 62, 36))
        c.dots([(3, 14), (7, 16), (5, 20)], (176, 176, 190))
    elif weapon == 'sword':
        limb(c, 10, 44, 6, 10, 3, (210, 218, 232), (250, 252, 255), (140, 150, 170)); c.paint(rect_pts(3, 40, 15, 42), (238, 196, 64))
    elif weapon == 'axe':
        limb(c, 10, 44, 6, 14, 3, (110, 80, 52)); c.paint(poly_pts([(6, 12), (-2, 16), (-1, 26), (7, 24)]), (200, 220, 240), (250, 255, 255), (120, 150, 180))
    limb(c, 46, 32, 54, 44, 5, sk, sl, sd); c.paint(ellipse_pts(54, 46, 3.5, 3.5), sk, sl, sd)
    c.outline()
    return c

def boss_treant():
    c = Cv(64, 64); bark = (104, 70, 44); bl, bd = sh(bark, 1.4), sh(bark, 0.6); leaf = (60, 140, 64)
    for x in (16, 24, 40, 48): limb(c, 32, 56, x, 62, 4, bd)
    c.paint(rect_pts(22, 18, 42, 58), bark, bl, bd)
    for y in (24, 32, 40, 48): c.paint({(x, y) for x in range(24, 41, 3)}, bd)
    limb(c, 22, 28, 4, 14, 5, bark, bl, bd); limb(c, 22, 38, 4, 40, 5, bark, bl, bd); limb(c, 42, 28, 58, 14, 5, bark, bl, bd); limb(c, 42, 38, 60, 38, 5, bark, bl, bd)
    for (x, y) in ((4, 12), (4, 40), (58, 12), (60, 38)): c.paint(ellipse_pts(x, y, 6, 6), leaf, sh(leaf, 1.4), sh(leaf, 0.6))
    c.paint(ellipse_pts(32, 12, 20, 11), leaf, sh(leaf, 1.4), sh(leaf, 0.6))
    for (x, y) in ((16, 12), (28, 6), (40, 8), (48, 14)): c.paint(ellipse_pts(x, y, 6, 5), sh(leaf, 1.15), sh(leaf, 1.5), sh(leaf, 0.7))
    c.dots([(24, 10), (36, 8), (46, 12)], (232, 80, 90))
    eye_pair(c, 26, 35, 28, col=(130, 255, 140), pup=(10, 60, 20))
    c.paint(rect_pts(28, 38, 36, 42), (30, 16, 12)); c.dots([(30, 38), (34, 38)], (220, 200, 160))
    c.outline(); return c

def boss_golem(lava=False):
    c = Cv(64, 64)
    st = (118, 122, 138) if not lava else (74, 62, 70); sl_, sd_ = sh(st, 1.35), sh(st, 0.62)
    core = (120, 230, 255) if not lava else (255, 140, 40)
    c.paint(rect_pts(20, 46, 29, 62), st, sl_, sd_); c.paint(rect_pts(35, 46, 44, 62), st, sl_, sd_)
    c.paint(rect_pts(18, 22, 46, 48), st, sl_, sd_)
    c.paint(rect_pts(26, 8, 38, 22), st, sl_, sd_)
    c.paint(rect_pts(6, 24, 18, 52), st, sl_, sd_); c.paint(rect_pts(46, 24, 58, 52), st, sl_, sd_)
    c.paint(rect_pts(4, 48, 20, 60), sh(st, 1.1), sl_, sd_); c.paint(rect_pts(44, 48, 60, 60), sh(st, 1.1), sl_, sd_)
    for (x, y, x2, y2) in ((22, 26, 26, 34), (40, 28, 44, 40), (10, 28, 14, 40), (50, 30, 54, 42), (28, 12, 31, 18)):
        c.paint(line_pts(x, y, x2, y2, 1), sd_ if not lava else core)
    c.paint(ellipse_pts(32, 34, 5, 5), core, sh(core, 1.3), sh(core, 0.7))
    eye_pair(c, 28, 33, 13, col=core, pup=sh(core, 0.5))
    if not lava:
        c.dots([(x, 26) for x in range(20, 26)] + [(x, 24) for x in range(8, 13)], (84, 130, 74))
    else:
        for i, x in enumerate(range(26, 40, 4)): c.paint(poly_pts([(x - 2, 9), (x, 1 + (i % 2) * 3), (x + 2, 9)]), (255, 140, 40), (255, 230, 120), (210, 70, 20))
    c.outline(); return c

def boss_scorpion():
    c = Cv(64, 64); sk = (190, 140, 70); sl_, sd_ = sh(sk, 1.3), sh(sk, 0.6)
    for i, x in enumerate((24, 30, 38, 44)): limb(c, x, 46, x - 4 + (i % 2) * 2, 58, 2, sd_)
    c.paint(ellipse_pts(30, 44, 17, 9), sk, sl_, sd_)
    c.paint(ellipse_pts(12, 42, 8, 6), sk, sl_, sd_)
    eye_pair(c, 7, 11, 39, col=(255, 90, 60), pup=(60, 10, 10))
    # 집게
    for (y0, y1) in ((34, 22), (46, 52)):
        limb(c, 14, 44, 4, y0, 3, sk, sl_, sd_)
        c.paint(ellipse_pts(3, y1, 5, 4), sh(sk, 1.1), sl_, sd_)
        c.paint(poly_pts([(0, y1 - 3), (6, y1), (0, y1 + 3)]), (30, 16, 12))
    # 꼬리
    for (x, y, x2, y2) in ((46, 42, 54, 34), (54, 34, 56, 22), (56, 22, 48, 12)): limb(c, x, y, x2, y2, 5, sk, sl_, sd_)
    c.paint(poly_pts([(44, 10), (52, 12), (42, 22)]), (230, 70, 90), (255, 140, 150), (150, 30, 50))
    c.dots([(x, 40) for x in (22, 26, 30, 34, 38)], sd_)
    # 터번(술탄)
    c.paint(ellipse_pts(11, 34, 6, 3), (60, 90, 200), (110, 150, 250), (30, 50, 130)); c.paint(poly_pts([(9, 32), (11, 27), (13, 32)]), (238, 196, 64))
    c.outline(); return c

def boss_hydra():
    c = Cv(64, 64); sk = (70, 160, 130); sl_, sd_ = sh(sk, 1.35), sh(sk, 0.6)
    c.paint(ellipse_pts(32, 52, 20, 10), sk, sl_, sd_)
    c.paint(ellipse_pts(32, 56, 24, 6), sd_, None, None)
    heads = ((14, 16), (32, 8), (50, 16))
    for (hx, hy) in heads:
        pts = [(32, 48), (32 + (hx - 32) * 0.4, 40), (hx + (32 - hx) * 0.1, hy + 16), (hx, hy + 6)]
        for i in range(len(pts) - 1): limb(c, int(pts[i][0]), int(pts[i][1]), int(pts[i + 1][0]), int(pts[i + 1][1]), 6, sk, sl_, sd_)
        c.paint(ellipse_pts(hx, hy, 8, 6), sk, sl_, sd_)
        c.paint(poly_pts([(hx - 8, hy + 1), (hx - 14, hy + 4), (hx - 8, hy + 6)]), sk, sl_, sd_)
        eye_pair(c, hx - 4, hx + 1, hy - 3, col=(255, 90, 140), pup=(40, 0, 20))
        c.dots([(hx - 10, hy + 4), (hx - 12, hy + 5)], (240, 240, 220))
        c.dots([(hx - 6, hy + 8), (hx - 6, hy + 11)], (160, 80, 220))
    for x in range(14, 52, 6): c.paint({(x, 46), (x + 1, 46), (x, 47)}, sl_)
    c.outline(); return c

def boss_eye():
    c = Cv(64, 64); sk = (130, 70, 170); sl_, sd_ = sh(sk, 1.35), sh(sk, 0.6)
    for (x, y) in ((14, 10), (24, 5), (40, 5), (50, 10), (8, 20), (56, 20)):
        limb(c, 32, 30, x, y + 4, 3, sk, sl_, sd_)
        c.paint(ellipse_pts(x, y, 4, 4), (240, 240, 235), None, None); c.paint(ellipse_pts(x, y + 1, 2, 2), (230, 50, 90))
    c.paint(ellipse_pts(32, 36, 22, 20), sk, sl_, sd_)
    c.paint(ellipse_pts(32, 32, 12, 10), (246, 246, 240), (255, 255, 255), (200, 200, 210))
    c.paint(ellipse_pts(31, 33, 6, 6), (210, 40, 80), (255, 110, 140), (130, 10, 40)); c.paint(ellipse_pts(31, 33, 2, 5), (20, 0, 10))
    c.dots([(28, 30), (29, 30)], (255, 255, 255))
    c.paint(poly_pts([(14, 48), (50, 48), (44, 56), (32, 52), (20, 56)]), (50, 20, 50));
    for x in (18, 24, 30, 36, 42): c.paint(poly_pts([(x, 48), (x + 3, 48), (x + 1, 53)]), (245, 245, 225))
    c.outline(); return c

def boss_angel():
    c = Cv(64, 64)
    for sgn in (-1, 1):
        for k, (dx, dy, ln) in enumerate(((10, 12, 26), (6, 18, 24), (4, 26, 20), (3, 34, 14))):
            x0, y0 = 32 + sgn * 6, 28
            limb(c, x0, y0 - k, 32 + sgn * (dx + ln), dy, 3, (236, 236, 244), (255, 255, 255), (170, 176, 200))
    c.paint(rect_pts(22, 44, 30, 60), (200, 200, 215), (240, 240, 250), (130, 134, 160)); c.paint(rect_pts(34, 44, 42, 60), (200, 200, 215), (240, 240, 250), (130, 134, 160))
    c.paint(rect_pts(22, 24, 42, 46), (226, 226, 238), (255, 255, 255), (150, 154, 182))
    c.paint(rect_pts(22, 40, 42, 44), (238, 196, 64), (255, 232, 130), (170, 118, 32))
    c.paint(ellipse_pts(32, 18, 8, 8), (240, 206, 170), (255, 232, 200), (196, 150, 116))
    c.paint(rect_pts(22, 8, 42, 12) | rect_pts(24, 12, 40, 14), (226, 226, 238), (255, 255, 255), (150, 154, 182))
    eye_pair(c, 28, 34, 18, col=(120, 220, 255), pup=(10, 60, 90))
    c.paint({(x, 3) for x in range(22, 43)} | {(x, 2) for x in range(24, 41)}, (255, 236, 120))
    c.dots([(20, 3), (44, 3)], (255, 236, 120))
    limb(c, 22, 28, 12, 40, 4, (226, 226, 238), (255, 255, 255), (150, 154, 182))
    limb(c, 12, 40, 8, 8, 3, (180, 200, 230), (250, 252, 255), (110, 130, 170)); c.paint(rect_pts(5, 36, 17, 38), (238, 196, 64))
    c.dots([(x, y) for (x, y) in ((26, 30), (36, 34), (28, 50), (38, 20))], (80, 80, 100))   # 균열(폐허)
    c.outline(); return c

def make_bosses():
    fns = [
        lambda: boss_giant('groom', (110, 172, 72), (130, 90, 56), crown=True, weapon='club'),
        boss_treant,
        lambda: boss_golem(False),
        boss_scorpion,
        boss_hydra,
        lambda: boss_giant('frost', (150, 196, 230), (90, 130, 190), beard=True, shards=True, weapon='axe', glow=(160, 255, 255)),
        lambda: boss_giant('ignis', (232, 90, 50), (60, 44, 52), flame=True, weapon='sword', glow=(255, 240, 120)),
        boss_eye,
        boss_angel,
        lambda: boss_giant('demon', (170, 40, 60), (50, 30, 46), crown=True, horns=True, wings=True, weapon='sword', glow=(255, 90, 60)),
    ]
    sheet = Image.new("RGBA", (5 * 64, 2 * 64), (0, 0, 0, 0))
    for i, f in enumerate(fns):
        im = f().image()
        # 바닥 그림자
        sh_ = Image.new("RGBA", (64, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(sh_); d.ellipse((6, 58, 58, 63), fill=(0, 0, 0, 80))
        sheet.paste(Image.alpha_composite(sh_, im), ((i % 5) * 64, (i // 5) * 64))
    return sheet

def main(out):
    meta = {}
    order = ['idle', 'walk', 'attack', 'hurt', 'death']
    for v in ('archer', 'shaman', 'brute'):
        sheet = build_sheet(var_frames(v), order); sheet.save(f"{out}/{v}_sheet.png")
    sheet = build_sheet(imp_frames(), order); sheet.save(f"{out}/imp_sheet.png")
    b = make_bosses(); b.save(f"{out}/bosses_sheet.png")
    for name in ('archer', 'shaman', 'brute', 'imp'):
        im = Image.open(f"{out}/{name}_sheet.png"); big = im.resize((im.width * 4, im.height * 4), Image.NEAREST)
        bg = Image.new("RGBA", big.size, (44, 48, 64, 255)); bg.alpha_composite(big); bg.save(f"{out}/{name}_preview.png")
    big = b.resize((b.width * 3, b.height * 3), Image.NEAREST); bg = Image.new("RGBA", big.size, (44, 48, 64, 255)); bg.alpha_composite(big); bg.save(f"{out}/bosses_preview.png")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
