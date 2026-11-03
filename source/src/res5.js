// =========================================================
// 5.0 전투 결과 창 (로블록스판 Client showResultPanel 과 같은 구성)
//  장식 틀 · 위 가장자리에 걸친 큰 승리/패배 띠(빛) · 전투 이름 · 시간·처치 줄 · 경험치 막대(레벨 문장) · 보상 칩 3열 · (패배) 강해지는 방법
//  버튼: 다음 ▶ · 다시 · 지도 · 마을 · 자동: 끔 / 같은 단계 / 다음 단계 (이기면 3초 뒤 자동 시작, 지면 멈춤)
// =========================================================
const AUTO5_TXT = ["자동: 끔", "자동: 같은 단계", "자동: 다음 단계"];
const auto5 = () => (save && save.opt && save.opt.auto5) || 0;
function setAuto5(v) { save.opt = save.opt || {}; save.opt.auto5 = v; saveGame(); updateAutoBtn(); }
function updateAutoBtn() { const b = $("#b-auto"); if (!b) return; const v = auto5(); b.textContent = AUTO5_TXT[v]; b.classList.toggle("pri", v > 0); }
function afterBattle(res, b) {
  const node = G.node, A = save.auto;
  if (res.win && (A.always || auto5() > 0) && node.kind !== "tutorial") {   // 자동 정리: 전투가 끝날 때마다 가방에 규칙 적용
    const pr = autoProcess(save); if (pr.sold || pr.dis || pr.sSold || pr.sDis) { saveGame(); refreshTop(); toast(`자동 정리: ${pr.sold ? "장비 " + pr.sold + "개 판매 " : ""}${pr.dis ? "장비 " + pr.dis + "개 분해 " : ""}${pr.sDis ? "아르카나 " + pr.sDis + "개 분해" : ""}`, "ok"); }
  }
  showResult(res, b);
}
function showResult(res, b, replay) {
  G.pending = [res, b]; if (G.autoT) { clearInterval(G.autoT); G.autoT = null; }
  const node = G.node, tut = node.kind === "tutorial", win = res.win;
  if (!replay && !res.uniques && res.items.some((i) => i.rarity >= 3)) snd("legend");
  const keyKind = node.kind === "void" || isEB(node.kind), bossLike = node.kind === "boss" || node.kind === "raid" || keyKind;
  const canRetry = !tut && node.kind !== "endless";
  const nb = tut ? null : nextBattleOf(node, res);
  const back = () => { if (win && node.kind === "raid") { G.battle = null; AU.stopBgm(); raidAftermath(); return; } if (tut && !save.tut.done) { startTutorial(); return; } G.retry.back ? G.retry.back() : openMap(node.act); };
  const T = (s) => s;
  // 보상 칩
  const C = []; const chip = (ic, t, col) => C.push(`<div class="rc5" style="--c:${col}">${ic ? `<img src="${artURL(ic) || ""}" alt="">` : ""}<span>${t}</span></div>`);
  if (res.first || res.riftFirst || res.spireFirst) chip(null, "★ 첫 클리어!", "#ffdc78");
  if (res.exp > 0) chip(null, "경험치 +" + fmtN(res.exp), "#96c8ff");
  if (res.levelUps) chip(null, "레벨 +" + res.levelUps, "#96e6ff");
  if (res.gold > 0) chip("i_gold", "골드 +" + fmtN(res.gold), "#ffd76e");
  if (res.hone > 0) chip("i_arcana", "아르카나 조각 +" + res.hone, "#f0aaff");
  if (res.ore > 0) chip("i_ore", "강화석 +" + res.ore, "#aad2ff");
  if (res.orbC > 0) chip("i_chaos", "혼돈 구슬 +" + res.orbC, "#f0786e");
  if (res.orbD > 0) chip("i_divine", "신성한 구슬 +" + res.orbD, "#ffe6a0");
  if (res.items.length) { const cnt = {}; for (const it of res.items) { const k = it.sat ? 4 : Math.min(3, it.rarity || 0); cnt[k] = (cnt[k] || 0) + 1; }
    const NM = ["일반", "매직", "레어", "전설", "사탄"], COL = ["#cdcdd7", "#6ea0ff", "#ffd646", "#ff9628", "#ff463c"];
    for (let r = 4; r >= 0; r--) if (cnt[r]) chip("i_weapon", `${NM[r]} 장비 x${cnt[r]}`, COL[r]); }
  if (res.skills && res.skills.length) chip("i_arcana", `아르카나 ${res.skills.length}장`, "#f0aaff");
  if (res.stones > 0) chip("i_stone", "돌 +" + res.stones, "#a0dcff");
  if (res.charms && res.charms.length) chip(null, `참 ${res.charms.length}개`, "#ffbee6");
  if (res.stonesHi) chip("i_stone", "계시의 돌 +" + res.stonesHi, "#ffdc8c");
  if (res.sockTix) chip(null, "세공의 인장 +" + res.sockTix, "#c8aaff");
  const KN = [["keys", "보스 관문 열쇠"]];
  for (const [k, n] of KN) if (res[k] > 0) chip(null, `🗝 ${n} +${res[k]}`, "#e6c88c");
  for (const r of res.runes || []) chip(null, `◆ ${RUNES[r].name}`, RUNES[r].color);
  if (!C.length) chip(null, win ? "보상 없음" : "다시 도전 · 장비 · 아르카나 · 패시브를 올리면 이길 수 있습니다", "#c8beb4");
  const note = res.notes && res.notes[0]; if (note) chip(null, note, "#c8beb4");
  for (const q of res.quests || []) chip(null, "✔ 퀘스트 완료: " + q.title, "#8cff9a");
  // 경험치 막대
  const pre = res.pre || { level: save.level, exp: save.exp, need: expNeed(save.level) }, need = expNeed(save.level);
  const to = save.level >= CFG.LEVEL_CAP ? 1 : Math.min(1, save.exp / need), from = replay ? to : res.levelUps ? 0 : Math.min(1, pre.exp / pre.need);
  const showExp = res.exp > 0 || res.levelUps;
  // 강해지는 방법 (패배)
  const adv = !win ? adviceList(save) : [];
  const btns = [];
  if (nb) btns.push(`<button class="btn gold" data-a="next">다음 ▶</button>`);
  if (canRetry) btns.push(`<button class="btn blue" data-a="retry">다시</button>`);
  btns.push(`<button class="btn" data-a="map">지도</button>`, `<button class="btn" data-a="town">마을</button>`);
  if (canRetry && AUTO_KINDS.includes(node.kind)) btns.push(`<button class="btn ${auto5() > 0 ? "green" : ""}" data-a="auto">${AUTO5_TXT[auto5()]}</button>`);
  Modal.open(`<div class="r5 ${win ? "win" : "lose"} ${replay ? "" : "anim"}"><div class="r5glow"></div><div class="r5band"><b>${win ? "승리" : "패배"}</b></div>
    <div class="r5sub">${node.name || endTitle(b)[0] || ""}</div><div class="r5stat"><span>⏱ ${Math.round(res.time || 0)}초</span><span>☠ 처치 ${res.kills || 0}</span></div>
    ${showExp ? `<div class="r5exp"><div class="r5lv"><b>${save.level}</b></div><div class="r5bar"><i style="width:${from * 100}%" data-to="${to * 100}"></i><s></s></div><span>${fmtN(save.exp)} / ${fmtN(need)} 경험치</span></div>` : ""}
    <div class="r5chips">${C.join("")}</div>
    ${adv.length ? `<div class="r5adv"><b>강해지는 방법</b>${adv.map(([k, ic, t]) => `<button data-a="adv" data-k="${k}"><span>${ic}  ${t}</span><em>가기 ▶</em></button>`).join("")}</div>` : ""}
    <div class="r5cnt" id="r5cnt"></div><div class="r5btns">${btns.join("")}</div></div>`, { cls: "res5", persistent: true, noClose: true, on: {
    next: () => { stopAuto5(); if (!nb) return; G.pending = null; Modal.close(true); if (nb.town) { G.battle = null; AU.stopBgm(); openTown(nb.town); return; } const n = nb.node; startBattle(nb.battle, { back: () => { openMap(Math.min(10, n.act)); MapView.sel = n; mapPanel(); } }); },
    retry: () => { stopAuto5(); retry5(node); },
    map: () => { stopAuto5(); G.pending = null; Modal.close(true); back(); },
    town: () => { stopAuto5(); G.pending = null; Modal.close(true); G.battle = null; AU.stopBgm(); openTown(G.townAct || 1); },
    ok: () => { stopAuto5(); G.pending = null; Modal.close(true); back(); },
    auto: () => { setAuto5((auto5() + 1) % 3); showResult(res, b, true); },
    adv: (el) => { stopAuto5(); adviceGo(el.dataset.k); },
  } });
  if (!replay) { const f = $("#mbox .r5bar i"); if (f) setTimeout(() => { f.style.width = f.dataset.to + "%"; if (res.levelUps) { const l = $("#mbox .r5lv"); if (l) l.classList.add("up"); snd("levelup"); } }, 300); }
  refreshTop();
  // 자동 반복: 이기면 3초 뒤 같은/다음 단계를 다시 시작, 지면 멈춘다
  if (auto5() > 0 && canRetry && AUTO_KINDS.includes(node.kind)) {
    const cnt = $("#r5cnt");
    if (!win) { cnt.textContent = "패배 — 자동 반복을 멈췄습니다"; return; }
    if (save.inv.length >= invMax(save) - 3) { cnt.textContent = "가방이 가득 차서 자동 반복을 멈췄습니다"; return; }
    let left = document.hidden ? 0 : 3; cnt.textContent = `자동 반복: ${left}초 후 시작`;
    const go = () => { if (!G.pending || G.pending[0] !== res) return stopAuto5(); if (left > 0) { cnt.textContent = `자동 반복: ${left}초 후 시작`; left--; return; } stopAuto5(); if (auto5() === 2 && nb && !nb.town) { const n = nb.node; G.pending = null; Modal.close(true); startBattle(nb.battle, { back: () => { openMap(Math.min(10, n.act)); MapView.sel = n; mapPanel(); } }); } else retry5(node); };
    G.autoT = setInterval(go, 1000); go();
  }
}
function stopAuto5() { if (G.autoT) { clearInterval(G.autoT); G.autoT = null; } }
function retry5(node) {   // 열쇠를 쓰는 보스는 다시 할 때마다 열쇠 1개
  const ki = autoKeyInfo(node); if (ki) { if (ki.have < ki.cost) { toast(`${ki.name}가 부족합니다`, "bad"); snd("error"); const c = $("#r5cnt"); if (c) c.textContent = `${ki.name}가 부족합니다`; return; } save[ki.key] -= ki.cost; saveGame(); refreshTop(); }
  G.pending = null; Modal.close(true); startBattle(node, G.retry);
}
