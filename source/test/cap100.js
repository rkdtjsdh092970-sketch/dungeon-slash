const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  const r = await pg.evaluate(() => { const node = { kind: 'rift', act: 10, tier: CFG.RIFT_END, name: 'x' }; save = newSave(); save.rift.best = 100; save.opt = save.opt || {}; return { nb: nextBattleOf(node, { win: true }) }; });
  console.log('100층 다음:', JSON.stringify(r), errs.join('|') || 'no errors'); 
  const r2 = await pg.evaluate(() => { save.rift.best = 99; const nb = nextBattleOf({ kind: 'rift', act: 10, tier: 99, name: 'x' }, { win: true }); return nb && nb.label; }); console.log('99층 다음:', r2);
  await br.close(); })();
