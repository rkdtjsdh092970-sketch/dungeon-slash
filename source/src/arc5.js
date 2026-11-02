// =========================================================
// 5.0 아르카나 창 (로블록스판 Menus.skills 와 같은 배치 · 기능)
//  왼쪽 보랏빛 탁자: 장착한 아르카나 (1번 = 평타, 끌어다 놓기) + 세트 1·2·3 · 보유 아르카나 (분류 · 정렬)
//  오른쪽: 고른 아르카나 정보 (큰 카드 · 수치 · 설명 · 칸 버튼과 전투력 변화 · 분해 · 대상 규칙)
//  룬 탭 (로블록스판 Menus.runes): 왼쪽 아르카나 고르기 · 오른쪽 내 룬
// =========================================================
const ARC5 = { sel: null, filter: "all", sort: "rar" };
const SK_RCOL5 = ["#aaaab4", "#5096ff", "#ff9628", "#be5aff", "#e62832"];
// 세트 (로블록스판 Game.setSwitch): 장비 · 아르카나 · 패시브를 따로 3벌씩. 바꾸면 지금 것을 저장하고 고른 세트를 불러온다
function setSwitch5(sv, kind, i) {
  sv.sets = sv.sets || {}; const cur = sv.sets[kind] || 0; if (cur === i) return;
  sv.presets = sv.presets || [null, null, null]; for (let j = 0; j < 3; j++) if (!sv.presets[j]) sv.presets[j] = { equip: {}, loadout: [] };
  const P = sv.presets;
  if (kind === "gear") {
    const saveE = (k) => { P[k].equip = Object.fromEntries(EQ_SLOTS.filter((s) => sv.equipped[s]).map((s) => [s, sv.equipped[s].uid])); P[k].eqSet = true; };
    saveE(cur); if (P[i].eqSet) { for (const s of EQ_SLOTS) if (sv.equipped[s]) { sv.inv.push(sv.equipped[s]); delete sv.equipped[s]; }
      for (const s of EQ_SLOTS) { const u = P[i].equip[s], j = u != null ? sv.inv.findIndex((x) => x.uid === u) : -1; if (j >= 0) sv.equipped[s] = sv.inv.splice(j, 1)[0]; } }
    else { for (const s of EQ_SLOTS) if (sv.equipped[s]) { sv.inv.push(sv.equipped[s]); delete sv.equipped[s]; } saveE(i); }   // 빈 세트: 아무것도 안 낀 상태로 시작
  } else if (kind === "skill") {
    const saveL = (k) => { P[k].loadout = [0, 1, 2, 3].map((j) => { const l = sv.loadout[j]; return l ? { uid: l.uid, rule: l.rule } : null; }); P[k].loSet = true; };
    saveL(cur); if (P[i].loSet) { const seen = new Set(); sv.loadout = [0, 1, 2, 3].map((j) => { const l = P[i].loadout[j], k = l && sv.skills.find((x) => x.uid === l.uid); if (!k || seen.has(k.id) || j >= (sv.slots || 4)) return null; seen.add(k.id); return { uid: l.uid, rule: l.rule || "front" }; }); } else { sv.loadout = [sv.loadout[0] || null, null, null, null]; saveL(i); }   // 빈 세트: 평타만 남기고 비운다
  } else { sv.passSets = sv.passSets || []; sv.passSets[cur] = Object.assign({}, sv.pass || {}); sv.pass = Object.assign({}, sv.passSets[i] || {}); }
  sv.sets[kind] = i;
}
const SET5_AFTER = {};
function setTabs5(kind, after) {
  const cur = (save.sets && save.sets[kind]) || 0; SET5_AFTER[kind] = after;
  return `<span class="set5"><b>세트</b>${[0, 1, 2].map((i) => `<button class="btn xs ${i === cur ? "gold" : ""}" data-set5="${kind}" data-i="${i}">${i + 1}</button>`).join("")}</span>`;
}
document.addEventListener("click", (ev) => { const b = ev.target.closest && ev.target.closest("[data-set5]"); if (!b || !save) return; ev.stopPropagation(); const kind = b.dataset.set5, i = +b.dataset.i, cur = (save.sets && save.sets[kind]) || 0; if (i === cur) return;
  setSwitch5(save, kind, i); snd("equip"); toast(`세트 ${i + 1}`); saveGame(); refreshTop(); if (SET5_AFTER[kind]) SET5_AFTER[kind](); }, true);
function openSkills() {
  const st = computeStats(save), slots = save.slots || 4, lo = save.loadout;
  const dpsOf = (sk) => { try { const s2 = Object.assign({}, st); s2.refIlvl = Math.min(6, 1 + ((save.rift && save.rift.best) || 0) / 20); return pwDetail(s2, [sk], 1).dps; } catch (e) { return 0; } };
  const slotOf = (uid) => lo.findIndex((l) => l && l.uid === uid);
  const card = (inst, w, h) => { const j = slotOf(inst.uid), d = SKILLS.find((x) => x.id === inst.id) || {};
    return `<div class="ac5 ${ARC5.sel === inst.uid ? "sel" : ""} ${j >= 0 ? "eqd" : ""}" style="width:${w}px;height:${h}px;--rc:${SK_RCOL5[inst.rarity] || SK_RCOL5[0]}" data-a="asel" data-u="${inst.uid}" draggable="true" data-drag="${inst.uid}" data-k="${d.slot || ""}">${arcCard(inst.id, inst.rarity, {})}<i class="lv5">Lv${inst.lvl || 1}</i></div>`; };
  // 장착 칸
  let eq = "";
  for (let i = 0; i < slots; i++) {
    if (i === 1) eq += `<div class="sep5"></div>`;
    const l = lo[i], inst = l && save.skills.find((x) => x.uid === l.uid);
    eq += `<div class="es5" data-drop="${i}">${inst ? card(inst, 88, 130) : `<div class="emp5"><img src="${artURL("cardback") || ""}" alt=""><span>${i === 0 ? "평타" : i + 1 + "번 칸"}<br>비어 있음<br>(끌어다 놓기)</span></div>`}${i === 0 ? `<div class="bt5">BASIC ATTACK</div>` : ""}</div>`;
  }
  // 보유
  const F = [["all", "전체"], ["phys", "물리"], ["mag", "마법"], ["basic", "평타"]]; if (ARC5.filter === "eq") ARC5.filter = "all";
  const rows = save.skills.map((inst) => ({ inst, d: SKILLS.find((x) => x.id === inst.id) })).filter((r) => r.d);
  const shown = rows.filter(({ inst }) => slotOf(inst.uid) < 0).filter(({ inst, d }) => ARC5.filter === "all" || (ARC5.filter === "eq" && slotOf(inst.uid) >= 0) || (ARC5.filter === "basic" && d.slot === "basic") || (ARC5.filter === "phys" && d.dtype === "phys") || (ARC5.filter === "mag" && d.dtype === "mag"));
  for (const r of shown) r.dps = r.d.slot === "passive" || r.d.dtype === "buff" || r.d.dtype === "heal" ? 0 : dpsOf(skillOf(r.inst));
  shown.sort((a, b) => ((slotOf(b.inst.uid) >= 0) - (slotOf(a.inst.uid) >= 0)) || (ARC5.sort === "dps" ? b.dps - a.dps : ARC5.sort === "lvl" ? (b.inst.lvl || 1) - (a.inst.lvl || 1) : 0) || b.inst.rarity - a.inst.rarity || (b.inst.lvl || 1) - (a.inst.lvl || 1));
  const grid = shown.map(({ inst }) => card(inst, 60, 88)).join("") || `<div class="dim pad">이 분류에 아르카나가 없습니다.</div>`;
  const SN = { rar: "등급", dps: "초당 피해", lvl: "레벨" };
  const left = `<div class="tbl5"><canvas class="arcbg5" width="572" height="392"></canvas><div class="th5">장착한 아르카나 (${slots}칸)${setTabs5("skill", openSkills)}</div><div class="eqrow5">${eq}</div>
    <div class="th5 r2">보유 ${rows.length}<span class="flt5"><button class="srt5" data-a="asrt">⇅ 정렬: ${SN[ARC5.sort]}</button>${F.map(([k, n]) => `<button class="btn xs ${ARC5.filter === k ? "gold" : ""}" data-a="aflt" data-f="${k}">${n}</button>`).join("")}</span></div><div class="og5">${grid}</div></div>`;
  // 오른쪽 정보
  let right = `<div class="dim pad">아르카나 카드를 누르면 위력 · 쿨타임 · 사거리 · 범위 · 설명이 나옵니다.<br>카드를 위 칸으로 끌어다 놓으면 장착됩니다.<br>새 아르카나는 마을의 [아르카나 소환]에서 얻습니다.</div>`;
  const sel = ARC5.sel && save.skills.find((x) => x.uid === ARC5.sel);
  if (sel) {
    const sk = skillOf(sel), d = sk.def, R = SKILL_RARITY[sel.rarity], dps = d.slot === "passive" ? 0 : dpsOf(sk), j = slotOf(sel.uid), isBasic = d.slot === "basic";
    const tags = [isBasic ? "평타" : "아르카나", d.dtype === "mag" ? "마법" : d.dtype === "phys" ? "물리" : "지원"]; if (d.elem && ELEM_NAME[d.elem]) tags.push(ELEM_NAME[d.elem]);
    const area = { single: "단일", multi: "3x3", pierce: "한 줄", chain: "연쇄", nova: "화면 전체", meteor: "무작위 범위", zone: "장판", zone2: "장판", aura: "앞줄", orbit: "주변", rain: "무작위", spray: "무작위", summon: "앞줄", bounce: "튕김", cone: "부채꼴", trap: "덫" }[d.kind] || "–";
    const fx = []; const BN = { boss: "보스", elite: "정예", ranged: "원거리", normal: "일반" };
    for (const k in sk.bonus || {}) if (BN[k] && sk.bonus[k]) fx.push(`${BN[k]}에게 피해 +${Math.round(sk.bonus[k] * 100)}%`);
    if ((sk.hits || 1) > 1) fx.push(`${sk.hits}연타`); if (sk.count) fx.push(`${sk.count}발`); if (sk.jumps) fx.push(`${sk.jumps}번 튕김`); if (sk.dur) fx.push(`${sk.dur.toFixed(1)}초 지속`);
    if (sk.lifesteal > 0) fx.push(`흡혈 ${Math.round(sk.lifesteal * 100)}%`);
    for (const [k, n] of [["bleed", "출혈"], ["poison", "중독"], ["ignite", "점화"]]) if (sk[k] > 0) fx.push(`${n} 확률 ${Math.round(Math.min(1, sk[k]) * 100)}%`); if (sk.chill > 0) fx.push(`둔화 ${sk.chill.toFixed(1)}초`); if (sk.power > 0) fx.push(`효과 ${Math.round(sk.power * 100)}%`);
    const btns = [];
    if (d.slot !== "passive") for (let i = 0; i < slots; i++) if ((i === 0) === isBasic && j !== i) { const l = lo[i], cur = l && save.skills.find((x) => x.uid === l.uid), cd = cur && SKILLS.find((x) => x.id === cur.id);   // 5.29: 전투력 대신 무엇과 바뀌는지
      btns.push(`<button class="btn blue" data-a="aeq" data-s="${i}">${i === 0 ? "평타 칸" : i + 1 + "번 칸으로"}<small style="color:#d8ccb8">${cd ? "교체: " + cd.name : "빈 칸"}</small></button>`); }
    if (j < 0 && !isBasic) btns.push(`<button class="btn pri" data-a="dissk" data-u="${sel.uid}">분해</button>`);
    const RN = RULES;
    const rule = j >= 0 && lo[j] ? lo[j].rule || "front" : null;
    right = `<div class="adh5">${arcCard(sel.id, sel.rarity, {})}<div style="min-width:0"><b class="adn5">${d.name}</b><div style="color:${SK_RCOL5[sel.rarity]};font-weight:700">${R.name} · Lv ${sel.lvl || 1} / ${SKILL_MAX_LV}${(sel.lvl || 1) < SKILL_MAX_LV ? `  (중복 ${sel.dup || 0}/${sel.lvl || 1})` : ""}</div><div class="tg5">${tags.join(" · ")}</div>
      <div class="ag5"><div class="dpsw5"><small>초당 피해 ⓘ</small><b style="color:#ffc86e">${dps ? fmtPow(dps) : "–"}</b>${dps ? `<div class="dpst5">${dpsBreak5(sk, st)}</div>` : ""}</div><div><small>1회 위력</small><b>${Math.round(sk.mult * 100)}%</b></div><div><small>쿨타임</small><b>${sk.cd.toFixed(1)}초</b></div><div><small>사거리</small><b>${sk.range ? sk.range + "칸" : "–"}</b></div><div><small>범위</small><b>${area}</b></div><div><small>마나</small><b>${sk.mana ? Math.round(sk.mana) : "없음"}</b></div></div></div></div>
      <div class="adesc5">${d.desc}${fx.length ? "<br><br>• " + fx.join("<br>• ") : ""}${sk.rune ? `<br><br>룬: ${sk.rune.name}` : ""}</div>
      <div class="pw5">${isBasic ? "평타 — 1번 칸에만 넣을 수 있습니다" : "아르카나 — 2~4번 칸에 넣습니다"}</div>
      <div class="ab5">${btns.join("")}</div>${rule ? `<button class="btn gold rule5" data-a="arule">대상: ${RN[rule] || rule}  (눌러서 바꾸기)</button>` : ""}`;
  }
  Modal.open(`<h2>아르카나</h2><div class="arc5">${left}<div class="box5 ar5">${right}</div></div>`, { cls: "wide", on: {
    asel: (el) => { ARC5.sel = +el.dataset.u; snd("click"); openSkills(); },
    aflt: (el) => { ARC5.filter = el.dataset.f; openSkills(); }, asrt: () => { ARC5.sort = { rar: "dps", dps: "lvl", lvl: "rar" }[ARC5.sort]; openSkills(); },
    aeq: (el) => arcEquip(ARC5.sel, +el.dataset.s),
    arule: () => { const RL = ["front", "auto", "boss", "ranged", "elite", "normal"], l = save.loadout[slotOf(ARC5.sel)]; if (!l) return; l.rule = RL[(RL.indexOf(l.rule || "front") + 1) % RL.length]; if (G.battle && G.battle.skills) { const bs = G.battle.skills[slotOf(ARC5.sel)]; if (bs) bs.rule = l.rule; } saveGame(); snd("click"); openSkills(); },
    dissk: (el) => { const inst = save.skills.find((x) => x.uid === +el.dataset.u); if (!inst) return; const h = dismantleSkill(save, inst); if (h == null) return toast("장착 중이거나 세트에 포함된 아르카나는 분해할 수 없습니다", "bad"); ARC5.sel = null; snd("coin"); toast(`분해 · 아르카나 조각 +${h}`, "ok"); saveGame(); refreshTop(); openSkills(); },
  } });
  arc5Wire();
}
function arcEquip(uid, slot) {
  const inst = save.skills.find((x) => x.uid === uid); if (!inst) return; const d = SKILLS.find((x) => x.id === inst.id);
  if (d.slot === "passive") return;
  if ((slot === 0) !== (d.slot === "basic")) { toast(slot === 0 ? "1번 칸에는 평타만 넣을 수 있습니다" : "평타는 1번 칸에만 넣을 수 있습니다", "bad"); snd("error"); return; }
  if (slot >= (save.slots || 4)) return;
  const dj = skillDupSlot(save, inst, slot); if (dj >= 0) save.loadout[dj] = null;
  const j = save.loadout.findIndex((l) => l && l.uid === uid), prev = save.loadout[slot]; if (j >= 0) save.loadout[j] = j === 0 ? save.loadout[j] : null;
  save.loadout[slot] = { uid, rule: (prev && prev.rule) || "front" };
  snd("equip"); saveGame(); refreshTop(); ARC5.sel = uid; openSkills();
  if (slot === 3 && typeof tutEvent === "function") tutEvent("equipsk");
}
function arc5Wire() {   // 끌어다 놓기 + 뒤에서 도는 마법진 · 룬 고리 · 피어오르는 마력 입자
  for (const el of $$("#mbox [data-drag]")) el.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", el.dataset.drag); });
  for (const el of $$("#mbox [data-drop]")) { el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("over"); }); el.addEventListener("dragleave", () => el.classList.remove("over")); el.addEventListener("drop", (e) => { e.preventDefault(); arcEquip(+e.dataTransfer.getData("text/plain"), +el.dataset.drop); }); }
  const cv = $("#mbox .arcbg5"); if (!cv) return; const g = cv.getContext("2d"), t0 = performance.now();
  const L = [["fx_mc_main", 1, 90, 0.18], ["fx_mc_runes", 1.18, -140, 0.14], ["fx_mc_inner", 0.42, 60, 0.2]], P = [];
  const tint = (im) => { if (!im || !im.width) return null; const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgb(170,120,255)"; x.fillRect(0, 0, c.width, c.height); return c; };
  const IM = ARC5.im && ARC5.im[0] ? ARC5.im : (ARC5.im = L.map((l) => tint(artGet(l[0]))));   // 물들인 그림은 한 번만 만든다
  const tick = () => { if (!cv.isConnected) return; const t = (performance.now() - t0) / 1000, W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    L.forEach((l, i) => { const im = IM[i]; if (!im) return; const s = 520 * l[1]; g.save(); g.globalAlpha = l[3] * (i === 0 ? 0.75 + 0.25 * Math.sin(t * 1.05) : 1); g.translate(W / 2, H * 0.55); g.rotate(t * Math.PI * 2 / l[2]); g.drawImage(im, -s / 2, -s / 2, s, s); g.restore(); });
    if (Math.random() < 0.07) P.push({ x: Math.random() * W, y: H, vx: (Math.random() - 0.5) * 10, vy: -(0.6 + Math.random() * 0.4) * H / 4.5, r: 1 + Math.random() * 1.5, t: 0, life: 3 + Math.random() * 3 });
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.t += 1 / 60; if (p.t > p.life) { P.splice(i, 1); continue; } g.fillStyle = `rgba(200,170,255,${0.7 * (1 - p.t / p.life)})`; g.beginPath(); g.arc(p.x + p.vx * p.t, p.y + p.vy * p.t, p.r, 0, 7); g.fill(); }
    requestAnimationFrame(tick); };
  tick();
}
// 룬 탭 (로블록스판 Menus.runes): 왼쪽 아르카나 고르기 · 오른쪽 내 룬 (끼우기 · 빼기)
const RUNE5 = { sel: null };
function openRunes5() {
  const sk = save.skills.filter((k) => { const d = SKILLS.find((x) => x.id === k.id); return d && d.slot !== "passive"; });
  if (RUNE5.sel == null || !sk.some((k) => k.uid === RUNE5.sel)) RUNE5.sel = sk[0] ? sk[0].uid : null;
  const sel = sk.find((k) => k.uid === RUNE5.sel), runes = save.runes || [];
  const tiles = sk.map((k) => { const d = SKILLS.find((x) => x.id === k.id); return `<div class="rt5 ${k.uid === RUNE5.sel ? "sel" : ""}" data-a="rsel" data-u="${k.uid}" style="--rc:${SK_RCOL5[k.rarity] || SK_RCOL5[0]}"><img src="${artURL("card_s_" + k.id) || ""}" alt="">${k.rune ? `<i>◆</i>` : ""}<span>${d.name}</span></div>`; }).join("") || `<div class="dim pad">아직 아르카나가 없습니다. 마을의 [아르카나 소환]에서 얻으세요.</div>`;
  let R;
  if (!sel) R = `<div class="dim pad">아르카나마다 룬을 하나 끼울 수 있고, 룬은 아르카나의 동작을 바꿉니다 (쿨타임 · 위력 · 범위 · 출혈 · 점화 …).<br><br>룬은 균열과 보스 전투에서 나옵니다. 먼저 아르카나를 얻고 왼쪽에서 고르세요.</div>`;
  else { const sd = SKILLS.find((x) => x.id === sel.id), cur = sel.rune && RUNES[sel.rune];
    R = `<div class="rh5"><b>${sd.name} · ${cur ? "룬: " + cur.name : "룬 없음"}</b>${cur ? `<button class="btn pri" data-a="runoff">룬 빼기</button>` : ""}</div><div class="rl5">${runes.length ? runes.map((r) => { const D = RUNES[r.id] || {}; return `<div class="rr5"><div><b>◆ ${D.name || r.id}</b><small>${D.text || ""}</small></div><button class="btn purple" data-a="runin" data-u="${r.uid}">끼우기</button></div>`; }).join("") : `<div class="dim pad">아직 룬이 없습니다. 전투에서 얻을 수 있습니다.</div>`}</div>`; }
  Modal.open(`<h2>아르카나</h2><div class="arc5"><div class="box5" style="flex:1"><div class="bh5">아르카나 고르기</div><div class="rg5">${tiles}</div></div><div class="box5" style="flex:1"><div class="bh5">내 룬 (${runes.length})</div>${R}</div></div>`, { cls: "wide", on: {
    rsel: (el) => { RUNE5.sel = +el.dataset.u; snd("click"); openRunes5(); },
    runoff: () => { if (sel.rune) save.runes.push({ uid: save.nextUid++, id: sel.rune }); sel.rune = null; saveGame(); snd("click"); openRunes5(); },
    runin: (el) => { const ru = save.runes.find((x) => x.uid === +el.dataset.u); if (!ru) return; save.runes = save.runes.filter((x) => x !== ru); if (sel.rune) save.runes.push({ uid: save.nextUid++, id: sel.rune }); sel.rune = ru.id; saveGame(); snd("equip"); openRunes5(); },
  } });
}
// 아르카나 목록 탭 (로블록스판 Menus.gachalist): 소환에서 나오는 모든 아르카나 · 가진 것은 레벨
function openGachaList5() {
  const list = SKILLS.filter((d) => GACHA_TIER[d.id] != null).sort((a, b) => (GACHA_TIER[a.id] - GACHA_TIER[b.id]) || ((a.unlock || 0) - (b.unlock || 0)) || (a.id < b.id ? -1 : 1));
  const own = (id) => save.skills.find((k) => k.id === id); const n = list.filter((d) => own(d.id)).length;
  const tiles = list.map((d) => { const t = GACHA_TIER[d.id], k = own(d.id), c = SK_RCOL5[t];
    return `<div class="tl5 ${k ? "" : "dim5"}" style="--rc:${c}"><img src="${artURL("card_s_" + d.id) || ""}" alt=""><em>${SKILL_RARITY[t].name}</em>${k ? `<u>Lv${k.lvl || 1}</u>` : ""}<span>${d.name}</span></div>`; }).join("");
  Modal.open(`<h2>아르카나 소환</h2><div class="box5" style="height:392px"><div class="bh5">소환 가능한 아르카나 ${list.length}종 · 보유 ${n}</div><div class="tg84">${tiles}</div></div>`, { cls: "wide" });
}
// 도움말 탭 (로블록스판 views.help)
function openHelp5() {
  const C = (t, L) => `<div class="hc5"><b>${t}</b>${L.map((x) => `<p>${x}</p>`).join("")}</div>`;
  Modal.open(`<h2>안내소</h2><div class="hl5">${C("게임 흐름", ["영웅은 자동으로 싸웁니다. 아르카나 · 장비 · 패시브로 강해져서 점점 더 높이 올라가세요.", "초원 1~5 → 심연의 균열 1~100층 (전투에서 경험치) · 균열 20/40/80/100층에 보스 관문이 열리고 평타를 떨어뜨립니다 (열쇠는 열쇠 몬스터에게서) → 100층 졸업 → 끝없는 균열 · 보물고"])}
  ${C("전투력 올리는 법 (중요한 순서)", ["1) 장비: 가방에서 [자동 장착]. 초록 ▲ 는 더 좋은 장비입니다. 무기 · 장갑 · 목걸이가 가장 중요합니다.", "2) 아르카나: 1번 칸은 평타 (새 평타 · 레벨업은 보스 관문에서). 2~4번 칸에는 내 계열(물리 · 마법) 아르카나를 소환에서 얻어 넣으세요. 같은 아르카나가 또 나오면 레벨이 오릅니다.", "3) 패시브: 레벨마다 1점. 무기에 맞는 갈래(힘 · 비전)부터, 또는 [자동 배분].", "4) 강화: 제련소에서 장비 강화 · 재굴림. 좋은 옵션(공격력 · 주문력 · 내 피해 종류 · 치명)을 남기세요.", "5) 레벨: 균열 층을 처음 깰 때마다 레벨이 오릅니다. 막히면 아래층에서 장비를 모으세요."])}
  ${C("막혔을 때", ["지도 창의 [권장 전투력]과 내 전투력을 비교하세요. 낮으면 위 순서대로 강해지세요.", "원거리 몬스터에게 많이 맞으면 사거리가 긴 아르카나를, 몬스터가 많으면 범위 아르카나를 섞으세요.", "자동 반복(결과 화면)을 켜면 같은 층을 계속 돌며 장비와 조각을 모읍니다."])}
  ${C("재화", ["골드: 강화 · 상점. 강화석: 장비 강화. 아르카나 조각: 아르카나 소환 (1회 10개, 10회 90개).", "안 쓰는 장비는 분해해 강화석을, 안 쓰는 아르카나는 분해해 아르카나 조각을 얻으세요. 가방의 [자동 분해]를 켜면 전투마다 정리됩니다."])}
  ${C("매일 할 일", ["퀘스트 게시판에서 일일 목표를, 우편함에서 보상을 받으세요. 끝없는 균열은 하루 입장 횟수가 정해져 있습니다."])}</div>`, { cls: "wide" });
}
// 도감 (로블록스판 Menus.codex): 아르카나 카드 전체 · 분류 · 고르면 오른쪽에 정보 (안 가진 것은 회색)
const CXA = { f: "all", sel: null };
function openCodex() {
  const owned = {}; for (const k of save.skills) owned[k.id] = Math.max(owned[k.id] == null ? -1 : owned[k.id], k.rarity);
  const F = [["all", "전체"], ["have", "보유"], ["basic", "평타"], ["phys", "물리"], ["fire", "화염"], ["cold", "냉기"], ["light", "번개"], ["void", "공허"]];
  const all = SKILLS.filter((d) => d.slot !== "passive" && d.id !== "p_none"), have = all.filter((d) => owned[d.id] != null).length;
  const list = all.filter((d) => CXA.f === "all" || (CXA.f === "have" && owned[d.id] != null) || (CXA.f === "basic" && d.slot === "basic") || (CXA.f === "phys" && d.dtype === "phys") || d.elem === CXA.f)
    .sort((a, b) => ((owned[b.id] != null) - (owned[a.id] != null)) || ((a.unlock || 0) - (b.unlock || 0)));
  const card = (d, w, h) => `<div class="ac5 ${CXA.sel === d.id ? "sel" : ""} ${owned[d.id] == null ? "gray5" : ""}" style="width:${w}px;height:${h}px;--rc:${SK_RCOL5[skillTier(d)]}" data-a="cxs" data-id="${d.id}">${arcCard(d.id, skillTier(d), {})}</div>`;
  let R = `<div class="dim pad">카드를 누르면 능력이 나옵니다. 회색 카드는 아직 가지지 않은 아르카나입니다.</div>`;
  const d = CXA.sel && all.find((x) => x.id === CXA.sel);
  if (d) { const own = owned[d.id] != null, tags = [d.slot === "basic" ? "평타" : "아르카나", d.dtype === "mag" ? "마법" : d.dtype === "phys" ? "물리" : "지원"]; if (d.elem && ELEM_NAME[d.elem]) tags.push(ELEM_NAME[d.elem]);
    R = `<div class="adh5"><div class="${own ? "" : "gray5"}">${arcCard(d.id, skillTier(d), {})}</div><div style="min-width:0"><b class="adn5">${d.name}</b><div style="color:${own ? "#8ceb8c" : "#ff8c78"};font-size:13px;margin:2px 0">${own ? `보유 · 최고 등급 ${SKILL_RARITY[owned[d.id]].name}` : "미보유 · [아르카나 소환]에서 얻습니다"}</div><div class="tg5">${tags.join(" · ")}</div></div></div>
      <div class="ag5 c3"><div><small>기본 위력</small><b>${d.mult ? Math.round(d.mult * 100) + "%" : "–"}</b></div><div><small>쿨타임</small><b>${d.cd ? d.cd.toFixed(1) + "초" : "–"}</b></div><div><small>사거리</small><b>${d.range ? d.range + "칸" : "–"}</b></div><div><small>마나</small><b>${d.mana ? d.mana : "없음"}</b></div></div>
      <div class="adesc5" style="height:auto;min-height:120px">${d.desc || ""}</div>`; }
  Modal.open(`<h2>도감</h2><div class="arc5"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px"><div class="cxf5">${F.map(([k, n]) => `<button class="btn xs ${CXA.f === k ? "gold" : ""}" data-a="cxf" data-f="${k}">${n}</button>`).join("")}</div>
    <div class="tbl5" style="flex:1"><div class="th5">아르카나 도감  ${have} / ${all.length}</div><div class="og5">${list.map((x) => card(x, 60, 88)).join("") || `<div class="dim pad">이 분류에 아르카나가 없습니다.</div>`}</div></div></div><div class="box5 ar5">${R}</div></div>`, { cls: "wide", on: {
    cxf: (el) => { CXA.f = el.dataset.f; openCodex(); }, cxs: (el) => { CXA.sel = el.dataset.id; snd("click"); openCodex(); },
  } });
}

// 초당 피해 풀이 (마우스를 올리면): power5.js pwBaseCast · pwCastMult 와 같은 순서로 곱한다
function dpsBreak5(k, s0) {
  const s = Object.assign({}, s0); s.refIlvl = Math.min(6, 1 + ((save.rift && save.rift.best) || 0) / 20);
  const ref = s.refIlvl, act = Math.max(1, Math.min(10, Math.round(ref))), sc = 1 + CFG.DEF_ACT * (act - 1), mag = k.dtype === "mag";
  const base = mag ? s.mag * CFG.MAG_BASE : s.atk * CFG.PHYS_BASE;
  let inc = 1 + s.allDmg + (mag ? s.magDmg : s.physDmg); if (k.elem) inc += s.elemDmg + (s[k.elem + "Dmg"] || 0);
  const ig = Math.min(0.9, (mag ? s.ignoreRes : s.ignoreDef) + (k.ignoreAdd || 0)), sh = (mag ? s.shredRes : s.shredDef) * 0.7, X = 1.1 * sc * (1 - ig) * (1 - sh), red = 1 - Math.min(CFG.DEF_CAP, X / (X + CFG.DEF_C));
  let er = 1; if (k.elem) { const ei = ELEMS.indexOf(k.elem); er = 1 - Math.max(-0.5, Math.min(CFG.RES_CAP, (ACT_ELEM[act - 1] || ACT_ELEM[0])[ei] - s.penElem)); }
  const cc = Math.min(0.9, (mag ? (s.magCrit ? s.critChance + s.spellCrit : s.spellCrit) : s.critChance) + (k.critAdd || 0)), crit = 1 + cc * s.critDmg;
  let bsum = s.add.boss + s.add.elite + s.add.ranged + s.add.normal; for (const v of Object.values(k.bonus || {})) bsum += v;
  const bon = 1 + 0.15 * bsum, kind = pwKindMul(k, s), cast = pwCastMult(k, s), cdr = Math.max(0.2, (k.cd || 1) * (1 - s.cdr));
  const f = (v, dg) => "×" + (v >= 100 ? fmtN(v) : v.toFixed(dg == null ? 2 : dg));
  const rows = [[mag ? "주문력 × 마법 계수" : "공격력 × 물리 계수", fmtN(Math.round(base))], ["1회 피해 배율 (실측 · 맞히는 적 수 포함)", f(cast)], ["피해 증가 % (주는 피해 · 계열 · 원소)", f(inc)],
    [mag ? "적 마법 저항으로 깎임" : "적 방어력으로 깎임", f(red)], ...(k.elem ? [["원소 저항으로 깎임", f(er)]] : []), [`치명타 기대값 (확률 ${Math.round(cc * 100)}% · 피해 +${Math.round(s.critDmg * 100)}%)`, f(crit)],
    ["보스 · 정예 등 추가 피해", f(bon)], ...(kind !== 1 ? [["단일 · 지속 · 소환 보너스", f(kind)]] : []), ["÷ 쿨타임 (쿨타임 감소 반영)", "÷" + cdr.toFixed(2) + "초"]];
  return `<b>초당 피해 계산</b>${rows.map(([a, b]) => `<div><span>${a}</span><em>${b}</em></div>`).join("")}<small>기준: 균열 ${Math.max(1, (save.rift && save.rift.best) || 1)}층 근처 몬스터. 상태이상 · 마나 부족 · 버프가 더 곱해질 수 있습니다.</small>`;
}
