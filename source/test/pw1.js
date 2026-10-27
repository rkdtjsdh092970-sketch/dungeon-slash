const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.screenshot({ path: '/tmp/s1_title.png' });
  console.log(errs.join('\n')); await pg.click('[data-t=new]'); await pg.waitForTimeout(600);
  await pg.screenshot({ path: '/tmp/s2_tut.png' });
  await pg.click('[data-t=tipok]'); await pg.waitForTimeout(3500);
  await pg.screenshot({ path: '/tmp/s3_battle.png' });
  console.log(errs.join('\n') || 'no errors');
  await br.close();
})();
