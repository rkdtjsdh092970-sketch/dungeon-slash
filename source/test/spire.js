const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file:///home/claude/game/dist/game.html"); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    save = newSave(); save.raid = { cleared: 1, best: 100, tower: 1 }; save.spire = { best: 19 };
    const hub = MAP.nodes.find((n) => n.kind === "tower"); G.spireFloor = 20; const nb = nodeToBattle(hub);
    openSpire(); const html = document.querySelector(".modal, #modal, .bosshub") ? document.body.innerText.includes("탑 20층 입장") : false;
    let sat = 0, tot = 0, first = 0; for (let i = 0; i < 300; i++) { const o = rollDrops(save, nb, true); tot += o.items.length; sat += o.items.filter((x) => x.sat).length; if (o.items.some((x) => x.sat)) first++; }
    const b = createBattle(save, nb); for (let i = 0; i < 100; i++) stepBattle(b, 0.05);
    return { nb: [nb.kind, nb.floor, Math.round(nb.tier), nb.first], html, sat, tot, first, lanes: b.lanes, plan: b.plan.length, boss: b.plan.includes("boss") };
  });
  console.log(JSON.stringify(r), errs.length ? errs : "noerr"); await b.close();
})();
