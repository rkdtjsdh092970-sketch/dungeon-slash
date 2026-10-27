const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 90; save.slots = 4; save.orbC = 5; save.orbD = 2; save.gold = 1234567; save.guildLv = 4;
    const u = genUnique(save, UNIQUE_BY_ID['voidheart'], 10); save.inv.push(u); save.inv.push(genItem(save, 12, 3, 'weapon')); save.skills.push(genSkill(save, 'gut', 1)); save.cleared = Array(10).fill(10);
    openTown(2); });
  await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/town_q.png' });
  console.log('questBang act2:', await pg.evaluate(() => questBang(2)));
  await pg.evaluate(() => { openItems('inv'); }); await pg.waitForTimeout(300);
  const tile = await pg.$('.grid .tile'); const bb = await tile.boundingBox(); await pg.mouse.move(bb.x + 10, bb.y + 10); await pg.waitForTimeout(200); await pg.mouse.move(bb.x + 14, bb.y + 12); await pg.waitForTimeout(150);
  await pg.screenshot({ path: '/tmp/tip_item.png' });
  const orb = await pg.$('.res [data-tipk="orbC"]'); const ob = await orb.boundingBox(); await pg.mouse.move(ob.x + 4, ob.y + 4); await pg.waitForTimeout(100); await pg.mouse.move(ob.x + 8, ob.y + 6); await pg.waitForTimeout(150); await pg.screenshot({ path: '/tmp/tip_cur.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
