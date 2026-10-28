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
function starCount(res, b) { if (!res.win || b.node.kind === "tutorial") return 0; const hp = b.hp / b.maxHp; return 1 + (hp >= 0.4 ? 1 : 0) + (hp >= 0.75 ? 1 : 0); }
function resultHtml(res, b, node, tut, endless, nextTut, canRetry, replay, nb) {
  const win = res.win, T = endTitle(b), stars = starCount(res, b), pre = res.pre || { level: save.level, exp: save.exp, need: expNeed(save.level) };
  const A = replay ? "" : "rs-anim";
  const chip = (ic, label, val, cnt, cls) => `<div class="rs-chip ${cls || ""}"><span class="ic">${ic}</span><div><small>${label}</small><b ${cnt != null ? `data-cnt="${cnt}"` : ""}>${val}</b></div></div>`;
  const stat = (label, val) => `<div class="rs-stat"><small>${label}</small><b>${val}</b></div>`;
  const rew = [chip(iconImg("gold", 2), "골드", replay ? fmtN(res.gold) : "0", res.gold), res.ore ? chip(iconImg("ore", 2), "강화석", "+" + res.ore) : "", res.shards ? chip(iconImg("shard", 2), "균열 조각", "+" + res.shards) : "", res.orbC ? chip(iconImg("orb", 2), "혼돈 구슬", "+" + res.orbC) : "", res.orbD ? chip(iconImg("orb", 2), "신성한 구슬", "+" + res.orbD, null, "gem") : "", res.stones ? chip("💎", "미확인의 돌", "+" + res.stones, null, "gem") : "", res.keys ? chip(iconImg("skull", 2), "공허의 열쇠", "+" + res.keys) : "", res.keys2 ? chip(iconImg("skull", 2), "정령의 불씨", "+" + res.keys2) : "", res.keys3 ? chip(iconImg("skull", 2), "철갑의 징표", "+" + res.keys3) : "", res.keys4 ? chip(iconImg("skull", 2), "뇌전의 징표", "+" + res.keys4) : "", res.keys5 ? chip(iconImg("skull", 2), "서리의 징표", "+" + res.keys5) : "", res.keys6 ? chip(iconImg("skull", 2), "맹독의 징표", "+" + res.keys6) : "", res.hone ? chip(iconImg("ore", 2), "연마석", "+" + res.hone) : "",
    ...(res.runes || []).map((r) => chip(`<i style="color:${RUNES[r].color}">◆</i>`, "룬", RUNES[r].name, null, "rune"))].join("");
  const tiles = res.items.slice().sort((x, y) => y.rarity - x.rarity).map((it, i) => `<div class="rs-pop" style="--i:${i}">${tileHtml(it)}</div>`).join("");
  const rareLines = res.items.filter((i) => i.rarity >= 2).slice(0, 6).map((it) => `<div class="drop">${ITEM_ICON(it)} ${itemTitle(it)}</div>`).join("") + (res.items.filter((i) => i.rarity >= 2).length > 6 ? `<div class="dim center">외 ${res.items.filter((i) => i.rarity >= 2).length - 6}개</div>` : "");
  const sk = res.skills.map((s) => `<div class="rs-sk">${skIcon(s.id, 3)}<div><small>새 스킬</small>${skillTitle(s)}</div></div>`).join("");
  const notes = res.notes.map((n) => `<div class="note">★ ${n}</div>`).join("") + res.quests.map((q) => `<div class="note">✔ 퀘스트 완료: ${q.title}</div>`).join("");
  const frac0 = Math.min(1, pre.exp / pre.need), fracN = save.level >= CFG.LEVEL_CAP ? 1 : Math.min(1, save.exp / expNeed(save.level));
  return `<div class="rs ${A} ${win ? "win" : "lose"}">
    <div class="rs-head"><div class="rs-ribbon"><span>${T[0]}</span></div><div class="rs-en">${T[1]}</div>
      ${stars ? `<div class="rs-stars">${[0, 1, 2].map((i) => `<i class="${i < stars ? "on" : ""}" style="--d:${350 + i * 220}ms">★</i>`).join("")}</div>` : ""}
      <div class="rs-node">${node.name || ""}</div></div>
    <div class="rs-stats">${stat("처치", res.kills)}${stat("시간", Math.round(res.time) + "초")}${stat("가한 피해", fmtN(b.dealt))}${stat("받은 피해", fmtN(b.taken))}</div>
    <div class="rs-exp"><div class="rs-lv">Lv.<b id="rs-lv">${replay ? save.level : pre.level}</b></div><div class="rs-bar"><i id="rs-fill" style="width:${(replay ? fracN : frac0) * 100}%"></i><span id="rs-txt"></span></div><div class="rs-gain">${res.levelUps ? `레벨 <b>+${res.levelUps}</b>` : `<small class="dim">경험치 없음 · 균열 첫 클리어마다 레벨 +1</small>`}</div><div class="rs-up" id="rs-up">LEVEL UP!</div></div>
    <div class="rs-rew">${rew}</div>
    ${!win ? `<div class="dim center">패배 시 보상은 절반입니다</div>` : ""}${res.buffs && res.buffs.length ? `<div class="dim center">월드 버프: ${res.buffs.map((w) => w.name).join(", ")}</div>` : ""}
    ${tiles ? `<div class="rs-sec">획득 장비 <em>${res.items.length}</em></div><div class="rs-drops">${tiles}</div>${rareLines}` : ""}${sk}${notes}
    <div class="pbtns rs-btns"><button class="btn pri big" data-a="ok">${nextTut ? "다음 훈련" : tut ? "마을로" : "확인"} <small>Enter</small></button>${!tut ? `<button class="btn" data-a="inv">장비 정리</button>` : ""}${canRetry ? `<button class="btn" data-a="retry" ${canRetry.disabled ? "disabled" : ""}>${canRetry.label || "다시 도전"}</button>` : ""}${nb ? `<button class="btn pri" data-a="next">${nb.label}</button>` : ""}</div><div class="center" style="margin-top:6px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">${AUTO_KINDS.includes(node.kind) && !replay ? `<button class="btn xs" data-a="autoloop">${autoLoopLabel(node)}</button>` : ""}${nb && !replay && res.win ? `<button class="btn xs" data-a="autotog">${autoNextLabel()}</button>` : ""}</div></div>`;
}
function animateResult(res) {
  $$("#mbox [data-cnt]").forEach((el, k) => { const to = +el.dataset.cnt, t0 = performance.now() + 250, dur = 1000; const f = (now) => { if (!el.isConnected) return; const p = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - p, 3); el.textContent = fmtN(Math.round(to * e)); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const pre = res.pre; if (!pre) return; const fill = $("#rs-fill"), lv = $("#rs-lv"), up = $("#rs-up"), txt = $("#rs-txt"); if (!fill) return;
  const segs = [], lv1 = save.level, startLv = Math.max(pre.level, lv1 - 5);
  for (let l = startLv; l <= lv1; l++) segs.push({ lv: l, from: l === pre.level ? Math.min(1, pre.exp / pre.need) : 0, to: l === lv1 ? (lv1 >= CFG.LEVEL_CAP ? 1 : Math.min(1, save.exp / expNeed(lv1))) : 1 });
  let i = 0, t0 = 0, dur = 0; const begin = () => { const s = segs[i]; lv.textContent = s.lv; fill.style.width = s.from * 100 + "%"; t0 = performance.now(); dur = 350 + (s.to - s.from) * 700; };
  setTimeout(() => { begin(); const step = (now) => { if (!fill.isConnected) return; const s = segs[i], p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 2); fill.style.width = (s.from + (s.to - s.from) * e) * 100 + "%";
    if (p >= 1) { if (i < segs.length - 1) { i++; lv.textContent = segs[i].lv; up.classList.remove("show"); void up.offsetWidth; up.classList.add("show"); snd("levelup"); begin(); } else { if (txt && save.level < CFG.LEVEL_CAP) txt.textContent = `${fmtN(save.exp)} / ${fmtN(expNeed(save.level))}`; return; } } requestAnimationFrame(step); }; requestAnimationFrame(step); }, 450);
}
