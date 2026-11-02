-- 전투력 (웹 state.js powerDetail / playerPower 이식): 장착한 스킬을 하나씩 계산한 초당 피해 × 버티는 힘.
-- 눈금(M.K)은 시뮬레이션(탑 등반 층 · 보스 처치)으로 맞춘다 — roblox/sim/ 참고. "뻥투력"이 되지 않게 실측 기준.
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local Items = require(Data.Items)
local ACT_ELEM = require(Data.Monsters).ACT_ELEM
local SKILL_TM = require(Data.SkillTM)
local Stats = require(script.Parent.Stats)
local Battle = require(script.Parent.Battle)
local M = {}
M.K = 0.25        -- 전투력 눈금 (웹 POWER_K, 시뮬레이션 보정 후 갱신)
M.RAW = 6         -- 방어 효과 계산용 "실제로 맞는 평균 한 방" 배율 (웹 POWER_RAW)
local AOE = { multi = 1, nova = 1, meteor = 1, cone = 1, zone = 1, trap = 1, zone2 = 1, rain = 1, aura = 1, hole = 1 }
local SQ = { orbit = 1, aura = 1, zone2 = 1, hole = 1 }
local PERSIST = { zone = 1, zone2 = 1, hole = 1, aura = 1, orbit = 1, rain = 1, trap = 1, shuri = 1 }
local function clamp(x, a, b) return math.max(a, math.min(b, x)) end
local function actScale(a) a = math.max(1, math.min(10, math.floor(a + 0.5))); return (CFG.EASE[a] or 1) * CFG.G ^ (math.min(a, 10) - 1) * (1 + CFG.LEVEL_STEP * (10 * math.min(a, 10) - 5)) / (1 + CFG.LEVEL_STEP * 5) end

-- 스킬 1회 시전의 기본 피해 배율 합 (대상 수 포함). 측정표(SKILL_TM)가 있으면 그것을 쓴다
local function castMult(k, s)
  if SKILL_TM[k.id] then
    local r = (k.def and k.def.mult or k.mult) > 0 and k.mult / (k.def and k.def.mult or k.mult) or 1
    return SKILL_TM[k.id] * r ^ (SQ[k.kind] and 2 or 1) * (k.kind == "chain" and 1 + 0.12 * s.chainJumps or 1) * (AOE[k.kind] and 1 + s.aoeDmg or 1)
  end
  local m, side = k.mult, k.side or 1
  if k.kind == "single" then return m
  elseif k.kind == "multi" then return m * (1 + side * 2) * (1 + s.aoeDmg)
  elseif k.kind == "pierce" then return m * (k.all and 4.5 or (k.adj and 2.6 + 3 * k.adj or 2.6))
  elseif k.kind == "bounce" then return m * (k.count or 1)
  elseif k.kind == "chain" then local t = 1; for j = 1, (k.jumps or 0) + s.chainJumps do t += (k.decay or 0.7) ^ j end; return m * t * (1 + s.chainDmg)
  elseif k.kind == "nova" then return m * 5.5 * (1 + s.aoeDmg)
  elseif k.kind == "meteor" then return m * (k.count or 1) * (1 + side * 3) * (1 + s.aoeDmg)
  end
  return m
end
local function kindMul(k, s)
  local m = 1
  if k.kind == "single" then m *= 1 + s.singleDmg end
  if PERSIST[k.kind] then m *= 1 + s.persistDmg end
  if k.kind == "summon" then m *= 1 + s.summonDmg end
  if k.bonus and (k.bonus.boss or 0) >= 0.8 then m *= 1 + s.bossSkill * 0.5 end
  return m
end
local function baseCast(k, s, act, sc)
  local mag = k.dtype == "mag"
  local base = mag and s.mag * CFG.MAG_BASE or s.atk * CFG.PHYS_BASE
  local inc = 1 + s.allDmg + (mag and s.magDmg or s.physDmg); if k.elem then inc += s.elemDmg + (s[k.elem .. "Dmg"] or 0) end
  local ig = math.min(0.9, (mag and s.ignoreRes or s.ignoreDef) + (k.ignoreAdd or 0)); local sh = (mag and s.shredRes or s.shredDef) * 0.7
  local X = 1.1 * sc * (1 - ig) * (1 - sh); local red = 1 - math.min(CFG.DEF_CAP, X / (X + CFG.DEF_C))
  local er = 1
  if k.elem then local ei = table.find(Items.ELEMS, k.elem); er = 1 - clamp((ACT_ELEM[act] or ACT_ELEM[1])[ei] - s.penElem, -0.5, CFG.RES_CAP) end
  local cc = math.min(0.9, (mag and (s.magCrit ~= 0 and s.critChance + s.spellCrit or s.spellCrit) or s.critChance) + (k.critAdd or 0))
  local bsum = s.add.boss + s.add.elite + s.add.ranged + s.add.normal; for _, v in pairs(k.bonus or {}) do bsum += v end
  return base * inc * red * er * (1 + cc * s.critDmg) * (1 + 0.15 * bsum) * kindMul(k, s)
end
function M.baseCast(k, s) local act = math.max(1, math.min(10, math.floor(s.avgIlvl + 0.5))); return baseCast(k, s, act, 1 + CFG.DEF_ACT * (act - 1)) end   -- 측정(sim)용
M.castMult = castMult
local function statusPow(s)
  local function up(c) return math.min(0.85, (c or 0) * 1.2) end
  local f = 1
  for _, t in ipairs({ { s.bleedChance, s.vsBleed, s.bleedMore }, { s.poisonChance, s.vsPoison, s.poisonMore }, { s.igniteChance, s.vsIgnite, s.igniteMore }, { s.shockChance, s.vsShock, s.shockMore }, { (s.coldDmg or 0) > 0.3 and 0.5 or 0, s.vsChill, s.chillMore } }) do
    f *= 1 + up(t[1]) * ((1 + (t[2] or 0)) * (t[3] or 1) - 1)
  end
  return f
end
-- 장착 스킬 (Battle.skillOf: 등급 · 레벨 · 룬 반영)
local function equippedSkills(sv)
  local out = {}
  for _, l in ipairs(sv.loadout or {}) do
    if l then for _, inst in ipairs(sv.skills or {}) do if inst.uid == l.uid then out[#out + 1] = Battle.skillOf(inst); break end end end
  end
  return out
end
function M.detail(s, skl)
  local act = math.max(1, math.min(10, math.floor(s.avgIlvl + 0.5))); local sc = 1 + CFG.DEF_ACT * (act - 1)
  local refAtk = M.RAW * 6 * CFG.A0 * actScale(math.max(1, s.avgIlvl)); local mit = 1 + s.def / (5 * refAtk)
  local out = { skills = {}, dps = 0, manaFactor = 1, buff = 1 }
  local demand, buffMul = 0, 1
  local cdMul = 1 - s.cdr
  local rows = {}
  for _, k in ipairs(skl) do
    local cd = math.max(0.2, (k.cd or 1) * cdMul); local cost = (k.mana or 0) * s.manaCostMul / cd
    if k.dtype == "buff" then buffMul *= 1 + (k.power or 0) * math.min(1, (k.dur or 0) / cd); demand += cost
    elseif k.dtype == "heal" then demand += cost
    else
      local mag = k.dtype == "mag"
      local cast = castMult(k, s) * baseCast(k, s, act, sc)
      local dot = 0
      for _, st in ipairs({ "bleed", "poison", "ignite" }) do
        local q = (st == "ignite") and k.elem == "fire" or (st ~= "ignite" and not mag)
        local ch = math.min(1, (k[st] or 0) + (q and (s[st .. "Chance"] or 0) or 0))
        if ch > 0 then local C = CFG[string.upper(st)]; dot += ch * (C and C.coef or 0) * (1 + (s.dotDmg or 0)) * (1 + 0.3 * (s.dotDur or 0)) * 0.85 end
      end
      cast *= 1 + dot
      demand += cost
      rows[#rows + 1] = { k = k, dps = cast / cd, paid = cost > 0 }
    end
  end
  local supply = s.maxMana * s.manaRate + (s.manaFlatRegen or 0) + (s.manaKill or 0) * 1.2 + s.maxMana / 25 + s.maxMana * (s.manaHit or 0) * 5
  local mf = demand > 0 and math.min(1, supply / demand) or 1; out.manaFactor = mf
  for _, r in ipairs(rows) do local e = r.dps * (r.paid and mf or 1); out.dps += e; out.skills[#out.skills + 1] = { id = r.k.id, dps = e } end
  out.dps *= buffMul; out.buff = buffMul
  local f = s.manaShield or 0
  local mshield = f > 0 and math.min(s.maxMana * (1 - CFG.MANA_SHIELD_KEEP) / CFG.MANA_SHIELD_COST, s.maxHp * f / (1 - f)) or 0
  out.ehp = (s.maxHp * (1 + 20 * (s.regen or 0)) + mshield) * mit * (1 / math.max(CFG.TAKEN_FLOOR, 1 + s.dmgTaken)) / (1 - s.dodge)
  return out
end
function M.of(sv)
  local s = Stats.computeStats(sv)
  local d = M.detail(s, equippedSkills(sv))
  return M.K * d.dps * d.ehp * statusPow(s) * (1 + 0.35 * (s.revive or 0)) * (1 + s.laneBonus * 0.05) * (1 + 0.04 * (s.density or 0)) * (1 + s.lifesteal * 2), d, s
end
return M
