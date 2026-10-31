# 붉은 탑 몬스터 시트: 기존 48px 시트를 검붉은 철갑 · 핏빛 팔레트로 다시 칠한다 (프레임은 그대로)
import numpy as np, colorsys
from PIL import Image
def recolor(src, dst, mode):
    im = np.array(Image.open(src).convert("RGBA")).astype(np.float32) / 255.0; out = im.copy(); H, W, _ = im.shape
    for y in range(H):
        for x in range(W):
            r, g, b, a = im[y, x]
            if a < 0.05: continue
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            if v < 0.16: nr, ng, nb = colorsys.hsv_to_rgb(0.98, 0.55, 0.10 + v * 0.8)          # 윤곽선: 검붉게
            elif s > 0.5 and v > 0.7 and (0.10 < h < 0.20):                                     # 노란 포인트(눈 · 장식) → 밝은 주황빛
                nr, ng, nb = colorsys.hsv_to_rgb(0.07, 0.85, min(1, v + 0.1))
            elif v > 0.85 and s < 0.25:                                                         # 흰 부분(뼈 · 날) → 분홍빛 흰색
                nr, ng, nb = colorsys.hsv_to_rgb(0.03, 0.30, v * 0.82) if mode == "skel" else colorsys.hsv_to_rgb(0.99, 0.18, v)
            else:                                                                               # 나머지 몸 → 진홍색 (밝기 유지, 채도 올림)
                hue = 0.995 if mode in ("brute", "necro") else 0.0
                nr, ng, nb = colorsys.hsv_to_rgb(hue, min(1, 0.55 + s * 0.5), min(1, 0.22 + v * 0.78 if mode == "brute" else (0.24 + v * 0.66 if mode == "skel" else 0.30 + v * 0.80)))
            out[y, x, :3] = (nr, ng, nb)
    Image.fromarray((out * 255).astype(np.uint8), "RGBA").save(dst)
if __name__ == "__main__":
    A = "/home/claude/game/art/"
    for src, dst, mode in [("imp_sheet48", "tw_imp_sheet48", "imp"), ("goblin_sheet48", "tw_ghoul_sheet48", "ghoul"), ("archer_sheet48", "tw_skel_sheet48", "skel"), ("shaman_sheet48", "tw_necro_sheet48", "necro"), ("brute_sheet48", "tw_brute_sheet48", "brute")]:
        recolor(A + src + ".png", A + dst + ".png", mode)
    names = ["tw_imp_sheet48", "tw_ghoul_sheet48", "tw_skel_sheet48", "tw_necro_sheet48", "tw_brute_sheet48"]
    ims = [Image.open(A + n + ".png").convert("RGBA") for n in names]; prev = Image.new("RGBA", (48 * 4 * 3, 48 * 3 * len(ims)), (30, 14, 20, 255))
    for i, im in enumerate(ims): prev.alpha_composite(im.crop((0, 0, 48 * 4, 48)).resize((48 * 4 * 3, 48 * 3), Image.NEAREST), (0, i * 48 * 3))
    prev.save("/tmp/tower_preview.png")
