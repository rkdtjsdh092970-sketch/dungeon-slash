const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 40; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) if (s !== 'ring') save.equipped[s] = genItem(save, 6, 2, s); save.equipped.ring = genItem(save, 4, 1, 'ring'); for (let i = 0; i < 3; i++) save.inv.push(genItem(save, 7 + i, 2, 'ring')); openTown(1); IB.mode = 'inv'; IB.sel = save.inv[0]; renderItems(); });
  await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/r1.png' });
  await pg.click('[data-a=equip][data-k=ring2]'); await pg.waitForTimeout(200);
  console.log('ring2 equipped:', await pg.evaluate(() => !!save.equipped.ring2 && save.equipped.ring2.ilvl), 'ring1:', await pg.evaluate(() => save.equipped.ring.ilvl));
  console.log('stats uses both:', await pg.evaluate(() => { const a = computeStats(save).maxHp; const r2 = save.equipped.ring2; delete save.equipped.ring2; const b = computeStats(save).maxHp; save.equipped.ring2 = r2; return [Math.round(a), Math.round(b)]; }));
  await pg.evaluate(() => { IB.sel = save.inv[0]; renderItems(); }); await pg.click('[data-a=recommend]').catch(() => {}); await pg.waitForTimeout(200);
  await pg.evaluate(() => { IB.sel = save.equipped.ring2; renderItems(); }); await pg.click('[data-a=unequip]'); await pg.waitForTimeout(200);
  console.log('after unequip ring2:', await pg.evaluate(() => !!save.equipped.ring2));
  console.log('protected both:', await pg.evaluate(() => [isProtected(save.equipped.ring)]));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
