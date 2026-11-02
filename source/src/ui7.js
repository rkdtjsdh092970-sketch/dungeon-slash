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
const hubDrops = (kind) => [...(GATE_BASIC[kind] || []).map((id) => SKILLS.find((d) => d.id === id)).filter(Boolean), ...SKILLS.filter((d) => d.slot !== "passive" && bossOfSkill(d) === kind && (isSpecialSkill(d) || d.mythOnly)).sort((a, b) => (a.unlock || 0) - (b.unlock || 0))];   // 4.54: 관문 평타 먼저
function openBossHub(page, up) {
  if (up != null) G.hubUp = !!up; const UPM = !!G.hubUp;
  const B = hubBosses(); if (page != null) G.hubPage = page; G.hubPage = ((G.hubPage || 0) + B.length) % B.length;
  const b0 = B[G.hubPage], skey = UPM ? "up_" + b0.stage : b0.stage, b = UPM ? Object.assign({}, b0, { tiers: UP_TIERS, need: [0, 0, 0, 0], stage: skey }) : b0, S = G[skey] = Math.max(1, Math.min(4, G[skey] || 1)), my = playerPower(computeStats(save)), have = b.kind === "void" ? save.keys : (save[b.key] || 0), cost = UPM ? UP_KEYS : 1;
  const mult = (s) => bossRiftMult(b.tiers[s - 1]) / bossRiftMult(100), rec = (s) => HUB_BASE_POWER * mult(s) * mult(s);
  const okNeed = UPM ? !!(save.craid && save.craid[2]) : save.rift.best >= b.need[S - 1], can = okNeed && have >= cost;
  const stageRows = [1, 2, 3, 4].map((s) => { const r = rec(s), ok = my >= r; return `<button class="bh-st ${s === S ? "on" : ""}" data-a="hubst" data-s="${s}"><b>${s}단계</b><span>×${mult(s).toFixed(1)}</span><em class="${ok ? "up" : "dn"}">${fmtP(r)}</em></button>`; }).join("");
  const rr = (UPM ? UP_SKILL_RW : BOSS_SKILL_RW)[S - 1], rsum = rr.reduce((a, c) => a + c, 0), rn = ["일반", "희귀", "전설", "신화", "사탄", "종말"];
  const rar = rr.map((w, i) => (w ? `<span class="bh-rar r${i}">${rn[i]} ${Math.round((100 * w) / rsum)}%</span>` : "")).join("");
  const drops = hubDrops(b.kind), tiles = drops.map((d) => `<div class="bh-sk" data-tips="${d.id}">${skIcon(d.id, 2)}<span>${d.name}</span></div>`).join("") || `<span class="dim">전용 스킬 없음</span>`;
  const tabs = B.map((x, i) => `<button class="bh-tab ${i === G.hubPage ? "on" : ""}" data-a="hubgo" data-i="${i}" style="--c:${x.color}" title="${x.short}">${x.icon}</button>`).join("");
  const html = `<h2>${UPM ? "상위 보스 관문" : "보스 관문"}</h2><div class="bh" style="--c:${b.color}">
    <div class="bh-nav"><button class="btn" data-a="hubprev">◀</button><div class="bh-tabs">${tabs}</div><button class="btn" data-a="hubnext">▶</button></div>
    <div class="bh-main">
      <div class="bh-art"><canvas id="bhc" width="250" height="250"></canvas><div class="bh-name">${b.name}</div><div class="bh-page">${G.hubPage + 1} / ${B.length}</div></div>
      <div class="bh-info">
        <div class="bh-feat">${b.feat}</div><div class="bh-desc">${b.D.desc || ""}</div>
        <div class="bh-sttl">단계 선택 · <span class="dim">적정 전투력</span></div><div class="bh-sts">${stageRows}</div>
        <div class="bh-me">내 전투력 <b class="${my >= rec(S) ? "up" : "dn"}">${fmtP(my)}</b> / 적정 <b>${fmtP(rec(S))}</b> <span class="dim">(${my >= rec(S) ? "충분합니다" : "부족할 수 있습니다"})</span></div>
        <div class="bh-key">${b.keyName} <b>${have}</b>개 보유 · 입장 시 ${cost}개 소모 · ${UPM ? "입장 조건 노말 레이드 클리어" : `입장 조건 균열 ${b.need[S - 1]}단계 이상${okNeed ? "" : ` <span class="warn">(현재 ${save.rift.best}단계)</span>`}`}</div>
        <div class="dim">열쇠 얻는 곳: 균열 · 지옥 · 솟아난 탑에서 전투당 1% 확률의 ${b.eye}</div>
        <button class="btn pri big bh-go" data-a="hubenter" ${can ? "" : "disabled"}>${!okNeed ? (UPM ? "노말 레이드 클리어 필요" : `균열 ${b.need[S - 1]}단계 필요`) : have >= cost ? `${UPM ? "상위 " : ""}${b.short} ${S}단계 도전` : `열쇠 ${cost}개 필요`}</button>
      </div>
    </div>
    <div class="bh-drops"><div class="bh-dttl">드랍 <span class="dim">장비 · 원초의 돌 · 스킬 ${Math.round((UPM ? UP_SKILL_CH : BOSS_SKILL_CH)[S - 1] * 100)}% (등급 확률 ↓) · 스킬에 마우스를 올리면 효과가 보입니다</span></div>
      <div class="bh-rars">${rar}</div><div class="bh-sks">${tiles}</div></div>
  </div>`;
  const go = (d) => openBossHub(((G.hubPage || 0) + d + B.length) % B.length, UPM);
  Modal.open(html, { cls: "bosshub", on: {
    hubprev: () => go(-1), hubnext: () => go(1), hubgo: (el) => openBossHub(+el.dataset.i, UPM),
    hubst: (el) => { G[skey] = +el.dataset.s; openBossHub(null, UPM); },
    hubenter: () => {
      if (!can) return; if (b.kind === "void") { if (save.keys < cost) return; save.keys -= cost; } else { if ((save[b.key] || 0) < cost) return; save[b.key] -= cost; } saveGame(); Modal.close(true);
      const hub = MAP.nodes.find((n) => n.kind === (UPM ? "bosshub2" : "bosshub"));
      startBattle(nodeToBattle({ kind: b.kind, act: 11, upper: UPM }), { back: () => { openMap(10); MapView.sel = hub; mapPanel(); openBossHub(null, UPM); } });
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
  const T = CFG.TEMPLE, OP = templeOpen(save), S = G.templeStage = Math.max(1, Math.min(OP, G.templeStage || 1)), unlocked = !!(save.raid && save.raid.cleared > 0);
  const st = (s) => ({ open: s <= OP, hi: T.HI[s - 1] });
  const tabs = [1, 2, 3, 4].map((s) => `<button class="bh-st ${s === S ? "on" : ""}" ${s <= OP ? `data-a="templest" data-s="${s}"` : "disabled"} style="--c:#ffd86a;${s > OP ? "opacity:.45;cursor:default" : ""}"><b>${s}단계</b><span>${s <= OP ? "입장 가능" : `🔒 탑 ${T.NEED[s - 1]}층`}</span><em class="${s <= OP ? "up" : ""}">${s <= OP ? (T.HI[s - 1] * 100).toFixed(1) + "%" : "?"}</em></button>`).join("");
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
    <div class="bh-drops"><div class="bh-dttl">드랍 <span class="dim">계시의 돌 · 세공의 인장 · 골드(소량)만 나옵니다 · 2단계부터는 솟아난 탑 25 · 50 · 75층을 클리어해야 열립니다 · 장비 · 스킬 · 구슬은 나오지 않습니다</span></div>
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
function openSpire(tw) {
  tw = tw === 2 ? 2 : 1; const FK = tw === 2 ? "spire2Floor" : "spireFloor", S = CFG.SPIRE, P = (tw === 2 ? save.spire2 : save.spire) || { best: 0 }, max = Math.min(tw === 2 ? S.END2 : S.END, P.best + 1), f = G[FK] = Math.max(1, Math.min(max, G[FK] || max));
  const wall = f % S.WALL === 0, nextWall = Math.min(tw === 2 ? S.END2 : S.END, Math.ceil(f / S.WALL) * S.WALL), sat = ((satRate(f) + (tw === 2 ? 0.05 : 0)) * 100).toFixed(1).replace(/\.0$/, "");
  const marks = (tw === 2 ? [20] : [20, 40, 60, 80, 100]).map((w) => `<button class="btn xs" data-a="spfl" data-f="${w}" ${w > max ? "disabled" : ""}>${w}층${P.best >= w ? " ✔" : ""}</button>`).join(" ");
  const html = `<h2>${tw === 2 ? "심층 첨탑" : "솟아난 탑"}</h2><div class="bh" style="--c:#ff5a4a"><div class="bh-main"><div class="bh-info" style="flex:1">
    <div class="bh-feat">${wall ? "🧱 벽 층" : "탑"} · 4레인</div>
    <div class="bh-desc">${tw === 2 ? "20층까지 이어지는 새 탑입니다 (이후 층은 새로운 장비와 함께 추가됩니다)." : "100층까지 이어지는 탑입니다."} <b>20층마다 벽</b>이 있어 장비를 갖춰야 넘을 수 있습니다. 일반 전설 장비와 함께 부위마다 다른 고유 한 줄이 붙은 <b style="color:${SAT_COLOR}">사탄 장비</b>가 나옵니다.</div>
    <div class="bh-sttl">층 선택</div>
    <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin:6px 0"><button class="btn" data-a="spd" ${f <= 1 ? "disabled" : ""}>−</button><b style="font-size:26px;min-width:90px;text-align:center">${f}층</b><button class="btn" data-a="spu" ${f >= max ? "disabled" : ""}>＋</button></div>
    <div style="text-align:center">${marks}</div>
    <div class="bh-me">최고 기록 <b>${P.best}층</b> <span class="dim">· 다음 벽 ${nextWall}층</span></div>
    <div class="bh-key dim">드랍: 장비(전설 비중 높음) · 장비 하나가 사탄 장비일 확률 약 ${sat}% (20층마다 +${(S.SAT_STEP * 100).toFixed(1)}%p) · 벽 층을 처음 넘으면 사탄 장비 1개 확정 · 구슬 · 조각 · 골드</div>
    <button class="btn pri big bh-go" data-a="spgo">탑 ${f}층 입장</button>
  </div></div></div>`;
  Modal.open(html, { cls: "bosshub", on: {
    spd: () => { G[FK] = f - 1; openSpire(tw); }, spu: () => { G[FK] = f + 1; openSpire(tw); }, spfl: (el) => { G[FK] = +el.dataset.f; openSpire(tw); },
    spgo: () => { Modal.close(true); const hub = MAP.nodes.find((n) => n.kind === (tw === 2 ? "tower2" : "tower")); startBattle(nodeToBattle(hub), { back: () => { openMap(10); MapView.sel = hub; mapPanel(); openSpire(tw); } }); },
  } });
}

// =========================================================
// 전직 화면 + 레이드 던전 (v4.41)
// =========================================================
function openClass(back) {
  const sv = save, n = sv.cls | 0, left = classPoints(sv) - classSpent(sv), nextBook = n < 3 && sv.cbook && sv.cbook[n + 1] > 0;
  const pos = { r: [100, 22], a1: [42, 82], a2: [42, 142], ca: [42, 198], b1: [158, 82], b2: [158, 142], cb: [158, 198], c0: [100, 82] }, links = [["r", "a1"], ["a1", "a2"], ["a2", "ca"], ["r", "b1"], ["b1", "b2"], ["b2", "cb"], ["r", "c0"]];
  const card = (T) => `<div class="cl-card" style="--c:${T.color}"><div class="cl-ttl">${T.name}</div><div class="cl-box"><svg width="200" height="226">${links.map(([a, b]) => { const A = pos[a], B = pos[b], on = classHas(sv, `${T.id}_${a}`) && classHas(sv, `${T.id}_${b}`); return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${on ? T.color : "#3a3560"}" stroke-width="${on ? 4 : 2}"/>`; }).join("")}</svg>${C_KEYS.map((k) => { const N = C_BY_ID[`${T.id}_${k}`], has = classHas(sv, N.id), can = canTakeClass(sv, N.id), [x, y] = pos[k]; return `<button class="cl-nd ${has ? "has" : can ? "can" : ""} ${N.cost > 1 ? "big" : ""}" style="left:${x - 18}px;top:${y - 18}px" data-a="${has ? "clrm" : "cltake"}" data-id="${N.id}" title="${N.name} (${N.cost}점) — ${N.desc || passTextOf(N.per)}">${N.cost > 1 ? "◆" : "●"}</button>`; }).join("")}</div><div class="cl-sub">${C_KEYS.filter((k) => classHas(sv, `${T.id}_${k}`)).map((k) => `<div>${C_BY_ID[`${T.id}_${k}`].name}: ${C_BY_ID[`${T.id}_${k}`].desc || passTextOf(C_BY_ID[`${T.id}_${k}`].per)}</div>`).join("") || `<div class="dim">노드에 마우스를 올리면 효과가 보입니다</div>`}</div></div>`;
  Modal.open(`<h2>전직</h2><div class="center">전직 <b style="color:#ffd070">${n}차</b>${n ? ` · ${C_CLASS_NAMES[n]}` : ""} · 전직 포인트 <b style="color:#8dff9a">${left}</b> / ${classPoints(sv)} <button class="btn xs" data-a="clreset">전부 초기화</button></div>
  <div class="center dim" style="margin:4px 0">전직의 서 1차 ${sv.cbook[1]} · 2차 ${sv.cbook[2]} · 3차 ${sv.cbook[3]} (레이드 던전 이지 · 노말 · 하드 최초 클리어) — 전직할 때마다 전직 포인트 2점</div>
  <div class="center"><button class="btn pri" data-a="cladv" ${nextBook ? "" : "disabled"}>${n >= 3 ? "최종 전직 완료" : nextBook ? `${n + 1}차 전직하기` : `${n + 1}차 전직의 서 필요`}</button></div>
  <div class="cl-grid">${C_TREES.map(card).join("")}</div>
  <div class="pbtns"><button class="btn" data-a="clx">닫기</button></div>`, { cls: "wide", on: {
    cltake: (el) => { if (takeClass(sv, el.dataset.id)) { snd("equip"); saveGame(); refreshTop(); } else snd("error"); openClass(back); },
    clrm: (el) => { if (dropClass(sv, el.dataset.id)) { snd("click"); saveGame(); refreshTop(); } else snd("error"); openClass(back); },
    clreset: () => { resetClass(sv); snd("close"); saveGame(); refreshTop(); openClass(back); },
    cladv: () => { const r = advanceClass(sv); toast(r.msg, r.ok ? "ok" : "bad"); snd(r.ok ? "enh_ok" : "error"); saveGame(); refreshTop(); openClass(back); },
    clx: () => { if (back) back(); else Modal.close(); },
  } });
}
function openCRaid(mode) {
  const sv = save, OP = craidOpen(sv), D = mode === "warden" ? 4 : mode === "charm" ? 5 : (G.craidDiff = Math.max(1, Math.min(OP, G.craidDiff || 1))), N = CFG.CRAID, hub = MAP.nodes.find((n) => n.kind === "craid" && (n.sub || "") === (mode || ""));
  const sub = (d) => (d <= OP ? (d === 4 ? (sv.warden && sv.warden.best ? "최고 " + sv.warden.best + "초" : "도전 가능") : d === 5 ? "참 파밍" : sv.craid && sv.craid[d] ? "클리어 ✔" : "도전 가능") : d === 4 || d === 5 ? "🔒 하드 + 3차 전직" : "🔒 " + N.NAMES[d - 1] + " 클리어");
  const tabs = (mode ? [] : [1, 2, 3]).map((d) => `<button class="bh-st ${d === D ? "on" : ""}" ${d <= OP ? `data-a="crd" data-d="${d}"` : "disabled"} style="--c:#ff5a4a;${d > OP ? "opacity:.45;cursor:default" : ""}"><b>${N.NAMES[d]}</b><span>${sub(d)}</span><em class="${d <= OP ? "up" : ""}">${d === 4 ? "전투력 측정" : d === 5 ? "참 드랍" : d + "차 전직"}</em></button>`).join("");
  const desc = D === 4 ? `<b style="color:#ff7a6a">${CFG.WARDEN.NAME}</b> — 문지기가 <b>공명 구슬</b>을 계속 만들어 냅니다. 구슬은 스킬이 통하지 않고, <b>직접 눌러야</b> 터집니다. 제때 못 누르면 구슬이 폭발해 큰 피해를 주고 문지기가 체력을 회복합니다. 제한 시간 ${Math.round(CFG.WARDEN.LIMIT / 60)}분의 전투력 측정기입니다.`
    : D === 5 ? `3차 전직을 마친 사람만 들어올 수 있는 던전입니다. 하드 레이드와 같은 난이도이고, <b style="color:#ffd070">참</b>이 나옵니다. 참은 장비칸 아래 4칸에 장착하며 한 개에 2줄의 특별한 효과가 있습니다.`
    : `탑에서 내려온 붉은 군단의 본거지입니다. 최초 클리어하면 <b style="color:#ffd070">${D}차 전직의 서</b>를 얻고, 전직하면 전직 포인트를 받아 화염 · 냉기 · 번개 · 공허 · 물리&독 · 방어 · 파밍 패시브를 찍을 수 있습니다.`;
  const drops = D === 4 ? "드랍: T6 장비 · 사탄 장비(30%) · 구슬 · 조각 · 골드 · 기록은 걸린 시간으로 남습니다." : D === 5 ? "드랍: 참 1개 (40% 확률로 1개 더) · 골드. 참은 매번 종류와 수치가 달라집니다." : `드랍: 장비(사탄 포함) · 구슬 · 조각 · 골드${D === 3 ? " · T6 장비 · 하드 최초 클리어 시 3차 전직" : D === 2 ? " · 노말 최초 클리어 시 2차 전직" : ""} · 전직의 서는 최초 클리어 때만 나옵니다.`;
  Modal.open(`<h2>${mode === "warden" ? "새 문지기" : mode === "charm" ? "참 던전" : "레이드 던전"}</h2><div class="bh" style="--c:#ff5a4a"><div class="bh-main"><div class="bh-info" style="flex:1">
    <div class="bh-feat">전직의 서를 얻는 곳 · 4레인</div>
    <div class="bh-desc">${desc}</div>
    <div class="bh-sttl">난이도</div><div class="bh-sts">${tabs}</div>
    <div class="bh-me">권장: <b>${N.REQ[D]}</b> <span class="dim">· 몬스터 강도 균열 ${Math.round(D === 4 ? CFG.WARDEN.TIER : D === 5 ? N.TIERS[3] : N.TIERS[D])}층 수준</span></div>
    <div class="bh-key dim">${drops}</div>
    <div class="center" style="margin:6px 0">현재 전직 <b>${sv.cls | 0}차</b> · 전직의 서 ${sv.cbook[1]}/${sv.cbook[2]}/${sv.cbook[3]} <button class="btn xs" data-a="crcls">전직 화면</button>${charmUnlocked(sv) ? ` <button class="btn xs" data-a="crcharm">참 (${(sv.charmInv || []).length})</button>` : ""}</div>
    <button class="btn pri big bh-go" data-a="crgo">${D === 4 ? N.NAMES[4] : D === 5 ? "참 던전" : "레이드 " + N.NAMES[D]} 입장</button>
  </div></div></div>`, { cls: "bosshub", on: {
    crd: (el) => { G.craidDiff = +el.dataset.d; openCRaid(mode); },
    crcls: () => openClass(() => openCRaid(mode)),
    crcharm: () => openCharms(() => openCRaid(mode)),
    crgo: () => { Modal.close(true); startBattle(nodeToBattle(hub), { back: () => { openMap(10); MapView.sel = hub; mapPanel(); openCRaid(mode); } }); },
  } });
}

// 참: 3차 전직 후 장비칸 아래 4칸 + 보관함
const charmColor = (it) => (CHARM_BY_ID[charmKind(it)] || { color: "#ccc" }).color;
function charmCard(it, btns, delta) { const rows = charmRows(it), col = charmColor(it); return `<div class="cm-card" style="--c:${col}">${rows.map((R) => `<div style="${R.sp ? "color:" + col + ";font-weight:700" : ""}">${R.txt.replace("{v}", charmFmt(R.fmt, charmRowVal(R, 0)))}</div>`).join("")}${delta != null ? `<div class="cm-d ${delta >= 0 ? "up" : "dn"}">착용 시 전투력 ${delta >= 0 ? "▲ +" : "▼ "}${(delta * 100).toFixed(1)}%</div>` : ""}<div class="cm-btns">${btns}</div></div>`; }
function charmDelta(sv, it, slot) { sv.charms = sv.charms || [null, null, null, null]; const p0 = playerPower(computeStats(sv)), old = sv.charms[slot]; sv.charms[slot] = it; const p1 = playerPower(computeStats(sv)); sv.charms[slot] = old; return p0 > 0 ? p1 / p0 - 1 : 0; }
function openCharms(back) {
  const sv = save, ok = charmUnlocked(sv), slots = sv.charms || [null, null, null, null], inv = sv.charmInv || [], PAGE = 12;
  const kindIdx = (it) => CHARMS.findIndex((c) => c.id === charmKind(it));
  const slotHtml = [0, 1, 2, 3].map((i) => slots[i] ? charmCard(slots[i], `<button class="btn xs" data-a="cmoff" data-i="${i}">해제</button>`) : `<div class="cm-card empty"><span class="dim">빈 참 칸 ${i + 1}</span></div>`).join("");
  const invList = () => { const q = (G.cmQ || "").trim().toLowerCase(); let a = inv.filter((it) => !q || charmLines(it).join(" ").toLowerCase().includes(q)); a = a.slice().sort((x, y) => (G.cmSort === "new" ? y.uid - x.uid : kindIdx(x) - kindIdx(y) || y.uid - x.uid)); return a; };
  const invHtml = () => { const a = invList(), pg = G.cmPage = Math.max(0, Math.min(Math.ceil(a.length / PAGE) - 1, G.cmPage || 0)), tgt = slots.findIndex((x) => !x), slot = tgt < 0 ? 0 : tgt;
    const cards = a.slice(pg * PAGE, pg * PAGE + PAGE).map((it) => charmCard(it, `<button class="btn xs pri" data-a="cmon" data-u="${it.uid}" ${ok ? "" : "disabled"}>장착</button> <button class="btn xs" data-a="cmdrop" data-u="${it.uid}">버리기</button>`, ok ? charmDelta(sv, it, slot) : null)).join("");
    return (cards || `<div class="dim pad">${inv.length ? "검색 결과가 없습니다" : "보관 중인 참이 없습니다 — [참 던전]에서 얻습니다"}</div>`) + (a.length > PAGE ? `<div class="cm-pg"><button class="btn xs" data-a="cmpg" data-d="-1" ${pg <= 0 ? "disabled" : ""}>◀</button> ${pg + 1} / ${Math.ceil(a.length / PAGE)} <button class="btn xs" data-a="cmpg" data-d="1" ${pg >= Math.ceil(a.length / PAGE) - 1 ? "disabled" : ""}>▶</button></div>` : ""); };
  Modal.open(`<h2>참</h2><div class="center dim">${ok ? "참 4칸에 장착한 참의 효과가 적용됩니다. 특수 옵션 1줄(색 글씨) + 기본 옵션 2줄이며, 같은 종류도 수치가 다릅니다." : "3차 전직 후에 장착할 수 있습니다."}</div>
  <div class="cm-grid">${slotHtml}</div><div class="bh-sttl" style="margin-top:8px">보관함 ${inv.length}개</div>
  <div class="cm-tool"><input id="cmq" type="text" placeholder="옵션 검색 (예: 체력, 치명타, 골드)" value="${(G.cmQ || "").replace(/"/g, "")}"> <button class="btn xs ${G.cmSort === "new" ? "" : "pri"}" data-a="cmsort" data-m="kind">종류별</button> <button class="btn xs ${G.cmSort === "new" ? "pri" : ""}" data-a="cmsort" data-m="new">최신순</button></div>
  <div class="cm-grid inv" id="cminv">${invHtml()}</div>
  <div class="pbtns"><button class="btn" data-a="cmx">닫기</button></div>`, { cls: "wide", on: {
    cmon: (el) => { const it = inv.find((x) => x.uid === +el.dataset.u); if (!it) return; let r = equipCharm(sv, it); if (!r.ok && ok) { toast("빈 칸이 없어 1번 참과 바꿉니다", "ok"); r = equipCharm(sv, it, 0); } if (r.ok) { snd("equip"); saveGame(); refreshTop(); } else { toast(r.msg, "bad"); snd("error"); } openCharms(back); },
    cmoff: (el) => { if (unequipCharm(sv, +el.dataset.i)) { snd("click"); saveGame(); refreshTop(); } openCharms(back); },
    cmdrop: (el) => { sv.charmInv = (sv.charmInv || []).filter((x) => x.uid !== +el.dataset.u); snd("click"); saveGame(); openCharms(back); },
    cmsort: (el) => { G.cmSort = el.dataset.m; G.cmPage = 0; openCharms(back); },
    cmpg: (el) => { G.cmPage = (G.cmPage || 0) + +el.dataset.d; openCharms(back); },
    cmx: () => { if (back) back(); else Modal.close(); },
  } });
  const qi = document.getElementById("cmq"); if (qi) qi.addEventListener("input", () => { G.cmQ = qi.value; G.cmPage = 0; const box = document.getElementById("cminv"); if (box) box.innerHTML = invHtml(); });
}
