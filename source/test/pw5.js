const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.click('[data-t=new]'); await pg.waitForTimeout(300);
  const ff = async () => { await pg.evaluate(() => { const b = G.battle; let i = 0; while (b && !b.over && i++ < 40000) stepBattle(b, 0.05); }); await pg.waitForTimeout(1300); };
  for (let s = 0; s < 3; s++) { if (await pg.$('[data-t=tipok]:visible')) await pg.click('[data-t=tipok]'); await pg.waitForTimeout(1200); await ff(); await pg.click('#mbox [data-a=ok]'); await pg.waitForTimeout(400); }
  await pg.screenshot({ path: '/tmp/q_town.png' });
  await pg.click('#b-map'); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/q_map.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
