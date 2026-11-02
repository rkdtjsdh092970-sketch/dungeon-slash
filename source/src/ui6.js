// =========================================================
// 전투 종료 연출 + 결과 화면 (별 등급, 경험치 바, 카운트업, 드랍 팝업)
// =========================================================
function fxTick(b, dt) {   // 전투가 끝난 뒤에도 이펙트/글자/시체 연출을 계속 진행
  if (b.noFx) return;
  for (const f of b.fx) f.t -= dt; b.fx = b.fx.filter((f) => f.t > -(f.delay || 0));
  for (const t of b.texts) { t.t -= dt; t.y -= 26 * dt; } b.texts = b.texts.filter((t) => t.t > 0);
  for (const c of b.corpses) c.t += dt; b.corpses = b.corpses.filter((c) => c.t < 1.6);
  b.shake = Math.max(0, b.shake - dt); b.flash = Math.max(0, b.flash - dt); b.pHurt = Math.max(0, (b.pHurt || 0) - dt); b.pAtk = Math.max(0, (b.pAtk || 0) - dt);
}
const endWin = (b) => b.win || b.endless;
function initEndFx(b) {
  b.endT = 0; b.zones = []; b.persist = []; b.events = []; b.conf = [];
  if (endWin(b)) for (let i = 0; i < 90; i++) b.conf.push({ x: Math.random() * CW, y: -Math.random() * 360, vx: rnd(-30, 30), vy: rnd(90, 230), r: rnd(0, 6.28), vr: rnd(-6, 6), c: pick(["#ffd24a", "#ff8a5a", "#8ad8ff", "#a8f08a", "#d8a0ff", "#ffffff"]), w: rnd(4, 8), h: rnd(6, 12) });
}
function endTitle(b) { const k = b.node.kind; return endWin(b) ? (k === "endless" ? ["무한 균열 종료", "ENDLESS RIFT"] : k === "raid" ? ["문지기 처치!", "GATEKEEPER SLAIN"] : k === "boss" || k === "void" || isEB(k) ? ["보스 처치!", "BOSS DEFEATED"] : k === "tutorial" ? ["훈련 완료", "WELL DONE"] : ["스테이지 클리어", "STAGE CLEAR"]) : ["패배...", "DEFEAT"]; }
function drawEndOverlay(g, b) {
  const t = b.endT || 0, W = CW, H = CH, win = endWin(b), dt = Math.min(0.1, G.dt || 0.016), [title, sub] = endTitle(b); g.save();
  if (win) {
    const fa = Math.max(0, 0.45 - t * 1.1); if (fa > 0) { g.fillStyle = `rgba(255,244,200,${fa})`; g.fillRect(0, 0, W, H); }
    const ra = Math.min(1, t * 2) * 0.2; g.save(); g.translate(W / 2, 170); g.rotate(t * 0.22); for (let i = 0; i < 14; i++) { g.rotate(Math.PI * 2 / 14); g.fillStyle = `rgba(255,222,130,${ra})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(-20, 460); g.lineTo(20, 460); g.closePath(); g.fill(); } g.restore();
    for (const c of b.conf) { c.y += c.vy * dt; c.x += c.vx * dt + Math.sin(c.y / 30) * 0.6; c.r += c.vr * dt; if (c.y > H + 20) continue; g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.fillStyle = c.c; g.globalAlpha = 0.9; g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); g.restore(); }
  } else {
    const p = Math.min(1, t / 0.9); g.fillStyle = `rgba(16,6,22,${0.38 * p})`; g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 560); vg.addColorStop(0, "rgba(120,0,0,0)"); vg.addColorStop(1, `rgba(150,10,10,${0.55 * p})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  // 띠 + 큰 글자
  const p = Math.min(1, t / 0.35), e = 1 - Math.pow(1 - p, 3), bh = (win ? 104 : 88) * e, cy = 168;
  const band = g.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2); if (win) { band.addColorStop(0, "rgba(20,12,40,0)"); band.addColorStop(0.2, "rgba(24,16,52,.88)"); band.addColorStop(0.8, "rgba(24,16,52,.88)"); band.addColorStop(1, "rgba(20,12,40,0)"); } else { band.addColorStop(0, "rgba(20,0,0,0)"); band.addColorStop(0.2, "rgba(40,6,10,.9)"); band.addColorStop(0.8, "rgba(40,6,10,.9)"); band.addColorStop(1, "rgba(20,0,0,0)"); }
  g.fillStyle = band; g.fillRect(0, cy - bh / 2, W, bh);
  if (e > 0.6) {
    const sc = 1 + 0.4 * Math.max(0, 1 - t / 0.5) + (win ? 0.03 * Math.sin(t * 3) : 0), sx = !win && t < 0.6 ? Math.sin(t * 60) * (0.6 - t) * 14 : 0;
    g.save(); g.translate(W / 2 + sx, cy - 4); g.scale(sc, sc); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.font = "900 58px 'Malgun Gothic','Noto Sans KR',sans-serif"; const gr = g.createLinearGradient(0, -30, 0, 30);
    if (win) { gr.addColorStop(0, "#fff6b0"); gr.addColorStop(0.5, "#ffd24a"); gr.addColorStop(1, "#e08a20"); } else { gr.addColorStop(0, "#e8d8d8"); gr.addColorStop(0.5, "#b08a8a"); gr.addColorStop(1, "#6a3a3a"); }
    g.shadowColor = win ? "rgba(255,170,40,.9)" : "rgba(200,30,30,.8)"; g.shadowBlur = 22; g.lineWidth = 10; g.strokeStyle = "#1a0c20"; g.strokeText(title, 0, 0); g.shadowBlur = 0; g.fillStyle = gr; g.fillText(title, 0, 0);
    g.font = "700 15px sans-serif"; g.letterSpacing = "8px"; g.fillStyle = win ? "#ffe9a0" : "#d8a0a0"; g.fillText(sub, 4, 44); g.letterSpacing = "0px"; g.restore();
  }
  g.restore();
}

// ---------------- 결과 화면 ----------------
// 5.0 (로블록스판과 같게): 패배하면 지금 바로 강해질 수 있는 방법을 보여 주고, 누르면 그 메뉴로
function adviceList(sv) {
  const out = [], left = passivePoints(sv) - passiveSpent(sv);
  if (left > 0) out.push(["pass", "✦", `남은 패시브 포인트 ${left}점 찍기`]);
  const up = sv.inv.filter((it) => isUpgrade(sv, it)).length; if (up > 0) out.push(["gear", "🛡", `가방에 더 좋은 장비 ${up}개 — 장착하기`]);
  if ((sv.hone || 0) >= GACHA.ARC1) out.push(["gacha", "🔮", `새 아르카나 소환 (아르카나 조각 ${fmtN(sv.hone)}개)`]);
  if (EQ_SLOTS.some((k) => sv.equipped[k] && (sv.equipped[k].enh || 0) < 10) && sv.ore >= 5) out.push(["forge", "⚒", `제련소에서 장비 강화 (강화석 ${fmtN(sv.ore)}개)`]);
  const keys = ["keys", "keys2", "keys3", "keys4", "keys5", "keys6"].reduce((a, k) => a + (sv[k] || 0), 0); if (keys > 0) out.push(["gate", "🗝", `보스 관문 열쇠 ${keys}개로 더 좋은 평타 얻기`]);
  return out;
}
function adviceGo(k) {
  G.pending = null; Modal.close(true); G.battle = null; AU.stopBgm(); openTown(G.townAct || 1);
  setTimeout(() => { if (k === "pass") openPassives(); else if (k === "gear") { IB.mode = "inv"; IB.sel = null; renderItems(); } else if (k === "gacha") openSummon(); else if (k === "forge") openItems("forge"); else if (k === "gate") openMap(); }, 50);
}
