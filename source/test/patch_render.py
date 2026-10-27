def patch(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (path, a[:80])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

# ------------------------------------------------------------------ assets.js
patch('/home/claude/game/src/assets.js', [
("  const dx = x - 16 * sc, dy = y - 28 * sc;\n  if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }\n  if (tint) {\n    const t = tintTmp(sheet, frame * 32, row * 32, 32, 32, tint); ctx.drawImage(t, 0, 0, 32, 32, dx, dy, 32 * sc, 32 * sc);\n  } else ctx.drawImage(sheet, frame * 32, row * 32, 32, 32, dx, dy, 32 * sc, 32 * sc);",
 "  const cs = sheet.width / 5, dx = x - (cs / 2) * sc, dy = y - (cs - 4) * sc;\n  if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }\n  if (tint) {\n    const t = tintTmp(sheet, frame * cs, row * cs, cs, cs, tint); ctx.drawImage(t, 0, 0, cs, cs, dx, dy, cs * sc, cs * sc);\n  } else ctx.drawImage(sheet, frame * cs, row * cs, cs, cs, dx, dy, cs * sc, cs * sc);"),
("  if (opt.tint) { const t = tintTmp(IMG.bosses, sx, sy, 64, 64, opt.tint); ctx.drawImage(t, 0, 0, 64, 64, -32, -60, 64, 64); }\n  else ctx.drawImage(IMG.bosses, sx, sy, 64, 64, -32, -60, 64, 64);",
 "  const src = opt.hue ? getSheet(\"bosses\", opt.hue) : IMG.bosses;\n  if (opt.tint) { const t = tintTmp(src, sx, sy, 64, 64, opt.tint); ctx.drawImage(t, 0, 0, 64, 64, -32, -60, 64, 64); }\n  else ctx.drawImage(src, sx, sy, 64, 64, -32, -60, 64, 64);"),
# backgrounds for endgame
("  const A = ACTS[Math.min(10, act) - 1], W = 240, H = 135, r = seeded(act * 7919 + 13);",
 "  const A = ACTS[Math.min(10, act > 10 ? (act === 11 ? 8 : 7) : act) - 1], W = 240, H = 135, r = seeded(act * 7919 + 13);"),
("  if (act === 1) { rect(190, 14, 14, 14,",
 "  if (act === 11) { for (let i = 0; i < 6; i++) { g.strokeStyle = `rgba(190,120,255,${0.5 - i * 0.07})`; g.lineWidth = 3; g.beginPath(); g.arc(120, 52, 14 + i * 9, i, i + 4.4); g.stroke(); } g.fillStyle = \"#0a0414\"; g.beginPath(); g.arc(120, 52, 12, 0, 7); g.fill(); for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * 80; rect(x, y, 3, 5, \"#7a4ad8\"); rect(x + 1, y + 1, 1, 2, \"#e8d0ff\"); } hills(88, 2, \"#1c1030\", 11, 0.05); }\n  else if (act === 12) { for (let i = 0; i < 12; i++) { const x = r() * W, h = 24 + r() * 40; g.fillStyle = \"#1a0606\"; g.beginPath(); g.moveTo(x, 86); g.lineTo(x + 6, 86 - h); g.lineTo(x + 12, 86); g.fill(); } rect(96, 10, 48, 28, \"#ff5a20\"); rect(104, 14, 32, 20, \"#ffb040\"); for (let i = 0; i < 50; i++) rect(r() * W, 30 + r() * 60, 1, 3, \"#ff7a30\"); hills(88, 3, \"#2a0808\", 12, 0.05); }\n  else if (act === 1) { rect(190, 14, 14, 14,"),
# town building: skill shop (wizard tower)
("  else if (type === \"gate\") {",
 "  else if (type === \"skillshop\") { p(-12, -50, 24, 50, \"#5a4a8a\"); p(-14, -54, 28, 6, \"#7a6ab0\"); p(-10, -66, 20, 12, \"#3a2a6a\"); p(-6, -76, 12, 10, \"#5a4a8a\"); p(-1, -84, 2, 10, \"#ffe45a\"); p(-3, -82, 6, 2, \"#ffe45a\"); p(-4, -14, 8, 14, wood); p(-8, -36, 5, 6, lit); p(3, -36, 5, 6, lit); p(-8, -26, 5, 6, \"#8ad8ff\"); p(3, -26, 5, 6, \"#d8a0ff\"); p(-22, -6, 8, 6, \"#d84a5a\"); p(14, -6, 8, 6, \"#4ac8d8\"); }\n  else if (type === \"gate\") {"),
])

# ------------------------------------------------------------------ render.js
patch('/home/claude/game/src/render.js', [
("const SPR_OF = { imp: \"imp\", grunt: \"goblin\", archer: \"archer\", mage: \"shaman\", brute: \"brute\" };",
 "const ROLE_IDX = { imp: 0, grunt: 1, archer: 2, mage: 3, brute: 4, spec: 5 };\nfunction spriteOf(b, e) {\n  if (e.type === \"warp\") return [\"eye\", 270];\n  const va = e.va != null ? e.va : Math.min(10, b.act) - 1, r = ROSTER[va][ROLE_IDX[e.type]]; return [r[0], r[1] || 0];\n}\nfunction bossArt(D) { return D.art != null ? D.art : BOSSES.indexOf(D); }"),
("    drawBossSprite(ctx, ACTS[bossActIdx(D)].boss, x + off - p * 10, y + bob * 0.3, D.sc, Object.assign(opt, { tint }));",
 "    drawBossSprite(ctx, bossArt(D), x + off - p * 10, y + bob * 0.3, D.sc, Object.assign(opt, { tint, hue: D.hue }));"),
("  const kind = SPR_OF[e.type], sheet = getSheet(kind, ACTS[b.act > 10 ? 9 : b.act - 1].hue * (kind === \"imp\" ? 0.5 : 1)), sc = D.sc;",
 "  const [skey, shue] = spriteOf(b, e), meta = SPR_META[skey], sheet = getSheet(skey, shue), sc = e.tier === \"elite\" && meta.cell === 48 ? 2.5 : D.sc, kind = skey, top = y - meta.h * sc - 6;\n  if (e.type === \"warp\") { const g = ctx.createRadialGradient(x, y - 40, 4, x, y - 40, 60 + Math.sin(time * 6) * 8); g.addColorStop(0, \"rgba(210,140,255,.55)\"); g.addColorStop(1, \"rgba(210,140,255,0)\"); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 110, 140, 140); for (let i = 0; i < 5; i++) { const a = time * 3 + i * 1.26; ctx.fillStyle = \"#f0d8ff\"; ctx.fillRect(x + Math.cos(a) * 36 - 2, y - 44 + Math.sin(a) * 26 - 2, 4, 4); } }"),
("  let anim = \"idle\", t = e.age + e.id * 0.37;", "  let anim = \"idle\", t = e.age + e.id * 0.37;"),
("ctx.fillRect(x - 24, y - 32 * sc + 10, 48, 5); ctx.fillStyle = \"#e8564a\"; ctx.fillRect(x - 24, y - 32 * sc + 10, 48 * Math.max(0, e.hp / e.maxHp), 5); ctx.strokeStyle = \"#ffb04a\"; ctx.lineWidth = 2; ctx.strokeRect(x - 25, y - 32 * sc + 9, 50, 7); }",
 "ctx.fillRect(x - 24, top, 48, 5); ctx.fillStyle = \"#e8564a\"; ctx.fillRect(x - 24, top, 48 * Math.max(0, e.hp / e.maxHp), 5); ctx.strokeStyle = \"#ffb04a\"; ctx.lineWidth = 2; ctx.strokeRect(x - 25, top - 1, 50, 7); }"),
("ctx.fillRect(x - 14, y - 32 * sc + 8, 28, 4); ctx.fillStyle = \"#e8564a\"; ctx.fillRect(x - 14, y - 32 * sc + 8, 28 * Math.max(0, e.hp / e.maxHp), 4); }",
 "ctx.fillRect(x - 14, top, 28, 4); ctx.fillStyle = \"#e8564a\"; ctx.fillRect(x - 14, top, 28 * Math.max(0, e.hp / e.maxHp), 4); }"),
("  if (e.winding > 0) drawPx(ctx, \"!\", x - 4, y - 32 * sc + 2, \"#ff5a5a\", 3);", "  if (e.winding > 0) drawPx(ctx, \"!\", x - 4, top - 8, \"#ff5a5a\", 3);"),
("const bossActIdx = (D) => BOSSES.indexOf(D) >= 0 ? (ACTS.findIndex((a) => a.boss === BOSSES.indexOf(D))) : 0;\n", ""),
("drawBossSprite(ctx, ACTS.find((x) => x.boss === BOSSES.indexOf(c.def)) ? BOSSES.indexOf(c.def) : 0, c.x, c.y, c.def.sc, { alpha: a, sy: 1 - c.t * 0.35, sx: 1 + c.t * 0.1, tint: c.t < 0.3 ? \"rgba(255,255,255,.7)\" : null }); continue; }",
 "drawBossSprite(ctx, bossArt(c.def), c.x, c.y, c.def.sc, { alpha: a, sy: 1 - c.t * 0.35, sx: 1 + c.t * 0.1, tint: c.t < 0.3 ? \"rgba(255,255,255,.7)\" : null, hue: c.def.hue }); continue; }"),
("    const kind = SPR_OF[c.type], sheet = getSheet(kind, ACTS[b.act > 10 ? 9 : b.act - 1].hue * (kind === \"imp\" ? 0.5 : 1)), af = animFrame(kind, \"death\", c.t), a = clamp(1.3 - c.t, 0, 1);\n    drawSprite(ctx, sheet, af.row, af.frame, c.x, c.y, c.def.sc, true, a);",
 "    const [ck, ch] = spriteOf(b, c), cm = SPR_META[ck], sheet = getSheet(ck, ch), af = animFrame(ck, \"death\", c.t), a = clamp(1.3 - c.t, 0, 1);\n    drawSprite(ctx, sheet, af.row, af.frame, c.x, c.y, c.tier === \"elite\" && cm.cell === 48 ? 2.5 : c.def.sc, true, a);"),
# 배경/길
("  ctx.drawImage(makeBackground(Math.min(10, b.act)), 0, 0);\n  const lh = laneH(b), lt = laneTop(b);\n  for (let l = 0; l < b.lanes; l++) {\n    ctx.fillStyle = \"rgba(10,8,22,.34)\"; ctx.fillRect(LAY.x0 - 10, lt + l * lh + 4, CW - LAY.x0, lh - 8);\n    ctx.fillStyle = \"rgba(255,255,255,.06)\"; for (let c = 0; c <= CFG.COLS; c++) ctx.fillRect(LAY.x0 + c * LAY.cw - 1, lt + l * lh + 6, 2, lh - 12);\n    ctx.fillStyle = \"rgba(255,255,255,.1)\"; ctx.fillRect(LAY.x0 - 10, lt + l * lh + 4, CW - LAY.x0, 2); ctx.fillRect(LAY.x0 - 10, lt + (l + 1) * lh - 6, CW - LAY.x0, 2);\n  }\n  ctx.fillStyle = \"rgba(255,255,255,.28)\"; ctx.font = \"11px sans-serif\"; ctx.textAlign = \"center\"; for (let c = 1; c <= CFG.COLS; c++) ctx.fillText(c + \"열\", LAY.x0 + (c - 0.5) * LAY.cw, lt - 6);",
 "  ctx.drawImage(makeBackground(b.kind === \"hell\" ? 12 : RIFTLIKE[b.kind] ? 11 : Math.min(10, b.act)), 0, 0);\n  const lh = laneH(b), lt = laneTop(b);\n  drawRoads(ctx, b, time);"),
("function drawBattle(ctx, b, dt, time) {", '''function drawRoads(ctx, b, time) {
  const lh = laneH(b), lt = laneTop(b), A = ACTS[(b.kind === "hell" ? 6 : RIFTLIKE[b.kind] ? 7 : Math.min(10, b.act) - 1)];
  const base = b.kind === "hell" ? "#2a1010" : mixc(A.ground, "#000000", 0.3), edge = b.kind === "hell" ? "#5a2418" : mixc(A.ground, "#ffffff", 0.1), dark = mixc(A.ground, "#000000", 0.5);
  for (let l = 0; l < b.lanes; l++) {
    const yc = lt + (l + 0.78) * lh - 8, hh = 22, x0 = LAY.x0 - 60, r = seeded(l * 97 + (b.act | 0) * 13 + 5);
    const top = (x) => yc - hh + Math.sin(x * 0.021 + l) * 3 + Math.sin(x * 0.007 + l * 2) * 2, bot = (x) => yc + hh + Math.sin(x * 0.017 + l * 3) * 3;
    const g = ctx.createLinearGradient(x0, 0, x0 + 120, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, top(x0)); for (let x = x0; x <= CW + 10; x += 12) ctx.lineTo(x, top(x)); for (let x = CW + 10; x >= x0; x -= 12) ctx.lineTo(x, bot(x)); ctx.closePath(); ctx.clip();
    ctx.fillStyle = base; ctx.fillRect(x0, yc - hh - 6, CW - x0, hh * 2 + 12);
    ctx.fillStyle = edge; ctx.globalAlpha = 0.5; ctx.fillRect(x0, yc - hh - 6, CW - x0, 6); ctx.globalAlpha = 1;
    ctx.fillStyle = dark; ctx.globalAlpha = 0.55; for (let x = x0; x < CW; x += 6) { ctx.fillRect(x, bot(x) - 7, 6, 8); } ctx.globalAlpha = 1;
    ctx.fillStyle = dark; ctx.globalAlpha = 0.35; ctx.fillRect(x0, yc - 6, CW - x0, 2); ctx.fillRect(x0, yc + 8, CW - x0, 2); ctx.globalAlpha = 1;
    for (let i = 0; i < 70; i++) { const x = x0 + r() * (CW - x0), y = yc - hh + 4 + r() * (hh * 2 - 8), w = 2 + r() * 5; ctx.fillStyle = r() > 0.5 ? edge : dark; ctx.globalAlpha = 0.5; ctx.fillRect(Math.round(x), Math.round(y), w, 2); ctx.globalAlpha = 1; }
    if (RIFTLIKE[b.kind]) { ctx.fillStyle = "rgba(190,120,255,.35)"; for (let x = x0 + 20; x < CW; x += 60) ctx.fillRect(x, yc - 1, 18, 2); }
    if (b.kind === "hell") { ctx.fillStyle = "rgba(255,120,40,.5)"; for (let x = x0 + 10; x < CW; x += 44) ctx.fillRect(x + ((Math.sin(time * 3 + x) * 4) | 0), yc - 2, 10, 3); }
    ctx.restore();
    // 칸 위치를 암시하는 희미한 발판 (격자 대신)
    ctx.fillStyle = "rgba(255,255,255,.06)"; for (let c = 1; c <= CFG.COLS; c++) { ctx.beginPath(); ctx.ellipse(LAY.x0 + (c - 0.5) * LAY.cw, yc + 4, 44, 9, 0, 0, 7); ctx.fill(); }
  }
}
function drawBattle(ctx, b, dt, time) {'''),
("  const kinds = [\"goblin\", \"archer\", \"brute\", \"imp\"]; kinds.forEach((k, i) => { const af = animFrame(k, \"idle\", time + i * 0.3); drawSprite(g, getSheet(k, 0), af.row, af.frame, 590 + i * 78 + (i === 2 ? 20 : 0), 470 - (k === \"imp\" ? 18 : 0), k === \"brute\" ? 4 : 3, true, 1); });",
 "  const kinds = [\"ghoul\", \"skel\", \"brute\", \"fiend\"]; kinds.forEach((k, i) => { const af = animFrame(k, \"idle\", time + i * 0.3); drawSprite(g, getSheet(k, 0), af.row, af.frame, 570 + i * 82, 470 - (k === \"fiend\" ? 14 : 0), k === \"brute\" ? 3.5 : 3, true, 1); });"),
])
print("render patched")
