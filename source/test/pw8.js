const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::ERR/.test(m.text())) errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; openTown(1); });
  await pg.evaluate(() => { Modal.open('<h2>고유 아이콘</h2><div style="display:flex;flex-wrap:wrap;gap:6px">' + UNIQUES.map(u => `<div class="tile ut${u.tier}" style="width:52px;height:52px">${uniqueIconImg(u.id,2)}<small>${u.id.slice(0,6)}</small></div>`).join('') + '</div>', { cls: 'wide' }); });
  await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/w_icons.png' });
  for (const tid of ['ironwall','immortal','ghostdance','halo']) {
    await pg.evaluate((tid) => { Modal.close(true); const it = genUnique(save, UNIQUE_BY_ID[tid], 10); showUniqueFx([it], () => {}); }, tid);
    await pg.waitForTimeout(1600); await pg.screenshot({ path: `/tmp/w_fx_${tid}.png` });
    await pg.evaluate(() => { const e = document.querySelector('#unique'); e.classList.add('ready'); e.click(); });
    await pg.waitForTimeout(100);
  }
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
