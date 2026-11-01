const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1000, height: 640 } }); const e = []; p.on("pageerror", (x) => e.push(x.message));
  await p.goto("file:///home/claude/game/dist/game.html"); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 100; save.graduated = 1; save.rift.best = 100; save.raid = { cleared: 1, best: 100, tower: 1 }; save.craid = [0, 1, 1, 1]; save.cls = 3; save.slots = 4;
    const o = {}; o.open = craidOpen(save); G.craidDiff = 4; const hub = MAP.nodes.find((n) => n.kind === "craid"); const nb = nodeToBattle(hub); o.nb = [nb.kind, Math.round(nb.tier)];
    startBattle(nb, { back: () => {} }); const bt = G.battle; bt.hp = bt.maxHp = 1e14; bt.stats.dmgTaken = -0.5; o.boss = !!bt.bossRef; return o; });
  await p.waitForTimeout(9500);
  const r2 = await p.evaluate(() => { const bt = G.battle, orbs = bt.enemies.filter((x) => x.orb && !x.dead); return { orbs: orbs.length, fuse: orbs.map((x) => +x.fuse.toFixed(1)), hasVx: orbs.every((x) => x.vx != null), dmgToOrb: orbs[0] ? (applyDamage(bt, orbs[0], 1e9, {}), orbs[0].dead) : null }; });
  await p.screenshot({ path: "/tmp/warden.png" });
  const r3 = await p.evaluate(() => { const bt = G.battle, orb = bt.enemies.find((x) => x.orb && !x.dead); if (!orb) return { none: 1 }; const rect = document.querySelector("canvas").getBoundingClientRect(); const sx = rect.width / 960, sy = rect.height / 540; return { x: rect.left + orb.vx * sx, y: rect.top + orb.vy * sy - 26 * sy, id: orb.id }; });
  if (r3.x) { await p.mouse.click(r3.x, r3.y); await p.waitForTimeout(300); }
  const r4 = await p.evaluate(() => ({ pop: G.battle.wPop, left: G.battle.enemies.filter((x) => x.orb && !x.dead).length, boom: G.battle.wBoom }));
  await p.waitForTimeout(6500); const r5 = await p.evaluate(() => ({ boom: G.battle.wBoom, bossHp: Math.round(G.battle.bossRef.hp / G.battle.bossRef.maxHp * 100) }));
  console.log(JSON.stringify({ r, r2, r3, r4, r5 }), e.length ? e : "noerr"); await b.close(); })();
