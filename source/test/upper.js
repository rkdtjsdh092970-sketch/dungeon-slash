const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1100, height: 760 } }); const e = []; p.on("pageerror", (x) => e.push(x.message));
  await p.goto("file:///home/claude/game/dist/game.html"); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 100; save.rift.best = 100; save.graduated = 1; save.raid = { cleared: 1, best: 100, tower: 1 }; save.craid = [0, 1, 1, 0]; save.keys = 7; save.keys2 = 3;
    const o = {}; const hub2 = MAP.nodes.find((n) => n.kind === "bosshub2"); o.un = nodeUnlocked(save, hub2); G.hubUp = true; openBossHub(0, true); o.ui = document.body.innerText.includes("상위 보스 관문") && document.body.innerText.includes("5개 소모");
    const nb = nodeToBattle({ kind: "void", act: 11, upper: 1 }); o.nb = [nb.kind, nb.tier, nb.upper, nb.vsel];
    const cnt = { 4: 0, 5: 0, other: 0, n: 0 }; for (let i = 0; i < 3000; i++) { const out = rollDrops(save, Object.assign({}, nb, { vsel: 4 }), true); for (const s of out.skills) { cnt.n++; if (s.rarity === 4) cnt[4]++; else if (s.rarity === 5) cnt[5]++; else cnt.other++; } } o.sk = cnt;
    // T6
    const t6 = rollDrops(save, { kind: "spire", floor: 100, tier: 200, act: 10, first: true }, true); o.t6 = [...new Set(t6.items.map((i) => i.ilvl))]; const t5 = rollDrops(save, { kind: "spire", floor: 99, tier: 195, act: 10 }, true); o.t5 = [...new Set(t5.items.map((i) => i.ilvl))];
    const it6 = genItem(save, 6, 3, "weapon"); o.t6aff = it6.affixes.map((a) => "T" + (a.t + 1)).join(","); o.base = Math.round(it6.base.atk || it6.base.mag); o.name = itemTipHtml(it6).includes("T6");
    const keys = { warp: 0, hwarp: 0 }; for (let i = 0; i < 400; i++) { const pl = planFor({ kind: "spire", act: 10, floor: 5, tier: 140 }); for (const k in keys) if (pl.includes(k)) keys[k]++; } o.keys = keys; return o; });
  console.log(JSON.stringify(r), e.length ? e : "noerr"); await b.close(); })();
