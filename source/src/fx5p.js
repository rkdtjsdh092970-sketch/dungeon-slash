// =========================================================
// 5.24 지속형 아르카나 연출 (장판 · 회전 구체 · 칼날 회오리 · 소환 · 지뢰 · 심연 · 대형 수리검 · 비구름)
//  예전에 코드로 그린 도트 연출 대신 BattleFx 그림(webart/fx_*)을 아르카나 색으로 물들여 그린다.
//  render.js 의 drawZone / drawPersist 를 대신한다 (같은 이름, 나중에 읽혀서 덮어씀). 신화 전용 큰 글자 연출(drawGrand)은 없앤다
// =========================================================
const FXP_TINT = {};
function fxpImg(key, col) {   // 그림을 색으로 물들인 캔버스 (밝기는 남기고 색만 입힘)
  const im = artGet(key); if (!im || !im.width) return null; if (!col) return im;
  const k = key + col; if (FXP_TINT[k]) return FXP_TINT[k];
  const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d");
  g.filter = "grayscale(1) brightness(1.25)"; g.drawImage(im, 0, 0); g.filter = "none";   // 원래 색은 빼고 밝기만 남긴 뒤 아르카나 색을 입힌다
  g.globalCompositeOperation = "multiply"; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "destination-in"; g.drawImage(im, 0, 0);
  return (FXP_TINT[k] = c);
}
function fxpDraw(ctx, key, col, x, y, w, h, rot, alpha, add) {
  const im = fxpImg(key, col); if (!im) return false;
  ctx.save(); ctx.globalAlpha *= alpha == null ? 1 : alpha; if (add) ctx.globalCompositeOperation = "lighter"; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); return true;
}
const fxpCol = (sk) => (sk && (sk.color || (sk.def && sk.def.color))) || "#ffffff";
const fxpElem = (sk) => (sk && (sk.elem || (sk.def && sk.def.elem))) || "";
function drawZone(ctx, b, z, time) {
  const c = cellXY(b, z.lane, z.col), lh = laneH(b), y = c.y + lh * 0.34, col = fxpCol(z.sk), el = fxpElem(z.sk);
  const fade = Math.max(0.15, Math.min(1, z.t / 0.6, z.life ? (z.life - z.t) / 0.25 + 0.3 : 1)), sd = z.col * 31 + z.lane * 7;
  ctx.save(); ctx.globalAlpha = fade;
  fxpDraw(ctx, "fx_glow", col, c.x, y - 8, 140, 46, 0, 0.55, true);   // 바닥 빛
  if (z.fxk === "snow" || el === "cold") {   // 얼음 가시가 솟았다 가라앉고, 위에서 얼음 조각이 떨어진다
    for (let i = 0; i < 3; i++) { const k = (time * 1.4 + i / 3 + sd * 0.01) % 1, h = 60 * Math.sin(k * Math.PI); fxpDraw(ctx, "fx_icespike", col, c.x - 36 + i * 36, y - h / 2, 30, Math.max(4, h), 0, 0.9); }
    for (let i = 0; i < 4; i++) { const k = (time * 0.9 + i * 0.27 + sd * 0.013) % 1; fxpDraw(ctx, "fx_shard", col, c.x - 45 + i * 30, y - 90 + k * 80, 12, 22, 0.4, 1 - k); }
  } else if (z.fxk === "cloud" || el === "void" || !el) {   // 독 · 공허 기운이 바닥에서 피어오른다
    for (let i = 0; i < 3; i++) { const ox = Math.sin(time * 1.2 + i * 1.7 + z.col) * 12, k = (time * 0.5 + i / 3) % 1; fxpDraw(ctx, ["fx_cloud1", "fx_cloud2", "fx_cloud3"][i], col, c.x - 34 + i * 34 + ox, y - 26 - k * 20, 74, 46, 0, 0.75 * Math.sin(k * Math.PI) + 0.2); }
  } else {   // 화염: 불꽃이 너울거린다
    for (let i = 0; i < 4; i++) { const h = 54 + Math.sin(time * 9 + i * 1.7 + z.col) * 14; fxpDraw(ctx, "fx_fire", el === "light" ? col : null, c.x - 42 + i * 28, y - h / 2, 34, h, 0, 0.95, true); }
  }
  ctx.restore();
}
function drawPersist(ctx, b, time) {
  const lh = laneH(b);
  for (const p of b.persist) {
    const col = fxpCol(p.sk), id = p.sk && (p.sk.id || (p.sk.def && p.sk.def.id)); ctx.save();
    if (p.kind === "blades") {   // 칼날 회오리: 앞줄 레인마다 칼날이 빙글 돈다
      for (let l = 0; l < b.lanes; l++) { const cc = cellXY(b, l, 1), cy = cc.y + lh * 0.3 - 30, cx = LAY.x0 + 50;
        for (let i = 0; i < 3; i++) fxpDraw(ctx, "fx_slash", col, cx, cy, 120, 60, p.rot * 9 + i * 2.094, 0.85, true); fxpDraw(ctx, "fx_glow", col, cx, cy, 120, 120, 0, 0.35, true); }
    } else if (p.kind === "orbs") {   // 구체 3개가 영웅 둘레를 돈다
      for (let i = 0; i < 3; i++) { const a = p.rot * 4.5 + i * 2.094, x = PLAYER_POS.x + 40 + Math.cos(a) * 66, y = PLAYER_POS.y - 60 + Math.sin(a) * 30;
        fxpDraw(ctx, "fx_glow", col, x, y, 54, 54, 0, 0.9, true); fxpDraw(ctx, "fx_spark", "#ffffff", x, y, 22, 22, time * 3, 0.9, true); }
    } else if (p.kind === "spirit") {   // 소환: 앞줄 적 머리 위로 소환수(또는 마법진)가 떠서 연달아 할퀸다
      const t = pickPrimaryLoose(b), tx = t ? t.vx || cellXY(b, t.lane, t.col).x : PLAYER_POS.x + 160, ty = t ? (t.vy || cellXY(b, t.lane, t.col).y) - 40 : PLAYER_POS.y - 60;
      const sx = PLAYER_POS.x + 110 + Math.sin(time * 3) * 8, sy = ty - 30 + Math.sin(time * 4) * 6;
      if (id === "hydra") fxpDraw(ctx, "fx_hydra", null, sx + 30, sy, 110, 110, 0, 0.95);
      else { fxpDraw(ctx, "fx_mc_sigil", col, sx, sy, 70, 70, time * 2, 0.9, true); fxpDraw(ctx, "fx_glow", col, sx, sy, 90, 90, 0, 0.6, true); }
      const k = (time * 3.3) % 1; if (k < 0.35) fxpDraw(ctx, "fx_claw", col, tx, ty, 80, 80, 0, 1 - k / 0.35, true);
    } else if (p.kind === "mine") {   // 지뢰: 땅에 박힌 문양이 깜빡인다
      const cc = cellXY(b, p.lane, p.col), x = cc.x, y = cc.y + lh * 0.32; fxpDraw(ctx, "fx_mc_sigil", col, x, y - 4, 64, 22, 0, 0.9, true);
      fxpDraw(ctx, "fx_glow", "#ff5a30", x, y - 8, 30, 30, 0, 0.5 + 0.5 * Math.sin(time * 10), true);
    } else if (p.kind === "hole") {   // 공허의 심연: 바닥 마법진이 돌며 빨아들인다
      const cc = cellXY(b, p.lane, p.col), x = cc.x, y = cc.y + lh * 0.22;
      fxpDraw(ctx, "fx_mc_void", null, x, y, 200, 80, time * 1.8, 0.95, true); fxpDraw(ctx, "fx_mc_inner", col, x, y, 110, 44, -time * 3, 0.9, true); fxpDraw(ctx, "fx_glow", "#200030", x, y - 6, 120, 50, 0, 0.8);
    } else if (p.kind === "shuri") {   // 대형 수리검: 한 구간 가운데에서 크게 돈다
      const cx = cellXY(b, 0, p.col).x, cy = (cellXY(b, 0, p.col).y + cellXY(b, b.lanes - 1, p.col).y) / 2;
      fxpDraw(ctx, "fx_xslash", "#dfe8ff", cx, cy, 170, 170, p.rot * 8, 0.95, true); fxpDraw(ctx, "fx_xslash", "#ffffff", cx, cy, 120, 120, p.rot * 8 + 0.78, 0.8, true);
    } else if (p.kind === "rain") {   // 비구름: 위쪽에 아르카나 색 구름이 드리운다
      for (let i = 0; i < 6; i++) { const x = 120 + i * 150 + Math.sin(time + i) * 10, y = 78 + (i % 2) * 14; for (let k = 0; k < 2; k++) fxpDraw(ctx, ["fx_cloud1", "fx_cloud2", "fx_cloud3"][(i + k) % 3], "#4a4e70", x + k * 30, y + k * 8, 230, 84, 0, 1); fxpDraw(ctx, "fx_glow", col, x, y + 10, 120, 40, 0, 0.25 + 0.25 * Math.max(0, Math.sin(time * 7 + i * 2)), true); }
    }
    ctx.restore();
  }
}
function drawGrand() {}   // 로블록스판에 없는 신화 전용 큰 글자 연출은 없앤다 (신화 이상은 BattleFx flourish 로)
