-- 장비 · 드랍 생성 (JS state.js genItem / rollDrops 이식). 난수는 rng(Random)를 받는다.
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local Items = require(Data.Items)
local Sat = require(Data.Satan).SAT_DEFS
local Skills = require(Data.Skills)

local M = {}
local floor, max, min = math.floor, math.max, math.min

local function gScale(ilvl) return Items.TIER_SCALE[max(1, min(6, ilvl))] end   -- TIER_SCALE 는 T1=1번
local AT = Items.AT   -- w / flat / pct 는 0번 티어 = 1번 인덱스
local function atAvail(ilvl) local lo, hi, o = max(0, 5 - ilvl), min(5, 8 - ilvl), {}; for i = lo, hi do o[#o + 1] = i end return o end
local function wpick(rng, list, wf) local t = 0; for _, x in ipairs(list) do t += wf(x) end; local r = rng:NextNumber() * t; for _, x in ipairs(list) do r -= wf(x); if r <= 0 then return x end end return list[#list] end
local function atPick(rng, ilvl) return wpick(rng, atAvail(ilvl), function(i) return AT.w[i + 1] end) end
local function atMul(a, t) if a.count then return 1 end; if a.flat then return AT.flat[t + 1] end; if a.pct then return AT.pct[t + 1] end; return 1 end
local function rarMul(rarity) return Items.ITEM_RARITY[min(3, rarity) + 1].mult end
local function pctScale(ilvl) return 0.80 + 0.04 * min(ilvl, 6) end
local function affixScaleV(a, ilvl, rarity)
  if a.count then return 1 end
  if a.flat then return gScale(ilvl) ^ (a.gp or 1) * rarMul(rarity) end
  if a.pct then return pctScale(ilvl) end
  return 1
end
local AFFIX_BY = {}; for _, a in ipairs(Items.AFFIXES) do AFFIX_BY[a.k] = a end
local function wtOk(a, it)
  if it.slot == "weapon" and it.wt and Items.WTYPES[it.wt] then
    local T = Items.WTYPES[it.wt]
    if (a.k == "atkFlat" and not (T.atk and T.atk > 0)) or (a.k == "magFlat" and not (T.mag and T.mag > 0)) then return false end
  end
  return true
end
local function inList(l, v) if not l then return true end for _, x in ipairs(l) do if x == v then return true end end return false end

function M.affixPool(it, exceptIdx)
  local used = {}
  for i, x in ipairs(it.affixes or {}) do if i - 1 ~= exceptIdx then used[x.k] = true end end
  for _, s in ipairs(it.sock or {}) do if s then used[s.k] = true end end
  local out = {}
  for _, a in ipairs(Items.AFFIXES) do
    if not used[a.k] and (not a.minRarity or it.rarity >= a.minRarity) and inList(a.slots, it.slot) and (not a.minIlvl or it.ilvl >= a.minIlvl) and a.k ~= "lanes" and wtOk(a, it) then out[#out + 1] = a end
  end
  return out
end
function M.mkAff(rng, a, ilvl, rarity, tier)
  local t = (not a.count) and (tier or atPick(rng, ilvl)) or nil
  local u = rng:NextNumber(); local v
  if a.count then v = floor(a.range[1] + (a.range[2] - a.range[1]) * u + 0.5)
  else v = (a.range[1] + (a.range[2] - a.range[1]) * u) * affixScaleV(a, ilvl, rarity) * atMul(a, t) end
  local o = { k = a.k, v = v }; if t ~= nil then o.t = t end; return o
end

function M.genItem(rng, sv, ilvl, rarity, slot)
  slot = slot or Items.SLOTS[rng:NextInteger(1, #Items.SLOTS)]
  ilvl = max(1, min(6, ilvl)); rarity = max(0, min(3, rarity))
  local R = Items.ITEM_RARITY[rarity + 1]
  local it = { uid = sv.nextUid, slot = slot, ilvl = ilvl, rarity = rarity, base = {}, affixes = {}, enh = 0, gv = 4 }; sv.nextUid += 1
  local f = gScale(ilvl) * rarMul(rarity)
  local function jit() return 0.9 + 0.2 * rng:NextNumber() end
  if slot == "weapon" then
    local ids = {}; for id in pairs(Items.WTYPES) do ids[#ids + 1] = id end; table.sort(ids)
    it.wt = wpick(rng, ids, function(x) return Items.WTYPES[x].w end)
    local T = Items.WTYPES[it.wt]; if T.atk and T.atk > 0 then it.base.atk = T.atk * f * jit() end; if T.mag and T.mag > 0 then it.base.mag = T.mag * f * jit() end
  end
  local keys = {}; for k in pairs(Items.SLOT_BASE[slot] or {}) do keys[#keys + 1] = k end; table.sort(keys)
  for _, k in ipairs(keys) do it.base[k] = Items.SLOT_BASE[slot][k] * f * jit() end
  for _ = 1, R.affixes do
    local cand = M.affixPool(it); if #cand == 0 then break end
    local a = wpick(rng, cand, function(x) return x.w end); it.affixes[#it.affixes + 1] = M.mkAff(rng, a, ilvl, rarity)
  end
  if rarity == 3 then it.sock = {}; for _ = 1, wpick(rng, { 1, 2, 3 }, function(x) return ({ 50, 35, 15 })[x] end) do it.sock[#it.sock + 1] = false end
  elseif rarity == 2 then it.sock = {}; for _ = 1, wpick(rng, { 1, 2 }, function(x) return x == 1 and 60 or 40 end) do it.sock[#it.sock + 1] = false end
  elseif rarity == 1 then it.sock = { false } end
  return it
end
function M.rollSatan(rng, slot)
  local pool = {}; for _, d in ipairs(Sat) do if d[2] == slot then pool[#pool + 1] = d[1] end end
  return #pool > 0 and pool[rng:NextInteger(1, #pool)] or nil
end
function M.genSatan(rng, sv, ilvl, slot)
  slot = slot or Items.SLOTS[rng:NextInteger(1, #Items.SLOTS)]
  local it = M.genItem(rng, sv, ilvl, 3, slot); local id = M.rollSatan(rng, slot); if id then it.sat = id end; return it
end
local function satRate(f) return CFG.SPIRE.SAT + CFG.SPIRE.SAT_STEP * floor(max(1, f) / CFG.SPIRE.WALL) end
M.satRate = satRate

-- 탑 층 클리어 드랍 (장비). 돌 · 룬 · 스킬 · 열쇠 등은 아직 이식하지 않았다.
function M.spireDrops(rng, sv, node, boss, first)
  local ilvl = ((node.floor >= CFG.SPIRE.END) or node.tw == 2) and 6 or 5
  local n = 5 + floor(node.floor / 10) + (boss and 3 or 0)
  local items = {}
  for _ = 1, n do
    if rng:NextNumber() < (satRate(node.floor) + (node.tw == 2 and 0.05 or 0)) then items[#items + 1] = M.genSatan(rng, sv, ilvl)
    else items[#items + 1] = M.genItem(rng, sv, ilvl, wpick(rng, { 0, 1, 2, 3 }, function(x) return ({ 10, 25, 35, 30 })[x + 1] end)) end
  end
  if first and node.floor % CFG.SPIRE.WALL == 0 then local has = false; for _, it in ipairs(items) do if it.sat then has = true end end; if not has then items[#items + 1] = M.genSatan(rng, sv, ilvl) end end
  return items
end

-- 새 세이브 (JS newSave 이식: 시작 장비 3칸 + 일격 스킬)
function M.newSave(rng)
  local s = { v = 3, level = 1, gold = 0, ore = 5, inv = {}, equipped = {}, skills = {}, loadout = { false, false, false, false }, slots = 1, nextUid = 1,
    lanesBase = CFG.BASE_LANES, cls = 0, cpass = {}, pass = {}, charms = {}, spire = { best = 0 }, stats = { kills = 0, clears = 0 }, guildLv = 0 }
  for _, slot in ipairs({ "weapon", "helm", "armor" }) do s.equipped[slot] = M.genItem(rng, s, 1, 0, slot) end
  local sk = { uid = s.nextUid, id = "strike", rarity = 0 }; s.nextUid += 1; s.skills[1] = sk; s.loadout[1] = { uid = sk.uid, rule = "front" }
  return s
end

return M
