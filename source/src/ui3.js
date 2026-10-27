// =========================================================
// UI v3: 장비 창 / 스탯 창 / 일괄 정리 / 도감 / 스킬 정비 / 패시브 트리 / 균열 탑
// =========================================================
const tierOfItem = (it) => (it.uniq ? it.utier || (UNIQUE_BY_ID[it.uniq] ? UNIQUE_BY_ID[it.uniq].tier : 1) : 0);
const tcls = (it) => (it.uniq ? "ut" + tierOfItem(it) : RCLS(it));
const presetUids = () => { const s = new Set(); for (const p of save.presets || []) if (p) for (const k in p.equip) s.add(p.equip[k]); return s; };
const inPreset = (it) => presetUids().has(it.uid);
const isEquipped = (it) => EQ_SLOTS.some((k) => save.equipped[k] === it);
const eqKey = (it) => EQ_SLOTS.find((k) => save.equipped[k] === it);
const isProtected = (it) => protectedItem(save, it);
function tileHtml(it, o) {
  o = o || {}; const t = tierOfItem(it), col = itemColor(it);
  return `<div class="tile ${tcls(it)} ${o.sel ? "sel" : ""}" ${col ? `style="border-color:${col}"` : ""} ${o.attr || ""} title="${itemName(it)}">${ITEM_ICON(it)}<small>${it.ilvl}</small>${it.enh ? `<em>+${it.enh}</em>` : ""}${o.up !== false && isUpgrade(save, it) ? `<i class="mk up">▲</i>` : ""}${it.lock ? `<i class="mk lk">🔒</i>` : ""}${o.up !== false && !isEquipped(it) && !canEquip(save, it) ? `<i class="mk rq" title="장착 레벨 부족">Lv.${reqLevel(it.ilvl)}</i>` : ""}${inPreset(it) ? `<i class="mk pr">P</i>` : ""}${t === 4 ? `<i class="sp1 a">✦</i><i class="sp1 b">✧</i>` : ""}${t === 3 ? `<i class="crown">♛</i>` : ""}</div>`;
}
function itemTitle(it) {
  if (it.uniq) return `<span class="tn${tierOfItem(it)}">${it.enh ? "+" + it.enh + " " : ""}${itemName(it)}</span>`;
  return `<span class="${RCLS(it)}" ${itemColor(it) ? `style="color:${itemColor(it)}"` : ""}>${it.enh ? "+" + it.enh + " " : ""}${itemName(it)}</span>`;
}
const BASE_LBL = { atk: "공격력", mag: "주문력", hp: "체력", def: "방어력" };
const baseText = (it) => Object.keys(it.base).map((k) => `${BASE_LBL[k]} ${fmtN(it.base[k] * (1 + 0.08 * (it.enh || 0)))}`).join(" · ");
function affRangeText(it, a) {   // 옵션 수치 범위 (최소 ~ 최대)
  const d = AFFIXES.find((x) => x.k === a.k); if (!d) return ""; const [lo, hi] = affixRange(d, it.ilvl, Math.min(it.rarity, 4));
  const f = (v) => (d.count ? "+" + Math.round(v) : d.pct ? (v * 100).toFixed(Math.abs(v) < 0.02 ? 2 : 1) + "%" : fmtN(v));
  return ` <small class="rng">(${f(lo)} ~ ${f(hi)})</small>`;
}
function affText(a) { const d = AFFIXES.find((x) => x.k === a.k); if (!d) return a.k; const s = d.count ? "+" + Math.round(a.v) : d.pct ? (a.v >= 0 ? "+" : "") + (a.v * 100).toFixed(Math.abs(a.v) < 0.02 ? 2 : 1) + "%" + (d.unit || "") : "+" + fmtN(a.v); return `${d.name} ${s}`; }

// ---------- 장비 창 ----------
const IB = { mode: "inv", tab: "all", sel: null, rar: -1, sort: "rar", lockOnly: false };
function equipItem(it, key) {   // 반지는 비어 있는 칸에 먼저, 둘 다 차 있으면 지정한 칸(없으면 반지 1)과 교체
  key = key || (it.slot === "ring" ? (!save.equipped.ring ? "ring" : !save.equipped.ring2 ? "ring2" : "ring") : it.slot);
  const old = save.equipped[key]; save.inv = save.inv.filter((x) => x !== it); if (old) save.inv.push(old); save.equipped[key] = it;
}
function unequipSlot(slot) { const it = save.equipped[slot]; if (it) { save.inv.push(it); delete save.equipped[slot]; } }
function openItems(mode) { IB.mode = mode; if (!IB.sel || (!save.inv.includes(IB.sel) && !EQ_SLOTS.some((s) => save.equipped[s] === IB.sel))) IB.sel = null; renderItems(); }
function itemDetail(it) {
  if (!it) return `<div class="dim center pad">아이템을 선택하세요</div>`;
  const eq = isEquipped(it), prot = isProtected(it), st = setOf(it), t = tierOfItem(it);
  let h = `<div class="dname">${ITEM_ICON(it)} ${itemTitle(it)}</div>`;
  if (it.uniq) { const D = UNIQUE_BY_ID[it.uniq], T = U_TIERS[t]; h += `<span class="ribbon rb${t}">${T.name} 고유${D ? " · " + U_POOLS[D.pool] : ""}</span>`; }
  h += `<div class="dim">Lv.${it.ilvl} ${SLOT_NAME[it.slot]}${eq ? " · 착용 중" : ""}${it.lock ? " · 🔒 잠금" : ""}${inPreset(it) ? " · 프리셋 포함" : ""}</div><div class="base">${baseText(it)}</div><div class="${canEquip(save, it) ? "dim" : "warn"}">장착 레벨 Lv.${reqLevel(it.ilvl)}${canEquip(save, it) ? "" : " (부족)"}</div><div class="dim">판매가 ${fmtN(itemValue(it))}G · 분해 ${fmtN(dismantleYield(it).gold)}G + 강화석 ${dismantleYield(it).ore}</div>`;
  if (it.uniq) { const D = UNIQUE_BY_ID[it.uniq]; h += `<div class="udet d${t}">${uniqueLines(D, it.umods, true).map((x) => `<div>✦ ${x}</div>`).join("")}${D ? `<div class="flav">“${D.flavor}”</div>` : ""}</div>`; }
  h += `<div class="affs">` + it.affixes.map((a, i) => `<div class="aff">${affText(a)}${affRangeText(it, a)}${IB.mode === "forge" ? ` <button class="btn xs" data-a="reroll" data-i="${i}" title="옵션 재굴림">↻ ${fmtN(rerollCost(it).gold)}G ${rerollCost(it).ore}석</button>` : ""}</div>`).join("") + `</div>`;
  if (st) { const sc = setCounts(save)[st.id] || 0; h += `<div class="sets" style="color:${st.color}">${st.name} (${sc}/${st.pieces.length})` + [2, 4, 6].filter((x) => st.bonus[x]).map((x) => `<div class="${sc >= x ? "on" : "off"}">${x}세트: ${st.text[x]}</div>`).join("") + `</div>`; }
  if (!eq) { const p0 = playerPower(computeStats(save)), p1 = Math.max(...slotKeys(it.slot).map((k) => powerWith(save, k, it))), d = p1 / p0 - 1; h += `<div class="cmp ${d >= 0 ? "up" : "dn"}">${canEquip(save, it) ? "" : "레벨 도달 시 "}전투력 ${d >= 0 ? "▲" : "▼"} ${Math.abs(d * 100).toFixed(1)}%</div>`; }
  h += `<div class="dbtns">`;
  h += `<button class="btn" data-a="lock">${it.lock ? "🔓 잠금 해제" : "🔒 잠금"}</button>`;
  if (IB.mode === "inv") h += eq ? `<button class="btn" data-a="unequip">해제</button>` : it.slot === "ring" ? (canEquip(save, it) ? `<button class="btn pri" data-a="equip" data-k="ring">반지 1 장착</button><button class="btn pri" data-a="equip" data-k="ring2">반지 2 장착</button>` : `<button class="btn" disabled>Lv.${reqLevel(it.ilvl)} 필요</button>`) : (canEquip(save, it) ? `<button class="btn pri" data-a="equip">장착</button>` : `<button class="btn" disabled>Lv.${reqLevel(it.ilvl)} 필요</button>`);
  if (IB.mode === "forge") {
    const c = enhCost(it), rate = ENH_RATE[it.enh || 0], y = dismantleYield(it);
    h += (it.enh || 0) >= 10 ? `<button class="btn" disabled>최대 강화</button>` : `<button class="btn pri" data-a="enh">강화 +${(it.enh || 0) + 1} (${Math.round(rate * 100)}%)<br><small>${fmtN(c.gold)}G · 강화석 ${c.ore}</small></button>`;
    h += `<button class="btn" data-a="dis" ${prot ? "disabled" : ""}>분해<br><small>${fmtN(y.gold)}G · 강화석 ${y.ore}</small></button>`;
    h += `<button class="btn orbb" data-a="chaos" ${it.uniq || it.affixes.length >= 6 || save.orbC < 1 ? "disabled" : ""}>혼돈 구슬 ×${save.orbC}<br><small>옵션 1개 추가 (${it.affixes.length}/6)</small></button>`;
    { const D = it.uniq && UNIQUE_BY_ID[it.uniq], can = it.uniq ? !!(D && D.mods.some((m) => Array.isArray(m[1]))) : it.affixes.length > 0; h += `<button class="btn orbb dice" data-a="dice" ${!can || (save.dice || 0) < 1 ? "disabled" : ""}>🎲 공허의 주사위 ×${save.dice || 0}<br><small>${it.uniq ? "고유 능력 수치를 범위 내에서 재굴림" : "옵션 수치를 범위 내에서 재굴림"}</small></button>`; }
    h += `<button class="btn orbb" data-a="divine" ${it.uniq || !it.affixes.length || save.orbD < 1 ? "disabled" : ""}>신성한 구슬 ×${save.orbD}<br><small>옵션 수치 재굴림</small></button>`;
  }
  if (IB.mode === "shop") { const y = dismantleYield(it); h += `<button class="btn pri" data-a="sell" ${prot ? "disabled" : ""}>판매 ${fmtN(itemValue(it))}G</button><button class="btn" data-a="dis" ${prot ? "disabled" : ""}>분해<br><small>${fmtN(y.gold)}G · 강화석 ${y.ore}</small></button>`; }
  if (IB.mode === "inv") { const y = dismantleYield(it); h += `<button class="btn pri" data-a="sell" ${prot ? "disabled" : ""}>판매<br><small>${fmtN(itemValue(it))}G</small></button><button class="btn" data-a="dis" ${prot ? "disabled" : ""}>분해<br><small>${fmtN(y.gold)}G · 강화석 ${y.ore}</small></button>`; }
  if (IB.mode === "inv" && SRV.on && !prot) h += `<button class="btn" data-a="ahpost">경매 등록</button>`;
  return h + `</div>`;
}
function renderItems() {
  const m = IB.mode, title = { inv: "장비", forge: "대장간", shop: "상점 · 창고" }[m];
  let list = save.inv.filter((it) => (IB.tab === "all" || it.slot === IB.tab) && (IB.rar < 0 || it.rarity === IB.rar) && (!IB.lockOnly || it.lock));
  const ups = new Map(); if (IB.sort === "up") for (const it of list) ups.set(it, Math.max(...slotKeys(it.slot).map((k) => powerWith(save, k, it))));
  list.sort(IB.sort === "ilvl" ? (a, b) => b.ilvl - a.ilvl || b.rarity - a.rarity : IB.sort === "up" ? (a, b) => ups.get(b) - ups.get(a) : (a, b) => b.rarity - a.rarity || tierOfItem(b) - tierOfItem(a) || b.ilvl - a.ilvl || (b.enh || 0) - (a.enh || 0));
  const eqCol = `<div class="doll">` + EQ_SLOTS.map((s) => { const it = save.equipped[s]; return it ? `<div class="eqs ${tcls(it)} ${IB.sel === it ? "sel" : ""}" ${itemColor(it) ? `style="border-color:${itemColor(it)}"` : ""} data-a="pick" data-u="${it.uid}">${ITEM_ICON(it)}<small>${it.enh ? "+" + it.enh : ""}</small>${tierOfItem(it) === 4 ? `<i class="sp1 a">✦</i><i class="sp1 b">✧</i>` : ""}<span class="lbl">${SLOT_NAME[s]}</span></div>` : `<div class="eqs empty">${iconImg(slotType(s), 2, "ghost")}<span class="lbl">${SLOT_NAME[s]}</span></div>`; }).join("") + `</div>`;
  const nUp = save.inv.filter((it) => isUpgrade(save, it)).length;
  const left = m === "inv" ? `<button class="btn pri wide1" data-a="recommend" ${nUp ? "" : "disabled"}>추천 장비 착용 ${nUp ? `<i class="tri">▲${nUp}</i>` : ""}</button>${presetRow()}<button class="btn wide1" data-a="openstat">스탯 보기</button>` : `<div class="pad dim">${m === "forge" ? "강화 실패 시 강화석 일부만 소모됩니다.<br>혼돈 구슬은 균열·지옥·무한 균열에서 얻습니다." : "판매·분해로 골드와 강화석을 얻습니다. 잠금·프리셋 장비는 팔리지 않습니다."}</div>`;
  const tabs = ["all", ...SLOTS].map((t) => `<button class="tab ${IB.tab === t ? "on" : ""}" data-a="tab" data-t="${t}">${t === "all" ? "전체" : SLOT_NAME[t]}</button>`).join("");
  const bar = `<div class="itbar"><select data-i="frar"><option value="-1">전체 등급</option>${ITEM_RARITY.map((r, i) => `<option value="${i}" ${IB.rar === i ? "selected" : ""}>${r.name}</option>`).join("")}</select><select data-i="fsort"><option value="rar" ${IB.sort === "rar" ? "selected" : ""}>등급순</option><option value="ilvl" ${IB.sort === "ilvl" ? "selected" : ""}>레벨순</option><option value="up" ${IB.sort === "up" ? "selected" : ""}>전투력순</option></select><button class="tab ${IB.lockOnly ? "on" : ""}" data-a="flock">🔒만</button><button class="btn xs" data-a="bulk">일괄 정리</button></div>`;
  const html = `<h2>${title}</h2><div class="res">${iconImg("gold", 1)} ${fmtN(save.gold)} &nbsp; ${iconImg("ore", 1)} ${fmtN(save.ore)} &nbsp; ${iconImg("orb", 1)} ${save.orbC} / ${save.orbD} &nbsp; 🎲 ${save.dice || 0}</div>
  <div class="cols"><div class="col c1">${eqCol}${left}</div>
  <div class="col c2"><div class="tabs">${tabs}</div>${bar}<div class="grid">${list.map((it) => tileHtml(it, { sel: IB.sel === it, attr: `data-a="pick" data-u="${it.uid}"` })).join("") || `<div class="dim pad">비어 있습니다</div>`}</div><div class="dim">${save.inv.length} / ${CFG.INV_MAX}</div></div>
  <div class="col c3">${itemDetail(IB.sel)}</div></div>`;
  const find = (el) => { const u = +el.dataset.u; return save.inv.find((x) => x.uid === u) || EQ_SLOTS.map((s) => save.equipped[s]).find((x) => x && x.uid === u); };
  const done = () => { saveGame(); refreshTop(); renderItems(); };
  Modal.open(html, { cls: "wide", on: Object.assign({
    pick: (el) => { IB.sel = find(el); renderItems(); }, tab: (el) => { IB.tab = el.dataset.t; renderItems(); },
    frar: (el) => { IB.rar = +el.value; renderItems(); }, fsort: (el) => { IB.sort = el.value; renderItems(); }, flock: () => { IB.lockOnly = !IB.lockOnly; renderItems(); },
    lock: () => { IB.sel.lock = !IB.sel.lock; snd("click"); done(); },
    equip: (el) => { if (!canEquip(save, IB.sel)) { toast(`장착 레벨 Lv.${reqLevel(IB.sel.ilvl)} 이상이 필요합니다`, "bad"); snd("error"); return; } equipItem(IB.sel, el.dataset.k || null); snd("equip"); done(); }, unequip: () => { unequipSlot(eqKey(IB.sel)); done(); },
    recommend: () => { const ch = recommendEquip(save); if (ch.length) { snd("equip"); toast(`추천 장비로 ${ch.length}칸을 교체했습니다`, "ok"); } done(); },
    openstat: () => { Modal.onClose = null; openStats(); },
    enh: () => { const r = enhance(save, IB.sel); toast(r.msg, r.success ? "ok" : "bad"); snd(r.success ? "enh_ok" : r.ok ? "enh_fail" : "error"); saveGame(); renderItems(); },
    dis: () => { if (isProtected(IB.sel)) return; const y = dismantleItem(save, IB.sel); toast(`분해: +${fmtN(y.gold)}G, 강화석 +${y.ore}`); snd("coin"); IB.sel = null; done(); },
    sell: () => { if (isProtected(IB.sel)) return; const v = itemValue(IB.sel); sellItem(save, IB.sel); toast(`+${fmtN(v)}G`); snd("coin"); IB.sel = null; done(); },
    bulk: () => openBulk(),
    ahpost: () => ahPostDialog(IB.sel),
    reroll: (el) => { if (rerollAffix(save, IB.sel, +el.dataset.i)) { snd("enh_ok"); toast("옵션이 바뀌었습니다"); } else { snd("error"); toast("재료가 부족합니다", "bad"); } saveGame(); renderItems(); },
    chaos: () => { const a = addAffix(save, IB.sel); if (a) { snd("orb"); toast(`옵션 추가: ${a.name}`, "ok"); } else snd("error"); done(); },
    dice: () => { if (diceItem(save, IB.sel)) { snd("orb"); toast("공허의 주사위! 수치가 범위 안에서 다시 굴려졌습니다", "ok"); } else snd("error"); done(); },
    divine: () => { if (divineItem(save, IB.sel)) { snd("orb"); toast("옵션 수치가 다시 굴려졌습니다", "ok"); } else snd("error"); done(); },
  }, presetHandlers(renderItems)) });
}

// ---------- 일괄 정리 ----------
const BK = { rar: [true, true, false, false, false], slots: Object.fromEntries(SLOTS.map((x) => [x, true])), minIlvl: 1, maxIlvl: 99, keepUp: true, act: "sell", sets: false };
function bulkList() {
  return save.inv.filter((it) => !it.uniq && BK.rar[it.rarity] && BK.slots[it.slot] && it.ilvl >= BK.minIlvl && it.ilvl <= BK.maxIlvl && !isProtected(it) && !(BK.keepUp && isUpgrade(save, it)));
}
function bulkCnt() { const l = bulkList(), g = l.reduce((a, it) => a + (BK.act === "sell" ? itemValue(it) : dismantleYield(it).gold), 0), o = l.reduce((a, it) => a + (BK.act === "dis" ? dismantleYield(it).ore : 0), 0), e = $("#bcnt"); if (e) e.innerHTML = `대상 <b>${l.length}</b>개 → ${fmtN(g)}G${o ? ` · 강화석 ${o}` : ""}`; const b = document.querySelector('[data-a="bgo"]'); if (b) b.disabled = !l.length; }
function openBulk() {
  const l = bulkList(), g = l.reduce((a, it) => a + (BK.act === "sell" ? itemValue(it) : dismantleYield(it).gold), 0), o = l.reduce((a, it) => a + (BK.act === "dis" ? dismantleYield(it).ore : 0), 0);
  Modal.open(`<h2>일괄 정리</h2><div class="dim center">잠금·프리셋·착용 중인 장비와 고유 장비는 제외됩니다</div>
  <div class="pad"><div>등급 ${ITEM_RARITY.slice(0, 5).map((r, i) => `<label style="margin-right:8px;white-space:nowrap"><input type="checkbox" data-i="brar" data-n="${i}" ${BK.rar[i] ? "checked" : ""}> ${r.name}</label>`).join("")}</div>
  <div style="margin-top:8px">부위 ${SLOTS.map((x) => `<label style="margin-right:8px;white-space:nowrap"><input type="checkbox" data-i="bslot" data-n="${x}" ${BK.slots[x] ? "checked" : ""}> ${SLOT_NAME[x]}</label>`).join("")} <button class="btn xs" data-a="ball">전체</button><button class="btn xs" data-a="bnone">해제</button></div>
  <div style="margin-top:8px">아이템 레벨 <input class="txt" style="width:56px" type="number" min="1" max="99" value="${BK.minIlvl}" data-i="bmin"> ~ <input class="txt" style="width:56px" type="number" min="1" max="99" value="${BK.maxIlvl}" data-i="bilvl"> &nbsp; <label style="white-space:nowrap"><input type="checkbox" data-i="bup" ${BK.keepUp ? "checked" : ""}> ▲ 장비 제외</label></div>
  <div style="margin-top:8px">방식 <select data-i="bact"><option value="sell" ${BK.act === "sell" ? "selected" : ""}>판매 (골드)</option><option value="dis" ${BK.act === "dis" ? "selected" : ""}>분해 (골드+강화석)</option></select></div></div>
  <div class="center pad" id="bcnt">대상 <b>${l.length}</b>개 → ${fmtN(g)}G${o ? ` · 강화석 ${o}` : ""}</div><div class="pbtns"><button class="btn pri" data-a="bgo" ${l.length ? "" : "disabled"}>실행</button><button class="btn" data-a="bback">돌아가기</button></div>`, { cls: "sm", on: {
    brar: (el) => { BK.rar[+el.dataset.n] = el.checked; openBulk(); }, bslot: (el) => { BK.slots[el.dataset.n] = el.checked; openBulk(); }, ball: () => { SLOTS.forEach((x) => (BK.slots[x] = true)); openBulk(); }, bnone: () => { SLOTS.forEach((x) => (BK.slots[x] = false)); openBulk(); }, bmin: (el) => { BK.minIlvl = Math.max(1, +el.value || 1); bulkCnt(); }, bilvl: (el) => { BK.maxIlvl = Math.max(1, +el.value || 99); bulkCnt(); }, bup: (el) => { BK.keepUp = el.checked; openBulk(); }, bact: (el) => { BK.act = el.value; openBulk(); },
    bgo: () => { const l2 = bulkList(); let gg = 0, oo = 0; for (const it of l2) { if (BK.act === "sell") { gg += itemValue(it); removeItem(save, it); } else { const y = dismantleYield(it); gg += y.gold; oo += y.ore; removeItem(save, it); } } save.gold += gg; save.ore += oo; toast(`${l2.length}개 정리 +${fmtN(gg)}G${oo ? ` · 강화석 ${oo}` : ""}`, "ok"); snd("coin"); IB.sel = null; saveGame(); refreshTop(); renderItems(); },
    bback: () => renderItems(),
  } });
}

// ---------- 스탯 창 ----------
function openStats() {
  const s = computeStats(save), P = (v, d) => (v * 100).toFixed(d == null ? 1 : d) + "%", N = fmtN;
  const G = (title, rows) => `<div class="sg"><h4>${title}</h4>${rows.filter(Boolean).map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join("")}</div>`;
  const elems = ELEMS.map((e) => [ELEM_NAME[e] + " 피해", P(s[e + "Dmg"], 0)]);
  const pd = powerDetail(s), tot = pd.skills.reduce((a, x) => a + x.dps, 0) || 1;
  const pw = G("전투력", [["전투력", `<b style="color:#ffe08a">${N(playerPower(s))}</b>`], ["예상 초당 피해", N(pd.dps)], ...pd.skills.map((x) => [`${x.name} <small class="dim">${x.mag ? "마법" : "물리"}${x.dot > 0.05 ? " · 지속" : ""}${x.paid ? "" : " · 마나 0"}</small>`, `${N(x.dps)} (${Math.round(x.dps / tot * 100)}%)`]), pd.demand > 0 ? ["마나 가동률", `${Math.round(pd.manaFactor * 100)}% <small class="dim">재생 ${pd.supply.toFixed(1)}/s · 소모 ${pd.demand.toFixed(1)}/s</small>`] : null, pd.buff > 1.001 ? ["버프 효과", "×" + pd.buff.toFixed(2)] : null, ["유효 체력", N(pd.ehp)]]);
  Modal.open(`<h2>스탯</h2><div class="statgrid">${pw}
   ${G("공격", [["물리 공격력", N(s.atk)], ["주문력", N(s.mag)], ["물리 피해", P(s.physDmg, 0)], ["마법 피해", P(s.magDmg, 0)], ["주는 피해", P(s.allDmg, 0)], ["물리 치명타", `${P(s.critChance)} / +${P(s.critDmg, 0)}`], ["주문 치명타", s.magCrit ? `${P(s.critChance + s.spellCrit)} (물리와 동일)` : P(s.spellCrit)], ["쿨타임 감소", P(s.cdr)], ["생명력 흡수", P(s.lifesteal)]])}
   ${G("방어", [["체력", N(s.maxHp)], ["방어력", N(s.def)], ["회피", P(s.dodge)], ["받는 피해", (s.dmgTaken > 0 ? "+" : "") + P(s.dmgTaken, 0)], s.regen ? ["초당 회복", P(s.regen)] : null, s.revive ? ["부활", s.revive + "회"] : null, s.manaShield ? ["마나 방패", P(s.manaShield, 0)] : null])}
   ${G("마나", [["최대 마나", N(s.maxMana)], s.manaHit ? ["마나 흡수", P(s.manaHit, 2) + " / 적중 (최대 10회/초)"] : null, ["초당 재생", `${(s.maxMana * s.manaRate).toFixed(1)} (${P(s.manaRate)})`], ["마나 소모 감소", P(Math.min(0.6, s.manaCostRed), 0)], s.manaToSpell ? ["마나 → 주문력", P(s.manaToSpell, 0)] : null, ["스킬 필요 마나/초", s.manaNeed.toFixed(1)]])}
   ${G("속성 · 관통", [...elems, ["원소 피해", P(s.elemDmg, 0)], ["속성 저항 관통", P(s.penElem, 0)], ["방어 무시", P(s.ignoreDef, 0)], ["마법저항 무시", P(s.ignoreRes, 0)], ["대상 방어력 감소", P(s.shredDef, 0)], ["대상 마법저항 감소", P(s.shredRes, 0)]])}
   ${G("추가 피해 · 범위", [["보스", P(s.add.boss, 0)], ["정예", P(s.add.elite, 0)], ["원거리", P(s.add.ranged, 0)], ["일반", P(s.add.normal, 0)], ["광역 피해", P(s.aoeDmg, 0)], ["번개 도약", "+" + s.chainJumps], ["레인", s.lanes], ["칸당 몹 수", s.stackCap]])}
   ${G("획득", [["MF (표시/실효)", `${P(s.mf, 0)} / ${P(mfEff(s.mf + atlasVal(save, "mf")), 0)}`], ["골드 획득", P(s.goldFind, 0)], ["경험치 획득", P(s.expFind, 0)], ["스킬 구성", `물리 ${Math.round((1 - s.mix) * 100)}% · 마법 ${Math.round(s.mix * 100)}%`], ["전투력", N(playerPower(s))]])}
  </div>`, { cls: "wide" });
}

// ---------- 스킬 정비 (카드형) ----------
const skCost = (sk, st) => Math.round((sk.mana || 0) * st.manaCostMul * 10) / 10;
function skTags(sk, st) {
  const nm = { phys: "물리", mag: "마법", buff: "버프", heal: "회복" }[sk.dtype] || "물리", cl = { phys: "phys", mag: "mag", buff: "buff", heal: "buff" }[sk.dtype] || "phys";
  return `<span class="chip ${cl}">${nm}</span>${sk.elem ? `<span class="chip" style="background:${ELEM_COLOR[sk.elem]}33;color:${ELEM_COLOR[sk.elem]}">${ELEM_NAME[sk.elem]}</span>` : ""}<span class="chip mana">마나 ${skCost(sk, st)}</span>`;
}
function openSkills() {
  const st = computeStats(save), lo = save.loadout, used = new Set(lo.filter(Boolean).map((l) => l.uid));
  const cards = [0, 1, 2, 3].map((i) => {
    if (i >= save.slots) return `<div class="skc locked ${SK.slot === i ? "cursel" : ""}"><div class="sn">${i + 1}</div><div style="font-size:26px;margin:14px 0 4px">🔒</div><small class="dim">${SLOT_HINT[i]}</small></div>`;
    const l = lo[i], inst = l && save.skills.find((x) => x.uid === l.uid);
    if (!inst) return `<div class="skc ${SK.slot === i ? "cursel" : ""}" data-a="slot" data-s="${i}"><div class="sn">${i + 1}</div><div class="dim" style="margin-top:32px">비어 있음</div></div>`;
    const sk = skillOf(inst);
    return `<div class="skc ${SK.slot === i ? "cursel" : ""}" data-a="slot" data-s="${i}"><div class="sn">${i + 1}</div>${skIcon(sk.id, 3)}<div class="sname">${skillTitle(inst)}</div><div>${skTags(sk, st)}</div><small class="dim">쿨 ${sk.cd.toFixed(1)}초 · 피해 ${Math.round(sk.mult * 100)}%</small>
      <select data-i="rule" data-s="${i}">${RULE_ORDER.map((r) => `<option value="${r}" ${l.rule === r ? "selected" : ""}>${RULES[r]}</option>`).join("")}</select>${i > 0 ? `<button class="btn xs" data-a="clear" data-s="${i}">해제</button>` : ""}</div>`;
  }).join("");
  const want = SK.slot === 0 ? "basic" : "active";
  const owned = save.skills.filter((x) => SKILLS.find((d) => d.id === x.id).slot === want).sort((a, b) => b.rarity - a.rarity);
  const row = (inst) => { const sk = skillOf(inst), d = sk.def, eqi = lo.findIndex((l) => l && l.uid === inst.uid);
    return `<div class="skrow ${used.has(inst.uid) ? "used" : ""} ${SK.sel === inst.uid ? "picked" : ""}" data-a="picksk" data-u="${inst.uid}">${skIcon(d.id, 2)}${skillAreaHtml(sk, 9)}<div class="sinfo"><div>${skillTitle(inst)} ${skTags(sk, st)} <small class="dim">Lv.${inst.lvl || 1}${eqi >= 0 ? " · " + (eqi + 1) + "번 칸 장착 중" : ""}</small></div><small class="dim">피해 ${Math.round(sk.mult * 100)}% · 쿨 ${sk.cd.toFixed(1)}s${sk.rune ? " · " + sk.rune.name : ""}</small></div></div>`; };
  const sel = save.skills.find((x) => x.uid === SK.sel), det = (() => {
    if (!sel) return `<div class="skdet"><div class="dim center pad">스킬을 클릭하면 설명이 보이고,<br>[장착] 버튼으로 ${SK.slot + 1}번 칸에 장착합니다</div></div>`;
    const sk = skillOf(sel), d = sk.def, eqi = lo.findIndex((l) => l && l.uid === sel.uid), pc = promoteCost(sel), typeOk = d.slot === want, slotOk = SK.slot < save.slots;
    const bon = Object.keys(sk.bonus).map((k) => `${{ boss: "보스", elite: "정예", ranged: "원거리", normal: "일반" }[k]} +${Math.round(sk.bonus[k] * 100)}%`).join(", ");
    return `<div class="skdet"><div class="dh">${skIcon(d.id, 3)}<div><b>${skillTitle(sel)}</b><div>${skTags(sk, st)}</div><small class="dim">Lv.${sel.lvl || 1}${sk.rune ? " · " + sk.rune.name : ""}${eqi >= 0 ? " · " + (eqi + 1) + "번 칸 장착 중" : ""}</small></div></div>
      <div class="dbtns"><button class="btn pri" data-a="equipsk" data-u="${sel.uid}" ${typeOk && slotOk && eqi !== SK.slot ? "" : "disabled"}>${typeOk ? (eqi === SK.slot ? `${SK.slot + 1}번 칸 장착 중` : `${SK.slot + 1}번 칸에 장착`) : want === "basic" ? "1번 칸 전용 아님" : "기본 공격 스킬"}</button>${eqi > 0 ? `<button class="btn" data-a="clear" data-s="${eqi}">해제</button>` : ""}
      <button class="btn" data-a="hone" data-u="${sel.uid}" ${(sel.lvl || 1) >= SKILL_MAX_LV || save.hone < honeCost(sel.lvl || 1) ? "disabled" : ""}>레벨업<br><small>${(sel.lvl || 1) >= SKILL_MAX_LV ? "MAX" : "연마석 " + honeCost(sel.lvl || 1)}</small></button><button class="btn" data-a="rune" data-u="${sel.uid}">${sk.rune ? `<span style="color:${sk.rune.color}">${sk.rune.name}</span>` : "룬 장착"}</button>
      ${sel.rarity < 2 && save.endgame ? `<button class="btn" data-a="promo" data-u="${sel.uid}" ${save.shards >= pc ? "" : "disabled"}>승급<br><small>${pc} 조각</small></button>` : ""}<button class="btn" data-a="sellsk" data-u="${sel.uid}" ${eqi >= 0 || skillInPreset(save, sel) ? "disabled" : ""}>판매<br><small>${eqi >= 0 ? "장착 중" : fmtN(skillSellValue(sel)) + "G" + (skillInPreset(save, sel) ? " · 프리셋 포함" : "")}</small></button>${SRV.on ? `<button class="btn" data-a="ahpostsk" data-u="${sel.uid}" ${eqi >= 0 ? "disabled" : ""}>경매 등록${eqi >= 0 ? "<br><small>장착 중</small>" : ""}</button>` : ""}</div>
      <div class="dd">${skillAreaHtml(sk, 11)}<div>${skillDescFull(sk, st)}</div><div class="dim" style="margin-top:4px">${d.desc}${bon ? " · " + bon : ""}</div></div></div>`;
  })();
  Modal.open(`<h2>스킬 정비소</h2><div class="res">연마석 ${fmtN(save.hone)} · 룬 ${save.runes.length}</div>${presetRow()}<div class="dim center">마나 ${fmtN(st.maxMana)} · 초당 ${(st.maxMana * st.manaRate).toFixed(1)} 재생 · 스킬 소모 ${st.manaNeed.toFixed(1)}/초 &nbsp;|&nbsp; 적을 클릭하면 모든 스킬이 그 적을 우선 공격합니다</div><div class="skcards">${cards}</div>
  <h3>${SK.slot + 1}번 칸용 스킬 (${want === "basic" ? "기본 공격" : "액티브"}) <small class="dim">클릭해서 확인 → [장착] · 스킬 상점에서 골드로 구매할 수 있어요</small></h3><div class="skbot"><div class="slist skgrid">${owned.map(row).join("") || `<div class="dim pad">보유한 스킬이 없습니다</div>`}</div>${det}</div>`, { cls: "wide", on: Object.assign({
    slot: (el) => { SK.slot = +el.dataset.s; const l = save.loadout[SK.slot]; SK.sel = l ? l.uid : null; if (l) snd("click"); openSkills(); },   // 장착 중인 스킬 카드를 눌러도 정보가 보인다
    picksk: (el) => { SK.sel = +el.dataset.u; snd("click"); openSkills(); },
    sellsk: (el) => { const inst = save.skills.find((x) => x.uid === +el.dataset.u); if (!inst) return; askConfirm(`${skillTitle(inst)} Lv.${inst.lvl || 1} 을(를) <b style="color:#ffe08a">${fmtN(skillSellValue(inst))}G</b>에 판매할까요?${inst.rune ? "<br>장착된 룬은 보관함으로 돌아옵니다." : ""}`, "판매", () => { const v = sellSkill(save, inst); if (v == null) { toast("장착 중이거나 프리셋에 포함된 스킬은 팔 수 없습니다", "bad"); return; } SK.sel = null; snd("coin"); toast(`+${fmtN(v)}G`, "ok"); saveGame(); refreshTop(); openSkills(); }, false); },
    ahpostsk: (el) => ahPostSkill(save.skills.find((x) => x.uid === +el.dataset.u), openSkills),
    clear: (el, ev) => { ev.stopPropagation(); save.loadout[+el.dataset.s] = null; saveGame(); openSkills(); },
    rule: (el) => { const i = +el.dataset.s; if (save.loadout[i]) save.loadout[i].rule = el.value; saveGame(); },
    equipsk: (el) => { if (SK.slot >= save.slots) return; const u = +el.dataset.u; const j = save.loadout.findIndex((l) => l && l.uid === u); const prev = save.loadout[SK.slot]; if (j >= 0 && j !== SK.slot) save.loadout[j] = j === 0 ? save.loadout[j] : null; save.loadout[SK.slot] = { uid: u, rule: (prev && prev.rule) || "front" }; snd("equip"); toast("장착했습니다", "ok"); saveGame(); openSkills(); },
    promo: (el) => { const inst = save.skills.find((x) => x.uid === +el.dataset.u); const pc = promoteCost(inst); if (save.shards < pc) return; save.shards -= pc; inst.rarity++; snd("legend"); toast("스킬이 승급했습니다!"); saveGame(); openSkills(); },
    hone: (el) => { const inst = save.skills.find((x) => x.uid === +el.dataset.u), cost = honeCost(inst.lvl || 1); if ((inst.lvl || 1) >= SKILL_MAX_LV || save.hone < cost) return; save.hone -= cost; inst.lvl = (inst.lvl || 1) + 1; snd("enh_ok"); toast(`${SKILLS.find((x) => x.id === inst.id).name} Lv.${inst.lvl}`, "ok"); saveGame(); openSkills(); },
    rune: (el) => openRunePicker(+el.dataset.u),
  }, presetHandlers(openSkills)) });
}

// ---------- 패시브 (방사형 트리) ----------
const PT = { sel: null, sc: 0.17, ox: 0, oy: 0, hover: null, drag: null, moved: false, cv: null, raf: 0 };
function ptDraw() {
  const cv = PT.cv; if (!cv || !cv.isConnected) return; const g = cv.getContext("2d"), W = cv.width, H = cv.height, t = performance.now() / 1000;
  g.clearRect(0, 0, W, H); g.save(); g.translate(W / 2 + PT.ox, H / 2 + PT.oy); g.scale(PT.sc, PT.sc);
  const col = (p) => (p.kind === "filler" ? "#e8e8f6" : p.arm === "bridge" ? "#9a9ab8" : P_ARMS.find((a) => a.id === p.arm).color);
  g.lineWidth = 3 / PT.sc * 0.9;
  for (const p of PASSIVES) for (const q of p.links) { if (q === "C") { g.strokeStyle = passiveHas(save, p.id) ? col(p) : "#2e2850"; g.beginPath(); g.moveTo(0, 0); g.lineTo(p.x, p.y); g.stroke(); continue; } const o = PASSIVE_BY_ID[q]; if (!o || o.id < p.id) continue; const a = passiveHas(save, p.id), b = passiveHas(save, o.id); g.strokeStyle = a && b ? col(p) : a || b ? "#5a5090" : "#2a2448"; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(o.x, o.y); g.stroke(); }
  g.fillStyle = "#ffd24a"; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill(); g.fillStyle = "#3a2a08"; g.font = "bold 14px sans-serif"; g.textAlign = "center"; g.fillText("시작", 0, 5);
  for (const A of P_ARMS) { const p = PASSIVE_BY_ID[A.id + "_s6"], ang = Math.atan2(p.y, p.x); g.fillStyle = A.color; g.globalAlpha = 0.9; g.font = "bold 22px sans-serif"; g.fillText(A.name, Math.cos(ang) * 1200, Math.sin(ang) * 1200 + 8); g.globalAlpha = 1; }
  for (const p of PASSIVES) {
    const on = passiveHas(save, p.id), can = !on && canAddPassive(save, p.id), r = p.kind === "key" ? 16 : p.kind === "notable" ? 12 : p.kind === "filler" ? 5.5 : 8, c = col(p);
    g.beginPath(); if (p.kind === "key") { g.moveTo(p.x, p.y - r); g.lineTo(p.x + r, p.y); g.lineTo(p.x, p.y + r); g.lineTo(p.x - r, p.y); g.closePath(); } else g.arc(p.x, p.y, r, 0, 7);
    g.fillStyle = on ? c : "#14102a"; g.fill(); g.lineWidth = (p.kind === "small" ? 2 : 3) / PT.sc * 0.9; g.strokeStyle = on ? "#fff" : can ? `rgba(255,255,255,${0.55 + 0.4 * Math.sin(t * 5)})` : c + "88"; g.stroke();
    if (p.kind === "notable") { g.beginPath(); g.arc(p.x, p.y, r - 4, 0, 7); g.strokeStyle = on ? "#0008" : c + "66"; g.stroke(); }
    if (PT.sel === p) { g.strokeStyle = "#fff"; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); g.arc(p.x, p.y, r + 9, 0, 7); g.stroke(); g.setLineDash([]); }
    if (PT.hover === p) { g.strokeStyle = "#ffd24a"; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, r + 6, 0, 7); g.stroke(); }
  }
  g.restore();
  PT.raf = requestAnimationFrame(ptDraw);
}
function ptPick(mx, my) { const cv = PT.cv, x = (mx - cv.width / 2 - PT.ox) / PT.sc, y = (my - cv.height / 2 - PT.oy) / PT.sc; let best = null, bd = 1e9; for (const p of PASSIVES) { const d = Math.hypot(p.x - x, p.y - y), r = (p.kind === "key" ? 16 : p.kind === "notable" ? 12 : p.kind === "filler" ? 6 : 8) + 6; if (d < r && d < bd) { bd = d; best = p; } } return best; }
function ptInfo() {
  const el = $("#ptinfo"); if (!el) return; const p = PT.hover || PT.sel;
  { const a = $("#ptact"), q = PT.sel; if (a) a.innerHTML = q ? `<span>선택: <b style="color:${q.arm === "bridge" ? "#ccc" : P_ARMS.find((x) => x.id === q.arm).color}">${q.name}</b> <span class="dim">(${q.cost}점)</span></span>${(() => { const P = passivePath(save, q.id), free = passivePoints(save) - passiveSpent(save); if (!P) return `<button class="btn pri" data-a="ptadd" disabled>찍기</button>`; return `<button class="btn pri" data-a="ptadd" ${P.cost <= free ? "" : "disabled"}>${P.ids.length > 1 ? `경로 찍기 (${P.ids.length}개 · ${P.cost}점)` : "찍기"}</button>`; })()}<button class="btn" data-a="ptrm" ${canRemovePassive(save, q.id) ? "" : "disabled"}>회수</button>` : `<span class="dim">노드를 클릭하면 효과가 보이고, 아래 [찍기] 버튼으로 찍습니다</span>`; }
  const sp = passivePoints(save) - passiveSpent(save); $("#ptpts").textContent = `${sp} / ${passivePoints(save)}`;
  if (!p) { el.innerHTML = `<span class="dim">노드를 클릭하거나 마우스를 올려 효과를 확인하세요 · 드래그: 이동 · 휠: 확대</span>`; return; }
  const on = passiveHas(save, p.id), kind = { small: "", notable: "★ 주요 ", key: "◆ 핵심 ", bridge: "" }[p.kind];
  el.innerHTML = `<b style="color:${p.arm === "bridge" ? "#ccc" : P_ARMS.find((a) => a.id === p.arm).color}">${kind}${p.name}</b> <span class="dim">(${p.cost}점)</span> — ${p.text} ${on ? `<span style="color:#8dff9a">활성</span>` : canAddPassive(save, p.id) ? `<span style="color:#ffe08a">찍을 수 있음</span>` : `<span class="dim">${(() => { const P = passivePath(save, p.id), free = passivePoints(save) - passiveSpent(save); return !P ? "찍을 수 없음" : P.cost > free ? `경로 ${P.cost}점 필요 (포인트 부족)` : `경로 ${P.ids.length}개 · ${P.cost}점으로 찍을 수 있음 — 선택 후 [경로 찍기]`; })()}</span>`}`;
}
function openPassives() {
  Modal.open(`<h2>훈련소 · 패시브</h2><div class="ppts">남은 포인트 <b id="ptpts"></b> <button class="btn xs" data-a="preset">전부 초기화</button></div><canvas id="ptree" width="860" height="296"></canvas><div class="ptip" id="ptinfo"></div><div class="ptact" id="ptact"></div>`, { cls: "wide", onClose: () => { cancelAnimationFrame(PT.raf); PT.cv = null; }, on: {
    preset: () => { resetPassives(save); snd("close"); saveGame(); refreshTop(); ptInfo(); },
    ptadd: () => { if (PT.sel && addPassivePath(save, PT.sel.id)) snd("equip"); else snd("error"); saveGame(); refreshTop(); ptInfo(); },
    ptrm: () => { if (PT.sel && removePassive(save, PT.sel.id)) snd("click"); else snd("error"); saveGame(); refreshTop(); ptInfo(); },
  } });
  const cv = PT.cv = $("#ptree"); cancelAnimationFrame(PT.raf);
  const pos = (ev) => { const r = cv.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * cv.width, ((ev.clientY - r.top) / r.height) * cv.height]; };
  cv.addEventListener("mousedown", (ev) => { const [x, y] = pos(ev); PT.drag = { x, y, ox: PT.ox, oy: PT.oy }; PT.moved = false; });
  cv.addEventListener("mousemove", (ev) => { const [x, y] = pos(ev); if (PT.drag && ev.buttons) { const dx = x - PT.drag.x, dy = y - PT.drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) PT.moved = true; if (PT.moved) { PT.ox = PT.drag.ox + dx; PT.oy = PT.drag.oy + dy; } } else { const h = ptPick(x, y); if (h !== PT.hover) { PT.hover = h; ptInfo(); } cv.style.cursor = h ? "pointer" : "grab"; } });
  window.addEventListener("mouseup", () => { PT.drag = null; }, { once: true });
  cv.addEventListener("wheel", (ev) => { ev.preventDefault(); const [x, y] = pos(ev), k = ev.deltaY < 0 ? 1.12 : 1 / 1.12, ns = clamp(PT.sc * k, 0.1, 1.6), wx = (x - cv.width / 2 - PT.ox) / PT.sc, wy = (y - cv.height / 2 - PT.oy) / PT.sc; PT.sc = ns; PT.ox = x - cv.width / 2 - wx * ns; PT.oy = y - cv.height / 2 - wy * ns; }, { passive: false });
  const act = (ev) => { if (PT.moved) return; const [x, y] = pos(ev), p = ptPick(x, y); PT.sel = p || null; snd("click"); ptInfo(); };   // 클릭은 선택만: 효과를 보고 [찍기]로 확정
  cv.addEventListener("click", act);
  cv.addEventListener("contextmenu", (ev) => { ev.preventDefault(); });
  ptInfo(); ptDraw();
}

// ---------- 균열 탑 ----------
function mfText(tier) { const v = towerMf(tier); return `MF +${Math.round(v * 100)}%`; }
function openTower() {
  const best = save.rift.best, max = Math.max(best + 1, 1); if (!G.towerSeen) { G.riftTier = max; G.towerSeen = true; } const tier = G.riftTier = clamp(G.riftTier, 1, max), shown = Math.min(max + 4, 300), mods = riftMods(tier);
  let fl = "";
  for (let n = 1; n <= shown; n++) { const done = n <= best, lock = n > max, m20 = n % 20 === 0, boss = n % 5 === 0;
    fl += `<div class="fl ${done ? "done" : ""} ${lock ? "lock" : ""} ${tier === n ? "sel" : ""} ${boss ? "boss" : ""} ${m20 ? "m20" : ""}" data-a="floor" data-n="${n}"><span>${done ? "✔ " : ""}${n}층 ${boss ? "👑" : ""}${m20 ? " ✦" : ""}</span><span class="mfb">${mfText(n)}</span></div>`; }
  Modal.open(`<h2>심연의 균열 · 탑</h2><div class="res">최고 ${best}층</div>
   <div style="display:flex;gap:14px"><div style="flex:1"><div class="towtop"></div><div class="tower" id="towerlist">${fl}</div></div>
   <div style="width:270px" class="col"><div class="dname">${tier}층</div><div class="pline">${mfText(tier)} <span class="dim">(층이 오를수록 증가, 20층마다 대폭 증가)</span></div>
    <div class="mods">${mods.map((m) => `<span class="mod" title="${m.text}">${m.name}</span>`).join("")}</div>${mods.map((m) => `<div class="dim">${m.name}: ${m.text}</div>`).join("")}
    <div class="pline dim">5층마다 보스 · 균열 조각 · 구슬 · 왜곡체(열쇠) · 낮은 확률로 강한 스킬</div><div class="pline dim">드랍 아이템 레벨 ${10 + Math.floor(tier / CFG.ILVL_RIFT_STEP)}</div>
    <div class="pbtns"><button class="btn" data-a="tdn">▼</button><button class="btn pri" data-a="tgo">도전</button><button class="btn" data-a="tup">▲</button></div><div class="pbtns"><button class="btn" data-a="tatlas">심연 각인</button></div></div></div>`, { cls: "wide", on: {
    floor: (el) => { const n = +el.dataset.n; if (n > max) return; G.riftTier = n; openTower(); },
    tup: () => { G.riftTier = Math.min(max, tier + 1); openTower(); }, tdn: () => { G.riftTier = Math.max(1, tier - 1); openTower(); },
    tgo: () => { Modal.close(true); const n = MAP.byId["R"]; MapView.sel = n; mapGo(); }, tatlas: () => openAtlas(),
  } });
  const sel = $("#towerlist .fl.sel"); if (sel) sel.scrollIntoView({ block: "center" });
}

// ---------- 장비 도감 ----------
const CX = { tab: "uniq", pool: "all", sel: null, skf: "all" };
const KIND_LBL = { stage: "일반 스테이지", boss: "액트 보스", elite: "정예 사냥터", treasure: "보물 지하실", hell: "지옥 스테이지", rift: "균열 탑", endless: "무한 균열", hive: "화염 정령왕", void: "공허의 군주" };
const fmtOdds = (p) => `${(p * 100).toFixed(p < 0.0001 ? 4 : 3)}% (1/${Math.round(1 / p).toLocaleString()})`;
function uniqueSources(def) {
  const out = [];
  for (const kind of Object.keys(KIND_LBL)) {
    if (kind === "void") { if (def.pool !== "void") continue; const list = uniquePool("void", 10).map((x) => ({ u: x.u, w: x.u.tier === 4 ? 8 : 21 })), sum = list.reduce((a, x) => a + x.w, 0); out.push([KIND_LBL[kind], (def.tier === 4 ? 8 : 21) / sum, "처치 1회당"]); continue; }
    const pools = U_POOLS_OF[kind]; if (!pools.includes(def.pool)) continue;
    const list = []; for (const p of pools) for (const x of uniquePool(p, 10)) list.push(x); const sum = list.reduce((a, x) => a + x.w, 0), me = list.find((x) => x.u === def);
    if (me) out.push([KIND_LBL[kind], CFG.UNIQUE_BASE * CFG.PROTO_MULT * (UNIQUE_SRC[kind] || 1) * (me.w / sum), `드랍 1개당${def.pool === "common" && def.act > 1 ? ` · 액트 ${def.act}~` : ""}`]);
  }
  return out;
}
// ---- 스킬 도감 ----
const SK_FILTERS = [["all", "전체"], ["basic", "기본 공격"], ["active", "액티브"], ["boss", "보스 전용기"], ["void", "공허 전용"]];
function skBuildTags(d) {
  const t = [];
  if (d.bonus && d.bonus.boss >= 0.8) t.push(["보스 전용기", "#ff9a9a"]);
  if (d.voidOnly) t.push(["공허 전용", "#c070ff"]);
  if (d.bleed >= 0.5) t.push(["출혈 빌드", "#e03a4a"]); if (d.poison >= 0.5) t.push(["중독 빌드", "#6ae04a"]); if (d.ignite >= 0.35) t.push(["점화 빌드", "#ff9a30"]);
  if (d.elem && ELEM_NAME[d.elem]) t.push([ELEM_NAME[d.elem] + " 속성", ELEM_COLOR[d.elem]]);
  if (d.dtype === "mag" && !d.elem) t.push(["마법·마나 빌드", "#c58bff"]); if (d.kind === "summon") t.push(["소환", "#8affc8"]);
  return t;
}
function skSources(d) {
  const o = [];
  if (d.voidOnly) { o.push("공허의 군주 처치 시 매우 낮은 확률 (1~4단계 2% / 3% / 5% / 12%) — 상점·다른 곳에서는 나오지 않음"); return o; }
  o.push(`스킬 상점에서 골드로 구매 (액트 ${d.unlock} 이후 등장)`);
  if (d.slot === "active") { o.push(`액트 ${d.unlock <= 10 ? d.unlock : 10}~ 보스 첫 클리어·일반 드랍`); if (d.unlock >= 3) o.push("심연의 균열(낮은 확률) · 스킬 시련(단계가 오를수록 확률 증가)"); }
  return o;
}
function skCodexRow(d) {
  const got = (save.skdex || {})[d.id] || save.skills.some((x) => x.id === d.id);
  return `<div class="dexrow ${CX.sel === d.id ? "found" : ""}" data-a="cxpick" data-id="${d.id}" style="cursor:pointer;${got ? "" : "opacity:.6"}">${iconImg(d.icon, 1)} <b>${d.name}</b> <small class="dim">${d.slot === "basic" ? "기본" : "액티브"} · ${got ? "보유 이력 ✓" : "미획득"}</small>${skBuildTags(d).slice(0, 2).map((t) => ` <small style="color:${t[1]}">${t[0]}</small>`).join("")}</div>`;
}
function skCodexDetail(d) {
  const sk = skillOf({ uid: 0, id: d.id, rarity: 0, lvl: 1 }), st = computeStats(save);
  return `<div class="dname">${iconImg(d.icon, 3)} <b>${d.name}</b></div><div>${skTags(sk, st)} ${skBuildTags(d).map((t) => `<span class="chip" style="background:${t[1]}33;color:${t[1]}">${t[0]}</span>`).join("")}</div>
   <div class="dd" style="margin-top:6px">${skillAreaHtml(sk, 11)}<div>${skillDescFull(sk, st)}</div><div class="dim" style="margin-top:4px">${d.desc || ""}${Object.keys(d.bonus || {}).length ? " · " + Object.keys(d.bonus).map((k) => `${{ boss: "보스", elite: "정예", ranged: "원거리", normal: "일반" }[k]} +${Math.round(d.bonus[k] * 100)}%`).join(", ") : ""}</div></div>
   <h3>획득처</h3>${skSources(d).map((x) => `<div class="aff">${x}</div>`).join("")}<div class="dim">스킬 등급(일반/희귀/전설)이 오를수록 피해·보너스가 커지고 쿨타임이 줄어듭니다. 룬과 연마석으로 추가 강화할 수 있습니다.</div>`;
}
function openCodex() {
  const tabs = [["uniq", "고유"], ["set", "세트"], ["aff", "옵션"], ["skill", "스킬"]].map(([k, n]) => `<button class="tab ${CX.tab === k ? "on" : ""}" data-a="cxtab" data-t="${k}">${n}</button>`).join("");
  let left = "", right = "";
  if (CX.tab === "uniq") {
    const pools = `<div class="itbar"><select data-i="cxpool"><option value="all">전체 출처</option>${Object.keys(U_POOLS).map((k) => `<option value="${k}" ${CX.pool === k ? "selected" : ""}>${U_POOLS[k]}</option>`).join("")}</select></div>`;
    const list = UNIQUES.filter((u) => CX.pool === "all" || u.pool === CX.pool).sort((a, b) => b.tier - a.tier);
    left = pools + list.map((u) => { const n = save.uniq[u.id] || 0; return `<div class="dexrow ${CX.sel === u.id ? "found" : ""}" data-a="cxpick" data-id="${u.id}" style="cursor:pointer"><span class="tn${u.tier}">${uniqueIconImg(u.id, 1)} ${u.name}</span> <small class="dim">${U_TIERS[u.tier].name} · ${SLOT_NAME[u.slot]} · ${U_POOLS[u.pool]}${n ? ` · 획득 ×${n}` : ""}</small></div>`; }).join("");
    const D = UNIQUE_BY_ID[CX.sel];
    if (D) { const T = U_TIERS[D.tier], src = uniqueSources(D);
      right = `<div class="dname">${uniqueIconImg(D.id, 2)} <span class="tn${D.tier}">${D.name}</span></div><span class="ribbon rb${D.tier}">${T.name} 고유</span><div class="dim">${SLOT_NAME[D.slot]} · ${U_POOLS[D.pool]} 풀</div>
       <div class="udet d${D.tier}">${uniqueLines(D, null, true).map((x) => `<div>✦ ${x}</div>`).join("")}<div class="flav">“${D.flavor}”</div></div>
       <h3>드랍 출처 · 확률</h3>${src.map((s) => `<div class="aff">${s[0]}: <b>${fmtOdds(s[1])}</b> <small class="dim">${s[2]}</small></div>`).join("")}<div class="dim">프로토타입 보정 ×${CFG.PROTO_MULT} 적용, MF·버프 적용 전 수치입니다</div>`; }
    else right = `<div class="dim center pad">항목을 선택하세요</div>`;
  } else if (CX.tab === "skill") {
    const f = CX.skf, list = SKILLS.filter((d) => f === "all" || (f === "basic" && d.slot === "basic") || (f === "active" && d.slot === "active" && !d.voidOnly) || (f === "boss" && d.bonus && d.bonus.boss >= 0.8) || (f === "void" && d.voidOnly)).sort((a, b) => (a.slot === "basic" ? 0 : 1) - (b.slot === "basic" ? 0 : 1) || a.unlock - b.unlock);
    const got = SKILLS.filter((d) => (save.skdex || {})[d.id] || save.skills.some((x) => x.id === d.id)).length;
    left = `<div class="itbar"><select data-i="cxskf">${SK_FILTERS.map(([k, n]) => `<option value="${k}" ${f === k ? "selected" : ""}>${n}</option>`).join("")}</select> <small class="dim">${got} / ${SKILLS.length} 종 보유 이력</small></div>` + list.map(skCodexRow).join("");
    const D = SKILLS.find((x) => x.id === CX.sel); right = D ? skCodexDetail(D) : `<div class="dim center pad">스킬을 선택하면 설명·범위·획득처를 볼 수 있습니다</div>`;
  } else if (CX.tab === "set") {
    left = SETS.map((s) => `<div class="dexrow ${CX.sel === s.id ? "found" : ""}" data-a="cxpick" data-id="${s.id}" style="cursor:pointer"><span style="color:${s.color}"><b>${s.name}</b></span> <small class="dim">액트 ${s.acts[0]}~${s.acts[1] > 50 ? "" : s.acts[1]} · ${s.pieces.length}부위</small></div>`).join("");
    const S = SETS.find((x) => x.id === CX.sel);
    right = S ? `<div class="dname" style="color:${S.color}">${S.name}</div><div class="dim">구성: ${S.pieces.map((p) => SLOT_NAME[p]).join(", ")}</div><div class="sets" style="color:${S.color}">${[2, 4, 6].filter((t) => S.bonus[t]).map((t) => `<div>${t}세트: ${S.text[t]}</div>`).join("")}</div><h3>드랍</h3><div class="aff">일반 스테이지 클리어당 ${Math.round(CFG.SET_DROP * 100)}% · 보스 ${Math.round(CFG.SET_DROP_BOSS * 100)}% (액트 ${S.acts[0]}~${S.acts[1] > 50 ? "" : S.acts[1]} 구간)</div><div class="aff">정예 사냥터 25% · 균열/지옥/무한 균열 30%</div>` : `<div class="dim center pad">항목을 선택하세요</div>`;
  } else {
    left = SLOTS.map((s) => `<div class="dexrow ${CX.sel === s ? "found" : ""}" data-a="cxpick" data-id="${s}" style="cursor:pointer"><b>${SLOT_NAME[s]}</b> <small class="dim">나올 수 있는 옵션 ${AFFIXES.filter((a) => a.slots.includes(s)).length}종</small></div>`).join("");
    const s = SLOTS.includes(CX.sel) ? CX.sel : null;
    right = s ? `<div class="dname">${SLOT_NAME[s]} 옵션</div><div class="dim">장비 레벨이 낮으면 일부 옵션은 나오지 않습니다</div>` + AFFIXES.filter((a) => a.slots.includes(s)).sort((a, b) => (a.minIlvl || 0) - (b.minIlvl || 0)).map((a) => { const r = a.count ? `+${a.range[0]}` : a.flat ? "장비 레벨에 비례" : `${(Math.abs(a.range[0]) * 100).toFixed(a.range[0] < 0.02 ? 1 : 0)}~${(Math.abs(a.range[1]) * 100).toFixed(a.range[1] < 0.02 ? 1 : 0)}%`; return `<div class="aff">${a.name} <small class="dim">${r} · ${a.minIlvl ? `Lv.${a.minIlvl}+` : "전 구간"}${a.minRarity ? " · 희귀 이상" : ""}</small></div>`; }).join("") : `<div class="dim center pad">부위를 선택하세요</div>`;
  }
  Modal.open(`<h2>장비 · 스킬 도감</h2><div class="tabs">${tabs}</div><div class="cols" style="margin-top:8px"><div class="col" style="flex:1;overflow:auto">${left}</div><div class="col" style="width:400px;overflow:auto">${right}</div></div>`, { cls: "wide", on: {
    cxtab: (el) => { CX.tab = el.dataset.t; CX.sel = null; openCodex(); }, cxpick: (el) => { CX.sel = el.dataset.id; openCodex(); }, cxpool: (el) => { CX.pool = el.value; openCodex(); }, cxskf: (el) => { CX.skf = el.value; CX.sel = null; openCodex(); },
  } });
}

// ---------- 스킬 범위 표시 (6칸 x 3레인 미니 도식) ----------
function skillCells(sk) {
  const S = new Set(), add = (l, c) => { if (l >= 0 && l < 3 && c >= 1 && c <= 6) S.add(l + "," + c); }, R = sk.range || 3, K = sk.kind;
  const box = (l, c) => { for (let a = -1; a <= 1; a++) for (let d = -1; d <= 1; d++) add(l + a, c + d); };
  if (K === "single") add(1, Math.min(R, 2)); else if (K === "multi") box(1, Math.min(R, 3));
  else if (K === "pierce" || K === "boomer") for (let c = 1; c <= R; c++) add(1, c);
  else if (K === "chain") { const j = [[1, 2], [0, 3], [1, 3], [2, 4], [1, 4], [0, 5], [1, 5]]; j.slice(0, Math.min(7, 2 + (sk.jumps || 2))).forEach(([l, c]) => add(l, c)); }
  else if (K === "nova") for (let l = 0; l < 3; l++) for (let c = 1; c <= R; c++) add(l, c);
  else if (K === "zone") for (let c = 2; c <= 4; c++) add(1, c);
  else if (K === "meteor") { box(0, 3); box(2, 5); add(1, 4); add(1, 2); }
  else if (K === "cone") { add(1, 2); add(1, 3); add(0, 3); add(2, 3); add(0, 2); add(2, 2); }
  else if (K === "spray") { for (const [l, c] of [[0, 2], [1, 2], [2, 3], [0, 4], [1, 4], [2, 5], [0, 5], [1, 6], [2, 4], [0, 3]]) if (c <= R) add(l, c); }
  else if (K === "orbit") { for (let l = 0; l < 3; l++) for (let c = 1; c <= 3; c++) add(l, c); }
  else if (K === "aura") { for (let l = 0; l < 3; l++) for (let c = 1; c <= 2; c++) add(l, c); }
  else if (K === "trap") box(1, 3);
  else if (K === "zone2") { if (sk.shape === "wide") for (let l = 0; l < 3; l++) for (let c = 3; c <= 6; c++) add(l, c); else box(1, 4); }
  else if (K === "rain") { for (const [l, c] of [[0, 3], [1, 5], [2, 2], [1, 3], [0, 6], [2, 5], [0, 4], [2, 4]]) add(l, c); }
  else if (K === "summon") { for (let l = 0; l < 3; l++) add(l, 1); add(1, 2); }
  else if (K === "hole") box(1, 3);
  return S;
}
function skillAreaHtml(sk, w) {
  const S = skillCells(sk), self = sk.kind === "buff" || sk.kind === "heal", R = sk.range || 3, col = ELEM_COLOR[sk.elem] || (sk.dtype === "mag" ? "#c58bff" : sk.dtype === "phys" ? "#ff9a7a" : "#8aff9a"), cs = w || 12;
  let h = `<div class="skarea" title="사거리 ${R}칸" style="display:inline-block;padding:3px;background:#0b0816;border:1px solid #382f60;border-radius:6px"><div style="display:grid;grid-template-columns:${cs}px repeat(6,${cs}px);gap:2px">`;
  for (let l = 0; l < 3; l++) { h += `<div style="width:${cs}px;height:${cs}px;background:${l === 1 ? "#3a8aff" : "transparent"};border-radius:3px;${self && l === 1 ? "box-shadow:0 0 6px #8aff9a" : ""}"></div>`; for (let c = 1; c <= 6; c++) { const on = S.has(l + "," + c); h += `<div style="width:${cs}px;height:${cs}px;border-radius:3px;background:${on ? col : "#1c1632"};opacity:${c > R && !on ? 0.35 : 1};${c === R ? "border-right:2px dashed #ffd24a" : ""}"></div>`; } }
  return h + `</div></div>`;
}
function skillDescFull(sk, st) {
  st = st || computeStats(save); const L = [], T = { phys: "물리", mag: "마법", buff: "버프", heal: "회복" }[sk.dtype] || "물리";
  L.push(`${T}${sk.elem ? " · " + ELEM_NAME[sk.elem] : ""} · 사거리 ${sk.range}칸 · 쿨 ${sk.cd.toFixed(1)}초 · 마나 ${skCost(sk, st)}`);
  if (sk.mult) L.push(`피해 ${Math.round(sk.mult * 100)}%${sk.count ? ` × ${sk.count}회` : ""}${sk.dur ? ` · ${sk.dur}초 지속` : ""}`);
  for (const k of ["bleed", "poison", "ignite"]) if (sk[k]) L.push(`${STATUS_INFO[k].name} 확률 ${Math.round(sk[k] * 100)}%`);
  if (sk.chill) L.push("적 둔화");
  return L.join("<br>");
}

function openRunePicker(uid) {
  const inst = save.skills.find((x) => x.uid === uid), cur = inst.rune ? RUNES[inst.rune] : null;
  Modal.open(`<h2>룬 장착 · ${SKILLS.find((x) => x.id === inst.id).name}</h2><div class="dim center">스킬에 룬 1개를 끼울 수 있습니다. 룬은 시련·균열에서 얻습니다.</div>${cur ? `<div class="pad center">장착 중: <b style="color:${cur.color}">${cur.name}</b> — ${cur.text} <button class="btn xs" data-a="unrune">해제</button></div>` : ""}<div class="qlist" style="height:300px">${save.runes.map((r) => `<div class="qrow"><div class="qi"><b style="color:${RUNES[r.id].color}">${RUNES[r.id].name}</b><div class="dim">${RUNES[r.id].text}</div></div><button class="btn xs pri" data-a="dorune" data-u="${r.uid}">장착</button></div>`).join("") || `<div class="dim center pad">보유한 룬이 없습니다</div>`}</div><div class="pbtns"><button class="btn" data-a="rback">돌아가기</button></div>`, { cls: "wide", on: {
    dorune: (el) => { const ru = save.runes.find((x) => x.uid === +el.dataset.u); if (!ru) return; save.runes = save.runes.filter((x) => x !== ru); if (inst.rune) save.runes.push({ uid: save.nextUid++, id: inst.rune }); inst.rune = ru.id; snd("equip"); saveGame(); openRunePicker(uid); },
    unrune: () => { if (inst.rune) save.runes.push({ uid: save.nextUid++, id: inst.rune }); inst.rune = null; saveGame(); openRunePicker(uid); },
    rback: () => openSkills(),
  } });
}
