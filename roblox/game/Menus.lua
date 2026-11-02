-- 메뉴 화면 (장비 · 스킬 · 패시브 트리) — 웹 버전 ui3.js 의 openItems / openSkills / openPassives 를 로블록스용으로.
-- 클라이언트가 M.init(ctx) 로 창(list · msg · rpc 등)을 넘겨준다. 글자는 한국어로 쓰고 Lang 이 자동 번역한다.
local TweenService = game:GetService("TweenService")
local UIS = game:GetService("UserInputService")
local RS = game:GetService("ReplicatedStorage")
local Data = RS.Game.Data
local Skills = require(Data.Skills)
local Passives = require(Data.Passives)
local Items = require(Data.Items)
local Skin = require(script.Parent.Skin)
local M = {}
local C   -- ctx: rpc, list, msg, clear, setSummary, summary(), toast, prompt, Sprites

local function mk(class, props, parent) local o = Instance.new(class); for k, v in pairs(props) do o[k] = v end; o.Parent = parent; return o end
local function corner(o, r) mk("UICorner", { CornerRadius = r and UDim.new(0, r) or UDim.new(1, 0) }, o) end
local function stroke(o, c, t) return mk("UIStroke", { Color = c, Thickness = t or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, o) end
local function hex(h) local ok, c = pcall(Color3.fromHex, h or "#ffffff"); return ok and c or Color3.new(1, 1, 1) end
local function n(x) x = math.floor(x or 0); if x >= 1e6 then return string.format("%.1fM", x / 1e6) elseif x >= 1e4 then return string.format("%.1fK", x / 1e3) end return tostring(x) end

local Theme = require(script.Parent.Theme)
M.FONT, M.BODY = Theme.FONT, Theme.BODY
M.GOLD, M.DARK, M.PANEL = Theme.GOLD, Theme.DARK, Theme.PANEL
-- 등급 색: 일반 · 매직 · 레어 · 전설 (사탄 장비는 보라)
M.RAR = { Color3.fromRGB(205, 205, 215), Color3.fromRGB(90, 150, 255), Color3.fromRGB(255, 214, 70), Color3.fromRGB(255, 140, 40) }
M.SAT = Color3.fromRGB(200, 90, 255)
M.ITEM_RAR = { "일반", "매직", "레어", "전설" }
M.BTN = Theme.BTN
local SLOT_ART = { weapon = "i_weapon", helm = "i_helm", armor = "i_armor", gloves = "i_gloves", boots = "i_boots", ring = "i_ring", ring2 = "i_ring", neck = "i_neck" }
local function artOf(it) if it and it.wt == "staff" and C.Sprites.art("i_staff") then return "i_staff" end; return it and SLOT_ART[it.slot] end   -- 무기는 종류별 그림 (지팡이)
local SLOT_EMOJI = { weapon = "⚔", helm = "⛑", armor = "🛡", gloves = "🧤", boots = "👢", ring = "💍", ring2 = "💍", neck = "📿" }
local ELEM = { fire = Color3.fromRGB(255, 120, 50), cold = Color3.fromRGB(110, 200, 255), light = Color3.fromRGB(255, 225, 80), void = Color3.fromRGB(170, 100, 255), phys = Color3.fromRGB(210, 210, 220) }
local SK_BY = {}; for _, d in ipairs(Skills.SKILLS) do SK_BY[d.id] = d end
M.SK_BY = SK_BY

function M.init(ctx) C = ctx end

-- 게임 버튼: 색 + 위아래 밝기 차 + 테두리 + 굵은 글꼴
function M.btn(parent, text, size, color, cb)
  local b = mk("TextButton", { Size = size, BackgroundColor3 = color or M.BTN.purple, Text = text, TextColor3 = Color3.new(1, 1, 1), Font = M.FONT, TextSize = 16, AutoButtonColor = true }, parent)
  corner(b, 8); stroke(b, Color3.fromRGB(20, 10, 30), 2)
  mk("UIGradient", { Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(170, 170, 170)), Rotation = 90 }, b)
  mk("UIStroke", { Thickness = 1.5, Color = Color3.fromRGB(20, 10, 30), ApplyStrokeMode = Enum.ApplyStrokeMode.Contextual }, b)
  if cb then b.MouseButton1Click:Connect(cb) end
  Skin.button(b)
  return b
end
local function txt(parent, text, size, pos, sz, color, font, xa)
  return mk("TextLabel", { BackgroundTransparency = 1, Position = pos, Size = sz, Text = text, TextColor3 = color or Color3.new(1, 1, 1), Font = font or M.BODY, TextSize = size, TextWrapped = true,
    TextXAlignment = xa or Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top }, parent)
end
-- 아이콘 타일: 등급 테두리 · 아이콘(그림 없으면 이모지/글자) · 왼쪽 위/오른쪽 아래 작은 글자
local tipGui, tipBox, tipTitle, tipBody, tipConn
local function tipShow(t)
  local Players = game:GetService("Players")
  if not tipGui then
    tipGui = mk("ScreenGui", { Name = "DungeonTip", DisplayOrder = 60, IgnoreGuiInset = true, ResetOnSpawn = false }, Players.LocalPlayer.PlayerGui)
    pcall(function() require(script.Parent.Lang).watch(tipGui) end); pcall(function() require(script.Parent.Theme).watch(tipGui) end)
    tipBox = mk("Frame", { Size = UDim2.new(0, 300, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundColor3 = Color3.fromRGB(14, 11, 20), BackgroundTransparency = 0.04, Visible = false, ZIndex = 50 }, tipGui)
    corner(tipBox, 8); stroke(tipBox, M.GOLD, 1.5)
    mk("UIPadding", { PaddingTop = UDim.new(0, 8), PaddingBottom = UDim.new(0, 8), PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10) }, tipBox)
    mk("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, tipBox)
    tipTitle = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, TextWrapped = true, Font = M.FONT, TextSize = 17, TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = 1, ZIndex = 51, Text = "" }, tipBox)
    tipBody = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, TextWrapped = true, Font = M.BODY, TextSize = 13, TextColor3 = Color3.fromRGB(225, 220, 240), TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = 2, ZIndex = 51, Text = "" }, tipBox)
  end
  tipTitle.Text = t.title or ""; tipTitle.TextColor3 = t.color or Color3.new(1, 1, 1); tipBody.Text = table.concat(t.lines or {}, "\n"); tipBox.Visible = true
  if tipConn then tipConn:Disconnect() end
  tipConn = game:GetService("RunService").RenderStepped:Connect(function()
    local m = UIS:GetMouseLocation(); local vp = workspace.CurrentCamera.ViewportSize; local sz = tipBox.AbsoluteSize
    local x = m.X + 18; if x + sz.X > vp.X - 8 then x = m.X - sz.X - 12 end
    local y = math.clamp(m.Y - 10, 8, math.max(8, vp.Y - sz.Y - 8)); tipBox.Position = UDim2.new(0, x, 0, y)
  end)
end
local function tipHide() if tipBox then tipBox.Visible = false end; if tipConn then tipConn:Disconnect(); tipConn = nil end end
M.tipShow, M.tipHide = tipShow, tipHide
-- 장비 카드 (상세 창 · 툴팁 공용): 이름 · 부위/티어 · 기본 능력치 · 옵션(티어 표시) · 사탄 효과
M.TIER_COL = { Color3.fromRGB(255, 150, 40), Color3.fromRGB(215, 95, 255), Color3.fromRGB(80, 160, 255), Color3.fromRGB(90, 205, 120), Color3.fromRGB(190, 190, 190), Color3.fromRGB(120, 120, 120) }
function M.itemCard(parent, it, order, head)
  local f = mk("Frame", { Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundColor3 = Color3.fromRGB(14, 10, 10), BackgroundTransparency = 0.1, LayoutOrder = order or 0, ZIndex = parent.ZIndex }, parent)
  corner(f, 6); stroke(f, (it.sat and M.SAT or M.RAR[(it.rarity or 0) + 1]):Lerp(Color3.new(0, 0, 0), 0.35), 1.5)
  mk("UIPadding", { PaddingTop = UDim.new(0, 8), PaddingBottom = UDim.new(0, 10), PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10) }, f)
  mk("UIListLayout", { Padding = UDim.new(0, 3), SortOrder = Enum.SortOrder.LayoutOrder }, f)
  local z = f.ZIndex
  local function line(text, size, color, o, font)
    local l = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, TextWrapped = true, Text = text, TextSize = size, TextColor3 = color, Font = font or M.BODY,
      TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = o, ZIndex = z }, f)
    return l
  end
  local function rule(o) mk("Frame", { Size = UDim2.new(1, 0, 0, 1), BackgroundColor3 = Color3.fromRGB(120, 92, 48), BorderSizePixel = 0, LayoutOrder = o, ZIndex = z }, f) end
  local col = it.sat and M.SAT or M.RAR[(it.rarity or 0) + 1]
  if head then line(head, 12, Color3.fromRGB(170, 160, 150), 0) end
  local t = line(it.title or "", 18, col, 1, M.FONT); mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, t)
  if it.dp and it.dp ~= 0 then line(string.format("전투력 %s%s", it.dp > 0 and "+" or "", n(it.dp)), 14, it.dp > 0 and Color3.fromRGB(120, 255, 140) or Color3.fromRGB(255, 120, 110), 2, M.FONT)
  elseif it.up then line("▲ 지금보다 강해집니다", 13, Color3.fromRGB(120, 255, 140), 2, M.FONT) end
  rule(3)
  for i, b in ipairs(it.base or {}) do line(b, 15, Color3.fromRGB(245, 240, 230), 3 + i, M.FONT) end
  if it.aff and #it.aff > 0 then
    rule(20)
    for i, a in ipairs(it.aff) do
      local row = mk("Frame", { Size = UDim2.new(1, 0, 0, 20), BackgroundTransparency = 1, LayoutOrder = 20 + i, ZIndex = z }, f)
      local tc = a.t and (M.TIER_COL[a.t] or M.TIER_COL[6]) or Color3.fromRGB(90, 90, 90)
      local bd = mk("TextLabel", { Size = UDim2.new(0, 28, 0, 17), Position = UDim2.new(0, 0, 0, 1), BackgroundColor3 = tc, Text = a.t and ("T" .. a.t) or "–", TextSize = 12, Font = M.FONT, TextColor3 = Color3.fromRGB(20, 12, 8), ZIndex = z }, row)
      bd:SetAttribute("NoTr", true); corner(bd, 4)
      mk("TextLabel", { Position = UDim2.new(0, 34, 0, 0), Size = UDim2.new(1, -34, 1, 0), BackgroundTransparency = 1, Text = a.s, TextSize = 14, TextColor3 = tc:Lerp(Color3.new(1, 1, 1), 0.55), Font = M.BODY,
        TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd, ZIndex = z }, row)
    end
  elseif not it.base then   -- 예전 형식 (lines 만 있음)
    line(table.concat(it.lines or {}, "\n"), 14, Color3.fromRGB(230, 225, 245), 21)
  end
  if it.satText then rule(60); line("✦ " .. it.satText, 14, M.SAT, 61) end
  return f
end
-- 장비 툴팁: 마우스 옆에 바로, 착용 중인 같은 부위와 나란히 비교
local itGui, itBox, itConn
function M.itemTip(it, cur)
  if not itGui then
    itGui = mk("ScreenGui", { Name = "DungeonItemTip", DisplayOrder = 61, IgnoreGuiInset = true, ResetOnSpawn = false }, game:GetService("Players").LocalPlayer.PlayerGui)
    pcall(function() require(script.Parent.Lang).watch(itGui) end); pcall(function() require(script.Parent.Theme).watch(itGui) end)
    itBox = mk("Frame", { Size = UDim2.new(0, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.XY, BackgroundTransparency = 1, Visible = false, ZIndex = 60 }, itGui)
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), VerticalAlignment = Enum.VerticalAlignment.Top, SortOrder = Enum.SortOrder.LayoutOrder }, itBox)
  end
  for _, c in ipairs(itBox:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end
  local function col(x, o, head) local h = mk("Frame", { Size = UDim2.new(0, 290, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1, LayoutOrder = o, ZIndex = 60 }, itBox); mk("UIListLayout", {}, h); M.itemCard(h, x, 0, head) end
  col(it, 1, nil)
  if cur and cur ~= it then col(cur, 2, "착용 중") end
  itBox.Visible = true
  if itConn then itConn:Disconnect() end
  itConn = game:GetService("RunService").RenderStepped:Connect(function()
    local m = UIS:GetMouseLocation(); local vp = workspace.CurrentCamera.ViewportSize; local sz = itBox.AbsoluteSize
    local x = m.X + 20; if x + sz.X > vp.X - 8 then x = m.X - sz.X - 16 end
    itBox.Position = UDim2.new(0, math.max(8, x), 0, math.clamp(m.Y - 20, 8, math.max(8, vp.Y - sz.Y - 8)))
  end)
end
function M.itemTipHide() if itBox then itBox.Visible = false end; if itConn then itConn:Disconnect(); itConn = nil end end
function M.tile(parent, size, o)
  local col = o.color or M.RAR[(o.rarity or 0) + 1] or M.RAR[1]
  local b = mk("TextButton", { Size = UDim2.new(0, size, 0, o.h or size), BackgroundColor3 = Color3.fromRGB(26, 20, 44), Text = "", AutoButtonColor = false, LayoutOrder = o.order or 0 }, parent)
  corner(b, 10); local st = stroke(b, col, o.selected and 4 or 2.5)
  mk("UIGradient", { Color = ColorSequence.new(col:Lerp(Color3.new(0, 0, 0), 0.55), Color3.fromRGB(22, 16, 36)), Rotation = 90 }, b)
  local a = o.art and C.Sprites.art(o.art)
  if a then mk("ImageLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(0.78, 0, 0.78, 0), ScaleType = Enum.ScaleType.Fit, ImageContent = a.content, ImageTransparency = o.dim and 0.6 or 0 }, b)
  elseif o.emoji then mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), Text = o.emoji, TextScaled = true, Font = M.FONT, TextColor3 = col, TextTransparency = o.dim and 0.6 or 0 }, b) end
  if o.label then local l = txt(b, o.label, 11, UDim2.new(0, 2, 1, -28), UDim2.new(1, -4, 0, 26), Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Center); l.TextYAlignment = Enum.TextYAlignment.Bottom; mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, l) end
  if o.tl then local l = txt(b, o.tl, o.tl == "▲" and 16 or 12, UDim2.new(0, 5, 0, 2), UDim2.new(1, -8, 0, 18), o.tl == "▲" and Color3.fromRGB(90, 255, 120) or Color3.fromRGB(255, 240, 200), M.FONT); l.ZIndex = 3; mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, l) end   -- ▲ = 끼면 전투력 상승 (초록)
  if o.br then local l = txt(b, o.br, 13, UDim2.new(0, 2, 1, -18), UDim2.new(1, -6, 0, 16), Color3.fromRGB(120, 255, 140), M.FONT, Enum.TextXAlignment.Right); mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, l) end
  if o.check then local c = mk("TextLabel", { Name = "Check", AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -3, 0, 3), Size = UDim2.new(0, 20, 0, 20), BackgroundColor3 = Color3.fromRGB(60, 190, 90), Text = "✓", TextColor3 = Color3.new(1, 1, 1), Font = M.FONT, TextSize = 14 }, b); corner(c) end
  b:SetAttribute("Sel", o.selected and true or false)
  b.MouseEnter:Connect(function() st.Thickness = 4 end); b.MouseLeave:Connect(function() st.Thickness = b:GetAttribute("Sel") and 4 or 2.5 end)
  do local sk = Skin.frame(b, "ui_slot", 0.3, 0.5); if sk then sk.ImageColor3 = Color3.new(1, 1, 1):Lerp(col, 0.55); if o.selected then sk.ImageColor3 = col end end   -- 슬롯 그림을 등급 색으로 물들임
    -- 선택 · 체크 표시를 다시 그리지 않고 바꾼다 (속성 Sel / Check)
    b:GetAttributeChangedSignal("Sel"):Connect(function() local on = b:GetAttribute("Sel"); st.Thickness = on and 4 or 2.5; if sk then sk.ImageColor3 = on and col or Color3.new(1, 1, 1):Lerp(col, 0.55) end end)
    b:GetAttributeChangedSignal("Check"):Connect(function()
      local c = b:FindFirstChild("Check") or mk("TextLabel", { Name = "Check", AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -3, 0, 3), Size = UDim2.new(0, 20, 0, 20), BackgroundColor3 = Color3.fromRGB(60, 190, 90), Text = "✓", TextColor3 = Color3.new(1, 1, 1), Font = M.FONT, TextSize = 14, ZIndex = 3 }, b)
      if not c:FindFirstChildOfClass("UICorner") then corner(c) end
      c.Visible = b:GetAttribute("Check") == true
    end) end
  if o.click then b.MouseButton1Click:Connect(function() if b:GetAttribute("Dragging") then return end; tipHide(); M.itemTipHide(); o.click() end) end
  if o.itip then b.MouseEnter:Connect(function() M.itemTip(o.itip[1], o.itip[2]) end); b.MouseLeave:Connect(M.itemTipHide); b.AncestryChanged:Connect(function(_, par) if not par then M.itemTipHide() end end) end
  if o.tip then b.MouseEnter:Connect(function() tipShow(o.tip) end); b.MouseLeave:Connect(tipHide); b.AncestryChanged:Connect(function(_, par) if not par then tipHide() end end) end
  return b
end
-- 화면 영역: 창의 내용 목록 안에 고정 높이 판을 하나 만든다
local function area(h) return mk("Frame", { Size = UDim2.new(1, -16, 0, h or 392), BackgroundTransparency = 1 }, C.list) end
local function box(parent, pos, size, title)
  local f = mk("Frame", { Position = pos, Size = size, BackgroundColor3 = Color3.fromRGB(16, 12, 12), BackgroundTransparency = 0.1 }, parent); corner(f, 6); stroke(f, Color3.fromRGB(120, 92, 48), 1.5)
  if title then
    txt(f, title, 15, UDim2.new(0, 10, 0, 5), UDim2.new(1, -20, 0, 20), Color3.fromRGB(255, 220, 120), M.FONT)
    mk("Frame", { Position = UDim2.new(0, 8, 0, 27), Size = UDim2.new(1, -16, 0, 1), BackgroundColor3 = Color3.fromRGB(150, 112, 50), BorderSizePixel = 0 }, f)
  end
  return f
end
local function grid(parent, pos, size, cell)
  local sf = mk("ScrollingFrame", { Position = pos, Size = size, BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6 }, parent)
  mk("UIGridLayout", { CellSize = UDim2.new(0, cell, 0, cell), CellPadding = UDim2.new(0, 6, 0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, sf)
  mk("UIPadding", { PaddingTop = UDim.new(0, 4), PaddingLeft = UDim.new(0, 4) }, sf)
  return sf
end
-- 마우스로 끌어서 스크롤 (ScrollingFrame 은 PC 마우스 끌기를 지원하지 않는다)
function M.dragScroll(sf)
  local drag
  sf.InputBegan:Connect(function(io) if io.UserInputType == Enum.UserInputType.MouseButton1 then drag = { s = io.Position, c = sf.CanvasPosition, moved = false } end end)
  UIS.InputChanged:Connect(function(io)
    if drag and io.UserInputType == Enum.UserInputType.MouseMovement then
      local d = io.Position - drag.s; if d.Magnitude > 6 then drag.moved = true end
      sf.CanvasPosition = Vector2.new(math.clamp(drag.c.X - d.X, 0, math.max(0, sf.AbsoluteCanvasSize.X - sf.AbsoluteWindowSize.X)), math.clamp(drag.c.Y - d.Y, 0, math.max(0, sf.AbsoluteCanvasSize.Y - sf.AbsoluteWindowSize.Y)))
    end
  end)
  UIS.InputEnded:Connect(function(io) if io.UserInputType == Enum.UserInputType.MouseButton1 then drag = nil end end)
  return function() return drag and drag.moved end
end

-- 끌어다 놓기 (장비 · 스킬): M.drag(칸, 짐, 그림) 으로 끌 수 있게, M.drop(칸, 받는 함수) 로 놓을 곳을 정한다
local drops = setmetatable({}, { __mode = "k" })
local dragGui
function M.drop(frame, fn) drops[frame] = fn end
function M.drag(b, payload, art)
  b.InputBegan:Connect(function(io)
    if io.UserInputType ~= Enum.UserInputType.MouseButton1 and io.UserInputType ~= Enum.UserInputType.Touch then return end
    local start = UIS:GetMouseLocation(); local ghost; local mv, up
    mv = UIS.InputChanged:Connect(function(i2)
      if i2.UserInputType ~= Enum.UserInputType.MouseMovement and i2.UserInputType ~= Enum.UserInputType.Touch then return end
      local p = UIS:GetMouseLocation()
      if not ghost and (p - start).Magnitude > 8 then
        b:SetAttribute("Dragging", true); tipHide(); M.itemTipHide()
        if not dragGui then dragGui = mk("ScreenGui", { Name = "DungeonDrag", DisplayOrder = 70, IgnoreGuiInset = true, ResetOnSpawn = false }, game:GetService("Players").LocalPlayer.PlayerGui) end
        ghost = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.new(0, 56, 0, 56), BackgroundColor3 = Color3.fromRGB(30, 22, 18), BackgroundTransparency = 0.2, ZIndex = 70 }, dragGui)
        corner(ghost, 8); stroke(ghost, M.GOLD, 2)
        local a = art and C.Sprites.art(art)
        if a then mk("ImageLabel", { Size = UDim2.new(0.85, 0, 0.85, 0), Position = UDim2.new(0.075, 0, 0.075, 0), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 71 }, ghost) end
      end
      if ghost then ghost.Position = UDim2.new(0, p.X, 0, p.Y) end
    end)
    up = UIS.InputEnded:Connect(function(i2)
      if i2.UserInputType ~= Enum.UserInputType.MouseButton1 and i2.UserInputType ~= Enum.UserInputType.Touch then return end
      mv:Disconnect(); up:Disconnect()
      if not ghost then return end
      ghost:Destroy(); ghost = nil
      local p = UIS:GetMouseLocation() - game:GetService("GuiService"):GetGuiInset()
      for _, o in ipairs(game:GetService("Players").LocalPlayer.PlayerGui:GetGuiObjectsAtPosition(p.X, p.Y)) do
        local f = o; while f and not drops[f] do f = f.Parent; if f and not f:IsA("GuiObject") then f = nil end end
        if f and drops[f] then task.spawn(drops[f], payload); break end
      end
      task.delay(0.05, function() b:SetAttribute("Dragging", nil) end)
    end)
  end)
end
-- ───────── 장비 ─────────
local invSel, invMulti, invPick = nil, false, {}
local invData   -- 서버에서 받은 가방 · 착용 (클릭할 때는 다시 받지 않고 화면만 다시 그린다 → 깜빡임 없음)
local invTab = "all"   -- 가방 탭: 전체 / 부위
local invMode = "bag"   -- bag | auto (자동 분해 설정)
local INV_TABS = { "all", "weapon", "helm", "armor", "gloves", "boots", "ring", "neck" }
local SLOT_ORDER = {}; for i, s in ipairs(Items.EQ_SLOTS) do SLOT_ORDER[s] = i end
local function itemColor(it) return it.sat and M.SAT or M.RAR[(it.rarity or 0) + 1] end
local function sortInv(inv)   -- 자동 정렬: 등급 → 부위 → 아이템 레벨
  table.sort(inv, function(a, b)
    local ra, rb = (a.sat and 9 or a.rarity or 0), (b.sat and 9 or b.rarity or 0)
    if ra ~= rb then return ra > rb end
    local sa, sb = SLOT_ORDER[a.slot] or 99, SLOT_ORDER[b.slot] or 99
    if sa ~= sb then return sa < sb end
    return (a.ilvl or 0) > (b.ilvl or 0)
  end)
end
local invRender, autoRender
function M.inv(keep)
  if not keep or not invData then
    local r = C.rpc:InvokeServer("inv"); local st = C.rpc:InvokeServer("state"); if st.summary then C.setSummary(st.summary) end
    if r.err or st.err then C.clear(); C.msg.Text = tostring(r.err or st.err); return end
    invData = { inv = r.inv or {}, eq = st.equipped or {} }
  end
  if invMode == "auto" then autoRender() else invRender() end
end
-- 착용 칸 배치 (사람 모양, PoE 식): 무기·갑옷은 세로로 길게, 반지·목걸이는 작게
local DOLL = {   -- 사람 모양 (PoE 식): 무기·갑옷은 세로로 길게, 오른쪽 열에 목걸이 · 반지 두 개
  helm = { 86, 30, 60, 60 }, neck = { 160, 44, 44, 44 },
  weapon = { 14, 74, 60, 136 }, armor = { 84, 98, 64, 112 },
  ring = { 160, 106, 44, 44 }, ring2 = { 160, 160, 44, 44 },
  gloves = { 14, 222, 60, 60 }, boots = { 158, 222, 60, 60 },
}
invRender = function()
  C.clear(); M.itemTipHide()
  local inv, eq = table.clone(invData.inv), invData.eq
  sortInv(inv)
  local bySlot = {}; for _, e in ipairs(eq) do bySlot[e.slot] = e end
  local byUid = {}; for _, it in ipairs(inv) do byUid[it.uid] = it end
  for _, e in ipairs(eq) do byUid[e.uid] = e; e.equipped = true end
  local function curOf(it) return not it.equipped and (bySlot[it.slot] or (it.slot == "ring" and bySlot.ring2)) or nil end
  -- 클릭해도 창을 다시 그리지 않는다: 칸의 선택 표시와 오른쪽 상세만 바꾼다 (깜빡임 · 스크롤 튐 방지)
  local tiles, fillDetail, buildBar = {}, nil, nil
  local function selectItem(uid)
    if tiles[invSel] then tiles[invSel]:SetAttribute("Sel", false) end
    invSel = uid; if tiles[uid] then tiles[uid]:SetAttribute("Sel", true) end
    fillDetail()
  end
  local function pickItem(uid)
    invPick[uid] = not invPick[uid] or nil
    if tiles[uid] then tiles[uid]:SetAttribute("Sel", invPick[uid] == true); tiles[uid]:SetAttribute("Check", invPick[uid] == true) end
    buildBar()
  end
  local A = area(392)
  -- 왼쪽: 착용 중 (사람 모양) + 프리셋 + 재화
  local L = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(0, 232, 1, 0), "착용 중")
  do local sil = mk("Frame", { BackgroundTransparency = 1, Position = UDim2.new(0, 70, 0, 26), Size = UDim2.new(0, 92, 0, 262) }, L)
    local body = mk("Frame", { Position = UDim2.new(0.5, -30, 0, 70), Size = UDim2.new(0, 60, 0, 150), BackgroundColor3 = Color3.fromRGB(60, 44, 30), BackgroundTransparency = 0.6 }, sil); corner(body, 24)
    local head = mk("Frame", { Position = UDim2.new(0.5, -22, 0, 6), Size = UDim2.new(0, 44, 0, 44), BackgroundColor3 = Color3.fromRGB(60, 44, 30), BackgroundTransparency = 0.6 }, sil); corner(head) end
  for i, slot in ipairs(Items.EQ_SLOTS) do
    local e = bySlot[slot]; local p = DOLL[slot]
    local t = M.tile(L, p[3], { h = p[4], order = i, itip = e and { e } or nil, art = e and artOf(e) or SLOT_ART[slot], emoji = SLOT_EMOJI[slot], rarity = e and e.rarity or 0, color = e and itemColor(e) or Color3.fromRGB(70, 66, 90), dim = not e,
      tl = e and (e.enh > 0 and ("+" .. e.enh) or nil), label = not e and Items.SLOT_NAME[slot] or nil, selected = e and invSel == e.uid,
      click = function() if e then selectItem(e.uid) end end })
    t.Position = UDim2.new(0, p[1], 0, p[2]); t.ZIndex = 2
    if e then tiles[e.uid] = t; M.drag(t, { kind = "eq", slot = slot }, artOf(e)) end
    M.drop(t, function(pl)
      if pl.kind ~= "bag" then return end
      local r = C.rpc:InvokeServer("equip", { uid = pl.uid, slot = slot }); if r.summary then C.setSummary(r.summary) end
      if r.err then C.msg.Text = tostring(r.err) end; M.inv()
    end)
  end
  M.setTabs(L, UDim2.new(1, -150, 0, 2), UDim2.new(0, 142, 0, 26), "gear", "세트", function() invData = nil; M.inv() end)
  local s = C.summary()
  if s then   -- 재화 (강화석 · 연마석 · 혼돈/신성 구슬 · 보석 · 균열 조각)
    local cg = mk("Frame", { Position = UDim2.new(0, 10, 1, -54), Size = UDim2.new(1, -20, 0, 52), BackgroundTransparency = 1 }, L)
    mk("UIGridLayout", { CellSize = UDim2.new(0.5, -3, 0, 16), CellPadding = UDim2.new(0, 6, 0, 2), SortOrder = Enum.SortOrder.LayoutOrder }, cg)
    for i, c in ipairs({ { "i_ore", "강화석", s.ore, Color3.fromRGB(150, 170, 200) }, { "i_hone", "연마석", s.hone, Color3.fromRGB(110, 210, 150) }, { "i_chaos", "혼돈 구슬", s.orbC, Color3.fromRGB(230, 90, 80) },
      { "i_divine", "신성 구슬", s.orbD, Color3.fromRGB(255, 220, 120) }, { "i_gem", "보석", s.gems, Color3.fromRGB(90, 220, 255) }, { "i_arcana", "아르카나 조각", s.arcana, Color3.fromRGB(255, 160, 220) } }) do
      local f = mk("Frame", { BackgroundTransparency = 1, LayoutOrder = i }, cg)
      local a = C.Sprites.art(c[1])
      if a then mk("ImageLabel", { Size = UDim2.new(0, 16, 0, 16), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit }, f)
      else local dot = mk("Frame", { Size = UDim2.new(0, 10, 0, 10), Position = UDim2.new(0, 3, 0, 3), BackgroundColor3 = c[4] }, f); mk("UICorner", { CornerRadius = UDim.new(1, 0) }, dot) end
      local t = txt(f, n(c[3] or 0), 13, UDim2.new(0, 20, 0, 0), UDim2.new(1, -20, 1, 0), c[4], M.FONT)
      local tp = { title = c[2], color = c[4], lines = {} }; t.MouseEnter:Connect(function() tipShow(tp) end); t.MouseLeave:Connect(tipHide)
    end
  end
  -- 가운데: 가방 (전체 · 부위 탭)
  local shown = {}; for _, it in ipairs(inv) do if invTab == "all" or it.slot == invTab or (invTab == "ring" and it.slot == "ring2") then shown[#shown + 1] = it end end
  local B = box(A, UDim2.new(0, 240, 0, 0), UDim2.new(1, -240 - 300, 1, 0), string.format("가방 %d / %d", #shown, #inv))
  local tabs = mk("Frame", { Position = UDim2.new(0, 6, 0, 32), Size = UDim2.new(1, -12, 0, 34), BackgroundTransparency = 1 }, B)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 3), SortOrder = Enum.SortOrder.LayoutOrder }, tabs)
  for i, k in ipairs(INV_TABS) do
    local on = invTab == k
    local tb = mk("TextButton", { Size = UDim2.new(k == "all" and 0.16 or 0.12, -3, 1, 0), BackgroundColor3 = on and Color3.fromRGB(120, 40, 36) or Color3.fromRGB(30, 24, 22), Text = k == "all" and "전체" or "", TextSize = 13, Font = M.FONT,
      TextColor3 = Color3.fromRGB(255, 235, 200), AutoButtonColor = false, LayoutOrder = i }, tabs)
    corner(tb, 5); stroke(tb, on and M.GOLD or Color3.fromRGB(90, 70, 40), on and 2 or 1)
    if k ~= "all" then
      local a = C.Sprites.art(SLOT_ART[k])
      if a then mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(0, 26, 0, 26), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit }, tb)
      else tb.Text = SLOT_EMOJI[k] or "?" end
      tb.MouseEnter:Connect(function() tipShow({ title = Items.SLOT_NAME[k], lines = {} }) end); tb.MouseLeave:Connect(tipHide)
    end
    tb.MouseButton1Click:Connect(function() tipHide(); invTab = k; invRender() end)
  end
  local g = grid(B, UDim2.new(0, 6, 0, 70), UDim2.new(1, -12, 1, -114), 58)
  for i, it in ipairs(shown) do
    tiles[it.uid] = M.tile(g, 58, { order = i, itip = { it, curOf(it) }, art = artOf(it), emoji = SLOT_EMOJI[it.slot], rarity = it.rarity, color = itemColor(it), tl = it.enh > 0 and ("+" .. it.enh) or (it.up and "▲" or nil), br = it.ilvl and ("T" .. it.ilvl) or nil,
      selected = (not invMulti and invSel == it.uid) or (invMulti and invPick[it.uid]), check = invMulti and invPick[it.uid] or nil,
      click = function() if invMulti then pickItem(it.uid) else selectItem(it.uid) end end })
    M.drag(tiles[it.uid], { kind = "bag", uid = it.uid }, artOf(it))
  end
  M.drop(B, function(pl)   -- 착용 장비를 가방에 놓으면 해제
    if pl.kind ~= "eq" then return end
    local r = C.rpc:InvokeServer("unequip", pl.slot); if r.summary then C.setSummary(r.summary) end; M.inv()
  end)
  local bar = mk("Frame", { Position = UDim2.new(0, 6, 1, -42), Size = UDim2.new(1, -12, 0, 36), BackgroundTransparency = 1 }, B)
  local function bulkDo(mode)
    local cnt = 0
    for uid in pairs(invPick) do local e = C.rpc:InvokeServer(mode, uid); if e.summary then C.setSummary(e.summary) end; if e.ok ~= false then cnt += 1 end end
    invPick = {}; invMulti = false; M.inv(); C.msg.Text = mode == "sell" and string.format("%d개 판매", cnt) or string.format("%d개 분해", cnt)
  end
  buildBar = function()
    bar:ClearAllChildren()
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, bar)
    if invMulti then
      local k = 0; for _ in pairs(invPick) do k += 1 end
      M.btn(bar, string.format("판매 %d", k), UDim2.new(0, 84, 1, 0), M.BTN.gold, function() bulkDo("sell") end).LayoutOrder = 1
      M.btn(bar, string.format("분해 %d", k), UDim2.new(0, 84, 1, 0), M.BTN.red, function() bulkDo("dismantle") end).LayoutOrder = 2
      M.btn(bar, "취소", UDim2.new(0, 60, 1, 0), M.BTN.gray, function() invMulti = false; invPick = {}; invRender() end).LayoutOrder = 3
    else
      M.btn(bar, "여러 개 선택", UDim2.new(0.333, -4, 1, 0), M.BTN.purple, function() invMulti = true; invPick = {}; invRender() end).LayoutOrder = 1
      M.btn(bar, "자동 분해", UDim2.new(0.333, -4, 1, 0), M.BTN.red, function() invMode = "auto"; M.inv(true) end).LayoutOrder = 2
      M.btn(bar, "자동 장착", UDim2.new(0.333, -4, 1, 0), M.BTN.green, function()
        local e = C.rpc:InvokeServer("autoequip"); if e and e.summary then C.setSummary(e.summary) end
        C.msg.Text = (e and e.n or 0) > 0 and string.format("%d칸을 더 강한 장비로 바꿨습니다 · 전투력 %s", e.n, n(e.summary and e.summary.power or 0)) or "지금이 가장 강한 조합입니다"
        invData = nil; M.inv()
      end).LayoutOrder = 3
    end
  end
  buildBar()
  -- 오른쪽: 선택한 장비 상세 (티어 표시) + 착용 중인 같은 부위
  local D = box(A, UDim2.new(1, -292, 0, 0), UDim2.new(0, 292, 1, 0), "장비 정보")
  local Dc = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1 }, D)
  fillDetail = function()
  Dc:ClearAllChildren()
  local it = invSel and byUid[invSel]
  if not it then txt(Dc, "가방이나 착용 칸의 장비를 누르면 여기에 자세히 나옵니다.\n마우스를 올리면 착용 중인 장비와 나란히 비교합니다.", 14, UDim2.new(0, 12, 0, 38), UDim2.new(1, -24, 0, 80), Color3.fromRGB(200, 190, 180)); return end
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 8, 0, 34), Size = UDim2.new(1, -16, 1, -84), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, Dc)
  mk("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  M.itemCard(sc, it, 1, it.equipped and "착용 중" or nil)
  local cur = curOf(it); if cur then M.itemCard(sc, cur, 2, "착용 중 (비교)") end
  local ab = mk("Frame", { Position = UDim2.new(0, 8, 1, -46), Size = UDim2.new(1, -16, 0, 38), BackgroundTransparency = 1 }, Dc)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, ab)
  local function act(name) local e = C.rpc:InvokeServer(name, it.uid); if e.summary then C.setSummary(e.summary) end; C.msg.Text = e.err and tostring(e.err) or ""; if name ~= "equip" then invSel = nil end; M.inv() end
  if not it.equipped then
    M.btn(ab, "장착", UDim2.new(0, 84, 1, 0), M.BTN.green, function() act("equip") end).LayoutOrder = 1
    M.btn(ab, "판매", UDim2.new(0, 84, 1, 0), M.BTN.gold, function() act("sell") end).LayoutOrder = 2
    M.btn(ab, "분해", UDim2.new(0, 84, 1, 0), M.BTN.red, function() act("dismantle") end).LayoutOrder = 3
  else
    M.btn(ab, "강화하러 가기", UDim2.new(0, 160, 1, 0), M.BTN.blue, function() C.openTab("forge") end).LayoutOrder = 1
  end
  end
  fillDetail()
end
function M.openAuto() invMode = "auto"; M.inv(true) end
-- 자동 분해 설정 (웹 openAutoDis): 등급별 유지/판매/분해 · 사탄 · ▲ 보호 · 옵션 티어 기준 · 아이템 레벨 상한 · 모든 전투 후 적용
autoRender = function()
  C.clear(); M.itemTipHide()
  local r = C.rpc:InvokeServer("autoget"); local v = r and r.view; if not v then C.msg.Text = "자동 분해 설정을 불러오지 못했습니다"; return end
  local A = area(392)
  local P = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 1, 0), "자동 분해 설정")
  txt(P, "전투가 끝날 때마다 아래 규칙으로 가방의 장비를 정리합니다. 고유 · 프리셋 · 착용 중 장비는 항상 유지됩니다.", 13, UDim2.new(0, 14, 0, 32), UDim2.new(1, -28, 0, 20), Color3.fromRGB(200, 190, 180))
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 10, 0, 56), Size = UDim2.new(1, -20, 1, -110), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, P)
  mk("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  local function set(k, val) local e = C.rpc:InvokeServer("autoset", { k = k, v = val }); if e and e.view then autoRender() end end
  local order = 0
  local function row(label, color, opts)   -- opts = { { 글자, 선택됨, 누르면 } }
    order += 1
    local f = mk("Frame", { Size = UDim2.new(1, -8, 0, 32), BackgroundColor3 = Color3.fromRGB(22, 16, 15), BackgroundTransparency = 0.2, LayoutOrder = order }, sc); corner(f, 5)
    txt(f, label, 15, UDim2.new(0, 10, 0, 7), UDim2.new(0.42, -10, 0, 20), color or Color3.fromRGB(240, 230, 215), M.FONT)
    local bx = mk("Frame", { Position = UDim2.new(0.42, 0, 0, 3), Size = UDim2.new(0.58, -6, 1, -6), BackgroundTransparency = 1 }, f)
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4), HorizontalAlignment = Enum.HorizontalAlignment.Right, SortOrder = Enum.SortOrder.LayoutOrder }, bx)
    for i, o in ipairs(opts) do local b = M.btn(bx, o[1], UDim2.new(0, o.w or 70, 1, 0), o[2] and M.BTN.gold or M.BTN.gray, o[3]); b.LayoutOrder = i; b.TextSize = 14 end
  end
  local RN = { keep = "유지", sell = "판매", dis = "분해" }
  local function ruleOpts(cur, cb) local t = {}; for _, k in ipairs({ "keep", "sell", "dis" }) do t[#t + 1] = { RN[k], cur == k, function() cb(k) end } end; return t end
  row("모든 전투 후 자동 정리", nil, { { "켜기", v.always, function() set("always", true) end }, { "끄기", not v.always, function() set("always", false) end } })
  for r0 = 0, 3 do row(string.format("%s 장비", M.ITEM_RAR[r0 + 1]), M.RAR[r0 + 1], ruleOpts(v.rules[r0 + 1], function(k) set("rule", { r = r0, v = k }) end)) end
  row("사탄 장비", M.SAT, ruleOpts(v.satRule, function(k) set("satRule", k) end))
  row("▲ 전투력이 오르는 장비는 처리 안 함", Color3.fromRGB(120, 255, 140), { { "켜기", v.keepUp, function() set("keepUp", true) end }, { "끄기", not v.keepUp, function() set("keepUp", false) end } })
  local function tierRows(title, color, kx, kn, X, N)
    local t = { { "없음", X == 0, function() set(kx, 0) end, w = 52 } }
    for x = 1, 5 do t[#t + 1] = { x == 1 and "T1" or ("T" .. x .. "↑"), X == x, function() set(kx, x) end, w = 46 } end
    row(title, color, t)
    if X > 0 then local c = {}; for k = 1, 5 do c[#c + 1] = { string.format("%d개", k), N == k, function() set(kn, k) end, w = 50 } end; row("   … 이 옵션이 몇 개 미만이면 처리", nil, c) end
  end
  tierRows("전설 옵션 티어 기준", M.RAR[4], "tierX", "tierN", v.tierX, v.tierN)
  tierRows("사탄 옵션 티어 기준", M.SAT, "sTierX", "sTierN", v.sTierX, v.sTierN)
  do local t = { { "없음", v.maxIlvl == 0, function() set("maxIlvl", 0) end, w = 52 } }; for x = 1, 6 do t[#t + 1] = { "T" .. x, v.maxIlvl == x, function() set("maxIlvl", x) end, w = 40 } end
    row("아이템 레벨 상한 (이하만 처리)", nil, t) end
  local foot = mk("Frame", { Position = UDim2.new(0, 10, 1, -48), Size = UDim2.new(1, -20, 0, 40), BackgroundTransparency = 1 }, P)
  txt(foot, string.format("지금 가방에서 처리될 장비 %d개", v.now), 16, UDim2.new(0, 4, 0, 10), UDim2.new(0.5, 0, 0, 22), Color3.fromRGB(255, 210, 110), M.FONT)
  local fb = mk("Frame", { Position = UDim2.new(0.5, 0, 0, 0), Size = UDim2.new(0.5, 0, 1, 0), BackgroundTransparency = 1 }, foot)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), HorizontalAlignment = Enum.HorizontalAlignment.Right, SortOrder = Enum.SortOrder.LayoutOrder }, fb)
  M.btn(fb, "지금 정리하기", UDim2.new(0, 140, 1, 0), v.now > 0 and M.BTN.red or M.BTN.gray, function()
    if v.now == 0 then return end
    local e = C.rpc:InvokeServer("autoclean", {}); if e.summary then C.setSummary(e.summary) end
    C.msg.Text = e.res and string.format("정리 완료: %d개 판매 · %d개 분해 · 골드 +%s · 강화석 +%s", e.res.sold or 0, e.res.dis or 0, n(e.res.gold), n(e.res.ore)) or tostring(e.err or "")
    invData = nil; autoRender()
  end).LayoutOrder = 1
  M.btn(fb, "가방으로", UDim2.new(0, 100, 1, 0), M.BTN.blue, function() invMode = "bag"; M.inv() end).LayoutOrder = 2
end

-- ───────── 스킬 ─────────
local skSel
local function skColor(d) return d and (ELEM[d.elem or ""] or hex(d.color)) or M.RAR[1] end
local ELEM_EMOJI = { fire = "🔥", cold = "❄", light = "⚡", void = "🌀" }
local function skIcon(d) if not d then return "?" end; return ELEM_EMOJI[d.elem or ""] or (d.slot == "basic" and "👊" or "⚔") end
local function skArt(id) local k = "card_s_" .. tostring(id); return C.Sprites.art(k) and k or nil end   -- 스킬 타로 카드 그림
M.skArt = skArt
function M.skStyle(id) local d = SK_BY[id]; return skColor(d), skIcon(d), d end
function M.skills()
  C.clear()
  local r = C.rpc:InvokeServer("skills"); if r.summary then C.setSummary(r.summary) end
  if r.err then C.msg.Text = tostring(r.err); return end
  local rows, slots = r.rows or {}, r.slots or 1
  local byUid, inSlot = {}, {}
  for _, k in ipairs(rows) do byUid[k.uid] = k; if k.slot > 0 then inSlot[k.slot] = k end end
  local A = area(392)
  -- 위: 장착 칸
  local T = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, -300, 0, 128), string.format("장착 칸 (%d)", slots))
  M.setTabs(T, UDim2.new(1, -150, 0, 2), UDim2.new(0, 142, 0, 26), "skill", "세트", function() M.skills() end)
  local row = mk("Frame", { Position = UDim2.new(0, 10, 0, 30), Size = UDim2.new(1, -20, 0, 90), BackgroundTransparency = 1 }, T)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, row)
  for i = 1, slots do
    local k = inSlot[i]; local d = k and SK_BY[k.id]
    local t0 = M.tile(row, 86, { order = i, tip = k and { title = string.format("%s  Lv%d", k.name, k.lvl), color = skColor(d), lines = { d and d.desc or "" } } or nil, color = k and skColor(d) or Color3.fromRGB(70, 66, 90), art = k and skArt(k.id) or nil, emoji = k and skIcon(d) or tostring(i), dim = not k,
      label = k and k.name or "빈 칸", tl = k and ("Lv" .. k.lvl) or nil, selected = k and skSel == k.uid, click = function() if k then skSel = k.uid; M.skills() end end })
    M.drop(t0, function(pl)   -- 보유 스킬을 장착 칸에 놓으면 그 칸에 장착 (다른 칸 스킬을 놓으면 자리 바꿈)
      if pl.kind ~= "skill" then return end
      local e = C.rpc:InvokeServer("equipskill", { slot = i, uid = pl.uid }); if e.summary then C.setSummary(e.summary) end
      C.msg.Text = e.err and tostring(e.err) or ""; M.skills()
    end)
    if k then M.drag(t0, { kind = "skill", uid = k.uid }) end
  end
  -- 아래: 보유 스킬
  local B = box(A, UDim2.new(0, 0, 0, 136), UDim2.new(1, -300, 1, -136), string.format("보유 스킬 %d개", #rows))
  local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -36), 76)
  for i, k in ipairs(rows) do
    local d = SK_BY[k.id]
    local t1 = M.tile(g, 76, { order = i, tip = { title = string.format("%s  Lv%d", k.name, k.lvl), color = skColor(d), lines = { d and d.desc or "" } }, color = skColor(d), art = skArt(k.id), emoji = skIcon(d), label = k.name, tl = "Lv" .. k.lvl, br = k.slot > 0 and ("#" .. k.slot) or nil, selected = skSel == k.uid, click = function() skSel = k.uid; M.skills() end })
    M.drag(t1, { kind = "skill", uid = k.uid })
  end
  -- 오른쪽: 상세
  local D = box(A, UDim2.new(1, -292, 0, 0), UDim2.new(0, 292, 1, 0), "스킬 정보")
  local k = skSel and byUid[skSel]
  if not k then txt(D, "스킬을 누르면 설명과 레벨업 · 장착 버튼이 나옵니다.\n새 스킬은 마을의 [스킬 소환]에서 뽑습니다.", 13, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 80), Color3.fromRGB(190, 185, 210)); return end
  local d = SK_BY[k.id] or {}
  txt(D, k.name .. "  Lv" .. k.lvl, 18, UDim2.new(0, 12, 0, 32), UDim2.new(1, -24, 0, 24), skColor(d), M.FONT)
  local info = {}
  if d.slot == "basic" then info[#info + 1] = "기본 공격" end
  if d.cd then info[#info + 1] = string.format("쿨타임 %.1f초", d.cd) end
  if d.mult then info[#info + 1] = string.format("위력 %d%%", math.floor(d.mult * 100)) end
  txt(D, table.concat(info, " · "), 13, UDim2.new(0, 12, 0, 60), UDim2.new(1, -24, 0, 18), Color3.fromRGB(200, 195, 225))
  local ds = txt(D, k.rune and string.format("%s\n룬: %s", d.desc or "", tostring(k.rune)) or (d.desc or ""), 14, UDim2.new(0, 12, 0, 84), UDim2.new(1, -24, 0, 140), Color3.fromRGB(235, 230, 250))
  local ab = mk("Frame", { Position = UDim2.new(0, 10, 1, -96), Size = UDim2.new(1, -20, 0, 86), BackgroundTransparency = 1 }, D)
  mk("UIGridLayout", { CellSize = UDim2.new(0, 84, 0, 38), CellPadding = UDim2.new(0, 6, 0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, ab)
  local function res(e) if e.summary then C.setSummary(e.summary) end; C.msg.Text = e.err and tostring(e.err) or ""; M.skills() end
  if k.honeCost then M.btn(ab, "레벨업\n" .. k.honeCost, UDim2.new(), M.BTN.green, function() res(C.rpc:InvokeServer("levelup", k.uid)) end).LayoutOrder = 1 end
  for i = 1, slots do if k.slot ~= i then M.btn(ab, string.format("%d번 칸에", i), UDim2.new(), M.BTN.blue, function() res(C.rpc:InvokeServer("equipskill", { slot = i, uid = k.uid })) end).LayoutOrder = 1 + i end end
  if k.slot == 0 then M.btn(ab, "분해", UDim2.new(), M.BTN.red, function() skSel = nil; local e = C.rpc:InvokeServer("sellskill", k.uid); res(e); if e and e.ok ~= false and not e.err then C.msg.Text = "분해 · 연마석을 얻었습니다" end end).LayoutOrder = 20 end
  -- 대상 규칙 (장착 중인 공격 스킬): 누를 때마다 다음 규칙으로 (웹 RULES)
  if k.slot > 0 and d.slot ~= "passive" then
    local RULE = { "front", "auto", "boss", "ranged", "elite", "normal" }
    local RULE_NAME = { front = "앞열", auto = "오토", boss = "보스 우선", ranged = "원거리 우선", elite = "정예 우선", normal = "일반 우선" }
    local cur = k.rule or "front"; local nxt = RULE[(table.find(RULE, cur) or 1) % #RULE + 1]
    local rb = M.btn(ab, string.format("대상: %s", RULE_NAME[cur] or cur), UDim2.new(), M.BTN.gold, function() res(C.rpc:InvokeServer("equipskill", { slot = k.slot, uid = k.uid, rule = nxt })) end); rb.LayoutOrder = 30
  end
end

-- ───────── 패시브 트리 ─────────
local ARM = { phys = Color3.fromRGB(240, 110, 90), mag = Color3.fromRGB(120, 150, 255), def = Color3.fromRGB(150, 200, 120), elem = Color3.fromRGB(255, 180, 70), mana = Color3.fromRGB(90, 200, 230), skill = Color3.fromRGB(220, 130, 255), util = Color3.fromRGB(230, 230, 150), pierce = Color3.fromRGB(255, 120, 190), bridge = Color3.fromRGB(180, 180, 190) }
local SIZE = { small = 16, filler = 12, notable = 24, key = 34, bridge = 14 }
local passSel, passCanvas
function M.pass()
  C.clear()
  local r = C.rpc:InvokeServer("passview"); if r.summary then C.setSummary(r.summary) end
  if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local v = r.view; local taken = {}; for _, id in ipairs(v.taken or {}) do taken[id] = true end
  local A = area(392)
  local head = mk("Frame", { Size = UDim2.new(1, 0, 0, 40), BackgroundTransparency = 1 }, A)
  M.setTabs(head, UDim2.new(0.5, -60, 0, 6), UDim2.new(0, 142, 0, 28), "pass", "세트", function() M.pass() end)
  txt(head, string.format("남은 포인트 %d / %d", v.left, v.points), 18, UDim2.new(0, 4, 0, 8), UDim2.new(0.5, 0, 0, 26), Color3.fromRGB(255, 220, 120), M.FONT)
  local hb = mk("Frame", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 2), Size = UDim2.new(0, 260, 0, 36), BackgroundTransparency = 1 }, head)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 6) }, hb)
  M.btn(hb, "자동 배분", UDim2.new(0, 110, 1, 0), M.BTN.green, function() local e = C.rpc:InvokeServer("autopass"); C.setSummary(e.summary); M.pass() end)
  M.btn(hb, "초기화", UDim2.new(0, 90, 1, 0), M.BTN.red, function() local e = C.rpc:InvokeServer("resetpass"); C.setSummary(e.summary); passSel = nil; M.pass() end)
  local frame = box(A, UDim2.new(0, 0, 0, 44), UDim2.new(1, 0, 1, -44))
  frame.ClipsDescendants = true
  local S, PAD = 0.1, 40
  local sf = mk("ScrollingFrame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(0, 7400 * S + PAD * 2, 0, 7400 * S + PAD * 2), ScrollingDirection = Enum.ScrollingDirection.XY, ScrollBarThickness = 6 }, frame)
  local moved = M.dragScroll(sf)
  local function P(x, y) return 3700 * S + PAD + x * S, 3700 * S + PAD + y * S end
  local BY = {}; for _, d in ipairs(Passives.PASSIVES) do BY[d.id] = d end
  local function avail(d) if taken[d.id] then return false end; for _, l in ipairs(d.links or {}) do if l == "C" or taken[l] then return true end end; return false end
  -- 연결선 (한 쌍에 한 번)
  local drawn = {}
  for _, d in ipairs(Passives.PASSIVES) do
    for _, l in ipairs(d.links or {}) do
      local o = l == "C" and { x = 0, y = 0, id = "C" } or BY[l]
      local key = d.id < (o and o.id or "") and (d.id .. "|" .. l) or (l .. "|" .. d.id)
      if o and not drawn[key] then
        drawn[key] = true
        local x1, y1 = P(d.x, d.y); local x2, y2 = P(o.x, o.y)
        local on = taken[d.id] and (o.id == "C" or taken[o.id])
        mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, (x1 + x2) / 2, 0, (y1 + y2) / 2), Size = UDim2.new(0, math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2), 0, on and 4 or 2), Rotation = math.deg(math.atan2(y2 - y1, x2 - x1)), BackgroundColor3 = on and M.GOLD or Color3.fromRGB(90, 80, 120), BorderSizePixel = 0, ZIndex = 2 }, sf)
      end
    end
  end
  local cx, cy = P(0, 0); local c0 = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, cx, 0, cy), Size = UDim2.new(0, 30, 0, 30), BackgroundColor3 = M.GOLD, ZIndex = 4 }, sf); corner(c0); stroke(c0, Color3.new(1, 1, 1), 2)
  for _, d in ipairs(Passives.PASSIVES) do
    local x, y = P(d.x, d.y); local sz = SIZE[d.kind] or 16
    local col = taken[d.id] and M.GOLD or (avail(d) and (ARM[d.arm] or Color3.new(1, 1, 1)) or Color3.fromRGB(70, 64, 92))
    local b = mk("TextButton", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, x, 0, y), Size = UDim2.new(0, sz, 0, sz), BackgroundColor3 = col, Text = "", AutoButtonColor = true, ZIndex = 5 }, sf)
    corner(b); stroke(b, passSel == d.id and Color3.new(1, 1, 1) or Color3.fromRGB(20, 10, 30), passSel == d.id and 3 or 1.5)
    b.MouseButton1Click:Connect(function() if moved() then return end; passSel = d.id; passCanvas = sf.CanvasPosition; M.pass() end)
  end
  if passCanvas then sf.CanvasPosition = passCanvas else sf.CanvasPosition = Vector2.new(cx - 400, cy - 160) end
  -- 선택한 노드 정보
  local d = passSel and BY[passSel]
  if d then
    local I = box(frame, UDim2.new(0, 8, 1, -112), UDim2.new(0, 360, 0, 104)); I.ZIndex = 10
    local t = txt(I, string.format("%s  (%d점)", d.name, d.cost or 1), 16, UDim2.new(0, 10, 0, 8), UDim2.new(1, -120, 0, 20), ARM[d.arm] or Color3.new(1, 1, 1), M.FONT); t.ZIndex = 11
    local t2 = txt(I, d.text or "", 13, UDim2.new(0, 10, 0, 32), UDim2.new(1, -120, 0, 64), Color3.fromRGB(235, 230, 250)); t2.ZIndex = 11
    if taken[d.id] then local l = txt(I, "찍음", 15, UDim2.new(1, -100, 0, 36), UDim2.new(0, 90, 0, 30), M.GOLD, M.FONT, Enum.TextXAlignment.Center); l.ZIndex = 11
    else
      local b = M.btn(I, "찍기", UDim2.new(0, 96, 0, 40), M.BTN.green, function()
        local e = C.rpc:InvokeServer("passtake", d.id); C.setSummary(e.summary); passCanvas = sf.CanvasPosition
        C.toast((e.n or 0) > 0 and string.format("노드 %d개를 찍었습니다", e.n) or "포인트가 부족하거나 이어진 길이 없습니다"); M.pass()
      end); b.Position = UDim2.new(1, -106, 0, 32); b.ZIndex = 11
    end
  end
end

-- ───────── 공통: 재화 표시 줄 · 진행 바 ─────────
local function cost(parent, items, pos)   -- items = { {"i_gold", 120}, {"i_ore", 3} }
  local f = mk("Frame", { Position = pos or UDim2.new(), Size = UDim2.new(0, 0, 0, 24), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1 }, parent)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, VerticalAlignment = Enum.VerticalAlignment.Center, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, f)
  for i, c in ipairs(items) do
    local a = C.Sprites.art(c[1])
    if a then mk("ImageLabel", { Size = UDim2.new(0, 22, 0, 22), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit, LayoutOrder = i * 2 }, f) end
    local l = mk("TextLabel", { Size = UDim2.new(0, 0, 1, 0), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1, Text = (not a and c[4]) and (c[4] .. " " .. n(c[2])) or n(c[2]), TextColor3 = c[3] or Color3.new(1, 1, 1), Font = M.FONT, TextSize = 16, LayoutOrder = i * 2 + 1 }, f)
    mk("UIPadding", { PaddingRight = UDim.new(0, 8) }, l)
  end
  return f
end
M.cost = cost
local function pbar(parent, pos, size, frac, color)
  local bg = mk("Frame", { Position = pos, Size = size, BackgroundColor3 = Color3.fromRGB(12, 8, 22) }, parent); corner(bg, 6); stroke(bg, Color3.fromRGB(20, 10, 30), 1.5)
  local f = mk("Frame", { Size = UDim2.new(math.clamp(frac, 0, 1), 0, 1, 0), BackgroundColor3 = color or Color3.fromRGB(90, 200, 110) }, bg); corner(f, 6)
  return bg
end
-- 한 줄 카드 (아이콘 · 제목 · 설명 · 진행 바 · 오른쪽 버튼)
local function rowCard(o)
  local f = mk("Frame", { Size = UDim2.new(1, -16, 0, o.h or 74), BackgroundColor3 = o.done and Color3.fromRGB(34, 52, 44) or M.PANEL }, C.list); corner(f, 10); stroke(f, o.ready and M.GOLD or Color3.fromRGB(80, 66, 130), o.ready and 2.5 or 1.5)
  Skin.frame(f, "ui_card", 0.25, 0.5)
  local x = 12
  if o.emoji or o.art then local t = M.tile(f, 52, { art = o.art, emoji = o.emoji, color = o.color or M.GOLD }); t.Position = UDim2.new(0, 10, 0.5, -26); x = 72 end
  txt(f, o.title, 16, UDim2.new(0, x, 0, 8), UDim2.new(1, -x - 150, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT)
  if o.desc then txt(f, o.desc, 13, UDim2.new(0, x, 0, 30), UDim2.new(1, -x - 150, 0, 18), Color3.fromRGB(215, 210, 235)) end
  if o.frac then pbar(f, UDim2.new(0, x, 1, -18), UDim2.new(1, -x - 160, 0, 10), o.frac, o.done and Color3.fromRGB(120, 120, 140) or nil) end
  if o.btn then local b = M.btn(f, o.btn, UDim2.new(0, 128, 0, 40), o.btnColor or M.BTN.green, o.click); b.AnchorPoint = Vector2.new(1, 0.5); b.Position = UDim2.new(1, -12, 0.5, 0); b.Active = o.click ~= nil; b.AutoButtonColor = o.click ~= nil end
  return f
end

-- ───────── 대장간 (강화 · 옵션 재굴림 · 혼돈/신성 구슬 · 소켓) ─────────
local forgeSel
function M.forge()
  C.clear()
  local r = C.rpc:InvokeServer("forge"); if r.summary then C.setSummary(r.summary) end
  if r.err then C.msg.Text = tostring(r.err); return end
  local rows = r.rows or {}; local s = C.summary() or {}
  local A = area(392)
  local L = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(0, 232, 1, 0), "착용 장비")
  local g = grid(L, UDim2.new(0, 8, 0, 30), UDim2.new(1, -16, 1, -36), 64)
  if #rows == 0 then txt(L, "착용한 장비가 없습니다. 먼저 [장비]에서 장착하세요.", 13, UDim2.new(0, 10, 0, 40), UDim2.new(1, -20, 0, 60), Color3.fromRGB(190, 185, 210)); return end
  local sel
  for i, it in ipairs(rows) do
    if not forgeSel then forgeSel = it.uid end
    if it.uid == forgeSel then sel = it end
    M.tile(g, 64, { order = i, art = artOf(it), emoji = SLOT_EMOJI[it.slot], color = itemColor(it), tl = it.enh > 0 and ("+" .. it.enh) or nil, selected = it.uid == forgeSel, click = function() forgeSel = it.uid; M.forge() end })
  end
  sel = sel or rows[1]; forgeSel = sel.uid
  local R = box(A, UDim2.new(0, 240, 0, 0), UDim2.new(1, -240, 1, 0))
  txt(R, sel.title, 18, UDim2.new(0, 14, 0, 10), UDim2.new(1, -28, 0, 24), itemColor(sel), M.FONT)
  local function res(e) if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.msg or e.err or ""); M.forge() end
  -- 강화
  local E = mk("Frame", { Position = UDim2.new(0, 12, 0, 40), Size = UDim2.new(1, -24, 0, 56), BackgroundColor3 = Color3.fromRGB(28, 22, 50) }, R); corner(E, 8)
  txt(E, string.format("강화 +%d", sel.enh), 22, UDim2.new(0, 12, 0, 14), UDim2.new(0, 140, 0, 28), Color3.fromRGB(255, 220, 120), M.FONT)
  cost(E, { { "i_gold", sel.enhGold, (s.gold or 0) >= sel.enhGold and Color3.new(1, 1, 1) or Color3.fromRGB(255, 120, 120) }, { "i_ore", sel.enhOre, (s.ore or 0) >= sel.enhOre and Color3.new(1, 1, 1) or Color3.fromRGB(255, 120, 120) } }, UDim2.new(0, 150, 0, 16))
  local eb = M.btn(E, string.format("+%d 강화", sel.enh + 1), UDim2.new(0, 130, 0, 40), M.BTN.green, function() res(C.rpc:InvokeServer("enhance", sel.uid)) end); eb.AnchorPoint = Vector2.new(1, 0.5); eb.Position = UDim2.new(1, -8, 0.5, 0)
  -- 옵션 (재굴림)
  txt(R, "옵션", 15, UDim2.new(0, 14, 0, 104), UDim2.new(0, 200, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT)
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 12, 0, 126), Size = UDim2.new(1, -24, 0, 150), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, R)
  mk("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  for i, a in ipairs(sel.affixes or {}) do
    local row = mk("Frame", { Size = UDim2.new(1, -8, 0, 34), BackgroundColor3 = Color3.fromRGB(28, 22, 50), LayoutOrder = i }, sc); corner(row, 6)
    txt(row, a.text, 14, UDim2.new(0, 10, 0, 8), UDim2.new(1, -230, 0, 20), Color3.fromRGB(230, 225, 250))
    if a.locked then txt(row, "🔒 잠김", 14, UDim2.new(1, -110, 0, 8), UDim2.new(0, 100, 0, 20), Color3.fromRGB(170, 165, 190), M.FONT)
    else
      cost(row, { { "i_gold", sel.rerollGold }, { "i_ore", sel.rerollOre } }, UDim2.new(1, -220, 0, 5))
      local b = M.btn(row, "재굴림", UDim2.new(0, 84, 0, 28), M.BTN.blue, function() res(C.rpc:InvokeServer("reroll", { uid = sel.uid, idx = i - 1 })) end); b.Position = UDim2.new(1, -90, 0, 3)
    end
  end
  -- 구슬 · 소켓
  local O = mk("Frame", { Position = UDim2.new(0, 12, 1, -104), Size = UDim2.new(1, -24, 0, 44), BackgroundTransparency = 1 }, R)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center }, O)
  local b1 = M.btn(O, string.format("혼돈 구슬 (%d) · 옵션 추가", s.orbC or 0), UDim2.new(0, 230, 0, 40), M.BTN.purple, function() res(C.rpc:InvokeServer("chaos", sel.uid)) end); b1.LayoutOrder = 1
  local b2 = M.btn(O, string.format("신성한 구슬 (%d) · 수치 다시", s.orbD or 0), UDim2.new(0, 240, 0, 40), M.BTN.gold, function() res(C.rpc:InvokeServer("divine", sel.uid)) end); b2.LayoutOrder = 2
  local So = mk("Frame", { Position = UDim2.new(0, 12, 1, -54), Size = UDim2.new(1, -24, 0, 44), BackgroundTransparency = 1 }, R)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center }, So)
  local sl = txt(So, string.format("소켓 %d개", #(sel.sockets or {})), 15, UDim2.new(), UDim2.new(0, 80, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT); sl.LayoutOrder = 0
  for i, sk in ipairs(sel.sockets or {}) do
    local t = M.tile(So, 40, { order = i, art = sk and "i_stone" or nil, emoji = sk and nil or "◇", color = sk and Color3.fromRGB(160, 220, 255) or Color3.fromRGB(80, 74, 100), dim = not sk,
      click = sk and function() C.prompt(string.format("%d번 소켓의 돌(%s)을 삭제할까요? 회수할 수 없습니다. 삭제하려면 '삭제'라고 입력하세요.", i, tostring(sk)), "삭제", function(v) if v == "삭제" or v:lower() == "delete" then res(C.rpc:InvokeServer("sockdel", { uid = sel.uid, idx = i })) end end) end or nil })
    if sk then t.MouseEnter:Connect(function() C.msg.Text = tostring(sk) end) end
  end
  local gb = M.btn(So, "돌 끼우기", UDim2.new(0, 110, 0, 38), M.BTN.blue, function() C.openTab("stones") end); gb.LayoutOrder = 99
  if (sel.rarity or 0) >= 3 then
    local tb = M.btn(So, string.format("세공의 인장 (%d)", s.sockTix or 0), UDim2.new(0, 170, 0, 38), M.BTN.purple, function()
      C.prompt("소켓 수를 1~3개 중 무작위로 다시 정합니다. 끼운 돌은 사라집니다. 진행하려면 '사용'이라고 입력하세요.", "사용", function(v) if v == "사용" or v:lower() == "use" then res(C.rpc:InvokeServer("sockroll", sel.uid)) end end)
    end); tb.LayoutOrder = 100
  end
end

-- ───────── 돌 (확인 · 소켓에 끼우기) ─────────
local stoneSel
function M.stones()
  C.clear()
  local r = C.rpc:InvokeServer("stones"); if r.summary then C.setSummary(r.summary) end
  if r.err then C.msg.Text = tostring(r.err); return end
  local rows, items = r.rows or {}, r.items or {}
  local A = area(392)
  local B = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, -300, 1, 0), string.format("돌 보관함 %d개", #rows))
  local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -36), 64)
  local sel
  for i, st in ipairs(rows) do
    if st.uid == stoneSel then sel = st end
    M.tile(g, 64, { order = i, art = "i_stone", color = st.rev and Color3.fromRGB(160, 220, 255) or (st.hi == 1 and Color3.fromRGB(255, 200, 90) or Color3.fromRGB(150, 150, 170)), tl = st.rev and nil or "?", dim = not st.rev,
      selected = st.uid == stoneSel, click = function() stoneSel = st.uid; M.stones() end })
  end
  local D = box(A, UDim2.new(1, -292, 0, 0), UDim2.new(0, 292, 1, 0), "돌 정보")
  if not sel then txt(D, "돌을 누르세요. 확인하지 않은 돌(?)은 먼저 확인해야 옵션이 정해지고, 확인된 돌은 장비의 빈 소켓에 끼울 수 있습니다.", 13, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 90), Color3.fromRGB(190, 185, 210)); return end
  local function res(e) if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.stones() end
  if not sel.rev then
    txt(D, sel.hi == 1 and "계시의 돌 (확인 전)" or "미확인의 돌", 17, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 24), Color3.fromRGB(255, 225, 140), M.FONT)
    local b = M.btn(D, "확인하기", UDim2.new(0, 150, 0, 42), M.BTN.green, function() local e = C.rpc:InvokeServer("reveal", sel.uid); if e.ok then C.toast("확인: " .. tostring(e.label)) end; res(e) end); b.Position = UDim2.new(0, 12, 0, 74)
    return
  end
  txt(D, tostring(sel.label or "확인된 돌"), 17, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 44), Color3.fromRGB(160, 220, 255), M.FONT)
  txt(D, "끼울 장비의 빈 소켓:", 14, UDim2.new(0, 12, 0, 86), UDim2.new(1, -24, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT)
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 10, 0, 110), Size = UDim2.new(1, -20, 1, -118), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, D)
  mk("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  local any = false
  for _, it in ipairs(items) do
    for si, sk in ipairs(it.sockets or {}) do
      if not sk then
        any = true
        local b = M.btn(sc, string.format("%s · 소켓 %d", Items.SLOT_NAME[it.slot] or it.slot, si), UDim2.new(1, -8, 0, 36), M.BTN.blue, function() res(C.rpc:InvokeServer("socket", { item = it.uid, stone = sel.uid, idx = si })); stoneSel = nil end)
      end
    end
  end
  if not any then txt(sc, "빈 소켓이 있는 착용 장비가 없습니다.", 13, UDim2.new(), UDim2.new(1, -8, 0, 40), Color3.fromRGB(190, 185, 210)) end
end

-- ───────── 스킬 상점 ─────────
local shopSel
function M.shop()
  C.clear()
  local r = C.rpc:InvokeServer("shop"); if r.summary then C.setSummary(r.summary) end
  if r.err then C.msg.Text = tostring(r.err); return end
  local rows = r.rows or {}; local s = C.summary() or {}
  local A = area(392)
  local B = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, -300, 1, 0), string.format("판매 중인 스킬 %d개", #rows))
  local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -36), 84)
  local sel
  for i, row in ipairs(rows) do
    if row.id == shopSel then sel = row end
    local col, icon = M.skStyle(row.id)
    M.tile(g, 84, { order = i, tip = { title = row.name, color = col, lines = { row.desc or "", string.format("가격 %s 골드", n(row.price)) } }, color = col, emoji = icon, label = row.name, br = n(row.price), selected = row.id == shopSel, click = function() shopSel = row.id; M.shop() end })
  end
  local D = box(A, UDim2.new(1, -292, 0, 0), UDim2.new(0, 292, 1, 0), "스킬 정보")
  if not sel then txt(D, "스킬을 눌러 설명을 보고 골드로 구매하세요. 산 스킬은 [스킬 정비소]에서 장착합니다.", 13, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 80), Color3.fromRGB(190, 185, 210)); return end
  local col = M.skStyle(sel.id); local d = SK_BY[sel.id] or {}
  txt(D, sel.name, 19, UDim2.new(0, 12, 0, 34), UDim2.new(1, -24, 0, 26), col, M.FONT)
  local info = {}
  if sel.slot == "basic" then info[#info + 1] = "기본 공격" end
  if d.cd then info[#info + 1] = string.format("쿨타임 %.1f초", d.cd) end
  txt(D, table.concat(info, " · "), 13, UDim2.new(0, 12, 0, 62), UDim2.new(1, -24, 0, 18), Color3.fromRGB(200, 195, 225))
  txt(D, sel.desc or "", 14, UDim2.new(0, 12, 0, 86), UDim2.new(1, -24, 0, 160), Color3.fromRGB(235, 230, 250))
  cost(D, { { "i_gold", sel.price, (s.gold or 0) >= sel.price and Color3.new(1, 1, 1) or Color3.fromRGB(255, 120, 120) } }, UDim2.new(0, 12, 1, -92))
  local b = M.btn(D, "구매", UDim2.new(1, -24, 0, 44), M.BTN.blue, function()
    local e = C.rpc:InvokeServer("buy", sel.id); if e.summary then C.setSummary(e.summary) end
    if e.ok then C.toast(string.format("%s 구매!", sel.name)) else C.msg.Text = tostring(e.err) end; M.shop()
  end); b.Position = UDim2.new(0, 12, 1, -56)
end

-- ───────── 퀘스트 · 일일 ─────────
function M.quests()
  C.clear()
  local r = C.rpc:InvokeServer("quests"); if r.err then C.msg.Text = tostring(r.err); return end
  for _, q in ipairs(r.rows or {}) do
    local ready, done = q.state == "done", q.state == "claimed"
    rowCard({ emoji = done and "✓" or "📜", color = ready and M.GOLD or (done and Color3.fromRGB(110, 200, 130) or Color3.fromRGB(150, 140, 190)), title = string.format("%s (%d/%d)", q.title, math.min(q.p, q.n), q.n), desc = q.desc, frac = q.n > 0 and q.p / q.n or 0, ready = ready, done = done,
      btn = done and "완료" or (ready and "보상 받기" or "진행 중"), btnColor = ready and M.BTN.green or M.BTN.gray,
      click = ready and function() local e = C.rpc:InvokeServer("questclaim", q.id); if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.quests() end or nil })
  end
end
function M.daily()
  C.clear()
  local o = C.rpc:InvokeServer("offline"); if o.summary then C.setSummary(o.summary) end
  if o.r then rowCard({ emoji = "💤", title = "오프라인 보상", desc = string.format("%d분 동안 자리를 비웠습니다: 골드 %s · 강화석 %s", o.r.mins, n(o.r.gold), n(o.r.ore)), color = Color3.fromRGB(140, 200, 255), done = true }) end
  local r = C.rpc:InvokeServer("daily"); if r.err then C.msg.Text = tostring(r.err); return end
  for _, t in ipairs(r.rows or {}) do
    local ready = t.p >= t.n and not t.claimed
    rowCard({ emoji = t.claimed and "✓" or "📅", color = ready and M.GOLD or Color3.fromRGB(150, 140, 190), title = string.format("%s (%d/%d)", t.name, t.p, t.n), desc = "보상: " .. tostring(t.text), frac = t.n > 0 and t.p / t.n or 0, ready = ready, done = t.claimed,
      btn = t.claimed and "수령 완료" or (ready and "받기" or "진행 중"), btnColor = ready and M.BTN.green or M.BTN.gray,
      click = ready and function() local e = C.rpc:InvokeServer("dailyclaim", t.id); if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.daily() end or nil })
  end
  -- 일괄 정리 (강화·사탄 장비 제외)
  local f = rowCard({ emoji = "🧹", title = "장비 일괄 정리", desc = "강화했거나 사탄 장비는 건드리지 않습니다.", color = Color3.fromRGB(150, 140, 190), h = 112 })
  local bar = mk("Frame", { Position = UDim2.new(0, 72, 1, -48), Size = UDim2.new(1, -84, 0, 40), BackgroundTransparency = 1 }, f)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, bar)
  local function bulk(rr, mode) local e = C.rpc:InvokeServer("bulk", { r = rr, mode = mode }); if e.summary then C.setSummary(e.summary) end; C.msg.Text = e.res and (mode == "sell" and string.format("%d개 판매", e.res.n) or string.format("%d개 분해", e.res.n)) or tostring(e.err); M.daily() end
  M.btn(bar, "일반 분해", UDim2.new(0, 120, 1, 0), M.BTN.red, function() bulk(0, "dismantle") end).LayoutOrder = 1
  M.btn(bar, "매직까지 분해", UDim2.new(0, 140, 1, 0), M.BTN.red, function() bulk(1, "dismantle") end).LayoutOrder = 2
  M.btn(bar, "매직까지 판매", UDim2.new(0, 140, 1, 0), M.BTN.gold, function() bulk(1, "sell") end).LayoutOrder = 3
end


-- ───────── 룬 (스킬에 끼우기) ─────────
local runeSkill
function M.runes()
  C.clear()
  local r = C.rpc:InvokeServer("runes"); if r.err then C.msg.Text = tostring(r.err); return end
  local runes, skills = r.runes or {}, r.skills or {}
  local A = area(392)
  local L = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(0.5, -4, 1, 0), "스킬 고르기")
  local g = grid(L, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -36), 76)
  local sel
  for i, k in ipairs(skills) do
    if not runeSkill then runeSkill = k.uid end
    if k.uid == runeSkill then sel = k end
    local col, icon = M.skStyle(k.id)
    M.tile(g, 76, { order = i, color = col, emoji = icon, label = tostring(k.name or k.id), tl = k.rune and "◆" or nil, selected = k.uid == runeSkill, click = function() runeSkill = k.uid; M.runes() end })
  end
  local R = box(A, UDim2.new(0.5, 4, 0, 0), UDim2.new(0.5, -4, 1, 0), string.format("보유 룬 %d개", #runes))
  if not sel then txt(R, "룬을 끼울 스킬이 없습니다.", 13, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 40), Color3.fromRGB(190, 185, 210)); return end
  local function res(e) C.msg.Text = tostring(e.err or ""); M.runes() end
  local head = mk("Frame", { Position = UDim2.new(0, 10, 0, 30), Size = UDim2.new(1, -20, 0, 44), BackgroundColor3 = Color3.fromRGB(28, 22, 50) }, R); corner(head, 8)
  txt(head, sel.rune and string.format("%s · 룬: %s", tostring(sel.name), tostring(sel.rune)) or string.format("%s · 룬 없음", tostring(sel.name)), 14, UDim2.new(0, 10, 0, 12), UDim2.new(1, -110, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT)
  if sel.rune then local b = M.btn(head, "룬 해제", UDim2.new(0, 92, 0, 34), M.BTN.red, function() res(C.rpc:InvokeServer("runeremove", sel.uid)) end); b.Position = UDim2.new(1, -98, 0, 5) end
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 10, 0, 82), Size = UDim2.new(1, -20, 1, -90), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, R)
  mk("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  if #runes == 0 then txt(sc, "룬이 없습니다. 전투에서 얻을 수 있습니다.", 13, UDim2.new(), UDim2.new(1, -8, 0, 40), Color3.fromRGB(190, 185, 210)) end
  for i, ru in ipairs(runes) do
    local f = mk("Frame", { Size = UDim2.new(1, -8, 0, 58), BackgroundColor3 = M.PANEL, LayoutOrder = i }, sc); corner(f, 8); stroke(f, Color3.fromRGB(120, 100, 190), 1.5)
    txt(f, "◆ " .. tostring(ru.name), 15, UDim2.new(0, 10, 0, 6), UDim2.new(1, -110, 0, 20), Color3.fromRGB(190, 160, 255), M.FONT)
    txt(f, tostring(ru.text or ""), 12, UDim2.new(0, 10, 0, 28), UDim2.new(1, -110, 0, 26), Color3.fromRGB(215, 210, 235))
    local b = M.btn(f, "끼우기", UDim2.new(0, 88, 0, 36), M.BTN.purple, function() res(C.rpc:InvokeServer("runeequip", { skill = sel.uid, rune = ru.uid })) end); b.Position = UDim2.new(1, -96, 0, 11)
  end
end

-- ───────── 전직 (계열별 노드) ─────────
local TREE_COL = { fire = Color3.fromRGB(255, 120, 60), cold = Color3.fromRGB(110, 200, 255), light = Color3.fromRGB(255, 220, 80), void = Color3.fromRGB(170, 100, 255), phys = Color3.fromRGB(210, 120, 110), def = Color3.fromRGB(140, 200, 120), farm = Color3.fromRGB(230, 190, 90) }
function M.class()
  C.clear()
  local r = C.rpc:InvokeServer("class"); if r.summary then C.setSummary(r.summary) end
  if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local v = r.view
  local A = area(392)
  local head = mk("Frame", { Size = UDim2.new(1, 0, 0, 44), BackgroundTransparency = 1 }, A)
  txt(head, string.format("전직 %d차 · 남은 포인트 %d / %d", v.cls, v.left, v.points), 18, UDim2.new(0, 4, 0, 4), UDim2.new(0.55, 0, 0, 22), Color3.fromRGB(255, 220, 120), M.FONT)
  txt(head, string.format("전직의 서  %d · %d · %d", v.books[1] or 0, v.books[2] or 0, v.books[3] or 0), 13, UDim2.new(0, 4, 0, 26), UDim2.new(0.55, 0, 0, 18), Color3.fromRGB(200, 195, 225))
  local hb = mk("Frame", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 2), Size = UDim2.new(0, 240, 0, 38), BackgroundTransparency = 1 }, head)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 6) }, hb)
  M.btn(hb, "전직하기", UDim2.new(0, 120, 1, 0), M.BTN.gold, function() local e = C.rpc:InvokeServer("classadvance"); C.msg.Text = tostring(e.msg or ""); M.class() end)
  M.btn(hb, "초기화", UDim2.new(0, 90, 1, 0), M.BTN.red, function() C.rpc:InvokeServer("classreset"); M.class() end)
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 0, 0, 50), Size = UDim2.new(1, 0, 1, -50), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.X, ScrollingDirection = Enum.ScrollingDirection.X, ScrollBarThickness = 6 }, A)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  for ti, T in ipairs(v.trees or {}) do
    local col = TREE_COL[T.id] or M.GOLD
    local col0 = mk("Frame", { Size = UDim2.new(0, 168, 1, -10), BackgroundColor3 = M.PANEL, LayoutOrder = ti }, sc); corner(col0, 10); stroke(col0, col, 2)
    txt(col0, T.name, 16, UDim2.new(0, 0, 0, 6), UDim2.new(1, 0, 0, 22), col, M.FONT, Enum.TextXAlignment.Center)
    local lst = mk("Frame", { Position = UDim2.new(0, 8, 0, 34), Size = UDim2.new(1, -16, 1, -40), BackgroundTransparency = 1 }, col0)
    mk("UIListLayout", { Padding = UDim.new(0, 5), SortOrder = Enum.SortOrder.LayoutOrder }, lst)
    for ni, nd in ipairs(T.nodes or {}) do
      local b = mk("TextButton", { Size = UDim2.new(1, 0, 0, 34), BackgroundColor3 = nd.has and col:Lerp(Color3.new(0, 0, 0), 0.35) or (nd.can and Color3.fromRGB(56, 48, 92) or Color3.fromRGB(32, 28, 46)), Text = "", AutoButtonColor = nd.can or nd.has, LayoutOrder = ni }, lst)
      corner(b, 6); stroke(b, nd.has and col or Color3.fromRGB(20, 10, 30), nd.has and 2 or 1)
      local l = txt(b, string.format("%s %s (%d)", nd.has and "●" or (nd.can and "○" or "·"), nd.name, nd.cost), 12, UDim2.new(0, 6, 0, 0), UDim2.new(1, -12, 1, 0), (nd.can or nd.has) and Color3.new(1, 1, 1) or Color3.fromRGB(130, 125, 150), M.FONT)
      l.TextYAlignment = Enum.TextYAlignment.Center
      b.MouseEnter:Connect(function() C.msg.Text = string.format("%s — %s", nd.name, nd.desc or "") end)
      b.MouseButton1Click:Connect(function()
        if nd.has then C.rpc:InvokeServer("classdrop", nd.id) elseif nd.can then C.rpc:InvokeServer("classtake", nd.id) else C.msg.Text = "아직 찍을 수 없습니다 (앞 노드 · 포인트 · 전직 단계 확인)"; return end
        M.class()
      end)
    end
  end
end

-- ───────── 참 (장착 4칸 · 보관함) ─────────
function M.charm()
  C.clear()
  local r = C.rpc:InvokeServer("charms"); if r.summary then C.setSummary(r.summary) end
  if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local v = r.view
  if not v.unlocked then rowCard({ emoji = "🔒", title = "참", desc = "3차 전직 후에 장착할 수 있습니다.", color = Color3.fromRGB(120, 110, 150) }); return end
  local A = area(392)
  local T = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 0, 168), "장착 중")
  local row = mk("Frame", { Position = UDim2.new(0, 10, 0, 30), Size = UDim2.new(1, -20, 0, 130), BackgroundTransparency = 1 }, T)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, row)
  for i = 1, 4 do
    local c = v.equipped[i]
    local f = mk("Frame", { Size = UDim2.new(0.25, -6, 1, 0), BackgroundColor3 = c and Color3.fromRGB(44, 30, 70) or Color3.fromRGB(28, 24, 40), LayoutOrder = i }, row); corner(f, 8); stroke(f, c and Color3.fromRGB(200, 140, 255) or Color3.fromRGB(70, 66, 90), 2)
    if c then
      txt(f, table.concat(c.lines or {}, "\n"), 12, UDim2.new(0, 8, 0, 6), UDim2.new(1, -16, 1, -48), Color3.fromRGB(230, 220, 250))
      local b = M.btn(f, "해제", UDim2.new(1, -16, 0, 32), M.BTN.red, function() C.rpc:InvokeServer("charmoff", i); M.charm() end); b.Position = UDim2.new(0, 8, 1, -38)
    else txt(f, string.format("빈 칸 %d", i), 14, UDim2.new(0, 0, 0.4, 0), UDim2.new(1, 0, 0, 20), Color3.fromRGB(130, 125, 150), M.FONT, Enum.TextXAlignment.Center) end
  end
  local B = box(A, UDim2.new(0, 0, 0, 176), UDim2.new(1, 0, 1, -176), string.format("보관함 %d개", #(v.inv or {})))
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 8, 0, 30), Size = UDim2.new(1, -16, 1, -36), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, B)
  mk("UIGridLayout", { CellSize = UDim2.new(0.25, -6, 0, 120), CellPadding = UDim2.new(0, 8, 0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  for i, c in ipairs(v.inv or {}) do
    local f = mk("Frame", { BackgroundColor3 = Color3.fromRGB(40, 30, 64), LayoutOrder = i }, sc); corner(f, 8); stroke(f, Color3.fromRGB(150, 110, 210), 1.5)
    txt(f, table.concat(c.lines or {}, "\n"), 12, UDim2.new(0, 8, 0, 6), UDim2.new(1, -16, 1, -46), Color3.fromRGB(230, 220, 250))
    local bar = mk("Frame", { Position = UDim2.new(0, 6, 1, -38), Size = UDim2.new(1, -12, 0, 32), BackgroundTransparency = 1 }, f)
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4) }, bar)
    M.btn(bar, "장착", UDim2.new(0.5, -2, 1, 0), M.BTN.green, function() local e = C.rpc:InvokeServer("charmequip", { uid = c.uid }); C.msg.Text = tostring(e.err or ""); M.charm() end)
    M.btn(bar, "버리기", UDim2.new(0.5, -2, 1, 0), M.BTN.red, function() C.rpc:InvokeServer("charmdrop", c.uid); M.charm() end)
  end
end


-- ───────── 심연 각인 (균열 조각 → 영구 보너스) ─────────
function M.atlas()
  C.clear()
  local r = C.rpc:InvokeServer("atlas"); if r.summary then C.setSummary(r.summary) end
  if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local v = r.view
  local head = mk("Frame", { Size = UDim2.new(1, -16, 0, 40), BackgroundTransparency = 1 }, C.list)
  txt(head, string.format("균열 조각 %s", n(v.shards)), 18, UDim2.new(0, 4, 0, 4), UDim2.new(0.5, 0, 0, 24), Color3.fromRGB(190, 160, 255), M.FONT)
  txt(head, "균열 조각으로 영구 보너스를 새깁니다. 조각은 심연의 균열 등 후반 콘텐츠에서 얻습니다.", 12, UDim2.new(0.42, 0, 0, 8), UDim2.new(0.58, 0, 0, 30), Color3.fromRGB(200, 195, 225))
  for _, a in ipairs(v.rows) do
    local maxed = a.rank >= a.max
    local cur = a.pct and string.format("+%d%%", math.floor(a.cur * 100 + 0.5)) or string.format("+%d", a.cur)
    rowCard({ emoji = "◈", color = maxed and M.GOLD or Color3.fromRGB(170, 120, 255), title = string.format("%s  %d/%d", a.name, a.rank, a.max), desc = string.format("%s · 현재 %s", a.text, cur), frac = a.rank / a.max, ready = not maxed and v.shards >= a.cost,
      btn = maxed and "최대" or string.format("새기기 %d", a.cost), btnColor = (not maxed and v.shards >= a.cost) and M.BTN.purple or M.BTN.gray,
      click = (not maxed) and function() local e = C.rpc:InvokeServer("atlasbuy", a.id); if e.summary then C.setSummary(e.summary) end; if e.ok then C.toast("각인을 새겼습니다") else C.msg.Text = tostring(e.err) end; M.atlas() end or nil })
  end
end

-- ───────── 스탯 ─────────
function M.stats()
  C.clear()
  local r = C.rpc:InvokeServer("stats"); if r.summary then C.setSummary(r.summary) end
  if r.err or not r.groups then C.msg.Text = tostring(r.err); return end
  local A = area(392)
  local sc = mk("ScrollingFrame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6 }, A)
  mk("UIGridLayout", { CellSize = UDim2.new(1 / 3, -8, 0, 186), CellPadding = UDim2.new(0, 8, 0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  for gi, g in ipairs(r.groups) do
    local B = box(sc, UDim2.new(), UDim2.new(), g[1]); B.LayoutOrder = gi
    local lst = mk("Frame", { Position = UDim2.new(0, 10, 0, 30), Size = UDim2.new(1, -20, 1, -34), BackgroundTransparency = 1 }, B)
    mk("UIListLayout", { Padding = UDim.new(0, 1), SortOrder = Enum.SortOrder.LayoutOrder }, lst)
    for ri, row in ipairs(g[2]) do
      local f = mk("Frame", { Size = UDim2.new(1, 0, 0, 16), BackgroundTransparency = 1, LayoutOrder = ri }, lst)
      txt(f, row[1], 12, UDim2.new(), UDim2.new(0.6, 0, 1, 0), Color3.fromRGB(200, 195, 225))
      local v = txt(f, row[2], 12, UDim2.new(0.6, 0, 0, 0), UDim2.new(0.4, 0, 1, 0), Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Right); v:SetAttribute("NoTr", true)
    end
  end
end


-- ───────── 창고 (가방 ⇄ 창고: 누르면 옮김) ─────────
function M.stash()
  C.clear()
  local r = C.rpc:InvokeServer("stash"); if r.summary then C.setSummary(r.summary) end
  if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local v = r.view
  local A = area(392)
  local function side(x, title, list, to)
    local B = box(A, UDim2.new(x, x > 0 and 4 or 0, 0, 0), UDim2.new(0.5, -4, 1, 0), title)
    local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, to == "stash" and -36 or -80), 60)
    for i, it in ipairs(list) do
      local t = M.tile(g, 60, { order = i, tip = { title = it.title, color = itemColor(it), lines = it.lines }, art = artOf(it), emoji = SLOT_EMOJI[it.slot], color = itemColor(it), tl = it.enh > 0 and ("+" .. it.enh) or nil, br = it.ilvl and ("i" .. it.ilvl) or nil,
        click = function() local e = C.rpc:InvokeServer("stashmove", { uid = it.uid, to = to }); if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.stash() end })
      t.MouseEnter:Connect(function() C.msg.Text = it.title .. " · " .. table.concat(it.lines or {}, " · ") end)
    end
    return B
  end
  side(0, string.format("가방 %d개 → 창고로", #v.inv), v.inv, "stash")
  local S = side(0.5, string.format("창고 %d / %d → 가방으로", #v.items, v.cap), v.items, "inv")
  if v.expandCost then
    local b = M.btn(S, string.format("창고 +10칸 (골드 %s)", n(v.expandCost)), UDim2.new(1, -12, 0, 38), M.BTN.gold, function()
      local e = C.rpc:InvokeServer("stashexpand"); if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.stash() end)
    b.Position = UDim2.new(0, 6, 1, -44)
  end
end

-- 장비 화면 위쪽에 붙는 프리셋 줄 (불러오기 / 현재 구성 저장)
-- 세트 탭: [1][2][3] — 누르면 그 탭의 구성으로 바뀐다 (kind = gear / skill / pass)
function M.setTabs(parent, pos, size, kind, label, after)
  local f = mk("Frame", { Position = pos, Size = size, BackgroundTransparency = 1 }, parent)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center, HorizontalAlignment = Enum.HorizontalAlignment.Right }, f)
  local r = C.rpc:InvokeServer("sets"); local cur = r and r.sets and r.sets[kind] or 1
  local l = txt(f, label or "세트", 13, UDim2.new(), UDim2.new(0, 40, 1, 0), Color3.fromRGB(255, 225, 140), M.FONT, Enum.TextXAlignment.Right); l.TextYAlignment = Enum.TextYAlignment.Center; l.LayoutOrder = 0
  for i = 1, 3 do
    local b = M.btn(f, tostring(i), UDim2.new(0, 30, 1, 0), i == cur and M.BTN.gold or M.BTN.gray, function()
      if i == cur then return end
      local e = C.rpc:InvokeServer("setswitch", { kind = kind, i = i }); if e and e.summary then C.setSummary(e.summary) end
      C.toast(string.format("세트 %d", i)); after()
    end); b.LayoutOrder = i; b:SetAttribute("NoTr", true)
  end
  return f
end
function M.presetBar(parent, pos, size)
  local f = mk("Frame", { Position = pos, Size = size, BackgroundTransparency = 1 }, parent)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center }, f)
  local r = C.rpc:InvokeServer("presets"); local rows = r.rows or {}
  local l = txt(f, "프리셋", 13, UDim2.new(), UDim2.new(0, 46, 1, 0), Color3.fromRGB(255, 225, 140), M.FONT); l.TextYAlignment = Enum.TextYAlignment.Center; l.LayoutOrder = 0
  for i = 1, 3 do
    local has = rows[i]
    local b = M.btn(f, tostring(i), UDim2.new(0, 30, 0, 28), has and M.BTN.blue or M.BTN.gray, function()
      if not has then C.msg.Text = "빈 프리셋입니다. [저장]을 눌러 현재 구성을 저장하세요."; return end
      local e = C.rpc:InvokeServer("presetload", i); if e.summary then C.setSummary(e.summary) end; C.toast(string.format("프리셋 %d 불러옴", i)); M.inv()
    end); b.LayoutOrder = i; b:SetAttribute("NoTr", true)
  end
  local sv = M.btn(f, "저장", UDim2.new(0, 48, 0, 28), M.BTN.green, function()
    -- 저장할 칸 고르기: 비어 있는 첫 칸, 없으면 1번
    local slot = 1; for i = 1, 3 do if not rows[i] then slot = i; break end end
    C.prompt(string.format("현재 장비와 스킬 구성을 몇 번에 저장할까요? (1~3, 기본 %d)", slot), tostring(slot), function(v)
      local k = tonumber(v) or slot; if k < 1 or k > 3 then return end
      C.rpc:InvokeServer("presetsave", k); C.toast(string.format("프리셋 %d 저장", k)); M.inv()
    end)
  end); sv.LayoutOrder = 9
  return f
end

-- ───────── 기록 ─────────
function M.records()
  C.clear()
  local r = C.rpc:InvokeServer("records"); if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local A = area(392)
  local B = box(A, UDim2.new(0.2, 0, 0, 0), UDim2.new(0.6, 0, 1, 0), "기록")
  local lst = mk("Frame", { Position = UDim2.new(0, 16, 0, 36), Size = UDim2.new(1, -32, 1, -44), BackgroundTransparency = 1 }, B)
  mk("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, lst)
  for i, row in ipairs(r.view.rows) do
    local f = mk("Frame", { Size = UDim2.new(1, 0, 0, 24), BackgroundColor3 = i % 2 == 0 and Color3.fromRGB(36, 32, 46) or Color3.fromRGB(28, 25, 36), LayoutOrder = i }, lst); corner(f, 4)
    txt(f, row[1], 14, UDim2.new(0, 10, 0, 3), UDim2.new(0.6, 0, 1, 0), Color3.fromRGB(205, 200, 225))
    txt(f, row[2], 14, UDim2.new(0.6, 0, 0, 3), UDim2.new(0.4, -10, 1, 0), Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Right)
  end
end

-- ───────── 도감: 모든 스킬 (보유 여부 · 설명) ─────────
local codexFilter = "all"
function M.codex()
  C.clear()
  local r = C.rpc:InvokeServer("records"); local owned = (r.view and r.view.owned) or {}
  local A = area(392)
  local bar = mk("Frame", { Size = UDim2.new(1, 0, 0, 36), BackgroundTransparency = 1 }, A)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, bar)
  local F = { { "all", "전체" }, { "basic", "기본 공격" }, { "fire", "화염" }, { "cold", "냉기" }, { "light", "번개" }, { "void", "공허" }, { "phys", "물리" } }
  for i, f in ipairs(F) do local b = M.btn(bar, f[2], UDim2.new(0, 96, 1, 0), codexFilter == f[1] and M.BTN.gold or M.BTN.purple, function() codexFilter = f[1]; M.codex() end); b.LayoutOrder = i end
  local list, have = {}, 0
  for _, d in ipairs(Skills.SKILLS) do
    if d.id ~= "p_none" then
      local ok = codexFilter == "all" or (codexFilter == "basic" and d.slot == "basic") or (codexFilter == "phys" and d.slot ~= "basic" and not d.elem) or d.elem == codexFilter
      if ok then list[#list + 1] = d; if owned[d.id] then have += 1 end end
    end
  end
  local B = box(A, UDim2.new(0, 0, 0, 44), UDim2.new(1, 0, 1, -44), string.format("스킬 %d / %d 보유", have, #list))
  local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -36), 76)
  for i, d in ipairs(list) do
    local col, icon = M.skStyle(d.id)
    local info = { d.desc or "" }
    if d.cd then info[#info + 1] = string.format("쿨타임 %.1f초", d.cd) end
    info[#info + 1] = owned[d.id] and "보유 중" or "미보유"
    M.tile(g, 76, { order = i, color = col, emoji = icon, label = d.name, dim = not owned[d.id], check = owned[d.id] or nil, tip = { title = d.name, color = col, lines = info } })
  end
end

-- ───────── 허수아비: 60초 딜 측정 ─────────
local lastDummy
function M.dummy()
  C.clear()
  local A = area(392)
  local B = box(A, UDim2.new(0.15, 0, 0, 0), UDim2.new(0.7, 0, 1, 0), "허수아비")
  txt(B, "60초 동안 공격만 해서 초당 피해(DPS)를 잽니다. 최고 기록은 랭킹에 올라갑니다. (30초에 한 번)", 13, UDim2.new(0, 14, 0, 32), UDim2.new(1, -28, 0, 36), Color3.fromRGB(205, 200, 225))
  if lastDummy then
    local r = lastDummy
    txt(B, string.format("DPS %s", n(r.dps)), 30, UDim2.new(0, 14, 0, 74), UDim2.new(1, -28, 0, 36), r.newBest and M.GOLD or Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Center)
    txt(B, string.format("총 피해 %s · 최고 %s%s", n(r.total), n(r.best), r.newBest and " · 신기록!" or ""), 14, UDim2.new(0, 14, 0, 114), UDim2.new(1, -28, 0, 20), Color3.fromRGB(220, 215, 240), nil, Enum.TextXAlignment.Center)
    local lst = mk("Frame", { Position = UDim2.new(0, 30, 0, 142), Size = UDim2.new(1, -60, 0, 170), BackgroundTransparency = 1 }, B)
    mk("UIListLayout", { Padding = UDim.new(0, 3), SortOrder = Enum.SortOrder.LayoutOrder }, lst)
    for i, p in ipairs(r.parts or {}) do
      if i > 6 then break end
      local d = SK_BY[p.id]; local f = mk("Frame", { Size = UDim2.new(1, 0, 0, 22), BackgroundTransparency = 1, LayoutOrder = i }, lst)
      local frac = r.total > 0 and p.dmg / r.total or 0
      local bg = mk("Frame", { Position = UDim2.new(0.35, 0, 0.2, 0), Size = UDim2.new(0.5, 0, 0.6, 0), BackgroundColor3 = Color3.fromRGB(20, 16, 28) }, f); corner(bg, 4)
      local fl = mk("Frame", { Size = UDim2.new(frac, 0, 1, 0), BackgroundColor3 = (M.skStyle(p.id)) }, bg); corner(fl, 4)
      txt(f, d and d.name or tostring(p.id), 13, UDim2.new(0, 0, 0, 3), UDim2.new(0.34, 0, 1, 0), Color3.new(1, 1, 1))
      txt(f, string.format("%d%%", math.floor(frac * 100 + 0.5)), 13, UDim2.new(0.86, 0, 0, 3), UDim2.new(0.14, 0, 1, 0), Color3.fromRGB(220, 215, 240), M.FONT, Enum.TextXAlignment.Right)
    end
  end
  local b = M.btn(B, "측정 시작", UDim2.new(0, 200, 0, 46), M.BTN.green, function()
    C.msg.Text = "측정 중..."
    local r = C.rpc:InvokeServer("dummy"); if r.err then C.msg.Text = tostring(r.err); return end
    lastDummy = r; C.msg.Text = ""; M.dummy()
  end)
  b.AnchorPoint = Vector2.new(0.5, 1); b.Position = UDim2.new(0.5, 0, 1, -12)
end

-- ───────── 랭킹 (균열 · 레벨 · DPS) ─────────
local rankKind = "rift"
function M.ranking()
  C.clear()
  local r = C.rpc:InvokeServer("ranking", rankKind); if r.err then C.msg.Text = tostring(r.err); return end
  local A = area(392)
  local bar = mk("Frame", { Size = UDim2.new(1, 0, 0, 36), BackgroundTransparency = 1 }, A)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, bar)
  for i, k in ipairs({ { "rift", "균열 최고층" }, { "level", "레벨" }, { "dps", "허수아비 DPS" } }) do
    local b = M.btn(bar, k[2], UDim2.new(0, 150, 1, 0), rankKind == k[1] and M.BTN.gold or M.BTN.purple, function() rankKind = k[1]; M.ranking() end); b.LayoutOrder = i
  end
  local my = r.my or {}
  local mine = rankKind == "dps" and n(my.dps) or tostring(my[rankKind] or 0)
  local B = box(A, UDim2.new(0, 0, 0, 44), UDim2.new(1, 0, 1, -44), string.format("상위 50명 · 내 기록 %s", mine))
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 10, 0, 32), Size = UDim2.new(1, -20, 1, -40), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6 }, B)
  mk("UIListLayout", { Padding = UDim.new(0, 3), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  if #(r.rows or {}) == 0 then txt(sc, "아직 기록이 없거나, 지금 서버에서 랭킹을 불러올 수 없습니다. (Studio 에서는 저장소 접근이 막혀 있으면 비어 보입니다)", 13, UDim2.new(), UDim2.new(1, -8, 0, 40), Color3.fromRGB(190, 185, 210)) end
  local me = game:GetService("Players").LocalPlayer.UserId
  for i, row in ipairs(r.rows or {}) do
    local medal = ({ M.GOLD, Color3.fromRGB(200, 200, 215), Color3.fromRGB(190, 120, 70) })[row.rank]
    local f = mk("Frame", { Size = UDim2.new(1, -8, 0, 28), BackgroundColor3 = row.uid == me and Color3.fromRGB(60, 52, 30) or (i % 2 == 0 and Color3.fromRGB(36, 32, 46) or Color3.fromRGB(28, 25, 36)), LayoutOrder = i }, sc); corner(f, 4)
    local rk = txt(f, tostring(row.rank), 16, UDim2.new(0, 8, 0, 4), UDim2.new(0, 40, 1, 0), medal or Color3.new(1, 1, 1), M.FONT); rk:SetAttribute("NoTr", true)
    local nm = txt(f, tostring(row.name), 14, UDim2.new(0, 56, 0, 5), UDim2.new(0.6, 0, 1, 0), Color3.new(1, 1, 1)); nm:SetAttribute("NoTr", true)
    local v = txt(f, rankKind == "dps" and n(row.value) or tostring(row.value), 15, UDim2.new(0.6, 0, 0, 4), UDim2.new(0.4, -12, 1, 0), Color3.fromRGB(255, 225, 140), M.FONT, Enum.TextXAlignment.Right); v:SetAttribute("NoTr", true)
  end
end

-- ───────── 우편함 ─────────
local MAIL_NAME = { gold = "골드", ore = "강화석", hone = "연마석", orbC = "혼돈 구슬", orbD = "신성한 구슬", shards = "균열 조각", keys = "공허의 열쇠" }
function M.mail()
  C.clear()
  local r = C.rpc:InvokeServer("mail"); if r.err then C.msg.Text = tostring(r.err); return end
  if #(r.rows or {}) == 0 then rowCard({ emoji = "✉", title = "우편함", desc = "받은 우편이 없습니다.", color = Color3.fromRGB(150, 140, 190) }); return end
  for i = #r.rows, 1, -1 do
    local m = r.rows[i]
    local rw = {}; for k, v in pairs(m.reward or {}) do rw[#rw + 1] = string.format("%s +%s", MAIL_NAME[k] or k, n(v)) end
    local has = #rw > 0
    rowCard({ emoji = m.got and "✓" or "✉", color = (has and not m.got) and M.GOLD or Color3.fromRGB(150, 140, 190), title = tostring(m.title), desc = tostring(m.body or "") .. (has and (string.char(10) .. table.concat(rw, " · ")) or ""), h = has and 86 or nil, ready = has and not m.got, done = m.got,
      btn = has and (m.got and "받음" or "받기") or nil, btnColor = (has and not m.got) and M.BTN.green or M.BTN.gray,
      click = (has and not m.got) and function() local e = C.rpc:InvokeServer("mailclaim", m.id); if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.mail() end or nil })
  end
end

-- ───────── 스킬 뽑기 (스킬 상점 대체) ─────────
M.SK_RAR = { "일반", "희귀", "전설", "신화", "사탄" }
M.SK_RCOL = { Color3.fromRGB(170, 170, 180), Color3.fromRGB(80, 150, 255), Color3.fromRGB(255, 150, 40), Color3.fromRGB(190, 90, 255), Color3.fromRGB(230, 40, 50) }
local pulling = false
local function art(key) return C.Sprites.art(key) end
local function img(parent, key, props)
  local a = art(key); if not a then return nil end
  props.BackgroundTransparency = 1; props.ImageContent = a.content; props.ScaleType = props.ScaleType or Enum.ScaleType.Fit
  return mk("ImageLabel", props, parent)
end
-- 결과를 한 장씩: 뒷면 → (등급 기운) → 누르면 뒤집혀 공개 → 누르면 다음 카드. 마지막엔 전체 요약
local function revealResults(res)
  local host = C.list.Parent
  local ov = mk("TextButton", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(6, 4, 10), BackgroundTransparency = 0.12, Text = "", AutoButtonColor = false, ZIndex = 60 }, host); corner(ov, 14)
  local count = txt(ov, "", 18, UDim2.new(0, 0, 0, 12), UDim2.new(1, 0, 0, 24), Color3.fromRGB(220, 210, 240), M.FONT, Enum.TextXAlignment.Center); count.ZIndex = 70; count:SetAttribute("NoTr", true)
  local stage = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(0, 260, 0, 390), BackgroundTransparency = 1, ZIndex = 61 }, ov)
  local hint = txt(ov, "카드를 누르세요", 15, UDim2.new(0, 0, 1, -64), UDim2.new(1, 0, 0, 20), Color3.fromRGB(200, 195, 220), nil, Enum.TextXAlignment.Center); hint.ZIndex = 70
  local all = M.btn(ov, "모두 공개", UDim2.new(0, 140, 0, 36), M.BTN.gray, nil); all.AnchorPoint = Vector2.new(1, 1); all.Position = UDim2.new(1, -16, 1, -14); all.ZIndex = 70
  local idx, phase, busyFlip = 0, "back", false
  local cur = {}
  local function clearStage() for _, c in ipairs(stage:GetChildren()) do c:Destroy() end end
  local function summary()
    clearStage(); hint.Text = "누르면 닫힙니다"; all.Visible = false; count.Text = ""
    stage.Size = UDim2.new(1, -40, 0, 330)
    local g = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 61 }, stage)
    mk("UIGridLayout", { CellSize = UDim2.new(0, 96, 0, 144), CellPadding = UDim2.new(0, 10, 0, 12), HorizontalAlignment = Enum.HorizontalAlignment.Center, VerticalAlignment = Enum.VerticalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }, g)
    for i, r in ipairs(res) do
      local c = mk("Frame", { BackgroundColor3 = Color3.fromRGB(20, 15, 28), LayoutOrder = i, ZIndex = 62 }, g); corner(c, 6)
      local col = M.SK_RCOL[r.rarity + 1]
      local _, icon = M.skStyle(r.id)
      local ca = C.Sprites.art("card_s_" .. tostring(r.id))
      if ca then mk("ImageLabel", { Position = UDim2.new(0.07, 0, 0.05, 0), Size = UDim2.new(0.86, 0, 0.9, 0), BackgroundTransparency = 1, ImageContent = ca.content, ScaleType = Enum.ScaleType.Crop, ZIndex = 63 }, c)
      else mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0.15, 0, 0.14, 0), Size = UDim2.new(0.7, 0, 0.4, 0), Text = icon, TextScaled = true, Font = M.FONT, TextColor3 = col, ZIndex = 63 }, c) end
      if not img(c, "card_f" .. r.rarity, { Size = UDim2.new(1, 0, 1, 0), ZIndex = 64 }) then stroke(c, col, 2) end
      local nm = txt(c, r.name, 12, UDim2.new(0, 4, 0.6, 0), UDim2.new(1, -8, 0, 30), Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Center); nm.ZIndex = 65; mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, nm)
      local rr = txt(c, r.dup and string.format("연마석 +%d", r.dup) or (M.SK_RAR[r.rarity + 1] or ""), 11, UDim2.new(0, 4, 1, -22), UDim2.new(1, -8, 0, 16), r.dup and Color3.fromRGB(150, 230, 170) or col, M.FONT, Enum.TextXAlignment.Center); rr.ZIndex = 65
    end
    phase = "done"
  end
  local function showBack()
    idx += 1
    if idx > #res then summary(); return end
    local r = res[idx]; cur = { r = r }
    clearStage(); phase = "back"; count.Text = string.format("%d / %d", idx, #res); hint.Text = "카드를 누르세요"
    stage.Size = UDim2.new(0, 260, 0, 390)
    -- 등급 기운: 뒷면 상태에서 미리 새어 나오는 빛 (전설 이상)
    if r.rarity >= 2 then
      local bz = img(stage, "card_burst" .. math.min(4, r.rarity), { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(1.4, 0, 1.4, 0), ImageTransparency = 0.75, ZIndex = 61 })
      if bz then cur.aura = bz; TweenService:Create(bz, TweenInfo.new(1.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { ImageTransparency = 0.45, Rotation = 8 }):Play() end
    end
    local card = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 62 }, stage)
    cur.card = card
    if not img(card, "card_back", { Size = UDim2.new(1, 0, 1, 0), ZIndex = 63 }) then
      local f = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(40, 16, 22), ZIndex = 63 }, card); corner(f, 12); stroke(f, M.GOLD, 3)
      txt(f, "?", 80, UDim2.new(0, 0, 0.3, 0), UDim2.new(1, 0, 0, 100), M.GOLD, M.FONT, Enum.TextXAlignment.Center).ZIndex = 64
    end
    -- 등장: 아래에서 떠오름
    card.Position = UDim2.new(0.5, 0, 0.62, 0)
    TweenService:Create(card, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = UDim2.new(0.5, 0, 0.5, 0) }):Play()
    if r.rarity >= 3 then task.spawn(function() for k = 1, 6 do if cur.card ~= card then return end; card.Rotation = (k % 2 == 0 and 1.5 or -1.5); task.wait(0.05) end; card.Rotation = 0 end) end
  end
  local function flip()
    local r, card = cur.r, cur.card; if not card then return end
    busyFlip = true
    local t1 = TweenService:Create(card, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Size = UDim2.new(0.04, 0, 0.9, 0), Rotation = -38 }); t1:Play(); t1.Completed:Wait()
    card.Rotation = 38
    card:ClearAllChildren()
    local col = M.SK_RCOL[r.rarity + 1]; local scol, icon = M.skStyle(r.id)
    local face = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(18, 13, 26), ZIndex = 63 }, card); corner(face, 12)
    mk("UIGradient", { Color = ColorSequence.new(col:Lerp(Color3.new(0, 0, 0), 0.6), Color3.fromRGB(14, 10, 20)), Rotation = 90 }, face)
    local ca = C.Sprites.art("card_s_" .. tostring(r.id))
    if ca then
      mk("ImageLabel", { Position = UDim2.new(0.07, 0, 0.05, 0), Size = UDim2.new(0.86, 0, 0.9, 0), BackgroundTransparency = 1, ImageContent = ca.content, ScaleType = Enum.ScaleType.Crop, ZIndex = 64 }, face)
      local band = mk("Frame", { Position = UDim2.new(0.07, 0, 0.58, 0), Size = UDim2.new(0.86, 0, 0.37, 0), BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, ZIndex = 64 }, face)
      mk("UIGradient", { Rotation = 90, Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.35, 0.35), NumberSequenceKeypoint.new(1, 0.15) }) }, band)
    else mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0.18, 0, 0.14, 0), Size = UDim2.new(0.64, 0, 0.42, 0), Text = icon, TextScaled = true, Font = M.FONT, TextColor3 = scol, ZIndex = 64 }, face) end
    if not img(card, "card_f" .. r.rarity, { Size = UDim2.new(1, 0, 1, 0), ZIndex = 65 }) then stroke(face, col, 4) end
    local nm = txt(card, r.name, 24, UDim2.new(0, 10, 0.62, 0), UDim2.new(1, -20, 0, 34), Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Center); nm.ZIndex = 66; mk("UIStroke", { Thickness = 2, Color = Color3.new(0, 0, 0) }, nm)
    local rr = txt(card, M.SK_RAR[r.rarity + 1] or "", 20, UDim2.new(0, 10, 0.74, 0), UDim2.new(1, -20, 0, 26), col, M.FONT, Enum.TextXAlignment.Center); rr.ZIndex = 66
    local tg = txt(card, r.dup and string.format("연마석 +%d", r.dup) or "NEW", 15, UDim2.new(0, 10, 0.86, 0), UDim2.new(1, -20, 0, 20), r.dup and Color3.fromRGB(150, 230, 170) or Color3.fromRGB(255, 230, 120), M.FONT, Enum.TextXAlignment.Center); tg.ZIndex = 66
    if not r.dup then tg:SetAttribute("NoTr", true) end
    local t2 = TweenService:Create(card, TweenInfo.new(0.32, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Size = UDim2.new(1, 0, 1, 0), Rotation = 0 }); t2:Play()
    -- 공개 순간: 빛 폭발 그림 (등급이 높을수록 크고 오래) · 신화 이상 화면 번쩍임 · 사탄 흔들림
    if r.rarity >= 2 then
      if cur.aura then cur.aura:Destroy() end
      local b = img(stage, "card_burst" .. math.min(4, r.rarity), { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(0.8, 0, 0.8, 0), ZIndex = 61 })
      if b then TweenService:Create(b, TweenInfo.new(0.5 + 0.3 * (r.rarity - 2), Enum.EasingStyle.Quad), { Size = UDim2.new(1.8 + 0.5 * (r.rarity - 2), 0, 1.8 + 0.5 * (r.rarity - 2), 0), ImageTransparency = 0.25 }):Play() end
    end
    if r.rarity >= 3 then
      local fl = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = r.rarity >= 4 and Color3.fromRGB(255, 60, 40) or Color3.new(1, 1, 1), BackgroundTransparency = 0.25, BorderSizePixel = 0, ZIndex = 69 }, ov); corner(fl, 14)
      TweenService:Create(fl, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play(); task.delay(0.55, function() fl:Destroy() end)
      C.toast(string.format("%s 등급! %s", M.SK_RAR[r.rarity + 1], r.name))
    end
    if r.rarity >= 4 then task.spawn(function() for k = 1, 12 do stage.Position = UDim2.new(0.5, math.random(-10, 10), 0.5, math.random(-7, 7)); task.wait(0.03) end; stage.Position = UDim2.new(0.5, 0, 0.5, 0) end) end
    t2.Completed:Wait(); phase = "front"; hint.Text = idx < #res and "누르면 다음 카드" or "누르면 결과 요약"; busyFlip = false
  end
  ov.MouseButton1Click:Connect(function()
    if busyFlip then return end
    if phase == "back" then task.spawn(flip) elseif phase == "front" then showBack() elseif phase == "done" then ov:Destroy() end
  end)
  all.MouseButton1Click:Connect(function() if not busyFlip then summary() end end)
  showBack()
end
M.revealResults = revealResults   -- (시험용: 가짜 결과로 연출 확인)
function M.gacha()
  C.clear()
  local r = C.rpc:InvokeServer("gacha"); if r.summary then C.setSummary(r.summary) end
  if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local v = r.view; local s = C.summary() or {}
  local A = area(392)
  local L = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(0.42, -4, 1, 0), "스킬 소환")
  txt(L, "스킬은 소환으로만 얻습니다. 이미 같거나 더 높은 등급을 가진 스킬이 나오면 연마석으로 바뀝니다.", 13, UDim2.new(0, 14, 0, 32), UDim2.new(1, -28, 0, 36), Color3.fromRGB(205, 200, 225))
  local rl = mk("Frame", { Position = UDim2.new(0, 14, 0, 76), Size = UDim2.new(1, -28, 0, 140), BackgroundTransparency = 1 }, L)
  mk("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, rl)
  for i, pct in ipairs(v.rates) do
    local f = mk("Frame", { Size = UDim2.new(1, 0, 0, 22), BackgroundTransparency = 1, LayoutOrder = i }, rl)
    txt(f, M.SK_RAR[i], 15, UDim2.new(0, 0, 0, 2), UDim2.new(0.5, 0, 1, 0), M.SK_RCOL[i], M.FONT)
    local pv = txt(f, string.format("%g%%", pct), 15, UDim2.new(0.5, 0, 0, 2), UDim2.new(0.5, 0, 1, 0), Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Right); pv:SetAttribute("NoTr", true)
  end
  txt(L, string.format("전설 이상 보장까지 %d / %d회", v.pity, v.pityMax), 14, UDim2.new(0, 14, 1, -66), UDim2.new(1, -28, 0, 20), Color3.fromRGB(255, 200, 120), M.FONT)
  pbar(L, UDim2.new(0, 14, 1, -40), UDim2.new(1, -28, 0, 14), v.pity / v.pityMax, Color3.fromRGB(255, 150, 40))
  txt(L, "10회 소환은 희귀 이상 1개 보장", 12, UDim2.new(0, 14, 1, -22), UDim2.new(1, -28, 0, 16), Color3.fromRGB(180, 175, 200))
  local R = box(A, UDim2.new(0.42, 4, 0, 0), UDim2.new(0.58, -4, 1, 0), string.format("아르카나 조각 %s · 보석 %s", n(v.arcana), n(v.gems)))
  local function pull(nn, pay)
    if pulling then return end; pulling = true
    local e = C.rpc:InvokeServer("gachapull", { n = nn, pay = pay }); pulling = false
    if e.summary then C.setSummary(e.summary) end
    if e.err or not e.res then C.msg.Text = tostring(e.err); return end
    M.gacha(); revealResults(e.res)
  end
  local function costRow(parent, art, val) return M.cost(parent, { { art, val, nil, art == "i_arcana" and "조각" or nil } }, UDim2.new(0.58, 0, 0, 22)) end
  local function bb(y, title, art, val, col, cb)
    local b = M.btn(R, "", UDim2.new(1, -28, 0, 66), col, cb); b.Position = UDim2.new(0, 14, 0, y)
    txt(b, title, 22, UDim2.new(0, 18, 0, 18), UDim2.new(0.55, 0, 0, 30), Color3.new(1, 1, 1), M.FONT)
    costRow(b, art, val)
  end
  bb(40, "1회 소환", "i_arcana", v.arc1, M.BTN.blue, function() pull(1, "arcana") end)   -- 아르카나 조각 (전투 · 과제 보상)
  bb(114, "10회 소환", "i_arcana", v.arc10, M.BTN.gold, function() pull(10, "arcana") end)
  bb(198, "1회 소환", "i_divine", v.gem1, M.BTN.purple, function() pull(1, "gem") end)
  bb(272, "10회 소환", "i_divine", v.gem10, M.BTN.red, function() pull(10, "gem") end)
  txt(R, "아르카나 조각은 전투 승리 · 보스 · 첫 클리어 · 일일 과제 · 퀘스트로 얻습니다. 보석은 일일 과제와 상점으로.", 12, UDim2.new(0, 14, 1, -22), UDim2.new(1, -28, 0, 16), Color3.fromRGB(180, 175, 200))
end
-- 소환 목록: 뽑을 수 있는 스킬 전체 (아직 잠긴 것은 흐리게, 가진 것은 최고 등급 표시)
function M.gachalist()
  C.clear()
  local r = C.rpc:InvokeServer("gacha"); if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local v = r.view; local list = v.list or {}
  table.sort(list, function(a, b) if a.unlock ~= b.unlock then return a.unlock < b.unlock end; return a.id < b.id end)
  local A = area(392)
  local own = 0; for _, e in ipairs(list) do if e.own then own += 1 end end
  local B = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 1, 0), string.format("소환 가능한 스킬 %d종 · 보유 %d종", #list, own))
  local g = grid(B, UDim2.new(0, 6, 0, 34), UDim2.new(1, -12, 1, -40), 84)
  for i, e in ipairs(list) do
    local d = SK_BY[e.id]
    if d then
      local locked = e.unlock > (v.act or 1)
      local lines = { d.desc or "" }
      if locked then lines[#lines + 1] = string.format("레벨 %d부터 소환에 나옵니다", (e.unlock - 1) * 10) end
      if e.own then lines[#lines + 1] = string.format("보유: %s", M.SK_RAR[e.own + 1] or "") end
      M.tile(g, 84, { order = i, tip = { title = d.name, color = skColor(d), lines = lines }, color = e.own and M.SK_RCOL[e.own + 1] or skColor(d), art = skArt(e.id), emoji = skIcon(d), label = d.name, dim = locked,
        tl = locked and "🔒" or nil, br = e.own and M.SK_RAR[e.own + 1] or nil })
    end
  end
end

return M
