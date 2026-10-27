const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window._mail = [10, 30, 100].map((f, i) => ({ id: i + 1, title: `균열 ${f}층 돌파 보상`, body: 'x', gold: 0, ore: 0, created: Date.now(), claimed: 0, ref: 'rift:' + f, reward: JSON.stringify({ t: riftRewardTier(f), f }) }));
    save = newSave(); save.tut.done = true; save.level = 100; save.endgame = true; save.cleared = Array(10).fill(10); save.rift.best = 120; SRV.on = true; SRV.name = 'T';
    api = async (p, b) => { if (p === '/api/mail/list') return { rows: window._mail }; if (p === '/api/mail/claim') { const m = window._mail.find(x => x.id === b.id && !x.claimed); if (!m) return { err: 'x' }; m.claimed = 1; return { ok: true, gold: 0, ore: 0, rewards: [JSON.parse(m.reward)] }; } if (p === '/api/mail/claimall') { const L = window._mail.filter(x => !x.claimed); L.forEach(x => x.claimed = 1); return { ok: true, n: L.length, gold: 0, ore: 0, rewards: L.map(x => JSON.parse(x.reward)) }; } return { err: 'x' }; };
    openTower(); });
  await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/tower.png' });
  await pg.evaluate(() => { Modal.close(true); openMail(); }); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/mail_rw.png' });
  await pg.click('[data-a="mall"]'); await pg.waitForTimeout(600);
  console.log(await pg.evaluate(() => JSON.stringify(save.inv.map(i => [UNIQUE_BY_ID[i.uniq].name, i.utier, i.bound, i.ilvl, i.affixes.length]))));
  console.log('ah blocked', await pg.evaluate(() => { let m = ''; const o = toast; toast = (t) => { m = t; }; ahPostDialog(save.inv[0]); toast = o; return m; }));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
