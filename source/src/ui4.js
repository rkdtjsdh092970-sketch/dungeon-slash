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
function srvQueue() { if (!SRV.on || SRV.timer) return; SRV.timer = setTimeout(async () => { SRV.timer = 0; if (!SRV.on || !save) return; const r = await api("/api/save", { save }); if (r.ok) SRV.last = Date.now(); }, 6000); }
async function srvLogin(name, pass) {
  SRV.name = name; SRV.pass = pass; const r = await api("/api/login", { name, pass });
  if (r.err) { SRV.on = false; srvMark(); return r; }
  SRV.on = true; srvMark(); try { localStorage.setItem("ds_srv", JSON.stringify({ name, pass })); } catch (e) {}
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
          useS: () => { save = Object.assign(newSave(), r.save); saveGame(); Modal.close(true); toast("서버 세이브를 불러왔습니다", "ok"); refreshTop(); (after || openTitle)(); },
          useL: () => { srvQueue(); saveGame(); Modal.close(true); toast("현재 진행을 서버에 저장합니다", "ok"); (after || (() => {}))(); } } });
      } else if (r.save) { save = Object.assign(newSave(), r.save); saveGame(); Modal.close(true); toast("서버 세이브를 불러왔습니다", "ok"); if (after) after(); else openTitle(); }
      else { if (save) srvQueue(); Modal.close(true); toast(r.created ? "계정이 만들어졌습니다" : "접속했습니다", "ok"); if (after) after(); }
    },
    lgout: () => { srvLogout(); Modal.close(); toast("로그아웃했습니다"); }, lgx: () => Modal.close(),
  } });
}
const needLogin = (title) => { Modal.open(`<h2>${title}</h2><div class="center pad dim">서버에 로그인해야 이용할 수 있습니다.</div><div class="pbtns"><button class="btn pri" data-a="gl">로그인</button></div>`, { cls: "sm", on: { gl: () => loginDialog(() => {}) } }); };

// ---------- 경매장 ----------
const AH = { tab: "buy", slot: "", minr: 0, uniq: false, sort: "price" };
const itemBrief = (it) => { if (it.uniq) { const D = UNIQUE_BY_ID[it.uniq]; return D ? uniqueLines(D, it.umods).join(" · ") : ""; } return it.affixes.map((a) => affText(a)).join(" · "); };
function ahRowHtml(r, act) {
  const it = r.item; return `<div class="ahrow">${tileHtml(it, { up: true })}<div style="flex:1;min-width:0"><div>${itemTitle(it)} <small class="dim">Lv.${it.ilvl} ${SLOT_NAME[it.slot]}${r.seller ? " · " + r.seller : ""}</small></div><small class="dim" style="display:block;max-height:34px;overflow:hidden">${baseText(it)} · ${itemBrief(it)}</small></div>
  <div style="text-align:right"><div style="color:#ffe08a;font-weight:bold">${fmtN(r.price)}G</div>${act}</div></div>`;
}
async function openAuction() {
  if (!SRV.on) return needLogin("경매소");
  const tabs = `<div class="tabs"><button class="tab ${AH.tab === "buy" ? "on" : ""}" data-a="ahtab" data-t="buy">구매</button><button class="tab ${AH.tab === "mine" ? "on" : ""}" data-a="ahtab" data-t="mine">내 판매</button></div>`;
  let body = "", res = `<div class="res">${iconImg("gold", 1)} ${fmtN(save.gold)}</div>`;
  if (AH.tab === "buy") {
    const r = await api(`/api/ah/list?slot=${AH.slot}&minr=${AH.minr}&uniq=${AH.uniq ? 1 : 0}&sort=${AH.sort}`);
    const bar = `<div class="itbar"><select data-i="ahslot"><option value="">전체 부위</option>${SLOTS.map((s) => `<option value="${s}" ${AH.slot === s ? "selected" : ""}>${SLOT_NAME[s]}</option>`).join("")}</select><select data-i="ahrar"><option value="0">전체 등급</option>${ITEM_RARITY.slice(1).map((x, i) => `<option value="${i + 1}" ${AH.minr === i + 1 ? "selected" : ""}>${x.name} 이상</option>`).join("")}</select><select data-i="ahsort"><option value="price" ${AH.sort === "price" ? "selected" : ""}>낮은 가격순</option><option value="new" ${AH.sort === "new" ? "selected" : ""}>최신순</option></select><label><input type="checkbox" data-i="ahuniq" ${AH.uniq ? "checked" : ""}> 고유만</label><button class="btn xs" data-a="ahref">새로고침</button></div>`;
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
      if (save.inv.length >= CFG.INV_MAX) return toast("가방이 가득 찼습니다", "bad");
      const r = await api("/api/ah/buy", { id }); if (r.err) { toast(r.err, "bad"); snd("error"); return rerender(); }
      save.gold -= r.price; r.item.uid = save.nextUid++; delete r.item.lock; save.inv.push(r.item); if (r.item.uniq) save.uniq[r.item.uniq] = (save.uniq[r.item.uniq] || 0) + 1;
      snd("coin"); toast(`${itemName(r.item)} 구매 완료 (−${fmtN(r.price)}G)`, "ok"); saveGame(); refreshTop(); srvQueue(); rerender();
    },
    ahcancel: async (el) => { const r = await api("/api/ah/cancel", { id: +el.dataset.id }); if (r.err) { toast(r.err, "bad"); return rerender(); } r.item.uid = save.nextUid++; save.inv.push(r.item); toast("물품을 회수했습니다", "ok"); saveGame(); rerender(); },
    ahclaim: async () => {
      const r = await api("/api/claim", {}); if (r.err) return toast(r.err, "bad"); save.gold += r.gold; saveGame(); refreshTop(); snd("coin");
      Modal.open(`<h2>판매 완료</h2><div class="dim center">판매가 완료되었습니다. 수수료 5%를 뺀 금액이 입금되었습니다.</div><div class="qlist" style="height:220px">${r.sold.map((x) => ahRowHtml({ item: x.item, price: x.price }, `<small class="dim">판매 완료</small>`)).join("")}</div><div class="center pad">입금 합계 <b style="color:#ffe08a">${fmtN(r.gold)}G</b></div><div class="pbtns"><button class="btn pri" data-a="ok2">확인</button></div>`, { cls: "sm", on: { ok2: () => rerender() } });
    },
  } });
}
function ahPostDialog(it) {
  if (!it || isProtected(it)) return toast("등록할 수 없는 장비입니다 (착용/잠금/프리셋)", "bad");
  const sug = Math.max(100, Math.round(itemValue(it) * (it.uniq ? 40 : 3)));
  Modal.open(`<h2>경매 등록</h2><div class="center pad">${tileHtml(it, { up: false })}<div>${itemTitle(it)}</div></div><div class="center">가격(골드) <input class="txt" id="ah-price" type="number" min="1" value="${sug}"></div><div class="dim center" style="margin-top:6px">수수료 5%가 판매 대금에서 빠집니다 · 최대 5개까지 등록</div><div class="pbtns"><button class="btn pri" data-a="ahgo">등록</button><button class="btn" data-a="ahno">취소</button></div>`, { cls: "sm", on: {
    ahgo: async () => { const price = Math.floor(+$("#ah-price").value); if (!(price >= 1)) return toast("가격을 확인하세요", "bad"); const copy = JSON.parse(JSON.stringify(it)); delete copy.lock; const r = await api("/api/ah/post", { item: copy, price }); if (r.err) { toast(r.err, "bad"); snd("error"); return; } removeItem(save, it); IB.sel = null; toast("경매에 등록했습니다", "ok"); snd("coin"); saveGame(); srvQueue(); renderItems(); },
    ahno: () => renderItems(),
  } });
}

// ---------- 길드 / 랭킹 ----------
const GD = { tab: "bounty" };
async function openGuild() {
  const tabs = `<div class="tabs"><button class="tab ${GD.tab === "bounty" ? "on" : ""}" data-a="gdtab" data-t="bounty">현상금</button><button class="tab ${GD.tab === "guild" ? "on" : ""}" data-a="gdtab" data-t="guild">길드</button><button class="tab ${GD.tab === "rank" ? "on" : ""}" data-a="gdtab" data-t="rank">랭킹</button></div>`;
  let body = "";
  const rerender = () => openGuild();
  if (GD.tab === "bounty") {
    body = `<div class="dim center">완료 후 다시 받을 수 있는 현상금입니다</div><div class="qlist">${guildList(save).map(({ def: d, st }) => { const pr = st ? Math.min(d.goal.n, st.p) : 0; return `<div class="qrow"><div class="qi"><b>${d.title}</b><div class="dim">${d.desc}</div><small>보상: ${fmtN(d.reward.gold)}G · 강화석 ${d.reward.ore}</small>${st ? `<div class="bar"><i style="width:${(pr / d.goal.n) * 100}%"></i><span>${pr}/${d.goal.n}</span></div>` : ""}</div>${!st ? `<button class="btn pri" data-a="gacc" data-id="${d.id}">의뢰 받기</button>` : st.state === "done" ? `<button class="btn pri" data-a="gclaim" data-id="${d.id}">보상 받기</button>` : `<span class="dim">진행 중</span>`}</div>`; }).join("")}</div>`;
  } else if (!SRV.on) body = `<div class="center pad dim">서버에 로그인해야 이용할 수 있습니다.</div><div class="pbtns"><button class="btn pri" data-a="gl">로그인</button></div>`;
  else if (GD.tab === "rank") {
    const k = GD.rk || "rift", r = await api("/api/rank?k=" + k);
    body = `<div class="itbar">${[["rift", "균열 최고층"], ["endless", "무한 균열"], ["level", "레벨"]].map(([a, n]) => `<button class="tab ${k === a ? "on" : ""}" data-a="rk" data-k="${a}">${n}</button>`).join("")}</div><div class="qlist">${r.err ? `<div class="warn center">${r.err}</div>` : (r.rows || []).map((x, i) => `<div class="qrow"><b style="width:30px">${i + 1}</b><div class="qi">${x.name} ${x.guild ? `<small class="dim">[${x.guild}]</small>` : ""}</div><div>Lv.${x.level} · ${x.rift}층 · 무한 ${x.endless}초</div></div>`).join("")}</div>`;
  } else {
    const r = await api("/api/guild/me");
    if (r.err) body = `<div class="warn center pad">${r.err}</div>`;
    else if (!r.guild) { const l = await api("/api/guild/list"); save.guildLv = 0; body = `<div class="dim center">길드에 가입하면 레벨에 비례해 골드·경험치·MF 보너스를 받습니다 (길드 레벨당 +2% / +2% / +1%)</div><div class="itbar"><input class="txt" id="gd-n" placeholder="새 길드 이름" maxlength="12"><button class="btn xs pri" data-a="gcreate">창설 (${fmtN(l.cost || 20000)}G)</button></div><div class="qlist" style="height:260px">${(l.rows || []).map((g) => `<div class="qrow"><div class="qi"><b>${g.name}</b> <small class="dim">Lv.${g.level} · ${g.members}/30명 · 길드장 ${g.leader}</small></div><button class="btn xs" data-a="gjoin" data-id="${g.id}">가입</button></div>`).join("") || `<div class="dim center pad">아직 길드가 없습니다</div>`}</div>`; }
    else { const g = r.guild; save.guildLv = g.level; const c = await api("/api/guild/chat");
      body = `<div class="cols" style="height:380px"><div class="col" style="width:290px;overflow:auto"><div class="dname">${g.name} <small class="dim">Lv.${g.level}</small></div><div class="dim">경험치 ${fmtN(g.exp)} · 다음 레벨 ${fmtN(Math.pow(g.level, 2) * 50000)}</div><div class="pline">보너스: 골드 +${g.level * 2}% · 경험치 +${g.level * 2}% · MF +${g.level}%</div><div class="itbar"><input class="txt" id="gd-d" type="number" min="100" placeholder="기부 골드" style="width:110px"><button class="btn xs" data-a="gdon">기부</button></div>
        ${g.leader === SRV.name ? `<div class="itbar"><input class="txt" id="gd-m" placeholder="공지" maxlength="60" value="${g.motd || ""}"><button class="btn xs" data-a="gmotd">저장</button></div>` : g.motd ? `<div class="pline">📢 ${g.motd}</div>` : ""}<h3>길드원 ${g.members.length}명</h3>${g.members.map((m) => `<div class="aff">${m.name === g.leader ? "👑 " : ""}${m.name} <small class="dim">Lv.${m.level} · ${m.rift}층</small></div>`).join("")}<div class="pbtns"><button class="btn warn xs" data-a="gleave">탈퇴</button></div></div>
        <div class="col" style="flex:1"><div class="chatbox" id="gd-chat">${(c.rows || []).map((m) => `<div><b>${m.name}</b>: ${m.msg.replace(/</g, "&lt;")}</div>`).join("")}</div><div class="itbar" style="margin-top:6px"><input class="txt" id="gd-msg" placeholder="메시지" maxlength="80" style="flex:1"><button class="btn xs pri" data-a="gsend">전송</button></div></div></div>`; }
  }
  Modal.open(`<h2>길드</h2>${tabs}${body}`, { cls: "wide", on: {
    gdtab: (el) => { GD.tab = el.dataset.t; rerender(); }, gl: () => loginDialog(rerender), rk: (el) => { GD.rk = el.dataset.k; rerender(); },
    gacc: (el) => { guildAccept(save, el.dataset.id); snd("quest"); saveGame(); rerender(); },
    gclaim: (el) => { const r = guildClaim(save, el.dataset.id); if (r) { snd("quest"); toast("보상을 받았습니다", "ok"); saveGame(); refreshTop(); } rerender(); },
    gcreate: async () => { const n = $("#gd-n").value.trim(); if (save.gold < 20000) return toast("골드가 부족합니다 (20,000G)", "bad"); const r = await api("/api/guild/create", { name: n }); if (r.err) return toast(r.err, "bad"); save.gold -= 20000; saveGame(); refreshTop(); toast("길드를 만들었습니다", "ok"); snd("legend"); rerender(); },
    gjoin: async (el) => { const r = await api("/api/guild/join", { id: +el.dataset.id }); if (r.err) return toast(r.err, "bad"); toast("길드에 가입했습니다", "ok"); rerender(); },
    gleave: () => askConfirm("길드를 탈퇴할까요?", "탈퇴", async () => { const r = await api("/api/guild/leave", {}); if (r.err) return toast(r.err, "bad"); save.guildLv = 0; rerender(); }),
    gdon: async () => { const v = Math.floor(+$("#gd-d").value); if (!(v >= 100) || v > save.gold) return toast("기부할 수 없는 금액입니다", "bad"); const r = await api("/api/guild/donate", { gold: v }); if (r.err) return toast(r.err, "bad"); save.gold -= v; saveGame(); refreshTop(); snd("coin"); toast(`${fmtN(v)}G를 기부했습니다`, "ok"); rerender(); },
    gmotd: async () => { await api("/api/guild/motd", { motd: $("#gd-m").value }); toast("공지를 저장했습니다"); },
    gsend: async () => { const m = $("#gd-msg").value; if (!m.trim()) return; await api("/api/guild/chat", { msg: m }); rerender(); },
  } });
  const ch = $("#gd-chat"); if (ch) ch.scrollTop = ch.scrollHeight;
}
