const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file:///home/claude/game/dist/game.html"); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    save = newSave(); const out = { n: 0, bad: [] }, cnt = {};
    for (const sl of SLOTS) for (let i = 0; i < 200; i++) { const it = genSatan(save, 5, sl); if (!it.sat) { out.bad.push(sl); break; } cnt[it.sat] = 1; out.n++; }
    out.kinds = Object.keys(cnt).length; out.defs = SAT_DEFS.length;
    // 스탯 비교
    const base = computeStats(save); const res = [];
    for (const d of SAT_DEFS) { const sl = d[1]; const it = genItem(save, 5, 3, sl); it.affixes = []; it.sat = d[0]; save.equipped[sl] = it; const s = computeStats(save); const bad = Object.keys(s).filter((k) => typeof s[k] === "number" && !isFinite(s[k])); if (bad.length) res.push(d[0] + ":" + bad); save.equipped[sl] = null; }
    out.nan = res; out.name = itemName(genSatan(save, 5, "boots")); out.tip = itemTipHtml(genSatan(save, 5, "ring")).includes("✦");
    return out;
  });
  console.log(JSON.stringify(r), errs.length ? errs : "noerr"); await b.close();
})();
