-- 성장 시뮬레이션 (Studio 플레이 → 서버에서 실행): 새 계정이 실제 보상(드랍 · 아르카나)으로 얼마나 진행하는가
-- 직업 선택 → 시작 소환 N회 → 스테이지 1~5 → 균열. 전투마다 자동 장착 · 패시브 자동 배분 · 계열 소환 · 스킬 조합 자동 선택.
-- 막히면 한 층 아래를 반복해 파밍한다. 전투 횟수 예산 안에서 도달한 균열 층을 잰다.
local G = game.ReplicatedStorage.Game
local Game = require(G.Game); local Loot = require(G.Loot); local Econ = require(G.Economy); local Power = require(G.Power)
local P = {}
local function bestLoadout(sv)   -- 가진 스킬 중 전투력이 가장 높아지는 조합 (칸마다 욕심쟁이)
  local ids, seen = {}, {}
  for _, k in ipairs(sv.skills) do if not seen[k.id] or (k.rarity or 0) > (seen[k.id].rarity or 0) then seen[k.id] = k end end
  for _, k in pairs(seen) do ids[#ids + 1] = k end
  sv.loadout = { false, false, false, false }
  local used = {}
  for i = 1, sv.slots do
    local best, bk = -1, nil
    for _, k in ipairs(ids) do if not used[k.uid] then
      sv.loadout[i] = { uid = k.uid, rule = "front" }
      local p = Power.of(sv); if p > best then best, bk = p, k end
    end end
    if bk then sv.loadout[i] = { uid = bk.uid, rule = "front" }; used[bk.uid] = true else sv.loadout[i] = false end
  end
end
local function upkeep(sv, fam, rng)
  while (sv.arcana or 0) >= Econ.GACHA.ARC1 do Econ.gachaPull(sv, (sv.arcana >= Econ.GACHA.ARC10) and 10 or 1, "arcana", rng, fam) end
  Game.autoEquip(sv); Econ.resetPassives(sv); Econ.autoPassives(sv); bestLoadout(sv)
  if #sv.inv > 150 then for i = #sv.inv, 60, -1 do table.remove(sv.inv, i) end end
end
function P.run(seed, cls, freePulls, budget)
  local rng = Random.new(seed)
  local sv = Loot.newSave(rng); Game.pickStart(sv, cls)
  sv.arcana = freePulls * Econ.GACHA.ARC1
  local fam = cls == "mage" and "mag" or "phys"
  upkeep(sv, fam, rng)
  local battles, fails = 0, 0
  while battles < budget do
    battles += 1
    local r
    if (sv.cleared or 0) < 5 then r = Game.fight(sv, "stage", (sv.cleared or 0) + 1, seed + battles)
    else
      local target = sv.rift.best + 1
      if fails >= 2 then target = math.max(1, sv.rift.best) end   -- 막히면 아래층 파밍
      r = Game.fight(sv, "rift", target, seed + battles)
      if r and r.win and target > sv.rift.best - 1 then fails = 0 elseif r and not r.win then fails += 1 end
      if fails >= 5 then fails = 0 end
    end
    upkeep(sv, fam, rng)
    if battles % 5 == 0 then task.wait() end
  end
  local best = {}; for _, k in ipairs(sv.skills) do best[#best + 1] = k.id .. "r" .. (k.rarity or 0) .. "L" .. (k.lvl or 1) end
  return { stage = sv.cleared or 0, rift = sv.rift.best, level = sv.level, power = Power.score(sv), skills = #sv.skills, sv = sv }
end
return P
