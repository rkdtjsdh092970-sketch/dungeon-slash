-- 성장 시뮬레이션 (Studio 플레이 → 서버에서 실행): 새 계정이 실제 보상(드랍 · 아르카나)으로 얼마나 진행하는가
-- 직업 선택 → 시작 소환 N회 → 스테이지 1~5 → 균열. 전투마다 자동 장착 · 패시브 자동 배분 · 계열 소환 · 스킬 조합 자동 선택.
-- 막히면 한 층 아래를 반복해 파밍한다. 전투 횟수 예산 안에서 도달한 균열 층을 잰다.
local G = game.ReplicatedStorage.Game
local Game = require(G.Game); local Loot = require(G.Loot); local Econ = require(G.Economy); local Power = require(G.Power)
local P = {}
local Extras = require(G.Extras)
local Items = require(G.Data.Items)
local VALID = require(game:GetService("ServerStorage").SimRef).VALID
local MID = { NextNumber = function() return 0.5 end, NextInteger = function(_, a, b) return math.floor((a + b) / 2) end }   -- 평균 굴림
local function validOf(fam, slot) local v = {}; for i, k in ipairs(VALID[fam][(slot == "ring2") and "ring" or slot] or {}) do v[k] = i end; return v end
local function badLine(it, V)   -- 다시 굴릴 줄 (한 장비에서 한 줄만: 이미 굴린 줄이 있으면 그 줄)
  if it.uniq then return nil end
  if it.rrIdx then local a = it.affixes[it.rrIdx + 1]; return (a and not V[a.k]) and it.rrIdx + 1 or nil end
  for i, a in ipairs(it.affixes or {}) do if not V[a.k] then return i end end
end
local function bestValid(it, idx, V)   -- 그 줄에 붙을 수 있는 유효 옵션 중 우선순위가 가장 높은 것
  local best; for _, a in ipairs(Loot.affixPool(it, idx - 1)) do if V[a.k] and (not best or V[a.k] < V[best.k]) then best = a end end
  return best
end
-- 장비 고르기: 무효 줄 하나를 유효 옵션(평균 굴림)으로 돌렸다고 친 "예상 전투력"이 가장 높은 장비. 무기는 계열에 맞는 것만
local function smartEquip(sv, fam)
  for _, slot in ipairs(Items.EQ_SLOTS) do
    local V = validOf(fam, slot)
    local function fits(it) return (it.slot == slot or (slot == "ring2" and it.slot == "ring")) and (slot ~= "weapon" or ((fam == "mag") == ((it.base or {}).mag ~= nil))) end
    local cur0 = sv.equipped[slot]
    local function projected(it)
      local old = sv.equipped[slot]; sv.equipped[slot] = it
      local e0 = it.enh; if cur0 and it ~= cur0 then it.enh = math.max(it.enh or 0, cur0.enh or 0) end   -- 바꾸면 다시 강화한다고 친다 (골드 · 강화석이 남으므로)
      local i = badLine(it, V); local keep
      if i then local b = bestValid(it, i, V); if b then keep = it.affixes[i]; it.affixes[i] = Loot.mkAff(MID, b, it.ilvl, it.rarity) end end
      local p = Power.of(sv)
      if keep then it.affixes[i] = keep end
      it.enh = e0; sv.equipped[slot] = old; return p
    end
    local cur = sv.equipped[slot]; local best = cur and projected(cur) or -1; local pick, pickI
    for i, it in ipairs(sv.inv) do if fits(it) then local p = projected(it); if p > best * 1.0005 then best, pick, pickI = p, it, i end end end
    if pick then sv.equipped[slot] = pick; table.remove(sv.inv, pickI); if cur then sv.inv[#sv.inv + 1] = cur end end
  end
end
-- 장착 장비 옵션 맞추기: 무효 줄을 유효 옵션이 나올 때까지 재굴림, 혼돈 구슬은 전투력이 원래보다 오를 때까지
local function tuneGear(sv, fam, rng)
  for _, slot in ipairs(Items.EQ_SLOTS) do
    local it = sv.equipped[slot]
    if it then
      local V = validOf(fam, slot)
      for _ = 1, 40 do local i = badLine(it, V); if not i or not Econ.rerollAffix(sv, it, i - 1, rng) then break end end
    end
  end
  for _ = 1, 5 do
    if (sv.orbC or 0) < 1 then break end
    local slot = Items.EQ_SLOTS[rng:NextInteger(1, #Items.EQ_SLOTS)]; local it = sv.equipped[slot]
    if it and not it.uniq and #(it.affixes or {}) > 0 then
      local base = Power.of(sv)
      while (sv.orbC or 0) > 0 do Econ.addAffix(sv, it, rng); if Power.of(sv) > base then break end end
    end
  end
end
local RUNE_PRI = { "power", "swift", "keen", "pierce", "wide", "fang", "thrift" }   -- 룬은 전투력 계산에 안 들어가므로 우선순위로
-- 실제 플레이어가 하는 나머지 성장: 퀘스트 · 일일 보상 받기, 원초의 돌 확인 → 소켓, 룬 장착
local function extras(sv, rng)
  for _, q in ipairs(Extras.questView(sv)) do if q.state == "done" then Extras.questClaim(sv, q.id) end end
  for _, t in ipairs(Extras.dailyView(sv)) do if not t.claimed and t.p >= t.n then Extras.dailyClaim(sv, t.id) end end
  for _, st in ipairs(table.clone(sv.stones or {})) do if not st.rev then if not Econ.revealStone(sv, st.uid, rng) then break end end end
  for _, it in pairs(sv.equipped) do
    if it and it.sock then
      for idx = 1, #it.sock do
        local cur = it.sock[idx]; local base = Power.of(sv); local best, bu = base * 1.001, nil
        for _, st in ipairs(sv.stones or {}) do
          if st.rev and (Econ.socketUsable(it, st.rev.k) or (cur and cur.k == st.rev.k)) then
            it.sock[idx] = { k = st.rev.k, v = st.rev.v }; local p = Power.of(sv); if p > best then best, bu = p, st.uid end
          end
        end
        it.sock[idx] = cur
        if bu then Econ.socketStone(sv, it.uid, bu, idx) end
      end
    end
  end
  local have = {}; for _, r in ipairs(sv.runes or {}) do have[r.id] = (have[r.id] or 0) + 1 end
  local rank = {}; for i, id in ipairs(RUNE_PRI) do rank[id] = i end
  for _, l in ipairs(sv.loadout or {}) do
    if l then for _, k in ipairs(sv.skills) do if k.uid == l.uid then
      for _, id in ipairs(RUNE_PRI) do
        if (have[id] or 0) > 0 and (not k.rune or rank[id] < (rank[k.rune] or 99)) then
          for _, r in ipairs(sv.runes) do if r.id == id then Extras.runeEquip(sv, k.uid, r.uid); break end end
          have = {}; for _, r in ipairs(sv.runes or {}) do have[r.id] = (have[r.id] or 0) + 1 end
          break
        end
      end
    end end end
  end
end
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
  smartEquip(sv, fam); tuneGear(sv, fam, rng); Econ.resetPassives(sv); Econ.autoPassives(sv); bestLoadout(sv)
  for _ = 1, 40 do   -- 실제 플레이어처럼 남는 골드 · 강화석으로 장착 장비를 강화 (강화 수치가 가장 낮은 것부터)
    local low
    for _, it in pairs(sv.equipped) do if it and (it.enh or 0) < 10 and (not low or (it.enh or 0) < (low.enh or 0)) then low = it end end
    if not low or not Econ.enhance(sv, low, rng) then break end
  end
  if #sv.inv > 150 then for i = #sv.inv, 60, -1 do table.remove(sv.inv, i) end end
end
function P.run(seed, cls, freePulls, budget)
  local rng = Random.new(seed)
  local sv = Loot.newSave(rng); Game.pickStart(sv, cls)
  sv.arcana = freePulls * Econ.GACHA.ARC1
  local fam = cls == "mage" and "mag" or "phys"
  upkeep(sv, fam, rng)
  local battles, fails = 0, 0
  local marks = {}   -- 120판마다 균열 최고층 (marks[2] = 240판)
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
    if battles % 10 == 0 then extras(sv, rng) end
    if battles % 120 == 0 then marks[battles // 120] = sv.rift.best end
    if battles % 5 == 0 then task.wait() end
  end
  local best = {}; for _, k in ipairs(sv.skills) do best[#best + 1] = k.id .. "r" .. (k.rarity or 0) .. "L" .. (k.lvl or 1) end
  return { stage = sv.cleared or 0, rift = sv.rift.best, level = sv.level, power = Power.score(sv), skills = #sv.skills, marks = marks, sv = sv }
end
return P
