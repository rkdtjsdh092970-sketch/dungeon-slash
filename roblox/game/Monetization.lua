-- 수익화: 상품 정의 + 지급. 상품 ID 가 0 이면 상점에 "Coming Soon" (사용자가 Roblox 에서 상품을 만들고 ID 를 넣으면 바로 판매).
-- ServerStorage 에 둔다. 클라이언트 상점 목록은 M.catalog() 로 보낸다 (ID · 이름 · 설명 · 분류만).
local RS = game:GetService("ReplicatedStorage")
local M = {}

M.PASSES = {   -- 게임패스 (영구)
  speed4     = { id = 2063961736, name = "4x Speed", desc = "Watch battles at x4 speed (x1–x3 are free). Permanent.", cat = "pass", icon = "i_speed" },
  bagPlus    = { id = 0, name = "Expand Bag", desc = "Bag & storage +100 slots. Permanent.", cat = "pass", icon = "i_bag" },
  goldPlus   = { id = 0, name = "Gold +50%", desc = "Gold from battles x1.5. Permanent.", cat = "pass", icon = "i_gold" },
}

-- 개발자 상품 (소모성): 시간을 사는 상품. daily = 하루 구매 한도
M.PRODUCTS = {
  expBoost  = { id = 0, name = "EXP Boost x2 (1 hour)", desc = "Double EXP from victories for 1 hour. Stacks up time.", cat = "boost", daily = 5, icon = "i_exp" },
  lootBoost = { id = 0, name = "Loot Boost (1 hour)", desc = "Gear drops from victories +50%, for 1 hour. Stacks up time.", cat = "boost", daily = 5, icon = "i_loot" },
  gearChest = { id = 0, name = "Legendary Gear Chest", desc = "One legendary item of your current Rift tier (random slot).", cat = "pack", daily = 5, icon = "i_weapon" },
  shards    = { id = 0, name = "Arcana Shards x300", desc = "Enough for three x10 summons.", cat = "pack", daily = 5, icon = "i_arcana" },
  gateKeys  = { id = 0, name = "Boss Gate Key Bundle", desc = "2 keys for each of the six Boss Gates — farm basic attacks faster.", cat = "pack", daily = 3, icon = "i_bossgate" },
  ore       = { id = 0, name = "Upgrade Stone Bundle", desc = "300 Upgrade Stones for enhancing gear.", cat = "pack", daily = 5, icon = "i_ore" },
}

-- 상점에 보낼 목록 (서버 비밀 없음)
function M.catalog(sv)
  local out = {}
  for key, p in pairs(M.PASSES) do out[#out + 1] = { key = key, kind = "pass", id = p.id, name = p.name, desc = p.desc, cat = p.cat, icon = p.icon } end
  for key, p in pairs(M.PRODUCTS) do
    local used = sv and sv.buy and sv.buy[key] and sv.buy[key].d == math.floor(os.time() / 86400) and sv.buy[key].n or 0
    out[#out + 1] = { key = key, kind = "product", id = p.id, name = p.name, desc = p.desc, cat = p.cat, icon = p.icon, daily = p.daily, used = used }
  end
  table.sort(out, function(a, b) if a.cat ~= b.cat then return a.cat < b.cat end; return a.name < b.name end)
  return out
end

-- 지급 (sv = 플레이어 세이브). 성공하면 true, 안내 문구
local grant = {}
grant.expBoost = function(sv) local now = os.time(); sv.boostExp = math.max(now, sv.boostExp or 0) + 3600; return "EXP x2 active" end
grant.lootBoost = function(sv) local now = os.time(); sv.boostLoot = math.max(now, sv.boostLoot or 0) + 3600; return "Loot Boost active" end
grant.shards = function(sv) sv.arcana = (sv.arcana or 0) + 300; return "+300 Arcana Shards" end
grant.ore = function(sv) sv.ore = (sv.ore or 0) + 300; return "+300 Upgrade Stones" end
grant.gateKeys = function(sv) for _, k in ipairs({ "keys", "keys2", "keys3", "keys4", "keys5", "keys6" }) do sv[k] = (sv[k] or 0) + 2 end; return "+2 keys for every Boss Gate" end
grant.gearChest = function(sv)
  local Loot = require(RS.Game.Loot)
  local tier = math.max(1, math.min(5, 1 + math.floor((sv.rift and sv.rift.best or 0) / 20)))
  local it = Loot.genItem(Random.new(os.time() + (sv.nextUid or 1)), sv, tier, 3)
  sv.inv = sv.inv or {}; table.insert(sv.inv, 1, it)
  return string.format("Legendary T%d gear added to your bag", tier)
end

local byProductId = {}
for key, p in pairs(M.PRODUCTS) do if p.id ~= 0 then byProductId[p.id] = key end end

-- 영수증 처리: 같은 구매는 한 번만 (sv.receipts), 하루 한도. 반환 true = 지급함(또는 이미 지급)
function M.process(receipt, sv)
  local key = byProductId[receipt.ProductId]; if not key then return false, "unknown" end
  sv.receipts = sv.receipts or {}
  if sv.receipts[receipt.PurchaseId] then return true, "dup" end
  local p = M.PRODUCTS[key]; local today = math.floor(os.time() / 86400)
  sv.buy = sv.buy or {}
  local day = sv.buy[key]; if not day or day.d ~= today then day = { d = today, n = 0 }; sv.buy[key] = day end
  if day.n >= p.daily then return false, "daily" end
  local msg = grant[key] and grant[key](sv) or nil; if not msg then return false, "nogrant" end
  day.n += 1; sv.receipts[receipt.PurchaseId] = true
  local n = 0; for _ in pairs(sv.receipts) do n += 1 end
  if n > 200 then sv.receipts = { [receipt.PurchaseId] = true } end   -- 오래된 기록 정리 (같은 영수증은 곧바로 다시 오므로 최근 것만 있으면 된다)
  return true, msg
end

return M
