// =========================================================
// 5.0 마을 (로블록스판 Client.lua BUILD 와 같은 건물 · 위치 · 탭 묶음)
// 건물은 마을 그림(bg_town)에 그려져 있다. box = 그림 기준 영역 (x0, y0, x1, y1). 비슷한 기능은 한 건물에 탭으로 묶는다
// 오른쪽 위 건물(로블록스판 Info Desk)은 웹판에서는 업데이트 게시판 (게시판 · 우편함 · 도감 · 기록)
// =========================================================
const TOWN5 = [
  { id: "guild", name: "길드", box: [0.206, 0.17, 0.434, 0.47], tabs: [["길드", () => openGuild()], ["랭킹", () => openRanking()]] },
  { id: "skillshop", name: "아르카나 소환", box: [0.455, 0.06, 0.635, 0.5], tabs: [["아르카나 소환", () => openSummon()], ["아르카나 목록", () => openGachaList5()]] },
  { id: "notice", name: "업데이트 게시판", box: [0.67, 0.2, 0.815, 0.51], badge: () => typeof notesUnread === "function" && notesUnread(),
    tabs: [["업데이트 게시판", () => openNotes()], ["우편함", () => openMail()], ["도움말", () => openHelp5()], ["도감", () => { CX.sel = null; openCodex(); }], ["기록", () => openRecords()]] },
  { id: "trainer", name: "훈련소", box: [0.0, 0.38, 0.25, 0.59], badge: () => passivePoints(save) - passiveSpent(save) > 0,
    tabs: [["패시브", () => openPassives()], ["허수아비", () => openDummy()], ["전직", () => openClass(() => {})], ["참", () => openCharms()]] },
  { id: "board", name: "퀘스트 게시판", box: [0.83, 0.38, 0.99, 0.65], badge: () => Object.keys(save.q || {}).some((id) => save.q[id].state === "done"),
    tabs: [["퀘스트", () => openBoard()], ["일일", () => openDaily()]] },
  { id: "skill", name: "아르카나 공방", box: [0.06, 0.53, 0.335, 0.85], tabs: [["아르카나", () => openSkills()], ["룬", () => openRunes5()]] },
  { id: "forge", name: "제련소", box: [0.338, 0.53, 0.553, 0.87], tabs: [["강화", () => openItems("forge")], ["돌", () => openStones()]] },
  { id: "shop", name: "창고", box: [0.565, 0.6, 0.837, 0.885], tabs: [["창고", () => openStash()], ["장비", () => { IB.mode = "inv"; IB.sel = null; renderItems(); }]] },
];
// 탭 묶음 창: 건물을 누르면 첫 탭을 열고, 창 위에 탭 줄을 붙인다 (창이 다시 그려져도 유지)
function openGroup(B, i) {
  G.grp = { B, i: i || 0 }; try { B.tabs[G.grp.i][1](); } catch (e) { console.error(e); } if (G.grp) { const h = $("#mbox h2"); G.grp.h2 = h ? h.textContent : null; } grpBar();
}
function grpBar() {
  const g = G.grp, box = $("#mbox"); if (!g || !box || !Modal.isOpen() || g.B.tabs.length < 2) return;
  if (box.querySelector(".grpbar")) return;
  const bar = document.createElement("div"); bar.className = "grpbar";
  bar.innerHTML = g.B.tabs.map(([n], k) => `<button class="tab ${k === g.i ? "on" : ""}" data-g="${k}">${n}</button>`).join("");
  bar.querySelectorAll("[data-g]").forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); snd("click"); const k = +b.dataset.g, B = g.B; Modal.close(true); openGroup(B, k); });
  const h2 = box.querySelector("h2"); if (h2) h2.after(bar); else box.prepend(bar);
}
const town5Rect = (B) => { const [x0, y0, x1, y1] = B.box; return { x: x0 * CW, y: y0 * CH, w: (x1 - x0) * CW, h: (y1 - y0) * CH }; };
function town5Pick(mx, my) { for (const B of TOWN5) { const r = town5Rect(B); if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return B; } return null; }
function town5Draw(g, time, hover) {
  for (const B of TOWN5) {
    const r = town5Rect(B), hot = hover && hover.id === B.id, cx = r.x + r.w / 2, ly = r.y + r.h - 4;
    if (hot) { g.save(); const gr = g.createRadialGradient(cx, r.y + r.h * 0.55, 10, cx, r.y + r.h * 0.55, Math.max(r.w, r.h) * 0.6); gr.addColorStop(0, "rgba(255,200,140,.28)"); gr.addColorStop(1, "rgba(255,200,140,0)"); g.fillStyle = gr; g.fillRect(r.x, r.y, r.w, r.h); g.restore(); }
    g.save(); g.font = "bold 15px Georgia, serif"; g.textAlign = "center"; const tw = g.measureText(B.name).width + 22;
    g.fillStyle = "rgba(14,8,8,.78)"; rrect(g, cx - tw / 2, ly - 12, tw, 24, 6); g.fill(); g.strokeStyle = hot ? "#ffe6a0" : "rgba(200,150,70,.85)"; g.lineWidth = 1.5; rrect(g, cx - tw / 2, ly - 12, tw, 24, 6); g.stroke();
    g.fillStyle = hot ? "#fff3c8" : "#f0dec4"; g.fillText(B.name, cx, ly + 5);
    if (B.badge && save && B.badge()) { g.fillStyle = "#ff4a4a"; g.beginPath(); g.arc(cx + tw / 2 - 2, ly - 10, 6 + Math.sin(time * 5), 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); }
    g.restore();
  }
}
// 상단 메뉴도 로블록스판처럼 탭 묶음 창으로 연다 (Client topButton)
const TOP5 = { "b-inv": { name: "장비", tabs: [["장비", () => { IB.mode = "inv"; IB.sel = null; renderItems(); }], ["창고", () => openStash()]] },
  "b-skill": { name: "아르카나", tabs: [["아르카나", () => openSkills()], ["룬", () => openRunes5()]] },
  "b-quest": { name: "퀘스트", tabs: [["퀘스트", () => openQuests(false)], ["일일", () => openDaily()]] } };
function top5Wire() { for (const id in TOP5) { const b = document.getElementById(id); if (b) b.onclick = () => { snd("click"); if (G.grp) G.grp = null; openGroup(TOP5[id], 0); }; } }
