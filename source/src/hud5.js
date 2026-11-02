// =========================================================
// 5.0 전투 화면 HUD (로블록스판 Stage.lua 와 같은 구성)
//  왼쪽 위: 상태판(hud_plate) + 초상화 고리 + 레벨 보석 + 장식 틀 체력 · 마나 + 처치 수
//  위 가운데: 단계 이름 · 남은 적 + 장식 틀 보스 체력
//  오른쪽 위: 일시정지 · 배속(누르면 아래로 펼침) · 자동 반복
//  왼쪽 아래: 카드형 스킬 칸 (위에 쿨타임 숫자, 카드에 어둠이 차올랐다 걷힘)
// 기존 요소 id(hp-fill, wave-txt, boss-fill …)는 그대로 둬서 battleHud() 가 그대로 갱신한다
// =========================================================
function hud5Build() {
  const U = (k) => ART_BASE + k + ".png";
  const h = $("#battlehud");
  h.innerHTML = `
  <div class="h5L"><img class="h5plate" src="${U("hud_plate")}" alt="">
    <div class="h5face"><img id="pf-ico" alt=""></div><img class="h5ring" src="${U("hud_portrait")}" alt=""><div class="h5gem"><b id="pf-lv">1</b></div>
    <div class="h5hp"><div class="hpbar2"><i id="hp-ghost"></i><i id="hp-fill"></i><span id="hp-txt"></span></div><img src="${U("hud_bar")}" alt=""></div>
    <div class="h5mp mpbar2"><i id="mp-fill"></i><span id="mp-txt"></span></div>
    <div class="h5kill">☠ <span id="h5kill">0</span></div><div id="status"></div></div>
  <div class="h5T"><div id="bh-name"></div><div class="wavew"><div class="wavebar"><div id="wave-fill"></div></div><div id="wave-txt"></div></div>
    <div id="bossbar" class="hidden"><div class="bn"><b id="boss-name"></b> <em id="boss-pct"></em></div><div class="bb"><i id="boss-ghost"></i><i id="boss-fill"></i><u style="left:25%"></u><u style="left:50%"></u><u style="left:75%"></u></div><img src="${U("hud_boss")}" alt=""></div></div>
  <div class="h5R ctrl"><button class="btn" id="b-pause">II</button><button class="btn pri" id="b-speed">×1 ▼</button><button class="btn" id="b-auto">자동 OFF</button><button class="btn warn" id="b-flee" style="display:none">퇴각</button>
    <div id="h5spd">${[1, 2, 3].map((i) => `<button class="btn" data-spd="${i}">×${i}</button>`).join("")}</div></div>
  <div id="banner"></div><div id="skillbar"></div><div id="tip" class="hidden"></div>
  <div id="h5pause" class="hidden"><div class="h5pp"><h3>일시정지</h3><button class="btn big" id="h5res">▶ 계속</button><button class="btn big" id="h5map">지도</button><button class="btn big pri" id="h5town">마을로 귀환</button><small class="dim">돌아가면 이번 전투 보상은 없습니다</small></div></div>`;
  // 일시정지 · 배속 · 자동 · 귀환
  const pause = (on) => { G.paused = on; $("#h5pause").classList.toggle("hidden", !on); };
  $("#b-pause").onclick = () => { snd("click"); pause(!G.paused); };
  $("#h5res").onclick = () => pause(false);
  const leave = (dest) => { pause(false); if (!G.battle || G.battle.over) return; AU.stopBgm(); stopAuto5(); G.battle = null; if (dest === "map") openMap(); else openTown(G.townAct || 1); };
  $("#h5map").onclick = () => leave("map"); $("#h5town").onclick = () => leave("town");
  $("#b-speed").onclick = () => { snd("click"); $("#h5spd").classList.toggle("open"); };
  for (const b of $$("#h5spd [data-spd]")) b.onclick = () => { G.speed = +b.dataset.spd; $("#b-speed").textContent = "×" + G.speed + " ▼"; $("#h5spd").classList.remove("open"); snd("click"); };
  $("#b-flee").onclick = () => { snd("click"); retreat(); };
  $("#b-auto").onclick = () => { setAuto5((auto5() + 1) % 3); snd("click"); toast(AUTO5_TXT[auto5()]); };
}
// 카드형 스킬 칸 (로블록스판: 카드 그림 · 등급 테두리 · 아래 이름 띠 · 위 쿨타임 숫자)
function hud5Skills(b) {
  const RC = ["#aaaab4", "#5096ff", "#ff9628", "#be5aff", "#e62832"];
  $("#skillbar").innerHTML = b.skills.map((sk, i) => sk ? `<div class="bslot h5card" data-i="${i}" title="클릭: 타겟 규칙 바꾸기"><span class="cds"></span><div class="h5c" style="border-color:${RC[sk.rarity] || RC[0]}"><img src="${artURL("card_s_" + sk.id) || ""}" alt=""><div class="cdm"></div><div class="h5n">${sk.name}</div><span class="rl"></span><span class="mc"></span></div><span class="kn">${i + 1}</span></div>` : `<div class="bslot h5empty"></div>`).join("");
  $$("#skillbar .bslot[data-i]").forEach((el) => el.addEventListener("click", () => { const i = +el.dataset.i, sk = G.battle.skills[i]; if (!sk) return; const n = RULE_ORDER[(RULE_ORDER.indexOf(sk.rule) + 1) % RULE_ORDER.length]; sk.rule = n; if (save.loadout[i]) save.loadout[i].rule = n; snd("click"); toast(`${sk.name}: ${RULES[n]}`); }));
}
function hud5Tick(b) {
  const k = $("#h5kill"); if (k) k.textContent = b.kills;
  b.skills.forEach((sk, i) => { if (!sk) return; const el = document.querySelector(`#skillbar .bslot[data-i="${i}"] .cds`); if (el) el.textContent = sk.cdLeft > 0.05 ? sk.cdLeft.toFixed(1) : ""; });
}
