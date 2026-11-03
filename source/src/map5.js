// =========================================================
// 5.0 지도 지점 창 (로블록스판 Client showInfo 와 같은 구성)
//  지점을 누르면 화면 가운데 큰 창: 머리(지도 아이콘 · 이름 · 기록 · 닫기) · 구분선
//  균열 · 탑 = 왼쪽 층 목록 · 보스 관문 = 왼쪽 보스 목록 · 나머지 = 설명 · 단계 · 권장 전투력 · 입장
// =========================================================
const MP5 = {
  T1: "마을로 돌아가 장비 · 아르카나 · 퀘스트를 정비합니다.",
  R: "끝없이 이어지는 심연의 균열. 층을 처음 깰 때마다 레벨이 오르고, 5층마다 보스가 지킵니다. 10층부터는 층마다 정해진 변이가 붙습니다. 100층을 깨면 졸업하고 새 콘텐츠가 열립니다.",
  RTW: "문지기가 쓰러지자 솟아오른 붉은 탑. 20층마다 벽이 있어 더 좋은 장비가 필요합니다. 벽 층을 처음 깨면 사탄 장비 1개가 확정입니다.",
  RE: "적이 끝없이 몰려옵니다. 오래 버틸수록 보상이 커집니다. 하루 입장 횟수가 정해져 있습니다.",
  RG: "동전과 자루가 넘치는 보물고. 대부분 골드가 나옵니다. 운이 좋으면 커다란 보물 상자가 나타납니다.",
  RX: "심연의 문지기 모르가스와 싸우는 레이드. 싸우면서 결계석을 부수세요. 제한 시간 8분, 4분이 지나면 격노해 공격이 점점 거세집니다 — 버티기만 해서는 이길 수 없습니다. 처음 쓰러뜨리면 붉은 탑이 솟아오릅니다.",
  RB: "이 관문 너머에 여섯 군주가 기다립니다. 열쇠 1개로 입장하고, 높은 단계일수록 어렵지만 보상이 좋습니다. 보스는 전용 아르카나를 떨어뜨립니다.",
  RTP: "계시의 돌과 세공의 인장이 잠든 신전. 솟아난 탑을 오를수록 더 깊은 단계가 열립니다.",
  RR: "탑에서 내려온 붉은 군단의 요새. 난이도마다 처음 깨면 전직의 서를 얻습니다.",
  RCD: "하드 레이드를 깨고 3차 전직을 마친 사람만 들어갈 수 있습니다. 참이 나옵니다.",
  RWD: "문지기가 공명 구슬을 계속 만들어 냅니다. 아르카나로는 맞힐 수 없으니 직접 눌러 터뜨리세요.",
  RTW2: "20층까지 솟은 새 탑입니다.",
};
const MP5ICON = { T1: "mi_town", R: "mi_rift", RE: "mi_endless", RB: "mi_bossgate", RG: "mi_vault", RX: "mi_abyssdoor", RTW: "mi_tower", RTP: "mi_temple", RR: "mi_raid", RWD: "mi_warden", RCD: "mi_truedungeon", RTW2: "mi_newtower" };
const MPS5 = { hub: 0, hubS: 1, hubUp: false };
function mp5State(n) {   // 상태 · 잠김 안내 · 기록
  const s = save;
  if (n.kind === "stage" || n.kind === "boss") return [nodeCleared(s, n) ? "done" : nodeUnlocked(s, n) ? "open" : "locked", "이전 스테이지를 클리어하세요"];
  if (n.kind === "town") return ["open"];
  if (n.id === "R") return [!nodeUnlocked(s, n) ? "locked" : s.rift.best >= 100 ? "done" : "open", "스테이지 5(그룸)를 클리어하면 열립니다", nodeUnlocked(s, n) ? `${s.rift.best}/100` : null];
  if (n.id === "RTW") { const b = (s.spire && s.spire.best) || 0; return [b >= 100 ? "done" : "open", null, `${b}/100`]; }
  if (n.id === "RX") return [!nodeUnlocked(s, n) ? "locked" : s.raid && s.raid.cleared ? "done" : "open", "균열 100층을 클리어하면 열립니다"];
  if (n.id === "RTP") return [nodeUnlocked(s, n) ? "open" : "locked", "심연의 문을 클리어하면 열립니다"];
  return [nodeUnlocked(s, n) ? "open" : "locked", "균열 100층을 클리어하면 열립니다"];
}
function mapPanel() {
  const n = MapView.sel, p = $("#mappanel");
  if (!n) { p.classList.add("off"); p.innerHTML = ""; return; }
  p.classList.remove("off");
  const [st, hint, prog] = mp5State(n), my = powerScore5(save);
  const icon = st === "locked" ? "mi_lock" : MP5ICON[n.id] || (n.kind === "boss" ? "mi_boss" : "mi_stage");
  let head = `<div class="mh5"><img src="${artURL(icon) || ""}" alt=""><div><b>${n.name}</b><small>${prog ? "기록 " + prog : st === "done" ? "클리어 ✓" : ""}</small></div><button class="x5" data-m="close"></button></div><div class="md5"></div>`;
  const rec = (v) => v ? `<div class="ml5" style="color:#ffcd6e;font-size:15px">권장 전투력  ${fmtN(v)}</div><div class="ml5" style="color:${my >= v ? "#8ceb8c" : "#ff826e"}">내 전투력  ${fmtN(my)}   ${my >= v ? "✓ 충분" : "▼ 부족"}</div>` : "";
  const line = (t, col, sz) => `<div class="ml5" style="${col ? "color:" + col + ";" : ""}${sz ? "font-size:" + sz + "px" : ""}">${t}</div>`;
  const tabs = (list, cur, act) => `<div class="mt5">${list.map((it, i) => `<button class="btn ${i + 1 === cur ? "gold" : ""}" data-m="${act}" data-i="${i + 1}" ${it.ok === false ? "disabled" : ""}>${it.t}</button>`).join("")}</div>`;
  const go = (t, act, ok) => `<button class="btn pri mg5" ${act === "go" ? 'data-p="go"' : `data-m="${act}"`} ${ok === false ? "disabled" : ""}>${t}</button>`;
  let body = "", list = "";
  if (st === "locked") body = `<div class="mi5">${MP5[n.id] || ""}</div><div class="mlk5">🔒 ${hint || "아직 열리지 않았습니다"}</div>`;
  else if (n.id === "R" || n.id === "RTW") {
    const isR = n.id === "R", best = isR ? save.rift.best : (save.spire && save.spire.best) || 0, maxN = Math.min(100, best + 1);
    const key = isR ? "riftTier" : "spireFloor"; if (MPS5["b" + key] !== best) { MPS5["b" + key] = best; G[key] = maxN; }   // 처음 · 새 층을 깨면 다음 층으로
    const cur = G[key] = clamp(G[key] || maxN, 1, maxN);
    for (let f = Math.min(100, maxN + 3); f >= 1; f--) { const lock = f > maxN, tag = isR ? (f % 5 === 0 ? ["보스", "#ff7864"] : null) : f % 20 === 0 ? ["벽", "#ff9678"] : null;
      list += `<div class="fr5 ${f === cur ? "on" : ""} ${lock ? "lk" : ""}" ${lock ? "" : `data-m="floor" data-i="${f}"`}><b style="color:${lock ? "#6e645f" : f <= best ? "#aaa091" : "#f5e8cd"}">${f}층</b><span style="color:${tag ? tag[1] : "#8cdc8c"}">${f <= best ? "✓ " : ""}${tag ? tag[0] : ""}</span></div>`; }
    let r = `<div class="mft5">${cur}층</div>`;
    if (isR) { r += rec(recRift5(cur)); for (const m of riftMods(cur)) r += line(`변이 · ${m.name}: ${m.text || m.desc || ""}`, "#d7a0ff", 13);
      r += line(`드랍: T${Math.min(5, Math.floor(cur / 20) + 1)} 장비 · 아르카나 조각 · 골드${cur % 5 === 0 ? " · 보스 보상" : ""}`, "#96d2ff", 14);
      r += line("열쇠 몬스터(금빛)가 보스 관문 열쇠를 떨어뜨립니다 — 보스 관문은 평타를 줍니다", "#ffd778", 12);
      if (cur > best) r += line("처음 깨면 레벨이 1 오릅니다.", "#c8beaf", 14); }
    else { r += rec(recTier5(CFG.SPIRE.TAB[cur - 1], true)); const wall = cur % 20 === 0;
      r += line(wall ? "🧱 벽 층: 처음 깨면 사탄 장비 1개 확정" : `다음 벽: ${Math.min(100, Math.ceil(cur / 20) * 20)}층`, wall ? "#ff9678" : "#c8beaf", 14);
      r += line("드랍: 장비 (전설 많음) · 사탄 장비 확률 · 구슬 · 조각 · 골드", "#96d2ff", 14); }
    body = `<div class="mr5">${r}<div class="mgo5"><button class="btn" data-m="fup">▲</button><button class="btn" data-m="fdn">▼</button>${go(`${cur}층 도전`, isR ? "go" : "spgo")}</div></div>`;
  } else if (n.id === "RB") {
    const B = hubBosses(), cur = MPS5.hub = clamp(MPS5.hub, 0, B.length - 1), upOk = !!(save.craid && save.craid[2]), up = MPS5.hubUp && upOk, S = MPS5.hubS;
    B.forEach((b, i) => { const have = b.kind === "void" ? save.keys : save[b.key] || 0; list += `<div class="br5 ${i === cur ? "on" : ""}" data-m="boss" data-i="${i}"><b style="color:${b.color}">${b.name}</b><small>${b.keyName} ×${have}</small></div>`; });
    const b = B[cur], tiers = up ? UP_TIERS : b.tiers, need = up ? 0 : b.need[S - 1], have = b.kind === "void" ? save.keys : save[b.key] || 0, cost = up ? UP_KEYS : 1, okNeed = up ? upOk : save.rift.best >= need;
    let r = `<div class="mbn5" style="color:${b.color}">${b.name}</div><div class="mba5" style="--c:${b.color}"><img src="${artURL("boss" + bossArt(b.D)) || ""}" alt=""></div>${line(b.D.desc || "", "#cdc3b4", 13)}`;
    r += tabs([{ t: "관문" }, { t: "상위 관문", ok: upOk }], up ? 2 : 1, "hup") + tabs([1, 2, 3, 4].map((i) => ({ t: i + "단계" })), S, "hst");
    r += rec(recTier5(tiers[S - 1]));
    if (!up) r += line(okNeed ? `열림 — 균열 ${need}층 필요` : `잠김 — 균열 ${need}층 필요`, okNeed ? "#96e6a0" : "#ff826e", 13);
    if (!up) { const maxT = [0, 1, 2, 3][S - 1], minT = [0, 0, 1, 2][S - 1], names = (GATE_BASIC[b.kind] || []).map((id) => SKILLS.find((d) => d.id === id)).filter((d) => d && skillTier(d) <= maxT && skillTier(d) >= minT).map((d) => d.name);
      r += line(`드랍 — 평타 (30~50%): ${names.length ? names.join(", ") : "—"}`, SK_RCOL5[maxT], 13) + line(`장비 T${[2, 3, 5, 5][S - 1]} · 구슬 · 골드${save.graduated ? " · 이 원소의 아르카나" : ""}`, "#96d2ff", 13); }
    else r += line("드랍 — 사탄 · 종말 등급 아르카나 · T6 장비", "#ff786e", 13);
    r += line(`${b.keyName}  ${have} (필요 ${cost})`, have >= cost ? "#ffdc8c" : "#ff826e", 15);
    if (MPS5.hubUp && !upOk) r += line("상위 관문은 노말 레이드를 깨면 열립니다.", "#ff8c78", 13);
    body = `<div class="mr5">${r}<div class="mgo5">${go(`${S}단계 입장`, "hgo", okNeed && have >= cost)}</div></div>`;
  } else {
    const intro = `<div class="mi5">${MP5[n.id] || ""}</div>`; let r = "", g = "";
    if (n.kind === "town") { r = intro; g = go("마을로", "town"); }
    else if (n.kind === "stage" || n.kind === "boss") { r = line(n.kind === "boss" ? "들판의 군주 그룸. 쓰러뜨리면 심연의 균열이 열립니다." : `초원 전투 ${n.stage}. 모든 몬스터를 쓰러뜨리세요.`, "#e1d7c8", 15) + line(`권장 레벨 ${n.stage}`, "#ffcd6e", 15); g = go("도전", "go"); }
    else if (n.id === "RE") { const E = endlessInfo(save); r = intro + line(`오늘 남은 입장  ${E.left}`, "#ffcd6e", 16); g = go("입장", "go", E.left > 0); }
    else if (n.id === "RG") { r = intro; g = go("입장", "go"); }
    else if (n.id === "RX") { r = intro + rec(recTier5(CFG.RAID.TIER)); g = go("도전", "go"); }
    else if (n.id === "RTP") { const open = templeOpen(save), cur = G.templeStage = clamp(G.templeStage || open, 1, Math.max(1, open));
      r = intro + tabs(CFG.TEMPLE.TIERS.map((_, i) => ({ t: i + 1 + "단계", ok: i < open })), cur, "tst") + rec(recTier5(CFG.TEMPLE.TIERS[cur - 1], true));
      if (open < CFG.TEMPLE.TIERS.length) r += line(`다음 단계: 솟아난 탑 ${CFG.TEMPLE.NEED[open]}층`, "#c8beaf", 14); g = go(`${cur}단계 입장`, "temple"); }
    else if (n.id === "RR") { const open = craidOpen(save), cur = G.craidDiff = clamp(G.craidDiff || open, 1, open), NM = ["이지", "노말", "하드"];
      r = intro + tabs(NM.map((t, i) => ({ t: t + (save.craid && save.craid[i + 1] ? " ✓" : ""), ok: i < open })), cur, "rst") + rec(recTier5(CFG.CRAID.TIERS[cur], true)) + line(`처음 깨면: ${cur}차 전직의 서`, "#ffdc8c", 14); g = go(`레이드 ${NM[cur - 1]} 입장`, "raid"); }
    else if (n.id === "RCD") { r = intro + rec(recTier5(CFG.CRAID.TIERS[3], true)); g = go("입장", "raid"); }
    else if (n.id === "RWD") { r = intro; g = go("입장", "raid"); }
    else if (n.id === "RTW2") { r = intro; g = `<button class="btn" data-m="t2first">1층부터</button>` + go("다음 층", "t2next"); }
    else r = intro;
    body = `<div class="mr5 full">${r}<div class="mgo5">${g}</div></div>`;
  }
  p.innerHTML = head + `<div class="mb5">${list ? `<div class="ml5s">${list}</div>` : ""}${body}</div>`;
  const sel = p.querySelector(".fr5.on"); if (sel) sel.scrollIntoView({ block: "center" });
  if (!p.dataset.m5) { p.dataset.m5 = 1; p.addEventListener("click", mp5Click); }
}
function mp5Click(ev) {
  const el = ev.target.closest("[data-m]"); if (!el) return; ev.stopPropagation(); snd("click");
  const a = el.dataset.m, i = +el.dataset.i, n = MapView.sel; if (!n) return;
  const back = () => { openMap(10); MapView.sel = n; mapPanel(); };
  const isR = n.id === "R", key = isR ? "riftTier" : "spireFloor", maxN = Math.min(100, (isR ? save.rift.best : (save.spire && save.spire.best) || 0) + 1);
  if (a === "close") { MapView.sel = null; mapPanel(); }
  else if (a === "floor") { G[key] = i; mapPanel(); } else if (a === "fup") { G[key] = Math.min(maxN, G[key] + 1); mapPanel(); } else if (a === "fdn") { G[key] = Math.max(1, G[key] - 1); mapPanel(); }
  else if (a === "spgo") { startBattle(nodeToBattle(n), { back }); }
  else if (a === "boss") { MPS5.hub = i; mapPanel(); } else if (a === "hup") { MPS5.hubUp = i === 2; mapPanel(); } else if (a === "hst") { MPS5.hubS = i; mapPanel(); }
  else if (a === "hgo") {
    const b = hubBosses()[MPS5.hub], up = MPS5.hubUp && !!(save.craid && save.craid[2]), cost = up ? UP_KEYS : 1, S = MPS5.hubS;
    if (b.kind === "void") { if (save.keys < cost) return; save.keys -= cost; } else { if ((save[b.key] || 0) < cost) return; save[b.key] -= cost; }
    if (up) G["up_" + b.stage] = S; else G[b.stage] = S; saveGame();
    startBattle(nodeToBattle({ kind: b.kind, act: 11, upper: up }), { back });
  }
  else if (a === "town") openTown(n.act || 1);
  else if (a === "tst") { G.templeStage = i; mapPanel(); } else if (a === "temple") startBattle(nodeToBattle({ kind: "temple" }), { back });
  else if (a === "rst") { G.craidDiff = i; mapPanel(); } else if (a === "raid") startBattle(nodeToBattle(n), { back });
  else if (a === "t2first" || a === "t2next") { G.spire2Floor = a === "t2first" ? 1 : ((save.spire2 && save.spire2.best) || 0) + 1; startBattle(nodeToBattle(n), { back }); }
}
