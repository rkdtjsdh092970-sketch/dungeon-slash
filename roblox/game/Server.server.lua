-- 서버 진입점: 접속 시 세이브 로드(DataStore, Studio 에서 API 접근이 꺼져 있으면 메모리), 클라이언트 요청 처리, 주기 저장.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local DSS = game:GetService("DataStoreService")
local Game = require(RS.Game.Game)
local Loot = require(RS.Game.Loot)

local rpc = RS:FindFirstChild("Rpc") or Instance.new("RemoteFunction"); rpc.Name = "Rpc"; rpc.Parent = RS
local okDS, store = pcall(function() return DSS:GetDataStore("DungeonSlashV1") end)
local sessions = {}   -- userId -> { sv = 세이브, busy = bool }

local function load(uid)
  if okDS then
    for _ = 1, 3 do
      local ok, v = pcall(function() return store:GetAsync("p" .. uid) end)
      if ok then return v end
      task.wait(1)
    end
  end
  return nil
end
local function save(uid, sv)
  if not okDS then return end
  pcall(function() store:SetAsync("p" .. uid, sv) end)
end

Players.PlayerAdded:Connect(function(p)
  local sv = load(p.UserId) or Loot.newSave(Random.new(p.UserId))
  sessions[p.UserId] = { sv = sv, busy = false }
end)
Players.PlayerRemoving:Connect(function(p)
  local s = sessions[p.UserId]; if s then save(p.UserId, s.sv); sessions[p.UserId] = nil end
end)
game:BindToClose(function() for uid, s in pairs(sessions) do save(uid, s.sv) end end)
task.spawn(function() while true do task.wait(120); for uid, s in pairs(sessions) do save(uid, s.sv) end end end)

rpc.OnServerInvoke = function(player, action, arg)
  local s = sessions[player.UserId]; if not s then return { err = "세이브를 불러오는 중입니다" } end
  local sv = s.sv
  if action == "state" then return { summary = Game.summary(sv), equipped = Game.equipped(sv) }
  elseif action == "inv" then return { inv = Game.inventory(sv) }
  elseif action == "equip" then local ok, e = Game.equip(sv, tonumber(arg)); return { ok = ok, err = e, summary = Game.summary(sv), equipped = Game.equipped(sv) }
  elseif action == "dismantle" then local ok, e = Game.dismantle(sv, tonumber(arg)); return { ok = ok, err = e, summary = Game.summary(sv) }
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
