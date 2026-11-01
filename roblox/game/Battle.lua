-- 전투 엔진 (JS battle.js / battle2.js 이식, 서버용). 화면 연출(fx · 텍스트)은 이식하지 않는다.
-- 이식 범위(v1): 탑 층 전투(일반 몬스터 · 특수 몹 · 정예 · 보스 능력) + 스킬 종류 대부분 + 전직 효과(cx) + 지속 피해.
-- 아직: 사탄 효과(sat*), 열쇠 몹(warp), 레이드/문지기/속성 보스 전용 기믹.
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local SK = require(Data.Skills)
local Mon = require(Data.Monsters)
local SPM = require(Data.SpriteMap)
local Stats = require(script.Parent.Stats)

local M = {}
local floor, max, min, sqrt, pow = math.floor, math.max, math.min, math.sqrt, math.pow or function(a, b) return a ^ b end

local damagePlayer, raidTick, killEnemy, castSkillRaw, applyDamage
local SKILL_BY = {}; for _, d in ipairs(SK.SKILLS) do SKILL_BY[d.id] = d end
local PLAYER_NEAR = 1

-- ---------- 난수 ----------
local function rnd(b, lo, hi) return lo + (hi - lo) * b.rng:NextNumber() end
local function rint(b, lo, hi) return b.rng:NextInteger(lo, hi) end
local function pick(b, a) return a[b.rng:NextInteger(1, #a)] end
local function shuffle(b, a) local o = table.clone(a); for i = #o, 2, -1 do local j = b.rng:NextInteger(1, i); o[i], o[j] = o[j], o[i] end return o end
local function wpick(b, list, wf) local t = 0; for _, x in ipairs(list) do t += wf(x) end; local r = b.rng:NextNumber() * t; for _, x in ipairs(list) do r -= wf(x); if r <= 0 then return x end end; return list[#list] end
local function sign(x) return x > 0 and 1 or (x < 0 and -1 or 0) end
local function contains(a, v) for _, x in ipairs(a) do if x == v then return true end end return false end
local function filter(a, f) local o = {}; for _, x in ipairs(a) do if f(x) then o[#o + 1] = x end end return o end

-- ---------- 균열 변이 (JS seeded() = mulberry32 와 같은 값) ----------
local function imul(a, b) return (bit32.band(a, 0xffff) * b + bit32.lshift(bit32.band(bit32.rshift(a, 16) * b, 0xffff), 16)) % 4294967296 end
local function seeded(seed)
  local a = seed % 4294967296
  return function()
    a = (a + 0x6D2B79F5) % 4294967296
    local t = imul(bit32.bxor(a, bit32.rshift(a, 15)), bit32.bor(1, a))
    t = bit32.bxor((t + imul(bit32.bxor(t, bit32.rshift(t, 7)), bit32.bor(61, t))) % 4294967296, t)
    return bit32.bxor(t, bit32.rshift(t, 14)) / 4294967296
  end
end
function M.riftMods(tier)
  local rn = seeded(tier * 131 + 7); local n = tier < 10 and 0 or (tier < 30 and 1 or (tier < 60 and 2 or 3))
  local pool, out = table.clone(Mon.RIFT_MODS), {}
  for _ = 1, n do local i = math.floor(rn() * #pool) + 1; out[#out + 1] = table.remove(pool, i) end
  return out
end

-- ---------- 난이도 표 ----------
local function floorMult(f)
  f = max(1, f); local T = CFG.FLOOR_TAB
  if T and #T > 0 then
    if f <= #T then return T[f] end
    return T[#T] * (CFG.FLOOR_TAIL or 1.04) ^ (f - #T)
  end
  return CFG.FLOOR_G ^ (f - 1) * CFG.FLOOR_J ^ floor(f / 20)
end
M.floorMult = floorMult
local function interp(pts, x)
  if x <= pts[1][1] then return pts[1][2] end
  for i = 2, #pts do if x <= pts[i][1] then local a, b = pts[i - 1], pts[i]; return a[2] + (b[2] - a[2]) * (x - a[1]) / (b[1] - a[1]) end end
  return pts[#pts][2]
end
function M.spireTier(f, tw)
  local S = CFG.SPIRE
  if tw == 2 then return S.TAB2[max(1, min(S.END2, f))] end
  return S.TAB[max(1, min(S.END, f))]
end
local function actScale(a) return (CFG.EASE[a] or 1) * CFG.G ^ (min(a, 10) - 1) * (1 + CFG.LEVEL_STEP * (10 * min(a, 10) - 5)) / (1 + CFG.LEVEL_STEP * 5) end

-- ---------- 스킬 ----------
function M.skillOf(inst)
  local d = SKILL_BY[inst.id]; local R = SK.SKILL_RARITY[(inst.rarity or 0) + 1]; local lvl = inst.lvl or 1
  local rn = inst.rune and SK.RUNES[inst.rune] or nil
  local o = table.clone(d)
  o.def = d; o.inst = inst; o.mult = d.mult * R.mult * (1 + 0.05 * (lvl - 1)); o.cd = d.cd * R.cdMul; o.side = d.side or 1
  o.bonus = {}; for k, v in pairs(d.bonus or {}) do o.bonus[k] = v * R.bonusMul end
  o.rarity = inst.rarity or 0; o.lvl = lvl; o.rune = rn; o.mana = (d.mana or 0) * (1 + 0.02 * (lvl - 1))
  o.power = d.power and d.power * (1 + (R.mult - 1) * 0.6) or 0
  if d.kind == "bounce" then o.count = d.count + floor((inst.rarity or 0) / 2) end
  if d.kind == "single" and d.dtype ~= "buff" and d.dtype ~= "heal" then
    local h = SK.SINGLE_HITS[(inst.rarity or 0) + 1] or 1; o.hits = h; o.hitMul = (SK.SINGLE_HIT_BONUS[(inst.rarity or 0) + 1] or 1) / h
  end
  if rn then
    if rn.cd then o.cd *= rn.cd end; if rn.mult then o.mult *= rn.mult end; if rn.mana then o.mana *= rn.mana end
    if rn.ignore then o.ignoreAdd = rn.ignore end; if rn.crit then o.critAdd = rn.crit end
    if rn.lifesteal then o.lifesteal = (o.lifesteal or 0) + rn.lifesteal end
    for _, k in ipairs({ "bleed", "poison", "ignite" }) do if rn[k] then o[k] = (o[k] or 0) + rn[k] end end
    if rn.wide then
      if o.dur then o.dur *= rn.wide end; if o.count then o.count = floor(o.count * rn.wide + 0.5) end
      if o.jumps then o.jumps += 2 end; if o.over then o.over *= rn.wide end
    end
  end
  return o
end

-- ---------- 칸 · 배치 ----------
local function cellsOf(e) local o = {}; for l = e.lane, e.lane + e.h - 1 do for c = e.col, e.col + e.w - 1 do o[#o + 1] = { l, c } end end return o end
local function occupants(b, lane, col)
  local o = {}
  for _, e in ipairs(b.enemies) do if not e.dead and lane >= e.lane and lane < e.lane + e.h and col >= e.col and col < e.col + e.w then o[#o + 1] = e end end
  return o
end
local PUSH_MAX = { elite = 4, boss = 8 }
local function canPlace(b, e, lane, col, push)
  if lane < 0 or lane + e.h > b.lanes or col < 1 or col + e.w - 1 > CFG.COLS then return false end
  local pushed = 0
  for l = lane, lane + e.h - 1 do for c = col, col + e.w - 1 do
    local occ = filter(occupants(b, l, c), function(o) return o ~= e end)
    if #occ > 0 then
      if e.tier ~= "normal" then
        if not push then return false end
        for _, o in ipairs(occ) do if o.tier ~= "normal" then return false end end
        pushed += #occ
      else
        for _, o in ipairs(occ) do if o.tier ~= "normal" then return false end end
        if #occ >= b.cap then return false end
      end
    end
  end end
  return pushed <= (PUSH_MAX[e.tier] or 0)
end
local function displace(b, e)
  local fp = {}; for _, c in ipairs(cellsOf(e)) do fp[c[1] .. "," .. c[2]] = true end
  local victims = {}
  for _, c in ipairs(cellsOf(e)) do for _, o in ipairs(occupants(b, c[1], c[2])) do if o ~= e and o.tier == "normal" and not contains(victims, o) then victims[#victims + 1] = o end end end
  for _, o in ipairs(victims) do
    local function tryCell(l, c, extra)
      if l < 0 or l >= b.lanes or c < 1 or c > CFG.COLS or fp[l .. "," .. c] then return false end
      local oc = occupants(b, l, c); for _, x in ipairs(oc) do if x.tier ~= "normal" then return false end end
      return #oc < b.cap + extra
    end
    local dest
    for _, extra in ipairs({ 0, 1 }) do
      local c = o.col + 1
      while c <= CFG.COLS and not dest do
        for _, l in ipairs(shuffle(b, { o.lane, o.lane - 1, o.lane + 1 })) do if tryCell(l, c, extra) then dest = { l, c }; break end end
        c += 1
      end
      if dest then break end
      c = o.col
      while c >= 1 and not dest do
        for _, l in ipairs(shuffle(b, { o.lane - 1, o.lane + 1 })) do if tryCell(l, c, extra) then dest = { l, c }; break end end
        c -= 1
      end
      if dest then break end
    end
    if not dest then dest = { o.lane, min(CFG.COLS, e.col + e.w) } end
    o.lane = dest[1]; o.col = dest[2]; o.moveCd = CFG.MOVE_TIME * 1.5; o.hurtT = 0.25
  end
end
local function aliveIn(b, range) return filter(b.enemies, function(e) return not e.dead and e.lane < b.lanes and e.col <= range end) end
local function boxHits(b, lane, col, r)
  return filter(b.enemies, function(e)
    if e.dead then return false end
    for _, c in ipairs(cellsOf(e)) do if math.abs(c[1] - lane) <= r and math.abs(c[2] - col) <= r then return true end end
    return false
  end)
end
local function centerLane(b, e) return e.lane + (e.h > 1 and rint(b, 0, e.h - 1) or 0) end

-- ---------- 생성 ----------
local KEYS_ORDER = { "imp", "grunt", "archer", "mage", "spec" }
local function smoothSeq(w, n, st, order)
  local keys, W = {}, 0
  for _, k in ipairs(order or KEYS_ORDER) do if (w[k] or 0) > 0 then keys[#keys + 1] = k; W += w[k] end end
  st = st or {}; local out = {}
  for _ = 1, n do
    local best
    for _, k in ipairs(keys) do st[k] = (st[k] or 0) + w[k] / W; if best == nil or st[k] > st[best] then best = k end end
    st[best] -= 1; out[#out + 1] = best
  end
  return out
end
local function wavePool(act, stage, mods)
  local t = (act - 1) / 9
  local w = { imp = 60 - 40 * t, grunt = 40 - 10 * t, archer = 30 * t + (act >= 2 and 8 or 0), mage = act >= 3 and 8 + 22 * t or 0, spec = stage >= 2 and 11 + act or 0 }
  for _, m in ipairs(mods or {}) do if m.ranged then w.archer = (w.archer + 10) * 2; w.mage = (w.mage + 6) * 2.5 end end
  return w
end
local function insertAt(plan, idx0, v) table.insert(plan, max(1, min(#plan + 1, idx0 + 1)), v) end

local BOSS_BY = {}; for _, d in ipairs(Mon.BOSSES) do BOSS_BY[d.id] = d end
local VOID_TIER = { 100, 108, 126, 138 }
local function bossRiftMult(t) return floorMult(t) * CFG.BOSS_RIFT_K end
local function isEB(kind) return Mon.EB[kind] ~= nil end
M.isEB = isEB
local function voidPhase(b, e, si)
  local hm = bossRiftMult(VOID_TIER[si]) / bossRiftMult(100)
  e.vstage = si; e.maxHp = e.vbaseHp * hm; e.hp = e.maxHp; e.atk = e.vbaseAtk * hm; e.dmgBase = e.atk
end
local function specDef(va)
  local s = table.clone(Mon.ACT_SPECIAL[va + 1]); s.tier = "normal"; s.ranged = s.range >= 3; s.proj = va == 7 and "orb" or nil; return s
end
local function defOf(b, type, va)
  if type == "boss" then return b.bossDef end
  if type == "spec" then return specDef(min(va or b.va, 9)) end
  return Mon.WARPS[type] or Mon.ENEMIES[type]
end
local function warpMix(b, plan, node)
  local kind = node.kind
  if #plan == 0 then return end
  if (kind == "rift" or kind == "spire" or kind == "trial" or kind == "endless") and b.rng:NextNumber() < CFG.WARP_CHANCE then plan[b.rng:NextInteger(1, #plan)] = "warp" end
  if kind == "rift" or kind == "spire" then
    if b.rng:NextNumber() < CFG.WARP_CHANCE then plan[b.rng:NextInteger(1, #plan)] = "hwarp" end
    for _, wt in ipairs({ "twarp", "swarp", "fwarp", "vwarp" }) do if b.rng:NextNumber() < CFG.WARP_CHANCE then plan[b.rng:NextInteger(1, #plan)] = wt end end
  end
end
local function planFor(b, node)
  local kind = b.kind; local mods = node.mods or {}
  local act = min(10, node.act or 10); local stage = node.stage or 10
  local w = wavePool(act, stage, mods)
  if kind == "temple" then
    local pl = smoothSeq({ imp = 9, grunt = 6, archer = 4, mage = 3 }, 90)
    for i = 0, 5 do insertAt(pl, floor(#pl * (i + 0.5) / 6), "brute") end; return pl
  elseif kind == "warden" or kind == "raid" then return {}
  elseif kind == "vault" then
    local pl = smoothSeq({ coin = 12, goldbag = 1 }, 104, nil, { "coin", "goldbag" })
    if b.rng:NextNumber() < CFG.VAULT_CHEST then insertAt(pl, floor(#pl * rnd(b, 0.35, 0.7)), "boss") end; return pl
  elseif isEB(kind) then
    local hw = wavePool(7, 5, mods); local pl = smoothSeq(hw, 70)
    for i = 0, 4 do insertAt(pl, 8 + i * 14, "brute") end; insertAt(pl, 4, "boss"); return pl
  elseif kind == "void" then
    local pl = smoothSeq(w, 5); pl[#pl + 1] = "boss"; for _, x in ipairs(smoothSeq(w, 8)) do pl[#pl + 1] = x end; return pl
  end
  local nNormal, elites, boss
  if kind == "spire" or kind == "rift" or kind == "craid" or kind == "trial" then
    local t = node.tier; nNormal = min(110, floor(34 + 0.8 * t + 0.5)); elites = 2 + min(12, floor(t / 7))
    boss = (kind == "craid") or (kind == "spire" and node.floor % 5 == 0) or ((kind == "rift" or kind == "trial") and t % 5 == 0)
    for _, m in ipairs(mods) do if m.elites then elites *= 3 end end
  elseif kind == "endless" then nNormal = 40; elites = 3; boss = false
  else
    nNormal = CFG.WAVE_BASE + CFG.WAVE_STAGE * stage; elites = stage >= 2 and 1 + floor(stage / 2) or 0; boss = false
    if kind == "boss" then nNormal = floor(nNormal * 0.55 + 0.5); boss = true
    elseif kind == "elite" then nNormal = 45; elites = 10 + act
    elseif kind == "treasure" then nNormal = 95; elites = 0 end
  end
  local plan = smoothSeq(w, nNormal)
  if (kind == "spire" or kind == "rift" or kind == "craid" or kind == "trial") and node.tier >= 50 then
    local ns = min(8, 2 + floor((node.tier - 50) / 12))
    for i = 0, ns - 1 do insertAt(plan, floor(#plan * (0.1 + 0.85 * (i + 0.5) / ns)), "sniper") end
  end
  for i = 0, elites - 1 do insertAt(plan, floor(#plan * (0.15 + 0.8 * (i + 0.5) / elites)), "brute") end
  if kind ~= "craid" then warpMix(b, plan, node) end
  if boss then insertAt(plan, floor(#plan * 0.65), "boss") end
  return plan
end

local function hasTrait(e, t) for _, x in ipairs(e.traits) do if x == t then return true end end return false end

local function makeEnemy(b, type, lane, col)
  local isBoss = type == "boss"; local va = (b.kind == "rift" or b.kind == "trial" or b.kind == "endless" or b.kind == "void") and rint(b, 6, 9) or b.va; local D = defOf(b, type, va)
  local bx = isBoss and CFG.BOSSX or 1
  local gh, ga = 1, 1; if b.endless then gh = 1.06 ^ ((b.ddt or 0) / 20); ga = 1.045 ^ ((b.ddt or 0) / 20) end
  local e = {
    id = b.nextId, type = type, def = D, tier = isBoss and "boss" or (D.tier or "normal"), w = isBoss and D.w or 1, h = isBoss and D.h or 1, lane = lane, col = col,
    traits = D.traits or {}, hp = D.hp * b.hpM * bx * gh, maxHp = D.hp * b.hpM * bx * gh, atk = D.atk * b.atkM * ga, range = D.range, interval = D.interval / b.haste, windup = D.windup,
    moveCd = CFG.MOVE_TIME, winding = 0, flash = 0, hurtT = 0, chill = 0, shock = 0, age = 0, dead = false, stun = 0, dots = {},
  }
  b.nextId += 1
  e.moveT = CFG.MOVE_TIME * (hasTrait(e, "fast") and 0.55 or 1); e.moveCd = e.moveT
  e.dotMul = isBoss and CFG.DOT_BOSS or (e.tier == "elite" and CFG.DOT_ELITE or 1)
  local dd = table.clone(isBoss and Mon.ENEMY_DEF.boss or Mon.ENEMY_DEF[type] or Mon.ENEMY_DEF.grunt)
  for _, t in ipairs(e.traits) do local T = Mon.TRAIT_DEF[t]; if T then dd[1] += T[1]; dd[2] += T[2] end end
  local sc = (1 + CFG.DEF_ACT * (min(10, b.actDef or b.act) - 1)) * (1 + CFG.DEF_TIER * (b.tier or 0))
  e.dm = max(0, dd[1] * sc); e.rm = max(0, dd[2] * sc); e.shD = 0; e.shR = 0
  e.eres = isEB(b.kind) and { 0, 0, 0, 0 } or ((b.kind == "spire" or b.kind == "craid" or b.kind == "warden") and { 0.1, 0.1, 0.1, 0.1 } or Mon.ACT_ELEM[min(9, max(0, va)) + 1])   -- 붉은 탑 몬스터는 속성 저항이 모두 같다
  if isBoss then
    if b.kind == "void" then e.vbaseHp = e.maxHp; e.vbaseAtk = e.atk; voidPhase(b, e, max(1, min(4, b.node.vsel or 1))) end
    e.abil = {}; for _, a in ipairs(D.abilities or {}) do e.abil[#e.abil + 1] = { d = a, t = (a.every or 0) * rnd(b, 0.55, 0.9) } end
    e.dmgBase = e.atk; b.bossRef = e
  end
  return e
end
local function spawnAt(b, type, lane, col)
  local e = makeEnemy(b, type, lane, col); b.enemies[#b.enemies + 1] = e
  if e.tier ~= "normal" then displace(b, e) end
  return e
end
local function spawnNear(b, type, lane, col)
  for _, d in ipairs({ { 0, 0 }, { 0, 1 }, { 1, 0 }, { -1, 0 }, { 0, -1 }, { 1, 1 }, { -1, 1 } }) do
    local l, c = lane + d[1], col + d[2]
    if canPlace(b, { tier = "normal", w = 1, h = 1 }, l, c) then return spawnAt(b, type, l, c) end
  end
end
local function spawnCells(b, D, w, h)
  local out = {}; local isNormal = (D.tier or "boss") == "normal"
  for lane = 0, b.lanes - h do for col = 1, CFG.COLS - w + 1 do
    if isNormal then
      local n = #occupants(b, lane, col)
      if canPlace(b, { tier = "normal", w = 1, h = 1 }, lane, col) then out[#out + 1] = { lane = lane, col = col, w = col ^ 1.5 * (1 + (b.cap - n) * 0.2) * (col == 1 and 0.3 or 1) } end
    else
      if col >= max(D.range or 3, 2) and canPlace(b, { tier = D.tier or "boss", w = w, h = h }, lane, col, true) then out[#out + 1] = { lane = lane, col = col, w = col * col } end
    end
  end end
  return out
end
local function trySpawn(b)
  local type = b.plan[1]; local isBoss = type == "boss"; local D = defOf(b, type)
  local w = isBoss and D.w or 1; local h = isBoss and min(D.h, b.lanes) or 1
  local cells = spawnCells(b, D, w, h)
  if #cells > 0 then
    local c = wpick(b, cells, function(x) return x.w end)
    local e = spawnAt(b, type, c.lane, c.col); table.remove(b.plan, 1)
    b.spawnCd = CFG.SPAWN_INTERVAL * (e.tier == "normal" and 1 or 3); return
  end
  b.spawnCd = 0.15
end
local function spawnRaid(b)
  b.raid = true; b.spawnCd = 1e9
  local e = spawnAt(b, "boss", 0, 2); e.h = b.lanes; e.w = 3; e.range = 99
  e.raid = { limit = CFG.RAID.THR[1] * e.maxHp, idx = 1, sealed = false, t = 0, vuln = 0, blast = 0, cap = e.maxHp, prev = e.maxHp, fails = 0 }
  e.crystalHp = CFG.RAID.CRYSTAL * b.hpM * 1000
end
local function spawnCrystals(b, e)
  local n = b.lanes; local hp = e.crystalHp / n
  for lane = 0, n - 1 do
    local c = makeEnemy(b, "imp", lane, 1); c.crystal = true; c.hp = hp; c.maxHp = hp; c.atk = 0; c.atkCd = 1e9; c.range = 99; c.traits = {}; c.eres = { 0, 0, 0, 0 }
    c.def = table.clone(c.def); c.def.gold = 0; b.enemies[#b.enemies + 1] = c
  end
end
raidTick = function(b, e, dt)
  local R = e.raid; local K = CFG.RAID; if not R then return end
  if R.vuln > 0 then R.vuln -= dt end
  if not R.sealed then
    if R.limit > 0 and e.hp <= R.limit + 1 then R.sealed = true; R.t = 0; R.blast = K.BLAST; R.cap = R.prev; spawnCrystals(b, e); R.fails = 0 end
    return
  end
  R.t += dt
  local any = false; for _, x in ipairs(b.enemies) do if not x.dead and x.crystal then any = true end end
  if not any then
    R.sealed = false; R.prev = R.limit; R.idx += 1; R.limit = K.THR[R.idx] and K.THR[R.idx] * e.maxHp or 0; R.vuln = K.VULN; e.stun = max(e.stun or 0, 2.2); return
  end
  e.hp = min(R.cap, e.hp + e.maxHp * K.REGEN * dt)
  R.blast -= dt; if R.blast <= 0 then R.blast = K.BLAST; damagePlayer(b, e.atk * K.BLASTM * (1 + R.t / 60), { boss = true }) end
end
local function spawnWarden(b)
  local W = CFG.WARDEN
  b.warden = true; b.spawnCd = 1e9; b.wOrb = W.FIRST; b.wPop = 0; b.wBoom = 0
  local e = spawnAt(b, "boss", 1, 2); b.bossRef = e
end
local function wardenTick(b, dt)
  local W = CFG.WARDEN; local boss = b.bossRef
  if not boss then return end
  if boss.dead then for _, o in ipairs(b.enemies) do if o.orb then o.dead = true end end return end
  local enr = b.time > W.LIMIT * 0.75 and 1 + (b.time - W.LIMIT * 0.75) / 60 or 1
  b.wOrb -= dt
  if b.wOrb <= 0 then
    b.wOrb = W.EVERY
    local ph2 = boss.hp < boss.maxHp * 0.5
    local n = min(b.lanes, ph2 and b.lanes or max(2, b.lanes - 1)); local lanes = {}
    for i = 0, b.lanes - 1 do lanes[#lanes + 1] = i end
    lanes = shuffle(b, lanes)
    for i = 1, n do
      local o = makeEnemy(b, "imp", lanes[i], 1)
      o.orb = true; o.fuse = ph2 and W.FUSE * 0.8 or W.FUSE; o.hp = 1; o.maxHp = 1; o.atk = 0; o.atkCd = 1e9; o.range = 99; o.traits = {}; o.eres = { 0, 0, 0, 0 }
      o.def = table.clone(o.def); o.def.gold = 0; b.enemies[#b.enemies + 1] = o
    end
  end
  for _, o in ipairs(b.enemies) do
    if o.orb and not o.dead then
      o.fuse -= dt
      if o.fuse <= 0 then
        o.dead = true; b.wBoom += 1
        damagePlayer(b, boss.atk * W.BLASTM * enr, { undodgeable = true, boss = true })
        boss.hp = min(boss.maxHp, boss.hp + boss.maxHp * W.HEAL)
      end
    end
  end
end
function M.pop(b, id)   -- 클라이언트가 구슬(id)을 눌렀다
  for _, e in ipairs(b.enemies) do
    if e.id == id and e.orb and not e.dead then e.fuse = 1; e.hp = 0; b.wPop += 1; killEnemy(b, e); return true end
  end
  return false
end
local function summonAdds(b, type, count, owner)
  local n = 0
  for _ = 1, count do
    local D = defOf(b, type); local cells = spawnCells(b, D, 1, 1); if #cells == 0 then break end
    local c = wpick(b, cells, function(x) return x.w end); local e = spawnAt(b, type, c.lane, c.col)
    e.owner = owner and owner.id or 0; e.summoned = true; n += 1
  end
  return n
end

-- ---------- 피해 ----------
local function healPlayer(b, amt) if b.debuffs.wound then amt *= b.debuffs.wound.mult end; b.hp = min(b.maxHp, b.hp + amt) end
-- ---------- 사탄 · 참 효과 (코드형 줄) ----------
local function satInit(b)
  b._si = true
  local n = 0; for _, x in ipairs(b.skills) do end
  b.satEmpty = (b.slotCount or 0) - #b.skills
  local act = {}; for _, x in ipairs(b.skills) do if x.slot == "active" and x.dtype ~= "buff" and x.dtype ~= "heal" then act[#act + 1] = x end end
  local allNormal = #act > 0; for _, x in ipairs(act) do if (x.rarity or 0) ~= 0 then allNormal = false end end
  b.satNormal = allNormal
end
local function satFront(b) local best; for _, e in ipairs(b.enemies) do if not e.dead and (best == nil or e.col < best.col) then best = e end end return best end
local function satMult(b, e, sk)
  local S, C = b.stats.sat, b.stats.cm or {}; local m = 1
  if C.first and sk.idx == 0 then m *= 1 + C.first end
  if C.full and b.mana >= b.maxMana * 0.99 then m *= 1 + C.full end
  if C.start and b.time < 3 then m *= 1 + C.start end
  if C.elite and b.time < (b.cEliteT or 0) then m *= 1 + C.elite end
  if C.dodge and b.dodgeBoost2 then m *= 1 + C.dodge end
  if S.noelem and sk.elem then return 0 end
  if S.manafull then m *= b.mana >= b.maxMana * 0.99 and 1.3 or 0.9 end
  if S.first then m *= sk.idx == 0 and 1.4 or 0.9 end
  if S.empty then m *= 1 + 0.25 * (b.satEmpty or 0) end
  if S.fire and sk.dtype ~= "mag" and b.time % 8 >= 3 then m *= 1.4 end
  if S.elite and b.time < (b.sEliteT or 0) then m *= 1.25 end
  if S.lowhp then m *= b.hp <= b.maxHp * 0.4 and 2.5 or 0.4 end
  if S.normalonly and b.satNormal then m *= 2 end
  if S.start and b.time < 3 then m *= 1.6 end
  if S.ready then local all = true; for _, x in ipairs(b.skills) do if x.cdLeft > 0 then all = false end end; if all then m *= 1.5 end end
  if S.lanes then local seen, n = {}, 0; for _, x in ipairs(b.enemies) do if not x.dead and not seen[x.lane] then seen[x.lane] = true; n += 1 end end; m *= 1 + 0.05 * n end
  if S.stack and b.time < (b.hurtT2 or 0) then m *= 1 + 0.01 * (b.hurtStack or 0) end
  if S.dodgeamp and b.dodgeBoost then m *= 1.3 end
  return m
end
local function satCrit(b)
  local S = b.stats.sat; if not S.critstack then return 0 end
  if b.time > (b.csT or 0) then b.cs = 0 end
  local v = 0.1 * (b.cs or 0); b.cs = min(6, (b.cs or 0) + 1); b.csT = b.time + 5; return v
end
local function hasDot(e, k) for _, d in ipairs(e.dots) do if d.k == k then return true end end return false end
local function satOnHit(b, e, sk, dealt)
  local S, C = b.stats.sat, b.stats.cm or {}
  b.dodgeBoost = false; b.dodgeBoost2 = false
  if C.leech and hasDot(e, "poison") then local want = min(dealt * C.leech, b.lsTok); b.hp = min(b.maxHp, b.hp + want); b.lsTok -= want end
  if S.leech and (hasDot(e, "poison") or hasDot(e, "bleed")) then local want = min(dealt * 0.04, b.lsTok); b.hp = min(b.maxHp, b.hp + want); b.lsTok -= want end
  if (S.proc or S.thunder) and not b._inProc and b.time >= (b.procT or 0) then
    local act = {}; for _, x in ipairs(b.skills) do if x.slot == "active" and x.dtype ~= "buff" and x.dtype ~= "heal" and x ~= sk then act[#act + 1] = x end end
    local function roll(ch, pool) if #pool > 0 and b.rng:NextNumber() < ch then b._inProc = true; b.procT = b.time + 0.4; castSkillRaw(b, pool[b.rng:NextInteger(1, #pool)]); b._inProc = false; return true end return false end
    if not (S.proc and roll(0.08, act)) and S.thunder then roll(0.12, filter(act, function(x) return x.elem == "light" end)) end
  end
end
local function satOnKill(b, e)
  local S, C = b.stats.sat, b.stats.cm or {}
  if C.mkill then b.mana = min(b.maxMana, b.mana + b.maxMana * C.mkill) end
  if C.elite and (e.tier == "elite" or e.tier == "boss") then b.cEliteT = b.time + 5 end
  if C.goldx and b.rng:NextNumber() < C.goldx then b.gold += e.def.gold * 1.45 ^ (b.act - 1) * 4 end
  if S.elite and (e.tier == "elite" or e.tier == "boss") then b.sEliteT = b.time + 5 end
  if S.mkill then b.mana = min(b.maxMana, b.mana + b.maxMana * 0.04) end
  if S.ignheal and hasDot(e, "ignite") then b.hp = min(b.maxHp, b.hp + b.maxHp * 0.03) end
  if S.spread then
    local pd; for _, d in ipairs(e.dots) do if d.k == "poison" then pd = d; break end end
    if pd then
      local o = filter(b.enemies, function(y) return not y.dead and y ~= e end)
      table.sort(o, function(a, c) return math.abs(a.col - e.col) < math.abs(c.col - e.col) end)
      for i = 1, min(2, #o) do o[i].dots[#o[i].dots + 1] = { k = "poison", dps = pd.dps, t = max(2, pd.t) } end
    end
  end
end
local function satOnHurt(b)
  local S = b.stats.sat
  if S.stack then b.hurtStack = b.time < (b.hurtT2 or 0) and min(20, (b.hurtStack or 0) + 1) or 1; b.hurtT2 = b.time + 5 end
  if S.counter and b.rng:NextNumber() < 0.08 then local f = satFront(b); if f then applyDamage(b, f, b.stats.def * 3, { src = "counter" }) end end
end
local function satTick(b, dt)
  if not b._si then satInit(b) end
  local S = b.stats.sat
  if S.shadow then
    b.shT = (b.shT or 0) + dt
    if b.shT >= 6 then local f = satFront(b); if f then b.shT = 0; applyDamage(b, f, b.stats.atk * CFG.PHYS_BASE * 8, { src = "shadow" }) else b.shT = 5.9 end end
  end
end
local function satDefMul(b) local S = b.stats.sat; local m = 1; if S.lowdef and b.hp <= b.maxHp * 0.3 then m *= 4 end; if S.mana0 and b.mana <= 0 then m *= 3 end; return m end
local function cxHurt(b, d)
  local C = b.stats.cm; if not C then return d end
  if C.x_cap then d = min(d, b.maxHp * C.x_cap) end
  if (b.xShield or 0) > 0 then local ab = min(b.xShield, d); b.xShield -= ab; d -= ab end
  return d
end
damagePlayer = function(b, raw, opt)
  opt = opt or {}
  if b.inv > 0 then return end
  if not opt.undodgeable and b.rng:NextNumber() < b.stats.dodge then b.dodges += 1; if b.stats.sat.dodgeamp then b.dodgeBoost = true end; if b.stats.cm and b.stats.cm.dodge then b.dodgeBoost2 = true end; return end
  local dfv = b.stats.def * satDefMul(b)
  local d = raw * (1 - dfv / (dfv + 5 * (CFG.DEF_POW == 1 and raw or raw ^ CFG.DEF_POW)))
  if b.debuffs.curse then d *= 1 + b.debuffs.curse.mult end
  do local C = b.stats.cm; if C then
    if C.low50 and b.hp <= b.maxHp * 0.5 then d *= 1 - C.low50 end
    if C.reviveShield and b.time < (b.rvShieldT or 0) then d *= 1 - C.reviveShield end
  end end
  d *= max(CFG.TAKEN_FLOOR, 1 + b.stats.dmgTaken)
  if opt.boss then d *= 1 - b.stats.bossTaken end; if opt.ranged then d *= 1 - b.stats.rangedTaken end
  d = max(1, d); d = cxHurt(b, d)
  if d <= 0 then return end
  if b.stats.manaShield > 0 and b.mana > 0 then
    local keep = b.maxMana * CFG.MANA_SHIELD_KEEP; local avail = max(0, b.mana - keep)
    local ab = min(d * b.stats.manaShield, avail / CFG.MANA_SHIELD_COST); b.mana -= ab * CFG.MANA_SHIELD_COST; d -= ab
  end
  b.hp -= d; b.taken += d; satOnHurt(b)
  local C = b.stats.cm
  if C and C.x_last and not b._lg and b.hp > 0 and b.hp <= b.maxHp * 0.25 then b._lg = true; b.inv = max(b.inv or 0, 3) end
end

local function vsMult(sk, st, e)
  local sb, gb = 0, 0
  local tags = { e.tier }; if e.def.ranged then tags[2] = "ranged" end
  for _, t in ipairs(tags) do sb += (sk.bonus[t] or 0); gb += (st.add[t] or 0) end
  return (1 + sb) * (1 + gb)
end
local function statusMul(st, sk, e)
  local m = 1; local v = sk.vs
  local function has(k) for _, d in ipairs(e.dots) do if d.k == k then return true end end return false end
  if has("bleed") then m *= (1 + st.vsBleed + (v and v.bleed or 0)) * st.bleedMore end
  if has("poison") then m *= (1 + st.vsPoison + (v and v.poison or 0)) * st.poisonMore end
  if has("ignite") then m *= (1 + st.vsIgnite + (v and v.ignite or 0)) * st.igniteMore end
  if e.chill > 0 then m *= (1 + (CFG.CHILL_BASE or 0) + st.vsChill + (v and v.chill or 0)) * st.chillMore end
  if e.shock > 0 then m *= (1 + (CFG.SHOCK_BASE or 0) + st.vsShock + (v and v.shock or 0)) * st.shockMore end
  return m
end
local ELEM_IDX = { fire = 1, cold = 2, light = 3, void = 4 }

applyDamage = function(b, e, dmg, o)
  if e.dead then return 0 end
  if e.orb then return 0 end
  o = o or {}
  if e.shield then dmg *= 0.1 end
  if e.plate and not o.dot then dmg *= 1 - e.plate.red end
  if e.def and e.def.hive then local others = false; for _, x in ipairs(b.enemies) do if not x.dead and x ~= e then others = true end end; if #b.plan > 0 or others then return 0 end end
  if e.def and e.def.raid and e.raid then
    local R = e.raid
    if R.sealed then dmg *= 0.03 elseif R.limit > 0 then dmg = min(dmg, max(0, e.hp - R.limit)) end
    if R.vuln > 0 then dmg *= CFG.RAID.VULNM end
  end
  e.hp -= dmg; e.flash = 0.1; e.hurtT = 0.22; b.dealt += dmg; b.lastDealT = b.time
  if e.charge then e.charge.dealt += dmg end
  if e.reflect and o.src == "skill" then damagePlayer(b, min(dmg * e.reflect.pct, b.maxHp * 0.002), { undodgeable = true }) end
  local ls = ((o.lifesteal or 0) + b.stats.lifesteal) * (b.debuffs.wound and b.debuffs.wound.mult or 1)
  if ls > 0 and o.src == "skill" then
    local want = min(dmg * ls, b.lsTok); b.hp = min(b.maxHp, b.hp + want); b.lsTok -= want
  end
  if e.hp <= 0 then killEnemy(b, e) end
  return dmg
end

local function applyStatus(b, e, sk, dealt)
  if e.dead or not (dealt > 0) then return end
  local st = b.stats
  local qual = { bleed = sk.dtype == "phys", poison = sk.dtype == "phys", ignite = sk.elem == "fire" }
  for _, k in ipairs({ "bleed", "poison", "ignite" }) do
    local chance = (sk[k] or 0) + (qual[k] and st[k .. "Chance"] or 0)
    if chance > 0 and b.rng:NextNumber() < chance then
      local C = CFG[string.upper(k)]; local dur = C.dur * (1 + st.dotDur); local dps = (dealt * C.coef * (1 + st.dotDmg) * e.dotMul) / dur
      local list = filter(e.dots, function(d) return d.k == k end)
      local skip = false
      if #list >= C.cap then
        local w = list[1]; for _, d in ipairs(list) do if d.dps < w.dps then w = d end end
        if w.dps >= dps then w.t = max(w.t, dur); skip = true else table.remove(e.dots, table.find(e.dots, w)) end
      end
      if not skip then e.dots[#e.dots + 1] = { k = k, dps = dps, t = dur } end
    end
  end
  local sc = (sk.shock or 0) + (sk.elem == "light" and st.shockChance or 0)
  if sc > 0 and b.rng:NextNumber() < sc then e.shock = max(e.shock or 0, 4 * (1 + st.dotDur)) end
end
local function tickDots(b, e, dt)
  local sum = 0
  for _, d in ipairs(e.dots) do sum += d.dps; d.t -= dt end
  e.dots = filter(e.dots, function(d) return d.t > 0 end)
  if sum > 0 then applyDamage(b, e, sum * dt, { dot = true }); b.dmgBy.dot = (b.dmgBy.dot or 0) + sum * dt end
end

local function hitEnemy(b, e, mult, sk, o)
  o = o or {}; local st = b.stats; local mag = sk.dtype == "mag"
  local inc = 1 + st.allDmg + (mag and st.magDmg or st.physDmg)
  if sk.elem then inc += st.elemDmg + (st[sk.elem .. "Dmg"] or 0) end
  local dmg = (mag and st.mag * CFG.MAG_BASE or st.atk * CFG.PHYS_BASE) * sk.mult * mult * inc * vsMult(sk, st, e) * statusMul(st, sk, e)
  if b.buffs.cry then dmg *= 1 + b.buffs.cry.power end
  dmg *= rnd(b, 0.92, 1.08) * satMult(b, e, sk)
  -- 전직 효과: 겹침 타격 · 마나 과충전 · 취약
  local C = st.cm
  if C then
    if C.x_echo and b.rng:NextNumber() < C.x_echo then dmg *= 2 end
    if C.x_mana and b.mana >= b.maxMana * 0.8 then dmg *= 1 + C.x_mana end
    if C.x_vuln then dmg *= 1 + (e.vn or 0) * C.x_vuln; e.vn = min(10, (e.vn or 0) + 1) end
  end
  dmg *= (CFG.BAL[sk.elem or (mag and "mag" or ((sk.poison or 0) >= 0.3 and "poison" or ((sk.bleed or 0) >= 0.3 and "bleed" or "phys")))] or 1)
  if o.chain then dmg *= 1 + st.chainDmg end; if o.aoe then dmg *= 1 + st.aoeDmg end
  do
    local kd = sk.kind
    if kd == "single" then dmg *= 1 + st.singleDmg end
    if kd == "zone" or kd == "zone2" or kd == "aura" or kd == "orbit" or kd == "rain" or kd == "shuri" or kd == "hole" or kd == "trap" then dmg *= 1 + st.persistDmg end
    if kd == "summon" then dmg *= 1 + st.summonDmg end
    if sk.bonus and (sk.bonus.boss or 0) >= 0.8 and e.tier == "boss" then dmg *= 1 + st.bossSkill end
    if st.executeDmg ~= 0 and e.hp < e.maxHp * 0.3 then dmg *= 1 + st.executeDmg end
  end
  local ig = min(0.9, (mag and st.ignoreRes or st.ignoreDef) + (sk.ignoreAdd or 0))
  local X = max(0, (mag and e.rm * (1 - e.shR) or e.dm * (1 - e.shD)) * (1 - ig))
  dmg *= 1 - min(CFG.DEF_CAP, X / (X + CFG.DEF_C))
  if sk.elem then dmg *= 1 - max(-0.5, min(CFG.RES_CAP, e.eres[ELEM_IDX[sk.elem]] - st.penElem)) end
  local cc = mag and (st.magCrit ~= 0 and st.critChance + st.spellCrit or st.spellCrit) or st.critChance
  local crit = b.rng:NextNumber() < min(0.9, cc + (sk.critAdd or 0))
  if crit then dmg *= 1 + st.critDmg + satCrit(b) end
  if mag then if st.shredRes > 0 then e.shR = min(st.shredRes, e.shR + st.shredRes * 0.34) end
  elseif st.shredDef > 0 then e.shD = min(st.shredDef, e.shD + st.shredDef * 0.34) end
  local dealt = applyDamage(b, e, dmg, { crit = crit, src = "skill", lifesteal = sk.lifesteal })
  b.dmgBy[sk.id] = (b.dmgBy[sk.id] or 0) + dealt; applyStatus(b, e, sk, dealt); satOnHit(b, e, sk, dealt)
  if st.manaHit > 0 and b.time >= (b.leechT or 0) then b.mana = min(b.maxMana, b.mana + b.maxMana * st.manaHit); b.leechT = b.time + 0.1 end
  -- 전직 효과: 연쇄 방전 · 빙결 파쇄 · 소멸
  if C and dealt > 0 then
    if C.x_arc and sk.elem == "light" and b.rng:NextNumber() < C.x_arc then
      local o2 = filter(b.enemies, function(x) return not x.dead and not x.orb and x ~= e and x.lane < b.lanes end)
      if #o2 > 0 then applyDamage(b, pick(b, o2), dealt * 0.5, { src = "cx" }) end
    end
    if C.x_freeze and crit and e.chill > 0 and not e.dead and b.rng:NextNumber() < C.x_freeze then e.stun = max(e.stun or 0, 2) end
    if C.x_exec and not e.dead and e.tier == "normal" and not e.orb and not e.crystal and e.hp > 0 and e.hp < e.maxHp * C.x_exec then e.hp = 0; killEnemy(b, e) end
  end
  if st.manaOnHit then end
  return dealt
end

killEnemy = function(b, e)
  if e.dead then return end
  e.dead = true
  if hasTrait(e, "split") and not e.exploded then for _ = 1, 2 do spawnNear(b, "imp", e.lane, e.col) end end
  if e.type == "warp" then b.keys += 1 elseif e.type == "hwarp" then b.keys2 += 1 elseif e.type == "twarp" then b.keys3 += 1 elseif e.type == "swarp" then b.keys4 += 1 elseif e.type == "fwarp" then b.keys5 += 1 elseif e.type == "vwarp" then b.keys6 += 1 end
  if e.def and (e.def.titan or e.def.storm) then for _, x in ipairs(table.clone(b.enemies)) do if x ~= e and not x.dead and x.pylon then x.hp = 0; killEnemy(b, x) end end end
  if e.def and e.def.raid then for _, x in ipairs(table.clone(b.enemies)) do if x ~= e and not x.dead and x.crystal then x.hp = 0; killEnemy(b, x) end end end
  if e.def and e.def.hive then b.plan = {}; for _, x in ipairs(table.clone(b.enemies)) do if x ~= e and not x.dead then x.hp = 0; killEnemy(b, x) end end end
  b.kills += 1; if e.tier == "elite" then b.eliteKills += 1 end; if e.tier == "boss" then b.bossKills += 1 end
  b.gold += e.def.gold * (1.45 ^ (b.act - 1)) * (b.kind == "treasure" and 3 or (b.kind == "vault" and CFG.VAULT_GOLD or (b.kind == "temple" and CFG.TEMPLE.GOLD or 1))) * (1 + b.stats.goldFind) * 2 * rnd(b, 0.8, 1.3)
  if b.designated == e then b.designated = nil end
  if e.summoned and e.owner then
    for _, o in ipairs(b.enemies) do if o.id == e.owner and o.shield then o.shield.need -= 1; if o.shield.need <= 0 then o.shield = nil end end end
  end
  if e.shield then e.shield = nil end
  -- 전직 효과: 폭발 · 지속 피해 전이 · 초과 피해
  local C = b.stats.cm
  if C and not e.orb and not e.crystal then
    local function near() return filter(b.enemies, function(x) return not x.dead and not x.orb and not x.crystal and x ~= e and x.lane < b.lanes and math.abs(x.lane - e.lane) <= 1 and math.abs(x.col - e.col) <= 2 end) end
    if C.x_exp then for _, x in ipairs(near()) do applyDamage(b, x, e.maxHp * C.x_exp, { src = "cx" }) end end
    if C.x_spread and #e.dots > 0 then
      local nb = near()
      for i = 1, min(4, #nb) do local x = nb[i]
        for _, d in ipairs(e.dots) do if d.t > 0 then
          local cnt = #filter(x.dots, function(y) return y.k == d.k end)
          if cnt < CFG[string.upper(d.k)].cap then x.dots[#x.dots + 1] = { k = d.k, dps = d.dps * C.x_spread, t = d.t } end
        end end
      end
    end
    if C.x_overkill and e.hp < 0 then local o2 = near(); if #o2 > 0 then applyDamage(b, pick(b, o2), -e.hp * C.x_overkill, { src = "cx" }) end end
  end
  satOnKill(b, e)
  if b.stats.manaKill and b.stats.manaKill > 0 then b.mana = min(b.maxMana, b.mana + b.stats.manaKill) end
  if b.stats.killHeal > 0 and not b.over then b.hp = min(b.maxHp, b.hp + b.maxHp * b.stats.killHeal * (b.debuffs.wound and b.debuffs.wound.mult or 1)) end
end

-- ---------- 대상 선택 ----------
local function pickPrimary(b, sk)
  local cand = filter(b.enemies, function(e) return not e.dead and not e.orb and e.lane < b.lanes and e.col <= sk.range and e.hp > 0 end)
  if #cand == 0 then return nil end
  do local open = filter(cand, function(e) return not e.guard end); if #open > 0 then cand = open end end
  if b.designated and not b.designated.dead and contains(cand, b.designated) then return b.designated end
  local r = sk.rule
  if r == "auto" then
    local ms, best, worst = {}, -math.huge, math.huge
    for i, e in ipairs(cand) do ms[i] = vsMult(sk, b.stats, e); best = max(best, ms[i]); worst = min(worst, ms[i]) end
    if best - worst > 1e-9 then local o = {}; for i, e in ipairs(cand) do if ms[i] >= best - 1e-9 then o[#o + 1] = e end end; cand = o end
  elseif r ~= "front" then
    local f = filter(cand, function(e) if r == "boss" then return e.tier == "boss" elseif r == "elite" then return e.tier == "elite" elseif r == "normal" then return e.tier == "normal" else return e.def.ranged end end)
    if #f > 0 then cand = f end
  end
  local front = math.huge; for _, e in ipairs(cand) do front = min(front, e.col) end
  local cells, seen = {}, {}
  for _, e in ipairs(cand) do if e.col == front and not seen[e.lane] then seen[e.lane] = true; cells[#cells + 1] = e.lane end end
  local lane = pick(b, cells)
  return pick(b, filter(cand, function(e) return e.col == front and e.lane == lane end))
end

-- ---------- 스킬 시전 ----------
local KINDS = {}
KINDS.single = function(b, sk, p)
  hitEnemy(b, p, sk.hitMul or 1, sk); if sk.chill then p.chill = max(p.chill, sk.chill) end
  for hi = 1, (sk.hits or 1) - 1 do
    b.events[#b.events + 1] = { t = 0.11 * hi, fn = function() if not p.dead and p.hp > 0 then hitEnemy(b, p, sk.hitMul, sk) end end }
  end
  return true
end
KINDS.multi = function(b, sk, p)
  local c = { lane = centerLane(b, p), col = p.col }
  local hits = filter(b.enemies, function(e) if e.dead then return false end; for _, cc in ipairs(cellsOf(e)) do if cc[1] >= c.lane - 1 and cc[1] <= c.lane + 1 and cc[2] >= c.col - 1 and cc[2] <= c.col + 1 then return true end end return false end)
  for _, e in ipairs(hits) do
    local on = false; for _, cc in ipairs(cellsOf(e)) do if cc[1] == c.lane and cc[2] == c.col then on = true end end
    hitEnemy(b, e, on and 1 or sk.side, sk, { aoe = true })
  end
  return true
end
KINDS.pierce = function(b, sk, p)
  local lane = centerLane(b, p)
  local hits = filter(b.enemies, function(e) return not e.dead and (sk.all and e.lane < b.lanes or (lane >= e.lane and lane < e.lane + e.h)) and e.col <= sk.range end)
  for _, e in ipairs(hits) do hitEnemy(b, e, 1, sk) end
  if sk.adj then
    for _, e in ipairs(b.enemies) do
      if not e.dead and not contains(hits, e) and e.col <= sk.range then
        local adj = false; for _, cc in ipairs(cellsOf(e)) do if math.abs(cc[1] - lane) == 1 then adj = true end end
        if adj then hitEnemy(b, e, sk.adj, sk, { aoe = true }) end
      end
    end
  end
  return true
end
KINDS.chain = function(b, sk, p)
  local jumps = sk.jumps + b.stats.chainJumps; local seen = { [p.id] = true }
  hitEnemy(b, p, 1, sk, { chain = true })
  local cur = { lane = centerLane(b, p), col = p.col }
  for j = 1, jumps do
    local dirs = shuffle(b, { { -1, 1 }, { 1, 1 }, { 0, 1 } }); local tgt, cell
    for _, d in ipairs(dirs) do
      local l, c = cur.lane + d[1], cur.col + d[2]
      if not (l < 0 or l >= b.lanes or c > CFG.COLS) then
        local occ = filter(occupants(b, l, c), function(e) return not seen[e.id] end)
        if #occ > 0 then tgt = pick(b, occ); cell = { lane = l, col = c }; break end
      end
    end
    if not tgt then break end
    seen[tgt.id] = true; hitEnemy(b, tgt, sk.decay ^ j, sk, { chain = true }); cur = cell
  end
  return true
end
KINDS.nova = function(b, sk)
  local hits = filter(b.enemies, function(e) return not e.dead and e.lane < b.lanes and e.col <= sk.range end)
  for _, e in ipairs(hits) do hitEnemy(b, e, 1, sk, { aoe = true }); e.chill = max(e.chill, sk.chill or 0) end
  if sk.healPct then healPlayer(b, b.maxHp * sk.healPct) end
  return true
end
KINDS.zone = function(b, sk, p)
  local c = { lane = centerLane(b, p), col = p.col }
  for dc = -1, 1 do local cc = c.col + dc; if cc >= 1 and cc <= CFG.COLS then b.zones[#b.zones + 1] = { lane = c.lane, col = cc, t = sk.dur, tick = 0.15, sk = sk, mult = sk.mult } end end
  return true
end
KINDS.boomer = function(b, sk, p)
  local lane = centerLane(b, p)
  local function line() return filter(b.enemies, function(e) return not e.dead and lane >= e.lane and lane < e.lane + e.h and e.col <= sk.range end) end
  for _, e in ipairs(line()) do hitEnemy(b, e, 1, sk) end
  b.events[#b.events + 1] = { t = 0.42, fn = function() for _, e in ipairs(line()) do hitEnemy(b, e, sk.back, sk) end end }
  return true
end
KINDS.meteor = function(b, sk)
  local pool = shuffle(b, filter(b.enemies, function(e) return not e.dead and e.col <= sk.range end))
  for i = 1, min(sk.count, #pool) do
    local tgt = pool[i]
    b.events[#b.events + 1] = { t = 0.35 + (i - 1) * 0.28, fn = function()
      local c = { lane = centerLane(b, tgt), col = tgt.col }
      for _, e in ipairs(boxHits(b, c.lane, c.col, 1)) do
        local on = false; for _, cc in ipairs(cellsOf(e)) do if cc[1] == c.lane and cc[2] == c.col then on = true end end
        hitEnemy(b, e, on and 1 or sk.side, sk, { aoe = true })
      end
    end }
  end
  return true
end
KINDS.cone = function(b, sk, p)
  local lane = centerLane(b, p)
  local hits = filter(b.enemies, function(e) if e.dead or e.col < p.col or e.col > p.col + 1 then return false end; for _, cc in ipairs(cellsOf(e)) do if math.abs(cc[1] - lane) <= 1 then return true end end return false end)
  for _, e in ipairs(hits) do hitEnemy(b, e, e == p and 1 or sk.sideM, sk, { aoe = true }) end
  return true
end
KINDS.spray = function(b, sk)
  if #aliveIn(b, sk.range) == 0 then return false end
  for i = 0, sk.count - 1 do
    b.events[#b.events + 1] = { t = 0.05 + i * 0.07, fn = function()
      local c = aliveIn(b, sk.range); if #c == 0 then return end
      local e = pick(b, c); hitEnemy(b, e, 1, sk); if sk.chill then e.chill = max(e.chill, sk.chill) end
    end }
  end
  return true
end
KINDS.orbit = function(b, sk) if #aliveIn(b, 3) == 0 then return false end; b.persist[#b.persist + 1] = { kind = "orbs", t = sk.dur, tick = 0.1, every = sk.every, sk = sk }; return true end
KINDS.aura = function(b, sk) if #aliveIn(b, sk.range + 1) == 0 then return false end; b.persist[#b.persist + 1] = { kind = "blades", t = sk.dur, tick = 0.1, every = sk.every, sk = sk }; return true end
KINDS.trap = function(b, sk)
  local cand = filter(aliveIn(b, sk.range), function(e) return e.col >= 2 end); if #cand == 0 then return false end
  local best, bn = nil, -1; for _, e in ipairs(cand) do local n = #boxHits(b, e.lane, e.col, 1); if n > bn then bn = n; best = e end end
  b.persist[#b.persist + 1] = { kind = "mine", lane = best.lane, col = best.col, arm = sk.arm, t = sk.life, tick = 0.1, every = 0.1, sk = sk }; return true
end
KINDS.zone2 = function(b, sk, p)
  local c = { lane = centerLane(b, p), col = p.col }; local cells = {}
  if sk.shape == "wide" then for l = 0, b.lanes - 1 do for cc = 3, CFG.COLS do cells[#cells + 1] = { l, cc } end end
  else for dl = -1, 1 do for dc = -1, 1 do local l, cc = c.lane + dl, c.col + dc; if l >= 0 and l < b.lanes and cc >= 1 and cc <= CFG.COLS then cells[#cells + 1] = { l, cc } end end end end
  for _, cell in ipairs(cells) do b.zones[#b.zones + 1] = { lane = cell[1], col = cell[2], t = sk.dur, tick = 0.05 + b.rng:NextNumber() * 0.1, every = sk.every, sk = sk, m = sk.mult, chill = sk.chill or 0 } end
  return true
end
KINDS.rain = function(b, sk) if #aliveIn(b, sk.range) == 0 then return false end; b.persist[#b.persist + 1] = { kind = "rain", t = sk.over + 0.5, tick = 0.2, every = sk.over / sk.count, left = sk.count, sk = sk }; return true end
KINDS.summon = function(b, sk)
  if #aliveIn(b, sk.range) == 0 then return false end
  b.persist = filter(b.persist, function(p) return p.kind ~= "spirit" end)
  b.persist[#b.persist + 1] = { kind = "spirit", t = sk.dur, tick = 0.3, every = sk.every, sk = sk }; return true
end
KINDS.bounce = function(b, sk)
  if #aliveIn(b, sk.range) == 0 then return false end
  for i = 0, sk.count - 1 do
    b.events[#b.events + 1] = { t = 0.05 + i * 0.12, fn = function() local c = aliveIn(b, sk.range); if #c == 0 then return end; hitEnemy(b, pick(b, c), 1, sk) end }
  end
  return true
end
KINDS.shuri = function(b, sk, p)
  local col = max(2, p.col); b.persist = filter(b.persist, function(q) return q.kind ~= "shuri" end)
  b.persist[#b.persist + 1] = { kind = "shuri", col = col, t = sk.dur, tick = 0.1, every = sk.every, sk = sk }; return true
end
KINDS.hole = function(b, sk, p) b.persist[#b.persist + 1] = { kind = "hole", lane = centerLane(b, p), col = max(2, p.col), t = sk.dur, tick = 0.1, every = sk.every, sk = sk }; return true end
local NEEDS_PRIMARY = { single = 1, multi = 1, pierce = 1, chain = 1, zone = 1, boomer = 1, cone = 1, zone2 = 1, shuri = 1, hole = 1 }

castSkillRaw = function(b, sk)
  local K = sk.kind
  if K == "buff" then
    local any = false; for _, e in ipairs(b.enemies) do if not e.dead and e.col <= sk.range then any = true end end; if not any then return false end
    b.buffs.cry = { t = sk.dur, power = sk.power }; return true
  end
  if K == "heal" then if b.hp > b.maxHp * 0.7 then return false end; healPlayer(b, b.maxHp * sk.power); return true end
  local fn = KINDS[K]; if not fn then return false end
  local p
  if NEEDS_PRIMARY[K] then p = pickPrimary(b, sk); if not p then return false end
  elseif K == "nova" or K == "meteor" then if #filter(b.enemies, function(e) return not e.dead and e.col <= sk.range and e.lane < b.lanes end) == 0 then return false end end
  b.pAtk = 0.42
  return fn(b, sk, p)
end
local function castSkill(b, sk)
  local cost = (sk.mana or 0) * b.stats.manaCostMul; if b.mana < cost then return false end
  local ok = castSkillRaw(b, sk); if ok then b.mana -= cost end; return ok
end

local function runPersist(b, p)
  local sk = p.sk
  if p.kind == "blades" then for _, e in ipairs(filter(b.enemies, function(e) return not e.dead and e.lane < b.lanes and e.col <= sk.range end)) do hitEnemy(b, e, sk.mult, sk, { aoe = true }) end
  elseif p.kind == "orbs" then local c = aliveIn(b, 3); if #c > 0 then hitEnemy(b, pick(b, c), sk.mult, sk) end
  elseif p.kind == "rain" then
    if p.left <= 0 then return end; local c = aliveIn(b, sk.range); if #c == 0 then return end
    p.left -= 1; local e = pick(b, c); for _, o in ipairs(boxHits(b, e.lane, e.col, 1)) do hitEnemy(b, o, o == e and 1 or 0.4, sk, { aoe = true }) end
  elseif p.kind == "spirit" then local sk2 = table.clone(sk); sk2.rule = "front"; local t = pickPrimary(b, sk2); if t then hitEnemy(b, t, 1, sk) end
  elseif p.kind == "hole" then
    for _, e in ipairs(boxHits(b, p.lane, p.col, 1)) do
      hitEnemy(b, e, sk.mult, sk, { aoe = true })
      if e.tier == "normal" and not e.dead then
        if e.col > p.col and canPlace(b, e, e.lane, e.col - 1, false) then e.col -= 1
        elseif e.lane ~= p.lane then local nl = e.lane + sign(p.lane - e.lane); if canPlace(b, e, nl, e.col, false) then e.lane = nl end end
      end
    end
  elseif p.kind == "shuri" then
    local hs = filter(b.enemies, function(e) if e.dead or e.lane >= b.lanes then return false end; for _, cc in ipairs(cellsOf(e)) do if math.abs(cc[2] - p.col) <= 1 then return true end end return false end)
    for _, e in ipairs(hs) do hitEnemy(b, e, sk.mult, sk, { aoe = true }) end
  elseif p.kind == "mine" then
    if p.arm > 0 then p.arm -= p.every; return end
    local hit = false; for _, e in ipairs(b.enemies) do if not e.dead then for _, cc in ipairs(cellsOf(e)) do if cc[1] == p.lane and cc[2] == p.col then hit = true end end end end
    if hit or p.t <= p.every then
      for _, e in ipairs(boxHits(b, p.lane, p.col, 1)) do
        local on = false; for _, cc in ipairs(cellsOf(e)) do if cc[1] == p.lane and cc[2] == p.col then on = true end end
        hitEnemy(b, e, on and 1 or 0.7, sk, { aoe = true })
      end
      p.t = 0
    end
  end
end

-- ---------- 보스 능력 ----------
local function bossAbility(b, e, a)
  local d = a.d; local id = d.id
  if id == "summon" then summonAdds(b, d.type, d.count, e)
  elseif id == "heal" then e.hp = min(e.maxHp, e.hp + e.maxHp * d.pct)
  elseif id == "root" then b.debuffs.slow = { t = d.dur, mult = d.mult }
  elseif id == "freeze" then b.debuffs.freeze = { t = d.dur }
  elseif id == "curse" then b.debuffs.curse = { t = d.dur, mult = d.mult }
  elseif id == "poison" then b.debuffs.poison = { t = d.dur, dps = d.dps }
  elseif id == "wound" then b.debuffs.wound = { t = d.dur, mult = d.mult }
  elseif id == "reflect" then e.reflect = { t = d.dur, pct = d.pct }
  elseif id == "shield" then
    local n = summonAdds(b, "grunt", d.adds, e); if n >= 1 then e.shield = { t = d.dur, need = n }; for _, x in ipairs(b.enemies) do if x.summoned and x.owner == e.id and not x.dead then x.shieldAdd = true end end end
  elseif id == "plate" then e.plate = { t = d.dur, red = d.red }
  elseif id == "pylon" then
    local before = {}; for _, x in ipairs(b.enemies) do before[x] = true end
    summonAdds(b, "imp", d.count, e); for _, x in ipairs(b.enemies) do if not before[x] and not x.dead then x.pylon = true; x.maxHp = x.maxHp * 14; x.hp = x.maxHp end end
  elseif id == "chainbolt" then for i = 0, d.hits - 1 do b.events[#b.events + 1] = { t = 0.6 + i * 0.28, fn = function() damagePlayer(b, e.atk * d.mult, { boss = true }) end } end
  elseif id == "charge" then e.charge = { t = d.windup, dealt = 0, mult = d.mult, interrupt = d.interrupt }
  elseif id == "rain" then for i = 0, d.hits - 1 do b.events[#b.events + 1] = { t = 0.8 + i * 0.45, fn = function() damagePlayer(b, e.atk * d.mult, { boss = true }) end } end
  end
end
local function bossTick(b, e, dt)
  if e.def.raid then raidTick(b, e, dt) end
  if e.def.storm then local np = 0; for _, x in ipairs(b.enemies) do if x.pylon and not x.dead then np += 1 end end
    if np > 0 then local m = 0.1 * np; b.debuffs.curse = { t = 1.0, mult = max(m, (b.debuffs.curse and b.debuffs.curse.t > 0.5) and b.debuffs.curse.mult or 0) } end end
  if e.def.venom and not e.dead then local pz = false; for _, d in ipairs(e.dots) do if d.k == "poison" then pz = true end end; if not pz then e.hp = min(e.maxHp, e.hp + e.maxHp * CFG.VENOM_REGEN * dt) end end
  if e.def.hive then local others = false; for _, x in ipairs(b.enemies) do if not x.dead and x ~= e then others = true end end; e.guard = (#b.plan > 0) or others end
  if e.plate then e.plate.t -= dt; if e.plate.t <= 0 then e.plate = nil end end
  for _, a in ipairs(e.abil or {}) do
    if a.d.id == "enrage" then
      if not e.enraged and e.hp <= e.maxHp * a.d.at then e.enraged = true; e.atk *= 1.4; e.interval *= 0.7 end
    else
      a.t -= dt; if a.t <= 0 and not e.charge and (e.stun or 0) <= 0 then bossAbility(b, e, a); a.t = a.d.every end
    end
  end
  if e.shield and not (function() for _, x in ipairs(b.enemies) do if x.shieldAdd and not x.dead and x.owner == e.id then return true end end return false end)() then e.shield = nil end
  if e.shield then e.shield.t -= dt; if e.shield.t <= 0 then e.shield = nil end end
  if e.reflect then e.reflect.t -= dt; if e.reflect.t <= 0 then e.reflect = nil end end
  if e.stun and e.stun > 0 then e.stun -= dt; if e.stun <= 0 then e.stun = 0 end end
  if e.charge then
    e.charge.t -= dt
    if e.charge.dealt >= e.charge.interrupt * e.maxHp then e.charge = nil; e.stun = 2.5
    elseif e.charge.t <= 0 then damagePlayer(b, e.atk * e.charge.mult, { boss = true }); e.charge = nil end
  end
end
local function traitHit(b, e)
  if hasTrait(e, "poison") and (not b.debuffs.poison or b.debuffs.poison.t < 2) then b.debuffs.poison = { t = 4, dps = 0.009 } end
  if hasTrait(e, "chill") and (not b.debuffs.slow or b.debuffs.slow.t < 1.5) then b.debuffs.slow = { t = 3, mult = 0.7 } end
  if hasTrait(e, "curse") and (not b.debuffs.curse or b.debuffs.curse.t < 2) then b.debuffs.curse = { t = 4, mult = 0.2 } end
end

-- ---------- 생성 / 진행 ----------
function M.new(sv, node, seed)
  local st = Stats.computeStats(sv)
  local kind = node.kind or "spire"
  local EBk = isEB(kind)
  local floorLike = { spire = 1, rift = 1, trial = 1, craid = 1, warden = 1, void = 1, temple = 1, endless = 1, vault = 1, raid = 1, hell = 1 }
  local isFloor = floorLike[kind] or EBk
  local act = max(1, min(10, node.act or 10))
  local mods = node.mods or {}
  local stage = isFloor and 4 or (node.stage or CFG.STAGES)
  local scAct = (node.tier or isFloor) and 1 or act
  local riftMul
  if kind == "raid" then riftMul = floorMult(CFG.RIFT_END)
  elseif node.tier then riftMul = (kind == "void" or EBk) and bossRiftMult(node.tier) or floorMult(node.tier)
  elseif isFloor then riftMul = floorMult(CFG.RIFT_END) else riftMul = 1 end
  local sub = (kind == "spire" and node.floor) or (kind == "rift" and node.tier) or nil
  if sub and sub % 5 == 0 and sub % 20 ~= 0 then riftMul *= CFG.BOSS_FLOOR_K end
  local towerLike = kind == "spire" or kind == "craid" or kind == "warden" or node.upper
  local atkExtra = 1
  if kind == "rift" or kind == "raid" or towerLike then atkExtra = floorMult(node.tier or CFG.RIFT_END) ^ ((towerLike and CFG.SPIRE.ATKP or CFG.FLOOR_ATKP) - 1) end
  local atkUsesRift = kind == "rift" or kind == "hell" or kind == "raid" or towerLike
  local mHp, mAtk, mHaste, capPlus = 1, 1, 1, 0
  for _, m in ipairs(mods) do mHp *= (m.hp or 1); mAtk *= (m.atk or 1); mHaste *= (m.haste or 1); if m.cap then capPlus = 1 end end
  local b = {
    node = node, act = act, actDef = act, stage = stage, kind = kind, tier = node.tier or 0, mods = mods, stats = st, time = 0, over = false, win = false, enemies = {}, zones = {}, persist = {}, dmgBy = {}, events = {},
    nextId = 1, hp = st.maxHp, maxHp = st.maxHp, mana = st.maxMana, maxMana = st.maxMana, lanes = st.lanes, cap = min(CFG.STACK_MAX, st.stackCap + capPlus), spawnCd = 0.3,
    kills = 0, eliteKills = 0, bossKills = 0, gold = 0, dodges = 0, taken = 0, dealt = 0, debuffs = {}, buffs = {}, poisonCd = 8, revive = st.revive, inv = 0, haste = mHaste,
    lastDealT = 0, rng = Random.new(seed or os.time()), endless = kind == "endless", ddt = 0, keys = 0, keys2 = 0, keys3 = 0, keys4 = 0, keys5 = 0, keys6 = 0,
    va = (kind == "temple" and 10) or ((kind == "spire" or kind == "craid" or kind == "warden") and 11) or (EBk and 6) or ((kind == "rift" or kind == "trial" or kind == "endless" or kind == "void") and 7) or (min(10, act) - 1),
  }
  if kind == "temple" or kind == "spire" or kind == "craid" or kind == "warden" then b.lanes = 4 end
  b.hpM = CFG.H0 * CFG.HPX ^ (scAct - 1) * actScale(scAct) * (1 + CFG.STAGE_HP * (stage - 1)) * riftMul * mHp
  b.atkM = CFG.A0 * actScale(scAct) * (1 + CFG.STAGE_ATK * (stage - 1)) * (atkUsesRift and riftMul * atkExtra or riftMul) * mAtk
  if kind == "raid" then b.hpM *= CFG.RAID.K; b.atkM *= CFG.RAID.ATK end
  if kind == "warden" then b.hpM *= CFG.WARDEN.K; b.atkM *= CFG.WARDEN.ATK end
  b.lsRate = b.maxHp * min(CFG.LS_MAX, CFG.LS_BASE + st.lifesteal * CFG.LS_PER); b.lsTok = b.lsRate * 2
  if kind == "spire" then b.bossDef = Mon.BOSSES[((node.floor // 5) - 1 + 10) % 10 + 1]
  elseif kind == "rift" or kind == "trial" then b.bossDef = Mon.BOSSES[((node.tier // 5) - 1 + 10) % 10 + 1]
  elseif kind == "boss" then b.bossDef = Mon.BOSSES[min(10, act)]
  elseif kind == "void" then b.bossDef = BOSS_BY.void
  elseif kind == "raid" then b.bossDef = BOSS_BY.gate
  elseif kind == "vault" then b.bossDef = Mon.BOSSES[#Mon.BOSSES]
  elseif kind == "warden" then b.bossDef = Mon.BOSSES[9]
  elseif kind == "craid" then b.bossDef = Mon.BOSSES[CFG.CRAID.BOSS[node.diff + 1] % 10 + 1]
  elseif EBk then b.bossDef = Mon.EB[kind].boss end
  b.plan = planFor(b, node)
  if kind == "raid" then b.plan = {}; spawnRaid(b) end
  if kind == "warden" then b.plan = {}; spawnWarden(b) end
  b.skills = {}; b.slotCount = sv.slots or 0
  for i, l in ipairs(sv.loadout or {}) do
    if l and i <= sv.slots then
      local inst; for _, x in ipairs(sv.skills) do if x.uid == l.uid then inst = x end end
      if inst then
        local sk = M.skillOf(inst); if sk.dur and st.skillDur > 0 then sk.dur *= 1 + st.skillDur end
        sk.rule = l.rule or "front"; sk.cdLeft = (st.cm and st.cm.cdStart) and 0 or sk.cd * 0.4; sk.idx = i - 1; b.skills[#b.skills + 1] = sk
      end
    end
  end
  for _, m in ipairs(mods) do if m.slow then b.slowMod = (b.slowMod or 1) * m.slow end end
  b.maxReach = 0; for _, k in ipairs(b.skills) do if k.dtype ~= "buff" and k.dtype ~= "heal" and k.kind ~= "buff" and k.kind ~= "heal" then b.maxReach = max(b.maxReach, k.range or 0) end end
  if st.cm and st.cm.x_shield then b.xShield = b.maxHp * st.cm.x_shield end
  return b
end

function M.step(b, dt)
  if b.over then return end
  b.time += dt; satTick(b, dt); if b.warden then wardenTick(b, dt) end
  b.lsTok = min(b.lsRate * 2, b.lsTok + b.lsRate * dt)
  b.hp = min(b.maxHp, b.hp + b.maxHp * (CFG.REGEN + b.stats.regen) * (b.debuffs.wound and b.debuffs.wound.mult or 1) * dt)
  if b.inv > 0 then b.inv -= dt end
  b.mana = min(b.maxMana, b.mana + (b.maxMana * b.stats.manaRate + b.stats.manaFlatRegen) * dt)
  for _, k in ipairs({ "slow", "freeze", "curse", "poison", "wound" }) do local d = b.debuffs[k]; if d then d.t -= dt; if d.t <= 0 then b.debuffs[k] = nil end end end
  for _, m in ipairs(b.mods) do if m.poison then b.poisonCd -= dt; if b.poisonCd <= 0 then b.debuffs.poison = { t = 5, dps = 0.012 }; b.poisonCd = 14 end end end
  if b.buffs.cry then b.buffs.cry.t -= dt; if b.buffs.cry.t <= 0 then b.buffs.cry = nil end end
  if b.debuffs.poison then local x = b.maxHp * b.debuffs.poison.dps * dt; b.hp -= x; b.taken += x end
  for _, ev in ipairs(b.events) do ev.t -= dt end
  local due = filter(b.events, function(ev) return ev.t <= 0 end)
  if #due > 0 then b.events = filter(b.events, function(ev) return ev.t > 0 end); for _, ev in ipairs(due) do ev.fn() end end
  if b.endless then b.ddt += dt; if #b.plan < 10 then local w = wavePool(10, 5, b.mods); for _, t in ipairs(smoothSeq(w, 40, b.rr)) do b.plan[#b.plan + 1] = t end; b.rr = b.rr or {} end end
  if b.kind == "void" and b.bossRef and not b.bossRef.dead and #b.plan < 2 and #b.enemies < 5 then for _, t in ipairs(smoothSeq(wavePool(10, 10, b.mods), 6, b.rr)) do b.plan[#b.plan + 1] = t end; b.rr = b.rr or {} end
  b.spawnCd -= dt; if b.spawnCd <= 0 and #b.plan > 0 then trySpawn(b) end
  for _, e in ipairs(table.clone(b.enemies)) do
    if not e.dead then
      e.flash = max(0, e.flash - dt); e.hurtT = max(0, e.hurtT - dt); e.age += dt
      local sp = (e.chill > 0 and 0.5 or 1) * (e.shock > 0 and 0.75 or 1); if e.chill > 0 then e.chill -= dt end; if e.shock > 0 then e.shock -= dt end
      local d2 = dt * sp
      if e.tier == "boss" then bossTick(b, e, dt) end
      if #e.traits > 0 and hasTrait(e, "regen") then e.hp = min(e.maxHp, e.hp + e.maxHp * 0.025 * dt) end
      if (e.stun or 0) <= 0 then
        local stalled = b.time - b.lastDealT > 8 and e.col > b.maxReach
        if e.col > e.range or stalled or (e.tier == "normal" and e.col == 2 and e.range <= 2 and #occupants(b, e.lane, 1) == 0 and not e.charge) then
          e.moveCd -= d2
          if e.moveCd <= 0 then
            if canPlace(b, e, e.lane, e.col - 1, true) then e.col -= 1; e.moveCd = e.moveT; if e.tier ~= "normal" then displace(b, e) end
            elseif e.h == 1 then
              local moved = false
              for _, l in ipairs(shuffle(b, { e.lane - 1, e.lane + 1 })) do
                if canPlace(b, e, l, e.col - 1, true) then e.lane = l; e.col -= 1; if e.tier ~= "normal" then displace(b, e) end; e.moveCd = e.moveT; moved = true; break end
              end
              if not moved then e.moveCd = 0.1 end
            else e.moveCd = 0.1 end
          end
        elseif not e.charge then
          if e.atkCd == nil then e.atkCd = CFG.FIRST_ATTACK_DELAY * rnd(b, 0.8, 1.2) end
          if e.winding > 0 then
            e.winding -= d2
            if e.winding <= 0 then
              local dmg = e.atk
              if e.tier == "normal" then local n = #filter(occupants(b, e.lane, e.col), function(x) return x.tier == "normal" end); dmg *= max(1, n) ^ (CFG.STACK_EXP - 1) end
              if hasTrait(e, "explode") then dmg *= 3; e.exploded = true end
              damagePlayer(b, dmg, { boss = e.tier == "boss", ranged = e.def.ranged and true or false })
              if #e.traits > 0 then traitHit(b, e) end
              if e.exploded then killEnemy(b, e) else e.atkCd = e.interval * rnd(b, 1 - CFG.JITTER, 1 + CFG.JITTER) end
            end
          else e.atkCd -= d2; if e.atkCd <= 0 then e.winding = e.windup end end
        end
      end
    end
  end
  b.enemies = filter(b.enemies, function(e) return not e.dead end)
  for _, z in ipairs(b.zones) do
    z.t -= dt; z.tick -= dt
    if z.tick <= 0 then z.tick = z.every or 0.5; for _, e in ipairs(occupants(b, z.lane, z.col)) do hitEnemy(b, e, z.m or 0.45, z.sk, { aoe = true }); if z.chill and z.chill > 0 then e.chill = max(e.chill, z.chill) end end end
  end
  for _, p in ipairs(b.persist) do p.t -= dt; p.tick -= dt; if p.tick <= 0 and p.t > -0.2 then p.tick += p.every; runPersist(b, p) end end
  b.persist = filter(b.persist, function(p) return p.t > 0 end)
  for _, e in ipairs(b.enemies) do if #e.dots > 0 and not e.dead then tickDots(b, e, dt) end end
  b.zones = filter(b.zones, function(z) return z.t > 0 end)
  if not b.debuffs.freeze then
    local rate = (b.debuffs.slow and b.debuffs.slow.mult or 1) * (b.slowMod or 1)
    for _, sk in ipairs(b.skills) do
      sk.cdLeft = max(0, sk.cdLeft - dt * rate)
      if sk.cdLeft <= 0 and castSkill(b, sk) then sk.cdLeft = sk.cd * (1 - b.stats.cdr) end
    end
  end
  b.enemies = filter(b.enemies, function(e) return not e.dead end)
  if b.hp <= 0 and b.revive > 0 then b.revive -= 1; b.hp = b.maxHp * 0.5; b.inv = 1.5; b.rvShieldT = b.time + 3 end
  if b.hp <= 0 then b.hp = 0; b.over = true; b.win = false
  elseif #b.plan == 0 and #b.enemies == 0 and #b.events == 0 then b.over = true; b.win = true
  elseif b.endless and b.time > 1200 then b.over = true; b.win = true
  elseif not b.endless and b.time > (b.kind == "void" and 1800 or (b.kind == "raid" and CFG.RAID.LIMIT or (b.kind == "warden" and CFG.WARDEN.LIMIT or 900))) then b.over = true; b.win = false end
end

-- 허수아비 전투: 일정 시간 동안 낸 총 피해(= 길드 보스 · 전투력 측정). 보스 허수아비 1마리(체력 무한).
function M.dummyDamage(sv, seconds, seed, tier)
  local node = { act = 10, floor = 1, tier = tier or 150, tw = 1 }
  local b = M.new(sv, node, seed); b.plan = {}; b.lastDealT = 0
  local D = table.clone(Mon.BOSSES[1]); D.hp = 1e18; D.abilities = {}; D.atk = 0
  b.bossDef = D
  local e = makeEnemy(b, "boss", 1, 4); e.hp = 1e18; e.maxHp = 1e18; e.atk = 0; e.atkCd = 1e9; e.abil = {}; e.dummy = true; b.enemies[#b.enemies + 1] = e
  e.dm = Mon.ENEMY_DEF.boss[1] * 20; e.rm = Mon.ENEMY_DEF.boss[2] * 20
  local t = 0; local dt = 0.05
  while t < seconds do b.hp = b.maxHp; M.step(b, dt); t += dt end   -- 체력 회복: 피해를 받지 않는다 (순수 딜 측정)
  return b.dealt, b.dmgBy
end

function M.orbView(b)
  local out = {}
  for _, e in ipairs(b.enemies) do if e.orb and not e.dead then out[#out + 1] = { id = e.id, lane = e.lane, fuse = e.fuse } end end
  return out
end

function M.run(sv, node, seed, dt, tmax)
  local b = M.new(sv, node, seed); dt = dt or 0.05; local t = 0
  while not b.over and t < (tmax or 700) do M.step(b, dt); t += dt end
  return b
end


-- ---------- 전투 연출용 타임라인 기록 (M.recording = true 일 때만) ----------
-- 0.2초마다 스냅샷: 체력 비율, 적 위치/체력, 구간 피해 합계, 사용한 스킬. 클라이언트가 이걸 3D 무대에서 재생한다.
M.recording = false
local REC_DT, REC_MAX = 0.2, 600
local _apply, _hurt, _cast, _step, _new = applyDamage, damagePlayer, castSkillRaw, M.step, M.new
applyDamage = function(b, e, dmg, o)
  local r = _apply(b, e, dmg, o)
  if b.rec and r and r > 0 then local a = b.rec.acc; a.dmg[e.id] = (a.dmg[e.id] or 0) + r end
  return r
end
damagePlayer = function(b, raw, opt)
  local before = b.hp; local r = _hurt(b, raw, opt)
  if b.rec and b.hp < before then b.rec.acc.ph += before - b.hp end
  return r
end
castSkillRaw = function(b, sk)
  local r = _cast(b, sk)
  if b.rec and r then local c = b.rec.acc.casts; c[#c + 1] = { sk.id, sk.color or "#ffffff", sk.elem, sk.kind } end
  return r
end
function M.new(sv, node, seed)
  local b = _new(sv, node, seed)
  if M.recording then b.rec = { snaps = {}, acc = { dmg = {}, casts = {}, ph = 0 }, nextT = 0, lanes = b.lanes, cols = CFG.COLS, act = (b.kind == "temple" and 11) or ((b.kind == "spire" or b.kind == "craid" or b.kind == "warden") and 3) or ((b.kind == "rift" or b.kind == "void") and 8) or b.act or 1 } end
  return b
end
local WARP = { warp = 270, hwarp = 20, twarp = 45, swarp = 190, fwarp = 200, vwarp = 100 }
local function spriteOf(b, e)   -- 웹 render.js spriteOf 와 같은 규칙: { 시트 키, 색조 }
  if WARP[e.type] then return "eye", WARP[e.type] end
  local va = e.va or (min(10, b.act or 1) - 1)
  if e.type == "sniper" then local r0 = SPM.ROSTER[va + 1][3]; return r0[1], 330 end
  local r = SPM.ROSTER[va + 1] and SPM.ROSTER[va + 1][(SPM.ROLE_IDX[e.type] or 0) + 1] or SPM.ROSTER[1][2]
  return r[1], r[2] or 0
end
local function bossArt(D) if D.art then return D.art end for i, x in ipairs(Mon.BOSSES) do if x == D then return i - 1 end end return 0 end
local function snapshot(b)
  local R = b.rec; local ens = {}
  for _, e in ipairs(b.enemies) do
    ens[#ens + 1] = { id = e.id, n = e.def and e.def.name or "?", tier = e.tier, l = e.lane, c = e.col, w = e.w, h = e.h, hp = e.maxHp > 0 and math.max(0, e.hp / e.maxHp) or 0,
      d = R.acc.dmg[e.id], dead = e.dead or nil, hue = e.def and e.def.hue, sc = e.def and e.def.sc, ranged = e.def and e.def.ranged or nil, wind = (e.winding or 0) > 0 or nil, sp = nil }
    if e.tier == "boss" then ens[#ens].bs = bossArt(e.def); ens[#ens].bh = e.def.hue; ens[#ens].scl = e.def.sc else ens[#ens].sp, ens[#ens].hu = spriteOf(b, e) end
  end
  R.snaps[#R.snaps + 1] = { t = math.floor(b.time * 100) / 100, hp = b.hp / b.maxHp, mp = b.maxMana > 0 and b.mana / b.maxMana or 0, e = ens, ph = R.acc.ph > 0 and math.floor(R.acc.ph) or nil, c = #R.acc.casts > 0 and R.acc.casts or nil }
  R.acc = { dmg = {}, casts = {}, ph = 0 }
end
function M.step(b, dt)
  _step(b, dt)
  local R = b.rec
  if R and #R.snaps < REC_MAX and (b.time >= R.nextT or b.over) then snapshot(b); R.nextT = b.time + REC_DT end
  if R and b.over then R.win = b.win; R.total = b.time; M.lastRec = R end
end

return M
