const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.endgame = true; openTown(1); });
  await pg.evaluate(() => { CX.tab = 'uniq'; CX.pool = 'common'; CX.sel = 'hookblade'; openCodex(); }); await pg.waitForTimeout(300);
  console.log('uniq', await pg.evaluate(() => document.body.innerText.includes('출혈 중인 적에게 주는 피해 (곱연산)')));
  await pg.screenshot({ path: '/tmp/cx_hook.png' });
  await pg.evaluate(() => { CX.tab = 'skill'; CX.skf = 'all'; CX.sel = 'butcher'; openCodex(); }); await pg.waitForTimeout(300);
  console.log('skill', await pg.evaluate(() => document.body.innerText.includes('출혈 중인 적에게 +90% 피해')));
  await pg.evaluate(() => { CX.tab = 'fml'; openCodex(); }); await pg.waitForTimeout(300);
  console.log('fml', await pg.evaluate(() => document.body.innerText.includes('상태이상 대상 추가 피해')));
  // 실제 전투 중 감전/출혈 보너스 동작 + 에러 없음
  console.log('stat', await pg.evaluate(() => { const s = computeStats(save); return [s.bleedMore, s.shockChance, s.vsBleed].join(','); }));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
