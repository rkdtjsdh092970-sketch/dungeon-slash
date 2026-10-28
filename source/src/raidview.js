// =========================================================
// 레이드 전용 전투 화면: 뒷모습의 플레이어, 중앙의 거대한 보스 '심연의 문지기', 결계석 — 모두 픽셀 느낌의 코드 그림
// =========================================================
const RV = { boss: null, bossR: null, back: null, floor: null, plr: null, sc: 2.05, W: 172, H: 176 };
const RV_OX = () => 480 - (RV.W / 2) * RV.sc, RV_OY = () => 446 - RV.H * RV.sc;
function rvCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; return [c, g]; }
function rvPoly(g, pts, col, stroke) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); } }
function rvBoth(g, cx, pts, col, stroke) { rvPoly(g, pts, col, stroke); rvPoly(g, pts.map(([x, y]) => [2 * cx - x, y]), col, stroke); }

// ---- 보스: 거대한 날개와 뿔, 갑주, 가슴의 불타는 핵, 땅에 꽂은 대검 ----
function rvBuildBoss(enraged) {
  const [c, g] = rvCanvas(RV.W, RV.H), cx = RV.W / 2; g.translate(0, 16);
  // 날개: 찢어진 막과 뼈대
  const wing = [[64, 58], [44, 24], [20, 4], [8, 10], [12, 34], [4, 50], [14, 66], [10, 84], [26, 92], [34, 80], [44, 96], [52, 82], [58, 74]];
  rvBoth(g, cx, wing, "#2a0e34", "#14061c");
  rvBoth(g, cx, [[64, 58], [20, 4], [26, 8], [66, 56]], "#7a6a8a");
  rvBoth(g, cx, [[62, 62], [8, 12], [12, 16], [64, 66]], "#6a5a7a"); rvBoth(g, cx, [[62, 66], [4, 50], [8, 52], [64, 70]], "#5a4a6a"); rvBoth(g, cx, [[62, 70], [14, 66], [16, 70], [64, 74]], "#5a4a6a");
  // 몸통
  rvPoly(g, [[54, 52], [118, 52], [128, 74], [112, 120], [60, 120], [44, 74]], "#241a2c", "#0c0610");
  rvPoly(g, [[60, 56], [112, 56], [120, 74], [106, 114], [66, 114], [52, 74]], "#382a44");
  rvPoly(g, [[66, 60], [106, 60], [112, 74], [102, 108], [70, 108], [60, 74]], "#2c2036");
  for (const y of [86, 96, 106]) rvPoly(g, [[64, y], [108, y], [106, y + 2], [66, y + 2]], "#4a3a58");
  // 용암 균열
  g.strokeStyle = enraged ? "#ff3a10" : "#ff6a18"; g.lineWidth = 1.4; for (const p of [[[70, 64], [76, 72], [72, 82], [78, 90]], [[102, 64], [96, 72], [100, 84], [94, 94]], [[78, 100], [84, 106], [90, 100]]]) { g.beginPath(); g.moveTo(...p[0]); for (const q of p.slice(1)) g.lineTo(...q); g.stroke(); }
  // 어깨 갑옷과 가시
  for (const [px, s] of [[44, 1], [128, -1]]) {
    g.fillStyle = "#4a3a58"; g.beginPath(); g.arc(px, 60, 17, 0, 7); g.fill(); g.fillStyle = "#2c2036"; g.beginPath(); g.arc(px, 62, 13, 0, 7); g.fill(); g.strokeStyle = "#7a6a8a"; g.lineWidth = 1.5; g.beginPath(); g.arc(px, 60, 17, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
  }
  rvBoth(g, cx, [[38, 50], [24, 22], [46, 44]], "#8a7a98"); rvBoth(g, cx, [[48, 44], [46, 12], [58, 42]], "#8a7a98"); rvBoth(g, cx, [[30, 62], [6, 52], [32, 52]], "#6a5a78"); rvBoth(g, cx, [[34, 70], [10, 72], [34, 62]], "#5a4a68");
  // 팔
  rvBoth(g, cx, [[34, 70], [54, 74], [50, 104], [30, 100]], "#34283e", "#0c0610"); rvBoth(g, cx, [[28, 100], [50, 104], [46, 136], [24, 132]], "#2a2034", "#0c0610");
  rvBoth(g, cx, [[26, 108], [48, 110], [48, 118], [26, 116]], "#6a5a78"); rvBoth(g, cx, [[22, 132], [48, 138], [44, 152], [34, 156], [24, 150]], "#3a2c46", "#0c0610");
  rvBoth(g, cx, [[24, 150], [28, 164], [32, 152]], "#e8e0d0"); rvBoth(g, cx, [[32, 154], [36, 168], [40, 154]], "#e8e0d0");
  // 대검 (오른손에 쥔 채 바닥에 꽂음)
  rvPoly(g, [[132, 150], [140, 150], [142, 44], [136, 22], [130, 44]], "#8a8aa4", "#2a2a3a"); rvPoly(g, [[136, 22], [142, 44], [140, 150], [137, 150]], "#c8c8e0");
  rvPoly(g, [[116, 144], [158, 144], [158, 152], [116, 152]], "#7a6030", "#2a1c08"); rvPoly(g, [[133, 152], [139, 152], [139, 170], [133, 170]], "#4a2a1a");
  for (const y of [60, 80, 100, 120]) { g.fillStyle = enraged ? "#ff3a10" : "#ff7a28"; g.fillRect(134, y, 2, 6); }
  // 허리 갑주
  rvPoly(g, [[60, 118], [112, 118], [118, 138], [86, 150], [54, 138]], "#241a2c", "#0c0610"); rvPoly(g, [[66, 120], [106, 120], [108, 132], [86, 142], [64, 132]], "#382a44");
  // 목과 머리
  rvPoly(g, [[74, 40], [98, 40], [102, 56], [70, 56]], "#241418");
  g.fillStyle = "#5e1c18"; g.beginPath(); g.ellipse(cx, 32, 17, 20, 0, 0, 7); g.fill(); g.fillStyle = "#7a2a20"; g.beginPath(); g.ellipse(cx - 4, 28, 9, 12, 0, 0, 7); g.fill();
  rvPoly(g, [[70, 40], [102, 40], [98, 54], [86, 60], [74, 54]], "#3a1410", "#14060a");
  g.fillStyle = "#f0e8d0"; for (const x of [74, 80, 86, 92]) { rvPoly(g, [[x, 52], [x + 3, 52], [x + 1.5, 59]], "#f0e8d0"); }
  rvPoly(g, [[72, 24], [84, 29], [72, 32]], "#14060a"); rvPoly(g, [[100, 24], [88, 29], [100, 32]], "#14060a");   // 눈 구멍
  rvBoth(g, cx, [[72, 25], [82, 29], [72, 30]], enraged ? "#ff5a20" : "#ffd24a"); rvBoth(g, cx, [[74, 27], [80, 29], [74, 29]], "#fff8d0");
  rvBoth(g, cx, [[78, 36], [82, 46], [76, 44]], "#2a0c08");   // 광대
  // 뿔: 크게 휘어져 올라가는 한 쌍 + 이마의 가시
  rvBoth(g, cx, [[72, 20], [58, 16], [44, 20], [32, 10], [24, -2], [20, -14], [32, -6], [44, -4], [58, 2], [72, 8]], "#d8c8a0", "#6a5a38");
  rvBoth(g, cx, [[70, 14], [58, 10], [46, 12], [34, 4], [26, -6], [36, -2], [48, 2], [60, 4], [70, 10]], "#a89870");
  rvBoth(g, cx, [[78, 14], [74, -2], [72, -16], [84, 2]], "#e8dcb8", "#6a5a38"); rvPoly(g, [[80, 12], [86, -10], [92, 12]], "#f0e8c8", "#6a5a38");
  // 발치의 불꽃 받침
  g.globalCompositeOperation = "source-atop"; const gr = g.createLinearGradient(0, -16, 0, 170); gr.addColorStop(0, "rgba(255,150,70,.20)"); gr.addColorStop(0.5, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.55)"); g.fillStyle = gr; g.fillRect(0, -16, RV.W, RV.H + 16);
  if (enraged) { g.fillStyle = "rgba(255,40,10,.22)"; g.fillRect(0, -16, RV.W, RV.H + 16); }
  return c;
}
function rvBuildBack() {
  const [c, g] = rvCanvas(960, 540);
  const bg = g.createLinearGradient(0, 0, 0, 540); bg.addColorStop(0, "#07040c"); bg.addColorStop(0.5, "#240a14"); bg.addColorStop(1, "#08040a"); g.fillStyle = bg; g.fillRect(0, 0, 960, 540);
  const glow = g.createRadialGradient(480, 250, 20, 480, 250, 430); glow.addColorStop(0, "rgba(255,120,40,.55)"); glow.addColorStop(0.4, "rgba(190,40,20,.28)"); glow.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = glow; g.fillRect(0, 0, 960, 540);
  // 먼 기둥들과 사슬
  g.fillStyle = "#12080e"; for (const x of [230, 300, 660, 730]) { g.fillRect(x, 60, 22, 330); g.fillStyle = "#1c0e16"; g.fillRect(x + 4, 60, 4, 330); g.fillStyle = "#12080e"; }
  // 좌우 성벽 (스케치의 벽 모양)
  const wall = (pts, base) => { rvPoly(g, pts, base, "#08040a"); g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 2; const [x0, x1] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))]; for (let y = 180; y < 470; y += 34) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + 10); g.stroke(); } };
  wall([[0, 130], [196, 166], [180, 428], [0, 490]], "#2a2030"); wall([[960, 130], [764, 166], [780, 420], [960, 486]], "#2a2030");
  g.fillStyle = "#4a3c58"; g.fillRect(180, 160, 22, 270); g.fillRect(758, 160, 22, 262); g.fillStyle = "#6a5a78"; g.fillRect(180, 160, 4, 270); g.fillRect(776, 160, 4, 262);
  for (const x of [190, 770]) { g.fillStyle = "#3a2c46"; g.fillRect(x - 16, 138, 36, 26); g.fillStyle = "#1a0e18"; g.fillRect(x - 12, 128, 28, 12); }   // 화로
  for (const [x, y] of [[70, 230], [118, 300], [74, 380], [890, 230], [842, 296], [886, 376]]) { g.fillStyle = "rgba(255,110,40,.16)"; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); g.strokeStyle = "#ff7a28"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, 7); g.moveTo(x - 6, y + 6); g.lineTo(x + 6, y - 6); g.stroke(); }   // 룬 문양
  // 용암의 심연
  const lava = g.createLinearGradient(0, 330, 0, 440); lava.addColorStop(0, "rgba(255,90,20,0)"); lava.addColorStop(0.7, "rgba(255,110,30,.55)"); lava.addColorStop(1, "rgba(255,170,60,.7)"); g.fillStyle = lava; g.fillRect(196, 330, 568, 110);
  return c;
}
function rvBuildFloor() {   // 앞쪽 바닥: 호를 그리는 둥근 경기장 가장자리 (스케치의 곡선)
  const [c, g] = rvCanvas(960, 540);
  g.beginPath(); g.moveTo(0, 500); g.quadraticCurveTo(480, 288, 960, 500); g.lineTo(960, 540); g.lineTo(0, 540); g.closePath();
  const f = g.createLinearGradient(0, 380, 0, 540); f.addColorStop(0, "#3c2c40"); f.addColorStop(1, "#150c1a"); g.fillStyle = f; g.fill(); g.save(); g.clip();
  g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = 2; for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(480 + i * 26, 392); g.lineTo(480 + i * 150, 540); g.stroke(); }
  for (let k = 0; k < 6; k++) { const y = 400 + k * k * 4.2 + k * 10; g.beginPath(); g.moveTo(0, y + 40); g.quadraticCurveTo(480, y - 70, 960, y + 40); g.stroke(); }
  g.strokeStyle = "rgba(255,110,40,.35)"; g.lineWidth = 3; for (const p of [[[300, 520], [330, 480], [320, 450]], [[640, 530], [610, 490], [650, 455]], [[480, 470], [470, 440]]]) { g.beginPath(); g.moveTo(...p[0]); for (const q of p.slice(1)) g.lineTo(...q); g.stroke(); }
  g.restore(); g.strokeStyle = "#8a6a88"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 500); g.quadraticCurveTo(480, 288, 960, 500); g.stroke();
  g.strokeStyle = "rgba(255,120,50,.6)"; g.lineWidth = 6; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(0, 498); g.quadraticCurveTo(480, 286, 960, 498); g.stroke();
  return c;
}
// ---- 플레이어 뒷모습 ----
function rvBuildPlayer() {
  const [c, g] = rvCanvas(48, 64), cx = 24;
  rvBoth(g, cx, [[12, 62], [20, 62], [20, 54], [12, 54]], "#3a2a22");   // 신발
  rvPoly(g, [[14, 24], [34, 24], [38, 56], [10, 56]], "#8a1f2a", "#3a0a10"); rvPoly(g, [[18, 26], [30, 26], [33, 54], [15, 54]], "#a8303a");   // 망토
  rvPoly(g, [[22, 30], [26, 30], [26, 50], [22, 50]], "#e8b83a"); rvPoly(g, [[18, 36], [30, 36], [30, 39], [18, 39]], "#e8b83a");   // 등의 문장
  rvBoth(g, cx, [[8, 24], [18, 20], [20, 30], [8, 32]], "#c8d0e0", "#5a6078"); rvBoth(g, cx, [[8, 24], [12, 22], [12, 28], [8, 30]], "#f0f4fc");   // 견갑
  g.fillStyle = "#aab4cc"; g.beginPath(); g.ellipse(cx, 14, 9, 10, 0, 0, 7); g.fill(); g.fillStyle = "#d8e0f0"; g.beginPath(); g.ellipse(cx - 2, 11, 5, 6, 0, 0, 7); g.fill();   // 투구
  rvPoly(g, [[20, 20], [28, 20], [27, 25], [21, 25]], "#7a8298"); rvPoly(g, [[23, 3], [25, 3], [27, 16], [21, 16]], "#c8303a"); rvPoly(g, [[22, 2], [26, 2], [28, 8], [20, 8]], "#e84a50");   // 목받이·깃
  return c;
}
function rvInit() { if (RV.boss) return; RV.boss = rvBuildBoss(false); RV.bossR = rvBuildBoss(true); RV.back = rvBuildBack(); RV.floor = rvBuildFloor(); RV.plr = rvBuildPlayer(); }

function drawRaidBack(ctx, b, time) {
  rvInit(); ctx.drawImage(RV.back, 0, 0);
  // 떠다니는 불씨
  for (let i = 0; i < 46; i++) { const k = (time * (14 + (i % 7) * 4) + i * 53) % 560, x = (i * 97) % 960 + Math.sin(time * 0.8 + i) * 14, y = 540 - k; ctx.fillStyle = `rgba(255,${130 + (i % 5) * 20},50,${0.55 * (1 - k / 560)})`; ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3)); }
}
function drawMorgas(ctx, b, e, time, alpha, dying) {
  const R = e && e.raid, enr = e && e.enraged, S = RV.sc, ox = RV_OX(), oy = RV_OY() + Math.sin(time * 1.3) * 2.5;
  const gl = (x, y, r, col, a) => { const rg = ctx.createRadialGradient(x, y, 2, x, y, r); rg.addColorStop(0, hexA(col, a)); rg.addColorStop(1, hexA(col, 0)); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = false;
  gl(480, 262, 300, enr ? "#ff2a10" : "#ff6a20", 0.22 + 0.06 * Math.sin(time * 2));   // 후광
  ctx.drawImage(enr ? RV.bossR : RV.boss, ox, oy, RV.W * S, RV.H * S);
  if (e && e.flash > 0) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.28 * (alpha == null ? 1 : alpha); ctx.drawImage(RV.boss, ox, oy, RV.W * S, RV.H * S); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = alpha == null ? 1 : alpha; }
  const px = (x, y) => [ox + x * S, oy + (y + 16) * S];
  const [ex1, ey] = px(77, 27), [ex2] = px(95, 27); for (const x of [ex1, ex2]) gl(x, ey, 34 + 6 * Math.sin(time * 5), enr ? "#ff3a10" : "#ffd24a", 0.85);   // 눈의 빛
  const [hx, hy] = px(86, 73); gl(hx, hy, 70 + 10 * Math.sin(time * 3.2), enr ? "#ff3010" : "#ff7a20", 0.9); gl(hx, hy, 26, "#fff0b0", 0.9);   // 가슴의 핵
  if (R && R.sealed) {   // 결계: 푸른 막이 보스를 감싼다
    const pulse = 0.5 + 0.5 * Math.sin(time * 4); ctx.strokeStyle = `rgba(120,200,255,${0.55 + 0.3 * pulse})`; ctx.lineWidth = 5; ctx.fillStyle = `rgba(90,170,255,${0.10 + 0.06 * pulse})`;
    ctx.beginPath(); ctx.ellipse(480, 262, 190, 200, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.lineWidth = 2; ctx.globalAlpha *= 0.7; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(480, 262, 190 - i * 26, 200, 0, 0, 7); ctx.stroke(); }
  }
  if (R && R.vuln > 0) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(time * 8); ctx.fillStyle = "#fff2a0"; ctx.fillRect(0, 0, 960, 540); }
  ctx.restore();
}
function drawRaidCrystal(ctx, b, e, time) {
  const x = e.vx, y = e.vy + Math.sin(time * 2 + e.id) * 4, h = 92, w = 38, pulse = 0.5 + 0.5 * Math.sin(time * 4 + e.id), hpR = Math.max(0, e.hp / e.maxHp);
  const bg = b.bossRef; if (bg && !bg.dead) { ctx.save(); ctx.strokeStyle = `rgba(140,210,255,${0.25 + 0.2 * pulse})`; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -time * 40; ctx.beginPath(); ctx.moveTo(x, y - h * 0.5); ctx.lineTo(480, 270); ctx.stroke(); ctx.restore(); }
  const rg = ctx.createRadialGradient(x, y, 4, x, y, 90); rg.addColorStop(0, `rgba(120,200,255,${0.45 + 0.2 * pulse})`); rg.addColorStop(1, "rgba(120,200,255,0)"); ctx.fillStyle = rg; ctx.fillRect(x - 90, y - 90, 180, 180);
  const flash = e.flash > 0; ctx.save(); ctx.translate(x, y); ctx.lineJoin = "miter";
  const facets = [[[0, -h / 2], [w / 2, -h * 0.12], [0, 0]], [[0, -h / 2], [-w / 2, -h * 0.12], [0, 0]], [[w / 2, -h * 0.12], [w * 0.36, h * 0.3], [0, h / 2], [0, 0]], [[-w / 2, -h * 0.12], [-w * 0.36, h * 0.3], [0, h / 2], [0, 0]]], cols = ["#b8ecff", "#6ab4f0", "#3a78d8", "#2a58b8"];
  facets.forEach((f, i) => { ctx.fillStyle = flash ? "#ffffff" : cols[i]; ctx.beginPath(); ctx.moveTo(...f[0]); for (const p of f.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.fill(); });
  ctx.strokeStyle = "#0a1840"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, -h * 0.12); ctx.lineTo(w * 0.36, h * 0.3); ctx.lineTo(0, h / 2); ctx.lineTo(-w * 0.36, h * 0.3); ctx.lineTo(-w / 2, -h * 0.12); ctx.closePath(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(x - 40, y + h / 2 + 8, 80, 8); ctx.fillStyle = hpR > 0.3 ? "#7ad0ff" : "#ff6a6a"; ctx.fillRect(x - 39, y + h / 2 + 9, 78 * hpR, 6);
  ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#cfeaff"; ctx.fillText("결계석", x, y + h / 2 + 30);
  if (b.designated === e) { ctx.strokeStyle = "#ffd24a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 4, 36, 10, 0, 0, 7); ctx.stroke(); }
}
function drawRaidPlayer(ctx, b, time) {
  rvInit(); const P = PLAYER_POS, S = 2.9, bob = Math.sin(time * 2) * 1.5, w = 48 * S, h = 64 * S, x = P.x - w / 2, y = P.y - h + bob;
  ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(P.x, P.y + 2, 46, 11, 0, 0, 7); ctx.fill(); ctx.restore();
  if (b.buffs.cry) { ctx.fillStyle = `rgba(255,210,70,${0.16 + 0.1 * Math.sin(time * 8)})`; ctx.beginPath(); ctx.ellipse(P.x, P.y - 70, 70, 96, 0, 0, 7); ctx.fill(); }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // 칼: 평소에는 위로 받쳐 들고, 공격할 때 크게 내려친다
  const atk = b.pAtk > 0 ? b.pAtk / 0.42 : 0, ang = -0.35 + (atk > 0 ? Math.sin((1 - atk) * Math.PI) * 1.2 : 0), hx = P.x + 52, hy = y + 66 * S / 2.9 * 1.05;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.fillStyle = "#6a4a2a"; ctx.fillRect(-4, -6, 8, 24); ctx.fillStyle = "#e8b83a"; ctx.fillRect(-14, -10, 28, 6); ctx.fillStyle = "#e6eefc"; ctx.fillRect(-6, -92, 12, 84); ctx.fillStyle = "#ffffff"; ctx.fillRect(-1, -92, 3, 84); ctx.fillStyle = "#9aa8c8"; ctx.fillRect(3, -88, 3, 78);
  if (atk > 0) { ctx.fillStyle = `rgba(255,255,255,${0.5 * atk})`; ctx.fillRect(-10, -96, 20, 90); } ctx.restore();
  const hurt = b.pHurt > 0; if (hurt) ctx.filter = "brightness(1.8) saturate(.4)";
  ctx.drawImage(RV.plr, x, y, w, h); ctx.filter = "none"; ctx.restore();
}

function drawRaidEnemies(ctx, b, dt, time) {
  const boss = b.enemies.find((e) => e.def && e.def.raid && !e.dead);
  if (boss) { boss.vx = 480; boss.vy = 265; drawMorgas(ctx, b, boss, time, 1, false); }
  ctx.drawImage(RV.floor, 0, 0);
  for (const e of b.enemies) if (e.crystal && !e.dead) { const p = cellXY(b, e.lane, e.col); e.vx = p.x; e.vy = p.y; drawRaidCrystal(ctx, b, e, time); }
  if (boss && b.designated === boss) { ctx.strokeStyle = "#ffd24a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(480, 392, 150, 20, 0, 0, 7); ctx.stroke(); }
  drawRaidPlayer(ctx, b, time);
}

// ---- 황금 보물고의 몬스터: 코인 / 골드 보따리 (코드로 그린 픽셀 느낌의 유닛) ----
function drawVaultUnit(ctx, b, e, time, x0, y0, appear) {
  const bag = e.def.vaultUnit === "bag", fl = e.flash > 0, lean = e.winding > 0 ? -10 * (1 - e.winding / e.windup) : 0, walk = e.col > e.range;
  const hop = walk ? Math.abs(Math.sin(e.age * 9 + e.id)) * 9 : Math.sin(time * 2 + e.id) * 1.5, x = x0 + lean, y = y0 - hop;
  const circ = (cx, cy, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); };
  const coin = (cx, cy, r) => {   // 동그란 금화: 테두리·안쪽 링·반짝임·$ 표식
    circ(cx, cy, r, "#8a5a0c"); circ(cx, cy, r - 2, "#ffd24a"); ctx.strokeStyle = "#d89a1a"; ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, 7); ctx.stroke();
    ctx.strokeStyle = "#fff4b8"; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.beginPath(); ctx.arc(cx, cy, r - 3, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    ctx.fillStyle = "#a8700c"; ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("$", cx, cy + r * 0.38);
  };
  ctx.save(); ctx.globalAlpha = appear; ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= 0.3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x0, y0, bag ? 50 : 19, 7, 0, 0, 7); ctx.fill(); ctx.globalAlpha = appear;
  if (e.chill > 0) ctx.filter = "hue-rotate(160deg) brightness(1.2)";
  if (!bag) {   // 코인: 눈 달린 동그란 금화가 통통 뛰어온다
    const r = 19, cy = y - r - 7; circ(x - 7, y - 3, 4.5, "#5a3a14"); circ(x + 7, y - 3, 4.5, "#5a3a14");
    coin(x, cy, r); circ(x - 6, cy - 5, 3, "#2a1a08"); circ(x + 6, cy - 5, 3, "#2a1a08"); circ(x - 5, cy - 6, 1, "#fff"); circ(x + 7, cy - 6, 1, "#fff");
    if (e.winding > 0) { ctx.strokeStyle = "#2a1a08"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy + 6, 4, 0, Math.PI); ctx.stroke(); }
  } else {   // 골드 보따리: 불룩한 갈색 자루, 벌어진 입구에 금화가 수북이 쌓여 있다
    circ(x - 18, y - 3, 7, "#4a2a0c"); circ(x + 18, y - 3, 7, "#4a2a0c");
    const body = () => { ctx.beginPath(); ctx.moveTo(x - 42, y - 52); ctx.bezierCurveTo(x - 68, y - 36, x - 60, y - 4, x - 26, y - 3); ctx.lineTo(x + 26, y - 3); ctx.bezierCurveTo(x + 60, y - 4, x + 68, y - 36, x + 42, y - 52); ctx.lineTo(x + 50, y - 66); ctx.quadraticCurveTo(x + 38, y - 56, x + 28, y - 58); ctx.quadraticCurveTo(x + 12, y - 66, x - 6, y - 58); ctx.quadraticCurveTo(x - 24, y - 54, x - 34, y - 60); ctx.lineTo(x - 50, y - 68); ctx.closePath(); };
    body(); ctx.fillStyle = "#9a6a2c"; ctx.fill();
    ctx.save(); body(); ctx.clip(); ctx.fillStyle = "#7a5020"; ctx.beginPath(); ctx.ellipse(x + 40, y - 28, 34, 40, 0.2, 0, 7); ctx.fill(); ctx.fillStyle = "#b88a44"; ctx.beginPath(); ctx.ellipse(x - 34, y - 36, 12, 20, -0.35, 0, 7); ctx.fill(); ctx.restore();
    body(); ctx.strokeStyle = "#3a2208"; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.stroke();
    ctx.fillStyle = "#3a2208"; ctx.beginPath(); ctx.ellipse(x, y - 56, 36, 11, 0, 0, 7); ctx.fill();
    for (const [cx, cy, r] of [[-16, -66, 8], [0, -70, 8.5], [16, -66, 8], [-28, -60, 8], [-10, -63, 8.5], [10, -63, 8.5], [28, -60, 8], [-19, -57, 8.5], [0, -58, 9], [19, -57, 8.5], [-6, -52, 8]]) coin(x + cx, y + cy, r);
    ctx.strokeStyle = "#7a5020"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.ellipse(x, y - 56, 36, 11, 0, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); ctx.strokeStyle = "#3a2208"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y - 56, 38.5, 13.5, 0, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
    circ(x - 14, y - 30, 6, "#fff"); circ(x + 14, y - 30, 6, "#fff"); circ(x - 13, y - 29, 3, "#2a1a08"); circ(x + 15, y - 29, 3, "#2a1a08");
    ctx.strokeStyle = "#2a1a08"; ctx.lineWidth = 2; ctx.beginPath(); if (e.winding > 0) ctx.arc(x, y - 14, 6, Math.PI, 0); else ctx.arc(x, y - 18, 7, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = "rgba(200,140,60,.55)"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("$", x, y - 6);
  }
  if (fl) { ctx.globalCompositeOperation = "source-atop"; }
  ctx.filter = "none"; ctx.restore();
  if (fl) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(x, y - (bag ? 36 : 26), bag ? 52 : 19, bag ? 38 : 21, 0, 0, 7); ctx.fill(); ctx.restore(); }
  if (bag || e.hp < e.maxHp) drawEnemyBar(ctx, e, x0, y0 - (bag ? 86 : 58));
  if (e.winding > 0) drawPx(ctx, "!", x0 - 4, y0 - (bag ? 102 : 74), "#ff5a5a", 3);
}
function drawVaultPuff(ctx, c, time) {   // 쓰러지면 금화가 사방으로 튄다
  const k = clamp(c.t / 0.9, 0, 1), n = c.def.vaultUnit === "bag" ? 14 : 6;
  ctx.save(); for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + c.x * 0.01, r = 18 + k * (c.def.vaultUnit === "bag" ? 70 : 38), px = c.x + Math.cos(a) * r, py = c.y - 24 - Math.sin(a) * r * 0.6 + k * k * 40; ctx.globalAlpha = 1 - k; ctx.fillStyle = i % 2 ? "#ffd24a" : "#fff0a0"; ctx.fillRect(Math.round(px), Math.round(py), 7, 7); } ctx.restore();
}

// ---- 거대 보물상자 (황금 보물고의 확률 보스): 뚜껑 틈으로 금빛이 새어 나온다 ----
function drawChestBoss(ctx, e, x, y, time, alpha) {
  const fl = e && e.flash > 0, wind = e && e.winding > 0 ? 1 - e.winding / e.windup : 0, open = 14 + Math.sin(time * 2.4) * 3 + wind * 26, bob = Math.sin(time * 2 + (e ? e.id : 0)) * 2;
  ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; y -= bob;
  ctx.globalAlpha *= 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x, y + 2, 120, 16, 0, 0, 7); ctx.fill(); ctx.globalAlpha = alpha == null ? 1 : alpha;
  const W = 190, H = 96, bx = x - W / 2, by = y - H;
  const gl = ctx.createRadialGradient(x, by - 10, 6, x, by - 10, 140); gl.addColorStop(0, "rgba(255,230,120,.9)"); gl.addColorStop(1, "rgba(255,200,60,0)"); ctx.fillStyle = gl; ctx.fillRect(x - 150, by - 150, 300, 220);
  // 안쪽 금화 더미
  ctx.fillStyle = "#3a2208"; ctx.fillRect(bx + 8, by - 6, W - 16, 14);
  for (let i = 0; i < 9; i++) { const cx = bx + 20 + i * 18.5, cy = by - 4 - Math.abs(Math.sin(i * 1.7)) * 14 - (i % 3) * 3; ctx.fillStyle = "#8a5a0c"; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill(); ctx.fillStyle = "#ffd24a"; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#fff0a0"; ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, 7); ctx.fill(); }
  // 몸통
  const wood = fl ? "#ffffff" : "#8a5424", dark = fl ? "#eee" : "#5a3414", gold = fl ? "#fff" : "#e8b83a";
  ctx.fillStyle = wood; ctx.fillRect(bx, by + 6, W, H - 6); ctx.fillStyle = dark; for (let i = 1; i < 5; i++) ctx.fillRect(bx, by + 6 + i * 18, W, 3);
  ctx.fillStyle = dark; ctx.fillRect(bx, by + 6, 6, H - 6); ctx.fillRect(bx + W - 6, by + 6, 6, H - 6);
  ctx.fillStyle = gold; for (const px of [bx + 14, bx + W - 32]) { ctx.fillRect(px, by + 6, 18, H - 6); ctx.fillStyle = "#a87a1a"; ctx.fillRect(px + 14, by + 6, 4, H - 6); ctx.fillStyle = gold; }
  ctx.fillRect(bx - 4, by + H - 10, 22, 14); ctx.fillRect(bx + W - 18, by + H - 10, 22, 14);
  ctx.fillStyle = "#a87a1a"; ctx.fillRect(x - 16, by + 22, 32, 36); ctx.fillStyle = gold; ctx.fillRect(x - 13, by + 25, 26, 30); ctx.fillStyle = "#3a2208"; ctx.fillRect(x - 4, by + 34, 8, 12); ctx.fillRect(x - 2, by + 44, 4, 8);
  // 눈
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - 50, by + 34, 9, 0, 7); ctx.arc(x + 50, by + 34, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#c01818"; ctx.beginPath(); ctx.arc(x - 48, by + 35, 4, 0, 7); ctx.arc(x + 52, by + 35, 4, 0, 7); ctx.fill();
  // 열린 뚜껑 (뒤로 젖혀진다)
  ctx.save(); ctx.translate(x, by + 6); ctx.fillStyle = wood; ctx.beginPath(); ctx.moveTo(-W / 2, 0); ctx.lineTo(W / 2, 0); ctx.lineTo(W / 2 - 14, -open - 30); ctx.lineTo(-W / 2 + 14, -open - 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(-W / 2 + 14, -open - 30, W - 28, 7); ctx.fillStyle = gold; ctx.fillRect(-W / 2 + 14 + 16, -open - 30, 14, open + 30); ctx.fillRect(W / 2 - 14 - 30, -open - 30, 14, open + 30); ctx.restore();
  ctx.restore();
}
