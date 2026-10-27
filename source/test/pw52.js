const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.endgame = true; openTown(1); });
  const t = async (f) => pg.evaluate(f);
  await t(() => { CX.tab = 'uniq'; CX.pool = 'phys'; CX.sel = 'titanblade'; openCodex(); }); await pg.waitForTimeout(300);
  console.log('uniq', await t(() => { const x = document.body.innerText; return [x.includes('거신의 대검'), x.includes('철갑의 투사 4단계에서만 드랍'), x.includes('철갑의 투사 1단계')].join(','); }));
  await pg.screenshot({ path: '/tmp/cx_uniq.png' });
  await t(() => { CX.pool = 'light'; CX.sel = 'stormsovereign'; openCodex(); }); await pg.waitForTimeout(200);
  console.log('light', await t(() => document.body.innerText.includes('뇌제의 심장')));
  await t(() => { CX.tab = 'skill'; CX.skf = 'fire'; CX.sel = null; openCodex(); }); await pg.waitForTimeout(200);
  console.log('skill fire', await t(() => ['용암 낙하', '태양 폭발', '불꽃 정령', '불바다'].map(n => document.body.innerText.includes(n)).join(',')));
  await t(() => { CX.skf = 'phys'; openCodex(); }); console.log('phys', await t(() => ['대지 가르기', '강철 폭풍', '거신의 주먹', '철갑 군단'].map(n => document.body.innerText.includes(n)).join(',')));
  await t(() => { CX.skf = 'light'; openCodex(); }); await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/cx_skill.png' });
  console.log('light', await t(() => ['뇌신의 강림', '초전도 관통', '폭풍의 화신', '천벌'].map(n => document.body.innerText.includes(n)).join(',')));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
