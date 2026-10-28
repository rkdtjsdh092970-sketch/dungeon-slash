import numpy as np, math, sys
from PIL import Image, ImageDraw
exec(open('/home/claude/game/art/boss3.py').read().split('# ================= 1.')[0])

# ================= 15. 서리 여왕 글라시아 =================
def frost_queen():
    c = Cv(); robe = (74, 134, 200); robd = (40, 82, 146); ice = (168, 228, 255); wh = (240, 252, 255); hair = (118, 168, 226); skin = (232, 238, 250); sil = (196, 210, 232); cy = (90, 236, 255)
    # 뒤쪽 서리 후광 + 얼음 날개
    c.ell(48, 40, 34, 34, (30, 60, 110), cel=False, edge=0)
    for a in range(9):
        ang = -math.pi + a * math.pi / 8; c.spike(48 + math.cos(ang) * 24, 44 + math.sin(ang) * 24, ang, 18 + (a % 2) * 6, 3, ice)
    # 긴 머리카락
    c.poly([(32, 16), (64, 16), (72, 56), (66, 80), (58, 56), (38, 56), (30, 80), (24, 56)], hair)
    # 드레스: 넓게 퍼지는 서리 치마
    c.poly([(22, 92), (74, 92), (84, 74), (66, 46), (30, 46), (12, 74)], robe)
    c.poly([(30, 90), (66, 90), (72, 74), (60, 54), (36, 54), (24, 74)], robd)
    for i in range(9): c.spike(18 + i * 7, 90, math.pi / 2, 10 + (i % 2) * 5, 3, ice)
    for i in range(5): c.line(48, 54, 26 + i * 11, 88, (110, 170, 226), 1)
    # 상체 + 어깨 장식
    c.poly([(34, 38), (62, 38), (68, 54), (28, 54)], robe); c.poly([(40, 42), (56, 42), (58, 54), (38, 54)], (150, 200, 240))
    c.px(46, 44, wh, 4, 4); c.glow(48, 46, 8, cy, .9)
    for (x, y, a, ln) in [(30, 38, -2.7, 16), (26, 42, -3.2, 12), (66, 38, -0.45, 16), (70, 42, 0.05, 12)]: c.spike(x, y, a, ln, 4, ice)
    # 왼손: 서리 구체 / 오른손: 얼음 지팡이
    c.limb(30, 50, 18, 64, 5, 4, robe); c.glow(14, 68, 12, cy, .8); c.ell(14, 68, 7, 7, wh, cel=False); c.ell(14, 68, 4, 4, cy, cel=False)
    for (x, y, a) in [(14, 58, -1.57), (6, 66, 3.14), (22, 70, 0.4), (14, 78, 1.57)]: c.spike(x, y, a, 7, 2, ice)
    c.limb(66, 50, 78, 62, 5, 4, robe); c.ell(80, 64, 4, 4, skin)
    c.poly([(79, 94), (82, 94), (82, 22), (79, 22)], sil); c.poly([(80.5, 4), (88, 16), (80.5, 28), (73, 16)], ice); c.glow(80.5, 16, 18, wh, .8)
    for (x, y, a) in [(73, 14, 3.14), (88, 14, 0), (80, 4, -1.57)]: c.spike(x, y, a, 8, 2, wh)
    # 얼굴 + 눈
    c.ell(48, 27, 9, 11, skin); c.poly([(40, 33), (56, 33), (52, 40), (44, 40)], skin)
    c.eye(43, 26, cy, 5); c.eye(53, 26, cy, 5); c.glow(43, 27, 8, cy, .7); c.glow(53, 27, 8, cy, .7)
    c.px(46, 35, (190, 110, 150), 5, 2); c.px(40, 22, hair, 3, 10); c.px(55, 22, hair, 3, 10)
    # 왕관
    c.poly([(37, 17), (59, 17), (57, 11), (39, 11)], sil)
    for (x, ln) in [(40, 12), (44, 17), (48, 24), (52, 17), (56, 12)]: c.spike(x, 12, -1.57, ln, 3, ice)
    c.px(47, 12, cy, 3, 4)
    # 흩날리는 눈송이
    for (x, y) in [(8, 30), (90, 38), (12, 10), (86, 8), (6, 52), (92, 62), (20, 24), (76, 28)]: c.px(x, y, wh, 2, 2); c.px(x - 1, y, ice, 4, 1); c.px(x, y - 1, ice, 1, 4)
    return c.finish()

# ================= 16. 독니의 군주 베노크 =================
def venom_lord():
    c = Cv(); body = (66, 138, 54); bd = (32, 78, 40); bl = (118, 186, 84); belly = (206, 226, 120); pu = (122, 56, 156); pd = (70, 28, 98); fang = (244, 244, 214); ven = (150, 255, 90); eyc = (255, 244, 70)
    # 독 안개 후광
    c.ell(48, 44, 34, 30, (24, 52, 28), cel=False, edge=0)
    for (x, y, r) in [(20, 30, 8), (78, 26, 9), (14, 60, 7), (84, 56, 8), (50, 8, 8)]: c.ell(x, y, r, r - 2, (52, 110, 60), cel=False, edge=0)
    # 똬리 튼 꼬리
    c.ell(48, 84, 40, 9, bd); c.ell(48, 78, 34, 10, body); c.ell(48, 71, 26, 9, bl)
    for i in range(7): c.px(16 + i * 10, 82 + (i % 2) * 2, belly, 6, 2)
    c.limb(78, 84, 90, 70, 6, 3, body); c.spike(90, 70, -1.1, 10, 3, pu)
    # 몸통 (일어선 상체)
    c.limb(48, 74, 48, 50, 16, 12, body); c.poly([(40, 74), (56, 74), (54, 52), (42, 52)], belly)
    for i in range(5): c.line(41, 72 - i * 4, 55, 72 - i * 4, bl, 1)
    # 코브라 후드
    c.poly([(18, 40), (30, 22), (48, 16), (66, 22), (78, 40), (68, 62), (52, 56), (44, 56), (28, 62)], bd)
    c.poly([(26, 40), (34, 28), (48, 22), (62, 28), (70, 40), (62, 54), (34, 54)], body)
    c.poly([(34, 40), (42, 30), (54, 30), (62, 40), (56, 50), (40, 50)], pu)
    c.ell(36, 38, 5, 5, ven, cel=False); c.ell(60, 38, 5, 5, ven, cel=False); c.ell(36, 38, 2, 2, bd, cel=False); c.ell(60, 38, 2, 2, bd, cel=False)
    for (x, y, a, ln) in [(18, 40, 3.14, 12), (22, 28, -2.5, 12), (34, 20, -2.1, 12), (48, 14, -1.57, 14), (62, 20, -1.05, 12), (74, 28, -0.6, 12), (78, 40, 0, 12)]: c.spike(x, y, a, ln, 4, pu)
    # 머리
    c.ell(48, 36, 13, 11, bl); c.poly([(36, 40), (60, 40), (56, 50), (40, 50)], body)
    c.glow(41, 34, 8, eyc, .8); c.glow(55, 34, 8, eyc, .8); c.eye(41, 33, eyc, 6); c.eye(55, 33, eyc, 6)
    for (x, y) in [(46, 28), (50, 28), (48, 25)]: c.px(x, y, eyc, 2, 2)
    # 송곳니 + 독 방울
    c.poly([(41, 44), (45, 44), (43, 56)], fang); c.poly([(51, 44), (55, 44), (53, 56)], fang)
    for (x, y) in [(43, 58), (53, 58), (44, 64), (52, 62)]: c.px(x, y, ven, 2, 3)
    # 팔 + 독병
    c.limb(34, 58, 22, 70, 5, 4, body); c.spike(18, 72, 2.4, 9, 3, fang); c.spike(20, 74, 1.8, 9, 3, fang)
    c.limb(62, 58, 74, 66, 5, 4, body); c.ell(80, 66, 6, 7, (120, 200, 230), cel=False); c.ell(80, 68, 5, 5, ven, cel=False); c.px(78, 58, bd, 5, 3)
    c.glow(80, 67, 12, ven, .6)
    # 독무
    for (x, y) in [(10, 14), (88, 14), (6, 44), (92, 40), (24, 12), (72, 10)]: c.px(x, y, ven, 3, 3); c.px(x + 1, y + 4, ven, 1, 3)
    return c.finish()

def main(base, out):
    old = Image.open(base).convert("RGBA"); sheet = Image.new("RGBA", (S * 5, S * 4), (0, 0, 0, 0)); sheet.alpha_composite(old, (0, 0))
    sheet.alpha_composite(frost_queen(), (4 * S, 2 * S)); sheet.alpha_composite(venom_lord(), (0, 3 * S))
    sheet.save(out)
    big = Image.new("RGBA", (S * 2 * 3, S * 3), (44, 48, 64, 255)); pv = Image.new("RGBA", (S * 2, S)); pv.alpha_composite(frost_queen(), (0, 0)); pv.alpha_composite(venom_lord(), (S, 0))
    big.alpha_composite(pv.resize((S * 2 * 3, S * 3), Image.NEAREST)); big.save("/tmp/boss5_preview.png")
main(sys.argv[1], sys.argv[2])
