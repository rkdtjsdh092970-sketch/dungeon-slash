const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::ERR/.test(m.text())) errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; save.endgame = true; save.lanesBase = 3; save.gold = 1e6; save.ore = 999; save.orbC = 9; save.orbD = 9; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); for (let i = 0; i < 20; i++) save.inv.push(genItem(save, 5, i % 5, SLOTS[i % SLOTS.length])); openTown(3); });
  // 모든 창을 열고 닫기
  const wins = ['openStats()','openSkills()','openPassives()','openCodex()','openTower()','openDaily()','openRecords()','openSettings()','openQuests(true)','openAtlas()','openBulk()','renderItems()'];
  for (const w of wins) { const r = await pg.evaluate((w) => { try { Modal.close(true); eval(w); return 'ok'; } catch (e) { return 'ERR ' + e.message; } }, w); if (r !== 'ok') console.log(w, r); }
  // 맵/마을 전환 반복
  for (const k of ['m','m','i','Escape','k','Escape','p','Escape','d','Escape']) { await pg.keyboard.press(k); await pg.waitForTimeout(120); }
  // 상세 정리/상점/대장간 모드
  for (const mode of ['forge','shop','inv']) await pg.evaluate((m) => { IB.mode = m; IB.sel = save.inv[0]; renderItems(); }, mode);
  // 모든 노드 종류 짧게 전투
  for (const node of [{kind:'boss',act:2,stage:10},{kind:'elite',act:2,stage:5,need:5},{kind:'treasure',act:2,stage:5,need:5},{kind:'rift',act:10,tier:3},{kind:'hell',act:10,tier:3},{kind:'endless',act:10,tier:1},{kind:'void',act:10,tier:1},{kind:'trial',act:10,tier:2}]) {
    const r = await pg.evaluate((n) => { try { Modal.close(true); n.name = n.kind; startBattle(n, {}); const b = G.battle; b.hp = b.maxHp = 1e9; b.mana = b.maxMana = 1e9; G.speed = 3; return 'ok'; } catch (e) { return 'ERR ' + e.message; } }, node);
    await pg.waitForTimeout(1500); if (r !== 'ok') console.log(node.kind, r);
  }
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
