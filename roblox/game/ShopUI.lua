-- 로벅스 상점 화면 (Menus 에서 분리: 스크립트 길이 한도). Menus 가 require(ShopUI)(M, 도우미) 로 붙인다.
-- 목록 · 가격은 서버 Monetization.catalog. 상품 ID 가 0 이면 "Coming Soon".
return function(M, h)
local mk, corner, stroke, txt, area = h.mk, h.corner, h.stroke, h.txt, h.area
local C = setmetatable({}, { __index = function(_, k) return h.C()[k] end })
local MPS = game:GetService("MarketplaceService")
local player = game:GetService("Players").LocalPlayer

local TABS = { { "boost", "Boosts" }, { "pack", "Packs" }, { "pass", "Passes" } }
local CAT_COL = { boost = Color3.fromRGB(90, 170, 255), pack = Color3.fromRGB(255, 180, 70), pass = Color3.fromRGB(200, 120, 255) }
local EMOJI = { i_exp = "⭐", i_loot = "🎁", i_bag = "🎒", i_chest = "🧰", i_key = "🗝️" }
local tab = "boost"
local prices = {}   -- 상품 ID → "99 R$" (한 번만 묻는다)
local root   -- 지금 그려진 상점 (구매 뒤 다시 그릴지 판단)

local function priceOf(it)
  if prices[it.id] then return prices[it.id] end
  local ok, info = pcall(function() return MPS:GetProductInfo(it.id, it.kind == "pass" and Enum.InfoType.GamePass or Enum.InfoType.Product) end)
  local p = (ok and info and info.PriceInRobux) and (tostring(info.PriceInRobux) .. " R$") or "Buy"
  prices[it.id] = p; return p
end
local function left(sec)
  if sec >= 3600 then return string.format("%dh %02dm", sec // 3600, (sec % 3600) // 60) end
  return string.format("%dm %02ds", sec // 60, sec % 60)
end

local function itemCard(parent, it, order)
  local col = CAT_COL[it.cat] or M.GOLD
  local f = mk("Frame", { Size = UDim2.new(0, 210, 0, 262), BackgroundColor3 = Color3.new(1, 1, 1), LayoutOrder = order }, parent); corner(f, 10)
  mk("UIGradient", { Rotation = 90, Color = ColorSequence.new(col:Lerp(Color3.fromRGB(20, 14, 24), 0.72), Color3.fromRGB(14, 10, 14)) }, f)
  stroke(f, col:Lerp(Color3.fromRGB(230, 190, 110), 0.5), 2)
  -- 아이콘: 뒤에 은은한 빛
  local glow = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0, 60), Size = UDim2.new(0, 96, 0, 96), BackgroundColor3 = col, BackgroundTransparency = 0.78 }, f); corner(glow)
  local a = C.Sprites.art(it.icon or "")
  if a then mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0, 60), Size = UDim2.new(0, 76, 0, 76), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit }, f)
  else local e = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0, 60), Size = UDim2.new(0, 70, 0, 70), BackgroundTransparency = 1, Text = EMOJI[it.icon] or "💎", TextScaled = true }, f); e:SetAttribute("NoTr", true) end
  local nm = txt(f, it.name, 16, UDim2.new(0, 10, 0, 112), UDim2.new(1, -20, 0, 40), Color3.fromRGB(255, 228, 150), M.FONT, Enum.TextXAlignment.Center)
  nm.TextScaled = true; mk("UITextSizeConstraint", { MaxTextSize = 17, MinTextSize = 10 }, nm); mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, nm)
  local ds = txt(f, it.desc, 12, UDim2.new(0, 10, 0, 154), UDim2.new(1, -20, 0, 52), Color3.fromRGB(215, 210, 230), nil, Enum.TextXAlignment.Center)
  ds.TextScaled = true; mk("UITextSizeConstraint", { MaxTextSize = 13, MinTextSize = 8 }, ds)
  local full = it.daily and (it.used or 0) >= it.daily
  if it.daily then txt(f, string.format("Today %d / %d", it.used or 0, it.daily), 11, UDim2.new(0, 10, 0, 206), UDim2.new(1, -20, 0, 14), full and Color3.fromRGB(255, 130, 120) or Color3.fromRGB(160, 155, 175), nil, Enum.TextXAlignment.Center) end
  local label, color, cb
  if it.owned then label, color = "Owned", M.BTN.green
  elseif it.id == 0 then label, color = "Coming Soon", M.BTN.gray; cb = function() C.toast("Coming soon") end
  elseif full then label, color = "Daily limit", M.BTN.gray; cb = function() C.toast("Come back tomorrow") end
  else
    label, color = priceOf(it), M.BTN.gold
    cb = function() pcall(function() if it.kind == "pass" then MPS:PromptGamePassPurchase(player, it.id) else MPS:PromptProductPurchase(player, it.id) end end) end
  end
  local b = M.btn(f, label, UDim2.new(1, -24, 0, 30), color, cb); b.Position = UDim2.new(0, 12, 1, -38)
end

function M.robux()
  C.clear()
  local r = C.rpc:InvokeServer("robuxshop")
  if not r or r.err then C.msg.Text = tostring(r and r.err or "Shop unavailable"); return end
  local A = area(392); root = A
  -- 위: 켜져 있는 부스트 남은 시간
  local top = mk("Frame", { Size = UDim2.new(1, 0, 0, 40), BackgroundColor3 = Color3.new(1, 1, 1) }, A); corner(top, 8)
  mk("UIGradient", { Color = ColorSequence.new(Color3.fromRGB(40, 26, 60), Color3.fromRGB(22, 14, 20)) }, top); stroke(top, Color3.fromRGB(120, 92, 48), 1.2)
  local function boostText(name, sec) return sec > 0 and string.format("%s  %s left", name, left(sec)) or (name .. "  off") end
  for i, b in ipairs({ { "EXP x2", r.boostExp or 0 }, { "Loot Boost", r.boostLoot or 0 } }) do
    local t = txt(top, boostText(b[1], b[2]), 14, UDim2.new((i - 1) * 0.5, 14, 0, 0), UDim2.new(0.5, -28, 1, 0), b[2] > 0 and Color3.fromRGB(140, 255, 170) or Color3.fromRGB(150, 145, 165), M.FONT)
    t.TextYAlignment = Enum.TextYAlignment.Center
  end
  -- 분류 탭
  local bar = mk("Frame", { Position = UDim2.new(0, 0, 0, 48), Size = UDim2.new(1, 0, 0, 34), BackgroundTransparency = 1 }, A)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Center, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, bar)
  for i, t in ipairs(TABS) do local b = M.btn(bar, t[2], UDim2.new(0, 130, 1, 0), tab == t[1] and M.BTN.gold or M.BTN.gray, function() tab = t[1]; M.robux() end); b.LayoutOrder = i end
  -- 상품 카드
  local sf = mk("ScrollingFrame", { Position = UDim2.new(0, 0, 0, 90), Size = UDim2.new(1, 0, 1, -90), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6 }, A)
  mk("UIGridLayout", { CellSize = UDim2.new(0, 210, 0, 262), CellPadding = UDim2.new(0, 12, 0, 12), HorizontalAlignment = Enum.HorizontalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }, sf)
  mk("UIPadding", { PaddingTop = UDim.new(0, 4) }, sf)
  local k = 0
  for _, it in ipairs(r.items or {}) do if it.cat == tab then k += 1; itemCard(sf, it, k) end end
end
-- 구매가 끝나면 (상점이 열려 있으면) 남은 시간 · 구매 수를 새로 그린다
MPS.PromptProductPurchaseFinished:Connect(function(uid, _, bought) if bought and uid == player.UserId then task.delay(1.5, function() if root and root.Parent then M.robux() end end) end end)
MPS.PromptGamePassPurchaseFinished:Connect(function(p, _, bought) if bought and p == player then task.delay(1.5, function() if root and root.Parent then M.robux() end end) end end)
end
