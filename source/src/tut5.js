// =========================================================
// 5.0 튜토리얼 (로블록스판과 같은 순서): 소환 → 새 카드를 4번 칸에 → 첫 전투 → (초원 1~3 첫 클리어 뒤) 장비 · 패시브 · 강화 → 보스 안내
// save.tut5 = 단계 (0 시작 · 99 끝). 반짝이는 테두리(#tutHi)가 눌러야 할 곳을 가리킨다
// =========================================================
const TUT5 = [
  { title: "스킬 소환", text: "시작 선물로 아르카나 조각 90개를 받았어요. 마을의 <b>[스킬 소환]</b> 탑을 누르고, 내 계열 탭이 고른 상태에서 <b>[10회 소환]</b>을 눌러 보세요.", ev: "pulled",
    target: () => G.screen === "town" && !Modal.isOpen() ? { town: "skillshop" } : document.querySelector('[data-a="s10"]:not([disabled])') },
  { title: "스킬 칸", text: "전투에서는 위쪽 4칸에 넣은 스킬만 씁니다 (1번 = 평타, 2~4번 = 스킬). 위 메뉴 <b>[스킬]</b>에서 <b>4번 칸</b>을 누르고, 새로 뽑은 스킬을 골라 <b>[장착]</b>하세요.", ev: "equipsk",
    target: () => !Modal.isOpen() ? $("#b-skill") : !document.querySelector('[data-a="slot"]') ? document.querySelector("#modal .x") : SK.slot !== 3 ? document.querySelector('[data-a="slot"][data-s="3"]') : document.querySelector('[data-a="equipsk"]:not([disabled])') || document.querySelector('[data-a="picksk"]:not(.used)') },
  { title: "첫 전투", text: "창을 닫고 위쪽 <b>[🗺 지도]</b> → 반짝이는 <b>[초원 1]</b> → <b>[도전]</b>. 전투는 자동으로 진행됩니다.", ev: "battle",
    target: () => Modal.isOpen() ? document.querySelector("#modal .x") : G.screen !== "map" ? $("#b-map") : (MapView.sel && MapView.sel.id === "S1-1" ? document.querySelector('#mappanel [data-p="go"]') : { map: "S1-1" }) },
  { title: "장비 장착", text: "전투에서 장비를 얻었어요! 위 메뉴 <b>[장비]</b>를 열고 <b>[추천 장비 착용]</b>을 누르세요. 초록 ▲ 는 더 좋은 장비 표시입니다.", ev: "power", after: 1,
    target: () => !Modal.isOpen() ? $("#b-inv") : !document.querySelector('[data-a="recommend"]') ? document.querySelector("#modal .x") : document.querySelector('[data-a="recommend"]:not([disabled])') },
  { title: "패시브", text: "레벨이 올라 패시브 포인트가 생겼어요. 위 메뉴 <b>[패시브]</b>에서 <b>[자동 배분]</b>을 누르세요. 나중에 직접 노드를 눌러 찍을 수도 있어요.", ev: "power", after: 2,
    target: () => !Modal.isOpen() ? $("#b-pass") : !document.querySelector('[data-a="pauto"]') ? document.querySelector("#modal .x") : document.querySelector('[data-a="pauto"]') },
  { title: "장비 강화", text: "마을 <b>[제련소]</b>에서 장비를 강화하면 전투력이 오릅니다. 무기를 고르고 반짝이는 <b>[강화]</b>를 눌러 보세요.", ev: "power", after: 3,
    target: () => { if (G.screen !== "town") return $("#b-town") || null; if (!Modal.isOpen()) return { town: "forge" }; const e = document.querySelector('[data-a="enh"]'); if (e) return e; if (IB.mode !== "forge") return document.querySelector("#modal .x"); if (!IB.sel && save.equipped.weapon) { IB.sel = save.equipped.weapon; renderItems(); } return document.querySelector('[data-a="enh"]'); } },
];
function tutStep() { return save && save.tut5 != null ? save.tut5 : 99; }
function tutEvent(ev) {
  const T = TUT5[tutStep()]; if (!T || T.ev !== ev) return;
  save.tut5++; while (TUT5[save.tut5] && TUT5[save.tut5].after && (save.cleared[0] || 0) < TUT5[save.tut5].after) break;
  if (save.tut5 >= TUT5.length) { save.tut5 = 99; setTimeout(() => toast("다음은 들판의 군주 그룸! 지도에서 권장 전투력과 내 전투력을 비교해 보세요. 그룸을 쓰러뜨리면 심연의 균열이 열립니다.", "ok"), 600); }
  saveGame();
}
// 시작 인사 (로블록스판 coach): 직업을 고른 직후
function tutWelcome() {
  const mage = save.equipped.weapon && save.equipped.weapon.wt === "staff";
  Modal.open(`<h2>환영합니다, ${mage ? "마법사" : "전사"}!</h2><div class="tutw"><img src="${artURL(mage ? "mage" : "warrior") || ""}" alt=""><div>
    <p>던전 슬래시는 <b>자동 전투</b> 게임입니다. 영웅은 스스로 싸우고, 여러분은 <b>스킬 · 장비 · 패시브</b>로 영웅을 강하게 만듭니다.</p>
    <p>화면에서 <b style="color:#ffd24a">반짝이는 곳</b>을 차례대로 눌러 보세요. 오른쪽 아래 안내 상자가 다음 할 일을 알려 줍니다.</p></div></div>
    <div class="pbtns"><button class="btn" data-a="skip">안내 건너뛰기</button><button class="btn pri big" data-a="go">시작하기</button></div>`, { noClose: true, on: {
    go: () => { Modal.close(true); snd("click"); }, skip: () => { tutSkip(); Modal.close(true); },
  } });
}
function tutSkip() { if (save) { save.tut5 = 99; saveGame(); } }
// 매 프레임: 지금 단계의 안내 글 · 반짝이는 테두리
let tutScrollEl = null;
function tutTick() {
  const hi = $("#tutHi"), box = $("#tutBox"); if (!hi) return;
  const T = TUT5[tutStep()], waiting = T && T.after && (save.cleared[0] || 0) < T.after;
  if (!save || !T || waiting || G.screen === "battle" || G.screen === "title" || (Modal.isOpen() && document.querySelector("#mbox .tutw"))) { hi.style.display = "none"; box.style.display = "none"; if ($("#tutArrow")) $("#tutArrow").style.display = "none"; return; }
  box.style.display = ""; box.querySelector(".tt").textContent = T.title; box.querySelector(".tx").innerHTML = T.text;
  let t = null; try { t = T.target(); } catch (e) {}
  let r = null;
  if (t && t.map) { const n = MAP.byId[t.map], cv = $("#cv"), cr = cv.getBoundingClientRect(), k = cr.width / CW; if (n) r = { left: cr.left + (n.x - MapView.cam.x - 24) * k, top: cr.top + (n.y - MapView.cam.y - 24) * k, width: 48 * k, height: 48 * k }; }
  else if (t && t.town) { const s = townSpots().find((x) => x.id === t.town), cv = $("#cv"), cr = cv.getBoundingClientRect(), k = cr.width / CW; if (s) r = { left: cr.left + (s.x - s.w) * k, top: cr.top + (s.y - s.h) * k, width: s.w * 2 * k, height: (s.h + 30) * k }; }
  else if (t && t.getBoundingClientRect) { const ap = $("#app").getBoundingClientRect(); let b = t.getBoundingClientRect();
    if (b.width > 0 && (b.bottom > ap.bottom - 4 || b.top < ap.top + 40) && t.scrollIntoView && tutScrollEl !== t) { tutScrollEl = t; t.scrollIntoView({ block: "center" }); b = t.getBoundingClientRect(); }   // 창 안에서 가려져 있으면 보이게
    if (b.width > 0) r = b; }
  if (!r) { hi.style.display = "none"; if ($("#tutArrow")) $("#tutArrow").style.display = "none"; return; }
  const app = $("#app").getBoundingClientRect(), sc = app.width / CW;
  const ar = $("#tutArrow"); if (ar) { ar.style.display = ""; const below = r.top - app.top < 120 * sc; ar.style.left = (r.left - app.left + r.width / 2) / sc - 22 + "px"; ar.style.top = (below ? (r.top - app.top + r.height) / sc + 6 : (r.top - app.top) / sc - 58) + "px"; ar.classList.toggle("up", below); }
  { const bx = (r.left - app.left) / sc, low = (r.top - app.top) / sc > 300 && bx > 560; box.style.bottom = low ? "auto" : "46px"; box.style.top = low ? "60px" : "auto"; }   // 안내 상자가 대상을 가리지 않게
  hi.style.display = ""; hi.style.left = (r.left - app.left) / sc - 6 + "px"; hi.style.top = (r.top - app.top) / sc - 6 + "px"; hi.style.width = r.width / sc + 12 + "px"; hi.style.height = r.height / sc + 12 + "px";
}
