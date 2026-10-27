// =========================================================
// 유틸
// =========================================================
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function wpick(list, wf) { let t = 0; for (const x of list) t += wf(x); let r = Math.random() * t; for (const x of list) { if ((r -= wf(x)) <= 0) return x; } return list[list.length - 1]; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function seeded(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const fmtPow = (v) => {   // 전투력 표기: 만 · 억 · 조 · 경 · 해 단위
  if (!(v >= 1)) return "0"; const U = [["", 1], ["만", 1e4], ["억", 1e8], ["조", 1e12], ["경", 1e16], ["해", 1e20]]; let u = U[0]; for (const x of U) if (v >= x[1]) u = x;
  const m = v / u[1]; return (m >= 1000 ? Math.round(m).toLocaleString("en-US") : m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2)) + u[0];
};
const fmtN = (v) => (v >= 1e9 ? (v / 1e9).toFixed(1) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e4 ? (v / 1e3).toFixed(1) + "K" : Math.round(v).toString());
const fmt = (v) => (v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(1) : v.toFixed(2));
const pct = (v) => Math.round(v * 100) + "%";
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

// ---- 3x5 도트 숫자 폰트 (피해 숫자용) ----
const GLYPHS = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
  "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
  "K": "101110100110101", "M": "101111111101101", "B": "110101110101110", "-": "000000111000000", "!": "010010010000010", "+": "000010111010000",
  "M2": "", ".": "000000000000010",
};
function drawPx(ctx, str, x, y, color, sc, outline) {
  sc = sc || 2; str = String(str);
  let cx = x;
  const draw = (col, ox, oy) => {
    ctx.fillStyle = col; let px = cx;
    for (const ch of str) {
      const g = GLYPHS[ch]; if (!g) { px += 4 * sc; continue; }
      for (let i = 0; i < 15; i++) if (g[i] === "1") ctx.fillRect(px + (i % 3) * sc + ox, y + Math.floor(i / 3) * sc + oy, sc, sc);
      px += 4 * sc;
    }
  };
  if (outline !== false) { for (const [ox, oy] of [[-sc, 0], [sc, 0], [0, -sc], [0, sc]]) draw("#120c1a", ox, oy); }
  draw(color, 0, 0);
}
function pxWidth(str, sc) { return String(str).length * 4 * (sc || 2) - (sc || 2); }

// ---- 도트 선 그리기 (번개/빔용) ----
function pxLine(ctx, x0, y0, x1, y1, sz) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy;
  for (let n = 0; n < 2000; n++) {
    ctx.fillRect(x0 - (sz >> 1), y0 - (sz >> 1), sz, sz);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
  }
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
