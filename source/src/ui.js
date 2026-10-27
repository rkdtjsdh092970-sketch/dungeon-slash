// =========================================================
// UI: 모달 / HUD / 화면 전환
// =========================================================
const G = { trialTier: 1, screen: "boot", battle: null, node: null, speed: 1, paused: false, retry: null, townAct: 1, after: null, riftTier: 1, tipOpen: false, guide: null, wslot: -1 };
const snd = (n) => AU.sfx(n);
const ITEM_ICON = (it) => (it.uniq && UNIQUE_BY_ID[it.uniq] ? uniqueIconImg(it.uniq, 2) : iconImg(it.slot, 2));
const RCLS = (it) => ITEM_RARITY[it.rarity].cls;
const setOf = (it) => (it.setId ? SETS.find((s) => s.id === it.setId) : null);
const itemColor = (it) => (it.setId ? setOf(it).color : null);
const skillTitle = (inst) => { const d = SKILLS.find((x) => x.id === inst.id); return `<span class="${SKILL_RARITY[inst.rarity].cls}">${SKILL_RARITY[inst.rarity].name} ${d.name}</span>`; };
const skIcon = (id, sc) => iconImg(SKILLS.find((x) => x.id === id).icon, sc || 2);
const fmtTime = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// ---------- 토스트 ----------
function toast(msg, cls) { const t = document.createElement("div"); t.className = "toast " + (cls || ""); t.textContent = msg; $("#toasts").appendChild(t); setTimeout(() => t.remove(), 2600); }

// ---------- 모달 ----------
const Modal = {
  on: {}, onClose: null, persistent: false,
  open(html, o) {
    o = o || {}; this.on = o.on || {}; this.onClose = o.onClose || null; this.persistent = !!o.persistent;
    const m = $("#modal"), box = $("#mbox"), keep = !m.classList.contains("hidden") ? this.scrollSnap(box) : null;   // 같은 창을 다시 그릴 때 스크롤 위치 유지
    m.classList.remove("hidden"); box.className = o.cls || ""; box.innerHTML = (o.noClose ? "" : `<button class="x" data-a="__close">✕</button>`) + html;
    if (keep && keep.h2 === (box.querySelector("h2") || {}).textContent) this.scrollRestore(box, keep.list);
    if (!this.was) snd("open"); this.was = true;
  },
  scrollSnap(box) { const list = []; box.querySelectorAll("*").forEach((el) => { if (el.scrollTop > 0) { const sib = [...box.querySelectorAll(el.tagName + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""))]; list.push({ tag: el.tagName, cls: el.className, i: sib.indexOf(el), top: el.scrollTop }); } }); const h = box.querySelector("h2"); return { h2: h ? h.textContent : "", list }; },
  scrollRestore(box, list) { for (const it of list) { const sel = it.tag + (it.cls && typeof it.cls === "string" ? "." + it.cls.trim().split(/\s+/).join(".") : ""); const el = box.querySelectorAll(sel)[it.i]; if (el) el.scrollTop = it.top; } },
  close(silent) { if ($("#modal").classList.contains("hidden")) return; $("#modal").classList.add("hidden"); this.was = false; if (!silent) snd("close"); const f = this.onClose; this.onClose = null; if (f) f(); },
};
function askConfirm(msg, yes, cb, danger) {
  Modal.open(`<h2>확인</h2><p class="center">${msg}</p><div class="pbtns"><button class="btn ${danger === false ? "pri" : "warn"}" data-a="cyes">${yes || "확인"}</button><button class="btn" data-a="cno">취소</button></div>`, { cls: "sm", on: { cyes: () => { Modal.close(true); cb(); }, cno: () => Modal.close() } });
}
function initModal() {
  const box = $("#mbox");
  const h = (ev) => { if (ev.target.closest("select,input")) return; const el = ev.target.closest("[data-a]"); if (!el || el.disabled) return; const a = el.dataset.a; if (a === "__close") return Modal.close(); const f = Modal.on[a]; if (f) { snd("click"); f(el, ev); } };
  box.addEventListener("click", h); box.addEventListener("input", (ev) => { const el = ev.target.closest("[data-i]"); if (el && Modal.on[el.dataset.i]) Modal.on[el.dataset.i](el, ev); });
  $("#modal").addEventListener("mousedown", (ev) => { if (ev.target.id === "modal" && !Modal.persistent) Modal.close(); });
}

// ---------- 상단 바 (맵 / 마을) ----------
function refreshTop() {
  const s = save; $("#t-lv").textContent = "Lv." + s.level;
  const need = expNeed(s.level); $("#t-exp").style.width = (s.level >= CFG.LEVEL_CAP ? 100 : Math.min(100, (s.exp / need) * 100)) + "%";
  $("#t-gold").textContent = fmtN(s.gold); $("#t-ore").textContent = fmtN(s.ore); $("#t-shard").textContent = fmtN(s.shards);
  $("#t-shard-w").style.display = s.endgame ? "" : "none";
  $("#t-orb").textContent = fmtN(s.orbC); $("#t-orb-w").style.display = s.orbC || s.endgame ? "" : "none";
  $("#t-key").textContent = fmtN(s.keys); $("#t-key-w").style.display = s.keys || s.endgame ? "" : "none";
  const q = Object.keys(s.q).filter((id) => s.q[id].state === "done").length; $("#b-quest .dot").style.display = q ? "" : "none";
  $("#b-inv .upm").style.display = hasAnyUpgrade(s) ? "" : "none";
  { const D = dailyState(s); const claimable = DAILY_TASKS.some((t) => (!t.endgame || s.endgame) && !D.claimed[t.id] && (D[t.key] || 0) >= t.n); const dd = $("#b-daily .dot"); if (dd) dd.style.display = claimable ? "" : "none"; }
  const pp = passivePoints(s) - passiveSpent(s); $("#b-pass .dot").style.display = pp > 0 ? "" : "none";
  updateWorld(); if (typeof srvMark === "function") srvMark();
}
function showScreen(name) {
  G.screen = name; document.body.dataset.screen = name;
  for (const id of ["title", "top", "battlehud", "mappanel", "townbar"]) $("#" + id).classList.toggle("hidden", !({ title: ["title"], map: ["top", "mappanel"], town: ["top", "townbar"], battle: ["battlehud"] }[name] || []).includes(id));
  const bgm = { title: "title", map: "town", town: "town" }[name]; if (bgm) AU.bgm(bgm);
  if (name !== "town" && name !== "map") setGuide(null);
  if (name !== "battle") { G.battle = null; if (save) refreshTop(); }
}

// ---------- 타이틀 ----------
function openTitle() {
  showScreen("title"); const has = !!loadGame();
  $("#title").innerHTML = `<div class="logo"><div class="l1">DUNGEON</div><div class="l2">SLASH</div><div class="l3">자동 전투 핵 앤 슬래시</div></div>
  <div class="tbtns"><button class="btn big" data-t="new">새로 시작</button><button class="btn big" data-t="cont" ${has ? "" : "disabled"}>이어하기</button><button class="btn" data-t="login" ${SRV.on ? "disabled" : ""}>${SRV.on ? "☁ 로그인됨 (" + SRV.name + ")" : "☁ 서버 로그인"}</button><button class="btn" data-t="opt">소리 설정</button></div><div class="tfoot">클릭하면 소리가 켜집니다 · 모든 그림과 음악은 코드로 만들어졌습니다</div>`;
}
function startNew() { save = newSave(); saveGame(); G.townAct = 1; G.guide = null; startTutorial(); }
function continueGame() {
  const s = loadGame(); if (!s) return; save = s; AU.vol = Object.assign(AU.vol, save.set); AU.applyVol();
  if (!save.tut.done) startTutorial(); else { G.townAct = Math.max(1, maxActUnlocked(save)); G.guide = save.seen.guide ? null : "map"; openTown(G.townAct); checkOffline(); }
}

// ---------- 튜토리얼 ----------
function startTutorial() {
  const step = save.tut.step || 0; const T = TUTORIAL[step];
  startBattle({ kind: "tutorial", act: 1, step, name: T.title, level: 1 }, { tip: T.text, title: T.title, back: () => openTitle() });
}

// ---------- 월드맵 ----------
function openMap(focusAct) {
  showScreen("map"); MapView.sel = null; MapView.hover = null; MapView.focusAct(focusAct || G.townAct || 1);
  if (G.guide === "map") { G.guide = "stage"; MapView.pulse = MAP.byId["S1-1"]; $("#b-map").classList.remove("pulse"); }
  if (G.guide === "stage") setGuide("반짝이는 <b>초원 1</b> 노드를 눌러 선택한 뒤, 오른쪽 아래 <b>[선택]</b> 버튼을 누르세요."); else { setGuide(null); MapView.pulse = null; }
  mapPanel();
}
function riftMods(tier) {
  const r = seeded(tier * 131 + 7), n = Math.min(3, 1 + Math.floor(tier / 4)), pool = RIFT_MODS.slice(), out = [];
  for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out;
}
const isHell = (n) => save.endgame && n.kind === "stage" && hellNodes(Date.now()).has(n.id);
function nodeToBattle(n) {
  if (n.kind === "trial") return { kind: "trial", act: 11, tier: G.trialTier, mods: riftMods(G.trialTier), name: `스킬 시련 ${G.trialTier}단계`, level: 100 };
  if (n.kind === "rift") return { kind: "rift", act: 11, tier: G.riftTier, mods: riftMods(G.riftTier), name: `심연의 균열 ${G.riftTier}단계`, level: 100 };
  if (n.kind === "endless") return { kind: "endless", act: 10, tier: Math.max(1, save.rift.best - 2), name: "무한 균열", level: 100 };
  if (n.kind === "void") return { kind: "void", act: 10, tier: Math.max(1, save.rift.best), name: "공허의 군주", level: 100 };
  if (isHell(n)) return { kind: "hell", act: n.act, stage: 4, tier: Math.max(1, save.rift.best), name: `지옥 · ${n.name}`, level: 100, nodeId: n.id };
  if (n.kind === "elite" || n.kind === "treasure") return Object.assign({}, n, { stage: n.need + (n.kind === "elite" ? 1 : 3) });
  return n;
}
function mapPanel() {
  const n = MapView.sel, p = $("#mappanel"); if (!n) { p.innerHTML = `<div class="hint">노드를 선택하세요 · 드래그로 지도를 움직입니다</div>`; return; }
  let h = `<div class="ptitle">${n.name}</div>`;
  const un = nodeUnlocked(save, n); let btn = "선택", btnOk = un, extra = "";
  if (n.kind === "town") h += `<div class="pline">마을 · 정비와 퀘스트</div>`;
  else if (n.kind === "rift") {
    h += `<div class="pline">엔드게임 · 최고 ${save.rift.best}층</div><div class="pline dim">탑을 열어 도전할 층을 고릅니다. 층이 오를수록 MF가 오릅니다.</div>`;
    extra = `<button class="btn pri" data-p="tower">탑 열기</button><button class="btn" data-p="atlas">심연 각인</button>`; btnOk = false; btn = "도전";
  } else if (n.kind === "endless") {
    const E = endlessInfo(save);
    h += `<div class="pline">몹이 끝없이 몰려옵니다. 버틴 만큼 보상이 늘어납니다.</div><div class="pline">오늘 남은 횟수 <b>${E.left}</b> / ${E.max}</div><div class="pline dim">최고 기록 ${save.endless.best}초 · ${save.endless.bestKills}마리</div><div class="pline dim">보상: 장비·고유·구슬·조각 (웨이브당 증가)</div>`;
    btnOk = un && E.left > 0; btn = E.left > 0 ? "도전" : "횟수 소진";
  } else if (n.kind === "void") {
    h += `<div class="pline">공허의 열쇠 <b>${save.keys}</b>개 보유 (1개 소모)</div><div class="pline">${VOID_BOSS.desc}</div><div class="pline dim">고유 장비 6종 중 1개를 확정으로 얻습니다 (2종은 엔젤릭)</div><div class="pline dim">열쇠: 균열의 왜곡체(보라색 눈알)를 잡으면 얻습니다</div>`;
    btnOk = un && save.keys > 0; btn = save.keys > 0 ? "도전" : "열쇠 필요";
  } else {
    const rec = n.kind === "stage" || n.kind === "boss" ? recPower(n.act, n.stage) : n.kind === "elite" ? recPower(n.act, n.need + 1) : recPower(n.act, n.need + 3);
    const my = playerPower(computeStats(save)), ratio = my / rec, tag = ratio >= 1.15 ? ["여유", "#8df08d"] : ratio >= 0.8 ? ["적정", "#ffe08a"] : ratio >= 0.5 ? ["위험", "#ffa060"] : ["매우 위험", "#ff6a6a"];
    if (isHell(n)) h += `<div class="pline hellt">🔥 지옥 스테이지 · 난이도 = 균열 ${Math.max(1, save.rift.best)}단계 수준</div><div class="pline dim">보상 대폭 증가 · 구슬/조각 · 열쇠 · 남은 시간 ${fmtTime(worldLeft())}</div>`;
    else h += `<div class="pline">권장 레벨 ${n.level} · 난이도 <b style="color:${tag[1]}">${tag[0]}</b></div>`;
    if (n.kind === "boss") h += `<div class="pline">${BOSSES[ACTS[n.act - 1].boss].desc}</div>`;
    if (n.kind === "elite") h += `<div class="pline dim">정예 다수 · 장비 드랍 높음</div>`;
    if (n.kind === "treasure") h += `<div class="pline dim">보물 지하실 · 아이템·강화석 풍부</div>`;
    if (n.kind === "stage" || n.kind === "boss") h += `<div class="pline dim">${ACT_SPECIAL[n.act - 1].name}: ${ACT_SPECIAL[n.act - 1].desc}</div>`;
  }
  if (!un) h += `<div class="pline warn">${!save.tut.done ? "튜토리얼을 먼저 완료하세요" : n.kind === "elite" || n.kind === "treasure" ? `스테이지 ${n.need} 클리어 후 개방` : n.kind === "rift" || n.kind === "endless" || n.kind === "void" || n.kind === "trial" ? "액트 10 보스를 처치하면 개방" : "이전 노드를 클리어하세요"}</div>`;
  h += `<div class="pbtns"><button class="btn pri" data-p="go" ${btnOk ? "" : "disabled"}>${btn}</button><button class="btn" data-p="back">뒤로</button>${extra}</div>`;
  p.innerHTML = h;
}
function mapGo() {
  const n = MapView.sel; if (!n || !nodeUnlocked(save, n)) return;
  if (n.kind === "town") return openTown(n.act);
  if (n.kind === "endless") { const E = endlessInfo(save); if (E.left < 1) return; save.endless.used++; saveGame(); }
  if (n.kind === "void") { if (save.keys < 1) return; save.keys--; saveGame(); }
  let tip = null, title = null;
  if (G.guide === "stage" && n.id === "S1-1") { G.guide = null; save.seen.guide = true; MapView.pulse = null; setGuide(null); title = "첫 모험 · 초원 1"; tip = "스킬은 쿨타임마다 자동 발동합니다. 적을 클릭하면 그 적을 우선 공격해요.<br>전투가 끝나면 장비가 떨어지고, 장비 창에 <b style='color:#5dff7a'>▲</b> 가 뜨면 더 강한 장비입니다. <b>[추천 장비 착용]</b>으로 한 번에 갈아입으세요!"; }
  startBattle(nodeToBattle(n), { tip, title, back: () => { openMap(Math.min(10, n.act)); MapView.sel = n; mapPanel(); } });
}

// ---------- 마을 ----------
function openTown(act) {
  G.townAct = act; TownView.act = act; showScreen("town"); if (typeof notesUnread === "function" && notesUnread() && save.tut.done) setTimeout(() => toast("📜 새 패치 노트가 있습니다 — 마을의 '업데이트 게시판'"), 600); $("#townbar .tname").textContent = `${ACTS[act - 1].name} 마을`;
  if (G.guide === "map") { setGuide("마을에서는 스킬·대장간·퀘스트·상점을 이용할 수 있어요.<br>이제 위쪽의 <b>🗺 지도</b> 버튼을 눌러 첫 스테이지로 가봅시다!"); $("#b-map").classList.add("pulse"); }
  else { setGuide(null); $("#b-map").classList.remove("pulse"); }
}
function townClick(s) {
  if (!s) return;
  if (s.soon) return openSoon(s);
  if (G.townAct < s.need) { toast(`액트 ${s.need} 마을에서 개방됩니다`); snd("error"); return; }
  ({ skill: () => { SK.slot = 0; openSkills(); }, forge: () => openItems("forge"), board: openBoard, shop: () => openItems("shop"), guild: openGuild, auction: openAuction, skillshop: openSkillShop, trainer: openPassives, notice: openNotes })[s.id]();
}
function openSoon(s) { Modal.open(`<h2>${s.name}</h2><p class="center dim">다른 유저와 거래하는 장소입니다.<br>온라인 기능은 아직 준비 중입니다.</p>`, { cls: "sm" }); }

// ---------- 프리셋 ----------
function presetRow() {
  return `<div class="presets">프리셋 ` + [0, 1, 2].map((i) => { const p = save.presets[i]; return `<button class="btn xs pbtn ${p ? "has" : ""}" data-a="ppick" data-n="${i}" title="${p ? "눌러서 구성을 확인하고 적용" : "비어 있음 · 눌러서 현재 구성을 저장"}">${i + 1}${p ? " ✓" : ""}</button>`; }).join("") + `</div>`;
}
// 프리셋 미리보기: 장착 스킬(레벨·룬·타겟)과 장비를 보여주고, 적용/덮어쓰기를 고른다
function presetPower(i) {
  const p = save.presets[i]; if (!p) return null; const eq0 = save.equipped, lo0 = save.loadout, eq = {};
  for (const sl of EQ_SLOTS) { const u = p.equip[sl]; if (u == null) continue; const it = save.inv.find((x) => x.uid === u) || EQ_SLOTS.map((k) => save.equipped[k]).find((x) => x && x.uid === u); if (it) eq[sl] = it; }
  save.equipped = eq; save.loadout = [0, 1, 2, 3].map((k) => { const l = p.loadout[k]; return l && save.skills.some((x) => x.uid === l.uid) ? l : null; });
  let pw = 0; try { pw = playerPower(computeStats(save)); } catch (e) {} save.equipped = eq0; save.loadout = lo0; return pw;
}
function openPresetPreview(i, rerender) {
  const p = save.presets[i], n = i + 1;
  if (!p) { Modal.open(`<h2>프리셋 ${n}</h2><div class="center pad dim">비어 있는 프리셋입니다.<br>지금 착용한 장비와 장착한 스킬을 저장할 수 있습니다.</div><div class="pbtns"><button class="btn pri" data-a="pvsave">현재 구성 저장</button><button class="btn" data-a="pvback">돌아가기</button></div>`, { cls: "sm", on: { pvsave: () => { savePreset(save, i); toast(`프리셋 ${n}에 저장했습니다`, "ok"); saveGame(); openPresetPreview(i, rerender); }, pvback: () => rerender() } }); return; }
  const skl = [0, 1, 2, 3].map((k) => { const l = p.loadout[k]; const inst = l && save.skills.find((x) => x.uid === l.uid); if (!inst) return `<div class="pv-sk off"><div class="pv-ic"></div><small>${l ? "사라진 스킬" : "비어 있음"}</small></div>`; const sk = skillOf(inst); return `<div class="pv-sk">${skIcon(inst.id, 3)}<div><b>${skillTitle(inst)}</b><small>Lv.${inst.lvl || 1}${sk.rune ? " · " + sk.rune.name : ""} · 타겟 ${RULE_SHORT[l.rule] || "앞열"}</small></div></div>`; }).join("");
  const eqs = EQ_SLOTS.map((sl) => { const u = p.equip[sl], it = u != null && (save.inv.find((x) => x.uid === u) || EQ_SLOTS.map((k) => save.equipped[k]).find((x) => x && x.uid === u)); return it ? `<div class="pv-eq">${tileHtml(it, { up: false })}<small>${SLOT_NAME[sl]}</small></div>` : `<div class="pv-eq off"><div class="tile empty">${iconImg(slotType(sl), 2, "ghost")}</div><small>${SLOT_NAME[sl]} · 없음</small></div>`; }).join("");
  const cur = playerPower(computeStats(save)), pw = presetPower(i), d = pw && cur ? pw / cur - 1 : 0;
  Modal.open(`<h2>프리셋 ${n}</h2><div class="pv-sec">스킬</div><div class="pv-skills">${skl}</div><div class="pv-sec">장비</div><div class="pv-eqs">${eqs}</div>
  <div class="center pad">${pw ? `현재 구성 대비 전투력 <b class="${d >= 0 ? "up" : "dn"}">${d >= 0 ? "▲" : "▼"} ${Math.abs(d * 100).toFixed(1)}%</b>` : ""}</div>
  <div class="pbtns"><button class="btn pri big" data-a="pvuse">적용</button><button class="btn" data-a="pvsave">현재 구성으로 덮어쓰기</button><button class="btn" data-a="pvback">돌아가기</button></div>`, { cls: "result", on: {
    pvuse: () => { if (loadPreset(save, i)) { snd("equip"); toast(`프리셋 ${n}을 적용했습니다`, "ok"); saveGame(); refreshTop(); } rerender(); },
    pvsave: () => { savePreset(save, i); toast(`프리셋 ${n}에 현재 구성을 저장했습니다`, "ok"); saveGame(); openPresetPreview(i, rerender); },
    pvback: () => rerender(),
  } });
}
const presetHandlers = (rerender) => ({ ppick: (el) => openPresetPreview(+el.dataset.n, rerender) });

// ---------- 아이템 창 (가방 / 대장간 / 상점) ----------
const itemIconBySlot = (slot, cls) => iconImg(slot, 1, cls);

// ---------- 스킬 정비 ----------
const SK = { slot: 0, sel: null };
const RULE_SHORT = { front: "앞열", auto: "오토", boss: "보스", ranged: "원거리", elite: "정예", normal: "일반" };
const SLOT_HINT = ["", "튜토리얼 완료 시 개방", "액트 3 보스 처치 시 개방", "액트 6 보스 처치 시 개방"];
const promoteCost = (inst) => (inst.rarity === 0 ? 8 : 25);

// ---------- 퀘스트 ----------
const QT = { tab: "active" };
function questRow(d, st, mode) {
  const pr = st ? Math.min(d.goal.n, st.p) : 0; const r = d.reward, rw = [r.exp ? `경험치 ${r.exp}` : "", r.gold ? `${fmtN(r.gold)}G` : "", r.ore ? `강화석 ${r.ore}` : "", r.shards ? `조각 ${r.shards}` : "", r.item ? "희귀 장비" : ""].filter(Boolean).join(" · ");
  return `<div class="qrow ${d.main ? "main" : ""}"><div class="qi"><b>${d.main ? "[메인] " : ""}${d.title}</b><div class="dim">${d.desc}</div><small>보상: ${rw}</small>${st ? `<div class="bar"><i style="width:${(pr / d.goal.n) * 100}%"></i><span>${pr}/${d.goal.n}</span></div>` : ""}</div>
  ${mode === "accept" ? `<button class="btn pri" data-a="accept" data-id="${d.id}">수락</button>` : st && st.state === "done" ? `<button class="btn pri" data-a="claim" data-id="${d.id}">보상 받기</button>` : ""}</div>`;
}
function openQuests(board) {
  const act = [], done = [];
  for (const id in save.q) { const st = save.q[id], d = getQDef(id); if (!d || st.state === "claimed") continue; (st.state === "done" ? done : act).push([d, st]); }
  let body;
  if (board && QT.tab === "avail") { const a = availableQuests(save); body = a.map((d) => questRow(d, null, "accept")).join("") || `<div class="dim center pad">수락할 수 있는 퀘스트가 없습니다</div>`; }
  else { const l = [...done, ...act]; body = l.map(([d, st]) => questRow(d, st)).join("") || `<div class="dim center pad">진행 중인 퀘스트가 없습니다${board ? "<br>게시판에서 새 퀘스트를 수락하세요" : ""}</div>`; }
  Modal.open(`<h2>${board ? "퀘스트 게시판" : "퀘스트"}</h2>${board ? `<div class="tabs"><button class="tab ${QT.tab === "avail" ? "on" : ""}" data-a="qtab" data-t="avail">수락 가능 (${availableQuests(save).length})</button><button class="tab ${QT.tab === "active" ? "on" : ""}" data-a="qtab" data-t="active">진행 중 (${act.length + done.length})</button></div>` : ""}<div class="qlist">${body}</div>`, { cls: "wide", on: {
    qtab: (el) => { QT.tab = el.dataset.t; openQuests(board); },
    accept: (el) => { acceptQuest(save, el.dataset.id); snd("quest"); toast("퀘스트를 수락했습니다"); saveGame(); openQuests(board); },
    claim: (el) => { claimAndShow(el.dataset.id); openQuests(board); },
  } });
}
function claimAndShow(id) { const r = claimQuest(save, id); if (!r) return; snd("quest"); toast("퀘스트 보상을 받았습니다" + (r.item ? " · 장비 획득!" : ""), "ok"); saveGame(); refreshTop(); }
function openBoard() { QT.tab = availableQuests(save).length ? "avail" : "active"; openQuests(true); }

// ---------- 길드 ----------

// ---------- 설정 ----------
function openSettings() {
  const sl = (k, n) => `<label class="setrow2">${n}<input type="range" min="0" max="1" step="0.05" value="${AU.vol[k]}" data-i="vol" data-k="${k}"></label>`;
  const inGame = G.screen !== "title"; const A = save ? save.auto : null;
  Modal.open(`<h2>설정</h2>${sl("master", "전체 볼륨")}${sl("bgm", "배경음악")}${sl("sfx", "효과음")}
   <label class="setrow2">음소거 <input type="checkbox" data-i="mute" ${AU.muted ? "checked" : ""}></label>
   ${A ? (() => { autoRules(save); const opt = (r, v, t) => `<option value="${v}" ${A.rules[r] === v ? "selected" : ""}>${t}</option>`; return `<h3>자동 반복 · 전투 후 장비 처리</h3><div class="dim">자동 반복이 끝난 전투마다 아래 규칙으로 가방을 정리합니다 (장비는 자동으로 착용하지 않습니다)</div>
   ${ITEM_RARITY.slice(0, 5).map((x, r) => `<label class="setrow2">${x.name} 장비 <select data-i="arule" data-r="${r}">${opt(r, "keep", "유지")}${opt(r, "sell", "판매")}${opt(r, "dis", "분해")}</select></label>`).join("")}
   <label class="setrow2">전투력이 오르는 장비(▲)는 처리하지 않음 <input type="checkbox" data-i="akeepup" ${A.keepUp ? "checked" : ""}></label><div class="dim">고유·잠금·프리셋·착용 중 장비는 항상 유지됩니다</div>`; })() : ""}
   <div class="pbtns"><button class="btn" data-a="srvlg" ${SRV.on ? "disabled" : ""}>${SRV.on ? "☁ 로그인됨 (" + SRV.name + ")" : "☁ 서버 로그인"}</button>${SRV.on ? `<button class="btn warn" data-a="srvout">로그아웃</button>` : ""}<button class="btn" data-a="recs">기록</button></div>${inGame ? `<div class="pbtns"><button class="btn" data-a="totitle">타이틀로</button><button class="btn warn" data-a="wipe">데이터 초기화</button></div>` : ""}`, { cls: "sm", on: {
    vol: (el) => { AU.setVol(el.dataset.k, +el.value); if (save) { save.set[el.dataset.k] = +el.value; saveGame(); } }, mute: (el) => AU.setMuted(el.checked),
    arule: (el) => { autoRules(save).rules[+el.dataset.r] = el.value; saveGame(); }, akeepup: (el) => { save.auto.keepUp = el.checked; saveGame(); },
    srvlg: () => loginDialog(() => {}), srvout: () => { srvLogout(); toast("로그아웃했습니다 (세이브는 이 기기에 남아 있습니다)"); openSettings(); }, recs: () => openRecords(), totitle: () => { Modal.close(); saveGame(); openTitle(); },
    wipe: () => askConfirm("저장된 모든 데이터를 삭제할까요?<br>되돌릴 수 없습니다.", "삭제", () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} save = null; G.battle = null; G.pending = null; openTitle(); }),
  } });
}

// ---------- 전투 ----------
function bgmFor(node) { return { boss: "boss", rift: "rift", hell: "hell", endless: "endless", void: "void", tutorial: "tutorial" }[node.kind] || "battle" + Math.min(10, node.act); }
function startBattle(node, opt) {
  opt = opt || {}; G.pending = null; Modal.close(true); const b = createBattle(save, node); b.total = b.plan.length; G.battle = b; G.node = node; G.retry = opt; G.speed = G.speed || 1; G.paused = false;
  showScreen("battle"); battleHudBuild(b); AU.bgm(bgmFor(node));
  if (opt.tip) tipBox(opt.title, opt.tip);
}
function tipBox(title, text) { G.paused = true; G.tipOpen = true; const t = $("#tip"); t.classList.remove("hidden"); t.innerHTML = `<b>${title}</b><p>${text}</p><button class="btn pri" data-t="tipok">시작</button>`; }
function battleHudBuild(b) {
  $("#bh-name").textContent = b.node.name || "전투"; $("#pf-ico").src = iconURL("helm", 3); $("#pf-lv").textContent = save.level; G.hpGhost = 1; G.bossGhost = 1;
  $("#skillbar").innerHTML = b.skills.map((sk, i) => sk ? `<div class="bslot" data-i="${i}" title="클릭: 타겟 규칙 변경">${skIcon(sk.id, 3)}<div class="cdm"></div><span class="rl"></span><span class="kn">${i + 1}</span><span class="mc"></span><span class="cds"></span></div>` : `<div class="bslot off"><span class="kn">${i + 1}</span>${i >= save.slots ? "🔒" : ""}</div>`).join("");
  $$("#skillbar .bslot[data-i]").forEach((el) => el.addEventListener("click", () => { const i = +el.dataset.i, sk = G.battle.skills[i]; if (!sk) return; const n = RULE_ORDER[(RULE_ORDER.indexOf(sk.rule) + 1) % RULE_ORDER.length]; sk.rule = n; if (save.loadout[i]) save.loadout[i].rule = n; snd("click"); toast(`${SKILLS.find((d) => d.id === sk.id).name}: ${RULES[n]}`); }));
  $("#b-speed").textContent = "×" + G.speed; updateAutoBtn();
  const canAuto = ["stage", "boss", "elite", "treasure", "rift", "hell", "trial"].includes(b.node.kind); $("#b-auto").style.display = canAuto ? "" : "none";
}
function updateAutoBtn() { const on = save && save.auto.on; $("#b-auto").textContent = on ? "자동 ON" : "자동 OFF"; $("#b-auto").classList.toggle("pri", !!on); }
function battleHud(b) {
  const hp = Math.max(0, b.hp / b.maxHp), dt = Math.min(0.1, G.dt || 0.016);
  G.hpGhost = hp >= G.hpGhost ? hp : Math.max(hp, G.hpGhost - dt * 0.45); $("#hp-fill").style.width = hp * 100 + "%"; $("#hp-ghost").style.width = G.hpGhost * 100 + "%"; $("#hp-txt").textContent = `${fmtN(Math.max(0, b.hp))} / ${fmtN(b.maxHp)}`;
  $("#mp-fill").style.width = Math.max(0, b.mana / b.maxMana) * 100 + "%"; $("#mp-txt").textContent = `${fmtN(Math.max(0, b.mana))} / ${fmtN(b.maxMana)}`;
  const left = b.plan.length + b.enemies.filter((e) => !e.dead).length;
  if (b.endless) { $("#wave-fill").style.width = Math.min(100, (b.time / 1200) * 100) + "%"; $("#wave-txt").textContent = `생존 ${fmtTime(b.time * 1000)} · 웨이브 ${Math.floor(b.time / 30) + 1} · 처치 ${b.kills}`; }
  else { $("#wave-fill").style.width = Math.max(0, 100 - (left / Math.max(1, b.total)) * 100) + "%"; $("#wave-txt").textContent = `남은 적 ${left}${b.keys ? ` · 열쇠 ${b.keys}` : ""}`; }
  b.skills.forEach((sk, i) => { if (!sk) return; const el = $$("#skillbar .bslot")[i]; if (!el) return; el.querySelector(".cdm").style.height = Math.max(0, Math.min(1, sk.cdLeft / sk.cd)) * 100 + "%"; el.querySelector(".rl").textContent = RULE_SHORT[sk.rule]; { const cost = (sk.mana || 0) * b.stats.manaCostMul, mc = el.querySelector(".mc"); mc.textContent = cost >= 1 ? Math.round(cost) : ""; mc.style.display = cost >= 1 ? "" : "none"; mc.classList.toggle("lack", b.mana < cost); el.querySelector(".cds").textContent = sk.cdLeft > 0.05 ? (sk.cdLeft >= 10 ? Math.ceil(sk.cdLeft) : sk.cdLeft.toFixed(1)) : ""; } const lack = b.mana < (sk.mana || 0) * b.stats.manaCostMul; el.classList.toggle("rdy", sk.cdLeft <= 0 && !lack); el.classList.toggle("nomp", lack); });
  const bo = b.bossRef && !b.bossRef.dead ? b.bossRef : null; $("#bossbar").classList.toggle("hidden", !bo); if (bo) { const r = Math.max(0, bo.hp / bo.maxHp); G.bossGhost = r >= G.bossGhost ? r : Math.max(r, G.bossGhost - dt * 0.35); $("#boss-name").textContent = bo.def.name; $("#boss-pct").textContent = Math.ceil(r * 100) + "%"; $("#boss-fill").style.width = r * 100 + "%"; $("#boss-ghost").style.width = G.bossGhost * 100 + "%"; $("#boss-fill").className = bo.shield ? "sh" : ""; }
  const bn = $("#banner"); if (b.banner) { bn.textContent = b.banner.text; bn.className = "show " + (b.banner.cls || ""); } else bn.className = "";
  const bf = []; if (b.buffs.cry) bf.push("함성"); if (b.inv > 0) bf.push("무적"); for (const k in b.debuffs) bf.push({ slow: "속박", freeze: "빙결", curse: "저주", poison: "중독" }[k] || k); $("#status").textContent = bf.join(" · ");
}
function finishFlow(b) {
  const node = G.node, pre = { level: save.level, exp: save.exp, need: expNeed(save.level) }, res = finishBattle(save, b); res.pre = pre; AU.stopBgm(); snd(res.win ? "win" : "lose");
  if (node.kind === "tutorial" && b.win) save.tut.step = Math.min(TUTORIAL.length, node.step + 1);
  saveGame();
  const uniq = res.items.filter((i) => i.uniq);
  const next = () => afterBattle(res, b);
  b.resultAt = (save.auto.on && res.win ? 0.9 : endWin(b) && (node.kind === "boss" || node.kind === "void") ? 2.2 : 1.8);   // 종료 연출이 끝난 뒤 결과창
  b.next = () => { if (uniq.length && !document.hidden) showUniqueFx(uniq, next); else next(); };
}
function afterBattle(res, b) {
  const node = G.node, A = save.auto;
  if (A.on && res.win && ["stage", "boss", "elite", "treasure", "rift", "hell", "trial"].includes(node.kind)) {   // 자동 반복
    let note = ""; const pr = autoProcess(save);
    if (pr.sold) note += ` · ${pr.sold}개 판매`; if (pr.dis) note += ` · ${pr.dis}개 분해`;
    saveGame(); refreshTop();
    toast(`승리! 처치 ${res.kills} · +${fmtN(res.gold)}G${res.items.length ? ` · 장비 ${res.items.length}` : ""}${note}`, "ok");
    if (save.inv.length >= CFG.INV_MAX - 3) { A.on = false; toast("가방이 가득 차서 자동 반복을 멈췄습니다", "bad"); showResult(res, b); return; }
    if (res.levelUps) toast(`레벨 업! Lv.${save.level}`, "ok");
    const go = () => { if (G.screen === "battle" && save.auto.on && $("#modal").classList.contains("hidden")) startBattle(node, G.retry); };
    if (document.hidden) go(); else setTimeout(go, 1400);   // 백그라운드에서는 바로 다음 전투
    return;
  }
  if (A.on && !res.win) { A.on = false; saveGame(); }
  showResult(res, b);
}
function showResult(res, b, replay) {
  G.pending = [res, b];
  const node = G.node, tut = node.kind === "tutorial", endless = node.kind === "endless", win = res.win;
  if (!replay && !res.uniques && res.items.some((i) => i.rarity >= 3)) snd("legend");
  const nextTut = tut && win && node.step < TUTORIAL.length - 1;
  const back = () => { if (tut && !save.tut.done) { startTutorial(); return; } if (tut) { G.townAct = 1; G.guide = "map"; openTown(1); return; } G.retry.back ? G.retry.back() : openMap(node.act); };
  const canRetry = !tut && !endless && node.kind !== "void";
  Modal.open(resultHtml(res, b, node, tut, endless, nextTut, canRetry, !!replay), { cls: "result", persistent: true, noClose: true, on: {
    ok: () => { G.pending = null; Modal.close(true); back(); }, retry: () => { G.pending = null; Modal.close(true); startBattle(node, G.retry); },
    inv: () => { IB.mode = "inv"; IB.sel = null; renderItems(); },
  } });
  if (!replay) animateResult(res);
  refreshTop();
}
function retreat() {
  if (!G.battle || G.battle.over) return; const wasPaused = G.paused; G.paused = true;
  Modal.open(`<h2>전투 중단</h2><p class="center">퇴각하면 보상을 받지 못합니다.${G.node.kind === "endless" ? "<br>(무한 균열 입장 횟수는 돌아오지 않습니다)" : ""}</p><div class="pbtns"><button class="btn warn" data-a="yes">퇴각</button><button class="btn pri" data-a="no">계속 싸운다</button></div>`, { cls: "sm", persistent: true, noClose: true, on: {
    yes: () => { Modal.close(true); AU.stopBgm(); save.auto.on = false; const r = G.retry; G.battle = null; if (G.node.kind === "tutorial") { openTitle(); } else r.back ? r.back() : openMap(G.node.act); },
    no: () => { Modal.close(true); G.paused = wasPaused || G.tipOpen; },
  } });
}
