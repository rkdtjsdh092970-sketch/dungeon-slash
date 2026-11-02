-- 길드 서비스 (서버). 저장소는 store:get(key) / store:set(key, value) 로 추상화한다 (DataStore 어댑터는 Guild.datastoreStore).
-- 웹 버전 기능(창설 · 가입 · 탈퇴 · 기부 · 공지 · 레벨 패시브)을 옮기고, 아래를 새로 넣었다:
--   · 주간 길드 목표 (길드원 합산 처치/보스/탑 클리어) — 달성 시 길드원 각자 보상 수령 + 길드 코인
--   · 길드 보스 (60초 허수아비 딜 대결) — 길드 안 주간 순위 보상 + 길드 합산 기록
--   · 길드 상점 (길드 코인 → 편의 재화, 주간 구매 한도). 진행(전직서 · 사탄 · 참 · 신화 스킬)은 팔지 않는다.
local M = {}

M.CFG = {
  CREATE_COST = 20000, MAX_MEMBERS = 30, DONATE_MIN = 100, DONATE_DAILY_MAX = 100000, MOTD_MAX = 60,
  GOAL_PER_MEMBER = { kill = 150, boss = 6, clear = 12 },   -- 길드원 1명당 주간 목표 (합산)
  GOAL_REWARD = { ore = 12, coinsGuild = 30 },              -- 목표 1개 달성 보상 (길드원 각자 ore, 길드 코인은 길드 전체에 적립)
  BOSS_SECONDS = 60, BOSS_ATTEMPTS = 3,
  BOSS_REWARD = { [1] = { ore = 40, orbC = 3 }, [2] = { ore = 25, orbC = 2 }, [3] = { ore = 15, orbC = 1 }, default = { ore = 8 } },
}
M.SHOP = {   -- 길드 코인 상점 (주간 한도, 길드 레벨이 되어야 열림). 판매 금지 항목은 Monetization.FORBIDDEN 과 같다.
  { id = "ore",    name = "Upgrade Stone Bundle", cost = 60,  weekly = 5, grant = { ore = 300 }, lv = 1, icon = "i_ore" },
  { id = "hone",   name = "20 Arcana Shards", cost = 70,  weekly = 4, grant = { arcana = 20 }, lv = 1, icon = "i_arcana" },
  { id = "gold",   name = "Gold Pouch", cost = 50,  weekly = 5, grant = { gold = 30000 }, lv = 2, icon = "i_gold" },
  { id = "orbC",   name = "Chaos Orb 3", cost = 90,  weekly = 3, grant = { orbC = 3 }, lv = 3, icon = "i_chaos" },
  { id = "keys",   name = "Entry Key 1", cost = 120, weekly = 2, grant = { upKeys = 1 }, lv = 5, icon = "i_stone" },
}
-- 길드 연구 (길드 패시브): 길드장 · 부길드장이 길드 코인으로 올린다. 단계 상한 = 길드 레벨. 길드원 모두에게 적용
M.RESEARCH = {
  { id = "atk",  name = "Combat Research", text = "ATK · SPL +%d%%", per = 1, stat = { "atkPct", "magPct" }, k = 0.01 },
  { id = "hp",   name = "Guard Research", text = "HP +%d%%", per = 2, stat = { "hpPct" }, k = 0.02 },
  { id = "gold", name = "Wealth Research", text = "Gold Gain +%d%%", per = 3, stat = { "goldFind" }, k = 0.03 },
  { id = "mf",   name = "Exploration Research", text = "Item Find +%d%%", per = 2, stat = { "mf" }, k = 0.02 },
}
function M.researchCost(lv) return math.floor(80 * (lv + 1) ^ 1.5) end
M.EMBLEM_N, M.EMBLEM_C = 8, 8   -- 문양 8종 × 색 8종
M.JOIN = { open = "Open", apply = "Apply", closed = "Invite Only" }

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

local function cleanOpts(o)
  o = type(o) == "table" and o or {}
  local e = type(o.emblem) == "table" and o.emblem or {}
  return { emblem = { s = math.clamp(math.floor(tonumber(e.s) or 1), 1, M.EMBLEM_N), c = math.clamp(math.floor(tonumber(e.c) or 1), 1, M.EMBLEM_C) },
    desc = string.sub(tostring(o.desc or ""), 1, 180), join = M.JOIN[o.join] and o.join or "open", minLv = math.clamp(math.floor(tonumber(o.minLv) or 1), 1, 100) }
end
function M.create(store, uid, uname, name, gold, now, opts)
  if store:get("m:" .. uid) then return nil, "Already in a Guild" end
  if not validName(name) then return nil, "Guild name must be 2~12 characters (Korean · English · Numbers · _)" end
  if (gold or 0) < M.CFG.CREATE_COST then return nil, "Not enough Gold" end
  if store:get("n:" .. string.lower(name)) then return nil, "Name already taken" end
  local id = tostring((store:get("seq") or 0) + 1); store:set("seq", tonumber(id))
  local o = cleanOpts(opts)
  local g = { id = id, name = name, leader = uid, exp = 0, coins = 0, motd = "", created = now or os.time(), members = { [uid] = { name = uname, joined = now or os.time(), power = 0, donated = 0, dayKey = 0, dayDonate = 0 } },
    emblem = o.emblem, desc = o.desc, join = o.join, minLv = o.minLv, officers = {}, apps = {}, research = {} }
  saveG(store, g); store:set("m:" .. uid, id); store:set("n:" .. string.lower(name), id); idxSet(store, id, name)
  return g, nil, M.CFG.CREATE_COST   -- 세 번째 값 = 차감할 골드
end
function M.join(store, uid, uname, id, force)
  if store:get("m:" .. uid) then return nil, "Already in a Guild" end
  local g = loadG(store, id); if not g then return nil, "Guild not found" end
  if not force and (g.join or "open") ~= "open" then return nil, "This guild is not open to join directly" end
  if members(g) >= M.CFG.MAX_MEMBERS then return nil, "Guild is full (" .. M.CFG.MAX_MEMBERS .. "members)" end
  g.members[uid] = { name = uname, joined = os.time(), power = 0, donated = 0, dayKey = 0, dayDonate = 0 }; if g.apps then g.apps[uid] = nil end
  saveG(store, g); store:set("m:" .. uid, id); store:set("inv:" .. uid, nil); return g
end
function M.leave(store, uid)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  g.members[uid] = nil; store:set("m:" .. uid, nil)
  if members(g) == 0 then store:set("n:" .. string.lower(g.name), nil); store:set("g:" .. g.id, nil); local ix = store:get("idx") or {}; ix[g.id] = nil; store:set("idx", ix); return { disbanded = true } end
  if g.officers then g.officers[uid] = nil end
  if g.leader == uid then   -- 전투력이 가장 높은 길드원에게 길드장을 넘긴다
    local best, bp = nil, -1; for u, m in pairs(g.members) do if (m.power or 0) > bp then bp = m.power or 0; best = u end end; g.leader = best
  end
  saveG(store, g); return g
end
function M.setMotd(store, uid, text)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  if g.leader ~= uid then return nil, "Guild Leader only" end
  g.motd = string.sub(tostring(text or ""), 1, M.CFG.MOTD_MAX * 3); saveG(store, g); return g
end
function M.donate(store, uid, gold, now)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  gold = math.floor(gold or 0); if gold < M.CFG.DONATE_MIN then return nil, "Minimum " .. M.CFG.DONATE_MIN .. "G" end
  local m = g.members[uid]; local dk = M.dayKey(now); if m.dayKey ~= dk then m.dayKey = dk; m.dayDonate = 0 end
  if m.dayDonate + gold > M.CFG.DONATE_DAILY_MAX then return nil, "Daily donation limit exceeded" end
  m.dayDonate += gold; m.donated += gold; g.coins += math.floor(gold / 1000)
  local c = math.floor(gold / 50); g.exp += c; m.contrib = (m.contrib or 0) + c; saveG(store, g)   -- 기부: 하루 한도 안에서 길드 기여도(= 길드 경험치) + 길드 코인
  return g, nil, gold   -- 세 번째 값 = 차감할 골드
end
function M.updatePower(store, uid, power) local g = M.guildOf(store, uid); if g then g.members[uid].power = power; saveG(store, g) end end

-- ---------- 권한 · 설정 · 신청 · 초대 · 연구 · 찾기 ----------
local function canManage(g, uid) return g.leader == uid or (g.officers and g.officers[uid]) == true end
M.canManage = canManage
function M.setSettings(store, uid, opts)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  if g.leader ~= uid then return nil, "Guild Leader only" end
  local o = cleanOpts(opts); g.emblem, g.desc, g.join, g.minLv = o.emblem, o.desc, o.join, o.minLv; saveG(store, g); return g
end
function M.apply(store, uid, uname, id, lvl, power)
  if store:get("m:" .. uid) then return nil, "Already in a Guild" end
  local g = loadG(store, id); if not g then return nil, "Guild not found" end
  if (lvl or 1) < (g.minLv or 1) then return nil, string.format("Level %d or higher required", g.minLv) end
  if members(g) >= M.CFG.MAX_MEMBERS then return nil, "The guild is full" end
  local j = g.join or "open"
  if j == "open" then return M.join(store, uid, uname, id, true) end
  if j == "closed" then return nil, "Invite only" end
  g.apps = g.apps or {}; g.apps[uid] = { name = uname, lv = lvl, power = power, t = os.time() }; saveG(store, g); return { applied = true }
end
function M.answerApp(store, uid, target, ok)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  if not canManage(g, uid) then return nil, "Leader and officers only" end
  local a = g.apps and g.apps[target]; if not a then return nil, "No such application" end
  g.apps[target] = nil; saveG(store, g)
  if ok then return M.join(store, target, a.name, g.id, true) end
  return g
end
function M.invite(store, uid, target)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  if not canManage(g, uid) then return nil, "Only the leader and officers can invite" end
  if store:get("m:" .. target) then return nil, "That player is already in a guild" end
  local inv = store:get("inv:" .. target) or {}; inv[g.id] = { from = g.members[uid].name, t = os.time() }; store:set("inv:" .. target, inv); return g
end
function M.invites(store, uid)
  local out = {}
  for id, x in pairs(store:get("inv:" .. uid) or {}) do local g = loadG(store, id); if g then out[#out + 1] = { id = id, name = g.name, from = x.from, emblem = g.emblem, lv = level(g.exp), members = members(g) } end end
  return out
end
function M.answerInvite(store, uid, uname, id, ok)
  local inv = store:get("inv:" .. uid) or {}; if not inv[id] then return nil, "No such invite" end
  inv[id] = nil; store:set("inv:" .. uid, inv)
  if ok then return M.join(store, uid, uname, id, true) end
  return { declined = true }
end
function M.setRole(store, uid, target, role)   -- role: officer · member · kick · leader
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  if g.leader ~= uid then return nil, "Guild Leader only" end
  if target == uid or not g.members[target] then return nil, "No such member" end
  g.officers = g.officers or {}
  if role == "officer" then g.officers[target] = true
  elseif role == "member" then g.officers[target] = nil
  elseif role == "leader" then g.leader = target; g.officers[target] = nil; g.officers[uid] = true
  elseif role == "kick" then g.members[target] = nil; g.officers[target] = nil; store:set("m:" .. target, nil)
  else return nil, "Unknown role" end
  saveG(store, g); return g
end
function M.upgradeResearch(store, uid, key)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  if not canManage(g, uid) then return nil, "Only the leader and officers can research" end
  local def; for _, r in ipairs(M.RESEARCH) do if r.id == key then def = r end end; if not def then return nil, "No such research" end
  g.research = g.research or {}; local lv = g.research[key] or 0
  if lv >= level(g.exp) then return nil, "Guild level is too low" end
  local c = M.researchCost(lv); if g.coins < c then return nil, "Not enough Guild Coins" end
  g.coins -= c; g.research[key] = lv + 1; saveG(store, g); return g
end
function M.buffOf(g)   -- 길드원에게 적용할 효과 (서버가 세이브에 실어 Stats 가 읽는다)
  if not g then return nil end
  local per = {}
  for _, r in ipairs(M.RESEARCH) do local lv = (g.research or {})[r.id] or 0; if lv > 0 then for _, st in ipairs(r.stat) do per[st] = (per[st] or 0) + r.k * lv end end end
  return { lv = level(g.exp), per = per }
end
function M.totalPower(g) local pw = 0; for _, m in pairs(g.members) do pw += m.power or 0 end; return pw end
function M.search(store, q, sort)   -- 길드 찾기 · 순위: q = 이름 검색, sort = lv | power | members
  local out = {}; q = string.lower(tostring(q or ""))
  for id in pairs(store:get("idx") or {}) do
    local g = loadG(store, id)
    if g and (q == "" or string.find(string.lower(g.name), q, 1, true)) then
      out[#out + 1] = { id = id, name = g.name, members = members(g), lv = level(g.exp), exp = g.exp, power = M.totalPower(g), emblem = g.emblem, desc = g.desc or "", join = g.join or "open", minLv = g.minLv or 1, leader = g.members[g.leader] and g.members[g.leader].name or "?" }
    end
  end
  sort = sort or "lv"
  table.sort(out, function(a, b) if sort == "power" then return a.power > b.power elseif sort == "members" then return a.members > b.members end; if a.lv ~= b.lv then return a.lv > b.lv end; return a.exp > b.exp end)
  for i, r in ipairs(out) do r.rank = i end
  return out
end
-- 길드 기여도(= 길드 경험치): 길드원 전투 · 주간 목표 달성 · 길드 보스 · 하루 한도 골드 기부로 쌓인다. 쌓이면 길드 레벨이 오른다
M.EXP = { kill = 1, clear = 20, boss = 60, goal = 4000, gboss = 600 }
function M.levelInfo(exp) local lv = level(exp); local cur = 50000 * (lv - 1) ^ 2; local nxt = 50000 * lv ^ 2; return lv, cur, nxt end

-- ---------- 주간 길드 목표 ----------
function M.goals(g, now)
  local w = weekOf(g, now); local n = members(g); local out = {}
  for _, k in ipairs({ "kill", "boss", "clear" }) do out[#out + 1] = { id = k, goal = M.CFG.GOAL_PER_MEMBER[k] * n, prog = w.prog[k], done = w.prog[k] >= M.CFG.GOAL_PER_MEMBER[k] * n } end
  return out
end
function M.record(store, uid, kind, amount, now)   -- 전투 결과에서 호출: kind = kill | boss | clear
  local g = M.guildOf(store, uid); if not g or not M.CFG.GOAL_PER_MEMBER[kind] then return end
  local w = weekOf(g, now); local before = M.goals(g, now); w.prog[kind] += amount
  g.exp += (M.EXP[kind] or 0) * amount; local m = g.members[uid]; if m then m.contrib = (m.contrib or 0) + (M.EXP[kind] or 0) * amount end
  for i, goal in ipairs(M.goals(g, now)) do if goal.done and not before[i].done then g.coins += M.CFG.GOAL_REWARD.coinsGuild; g.exp += M.EXP.goal end end
  saveG(store, g)
end
function M.claimGoals(store, uid, now)   -- 달성한 목표 수만큼 보상 (주 1회, 길드원 각자)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  local w = weekOf(g, now); if w.claimed[uid] then return nil, "Weekly rewards already claimed" end
  local n = 0; for _, goal in ipairs(M.goals(g, now)) do if goal.done then n += 1 end end
  if n == 0 then return nil, "No goals achieved" end
  w.claimed[uid] = true; saveG(store, g); return { ore = M.CFG.GOAL_REWARD.ore * n * (1 + level(g.exp) * 0.1) // 1 }
end

-- ---------- 길드 보스 (딜 대결) ----------
function M.bossTriesLeft(g, uid, now) local w = weekOf(g, now); return M.CFG.BOSS_ATTEMPTS - (w.bossTries[uid] or 0) end
function M.bossSubmit(store, uid, damage, now)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  local w = weekOf(g, now); if (w.bossTries[uid] or 0) >= M.CFG.BOSS_ATTEMPTS then return nil, "No challenge attempts left this week" end
  w.bossTries[uid] = (w.bossTries[uid] or 0) + 1; if damage > (w.boss[uid] or 0) then w.boss[uid] = damage end
  g.exp += M.EXP.gboss; local m = g.members[uid]; if m then m.contrib = (m.contrib or 0) + M.EXP.gboss end
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
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  weekOf(g, now); local pv = g.prev; if not pv or not pv.boss or not pv.boss[uid] then return nil, "No rewards to claim" end
  pv.bossClaimed = pv.bossClaimed or {}; if pv.bossClaimed[uid] then return nil, "Already claimed" end
  local rows = {}; for u, d in pairs(pv.boss) do rows[#rows + 1] = { u = u, d = d } end; table.sort(rows, function(a, b) return a.d > b.d end)
  local rank = 0; for i, r in ipairs(rows) do if r.u == uid then rank = i end end
  pv.bossClaimed[uid] = true; saveG(store, g); return M.bossReward(rank), nil, rank
end

-- ---------- 길드 상점 ----------
function M.buy(store, uid, itemId, now)
  local g = M.guildOf(store, uid); if not g then return nil, "No Guild" end
  local item; for _, it in ipairs(M.SHOP) do if it.id == itemId then item = it end end; if not item then return nil, "Product not found" end
  local w = weekOf(g, now); w.shop[uid] = w.shop[uid] or {}; local bought = w.shop[uid][itemId] or 0
  if bought >= item.weekly then return nil, "Weekly purchase limit reached" end
  if level(g.exp) < (item.lv or 1) then return nil, string.format("Unlocks at Guild Lv %d", item.lv) end
  if g.coins < item.cost then return nil, "Not enough Guild Coins" end
  g.coins -= item.cost; w.shop[uid][itemId] = bought + 1; saveG(store, g); return item.grant
end

return M
