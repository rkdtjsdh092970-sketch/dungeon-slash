const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.endgame = true; save.cleared = Array(10).fill(10); save.rift.best = 64; save.keys = 3;
    for (const s of SLOTS) { const it = genItem(save, 14, 3, s); it.enh = 8; save.equipped[s] = it; }
    SRV.on = true; SRV.name = '삼촌';
    const rows = [['삼촌', 1.2e16, 64, 57, 504], ['김정혁', 7.6e15, 64, 45, 101], ['황진수', 4e12, 0, 0, 0], ['Begin', 9e11, 0, 0, 0]].map(([n, p, r, t, e], i) => ({ name: n, level: 100 - i * 10, power: p, rift: r, trial: t, endless: e, guild: i < 2 ? '무적길드' : null }));
    api = async (p) => { if (p.startsWith('/api/rank')) { const k = p.split('k=')[1]; return { rows: rows.slice().sort((a, b) => b[k] - a[k]), mine: { rank: 1, value: rows[0][k] }, total: 4, k }; } if (p === '/api/guild/list') return { rows: [{ id: 1, name: '무적길드', leader: '삼촌', exp: 120000, members: 2, level: 2 }] }; return { err: 'x' }; };
    openTown(10); });
  await pg.waitForTimeout(600); await pg.screenshot({ path: '/tmp/top_pow.png' });
  console.log('top', await pg.evaluate(() => document.querySelector('#t-pow-w').innerText + ' | ' + fmtPow(7.6e15) + ' | ' + fmtPow(123456) + ' | ' + fmtPow(3.3e19)));
  await pg.click('#b-rank'); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/rank_a.png' });
  await pg.click('[data-a="rkt"][data-k="rift"]'); await pg.waitForTimeout(400);
  await pg.click('[data-a="rkt"][data-k="guild"]'); await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/rank_g.png' });
  await pg.click('[data-a="rkt"][data-k="power"]'); await pg.waitForTimeout(400); await pg.click('[data-a="rkprof"][data-n="1"]'); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/rank_p.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
