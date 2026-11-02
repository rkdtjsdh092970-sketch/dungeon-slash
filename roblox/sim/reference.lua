-- 전 테스터 밸런스 기준 빌드 (Studio 플레이 → 서버에서 실행)
-- 장비 8칸 · 전설(옵션 5줄) · 장비 티어 Tn · 옵션 티어 구성(예: {5,5,6,6,6}) · 품질 75% · 유효 옵션만(쓰는 계열 피해 + 방어)
-- 스킬은 뽑기 기준 (그 구간까지 모일 조각으로 기대되는 등급 · 레벨). 패시브는 레벨만큼 자동 배분.
local G = game.ReplicatedStorage.Game
local Loot = require(G.Loot); local Battle = require(G.Battle); local Econ = require(G.Economy); local Power = require(G.Power)
local Items = require(G.Data.Items)
local REF = {}
local DEF = { "hpPct", "hpFlat", "defPct", "dodge", "dmgTaken", "defFlat", "regen" }
-- 유효 옵션 (위에서부터 우선). 물리 빌드 = 물리 피해 + 방어, 마법(화염) 빌드 = 마법 · 화염 피해 + 방어
REF.VALID = {
  phys = { weapon = { "atkFlat", "atkPct", "physDmg", "critDmg", "critChance", "cdr" }, gloves = { "atkFlat", "atkPct", "physDmg", "critChance", "critDmg", "cdr" },
    neck = { "atkFlat", "atkPct", "physDmg", "critDmg", "allDmg", "cdr" }, ring = { "critChance", "allDmg", "cdr", "lifesteal", "manaRegen", "manaFlat" },
    helm = DEF, armor = DEF, boots = { "hpPct", "hpFlat", "defPct", "dodge", "cdr", "dmgTaken", "defFlat" } },
  mag = { weapon = { "magFlat", "magPct", "magDmg", "fireDmg", "spellCrit", "critDmg" }, gloves = { "magFlat", "magPct", "magDmg", "fireDmg", "spellCrit", "critDmg" },
    neck = { "magFlat", "magPct", "magDmg", "fireDmg", "critDmg", "elemDmg" }, ring = { "fireDmg", "spellCrit", "elemDmg", "allDmg", "cdr", "penElem" },
    helm = DEF, armor = DEF, boots = { "hpPct", "hpFlat", "defPct", "dodge", "cdr", "dmgTaken", "defFlat" } },
}
-- 뽑기 기준 스킬 (계열별 대표 조합: 기본 공격 1 + 범위 2 + 단일/관통 1), 등급 · 레벨은 구간에 따라
REF.SKILLS = { phys = { "rip", "rend", "lance", "sweep" }, mag = { "ember", "chain", "bomb", "firewall" } }
local Q75 = { NextNumber = function() return 0.75 end, NextInteger = function(_, a, b) return a end }
local by = {}; for _, a in ipairs(Items.AFFIXES) do by[a.k] = a end
local function makeItem(rng, sv, slot, ilvl, tiers, fam)
  local it = Loot.genItem(rng, sv, ilvl, 3, slot == "ring2" and "ring" or slot)
  it.affixes = {}
  if slot == "weapon" then local v = it.base.atk or it.base.mag or 1; it.wt = fam == "mag" and "staff" or "sword"; it.base = fam == "mag" and { mag = v } or { atk = v } end   -- 계열에 맞는 무기 (검 9 = 지팡이 9)
  local pool = {}; for _, a in ipairs(Loot.affixPool(it)) do pool[a.k] = a end
  local keys = {}
  for _, k in ipairs(REF.VALID[fam][slot == "ring2" and "ring" or slot]) do if pool[k] and #keys < 5 then keys[#keys + 1] = k end end
  local ts = table.clone(tiers); table.sort(ts)   -- 좋은 티어(숫자 작은)부터 우선 옵션에
  for i, k in ipairs(keys) do
    local t = math.max(ts[i] or 6, Items.AT.unlock and (function() for tt = 1, 6 do if Items.AT.unlock[tt] <= ilvl then return tt end end return 6 end)() or 1)
    it.affixes[i] = Loot.mkAff(Q75, by[k], ilvl, 3, t - 1)
  end
  it.enh = 0; it.sock = {}
  return it, #keys
end
-- spec = { ilvl = Tn, tiers = {..5개..}, fam = "phys"|"mag", level = n, skR = 스킬 등급(0~4) 또는 표, skL = 스킬 레벨, sat = 사탄 장비 수 }
function REF.build(spec)
  local rng = Random.new(spec.seed or 7)
  local sv = Loot.newSave(rng); sv.needStart = false; sv.level = spec.level or 50; sv.slots = 4; sv.lanesBase = 3; sv.cleared = 5
  local miss = 0
  for _, s in ipairs({ "weapon", "helm", "armor", "gloves", "boots", "ring", "ring2", "neck" }) do local it, n = makeItem(rng, sv, s, spec.ilvl, spec.tiers, spec.fam); sv.equipped[s] = it; miss += 5 - n end
  sv.skills = {}; sv.loadout = { false, false, false, false }
  for i, id in ipairs(REF.SKILLS[spec.fam]) do
    local r = type(spec.skR) == "table" and spec.skR[i] or spec.skR or 0
    sv.skills[i] = { uid = i, id = id, rarity = r, lvl = spec.skL or 1 }; sv.loadout[i] = { uid = i, rule = "front" }
  end
  Econ.autoPassives(sv)
  return sv, miss
end
local function win(sv, node, seed) return Battle.run(sv, node, seed or 1, 0.05, 240).win end
function REF.maxRift(sv, lo, hi)   -- 이기는 가장 높은 균열 층 (이분 탐색)
  if not win(sv, { kind = "rift", act = 10, tier = lo }) then return lo - 1 end
  local a, b = lo, hi
  while b - a > 1 do local m = math.floor((a + b) / 2); if win(sv, { kind = "rift", act = 10, tier = m }) then a = m else b = m end; task.wait() end
  if win(sv, { kind = "rift", act = 10, tier = b }) then return b end
  return a
end
return REF
