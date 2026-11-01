-- 서버 게임 로직 (순수 함수: 세이브 sv 를 받아 바꾼다). 네트워크/DataStore 와 분리되어 Studio 에서 바로 검증할 수 있다.
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local Items = require(Data.Items)
local Stats = require(script.Parent.Stats)
local Battle = require(script.Parent.Battle)
local Loot = require(script.Parent.Loot)
local Sat = require(Data.Satan).SAT_DEFS

local M = {}
local floor = math.floor
M.INV_MAX = 200

local AFFIX_BY = {}; for _, a in ipairs(Items.AFFIXES) do AFFIX_BY[a.k] = a end
local SAT_BY = {}; for _, d in ipairs(Sat) do SAT_BY[d[1]] = d end
local SLOT_KO = Items.SLOT_NAME
local function fmtNum(x) if x >= 1e6 then return string.format("%.2fM", x / 1e6) elseif x >= 1e3 then return string.format("%.1fK", x / 1e3) end return tostring(floor(x + 0.5)) end
M.fmtNum = fmtNum

function M.affixText(a)
  local d = AFFIX_BY[a.k]; local name = d and d.name or a.k
  local v = d and d.pct and (string.format("%.1f%%", a.v * 100)) or (d and d.count and tostring(floor(a.v + 0.5)) or fmtNum(a.v))
  return string.format("%s +%s%s", name, v, a.t and ("  [T" .. (a.t + 1) .. "]") or "")
end
function M.itemTitle(it)
  local kind = it.slot == "weapon" and Items.WTYPES[it.wt] and Items.WTYPES[it.wt].name or SLOT_KO[it.slot]
  local rar = it.sat and "사탄" or Items.ITEM_RARITY[math.min(3, it.rarity) + 1].name
  return string.format("%s %s%s  (T%d)", rar, kind, (it.enh or 0) > 0 and (" +" .. it.enh) or "", it.ilvl)
end
function M.itemLines(it)
  local L = {}
  for k, v in pairs(it.base or {}) do L[#L + 1] = string.format("%s %s", ({ atk = "공격력", mag = "주문력", hp = "체력", def = "방어력" })[k] or k, fmtNum(v)) end
  table.sort(L)
  for _, a in ipairs(it.affixes or {}) do L[#L + 1] = M.affixText(a) end
  if it.sat and SAT_BY[it.sat] then L[#L + 1] = "✦ " .. SAT_BY[it.sat][4] end
  return L
end

function M.summary(sv)
  local st = Stats.computeStats(sv)
  return { level = sv.level, gold = floor(sv.gold), ore = sv.ore, best = sv.spire.best, riftBest = sv.rift and sv.rift.best or 0, cleared = sv.cleared or 0, hone = sv.hone or 0, orbC = sv.orbC or 0, invCount = #sv.inv, maxHp = st.maxHp, atk = st.atk, mag = st.mag, def = st.def, crit = st.critChance, lanes = st.lanes, guildLv = sv.guildLv or 0 }
end
function M.inventory(sv)
  local out = {}
  for i, it in ipairs(sv.inv) do out[i] = { uid = it.uid, slot = it.slot, title = M.itemTitle(it), lines = M.itemLines(it), sat = it.sat ~= nil } end
  return out
end
function M.equipped(sv)
  local out = {}
  for _, slot in ipairs(Items.EQ_SLOTS) do local it = sv.equipped[slot]; if it then out[#out + 1] = { uid = it.uid, slot = slot, title = M.itemTitle(it), lines = M.itemLines(it) } end end
  return out
end

-- 장착: 같은 부위 장비와 맞바꾼다 (반지는 ring / ring2 중 비어 있는 곳, 둘 다 차 있으면 ring 과 교체)
function M.equip(sv, uid)
  for i, it in ipairs(sv.inv) do
    if it.uid == uid then
      local slot = it.slot
      if slot == "ring" and sv.equipped.ring and not sv.equipped.ring2 then slot = "ring2" end
      local old = sv.equipped[slot]; sv.equipped[slot] = it; table.remove(sv.inv, i)
      if old then sv.inv[#sv.inv + 1] = old end
      return true
    end
  end
  return false, "없는 장비"
end
-- 분해: 강화석(ore)을 받는다
function M.dismantle(sv, uid)
  for i, it in ipairs(sv.inv) do if it.uid == uid then table.remove(sv.inv, i); sv.ore += 1 + it.rarity + (it.sat and 3 or 0); return true end end
  return false, "없는 장비"
end

-- 탑 도전: 한 층을 서버에서 끝까지 계산하고 결과(보상 포함)를 세이브에 반영한다.
function M.battle(sv, floorN, seed)
  floorN = math.floor(floorN or 1)
  local best = sv.spire.best
  if floorN < 1 or floorN > CFG.SPIRE.END or floorN > best + 1 then return nil, "도전할 수 없는 층입니다" end
  local node = { act = 10, floor = floorN, tier = Battle.spireTier(floorN), tw = 1 }
  local rng = Random.new((seed or os.time()) + sv.nextUid)
  local b = Battle.run(sv, node, rng:NextInteger(1, 2 ^ 30), 0.05, 700)
  local res = { win = b.win, time = b.time, floor = floorN, hpLeft = b.hp / b.maxHp, kills = b.kills, items = {}, gold = 0 }
  if b.win then
    local first = floorN > best
    local boss = floorN % 5 == 0
    res.gold = floor(b.gold); sv.gold += res.gold
    sv.stats.kills += b.kills; sv.stats.clears += 1
    if first then sv.spire.best = floorN; res.first = true; end
    local drops = Loot.spireDrops(rng, sv, node, boss, first)
    for _, it in ipairs(drops) do
      if #sv.inv < M.INV_MAX then sv.inv[#sv.inv + 1] = it; res.items[#res.items + 1] = { title = M.itemTitle(it), sat = it.sat ~= nil } else res.full = true end
    end
  else res.gold = floor(b.gold * 0.5); sv.gold += res.gold end
  return res
end

-- 스테이지(1~4) · 보스(5) · 균열(1~100) 도전. kind = "stage" | "rift", n = 번호.
function M.fight(sv, kind, n, seed)
  n = math.floor(n or 1)
  local node
  if kind == "stage" then
    if n < 1 or n > CFG.STAGES or n > (sv.cleared or 0) + 1 then return nil, "도전할 수 없는 스테이지입니다" end
    node = n == CFG.STAGES and { kind = "boss", act = 1, stage = n } or { kind = "stage", act = 1, stage = n }
  elseif kind == "rift" then
    if (sv.cleared or 0) < CFG.STAGES then return nil, "스테이지 5를 먼저 클리어해야 합니다" end
    local best = sv.rift.best
    if n < 1 or n > CFG.RIFT_END or n > best + 1 then return nil, "도전할 수 없는 층입니다" end
    node = { kind = "rift", act = math.max(1, math.min(10, math.ceil(n / 10))), tier = n, mods = Battle.riftMods(n) }
  else return M.battle(sv, n, seed) end
  local rng = Random.new((seed or os.time()) + sv.nextUid)
  local b = Battle.run(sv, node, rng:NextInteger(1, 2 ^ 30), 0.05, 700)
  local res = { win = b.win, time = b.time, kind = kind, n = n, kills = b.kills, items = {}, gold = 0 }
  if b.win then
    res.gold = floor(b.gold); sv.gold += res.gold; sv.stats.kills += b.kills; sv.stats.clears += 1
    local boss = node.kind == "boss" or (kind == "rift" and n % 5 == 0)
    local d = Loot.fieldDrops(rng, sv, node, boss)
    sv.ore += d.ore; res.ore = d.ore; if d.hone then sv.hone += d.hone; res.hone = d.hone end; if d.orbC > 0 then sv.orbC += d.orbC; res.orbC = d.orbC end
    for _, it in ipairs(d.items) do if #sv.inv < M.INV_MAX then sv.inv[#sv.inv + 1] = it; res.items[#res.items + 1] = { title = M.itemTitle(it) } else res.full = true end end
    if kind == "stage" and n > (sv.cleared or 0) then sv.cleared = n; res.first = true end
    if kind == "rift" and n > sv.rift.best then
      local gain = math.max(0, math.min(CFG.LEVEL_CAP, 1 + n) - sv.level); sv.rift.best = n; res.first = true
      if gain > 0 then sv.level += gain; res.levelUps = gain end
      if n >= CFG.RIFT_END then res.graduated = true; sv.graduated = true end
    end
  else res.gold = floor(b.gold * 0.5); sv.gold += res.gold end
  return res
end

return M
