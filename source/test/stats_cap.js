const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1000, height: 640 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push('PE ' + e.message)); await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(700);
  const txt = await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.equipped = {}; const it = genItem(save, 5, 3, 'boots'); it.affixes = [{ k: 'dmgTaken', v: -0.95, t: 0 }, { k: 'cdr', v: 0.9, t: 0 }, { k: 'dodge', v: 0.9, t: 0 }]; save.equipped.boots = it; openStats(); return [...document.querySelectorAll('.sg div')].map((d) => d.innerText.replace(/\n/g, ' ')).filter((t) => /쿨타임 감소|회피|받는 피해|마나 소모/.test(t)); });
  console.log(txt.join('\n')); await pg.screenshot({ path: '/tmp/stats_cap.png' }); console.log(errs.join('\n') || 'no errors'); await br.close(); })();
