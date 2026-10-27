const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; openTown(1); openPassives(); });
  await pg.waitForTimeout(400);
  const info = await pg.evaluate(() => { const far = PASSIVES.find((p) => p.kind === "notable"); const P = passivePath(save, far.id); PT.sel = far; ptInfo(); return { id: far.id, name: far.name, path: P.ids.length, cost: P.cost, free: passivePoints(save) - passiveSpent(save), btn: document.querySelector('#ptact .btn.pri').textContent }; });
  console.log(info);
  await pg.click('#ptact .btn.pri'); await pg.waitForTimeout(200);
  console.log(await pg.evaluate(() => 'spent ' + passiveSpent(save) + ' has target ' + passiveHas(save, PT.sel.id) + ' nodes ' + Object.keys(save.pass).length));
  await pg.screenshot({ path: '/tmp/pp.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
