const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 420, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file:///home/claude/game/dist/game.html'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const out = {};
    for (const T of C_TREES) {
      save = newSave(); save.tut.done = true; save.endgame = true; save.level = 100; save.graduated = 1; save.cls = 3; save.cpass = {}; for (const k of C_KEYS) save.cpass[`${T.id}_${k}`] = 1;
      const st = computeStats(save); const cm = Object.assign({}, st.cm);
      const b = createBattle(save, { kind: 'spire', act: 10, floor: 5, tier: 150, name: 's' }); b.noFx = true; let t = 0; while (!b.over && t < 120) { stepBattle(b, 0.05); t += 0.05; }
      out[T.id] = { cm: Object.keys(cm).join(','), win: b.win, t: Math.round(b.time), hp: Math.round(b.hp), xs: b.xShield != null ? Math.round(b.xShield) : null, nan: !isFinite(b.hp) };
    }
    save = newSave(); save.cls = 3; openClass(); out.ui = document.querySelectorAll('.cl-nd').length; return out;
  });
  console.log(JSON.stringify(r)); console.log(errs.length ? errs.join('|') : 'no errors'); await p.screenshot({ path: '/tmp/class.png' }); await br.close();
})();
