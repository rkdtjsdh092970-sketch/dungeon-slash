const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1000, height: 640 } }); const e = []; p.on("pageerror", (x) => e.push(x.message));
  await p.goto("file:///home/claude/game/dist/game.html"); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 100; save.graduated = 1; save.raid = { cleared: 1, best: 100, tower: 1 }; save.craid = [0, 1, 1, 0]; save.spire = { best: 100 };
    const o = {}; const t2 = MAP.nodes.find((n) => n.kind === "tower2"); o.lock = nodeUnlocked(save, t2); save.craid[3] = 1; o.un = nodeUnlocked(save, t2); G.spire2Floor = 1; const nb = nodeToBattle(t2); o.nb = [nb.kind, nb.tw, nb.floor, nb.tier, nb.first];
    const d = rollDrops(save, nb, true); o.ilvl = [...new Set(d.items.map((i) => i.ilvl))]; const bt = createBattle(save, nb); bt.over = true; bt.win = true; bt.bossKills = 1; bt.kills = 30; bt.time = 60; const res = finishBattle(save, bt); o.best2 = save.spire2 && save.spire2.best; o.best1 = save.spire.best; o.notes = res.notes.slice(0, 1);
    openSpire(2); o.ui = document.body.innerText.includes("심층 첨탑"); o.t = [1, 20, 100].map((f) => spireTier(f, 2)); return o; });
  console.log(JSON.stringify(r), e.length ? e : "noerr"); await b.close(); })();
