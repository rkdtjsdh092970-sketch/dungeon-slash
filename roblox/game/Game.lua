-- 서버 게임 로직 (순수 함수: 세이브 sv 를 받아 바꾼다). 네트워크/DataStore 와 분리되어 Studio 에서 바로 검증할 수 있다.
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local Items = require(Data.Items)
local Stats = require(script.Parent.Stats)
local Battle = require(script.Parent.Battle)
local Loot = require(script.Parent.Loot)
local Sat = require(Data.Satan).SAT_DEFS
local Econ = require(script.Parent.Economy)
local Content = require(script.Parent.Content)
local ClassCharm = require(script.Parent.ClassCharm)
local Extras = require(script.Parent.Extras)

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
  return { level = sv.level, gold = floor(sv.gold), ore = sv.ore, best = sv.spire.best, riftBest = sv.rift and sv.rift.best or 0, cleared = sv.cleared or 0, hone = sv.hone or 0, orbC = sv.orbC or 0, orbD = sv.orbD or 0, stones = #(sv.stones or {}), slots = sv.slots, invCount = #sv.inv, maxHp = st.maxHp, atk = st.atk, mag = st.mag, def = st.def, crit = st.critChance, lanes = st.lanes, guildLv = sv.guildLv or 0 }
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
-- 판매/분해/일일/오프라인 (Extras)
function M.dismantle(sv, uid) return Extras.dismantle(sv, uid) end
function M.sell(sv, uid) return Extras.sell(sv, uid) end
function M.bulk(sv, r, mode) return Extras.bulk(sv, tonumber(r) or 0, mode == "sell" and "sell" or "dismantle") end
function M.daily(sv) return Extras.dailyView(sv) end
function M.dailyClaim(sv, id) return Extras.dailyClaim(sv, id) end
function M.offline(sv) return Extras.offline(sv) end

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
    Extras.onWin(sv, b.kills, boss, false); Extras.setRate(sv, b.gold, b.time)
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
    Extras.onWin(sv, b.kills, boss, kind == "rift"); Extras.setRate(sv, b.gold, b.time)
    local d = Loot.fieldDrops(rng, sv, node, boss)
    sv.orbD = (sv.orbD or 0) + (d.orbD or 0); if d.stones and d.stones > 0 then res.stones = d.stones; for _ = 1, d.stones do Econ.addStone(sv, false) end end
    sv.ore += d.ore; res.ore = d.ore; if d.hone then sv.hone += d.hone; res.hone = d.hone end; if d.orbC > 0 then sv.orbC += d.orbC; res.orbC = d.orbC end
    for _, it in ipairs(d.items) do if #sv.inv < M.INV_MAX then sv.inv[#sv.inv + 1] = it; res.items[#res.items + 1] = { title = M.itemTitle(it) } else res.full = true end end
    if kind == "stage" and n > (sv.cleared or 0) then
      sv.cleared = n; res.first = true
      if n >= 3 and sv.slots < 3 then sv.slots = 3; res.note = "3번 스킬 칸이 열렸습니다!" end
      if n >= CFG.STAGES then
        if sv.slots < 4 then sv.slots = 4; res.note = "4번 스킬 칸이 열렸습니다!" end
        sv.lanesBase = CFG.ENDGAME_LANES; res.note = (res.note or "") .. " 스테이지 클리어! 영구 3레인과 '심연의 균열'이 열립니다."
      end
    end
    if kind == "rift" and n > sv.rift.best then
      local gain = math.max(0, math.min(CFG.LEVEL_CAP, 1 + n) - sv.level); sv.rift.best = n; res.first = true
      if gain > 0 then sv.level += gain; res.levelUps = gain end
      if n >= CFG.RIFT_END then res.graduated = true; sv.graduated = true end
    end
  else res.gold = floor(b.gold * 0.5); sv.gold += res.gold end
  return res
end

-- 경제 API (서버가 RPC 로 호출)
function M.shop(sv) return Econ.shopStock(sv) end
function M.buySkill(sv, id) return Econ.buySkill(sv, id) end
function M.skills(sv) return Econ.skillList(sv) end
function M.levelUp(sv, uid) return Econ.levelUpSkill(sv, uid) end
function M.equipSkill(sv, slot, uid) return Econ.equipSkill(sv, slot, uid) end
function M.sellSkill(sv, uid) return Econ.sellSkill(sv, uid) end
function M.autoPassives(sv) return Econ.autoPassives(sv) end
function M.resetPassives(sv) Econ.resetPassives(sv); return true end
function M.passiveInfo(sv) return { points = Econ.passivePoints(sv), left = Econ.passiveLeft(sv), taken = (function() local n = 0 for _ in pairs(sv.pass or {}) do n += 1 end return n end)() } end
function M.enhance(sv, uid, seed)
  local it = sv.equipped.weapon and nil
  for _, slot in ipairs(Items.EQ_SLOTS) do if sv.equipped[slot] and sv.equipped[slot].uid == uid then it = sv.equipped[slot] end end
  if not it then for _, x in ipairs(sv.inv) do if x.uid == uid then it = x end end end
  if not it then return false, "없는 장비" end
  return Econ.enhance(sv, it, Random.new((seed or os.time()) + uid))
end
function M.enhCosts(sv) local out = {}; for _, slot in ipairs(Items.EQ_SLOTS) do local it = sv.equipped[slot]; if it then local c = Econ.enhCost(it); out[#out + 1] = { uid = it.uid, slot = slot, enh = it.enh or 0, gold = c.gold, ore = c.ore } end end return out end

-- 대장간(재굴림/구슬)과 돌
local function findItem(sv, uid)
  for _, slot in ipairs(Items.EQ_SLOTS) do if sv.equipped[slot] and sv.equipped[slot].uid == uid then return sv.equipped[slot] end end
  for _, x in ipairs(sv.inv) do if x.uid == uid then return x end end
end
function M.forgeList(sv)
  local out = {}
  for _, slot in ipairs(Items.EQ_SLOTS) do
    local it = sv.equipped[slot]
    if it then
      local c = Econ.enhCost(it); local rc = Econ.rerollCost(it); local affs = {}
      for i, a in ipairs(it.affixes) do affs[i] = { text = M.affixText(a), locked = Econ.rerollLocked(it, i - 1) } end
      local socks = {}; for i, s2 in ipairs(it.sock or {}) do socks[i] = s2 and (AFFIX_BY[s2.k] and AFFIX_BY[s2.k].name or s2.k) .. " +" .. (s2.v < 5 and string.format("%.1f%%", s2.v * 100) or tostring(s2.v)) or false end
      out[#out + 1] = { uid = it.uid, slot = slot, title = M.itemTitle(it), enh = it.enh or 0, enhGold = c.gold, enhOre = c.ore, rerollGold = rc.gold, rerollOre = rc.ore, affixes = affs, sockets = socks, affCount = #it.affixes }
    end
  end
  return out
end
function M.reroll(sv, uid, idx, seed) local it = findItem(sv, uid); if not it then return false, "없는 장비" end return Econ.rerollAffix(sv, it, tonumber(idx), Random.new((seed or os.time()) + uid)) end
function M.chaos(sv, uid, seed) local it = findItem(sv, uid); if not it then return false, "없는 장비" end return Econ.addAffix(sv, it, Random.new((seed or os.time()) + uid)) end
function M.divine(sv, uid, seed) local it = findItem(sv, uid); if not it then return false, "없는 장비" end return Econ.divine(sv, it, Random.new((seed or os.time()) + uid)) end
function M.stones(sv) return Econ.stoneList(sv) end
function M.reveal(sv, uid, seed) return Econ.revealStone(sv, uid, Random.new((seed or os.time()) + uid)) end
function M.socket(sv, itemUid, stoneUid, idx) return Econ.socketStone(sv, itemUid, stoneUid, idx) end
function M.stoneLabel(rev) local d = AFFIX_BY[rev.k]; return (d and d.name or rev.k) .. " +" .. (rev.v < 5 and string.format("%.1f%%", rev.v * 100) or tostring(rev.v)) end

-- 졸업 후 콘텐츠 · 전직 · 참 · 문지기 · 새 탑 (서버 RPC 가 호출)
function M.play(sv, spec, seed) return Content.play(sv, spec, seed) end
function M.classView(sv) return ClassCharm.view(sv) end
function M.classTake(sv, id) return ClassCharm.take(sv, id) end
function M.classDrop(sv, id) return ClassCharm.drop(sv, id) end
function M.classReset(sv) ClassCharm.reset(sv); return true end
function M.classAdvance(sv) return ClassCharm.advance(sv) end
function M.charmView(sv) return ClassCharm.charmView(sv) end
function M.charmEquip(sv, uid, slot) return ClassCharm.equip(sv, uid, slot) end
function M.charmUnequip(sv, slot) return ClassCharm.unequip(sv, slot) end
function M.charmDrop(sv, uid) return ClassCharm.drop_charm(sv, uid) end
function M.wardenStart(sv, uid) return Content.wardenStart(sv, uid) end
function M.wardenState(uid) return Content.wardenState(uid) end
function M.wardenPop(uid, id) return Content.wardenPop(uid, id) end
function M.wardenFinish(sv, uid) return Content.wardenFinish(sv, uid) end
function M.wardenTickAll(dt) Content.wardenTickAll(dt) end
function M.tower2(sv, n) return Content.tower2(sv, n) end
function M.unlocks(sv)   -- 어떤 콘텐츠가 열려 있는지 (화면 표시용)
  local grad = Content.graduated(sv); local raidDone = sv.raid and (sv.raid.cleared or 0) > 0
  return { graduated = grad, void = grad, bosses = grad, raid = grad, vault = grad, endless = grad, temple = raidDone or false, craid = (sv.raid and sv.raid.tower) and true or false,
    warden = Content.wardenOpen(sv), tower2 = Content.tower2Open(sv), class = (sv.raid and sv.raid.tower) and true or false, charm = (sv.cls or 0) >= 3, keys = sv.keys or 0, keys2 = sv.keys2 or 0, keys3 = sv.keys3 or 0, keys4 = sv.keys4 or 0, keys5 = sv.keys5 or 0, keys6 = sv.keys6 or 0 }
end

return M
