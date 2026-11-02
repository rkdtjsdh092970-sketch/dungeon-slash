-- 서버 게임 로직 (순수 함수: 세이브 sv 를 받아 바꾼다). 네트워크/DataStore 와 분리되어 Studio 에서 바로 검증할 수 있다.
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local Items = require(Data.Items)
local Stats = require(script.Parent.Stats)
local Power = require(script.Parent.Power)
local powerOf, bestWith   -- 아래(전투력 부분)에서 정한다 — 위쪽 요약 · 가방 보기에서도 쓴다
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
  if sv.passNotice then task.delay(5, function() sv.passNotice = nil end) end   -- 안내는 한 번만 (접속 직후 요약들에 실어 보낸 뒤 지운다)
  local st = Stats.computeStats(sv)
  return { level = sv.level, gold = floor(sv.gold), ore = sv.ore, best = sv.spire.best, riftBest = sv.rift and sv.rift.best or 0, cleared = sv.cleared or 0, hone = sv.hone or 0, arcana = sv.arcana or 0, orbC = sv.orbC or 0, orbD = sv.orbD or 0, shards = sv.shards or 0, sockTix = sv.sockTix or 0, gems = sv.gems or 0, stones = #(sv.stones or {}), slots = sv.slots, invCount = #sv.inv, maxHp = st.maxHp, atk = st.atk, mag = st.mag, def = st.def, crit = st.critChance, lanes = st.lanes, guildLv = sv.guildLv or 0, lang = sv.lang or "en", set = sv.set, hero = (sv.equipped.weapon and sv.equipped.weapon.wt == "staff") and "mage" or "warrior", power = Power.display(powerOf(sv)), passNotice = sv.passNotice, needStart = sv.needStart or nil, tut = sv.tut }   -- hero: 지팡이를 끼면 마법사 모습
end
-- 화면용 상세: 기본 능력치 · 옵션(티어) · 사탄 효과를 따로
function M.itemDetail(it)
  local base = {}
  for k, v in pairs(it.base or {}) do base[#base + 1] = string.format("%s %s", ({ atk = "공격력", mag = "주문력", hp = "체력", def = "방어력" })[k] or k, fmtNum(v)) end
  table.sort(base)
  local aff = {}
  for _, a in ipairs(it.affixes or {}) do local t = M.affixText(a):gsub("%s+%[T%d+%]$", ""); aff[#aff + 1] = { s = t, t = a.t and (a.t + 1) or nil } end
  return base, aff, (it.sat and SAT_BY[it.sat]) and SAT_BY[it.sat][4] or nil
end
function M.inventory(sv)
  local out = {}
  local base = powerOf(sv); local baseD = Power.display(base)
  for i, it in ipairs(sv.inv) do
    local b, a, sat = M.itemDetail(it)
    local P = bestWith(sv, it); local dp = Power.display(P) - baseD; local up = P > base * 1.0005
    out[i] = { uid = it.uid, slot = it.slot, title = M.itemTitle(it), lines = M.itemLines(it), base = b, aff = a, satText = sat, up = up, dp = dp, wt = it.wt, sat = it.sat ~= nil, rarity = it.rarity or 0, enh = it.enh or 0, ilvl = it.ilvl }
  end
  return out
end
function M.equipped(sv)
  local out = {}
  for _, slot in ipairs(Items.EQ_SLOTS) do local it = sv.equipped[slot]; if it then local b, a, sat = M.itemDetail(it); out[#out + 1] = { uid = it.uid, slot = slot, title = M.itemTitle(it), lines = M.itemLines(it), base = b, aff = a, satText = sat, wt = it.wt, rarity = it.rarity or 0, enh = it.enh or 0, ilvl = it.ilvl, sat = it.sat ~= nil } end end
  return out
end

-- 장착: 같은 부위 장비와 맞바꾼다 (반지는 ring / ring2 중 비어 있는 곳, 둘 다 차 있으면 ring 과 교체)
function M.equip(sv, uid, toSlot)   -- toSlot: 끌어다 놓은 칸 (반지는 ring / ring2 중 고를 수 있다)
  for i, it in ipairs(sv.inv) do
    if it.uid == uid then
      local slot = it.slot
      if slot == "ring" and sv.equipped.ring and not sv.equipped.ring2 then slot = "ring2" end
      if toSlot then if toSlot == it.slot or (it.slot == "ring" and toSlot == "ring2") then slot = toSlot else return false, "그 칸에는 낄 수 없습니다" end end
      local old = sv.equipped[slot]; sv.equipped[slot] = it; table.remove(sv.inv, i)
      if old then sv.inv[#sv.inv + 1] = old end
      return true
    end
  end
  return false, "없는 장비"
end
-- 시작 직업: 전사(검) / 마법사(지팡이) — 무기 · 기본 공격 · 범위 · 단일(보조) 스킬 3개 + 시작 아르카나 조각
M.START_KITS = {
  warrior = { wt = "sword", skills = { "strike", "rend", "smash" } },
  mage = { wt = "staff", skills = { "ember", "chain", "bomb" } },
}
M.START_ARCANA = 90   -- 시작 무료 10연차 1번. 시뮬레이션(sim/progress.lua): 스타터 세트만으로 초반 100% 클리어 → 시작 소환은 진행이 아니라 첫 뽑기 경험용
function M.pickStart(sv, cls)
  if not sv.needStart then return false, "이미 시작했습니다" end
  local K = M.START_KITS[cls]; if not K then return false, "없는 직업" end
  local rng = Random.new(sv.nextUid + 77)
  local w = Loot.genItem(rng, sv, 1, 0, "weapon"); local T = Items.WTYPES[K.wt]
  w.wt = K.wt; w.base = {}; if (T.atk or 0) > 0 then w.base.atk = T.atk end; if (T.mag or 0) > 0 then w.base.mag = T.mag end
  sv.equipped.weapon = w
  sv.skills = {}; sv.loadout = { false, false, false, false }; sv.slots = math.max(sv.slots or 3, 3)
  for i, id in ipairs(K.skills) do local k = { uid = sv.nextUid, id = id, rarity = 0, lvl = 1 }; sv.nextUid += 1; sv.skills[i] = k; sv.loadout[i] = { uid = k.uid, rule = "front" } end
  sv.arcana = (sv.arcana or 0) + M.START_ARCANA; sv.startClass = cls; sv.needStart = false; sv.tut = 0   -- 튜토리얼 진행 (새 계정만, 0 → 끝나면 99)
  return true
end
function M.unequip(sv, slot)   -- 착용 칸 → 가방
  local it = sv.equipped[slot]; if not it then return false end
  sv.equipped[slot] = nil; sv.inv[#sv.inv + 1] = it; return true
end
-- 판매/분해/일일/오프라인 (Extras)
function M.dismantle(sv, uid) return Extras.dismantle(sv, uid) end
-- 자동 정리: rules[등급+1] = 0 유지 · 1 판매 · 2 분해 (강화했거나 사탄 장비는 건드리지 않음 = 일괄 정리와 같은 조건)
-- ---------- 자동 분해 (웹 openAutoDis / autoProcess) ----------
-- 규칙: rules[0~3] 등급별(일반·매직·레어·전설) keep/sell/dis, satRule 사탄, keepUp ▲ 보호, tierX×tierN 전설 옵션 티어 기준, sTierX×sTierN 사탄 기준,
-- maxIlvl 아이템 레벨 상한(0 = 없음), always 모든 전투 후 적용. 착용 · 프리셋 장비는 가방에 없거나 보호된다.
local RULE_OK = { keep = true, sell = true, dis = true }
function M.autoRules(sv)
  local A = sv.autoR
  if not A then
    A = { rules = { [0] = "keep", "keep", "keep", "keep" }, satRule = "keep", keepUp = true, tierX = 0, tierN = 3, sTierX = 0, sTierN = 3, maxIlvl = 0, always = true }
    local old = sv.set or {}   -- 예전 설정(ar1~ar4: 0 유지 · 1 판매 · 2 분해)을 옮긴다
    for r = 0, 3 do local v = tonumber(old["ar" .. (r + 1)]) or 0; A.rules[r] = v == 1 and "sell" or (v == 2 and "dis" or "keep") end
    sv.autoR = A
  end
  return A
end
function M.autoSet(sv, k, v)
  local A = M.autoRules(sv)
  if k == "rule" and type(v) == "table" then local r = tonumber(v.r); if r and r >= 0 and r <= 3 and RULE_OK[v.v] then A.rules[r] = v.v end
  elseif k == "satRule" and RULE_OK[v] then A.satRule = v
  elseif (k == "keepUp" or k == "always") and type(v) == "boolean" then A[k] = v
  elseif (k == "tierX" or k == "sTierX" or k == "maxIlvl") and tonumber(v) then A[k] = math.clamp(floor(tonumber(v)), 0, 6)
  elseif (k == "tierN" or k == "sTierN") and tonumber(v) then A[k] = math.clamp(floor(tonumber(v)), 1, 5) end
  return A
end
local function goodAffixCount(it, X) local n = 0; for _, a in ipairs(it.affixes or {}) do if a.t ~= nil and a.t + 1 <= X then n += 1 end end; return n end
local function tierOn(A, it) if it.sat then return A.sTierX > 0 and A.sTierN > 0 end; return A.tierX > 0 and A.tierN > 0 end
local function tierKeep(A, it)
  if it.sat then return A.sTierX > 0 and A.sTierN > 0 and goodAffixCount(it, A.sTierX) >= A.sTierN end
  return A.tierX > 0 and A.tierN > 0 and (it.rarity or 0) >= 3 and goodAffixCount(it, A.tierX) >= A.tierN
end
local function ruleOf(A, it)
  local r = it.sat and A.satRule or A.rules[math.min(3, it.rarity or 0)]
  if tierOn(A, it) and not tierKeep(A, it) then return r == "sell" and "sell" or "dis" end
  return r
end
-- 전투력 (Power.lua, 시뮬레이션 보정): ▲ 판정 · 자동 장착 · 장비 비교에 쓴다
powerOf = function(sv) local ok, P = pcall(Power.of, sv); return ok and P or 0 end
function M.powerNow(sv) return powerOf(sv) end
local function slotsFor(it) return it.slot == "ring" and { "ring", "ring2" } or { it.slot } end
-- 이 장비를 꼈을 때 가장 높은 원전투력 (반지는 두 칸 중 좋은 쪽)
bestWith = function(sv, it)
  local best, bk = -1, nil
  for _, k in ipairs(slotsFor(it)) do
    local old = sv.equipped[k]; sv.equipped[k] = it
    local P = powerOf(sv); sv.equipped[k] = old
    if P > best then best, bk = P, k end
  end
  return best, bk
end
function M.isUpgrade(sv, it, base) base = base or powerOf(sv); return bestWith(sv, it) > base * 1.0005 end
-- 자동 장착: 가방에서 전투력이 가장 오르는 장비로 칸마다 바꾼다 (두 번 돌아 반지 · 세트 영향까지)
function M.autoEquip(sv)
  local changed = 0
  for _ = 1, 2 do
    for _, slot in ipairs(Items.EQ_SLOTS) do
      local base = powerOf(sv); local pick, pickI
      for i, it in ipairs(sv.inv) do
        if it.slot == slot or (slot == "ring2" and it.slot == "ring") then
          local old = sv.equipped[slot]; sv.equipped[slot] = it
          local P = powerOf(sv); sv.equipped[slot] = old
          if P > base * 1.0005 then base, pick, pickI = P, it, i end
        end
      end
      if pick then local old = sv.equipped[slot]; sv.equipped[slot] = pick; table.remove(sv.inv, pickI); if old then sv.inv[#sv.inv + 1] = old end; changed += 1 end
    end
  end
  return changed
end
local function presetUids(sv) local u = {}; for _, p in ipairs(sv.presets or {}) do if p then for _, id in pairs(p.equip or {}) do u[id] = true end end end; return u end
local function autoTargets(sv)
  local A = M.autoRules(sv); local prot = presetUids(sv); local base = A.keepUp and powerOf(sv) or 0
  local out = {}
  for i, it in ipairs(sv.inv) do
    local rule = ruleOf(A, it)
    if rule and rule ~= "keep" and not it.uniq and not prot[it.uid] and not (A.maxIlvl > 0 and (it.ilvl or 1) > A.maxIlvl) and not tierKeep(A, it)
      and not (A.keepUp and M.isUpgrade(sv, it, base)) then out[#out + 1] = { i = i, rule = rule } end
  end
  return out
end
function M.autoView(sv) local A = M.autoRules(sv); return { rules = { A.rules[0], A.rules[1], A.rules[2], A.rules[3] }, satRule = A.satRule, keepUp = A.keepUp, tierX = A.tierX, tierN = A.tierN, sTierX = A.sTierX, sTierN = A.sTierN, maxIlvl = A.maxIlvl, always = A.always, now = #autoTargets(sv) } end
function M.autoClean(sv, onlyAlways)
  local A = M.autoRules(sv)
  if onlyAlways and not A.always then return { n = 0, gold = 0, ore = 0 } end
  local T = autoTargets(sv)
  local n, sold, gold, ore = 0, 0, 0, 0
  for j = #T, 1, -1 do
    local it = table.remove(sv.inv, T[j].i); n += 1
    if T[j].rule == "sell" then gold += Extras.itemValue(it); sold += 1 else local y = Extras.dismantleYield(it); gold += y.gold; ore += y.ore end
  end
  sv.gold += gold; sv.ore += ore
  return { n = n, sold = sold, dis = n - sold, gold = gold, ore = ore }
end
-- 패시브 트리: 찍은 노드 목록 · 남은 포인트 / 노드 찍기(시작점에서 이어지는 경로를 한 번에)
function M.passView(sv)
  local t = {}; for id in pairs(sv.pass or {}) do t[#t + 1] = id end
  return { taken = t, left = Econ.passiveLeft(sv), points = Econ.passivePoints(sv) }
end
function M.passTake(sv, id) return Econ.addPassivePath(sv, tostring(id)) end
function M.passDrop(sv, id) return Econ.dropPassive(sv, tostring(id)) end
function M.atlasView(sv) return Econ.atlasView(sv) end
-- ---------- 창고 (웹 openStash: 장비 보관, 100칸에서 골드로 10칸씩 최대 500) ----------
local STASH_MAX, STASH_STEP = 500, 10
local function stash(sv) sv.stash = sv.stash or { items = {}, cap = 100 }; sv.stash.items = sv.stash.items or {}; sv.stash.cap = sv.stash.cap or 100; return sv.stash end
local function stashExpandCost(S) return S.cap >= STASH_MAX and nil or math.floor(300000 * 1.12 ^ ((S.cap - 100) / STASH_STEP) + 0.5) end
local function itemRow(it) return { uid = it.uid, slot = it.slot, title = M.itemTitle(it), lines = M.itemLines(it), sat = it.sat ~= nil, rarity = it.rarity or 0, enh = it.enh or 0, ilvl = it.ilvl } end
function M.stashView(sv)
  local S = stash(sv); local items = {}
  for i, it in ipairs(S.items) do items[i] = itemRow(it) end
  return { items = items, cap = S.cap, expandCost = stashExpandCost(S), inv = M.inventory(sv) }
end
function M.stashMove(sv, uid, toStash)
  local S = stash(sv); local from, to = toStash and sv.inv or S.items, toStash and S.items or sv.inv
  if toStash and #S.items >= S.cap then return false, "창고가 가득 찼습니다" end
  if not toStash and #sv.inv >= M.INV_MAX then return false, "가방이 가득 찼습니다" end
  for i, it in ipairs(from) do if it.uid == uid then table.remove(from, i); to[#to + 1] = it; return true end end
  return false, "없는 장비"
end
function M.stashExpand(sv)
  local S = stash(sv); local c = stashExpandCost(S)
  if not c then return false, "최대 크기입니다" end
  if sv.gold < c then return false, "골드가 부족합니다" end
  sv.gold -= c; S.cap += STASH_STEP; return true
end
-- ---------- 장비 프리셋 3칸 (웹 savePreset / loadPreset: 착용 장비 + 스킬 칸) ----------
function M.presetView(sv)
  local out = {}
  for i = 1, 3 do local p = sv.presets and sv.presets[i]; local n = 0; if p then for _ in pairs(p.equip) do n += 1 end end; out[i] = p and { items = n } or false end
  return out
end
function M.presetSave(sv, i)
  if i < 1 or i > 3 then return false end
  sv.presets = sv.presets or { false, false, false }
  local eq = {}; for _, s in ipairs(Items.EQ_SLOTS) do if sv.equipped[s] then eq[s] = sv.equipped[s].uid end end
  local lo = {}; for k = 1, 4 do local l = sv.loadout[k]; lo[k] = l and { uid = l.uid, rule = l.rule } or false end
  sv.presets[i] = { equip = eq, loadout = lo }; return true
end
function M.presetLoad(sv, i)
  local p = sv.presets and sv.presets[i]; if not p then return false, "빈 프리셋입니다" end
  for _, s in ipairs(Items.EQ_SLOTS) do if sv.equipped[s] then sv.inv[#sv.inv + 1] = sv.equipped[s]; sv.equipped[s] = nil end end
  for _, s in ipairs(Items.EQ_SLOTS) do
    local u = p.equip[s]
    if u then for j, it in ipairs(sv.inv) do if it.uid == u then table.remove(sv.inv, j); sv.equipped[s] = it; break end end end
  end
  local has = {}; for _, k in ipairs(sv.skills) do has[k.uid] = k.id end
  local seen = {}
  for k = 1, 4 do
    local l = p.loadout[k]
    if l and has[l.uid] and not seen[has[l.uid]] and k <= sv.slots then sv.loadout[k] = { uid = l.uid, rule = l.rule or "front" }; seen[has[l.uid]] = true else sv.loadout[k] = false end
  end
  return true
end
-- 세트 탭 (장비 · 스킬 · 패시브 따로 1~3번): 탭을 바꾸면 지금 구성을 현재 탭에 저장하고 새 탭 구성을 불러온다.
-- 한 번도 쓰지 않은 장비 · 스킬 탭은 지금 구성을 그대로 복사해서 시작하고, 패시브 탭은 빈 트리로 시작한다.
local function saveEquip(sv, i) local eq = {}; for _, s in ipairs(Items.EQ_SLOTS) do if sv.equipped[s] then eq[s] = sv.equipped[s].uid end end; sv.presets[i].equip = eq; sv.presets[i].eqSet = true end
local function saveLo(sv, i) local lo = {}; for k = 1, 4 do local l = sv.loadout[k]; lo[k] = l and { uid = l.uid, rule = l.rule } or false end; sv.presets[i].loadout = lo; sv.presets[i].loSet = true end
local function loadEquip(sv, p)
  for _, s in ipairs(Items.EQ_SLOTS) do if sv.equipped[s] then sv.inv[#sv.inv + 1] = sv.equipped[s]; sv.equipped[s] = nil end end
  for _, s in ipairs(Items.EQ_SLOTS) do
    local u = p.equip[s]
    if u then for j, it in ipairs(sv.inv) do if it.uid == u then table.remove(sv.inv, j); sv.equipped[s] = it; break end end end
  end
end
local function loadLo(sv, p)
  local has = {}; for _, k in ipairs(sv.skills) do has[k.uid] = k.id end
  local seen = {}
  for k = 1, 4 do
    local l = p.loadout[k]
    if l and has[l.uid] and not seen[has[l.uid]] and k <= sv.slots then sv.loadout[k] = { uid = l.uid, rule = l.rule or "front" }; seen[has[l.uid]] = true else sv.loadout[k] = false end
  end
end
function M.setsView(sv) local s = sv.sets or {}; return { gear = s.gear or 1, skill = s.skill or 1, pass = s.pass or 1 } end
function M.setSwitch(sv, kind, i)
  i = tonumber(i); if not i or i < 1 or i > 3 or (kind ~= "gear" and kind ~= "skill" and kind ~= "pass") then return false end
  sv.sets = sv.sets or {}; local cur = sv.sets[kind] or 1
  if cur == i then return true end
  sv.presets = sv.presets or { false, false, false }
  for j = 1, 3 do if not sv.presets[j] then sv.presets[j] = { equip = {}, loadout = {} } end end
  if kind == "gear" then saveEquip(sv, cur); if sv.presets[i].eqSet then loadEquip(sv, sv.presets[i]) else saveEquip(sv, i) end
  elseif kind == "skill" then saveLo(sv, cur); if sv.presets[i].loSet then loadLo(sv, sv.presets[i]) else saveLo(sv, i) end
  else
    sv.passSets = sv.passSets or {}
    sv.passSets[cur] = table.clone(sv.pass or {})
    sv.pass = sv.passSets[i] and table.clone(sv.passSets[i]) or {}
  end
  sv.sets[kind] = i
  return true
end
-- 스탯 화면 (웹 openStats 의 묶음): { {제목, { {이름, 값 문자열}, ... }}, ... }
function M.statsView(sv)
  local s = Stats.computeStats(sv)
  local function P(v, dg) return string.format("%." .. (dg or 0) .. "f%%", (v or 0) * 100) end
  local function N(v) v = math.floor(v or 0); if v >= 1e6 then return string.format("%.1fM", v / 1e6) elseif v >= 1e4 then return string.format("%.1fK", v / 1e3) end return tostring(v) end
  local G = {}
  G[#G + 1] = { "공격", { { "물리 공격력", N(s.atk) }, { "주문력", N(s.mag) }, { "물리 피해", P(s.physDmg) }, { "마법 피해", P(s.magDmg) }, { "주는 피해", P(s.allDmg) },
    { "물리 치명타", P(s.critChance, 1) .. " / +" .. P(s.critDmg) }, { "주문 치명타", P(s.spellCrit, 1) .. " / +" .. P(s.spellCritDmg or s.critDmg) }, { "쿨타임 감소", P(s.cdr) }, { "흡혈", P(s.lifesteal, 1) } } }
  G[#G + 1] = { "방어", { { "체력", N(s.maxHp) }, { "방어력", N(s.def) }, { "회피", P(s.dodge, 1) }, { "받는 피해", P(s.dmgTaken) }, { "초당 회복", P(s.regen, 1) } } }
  G[#G + 1] = { "마나", { { "최대 마나", N(s.maxMana) }, { "초당 재생", P(s.manaRate, 1) } } }
  local el = {}; for _, e in ipairs(Items.ELEMS or { "fire", "cold", "light", "void" }) do el[#el + 1] = { string.format("%s 피해", (Items.ELEM_NAME or {})[e] or e), P(s[e .. "Dmg"]) } end
  el[#el + 1] = { "원소 피해", P(s.elemDmg) }; el[#el + 1] = { "속성 저항 관통", P(s.penElem) }; el[#el + 1] = { "방어 무시", P(s.ignoreDef) }; el[#el + 1] = { "지속 피해", P(s.dotDmg) }
  G[#G + 1] = { "속성 · 관통", el }
  G[#G + 1] = { "추가 피해", { { "보스", P(s.add.boss) }, { "정예", P(s.add.elite) }, { "원거리", P(s.add.ranged) }, { "일반", P(s.add.normal) }, { "광역 피해", P(s.aoeDmg) }, { "레인", tostring(s.lanes) } } }
  G[#G + 1] = { "획득", { { "MF", P(s.mf + Econ.atlasVal(sv, "mf")) }, { "골드 획득", P(s.goldFind + Econ.atlasVal(sv, "gold")) }, { "균열 조각", tostring(sv.shards or 0) } } }
  return G
end
function M.atlasBuy(sv, id) return Econ.atlasBuy(sv, id) end
function M.gachaView(sv) return Econ.gachaView(sv) end
function M.gachaPull(sv, n, pay, fam) return Econ.gachaPull(sv, n, pay, Random.new(os.clock() * 1e6 + sv.nextUid), fam) end
-- 기록 (웹 openRecords)
function M.records(sv)
  local st = sv.stats or {}
  local owned = {}; for _, k in ipairs(sv.skills) do owned[k.id] = true end
  return { rows = {
    { "레벨", tostring(sv.level) }, { "처치한 몬스터", tostring(st.kills or 0) }, { "클리어한 전투", tostring(st.clears or 0) },
    { "스테이지", string.format("%d/5", sv.cleared or 0) }, { "균열 최고층", string.format("%d층", sv.rift and sv.rift.best or 0) },
    { "솟아난 탑 최고층", string.format("%d층", sv.spire and sv.spire.best or 0) }, { "무한 균열 최고 웨이브", tostring(sv.endless and sv.endless.best or 0) },
    { "문지기 처치", (sv.raid and (sv.raid.cleared or 0) > 0) and "예" or "아니오" }, { "전직", string.format("%d차", sv.cls or 0) },
    { "보유 장비", tostring(#sv.inv) }, { "보유 아르카나", tostring(#sv.skills) }, { "균열 조각", tostring(sv.shards or 0) } }, owned = owned }
end
function M.skillClean(sv, rules, keepBest)
  local busy = {}
  if sv.passive then busy[sv.passive] = true end
  for _, l in ipairs(sv.loadout) do if l then busy[l.uid] = true end end
  for _, p in ipairs(sv.presets or {}) do if p then for _, l in ipairs(p.loadout or {}) do if l then busy[l.uid] = true end end end end
  local best = {}
  if keepBest then for _, k in ipairs(sv.skills) do local b = best[k.id]; if not b or (k.rarity or 0) > (b.rarity or 0) or ((k.rarity or 0) == (b.rarity or 0) and (k.lvl or 1) > (b.lvl or 1)) then best[k.id] = k end end end
  local sold, gold = 0, 0
  for i = #sv.skills, 1, -1 do
    local k = sv.skills[i]; local r = (k.rarity or 0)
    if r <= 2 and tonumber(rules and rules[r + 1]) == 1 and not busy[k.uid] and not k.rune and (k.lvl or 1) <= 1 and best[k.id] ~= k then
      local ok, v = Econ.sellSkill(sv, k.uid); if ok then sold += 1; gold += v end   -- (분해: v = 연마석)
    end
  end
  return { sold = sold, gold = 0, arcana = gold }
end
-- 세공의 인장 (웹 rerollSockets): 소켓이 있는 전설 장비의 소켓 수를 1~3개로 다시 정한다 (끼운 돌은 사라짐) · 소켓 돌 삭제
local function findAny(sv, uid) for _, s in ipairs(Items.EQ_SLOTS) do local it = sv.equipped[s]; if it and it.uid == uid then return it end end for _, it in ipairs(sv.inv) do if it.uid == uid then return it end end end
function M.sockRoll(sv, uid, rng)
  local it = findAny(sv, uid)
  if not it or not it.sock or (it.rarity or 0) < 3 then return false, "소켓이 있는 전설 장비에만 쓸 수 있습니다" end
  if (sv.sockTix or 0) < 1 then return false, "세공의 인장이 없습니다" end
  local nn = (rng or Random.new()):NextInteger(1, 3); local old = #it.sock
  sv.sockTix -= 1; it.sock = {}; for i = 1, nn do it.sock[i] = false end
  return true, string.format("소켓 %d개 → %d개", old, nn)
end
function M.sockDel(sv, uid, idx)
  local it = findAny(sv, uid); if not it or not it.sock or not it.sock[idx] then return false, "빈 소켓입니다" end
  it.sock[idx] = false; return true, "소켓의 돌을 삭제했습니다"
end
function M.sell(sv, uid) return Extras.sell(sv, uid) end
function M.bulk(sv, r, mode) return Extras.bulk(sv, tonumber(r) or 0, mode == "sell" and "sell" or "dismantle") end
function M.daily(sv) return Extras.dailyView(sv) end
function M.dailyClaim(sv, id) return Extras.dailyClaim(sv, id) end
function M.offline(sv) return Extras.offline(sv) end
function M.runes(sv) return Extras.runeView(sv) end
function M.runeEquip(sv, su, ru) return Extras.runeEquip(sv, su, ru) end
function M.runeRemove(sv, su) return Extras.runeRemove(sv, su) end
function M.quests(sv) return Extras.questView(sv) end
function M.questClaim(sv, id) return Extras.questClaim(sv, id) end

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
    res.arcana = Econ.addArcana(sv, 3 + (boss and 5 or 0) + (first and 10 or 0))
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
    res.gold = floor(b.gold * (1 + Econ.atlasVal(sv, "gold"))); sv.gold += res.gold; sv.stats.kills += b.kills; sv.stats.clears += 1
    local boss = node.kind == "boss" or (kind == "rift" and n % 5 == 0)
    Extras.onWin(sv, b.kills, boss, kind == "rift"); Extras.setRate(sv, b.gold, b.time)
    if kind == "stage" then Extras.questEvent(sv, "kill", b.kills); if node.kind == "boss" then Extras.questEvent(sv, "boss", 1) end end
    if kind == "rift" then Extras.questEvent(sv, "rift", 1); if boss and rng:NextNumber() < 0.2 then local rid = Extras.randomRune(rng); Extras.addRune(sv, rid); res.rune = rid end end
    local mfv = math.max(0, Stats.computeStats(sv).mf + Econ.atlasVal(sv, "mf") + 0.01 * (sv.guildLv or 0))
    local d = Loot.fieldDrops(rng, sv, node, boss, 1 + mfv / (1 + mfv / CFG.MF_HALF))   -- 웹 mfEff
    do local om = 1 + Econ.atlasVal(sv, "orb"); local function roll(x) x *= om; return floor(x) + (rng:NextNumber() < x - floor(x) and 1 or 0) end; d.orbC = roll(d.orbC or 0) end   -- 혼돈의 인장
    if (d.orbC or 0) > 0 then sv.orbC = (sv.orbC or 0) + d.orbC; res.orbC = d.orbC end; if d.stones and d.stones > 0 then res.stones = d.stones; for _ = 1, d.stones do Econ.addStone(sv, false) end end
    d.ore = floor(d.ore * (1 + Econ.atlasVal(sv, "ore")) + 0.5)
    sv.ore += d.ore; res.ore = d.ore; if d.hone then sv.arcana = (sv.arcana or 0) + d.hone; res.arcana = (res.arcana or 0) + d.hone end   -- (연마석 드랍 → 아르카나 조각); if d.orbC > 0 then sv.orbC += d.orbC; res.orbC = d.orbC end
    if kind == "rift" then local sh = floor((1 + floor(n / 6) + (boss and 3 or 0)) * (1 + Econ.atlasVal(sv, "shard")) + 0.5); sv.shards = (sv.shards or 0) + sh; res.shards = sh end
    for _, it in ipairs(d.items) do if #sv.inv < M.INV_MAX then sv.inv[#sv.inv + 1] = it; res.items[#res.items + 1] = { title = M.itemTitle(it) } else res.full = true end end
    if kind == "stage" and n > (sv.cleared or 0) then
      sv.cleared = n; res.first = true
      if n >= 3 and sv.slots < 3 then sv.slots = 3; res.note = "3번 아르카나 칸이 열렸습니다!" end
      if n >= CFG.STAGES then
        if sv.slots < 4 then sv.slots = 4; res.note = "4번 아르카나 칸이 열렸습니다!" end
        sv.lanesBase = CFG.ENDGAME_LANES; res.note = (res.note or "") .. " 스테이지 클리어! 영구 3레인과 '심연의 균열'이 열립니다."
      end
    end
    do local first = (kind == "stage" and res.first) or (kind == "rift" and n > sv.rift.best)
      res.arcana = Econ.addArcana(sv, (kind == "rift" and 1 + floor(n / 20) or 1) + (boss and 3 or 0) + (first and 5 or 0)) end
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
-- 아르카나(스킬) 목록 + 실제 수치: 쿨타임(쿨감 적용) · 사거리 · 마나 · 1회 위력 · 초당 피해(내 능력치로 계산) · 범위 모양
local AREA = { single = "단일", multi = "3x3 범위", cone = "앞 부채꼴", pierce = "한 줄 관통", chain = "연쇄", nova = "사거리 안 전체", meteor = "무작위 낙하", zone = "한 줄 3칸 지속", zone2 = "구역 지속",
  spray = "여러 발 난사", orbit = "주위를 도는 구체", aura = "앞줄 지속", trap = "지뢰 3x3", rain = "무작위 낙뢰", summon = "소환수", hole = "끌어당기는 구역", bounce = "튕기며 여러 번", shuri = "구간 지속", boomer = "줄 관통 왕복", buff = "강화", heal = "회복" }
function M.skills(sv)
  local rows = Econ.skillList(sv)
  local s = Stats.computeStats(sv)
  local byUid = {}; for _, k in ipairs(sv.skills) do byUid[k.uid] = k end
  for _, r in ipairs(rows) do
    local inst = byUid[r.uid]
    if inst then
      local k = Battle.skillOf(inst)
      r.cd = math.max(0.2, (k.cd or 1) * (1 - (s.cdr or 0))); r.range = k.range; r.mana = math.floor((k.mana or 0) + 0.5)
      r.mult = k.mult * ((k.hits or 1) * (k.hitMul or 1)); r.area = AREA[k.kind] or k.kind; r.elem = k.elem; r.basic = k.slot == "basic"
      r.count = k.count; r.jumps = k.jumps; r.dur = k.dur
      local ok, d = pcall(Power.detail, s, { k }, 1); r.dps = ok and d and d.dps or nil
    end
  end
  return rows
end
function M.levelUp(sv, uid) return Econ.levelUpSkill(sv, uid) end
function M.equipSkill(sv, slot, uid, rule) return Econ.equipSkill(sv, slot, uid, rule) end
function M.sellSkill(sv, uid) return Econ.sellSkill(sv, uid) end
function M.autoPassives(sv) return Econ.autoPassives(sv) end
function M.resetPassives(sv) Econ.resetPassives(sv); return true end
function M.passiveInfo(sv) return { points = Econ.passivePoints(sv), left = Econ.passiveLeft(sv), taken = (function() local n = 0 for _ in pairs(sv.pass or {}) do n += 1 end return n end)() } end
function M.enhance(sv, uid, seed)
  local it = sv.equipped.weapon and nil
  for _, slot in ipairs(Items.EQ_SLOTS) do if sv.equipped[slot] and sv.equipped[slot].uid == uid then it = sv.equipped[slot] end end
  if not it then for _, x in ipairs(sv.inv) do if x.uid == uid then it = x end end end
  if not it then return false, "없는 장비" end
  local ok, msg = Econ.enhance(sv, it, Random.new((seed or os.time()) + uid))
  if ok then Extras.questEvent(sv, "enhance", 1) end
  return ok, msg
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
      for i, a in ipairs(it.affixes) do affs[i] = { text = M.affixText(a):gsub("%s+%[T%d+%]$", ""), locked = Econ.rerollLocked(it, i - 1), t = a.t and (a.t + 1) or nil } end
      local socks = {}; for i, s2 in ipairs(it.sock or {}) do socks[i] = s2 and (AFFIX_BY[s2.k] and AFFIX_BY[s2.k].name or s2.k) .. " +" .. (s2.v < 5 and string.format("%.1f%%", s2.v * 100) or tostring(s2.v)) or false end
      out[#out + 1] = { uid = it.uid, slot = slot, title = M.itemTitle(it), enh = it.enh or 0, enhGold = c.gold, enhOre = c.ore, rerollGold = rc.gold, rerollOre = rc.ore, affixes = affs, sockets = socks, affCount = #it.affixes, rarity = it.rarity or 0, sat = it.sat ~= nil, ilvl = it.ilvl }
    end
  end
  return out
end
function M.reroll(sv, uid, idx, seed) local it = findItem(sv, uid); if not it then return false, "없는 장비" end return Econ.rerollAffix(sv, it, tonumber(idx), Random.new((seed or os.time()) + uid)) end
function M.chaos(sv, uid, seed) local it = findItem(sv, uid); if not it then return false, "없는 장비" end return Econ.addAffix(sv, it, Random.new((seed or os.time()) + uid)) end
function M.divine(sv, uid, seed) local it = findItem(sv, uid); if not it then return false, "없는 장비" end return Econ.divine(sv, it, Random.new((seed or os.time()) + uid)) end
function M.stones(sv) return Econ.stoneList(sv) end
function M.reveal(sv, uid, seed) local a, b = Econ.revealStone(sv, uid, Random.new((seed or os.time()) + uid)); if a then Extras.questEvent(sv, "stone", 1) end; return a, b end
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
    warden = Content.wardenOpen(sv), tower2 = Content.tower2Open(sv), class = (sv.raid and sv.raid.tower) and true or false, charm = (sv.cls or 0) >= 3, keys = sv.keys or 0, keys2 = sv.keys2 or 0, keys3 = sv.keys3 or 0, keys4 = sv.keys4 or 0, keys5 = sv.keys5 or 0, keys6 = sv.keys6 or 0,
    -- 지도 전용 창 표시용: 레이드 클리어 · 상위 관문 · 신전 단계 · 무한 균열 남은 횟수 · 관문 난이도
    craidDone = { (sv.craid and sv.craid[1] == 1) or false, (sv.craid and sv.craid[2] == 1) or false, (sv.craid and sv.craid[3] == 1) or false }, up = (sv.craid and sv.craid[2]) and true or false,
    spireBest = sv.spire and sv.spire.best or 0, endlessLeft = math.max(0, CFG.ENDLESS_DAILY + Econ.atlasVal(sv, "endless") - ((sv.endless and sv.endless.day == math.floor(os.time() / 86400) and sv.endless.used) or 0)),
    gateTiers = Content.GATE_TIERS, upTiers = Content.UP_TIERS }
end

return M
