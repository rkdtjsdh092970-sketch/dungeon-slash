s = open('/home/claude/game/src/battle.js').read()
def rep(a, b, cnt=1):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, cnt)

# ---------- planFor
a = s.index("function planFor(node) {"); b = s.index("function createBattle(sv, node) {")
newplan = '''const RIFTLIKE = { rift: 1, hell: 1, endless: 1, void: 1 };
const specDef = (va) => Object.assign({ tier: "normal", ranged: ACT_SPECIAL[va].range >= 3, proj: va === 7 ? "orb" : null }, ACT_SPECIAL[va]);
function wavePool(act, stage, mods) {
  const w = actWeights(act); w.spec = SPEC_W(act, stage);
  if (mods && mods.some((m) => m.ranged)) { w.archer = (w.archer + 10) * 2; w.mage = (w.mage + 6) * 2.5; }
  return w;
}
function extendPlan(b, n) {
  const w = wavePool(10, 5, b.mods), types = Object.keys(w);
  for (let i = 0; i < n; i++) b.plan.push(Math.random() < 0.02 ? "warp" : wpick(types, (t) => w[t] + 1e-4));
  for (let i = 0; i < Math.ceil(n / 12); i++) b.plan.splice(rint(2, b.plan.length), 0, "brute");
}
function planFor(node) {
  if (node.kind === "tutorial") return TUTORIAL[node.step].plan.slice();
  const act = Math.min(10, node.act), stage = node.stage || 10, mods = node.mods || [];
  const w = wavePool(act, stage, mods), types = Object.keys(w);
  let nNormal = CFG.WAVE_BASE + CFG.WAVE_STAGE * stage, elites = eliteCount(stage), boss = false;
  if (node.kind === "boss") { nNormal = Math.round(nNormal * 0.55); boss = true; }
  else if (node.kind === "elite") { nNormal = 45; elites = 10 + act; }
  else if (node.kind === "treasure") { nNormal = 95; elites = 0; }
  else if (node.kind === "rift" || node.kind === "hell") { const t = node.tier; nNormal = 70 + 4 * t; elites = 3 + Math.floor(t / 2); boss = node.kind === "rift" && t % 5 === 0; if (mods.some((m) => m.elites)) elites *= 3; }
  else if (node.kind === "endless") { nNormal = 40; elites = 3; }
  else if (node.kind === "void") { nNormal = 22; elites = 3; boss = true; }
  const plan = [];
  for (let i = 0; i < nNormal; i++) plan.push(wpick(types, (t) => w[t] + 1e-4));
  for (let i = 0; i < elites; i++) plan.splice(Math.floor(plan.length * (0.15 + 0.8 * Math.random())), 0, "brute");
  if (RIFTLIKE[node.kind] && node.kind !== "void") for (let i = 0; i < plan.length; i++) if (Math.random() < 0.012) plan[i] = "warp";
  if (boss) plan.splice(Math.floor(plan.length * 0.65), 0, "boss");
  return plan;
}
'''
s = s[:a] + newplan + s[b:]

# ---------- createBattle
rep('const act = Math.min(10, node.act), stage = node.kind === "rift" ? 4 : node.stage || 10;\n  const riftMul = node.kind === "rift" ? Math.pow(CFG.RIFT_SCALE, node.tier - 1) : 1;',
    'const act = Math.min(10, node.act), stage = RIFTLIKE[node.kind] ? 4 : node.stage || 10;\n  const riftMul = node.tier ? Math.pow(CFG.RIFT_SCALE, node.tier - 1) : 1;')
rep('haste: mods.reduce((a, m) => a * (m.haste || 1), 1), noFx: false };',
    'haste: mods.reduce((a, m) => a * (m.haste || 1), 1), noFx: false, endless: node.kind === "endless", revive: st.revive, inv: 0, keys: 0 };')
rep('b.bossDef = node.kind === "boss" ?', 'b.bossDef = node.kind === "void" ? VOID_BOSS : node.kind === "boss" ?')

# ---------- makeEnemy
rep('''  const isBoss = type === "boss", D = isBoss ? b.bossDef : ENEMIES[type];
  const e = { id: b.nextId++, type, def: D, tier: isBoss ? "boss" : D.tier, w: isBoss ? D.w : 1, h: isBoss ? D.h : 1, lane, col,
    hp: D.hp * b.hpM * (isBoss ? CFG.BOSSX : 1), maxHp: D.hp * b.hpM * (isBoss ? CFG.BOSSX : 1), atk: D.atk * b.atkM, range: D.range, interval: D.interval / b.haste, windup: D.windup,
    moveCd: CFG.MOVE_TIME, atkCd: null, winding: 0, flash: 0, hurtT: 0, chill: 0, vx: null, vy: null, age: 0, dead: false };''',
'''  const isBoss = type === "boss", va = RIFTLIKE[b.kind] && b.kind !== "hell" ? rint(6, 9) : Math.min(10, b.act) - 1;
  const D = isBoss ? b.bossDef : type === "spec" ? specDef(va) : type === "warp" ? WARP : ENEMIES[type];
  const gh = b.endless ? Math.pow(1.06, b.time / 20) : 1, ga = b.endless ? Math.pow(1.045, b.time / 20) : 1, bx = isBoss ? CFG.BOSSX : 1;
  const e = { id: b.nextId++, type, def: D, tier: isBoss ? "boss" : D.tier, w: isBoss ? D.w : 1, h: isBoss ? D.h : 1, lane, col, va, traits: D.traits || [],
    hp: D.hp * b.hpM * bx * gh, maxHp: D.hp * b.hpM * bx * gh, atk: D.atk * b.atkM * ga, range: D.range, interval: D.interval / b.haste, windup: D.windup,
    moveCd: CFG.MOVE_TIME, atkCd: null, winding: 0, flash: 0, hurtT: 0, chill: 0, vx: null, vy: null, age: 0, dead: false };
  e.moveT = CFG.MOVE_TIME * (e.traits.includes("fast") ? 0.55 : 1); e.moveCd = e.moveT;''')
rep('function spawnAt(b, type, lane, col) {', '''function spawnNear(b, type, lane, col) {
  for (const [dl, dc] of [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) { const l = lane + dl, c = col + dc; if (canPlace(b, { tier: "normal", w: 1, h: 1 }, l, c)) return spawnAt(b, type, l, c); }
  return null;
}
function spawnAt(b, type, lane, col) {''')
rep('const type = b.plan[0], isBoss = type === "boss", D = isBoss ? b.bossDef : ENEMIES[type];',
    'const type = b.plan[0], isBoss = type === "boss", D = isBoss ? b.bossDef : type === "spec" ? specDef(Math.min(10, b.act) - 1) : type === "warp" ? WARP : ENEMIES[type];')
s = s.replace("e.moveCd = CFG.MOVE_TIME;", "e.moveCd = e.moveT;")

# ---------- damagePlayer
rep('opt = opt || {};\n  if (!opt.undodgeable', 'opt = opt || {};\n  if (b.inv > 0) return;\n  if (!opt.undodgeable')
rep('if (b.debuffs.curse) d *= 1 + b.debuffs.curse.mult;', 'if (b.debuffs.curse) d *= 1 + b.debuffs.curse.mult;\n  d *= Math.max(0.2, 1 + b.stats.dmgTaken);')

# ---------- killEnemy
rep('b.corpses.push({ x: p.x, y: p.y, def: e.def, type: e.type, tier: e.tier, t: 0, w: e.w, h: e.h, boss: e.tier === "boss", flip: true });',
    'b.corpses.push({ x: p.x, y: p.y, def: e.def, type: e.type, tier: e.tier, t: 0, w: e.w, h: e.h, boss: e.tier === "boss", flip: true, va: e.va });\n  if (e.traits && e.traits.includes("split") && !e.exploded) for (let i = 0; i < 2; i++) spawnNear(b, "imp", e.lane, e.col);\n  if (e.type === "warp") { b.keys++; say(b, "공허의 열쇠를 얻었다!", "good"); sfx(b, "key"); }')

# ---------- stepBattle
rep("b.hp = Math.min(b.maxHp, b.hp + b.maxHp * CFG.REGEN * dt);", "b.hp = Math.min(b.maxHp, b.hp + b.maxHp * (CFG.REGEN + b.stats.regen) * dt); if (b.inv > 0) b.inv -= dt;\n  if (b.endless && b.plan.length < 10) extendPlan(b, 40);")
rep("    if (e.tier === \"boss\") bossTick(b, e, dt);\n    if (e.stun > 0) continue;",
    "    if (e.tier === \"boss\") bossTick(b, e, dt);\n    if (e.traits.length && e.traits.includes(\"regen\")) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.025 * dt);\n    if (e.stun > 0) continue;")
rep('''        damagePlayer(b, dmg, { shake: e.tier === "boss" ? 0.25 : 0 }); sfx(b, e.def.ranged ? "arrow" : "ehit");
        e.atkCd = e.interval * rnd(1 - CFG.JITTER, 1 + CFG.JITTER);''',
'''        if (e.traits.includes("explode")) { dmg *= 3; fx(b, { kind: "boom", x: PLAYER_POS.x + 20, y: PLAYER_POS.y - 30, t: 0.4, life: 0.4, color: "#ff8a40", r: 70 }); e.exploded = true; }
        damagePlayer(b, dmg, { shake: e.tier === "boss" || e.exploded ? 0.25 : 0 }); sfx(b, e.def.ranged ? "arrow" : "ehit");
        if (e.traits.length) traitHit(b, e);
        if (e.exploded) { killEnemy(b, e); continue; }
        e.atkCd = e.interval * rnd(1 - CFG.JITTER, 1 + CFG.JITTER);''')
rep("function stepBattle(b, dt) {", '''function traitHit(b, e) {
  const T = e.traits;
  if (T.includes("poison") && (!b.debuffs.poison || b.debuffs.poison.t < 2)) b.debuffs.poison = { t: 4, dps: 0.009 };
  if (T.includes("chill") && (!b.debuffs.slow || b.debuffs.slow.t < 1.5)) b.debuffs.slow = { t: 3, mult: 0.7 };
  if (T.includes("curse") && (!b.debuffs.curse || b.debuffs.curse.t < 2)) b.debuffs.curse = { t: 4, mult: 0.2 };
}
function stepBattle(b, dt) {''')
rep('''  if (b.hp <= 0) { b.hp = 0; b.over = true; b.win = false; }
  else if (!b.plan.length && !b.enemies.length && !b.events.length) { b.over = true; b.win = true; }
  else if (b.time > 900) { b.over = true; b.win = false; }''',
'''  if (b.hp <= 0 && b.revive > 0) { b.revive--; b.hp = b.maxHp * 0.5; b.inv = 1.5; b.flash = 0.4; b.shake = 0.5; say(b, "부활!", "good"); sfx(b, "revive"); fx(b, { kind: "aura", t: 1, life: 1, color: "#ffe9a0" }); }
  if (b.hp <= 0) { b.hp = 0; b.over = true; b.win = false; }
  else if (!b.plan.length && !b.enemies.length && !b.events.length) { b.over = true; b.win = true; }
  else if (b.endless ? b.time > 1200 : b.time > 900) { b.over = true; b.win = !!b.endless; }''')
open('/home/claude/game/src/battle.js', 'w').write(s)
print('patched')
