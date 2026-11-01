const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1100, height: 760 } }); const e = []; p.on("pageerror", (x) => e.push(x.message));
  await p.goto("file:///home/claude/game/dist/game.html"); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 100; save.graduated = 1; save.rift.best = 100; save.raid = { cleared: 1, best: 100, tower: 1 }; save.craid = [0, 1, 1, 1]; save.cls = 2; save.slots = 4;
    const o = {}; o.open2 = charmOpen(save) ? 5 : 3; save.cls = 3; o.open3 = charmOpen(save) ? 5 : 3; const hub = MAP.nodes.find((n) => n.kind === "craid" && n.sub === "charm"); const nb = nodeToBattle(hub); o.nb = [nb.kind, nb.diff, nb.charm, Math.round(nb.tier)];
    const d = rollDrops(save, nb, true); o.drop = d.charms.length; o.items = d.items.length;
    const bt = createBattle(save, nb); bt.over = true; bt.win = true; bt.bossKills = 1; bt.kills = 40; bt.time = 80; const res = finishBattle(save, bt); o.inv = save.charmInv.length; o.book3 = save.cbook[3]; o.craid3 = save.craid[3];
    // 모든 참 종류: 장착 후 스탯
    const base = computeStats(save); const c = {}; for (const C of CHARMS) { const it = genCharm(save, C.id); save.charmInv.push(it); }
    for (let i = 0; i < 4; i++) equipCharm(save, save.charmInv.find((x) => charmKind(x) === CHARMS[i * 3].id)); o.eq = save.charms.map((x) => x && charmKind(x));
    const st = computeStats(save); o.cm = st.cm; o.lines = charmLines(save.charms[0]); o.bag = invMax(save); o.pow = playerPower(st) / playerPower(base);
    // 전체 16종 NaN 확인
    const bad = []; for (const C of CHARMS) { save.charms = [genCharm(save, C.id), null, null, null]; const s2 = computeStats(save); for (const k in s2) if (typeof s2[k] === "number" && !isFinite(s2[k])) bad.push(C.id + ":" + k); } o.bad = bad;
    save.charms = [genCharm(save, "tidy"), genCharm(save, "stone"), null, null]; o.cap = [invMax(save), stoneCap(save)];
    openCharms(); o.ui = document.body.innerText.includes("보관함"); Modal.close(true); openItems("inv"); o.bar = !!document.querySelector(".charmbar"); return o; });
  await p.waitForTimeout(400); await p.screenshot({ path: "/tmp/charm.png" });
  console.log(JSON.stringify(r), e.length ? e : "noerr"); await b.close(); })();
