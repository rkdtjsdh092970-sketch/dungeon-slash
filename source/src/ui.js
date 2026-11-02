// =========================================================
// UI: 모달 / HUD / 화면 전환
// =========================================================
const G = { trialTier: 1, screen: "boot", battle: null, node: null, speed: 1, paused: false, retry: null, townAct: 1, after: null, riftTier: 1, tipOpen: false, guide: null, wslot: -1 };
const snd = (n) => AU.sfx(n);
const itemIconKey = (it) => (it.slot === "weapon" && it.wt ? "w_" + it.wt : it.slot);   // 무기는 종류(검·지팡이·낫·마도서)마다 모양이 다르다
const ITEM_ICON = (it) => (it.uniq && UNIQUE_BY_ID[it.uniq] ? uniqueIconImg(it.uniq, 2) : iconImg(itemIconKey(it), 2));
const RCLS = (it) => (it.sat ? "rsat" : ITEM_RARITY[it.rarity].cls);
const setOf = (it) => (it.setId ? SETS.find((s) => s.id === it.setId) : null);
const itemColor = (it) => (it.setId ? setOf(it).color : null);
const skillTitle = (inst) => { const d = SKILLS.find((x) => x.id === inst.id); return `<span class="${SKILL_RARITY[inst.rarity].cls}">${d.slot === "passive" ? "" : SKILL_RARITY[inst.rarity].name + " "}${d.name}</span>`; };
const skIcon = (id, sc) => skillImg(SKILLS.find((x) => x.id === id), sc || 2);
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
    if (typeof grpBar === "function" && G.grp && (!G.grp.h2 || G.grp.h2 === (box.querySelector("h2") || {}).textContent)) setTimeout(grpBar, 0);
    if (!this.was) snd("open"); this.was = true;
  },
  scrollSnap(box) { const list = []; box.querySelectorAll("*").forEach((el) => { if (el.scrollTop > 0) { const sib = [...box.querySelectorAll(el.tagName + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""))]; list.push({ tag: el.tagName, cls: el.className, i: sib.indexOf(el), top: el.scrollTop }); } }); const h = box.querySelector("h2"); return { h2: h ? h.textContent : "", list }; },
  scrollRestore(box, list) { for (const it of list) { const sel = it.tag + (it.cls && typeof it.cls === "string" ? "." + it.cls.trim().split(/\s+/).join(".") : ""); const el = box.querySelectorAll(sel)[it.i]; if (el) el.scrollTop = it.top; } },
  isOpen() { return !$("#modal").classList.contains("hidden"); },
  close(silent) { if ($("#modal").classList.contains("hidden")) return; G.grp = null; $("#modal").classList.add("hidden"); this.was = false; if (!silent) snd("close"); const f = this.onClose; this.onClose = null; if (f) f(); },
};
function askConfirm(msg, yes, cb, danger, no) {
  Modal.open(`<h2>확인</h2><p class="center">${msg}</p><div class="pbtns"><button class="btn ${danger === false ? "pri" : "warn"}" data-a="cyes">${yes || "확인"}</button><button class="btn" data-a="cno">취소</button></div>`, { cls: "sm", on: { cyes: () => { Modal.close(true); cb(); }, cno: () => { if (no) { Modal.close(true); no(); } else Modal.close(); } } });
}
function initModal() {
  const box = $("#mbox");
  const h = (ev) => { if (ev.target.closest("select,input")) return; const el = ev.target.closest("[data-a]"); if (!el || el.disabled) return; const a = el.dataset.a; if (a === "__close") return Modal.close(); const f = Modal.on[a]; if (f) { snd("click"); f(el, ev); } };
  box.addEventListener("click", h); box.addEventListener("input", (ev) => { const el = ev.target.closest("[data-i]"); if (el && Modal.on[el.dataset.i]) Modal.on[el.dataset.i](el, ev); });
  // 창 바깥(어두운 배경)을 눌러도 닫히지 않는다 — ✕ 버튼이나 취소 · 닫기 버튼으로만 닫는다
}

// ---------- 상단 바 (맵 / 마을) ----------
let _pwCache = 0;
function curPower() {   // 현재 전투력 (전투 중에는 마지막 계산값을 쓴다)
  if (!save) return 0; if (G.screen === "battle" && _pwCache) return _pwCache;
  try { _pwCache = powerScore5(save); } catch (e) {} return _pwCache;   // 5.0: 로블록스판 전투력 (균열 1층 권장 = 100, 몬스터 강함에 정비례)
}
function refreshTop() {
  const s = save; $("#t-lv").textContent = "Lv " + s.level; { const pw = curPower(); $("#t-pow").textContent = fmtPow(pw); $("#t-pow-w").style.display = s.tut && s.tut.done ? "" : "none"; }
  $("#t-exp").style.width = (s.level >= CFG.LEVEL_CAP ? 100 : Math.min(100, (s.exp || 0) / expNeed(s.level) * 100)) + "%";   // 5.0: 막대 = 경험치
  $("#t-gold").textContent = fmtN(s.gold); $("#t-ore").textContent = fmtN(s.ore); $("#t-shard").textContent = fmtN(s.hone);
  { const st = computeStats(save); $("#h5hp").textContent = fmtN(st.maxHp); $("#h5atk").textContent = fmtN(st.atk); $("#h5mag").textContent = fmtN(st.mag); $("#h5def").textContent = fmtN(st.def); $("#h5crit").textContent = Math.round((st.critChance || 0) * 100) + "%";
    $("#h5prog").textContent = `균열 ${(s.rift && s.rift.best) || 0} · 탑 ${(s.spire && s.spire.best) || 0}`; const f = $("#h5face"), u = artURL(s.equipped.weapon && s.equipped.weapon.wt === "staff" ? "mage" : "warrior"); if (u && f.getAttribute("src") !== u) f.src = u;
    const m = $("#b-map"), toMap = G.screen !== "map"; m.querySelector("b").textContent = toMap ? "지도" : "마을"; const iu = artURL(toMap ? "m_map" : "m_town"); if (iu && m.querySelector("img").getAttribute("src") !== iu) m.querySelector("img").src = iu;
    if (window.theme5Put) theme5Put(); }
  $("#t-orb").textContent = fmtN(s.orbC); $("#t-orb-w").style.display = s.orbC || s.endgame ? "" : "none";
  $("#b-quest .dot").style.display = q5Ready(s) || dailyReady5(s) ? "" : "none";
  $("#b-inv .upm").style.display = hasAnyUpgrade(s) ? "" : "none";
  { const D = dailyState(s); const claimable = DAILY_TASKS.some((t) => (!t.endgame || s.endgame) && !D.claimed[t.id] && (D[t.key] || 0) >= t.n); const dd = $("#b-daily .dot"); if (dd) dd.style.display = claimable ? "" : "none"; }
  const pp = passivePoints(s) - passiveSpent(s); $("#b-pass .dot").style.display = pp > 0 ? "" : "none";
  updateWorld(); if (typeof srvMark === "function") srvMark();
}
function showScreen(name) {
  G.screen = name; document.body.dataset.screen = name;
  for (const id of ["title", "top", "battlehud", "mappanel", "townbar"]) $("#" + id).classList.toggle("hidden", !({ title: ["title"], map: ["top", "mappanel"], town: ["top", "townbar"], battle: ["battlehud"] }[name] || []).includes(id));
  if (save && (name === "town" || name === "map")) refreshTop();
  const bgm = { title: "title", map: "town", town: "town" }[name]; if (bgm) AU.bgm(bgm);
  if (name !== "town" && name !== "map") setGuide(null);
  if (name !== "battle") { G.battle = null; if (save) refreshTop(); }
}

// ---------- 타이틀 ----------
function openTitle() {
  showScreen("title"); const has = !!loadGame();
  $("#title").innerHTML = `<div class="logo"><div class="l1">DUNGEON</div><div class="l2">SLASH</div><div class="l3">자동 전투 핵 앤 슬래시</div></div>
  <div class="tbtns"><button class="btn big" data-t="new">새로 시작</button><button class="btn big" data-t="cont" ${has ? "" : "disabled"}>이어하기</button><button class="btn" data-t="login" ${SRV.on ? "disabled" : ""}>${SRV.on ? "☁ 로그인됨 (" + SRV.name + ")" : "☁ 서버 로그인"}</button><button class="btn" data-t="opt">소리 설정</button></div><div class="tfoot">클릭하면 소리가 켜집니다</div>`;
}
function startNew() { save = newSave(); saveGame(); G.townAct = 1; G.guide = null; openClassPick(); }
// 5.0 (로블록스판과 같게): 시작 직업 고르기 — 전사(검 · 일격 · 찢기 · 강타) / 마법사(지팡이 · 비전 탄 · 비전 미사일 · 비전 폭발)
function openClassPick() {
  const card = (cls, name, col, d1, d2, sk) => `<div class="cpick" data-a="pick" data-c="${cls}"><img src="${artURL(cls) || ""}" alt=""><b style="color:${col}">${name}</b><div class="dim">${d1}</div><div class="dim">${d2}</div><div style="color:#ffd98a;font-size:12px">${sk}</div></div>`;
  Modal.open(`<h2>길을 고르세요</h2><div class="dim center">첫 무기와 스킬 3개가 정해집니다. 나중에 무기를 바꾸면 길도 바꿀 수 있어요.</div>
    <div class="cpicks">${card("warrior", "전사", "#ff8a6a", "검을 쓰는 근접 전사", "튼튼한 체력과 강한 물리 공격", "스킬: 일격 · 찢기(범위) · 강타")}${card("mage", "마법사", "#a89aff", "지팡이를 쓰는 마법사", "멀리서 꾸준한 비전 마법", "스킬: 비전 탄 · 비전 미사일 · 비전 폭발")}</div>`, { cls: "wide", noClose: true, on: {
    pick: (el) => { pickStart(save, el.dataset.c); save.tut.done = true; save.tut5 = 0; save.seen.guide = true; saveGame(); Modal.close(true); G.townAct = 1; G.guide = null; openTown(1); setTimeout(tutWelcome, 300); },
  } });
}
function continueGame() {
  const s = loadGame(); if (!s) return; save = s; if (save.skComp) { const c = save.skComp; delete save.skComp; setTimeout(() => toast(`스킬 개편 보상: 아르카나 조각 ${fmtN(c)}개! 마을의 [스킬 소환]에서 쓰세요`, "ok"), 800); } AU.vol = Object.assign(AU.vol, save.set); AU.applyVol();
  if (save.passReset) { delete save.passReset; setTimeout(() => toast("패시브 트리가 개편되어 찍어 둔 포인트가 모두 환급되었습니다. 훈련소에서 다시 찍어 주세요", "ok"), 800); }
  if (save.needStart) { openClassPick(); return; }
  if (!save.tut.done) { save.tut.done = true; save.slots = Math.max(save.slots || 1, 4); }   // 5.0: 튜토리얼 전투 대신 바로 마을 (스킬 칸 4칸)
  { G.townAct = Math.max(1, maxActUnlocked(save)); G.guide = save.seen.guide ? null : "map"; openTown(G.townAct); checkOffline(); }
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
  const r = seeded(tier * 131 + 7), n = tier < 10 ? 0 : tier < 30 ? 1 : tier < 60 ? 2 : 3, pool = RIFT_MODS.slice(), out = [];   // v4: 변이는 10층부터 · 층이 높을수록 개수가 늘어난다
  for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out;
}
const isHell = () => false;   // 5.08: 지옥 스테이지 폐지 (로블록스판에 없음)
function nodeToBattle(n) {
  if (n.kind === "trial") return { kind: "trial", act: 11, tier: G.trialTier, mods: riftMods(G.trialTier), name: `스킬 시련 ${G.trialTier}단계`, level: 100 };
  if (n.kind === "rift") return { kind: "rift", act: riftRegion(G.riftTier), tier: G.riftTier, mods: riftMods(G.riftTier), name: `심연의 균열 ${G.riftTier}단계`, level: 100 };
  if (n.kind === "raid") return { kind: "raid", act: 10, tier: CFG.RAID.TIER, name: "심연의 문지기 모르가스", id: "raid", firstClear: !(save.raid && save.raid.cleared > 0), level: 100 };
  if (n.kind === "endless") return { kind: "endless", act: 10, tier: Math.max(1, save.rift.best - 2), name: "무한 균열", level: 100 };
  if (n.kind === "void" && n.upper) { const S = G.upVoidStage || 1; return { kind: "void", act: 10, tier: UP_TIERS[S - 1], vsel: S, upper: 1, name: `상위 공허의 군주 ${S}단계`, level: 100 }; }
  if (n.kind === "void") return { kind: "void", act: 10, tier: GATE_TIERS[(G.voidStage || 1) - 1], vsel: G.voidStage || 1, name: `공허의 군주 ${G.voidStage || 1}단계`, level: 100 };
  if (n.kind === "craid") { const d = n.sub === "charm" ? 5 : n.sub === "warden" ? 4 : Math.max(1, Math.min(craidOpen(save), G.craidDiff || 1)); if (d === 5) return { kind: "craid", act: 10, diff: 3, charm: 1, tier: CFG.CRAID.TIERS[3], name: "참 던전", level: 100 }; if (d === 4) return { kind: "warden", act: 10, diff: 4, tier: CFG.WARDEN.TIER, name: CFG.WARDEN.NAME, level: 100 }; return { kind: "craid", act: 10, diff: d, tier: CFG.CRAID.TIERS[d], name: `레이드 던전 ${CFG.CRAID.NAMES[d]}`, level: 100 }; }
  if (n.kind === "tower2") { const P = save.spire2 || { best: 0 }, f = Math.max(1, Math.min(CFG.SPIRE.END2, Math.min(P.best + 1, G.spire2Floor || P.best + 1))); return { kind: "spire", tw: 2, act: 10, floor: f, tier: spireTier(f, 2), first: f > P.best, name: `심층 첨탑 ${f}층`, level: 100 }; }
  if (n.kind === "tower") { const P = save.spire || { best: 0 }, f = Math.max(1, Math.min(CFG.SPIRE.END, Math.min(P.best + 1, G.spireFloor || P.best + 1))); return { kind: "spire", act: 10, floor: f, tier: spireTier(f), first: f > P.best, name: `솟아난 탑 ${f}층`, level: 100 }; }
  if (n.kind === "temple") { const st = Math.max(1, Math.min(templeOpen(save), G.templeStage || 1)); return { kind: "temple", act: 11, tier: CFG.TEMPLE.TIERS[st - 1], vsel: st, name: `돌의 신전 ${st}단계`, level: 100 }; }
  if (n.kind === "vault") return { kind: "vault", act: 10, tier: Math.max(1, Math.floor(save.rift.best * CFG.VAULT_TIER_K)), name: "황금 보물고", level: 100 };
  if (isEB(n.kind) && n.upper) { const E = EB[n.kind], S = G["up_" + E.stage] || 1; return { kind: n.kind, act: 10, tier: UP_TIERS[S - 1], vsel: S, upper: 1, name: `상위 ${E.name} ${S}단계`, level: 100 }; }
  if (isEB(n.kind)) { const E = EB[n.kind], S = G[E.stage] || 1; return { kind: n.kind, act: 10, tier: E.tiers[S - 1], vsel: S, name: `${E.name} ${S}단계`, level: 100 }; }
  if (isHell(n)) return { kind: "hell", act: n.act, stage: 4, tier: Math.max(1, save.rift.best), name: `지옥 · ${n.name}`, level: 100, nodeId: n.id };
  if (n.kind === "elite" || n.kind === "treasure") return Object.assign({}, n, { stage: n.need + (n.kind === "elite" ? 1 : 3) });
  return n;
}
function recLineHtml(rec) { if (!rec) return ""; const my = curPower(), ok = my >= rec; return `<div class="pline">권장 전투력 <b style="color:#ffe08a">${fmtN(rec)}</b> · 내 전투력 <b style="color:${ok ? "#8dff9a" : "#ff8a6a"}">${fmtN(my)}</b></div>`; }
// 문지기를 쓰러뜨린 뒤: 어두운 화면에서 지도가 밝아지고, 심연의 균열이 보이다가 먼 곳에서 탑이 진동과 함께 솟아오른다
function raidAftermath() {
  const R = (save.raid = save.raid || { cleared: 0, best: 0 }), first = !R.tower;
  openMap(11); const gate = MAP.byId.RX; MapView.sel = null; mapPanel();
  MapView.cam.x = clamp(RIFT_POS[0] - CW / 2 - 40, 0, MAP_W - CW); MapView.cam.y = clamp(RIFT_POS[1] - CH / 2, 0, MAP_H - CH);
  if (first) { R.tower = 1; saveGame(); MapView.cine = { t0: null, fx: MapView.cam.x, fy: MapView.cam.y, tx: clamp(TOWER_POS[0] - CW / 2 - 60, 0, MAP_W - CW), ty: clamp(TOWER_POS[1] - CH / 2 - 60, 0, MAP_H - CH) }; }
  else MapView.sel = gate, mapPanel();
}
function mapGo() {
  const n = MapView.sel; if (!n || !nodeUnlocked(save, n)) return;
  if (n.kind === "bosshub") return openBossHub(null, false);
  if (n.kind === "bosshub2") return openBossHub(null, true);
  if (n.kind === "temple") return openTemple();
  if (n.kind === "craid") return openCRaid(n.sub);
  if (n.kind === "tower") return openSpire(1);
  if (n.kind === "tower2") return openSpire(2);
  if (n.kind === "town") return openTown(n.act);
  if (n.kind === "endless") { const E = endlessInfo(save); if (E.left < 1) return; save.endless.used++; saveGame(); }
  if (isEB(n.kind)) { const E = EB[n.kind]; if ((save[E.key] || 0) < 1 || save.rift.best < E.need[(G[E.stage] || 1) - 1]) return; save[E.key]--; saveGame(); }
  if (n.kind === "void") { if (save.keys < 1 || save.rift.best < VOID_NEED[(G.voidStage || 1) - 1]) return; save.keys--; saveGame(); }
  let tip = null, title = null;
  if (G.guide === "stage" && n.id === "S1-1") { G.guide = null; save.seen.guide = true; MapView.pulse = null; setGuide(null); title = "첫 모험 · 초원 1"; tip = "스킬은 쿨타임마다 자동 발동합니다. 적을 클릭하면 그 적을 우선 공격해요.<br>전투가 끝나면 장비가 떨어지고, 장비 창에 <b style='color:#5dff7a'>▲</b> 가 뜨면 더 강한 장비입니다. <b>[추천 장비 착용]</b>으로 한 번에 갈아입으세요!"; }
  if (tip && n.id === "S1-1") { tip += "<br><br>" + STAGE_TIPS[0][1]; save.seen.tip1 = 1; }
  if (!tip && (n.kind === "stage" || n.kind === "boss") && n.act === 1 && STAGE_TIPS[n.stage - 1] && !(save.seen["tip" + n.stage])) { save.seen["tip" + n.stage] = 1; title = STAGE_TIPS[n.stage - 1][0]; tip = STAGE_TIPS[n.stage - 1][1]; }
  startBattle(nodeToBattle(n), { tip, title, back: () => { openMap(Math.min(10, n.act)); MapView.sel = n; mapPanel(); } });
}

// ---------- 마을 ----------
function openTown(act) {
  if (typeof mailPoll === "function") mailPoll();
  G.townAct = act; TownView.act = act; showScreen("town"); if (typeof notesUnread === "function" && notesUnread() && save.tut.done && !G.notesToasted) setTimeout(() => !Modal.isOpen() && (G.notesToasted = 1) && toast("📜 새 패치 노트가 있습니다 — 마을의 '업데이트 게시판'"), 600); $("#townbar .tname").textContent = `${ACTS[act - 1].name} 마을`;
  if (G.guide === "map") { setGuide("마을에서는 스킬·제련소·퀘스트·상점을 이용할 수 있어요.<br>이제 위쪽의 <b>🗺 지도</b> 버튼을 눌러 첫 스테이지로 가봅시다!"); $("#b-map").classList.add("pulse"); }
  else { setGuide(null); $("#b-map").classList.remove("pulse"); }
}
function townClick(s) {
  if (s && s.box) { snd("click"); return openGroup(s, 0); }   // 5.0: 로블록스판 건물 (탭 묶음 창)
  if (!s) return;
  if (s.soon) return openSoon(s);
  if (G.townAct < s.need) { toast(`액트 ${s.need} 마을에서 개방됩니다`); snd("error"); return; }
  ({ skill: () => { SK.slot = 0; openSkills(); }, forge: () => openItems("forge"), board: openBoard, mail: openMail, shop: () => openItems("shop"), guild: openGuild, auction: openAuction, skillshop: openSummon, trainer: openPassives, notice: openNotes, dummy: openDummy, raid: openRaid })[s.id]();
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
const SLOT_HINT = ["", "튜토리얼 완료 시 개방", "스테이지 3 클리어 시 개방", "스테이지 5 보스 처치 시 개방"];
const promoteCost = (inst) => 25;   // 일반 → 희귀만 가능 (희귀 이상은 승급 불가, 드랍으로만)
const PROMO_RATE = 0.6;

// ---------- 퀘스트 ----------
const QT = { tab: "active" };
function questRow(d, st, mode) {
  const pr = st ? Math.min(d.goal.n, st.p) : 0; const r = d.reward, rw = [r.exp ? `경험치 ${r.exp}` : "", r.gold ? `${fmtN(r.gold)}G` : "", r.ore ? `강화석 ${r.ore}` : "", r.shards ? `조각 ${r.shards}` : "", r.item ? "희귀 장비" : ""].filter(Boolean).join(" · ");
  return `<div class="qrow ${d.main ? "main" : ""}"><div class="qi"><b>${d.main ? "[메인] " : ""}${d.title}</b><div class="dim">${d.desc}</div><small>보상: ${rw}</small>${st ? `<div class="bar"><i style="width:${(pr / d.goal.n) * 100}%"></i><span>${pr}/${d.goal.n}</span></div>` : ""}</div>
  ${mode === "accept" ? `<button class="btn pri" data-a="accept" data-id="${d.id}">수락</button>` : st && st.state === "done" ? `<button class="btn pri" data-a="claim" data-id="${d.id}">보상 받기</button>` : ""}</div>`;
}

// ---------- 길드 ----------

// ---------- 설정 ----------
// 5.0 설정 (로블록스판 openSettings: 탭 묶음 · 한 줄 = 제목 + 선택 버튼). 웹에만 있는 계정 · 데이터 탭은 남긴다
const SET5 = { tab: "graphics" };
function openSettings(tab) {
  if (tab) SET5.tab = tab; const T = SET5.tab, O = save ? (save.opt = save.opt || {}) : {}, inGame = G.screen !== "title" && !!save;
  const row = (title, btns) => `<div class="st5"><b>${title}</b><span>${btns.map((x) => x.value != null ? `<em style="width:${x.w || 70}px">${x.value}</em>` : `<button class="btn ${x.on ? "gold" : ""}" data-a="s5" data-k="${x.k}" style="width:${x.w || 96}px">${x.t}</button>`).join("")}</span></div>`;
  const pct = (v) => Math.round(v * 100) + "%", fl = O.hitflash != null ? O.hitflash : 1;
  let body = "";
  if (T === "graphics") body = row("피해 숫자", [{ t: "켬", on: O.dmg !== 0, k: "dmg:1" }, { t: "끔", on: O.dmg === 0, k: "dmg:0" }]) + row("타격 번쩍임", [{ t: "끔", on: fl === 0, k: "flash:0" }, { t: "약하게", on: fl === 0.5, k: "flash:0.5" }, { t: "보통", on: fl === 1, k: "flash:1" }]);
  else if (T === "auto" && save) { const A = autoRules(save);
    body = row("전투 후 자동 반복", [{ t: "끔", on: auto5() === 0, k: "auto:0" }, { t: "같은 단계", on: auto5() === 1, k: "auto:1" }, { t: "다음 단계", on: auto5() === 2, k: "auto:2" }])
      + row("장비 자동 분해", [{ t: "열기", k: "autodis", w: 110 }])
      + ["일반", "희귀", "전설"].map((nm, r) => row(`${nm} 아르카나`, [{ t: "유지", on: (A.srules[r] || "keep") === "keep", k: "sr" + r + ":keep" }, { t: "분해", on: A.srules[r] === "dis" || A.srules[r] === "sell", k: "sr" + r + ":dis" }])).join("")
      + row("아르카나마다 가장 좋은 한 장은 남기기", [{ t: "켬", on: !!A.sBest, k: "sbest:1" }, { t: "끔", on: !A.sBest, k: "sbest:0" }])
      + `<div class="st5 note">장비는 전투가 끝날 때마다 가방의 [자동 분해] 설정으로, 아르카나는 자동 반복 중에 위 규칙으로 정리됩니다. 장착 · 세트 · 룬 · 레벨이 오른 아르카나는 건드리지 않습니다.</div>`; }
  else if (T === "sound") { const v = (k, title) => row(title, [{ t: "−", k: "vol-" + k, w: 44 }, { value: pct(AU.vol[k]) }, { t: "+", k: "vol+" + k, w: 44 }]);
    body = v("master", "전체 볼륨") + v("bgm", "배경음악") + v("sfx", "효과음") + row("음소거", [{ t: "켬", on: AU.muted, k: "mute:1" }, { t: "끔", on: !AU.muted, k: "mute:0" }]); }
  else body = row("서버 계정", SRV.on ? [{ t: "☁ " + SRV.name, w: 150 }, { t: "로그아웃", k: "srvout" }] : [{ t: "☁ 서버 로그인", k: "srvlg", w: 150 }]) + row("기록", [{ t: "열기", k: "recs" }])
    + (inGame ? row("타이틀 화면으로", [{ t: "이동", k: "totitle" }]) + row("데이터 초기화 (되돌릴 수 없음)", [{ t: "초기화", k: "wipe" }]) : "");
  const tabs = [["graphics", "그래픽"], ["auto", "자동 전투"], ["sound", "소리"], ["data", "계정 · 데이터"]].filter(([k]) => k !== "auto" || save);
  Modal.open(`<h2>설정</h2><div class="grpbar">${tabs.map(([k, n]) => `<button class="tab ${T === k ? "on" : ""}" data-a="s5t" data-t="${k}">${n}</button>`).join("")}</div><div class="rl5w st5w">${body}</div>`, { cls: "wide", on: {
    s5t: (el) => openSettings(el.dataset.t),
    s5: (el) => { const k = el.dataset.k, [a, v] = k.split(":");
      if (a === "dmg") O.dmg = +v; else if (a === "flash") O.hitflash = +v; else if (a === "auto") setAuto5(+v); else if (a === "autodis") { IB.mode = "inv"; return openAutoDis(); }
      else if (a.startsWith("sr")) autoRules(save).srules[+a[2]] = v; else if (a === "sbest") autoRules(save).sBest = v === "1";
      else if (a.startsWith("vol")) { const kk = a.slice(4), nv = Math.max(0, Math.min(1, Math.round(AU.vol[kk] * 10 + (a[3] === "+" ? 1 : -1)) / 10)); AU.setVol(kk, nv); if (save) save.set[kk] = nv; }
      else if (a === "mute") AU.setMuted(v === "1"); else if (a === "srvlg") return loginDialog(() => openSettings()); else if (a === "srvout") { srvLogout(); toast("로그아웃했습니다 (세이브는 이 기기에 남아 있습니다)"); }
      else if (a === "recs") return openRecords(); else if (a === "totitle") { Modal.close(); saveGame(); return openTitle(); }
      else if (a === "wipe") return askConfirm("저장된 모든 데이터를 삭제할까요?<br>되돌릴 수 없습니다.", "삭제", () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} save = null; G.battle = null; G.pending = null; openTitle(); });
      if (save) saveGame(); snd("click"); openSettings(); },
  } });
}

// ---------- 전투 ----------
function bgmFor(node) { return { boss: "boss", raid: "void", rift: "rift", hell: "hell", endless: "endless", void: "void", hive: "hell", titan: "hell", storm: "hell", frost: "hell", poison: "hell", temple: "void", spire: "void", craid: "void", tutorial: "tutorial" }[node.kind] || "battle" + Math.min(10, node.act); }
// 자동 반복이 가능한 전투. 열쇠를 쓰는 보스(공허의 군주 · 속성 보스)는 반복할 때마다 열쇠 1개를 쓰고, 열쇠가 모자라면 멈춘다
const AUTO_KINDS = ["stage", "boss", "elite", "treasure", "rift", "hell", "trial", "vault", "temple", "spire", "craid", "void", "hive", "titan", "storm", "frost", "poison", "raid"];
function autoKeyInfo(node) { const k = node.kind === "void" ? "keys" : isEB(node.kind) ? EB[node.kind].key : null; return k ? { key: k, name: node.kind === "void" ? "공허의 열쇠" : EB[node.kind].keyName, have: save[k] || 0, cost: node.upper ? UP_KEYS : 1 } : null; }
function startBattle(node, opt) {
  if (typeof tutEvent === "function") tutEvent("battle");
  opt = opt || {}; G.pending = null; Modal.close(true); const b = createBattle(save, node); b.total = b.plan.length; G.battle = b; G.node = node; G.retry = opt; G.speed = G.speed || 1; G.paused = false;
  showScreen("battle"); battleHudBuild(b); AU.bgm(bgmFor(node));
  if (opt.tip) tipBox(opt.title, opt.tip);
}
function tipBox(title, text) { G.paused = true; G.tipOpen = true; const t = $("#tip"); t.classList.remove("hidden"); t.innerHTML = `<b>${title}</b><p>${text}</p><button class="btn pri" data-t="tipok">시작</button>`; }
function battleHudBuild(b) {
  if (!document.querySelector("#battlehud .h5L")) hud5Build();
  $("#bh-name").textContent = b.node.name || "전투"; $("#pf-ico").src = iconURL("helm", 3); $("#pf-lv").textContent = save.level; G.hpGhost = 1; G.bossGhost = 1;
  $("#skillbar").innerHTML = b.skills.map((sk, i) => sk ? `<div class="bslot" data-i="${i}" title="클릭: 타겟 규칙 변경">${skIcon(sk.id, 3)}<div class="cdm"></div><span class="rl"></span><span class="kn">${i + 1}</span><span class="mc"></span><span class="cds"></span></div>` : `<div class="bslot off"><span class="kn">${i + 1}</span>${i >= save.slots ? "🔒" : ""}</div>`).join("");
  $$("#skillbar .bslot[data-i]").forEach((el) => el.addEventListener("click", () => { const i = +el.dataset.i, sk = G.battle.skills[i]; if (!sk) return; const n = RULE_ORDER[(RULE_ORDER.indexOf(sk.rule) + 1) % RULE_ORDER.length]; sk.rule = n; if (save.loadout[i]) save.loadout[i].rule = n; snd("click"); toast(`${SKILLS.find((d) => d.id === sk.id).name}: ${RULES[n]}`); }));
  hud5Skills(b); { const isM = save.equipped.weapon && save.equipped.weapon.wt === "staff", u = artURL(isM ? "mage" : "warrior"); if (u) $("#pf-ico").src = u; }
  $("#b-speed").textContent = "×" + G.speed + " ▼"; updateAutoBtn(); $("#h5pause").classList.add("hidden");
  const canAuto = AUTO_KINDS.includes(b.node.kind); $("#b-auto").style.display = canAuto ? "" : "none";
}
function battleHud(b) {
  hud5Tick(b);
  const hp = Math.max(0, b.hp / b.maxHp), dt = Math.min(0.1, G.dt || 0.016);
  G.hpGhost = hp >= G.hpGhost ? hp : Math.max(hp, G.hpGhost - dt * 0.45); $("#hp-fill").style.width = hp * 100 + "%"; $("#hp-ghost").style.width = G.hpGhost * 100 + "%"; $("#hp-txt").textContent = `${fmtN(Math.max(0, b.hp))} / ${fmtN(b.maxHp)}`;
  $("#mp-fill").style.width = Math.max(0, b.mana / b.maxMana) * 100 + "%"; $("#mp-txt").textContent = `${fmtN(Math.max(0, b.mana))} / ${fmtN(b.maxMana)}`;
  const left = b.plan.length + b.enemies.filter((e) => !e.dead).length;
  if (b.raid) { const R = b.bossRef && b.bossRef.raid, ph = R ? Math.min(4, R.idx + 1) : 1, lim = CFG.RAID.LIMIT; $("#wave-fill").style.width = Math.min(100, (b.time / lim) * 100) + "%"; $("#wave-txt").textContent = `${R && R.sealed ? "결계 · 결계석을 부숴라!" : `${ph}단계`} · 남은 ${Math.max(0, Math.ceil(lim - b.time))}초`; }
  else if (b.dummy) { $("#wave-fill").style.width = Math.min(100, (b.time / DUMMY_SEC) * 100) + "%"; $("#wave-txt").textContent = `${Math.max(0, Math.ceil(DUMMY_SEC - b.time))}초 · 누적 ${fmtN(b.dealt)} · DPS ${fmtN(b.dealt / Math.max(1, b.time))}`; }
  else if (b.endless) { $("#wave-fill").style.width = Math.min(100, (b.time / 1200) * 100) + "%"; { const dd = b.ddt || 0; $("#wave-txt").textContent = `생존 ${fmtTime(b.time * 1000)} · 위험도 ${Math.floor(dd / 30) + 1} (×${(dd / Math.max(1, b.time)).toFixed(2)}) · 처치 ${b.kills}`; } }
  else { $("#wave-fill").style.width = Math.max(0, 100 - (left / Math.max(1, b.total)) * 100) + "%"; $("#wave-txt").textContent = `남은 적 ${left}${b.keys ? ` · 열쇠 ${b.keys}` : ""}${b.keys2 ? ` · 불씨 ${b.keys2}` : ""}${b.keys3 ? ` · 징표 ${b.keys3}` : ""}${b.keys4 ? ` · 뇌전 ${b.keys4}` : ""}${b.keys5 ? ` · 서리 ${b.keys5}` : ""}${b.keys6 ? ` · 맹독 ${b.keys6}` : ""}`; }
  b.skills.forEach((sk, i) => { if (!sk) return; const el = $$("#skillbar .bslot")[i]; if (!el) return; el.querySelector(".cdm").style.height = Math.max(0, Math.min(1, sk.cdLeft / sk.cd)) * 100 + "%"; el.querySelector(".rl").textContent = RULE_SHORT[sk.rule]; { const cost = (sk.mana || 0) * b.stats.manaCostMul, mc = el.querySelector(".mc"); mc.textContent = cost >= 1 ? Math.round(cost) : ""; mc.style.display = cost >= 1 ? "" : "none"; mc.classList.toggle("lack", b.mana < cost); el.querySelector(".cds").textContent = sk.cdLeft > 0.05 ? (sk.cdLeft >= 10 ? Math.ceil(sk.cdLeft) : sk.cdLeft.toFixed(1)) : ""; } const lack = b.mana < (sk.mana || 0) * b.stats.manaCostMul; el.classList.toggle("rdy", sk.cdLeft <= 0 && !lack); el.classList.toggle("nomp", lack); });
  const bo = b.bossRef && !b.bossRef.dead ? b.bossRef : null; $("#bossbar").classList.toggle("hidden", !bo); if (bo) { const r = Math.max(0, bo.hp / bo.maxHp); G.bossGhost = r >= G.bossGhost ? r : Math.max(r, G.bossGhost - dt * 0.35); $("#boss-name").textContent = (bo.label || bo.def.name) + (bo.guard ? " · 무적 (정령을 처치하라)" : ""); $("#boss-pct").textContent = Math.ceil(r * 100) + "%"; $("#boss-fill").style.width = r * 100 + "%"; $("#boss-ghost").style.width = G.bossGhost * 100 + "%"; $("#boss-fill").className = bo.shield || bo.guard ? "sh" : ""; }
  const bn = $("#banner"); if (b.banner) { bn.textContent = b.banner.text; bn.className = "show " + (b.banner.cls || ""); } else bn.className = "";
  const bf = []; if (b.buffs.cry) bf.push("함성"); if (b.inv > 0) bf.push("무적"); for (const k in b.debuffs) bf.push({ slow: "속박", freeze: "빙결", curse: "저주", poison: "중독", wound: "작열 낙인(회복 반감)" }[k] || k); $("#status").textContent = bf.join(" · ");
}
function finishFlow(b) {
  if (b.dummy) { const res = finishDummy(save, b); AU.stopBgm(); snd("win"); saveGame(); b.resultAt = 1.2; b.next = () => showDummyResult(res, b); return; }
  const node = G.node, pre = { level: save.level, exp: save.exp, need: expNeed(save.level) }, res = finishBattle(save, b); res.pre = pre; AU.stopBgm(); snd(res.win ? "win" : "lose");
  if (node.kind === "tutorial" && b.win) save.tut.step = Math.min(TUTORIAL.length, node.step + 1);
  saveGame();
  const uniq = res.items.filter((i) => i.uniq);
  const next = () => afterBattle(res, b);
  b.resultAt = 0.7;   // 종료 연출이 끝난 뒤 결과창
  b.next = () => { if (uniq.length && !document.hidden) showUniqueFx(uniq, next); else next(); };
}
// 결과창의 [다음 스테이지/단계] 버튼: 일반 스테이지·보스는 다음 노드, 균열·시련은 한 단계 위
function nextBattleOf(node, res) {
  if (!res.win) return null;
  if (node.kind === "boss" && node.id && node.stage >= CFG.STAGES && node.act >= CFG.ACTS && save.endgame) { G.riftTier = 1; return { label: "심연의 균열 1층 ▶", node: MAP.byId["R"], battle: nodeToBattle({ kind: "rift" }) }; }   // v4: 스테이지 5 다음은 곧바로 균열
  if (node.kind === "boss" && node.id && node.stage >= CFG.STAGES && node.act < CFG.ACTS) return { label: `${ACTS[node.act].name} 마을로 ▶`, town: node.act + 1 };   // 액트 마지막 스테이지: 다음 마을로
  if (node.kind === "stage" || node.kind === "boss") {
    if (!node.id) return null; const nxt = node.stage < CFG.STAGES ? MAP.byId[`S${node.act}-${node.stage + 1}`] : (node.act < CFG.ACTS ? MAP.byId[`S${node.act + 1}-1`] : null);
    if (!nxt || !nodeUnlocked(save, nxt)) return null; return { label: nxt.kind === "boss" ? "보스 도전 ▶" : nxt.stage === 1 ? "다음 지역 ▶" : "다음 스테이지 ▶", node: nxt, battle: nodeToBattle(nxt) };
  }
  if (node.kind === "spire" && node.floor < (node.tw === 2 ? CFG.SPIRE.END2 : CFG.SPIRE.END) && node.floor + 1 <= (((node.tw === 2 ? save.spire2 : save.spire) && (node.tw === 2 ? save.spire2 : save.spire).best) || 0) + 1) { G[node.tw === 2 ? "spire2Floor" : "spireFloor"] = node.floor + 1; const n = MAP.nodes.find((x) => x.kind === (node.tw === 2 ? "tower2" : "tower")); return { label: `${node.floor + 1}층 도전 ▶`, node: n, battle: nodeToBattle(n) }; }
  if (node.kind === "rift" && node.tier + 1 <= Math.min(CFG.RIFT_END, save.rift.best + 1)) { G.riftTier = node.tier + 1; const n = MAP.nodes.find((x) => x.kind === "rift"); return { label: `${node.tier + 1}단계 도전 ▶`, node: n, battle: nodeToBattle({ kind: "rift" }) }; }
  if (node.kind === "trial" && node.tier + 1 <= Math.min(MAX_TRIAL, (save.trialBest || 0) + 1)) { G.trialTier = node.tier + 1; const n = MAP.nodes.find((x) => x.kind === "trial"); return { label: `${node.tier + 1}단계 도전 ▶`, node: n, battle: nodeToBattle({ kind: "trial" }) }; }
  return null;
}
// 설정 '다음 스테이지로 자동 이동': 승리 결과창에서 대기시간이 지나면 [다음] 버튼을 자동으로 누른다. 화면을 누르거나 키를 누르면 취소된다
function retreat() {
  if (!G.battle || G.battle.over) return; const wasPaused = G.paused; G.paused = true;
  Modal.open(`<h2>전투 중단</h2><p class="center">퇴각하면 보상을 받지 못합니다.${G.node.kind === "endless" ? "<br>(무한 균열 입장 횟수는 돌아오지 않습니다)" : ""}</p><div class="pbtns"><button class="btn warn" data-a="yes">퇴각</button><button class="btn pri" data-a="no">계속 싸운다</button></div>`, { cls: "sm", persistent: true, noClose: true, on: {
    yes: () => { Modal.close(true); AU.stopBgm(); save.auto.on = false; const r = G.retry; G.battle = null; if (G.node.kind === "tutorial") { openTitle(); } else r.back ? r.back() : openMap(G.node.act); },
    no: () => { Modal.close(true); G.paused = wasPaused || G.tipOpen; },
  } });
}

// v4: 스테이지 1~5는 경험치를 주지 않는다. 대신 한 스테이지마다 게임 시스템 하나를 설명한다
const STAGE_TIPS = [
  ["스테이지 1 · 자동 전투와 스킬", "캐릭터는 제자리에서 자동으로 싸웁니다. 스킬은 쿨타임마다 자동 발동하고, 적을 클릭하면 모든 스킬이 그 적을 먼저 공격합니다.<br><b>지금 마을의 스킬 상점</b>에 들러 보세요! 일반 등급 스킬은 <b>전부 골드로 골라서 살 수 있어요</b>. 사서 <b>스킬 창</b>에서 칸에 장착하면 됩니다 (처음에는 일반 등급만 쓰게 됩니다). 이 스테이지에서는 경험치를 얻지 않아요."],
  ["스테이지 2 · 장비와 옵션 티어", "장비 등급은 <b>일반 · 매직 · 레어 · 전설</b>입니다. 전설은 랜덤 옵션 <b>5개</b>를 가집니다.<br>각 옵션에는 <b>1~6티어</b>가 있어요. <b>6티어가 가장 흔하고 1티어가 가장 좋지만 가장 드뭅니다.</b> 장비의 <b>T1~T5</b>는 균열 20층마다 올라가며, 높은 T에서만 높은 티어 옵션이 나올 수 있습니다."],
  ["스테이지 3 · 소켓과 돌", "전설 장비에는 <b>소켓이 1~3개</b> 있습니다. 소켓에는 균열에서 드랍되는 <b>원초의 돌</b>의 옵션을 끼울 수 있어요.<br>돌은 <b>제련소(대장간)</b>에서 골드로 옵션을 확인한 뒤 장착합니다. 돌의 옵션은 티어 없이 고정 수치이고, 장비가 이미 가진 옵션과 같은 종류는 끼울 수 없습니다."],
  ["스테이지 4 · 레벨과 패시브", "이 게임에는 경험치가 없습니다. <b>균열 1층을 처음 클리어할 때마다 레벨이 1 오르고, 100층을 정복하면 100레벨</b>이 됩니다.<br>레벨마다 <b>패시브 포인트 2</b>를 얻어 패시브 트리에 찍습니다. 스킬 창의 <b>패시브 칸</b>에는 패시브 스킬(강철 피부, 요새 …)을 장착할 수 있어요."],
  ["스테이지 5 · 심연의 균열로", "이 보스를 쓰러뜨리면 <b>심연의 균열</b>이 열립니다. 균열은 100층까지 이어지고, <b>20층마다 난이도가 한 단계 뛰며 장비 T도 한 단계 오릅니다</b>. 15~19층에서 장비를 제대로 파밍해야 20층의 보스를 넘길 수 있어요.<br>균열에서는 장비와 원초의 돌을 얻습니다. 스킬은 필드에서 나오지 않고, <b>100층을 졸업</b>한 뒤 기존 보스들에게서 높은 등급 스킬을 얻을 수 있습니다."],
];
