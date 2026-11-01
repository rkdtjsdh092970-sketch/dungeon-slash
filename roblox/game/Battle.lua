-- 전투 엔진 (JS battle.js / battle2.js 이식, 서버용). 화면 연출(fx · 텍스트)은 이식하지 않는다.
-- 이식 범위(v1): 탑 층 전투(일반 몬스터 · 특수 몹 · 정예 · 보스 능력) + 스킬 종류 대부분 + 전직 효과(cx) + 지속 피해.
-- 아직: 사탄 효과(sat*), 열쇠 몹(warp), 레이드/문지기/속성 보스 전용 기믹.
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local SK = require(Data.Skills)
local Mon = require(Data.Monsters)
local Stats = require(script.Parent.Stats)

local M = {}
local floor, max, min, sqrt, pow = math.floor, math.max, math.min, math.sqrt, math.pow or function(a, b) return a ^ b end

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
local function smoothSeq(w, n, st)
  local keys, W = {}, 0
  for _, k in ipairs(KEYS_ORDER) do if (w[k] or 0) > 0 then keys[#keys + 1] = k; W += w[k] end end
  st = st or {}; local out = {}
  for _ = 1, n do
    local best
    for _, k in ipairs(keys) do st[k] = (st[k] or 0) + w[k] / W; if best == nil or st[k] > st[best] then best = k end end
    st[best] -= 1; out[#out + 1] = best
  end
  return out
end
local function wavePool(act, stage)
  local t = (act - 1) / 9
  return { imp = 60 - 40 * t, grunt = 40 - 10 * t, archer = 30 * t + (act >= 2 and 8 or 0), mage = act >= 3 and 8 + 22 * t or 0, spec = stage >= 2 and 11 + act or 0 }
end
local function insertAt(plan, idx0, v) table.insert(plan, max(1, min(#plan + 1, idx0 + 1)), v) end
local function planFor(b, node)
  local w = wavePool(10, 10)
  local t = node.tier
  local nNormal = min(110, floor(34 + 0.8 * t + 0.5)); local elites = 2 + min(12, floor(t / 7)); local boss = node.floor % 5 == 0
  local plan = smoothSeq(w, nNormal)
  if t >= 50 then
    local ns = min(8, 2 + floor((t - 50) / 12))
    for i = 0, ns - 1 do insertAt(plan, floor(#plan * (0.1 + 0.85 * (i + 0.5) / ns)), "sniper") end
  end
  for i = 0, elites - 1 do insertAt(plan, floor(#plan * (0.15 + 0.8 * (i + 0.5) / elites)), "brute") end
  if boss then insertAt(plan, floor(#plan * 0.65), "boss") end
  return plan
end

local function specDef(va)
  local s = table.clone(Mon.ACT_SPECIAL[va + 1]); s.tier = "normal"; s.ranged = s.range >= 3; s.proj = va == 7 and "orb" or nil; return s
end
local function defOf(b, type)
  if type == "boss" then return b.bossDef end
  if type == "spec" then return specDef(min(b.va, 9)) end
  return Mon.ENEMIES[type]
end
local function hasTrait(e, t) for _, x in ipairs(e.traits) do if x == t then return true end end return false end

local function makeEnemy(b, type, lane, col)
  local isBoss = type == "boss"; local D = defOf(b, type)
  local bx = isBoss and CFG.BOSSX or 1
  local e = {
    id = b.nextId, type = type, def = D, tier = isBoss and "boss" or (D.tier or "normal"), w = isBoss and D.w or 1, h = isBoss and D.h or 1, lane = lane, col = col,
    traits = D.traits or {}, hp = D.hp * b.hpM * bx, maxHp = D.hp * b.hpM * bx, atk = D.atk * b.atkM, range = D.range, interval = D.interval / b.haste, windup = D.windup,
    moveCd = CFG.MOVE_TIME, winding = 0, flash = 0, hurtT = 0, chill = 0, shock = 0, age = 0, dead = false, stun = 0, dots = {},
  }
  b.nextId += 1
  e.moveT = CFG.MOVE_TIME * (hasTrait(e, "fast") and 0.55 or 1); e.moveCd = e.moveT
  e.dotMul = isBoss and CFG.DOT_BOSS or (e.tier == "elite" and CFG.DOT_ELITE or 1)
  local dd = table.clone(isBoss and Mon.ENEMY_DEF.boss or Mon.ENEMY_DEF[type] or Mon.ENEMY_DEF.grunt)
  for _, t in ipairs(e.traits) do local T = Mon.TRAIT_DEF[t]; if T then dd[1] += T[1]; dd[2] += T[2] end end
  local sc = (1 + CFG.DEF_ACT * (min(10, b.act) - 1)) * (1 + CFG.DEF_TIER * (b.tier or 0))
  e.dm = max(0, dd[1] * sc); e.rm = max(0, dd[2] * sc); e.shD = 0; e.shR = 0
  e.eres = { 0.1, 0.1, 0.1, 0.1 }   -- 붉은 탑 몬스터는 속성 저항이 모두 같다
  if isBoss then
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
local killEnemy
local function cxHurt(b, d)
  local C = b.stats.cm; if not C then return d end
  if C.x_cap then d = min(d, b.maxHp * C.x_cap) end
  if (b.xShield or 0) > 0 then local ab = min(b.xShield, d); b.xShield -= ab; d -= ab end
  return d
end
local function damagePlayer(b, raw, opt)
  opt = opt or {}
  if b.inv > 0 then return end
  if not opt.undodgeable and b.rng:NextNumber() < b.stats.dodge then b.dodges += 1; return end
  local dfv = b.stats.def
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
  b.hp -= d; b.taken += d
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

local function applyDamage(b, e, dmg, o)
  if e.dead then return 0 end
  if e.orb then return 0 end
  o = o or {}
  if e.shield then dmg *= 0.1 end
  if e.plate and not o.dot then dmg *= 1 - e.plate.red end
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
  dmg *= rnd(b, 0.92, 1.08)
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
  if crit then dmg *= 1 + st.critDmg end
  if mag then if st.shredRes > 0 then e.shR = min(st.shredRes, e.shR + st.shredRes * 0.34) end
  elseif st.shredDef > 0 then e.shD = min(st.shredDef, e.shD + st.shredDef * 0.34) end
  local dealt = applyDamage(b, e, dmg, { crit = crit, src = "skill", lifesteal = sk.lifesteal })
  b.dmgBy[sk.id] = (b.dmgBy[sk.id] or 0) + dealt; applyStatus(b, e, sk, dealt)
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
  if e.def and e.def.hive then b.plan = {}; for _, x in ipairs(table.clone(b.enemies)) do if x ~= e and not x.dead then x.hp = 0; killEnemy(b, x) end end end
  b.kills += 1; if e.tier == "elite" then b.eliteKills += 1 end; if e.tier == "boss" then b.bossKills += 1 end
  b.gold += e.def.gold * (1.45 ^ (b.act - 1)) * (1 + b.stats.goldFind) * 2
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

local function castSkillRaw(b, sk)
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
  elseif id == "chainbolt" then for i = 0, d.hits - 1 do b.events[#b.events + 1] = { t = 0.6 + i * 0.28, fn = function() damagePlayer(b, e.atk * d.mult, { boss = true }) end } end
  elseif id == "charge" then e.charge = { t = d.windup, dealt = 0, mult = d.mult, interrupt = d.interrupt }
  elseif id == "rain" then for i = 0, d.hits - 1 do b.events[#b.events + 1] = { t = 0.8 + i * 0.45, fn = function() damagePlayer(b, e.atk * d.mult, { boss = true }) end } end
  end
end
local function bossTick(b, e, dt)
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
  local act = max(1, min(10, node.act or 10))
  local riftMul = floorMult(node.tier)
  if node.floor % 5 == 0 and node.floor % 20 ~= 0 and node.tw ~= 2 then riftMul *= CFG.BOSS_FLOOR_K end
  local atkExtra = floorMult(node.tier) ^ (CFG.SPIRE.ATKP - 1)
  local b = {
    node = node, act = act, stage = 4, kind = "spire", tier = node.tier, stats = st, time = 0, over = false, win = false, enemies = {}, zones = {}, persist = {}, dmgBy = {}, events = {},
    nextId = 1, hp = st.maxHp, maxHp = st.maxHp, mana = st.maxMana, maxMana = st.maxMana, lanes = 4, cap = min(CFG.STACK_MAX, st.stackCap), spawnCd = 0.3,
    kills = 0, eliteKills = 0, bossKills = 0, gold = 0, dodges = 0, taken = 0, dealt = 0, debuffs = {}, buffs = {}, poisonCd = 8, revive = st.revive, inv = 0, haste = 1,
    lastDealT = 0, rng = Random.new(seed or os.time()), va = 11,
  }
  b.hpM = CFG.H0 * actScale(1) * (1 + CFG.STAGE_HP * 3) * riftMul
  b.atkM = CFG.A0 * actScale(1) * (1 + CFG.STAGE_ATK * 3) * riftMul * atkExtra
  b.lsRate = b.maxHp * min(CFG.LS_MAX, CFG.LS_BASE + st.lifesteal * CFG.LS_PER); b.lsTok = b.lsRate * 2
  b.bossDef = Mon.BOSSES[((node.floor // 5) - 1 + 10) % 10 + 1]
  b.plan = planFor(b, node)
  b.skills = {}
  for i, l in ipairs(sv.loadout or {}) do
    if l and i <= sv.slots then
      local inst; for _, x in ipairs(sv.skills) do if x.uid == l.uid then inst = x end end
      if inst then
        local sk = M.skillOf(inst); if sk.dur and st.skillDur > 0 then sk.dur *= 1 + st.skillDur end
        sk.rule = l.rule or "front"; sk.cdLeft = (st.cm and st.cm.cdStart) and 0 or sk.cd * 0.4; sk.idx = i - 1; b.skills[#b.skills + 1] = sk
      end
    end
  end
  b.maxReach = 0; for _, k in ipairs(b.skills) do if k.dtype ~= "buff" and k.dtype ~= "heal" and k.kind ~= "buff" and k.kind ~= "heal" then b.maxReach = max(b.maxReach, k.range or 0) end end
  if st.cm and st.cm.x_shield then b.xShield = b.maxHp * st.cm.x_shield end
  return b
end

function M.step(b, dt)
  if b.over then return end
  b.time += dt
  b.lsTok = min(b.lsRate * 2, b.lsTok + b.lsRate * dt)
  b.hp = min(b.maxHp, b.hp + b.maxHp * (CFG.REGEN + b.stats.regen) * (b.debuffs.wound and b.debuffs.wound.mult or 1) * dt)
  if b.inv > 0 then b.inv -= dt end
  b.mana = min(b.maxMana, b.mana + (b.maxMana * b.stats.manaRate + b.stats.manaFlatRegen) * dt)
  for _, k in ipairs({ "slow", "freeze", "curse", "poison", "wound" }) do local d = b.debuffs[k]; if d then d.t -= dt; if d.t <= 0 then b.debuffs[k] = nil end end end
  if b.buffs.cry then b.buffs.cry.t -= dt; if b.buffs.cry.t <= 0 then b.buffs.cry = nil end end
  if b.debuffs.poison then local x = b.maxHp * b.debuffs.poison.dps * dt; b.hp -= x; b.taken += x end
  for _, ev in ipairs(b.events) do ev.t -= dt end
  local due = filter(b.events, function(ev) return ev.t <= 0 end)
  if #due > 0 then b.events = filter(b.events, function(ev) return ev.t > 0 end); for _, ev in ipairs(due) do ev.fn() end end
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
    local rate = (b.debuffs.slow and b.debuffs.slow.mult or 1)
    for _, sk in ipairs(b.skills) do
      sk.cdLeft = max(0, sk.cdLeft - dt * rate)
      if sk.cdLeft <= 0 and castSkill(b, sk) then sk.cdLeft = sk.cd * (1 - b.stats.cdr) end
    end
  end
  b.enemies = filter(b.enemies, function(e) return not e.dead end)
  if b.hp <= 0 and b.revive > 0 then b.revive -= 1; b.hp = b.maxHp * 0.5; b.inv = 1.5; b.rvShieldT = b.time + 3 end
  if b.hp <= 0 then b.hp = 0; b.over = true; b.win = false
  elseif #b.plan == 0 and #b.enemies == 0 and #b.events == 0 then b.over = true; b.win = true
  elseif b.time > 900 then b.over = true; b.win = false end
end

function M.run(sv, node, seed, dt, tmax)
  local b = M.new(sv, node, seed); dt = dt or 0.05; local t = 0
  while not b.over and t < (tmax or 700) do M.step(b, dt); t += dt end
  return b
end

return M
