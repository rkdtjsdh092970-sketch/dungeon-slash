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
    <div class="bh-drops"><div class="bh-dttl">드랍 <span class="dim">장비 · 원초의 돌 · 스킬 ${Math.round(BOSS_SKILL_CH[S - 1] * 100)}% (등급 확률 ↓) · 스킬에 마우스를 올리면 효과가 보입니다</span></div>
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

// =========================================================
// 돌의 신전: 신관들이 지키는 돌 사냥터 (심연의 문지기를 쓰러뜨린 뒤 입장 · 4레인 · 돌과 골드만 나온다)
// =========================================================
const TEMPLE_ORDER = ["imp", "grunt", "archer", "mage", "brute"], TEMPLE_KEYS = ["pri_imp", "pri_ghoul", "pri_skel", "pri_necro", "pri_brute"];
function openTemple() {
  const T = CFG.TEMPLE, S = G.templeStage = Math.max(1, Math.min(T.OPEN, G.templeStage || 1)), unlocked = !!(save.raid && save.raid.cleared > 0);
  const st = (s) => ({ open: s <= T.OPEN, hi: T.HI[s - 1] });
  const tabs = [1, 2, 3, 4].map((s) => `<button class="bh-st ${s === S ? "on" : ""}" ${s <= T.OPEN ? `data-a="templest" data-s="${s}"` : "disabled"} style="--c:#ffd86a;${s > T.OPEN ? "opacity:.45;cursor:default" : ""}"><b>${s}단계</b><span>${s <= T.OPEN ? "입장 가능" : "🔒 준비 중"}</span><em class="${s <= T.OPEN ? "up" : ""}">${s <= T.OPEN ? (T.HI[s - 1] * 100).toFixed(1) + "%" : "?"}</em></button>`).join("");
  const mons = TEMPLE_ORDER.map((k) => `<div class="tp-mon"><div class="tp-mn">${TEMPLE_MON[k][0]}</div><div class="dim">${TEMPLE_MON[k][1]}</div></div>`).join("");
  const cur = st(S), can = unlocked;
  const html = `<h2>돌의 신전</h2><div class="bh" style="--c:#ffd86a">
    <div class="bh-main">
      <div class="bh-art"><canvas id="tpc" width="250" height="250"></canvas><div class="bh-name">돌의 신전</div><div class="bh-page">4레인 전투</div></div>
      <div class="bh-info">
        <div class="bh-feat">돌 사냥터 · 열쇠 없이 입장</div>
        <div class="bh-desc">돌을 지키는 신관들의 신전입니다. 신관들을 쓰러뜨리면 낮은 확률로 <b style="color:${STONE_T[1].color}">계시의 돌</b>과 <b style="color:${SOCK_TIX.color}">세공의 인장</b>이 나옵니다. 신전 안에서는 4레인으로 전투합니다.</div>
        <div class="bh-sttl">단계 선택</div><div class="bh-sts">${tabs}</div>
        <div class="bh-me">몬스터 강도 <b>균열 ${T.TIERS[S - 1]}층 수준</b> <span class="dim">· 심연의 문지기를 쓰러뜨릴 수 있는 딜이면 돌 수 있습니다</span></div>
        <div class="bh-key">${unlocked ? "입장 조건 충족" : `<span class="warn">입장 조건: 심연의 문지기 모르가스 클리어 (아직 클리어하지 못했습니다)</span>`}</div>
        <button class="btn pri big bh-go" data-a="templego" ${can ? "" : "disabled"}>${can ? `돌의 신전 ${S}단계 입장` : "모르가스 클리어 필요"}</button>
      </div>
    </div>
    <div class="bh-drops"><div class="bh-dttl">드랍 <span class="dim">계시의 돌 · 세공의 인장 · 골드(소량)만 나옵니다 · 장비 · 스킬 · 구슬은 나오지 않습니다</span></div>
      <div class="bh-rars"><span class="bh-rar" style="color:${STONE_T[1].color}">${STONE_T[1].ico} 계시의 돌 약 ${(cur.hi * 100).toFixed(1)}% / 클리어</span><span class="bh-rar" style="color:${SOCK_TIX.color}">${SOCK_TIX.ico} 세공의 인장 약 ${(cur.hi * 100).toFixed(1)}% / 클리어</span><span class="bh-rar" style="color:#ffd24a">골드 소량</span></div>
      <div class="dim" style="margin-top:4px">계시의 돌은 원초의 돌보다 옵션 수치가 약 ${T.HI_MULT}배 높고 제련소 확인 비용이 ${T.HI_COST}배입니다. 세공의 인장은 장비의 소켓 수를 1~3개 중 무작위로 다시 정합니다.</div></div>
    <div class="bh-drops" style="margin-top:8px"><div class="bh-dttl">등장 몬스터</div><div class="tp-mons">${mons}</div></div>
  </div>`;
  Modal.open(html, { cls: "bosshub", on: {
    templest: (el) => { G.templeStage = +el.dataset.s; openTemple(); },
    templego: () => {
      if (!can) return; Modal.close(true); const hub = MAP.nodes.find((n) => n.kind === "temple");
      startBattle(nodeToBattle({ kind: "temple" }), { back: () => { openMap(10); MapView.sel = hub; mapPanel(); openTemple(); } });
    },
  } });
  const cv = document.getElementById("tpc"); if (!cv) return; const ctx = cv.getContext("2d"), t0 = performance.now();
  const draw = () => { if (document.getElementById("tpc") !== cv) return; const t = (performance.now() - t0) / 1000; ctx.imageSmoothingEnabled = false;
    const g = ctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, "#2a2140"); g.addColorStop(1, "#0d0a18"); ctx.fillStyle = g; ctx.fillRect(0, 0, 250, 250);
    const gl = ctx.createRadialGradient(125, 70, 5, 125, 70, 130); gl.addColorStop(0, "rgba(255,216,106,.45)"); gl.addColorStop(1, "rgba(255,216,106,0)"); ctx.fillStyle = gl; ctx.fillRect(0, 0, 250, 250);
    ctx.fillStyle = "#3a3050"; for (const x of [16, 70, 164, 218]) { ctx.fillRect(x, 40, 16, 170); ctx.fillStyle = "#4e4268"; ctx.fillRect(x - 4, 36, 24, 8); ctx.fillRect(x - 4, 206, 24, 8); ctx.fillStyle = "#3a3050"; }
    ctx.fillStyle = "#4e4268"; ctx.fillRect(0, 214, 250, 36); ctx.fillStyle = "#6a5a8a"; ctx.fillRect(0, 214, 250, 3);
    const pos = [[46, 234, 1.25], [204, 234, 1.25], [92, 238, 1.35], [160, 238, 1.35], [125, 212, 2.0]];
    for (const i of [4, 0, 1, 2, 3]) { const key = TEMPLE_KEYS[i], [x, y, sc] = pos[i], af = animFrame(key, "walk", t + i * 0.3); drawSprite(ctx, getSheet(key, 0), af.row, af.frame, x, y, sc, i % 2 === 1 && i < 4, 1, null); }
    ctx.shadowColor = "#ffd86a"; ctx.shadowBlur = 12; ctx.fillStyle = STONE_T[0].color; ctx.fillRect(122, 128 + Math.sin(t * 2) * 3, 6, 6); ctx.fillStyle = STONE_T[1].color; ctx.fillRect(134, 120 + Math.sin(t * 2 + 1) * 3, 5, 5); ctx.shadowBlur = 0;
    setTimeout(draw, 60); };
  draw();
}

// =========================================================
// 솟아난 탑: 100층 · 20층마다 벽 · 4레인 · 일반 전설 장비와 사탄 장비가 나온다
// =========================================================
function openSpire() {
  const S = CFG.SPIRE, P = save.spire || { best: 0 }, max = Math.min(S.END, P.best + 1), f = G.spireFloor = Math.max(1, Math.min(max, G.spireFloor || max));
  const wall = f % S.WALL === 0, nextWall = Math.min(S.END, Math.ceil(f / S.WALL) * S.WALL), sat = (S.SAT * 100).toFixed(0);
  const marks = [20, 40, 60, 80, 100].map((w) => `<button class="btn xs" data-a="spfl" data-f="${w}" ${w > max ? "disabled" : ""}>${w}층${P.best >= w ? " ✔" : ""}</button>`).join(" ");
  const html = `<h2>솟아난 탑</h2><div class="bh" style="--c:#ff5a4a"><div class="bh-main"><div class="bh-info" style="flex:1">
    <div class="bh-feat">${wall ? "🧱 벽 층" : "탑"} · 4레인</div>
    <div class="bh-desc">100층까지 이어지는 탑입니다. <b>20층마다 벽</b>이 있어 장비를 갖춰야 넘을 수 있습니다. 일반 전설 장비와 함께 부위마다 다른 고유 한 줄이 붙은 <b style="color:${SAT_COLOR}">사탄 장비</b>가 나옵니다.</div>
    <div class="bh-sttl">층 선택</div>
    <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin:6px 0"><button class="btn" data-a="spd" ${f <= 1 ? "disabled" : ""}>−</button><b style="font-size:26px;min-width:90px;text-align:center">${f}층</b><button class="btn" data-a="spu" ${f >= max ? "disabled" : ""}>＋</button></div>
    <div style="text-align:center">${marks}</div>
    <div class="bh-me">최고 기록 <b>${P.best}층</b> <span class="dim">· 다음 벽 ${nextWall}층</span></div>
    <div class="bh-key dim">드랍: 장비(전설 비중 높음) · 장비 하나가 사탄 장비일 확률 약 ${sat}% · 벽 층을 처음 넘으면 사탄 장비 1개 확정 · 구슬 · 조각 · 골드</div>
    <button class="btn pri big bh-go" data-a="spgo">탑 ${f}층 입장</button>
  </div></div></div>`;
  Modal.open(html, { cls: "bosshub", on: {
    spd: () => { G.spireFloor = f - 1; openSpire(); }, spu: () => { G.spireFloor = f + 1; openSpire(); }, spfl: (el) => { G.spireFloor = +el.dataset.f; openSpire(); },
    spgo: () => { Modal.close(true); const hub = MAP.nodes.find((n) => n.kind === "tower"); startBattle(nodeToBattle(hub), { back: () => { openMap(10); MapView.sel = hub; mapPanel(); openSpire(); } }); },
  } });
}
