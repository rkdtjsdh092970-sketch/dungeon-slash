// =========================================================
// 5.0 퀘스트 · 일일 · 우편 (로블록스판 Extras.QUESTS · Menus.quests / daily / mail 과 같은 내용 · 배치)
//  퀘스트는 고정 5개, 수락 없이 저절로 진행 → 다 하면 [보상 받기] (보상 + 아르카나 조각 5)
//  창은 줄 카드(rowCard): 왼쪽 아이콘 칸 · 제목 · 설명 · 보상 · 진행 막대 · 오른쪽 버튼, 받을 것이 2개 이상이면 [모두 받기]
// =========================================================
const QUESTS5 = [
  { id: "q5k1", title: "소탕", desc: "적 150마리 처치", type: "kill", n: 150, reward: { gold: 40, ore: 2 } },
  { id: "q5m1", title: "첫 군주", desc: "스테이지 보스 처치", type: "boss", n: 1, reward: { gold: 60, ore: 4 } },
  { id: "q5f1", title: "대장장이의 부탁", desc: "장비 강화 2번", type: "enhance", n: 2, reward: { gold: 80, ore: 4 } },
  { id: "q5f2", title: "소켓의 비밀", desc: "원초의 돌 1개 확인", type: "stone", n: 1, reward: { gold: 400, ore: 6 } },
  { id: "q5r1", title: "균열 도전자", desc: "심연의 균열 3번 클리어", type: "rift", n: 3, reward: { gold: 300, ore: 10 } },
];
const Q5RN = { gold: "골드", ore: "강화석" };
const q5Reward = (d) => Object.keys(d.reward).sort().map((k) => `${Q5RN[k] || k} ${d.reward[k]}`).concat("아르카나 조각 5").join(" · ");
// 예전 액트 퀘스트는 없앤다 (길드 의뢰는 그대로)
function q5Migrate(sv) { for (const id in sv.q || {}) if (QDEFS.some((q) => q.id === id)) delete sv.q[id]; }
// 전투 · 강화 · 돌 확인에서 부른다: 로블록스판 questEvent (kill = 스테이지 처치 수, boss = 스테이지 보스, rift = 균열 클리어)
function q5Event(sv, ev) {
  let typ = null, n = 1;
  if (ev.type === "kill" && (ev.kind === "stage" || ev.kind === "boss")) { typ = "kill"; n = ev.n || 0; }
  else if (ev.type === "boss" && ev.kind === "boss") typ = "boss";
  else if (ev.type === "clear" && ev.kind === "rift") typ = "rift";
  else if (ev.type === "enhance" || ev.type === "stone") typ = ev.type;
  if (!typ || !n) return [];
  const out = []; sv.q = sv.q || {};
  for (const d of QUESTS5) { if (d.type !== typ) continue; const st = sv.q[d.id] = sv.q[d.id] || { p: 0, state: "active" };
    if (st.state === "active") { st.p = Math.min(d.n, st.p + n); if (st.p >= d.n) { st.state = "done"; out.push(d); } } }
  return out;
}
function q5Claim(sv, id) {
  const st = sv.q && sv.q[id], d = QUESTS5.find((x) => x.id === id); if (!d || !st || st.state !== "done") return false;
  for (const k in d.reward) sv[k] = (sv[k] || 0) + d.reward[k]; sv.hone = (sv.hone || 0) + 5; st.state = "claimed"; return true;
}
const dailyReady5 = (sv) => { const D = dailyState(sv); return DAILY_TASKS.some((t) => (!t.endgame || sv.graduated || (sv.cleared[0] || 0) >= 5) && !D.claimed[t.id] && (D[t.key] || 0) >= t.n); };
const q5Ready = (sv) => QUESTS5.some((d) => sv.q && sv.q[d.id] && sv.q[d.id].state === "done");
// 줄 카드 (로블록스판 rowCard)
function rowCard5(o) {
  return `<div class="rw5 ${o.ready ? "ready" : ""} ${o.done ? "done" : ""}">${o.emoji ? `<div class="rwi5" style="--c:${o.color || "#d6a846"}">${o.emoji}</div>` : ""}<div class="rwb5"><b>${o.title}</b>${o.desc ? `<small>${o.desc}</small>` : ""}${o.reward ? `<em>보상  ${o.reward}</em>` : ""}${o.frac != null ? `<div class="rwp5"><i style="width:${Math.min(1, o.frac) * 100}%;background:${o.done ? "#6e6e78" : o.ready ? "#f0be46" : "#5ac86e"}"></i></div>` : ""}</div>${o.btn ? `<button class="btn ${o.ready ? "green" : ""}" ${o.act ? `data-a="${o.act}" data-id="${o.id}"` : "disabled"}>${o.btn}</button>` : ""}${o.extra || ""}</div>`;
}
function openQuests5() {
  q5Migrate(save);
  const RANK = { done: 0, active: 1, claimed: 2 }, rows = QUESTS5.map((d) => ({ d, st: (save.q && save.q[d.id]) || { p: 0, state: "active" } })).sort((a, b) => RANK[a.st.state] - RANK[b.st.state]);
  const ready = rows.filter((r) => r.st.state === "done").length;
  const html = rows.map(({ d, st }) => { const rd = st.state === "done", dn = st.state === "claimed";
    return rowCard5({ emoji: dn ? "✓" : "📜", color: rd ? "#d6a846" : dn ? "#6ec882" : "#968cbe", title: `${d.title} (${Math.min(st.p, d.n)}/${d.n})`, desc: d.desc, reward: q5Reward(d), frac: st.p / d.n, ready: rd, done: dn, btn: dn ? "완료" : rd ? "보상 받기" : "진행 중", act: rd ? "qclaim" : null, id: d.id }); }).join("");
  Modal.open(`<h2>퀘스트</h2><div class="rl5w">${ready > 1 ? `<div class="rwall5"><button class="btn green" data-a="qall">모두 받기 (${ready})</button></div>` : ""}${html}</div>`, { cls: "wide", on: {
    qclaim: (el) => { if (q5Claim(save, el.dataset.id)) { snd("quest"); toast("퀘스트 보상을 받았습니다", "ok"); saveGame(); refreshTop(); } openQuests5(); },
    qall: () => { for (const d of QUESTS5) q5Claim(save, d.id); snd("quest"); saveGame(); refreshTop(); openQuests5(); },
  } });
}
function openDaily() {
  const D = dailyState(save), st = (t) => (D[t.key] || 0) >= t.n && !D.claimed[t.id] ? 0 : D.claimed[t.id] ? 2 : 1;
  const rows = DAILY_TASKS.filter((t) => !t.endgame || save.graduated || (save.cleared[0] || 0) >= 5).sort((a, b) => st(a) - st(b));
  const ready = rows.filter((t) => st(t) === 0).length;
  const html = rows.map((t) => { const p = Math.min(t.n, D[t.key] || 0), rd = st(t) === 0, got = !!D.claimed[t.id];
    return rowCard5({ emoji: got ? "✓" : "📅", color: rd ? "#d6a846" : "#968cbe", title: `${t.name} (${p}/${t.n})`, reward: t.text, frac: p / t.n, ready: rd, done: got, btn: got ? "받음" : rd ? "받기" : "진행 중", act: rd ? "dclaim" : null, id: t.id }); }).join("");
  const bulk = rowCard5({ emoji: "🧹", color: "#968cbe", title: "장비 한꺼번에 정리", desc: "강화한 장비와 사탄 장비는 건드리지 않습니다.", extra: `<div class="rwbk5"><button class="btn pri" data-a="bulk" data-r="0" data-m="dis">일반 분해</button><button class="btn pri" data-a="bulk" data-r="1" data-m="dis">매직까지 분해</button><button class="btn gold" data-a="bulk" data-r="1" data-m="sell">매직까지 판매</button></div>` });
  Modal.open(`<h2>일일</h2><div class="rl5w">${ready > 1 ? `<div class="rwall5"><button class="btn green" data-a="dall">모두 받기 (${ready})</button></div>` : ""}${html}${bulk}</div>`, { cls: "wide", on: {
    dclaim: (el) => { if (dailyClaim(save, el.dataset.id)) { snd("quest"); toast("보상을 받았습니다", "ok"); saveGame(); refreshTop(); } openDaily(); },
    dall: () => { for (const t of rows) if (st(t) === 0) dailyClaim(save, t.id); snd("quest"); saveGame(); refreshTop(); openDaily(); },
    bulk: (el) => { const r = +el.dataset.r, sell = el.dataset.m === "sell"; let n = 0;
      for (const it of save.inv.slice()) { if (it.rarity > r || (it.enh || 0) > 0 || it.sat || isProtected(it)) continue; if (sell) sellItem(save, it); else dismantleItem(save, it); n++; }
      snd("coin"); toast(sell ? `${n}개 판매했습니다` : `${n}개 분해했습니다`, "ok"); saveGame(); refreshTop(); openDaily(); },
  } });
}
const openBoard = openQuests5;
function openQuests() { openQuests5(); }
