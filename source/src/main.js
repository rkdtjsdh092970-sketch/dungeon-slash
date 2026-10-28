// =========================================================
// 진입점: 입력 / 메인 루프
// =========================================================
let CV, CTX, lastT = 0, gtime = 0, accumSave = 0;
function canvasPos(ev) { const r = CV.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * CW, ((ev.clientY - r.top) / r.height) * CH]; }
function fitApp() { const a = $("#app"), s = Math.min(window.innerWidth / CW, window.innerHeight / CH); a.style.transform = `translate(-50%,-50%) scale(${s})`; }

function pickEnemy(b, mx, my) {
  let best = null, bd = 1e9;
  for (const e of b.enemies) { if (e.dead || e.vx == null) continue; const R = e.tier === "boss" ? 70 * e.def.sc / 2 + 30 : 30 + e.def.sc * 6; const cy = e.tier === "boss" ? e.vy - e.def.sc * 20 : e.vy - 26; const d = Math.hypot(e.vx - mx, cy - my); if (d < R && d < bd) { bd = d; best = e; } }
  return best;
}
const ev_ok = (el) => el.click();
function bindInput() {
  CV.addEventListener("mousedown", (ev) => { AU.init(); AU.resume(); const [x, y] = canvasPos(ev); const m = MapView; m.drag = { x, y, cx: m.cam.x, cy: m.cam.y }; m.moved = false; });
  window.addEventListener("mousemove", (ev) => {
    const [x, y] = canvasPos(ev), m = MapView;
    if (G.screen === "map") { if (m.drag && ev.buttons) { const dx = x - m.drag.x, dy = y - m.drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) m.moved = true; if (m.moved) { m.cam.x = clamp(m.drag.cx - dx, 0, MAP_W - CW); m.cam.y = clamp(m.drag.cy - dy, 0, MAP_H - CH); } } else m.hover = m.pick(x, y); CV.style.cursor = m.hover ? "pointer" : "default"; }
    else if (G.screen === "town") { const s = TownView.pick(x, y); if (TownView.hover !== s && s) snd("hover"); TownView.hover = s; CV.style.cursor = s ? "pointer" : "default"; }
    else if (G.screen === "battle" && G.battle) { CV.style.cursor = pickEnemy(G.battle, x, y) ? "crosshair" : "default"; }
  });
  window.addEventListener("mouseup", () => { MapView.drag = null; });
  CV.addEventListener("click", (ev) => {
    AU.init(); AU.resume(); const [x, y] = canvasPos(ev);
    if (G.screen === "map") { if (MapView.moved) return; const n = MapView.pick(x, y); if (n) { MapView.sel = n; if (n.kind === "rift") G.riftTier = Math.max(1, Math.min(G.riftTier, save.rift.best + 1)); if (n.kind === "trial" && !G.trialInit) { G.trialInit = true; G.trialTier = Math.max(1, Math.min(MAX_TRIAL, (save.trialBest || 0) + 1)); } snd("click"); } else MapView.sel = null; mapPanel(); }
    else if (G.screen === "town") townClick(TownView.pick(x, y));
    else if (G.screen === "battle" && G.battle && !G.battle.over && !G.paused) { const e = pickEnemy(G.battle, x, y); if (e) { G.battle.designated = G.battle.designated === e ? null : e; snd("click"); } }
  });
  document.addEventListener("click", (ev) => {
    AU.init(); AU.resume(); const t = ev.target.closest("[data-t]"); if (!t) return; const a = t.dataset.t;
    if (a === "new") { if (loadGame()) askConfirm("기존 저장 데이터가 지워집니다.<br>새로 시작할까요?", "새로 시작", startNew); else startNew(); }
    else if (a === "cont") continueGame(); else if (a === "opt") openSettings(); else if (a === "login") loginDialog(openTitle);
    else if (a === "tipok") { $("#tip").classList.add("hidden"); G.paused = false; G.tipOpen = false; snd("click"); }
  });
  $("#mappanel").addEventListener("click", (ev) => { const p = ev.target.closest("[data-p]"); if (!p) return; const a = p.dataset.p; snd("click");
    if (a === "atlas") openAtlas(); else if (a === "tower") openTower(); else if (a === "go") mapGo(); else if (a === "back") { MapView.sel = null; mapPanel(); } else if (a === "tp") { G.riftTier = Math.min(save.rift.best + 1, G.riftTier + 1); mapPanel(); } else if (a === "tm") { G.riftTier = Math.max(1, G.riftTier - 1); mapPanel(); } else if (a === "ttp") { G.trialTier = Math.min(MAX_TRIAL, (save.trialBest || 0) + 1, G.trialTier + 1); mapPanel(); } else if (a === "vsp") { G.voidStage = Math.min(4, (G.voidStage || 1) + 1); mapPanel(); } else if (a === "vsm") { G.voidStage = Math.max(1, (G.voidStage || 1) - 1); mapPanel(); } else if (a === "hsp") { G.hiveStage = Math.min(4, (G.hiveStage || 1) + 1); mapPanel(); } else if (a === "hsm") { G.hiveStage = Math.max(1, (G.hiveStage || 1) - 1); mapPanel(); } else if (a === "tsp") { G.titanStage = Math.min(4, (G.titanStage || 1) + 1); mapPanel(); } else if (a === "tsm") { G.titanStage = Math.max(1, (G.titanStage || 1) - 1); mapPanel(); } else if (a === "ssp") { G.stormStage = Math.min(4, (G.stormStage || 1) + 1); mapPanel(); } else if (a === "ssm") { G.stormStage = Math.max(1, (G.stormStage || 1) - 1); mapPanel(); } else if (a === "ttm") { G.trialTier = Math.max(1, G.trialTier - 1); mapPanel(); } });
  $("#b-inv").onclick = () => { snd("click"); IB.mode = "inv"; IB.sel = null; renderItems(); };
  $("#b-skill").onclick = () => { snd("click"); SK.slot = 0; openSkills(); };
  $("#t-pow-w").onclick = () => { snd("click"); openStats(); }; $("#b-rank").onclick = () => { snd("click"); openRanking(); };
  $("#b-quest").onclick = () => { snd("click"); openQuests(false); };
  $("#b-opt").onclick = () => { snd("click"); openSettings(); };
  $("#b-map").onclick = () => { snd("click"); if (G.screen === "map") openTown(G.townAct); else openMap(G.townAct); };
  $("#b-stat").onclick = () => { snd("click"); openStats(); };
  $("#b-daily").onclick = () => { snd("click"); openDaily(); };
  $("#b-codex").onclick = () => { snd("click"); CX.sel = null; openCodex(); };
  $("#b-pause").onclick = () => { G.paused = !G.paused; $("#b-pause").textContent = G.paused ? "▶" : "❚❚"; };
  $("#b-speed").onclick = () => { G.speed = G.speed >= 3 ? 1 : G.speed + 1; $("#b-speed").textContent = "×" + G.speed; };
  $("#b-flee").onclick = () => { snd("click"); retreat(); };
  $("#b-pass").onclick = () => { snd("click"); openPassives(); };
  $("#b-auto").onclick = () => { save.auto.on = !save.auto.on; saveGame(); updateAutoBtn(); snd("click"); toast(save.auto.on ? "자동 반복 ON — 이긴 뒤 같은 스테이지를 계속 반복합니다" : "자동 반복 OFF"); };
  initModal(); window.addEventListener("resize", fitApp); fitApp();
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#modal").classList.contains("hidden")) { if (!Modal.persistent) Modal.close(); } else if (G.screen === "battle") retreat(); }
    if ((G.screen === "town" || G.screen === "map") && $("#modal").classList.contains("hidden") && !e.repeat && !e.ctrlKey && !e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === "m") $("#b-map").click(); else if (k === "i") $("#b-inv").click(); else if (k === "k") $("#b-skill").click(); else if (k === "p") $("#b-pass").click(); else if (k === "c") $("#b-stat").click(); else if (k === "q") $("#b-quest").click(); else if (k === "d") $("#b-codex").click(); else if (k === "t") $("#b-daily").click(); else if (k === "r") openRecords();
    }
    if (e.key === "Enter" && G.pending && !$("#modal").classList.contains("hidden")) { const ok = document.querySelector('#mbox [data-a="ok"]'); if (ok) { ev_ok(ok); return; } }
    if (G.screen === "battle" && !e.repeat) { if (e.key === " ") { e.preventDefault(); $("#b-pause").click(); } } });
}

// ---- 백그라운드 전투: 탭이 가려져도 (워커 타이머로) 실제 경과 시간만큼 전투를 진행한다 ----
let bgW = null, bgLast = 0, bgTimer = 0;
function bgTick() {
  if (!document.hidden) return; const now = performance.now(); let dt = Math.min(60, (now - bgLast) / 1000); bgLast = now;
  if (G.screen === "battle" && G.battle) {
    const b = G.battle; b.noFx = true; b.sfxq.length = 0;
    if (!G.paused && !G.tipOpen && $("#modal").classList.contains("hidden")) { let t = dt * G.speed; while (t > 0 && !b.over) { const h = Math.min(0.1, t); stepBattle(b, h); t -= h; } }
    if (b.over && !b.fin) { b.fin = true; b.endT = 99; finishFlow(b); }
    if (b.next) { const nx = b.next; b.next = null; nx(); }
  }
  if (save && G.screen !== "title") { accumSave += dt; if (accumSave > 30) { accumSave = 0; saveGame(); } }
}
function bgStart() {
  if (bgW || bgTimer) return; bgLast = performance.now();
  try { const blob = new Blob(["setInterval(()=>postMessage(0),500)"], { type: "text/javascript" }); bgW = new Worker(URL.createObjectURL(blob)); bgW.onmessage = bgTick; } catch (e) { bgW = null; bgTimer = setInterval(bgTick, 1000); }
}
function bgStop() { if (bgW) { bgW.terminate(); bgW = null; } if (bgTimer) { clearInterval(bgTimer); bgTimer = 0; } if (G.battle) G.battle.noFx = false; lastT = performance.now(); }
document.addEventListener("visibilitychange", () => { if (document.hidden) bgStart(); else bgStop(); });
function frame(ms) {
  requestAnimationFrame(frame); const rawDt = Math.min(0.1, (ms - lastT) / 1000 || 0); lastT = ms; gtime += rawDt; const g = CTX;
  if (G.screen === "title") drawTitle(g, gtime);
  else if (G.screen === "map") MapView.draw(save, gtime, rawDt);
  else if (G.screen === "town") TownView.draw(save, gtime);
  else if (G.screen === "battle" && G.battle) {
    const b = G.battle;
    if (!G.paused && !b.over && $("#modal").classList.contains("hidden")) {
      const steps = G.speed; for (let i = 0; i < steps; i++) stepBattle(b, rawDt);
    }
    for (const n of b.sfxq) AU.sfx(n); b.sfxq.length = 0;
    if (b.over) { if (b.endT == null) initEndFx(b); fxTick(b, rawDt * (b.endT < 0.8 ? 0.4 : 1)); b.endT += rawDt; }
    G.dt = rawDt; drawBattle(g, b, rawDt, gtime); if (b.over) drawEndOverlay(g, b); battleHud(b);
    if (b.next && b.endT >= b.resultAt) { const nx = b.next; b.next = null; nx(); }
    if (b.over && b.fin && !b.next && G.pending && $("#modal").classList.contains("hidden") && $("#unique").classList.contains("hidden")) showResult(G.pending[0], G.pending[1], true);
    if (b.over && !b.fin) { b.fin = true; finishFlow(b); }
    if (b.bossRef && !b.bossRef.dead && b.node.kind !== "boss" && b.node.kind !== "rift" && AU.trackName !== "boss") AU.bgm("boss");
  }
  accumSave += rawDt; if (save && G.screen !== "title" && save.stats) save.stats.sec = (save.stats.sec || 0) + rawDt; if (accumSave > 30 && save) { accumSave = 0; saveGame(); }
}

window.addEventListener("load", () => {
  CV = $("#cv"); CTX = CV.getContext("2d"); MapView.g = CTX; TownView.g = CTX; bindInput();
  setInterval(() => { if (save && (G.screen === "map" || G.screen === "town")) updateWorld(); }, 1000);
  loadAssets(() => { if (typeof tipInit === "function") tipInit(); setInterval(() => { if (G.screen === "town" && typeof mailPoll === "function") mailPoll(); }, 60000); $("#iorb").src = iconURL("orb", 1); $("#ig").src = iconURL("gold", 1); $("#io").src = iconURL("ore", 1); $("#is").src = iconURL("shard", 1); $("#loading").remove(); openTitle(); requestAnimationFrame(frame); srvAutoLogin(); srvMark(); { const v = document.createElement('div'); v.id = 'verlab'; v.textContent = 'v' + BUILD_ID; $('#app').appendChild(v); } checkUpdate(); setInterval(checkUpdate, 60000); });
});
