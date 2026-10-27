// =========================================================
// 일일 목표 / 오프라인 보상 / 기록 창
// =========================================================
function openDaily() {
  const D = dailyState(save);
  const rows = DAILY_TASKS.filter((t) => !t.endgame || save.endgame).map((t) => { const p = Math.min(t.n, D[t.key] || 0), done = p >= t.n, got = D.claimed[t.id];
    return `<div class="qrow"><div class="qi"><b>${t.name}</b> <small class="dim">${t.n}회</small><div class="bar"><i style="width:${(p / t.n) * 100}%"></i><span>${p}/${t.n}</span></div><small>보상: ${t.text}</small></div>${got ? `<span class="dim">수령 완료</span>` : `<button class="btn pri" data-a="dclaim" data-id="${t.id}" ${done ? "" : "disabled"}>보상 받기</button>`}</div>`; }).join("");
  const all = DAILY_TASKS.filter((t) => !t.endgame || save.endgame).every((t) => D.claimed[t.id]);
  Modal.open(`<h2>일일 목표</h2><div class="dim center">매일 자정에 초기화됩니다</div><div class="qlist" style="height:300px">${rows}</div><div class="pbtns">${D.bonus ? `<span class="dim">전체 완료 보너스 수령 완료</span>` : `<button class="btn pri" data-a="dbonus" ${all ? "" : "disabled"}>전체 완료 보너스 (룬 1개 · 연마석 10)</button>`}</div>`, { cls: "wide", on: {
    dclaim: (el) => { const r = dailyClaim(save, el.dataset.id); if (r) { snd("quest"); toast("보상을 받았습니다", "ok"); saveGame(); refreshTop(); } openDaily(); },
    dbonus: () => { if (D.bonus) return; D.bonus = true; save.hone += 10; save.runes.push({ uid: save.nextUid++, id: pick(RUNE_IDS) }); snd("legend"); toast("전체 완료 보너스!", "ok"); saveGame(); refreshTop(); openDaily(); },
  } });
}
function openRecords() {
  const s = save.stats, found = Object.keys(save.uniq || {}).filter((k) => UNIQUE_BY_ID[k]), byT = [0, 0, 0, 0, 0]; found.forEach((k) => byT[UNIQUE_BY_ID[k].tier]++);
  const sec = s.sec || 0, rows = [["플레이 시간", `${Math.floor(sec / 3600)}시간 ${Math.floor((sec % 3600) / 60)}분`], ["처치한 몬스터", fmtN(s.kills)], ["클리어한 전투", fmtN(s.clears)], ["균열 최고층", save.rift.best + "층"], ["무한 균열 최고", save.endless.best + "초"], ["스킬 시련 최고", (save.trialBest || 0) + "단계"],
    ["발견한 고유", `${found.length} / ${UNIQUES.length}`], ["고유 등급별", U_TIERS.slice(1).map((t, i) => `${t.name} ${byT[i + 1]}`).join(" · ")], ["보유 스킬", save.skills.length], ["레벨", save.level]];
  Modal.open(`<h2>기록</h2><div class="statgrid" style="grid-template-columns:1fr"><div class="sg">${rows.map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join("")}</div></div>`, { cls: "sm" });
}
function checkOffline(after) {
  const r = offlineReward(save); if (!r) return after && after();
  Modal.open(`<h2>오프라인 보상</h2><div class="center pad">자리를 비운 <b>${Math.round(r.away)}분</b> 동안(최대 8시간) 모험가가 열심히 사냥했습니다.<div class="rgrid" style="margin-top:8px"><div>골드 <b>+${fmtN(r.gold)}</b></div><div>경험치 <b>+${fmtN(r.exp)}</b></div><div>강화석 <b>+${r.ore}</b></div></div></div><div class="pbtns"><button class="btn pri" data-a="off">받기</button></div>`, { cls: "sm", persistent: true, noClose: true, on: {
    off: () => { save.gold += r.gold; save.ore += r.ore; const up = addExp(save, r.exp); save.lastSeen = Date.now(); snd("coin"); if (up) toast(`레벨 업! Lv.${save.level}`, "ok"); saveGame(); refreshTop(); Modal.close(true); if (after) after(); } } });
}

// ---- 업데이트 알림: 서버에 새 버전이 올라오면 화면 상단에 "업데이트하기" 표시 (누를 때만 새로고침) ----
const BUILD_ID = "__BUILD__";
function showUpdateBar() {
  if ($("#updbar")) return; const d = document.createElement("div"); d.id = "updbar";
  d.innerHTML = `<span>새 업데이트가 있습니다</span><button class="btn pri" id="updgo">업데이트하기</button><button class="btn xs" id="updlater">나중에</button>`;
  $("#app").appendChild(d); $("#updgo").onclick = () => { try { saveGame(); } catch (e) {} location.reload(); }; $("#updlater").onclick = () => d.remove();
}
let UPD_SEEN = 0;
async function checkUpdate() {   // 서버에 올라온 버전이 지금 화면보다 "더 새로울 때만" 배너 표시 (workers.dev로 접속했을 때만, 2번 연속 확인)
  if (!/\.workers\.dev$/.test(location.hostname)) return;
  try { const r = await fetch("/api/ver", { cache: "no-store" }), j = await r.json(); if (j && j.ver && j.ver > BUILD_ID) { if (++UPD_SEEN >= 2) showUpdateBar(); } else UPD_SEEN = 0; } catch (e) {}
}
