-- 길드 서비스 (서버). 저장소는 store:get(key) / store:set(key, value) 로 추상화한다 (DataStore 어댑터는 Guild.datastoreStore).
-- 웹 버전 기능(창설 · 가입 · 탈퇴 · 기부 · 공지 · 레벨 패시브)을 옮기고, 아래를 새로 넣었다:
--   · 주간 길드 목표 (길드원 합산 처치/보스/탑 클리어) — 달성 시 길드원 각자 보상 수령 + 길드 코인
--   · 길드 보스 (60초 허수아비 딜 대결) — 길드 안 주간 순위 보상 + 길드 합산 기록
--   · 길드 상점 (길드 코인 → 편의 재화, 주간 구매 한도). 진행(전직서 · 사탄 · 참 · 신화 스킬)은 팔지 않는다.
local M = {}

M.CFG = {
  CREATE_COST = 20000, MAX_MEMBERS = 30, DONATE_MIN = 100, DONATE_DAILY_MAX = 5000000, MOTD_MAX = 60,
  GOAL_PER_MEMBER = { kill = 150, boss = 6, clear = 12 },   -- 길드원 1명당 주간 목표 (합산)
  GOAL_REWARD = { ore = 12, coinsGuild = 30 },              -- 목표 1개 달성 보상 (길드원 각자 ore, 길드 코인은 길드 전체에 적립)
  BOSS_SECONDS = 60, BOSS_ATTEMPTS = 3,
  BOSS_REWARD = { [1] = { ore = 40, orbC = 3 }, [2] = { ore = 25, orbC = 2 }, [3] = { ore = 15, orbC = 1 }, default = { ore = 8 } },
}
M.SHOP = {   -- 길드 코인 상점 (주간 한도). 판매 금지 항목은 Monetization.FORBIDDEN 과 같다.
  { id = "ore",     name = "강화석 꾸러미", cost = 60,  weekly = 5, grant = { ore = 300 } },
  { id = "orbC",    name = "혼돈 구슬 3개", cost = 90,  weekly = 3, grant = { orbC = 3 } },
  { id = "keys",    name = "입장 열쇠 1개", cost = 120, weekly = 2, grant = { upKeys = 1 } },
  { id = "hone",    name = "연마석 20개",   cost = 70,  weekly = 4, grant = { hone = 20 } },
}

local loadG
local function level(exp) return math.min(10, 1 + math.floor(math.sqrt(exp / 50000))) end
M.level = level
function M.weekKey(t) return math.floor(((t or os.time()) - 4 * 86400) / 604800) end   -- 월요일 00:00(UTC) 기준 주
function M.dayKey(t) return math.floor((t or os.time()) / 86400) end

local function validName(n)
  if type(n) ~= "string" then return false end
  local len = utf8.len(n); if not len or len < 2 or len > 12 then return false end
  for _, c in utf8.codes(n) do
    local ok = (c >= 48 and c <= 57) or (c >= 65 and c <= 90) or (c >= 97 and c <= 122) or c == 95 or (c >= 0xAC00 and c <= 0xD7A3)
    if not ok then return false end
  end
  return true
end

-- ---------- 저장소 ----------
function M.memoryStore() local d = {}; return { get = function(_, k) return d[k] end, set = function(_, k, v) d[k] = v end, _d = d } end
-- DataStore 는 숫자 키(userId) 테이블을 못 저장한다 → 저장할 때 키를 "#123" 문자열로, 읽을 때 숫자로 되돌린다.
local function enc(v)
  if type(v) ~= "table" then return v end
  local o = {}; for k, x in pairs(v) do o[type(k) == "number" and ("#" .. k) or k] = enc(x) end; return o
end
local function dec(v)
  if type(v) ~= "table" then return v end
  local o = {}; for k, x in pairs(v) do local n = type(k) == "string" and k:match("^#(%-?%d+)$"); o[n and tonumber(n) or k] = dec(x) end; return o
end
M._enc, M._dec = enc, dec
function M.datastoreStore(ds)   -- DataStoreService:GetDataStore("Guilds") 를 감싼다
  return {
    get = function(_, k) local ok, v = pcall(function() return ds:GetAsync(k) end); if ok and v ~= nil then return dec(v) end return nil end,
    set = function(_, k, v)
      if v == nil then pcall(function() ds:RemoveAsync(k) end) else pcall(function() ds:SetAsync(k, enc(v)) end) end
    end,
  }
end
-- 길드 목록 색인 (가입 화면용): idx = { [id] = 이름 }
local function idxSet(store, id, name) local ix = store:get("idx") or {}; ix[id] = name; store:set("idx", ix) end
function M.list(store)
  local out = {}; for id, name in pairs(store:get("idx") or {}) do local g = loadG(store, id); if g then out[#out + 1] = { id = id, name = g.name, members = M.memberCount(g), lv = M.level(g.exp), leader = g.members[g.leader] and g.members[g.leader].name or "?" } end end
  table.sort(out, function(a, b) return a.lv > b.lv end); return out
end

loadG = function(store, id) return store:get("g:" .. id) end
local function saveG(store, g) store:set("g:" .. g.id, g) end
local function weekOf(g, now)
  local wk = M.weekKey(now)
  if not g.week or g.week.key ~= wk then g.prev = g.week; g.week = { key = wk, prog = { kill = 0, boss = 0, clear = 0 }, claimed = {}, boss = {}, bossTries = {}, shop = {} } end
  return g.week
end
local function members(g) local n = 0; for _ in pairs(g.members) do n += 1 end return n end
M.memberCount = members
M.level = level

function M.guildOf(store, uid) local id = store:get("m:" .. uid); return id and loadG(store, id) or nil end

function M.create(store, uid, uname, name, gold, now)
  if store:get("m:" .. uid) then return nil, "이미 길드에 가입해 있습니다" end
  if not validName(name) then return nil, "길드 이름은 2~12자 (한글 · 영문 · 숫자 · _)" end
  if (gold or 0) < M.CFG.CREATE_COST then return nil, "골드가 부족합니다" end
  if store:get("n:" .. string.lower(name)) then return nil, "이미 있는 이름입니다" end
  local id = tostring((store:get("seq") or 0) + 1); store:set("seq", tonumber(id))
  local g = { id = id, name = name, leader = uid, exp = 0, coins = 0, motd = "", created = now or os.time(), members = { [uid] = { name = uname, joined = now or os.time(), power = 0, donated = 0, dayKey = 0, dayDonate = 0 } } }
  saveG(store, g); store:set("m:" .. uid, id); store:set("n:" .. string.lower(name), id); idxSet(store, id, name)
  return g, nil, M.CFG.CREATE_COST   -- 세 번째 값 = 차감할 골드
end
function M.join(store, uid, uname, id)
  if store:get("m:" .. uid) then return nil, "이미 길드에 가입해 있습니다" end
  local g = loadG(store, id); if not g then return nil, "없는 길드" end
  if members(g) >= M.CFG.MAX_MEMBERS then return nil, "길드가 가득 찼습니다(" .. M.CFG.MAX_MEMBERS .. "명)" end
  g.members[uid] = { name = uname, joined = os.time(), power = 0, donated = 0, dayKey = 0, dayDonate = 0 }; saveG(store, g); store:set("m:" .. uid, id); return g
end
function M.leave(store, uid)
  local g = M.guildOf(store, uid); if not g then return nil, "길드가 없습니다" end
  g.members[uid] = nil; store:set("m:" .. uid, nil)
  if members(g) == 0 then store:set("n:" .. string.lower(g.name), nil); store:set("g:" .. g.id, nil); local ix = store:get("idx") or {}; ix[g.id] = nil; store:set("idx", ix); return { disbanded = true } end
  if g.leader == uid then   -- 전투력이 가장 높은 길드원에게 길드장을 넘긴다
    local best, bp = nil, -1; for u, m in pairs(g.members) do if (m.power or 0) > bp then bp = m.power or 0; best = u end end; g.leader = best
  end
  saveG(store, g); return g
end
function M.setMotd(store, uid, text)
  local g = M.guildOf(store, uid); if not g then return nil, "길드가 없습니다" end
  if g.leader ~= uid then return nil, "길드장만 가능합니다" end
  g.motd = string.sub(tostring(text or ""), 1, M.CFG.MOTD_MAX * 3); saveG(store, g); return g
end
function M.donate(store, uid, gold, now)
  local g = M.guildOf(store, uid); if not g then return nil, "길드가 없습니다" end
  gold = math.floor(gold or 0); if gold < M.CFG.DONATE_MIN then return nil, "최소 " .. M.CFG.DONATE_MIN .. "G" end
  local m = g.members[uid]; local dk = M.dayKey(now); if m.dayKey ~= dk then m.dayKey = dk; m.dayDonate = 0 end
  if m.dayDonate + gold > M.CFG.DONATE_DAILY_MAX then return nil, "하루 기부 한도를 넘었습니다" end
  m.dayDonate += gold; m.donated += gold; g.exp += gold; g.coins += math.floor(gold / 1000); saveG(store, g)
  return g, nil, gold   -- 세 번째 값 = 차감할 골드
end
function M.updatePower(store, uid, power) local g = M.guildOf(store, uid); if g then g.members[uid].power = power; saveG(store, g) end end

-- ---------- 주간 길드 목표 ----------
function M.goals(g, now)
  local w = weekOf(g, now); local n = members(g); local out = {}
  for _, k in ipairs({ "kill", "boss", "clear" }) do out[#out + 1] = { id = k, goal = M.CFG.GOAL_PER_MEMBER[k] * n, prog = w.prog[k], done = w.prog[k] >= M.CFG.GOAL_PER_MEMBER[k] * n } end
  return out
end
function M.record(store, uid, kind, amount, now)   -- 전투 결과에서 호출: kind = kill | boss | clear
  local g = M.guildOf(store, uid); if not g or not M.CFG.GOAL_PER_MEMBER[kind] then return end
  local w = weekOf(g, now); local before = M.goals(g, now); w.prog[kind] += amount
  for i, goal in ipairs(M.goals(g, now)) do if goal.done and not before[i].done then g.coins += M.CFG.GOAL_REWARD.coinsGuild end end
  saveG(store, g)
end
function M.claimGoals(store, uid, now)   -- 달성한 목표 수만큼 보상 (주 1회, 길드원 각자)
  local g = M.guildOf(store, uid); if not g then return nil, "길드가 없습니다" end
  local w = weekOf(g, now); if w.claimed[uid] then return nil, "이번 주 보상을 이미 받았습니다" end
  local n = 0; for _, goal in ipairs(M.goals(g, now)) do if goal.done then n += 1 end end
  if n == 0 then return nil, "달성한 목표가 없습니다" end
  w.claimed[uid] = true; saveG(store, g); return { ore = M.CFG.GOAL_REWARD.ore * n * (1 + level(g.exp) * 0.1) // 1 }
end

-- ---------- 길드 보스 (딜 대결) ----------
function M.bossTriesLeft(g, uid, now) local w = weekOf(g, now); return M.CFG.BOSS_ATTEMPTS - (w.bossTries[uid] or 0) end
function M.bossSubmit(store, uid, damage, now)
  local g = M.guildOf(store, uid); if not g then return nil, "길드가 없습니다" end
  local w = weekOf(g, now); if (w.bossTries[uid] or 0) >= M.CFG.BOSS_ATTEMPTS then return nil, "이번 주 도전 횟수를 다 썼습니다" end
  w.bossTries[uid] = (w.bossTries[uid] or 0) + 1; if damage > (w.boss[uid] or 0) then w.boss[uid] = damage end
  saveG(store, g); return g
end
function M.bossRanking(g, now)
  local w = weekOf(g, now); local rows = {}
  for uid, d in pairs(w.boss) do rows[#rows + 1] = { uid = uid, name = g.members[uid] and g.members[uid].name or "?", damage = d } end
  table.sort(rows, function(a, b) return a.damage > b.damage end); return rows
end
function M.bossTotal(g, now) local t = 0; for _, d in pairs(weekOf(g, now).boss) do t += d end return t end
function M.bossReward(rank) return M.CFG.BOSS_REWARD[rank] or M.CFG.BOSS_REWARD.default end   -- 주가 끝난 뒤 순위대로 수령 (수령 처리는 서버가 지난 주 데이터로 한다)

function M.claimPrevBoss(store, uid, now)   -- 지난주 길드 보스 순위 보상
  local g = M.guildOf(store, uid); if not g then return nil, "길드가 없습니다" end
  weekOf(g, now); local pv = g.prev; if not pv or not pv.boss or not pv.boss[uid] then return nil, "받을 보상이 없습니다" end
  pv.bossClaimed = pv.bossClaimed or {}; if pv.bossClaimed[uid] then return nil, "이미 받았습니다" end
  local rows = {}; for u, d in pairs(pv.boss) do rows[#rows + 1] = { u = u, d = d } end; table.sort(rows, function(a, b) return a.d > b.d end)
  local rank = 0; for i, r in ipairs(rows) do if r.u == uid then rank = i end end
  pv.bossClaimed[uid] = true; saveG(store, g); return M.bossReward(rank), nil, rank
end

-- ---------- 길드 상점 ----------
function M.buy(store, uid, itemId, now)
  local g = M.guildOf(store, uid); if not g then return nil, "길드가 없습니다" end
  local item; for _, it in ipairs(M.SHOP) do if it.id == itemId then item = it end end; if not item then return nil, "없는 상품" end
  local w = weekOf(g, now); w.shop[uid] = w.shop[uid] or {}; local bought = w.shop[uid][itemId] or 0
  if bought >= item.weekly then return nil, "이번 주 구매 한도입니다" end
  if g.coins < item.cost then return nil, "길드 코인이 부족합니다" end
  g.coins -= item.cost; w.shop[uid][itemId] = bought + 1; saveG(store, g); return item.grant
end

return M
