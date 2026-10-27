const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.slots = 2; save.cleared = [5]; startBattle(MAP.byId['E1'] ? Object.assign({}, MAP.byId['E1'], { stage: 6 }) : MAP.byId['S1-6'], {}); });
  for (let k = 0; k < 6; k++) { await pg.evaluate(() => { const b = G.battle; b.hp = b.maxHp = 1e9; for (let i = 0; i < 70; i++) stepBattle(b, 0.05); }); await pg.waitForTimeout(150); }
  await pg.screenshot({ path: '/tmp/push.png' }); console.log(errs.join('\n') || 'no errors'); await br.close();
})();
