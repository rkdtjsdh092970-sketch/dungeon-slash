// =========================================================
// 에셋: 스프라이트 시트 로딩 / 색조 변환 / 배경 · 아이콘 · 건물(코드로 그림)
// =========================================================
const SPR_ROWS = {
  warrior: { idle: [0, 4, 4, true], attack: [1, 5, 12, false], hurt: [2, 1, 6, false], death: [3, 3, 6, false] },
  std: { idle: [0, 4, 4, true], walk: [1, 4, 8, true], attack: [2, 5, 10, false], hurt: [3, 1, 6, false], death: [4, 3, 6, false] },
};
const IMG = {};
function loadAssets(done) {
  const names = Object.keys(SPRITE_DATA); let n = 0;
  for (const k of names) { const im = new Image(); im.onload = () => { if (++n === names.length) done(); }; im.src = SPRITE_DATA[k]; IMG[k] = im; }
}
function hueShiftCanvas(img, deg) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  if (!deg) return c;
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const dd = mx - mn; s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); h = mx === r ? (gg - b) / dd + (gg < b ? 6 : 0) : mx === gg ? (b - r) / dd + 2 : (r - gg) / dd + 4; h /= 6; }
    if (s < 0.12) continue;   // 회색(갑옷/뼈 등)은 유지
    h = (h + deg / 360 + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    d[i] = f(h + 1 / 3) * 255; d[i + 1] = f(h) * 255; d[i + 2] = f(h - 1 / 3) * 255;
  }
  g.putImageData(id, 0, 0); return c;
}
const SHEET_CACHE = {};
function getSheet(name, hue) { const k = name + ":" + (hue || 0); if (!SHEET_CACHE[k]) SHEET_CACHE[k] = hueShiftCanvas(IMG[name], hue); return SHEET_CACHE[k]; }
function animFrame(kind, anim, t) {
  const R = (kind === "warrior" ? SPR_ROWS.warrior : SPR_ROWS.std)[anim]; if (!R) return { row: 0, frame: 0, done: true };
  const idx = Math.floor(t * R[2]);
  return { row: R[0], frame: R[3] ? idx % R[1] : Math.min(R[1] - 1, idx), done: !R[3] && idx >= R[1], n: R[1], fps: R[2] };
}
// 스프라이트(32x32)를 발밑 기준(x,y)에 그린다
function drawSprite(ctx, sheet, row, frame, x, y, sc, flip, alpha, tint) {
  ctx.save(); if (alpha != null && alpha < 1) ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  const cs = sheet.width / 5, dx = x - (cs / 2) * sc, dy = y - (cs - 4) * sc;
  if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  if (tint) {
    const t = tintTmp(sheet, frame * cs, row * cs, cs, cs, tint); ctx.drawImage(t, 0, 0, cs, cs, dx, dy, cs * sc, cs * sc);
  } else ctx.drawImage(sheet, frame * cs, row * cs, cs, cs, dx, dy, cs * sc, cs * sc);
  ctx.restore();
}
const _tintC = document.createElement("canvas"); _tintC.width = _tintC.height = 128; const _tintG = _tintC.getContext("2d");
function tintTmp(sheet, sx, sy, w, h, color) {
  _tintG.clearRect(0, 0, 128, 128); _tintG.globalCompositeOperation = "source-over"; _tintG.drawImage(sheet, sx, sy, w, h, 0, 0, w, h);
  _tintG.globalCompositeOperation = "source-atop"; _tintG.fillStyle = color; _tintG.fillRect(0, 0, w, h); _tintG.globalCompositeOperation = "source-over"; return _tintC;
}
function drawBossSprite(ctx, idx, x, y, sc, opt) {   // 보스 시트: 96x96 프레임, 화면 크기는 기존(64 기준)과 같게 2/3로 축소
  opt = opt || {}; const BS = 96, sx = (idx % 5) * BS, sy = Math.floor(idx / 5) * BS;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(x, y); ctx.scale(sc * (opt.sx || 1) * (64 / BS), sc * (opt.sy || 1) * (64 / BS));
  if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
  const src = opt.hue ? getSheet("bosses", opt.hue) : IMG.bosses;
  if (opt.tint) { const t = tintTmp(src, sx, sy, BS, BS, opt.tint); ctx.drawImage(t, 0, 0, BS, BS, -BS / 2, -BS * 0.94, BS, BS); }
  else ctx.drawImage(src, sx, sy, BS, BS, -BS / 2, -BS * 0.94, BS, BS);
  ctx.restore();
}

// ---------------- 아이콘 (16x16 도트, 코드로 그림) ----------------
const ICON_FN = {
  sword: (p) => { for (let i = 0; i < 9; i++) p(4 + i, 11 - i, 2, 2, i > 7 ? "#fff" : "#e6eefc"); p(2, 10, 5, 2, "#e8b83a"); p(3, 12, 2, 3, "#8a5a32"); },
  dagger: (p) => { for (let i = 0; i < 7; i++) p(5 + i, 10 - i, 2, 2, "#dfe8f5"); p(3, 10, 5, 1, "#e8b83a"); p(3, 11, 2, 3, "#8a5a32"); },
  hammer: (p) => { p(3, 2, 9, 5, "#9aa4b8"); p(3, 2, 9, 1, "#d6deec"); p(7, 7, 2, 8, "#8a5a32"); },
  bolt: (p) => { p(8, 1, 3, 4, "#ffe45a"); p(6, 4, 4, 3, "#ffe45a"); p(8, 6, 4, 3, "#fff6b0"); p(5, 8, 4, 3, "#ffe45a"); p(6, 10, 3, 4, "#ffd024"); },
  fist: (p) => { p(3, 5, 10, 8, "#e0a878"); p(3, 4, 2, 3, "#e0a878"); p(6, 3, 2, 3, "#e0a878"); p(9, 3, 2, 3, "#e0a878"); p(3, 12, 10, 2, "#b87c50"); },
  bomb: (p) => { p(3, 5, 10, 9, "#3a3a4a"); p(4, 4, 8, 11, "#3a3a4a"); p(5, 6, 3, 3, "#7a7a90"); p(10, 1, 2, 3, "#c8a050"); p(11, 0, 3, 2, "#ff9a30"); },
  spear: (p) => { for (let i = 0; i < 11; i++) p(2 + i, 13 - i, 2, 2, "#8a5a32"); p(11, 2, 4, 4, "#e6eefc"); p(13, 1, 2, 2, "#fff"); },
  arrow: (p) => { for (let i = 0; i < 10; i++) p(2 + i, 12 - i, 2, 2, "#c8b090"); p(11, 1, 4, 4, "#e6eefc"); p(2, 11, 3, 3, "#ff6a6a"); },
  flame: (p) => { p(6, 2, 4, 3, "#ff9a30"); p(5, 5, 6, 4, "#ff7a20"); p(4, 8, 8, 5, "#ff5a10"); p(6, 7, 4, 5, "#ffd24a"); },
  sweep: (p) => { for (let i = 0; i < 10; i++) p(2 + i, 10 - Math.floor(Math.sin(i / 3) * 3), 3, 2, i % 2 ? "#c0ffc0" : "#80e090"); p(2, 12, 12, 2, "#e6eefc"); },
  horn: (p) => { p(2, 8, 4, 4, "#e8b83a"); p(5, 6, 4, 6, "#f0c850"); p(8, 4, 6, 8, "#ffd870"); p(12, 3, 2, 2, "#fff"); },
  skull: (p) => { p(3, 2, 10, 8, "#f0ecd8"); p(4, 9, 8, 4, "#f0ecd8"); p(4, 5, 3, 3, "#2a2030"); p(9, 5, 3, 3, "#2a2030"); p(7, 9, 2, 2, "#2a2030"); },
  snow: (p) => { p(7, 1, 2, 14, "#a8e8ff"); p(1, 7, 14, 2, "#a8e8ff"); for (let i = 0; i < 4; i++) { p(3 + i, 3 + i, 2, 2, "#d8f4ff"); p(11 - i, 3 + i, 2, 2, "#d8f4ff"); } },
  fang: (p) => { p(3, 3, 4, 9, "#f4f0e0"); p(9, 3, 4, 9, "#f4f0e0"); p(4, 11, 2, 3, "#f4f0e0"); p(10, 11, 2, 3, "#f4f0e0"); p(2, 2, 12, 2, "#e03a5a"); },
  heart: (p) => { p(2, 3, 5, 5, "#ff5a7a"); p(9, 3, 5, 5, "#ff5a7a"); p(2, 6, 12, 4, "#ff5a7a"); p(4, 10, 8, 3, "#ff5a7a"); p(6, 13, 4, 2, "#ff5a7a"); p(4, 4, 2, 2, "#ffc0cc"); },
  cloud: (p) => { p(2, 4, 12, 5, "#aab4cc"); p(4, 2, 7, 4, "#c8d0e4"); p(7, 8, 3, 3, "#ffe45a"); p(5, 10, 3, 3, "#ffe45a"); p(8, 12, 3, 3, "#ffd024"); },
  axe: (p) => { p(7, 2, 2, 13, "#8a5a32"); p(2, 2, 6, 7, "#dfe8f5"); p(2, 2, 6, 1, "#fff"); p(8, 3, 3, 4, "#bfc8dc"); },
  meteor: (p) => { p(6, 4, 8, 8, "#ff7a30"); p(8, 6, 4, 4, "#ffd24a"); for (let i = 0; i < 6; i++) p(5 - i, 5 - i, 2, 2, "#ffb060"); },
  claw: (p) => { for (let i = 0; i < 3; i++) for (let k = 0; k < 9; k++) p(3 + i * 4 + (k >> 2), 2 + k, 2, 2, k < 7 ? "#ff7a7a" : "#ffd0d0"); },
  volley: (p) => { for (let i = 0; i < 3; i++) { for (let k = 0; k < 7; k++) p(2 + i * 4 + (k >> 1), 3 + k, 1, 2, "#d8d0b8"); p(1 + i * 4, 2 + 0, 3, 2, "#fff"); } },
  venom: (p) => { p(6, 2, 4, 3, "#6ae04a"); p(4, 5, 8, 6, "#4ab82a"); p(6, 11, 4, 3, "#3a9a1a"); p(7, 6, 2, 2, "#d8ffc0"); p(9, 8, 1, 1, "#d8ffc0"); },
  shard: (p) => { for (let i = 0; i < 3; i++) { p(3 + i * 4, 2 + i, 3, 8 - i, "#8ae0ff"); p(4 + i * 4, 3 + i, 1, 5, "#e8fbff"); } },
  orb2: (p) => { p(6, 6, 4, 4, "#c58bff"); p(7, 7, 2, 2, "#fff"); p(2, 3, 3, 3, "#a070f0"); p(11, 4, 3, 3, "#a070f0"); p(5, 11, 3, 3, "#a070f0"); },
  blade: (p) => { for (let i = 0; i < 8; i++) { p(2 + i, 6 - (i >> 1), 2, 2, "#ffd0c8"); p(12 - i, 9 + (i >> 1), 2, 2, "#ffa090"); } p(7, 7, 3, 3, "#fff"); },
  trap: (p) => { p(3, 8, 10, 5, "#6a5a3a"); p(5, 6, 6, 3, "#8a7a4a"); p(7, 4, 2, 3, "#ff4a3a"); for (let i = 0; i < 4; i++) p(2 + i * 3, 13, 2, 2, "#c0b080"); },
  snow2: (p) => { p(7, 1, 2, 14, "#bfeaff"); p(1, 7, 14, 2, "#bfeaff"); p(3, 3, 2, 2, "#fff"); p(11, 11, 2, 2, "#fff"); p(11, 3, 2, 2, "#8ae0ff"); p(3, 11, 2, 2, "#8ae0ff"); },
  inferno: (p) => { p(3, 9, 10, 5, "#ff5a10"); p(4, 6, 8, 4, "#ff8a20"); p(6, 3, 4, 4, "#ffd24a"); p(7, 1, 2, 3, "#fff0b0"); p(2, 11, 2, 3, "#ffb040"); p(12, 10, 2, 4, "#ffb040"); },
  plague: (p) => { p(2, 7, 12, 6, "#5ab82a"); p(4, 4, 8, 5, "#8ae04a"); p(6, 3, 4, 3, "#b8ff80"); p(5, 9, 2, 2, "#2a6a10"); p(9, 10, 2, 2, "#2a6a10"); },
  storm: (p) => { p(2, 2, 12, 4, "#8a94b0"); p(4, 1, 8, 3, "#aab4d0"); p(8, 6, 2, 3, "#fff08a"); p(6, 8, 3, 3, "#fff08a"); p(8, 10, 2, 4, "#ffd024"); },
  spirit: (p) => { p(5, 2, 6, 5, "#8affc8"); p(4, 5, 8, 6, "#6ae0b0"); p(5, 11, 2, 3, "#6ae0b0"); p(9, 11, 2, 3, "#6ae0b0"); p(6, 4, 1, 2, "#103a2a"); p(9, 4, 1, 2, "#103a2a"); },
  vortex: (p) => { for (let i = 0; i < 6; i++) { p(2 + i, 8 - (i > 3 ? 6 - i : i), 2, 2, "#c070ff"); p(12 - i, 7 + (i > 3 ? 6 - i : i), 2, 2, "#8a40d0"); } p(7, 7, 2, 2, "#1a0830"); },
  boots: (p) => { p(3, 3, 5, 8, "#8a5a32"); p(3, 10, 10, 4, "#6a4222"); p(2, 13, 11, 2, "#3a2a1c"); p(3, 3, 5, 2, "#c8a060"); p(4, 6, 1, 3, "#a87a42"); p(11, 10, 2, 1, "#a87a42"); },
  voidmaw: (p) => { p(2, 4, 12, 8, "#2a1048"); p(3, 5, 10, 6, "#6a2ab8"); p(4, 6, 8, 4, "#12041c"); for (let i = 0; i < 4; i++) { p(3 + i * 3, 4, 2, 2, "#f0e8ff"); p(3 + i * 3, 10, 2, 2, "#f0e8ff"); } p(7, 7, 2, 2, "#ff70e0"); },
  dimslash: (p) => { for (let i = 0; i < 11; i++) { p(2 + i, 13 - i, 2, 2, i > 8 ? "#fff" : "#e0a0ff"); } p(1, 11, 3, 3, "#7a3ad8"); p(11, 1, 3, 3, "#7a3ad8"); p(7, 7, 2, 2, "#ff70e0"); },
  doomrain: (p) => { p(1, 1, 14, 4, "#3a1c68"); p(3, 0, 10, 3, "#5a2ca0"); for (let i = 0; i < 4; i++) { p(3 + i * 3, 5 + (i % 2) * 2, 2, 6 - (i % 2) * 2, "#d890ff"); p(3 + i * 3, 12, 2, 2, "#fff"); } },
  abyssling: (p) => { p(5, 2, 6, 5, "#9a6aff"); p(4, 6, 8, 6, "#6a3ad0"); p(3, 8, 2, 5, "#4a2a98"); p(11, 8, 2, 5, "#4a2a98"); p(6, 4, 1, 2, "#ffe8ff"); p(9, 4, 1, 2, "#ffe8ff"); p(6, 12, 2, 3, "#3a1c70"); p(9, 12, 2, 3, "#3a1c70"); },

  magmafall: (p) => { p(2, 1, 3, 3, "#ff9a30"); p(7, 0, 3, 4, "#ffd24a"); p(11, 2, 3, 3, "#ff7a20"); p(3, 6, 3, 3, "#ff5a10"); p(9, 7, 4, 3, "#ff8a20"); p(1, 11, 14, 4, "#7a1c08"); p(2, 11, 12, 2, "#ff5a10"); p(5, 11, 3, 1, "#ffd24a"); },
  solarflare: (p) => { p(5, 5, 6, 6, "#fff0b0"); p(6, 6, 4, 4, "#ffd24a"); p(7, 0, 2, 4, "#ff9a30"); p(7, 12, 2, 4, "#ff9a30"); p(0, 7, 4, 2, "#ff9a30"); p(12, 7, 4, 2, "#ff9a30"); p(2, 2, 2, 2, "#ff7a20"); p(12, 2, 2, 2, "#ff7a20"); p(2, 12, 2, 2, "#ff7a20"); p(12, 12, 2, 2, "#ff7a20"); },
  emberspirit: (p) => { p(5, 1, 6, 5, "#ffb040"); p(4, 5, 8, 6, "#ff7a20"); p(5, 11, 2, 4, "#ff5a10"); p(9, 11, 2, 4, "#ff5a10"); p(6, 3, 1, 2, "#3a0a02"); p(9, 3, 1, 2, "#3a0a02"); p(7, 0, 2, 2, "#ffe070"); },
  burnfield: (p) => { p(1, 11, 14, 4, "#7a1c08"); p(2, 7, 3, 5, "#ff7a20"); p(6, 4, 4, 8, "#ff5a10"); p(11, 6, 3, 6, "#ff7a20"); p(7, 6, 2, 4, "#ffd24a"); p(3, 9, 1, 3, "#ffd24a"); p(12, 8, 1, 3, "#ffd24a"); },
  earthsplit: (p) => { p(1, 12, 14, 3, "#6a5a40"); p(7, 3, 2, 10, "#1a1208"); p(6, 6, 1, 4, "#1a1208"); p(9, 8, 1, 4, "#1a1208"); p(4, 1, 8, 3, "#d8dce8"); p(7, 0, 2, 5, "#fff"); p(2, 10, 3, 2, "#9a8a68"); p(11, 10, 3, 2, "#9a8a68"); },
  ironstorm: (p) => { p(2, 7, 12, 2, "#c8d0e0"); p(3, 3, 3, 3, "#e8eef8"); p(10, 3, 3, 3, "#e8eef8"); p(3, 10, 3, 3, "#e8eef8"); p(10, 10, 3, 3, "#e8eef8"); p(6, 6, 4, 4, "#8a94b0"); p(7, 7, 2, 2, "#d83a4a"); },
  titanfist: (p) => { p(3, 5, 10, 8, "#c8c0b8"); p(3, 4, 2, 3, "#c8c0b8"); p(6, 3, 2, 3, "#c8c0b8"); p(9, 3, 2, 3, "#c8c0b8"); p(3, 12, 10, 2, "#6a7080"); p(5, 7, 6, 1, "#8a8478"); p(1, 2, 2, 2, "#ffe070"); p(13, 2, 2, 2, "#ffe070"); p(7, 0, 2, 2, "#ffe070"); },
  legion: (p) => { p(2, 2, 3, 12, "#8a5a32"); p(1, 0, 5, 4, "#e6eefc"); p(7, 4, 3, 10, "#8a5a32"); p(6, 2, 5, 4, "#e6eefc"); p(12, 3, 3, 11, "#8a5a32"); p(11, 1, 5, 4, "#e6eefc"); },
  thunderlord: (p) => { p(1, 1, 14, 4, "#586078"); p(3, 0, 10, 3, "#7a84a0"); p(8, 5, 3, 3, "#fff6b0"); p(5, 7, 4, 3, "#ffe45a"); p(8, 9, 3, 3, "#fff6b0"); p(6, 11, 3, 4, "#ffd024"); p(2, 6, 1, 4, "#ffe45a"); p(13, 7, 1, 4, "#ffe45a"); },
  railbolt: (p) => { p(0, 7, 16, 2, "#fff6b0"); p(0, 6, 16, 1, "#ffe45a"); p(0, 9, 16, 1, "#ffe45a"); p(3, 3, 2, 3, "#ffd024"); p(11, 10, 2, 3, "#ffd024"); p(7, 2, 2, 3, "#ffe45a"); p(7, 11, 2, 3, "#ffe45a"); },
  stormspirit: (p) => { p(5, 1, 6, 5, "#b0d8ff"); p(4, 5, 8, 6, "#6ab0ff"); p(5, 11, 2, 4, "#ffe45a"); p(9, 11, 2, 4, "#ffe45a"); p(6, 3, 1, 2, "#10203a"); p(9, 3, 1, 2, "#10203a"); p(7, 0, 2, 2, "#fff6b0"); p(2, 7, 2, 2, "#ffe45a"); p(12, 7, 2, 2, "#ffe45a"); },
  heavenstrike: (p) => { p(2, 0, 12, 3, "#7a84a0"); p(7, 3, 3, 3, "#fff6b0"); p(5, 5, 3, 3, "#ffe45a"); p(8, 7, 3, 3, "#fff6b0"); p(6, 9, 3, 3, "#ffe45a"); p(7, 12, 2, 3, "#ffd024"); p(3, 13, 10, 2, "#ffe45a"); },
  butcher: (p) => { p(2, 3, 12, 3, "#c8ccd8"); p(3, 6, 10, 3, "#aab0c0"); p(4, 9, 7, 2, "#8a90a4"); p(10, 11, 3, 4, "#8a5a32"); p(3, 10, 2, 3, "#e03a4a"); p(7, 12, 2, 3, "#e03a4a"); p(5, 13, 1, 2, "#e03a4a"); },
  venomburst: (p) => { p(5, 5, 6, 6, "#6ae04a"); p(6, 4, 4, 8, "#8aff6a"); p(2, 3, 2, 2, "#4ab030"); p(12, 3, 2, 2, "#4ab030"); p(2, 11, 2, 2, "#4ab030"); p(12, 11, 2, 2, "#4ab030"); p(7, 6, 2, 3, "#e8ffd0"); p(7, 1, 2, 2, "#8aff6a"); p(7, 13, 2, 2, "#8aff6a"); },
  scorchbrand: (p) => { p(3, 3, 10, 10, "#7a1c08"); p(4, 4, 8, 8, "#ff7a20"); p(5, 5, 6, 6, "#ffb040"); p(7, 3, 2, 10, "#ffe070"); p(3, 7, 10, 2, "#ffe070"); p(6, 6, 4, 4, "#fff4c0"); },
  shatter: (p) => { p(6, 1, 4, 14, "#bfeaff"); p(2, 5, 12, 4, "#8ae0ff"); p(4, 3, 2, 3, "#e8fbff"); p(10, 10, 2, 3, "#e8fbff"); p(1, 12, 3, 2, "#6ac0e8"); p(12, 2, 3, 2, "#6ac0e8"); p(7, 6, 2, 2, "#ffffff"); },
  shockspray: (p) => { p(2, 2, 3, 3, "#ffe45a"); p(7, 1, 3, 4, "#fff08a"); p(11, 3, 3, 3, "#ffe45a"); p(3, 7, 3, 3, "#fff08a"); p(8, 8, 3, 3, "#ffe45a"); p(12, 9, 2, 3, "#fff08a"); p(5, 12, 3, 3, "#ffd024"); },
  discharge: (p) => { p(6, 0, 4, 3, "#fff6b0"); p(5, 3, 4, 3, "#ffe45a"); p(7, 6, 4, 3, "#fff6b0"); p(4, 9, 4, 3, "#ffe45a"); p(6, 12, 3, 4, "#ffd024"); p(1, 7, 3, 2, "#8ac8ff"); p(12, 5, 3, 2, "#8ac8ff"); },
  weapon: (p) => ICON_FN.sword(p),
  helm: (p) => { p(3, 3, 10, 9, "#aab4cc"); p(3, 3, 10, 2, "#dfe8f5"); p(5, 7, 6, 2, "#2a2030"); p(7, 9, 2, 4, "#2a2030"); p(7, 0, 2, 3, "#d83a4a"); },
  armor: (p) => { p(3, 3, 10, 11, "#6a8fd0"); p(1, 3, 3, 5, "#aab4cc"); p(12, 3, 3, 5, "#aab4cc"); p(6, 2, 4, 2, "#2a2030"); p(3, 11, 10, 2, "#e8b83a"); },
  gloves: (p) => { p(4, 7, 8, 7, "#c08a50"); p(4, 3, 2, 6, "#c08a50"); p(7, 2, 2, 6, "#c08a50"); p(10, 3, 2, 6, "#c08a50"); p(4, 12, 8, 2, "#8a5a32"); },
  ring: (p) => { p(4, 6, 8, 8, "#e8b83a"); p(6, 8, 4, 4, "#14101c"); p(6, 3, 4, 4, "#5ad0ff"); p(7, 4, 1, 1, "#fff"); },
  neck: (p) => { p(3, 1, 2, 7, "#e8b83a"); p(11, 1, 2, 7, "#e8b83a"); p(4, 7, 8, 2, "#e8b83a"); p(6, 9, 4, 5, "#d83a8a"); p(7, 10, 1, 1, "#fff"); },
  ore: (p) => { p(3, 6, 10, 8, "#7a6aa8"); p(5, 3, 6, 5, "#a898d8"); p(6, 4, 2, 2, "#e0d8ff"); },
  gold: (p) => { p(3, 4, 10, 9, "#e8b83a"); p(5, 6, 6, 5, "#ffe070"); p(7, 7, 2, 3, "#c89420"); },
  orb: (p) => { p(4, 3, 8, 10, "#6a3aa8"); p(3, 5, 10, 6, "#8a50d0"); p(5, 4, 6, 8, "#b080f0"); p(6, 5, 2, 2, "#f0e0ff"); p(5, 10, 6, 1, "#4a2a80"); },
  shard: (p) => { p(6, 1, 4, 5, "#c8a0ff"); p(4, 5, 8, 6, "#a070f0"); p(6, 10, 4, 5, "#7040c0"); p(7, 3, 1, 4, "#f0e0ff"); },
};
const ICON_CACHE = {};
function iconCanvas(name, sc) {
  sc = sc || 2; const k = name + sc; if (ICON_CACHE[k]) return ICON_CACHE[k];
  const c = document.createElement("canvas"); c.width = c.height = 16 * sc; const g = c.getContext("2d");
  const p = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x * sc, y * sc, w * sc, h * sc); };
  (ICON_FN[name] || ICON_FN.sword)(p); ICON_CACHE[k] = c; return c;
}
function iconURL(name, sc) { return iconCanvas(name, sc).toDataURL(); }
function iconImg(name, sc, cls) { return `<img class="ico ${cls || ""}" src="${iconURL(name, sc || 2)}" width="${16 * (sc || 2)}" height="${16 * (sc || 2)}">`; }

// ---------------- 배경 (액트별 절차 생성, 240x135를 4배 확대) ----------------
const BG_CACHE = {};
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mixc(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`; }
function makeBackground(act) {
  const k = act; if (BG_CACHE[k]) return BG_CACHE[k];
  const A = ACTS[Math.min(10, act > 10 ? (act === 11 ? 8 : 7) : act) - 1], W = 240, H = 135, r = seeded(act * 7919 + 13);
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, H * 0.7); grad.addColorStop(0, A.sky[0]); grad.addColorStop(1, A.sky[1]); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const hills = (base, amp, col, seedOff, freq) => { const rr = seeded(act * 31 + seedOff); const ph = rr() * 6; for (let x = 0; x < W; x++) { const y = base + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph * 2) * amp * 0.5; rect(x, y, 1, H - y, col); } };
  const dark = (col, f) => mixc(col, "#000000", f);
  if (act === 11) { for (let i = 0; i < 6; i++) { g.strokeStyle = `rgba(190,120,255,${0.5 - i * 0.07})`; g.lineWidth = 3; g.beginPath(); g.arc(120, 52, 14 + i * 9, i, i + 4.4); g.stroke(); } g.fillStyle = "#0a0414"; g.beginPath(); g.arc(120, 52, 12, 0, 7); g.fill(); for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * 80; rect(x, y, 3, 5, "#7a4ad8"); rect(x + 1, y + 1, 1, 2, "#e8d0ff"); } hills(88, 2, "#1c1030", 11, 0.05); }
  else if (act === 12) { for (let i = 0; i < 12; i++) { const x = r() * W, h = 24 + r() * 40; g.fillStyle = "#1a0606"; g.beginPath(); g.moveTo(x, 86); g.lineTo(x + 6, 86 - h); g.lineTo(x + 12, 86); g.fill(); } rect(96, 10, 48, 28, "#ff5a20"); rect(104, 14, 32, 20, "#ffb040"); for (let i = 0; i < 50; i++) rect(r() * W, 30 + r() * 60, 1, 3, "#ff7a30"); hills(88, 3, "#2a0808", 12, 0.05); }
  else if (act === 1) { rect(190, 14, 14, 14, "#fff2b0"); for (let i = 0; i < 6; i++) rect(r() * W, 8 + r() * 30, 22 + r() * 18, 5, "rgba(255,255,255,.8)"); hills(70, 6, "#8fc878", 1, 0.03); hills(80, 5, "#6aaa58", 2, 0.05); }
  else if (act === 2) { hills(62, 5, "#264a38", 1, 0.04); for (let i = 0; i < 26; i++) { const x = r() * W, h = 28 + r() * 22; rect(x, 78 - h, 3, h, "#22402c"); rect(x - 5, 78 - h - 6, 13, 14, "#2c5a3c"); rect(x - 3, 78 - h - 12, 9, 8, "#34684a"); } hills(84, 3, "#1e3a28", 3, 0.06); }
  else if (act === 3) { rect(0, 0, W, 36, "#1c1620"); for (let i = 0; i < 14; i++) { const x = r() * W; rect(x, 0, 6 + r() * 8, 14 + r() * 24, "#2a2230"); } for (let i = 0; i < 8; i++) { const x = r() * W; rect(x, 70 + r() * 6, 4, 10, "#7ad0ff"); rect(x + 1, 68, 2, 4, "#c8f0ff"); } rect(70, 0, 22, 60, "rgba(255,230,160,.12)"); hills(80, 3, "#3a3036", 2, 0.05); }
  else if (act === 4) { rect(176, 16, 22, 22, "#fff0b8"); rect(178, 18, 18, 18, "#ffe27a"); hills(74, 6, "#e0b868", 1, 0.025); for (let i = 0; i < 2; i++) { const x = 40 + i * 120, y = 74; g.fillStyle = "#c89858"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 22, y - 26); g.lineTo(x + 44, y); g.fill(); } hills(84, 4, "#c8a060", 4, 0.04); }
  else if (act === 5) { for (let i = 0; i < 10; i++) rect(r() * W, 50 + r() * 20, 40 + r() * 40, 6, "rgba(150,200,170,.18)"); for (let i = 0; i < 12; i++) { const x = r() * W, h = 24 + r() * 20; rect(x, 80 - h, 2, h, "#243c32"); rect(x - 4, 80 - h + 4, 6, 2, "#243c32"); rect(x + 2, 80 - h + 10, 6, 2, "#243c32"); } hills(82, 3, "#2a4a3a", 5, 0.05); }
  else if (act === 6) { for (let i = 0; i < 4; i++) { const x = i * 70 + r() * 20, y = 80; g.fillStyle = "#c8d8e8"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 34, y - 52 - r() * 14); g.lineTo(x + 70, y); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(x + 24, y - 36); g.lineTo(x + 34, y - 52); g.lineTo(x + 44, y - 36); g.fill(); } hills(82, 3, "#e0ecf8", 6, 0.05); for (let i = 0; i < 40; i++) rect(r() * W, r() * 90, 1, 1, "#fff"); }
  else if (act === 7) { g.fillStyle = "#4a2418"; g.beginPath(); g.moveTo(60, 82); g.lineTo(110, 22); g.lineTo(160, 82); g.fill(); rect(104, 18, 12, 8, "#ff8a30"); for (let i = 0; i < 18; i++) rect(r() * W, 10 + r() * 60, 1, 2, "#ffb060"); hills(84, 3, "#3a1c16", 7, 0.05); rect(0, 90, W, 6, "rgba(255,120,40,.35)"); }
  else if (act === 8) { for (let i = 0; i < 10; i++) { const x = r() * W, y = 14 + r() * 50, w = 12 + r() * 20; rect(x, y, w, 5, "#3a2862"); rect(x + 2, y + 5, w - 4, 3, "#2a1c4a"); } for (let i = 0; i < 8; i++) { const x = r() * W, y = 20 + r() * 50; rect(x, y, 5, 5, "#e8e0ff"); rect(x + 1, y + 1, 3, 3, "#c02a6a"); rect(x + 2, y + 2, 1, 1, "#14041c"); } hills(86, 3, "#1c1230", 8, 0.05); }
  else if (act === 9) { for (let i = 0; i < 9; i++) rect(r() * W, 10 + r() * 55, 28 + r() * 40, 8, "rgba(255,255,255,.85)"); for (let i = 0; i < 4; i++) { const x = 20 + i * 56 + r() * 10, h = 36 + r() * 20; rect(x, 84 - h, 12, h, "#d8d4ec"); rect(x - 2, 84 - h - 4, 16, 4, "#b8b4d4"); rect(x + 3, 84 - h - 12, 6, 8, "#e8e4f8"); } hills(86, 3, "#b8b4d4", 9, 0.04); }
  else { for (let i = 0; i < 16; i++) { const x = r() * W, h = 20 + r() * 38; g.fillStyle = "#14040a"; g.beginPath(); g.moveTo(x, 86); g.lineTo(x + 5, 86 - h); g.lineTo(x + 10, 86); g.fill(); } rect(176, 12, 20, 20, "#ffb040"); rect(180, 16, 12, 12, "#ff5a20"); for (let i = 0; i < 20; i++) rect(r() * W, 60 + r() * 30, 1, 3, "#ff7a30"); hills(88, 3, "#2a0c10", 10, 0.05); }
  // 바닥
  const gy = 84; rect(0, gy, W, H - gy, A.ground); for (let i = 0; i < 160; i++) rect(r() * W, gy + 2 + r() * (H - gy - 3), 3 + r() * 6, 1, mixc(A.ground, r() > 0.5 ? "#ffffff" : "#000000", 0.12 + r() * 0.1));
  rect(0, gy, W, 2, mixc(A.ground, "#ffffff", 0.25));
  const out = document.createElement("canvas"); out.width = 960; out.height = 540; const og = out.getContext("2d"); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, W, H, 0, 0, 960, 540);
  BG_CACHE[k] = out; return out;
}

// ---------------- 고유 장비 전용 아이콘: 아이템마다 색·장식이 달라 한눈에 구분된다 ----------------
const UNIQ_ICON_CACHE = {};
function hslToRgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
function uniqueIconCanvas(id) {
  if (UNIQ_ICON_CACHE[id]) return UNIQ_ICON_CACHE[id];
  const idx = Math.max(0, UNIQUES.findIndex((u) => u.id === id)), D = UNIQUE_BY_ID[id] || { slot: "weapon", tier: 1 };
  const hue = (idx * 137.5 + 20) % 360, hue2 = (hue + 150) % 360, mA = idx % 12, mB = (idx * 5 + 3) % 12 === mA ? (mA + 5) % 12 : (idx * 5 + 3) % 12;
  const c = document.createElement("canvas"); c.width = c.height = 16; const g = c.getContext("2d"); g.drawImage(iconCanvas(D.slot, 1), 0, 0);
  const im = g.getImageData(0, 0, 16, 16), d = im.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, l = (Math.max(r, gg, b) + Math.min(r, gg, b)) / 2; const rgb = hslToRgb(hue, 0.62, Math.min(0.85, Math.max(0.2, l * 0.95 + 0.04))); d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; }
  g.putImageData(im, 0, 0);
  const ac = (l, s) => { const r = hslToRgb(hue2, s || 0.85, l); return `rgb(${r[0] | 0},${r[1] | 0},${r[2] | 0})`; }, px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w || 1, h || 1); }, rr = seeded(idx * 977 + 5);
  const M = [
    () => { px(6, 6, 4, 4, ac(0.5)); px(7, 7, 2, 2, ac(0.85, 0.3)); px(6, 5, 4, 1, ac(0.3)); },                                   // 0 보석
    () => { for (let x = 3; x < 13; x += 2) { px(x, 0, 1, 2, ac(0.55)); px(x + 1, 1, 1, 1, ac(0.75)); } },                         // 1 불꽃 왕관
    () => { for (let i = 0; i < 4; i++) { px(0 + i, 4 + i, 1, 1, ac(0.8, 0.3)); px(15 - i, 4 + i, 1, 1, ac(0.8, 0.3)); px(i, 3 + i, 1, 1, ac(0.55)); px(15 - i, 3 + i, 1, 1, ac(0.55)); } }, // 2 날개
    () => { px(0, 0, 2, 2, ac(0.5)); px(14, 0, 2, 2, ac(0.5)); px(0, 14, 2, 2, ac(0.5)); px(14, 14, 2, 2, ac(0.5)); },              // 3 모서리 장식
    () => { for (let i = 0; i < 16; i++) { px(i, 0, 1, 1, ac(0.6)); px(i, 15, 1, 1, ac(0.6)); px(0, i, 1, 1, ac(0.6)); px(15, i, 1, 1, ac(0.6)); } }, // 4 테두리 빛
    () => { px(6, 11, 4, 3, "#f0ecd8"); px(7, 12, 1, 1, "#222"); px(9, 12, 1, 1, "#222"); },                                         // 5 해골 표식
    () => { for (let i = 0; i < 6; i++) px((rr() * 14) | 0, (rr() * 14) | 0, 1, 1, ac(0.9, 0.4)); },                                // 6 반짝임
    () => { for (let x = 2; x < 14; x += 3) px(x, 14, 2, 1, ac(0.6)); },                                                             // 7 룬 줄
    () => { px(9, 1, 2, 3, ac(0.65)); px(7, 3, 3, 2, ac(0.65)); px(8, 5, 2, 3, ac(0.8, 0.5)); },                                     // 8 번개
    () => { px(3, 13, 1, 2, "#d02a3a"); px(8, 14, 1, 2, "#d02a3a"); px(12, 13, 1, 2, "#d02a3a"); },                                  // 9 핏방울
    () => { for (let x = 4; x < 12; x++) px(x, 0, 1, 1, ac(0.85, 0.4)); px(3, 1, 1, 1, ac(0.85, 0.4)); px(12, 1, 1, 1, ac(0.85, 0.4)); }, // 10 후광
    () => { for (let i = 0; i < 5; i++) { px(1 + i, 12 - i, 1, 1, ac(0.8, 0.4)); px(14 - i, 12 - i, 1, 1, ac(0.8, 0.4)); } },         // 11 결정
  ];
  M[mA](); M[mB]();
  // 어두운 윤곽선
  const o = g.getImageData(0, 0, 16, 16), od = o.data, src = new Uint8ClampedArray(od);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = (y * 16 + x) * 4; if (src[i + 3]) continue; let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < 16 && yy < 16 && src[(yy * 16 + xx) * 4 + 3] > 200) n++; } if (n) { od[i] = 12; od[i + 1] = 8; od[i + 2] = 20; od[i + 3] = 255; } }
  g.putImageData(o, 0, 0);
  return (UNIQ_ICON_CACHE[id] = c);
}
function uniqueIconURL(id, sc) { sc = sc || 2; const k = id + "@" + sc; if (UNIQ_ICON_CACHE[k]) return UNIQ_ICON_CACHE[k]; const src = uniqueIconCanvas(id), c = document.createElement("canvas"); c.width = c.height = 16 * sc; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, 16 * sc, 16 * sc); return (UNIQ_ICON_CACHE[k] = c.toDataURL()); }
function uniqueIconImg(id, sc, cls) { sc = sc || 2; return `<img class="ico ${cls || ""}" src="${uniqueIconURL(id, sc)}" width="${16 * sc}" height="${16 * sc}">`; }
