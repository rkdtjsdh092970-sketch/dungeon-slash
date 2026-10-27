const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 90; save.slots = 4; save.endgame = true; save.lanesBase = 3; save.cleared = [10,10,10,10,10,10,10,10,10,10]; save.rift.best = 20; save.keys = 3; for (const s of SLOTS) save.equipped[s] = genItem(save, 10, 3, s); openTown(1);
    startBattle({ kind: 'void', act: 10, tier: 20, name: '공허의 군주', level: 100 }, {}); const b = G.battle; b.hp = b.maxHp = 1e15; b.hpM *= 1e-6; G.speed = 3; });
  await pg.waitForTimeout(6000); await pg.screenshot({ path: '/tmp/v1.png' });
  for (let i = 0; i < 40; i++) { await pg.waitForTimeout(500); if (await pg.evaluate(() => !$('#unique').classList.contains('hidden'))) { await pg.mouse.click(480, 270); } if (await pg.evaluate(() => !!document.querySelector('#mbox [data-a=ok]') && !$('#modal').classList.contains('hidden'))) break; }
  console.log(await pg.evaluate(() => { const b = G.battle; return JSON.stringify({ over: b.over, win: b.win, cleared: b.voidCleared, kills: b.kills }); }));
  console.log(await pg.evaluate(() => $('#mbox').textContent.replace(/\s+/g, ' ').slice(0, 200)));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
