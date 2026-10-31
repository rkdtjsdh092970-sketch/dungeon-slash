const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 700, height: 900 } }); const e = []; p.on("pageerror", (x) => e.push(x.message));
  await p.goto("file:///home/claude/game/dist/game.html"); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { save = newSave(); const A = autoRules(save);
    const mk = (sat, rar) => { const it = genItem(save, 5, 3, "ring"); if (sat) it.sat = "r_dur"; it.affixes.forEach((a) => (a.t = 5)); return it; };
    const L = mk(0), S = mk(1); const o = {};
    o.def = [autoRuleOf(A, L), autoRuleOf(A, S)];            // 기본: 유지 / 유지
    A.satRule = "dis"; o.satDis = [autoRuleOf(A, L), autoRuleOf(A, S)];   // 사탄만 분해
    A.satRule = "keep"; A.tierX = 2; A.tierN = 3; o.legTier = [autoRuleOf(A, L), autoRuleOf(A, S)];   // 전설 기준: 전설만 영향
    A.tierX = 0; A.sTierX = 2; A.sTierN = 3; o.satTier = [autoRuleOf(A, L), autoRuleOf(A, S)];        // 사탄 기준: 사탄만 영향
    S.affixes.forEach((a) => (a.t = 0)); o.satKeep = autoRuleOf(A, S);
    openAutoDis(); o.ui = document.body.innerText.includes("전설 옵션 티어 기준") && document.body.innerText.includes("사탄 옵션 티어 기준"); return o; });
  await p.waitForTimeout(300); await p.screenshot({ path: "/tmp/autodis.png" });
  console.log(JSON.stringify(r), e.length ? e : "noerr"); await b.close(); })();
