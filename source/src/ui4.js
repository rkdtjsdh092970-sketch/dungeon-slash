// =========================================================
// 온라인: 서버 연결 / 로그인 / 경매장 / 길드 / 랭킹 (Cloudflare Worker + D1)
// =========================================================
const SRV = { url: /\.workers\.dev$/.test(location.hostname) ? location.origin : "https://dungeon-slash.jjy1.workers.dev", name: "", pass: "", on: false, timer: 0, last: 0, err: "" };
async function api(path, body) {
  try {
    const r = await fetch(SRV.url + path, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-name": encodeURIComponent(SRV.name), "x-pass": encodeURIComponent(SRV.pass) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return await r.json();
  } catch (e) { return { err: "서버에 연결할 수 없습니다" }; }
}
function srvMark() {
  const el = $("#t-srv"); if (el) { el.classList.toggle("on", SRV.on); el.title = SRV.on ? `서버 연결됨: ${SRV.name}` : "서버 미연결 (설정 → 서버 로그인)"; }
  let a = $("#acct"); if (!a) { a = document.createElement("div"); a.id = "acct"; $("#app").appendChild(a); a.addEventListener("click", (ev) => { if (ev.target.closest("[data-lo]")) { srvLogout(); toast("로그아웃했습니다 (세이브는 이 기기에 남아 있습니다)"); } }); }
  a.classList.toggle("hidden", !SRV.on); a.innerHTML = SRV.on ? `<span>☁ ${SRV.name}</span><button data-lo="1" title="서버 계정에서 로그아웃">로그아웃</button>` : "";
  const t = document.querySelector('[data-t="login"]'); if (t) { t.disabled = SRV.on; t.textContent = SRV.on ? `☁ 로그인됨 (${SRV.name})` : "☁ 서버 로그인"; }
  const b = document.querySelector('[data-a="srvlg"]'); if (b) { b.disabled = SRV.on; b.textContent = SRV.on ? `☁ 로그인됨 (${SRV.name})` : "☁ 서버 로그인"; }
}
// 운영자 회수 규칙: 서버가 알려 주면 이 기기의 엔젤릭(고유 4등급) 장비도 함께 제거한다
const ANG_IDS = new Set("halo judgment hellcrown apex eternity abyssalcrown voidheart pyrelordcrown plaguebearer angelstep dimshoes godhand hellverdict everarmor startear soulpact".split(" "));
function stripAngelicLocal() {
  if (!save) return 0; const bad = (it) => !!it && (it.utier === 4 || ANG_IDS.has(it.uniq)); let n = 0;
  const k = save.inv.length; save.inv = save.inv.filter((it) => !bad(it)); n += k - save.inv.length;
  for (const s of Object.keys(save.equipped || {})) if (bad(save.equipped[s])) { delete save.equipped[s]; n++; }
  if (n) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} if (typeof refreshTop === "function") refreshTop(); toast(`운영자에 의해 엔젤릭 장비 ${n}개가 회수되었습니다`, "bad"); }
  return n;
}
function srvQueue() { if (!SRV.on || SRV.timer) return; SRV.timer = setTimeout(async () => { SRV.timer = 0; if (!SRV.on || !save) return; const r = await api("/api/save", { save, power: curPower() }); if (r.ok) { SRV.last = Date.now(); if (r.stripped) stripAngelicLocal(); } }, 6000); }
async function srvLogin(name, pass) {
  SRV.name = name; SRV.pass = pass; const r = await api("/api/login", { name, pass });
  if (r && r.save && r.save.v !== 3) { r.save = null; r.oldSave = true; }   // v4: 이전 구조의 서버 세이브는 사용하지 않는다 (새로 시작 → 첫 저장 때 덮어쓴다)
  if (r.err) { SRV.on = false; srvMark(); return r; }
  if (r.revokeOn && save) stripAngelicLocal();
  setTimeout(() => { if (typeof mailPoll === "function") mailPoll(); }, 300);
  api("/api/guild/me").then((g) => { if (save && g && !g.err) { save.guildLv = g.guild ? g.guild.level : 0; } }).catch(() => {});
  SRV.on = true; srvMark(); setTimeout(() => { if (typeof srvQueue === "function") srvQueue(); }, 1500); try { localStorage.setItem("ds_srv", JSON.stringify({ name, pass })); } catch (e) {}
  return r;
}
async function srvAutoLogin() { try { const t = localStorage.getItem("ds_srv"); if (!t) return; const c = JSON.parse(t); const r = await srvLogin(c.name, c.pass); return r; } catch (e) {} }
function srvLogout() { SRV.on = false; SRV.name = SRV.pass = ""; clearTimeout(SRV.timer); SRV.timer = 0; try { localStorage.removeItem("ds_srv"); } catch (e) {} srvMark(); }

function loginDialog(after) {
  Modal.open(`<h2>서버 로그인</h2><div class="dim center">닉네임과 비밀번호로 접속하면 세이브가 서버에 저장되고, 경매장·길드·랭킹을 쓸 수 있습니다.<br>처음 입력하면 자동으로 계정이 만들어집니다.</div>
  <div class="pad center"><div><input class="txt" id="lg-n" placeholder="닉네임 (2~12자)" maxlength="12" value="${SRV.name || ""}"></div><div style="margin-top:8px"><input class="txt" id="lg-p" type="password" placeholder="비밀번호" maxlength="30"></div><div id="lg-e" class="warn" style="margin-top:8px;min-height:18px"></div></div>
  <div class="pbtns"><button class="btn pri" data-a="lgo">접속</button>${SRV.on ? `<button class="btn warn" data-a="lgout">로그아웃</button>` : ""}<button class="btn" data-a="lgx">닫기</button></div>`, { cls: "sm", on: {
    lgo: async () => {
      const n = $("#lg-n").value.trim(), p = $("#lg-p").value; $("#lg-e").textContent = "접속 중...";
      const r = await srvLogin(n, p); if (r.err) { $("#lg-e").textContent = r.err; return; }
      if (r.save && save && save.tut && (save.tut.done || save.level > 1)) {   // 서버 세이브와 현재 진행이 둘 다 있을 때
        Modal.open(`<h2>세이브 선택</h2><div class="center pad">서버에 Lv.${r.save.level} 세이브가 있습니다.<br>현재 진행은 Lv.${save.level} 입니다.</div><div class="pbtns"><button class="btn pri" data-a="useS">서버 세이브 불러오기</button><button class="btn" data-a="useL">현재 진행을 서버에 덮어쓰기</button></div>`, { cls: "sm", persistent: true, noClose: true, on: {
          useS: () => { save = Object.assign(newSave(), r.save); clampAll(save); saveGame(); Modal.close(true); toast("서버 세이브를 불러왔습니다", "ok"); refreshTop(); (after || openTitle)(); },
          useL: () => { srvQueue(); saveGame(); Modal.close(true); toast("현재 진행을 서버에 저장합니다", "ok"); (after || (() => {}))(); } } });
      } else if (r.save) { save = Object.assign(newSave(), r.save); clampAll(save); saveGame(); Modal.close(true); toast("서버 세이브를 불러왔습니다", "ok"); if (after) after(); else openTitle(); }
      else { if (save) srvQueue(); Modal.close(true); toast(r.created ? "계정이 만들어졌습니다" : "접속했습니다", "ok"); if (after) after(); }
    },
    lgout: () => { srvLogout(); Modal.close(); toast("로그아웃했습니다"); }, lgx: () => Modal.close(),
  } });
}
const needLogin = (title) => { Modal.open(`<h2>${title}</h2><div class="center pad dim">서버에 로그인해야 이용할 수 있습니다.</div><div class="pbtns"><button class="btn pri" data-a="gl">로그인</button></div>`, { cls: "sm", on: { gl: () => loginDialog(() => {}) } }); };

// ---------- 경매장 ----------
const AH = { tab: "buy", slot: "", minr: 0, uniq: false, sort: "price" };
const itemBrief = (it) => { if (it.uniq) { const D = UNIQUE_BY_ID[it.uniq]; return D ? uniqueLines(D, it.umods).join(" · ") : ""; } return it.affixes.map((a) => affText(a)).join(" · "); };
const isSkillItem = (it) => it && it.slot === "skill";
function ahRowHtml(r, act) {
  const it = r.item;
  if (isSkillItem(it)) { const d = SKILLS.find((x) => x.id === it.id); if (!d) return ""; const sk = skillOf(it); return `<div class="ahrow"><div class="tile sktile">${skIcon(it.id, 2)}</div><div style="flex:1;min-width:0"><div>${skillTitle(it)} <small class="dim">스킬 · Lv.${it.lvl || 1}${sk.rune ? " · " + sk.rune.name : ""}${r.seller ? " · " + r.seller : ""}</small></div><small class="dim" style="display:block;max-height:34px;overflow:hidden">${d.desc} · 피해 ${Math.round(sk.mult * 100)}% · 쿨 ${sk.cd.toFixed(1)}s</small></div><div style="text-align:right"><div style="color:#ffe08a;font-weight:bold">${fmtN(r.price)}G</div>${act}</div></div>`; }
  return `<div class="ahrow">${tileHtml(it, { up: true })}<div style="flex:1;min-width:0"><div>${itemTitle(it)} <small class="dim">T${it.ilvl} ${slotLabel(it)}${r.seller ? " · " + r.seller : ""}</small></div><small class="dim" style="display:block;max-height:34px;overflow:hidden">${baseText(it)} · ${itemBrief(it)}</small></div>
  <div style="text-align:right"><div style="color:#ffe08a;font-weight:bold">${fmtN(r.price)}G</div>${act}</div></div>`;
}
async function openAuction() {
  if (!SRV.on) return needLogin("경매소");
  const tabs = `<div class="tabs"><button class="tab ${AH.tab === "buy" ? "on" : ""}" data-a="ahtab" data-t="buy">구매</button><button class="tab ${AH.tab === "mine" ? "on" : ""}" data-a="ahtab" data-t="mine">내 판매</button></div>`;
  let body = "", res = `<div class="res">${iconImg("gold", 1)} ${fmtN(save.gold)}</div>`;
  if (AH.tab === "buy") {
    const r = await api(`/api/ah/list?slot=${AH.slot}&minr=${AH.minr}&uniq=${AH.uniq ? 1 : 0}&sort=${AH.sort}`);
    const bar = `<div class="itbar"><select data-i="ahslot"><option value="">전체 부위</option>${SLOTS.map((s) => `<option value="${s}" ${AH.slot === s ? "selected" : ""}>${SLOT_NAME[s]}</option>`).join("")}<option value="skill" ${AH.slot === "skill" ? "selected" : ""}>스킬</option></select><select data-i="ahrar"><option value="0">전체 등급</option>${ITEM_RARITY.slice(1).map((x, i) => `<option value="${i + 1}" ${AH.minr === i + 1 ? "selected" : ""}>${x.name} 이상</option>`).join("")}</select><select data-i="ahsort"><option value="price" ${AH.sort === "price" ? "selected" : ""}>낮은 가격순</option><option value="new" ${AH.sort === "new" ? "selected" : ""}>최신순</option></select><label><input type="checkbox" data-i="ahuniq" ${AH.uniq ? "checked" : ""}> 고유만</label><button class="btn xs" data-a="ahref">새로고침</button></div>`;
    body = r.err ? `<div class="warn center pad">${r.err}</div>` : bar + `<div class="qlist" style="height:330px">${r.rows.map((x) => ahRowHtml(x, x.seller === SRV.name ? `<small class="dim">내 물품</small>` : `<button class="btn xs pri" data-a="ahbuy" data-id="${x.id}" data-price="${x.price}" ${save.gold >= x.price ? "" : "disabled"}>구매</button>`)).join("") || `<div class="dim center pad">등록된 물품이 없습니다</div>`}</div>`;
    window._ahRows = r.rows || [];
  } else {
    const r = await api("/api/ah/mine");
    body = r.err ? `<div class="warn center pad">${r.err}</div>` : `<div class="dim center">등록 ${r.rows.filter((x) => x.status === "open").length} / ${r.max} · 수수료 5% · 3일 후 만료되며 회수할 수 있습니다</div>
     <div class="pad center">${r.sold || r.pending ? `<button class="btn pri" data-a="ahclaim">판매 완료 ${r.sold}건 확인 · ${fmtN(r.pending)}G 수령</button>` : `<span class="dim">완료된 판매가 없습니다</span>`}</div>
     <div class="qlist" style="height:260px">${r.rows.map((x) => ahRowHtml({ item: x.item, price: x.price }, `<small class="dim">${x.status === "expired" ? "만료됨" : "판매 중"}</small><br><button class="btn xs" data-a="ahcancel" data-id="${x.id}">회수</button>`)).join("") || `<div class="dim center pad">등록한 물품이 없습니다 · 장비 창에서 아이템을 골라 [경매 등록]</div>`}</div>`;
  }
  const rerender = () => openAuction();
  Modal.open(`<h2>경매소</h2>${res}${tabs}${body}`, { cls: "wide", on: {
    ahtab: (el) => { AH.tab = el.dataset.t; rerender(); }, ahslot: (el) => { AH.slot = el.value; rerender(); }, ahrar: (el) => { AH.minr = +el.value; rerender(); }, ahsort: (el) => { AH.sort = el.value; rerender(); }, ahuniq: (el) => { AH.uniq = el.checked; rerender(); }, ahref: rerender,
    ahbuy: async (el) => {
      const id = +el.dataset.id, price = +el.dataset.price; if (save.gold < price) return toast("골드가 부족합니다", "bad");
      const row = (window._ahRows || []).find((x) => x.id === id); if (!(row && isSkillItem(row.item)) && save.inv.length >= CFG.INV_MAX) return toast("가방이 가득 찼습니다", "bad");
      const r = await api("/api/ah/buy", { id }); if (r.err) { toast(r.err, "bad"); snd("error"); return rerender(); }
      save.gold -= r.price; r.item.uid = save.nextUid++; delete r.item.lock; if (!isSkillItem(r.item)) clampItem(r.item);
      if (isSkillItem(r.item)) { delete r.item.slot; save.skills.push(r.item); } else { save.inv.push(r.item); if (r.item.uniq) save.uniq[r.item.uniq] = (save.uniq[r.item.uniq] || 0) + 1; }
      snd("coin"); toast(`${isSkillItem(r.item) || r.item.id ? SKILLS.find((x) => x.id === r.item.id).name : itemName(r.item)} 구매 완료 (−${fmtN(r.price)}G)`, "ok"); saveGame(); refreshTop(); srvQueue(); rerender();
    },
    ahcancel: async (el) => { const r = await api("/api/ah/cancel", { id: +el.dataset.id }); if (r.err) { toast(r.err, "bad"); return rerender(); } r.item.uid = save.nextUid++; if (isSkillItem(r.item)) { delete r.item.slot; save.skills.push(r.item); } else save.inv.push(r.item); toast("물품을 회수했습니다", "ok"); saveGame(); rerender(); },
    ahclaim: async () => {
      const r = await api("/api/claim", {}); if (r.err) return toast(r.err, "bad"); save.gold += r.gold; saveGame(); refreshTop(); snd("coin");
      Modal.open(`<h2>판매 완료</h2><div class="dim center">판매가 완료되었습니다. 수수료 5%를 뺀 금액이 입금되었습니다.</div><div class="qlist" style="height:220px">${r.sold.map((x) => ahRowHtml({ item: x.item, price: x.price }, `<small class="dim">판매 완료</small>`)).join("")}</div><div class="center pad">입금 합계 <b style="color:#ffe08a">${fmtN(r.gold)}G</b></div><div class="pbtns"><button class="btn pri" data-a="ok2">확인</button></div>`, { cls: "sm", on: { ok2: () => rerender() } });
    },
  } });
}
function ahPostSkill(inst, rerender) {
  if (!inst) return;
  if (save.passive === inst.uid || save.loadout.some((l) => l && l.uid === inst.uid)) return toast("장착 중인 스킬은 등록할 수 없습니다 (먼저 해제하세요)", "bad");
  if ((save.presets || []).some((p) => p && p.loadout.some((l) => l && l.uid === inst.uid))) return toast("프리셋에 포함된 스킬은 등록할 수 없습니다", "bad");
  const d = SKILLS.find((x) => x.id === inst.id), sug = Math.max(100, Math.round(skillPrice(d, inst.rarity) * 1.5 * (1 + 0.15 * ((inst.lvl || 1) - 1))));
  Modal.open(`<h2>스킬 경매 등록</h2><div class="center pad">${skIcon(inst.id, 3)}<div>${skillTitle(inst)} · Lv.${inst.lvl || 1}${inst.rune ? " · " + RUNES[inst.rune].name : ""}</div></div><div class="center">가격(골드) <input class="txt" id="ah-price" type="number" min="1" value="${sug}"></div><div class="dim center" style="margin-top:6px">수수료 5%가 판매 대금에서 빠집니다 · 최대 5개까지 등록 · 룬과 레벨이 함께 넘어갑니다</div><div class="pbtns"><button class="btn pri" data-a="ahgo">등록</button><button class="btn" data-a="ahno">취소</button></div>`, { cls: "sm", on: {
    ahgo: async () => { const price = Math.floor(+$("#ah-price").value); if (!(price >= 1)) return toast("가격을 확인하세요", "bad"); const copy = JSON.parse(JSON.stringify(inst)); copy.slot = "skill"; copy.rarity = inst.rarity; const r = await api("/api/ah/post", { item: copy, price }); if (r.err) { toast(r.err, "bad"); snd("error"); return; } save.skills = save.skills.filter((x) => x !== inst); SK.sel = null; toast("경매에 등록했습니다", "ok"); snd("coin"); saveGame(); srvQueue(); rerender(); },
    ahno: () => rerender(),
  } });
}
function ahPostDialog(it) {
  if (it && it.bound) return toast("교환 불가 장비는 경매에 올릴 수 없습니다", "bad");
  if (!it || isProtected(it)) return toast("등록할 수 없는 장비입니다 (착용/잠금/프리셋)", "bad");
  const sug = Math.max(100, Math.round(itemValue(it) * (it.uniq ? 40 : 3)));
  Modal.open(`<h2>경매 등록</h2><div class="center pad">${tileHtml(it, { up: false })}<div>${itemTitle(it)}</div></div><div class="center">가격(골드) <input class="txt" id="ah-price" type="number" min="1" value="${sug}"></div><div class="dim center" style="margin-top:6px">수수료 5%가 판매 대금에서 빠집니다 · 최대 5개까지 등록</div><div class="pbtns"><button class="btn pri" data-a="ahgo">등록</button><button class="btn" data-a="ahno">취소</button></div>`, { cls: "sm", on: {
    ahgo: async () => { const price = Math.floor(+$("#ah-price").value); if (!(price >= 1)) return toast("가격을 확인하세요", "bad"); const copy = JSON.parse(JSON.stringify(it)); delete copy.lock; const r = await api("/api/ah/post", { item: copy, price }); if (r.err) { toast(r.err, "bad"); snd("error"); return; } removeItem(save, it); IB.sel = null; toast("경매에 등록했습니다", "ok"); snd("coin"); saveGame(); srvQueue(); renderItems(); },
    ahno: () => renderItems(),
  } });
}

// ---------- 심연의 문 (레이드) ----------
function openRaid() {
  const R = save.raid || { cleared: 0, best: 0 }, ok = GRADUATED(save), pw = fmtPow(curPower());
  Modal.open(`<h2>🔥 심연의 문 · 문지기 모르가스</h2>
  <div class="dim center">균열 100층을 정복하고 장비·스킬·패시브를 끝까지 갖춘 뒤에 도전하는 <b>최종 보스급</b> 상대입니다.</div>
  <div class="pline" style="margin-top:8px">· 문지기의 체력이 <b>75% · 50% · 25%</b>에 이르면 <b>결계</b>가 펼쳐지고 <b>결계석</b>이 솟습니다.</div>
  <div class="pline">· 결계 중에는 문지기에게 피해가 거의 들어가지 않고, <b>결계석이 남아 있는 동안 문지기의 체력이 되살아납니다.</b></div>
  <div class="pline">· 결계석을 모두 부수면 문지기가 잠시 무방비가 됩니다. 제한 시간은 <b>${Math.round(CFG.RAID.LIMIT / 60)}분</b>.</div>
  <div class="pline">내 전투력 <b style="color:#ffe08a">${pw}</b> · 처치 <b>${R.cleared || 0}</b>회${R.best ? ` · 최단 <b>${R.best}초</b>` : ""}</div>
  <div class="pbtns">${ok ? `<button class="btn pri" data-a="rstart">도전하기</button>` : `<button class="btn" disabled>균열 100층 클리어 후 도전 가능</button>`}<button class="btn" data-a="rclose">닫기</button></div>`, { cls: "wide", on: {
    rstart: () => { startBattle({ kind: "raid", act: 10, tier: CFG.RIFT_END, name: "심연의 문지기 모르가스", id: "raid", firstClear: !(R.cleared > 0) }, { raid: 1 }); }, rclose: () => Modal.close(),
  } });
}

// ---------- 허수아비 (마을) ----------
const DUMMY_INFO = { boss: ["보스 허수아비", "단일 대상 · 보스 추가 피해가 적용됩니다. 한 마리를 오래 때리는 빌드에 유리합니다."], normal: ["일반 허수아비", `일반 몬스터 ${"여러 마리"}가 모여 있습니다. 범위·연쇄 공격이 유리하고 모든 대상의 피해를 합산합니다.`] };
function openDummy() {
  const rec = save.dummy || {}, card = (k) => { const r = rec[k]; return `<div class="shopcard" style="min-height:0"><div class="sc-h"><div><b>${DUMMY_INFO[k][0]}</b><br><small class="dim">${DUMMY_INFO[k][1]}</small></div></div>
    <div>내 최고 <b style="color:#ffe08a">${r ? fmtN(r.dps) + " DPS" : "기록 없음"}</b>${r ? ` <small class="dim">(총 ${fmtN(r.total)})</small>` : ""}</div><button class="btn pri" data-a="dstart" data-k="${k}">${DUMMY_INFO[k][0]} 시작 (60초)</button></div>`; };
  Modal.open(`<h2>🎯 허수아비</h2><div class="dim center">현재 장비 · 스킬 · 패시브 그대로 <b>60초</b> 동안 허수아비를 때려 DPS를 잽니다.<br>방어력은 모두 같은 표준 값이라 다른 유저와 공정하게 비교할 수 있습니다. 기록은 랭킹에 올라갑니다.</div>
  <div class="shopgrid" style="grid-template-columns:repeat(2,1fr)">${card("boss")}${card("normal")}</div>
  <div class="pbtns"><button class="btn" data-a="drank" data-k="dummyb">보스 랭킹</button><button class="btn" data-a="drank" data-k="dummyn">일반 랭킹</button><button class="btn" data-a="dclose">닫기</button></div>`, { cls: "wide", on: {
    dstart: (el) => { const k = el.dataset.k; startBattle({ kind: "dummy", sub: k, act: 1, name: `${DUMMY_INFO[k][0]} · 60초 측정`, id: "dummy" }, { dummy: k }); },
    drank: (el) => { RK.k = el.dataset.k; openRanking(); }, dclose: () => Modal.close(),
  } });
}
function showDummyResult(res, b) {
  const d = res.dummy, name = DUMMY_INFO[d.mode][0], rows = Object.entries(d.by).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([id, v]) => { const sd = SKILLS.find((s) => s.id === id); return `<div class="pline"><span style="width:110px;display:inline-block">${sd ? sd.name : id}</span><span class="dim">${fmtN(v)}</span> <b>${(v / Math.max(1, d.total) * 100).toFixed(1)}%</b></div>`; }).join("");
  Modal.open(`<h2>🎯 ${name} 결과</h2><div class="center"><div class="dim">60초 총 피해 ${fmtN(d.total)}</div><div style="font-size:34px;font-weight:bold;color:#ffe08a;margin:6px 0">${fmtN(d.dps)} <small>DPS</small></div>
    ${d.isBest ? `<div style="color:#8dff9a">🎉 신기록!${d.prev ? ` <small class="dim">(이전 ${fmtN(d.prev)})</small>` : ""}</div>` : `<div class="dim">내 최고 ${fmtN(d.best.dps)} DPS</div>`}</div>
    <div style="margin:8px 0"><div class="dim">스킬별 피해 비중</div>${rows || '<div class="dim">기록 없음</div>'}</div><div id="dumrank" class="pline dim center">${SRV.on ? "내 순위 확인 중…" : "서버에 로그인하면 랭킹에 기록이 올라갑니다"}</div>
    <div class="pbtns"><button class="btn pri" data-a="dagain">다시 도전</button><button class="btn" data-a="drank2">랭킹 보기</button><button class="btn" data-a="dback">마을로</button></div>`, { cls: "wide", persistent: true, noClose: true, on: {
    dagain: () => { Modal.close(true); startBattle(G.node, G.retry); }, drank2: () => { RK.k = d.mode === "boss" ? "dummyb" : "dummyn"; G.battle = null; openRanking(); },
    dback: () => { Modal.close(true); G.battle = null; AU.stopBgm(); openTown(G.townAct || 1); },
  } });
  if (SRV.on) setTimeout(async () => { try { const k = d.mode === "boss" ? "dummyb" : "dummyn"; const r = await api("/api/rank?k=" + k), el = document.getElementById("dumrank"); if (el && r && !r.err && r.mine && r.mine.rank) el.innerHTML = `내 순위 <b style="color:#ffe08a">${r.mine.rank}위</b> <span class="dim">/ ${r.total}명</span>`; else if (el) el.textContent = "순위 정보를 불러오지 못했습니다"; } catch (e) {} }, 1500);
}

// ---------- 랭킹 ----------
const RK = { k: "power", rows: [], mine: null };
const RK_TABS = [["dummyb", "허수아비·보스"], ["dummyn", "허수아비·일반"], ["power", "전투력"], ["rift", "균열 최고층"], ["trial", "스킬 시련"], ["endless", "무한 균열"], ["level", "레벨"], ["guild", "길드"]];
const RK_VAL = { dummyb: (x) => `${fmtN(x.dummyb)} DPS`, dummyn: (x) => `${fmtN(x.dummyn)} DPS`, power: (x) => fmtPow(x.power), rift: (x) => `${x.rift}층`, trial: (x) => `${x.trial}단계`, endless: (x) => `${x.endless}초`, level: (x) => `Lv.${x.level}` };
const rkEsc = (t) => String(t == null ? "" : t).replace(/</g, "&lt;");
async function rankBody(k) {
  if (!SRV.on) return `<div class="center pad dim">서버에 로그인하면 랭킹을 볼 수 있고, 내 기록이 올라갑니다.</div><div class="pbtns"><button class="btn pri" data-a="gl">로그인</button></div>`;
  if (k === "guild") {
    const l = await api("/api/guild/list"); if (l.err) return `<div class="warn center pad">${l.err}</div>`;
    RK.rows = l.rows || [];
    return `<div class="qlist" style="max-height:300px;overflow:auto">${RK.rows.map((g, i) => `<div class="qrow"><b style="width:34px;font-size:16px">${["🥇", "🥈", "🥉"][i] || i + 1}</b><div class="qi">${rkEsc(g.name)} <small class="dim">길드장 ${rkEsc(g.leader)} · ${g.members}명</small></div><div style="text-align:right"><b style="color:#ffe08a">Lv.${g.level}</b><br><small class="dim">경험치 ${fmtC(g.exp)}</small></div></div>`).join("") || `<div class="dim center pad">아직 길드가 없습니다</div>`}</div>`;
  }
  const r = await api("/api/rank?k=" + k); if (r.err) return `<div class="warn center pad">${r.err}</div>`;
  RK.rows = r.rows || []; RK.mine = r.mine || null; const me = SRV.name, mv = k === "power" ? fmtPow(r.mine ? r.mine.value : 0) : (RK_VAL[k] ? RK_VAL[k]({ [k]: r.mine ? r.mine.value : 0, level: r.mine ? r.mine.value : 0 }) : "");
  const sum = r.mine && r.mine.rank ? `<div class="pline">내 순위 <b style="color:#ffe08a;font-size:18px">${r.mine.rank}위</b> <span class="dim">/ ${r.total}명 · 내 기록 ${mv}</span></div>` : `<div class="pline dim">내 기록이 아직 서버에 올라가지 않았습니다 (플레이하면 몇 초 안에 반영됩니다)</div>`;
  return `${sum}<div class="qlist" style="max-height:310px;overflow:auto">${RK.rows.map((x, i) => `<div class="qrow" data-a="rkprof" data-n="${i}" style="cursor:pointer;${x.name === me ? "background:#2a2450;border-color:#8a7ae0" : ""}"><b style="width:34px;font-size:16px">${["🥇", "🥈", "🥉"][i] || i + 1}</b><div class="qi">${rkEsc(x.name)} ${x.guild ? `<small class="dim">[${rkEsc(x.guild)}]</small>` : ""}<br><small class="dim">Lv.${x.level}${k !== "power" ? " · 전투력 " + fmtPow(x.power) : ""}${k !== "rift" && x.rift ? " · " + x.rift + "층" : ""}</small></div><div style="text-align:right"><b style="color:#ffe08a;font-size:15px">${RK_VAL[k](x)}</b></div></div>`).join("") || `<div class="dim center pad">아직 기록이 없습니다</div>`}</div>`;
}
async function openRanking() {
  const k = RK.k;
  const tabs = `<div class="tabs">${RK_TABS.map(([a, n]) => `<button class="tab ${k === a ? "on" : ""}" data-a="rkt" data-k="${a}">${n}</button>`).join("")}</div>`;
  const body = await rankBody(k);
  Modal.open(`<h2>랭킹</h2>${tabs}${body}<div class="pbtns"><button class="btn xs" data-a="rkre">새로고침</button><button class="btn xs" data-a="rkx">닫기</button></div>`, { cls: "wide", on: {
    rkt: (el) => { RK.k = el.dataset.k; openRanking(); }, rkre: () => openRanking(), rkx: () => Modal.close(), gl: () => loginDialog(openRanking),
    rkprof: (el) => { const x = RK.rows[+el.dataset.n]; if (!x) return;
      Modal.open(`<h2>${rkEsc(x.name)}</h2><div class="center">${x.guild ? `<div class="dim">길드 ${rkEsc(x.guild)}</div>` : ""}</div><div class="statgrid" style="margin:8px 0"><div class="aff">레벨 <b>Lv.${x.level}</b></div><div class="aff">전투력 <b style="color:#ffe08a">${fmtPow(x.power)}</b></div><div class="aff">균열 최고층 <b>${x.rift}층</b></div><div class="aff">스킬 시련 <b>${x.trial}단계</b></div><div class="aff">무한 균열 <b>${x.endless}초</b></div></div><div class="pbtns"><button class="btn" data-a="rkb">랭킹으로</button></div>`, { cls: "sm", on: { rkb: () => openRanking() } }); },
  } });
}

// ---------- 길드 / 랭킹 ----------
const GD = { tab: "guild" };
const fmtC = (n) => Math.floor(+n || 0).toLocaleString("en-US");   // 1,000,000 식 표기
async function openGuild() {
  const tabs = `<div class="tabs"><button class="tab ${GD.tab === "guild" ? "on" : ""}" data-a="gdtab" data-t="guild">길드</button><button class="tab ${GD.tab === "rank" ? "on" : ""}" data-a="gdtab" data-t="rank">랭킹</button></div>`;
  let body = "";
  const rerender = () => openGuild();
  if (false) {
  } else if (!SRV.on) body = `<div class="center pad dim">서버에 로그인해야 이용할 수 있습니다.</div><div class="pbtns"><button class="btn pri" data-a="gl">로그인</button></div>`;
  else if (GD.tab === "rank") {
    const k = GD.rk || "rift", r = await api("/api/rank?k=" + k);
    body = `<div class="itbar">${[["rift", "균열 최고층"], ["endless", "무한 균열"], ["level", "레벨"]].map(([a, n]) => `<button class="tab ${k === a ? "on" : ""}" data-a="rk" data-k="${a}">${n}</button>`).join("")}</div><div class="qlist">${r.err ? `<div class="warn center">${r.err}</div>` : (r.rows || []).map((x, i) => `<div class="qrow"><b style="width:30px">${i + 1}</b><div class="qi">${x.name} ${x.guild ? `<small class="dim">[${x.guild}]</small>` : ""}</div><div>Lv.${x.level} · ${x.rift}층 · 무한 ${x.endless}초</div></div>`).join("")}</div>`;
  } else {
    const r = await api("/api/guild/me");
    if (r.err) body = `<div class="warn center pad">${r.err}</div>`;
    else if (!r.guild) { const l = await api("/api/guild/list"); save.guildLv = 0; body = `<div class="dim center">길드에 가입하면 레벨에 비례해 골드·경험치·MF 보너스와 길드 패시브(최대 Lv.10)를 받습니다</div><div class="itbar"><input class="txt" id="gd-n" placeholder="새 길드 이름" maxlength="12"><button class="btn xs pri" data-a="gcreate">창설 (${fmtC(l.cost || 20000)}G)</button></div><div class="qlist" style="height:260px">${(l.rows || []).map((g) => `<div class="qrow"><div class="qi"><b>${g.name}</b> <small class="dim">Lv.${g.level} · ${g.members}/30명 · 길드장 ${g.leader}</small></div><button class="btn xs" data-a="gjoin" data-id="${g.id}">가입</button></div>`).join("") || `<div class="dim center pad">아직 길드가 없습니다</div>`}</div>`; }
    else { const g = r.guild; save.guildLv = g.level; const c = await api("/api/guild/chat");
      body = `<div class="cols" style="height:380px"><div class="col" style="width:290px;overflow:auto"><div class="dname">${g.name} <small class="dim">Lv.${g.level}</small></div><div class="dim">경험치 ${fmtC(g.exp)} · 다음 레벨 ${fmtC(Math.pow(g.level, 2) * 50000)}</div><div class="pline">기본 혜택: 골드 +${g.level * 2}% · 경험치 +${g.level * 2}% · MF +${g.level}%</div>
        <div class="itbar" style="flex-wrap:wrap"><span class="dim" style="width:100%">내 보유 골드 <b style="color:#ffe08a">${fmtC(save.gold)}G</b></span><input class="txt" id="gd-d" type="text" inputmode="numeric" placeholder="기부할 골드 (최소 100)" style="width:150px"><button class="btn xs" data-a="gdon">기부</button><button class="btn xs" data-a="gdall">전액</button></div>
        <h3>길드 패시브 <small class="dim">(길드 레벨 ${g.level})</small></h3>${GUILD_PASSIVES.map((p) => `<div class="aff" style="${g.level >= p.lv ? "color:#8dff9a" : "color:#7a7a96"}">Lv.${p.lv} · ${p.text} ${g.level >= p.lv ? "✔" : "🔒"}</div>`).join("")}
        ${g.leader === SRV.name ? `<div class="itbar"><input class="txt" id="gd-m" placeholder="공지" maxlength="60" value="${g.motd || ""}"><button class="btn xs" data-a="gmotd">저장</button></div>` : g.motd ? `<div class="pline">📢 ${g.motd}</div>` : ""}<h3>길드원 ${g.members.length}명</h3>${g.members.map((m) => `<div class="aff">${m.name === g.leader ? "👑 " : ""}${m.name} <small class="dim">Lv.${m.level} · ${m.rift}층</small></div>`).join("")}<div class="pbtns"><button class="btn warn xs" data-a="gleave">탈퇴</button></div></div>
        <div class="col" style="flex:1"><div class="chatbox" id="gd-chat">${(c.rows || []).map((m) => `<div><b>${m.name}</b>: ${m.msg.replace(/</g, "&lt;")}</div>`).join("")}</div><div class="itbar" style="margin-top:6px"><input class="txt" id="gd-msg" placeholder="메시지" maxlength="80" style="flex:1"><button class="btn xs pri" data-a="gsend">전송</button></div></div></div>`; }
  }
  setTimeout(() => { const di = $("#gd-d"); if (di) di.addEventListener("input", () => { const d = di.value.replace(/[^0-9]/g, ""); di.value = d ? Number(d).toLocaleString("en-US") : ""; }); }, 0);
  Modal.open(`<h2>길드</h2>${tabs}${body}`, { cls: "wide", on: {
    gdtab: (el) => { if (el.dataset.t === "rank") { openRanking(); return; } GD.tab = el.dataset.t; rerender(); }, gl: () => loginDialog(rerender), rk: (el) => { GD.rk = el.dataset.k; rerender(); },
    gacc: (el) => { guildAccept(save, el.dataset.id); snd("quest"); saveGame(); rerender(); },
    gclaim: (el) => { const r = guildClaim(save, el.dataset.id); if (r) { snd("quest"); toast("보상을 받았습니다", "ok"); saveGame(); refreshTop(); } rerender(); },
    gcreate: async () => { const n = $("#gd-n").value.trim(); if (save.gold < 20000) return toast("골드가 부족합니다 (20,000G)", "bad"); const r = await api("/api/guild/create", { name: n }); if (r.err) return toast(r.err, "bad"); save.gold -= 20000; saveGame(); refreshTop(); toast("길드를 만들었습니다", "ok"); snd("legend"); rerender(); },
    gjoin: async (el) => { const r = await api("/api/guild/join", { id: +el.dataset.id }); if (r.err) return toast(r.err, "bad"); toast("길드에 가입했습니다", "ok"); rerender(); },
    gleave: () => askConfirm("길드를 탈퇴할까요?", "탈퇴", async () => { const r = await api("/api/guild/leave", {}); if (r.err) return toast(r.err, "bad"); save.guildLv = 0; rerender(); }),
    gdall: () => { $("#gd-d").value = fmtC(save.gold); },
    gdon: async () => { const v = Math.floor(+String($("#gd-d").value).replace(/[^0-9]/g, "")); if (!(v >= 100) || v > save.gold) return toast("기부할 수 없는 금액입니다", "bad"); const r = await api("/api/guild/donate", { gold: v }); if (r.err) return toast(r.err, "bad"); save.gold -= v; saveGame(); refreshTop(); snd("coin"); toast(`${fmtC(v)}G를 기부했습니다`, "ok"); rerender(); },
    gmotd: async () => { await api("/api/guild/motd", { motd: $("#gd-m").value }); toast("공지를 저장했습니다"); },
    gsend: async () => { const m = $("#gd-msg").value; if (!m.trim()) return; await api("/api/guild/chat", { msg: m }); rerender(); },
  } });
  const ch = $("#gd-chat"); if (ch) ch.scrollTop = ch.scrollHeight;
}

// ---------- 우편함 (서버 우편: 운영 보상 등) ----------
const MAILN = { poll: 0 };
async function mailPoll() {   // 안 받은 우편 개수 → 마을 우편함에 느낌표
  if (!SRV.on) { G.mailN = 0; return; } try { const r = await api("/api/mail/list"); G.mailN = r && r.rows ? r.rows.filter((m) => !m.claimed).length : 0; } catch (e) {}
}
function mailRewardText(m) {
  let rw = m.rewards || (m.reward ? [typeof m.reward === "string" ? JSON.parse(m.reward) : m.reward] : []);
  return [m.gold ? `${fmtC(m.gold)}G` : "", m.ore ? `강화석 ${fmtN(m.ore)}` : "", ...rw.map((r) => `${RIFT_TN[r.t] || "고유"} 고유 장비 1개 (교환 불가)`)].filter(Boolean).join(" · ") || "첨부 없음";
}
function mailApply(c) {   // 수령한 우편의 골드·강화석·아이템을 저장 데이터에 반영한다
  save.gold += c.gold || 0; save.ore += c.ore || 0; const got = [];
  for (const r of c.rewards || []) { const it = genRiftReward(save, r.t, r.f); if (it) { save.inv.push(it); got.push(it); } }
  return got;
}
async function openMail() {
  if (!SRV.on) { Modal.open(`<h2>우편함</h2><div class="center pad dim">서버에 로그인하면 우편함을 이용할 수 있습니다.<br>운영 보상과 알림이 이곳으로 도착합니다.</div><div class="pbtns"><button class="btn pri" data-a="gl">로그인</button><button class="btn" data-a="cl">닫기</button></div>`, { cls: "sm", on: { gl: () => loginDialog(openMail), cl: () => Modal.close() } }); return; }
  const r = await api("/api/mail/list"); if (r.err) { toast(r.err, "bad"); return; }
  const rows = r.rows || [], unc = rows.filter((m) => !m.claimed); G.mailN = unc.length;
  const fmtD = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  Modal.open(`<h2>우편함 ${unc.length ? `<small style="color:#ffd24a">(${unc.length}통 미수령)</small>` : ""}</h2>
   ${unc.length > 1 ? `<div class="pbtns" style="margin:4px 0"><button class="btn pri" data-a="mall">모두 받기 (${unc.length}통)</button></div>` : ""}
   <div class="qlist" style="max-height:330px;overflow:auto">${rows.map((m) => `<div class="qrow" style="${m.claimed ? "opacity:.55" : ""}"><div class="qi"><b>${String(m.title).replace(/</g, "&lt;")}</b> <small class="dim">${fmtD(m.created)}</small><div class="dim" style="white-space:pre-wrap">${String(m.body || "").replace(/</g, "&lt;")}</div><div style="color:#ffe08a">🎁 ${mailRewardText(m)}</div></div>${m.claimed ? `<span class="dim">수령 완료</span>` : `<button class="btn pri" data-a="mget" data-id="${m.id}">받기</button>`}</div>`).join("") || `<div class="dim center pad">받은 우편이 없습니다</div>`}</div>`, { cls: "wide", on: {
    mget: async (el) => { const c = await api("/api/mail/claim", { id: +el.dataset.id }); if (c.err) { toast(c.err, "bad"); return openMail(); } const got = mailApply(c); saveGame(); refreshTop(); snd("coin"); toast(`우편 수령: ${mailRewardText(c)}${got.length ? " → " + got.map((x) => UNIQUE_BY_ID[x.uniq].name).join(", ") : ""}`, "ok"); openMail(); },
    mall: async () => { const c = await api("/api/mail/claimall", {}); if (c.err) { toast(c.err, "bad"); return openMail(); } const got = mailApply(c); saveGame(); refreshTop(); snd("coin"); toast(`우편 ${c.n}통 수령: ${mailRewardText(c)}${got.length ? " → " + got.map((x) => UNIQUE_BY_ID[x.uniq].name).join(", ") : ""}`, "ok"); openMail(); },
  } });
}

// =========================================================
// v3.27 창고: 장비·스킬을 보관 (100칸 시작, 골드로 10칸씩 500칸까지 확장). 장비와 스킬이 같은 칸을 나눠 쓴다
// =========================================================
const STASH_MAX = 500, STASH_STEP = 10;
const stashUsed = (sv) => sv.stash.items.length + sv.stash.skills.length;
const stashExpandCost = (sv) => (sv.stash.cap >= STASH_MAX ? null : Math.round(300000 * Math.pow(1.12, (sv.stash.cap - 100) / STASH_STEP)));
const ST = { tab: "item" };
function stashSkillBusy(sv, inst) { return sv.passive === inst.uid || sv.loadout.some((l) => l && l.uid === inst.uid) || skillInPreset(sv, inst); }
function stashSort(sv) {
  const sl = (s) => EQ_SLOTS.indexOf(s);
  sv.stash.items.sort((a, b) => sl(a.slot) - sl(b.slot) || b.rarity - a.rarity || (b.uniq ? 1 : 0) - (a.uniq ? 1 : 0) || tierOfItem(b) - tierOfItem(a) || b.ilvl - a.ilvl || (b.enh || 0) - (a.enh || 0) || a.uid - b.uid);
  sv.stash.skills.sort((a, b) => b.rarity - a.rarity || (b.lvl || 1) - (a.lvl || 1) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) || a.uid - b.uid);
}
function openStash() {
  const sv = save, S = sv.stash, free = S.cap - stashUsed(sv), cost = stashExpandCost(sv), isI = ST.tab === "item";
  const invItems = sv.inv.slice().sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl), invSk = sv.skills.filter((k) => !stashSkillBusy(sv, k)).sort((a, b) => b.rarity - a.rarity || (b.lvl || 1) - (a.lvl || 1));
  const skTile = (k, act) => { const d = SKILLS.find((x) => x.id === k.id); return `<div class="tile rk${k.rarity}" data-a="${act}" data-u="${k.uid}" data-tips="${d.id}" title="${d.name}">${skIcon(d.id, 2)}<small>${k.lvl || 1}</small></div>`; };
  const invHtml = isI ? invItems.map((it) => tileHtml(it, { attr: `data-a="dep" data-u="${it.uid}"`, up: false })).join("") : invSk.map((k) => skTile(k, "dep")).join("");
  const stHtml = isI ? S.items.map((it) => tileHtml(it, { attr: `data-a="wd" data-u="${it.uid}"`, up: false })).join("") : S.skills.map((k) => skTile(k, "wd")).join("");
  const html = `<h2>📦 창고</h2><div class="res">${iconImg("gold", 1)} ${fmtN(sv.gold)} &nbsp; 보관 <b>${stashUsed(sv)} / ${S.cap}</b> <small class="dim">(장비 ${S.items.length} · 스킬 ${S.skills.length}, 최대 ${STASH_MAX}칸)</small></div>
  <div class="itbar"><button class="tab ${isI ? "on" : ""}" data-a="sttab" data-t="item">장비</button><button class="tab ${!isI ? "on" : ""}" data-a="sttab" data-t="skill">스킬</button><button class="btn xs" data-a="stsort">자동 정렬</button><button class="btn xs" data-a="stexp" ${cost == null || sv.gold < cost ? "disabled" : ""}>${cost == null ? "최대 확장" : `+${STASH_STEP}칸 확장 (${fmtN(cost)} 골드)`}</button></div>
  <div style="display:flex;gap:10px"><div style="flex:1;min-width:0"><div class="dim">가방 ${isI ? sv.inv.length + " / " + CFG.INV_MAX : "스킬 " + sv.skills.length} · 눌러서 창고로</div><div class="grid" style="max-height:300px;overflow:auto">${invHtml || `<div class="dim pad">비어 있습니다</div>`}</div></div>
  <div style="flex:1;min-width:0"><div class="dim">창고 · 눌러서 가방으로</div><div class="grid" style="max-height:300px;overflow:auto">${stHtml || `<div class="dim pad">비어 있습니다</div>`}</div></div></div>
  <div class="dim">착용·장착 중인 장비/스킬은 넣을 수 없고, 창고 물품은 판매·분해 대상에서 제외됩니다.</div>`;
  const done = () => { saveGame(); openStash(); };
  Modal.open(html, { cls: "wide", on: {
    sttab: (el) => { ST.tab = el.dataset.t; snd("click"); openStash(); },
    stsort: () => { stashSort(sv); snd("click"); done(); },
    stexp: () => { const c = stashExpandCost(sv); if (c == null || sv.gold < c) return toast("골드가 부족합니다", "bad"); sv.gold -= c; S.cap += STASH_STEP; snd("coin"); toast(`창고 ${S.cap}칸`, "ok"); refreshTop(); done(); },
    dep: (el) => { const u = +el.dataset.u; if (stashUsed(sv) >= S.cap) return toast("창고가 가득 찼습니다 (확장하세요)", "bad");
      if (isI) { const it = sv.inv.find((x) => x.uid === u); if (!it) return; if (EQ_SLOTS.some((k) => sv.equipped[k] === it) || (sv.presets || []).some((p) => p && Object.values(p.equip).includes(u))) return toast("착용 중이거나 프리셋에 포함된 장비는 넣을 수 없습니다", "bad"); sv.inv = sv.inv.filter((x) => x !== it); S.items.push(it); } else { const k = sv.skills.find((x) => x.uid === u); if (!k || stashSkillBusy(sv, k)) return; sv.skills = sv.skills.filter((x) => x !== k); S.skills.push(k); }
      snd("click"); done(); },
    wd: (el) => { const u = +el.dataset.u;
      if (isI) { if (sv.inv.length >= CFG.INV_MAX) return toast("가방이 가득 찼습니다", "bad"); const it = S.items.find((x) => x.uid === u); if (!it) return; S.items = S.items.filter((x) => x !== it); sv.inv.push(it); } else { const k = S.skills.find((x) => x.uid === u); if (!k) return; S.skills = S.skills.filter((x) => x !== k); sv.skills.push(k); }
      snd("click"); done(); },
  } });
}

// =========================================================
// v4 제련소: 미확인의 돌 확인 + 소켓 장착
// =========================================================
// 같은 옵션·같은 수치·같은 종류의 확인된 돌은 하나로 묶어서 ×개수로 보여준다 (원초의 돌 → 계시의 돌 순)
const stoneName = (m) => `<span style="color:${stoneT(m).color};font-weight:bold${m && m.hi ? ";text-shadow:0 0 6px #ffb34766" : ""}">${stoneT(m).ico} ${stoneLabel(m)}</span>`;
const stoneHead = (hi, n, extra) => `<div class="pline" style="margin-top:6px;padding-bottom:2px;border-bottom:1px solid ${STONE_T[hi].color}55"><b style="color:${STONE_T[hi].color}">${STONE_T[hi].ico} ${STONE_T[hi].name}</b> <span class="dim">${n}개${extra || ""}</span></div>`;
function stoneGroups(list) { const m = new Map(); for (const s of list) { const hi = s.rev.hi ? 1 : 0, key = hi + "|" + s.rev.k + "|" + s.rev.v; if (!m.has(key)) m.set(key, { rev: s.rev, hi, uids: [] }); m.get(key).uids.push(s.uid); } return [...m.values()].sort((a, b) => (a.hi - b.hi) || stoneLabel(a.rev).localeCompare(stoneLabel(b.rev), "ko")); }
function openStones() {
  const sv = save, cost0 = stoneRevealCost(sv), costOf = (hi) => cost0 * (hi ? CFG.TEMPLE.HI_COST : 1), un = [0, 1].map((hi) => sv.stones.filter((s) => !s.rev && (s.hi ? 1 : 0) === hi)), rv = sv.stones.filter((s) => s.rev), gr = stoneGroups(rv);
  const unRow = (hi) => un[hi].length ? `<div class="pline"><b style="color:${STONE_T[hi].color}">${STONE_T[hi].ico} ${STONE_T[hi].un}</b> <span style="color:#ffe08a">×${un[hi].length}</span></div><div class="pline"><button class="btn xs pri" data-a="streveal" data-u="${un[hi][0].uid}" ${sv.gold >= costOf(hi) ? "" : "disabled"}>1개 확인 (${fmtN(costOf(hi))}G)</button> <button class="btn xs" data-a="stall" data-h="${hi}" ${sv.gold >= costOf(hi) ? "" : "disabled"}>전부 확인 (${fmtN(costOf(hi) * un[hi].length)}G)</button></div>` : "";
  const left = `<div style="flex:1;min-width:0"><div class="pline"><b>❔ 미확인된 돌</b> <span style="color:#ffe08a">×${un[0].length + un[1].length}</span></div>${unRow(0)}${unRow(1)}${un[0].length + un[1].length ? "" : `<div class="dim pad">미확인된 돌이 없습니다 — 균열과 돌의 신전을 돌아 보세요</div>`}</div>`;
  const section = (hi) => { const g = gr.filter((x) => x.hi === hi); if (!g.length) return ""; return stoneHead(hi, g.reduce((a, x) => a + x.uids.length, 0)) + g.map((x) => `<div class="pline">${stoneName(x.rev)}${x.uids.length > 1 ? ` <b style="color:#ffe08a">×${x.uids.length}</b>` : ""} <button class="btn xs" data-a="stdrop" data-u="${x.uids[0]}" title="1개 버리기">버리기</button></div>`).join(""); };
  const right = `<div style="flex:1;min-width:0;border-left:1px solid #3a3260;padding-left:10px"><div class="pline"><b>확인된 돌</b> <span style="color:#8dff9a">${rv.length}개 · ${gr.length}종</span></div>
    <div style="max-height:300px;overflow:auto">${section(1)}${section(0)}${rv.length ? "" : `<div class="dim pad">확인된 돌이 없습니다</div>`}</div></div>`;
  Modal.open(`<h2>💎 돌</h2><div class="res">${iconImg("gold", 1)} ${fmtN(sv.gold)} · 미확인 ${un[0].length + un[1].length} · 확인됨 ${rv.length}</div>
  <div class="dim center"><span style="color:${STONE_T[0].color}">원초의 돌</span>은 균열에서, <span style="color:${STONE_T[1].color}">계시의 돌</span>은 돌의 신전에서 아주 드물게 드랍됩니다. 제련소에서 골드로 옵션을 확인하면 <b>고정 수치</b>의 옵션이 나옵니다 (계시의 돌은 수치가 약 ${CFG.TEMPLE.HI_MULT}배, 확인 비용 ×${CFG.TEMPLE.HI_COST}).<br>장비의 소켓에 끼우려면 장비 창 → 제련소 → 장비 선택 → [끼우기]. 장비가 이미 가진 옵션과 같은 종류는 끼울 수 없습니다.</div>
  <div style="display:flex;gap:12px;margin:8px 0;align-items:flex-start">${left}${right}</div>
  <div class="pbtns"><button class="btn" data-a="stback">돌아가기</button></div>`, { cls: "wide", on: {
    streveal: (el) => { const s = sv.stones.find((x) => x.uid === +el.dataset.u); if (s && revealStone(sv, s)) { snd("orb"); toast(`확인: ${stoneLabel(s.rev)}`, "ok"); saveGame(); refreshTop(); } else snd("error"); openStones(); },
    stall: (el) => { const hi = +el.dataset.h; let n = 0; for (const s of sv.stones.filter((x) => !x.rev && (x.hi ? 1 : 0) === hi)) { if (revealStone(sv, s)) n++; else break; } if (n) { snd("orb"); toast(`${n}개 확인`, "ok"); saveGame(); refreshTop(); } openStones(); },
    stdrop: (el) => { sv.stones = sv.stones.filter((x) => x.uid !== +el.dataset.u); saveGame(); openStones(); },
    stback: () => { if (typeof renderItems === "function") renderItems(); else Modal.close(); },
  } });
}
function openSockRoll(it) {
  if (!it || !it.sock) return; const have = save.sockTix || 0, held = it.sock.filter(Boolean);
  Modal.open(`<h2>${SOCK_TIX.ico} 세공의 인장</h2><div class="center">${itemTitle(it)}<br>소켓 <b>${it.sock.length}개</b> → <b style="color:${SOCK_TIX.color}">1~3개 중 무작위</b></div>
  <div class="center dim" style="margin:6px 0">보유 인장 ×${have} · 사용하면 1개 소모됩니다</div>
  ${held.length ? `<div class="warn center" style="margin:8px 0">끼워 둔 돌 ${held.length}개(${held.map((m) => stoneName(m)).join(", ")})가 <b>사라집니다</b>.</div>` : `<div class="dim center" style="margin:8px 0">끼워 둔 돌이 없습니다.</div>`}
  <div class="pbtns"><button class="btn pri" data-a="sockrollyes" ${have > 0 ? "" : "disabled"}>인장 사용</button><button class="btn" data-a="sockback">취소</button></div>`, { cls: "sm", on: {
    sockrollyes: () => { const r = rerollSockets(save, it); toast(r.msg, r.ok ? "ok" : "bad"); snd(r.ok ? "enh_ok" : "error"); saveGame(); if (typeof refreshTop === "function") refreshTop(); renderItems(); },
    sockback: () => renderItems(),
  } });
}
function openSockDel(it, idx) {
  if (!it || !it.sock || !it.sock[idx]) return; const cur = it.sock[idx];
  Modal.open(`<h2>소켓 돌 삭제</h2><div class="center">${itemTitle(it)} · ${idx + 1}번 소켓<br><b>${stoneName(cur)}</b></div><div class="warn center" style="margin:8px 0">박힌 돌은 <b>회수할 수 없고</b> 삭제하면 사라집니다.<br>소켓은 빈 칸이 되어 다른 돌을 끼울 수 있습니다.</div>
  <div class="pbtns"><button class="btn warn" data-a="sockdelyes">삭제</button><button class="btn" data-a="sockback">취소</button></div>`, { cls: "sm", on: {
    sockdelyes: () => { const eq = EQ_SLOTS.some((k) => save.equipped[k] === it); it.sock[idx] = null; snd("click"); toast("소켓의 돌을 삭제했습니다", "ok"); saveGame(); if (eq && typeof refreshTop === "function") refreshTop(); renderItems(); },
    sockback: () => renderItems(),
  } });
}
function openSockPick(it, idx) {
  if (!it || !it.sock) return; const sv = save, rv = sv.stones.filter((s) => s.rev), cur = it.sock[idx];
  const ok = (s) => socketUsable(it, s.rev.k) || (cur && cur.k === s.rev.k);
  // 각 돌을 끼웠을 때의 전투력 변화 (지금 끼워진 상태 기준)
  const eqKeys = EQ_SLOTS.filter((k) => save.equipped[k] === it), pwNow = () => Math.max(...(eqKeys.length ? eqKeys : slotKeys(it.slot)).map((k) => powerWith(save, k, it))), base = pwNow();
  const gainOf = (rev) => { const keep = it.sock[idx]; it.sock[idx] = rev.hi ? { k: rev.k, v: rev.v, hi: 1 } : { k: rev.k, v: rev.v }; let p = base; try { p = pwNow(); } catch (e) {} it.sock[idx] = keep; return { d: p - base, pct: (p / Math.max(1, base) - 1) * 100 }; };
  const gainHtml = (g) => `<small style="color:${g.d >= 0 ? "#8dff9a" : "#ff8a8a"}"> 전투력 ${g.d >= 0 ? "▲" : "▼"} ${fmtN(Math.abs(Math.round(g.d)))} (${g.d >= 0 ? "+" : "-"}${Math.abs(g.pct).toFixed(1)}%)</small>`;
  const mode = G.sockSort || "power", groups = stoneGroups(rv).map((g) => { const s = { uid: g.uids[0], rev: g.rev }, usable = ok(s); return { g, s, usable, gain: usable ? gainOf(s.rev) : null }; });
  const section = (hi) => { let L = groups.filter((x) => x.g.hi === hi); if (!L.length) return ""; if (mode === "power") L = L.slice().sort((x, y) => (y.usable - x.usable) || ((y.gain ? y.gain.d : 0) - (x.gain ? x.gain.d : 0)));   // 종류별로 나누고, 각 종류 안에서 전투력 상승이 큰 순
    return stoneHead(hi, L.reduce((a, x) => a + x.g.uids.length, 0)) + L.map(({ g, s, usable, gain }, i) => `<div class="pline">${mode === "power" && usable && i === 0 && gain && gain.d > 0 ? `<b style="color:#ffd24a">★ </b>` : ""}${stoneName(s.rev)}${g.uids.length > 1 ? ` <b style="color:#ffe08a">×${g.uids.length}</b>` : ""} ${usable ? gainHtml(gain) + ` <button class="btn xs pri" data-a="sockgo" data-u="${s.uid}">끼우기</button>` : `<small style="color:#ff8a8a">같은 옵션이 있어 불가</small>`}</div>`).join(""); };
  Modal.open(`<h2>소켓 끼우기</h2><div class="center">${itemTitle(it)} · ${idx + 1}번 소켓 ${cur ? `<br><small class="dim">이미 ${stoneName(cur)}가 끼워져 있습니다 — 다른 돌을 끼우면 교체되고 이전 옵션은 사라집니다</small>` : ""}</div>
  <div class="center" style="margin:4px 0"><button class="btn xs ${mode === "power" ? "pri" : ""}" data-a="socksort" data-m="power">전투력 상승순</button> <button class="btn xs ${mode === "default" ? "pri" : ""}" data-a="socksort" data-m="default">기본 순서</button></div>
  <div style="max-height:300px;overflow:auto;margin:6px 0">${section(1)}${section(0)}${groups.length ? "" : `<div class="dim center pad">끼울 수 있는 확인된 돌이 없습니다. 💎 미확인된 돌에서 먼저 확인하세요.</div>`}</div>
  <div class="pbtns"><button class="btn" data-a="sockback">돌아가기</button></div>`, { cls: "wide", on: {
    sockgo: (el) => { const s = sv.stones.find((x) => x.uid === +el.dataset.u); if (!s) return; const r = socketItem(sv, it, s, idx); toast(r.msg, r.ok ? "ok" : "bad"); snd(r.ok ? "enh_ok" : "error"); saveGame(); renderItems(); },
    socksort: (el) => { G.sockSort = el.dataset.m; openSockPick(it, idx); },
    sockback: () => renderItems(),
  } });
}
