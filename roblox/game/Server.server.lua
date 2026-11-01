-- 서버 진입점: 접속 시 세이브 로드(DataStore, Studio 에서 API 접근이 꺼져 있으면 메모리), 클라이언트 요청 처리, 주기 저장.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local DSS = game:GetService("DataStoreService")
local Game = require(RS.Game.Game)
local Loot = require(RS.Game.Loot)
local Guild = require(RS.Game.Guild)
local Battle = require(RS.Game.Battle)

local rpc = RS:FindFirstChild("Rpc") or Instance.new("RemoteFunction"); rpc.Name = "Rpc"; rpc.Parent = RS
local okDS, store = pcall(function() return DSS:GetDataStore("DungeonSlashV1") end)
local sessions = {}   -- userId -> { sv = 세이브, busy = bool }

local function load(uid)
  if not okDS then return nil end
  for _ = 1, 4 do
    local ok, v = pcall(function() return store:GetAsync("p" .. uid) end)
    if ok then return v, true end
    task.wait(1.5)
  end
  return nil, false   -- 불러오기 실패: 새 세이브로 덮어쓰지 않도록 호출자가 구분한다
end
local function save(uid, sv)
  if not okDS then return true end
  for _ = 1, 3 do
    local ok = pcall(function() store:UpdateAsync("p" .. uid, function() return sv end) end)
    if ok then return true end
    task.wait(1)
  end
  warn("저장 실패:", uid); return false
end
-- 오래된/불완전한 세이브에 기본값을 채운다
local function migrate(sv, uid)
  local base = Loot.newSave(Random.new(uid))
  for k, v in pairs(base) do if sv[k] == nil then sv[k] = v end end
  sv.stats = sv.stats or { kills = 0, clears = 0 }; sv.runes = sv.runes or {}; sv.q = sv.q or {}; sv.charms = sv.charms or {}
  sv.spire = sv.spire or { best = 0 }; sv.rift = sv.rift or { best = 0 }
  return sv
end

Players.PlayerAdded:Connect(function(p)
  local sv, okLoad = load(p.UserId)
  if okLoad == false then p:Kick("데이터를 불러오지 못했습니다. 잠시 후 다시 접속해 주세요. (진행 데이터 보호)"); return end
  sv = sv and migrate(sv, p.UserId) or Loot.newSave(Random.new(p.UserId))
  sessions[p.UserId] = { sv = sv, busy = false, last = 0 }
end)
Players.PlayerRemoving:Connect(function(p)
  local s = sessions[p.UserId]; if s then save(p.UserId, s.sv); sessions[p.UserId] = nil end
end)
game:BindToClose(function() for uid, s in pairs(sessions) do save(uid, s.sv) end end)
task.spawn(function() while true do task.wait(0.05); Game.wardenTickAll(0.05) end end)
task.spawn(function() while true do task.wait(120); for uid, s in pairs(sessions) do save(uid, s.sv) end end end)

local handle = function(player, action, arg)
  local s = sessions[player.UserId]; if not s then return { err = "세이브를 불러오는 중입니다" } end
  local sv = s.sv
  if action == "state" then return { summary = Game.summary(sv), equipped = Game.equipped(sv) }
  elseif action == "inv" then return { inv = Game.inventory(sv) }
  elseif action == "equip" then local ok, e = Game.equip(sv, tonumber(arg)); return { ok = ok, err = e, summary = Game.summary(sv), equipped = Game.equipped(sv) }
  elseif action == "dismantle" then local ok, e = Game.dismantle(sv, tonumber(arg)); return { ok = ok, err = e, summary = Game.summary(sv) }
  elseif action == "sell" then local ok, e = Game.sell(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "bulk" then return { res = Game.bulk(sv, arg.r, arg.mode), summary = Game.summary(sv) }
  elseif action == "daily" then return { rows = Game.daily(sv) }
  elseif action == "dailyclaim" then local ok, e = Game.dailyClaim(sv, tostring(arg)); return { ok = ok, err = (not ok) and e or nil, rows = Game.daily(sv), summary = Game.summary(sv) }
  elseif action == "offline" then return { r = Game.offline(sv), summary = Game.summary(sv) }
  elseif action == "runes" then return { runes = Game.runes(sv), skills = Game.skills(sv) }
  elseif action == "runeequip" then local ok, e = Game.runeEquip(sv, tonumber(arg.skill), tonumber(arg.rune)); return { ok = ok, err = (not ok) and e or nil, runes = Game.runes(sv) }
  elseif action == "runeremove" then local ok, e = Game.runeRemove(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, runes = Game.runes(sv) }
  elseif action == "quests" then return { rows = Game.quests(sv) }
  elseif action == "questclaim" then local ok, e = Game.questClaim(sv, tostring(arg)); return { ok = ok, err = (not ok) and e or nil, rows = Game.quests(sv), summary = Game.summary(sv) }
  elseif action == "shop" then return { rows = Game.shop(sv), summary = Game.summary(sv) }
  elseif action == "buy" then local ok, e = Game.buySkill(sv, tostring(arg)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "skills" then return { rows = Game.skills(sv), slots = sv.slots, summary = Game.summary(sv) }
  elseif action == "levelup" then local ok, e = Game.levelUp(sv, tonumber(arg)); return { ok = ok, err = e, summary = Game.summary(sv) }
  elseif action == "equipskill" then local ok, e = Game.equipSkill(sv, tonumber(arg.slot), tonumber(arg.uid)); return { ok = ok, err = e }
  elseif action == "sellskill" then local ok, e = Game.sellSkill(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "passives" then return { info = Game.passiveInfo(sv), summary = Game.summary(sv) }
  elseif action == "autopass" then local n = Game.autoPassives(sv); return { added = n, info = Game.passiveInfo(sv), summary = Game.summary(sv) }
  elseif action == "resetpass" then Game.resetPassives(sv); return { info = Game.passiveInfo(sv), summary = Game.summary(sv) }
  elseif action == "enhlist" then return { rows = Game.enhCosts(sv), summary = Game.summary(sv) }
  elseif action == "enhance" then local ok, msg = Game.enhance(sv, tonumber(arg)); return { ok = ok, msg = msg, rows = Game.enhCosts(sv), summary = Game.summary(sv) }
  elseif action == "forge" then return { rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "reroll" then local ok, e = Game.reroll(sv, tonumber(arg.uid), tonumber(arg.idx)); return { ok = ok, err = (not ok) and e or nil, rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "chaos" then local ok, e = Game.chaos(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "divine" then local ok, e = Game.divine(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "stones" then local rows = Game.stones(sv); for _, r in ipairs(rows) do if r.rev then r.label = Game.stoneLabel(r.rev) end end return { rows = rows, items = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "reveal" then local ok, e = Game.reveal(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, label = ok and Game.stoneLabel(e) or nil, summary = Game.summary(sv) }
  elseif action == "socket" then local ok, e = Game.socket(sv, tonumber(arg.item), tonumber(arg.stone), tonumber(arg.idx)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "unlocks" then return { u = Game.unlocks(sv), summary = Game.summary(sv) }
  elseif action == "play" then
    if s.busy then return { err = "전투 중입니다" } end
    s.busy = true; local res, e = Game.play(sv, arg); s.busy = false
    if not res then return { err = e } end
    return { result = res, summary = Game.summary(sv) }
  elseif action == "tower2" then local res, e = Game.tower2(sv, tonumber(arg)); if not res then return { err = e } end return { result = res, summary = Game.summary(sv) }
  elseif action == "class" then return { view = Game.classView(sv), summary = Game.summary(sv) }
  elseif action == "classtake" then local ok = Game.classTake(sv, tostring(arg)); return { ok = ok, view = Game.classView(sv), summary = Game.summary(sv) }
  elseif action == "classdrop" then local ok = Game.classDrop(sv, tostring(arg)); return { ok = ok, view = Game.classView(sv), summary = Game.summary(sv) }
  elseif action == "classreset" then Game.classReset(sv); return { view = Game.classView(sv), summary = Game.summary(sv) }
  elseif action == "classadvance" then local ok, m = Game.classAdvance(sv); return { ok = ok, msg = m, view = Game.classView(sv), summary = Game.summary(sv) }
  elseif action == "charms" then return { view = Game.charmView(sv), summary = Game.summary(sv) }
  elseif action == "charmequip" then local ok, e = Game.charmEquip(sv, tonumber(arg.uid), tonumber(arg.slot)); return { ok = ok, err = (not ok) and e or nil, view = Game.charmView(sv), summary = Game.summary(sv) }
  elseif action == "charmoff" then Game.charmUnequip(sv, tonumber(arg)); return { view = Game.charmView(sv), summary = Game.summary(sv) }
  elseif action == "charmdrop" then Game.charmDrop(sv, tonumber(arg)); return { view = Game.charmView(sv), summary = Game.summary(sv) }
  elseif action == "wstart" then local ok, e = Game.wardenStart(sv, player.UserId); return { ok = ok, err = (not ok) and e or nil }
  elseif action == "wstate" then return { st = Game.wardenState(player.UserId) }
  elseif action == "wpop" then return { ok = Game.wardenPop(player.UserId, tonumber(arg)) }
  elseif action == "wfinish" then local res, e = Game.wardenFinish(sv, player.UserId); if not res then return { err = e } end return { result = res, summary = Game.summary(sv) }
  elseif action == "fight" then
    if s.busy then return { err = "전투 중입니다" } end
    s.busy = true; local res, e = Game.fight(sv, arg.kind, arg.n); s.busy = false
    if not res then return { err = e } end
    return { result = res, summary = Game.summary(sv) }
  elseif action == "battle" then
    if s.busy then return { err = "전투 중입니다" } end
    s.busy = true; local res, e = Game.battle(sv, tonumber(arg)); s.busy = false
    if not res then return { err = e } end
    return { result = res, summary = Game.summary(sv) }
  end
  return { err = "알 수 없는 요청" }
end

-- ---------- 길드 ----------
local okG, gds = pcall(function() return DSS:GetDataStore("DungeonSlashGuilds") end)
local gstore = okG and Guild.datastoreStore(gds) or Guild.memoryStore()
if not okG then warn("길드: DataStore 사용 불가 → 메모리 저장소") end
local function gview(player, sv)
  local g = Guild.guildOf(gstore, player.UserId)
  if not g then return { none = true, list = Guild.list(gstore), createCost = Guild.CFG.CREATE_COST } end
  local now = os.time()
  local mem = {}; for uid, m in pairs(g.members) do mem[#mem + 1] = { name = m.name, donated = m.donated, leader = uid == g.leader } end
  table.sort(mem, function(a, b) return a.donated > b.donated end)
  return { name = g.name, lv = Guild.level(g.exp), exp = g.exp, coins = g.coins, motd = g.motd, count = Guild.memberCount(g), leader = g.leader == player.UserId,
    members = mem, goals = Guild.goals(g, now), bossTries = Guild.bossTriesLeft(g, player.UserId, now), bossRank = Guild.bossRanking(g, now), bossTotal = Guild.bossTotal(g, now), shop = Guild.SHOP }
end
local function grant(sv, t) for k, v in pairs(t) do if k == "upKeys" then sv.upKeys = (sv.upKeys or 0) + v else sv[k] = (sv[k] or 0) + v end end end
local function guildAction(player, sv, action, arg)
  local uid, name = player.UserId, player.Name
  if action == "g_view" then return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_create" then
    local g, e, cost = Guild.create(gstore, uid, name, tostring(arg), sv.gold); if not g then return { err = e } end
    sv.gold -= cost; return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_join" then local g, e = Guild.join(gstore, uid, name, tostring(arg)); if not g then return { err = e } end return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_leave" then local g, e = Guild.leave(gstore, uid); if not g then return { err = e } end return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_motd" then local g, e = Guild.setMotd(gstore, uid, arg); if not g then return { err = e } end return { view = gview(player, sv) }
  elseif action == "g_donate" then
    local amt = math.floor(tonumber(arg) or 0); if amt > sv.gold then return { err = "골드가 부족합니다" } end
    local g, e, cost = Guild.donate(gstore, uid, amt); if not g then return { err = e } end
    sv.gold -= cost; return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_claim" then
    local r, e = Guild.claimGoals(gstore, uid); if not r then return { err = e } end
    grant(sv, r); return { view = gview(player, sv), summary = Game.summary(sv), msg = "강화석 " .. r.ore }
  elseif action == "g_bossclaim" then
    local r, e, rank = Guild.claimPrevBoss(gstore, uid); if not r then return { err = e } end
    grant(sv, r); return { view = gview(player, sv), summary = Game.summary(sv), msg = rank .. "위 보상" }
  elseif action == "g_boss" then
    local g = Guild.guildOf(gstore, uid); if not g then return { err = "길드가 없습니다" } end
    if Guild.bossTriesLeft(g, uid) <= 0 then return { err = "이번 주 도전 횟수를 다 썼습니다" } end
    local dmg = Battle.dummyDamage(sv, Guild.CFG.BOSS_SECONDS, os.time() + uid)
    Guild.bossSubmit(gstore, uid, dmg); return { dmg = dmg, view = gview(player, sv) }
  elseif action == "g_buy" then
    local grantT, e = Guild.buy(gstore, uid, tostring(arg)); if not grantT then return { err = e } end
    grant(sv, grantT); return { view = gview(player, sv), summary = Game.summary(sv) }
  end
end

rpc.OnServerInvoke = function(player, action, arg)
  local s = sessions[player.UserId]
  if s and type(action) == "string" and action:sub(1, 2) == "g_" then
    local ok, r = pcall(guildAction, player, s.sv, action, arg)
    if not ok then warn("guild:", r); return { err = "길드 서버 오류" } end
    return r or { err = "알 수 없는 요청" }
  end
  if not s then return { err = "세이브를 불러오는 중입니다" } end
  if type(action) ~= "string" then return { err = "잘못된 요청" } end
  local now = os.clock()
  if action ~= "wstate" and action ~= "wpop" then
    if now - (s.last or 0) < 0.08 then return { err = "너무 빠른 요청입니다" } end
    s.last = now
  end
  if arg ~= nil and type(arg) ~= "table" and type(arg) ~= "string" and type(arg) ~= "number" then return { err = "잘못된 요청" } end
  local sv = s.sv
  local k0, c0, b0 = 0, 0, 0
  if sv then k0, c0 = sv.stats.kills, sv.stats.clears; b0 = (sv.daily and sv.daily.bosses) or 0 end
  local wantRec = action == "fight" or action == "battle" or action == "play"
  if wantRec then Battle.recording = true; Battle.lastRec = nil end
  local okH, res = pcall(handle, player, action, arg)
  Battle.recording = false
  if wantRec and okH and type(res) == "table" and res.result and Battle.lastRec then res.result.replay = Battle.lastRec; Battle.lastRec = nil end
  if not okH then warn("rpc 오류:", action, res); s.busy = false; return { err = "요청 처리 중 오류가 났습니다" } end
  if sv and (sv.stats.kills > k0 or sv.stats.clears > c0) then
    local g = Guild.guildOf(gstore, player.UserId)
    if g then
      pcall(function()
        Guild.record(gstore, player.UserId, "kill", sv.stats.kills - k0)
        Guild.record(gstore, player.UserId, "clear", sv.stats.clears - c0)
        local b1 = (sv.daily and sv.daily.bosses) or 0; if b1 > b0 then Guild.record(gstore, player.UserId, "boss", b1 - b0) end
      end)
    end
  end
  return res
end
