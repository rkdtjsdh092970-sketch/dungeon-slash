-- 일일 목표 · 오프라인 보상 · 장비 판매/분해 (웹 state.js 포팅)
local Items = require(script.Parent.Data.Items)
local M = {}
local floor, max, min = math.floor, math.max, math.min
local SELL_R = { 1, 1.7, 3.2, 6, 9, 15 }

M.DAILY_TASKS = {
  { id = "kill", name = "몬스터 처치", n = 300, key = "kills", reward = { arcana = 5, gold = 800 }, text = "아르카나 조각 5 · 800G" },
  { id = "clear", name = "스테이지 클리어", n = 8, key = "clears", reward = { ore = 12 }, text = "강화석 12" },
  { id = "boss", name = "보스 처치", n = 3, key = "bosses", reward = { orbC = 1 }, text = "혼돈 구슬 1" },
  { id = "rift", name = "균열 클리어 (엔드게임)", n = 3, key = "rifts", reward = { orbC = 1, shards = 5 }, text = "혼돈 구슬 1 · 균열 조각 5", endgame = true },
}
local function today() return floor(os.time() / 86400) end
function M.dailyState(sv)
  if not sv.daily or sv.daily.day ~= today() then sv.daily = { day = today(), kills = 0, clears = 0, bosses = 0, rifts = 0, claimed = {} } end
  return sv.daily
end
function M.dailyAdd(sv, key, n) local D = M.dailyState(sv); D[key] = (D[key] or 0) + (n or 1) end
function M.dailyView(sv)
  local D, out = M.dailyState(sv), {}
  for _, t in ipairs(M.DAILY_TASKS) do
    if not t.endgame or sv.graduated or (sv.cleared or 0) >= 5 then
      out[#out + 1] = { id = t.id, name = t.name, n = t.n, p = min(t.n, D[t.key] or 0), text = t.text, claimed = D.claimed[t.id] == true }
    end
  end
  return out
end
function M.dailyClaim(sv, id)
  local D = M.dailyState(sv)
  for _, t in ipairs(M.DAILY_TASKS) do
    if t.id == id then
      if D.claimed[id] or (D[t.key] or 0) < t.n then return false, "아직 받을 수 없습니다" end
      D.claimed[id] = true
      for k, v in pairs(t.reward) do k = k == "hone" and "arcana" or k; sv[k] = (sv[k] or 0) + v end
      sv.arcana = (sv.arcana or 0) + 10   -- 일일 과제: 아르카나 조각 +10
      return true
    end
  end
  return false, "없는 목표"
end
-- 전투 결과를 일일 카운터에 반영
function M.onWin(sv, kills, boss, rift)
  M.dailyAdd(sv, "kills", kills or 0); M.dailyAdd(sv, "clears", 1)
  if boss then M.dailyAdd(sv, "bosses", 1) end
  if rift then M.dailyAdd(sv, "rifts", 1) end
end

-- 오프라인 보상: 마지막 접속 후 10분 이상, 최대 8시간, 마지막 전투의 분당 골드 × 35%
function M.offline(sv, now)
  now = now or os.time()
  local last = sv.lastSeen; sv.lastSeen = now
  if not last then return nil end
  local away = (now - last) / 60
  if away < 10 then return nil end
  local mins = min(away, 480)
  local g = floor(((sv.rate and sv.rate.gold) or 0) * mins * 0.35 + 0.5)
  local ore = floor(mins / 20)
  if g + ore <= 0 then return nil end
  sv.gold += g; sv.ore += ore
  return { mins = floor(mins), gold = g, ore = ore }
end
function M.setRate(sv, gold, seconds)
  if seconds and seconds > 0 then sv.rate = { gold = gold / seconds * 60 } end
end

-- 장비 판매/분해
function M.itemValue(it)
  return max(1, floor(7 * Items.TIER_SCALE[max(1, min(6, it.ilvl or 1))] * SELL_R[min(6, (it.rarity or 0) + 1)] * (1 + (it.enh or 0) * 0.5) + 0.5))
end
function M.dismantleYield(it)
  return { gold = floor(M.itemValue(it) * 0.5 + 0.5), ore = max(1, floor(((it.rarity + 1) * 0.9 + (it.enh or 0) * 0.6) + 0.5)) }
end
local function take(sv, uid)
  for i, it in ipairs(sv.inv) do if it.uid == uid then table.remove(sv.inv, i); return it end end
end
function M.sell(sv, uid)
  local it = take(sv, uid); if not it then return false, "없는 장비" end
  local v = M.itemValue(it); sv.gold += v; return true, v
end
function M.dismantle(sv, uid)
  local it = take(sv, uid); if not it then return false, "없는 장비" end
  local y = M.dismantleYield(it); sv.gold += y.gold; sv.ore += y.ore; return true, y
end
-- 일괄 정리: 등급 이하(희귀도 0~maxRarity, 위성/강화 제외)를 판매 또는 분해
function M.bulk(sv, maxRarity, mode)
  local n, gold, ore = 0, 0, 0
  for i = #sv.inv, 1, -1 do
    local it = sv.inv[i]
    if it.rarity <= maxRarity and not it.sat and (it.enh or 0) == 0 then
      table.remove(sv.inv, i); n += 1
      if mode == "sell" then gold += M.itemValue(it) else local y = M.dismantleYield(it); gold += y.gold; ore += y.ore end
    end
  end
  sv.gold += gold; sv.ore += ore
  return { n = n, gold = gold, ore = ore }
end

-- ---- 룬 ----
local SK = require(script.Parent.Data.Skills)
local RUNE_IDS = {}; for id in pairs(SK.RUNES) do RUNE_IDS[#RUNE_IDS + 1] = id end; table.sort(RUNE_IDS)
function M.addRune(sv, id) sv.runes = sv.runes or {}; sv.nextUid = (sv.nextUid or 1); sv.runes[#sv.runes + 1] = { uid = sv.nextUid, id = id }; sv.nextUid += 1 end
function M.randomRune(rng) return RUNE_IDS[rng:NextInteger(1, #RUNE_IDS)] end
function M.runeView(sv)
  local out = {}
  for _, r in ipairs(sv.runes or {}) do local d = SK.RUNES[r.id]; if d then out[#out + 1] = { uid = r.uid, id = r.id, name = d.name, text = d.text } end end
  return out
end
local function findSkill(sv, uid) for _, k in ipairs(sv.skills) do if k.uid == uid then return k end end end
function M.runeEquip(sv, skillUid, runeUid)
  local k = findSkill(sv, skillUid); if not k then return false, "없는 아르카나" end
  for i, r in ipairs(sv.runes or {}) do
    if r.uid == runeUid then
      table.remove(sv.runes, i)
      if k.rune then M.addRune(sv, k.rune) end
      k.rune = r.id; return true
    end
  end
  return false, "없는 룬"
end
function M.runeRemove(sv, skillUid)
  local k = findSkill(sv, skillUid); if not k or not k.rune then return false, "룬이 없습니다" end
  M.addRune(sv, k.rune); k.rune = nil; return true
end

-- ---- 퀘스트 (1막) ----
M.QUESTS = {
  { id = "k1", title = "소탕", desc = "적 150마리 처치", type = "kill", n = 150, reward = { gold = 40, ore = 2 } },
  { id = "m1", title = "첫 군주", desc = "스테이지 보스 처치", type = "boss", n = 1, reward = { gold = 60, ore = 4 } },
  { id = "f1", title = "대장장이의 부탁", desc = "장비 2번 강화", type = "enhance", n = 2, reward = { gold = 80, ore = 4 } },
  { id = "f2", title = "소켓의 비밀", desc = "원초의 돌 1개 확인", type = "stone", n = 1, reward = { gold = 400, ore = 6 } },
  { id = "r1", title = "균열의 도전자", desc = "균열 3층 클리어", type = "rift", n = 3, reward = { gold = 300, ore = 10, shards = 3 } },
}
function M.questEvent(sv, typ, n)
  sv.q = sv.q or {}
  for _, d in ipairs(M.QUESTS) do
    if d.type == typ then
      local st = sv.q[d.id]; if not st then st = { p = 0, state = "active" }; sv.q[d.id] = st end
      if st.state == "active" then st.p = min(d.n, st.p + (n or 1)); if st.p >= d.n then st.state = "done" end end
    end
  end
end
function M.questView(sv)
  sv.q = sv.q or {}; local out = {}
  for _, d in ipairs(M.QUESTS) do
    local st = sv.q[d.id] or { p = 0, state = "active" }
    local RN = { gold = "골드", ore = "강화석", orbC = "혼돈 구슬", arcana = "아르카나 조각", hone = "아르카나 조각", shards = "균열 조각", keys = "공허의 열쇠", gems = "보석" }
    local rw = {}; for k, v in pairs(d.reward or {}) do rw[#rw + 1] = string.format("%s %s", RN[k] or k, tostring(v)) end; table.sort(rw); rw[#rw + 1] = "아르카나 조각 5"
    out[#out + 1] = { id = d.id, title = d.title, desc = d.desc, n = d.n, p = st.p, state = st.state, reward = table.concat(rw, " · ") }
  end
  return out
end
function M.questClaim(sv, id)
  local st = sv.q and sv.q[id]; if not st or st.state ~= "done" then return false, "아직 받을 수 없습니다" end
  for _, d in ipairs(M.QUESTS) do if d.id == id then for k, v in pairs(d.reward) do k = k == "hone" and "arcana" or k; sv[k] = (sv[k] or 0) + v end end end
  sv.arcana = (sv.arcana or 0) + 5   -- 퀘스트: 아르카나 조각 +5
  st.state = "claimed"; return true
end
return M
