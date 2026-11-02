-- 수익화 설정 + 영수증 처리 골격. 상품 ID가 0이면 비활성. ServerStorage 에 둔다 (클라이언트에 노출 금지).
local M = {}

M.PASSES = {   -- 게임패스 (영구)
  autoPack   = { id = 0, name = "Auto-Battle Pack" },
  bagPlus    = { id = 0, name = "Expand Bag", bag = 100, stash = 100, stoneCap = 50 },
  goldPlus   = { id = 0, name = "Gold +50%", gold = 0.5 },
  presetPlus = { id = 0, name = "Expand Presets", presets = 3 },
  statsView  = { id = 0, name = "Battle Stats" },
  speed4     = { id = 2063961736, name = "4x Speed" },   -- 전투 재생 x4 배속 (x1~x3 무료). 2026-11-02 사용자가 생성
}

M.PRODUCTS = {   -- 개발자 상품 (소모성). daily = 하루 구매 한도
  ore       = { id = 0, name = "Upgrade Stone Bundle", daily = 5,  grant = { ore = 2000 } },
  rerollSafe= { id = 0, name = "Reroll Protection Ticket", daily = 10, grant = { rerollSafe = 1 } },
  keys      = { id = 0, name = "Entry Key Bundle", daily = 3,  grant = { upKeys = 5 } },
  offline2x = { id = 0, name = "Offline Rewards x2", daily = 3, grant = { offline2x = 1 } },
  lockOne   = { id = 0, name = "Orb of Wishes", daily = 3,  grant = { lockOne = 1 } },
}

M.FORBIDDEN = { "cbook", "satan", "charm", "mythic", "stone", "spireFloor", "power" }   -- 판매 금지 항목 (지급 함수가 이 키를 거부한다)

local byProductId = {}
for key, p in pairs(M.PRODUCTS) do if p.id ~= 0 then byProductId[p.id] = key end end

-- ProcessReceipt 골격: data = 플레이어 세이브 테이블, log = DataStore에서 읽은 구매 로그(PurchaseId → true)
function M.process(receipt, data, log, today)
  local key = byProductId[receipt.ProductId]; if not key then return false, "unknown" end
  if log[receipt.PurchaseId] then return true, "dup" end   -- 이미 지급함 (멱등)
  local p = M.PRODUCTS[key]
  data.buy = data.buy or {}
  local day = data.buy[key]
  if not day or day.d ~= today then day = { d = today, n = 0 }; data.buy[key] = day end
  if day.n >= p.daily then return false, "daily" end
  for g, v in pairs(p.grant) do
    for _, f in ipairs(M.FORBIDDEN) do if g == f then return false, "forbidden" end end
    data.wallet = data.wallet or {}; data.wallet[g] = (data.wallet[g] or 0) + v
  end
  day.n += 1; log[receipt.PurchaseId] = true
  return true, "ok"
end

return M
