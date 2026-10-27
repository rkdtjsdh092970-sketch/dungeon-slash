const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  const r = await pg.evaluate(() => {
    save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s);
    save.auto.on = true; autoRules(save); save.auto.rules[0] = 'sell'; save.auto.rules[1] = 'dis'; save.auto.keepUp = true;
    openTown(1); const node = { kind: 'stage', act: 1, stage: 2, name: '초원 2' }; startBattle(node, {}); G.speed = 3;
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
    const c0 = save.stats.clears, invBefore = save.inv.length; bgLast = performance.now() - 30000;
    for (let i = 0; i < 40; i++) { bgLast -= 30000; bgTick(); }   // 30초×40번 = 20분 경과를 흉내
    const out = { clears: save.stats.clears - c0, inv: save.inv.length, gold: save.gold, screen: G.screen, modal: !$('#modal').classList.contains('hidden'), autoOn: save.auto.on, items: save.inv.filter(i => i.rarity <= 1).length };
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); return out;
  });
  console.log(JSON.stringify(r)); console.log(errs.join('\n') || 'no errors'); await br.close();
})();
