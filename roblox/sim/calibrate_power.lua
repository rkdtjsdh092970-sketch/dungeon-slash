-- 전투력 눈금 보정 (Studio 플레이 → 서버에서 실행): 무작위 빌드마다 전투력 P 와
--   탑 최고 층(1~100, 실제 탑 전투) · 균열 보스 최고 층(5층마다 보스)을 실측한다 → "P 로 몇 층을 깨는가"를 맞춘다.
-- 결과: ServerStorage 속성 "CAL" 에 CSV 줄을 쌓는다 (level,ilvl,skills,P,dps,ehp,tower,boss)
local G = game.ReplicatedStorage.Game
local Loot = require(G.Loot); local Battle = require(G.Battle); local Power = require(G.Power); local Econ = require(G.Economy)
local SK = require(G.Data.Skills)
local Items = require(G.Data.Items)
local CAL = {}
local function pool(act)
  local t = {}
  for _, d in ipairs(SK.SKILLS) do if d.dtype ~= "buff" and d.dtype ~= "heal" and d.slot ~= "passive" and (d.unlock or 1) <= act and not d.voidOnly and not d.mythOnly then t[#t + 1] = d end end
  return t
end
-- prof = nil: 일반 성장 빌드 / "end": 엔드게임 (전설 T6 · 강화 +E · 사탄 장비 · 소켓 돌 · 전설~신화 스킬 Lv10)
function CAL.build(seed, level, prof, E)
  local rng = Random.new(seed); local sv = Loot.newSave(rng)
  sv.level = level; local act = math.max(1, math.min(8, 1 + math.floor(level / 10)))
  local ilvl = math.max(1, math.min(6, 1 + math.floor(level / 17)))
  for _, s in ipairs({ "weapon", "helm", "armor", "gloves", "boots", "ring", "neck" }) do sv.equipped[s] = Loot.genItem(rng, sv, ilvl, rng:NextInteger(0, 3), s) end
  sv.equipped.ring2 = Loot.genItem(rng, sv, ilvl, rng:NextInteger(0, 3), "ring")
  local P = pool(act); sv.skills = {}; sv.loadout = { false, false, false, false }
  sv.slots = math.min(4, 1 + math.floor(level / 25)); local used = {}
  for i = 1, sv.slots do
    local d; for _ = 1, 20 do d = P[rng:NextInteger(1, #P)]; if not used[d.id] then break end end
    used[d.id] = true
    sv.skills[i] = { uid = i, id = d.id, rarity = rng:NextInteger(0, 2), lvl = rng:NextInteger(1, 10) }; sv.loadout[i] = { uid = i, rule = "front" }
  end
  if prof == "end" then
    for _, s in ipairs({ "weapon", "helm", "armor", "gloves", "boots", "ring", "neck", "ring2" }) do
      local it = Loot.genItem(rng, sv, 6, 3, s == "ring2" and "ring" or s); it.enh = E or rng:NextInteger(5, 10)
      it.sock = {}; for j = 1, 2 do local p = Items.STONE_POOL[rng:NextInteger(1, #Items.STONE_POOL)]; it.sock[j] = { k = p.k, v = p.v } end
      sv.equipped[s] = it
    end
    for _, s in ipairs({ "gloves", "boots" }) do local ok, it = pcall(Loot.genSatan, rng, sv, 6, s); if ok and it then it.enh = E or 5; sv.equipped[s] = it end end
    for _, k in ipairs(sv.skills) do k.rarity = rng:NextInteger(2, 3); k.lvl = 10 end
    sv.guildLv = 10
  end
  pcall(function() Econ.autoPassives(sv) end)
  return sv
end
local function win(sv, node, seed) local b = Battle.run(sv, node, seed, 0.05, 240); return b.win end
local function best(sv, lo, hi, nodeOf, step)   -- 이기는 가장 높은 층 (단조 가정, 이분 탐색)
  step = step or 1
  if not win(sv, nodeOf(lo), 1) then return 0 end
  local a, b = lo, hi
  while b - a > step do local m = a + math.floor((b - a) / (2 * step)) * step; if m == a then m = a + step end
    if win(sv, nodeOf(m), 1) then a = m else b = m end; task.wait() end
  if win(sv, nodeOf(b), 1) then return b end
  return a
end
function CAL.run(seed, level, prof, E)
  local sv = CAL.build(seed, level, prof, E)
  local P, d = Power.of(sv)
  local tower = best(sv, 1, 100, function(f) return { act = 10, floor = f, tier = Battle.spireTier(f), tw = 1 } end)
  local boss = best(sv, 5, 100, function(f) return { kind = "rift", act = 10, tier = f } end, 5)
  local ids = {}; for _, k in ipairs(sv.skills) do ids[#ids + 1] = k.id end
  return string.format("%s%d,%d,%s,%.4g,%.4g,%.4g,%d,%d", prof and (prof .. (E or "") .. ":") or "", level, sv.equipped.weapon.ilvl, table.concat(ids, "+"), P, d.dps, d.ehp, tower, boss)
end
return CAL
