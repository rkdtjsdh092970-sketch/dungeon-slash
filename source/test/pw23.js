const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 40; save.cleared = [10,10,10,10,10,10,10,10,10,10]; openTown(1); openPassives(); });
  await pg.waitForTimeout(400);
  const pos = await pg.evaluate(() => { PT.sc = 1; const p = PASSIVE_BY_ID['phys_s1']; const cv = document.getElementById('ptree'), r = cv.getBoundingClientRect(); return [r.left + (cv.width / 2 + PT.ox + p.x * PT.sc) * r.width / cv.width, r.top + (cv.height / 2 + PT.oy + p.y * PT.sc) * r.height / cv.height]; });
  await pg.mouse.click(pos[0], pos[1]); await pg.waitForTimeout(200);
  console.log('after click:', await pg.evaluate(() => JSON.stringify({ sel: PT.sel && PT.sel.id, has: passiveHas(save, 'phys_s1') })));
  await pg.screenshot({ path: '/tmp/p1.png' });
  await pg.click('[data-a=ptadd]'); await pg.waitForTimeout(200);
  console.log('after add:', await pg.evaluate(() => passiveHas(save, 'phys_s1')));
  await pg.click('[data-a=ptrm]'); await pg.waitForTimeout(200);
  console.log('after rm:', await pg.evaluate(() => passiveHas(save, 'phys_s1')));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
