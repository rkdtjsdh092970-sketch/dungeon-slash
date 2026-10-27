const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window._mail = [{ id: 1, title: '밸런싱 테스트 지원금', body: '밸런싱 테스트를 위한 지원금입니다.', gold: 10000000, ore: 0, created: Date.now(), claimed: 0 }];
    save = newSave(); save.tut.done = true; save.level = 50; save.gold = 100; SRV.on = true; SRV.name = 'T';
    api = async (p, b) => { if (p === '/api/mail/list') return { rows: window._mail }; if (p === '/api/mail/claim') { const m = window._mail.find(x => x.id === b.id && !x.claimed); if (!m) return { err: '이미 받았거나 없는 우편입니다' }; m.claimed = 1; return { ok: true, gold: m.gold, ore: m.ore }; } return { err: 'x' }; };
    openTown(1); });
  await pg.waitForTimeout(700); await pg.screenshot({ path: '/tmp/town_mail.png' });
  console.log('mailN', await pg.evaluate(() => G.mailN));
  await pg.evaluate(() => townClick(TOWN_SPOTS.find(s => s.id === 'mail'))); await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/mail_ui.png' });
  await pg.click('[data-a="mget"]'); await pg.waitForTimeout(500);
  console.log('gold after claim', await pg.evaluate(() => save.gold), '| second claim:', await pg.evaluate(async () => JSON.stringify(await api('/api/mail/claim', { id: 1 }))));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
