-- 초반 경제: 스킬 상점 · 스킬 레벨업(연마석) · 스킬 장착 · 패시브 트리 · 대장간 강화 (JS state.js / data4.js 이식)
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local Skills = require(Data.Skills)
local Items = require(Data.Items)
local Passives = require(Data.Passives).PASSIVES

local M = {}
local floor = math.floor
local SKILL_BY = {}; for _, d in ipairs(Skills.SKILLS) do SKILL_BY[d.id] = d end
local PASS_BY = {}; for _, p in ipairs(Passives) do PASS_BY[p.id] = p end
M.SKILL_MAX_LV = 20
local HONE_RMUL = { 1, 2, 4, 8, 16, 32 }
local ENH_RATE = { 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3 }
local ENH_DROP = { 0, 0, 0, 0, 0, 0, 0, 0.3, 0.4, 0.5 }

-- ---------- 스킬 상점 ----------
local SHOP_BOSS = { execute = true, smite = true, firemark = true, frostmark = true, stormmark = true }
local function isSpecial(d) return d.voidOnly or (d.slot == "passive" and (d.pt or 0) > 0) or d.mythOnly or (d.bonus and (d.bonus.boss or 0) >= 0.8 and not SHOP_BOSS[d.id]) end
local function skillPrice(d, rarity)
  if d.slot == "passive" then return 300 * ({ 1, 3, 10, 30, 90, 300 })[rarity + 1] end
  return floor(70 * 1.55 ^ (d.unlock - 1) * ({ 1, 3.5, 12, 40, 130, 500 })[rarity + 1] * (d.slot == "basic" and 0.6 or 1) + 0.5)
end
M.skillPrice = skillPrice
function M.skillAct(sv) return math.max(1, math.min(8, 1 + floor(sv.level / 10))) end
function M.shopStock(sv)
  local out = {}
  for _, d in ipairs(Skills.SKILLS) do
    if not isSpecial(d) and d.id ~= "p_none" and (d.unlock or 1) <= M.skillAct(sv) then out[#out + 1] = d end
  end
  table.sort(out, function(a, b) local ba, bb = a.slot == "basic" and 0 or 1, b.slot == "basic" and 0 or 1; if ba ~= bb then return ba < bb end return (a.unlock or 0) < (b.unlock or 0) end)
  local rows = {}; for _, d in ipairs(out) do rows[#rows + 1] = { id = d.id, name = d.name, slot = d.slot, kind = d.kind, price = skillPrice(d, 0), desc = d.desc, dtype = d.dtype, elem = d.elem } end
  return rows
end
function M.buySkill(sv, id)
  local d = SKILL_BY[id]; if not d or isSpecial(d) then return false, "살 수 없는 스킬" end
  if (d.unlock or 1) > M.skillAct(sv) then return false, "아직 해금되지 않았습니다" end
  local price = skillPrice(d, 0); if sv.gold < price then return false, "골드가 부족합니다" end
  sv.gold -= price; local inst = { uid = sv.nextUid, id = id, rarity = (d.slot == "passive") and (d.pt or 0) or 0 }; sv.nextUid += 1
  sv.skills[#sv.skills + 1] = inst; return true, inst
end
local function findSkill(sv, uid) for _, k in ipairs(sv.skills) do if k.uid == uid then return k end end end
function M.honeCost(lvl, rarity) return floor((3 + 2 * lvl) * (HONE_RMUL[(rarity or 0) + 1] or 1) + 0.5) end
function M.levelUpSkill(sv, uid)
  local k = findSkill(sv, uid); if not k then return false, "없는 스킬" end
  local lvl = k.lvl or 1; if lvl >= M.SKILL_MAX_LV then return false, "최대 레벨입니다" end
  local c = M.honeCost(lvl, k.rarity); if (sv.hone or 0) < c then return false, "연마석이 부족합니다" end
  sv.hone -= c; k.lvl = lvl + 1; return true
end
-- 장착: slotIdx 는 1~sv.slots. 이미 다른 칸에 있으면 그 칸을 비운다
function M.equipSkill(sv, slotIdx, uid, rule)
  if slotIdx < 1 or slotIdx > sv.slots then return false, "열리지 않은 칸입니다" end
  local k = findSkill(sv, uid); if not k then return false, "없는 스킬" end
  local d = SKILL_BY[k.id]; if d.slot == "passive" then sv.passive = uid; return true end
  for i, l in ipairs(sv.loadout) do if l and l.uid == uid then sv.loadout[i] = false end end
  sv.loadout[slotIdx] = { uid = uid, rule = rule or "front" }; return true
end
function M.unequipSkill(sv, slotIdx) sv.loadout[slotIdx] = false; return true end
function M.sellSkill(sv, uid)
  local k = findSkill(sv, uid); if not k then return false, "없는 스킬" end
  if sv.passive == uid then return false, "장착 중입니다" end
  for _, l in ipairs(sv.loadout) do if l and l.uid == uid then return false, "장착 중입니다" end end
  local d = SKILL_BY[k.id]; local v = math.max(5, floor(skillPrice(d, k.rarity or 0) * 0.4 * (1 + 0.25 * ((k.lvl or 1) - 1)) + 0.5))
  sv.gold += v; table.remove(sv.skills, table.find(sv.skills, k)); return true, v
end
function M.skillList(sv)
  local rows = {}
  for _, k in ipairs(sv.skills) do
    local d = SKILL_BY[k.id]; local slot = 0
    for i, l in ipairs(sv.loadout) do if l and l.uid == k.uid then slot = i end end
    rows[#rows + 1] = { uid = k.uid, id = k.id, name = d.name, lvl = k.lvl or 1, rarity = k.rarity or 0, slot = slot, passive = sv.passive == k.uid, honeCost = (k.lvl or 1) < M.SKILL_MAX_LV and M.honeCost(k.lvl or 1, k.rarity) or nil, dtype = d.dtype, desc = d.desc, kind = d.kind }
  end
  return rows
end

-- ---------- 패시브 트리 ----------
function M.passivePoints(sv) return math.max(0, sv.level - 1) * CFG.PASSIVE_PER_LV end
function M.passiveSpent(sv) local n = 0; for id in pairs(sv.pass or {}) do if PASS_BY[id] then n += PASS_BY[id].cost end end return n end
function M.passiveLeft(sv) return M.passivePoints(sv) - M.passiveSpent(sv) end
local function has(sv, id) return sv.pass and sv.pass[id] and PASS_BY[id] ~= nil end
local function linked(sv, p) for _, q in ipairs(p.links) do if q == "C" or has(sv, q) then return true end end return false end
-- 가장 싼 경로 (JS passivePath)
function M.passivePath(sv, id)
  local T = PASS_BY[id]; if not T or has(sv, id) then return nil end
  local dist, prev, todo = {}, {}, {}
  for _, p in ipairs(Passives) do if not has(sv, p.id) and linked(sv, p) then dist[p.id] = p.cost; prev[p.id] = false; todo[p.id] = true end end
  while next(todo) do
    local cur; for k in pairs(todo) do if cur == nil or dist[k] < dist[cur] then cur = k end end
    todo[cur] = nil
    if cur == id then break end
    for _, q in ipairs(PASS_BY[cur].links) do
      if q ~= "C" and not has(sv, q) then
        local nd = dist[cur] + PASS_BY[q].cost
        if dist[q] == nil or nd < dist[q] then dist[q] = nd; prev[q] = cur; todo[q] = true end
      end
    end
  end
  if dist[id] == nil then return nil end
  local path = {}; local c = id; while c do table.insert(path, 1, c); c = prev[c] or nil end
  return { ids = path, cost = dist[id] }
end
function M.addPassivePath(sv, id)
  local P = M.passivePath(sv, id); if not P or P.cost > M.passiveLeft(sv) then return 0 end
  for _, k in ipairs(P.ids) do sv.pass[k] = 1 end; return #P.ids
end
function M.resetPassives(sv) sv.pass = {} end
-- 자동 배분: 키별 가중치로 점수/비용이 높은 경로를 포인트가 다할 때까지 찍는다 (직접 트리를 고르는 화면이 생기기 전까지의 대체)
local W = { atkPct = 3, magPct = 3, hpPct = 2, defPct = 1.5, allDmg = 4, physDmg = 2.5, magDmg = 2.5, critChance = 2, critDmg = 2, cdr = 3, lifesteal = 2, atkFlat = 0.02, hpFlat = 0.005, dmgTaken = -3, boss = 1, elite = 1, aoeDmg = 1.5, dodge = 1.5, ignoreDef = 2, ignoreRes = 2, fireDmg = 2, coldDmg = 2, lightDmg = 2, voidDmg = 2, atkMore = 8, magMore = 8, hpMore = 6, manaPct = 1, manaRegen = 0.5 }
local function nodeScore(p) local s = 0; for k, v in pairs(p.per) do s += (W[k] or 0.2) * (v > 0 and v or -v) * (k:sub(-4) == "More" and 1 or 1) end return s end
function M.autoPassives(sv)
  local added = 0
  for _ = 1, 200 do
    local left = M.passiveLeft(sv); if left <= 0 then break end
    local bestId, bestR
    for _, p in ipairs(Passives) do
      if not has(sv, p.id) and linked(sv, p) and p.cost <= left then local r = nodeScore(p) / p.cost; if bestR == nil or r > bestR then bestR = r; bestId = p.id end end
    end
    if not bestId then break end
    sv.pass[bestId] = 1; added += 1
  end
  return added
end

-- ---------- 대장간 강화 ----------
local function gGold(ilvl) return Items.TIER_SCALE[math.max(1, math.min(6, ilvl))] ^ 0.8 end
function M.enhCost(it) return { gold = floor(40 * gGold(it.ilvl) * (1 + (it.enh or 0) * 0.6) + 0.5), ore = 2 + (it.enh or 0) } end
function M.enhance(sv, it, rng)
  if (it.enh or 0) >= 10 then return false, "최대 강화입니다" end
  local c = M.enhCost(it); if sv.gold < c.gold or sv.ore < c.ore then return false, "재료가 부족합니다" end
  sv.gold -= c.gold; local rate = ENH_RATE[(it.enh or 0) + 1]
  if rng:NextNumber() < rate then sv.ore -= c.ore; it.enh = (it.enh or 0) + 1; return true, "+" .. it.enh .. " 강화 성공!" end
  sv.ore -= math.ceil(c.ore / 2)
  if (it.enh or 0) > 0 and rng:NextNumber() < ENH_DROP[(it.enh or 0) + 1] then it.enh -= 1; return true, "강화 실패 — +" .. (it.enh + 1) .. "에서 +" .. it.enh .. "로 하락" end
  return true, "강화 실패 (강화석 일부만 소모)"
end

return M
