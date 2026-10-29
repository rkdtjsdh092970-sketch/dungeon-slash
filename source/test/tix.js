const { chromium } = require('playwright'); const G0 = JSON.parse(require('fs').readFileSync('/tmp/begin_graft.json', 'utf8'));
(async () => { const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1000, height: 640 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push('PE ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  // 1) 인장 재설정
  const r1 = await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.sockTix = 30; const it = genItem(save, 5, 3, 'weapon'); it.uid = save.nextUid++; it.sock = [{ k: 'magFlat', v: 22 }, null]; save.inv.push(it); IB.sel = it; IB.mode = 'forge'; const counts = { 1: 0, 2: 0, 3: 0 }; for (let i = 0; i < 30; i++) { const r = rerollSockets(save, it); counts[r.n]++; } return { counts, tix: save.sockTix, sock: it.sock.length, noTix: rerollSockets(save, it).msg }; });
  console.log(JSON.stringify(r1));
  // 2) UI 버튼/확인창
  await pg.evaluate(() => { save.sockTix = 2; const it = IB.sel; it.sock = [{ k: 'magFlat', v: 22 }, { k: 'hpFlat', v: 240, hi: 1 }]; });
  await pg.evaluate(() => openSockRoll(IB.sel)); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/sockroll.png' });
  await pg.click('[data-a="sockrollyes"]'); await pg.waitForTimeout(300);
  console.log('after:', JSON.stringify(await pg.evaluate(() => ({ tix: save.sockTix, sock: IB.sel.sock }))));
  // 3) 신전 드랍 확률 (2000회)
  const r3 = await pg.evaluate(() => { let hi = 0, tix = 0, both = 0; const N = 2000; for (let i = 0; i < N; i++) { const o = rollDrops(save, { kind: 'temple', vsel: 1 }, false, dropBonus(save)); if (o.stonesHi) hi++; if (o.sockTix) tix++; if (o.stonesHi && o.sockTix) both++; } return { N, hiRate: hi / N, tixRate: tix / N, both, base: o => 0, cfg: CFG.TEMPLE.HI[0], hasBaseStones: save.stones.some((s) => !s.hi) }; });
  console.log(JSON.stringify(r3));
  // 4) 맵
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.cleared = Array(10).fill(5); save.endgame = true; save.graduated = 1; save.level = 100; save.rift.best = 100; save.raid = { cleared: 1, best: 100, tower: 1 }; Modal.close(true); openMap(10); MapView.cam.x = 1100; MapView.cam.y = 40; });
  await pg.waitForTimeout(600); await pg.screenshot({ path: '/tmp/map_temple.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close(); })();
