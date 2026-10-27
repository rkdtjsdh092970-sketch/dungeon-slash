const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { SRV.on = true; SRV.name = 'jjy1'; srvMark(); });
  await pg.screenshot({ path: '/tmp/t1.png' });
  console.log('title btn:', await pg.evaluate(() => [document.querySelector('[data-t=login]').disabled, document.querySelector('[data-t=login]').textContent]));
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 20; openTown(1); srvMark(); }); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/t2.png' });
  await pg.evaluate(() => openSettings()); console.log('settings btn:', await pg.evaluate(() => [document.querySelector('[data-a=srvlg]').disabled, document.querySelector('[data-a=srvlg]').textContent]));
  await pg.evaluate(() => Modal.close(true)); await pg.click('#acct [data-lo]'); await pg.waitForTimeout(200);
  console.log('after logout:', await pg.evaluate(() => [SRV.on, document.getElementById('acct').className]));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
