# 신관 몬스터 시트: 기존 48px 시트를 흰색·금색 신관 팔레트로 다시 칠한다 (프레임·애니메이션은 그대로)
import numpy as np, colorsys, sys
from PIL import Image
def recolor(src, dst, mode):
    im = np.array(Image.open(src).convert("RGBA")).astype(np.float32) / 255.0; out = im.copy(); H, W, _ = im.shape
    for y in range(H):
        for x in range(W):
            r, g, b, a = im[y, x]
            if a < 0.05: continue
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            if v < 0.16:   # 윤곽선: 갈색 톤으로
                nr, ng, nb = colorsys.hsv_to_rgb(0.08, 0.5, 0.20 + v)
            elif s > 0.45 and v > 0.45 and mode in ("necro", "imp", "eye") and (h > 0.70 or h < 0.05):   # 보라·붉은 포인트 → 금색 빛
                nr, ng, nb = colorsys.hsv_to_rgb(0.12, 0.75, min(1, v + 0.25))
            elif mode == "brute" and s > 0.35 and 0.0 <= h < 0.12:   # 갑옷 붉은색 → 흰 도금
                nr, ng, nb = colorsys.hsv_to_rgb(0.11, 0.18, min(1, 0.70 + v * 0.35))
            elif mode == "necro":   # 보라 로브 → 상아색 로브
                nr, ng, nb = colorsys.hsv_to_rgb(0.11, 0.10, min(1, 0.62 + v * 0.95))
            elif mode == "skel":   # 해골 → 금빛 도는 흰 뼈 + 후드는 흰 천
                nr, ng, nb = colorsys.hsv_to_rgb(0.12, 0.20 if v > 0.4 else 0.14, min(1, 0.58 + v * 0.62))
            elif mode == "ghoul":   # 구울 녹색 피부 → 수도사 로브(상아색)
                nr, ng, nb = colorsys.hsv_to_rgb(0.10, 0.10, min(1, 0.60 + v * 0.80))
            elif mode == "imp":   # 임프 보라 → 흰 날개의 복사
                nr, ng, nb = colorsys.hsv_to_rgb(0.11, 0.08, min(1, 0.64 + v * 0.75))
            else:
                nr, ng, nb = colorsys.hsv_to_rgb((h + 0.12) % 1, s * 0.5, min(1, v * 1.1 + 0.15))
            out[y, x, :3] = (nr, ng, nb)
    Image.fromarray((out * 255).astype(np.uint8), "RGBA").save(dst)
if __name__ == "__main__":
    A = "/home/claude/game/art/"
    for src, dst, mode in [("imp_sheet48", "pri_imp_sheet48", "imp"), ("goblin_sheet48", "pri_ghoul_sheet48", "ghoul"), ("archer_sheet48", "pri_skel_sheet48", "skel"), ("shaman_sheet48", "pri_necro_sheet48", "necro"), ("brute_sheet48", "pri_brute_sheet48", "brute")]:
        recolor(A + src + ".png", A + dst + ".png", mode)
    names = ["pri_imp_sheet48", "pri_ghoul_sheet48", "pri_skel_sheet48", "pri_necro_sheet48", "pri_brute_sheet48"]
    ims = [Image.open(A + n + ".png").convert("RGBA") for n in names]; prev = Image.new("RGBA", (48 * 4 * 3 * 1, 48 * 3 * len(ims) // 1 * 1), (52, 48, 70, 255))
    for i, im in enumerate(ims): c = im.crop((0, 0, 48 * 4, 48)).resize((48 * 4 * 3, 48 * 3), Image.NEAREST); prev.alpha_composite(c, (0, i * 48 * 3))
    prev.save("/tmp/priests_preview.png")
