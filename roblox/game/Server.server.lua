-- 서버 진입점: 접속 시 세이브 로드(DataStore, Studio 에서 API 접근이 꺼져 있으면 메모리), 클라이언트 요청 처리, 주기 저장.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local DSS = game:GetService("DataStoreService")
local Game = require(RS.Game.Game)
local Loot = require(RS.Game.Loot)
local Guild = require(RS.Game.Guild)
local Battle = require(RS.Game.Battle)
local SPM = require(RS.Game.Data.SpriteMap)
local okArt, ARTM = pcall(require, RS.Game.Data:FindFirstChild("ArtMap"))   -- 일러스트 표 (없으면 도트만)
local ART = okArt and ARTM.ART or {}
local HttpService = game:GetService("HttpService")

local rpc = RS:FindFirstChild("Rpc") or Instance.new("RemoteFunction"); rpc.Name = "Rpc"; rpc.Parent = RS
local okDS, store = pcall(function() return DSS:GetDataStore("DungeonSlashV1") end)
local sessions = {}
local gsyncFn   -- (아래 길드 부분에서 정함)   -- userId -> { sv = 세이브, busy = bool }

-- Studio 시험용 "새 계정" 모드: ServerStorage 의 FreshTest 속성을 켜면 세이브를 불러오지도 저장하지도 않는다 (실서버에서는 동작하지 않음)
local function freshTest() return game:GetService("RunService"):IsStudio() and game:GetService("ServerStorage"):GetAttribute("FreshTest") == true end
local function load(uid)
  if freshTest() then return nil end
  if not okDS then return nil end
  for _ = 1, 4 do
    local ok, v = pcall(function() return store:GetAsync("p" .. uid) end)
    if ok then return v, true end
    -- 게시된 장소를 Studio 에서 API 접근 없이 열면 항상 실패한다: 이때만 메모리 저장(실서버에서는 그대로 보호)
    if game:GetService("RunService"):IsStudio() then okDS = false; warn("Studio: DataStore load failed → Saving in memory", v); return nil end
    task.wait(1.5)
  end
  return nil, false   -- 불러오기 실패: 새 세이브로 덮어쓰지 않도록 호출자가 구분한다
end
local function save(uid, sv)
  if freshTest() then return true end
  if not okDS then return true end
  for _ = 1, 3 do
    local ok = pcall(function() store:UpdateAsync("p" .. uid, function() return sv end) end)
    if ok then return true end
    task.wait(1)
  end
  warn("Save failed:", uid); return false
end
-- 오래된/불완전한 세이브에 기본값을 채운다
local function migrate(sv, uid)
  local base = Loot.newSave(Random.new(uid))
  for k, v in pairs(base) do if sv[k] == nil then sv[k] = v end end
  sv.stats = sv.stats or { kills = 0, clears = 0 }; sv.runes = sv.runes or {}; sv.q = sv.q or {}; sv.charms = sv.charms or {}
  sv.spire = sv.spire or { best = 0 }; sv.rift = sv.rift or { best = 0 }
  sv.atlas = nil; sv.shards = nil   -- 심연 각인 · 균열 조각 폐지 (2026-11-02)
  for _, it in pairs(sv.equipped or {}) do Loot.defUp(it) end; for _, it in ipairs(sv.inv or {}) do Loot.defUp(it) end   -- 장비 체력 · 방어 상향 (2026-11-03)
  if sv.stash then for _, it in ipairs(sv.stash.items or {}) do Loot.defUp(it) end end
  if (sv.slots or 0) < 4 then sv.slots = 4 end   -- 아르카나 칸은 처음부터 4칸 (2026-11-03)
  require(RS.Game.Economy).migrateSkillTiers(sv); require(RS.Game.Economy).fixBasicSlot(sv); require(RS.Game.Economy).grantBasics(sv)   -- 아르카나 등급 고정: 같은 아르카나 여러 장을 한 장으로 (2026-11-03)
  if (sv.passVer or 1) < 2 then   -- 패시브 v2 (4갈래 200노드): 예전 노드는 없어졌으므로 초기화 (포인트는 레벨로 계산되어 그대로 돌아온다)
    if next(sv.pass or {}) then sv.passNotice = true end
    sv.pass = {}; sv.passSets = nil; sv.passVer = 2
  end
  if (sv.hone or 0) > 0 then sv.arcana = (sv.arcana or 0) + sv.hone; sv.hone = 0 end   -- 연마석 폐지 → 아르카나 조각 1:1
  if (sv.orbD or 0) > 0 then sv.orbC = (sv.orbC or 0) + sv.orbD; sv.orbD = 0 end   -- 신성 구슬 폐지 → 혼돈 구슬 1:1 (2026-11-02)
  if require(RS.Game.Economy).passiveLeft(sv) < 0 then sv.pass = {}; sv.passNotice = true end   -- 패시브 레벨당 1점으로 바뀜 (2026-11-02): 넘치게 찍혀 있으면 돌려준다
  if sv.needStart == nil then sv.needStart = false end   -- 예전 계정은 직업 선택 없이 그대로
  return sv
end

-- ── 비공개 베타: 허용 명단. 게임 주인만 채팅 명령으로 관리 (다시 게시할 필요 없음, DataStore "DungeonSlashBeta") ──
--   /beta add 이름(또는 UserId) · /beta remove 이름 · /beta list · /beta open (누구나) · /beta close (초대 전용, 기본값)
--   주인과 Studio 테스트는 항상 들어올 수 있다.
local RunService = game:GetService("RunService")
local notice = RS:FindFirstChild("Notice") or Instance.new("RemoteEvent"); notice.Name = "Notice"; notice.Parent = RS
local okBeta, betaStore = pcall(function() return DSS:GetDataStore("DungeonSlashBeta") end)
local beta, betaLoaded = { open = false, ids = {} }, false
local function betaLoad()
  if betaLoaded or not okBeta then return end
  local ok, v = pcall(function() return betaStore:GetAsync("access") end)
  if ok then betaLoaded = true; if type(v) == "table" then beta.open = v.open == true; beta.ids = v.ids or {} end end
end
local function betaSave() if okBeta then pcall(function() betaStore:SetAsync("access", { open = beta.open, ids = beta.ids }) end) end end
local function isOwner(p)
  if game.CreatorType == Enum.CreatorType.Group then local ok, r = pcall(function() return p:GetRankInGroup(game.CreatorId) end); return ok and r >= 254 end
  return p.UserId == game.CreatorId
end
local function betaAllowed(p)
  if RunService:IsStudio() or isOwner(p) then return true end
  betaLoad()
  if beta.open then return true end
  for _, id in ipairs(beta.ids) do if id == p.UserId then return true end end
  return false
end
-- 명단 조작 (채팅 명령과 설정 창 [베타 관리] 탭이 함께 쓴다). 결과 문구를 돌려준다.
local function betaDo(op, arg)
  betaLoad()
  if op == "add" or op == "remove" then
    arg = tostring(arg or "")
    local id = tonumber(arg)
    if not id then local ok, v = pcall(function() return Players:GetUserIdFromNameAsync(arg) end); id = ok and v or nil end
    if not id then return "Player not found: " .. arg end
    local keep = {}; for _, x in ipairs(beta.ids) do if x ~= id then keep[#keep + 1] = x end end
    if op == "add" then keep[#keep + 1] = id end
    beta.ids = keep; betaSave(); return string.format("Beta tester %s: %s (%d total)", op == "add" and "added" or "removed", arg, #keep)
  elseif op == "open" or op == "close" then
    beta.open = op == "open"; betaSave(); return beta.open and "Beta is now OPEN to everyone" or "Beta is now invite only"
  end
end
local function betaView()
  betaLoad()
  local list = {}
  for _, id in ipairs(beta.ids) do local ok, nm = pcall(function() return Players:GetNameFromUserIdAsync(id) end); list[#list + 1] = { id = id, name = ok and nm or tostring(id) } end
  return { open = beta.open, list = list }
end
local function betaCommand(p, text)
  local cmd, arg = string.match(text, "^/beta%s+(%a+)%s*(.-)%s*$")
  if not cmd or not isOwner(p) then return end
  if cmd == "list" then
    local v = betaView(); local names = {}; for _, x in ipairs(v.list) do names[#names + 1] = x.name end
    notice:FireClient(p, (v.open and "Beta: OPEN to everyone" or "Beta: invite only") .. " — " .. (#names > 0 and table.concat(names, ", ") or "no testers yet"))
  else local m = betaDo(cmd, arg); if m then notice:FireClient(p, m) end end
end
-- 설정(언어 · 그래픽 · 소리)으로 저장할 수 있는 값
local OPT_KEYS = { ui = "number", dmg = "boolean", flash = "number", master = "number", music = "number", sfx = "number", mute = "boolean",
  speed = "number", auto = "number", ar1 = "number", ar2 = "number", ar3 = "number", ar4 = "number", sr1 = "number", sr2 = "number", sr3 = "number", sbest = "boolean" }   -- 배속 · 자동 반복(0 끔 1 같은 단계 2 다음 단계) · 등급별 자동 정리
-- x4 배속 게임패스 (한 번 사면 영구). ID 는 Monetization.lua PASSES.speed4 와 같게 유지
local SPEED4_ID = 2063961736
local MPS = game:GetService("MarketplaceService")
local ownsSpeed4 = {}
local function hasSpeed4(p)
  if ownsSpeed4[p.UserId] == nil then local ok, v = pcall(function() return MPS:UserOwnsGamePassAsync(p.UserId, SPEED4_ID) end); if ok then ownsSpeed4[p.UserId] = v end end
  return ownsSpeed4[p.UserId] == true
end
MPS.PromptGamePassPurchaseFinished:Connect(function(p, id, bought) if id == SPEED4_ID and bought then ownsSpeed4[p.UserId] = true end end)
-- 개발자 상품 지급 (Monetization.process): 세션에 바로 넣고 곧바로 저장. 세션이 없으면 다음에 다시 (NotProcessedYet)
local Monet = require(game:GetService("ServerStorage"):WaitForChild("Game"):WaitForChild("Monetization"))
MPS.ProcessReceipt = function(receipt)
  local s = sessions[receipt.PlayerId]; if not s or not s.sv then return Enum.ProductPurchaseDecision.NotProcessedYet end
  local ok, msg = Monet.process(receipt, s.sv)
  if not ok then if msg == "unknown" or msg == "daily" then warn("receipt refused:", msg, receipt.ProductId) end; return Enum.ProductPurchaseDecision.NotProcessedYet end
  if not save(receipt.PlayerId, s.sv) then return Enum.ProductPurchaseDecision.NotProcessedYet end
  local pl = Players:GetPlayerByUserId(receipt.PlayerId); if pl and msg ~= "dup" then notice:FireClient(pl, tostring(msg)) end
  return Enum.ProductPurchaseDecision.PurchaseGranted
end
-- 게임패스 효과 (가방 +100 · 골드 x1.5): 접속 · 구매 때 소유 여부로 세션 표시를 켠다 (ID 0 이면 꺼짐)
local passOwn = {}
local function ownsPass(p, id)
  if id == 0 then return false end
  local k = p.UserId .. ":" .. id
  if passOwn[k] == nil then local ok, v = pcall(function() return MPS:UserOwnsGamePassAsync(p.UserId, id) end); if ok then passOwn[k] = v end end
  return passOwn[k] == true
end
local function applyPasses(p, sv) sv.passBag = ownsPass(p, Monet.PASSES.bagPlus.id) or nil; sv.passGold = ownsPass(p, Monet.PASSES.goldPlus.id) or nil end
MPS.PromptGamePassPurchaseFinished:Connect(function(p, id, bought)
  if not bought then return end
  passOwn[p.UserId .. ":" .. id] = true
  local s = sessions[p.UserId]; if s and s.sv then applyPasses(p, s.sv) end
end)

Players.PlayerAdded:Connect(function(p)
  if not betaAllowed(p) then p:Kick("Arcana Slayer is in closed beta (invite only). Thanks for your interest!"); return end
  p.Chatted:Connect(function(text) betaCommand(p, text) end)
  local sv, okLoad = load(p.UserId)
  if okLoad == false then p:Kick("Couldn't load your save data. Please rejoin in a moment. (Your progress is protected.)"); return end
  sv = sv and migrate(sv, p.UserId) or Loot.newSave(Random.new(p.UserId))
  sessions[p.UserId] = { sv = sv, busy = false, last = 0 }
  task.spawn(applyPasses, p, sv)
  if freshTest() then sv.gold += tonumber(game:GetService("ServerStorage"):GetAttribute("TestGold")) or 0 end   -- Studio 시험 모드 전용: 시험 골드
  task.spawn(function() pcall(function() if gsyncFn then gsyncFn(p.UserId, sv) end end) end)   -- 길드 효과
end)
-- ── 랭킹 (OrderedDataStore): 균열 최고층 · 레벨 · 허수아비 DPS. Studio 에서 막혀 있으면 빈 목록 ──
local RANKS = { rift = "Rank_Rift", level = "Rank_Level", dps = "Rank_Dps" }
local rankStore, rankCache = {}, {}
for k, n in pairs(RANKS) do local ok, st = pcall(function() return DSS:GetOrderedDataStore(n) end); if ok then rankStore[k] = st end end
local function rankSet(kind, uid, v) local st = rankStore[kind]; if st and v and v > 0 then task.spawn(function() pcall(function() st:SetAsync(tostring(uid), math.floor(v)) end) end) end end
local function rankTop(kind)
  local c = rankCache[kind]; if c and os.clock() - c.t < 60 then return c.rows end
  local st = rankStore[kind]; if not st then return {} end
  local rows = {}
  local ok = pcall(function()
    local page = st:GetSortedAsync(false, 50):GetCurrentPage()
    for i, e in ipairs(page) do
      local nm = e.key; pcall(function() nm = Players:GetNameFromUserIdAsync(tonumber(e.key)) end)
      rows[i] = { rank = i, name = nm, value = e.value, uid = tonumber(e.key) }
    end
  end)
  if ok then rankCache[kind] = { t = os.clock(), rows = rows } end
  return rows
end
local function rankPush(uid, sv) rankSet("rift", uid, sv.rift and sv.rift.best or 0); rankSet("level", uid, sv.level) end

-- ── 우편함: 게임 주인이 보내는 전체 우편(공지 + 보상). DataStore "DungeonSlashMail" 의 "global" 목록, 받은 우편은 세이브 sv.mailGot ──
local okMail, mailStore = pcall(function() return DSS:GetDataStore("DungeonSlashMail") end)
local mailCache, mailT = {}, -1e9
local MAIL_KEYS = { gold = true, ore = true, hone = true, orbC = true, orbD = true, keys = true, gems = true, arcana = true }
local function mailList(force)
  if not force and os.clock() - mailT < 30 then return mailCache end
  if okMail then local ok, v = pcall(function() return mailStore:GetAsync("global") end); if ok then mailCache = v or {}; mailT = os.clock() end end
  return mailCache
end
local function mailSend(title, body, reward)
  local list = mailList(true); local id = (list[#list] and list[#list].id or 0) + 1
  list[#list + 1] = { id = id, t = os.time(), title = title, body = body, reward = reward }
  while #list > 30 do table.remove(list, 1) end
  if okMail then pcall(function() mailStore:SetAsync("global", list) end) end
  mailCache = list; return id
end

Players.PlayerRemoving:Connect(function(p)
  local s = sessions[p.UserId]; if s then save(p.UserId, s.sv); sessions[p.UserId] = nil end
end)
game:BindToClose(function() for uid, s in pairs(sessions) do save(uid, s.sv) end end)
task.spawn(function() while true do task.wait(0.05); Game.wardenTickAll(0.05) end end)
task.spawn(function() while true do task.wait(120); for uid, s in pairs(sessions) do save(uid, s.sv) end end end)

local sheetCache = {}
local function sheetAction(arg)
  local M = type(arg) == "string" and (string.sub(arg, 1, 4) == "art/" and ART[string.sub(arg, 5)] or SPM.SHEETS[arg]); if not M then return { err = "Sheet not found" } end
  if M.id then return { id = M.id, w = M.w, h = M.h, cell = M.cell } end
  if not sheetCache[arg] then
    local ok, body = pcall(function() return HttpService:GetAsync(SPM.BASE .. M.file, true) end)
    if ok and #body == M.w * M.h * 4 then sheetCache[arg] = buffer.fromstring(body) else warn("Sheet load failed", arg, ok and #body or body) end
  end
  if not sheetCache[arg] then return { err = "Could not fetch sheet (check HttpService)" } end
  return { buf = sheetCache[arg], w = M.w, h = M.h, cell = M.cell }
end
-- 서버가 켜지자마자 그림을 GitHub 에서 미리 받아 둔다 (첫 입장 대기 줄이기). 6개씩 동시에
task.spawn(function()
  local list = {}; for k in pairs(ART) do if k:sub(1, 7) ~= "card_s_" then list[#list + 1] = "art/" .. k end end
  local running = 0
  for _, a in ipairs(list) do
    while running >= 6 do task.wait() end
    running += 1; task.spawn(function() pcall(sheetAction, a); running -= 1 end)
  end
end)
local handle = function(player, action, arg)
  local s = sessions[player.UserId]; if not s then return { err = "Loading save data" } end
  local sv = s.sv
  if action == "state" then return { summary = Game.summary(sv), equipped = Game.equipped(sv) }
  elseif action == "inv" then return { inv = Game.inventory(sv), invMax = Game.invMax(sv) }
  elseif action == "autoequip" then local n = Game.autoEquip(sv); return { n = n, summary = Game.summary(sv) }
  elseif action == "tut" then if sv.tut ~= nil and type(arg) == "number" then sv.tut = math.max(sv.tut, math.floor(arg)) end; return { summary = Game.summary(sv) }
  elseif action == "pickstart" then local ok, e = Game.pickStart(sv, tostring(arg)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "unequip" then local ok = type(arg) == "string" and Game.unequip(sv, arg); return { ok = ok, summary = Game.summary(sv) }
  elseif action == "equip" then local ok, e; if type(arg) == "table" then ok, e = Game.equip(sv, tonumber(arg.uid), type(arg.slot) == "string" and arg.slot or nil) else ok, e = Game.equip(sv, tonumber(arg)) end; return { ok = ok, err = e, summary = Game.summary(sv), equipped = Game.equipped(sv) }
  elseif action == "dismantle" then local ok, e = Game.dismantle(sv, tonumber(arg)); return { ok = ok, err = e, summary = Game.summary(sv) }
  elseif action == "sell" then local ok, e = Game.sell(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "bulk" then return { res = Game.bulk(sv, arg.r, arg.mode), summary = Game.summary(sv) }
  elseif action == "daily" then return { rows = Game.daily(sv) }
  elseif action == "dailyclaim" then local ok, e = Game.dailyClaim(sv, tostring(arg)); if ok then sv.gems = (sv.gems or 0) + 10 end; return { ok = ok, err = (not ok) and e or nil, rows = Game.daily(sv), summary = Game.summary(sv) }
  elseif action == "offline" then return { r = Game.offline(sv), summary = Game.summary(sv) }
  elseif action == "runes" then return { runes = Game.runes(sv), skills = Game.skills(sv) }
  elseif action == "runeequip" then local ok, e = Game.runeEquip(sv, tonumber(arg.skill), tonumber(arg.rune)); return { ok = ok, err = (not ok) and e or nil, runes = Game.runes(sv) }
  elseif action == "runeremove" then local ok, e = Game.runeRemove(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, runes = Game.runes(sv) }
  elseif action == "quests" then return { rows = Game.quests(sv) }
  elseif action == "questclaim" then local ok, e = Game.questClaim(sv, tostring(arg)); return { ok = ok, err = (not ok) and e or nil, rows = Game.quests(sv), summary = Game.summary(sv) }
  elseif action == "shop" then return { rows = Game.shop(sv), summary = Game.summary(sv) }
  elseif action == "gacha" then return { view = Game.gachaView(sv), summary = Game.summary(sv) }
  elseif action == "gachapull" then local r, e = Game.gachaPull(sv, type(arg) == "table" and tonumber(arg.n) or 1, type(arg) == "table" and arg.pay or "arcana", type(arg) == "table" and arg.fam or nil); return { res = r, err = (not r) and e or nil, view = Game.gachaView(sv), summary = Game.summary(sv) }
  elseif action == "buy" then local ok, e = Game.buySkill(sv, tostring(arg)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "skills" then return { rows = Game.skills(sv), slots = sv.slots, summary = Game.summary(sv) }
  elseif action == "levelup" then local ok, e = Game.levelUp(sv, tonumber(arg)); return { ok = ok, err = e, summary = Game.summary(sv) }
  elseif action == "advice" then return { tips = Game.advice(sv) }
  elseif action == "robuxshop" then
    local items = Monet.catalog(sv)
    for _, it in ipairs(items) do if it.kind == "pass" then it.owned = (it.key == "speed4" and hasSpeed4(player)) or (it.key == "bagPlus" and sv.passBag) or (it.key == "goldPlus" and sv.passGold) or nil end end
    return { items = items, boostExp = math.max(0, (sv.boostExp or 0) - os.time()), boostLoot = math.max(0, (sv.boostLoot or 0) - os.time()), owns4 = hasSpeed4(player) }
  elseif action == "skilldelta" then local d = Game.skillDelta(sv, tonumber(arg)); local o = {}; for i, v in pairs(d) do o[tostring(i)] = v end; return { delta = o }
  elseif action == "equipskill" then local ok, e = Game.equipSkill(sv, tonumber(arg.slot), tonumber(arg.uid), type(arg.rule) == "string" and arg.rule or nil); return { ok = ok, err = e }
  elseif action == "sellskill" then local ok, e = Game.sellSkill(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "passives" then return { info = Game.passiveInfo(sv), summary = Game.summary(sv) }
  elseif action == "autopass" then local n = Game.autoPassives(sv); return { added = n, info = Game.passiveInfo(sv), summary = Game.summary(sv) }
  elseif action == "resetpass" then Game.resetPassives(sv); return { info = Game.passiveInfo(sv), summary = Game.summary(sv) }
  elseif action == "enhlist" then return { rows = Game.enhCosts(sv), summary = Game.summary(sv) }
  elseif action == "enhance" then local ok, msg = Game.enhance(sv, tonumber(arg)); return { ok = ok, msg = msg, rows = Game.enhCosts(sv), summary = Game.summary(sv) }
  elseif action == "forge" then return { rows = Game.forgeList(sv, type(arg) == "table" and arg.bag == true), summary = Game.summary(sv) }
  elseif action == "affixlist" then return { list = Game.affixList(sv, tonumber(arg)) }
  elseif action == "reroll" then local ok, e = Game.reroll(sv, tonumber(arg.uid), tonumber(arg.idx)); return { ok = ok, err = (not ok) and e or nil, rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "chaos" then local ok, e = Game.chaos(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "divine" then local ok, e = Game.divine(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "stones" then local rows = Game.stones(sv); for _, r in ipairs(rows) do if r.rev then r.label = Game.stoneLabel(r.rev) end end return { rows = rows, items = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "reveal" then local ok, e = Game.reveal(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, label = ok and Game.stoneLabel(e) or nil, summary = Game.summary(sv) }
  elseif action == "socket" then local ok, e = Game.socket(sv, tonumber(arg.item), tonumber(arg.stone), tonumber(arg.idx)); return { ok = ok, err = (not ok) and e or nil, summary = Game.summary(sv) }
  elseif action == "setlang" then sv.lang = (arg == "ko") and "ko" or "en"; return { ok = true }
  elseif action == "setopt" then
    if type(arg) == "table" then sv.set = sv.set or {}; for k, v in pairs(arg) do if OPT_KEYS[k] and type(v) == OPT_KEYS[k] then sv.set[k] = v end end end
    return { ok = true }
  elseif action == "beta" then   -- 설정 창 [베타 관리]: 게임 주인만
    if not isOwner(player) then return { err = "owner only" } end
    local m = type(arg) == "table" and arg.op ~= "view" and betaDo(arg.op, arg.v) or nil
    return { msg = m, view = betaView() }
  elseif action == "isowner" then return { owner = isOwner(player) }
  elseif action == "stats" then return { groups = Game.statsView(sv), summary = Game.summary(sv) }
  elseif action == "stash" then return { view = Game.stashView(sv), summary = Game.summary(sv) }
  elseif action == "stashmove" then local ok, e = Game.stashMove(sv, tonumber(arg.uid), arg.to == "stash"); return { ok = ok, err = (not ok) and e or nil, view = Game.stashView(sv), summary = Game.summary(sv) }
  elseif action == "stashexpand" then local ok, e = Game.stashExpand(sv); return { ok = ok, err = (not ok) and e or nil, view = Game.stashView(sv), summary = Game.summary(sv) }
  elseif action == "presets" then return { rows = Game.presetView(sv) }
  elseif action == "sets" then return { sets = Game.setsView(sv) }
  elseif action == "setswitch" then local ok = type(arg) == "table" and Game.setSwitch(sv, arg.kind, arg.i); return { ok = ok, sets = Game.setsView(sv), summary = Game.summary(sv) }
  elseif action == "presetsave" then local ok = Game.presetSave(sv, tonumber(arg)); return { ok = ok, rows = Game.presetView(sv) }
  elseif action == "presetload" then local ok, e = Game.presetLoad(sv, tonumber(arg)); return { ok = ok, err = (not ok) and e or nil, rows = Game.presetView(sv), summary = Game.summary(sv) }
  elseif action == "sockroll" then local ok, m = Game.sockRoll(sv, tonumber(arg)); return { ok = ok, msg = m, rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "sockdel" then local ok, m = Game.sockDel(sv, tonumber(arg.uid), tonumber(arg.idx)); return { ok = ok, msg = m, rows = Game.forgeList(sv), summary = Game.summary(sv) }
  elseif action == "skillclean" then return { res = Game.skillClean(sv, type(arg) == "table" and arg.rules or {}, type(arg) == "table" and arg.best ~= false), summary = Game.summary(sv) }
  elseif action == "records" then return { view = Game.records(sv), summary = Game.summary(sv) }
  elseif action == "dummy" then   -- 허수아비: 60초 동안 순수 딜 측정 (30초에 한 번)
    if s.dummyT and os.clock() - s.dummyT < 30 then return { err = string.format("You can measure again in %ds", math.ceil(30 - (os.clock() - s.dummyT))) } end
    s.dummyT = os.clock()
    local dmg, by = Battle.dummyDamage(sv, 60, os.time() + player.UserId)
    local dps = math.floor(dmg / 60); local best = sv.dummyBest or 0; local nb = dps > best
    if nb then sv.dummyBest = dps; rankSet("dps", player.UserId, dps) end
    local parts = {}; for id, v in pairs(by or {}) do parts[#parts + 1] = { id = id, dmg = math.floor(v) } end
    table.sort(parts, function(a, b) return a.dmg > b.dmg end)
    return { dps = dps, total = math.floor(dmg), best = math.max(best, dps), newBest = nb, parts = parts }
  elseif action == "ranking" then
    rankPush(player.UserId, sv); if (sv.dummyBest or 0) > 0 then rankSet("dps", player.UserId, sv.dummyBest) end
    local kind = RANKS[arg] and arg or "rift"
    return { kind = kind, rows = rankTop(kind), my = { rift = sv.rift and sv.rift.best or 0, level = sv.level, dps = sv.dummyBest or 0 } }
  elseif action == "mail" then
    sv.mailGot = sv.mailGot or {}; local rows = {}
    for _, m in ipairs(mailList()) do rows[#rows + 1] = { id = m.id, t = m.t, title = m.title, body = m.body, reward = m.reward, got = sv.mailGot[tostring(m.id)] == true } end
    return { rows = rows }
  elseif action == "mailclaim" then
    sv.mailGot = sv.mailGot or {}
    for _, m in ipairs(mailList()) do
      if m.id == tonumber(arg) and not sv.mailGot[tostring(m.id)] then
        sv.mailGot[tostring(m.id)] = true
        for k, v in pairs(m.reward or {}) do if MAIL_KEYS[k] and type(v) == "number" then k = k == "hone" and "arcana" or k; sv[k] = (sv[k] or 0) + v end end
        return { ok = true, summary = Game.summary(sv) }
      end
    end
    return { err = "This mail cannot be claimed" }
  elseif action == "mailsend" then   -- 게임 주인만
    if not isOwner(player) then return { err = "owner only" } end
    if type(arg) ~= "table" then return { err = "Invalid request" } end
    local reward = {}; for k, v in pairs(arg.reward or {}) do if MAIL_KEYS[k] and tonumber(v) and tonumber(v) > 0 then reward[k] = math.floor(tonumber(v)) end end
    local id = mailSend(tostring(arg.title or ""):sub(1, 60), tostring(arg.body or ""):sub(1, 300), reward)
    return { ok = true, id = id }
  elseif action == "speedpass" then return { owns = hasSpeed4(player), id = SPEED4_ID }
  elseif action == "autoclean" then return { res = Game.autoClean(sv, type(arg) == "table" and arg.after == true), summary = Game.summary(sv) }   -- after = 전투 후 자동 (always 일 때만)
  elseif action == "autoget" then return { view = Game.autoView(sv) }
  elseif action == "autoset" then if type(arg) == "table" and type(arg.k) == "string" then Game.autoSet(sv, arg.k, arg.v) end; return { view = Game.autoView(sv) }
  elseif action == "passview" then return { view = Game.passView(sv), summary = Game.summary(sv) }
  elseif action == "passtake" then local n = Game.passTake(sv, arg); return { n = n, view = Game.passView(sv), summary = Game.summary(sv) }
  elseif action == "passpreview" then return { pv = Game.passPreview(sv, arg) }
  elseif action == "passdrop" then local ok, err = Game.passDrop(sv, arg); return { ok = ok, err = err, view = Game.passView(sv), summary = Game.summary(sv) }
  elseif action == "unlocks" then return { u = Game.unlocks(sv), summary = Game.summary(sv) }
  elseif action == "play" then
    if s.busy then return { err = "In battle" } end
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
    if s.busy then return { err = "In battle" } end
    s.busy = true; local res, e = Game.fight(sv, arg.kind, arg.n); s.busy = false
    if not res then return { err = e } end
    return { result = res, summary = Game.summary(sv) }
  elseif action == "battle" then
    if s.busy then return { err = "In battle" } end
    s.busy = true; local res, e = Game.battle(sv, tonumber(arg)); s.busy = false
    if not res then return { err = e } end
    return { result = res, summary = Game.summary(sv) }
  end
  return { err = "Unknown request" }
end

-- ---------- 길드 ----------
local okG, gds = pcall(function() return DSS:GetDataStore("DungeonSlashGuilds") end)
local gstore = (freshTest() and Guild.memoryStore()) or (okG and Guild.datastoreStore(gds)) or Guild.memoryStore()   -- Studio 시험 모드에서는 실제 길드 저장소를 건드리지 않는다
if not okG then warn("Guild: DataStore unavailable → In-memory storage") end
-- 길드 효과를 세이브에 싣는다 (길드 레벨 패시브 · 연구 → Stats). 접속 · 길드 요청마다
local function gsync(uid, sv) local g = Guild.guildOf(gstore, uid); local b = Guild.buffOf(g); sv.guildLv = b and b.lv or 0; sv.gbuff = b and b.per or nil; return g end
gsyncFn = function(uid, sv) return gsync(uid, sv) end
local function gview(player, sv)
  local uid = player.UserId
  local g = gsync(uid, sv)
  if not g then return { none = true, list = Guild.search(gstore, "", "lv"), invites = Guild.invites(gstore, uid), createCost = Guild.CFG.CREATE_COST, joinTypes = Guild.JOIN } end
  local now = os.time()
  local me = g.members[uid]; if me then me.power = Game.summary(sv).power or 0; Guild.updatePower(gstore, uid, me.power) end
  local mem = {}
  for u, m in pairs(g.members) do mem[#mem + 1] = { uid = u, name = m.name, power = m.power or 0, contrib = m.contrib or 0, role = (u == g.leader) and "leader" or ((g.officers or {})[u] and "officer" or "member"), me = u == uid } end
  table.sort(mem, function(a, b) local R = { leader = 0, officer = 1, member = 2 }; if R[a.role] ~= R[b.role] then return R[a.role] < R[b.role] end; return a.power > b.power end)
  local apps = {}; if Guild.canManage(g, uid) then for u, a in pairs(g.apps or {}) do apps[#apps + 1] = { uid = u, name = a.name, lv = a.lv, power = a.power } end end
  local lv, cur, nxt = Guild.levelInfo(g.exp)
  local res = {}; for _, r in ipairs(Guild.RESEARCH) do local l = (g.research or {})[r.id] or 0; res[#res + 1] = { id = r.id, name = r.name, text = r.text, per = r.per, lv = l, cost = Guild.researchCost(l) } end
  local rank; for _, r in ipairs(Guild.search(gstore, "", "lv")) do if r.id == g.id then rank = r.rank end end
  return { id = g.id, name = g.name, lv = lv, exp = g.exp, expCur = cur, expNext = nxt, coins = g.coins, motd = g.motd, count = Guild.memberCount(g), max = Guild.CFG.MAX_MEMBERS,
    role = g.leader == uid and "leader" or ((g.officers or {})[uid] and "officer" or "member"), emblem = g.emblem or { s = 1, c = 1 }, desc = g.desc or "", join = g.join or "open", minLv = g.minLv or 1, joinTypes = Guild.JOIN,
    members = mem, apps = apps, power = Guild.totalPower(g), rank = rank, research = res,
    goals = Guild.goals(g, now), bossTries = Guild.bossTriesLeft(g, uid, now), bossRank = Guild.bossRanking(g, now), bossTotal = Guild.bossTotal(g, now), shop = Guild.SHOP }
end
local function grant(sv, t) for k, v in pairs(t) do if k == "upKeys" then sv.upKeys = (sv.upKeys or 0) + v else sv[k] = (sv[k] or 0) + v end end end
local function guildAction(player, sv, action, arg)
  local uid, name = player.UserId, player.Name
  if action == "g_view" then return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_create" then
    local opt = type(arg) == "table" and arg or { name = arg }
    local g, e, cost = Guild.create(gstore, uid, name, tostring(opt.name or ""), sv.gold, nil, opt); if not g then return { err = e } end
    sv.gold -= cost; return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_join" then local g, e = Guild.apply(gstore, uid, name, tostring(arg), sv.level, Game.summary(sv).power); if not g then return { err = e } end return { view = gview(player, sv), summary = Game.summary(sv), msg = g.applied and "Application sent" or "Joined!" }
  elseif action == "g_search" then local a = type(arg) == "table" and arg or {}; return { list = Guild.search(gstore, a.q, a.sort) }
  elseif action == "g_set" then local g, e = Guild.setSettings(gstore, uid, arg); if not g then return { err = e } end return { view = gview(player, sv) }
  elseif action == "g_app" then local g, e = Guild.answerApp(gstore, uid, tonumber(arg and arg.uid), arg and arg.ok); if not g then return { err = e } end return { view = gview(player, sv) }
  elseif action == "g_inv" then local g, e = Guild.answerInvite(gstore, uid, name, tostring(arg and arg.id), arg and arg.ok); if not g then return { err = e } end return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_invite" then
    local ok, tid = pcall(function() return Players:GetUserIdFromNameAsync(tostring(arg)) end)
    if not ok or not tid then return { err = "No player found with that name" } end
    local g, e = Guild.invite(gstore, uid, tid); if not g then return { err = e } end return { view = gview(player, sv), msg = tostring(arg) .. " has been invited" }
  elseif action == "g_role" then local g, e = Guild.setRole(gstore, uid, tonumber(arg and arg.uid), arg and arg.role); if not g then return { err = e } end return { view = gview(player, sv) }
  elseif action == "g_research" then local g, e = Guild.upgradeResearch(gstore, uid, tostring(arg)); if not g then return { err = e } end return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_leave" then local g, e = Guild.leave(gstore, uid); if not g then return { err = e } end return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_motd" then local g, e = Guild.setMotd(gstore, uid, arg); if not g then return { err = e } end return { view = gview(player, sv) }
  elseif action == "g_donate" then
    local amt = math.floor(tonumber(arg) or 0); if amt > sv.gold then return { err = "Not enough Gold" } end
    local g, e, cost = Guild.donate(gstore, uid, amt); if not g then return { err = e } end
    sv.gold -= cost; return { view = gview(player, sv), summary = Game.summary(sv) }
  elseif action == "g_claim" then
    local r, e = Guild.claimGoals(gstore, uid); if not r then return { err = e } end
    grant(sv, r); return { view = gview(player, sv), summary = Game.summary(sv), msg = "Upgrade Stone " .. r.ore }
  elseif action == "g_bossclaim" then
    local r, e, rank = Guild.claimPrevBoss(gstore, uid); if not r then return { err = e } end
    grant(sv, r); return { view = gview(player, sv), summary = Game.summary(sv), msg = rank .. "Rank Rewards" }
  elseif action == "g_boss" then
    local g = Guild.guildOf(gstore, uid); if not g then return { err = "No Guild" } end
    if Guild.bossTriesLeft(g, uid) <= 0 then return { err = "No challenge attempts left this week" } end
    local dmg = Battle.dummyDamage(sv, Guild.CFG.BOSS_SECONDS, os.time() + uid)
    Guild.bossSubmit(gstore, uid, dmg); return { dmg = dmg, view = gview(player, sv) }
  elseif action == "g_buy" then
    local grantT, e = Guild.buy(gstore, uid, tostring(arg)); if not grantT then return { err = e } end
    grant(sv, grantT); return { view = gview(player, sv), summary = Game.summary(sv) }
  end
end

rpc.OnServerInvoke = function(player, action, arg)
  if action == "sheet" then return sheetAction(arg) end
  local s = sessions[player.UserId]
  if s and type(action) == "string" and action:sub(1, 2) == "g_" then
    local ok, r = pcall(guildAction, player, s.sv, action, arg)
    if not ok then warn("guild:", r); return { err = "Guild server error" } end
    return r or { err = "Unknown request" }
  end
  if not s then return { err = "Loading save data" } end
  if type(action) ~= "string" then return { err = "Invalid request" } end
  local now = os.clock()
  if action ~= "wstate" and action ~= "wpop" and action ~= "sheet" then
    if now - (s.last or 0) < 0.08 then return { err = "Too many requests" } end
    s.last = now
  end
  if arg ~= nil and type(arg) ~= "table" and type(arg) ~= "string" and type(arg) ~= "number" then return { err = "Invalid request" } end
  local sv = s.sv
  local k0, c0, b0 = 0, 0, 0
  if sv then k0, c0 = sv.stats.kills, sv.stats.clears; b0 = (sv.daily and sv.daily.bosses) or 0 end
  local wantRec = action == "fight" or action == "battle" or action == "play"
  if wantRec then Battle.recording = true; Battle.lastRec = nil end
  local okH, res = pcall(handle, player, action, arg)
  Battle.recording = false
  if wantRec and okH and type(res) == "table" and res.result and Battle.lastRec then res.result.replay = Battle.lastRec; Battle.lastRec = nil end
  if not okH then warn("rpc error:", action, res); s.busy = false; return { err = "Error processing request" } end
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
