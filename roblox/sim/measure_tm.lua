-- 스킬별 1회 시전 배율 측정 (Studio 플레이 → 서버 명령창에서 실행). 결과 문자열을 data/SkillTM.lua 에 붙여 넣는다.
-- 조건: 균열 40층(몬스터가 여러 대를 버팀 → 범위 · 관통 · 연쇄가 제 몫을 함), 레벨 80, T6 전설 장비 8칸, 무적, 마나 무한, 보조 스탯 0
local G = game.ReplicatedStorage.Game
local Loot = require(G.Loot); local Battle = require(G.Battle); local Power = require(G.Power)
local CFG = require(G.Data.Config).CFG; local SK = require(G.Data.Skills)
local function makeSave(id)
  local rng = Random.new(7); local sv = Loot.newSave(rng); sv.level = 80; sv.slots = 1; sv.lanesBase = 3
  for _, s in ipairs({ "weapon", "helm", "armor", "gloves", "boots", "ring", "neck" }) do sv.equipped[s] = Loot.genItem(rng, sv, 6, 3, s) end
  sv.equipped.ring2 = Loot.genItem(rng, sv, 6, 3, "ring")
  sv.skills = { { uid = 1, id = id, rarity = 0, lvl = 1 } }; sv.loadout = { { uid = 1, rule = "front" }, false, false, false }
  return sv
end
local function measure(id, tier, rep)
  local b = Battle.new(makeSave(id), { kind = "rift", act = 10, tier = tier, mods = {} }, 100 + rep)
  local st = b.stats; st.aoeDmg = 0; st.chainJumps = 0; st.chainDmg = 0; st.bleedChance = 0; st.poisonChance = 0; st.igniteChance = 0; st.dotDmg = 0; st.manaCostMul = 0; st.lifesteal = 0; st.cdr = 0; st.shredDef = 0; st.shredRes = 0
  for _, sk in ipairs(b.skills) do sk.bleed = 0; sk.poison = 0; sk.ignite = 0 end
  b.cap = CFG.STACK_BASE; b.hp = 1e15; b.maxHp = 1e15; b.inv = 1e9
  local sk = b.skills[1]; local steps = 0
  while not b.over and b.time < 45 do Battle.step(b, 0.05); b.mana = b.maxMana; steps += 1; if steps % 400 == 0 then task.wait() end end
  return (b.dmgBy[id] or 0) / math.max(1, (b.time - 0.4 * sk.cd) / sk.cd + 1) / Power.baseCast(sk, st)
end
local out, seen = {}, {}
for _, def in ipairs(SK.SKILLS) do
  if not seen[def.id] and def.dtype ~= "buff" and def.dtype ~= "heal" and def.slot ~= "passive" then
    seen[def.id] = true
    out[#out + 1] = string.format("%s = %.2f", def.id, (measure(def.id, 40, 1) + measure(def.id, 40, 2)) / 2)
  end
end
table.sort(out)
print("return { " .. table.concat(out, ", ") .. " }")
