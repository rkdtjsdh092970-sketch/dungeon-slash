// =========================================================
// 마을 건물: 2px 도트 단위로 벽돌/기와/판자/창문을 그리고 명암(왼쪽 빛, 오른쪽 그늘)을 넣는다.
// 정적 그림은 캔버스에 캐시하고, 연기·횃불·크리스털만 매 프레임 덧그린다.
// =========================================================
const TB_CACHE = {}, TB_W = 340, TB_H = 340, TB_OX = 170, TB_OY = 310;
const hexRgb = (h) => (typeof h === "string" ? [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] : h);
const shc = (h, f, a) => { const c = hexRgb(h); return `rgb(${Math.max(0, Math.min(255, Math.round(c[0] * f + (a || 0))))},${Math.max(0, Math.min(255, Math.round(c[1] * f + (a || 0))))},${Math.max(0, Math.min(255, Math.round(c[2] * f + (a || 0))))})`; };
const hsh = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 256 / 255;

function paintBuilding(type) {
  const cv = document.createElement("canvas"); cv.width = TB_W; cv.height = TB_H; const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
  const U = 2, R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(TB_OX + Math.round(x * U), TB_OY + Math.round(y * U), Math.max(1, Math.round(w * U)), Math.max(1, Math.round(h * U))); };
  const shadow = (w) => { c.fillStyle = "rgba(0,0,0,.30)"; c.beginPath(); c.ellipse(TB_OX + 4, TB_OY + 2, w * U * 0.62, 7, 0, 0, 7); c.fill(); };
  // 벽: 돌 / 판자 / 회반죽(목골)
  const brick = (x, y, w, h, base) => {
    R(x, y, w, h, shc(base, 0.55));
    for (let r = 0, yy = y; yy < y + h - 1; r++, yy += 3) for (let xx = x - (r % 2) * 3; xx < x + w; xx += 6) {
      const bx = Math.max(x, xx), bw = Math.min(x + w, xx + 5) - bx; if (bw <= 0) continue; const j = hsh(xx + 100, yy), col = shc(base, 0.86 + j * 0.3);
      R(bx, yy, bw, Math.min(2, y + h - yy), col); R(bx, yy, bw, 1, shc(base, 1.08 + j * 0.2, 6));
    }
    c.fillStyle = "rgba(255,244,214,.10)"; c.fillRect(TB_OX + x * U, TB_OY + y * U, 5 * U, h * U); c.fillStyle = "rgba(10,6,30,.26)"; c.fillRect(TB_OX + (x + w - 6) * U, TB_OY + y * U, 6 * U, h * U);
    R(x, y + h - 2, w, 2, shc(base, 0.5));
  };
  const planks = (x, y, w, h, base) => {
    for (let xx = x, i = 0; xx < x + w; xx += 4, i++) { const j = hsh(i, 7); R(xx, y, Math.min(4, x + w - xx), h, shc(base, 0.82 + j * 0.28)); R(xx, y, 1, h, shc(base, 0.5)); if (j > 0.55) R(xx + 2, y + 3 + Math.floor(j * 9) * 2, 1, 2, shc(base, 0.58)); }
    c.fillStyle = "rgba(255,240,200,.10)"; c.fillRect(TB_OX + x * U, TB_OY + y * U, 4 * U, h * U); c.fillStyle = "rgba(10,6,30,.24)"; c.fillRect(TB_OX + (x + w - 5) * U, TB_OY + y * U, 5 * U, h * U);
  };
  const plaster = (x, y, w, h, base, beam) => {
    R(x, y, w, h, shc(base, 0.98)); R(x, y + h - 3, w, 3, shc(base, 0.7)); c.fillStyle = "rgba(255,255,230,.14)"; c.fillRect(TB_OX + x * U, TB_OY + y * U, 6 * U, h * U); c.fillStyle = "rgba(20,10,40,.22)"; c.fillRect(TB_OX + (x + w - 7) * U, TB_OY + y * U, 7 * U, h * U);
    R(x, y, 2, h, beam); R(x + w - 2, y, 2, h, beam); R(x, y, w, 2, beam); R(x, y + h - 2, w, 2, beam); R(x + Math.floor(w / 2) - 1, y, 2, h, beam);
    for (let i = 0; i < 6; i++) R(x + 3 + hsh(i, 3) * (w - 8), y + 3 + hsh(i, 9) * (h - 8), 2, 1, shc(base, 0.86));
  };
  // 지붕: 박공(삼각)
  const roofGable = (cx, baseY, half, hgt, col, over) => {
    for (let r = 0; r < hgt; r++) {
      const y = baseY - hgt + r, hw = Math.round(half * (r + 1) / hgt) + (over || 0), band = r % 3, tone = band === 2 ? 0.62 : band === 1 ? 0.92 : 1.04;
      for (let x = -hw; x < hw; x++) {
        const L = x < 0, off = ((Math.floor(r / 3) % 2) * 2 + x + 200) % 5, line = off === 0 ? 0.74 : 1, j = hsh(x + cx, Math.floor(r / 3)) * 0.12;
        R(cx + x, y, 1, 1, shc(col, tone * line * (L ? 1.12 : 0.86) * (1 + j)));
      }
    }
    for (let x = -half; x < half; x += 1) R(cx + x, baseY - 1, 1, 1, "rgba(0,0,0,0)");
    R(cx - 1, baseY - hgt - 1, 2, 2, shc(col, 1.35, 20));
    R(cx - half - (over || 0), baseY, (half + (over || 0)) * 2, 2, shc(col, 0.4)); R(cx - half - (over || 0), baseY + 2, (half + (over || 0)) * 2, 2, "rgba(0,0,0,.28)");
  };
  // 지붕: 사다리꼴(경사 낮은 지붕)
  const roofTrap = (x, y, w, h, col, inset) => {
    for (let r = 0; r < h; r++) { const ins = Math.round(inset * (h - 1 - r) / Math.max(1, h - 1)), band = r % 3, tone = band === 2 ? 0.62 : band === 1 ? 0.92 : 1.04;
      for (let xx = x + ins; xx < x + w - ins; xx++) { const off = ((Math.floor(r / 3) % 2) * 2 + xx + 200) % 5; R(xx, y + r, 1, 1, shc(col, tone * (off === 0 ? 0.74 : 1) * (xx < x + w / 2 ? 1.1 : 0.88) * (1 + hsh(xx, r >> 1) * 0.1))); } }
    R(x - 1, y + h, w + 2, 2, shc(col, 0.4)); R(x - 1, y + h + 2, w + 2, 2, "rgba(0,0,0,.28)"); R(x + inset, y - 1, w - inset * 2, 1, shc(col, 1.4, 16));
  };
  const win = (x, y, w, h, o) => {
    o = o || {}; const lit = o.lit || "#ffd870", fr = o.frame || "#3a2618";
    if (o.shutter) { R(x - 3, y, 2, h, o.shutter); R(x + w + 1, y, 2, h, shc(o.shutter, 0.78)); R(x - 3, y + 2, 2, 1, shc(o.shutter, 0.6)); R(x + w + 1, y + h - 3, 2, 1, shc(o.shutter, 0.5)); }
    R(x - 1, y - 1, w + 2, h + 2, fr); for (let i = 0; i < h; i++) R(x, y + i, w, 1, shc(lit, 1.18 - 0.55 * i / h, i < 2 ? 12 : 0));
    R(x, y, 1, h, shc(lit, 0.8)); R(x + Math.floor(w / 2) - 0, y, 1, h, fr); R(x, y + Math.floor(h / 2), w, 1, fr); R(x + 1, y + 1, 2, 1, "rgba(255,255,255,.7)");
    R(x - 2, y + h + 1, w + 4, 1.5, shc("#a8987a", 1)); R(x - 2, y + h + 2.5, w + 4, 1, "rgba(0,0,0,.3)");
    if (o.glow !== false) { const g = c.createRadialGradient(TB_OX + (x + w / 2) * U, TB_OY + (y + h / 2) * U, 2, TB_OX + (x + w / 2) * U, TB_OY + (y + h / 2) * U, 20 + w * 2); g.addColorStop(0, "rgba(255,210,110,.22)"); g.addColorStop(1, "rgba(255,210,110,0)"); c.fillStyle = g; c.fillRect(TB_OX + (x - 12) * U, TB_OY + (y - 12) * U, (w + 24) * U, (h + 24) * U); }
    if (o.box) { R(x - 1, y + h + 2, w + 2, 3, "#6a4426"); R(x - 1, y + h + 2, w + 2, 1, "#8a5c34"); for (let i = 0; i < w; i += 2) R(x + i, y + h, 1, 2, i % 4 ? "#e85a8a" : "#ffd84a"); }
  };
  const door = (x, y, w, h, col, arch) => {
    R(x - 2, y - 2, w + 4, h + 2, "#6e6a78"); R(x - 2, y - 2, w + 4, 1, "#9a96a6");
    for (let i = 0; i < h; i++) { const inset = arch && i < 4 ? [3, 2, 1, 1][i] : 0; R(x + inset, y + i, w - inset * 2, 1, shc(col, 0.9 + hsh(i, 5) * 0.08)); }
    for (let xx = x + 3; xx < x + w; xx += 4) R(xx, y + (arch ? 3 : 0), 1, h - (arch ? 3 : 0), shc(col, 0.55)); R(x, y + Math.floor(h * 0.3), w, 1, "#2a2a34"); R(x, y + Math.floor(h * 0.7), w, 1, "#2a2a34");
    R(x + w - 4, y + Math.floor(h / 2), 2, 2, "#ffd84a"); R(x - 3, y + h, w + 6, 2, "#8a8696"); R(x - 3, y + h, w + 6, 1, "#b4b0c0");
  };
  const lantern = (x, y) => { R(x, y - 4, 1, 4, "#2a2230"); R(x - 1, y, 3, 4, "#ffcf5a"); R(x, y + 1, 1, 2, "#fff6c0"); R(x - 2, y - 1, 5, 1, "#2a2230"); R(x - 2, y + 4, 5, 1, "#2a2230"); const g = c.createRadialGradient(TB_OX + x * U, TB_OY + (y + 2) * U, 1, TB_OX + x * U, TB_OY + (y + 2) * U, 18); g.addColorStop(0, "rgba(255,200,90,.35)"); g.addColorStop(1, "rgba(255,200,90,0)"); c.fillStyle = g; c.fillRect(TB_OX + (x - 12) * U, TB_OY + (y - 10) * U, 24 * U, 24 * U); };
  const barrel = (x, y) => { R(x, y - 9, 8, 9, "#8a5a32"); R(x + 1, y - 10, 6, 1, "#a87642"); R(x, y - 7, 8, 1, "#4a3a3a"); R(x, y - 3, 8, 1, "#4a3a3a"); R(x, y - 9, 2, 9, "#a87642"); R(x + 6, y - 9, 2, 9, "#6a4424"); };
  const crate = (x, y, w, h) => { R(x, y - h, w, h, "#9a7040"); R(x, y - h, w, 1, "#c8985a"); R(x, y - 1, w, 1, "#5a3c20"); R(x, y - h, 1, h, "#c8985a"); R(x + w - 1, y - h, 1, h, "#5a3c20"); R(x + 1, y - h + 1, w - 2, 1, "#6a4a28"); for (let i = 1; i < w - 1; i++) R(x + i, y - h + 1 + ((i * h / w) | 0), 1, 1, "#6a4a28"); };
  const sack = (x, y) => { R(x + 1, y - 8, 6, 8, "#cdb98a"); R(x, y - 6, 8, 6, "#cdb98a"); R(x + 2, y - 10, 4, 3, "#b8a47a"); R(x + 1, y - 8, 2, 8, "#e6d8aa"); R(x + 6, y - 6, 2, 6, "#a89468"); };
  const bush = (x, y, r) => { for (let i = 0; i < r; i++) { R(x + i * 3 - 2, y - 5 - (i % 2) * 2, 6, 7, shc("#3f8a3a", 0.8 + hsh(i, 4) * 0.3)); R(x + i * 3 - 2, y - 5 - (i % 2) * 2, 2, 2, "#8ad060"); } R(x + 1, y - 1, r * 3 - 1, 2, "#2a5a2a"); };
  const sign = (x, y, w, h, bg, ic) => { R(x, y - 5, 1, 5, "#4a3a2a"); R(x, y - 5, 8, 1, "#4a3a2a"); R(x + w - 1, y - 1, 1, 2, "#4a3a2a"); R(x, y, w, h, "#4a3220"); R(x + 1, y + 1, w - 2, h - 2, bg); ic(x + 1, y + 1); };

  shadow(60);
  if (type === "skill") {   // 스킬 정비소: 파란 박공지붕 + 오른쪽 원형 탑 + 깃발
    plaster(-24, -34, 38, 34, "#d8ccb0", "#5a4028"); win(-18, -26, 7, 8, { shutter: "#4a6ab8", box: true, lit: "#a8d8ff" }); win(-6, -26, 7, 8, { shutter: "#4a6ab8", lit: "#ffd870" });
    roofGable(-5, -34, 24, 24, "#4a6ab8", 3);
    door(0, -15, 8, 15, "#7a4a2a", true); R(-14, -12, 12, 12, "#6a5a4a"); for (let i = 0; i < 3; i++) R(-13 + i * 4, -11, 3, 5, i % 2 ? "#a8381c" : "#2a6aa0"); lantern(-16, -16);
    brick(14, -52, 14, 52, "#9a9aac"); for (const yy of [-44, -30]) win(18, yy, 5, 7, { lit: "#8ad8ff", frame: "#2a2230" }); roofTrap(12, -66, 18, 14, "#3a58a0", 5); R(20, -76, 2, 10, "#d8d8e8"); R(22, -76, 12, 7, "#d84a5a"); R(22, -76, 12, 2, "#ff8a9a"); R(22, -70, 12, 1, "#9a2a3a");
    R(-26, -34, 2, 34, "#5a4028"); sign(-30, -22, 12, 8, "#2a2a44", (x, y) => { R(x + 4, y, 1, 6, "#e6eefc"); R(x + 2, y + 4, 5, 1, "#e8b83a"); });
    barrel(26, 0); bush(-34, 0, 3);
  } else if (type === "forge") {   // 대장간: 낮고 넓은 돌집, 큰 굴뚝, 화로
    brick(-30, -26, 50, 26, "#85808c"); roofTrap(-34, -38, 58, 12, "#5a4a44", 8); brick(10, -64, 12, 38, "#6e6670"); R(8, -66, 16, 3, "#4a4048"); R(8, -66, 16, 1, "#8a8090"); R(10, -64, 2, 38, "rgba(255,255,255,.1)");
    c.fillStyle = "#14080c"; R(-14, -22, 20, 22, "#14080c"); for (let i = 0; i < 20; i++) R(-14 + 1, -22 + 2 + i, 18, 1, `rgb(${255 - i * 3},${Math.round(180 - i * 6)},${Math.round(60 - i * 2)})`);
    R(-14, -22, 20, 2, "#14080c"); R(-12, -22, 16, 1, "#3a2a2a"); R(-16, -24, 24, 2, "#5a5460"); R(-16, -22, 2, 22, "#5a5460"); R(6, -22, 2, 22, "#5a5460");
    R(-9, -8, 10, 8, "#ff9a30"); R(-7, -12, 6, 6, "#ffd24a"); R(-5, -15, 2, 4, "#fff0a0");
    win(-28, -18, 6, 8, { lit: "#ffb060", frame: "#2a1c18" }); R(14, -10, 2, 10, "#4a3a2a"); R(14, -10, 10, 2, "#4a3a2a"); R(18, -8, 3, 8, "#9aa0b4"); R(17, -12, 6, 4, "#b8bccc");
    R(-34, -6, 12, 6, "#3a3a46"); R(-32, -9, 8, 4, "#5a5a6a"); R(-30, -11, 4, 2, "#8a8a9a"); R(-36, -8, 3, 2, "#5a5a6a"); R(-34, -9, 10, 1, "#9a9aae");     // 모루
    for (let i = 0; i < 4; i++) { R(24 + i * 3, -4 - (i % 2) * 3, 10, 3, "#8a5a32"); R(24 + i * 3, -4 - (i % 2) * 3, 10, 1, "#b88252"); } R(24, 0, 14, 1, "#5a3c20");
    lantern(-22, -26);
  } else if (type === "board") {   // 퀘스트 게시판: 지붕 달린 나무 게시판 + 벤치
    R(-24, -44, 4, 44, "#6a4426"); R(20, -44, 4, 44, "#6a4426"); R(-24, -44, 1, 44, "#8a5c34"); planks(-20, -38, 40, 26, "#a87a46"); R(-21, -39, 42, 2, "#3a2414"); R(-21, -13, 42, 2, "#3a2414");
    roofTrap(-30, -52, 60, 10, "#8a4a30", 14); R(-28, -42, 56, 2, "#3a2414");
    const papers = [[-17, -34, 9, 11, "#f2ead2"], [-5, -35, 8, 9, "#e8d8a8"], [5, -34, 10, 12, "#f2ead2"], [-15, -21, 8, 7, "#e8d8a8"], [-3, -23, 10, 8, "#d8e8d0"], [9, -20, 8, 7, "#f2ead2"]];
    papers.forEach(([x, y, w, h, col], i) => { R(x + 1, y + 1, w, h, "rgba(0,0,0,.25)"); R(x, y, w, h, col); R(x, y, w, 1, "rgba(255,255,255,.5)"); R(x + w / 2 - 1, y, 2, 2, ["#d84a5a", "#4a8ad8", "#e8b83a"][i % 3]); for (let k = 3; k < h - 1; k += 2) R(x + 1, y + k, w - 2 - (k % 3), 1, "#8a7a5a"); });
    R(-24, -6, 48, 3, "#6a4426"); R(-22, -3, 3, 3, "#4a3220"); R(18, -3, 3, 3, "#4a3220"); R(-24, -6, 48, 1, "#8a5c34"); lantern(-27, -34);
    for (let i = 0; i < 4; i++) R(-34 + i * 2, -2 - (i % 2), 2, 3, ["#e85a8a", "#ffd84a", "#fff", "#e85a8a"][i]);
  } else if (type === "guild") {   // 길드: 석조 홀, 붉은 지붕, 방패 문장, 깃발, 횃불
    brick(-34, -40, 68, 40, "#a89a8c"); roofGable(-22, -40, 14, 16, "#9a3a44", 3); roofGable(22, -40, 14, 16, "#9a3a44", 3); roofTrap(-30, -52, 60, 12, "#a8404c", 10); R(-34, -52, 68, 2, "#7a2a34");
    R(-12, -62, 24, 30, "#b8a898"); brick(-12, -62, 24, 30, "#b4a698"); roofGable(0, -62, 16, 16, "#c04a58", 3);
    R(-7, -58, 14, 14, "#2a2230"); R(-6, -57, 12, 12, "#a82a3a"); R(-6, -57, 12, 2, "#d84a5a"); R(-1, -55, 2, 8, "#fff"); R(-4, -52, 8, 2, "#fff"); R(-6, -45, 12, 1, "#e8b83a");
    door(-8, -18, 16, 18, "#5a3a22", true); R(-8, -10, 16, 1, "#2a2a34"); R(-1, -18, 2, 18, "#2a1c14");
    win(-30, -30, 7, 10, { lit: "#ffd870", shutter: "#7a2a34" }); win(23, -30, 7, 10, { lit: "#ffd870", shutter: "#7a2a34" }); win(-30, -14, 7, 6, { lit: "#ffd870" }); win(23, -14, 7, 6, { lit: "#ffd870" });
    R(-38, -50, 3, 36, "#5a4028"); R(-37, -50, 8, 18, "#c8384a"); R(-37, -33, 4, 3, "#c8384a"); R(-37, -50, 8, 2, "#e8b83a"); R(-34, -46, 2, 8, "#fff");
    R(35, -50, 3, 36, "#5a4028"); R(29, -50, 8, 18, "#c8384a"); R(33, -33, 4, 3, "#c8384a"); R(29, -50, 8, 2, "#e8b83a"); R(32, -46, 2, 8, "#fff");
    R(-16, -14, 3, 14, "#4a3a2a"); R(13, -14, 3, 14, "#4a3a2a"); R(-17, -17, 5, 3, "#2a2230"); R(12, -17, 5, 3, "#2a2230"); R(-12, 0, 24, 2, "#9a96a6"); R(-16, 2, 32, 2, "#7a7686");
  } else if (type === "auction") {   // 경매소: 줄무늬 차양 열린 상점, 진열대, 보석 상자
    R(-30, -4, 60, 4, "#6a4426"); R(-30, -4, 60, 1, "#8a5c34"); R(-28, -32, 3, 30, "#6a4426"); R(25, -32, 3, 30, "#6a4426"); R(-28, -32, 1, 30, "#8a5c34");
    for (let i = 0; i < 10; i++) { const col = i % 2 ? "#ead890" : "#b8303e"; R(-32 + i * 6.4, -46, 6.4, 14, col); R(-32 + i * 6.4, -46, 6.4, 2, shc(col, 1.2, 20)); R(-32 + i * 6.4 + 3, -32, 4, 3, col); R(-32 + i * 6.4 + 4, -29, 2, 1, col); R(-32 + i * 6.4 + 5, -46 + 8, 1, 6, shc(col, 0.8)); }
    R(-34, -48, 68, 3, "#6a2a1a"); R(-34, -48, 68, 1, "#a85a3a");
    R(-24, -22, 48, 14, "#7a5230"); R(-24, -22, 48, 3, "#a8763e"); R(-24, -8, 48, 2, "#4a3220");
    R(-18, -30, 10, 8, "#e8b83a"); R(-18, -30, 10, 2, "#ffe070"); R(-18, -25, 10, 1, "#a87a14"); R(-14, -27, 2, 2, "#fff6b0");
    R(-3, -34, 8, 12, "#7a4ad8"); R(-3, -34, 3, 12, "#a888f0"); R(-1, -36, 4, 3, "#7a4ad8"); R(10, -31, 9, 9, "#4ac8d8"); R(10, -31, 3, 9, "#9af0f8"); R(12, -34, 5, 4, "#4ac8d8");
    R(-26, -12, 4, 4, "#f2ead2"); R(24, -12, 4, 4, "#f2ead2"); crate(-36, 0, 9, 8); crate(27, 0, 9, 7); crate(28, -7, 7, 6);
    lantern(-20, -42); lantern(20, -42); R(-4, -44, 8, 6, "#e8d8a0"); R(-3, -43, 6, 4, "#3a2a1a"); R(-1, -42, 2, 2, "#e8b83a");
    for (let i = 0; i < 8; i++) R(-28 + i * 8, -52 + Math.abs(Math.sin(i)) * 2, 4, 5, ["#e85a8a", "#ffd84a", "#4ac8d8", "#a8e84a"][i % 4]);
  } else if (type === "shop") {   // 상점·창고: 초록 지붕 가게 + 줄무늬 차양 + 오른쪽 창고(포대)
    plaster(-22, -28, 34, 28, "#e0d4b4", "#4a3a28"); roofGable(-5, -28, 22, 20, "#3a7a58", 3);
    win(-18, -22, 10, 11, { lit: "#ffe090", frame: "#4a3a28" }); R(-18, -12, 10, 3, "#8a5a32"); R(-17, -15, 3, 3, "#c84a4a"); R(-13, -15, 3, 3, "#4ac84a"); R(-9, -15, 2, 3, "#e8b83a");
    door(0, -16, 8, 16, "#7a4a2a", false);
    for (let i = 0; i < 8; i++) { const col = i % 2 ? "#ffffff" : "#3a7a58"; R(-24 + i * 4, -31, 4, 5, col); R(-24 + i * 4 + 1, -26, 2, 1, col); }
    R(-24, -32, 32, 1, "#2a5a40"); R(14, -22, 24, 22, "#8a6a42"); planks(14, -22, 24, 22, "#a07a4c"); roofTrap(12, -30, 28, 8, "#6a4a30", 4); R(18, -14, 8, 10, "#4a3220"); R(19, -13, 6, 8, "#2a1c14");
    sack(30, 0); sack(24, 0); sack(27, -8); barrel(-34, 0); barrel(-27, 0); crate(-33, -9, 6, 5);
    sign(-28, -34, 10, 8, "#e8d8a0", (x, y) => { R(x + 2, y + 2, 5, 4, "#8a5a32"); R(x + 3, y + 1, 3, 1, "#8a5a32"); R(x + 4, y + 3, 1, 1, "#ffd84a"); }); bush(36, 0, 2);
  } else if (type === "trainer") {   // 훈련소: 2층 도장 지붕(끝이 올라간 모양), 붉은 기둥, 허수아비·무기 걸이
    R(-30, -2, 60, 2, "#6a6676"); plaster(-24, -24, 48, 22, "#e8e0cc", "#a82a2a"); R(-26, -26, 4, 24, "#a82a2a"); R(22, -26, 4, 24, "#a82a2a"); R(-26, -26, 1, 24, "#d85a5a");
    door(-5, -18, 10, 16, "#5a3a22", false); win(-20, -18, 8, 8, { lit: "#ffe090", frame: "#7a1a1a" }); win(12, -18, 8, 8, { lit: "#ffe090", frame: "#7a1a1a" });
    roofTrap(-34, -38, 68, 12, "#4a5a82", 12); R(-38, -38, 8, 3, "#4a5a82"); R(30, -38, 8, 3, "#4a5a82"); R(-40, -40, 4, 3, "#6a7aa2"); R(36, -40, 4, 3, "#6a7aa2");
    plaster(-14, -52, 28, 14, "#e8e0cc", "#a82a2a"); roofTrap(-22, -64, 44, 12, "#3a4a72", 12); R(-26, -64, 6, 3, "#3a4a72"); R(20, -64, 6, 3, "#3a4a72"); R(-27, -66, 3, 3, "#5a6a92"); R(24, -66, 3, 3, "#5a6a92");
    R(-7, -48, 14, 8, "#a82a2a"); R(-1, -47, 2, 6, "#fff"); R(-4, -45, 8, 2, "#fff");
    R(-42, -26, 2, 26, "#5a4028"); R(-48, -26, 14, 2, "#5a4028"); R(-47, -20, 12, 3, "#5a4028"); for (let i = 0; i < 3; i++) { R(-46 + i * 4, -24, 2, 14, "#b8bccc"); R(-46 + i * 4, -24, 1, 14, "#e6eefc"); R(-47 + i * 4, -10, 4, 2, "#e8b83a"); }
    R(32, -4, 2, 4, "#5a4028"); R(33, -26, 2, 26, "#8a5a32"); R(26, -22, 16, 3, "#8a5a32"); R(28, -34, 12, 12, "#c8a868"); R(29, -34, 4, 12, "#e6c88a"); R(31, -36, 8, 3, "#c8a868"); R(34, -30, 3, 3, "#a82a2a");
  } else if (type === "skillshop") {   // 스킬 상점: 높은 마법사 탑 + 크리스털 + 포션 창고
    brick(-14, -44, 28, 44, "#6a5a9a"); for (let i = 0; i < 3; i++) R(-14, -44 + i * 14, 28, 2, "#8a7ab8");
    brick(-11, -76, 22, 32, "#7a6aaa"); roofTrap(-17, -90, 34, 14, "#3a2a6a", 10); roofGable(0, -90, 10, 26, "#2a1a5a", 2);
    R(-1, -128, 2, 12, "#ffe45a"); R(-4, -124, 8, 2, "#ffe45a"); R(-1, -130, 2, 2, "#fff6b0");
    win(-5, -70, 10, 14, { lit: "#d8a0ff", frame: "#2a1a4a" }); win(-4, -36, 8, 10, { lit: "#8ad8ff", frame: "#2a1a4a" }); win(-4, -54, 8, 8, { lit: "#ffd870", frame: "#2a1a4a" });
    R(-18, -44, 36, 3, "#4a3a7a"); R(-18, -44, 36, 1, "#9a8ad0"); for (let i = 0; i < 6; i++) R(-17 + i * 6, -47, 2, 3, "#4a3a7a");
    door(-5, -17, 10, 17, "#5a3a22", true); for (let i = 0; i < 3; i++) R(-2 + i, -12 + i * 2, 1, 1, "#d8a0ff");
    brick(14, -14, 24, 14, "#7a6aa8"); roofTrap(12, -22, 28, 8, "#4a3a7a", 6); R(18, -10, 6, 10, "#2a1c3a"); R(28, -11, 6, 6, "#8ad8ff"); R(29, -6, 4, 6, "#d8a0ff");
    for (const [x, y, col] of [[-30, -6, "#d84a5a"], [-26, -3, "#4ac8d8"], [-22, -1, "#a8e84a"]]) { R(x, y - 6, 5, 6, col); R(x + 1, y - 8, 3, 2, "#c8c8d8"); R(x + 1, y - 5, 1, 3, "rgba(255,255,255,.5)"); }
    R(-40, -2, 14, 2, "#4a3a2a");
  } else if (type === "notice") {   // 업데이트 게시판: 기와 지붕 달린 큰 나무 게시판 + 두루마리
    R(-20, -52, 4, 52, "#6a4426"); R(16, -52, 4, 52, "#6a4426"); R(-20, -52, 1, 52, "#8a5c34"); R(-22, -3, 8, 3, "#4a3220"); R(14, -3, 8, 3, "#4a3220");
    planks(-17, -44, 34, 34, "#b0824c"); R(-18, -46, 36, 2, "#3a2414"); R(-18, -11, 36, 2, "#3a2414");
    roofTrap(-26, -60, 52, 12, "#a83a3a", 12); R(-24, -48, 48, 2, "#3a2414"); R(-4, -64, 8, 4, "#e8b83a"); R(-1, -68, 2, 5, "#ffe070");
    R(-13, -40, 26, 6, "#c8384a"); R(-13, -40, 26, 1, "#ff7a7a"); R(-9, -38, 18, 2, "#ffe9a0");                            // '업데이트' 띠
    for (let i = 0; i < 5; i++) { R(-13, -31 + i * 4, 20 - (i % 3) * 3, 1, "#5a3c20"); R(-13, -30 + i * 4, 3, 1, "#8a5c34"); }
    R(8, -32, 7, 9, "#f2ead2"); R(8, -32, 7, 1, "#fff"); R(10, -30, 3, 1, "#8a7a5a"); R(10, -28, 3, 1, "#8a7a5a"); R(11, -33, 1, 2, "#d84a5a");     // 쪽지
    R(-6, -14, 12, 3, "#e8d8a0"); R(-8, -14, 3, 4, "#c8b070"); R(5, -14, 3, 4, "#c8b070"); R(-1, -13, 2, 2, "#c8384a");              // 두루마리
    lantern(-24, -40); lantern(24, -40); barrel(-34, 0); bush(26, 0, 2);
  } else if (type === "gate") {   // 포탈 문
    brick(-26, -46, 14, 46, "#7a7a8a"); brick(12, -46, 14, 46, "#7a7a8a"); brick(-26, -56, 52, 10, "#8a8a9a"); R(-14, -46, 28, 46, "#2a3a7a");
    for (let i = 0; i < 46; i++) R(-12, -46 + i, 24, 1, `rgb(${50 + i},${90 + i * 2},${210})`); R(-4, -36, 8, 12, "#c8e0ff");
  }
  return cv;
}
// 매 프레임 덧그리는 움직이는 요소 (연기·횃불·크리스털)
function drawBuildingAnim(g, type, x, y) {
  const t = performance.now() / 1000, U = 2;
  if (type === "forge") for (let i = 0; i < 6; i++) { const p = (t * 0.5 + i / 6) % 1, px = x + 32 + Math.sin(t * 1.3 + i) * 5 + p * 14, py = y - 132 - p * 70, r = 4 + p * 9; g.fillStyle = `rgba(160,156,170,${0.5 * (1 - p)})`; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
  if (type === "forge") for (let i = 0; i < 5; i++) { const p = (t * 1.4 + i * 0.37) % 1; g.fillStyle = `rgba(255,${170 + i * 14},60,${1 - p})`; g.fillRect(x - 16 + i * 4 + Math.sin(i * 5 + t * 6) * 3, y - 34 - p * 24, 2, 2); }
  if (type === "guild") for (const sx of [-14, 14]) { const f = 0.85 + Math.sin(t * 11 + sx) * 0.15; g.fillStyle = `rgba(255,${150 + f * 60},50,.9)`; g.fillRect(x + sx * U - 2, y - 38 - f * 4, 5, 8 + f * 4); g.fillStyle = "rgba(255,240,170,.95)"; g.fillRect(x + sx * U - 1, y - 34, 3, 5); const gl = g.createRadialGradient(x + sx * U, y - 32, 1, x + sx * U, y - 32, 26); gl.addColorStop(0, "rgba(255,170,60,.25)"); gl.addColorStop(1, "rgba(255,170,60,0)"); g.fillStyle = gl; g.fillRect(x + sx * U - 26, y - 58, 52, 52); }
  if (type === "skillshop") for (let i = 0; i < 3; i++) { const a = t * 0.9 + i * 2.1, cx = x + Math.cos(a) * 34, cy = y - 150 + Math.sin(a * 1.3) * 8 - i * 4; g.fillStyle = ["#d8a0ff", "#8ad8ff", "#ffe45a"][i]; g.fillRect(cx - 3, cy - 5, 6, 10); g.fillStyle = "#fff"; g.fillRect(cx - 1, cy - 4, 2, 4); g.fillStyle = "rgba(200,160,255,.2)"; g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fill(); }
}
function drawNew(g, x, y) {   // 읽지 않은 패치 노트 표시
  const t = performance.now() / 1000, b = Math.abs(Math.sin(t * 3)) * 6; g.save(); g.translate(x + 40, y - 150 - b); g.fillStyle = "#e83a3a"; g.beginPath(); if (g.roundRect) g.roundRect(-20, -11, 40, 22, 8); else g.rect(-20, -11, 40, 22); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#fff"; g.font = "bold 13px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NEW", 0, 1); g.restore();
}
function drawBang(g, x, y) {   // 퀘스트 게시판: 받을 수 있는 퀘스트/완료된 퀘스트가 있을 때 노란 느낌표
  const t = performance.now() / 1000, b = Math.abs(Math.sin(t * 3)) * 6; g.save(); g.translate(x, y - 132 - b); g.fillStyle = "#ffd24a"; g.strokeStyle = "#6a4a08"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 17, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#3a2604"; g.font = "bold 24px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 0, 2); g.restore();
}
function drawBuilding(g, type, x, y, theme, hot) {
  if (!TB_CACHE[type]) TB_CACHE[type] = paintBuilding(type);
  const cv = TB_CACHE[type]; g.save(); g.imageSmoothingEnabled = false; g.drawImage(cv, x - TB_OX, y - TB_OY);
  if (hot) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.22; g.drawImage(cv, x - TB_OX, y - TB_OY); }
  g.restore(); drawBuildingAnim(g, type, x, y); if (type === "notice" && typeof notesUnread === "function" && notesUnread()) drawNew(g, x, y);
  if (type === "board" && typeof questBang === "function" && questBang(TownView.act)) drawBang(g, x, y);
}
