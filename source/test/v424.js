const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1000, height: 640 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push('PE ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(700);
  const r = await pg.evaluate(() => {
    save = newSave(); save.tut.done = true; save.level = 100; const A = autoRules(save); A.rules = { 0: 'dis', 1: 'dis', 2: 'dis', 3: 'dis', 4: 'dis' }; A.keepUp = false; A.tierX = 2; A.tierN = 3;
    const mk = (ts) => { const it = genItem(save, 5, 3, 'weapon'); it.affixes = ts.map((t, i) => ({ k: ['magFlat', 'magPct', 'critDmg', 'cdr', 'spellCrit'][i], v: 0.1, t: t - 1 })); return it; };
    const items = { a_T1T1T2: mk([1, 1, 2, 5, 5]), b_T2x3: mk([2, 2, 2, 6, 6]), c_T2x2_T3: mk([2, 2, 3, 3, 3]), d_T1x2: mk([1, 1, 4, 4, 4]), e_none: mk([5, 5, 6, 6, 6]) };
    for (const k in items) { items[k].uid = save.nextUid++; save.inv.push(items[k]); }
    const before = Object.keys(items); const res = autoProcess(save); const left = save.inv.map((i) => before.find((k) => items[k] === i)).filter(Boolean);
    return { kept: left, removed: before.filter((k) => !left.includes(k)), res, invMax: CFG.INV_MAX, floor: CFG.TAKEN_FLOOR };
  });
  console.log(JSON.stringify(r));
  const r2 = await pg.evaluate(() => { const it = genItem(save, 5, 3, 'boots'); it.uid = save.nextUid++; it.sock = [{ k: 'magFlat', v: 22 }, null]; save.inv.push(it); IB.sel = it; IB.mode = 'forge'; const html = socketBlock(it); openSockDel(it, 0); return { html: /삭제/.test(html), rec: /회수 불가/.test(html), modal: !!document.querySelector('#mbox [data-a="sockdelyes"]') }; });
  console.log(JSON.stringify(r2)); await pg.click('[data-a="sockdelyes"]'); await pg.waitForTimeout(300);
  console.log(JSON.stringify(await pg.evaluate(() => ({ sock: IB.sel.sock, stones: save.stones.length }))));
  const r3 = await pg.evaluate(() => { save.equipped = {}; const it = genItem(save, 5, 3, 'boots'); it.affixes = [{ k: 'dmgTaken', v: -0.95, t: 0 }]; save.equipped.boots = it; openStats(); return [...document.querySelectorAll('.sg div')].map((d) => d.innerText.replace(/\n/g, ' ')).filter((t) => /받는 피해/.test(t)); });
  console.log(r3.join(' | ')); await pg.evaluate(() => { Modal.close(true); openAutoDis(); }); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/autodis.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close(); })();
