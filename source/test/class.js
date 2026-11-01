const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1100, height: 760 } }); const e = []; p.on("pageerror", (x) => e.push(x.message)); p.on("console", (m) => { if (m.type() === "error") e.push("CE " + m.text()); });
  await p.goto("file:///home/claude/game/dist/game.html"); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 100; save.rift.best = 100; save.raid = { cleared: 1, best: 100, tower: 1 };
    const o = {}; o.tiers = CFG.CRAID.TIERS.map((x) => Math.round(x)); o.tab = [1, 20, 30, 40, 80, 100].map((f) => spireTier(f)); o.open0 = craidOpen(save);
    o.noBook = advanceClass(save).ok; save.cbook[1] = 1; o.adv = advanceClass(save); o.pts = classPoints(save);
    const p0 = playerPower(computeStats(save)); o.take = [takeClass(save, "fire_a1"), takeClass(save, "fire_r"), takeClass(save, "fire_a1"), takeClass(save, "fire_a2")]; // a1 requires r; a2 costs 2 (총 4점 > 2)
    o.left = classPoints(save) - classSpent(save); o.p = playerPower(computeStats(save)) / p0; o.drop = [dropClass(save, "fire_r"), dropClass(save, "fire_a1"), dropClass(save, "fire_r")];
    // 레이드 전투 + 클리어 보상
    const hub = MAP.nodes.find((n) => n.kind === "craid" && !n.sub); G.craidDiff = 1; const nb = nodeToBattle(hub); o.nb = [nb.kind, nb.diff, Math.round(nb.tier)];
    const bt = createBattle(save, nb); o.lanes = bt.lanes; o.boss = bt.plan.includes("boss"); bt.over = true; bt.win = true; bt.bossKills = 1; bt.kills = 50; bt.time = 90; o.over = bt.over; o.win = bt.win; if (bt.win) { const res = finishBattle(save, bt); o.res = { book: save.cbook[1], clr: save.craid[1], notes: res.notes.slice(0, 2), items: res.items.length, sat: res.items.filter((x) => x.sat).length, open: craidOpen(save) }; }
    openCRaid(); o.ui1 = document.body.innerText.includes("레이드 던전") && document.body.innerText.includes("노말");
    Modal.close(true); openClass(); o.ui2 = document.body.innerText.includes("전직 포인트"); return o; });
  await p.waitForTimeout(400); await p.screenshot({ path: "/tmp/class.png" });
  console.log(JSON.stringify(r), e.length ? e : "noerr"); await b.close(); })();
