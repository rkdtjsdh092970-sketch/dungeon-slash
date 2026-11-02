-- computeStats 이식 (JS state.js → Luau). 서버/클라이언트 공용.
-- 아직 이식하지 않은 것: 심연 각인(atlas), 길드 패시브, 장착 스킬 기반 전투력 필드(s.skl/mix/manaNeed)
local Data = script.Parent.Data
local Config = require(Data.Config)
local CFG = Config.CFG
local Items = require(Data.Items)
local Passives = require(Data.Passives).PASSIVES
local Sat = require(Data.Satan).SAT_DEFS
local Class = require(Data.Class)

local M = {}

local AFFIX_BY = {}; for _, d in ipairs(Items.AFFIXES) do AFFIX_BY[d.k] = d end
local PASS_BY = {}; for _, p in ipairs(Passives) do PASS_BY[p.id] = p end
local SAT_BY = {}; for _, d in ipairs(Sat) do SAT_BY[d[1]] = d end
local CNODE = {}   -- 전직 노드 id → {per}
for _, T in ipairs(Class.C_TREES) do for k, d in pairs(T.n) do CNODE[T.id .. "_" .. k] = d[2] end end
local CHARM_BY = {}; for _, c in ipairs(Class.CHARMS) do CHARM_BY[c.id] = c end
local BASIC_BY = {}; for _, b in ipairs(Class.CHARM_BASIC) do BASIC_BY[b[1]] = b end
local CHARM_SP = { blood = 2, mana = 1, gold = 2, luck = 2, stone = 1, phoenix = 1, swift = 2, breaker = 2, focus = 1, bulwark = 2, shadow = 2, swarm = 2, hunter = 2, tidy = 1, horn = 2, fang = 2 }   -- 특수 줄 번호 (Luau는 1부터)

local function newStats(sv)
  local lm = 1 + CFG.LEVEL_STEP * (sv.level - 1)
  local s = {
    lm = lm, wAtk = 0, wMag = 0, atkFlat = CFG.BASE_ATK, magFlat = CFG.BASE_ATK, hpFlat = CFG.BASE_HP, def = 0, atkPct = 0, magPct = 0, hpPct = 0,
    dodge = CFG.BASE_DODGE, cdr = 0, critChance = CFG.BASE_CRIT, critDmg = CFG.BASE_CRITDMG,
    add = { boss = 0, elite = 0, ranged = 0, normal = 0 }, lifesteal = 0, goldFind = 0, chainJumps = 0, chainDmg = 0, aoeDmg = 0, allDmg = 0, density = 0, laneBonus = 0,
    defPct = 0, hpMore = 1, atkMore = 1, magMore = 1, defMore = 1, dmgTaken = 0, regen = 0, revive = 0, dodgeCap = 0.5, cdrCap = 0.5, noDodge = 0, mf = 0, expFind = 0,
    physDmg = 0, magDmg = 0, elemDmg = 0, fireDmg = 0, coldDmg = 0, lightDmg = 0, voidDmg = 0, ignoreDef = 0, ignoreRes = 0, shredDef = 0, shredRes = 0, penElem = 0,
    spellCrit = 0, magCrit = 0, manaFlat = 0, manaPct = 0, manaRegen = 0, manaCostRed = 0, manaToSpell = 0, manaShield = 0,
    manaRegenFlat = 0, manaOnKill = 0, manaHit = 0, dmgPerMana = 0, bleedChance = 0, poisonChance = 0, igniteChance = 0, dotDmg = 0, dotDur = 0,
    vsBleed = 0, vsPoison = 0, vsIgnite = 0, vsChill = 0, vsShock = 0, bleedMore = 1, poisonMore = 1, igniteMore = 1, chillMore = 1, shockMore = 1, shockChance = 0,
    singleDmg = 0, persistDmg = 0, summonDmg = 0, bossSkill = 0, skillDur = 0, executeDmg = 0, killHeal = 0, bossTaken = 0, rangedTaken = 0, manaToHp = 0, noCrit = 0, noLife = 0,
    sat = {}, cm = {},
  }
  return s
end

local function applier(s)
  return function(k, v)
    if string.sub(k, 1, 3) == "cm:" then local n = string.sub(k, 4); s.cm[n] = (s.cm[n] or 0) + v; return end
    if k == "atkFlat" then s.atkFlat += v
    elseif k == "hpFlat" then s.hpFlat += v
    elseif k == "defFlat" then s.def += v
    elseif k == "boss" or k == "elite" or k == "ranged" or k == "normal" then s.add[k] += v
    elseif k == "lanes" then s.laneBonus += v
    elseif k == "hpMore" or k == "atkMore" or k == "magMore" or k == "defMore" or k == "bleedMore" or k == "poisonMore" or k == "igniteMore" or k == "chillMore" or k == "shockMore" then s[k] *= v
    elseif k == "dodgeCap" or k == "cdrCap" then s[k] = math.max(s[k], v)
    elseif k == "magCrit" or k == "noDodge" then s[k] = 1
    elseif type(s[k]) == "number" then s[k] += v end
  end
end

local function charmRowVal(R, ei)
  local base = R.eff[ei][2]
  if R.fmt == "f" then return base end
  local v = base * R.r
  if R.fmt == "n" then return math.floor(v + 0.5) end
  return v
end

local function charmRows(it)
  if it.sp and CHARM_BY[it.sp] then
    local C = CHARM_BY[it.sp]; local L = C.L[CHARM_SP[it.sp]]
    local rows = { { eff = L[2], fmt = L[3], r = it.r } }
    for _, x in ipairs(it.b or {}) do local B = BASIC_BY[x.k]; if B then rows[#rows + 1] = { eff = { { B[1], B[3] } }, fmt = "p", r = x.r } end end
    return rows
  end
  local C = CHARM_BY[it.charm]; local rows = {}
  if C then for li, L in ipairs(C.L) do rows[#rows + 1] = { eff = L[2], fmt = L[3], r = it.rl and it.rl[li] or 1 } end end
  return rows
end

function M.computeStats(sv)
  local ml = 1 + CFG.MANA_LV * (sv.level - 1)
  local s = newStats(sv); local lm = s.lm
  local apply = applier(s)
  local ilvlSum, ilvlCnt = 0, 0
  for _, slot in ipairs(Items.EQ_SLOTS) do
    local it = sv.equipped[slot]
    if it then
      ilvlSum += it.ilvl; ilvlCnt += 1
      local enh = it.enh or 0
      local ef, pf = 1 + 0.08 * enh, 1 + 0.04 * enh
      local base = it.base or {}
      if slot == "weapon" then s.wAtk += (base.atk or 0) * ef; s.wMag += (base.mag or 0) * ef
      else if base.atk then s.atkFlat += base.atk * ef end; if base.mag then s.magFlat += base.mag * ef end end
      if base.hp then s.hpFlat += base.hp * ef end; if base.def then s.def += base.def * ef end
      if it.sat and SAT_BY[it.sat] then
        for _, fx in ipairs(SAT_BY[it.sat][5]) do
          local k, v = fx[1], fx[2]
          if string.sub(k, 1, 2) == "f:" then s.sat[string.sub(k, 3)] = v
          elseif k == "manaRegenPct" then apply("manaRegen", v * CFG.MANA_REGEN)
          elseif k == "regenPct" then apply("regen", v * CFG.REGEN)
          elseif k == "dpm" then apply("dmgPerMana", v / CFG.DPM_K)
          else apply(k, v) end
        end
      end
      for _, a in ipairs(it.affixes or {}) do
        local d = AFFIX_BY[a.k]
        if d then
          if slot == "weapon" and (a.k == "atkFlat" or a.k == "magFlat") then
            local t = a.k == "atkFlat" and "wAtk" or "wMag"; s[t] += a.v * ef * CFG.WFLAT
          else apply(a.k, d.flat and a.v * ef or (d.pct and a.v * pf or a.v)) end
        end
      end
      for _, m in ipairs(it.sock or {}) do
        if m then
          if slot == "weapon" and (m.k == "atkFlat" or m.k == "magFlat") then
            local t = m.k == "atkFlat" and "wAtk" or "wMag"; s[t] += m.v * CFG.WFLAT
          else apply(m.k, m.v) end
        end
      end
    end
  end
  for id, lvl in pairs(sv.pass or {}) do
    local p = PASS_BY[id]; if p then for k, v in pairs(p.per) do apply(k, v * lvl) end end
  end
  if sv.cls and sv.cls >= 3 then
    for _, it in ipairs(sv.charms or {}) do
      if it then for _, R in ipairs(charmRows(it)) do for ei, e in ipairs(R.eff) do apply(e[1], charmRowVal(R, ei)) end end end
    end
  end
  for id, on in pairs(sv.cpass or {}) do
    local per = CNODE[id]; if per and on then for k, v in pairs(per) do apply(k, v) end end
  end
  if sv.guildLv then
    for _, gp in ipairs(Config.GUILD_PASSIVES) do if sv.guildLv >= gp.lv then for k, v in pairs(gp.per) do apply(k, v) end end end
  end
  s.maxMana = math.max(10, (CFG.BASE_MANA + s.manaFlat) * (1 + s.manaPct) * ml)
  s.allDmg += s.dmgPerMana * s.maxMana / 100 * CFG.DPM_K; s.manaFlatRegen = s.manaRegenFlat * ml; s.manaKill = s.manaOnKill * ml
  s.manaRate = CFG.MANA_REGEN + s.manaRegen; s.manaCostMul = ml * (1 - math.min(0.6, s.manaCostRed)); s.manaShield = math.min(0.8, s.manaShield)
  s.atk = (s.wAtk * (1 + s.atkPct) + s.atkFlat) * lm * s.atkMore
  s.mag = ((s.wMag * lm + s.manaToSpell * s.maxMana) * (1 + s.magPct) + s.magFlat * lm) * s.magMore
  s.maxHp = math.max(10, (s.hpFlat + s.manaToHp * s.maxMana) * (1 + math.max(-0.9, s.hpPct)) * lm * s.hpMore); s.def = s.def * lm * (1 + s.defPct) * s.defMore
  s.dodge = s.noDodge ~= 0 and 0 or math.max(0, math.min(s.dodgeCap, s.dodge)); s.cdr = math.min(s.cdrCap, s.cdr)
  s.critChance = math.min(0.8, s.critChance); s.spellCrit = math.min(0.8, s.spellCrit)
  s.ignoreDef = math.min(0.8, s.ignoreDef); s.ignoreRes = math.min(0.8, s.ignoreRes); s.shredDef = math.min(0.5, s.shredDef); s.shredRes = math.min(0.5, s.shredRes)
  s.bossTaken = math.min(0.6, s.bossTaken); s.rangedTaken = math.min(0.6, s.rangedTaken); s.killHeal = math.min(0.02, s.killHeal)
  if s.sat.dodgedef then s.def *= 1 + s.dodge * 0.5 end
  if s.noCrit ~= 0 then s.critChance = 0; s.spellCrit = 0 end
  if s.noLife ~= 0 then s.lifesteal = 0 end
  s.stackCap = math.min(CFG.STACK_MAX, CFG.STACK_BASE + s.density)
  s.lanes = math.min(CFG.MAX_LANES, (sv.lanesBase or 3) + s.laneBonus)
  s.avgIlvl = ilvlCnt > 0 and ilvlSum / ilvlCnt or 1
  if sv.atlas then s.add.boss += (sv.atlas.conq or 0) * 0.02; s.dmgTaken -= (sv.atlas.guard or 0) * 0.01 end   -- 심연 각인
  return s
end

return M
