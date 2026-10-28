const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.slots = 4; save.cleared = [5]; save.endgame = true; save.lanesBase = 3; save.level = 60; save.rift.best = 60; save.gold = 5e6; save.ore = 900; save.orbC = 5; save.shards = 300;
    for (const s of SLOTS) save.inv.push(genItem(save, 3, 3, s)); for (const id of ['strike', 'smash', 'lance', 'chain', 'p_steel']) save.skills.push(genSkill(save, id, 0)); for (const p of PASSIVE_SKILLS) save.skills.push(genSkill(save, p.id, 0));
    G.townAct = 1; showScreen('town'); refreshTop(); });
  const calls = ['openDaily()', 'openRecords()', 'openBoard()', 'openMail()', 'openAuction()', 'openGuild()', 'openAtlas()', 'openStats()', 'openAutoDis()', 'openAutoSkill()', 'openBulk()', 'openNotice && openNotice()', 'openSkills()', 'SK.slot=4;openSkills()', 'openCodex()', 'CX.tab="skill";openCodex()', 'CX.tab="fml";openCodex()', 'openRanking && openRanking()', 'openTower()', 'openItems("shop")', 'openSkillShop && openSkillShop()', 'openSettings && openSettings()'];
  for (const c of calls) { const e = await pg.evaluate((c) => { try { Modal.close(true); eval(c); return null; } catch (e) { return String(e); } }, c); if (e) console.log('CALL FAIL', c, e); await pg.waitForTimeout(120); }
  // 마을 건물 전부 클릭
  const ids = await pg.evaluate(() => TOWN_SPOTS.map((s) => s.id));
  for (const id of ids) { const e = await pg.evaluate((id) => { try { Modal.close(true); townClick(TOWN_SPOTS.find((s) => s.id === id)); return null; } catch (e) { return String(e); } }, id); if (e) console.log('TOWN FAIL', id, e); await pg.waitForTimeout(150); }
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
