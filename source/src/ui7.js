// =========================================================
// 보스 관문: 지도의 보스 노드 하나에서 여섯 보스를 페이지로 넘기며 정보 확인 · 입장
// =========================================================
const HUB_BASE_POWER = 80e9;   // 1단계를 겨우 깨는 전투력 기준. 적정 전투력 = 기준 × (몬스터 강도 배율)²
const fmtP = (v) => (v >= 1e12 ? (v / 1e12).toFixed(1) + "T" : v >= 1e9 ? Math.round(v / 1e9) + "B" : v >= 1e6 ? Math.round(v / 1e6) + "M" : Math.round(v).toString());
function hubBosses() {
  const mk = (kind, D, o) => Object.assign({ kind, D, name: D.name }, o);
  return [
    mk("void", VOID_BOSS, { short: "공허의 군주", pool: "void", key: "keys", keyName: "공허의 열쇠", stage: "voidStage", need: VOID_NEED, tiers: VOID_TIER, color: "#c070ff", feat: "공허 · 독 마법 빌드", eye: "보라색 눈알", icon: "🌀" }),
    ...["hive", "titan", "storm", "frost", "poison"].map((k) => { const E = EB[k]; return mk(k, E.boss, { short: E.name, pool: E.pool, key: E.key, keyName: E.keyName, stage: E.stage, need: E.need, tiers: E.tiers, color: E.color, icon: E.icon, feat: { hive: "화염 · 점화 빌드", titan: "물리 · 출혈 빌드 (지속 피해 필요)", storm: "번개 · 감전 빌드", frost: "냉기 · 빙결 빌드", poison: "독 · 중독 빌드 (중독 시 재생 정지)" }[k], eye: { hive: "주황색", titan: "회백색", storm: "노란색", frost: "하늘색", poison: "연두색" }[k] + " 눈알" }); }),
  ];
}
const hubDrops = (kind) => SKILLS.filter((d) => d.slot !== "passive" && bossOfSkill(d) === kind && (isSpecialSkill(d) || d.mythOnly)).sort((a, b) => (a.unlock || 0) - (b.unlock || 0));
function openBossHub(page) {
  const B = hubBosses(); if (page != null) G.hubPage = page; G.hubPage = ((G.hubPage || 0) + B.length) % B.length;
  const b = B[G.hubPage], S = G[b.stage] = Math.max(1, Math.min(4, G[b.stage] || 1)), my = playerPower(computeStats(save)), have = b.kind === "void" ? save.keys : (save[b.key] || 0);
  const mult = (s) => bossRiftMult(b.tiers[s - 1]) / bossRiftMult(100), rec = (s) => HUB_BASE_POWER * mult(s) * mult(s);
  const okNeed = save.rift.best >= b.need[S - 1], can = okNeed && have > 0;
  const stageRows = [1, 2, 3, 4].map((s) => { const r = rec(s), ok = my >= r; return `<button class="bh-st ${s === S ? "on" : ""}" data-a="hubst" data-s="${s}"><b>${s}단계</b><span>×${mult(s).toFixed(1)}</span><em class="${ok ? "up" : "dn"}">${fmtP(r)}</em></button>`; }).join("");
  const rr = BOSS_SKILL_RW[S - 1], rsum = rr.reduce((a, c) => a + c, 0), rn = ["일반", "희귀", "전설", "신화", "사탄", "종말"];
  const rar = rr.map((w, i) => (w ? `<span class="bh-rar r${i}">${rn[i]} ${Math.round((100 * w) / rsum)}%</span>` : "")).join("");
  const drops = hubDrops(b.kind), tiles = drops.map((d) => `<div class="bh-sk" data-tips="${d.id}">${skIcon(d.id, 2)}<span>${d.name}</span></div>`).join("") || `<span class="dim">전용 스킬 없음</span>`;
  const tabs = B.map((x, i) => `<button class="bh-tab ${i === G.hubPage ? "on" : ""}" data-a="hubgo" data-i="${i}" style="--c:${x.color}" title="${x.short}">${x.icon}</button>`).join("");
  const html = `<h2>보스 관문</h2><div class="bh" style="--c:${b.color}">
    <div class="bh-nav"><button class="btn" data-a="hubprev">◀</button><div class="bh-tabs">${tabs}</div><button class="btn" data-a="hubnext">▶</button></div>
    <div class="bh-main">
      <div class="bh-art"><canvas id="bhc" width="250" height="250"></canvas><div class="bh-name">${b.name}</div><div class="bh-page">${G.hubPage + 1} / ${B.length}</div></div>
      <div class="bh-info">
        <div class="bh-feat">${b.feat}</div><div class="bh-desc">${b.D.desc || ""}</div>
        <div class="bh-sttl">단계 선택 · <span class="dim">적정 전투력</span></div><div class="bh-sts">${stageRows}</div>
        <div class="bh-me">내 전투력 <b class="${my >= rec(S) ? "up" : "dn"}">${fmtP(my)}</b> / 적정 <b>${fmtP(rec(S))}</b> <span class="dim">(${my >= rec(S) ? "충분합니다" : "부족할 수 있습니다"})</span></div>
        <div class="bh-key">${b.keyName} <b>${have}</b>개 보유 · 입장 시 1개 소모 · 입장 조건 균열 ${b.need[S - 1]}단계 이상${okNeed ? "" : ` <span class="warn">(현재 ${save.rift.best}단계)</span>`}</div>
        <div class="dim">열쇠 얻는 곳: 균열 · 지옥에서 전투당 1% 확률의 ${b.eye}</div>
        <button class="btn pri big bh-go" data-a="hubenter" ${can ? "" : "disabled"}>${!okNeed ? `균열 ${b.need[S - 1]}단계 필요` : have > 0 ? `${b.short} ${S}단계 도전` : "열쇠 필요"}</button>
      </div>
    </div>
    <div class="bh-drops"><div class="bh-dttl">드랍 <span class="dim">장비 · 미확인의 돌 · 스킬 ${Math.round(BOSS_SKILL_CH[S - 1] * 100)}% (등급 확률 ↓) · 스킬에 마우스를 올리면 효과가 보입니다</span></div>
      <div class="bh-rars">${rar}</div><div class="bh-sks">${tiles}</div></div>
  </div>`;
  const go = (d) => openBossHub(((G.hubPage || 0) + d + B.length) % B.length);
  Modal.open(html, { cls: "bosshub", on: {
    hubprev: () => go(-1), hubnext: () => go(1), hubgo: (el) => openBossHub(+el.dataset.i),
    hubst: (el) => { G[b.stage] = +el.dataset.s; openBossHub(); },
    hubenter: () => {
      if (!can) return; if (b.kind === "void") { if (save.keys < 1) return; save.keys--; } else { if ((save[b.key] || 0) < 1) return; save[b.key]--; } saveGame(); Modal.close(true);
      const hub = MAP.nodes.find((n) => n.kind === "bosshub");
      startBattle(nodeToBattle({ kind: b.kind, act: 11 }), { back: () => { openMap(10); MapView.sel = hub; mapPanel(); openBossHub(); } });
    },
  } });
  const cv = document.getElementById("bhc"); if (!cv) return; const ctx = cv.getContext("2d"), art = bossArt(b.D), t0 = performance.now();
  const draw = () => { if (!document.getElementById("bhc") || document.getElementById("bhc") !== cv) return; const t = (performance.now() - t0) / 1000;
    ctx.clearRect(0, 0, 250, 250); const g = ctx.createRadialGradient(125, 150, 10, 125, 150, 150); g.addColorStop(0, b.color + "66"); g.addColorStop(1, "#0a0614"); ctx.fillStyle = g; ctx.fillRect(0, 0, 250, 250);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(125, 228, 70, 10, 0, 0, 7); ctx.fill();
    drawBossSprite(ctx, art, 125, 232 + Math.sin(t * 2) * 3, 3.4, { hue: b.D.hue });
    setTimeout(draw, 60); };
  draw();
}
