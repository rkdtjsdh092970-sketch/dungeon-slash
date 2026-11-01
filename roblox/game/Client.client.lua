-- 클라이언트 화면 (전체 화면): 로딩 → 마을 ⇄ 월드맵 → 전투 → 결과. 웹 게임의 마을·지도 흐름을 로블록스용으로 옮겼다.
-- 로블록스 기본 버튼(상단 줄 = GuiInset)은 비워 두고, 그 아래부터 HUD 를 배치한다. 로그인 절차는 없다 (로블록스 계정 = 세이브).
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local GuiService = game:GetService("GuiService")
local StarterGui = game:GetService("StarterGui")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer
local PG = player:WaitForChild("PlayerGui")

-- ── 로딩 화면 (가장 먼저 띄운다) ──
local loadGui = Instance.new("ScreenGui"); loadGui.Name = "DungeonLoading"; loadGui.IgnoreGuiInset = true; loadGui.DisplayOrder = 100; loadGui.ResetOnSpawn = false; loadGui.Parent = PG
local loadBg = Instance.new("Frame"); loadBg.Size = UDim2.new(1, 0, 1, 0); loadBg.BackgroundColor3 = Color3.new(1, 1, 1); loadBg.BorderSizePixel = 0; loadBg.Parent = loadGui
loadGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
local loadGrad = Instance.new("UIGradient"); loadGrad.Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(70, 34, 120)), ColorSequenceKeypoint.new(0.5, Color3.fromRGB(26, 14, 56)), ColorSequenceKeypoint.new(1, Color3.fromRGB(90, 30, 70)) }); loadGrad.Rotation = 90; loadGrad.Parent = loadBg
-- 움직이는 배경: 흐르는 그라데이션 + 떠오르는 빛 입자, 전투 배경 그림이 오면 천천히 흐르게 깔린다
local loadArt = Instance.new("ImageLabel"); loadArt.BackgroundTransparency = 1; loadArt.ImageTransparency = 1; loadArt.ScaleType = Enum.ScaleType.Crop; loadArt.Size = UDim2.new(1.2, 0, 1, 0); loadArt.Position = UDim2.new(0, 0, 0, 0); loadArt.ZIndex = 1; loadArt.Parent = loadBg
local loadDim = Instance.new("Frame"); loadDim.Size = UDim2.new(1, 0, 1, 0); loadDim.BackgroundColor3 = Color3.fromRGB(16, 8, 34); loadDim.BackgroundTransparency = 1; loadDim.BorderSizePixel = 0; loadDim.ZIndex = 2; loadDim.Parent = loadBg
local motes = {}
for i = 1, 36 do
  local m = Instance.new("Frame"); local s = math.random(3, 7); m.Size = UDim2.new(0, s, 0, s); m.BorderSizePixel = 0; m.ZIndex = 3
  m.BackgroundColor3 = (i % 3 == 0) and Color3.fromRGB(255, 200, 110) or Color3.fromRGB(200, 170, 255); m.Parent = loadBg; Instance.new("UICorner", m).CornerRadius = UDim.new(1, 0)
  motes[i] = { f = m, x = math.random(), y = math.random(), sp = 0.03 + math.random() * 0.06, ph = math.random() * 6.28 }
end
local loadBox = Instance.new("Frame"); loadBox.BackgroundTransparency = 1; loadBox.AnchorPoint = Vector2.new(0.5, 0.5); loadBox.Position = UDim2.new(0.5, 0, 0.5, 0); loadBox.Size = UDim2.new(0, 560, 0, 300); loadBox.Parent = loadBg
do local sc = Instance.new("UIScale"); sc.Parent = loadBox; local function f() local vp = workspace.CurrentCamera.ViewportSize; sc.Scale = math.clamp(math.min(vp.X / 640, vp.Y / 420), 0.5, 1.6) end; f(); workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(f) end
local function logoText(t, y, size, color)
  local l = Instance.new("TextLabel"); l.BackgroundTransparency = 1; l.Size = UDim2.new(1, 0, 0, size + 8); l.Position = UDim2.new(0, 0, 0, y); l.Text = t; l.Font = Enum.Font.GothamBlack; l.TextSize = size; l.TextColor3 = color; l.Parent = loadBox
  local s = Instance.new("UIStroke"); s.Thickness = 3; s.Color = Color3.fromRGB(40, 14, 60); s.Parent = l; return l
end
logoText("DUNGEON", 10, 64, Color3.fromRGB(255, 214, 90)); logoText("SLASH", 80, 72, Color3.fromRGB(255, 120, 90)); logoText("자동 전투 핵 앤 슬래시", 166, 20, Color3.fromRGB(220, 210, 255))
local loadBarBg = Instance.new("Frame"); loadBarBg.Size = UDim2.new(0.8, 0, 0, 14); loadBarBg.Position = UDim2.new(0.1, 0, 0, 226); loadBarBg.BackgroundColor3 = Color3.fromRGB(30, 20, 56); loadBarBg.Parent = loadBox
Instance.new("UICorner", loadBarBg).CornerRadius = UDim.new(1, 0); do local s = Instance.new("UIStroke"); s.Color = Color3.fromRGB(214, 168, 70); s.Thickness = 2; s.Parent = loadBarBg end
local loadBar = Instance.new("Frame"); loadBar.Size = UDim2.new(0, 0, 1, 0); loadBar.BackgroundColor3 = Color3.fromRGB(255, 200, 80); loadBar.Parent = loadBarBg; Instance.new("UICorner", loadBar).CornerRadius = UDim.new(1, 0)
local loadTxt = logoText("서버에 연결하는 중...", 250, 16, Color3.fromRGB(230, 225, 250)); loadTxt.Font = Enum.Font.GothamMedium
local function loadStep(text, p) loadTxt.Text = text; TweenService:Create(loadBar, TweenInfo.new(0.25), { Size = UDim2.new(math.clamp(p, 0, 1), 0, 1, 0) }):Play() end
loadBox.ZIndex = 5
do   -- 입자 · 그라데이션 흐름 · 배경 그림 천천히 이동
  local t0 = os.clock()
  local conn; conn = game:GetService("RunService").RenderStepped:Connect(function(dt)
    if not loadGui.Parent then conn:Disconnect(); return end
    local t = os.clock() - t0
    loadGrad.Offset = Vector2.new(0, math.sin(t * 0.4) * 0.25); loadGrad.Rotation = 90 + math.sin(t * 0.25) * 20
    for _, m in ipairs(motes) do
      m.y -= m.sp * dt; if m.y < -0.05 then m.y = 1.05; m.x = math.random() end
      m.f.Position = UDim2.new(m.x + math.sin(t * 0.8 + m.ph) * 0.015, 0, m.y, 0); m.f.BackgroundTransparency = 0.25 + 0.5 * (0.5 + 0.5 * math.sin(t * 2 + m.ph))
    end
    loadArt.Position = UDim2.new(-0.1 + math.sin(t * 0.12) * 0.1, 0, 0, 0)
  end)
end

-- 로블록스 기본 UI 중 이 게임에 필요 없는 것 숨김 (순위표 · 가방 · 모바일 이동 조작). 채팅과 메뉴 버튼은 그대로 둔다.
pcall(function() StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.PlayerList, false) end)
pcall(function() StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false) end)
pcall(function() GuiService.TouchControlsEnabled = false end)

local rpc = RS:WaitForChild("Rpc")
loadStep("게임 데이터를 준비하는 중...", 0.15)
local Stage = require(RS:WaitForChild("Game"):WaitForChild("Stage"))
local Sprites = require(RS.Game.Sprites); Sprites.init(rpc)
task.spawn(function()   -- 전투 배경 그림이 오면 로딩 배경으로 서서히 깐다
  local a = Sprites.art("bg1"); if not a or not loadGui.Parent then return end
  loadArt.ImageContent = a.content
  TweenService:Create(loadArt, TweenInfo.new(1.2), { ImageTransparency = 0 }):Play(); TweenService:Create(loadDim, TweenInfo.new(1.2), { BackgroundTransparency = 0.45 }):Play()
end)

local gui = Instance.new("ScreenGui"); gui.Name = "DungeonUI"; gui.ResetOnSpawn = false; gui.IgnoreGuiInset = true; gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling; gui.Parent = PG
local INSET = math.max(36, GuiService:GetGuiInset().Y)   -- 로블록스 상단 버튼 줄 높이
local function vp() return workspace.CurrentCamera.ViewportSize end
local K = 1   -- HUD 배율 (화면 높이 720 기준)
local function calcK() K = math.clamp(vp().Y / 720, 0.6, 1.4); Stage.TOP = INSET; Stage.HUD = K end
calcK()

local function mk(class, props, parent) local o = Instance.new(class); for k, v in pairs(props) do o[k] = v end; o.Parent = parent; return o end
local function corner(o, r) mk("UICorner", { CornerRadius = r and UDim.new(0, r) or UDim.new(1, 0) }, o) end
local function stroke(o, c, t) mk("UIStroke", { Color = c or Color3.fromRGB(214, 168, 70), Thickness = t or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, o) end
local GOLD, DARK, PANEL = Color3.fromRGB(214, 168, 70), Color3.fromRGB(20, 14, 38), Color3.fromRGB(32, 26, 58)
local function label(parent, text, size, pos, sz)
  local l = Instance.new("TextLabel"); l.BackgroundTransparency = 1; l.TextColor3 = Color3.new(1, 1, 1); l.Font = Enum.Font.GothamMedium; l.TextSize = size or 16
  l.TextXAlignment = Enum.TextXAlignment.Left; l.TextWrapped = true; l.Text = text; l.Position = pos; l.Size = sz; l.Parent = parent; return l
end
local function button(parent, text, pos, sz, cb, color)
  local b = Instance.new("TextButton"); b.Text = text; b.Font = Enum.Font.GothamBold; b.TextSize = 14; b.TextColor3 = Color3.new(1, 1, 1); b.BackgroundColor3 = color or Color3.fromRGB(70, 60, 120)
  b.Position = pos; b.Size = sz; b.Parent = parent; Instance.new("UICorner", b).CornerRadius = UDim.new(0, 6); b.MouseButton1Click:Connect(cb); return b
end
local function n(x) x = math.floor(x or 0); if x >= 1e9 then return string.format("%.1fB", x / 1e9) elseif x >= 1e6 then return string.format("%.1fM", x / 1e6) elseif x >= 1e4 then return string.format("%.1fK", x / 1e3) end return tostring(x) end

-- ── 층 구성 (아래 → 위): 전투 무대 · 마을 · 지도 · HUD · 창 · 결과 · 알림 ──
local stageHolder = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 1 }, gui)
local townLayer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(90, 150, 90), BorderSizePixel = 0, ZIndex = 2, Visible = false }, gui)
local mapLayer = mk("ScrollingFrame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(60, 50, 40), BorderSizePixel = 0, ZIndex = 3, Visible = false, ScrollBarThickness = 0, ScrollingDirection = Enum.ScrollingDirection.XY, ElasticBehavior = Enum.ElasticBehavior.Never }, gui)
local hud = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 10 }, gui)
local panelLayer = mk("TextButton", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, Text = "", AutoButtonColor = false, ZIndex = 20, Visible = false }, gui)
local resultLayer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.5, ZIndex = 25, Visible = false }, gui)
local toastLayer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 30 }, gui)

-- 상단 자원 (로블록스 상단 줄 가운데: 양 끝의 로블록스 버튼과 겹치지 않음)
local pillRow = mk("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0, INSET / 2), Size = UDim2.new(0, 520, 0, 34), ZIndex = 11 }, hud)
local pillScale = mk("UIScale", { Scale = K }, pillRow)
mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Center, VerticalAlignment = Enum.VerticalAlignment.Center, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, pillRow)
local PILLS = { { "lv", Color3.fromRGB(240, 200, 70), "Lv", 64 }, { "gold", Color3.fromRGB(240, 190, 60), "골드", 104 }, { "ore", Color3.fromRGB(150, 170, 200), "강화석", 96 }, { "hone", Color3.fromRGB(110, 210, 150), "연마석", 96 }, { "orb", Color3.fromRGB(190, 120, 240), "구슬", 90 } }
local pillLbl = {}
for i, p in ipairs(PILLS) do
  local f = mk("Frame", { Size = UDim2.new(0, p[4], 0, 30), BackgroundColor3 = DARK, BackgroundTransparency = 0.1, LayoutOrder = i, ZIndex = 11 }, pillRow); corner(f); stroke(f, p[2], 1.5)
  local dot = mk("Frame", { Size = UDim2.new(0, 12, 0, 12), Position = UDim2.new(0, 9, 0.5, -6), BackgroundColor3 = p[2], ZIndex = 12 }, f); corner(dot)
  pillLbl[p[1]] = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 26, 0, 0), Size = UDim2.new(1, -30, 1, 0), TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = 14, TextXAlignment = Enum.TextXAlignment.Left, Text = "-", ZIndex = 12 }, f)
end
-- 왼쪽 위 능력치 (마을 · 지도에서)
local statLbl = mk("TextLabel", { BackgroundColor3 = DARK, BackgroundTransparency = 0.25, Position = UDim2.new(0, 12, 0, INSET + 8), Size = UDim2.new(0, 330, 0, 44), TextColor3 = Color3.fromRGB(225, 220, 245), Font = Enum.Font.GothamMedium, TextSize = 13, TextWrapped = true, Text = "", ZIndex = 11 }, hud)
corner(statLbl, 8); local statScale = mk("UIScale", { Scale = K }, statLbl); mk("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }, statLbl)
-- 오른쪽 아래 이동 버튼 (모바일 점프 버튼 자리 — 이 게임은 이동 조작을 숨겼으므로 비어 있다)
local dock = mk("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -12, 1, -12), Size = UDim2.new(0, 3 * 84 + 2 * 8, 0, 72), ZIndex = 11 }, hud)
local dockScale = mk("UIScale", { Scale = K }, dock)
mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, dock)
local dockBtn = {}
local function dockButton(i, icon, text, cb)
  local b = mk("TextButton", { Size = UDim2.new(0, 84, 0, 72), BackgroundColor3 = PANEL, BackgroundTransparency = 0.05, Text = "", LayoutOrder = i, ZIndex = 11 }, dock); corner(b, 14); stroke(b, GOLD, 2)
  mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 40), Position = UDim2.new(0, 0, 0, 4), Text = icon, TextSize = 30, Font = Enum.Font.GothamBold, TextColor3 = Color3.new(1, 1, 1), ZIndex = 12 }, b)
  mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 22), Position = UDim2.new(0, 0, 1, -26), Text = text, TextSize = 14, Font = Enum.Font.GothamBold, TextColor3 = Color3.new(1, 1, 1), ZIndex = 12 }, b)
  b.MouseButton1Click:Connect(cb); dockBtn[text] = b; return b
end

-- 알림 (상단 자원 아래 가운데)
local function toast(text, color)
  local t = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, INSET + 10), Size = UDim2.new(0, 520, 0, 40), BackgroundColor3 = DARK, BackgroundTransparency = 0.1, TextColor3 = color or Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = 15, TextWrapped = true, Text = text, ZIndex = 31 }, toastLayer)
  corner(t, 10); stroke(t, GOLD, 1.5); mk("UIScale", { Scale = K }, t)
  task.delay(2.4, function() local tw = TweenService:Create(t, TweenInfo.new(0.4), { TextTransparency = 1, BackgroundTransparency = 1 }); tw:Play(); tw.Completed:Wait(); t:Destroy() end)
end

local summary
local function setSummary(s)
  if not s then return end
  summary = s
  pillLbl.lv.Text = "Lv " .. tostring(s.level); pillLbl.gold.Text = n(s.gold); pillLbl.ore.Text = n(s.ore); pillLbl.hone.Text = n(s.hone); pillLbl.orb.Text = n(s.orbC)
  statLbl.Text = string.format("체력 %s · 공격 %s · 주문 %s · 방어 %s · 치명 %.0f%%\n스테이지 %d/5 · 균열 %d/100 · 탑 %d/100", n(s.maxHp), n(s.atk), n(s.mag), n(s.def), s.crit * 100, s.cleared, s.riftBest, s.best)
end

-- ── 가운데 창 (건물 · 장비 · 문지기 등): 제목 + 탭 + 내용 목록 + 메시지 ──
local root = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, INSET / 2), Size = UDim2.new(0, 880, 0, 540), BackgroundColor3 = Color3.fromRGB(24, 20, 44), ZIndex = 21 }, panelLayer)
corner(root, 14); stroke(root, GOLD, 2.5)
local panelScale = mk("UIScale", { Scale = 1 }, root)
local panelTitle = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 18, 0, 10), Size = UDim2.new(1, -90, 0, 34), Font = Enum.Font.GothamBlack, TextSize = 24, TextColor3 = Color3.fromRGB(255, 220, 120), TextXAlignment = Enum.TextXAlignment.Left, Text = "", ZIndex = 22 }, root)
local tabRow = mk("Frame", { BackgroundTransparency = 1, Position = UDim2.new(0, 16, 0, 50), Size = UDim2.new(1, -32, 0, 34), ZIndex = 22 }, root)
mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, tabRow)
local list = mk("ScrollingFrame", { Position = UDim2.new(0, 16, 0, 92), Size = UDim2.new(1, -32, 1, -136), BackgroundColor3 = Color3.fromRGB(16, 14, 32), BorderSizePixel = 0, CanvasSize = UDim2.new(0, 0, 0, 0), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 8, ZIndex = 22 }, root)
corner(list, 8); mk("UIListLayout", { Padding = UDim.new(0, 6) }, list); mk("UIPadding", { PaddingTop = UDim.new(0, 6), PaddingLeft = UDim.new(0, 6) }, list)
local msg = label(root, "", 14, UDim2.new(0, 18, 1, -40), UDim2.new(1, -36, 0, 34)); msg.ZIndex = 22; msg.TextColor3 = Color3.fromRGB(255, 230, 150)
local function clear() msg.Text = ""; for _, c in ipairs(list:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end end
local function card(title, lines, btns)
  local f = Instance.new("Frame"); f.BackgroundColor3 = Color3.fromRGB(40, 34, 70); f.AutomaticSize = Enum.AutomaticSize.Y; f.Size = UDim2.new(1, -16, 0, 0); f.Parent = list
  Instance.new("UICorner", f).CornerRadius = UDim.new(0, 6)
  local t = label(f, title .. (#lines > 0 and ("\n" .. table.concat(lines, "\n")) or ""), 13, UDim2.new(0, 8, 0, 4), UDim2.new(1, -150, 0, 0)); t.AutomaticSize = Enum.AutomaticSize.Y
  for i, b in ipairs(btns or {}) do button(f, b[1], UDim2.new(1, -136 + (i - 1) * 66, 0, 6), UDim2.new(0, 62, 0, 28), b[2]) end
  Instance.new("UIPadding", f).PaddingBottom = UDim.new(0, 6)
end
-- 문자열 입력 팝업
local function prompt(title, placeholder, cb)
  local ov = Instance.new("Frame"); ov.Size = UDim2.new(1, 0, 1, 0); ov.BackgroundColor3 = Color3.new(0, 0, 0); ov.BackgroundTransparency = 0.45; ov.ZIndex = 40; ov.Parent = root
  local box = Instance.new("Frame"); box.Size = UDim2.new(0, 340, 0, 130); box.Position = UDim2.new(0.5, -170, 0.5, -65); box.BackgroundColor3 = Color3.fromRGB(40, 34, 70); box.ZIndex = 41; box.Parent = ov
  Instance.new("UICorner", box).CornerRadius = UDim.new(0, 8)
  local t = label(box, title, 14, UDim2.new(0, 10, 0, 8), UDim2.new(1, -20, 0, 24)); t.ZIndex = 42
  local tb = Instance.new("TextBox"); tb.PlaceholderText = placeholder; tb.Text = ""; tb.Size = UDim2.new(1, -20, 0, 32); tb.Position = UDim2.new(0, 10, 0, 40); tb.ClearTextOnFocus = false
  tb.Font = Enum.Font.Gotham; tb.TextSize = 14; tb.TextColor3 = Color3.new(1, 1, 1); tb.BackgroundColor3 = Color3.fromRGB(16, 14, 32); tb.ZIndex = 42; tb.Parent = box
  local ok = button(box, "확인", UDim2.new(0, 10, 0, 86), UDim2.new(0, 150, 0, 30), function() local v = tb.Text; ov:Destroy(); cb(v) end); ok.ZIndex = 42
  local no = button(box, "취소", UDim2.new(1, -160, 0, 86), UDim2.new(0, 150, 0, 30), function() ov:Destroy() end, Color3.fromRGB(90, 40, 60)); no.ZIndex = 42
end

local views = {}
local showResult   -- 아래에서 정의 (문지기 화면이 사용)

-- ── 메뉴 내용 (기존 화면 그대로) ──
function views.inv()
  clear(); local r = rpc:InvokeServer("inv")
  for _, it in ipairs(r.inv) do
    card((it.sat and "✦ " or "") .. it.title, it.lines, {
      { "장착", function() local e = rpc:InvokeServer("equip", it.uid); setSummary(e.summary); views.inv() end },
      { "판매", function() local e = rpc:InvokeServer("sell", it.uid); setSummary(e.summary); views.inv() end },
      { "분해", function() local e = rpc:InvokeServer("dismantle", it.uid); setSummary(e.summary); views.inv() end },
    })
  end
end
function views.skills()
  clear(); local r = rpc:InvokeServer("skills"); setSummary(r.summary)
  for _, k in ipairs(r.rows) do
    local tag = k.passive and " [패시브 장착]" or (k.slot > 0 and (" [" .. k.slot .. "번 칸]") or "")
    local btns = {}
    if k.honeCost then btns[#btns + 1] = { "레벨업\n" .. k.honeCost, function() local e = rpc:InvokeServer("levelup", k.uid); if e.err then msg.Text = e.err end; views.skills() end } end
    btns[#btns + 1] = { "장착", function() local slot = 1; for i = 1, r.slots do slot = i; local used = false; for _, o in ipairs(r.rows) do if o.slot == i then used = true end end; if not used then break end end; rpc:InvokeServer("equipskill", { slot = slot, uid = k.uid }); views.skills() end }
    card(string.format("%s Lv%d%s", k.name, k.lvl, tag), { k.desc or "" }, btns)
  end
end
function views.shop()
  clear(); local r = rpc:InvokeServer("shop"); setSummary(r.summary)
  for _, row in ipairs(r.rows) do card(string.format("%s — %d G", row.name, row.price), { row.desc or "" }, { { "구매", function() local e = rpc:InvokeServer("buy", row.id); msg.Text = e.ok and (row.name .. " 구매") or tostring(e.err); setSummary(e.summary); views.shop() end } }) end
end
function views.pass()
  clear(); local r = rpc:InvokeServer("passives"); setSummary(r.summary)
  card(string.format("패시브 포인트 %d / %d (찍은 노드 %d개)", r.info.left, r.info.points, r.info.taken), { "레벨 1당 2포인트. 직접 트리를 고르는 화면은 아직 없어서 '자동' 으로 효율 좋은 노드부터 찍습니다." }, {
    { "자동", function() local e = rpc:InvokeServer("autopass"); msg.Text = "패시브 " .. e.added .. "개 배분"; setSummary(e.summary); views.pass() end },
    { "초기화", function() local e = rpc:InvokeServer("resetpass"); setSummary(e.summary); views.pass() end },
  })
end
function views.forge()
  clear(); local r = rpc:InvokeServer("forge"); setSummary(r.summary)
  for _, row in ipairs(r.rows) do
    local f = Instance.new("Frame"); f.BackgroundColor3 = Color3.fromRGB(40, 34, 70); f.AutomaticSize = Enum.AutomaticSize.Y; f.Size = UDim2.new(1, -8, 0, 0); f.Parent = list
    Instance.new("UICorner", f).CornerRadius = UDim.new(0, 6)
    local lay = Instance.new("UIListLayout", f); lay.Padding = UDim.new(0, 3); Instance.new("UIPadding", f).PaddingBottom = UDim.new(0, 6)
    local t = label(f, string.format("%s  (강화 +%d)", row.title, row.enh), 14, UDim2.new(0, 8, 0, 0), UDim2.new(1, -16, 0, 20)); t.AutomaticSize = Enum.AutomaticSize.Y
    for i, a in ipairs(row.affixes) do
      local line = Instance.new("Frame"); line.BackgroundTransparency = 1; line.Size = UDim2.new(1, 0, 0, 24); line.Parent = f
      label(line, a.text, 12, UDim2.new(0, 10, 0, 0), UDim2.new(1, -120, 1, 0))
      button(line, a.locked and "잠김" or string.format("굴림 %dG/%d", row.rerollGold, row.rerollOre), UDim2.new(1, -112, 0, 0), UDim2.new(0, 104, 1, 0), function()
        local e = rpc:InvokeServer("reroll", { uid = row.uid, idx = i - 1 }); msg.Text = e.ok and "옵션을 다시 굴렸습니다" or tostring(e.err); setSummary(e.summary); views.forge()
      end, a.locked and Color3.fromRGB(60, 60, 60) or nil)
    end
    for i, sk in ipairs(row.sockets) do label(f, "◆ 소켓 " .. i .. ": " .. (sk or "비어 있음"), 12, UDim2.new(0, 10, 0, 0), UDim2.new(1, -16, 0, 18)) end
    local br = Instance.new("Frame"); br.BackgroundTransparency = 1; br.Size = UDim2.new(1, 0, 0, 30); br.Parent = f
    button(br, string.format("강화 %dG/%d", row.enhGold, row.enhOre), UDim2.new(0, 8, 0, 0), UDim2.new(0, 120, 1, 0), function() local e = rpc:InvokeServer("enhance", row.uid); msg.Text = tostring(e.msg or e.err); setSummary(e.summary); views.forge() end)
    button(br, "혼돈 구슬(옵션+)", UDim2.new(0, 134, 0, 0), UDim2.new(0, 130, 1, 0), function() local e = rpc:InvokeServer("chaos", row.uid); msg.Text = e.ok and "옵션이 하나 추가되었습니다" or tostring(e.err); setSummary(e.summary); views.forge() end)
    button(br, "신성한 구슬", UDim2.new(0, 270, 0, 0), UDim2.new(0, 110, 1, 0), function() local e = rpc:InvokeServer("divine", row.uid); msg.Text = e.ok and "수치를 다시 굴렸습니다" or tostring(e.err); setSummary(e.summary); views.forge() end)
  end
end
function views.stones()
  clear(); local r = rpc:InvokeServer("stones"); setSummary(r.summary)
  card("돌 보관함", { "확인하면 옵션이 정해지고, 장비 소켓에 끼울 수 있습니다. 장비 소켓은 [대장간] 탭에서 확인하세요." }, {})
  for _, st in ipairs(r.rows) do
    if not st.rev then card("미확인의 돌" .. (st.hi == 1 and " (계시)" or ""), {}, { { "확인", function() local e = rpc:InvokeServer("reveal", st.uid); msg.Text = e.ok and ("확인: " .. tostring(e.label)) or tostring(e.err); setSummary(e.summary); views.stones() end } })
    else
      local btns = {}
      for _, it in ipairs(r.items) do for si, sk in ipairs(it.sockets) do if not sk then btns[#btns + 1] = { string.sub(it.slot, 1, 4) .. si, function() local e = rpc:InvokeServer("socket", { item = it.uid, stone = st.uid, idx = si }); msg.Text = e.ok and "소켓에 끼웠습니다" or tostring(e.err); setSummary(e.summary); views.stones() end } end end end
      card(st.label or "확인된 돌", { #btns > 0 and "끼울 소켓을 고르세요 →" or "빈 소켓이 없습니다" }, { btns[1], btns[2] })
    end
  end
end
function views.class()
  clear(); local r = rpc:InvokeServer("class"); setSummary(r.summary); local v = r.view
  card(string.format("전직 %d차 · 포인트 %d / %d · 전직의 서 %d/%d/%d", v.cls, v.left, v.points, v.books[1], v.books[2], v.books[3]), { "노드를 눌러 찍고, 다시 누르면 해제합니다 (후속 노드가 있으면 불가)." }, {
    { "전직", function() local e = rpc:InvokeServer("classadvance"); msg.Text = tostring(e.msg or ""); views.class() end },
    { "초기화", function() rpc:InvokeServer("classreset"); views.class() end } })
  for _, T in ipairs(v.trees) do
    local lines = {}
    for _, n in ipairs(T.nodes) do lines[#lines + 1] = string.format("%s %s (%d점)%s", n.has and "●" or (n.can and "○" or "·"), n.name, n.cost, n.desc and (" — " .. n.desc) or "") end
    local btns = {}
    for _, n in ipairs(T.nodes) do if n.can or n.has then btns[#btns + 1] = { (n.has and "해제 " or "찍기 ") .. string.sub(n.name, 1, 4), function() rpc:InvokeServer(n.has and "classdrop" or "classtake", n.id); views.class() end } end end
    card(T.name, lines, { btns[1], btns[2] })
    if #btns > 2 then card(T.name .. " (이어서)", {}, { btns[3], btns[4] }) end
  end
end
function views.charm()
  clear(); local r = rpc:InvokeServer("charms"); setSummary(r.summary); local v = r.view
  if not v.unlocked then card("참", { "3차 전직 후에 장착할 수 있습니다." }, {}); return end
  for i = 1, 4 do local c = v.equipped[i]; if c then card("장착 " .. i, c.lines, { { "해제", function() rpc:InvokeServer("charmoff", i); views.charm() end } }) else card("빈 칸 " .. i, {}, {}) end end
  for _, c in ipairs(v.inv) do card("보관", c.lines, { { "장착", function() local e = rpc:InvokeServer("charmequip", { uid = c.uid }); msg.Text = e.err or ""; views.charm() end }, { "버리기", function() rpc:InvokeServer("charmdrop", c.uid); views.charm() end } }) end
end
function views.warden()
  clear(); local u = rpc:InvokeServer("unlocks").u
  if not u.warden then card("새 문지기", { "솟아난 탑 100층을 클리어하면 열립니다." }, {}); return end
  local st = rpc:InvokeServer("wstate").st
  if not st then
    card("새 문지기 — 공명 구슬", { "구슬이 터지기 전에 직접 눌러 없애야 합니다 (스킬은 통하지 않음).", "터진 구슬은 큰 피해를 주고 문지기를 회복시킵니다." }, { { "도전", function() local e = rpc:InvokeServer("wstart"); msg.Text = e.err or "시작!"; views.warden() end } })
    return
  end
  local info = card
  local box = Instance.new("Frame"); box.BackgroundColor3 = Color3.fromRGB(40, 34, 70); box.AutomaticSize = Enum.AutomaticSize.Y; box.Size = UDim2.new(1, -8, 0, 0); box.Parent = list
  local lbl = label(box, "", 14, UDim2.new(0, 8, 0, 4), UDim2.new(1, -16, 0, 40)); lbl.AutomaticSize = Enum.AutomaticSize.Y
  local grid = Instance.new("Frame"); grid.BackgroundTransparency = 1; grid.Size = UDim2.new(1, -16, 0, 150); grid.Position = UDim2.new(0, 8, 0, 56); grid.Parent = box
  local running = true
  task.spawn(function()
    while running and box.Parent do
      local s2 = rpc:InvokeServer("wstate").st
      if not s2 then break end
      lbl.Text = string.format("%.0f초 · 내 체력 %.0f%% · 문지기 %.1f%% · 구슬 처치 %d / 폭발 %d", s2.time, s2.hp * 100, s2.bossHp * 100, s2.pop, s2.boom)
      for _, c in ipairs(grid:GetChildren()) do c:Destroy() end
      for i, o in ipairs(s2.orbs) do
        local b = button(grid, string.format("구슬 %.1f초", o.fuse), UDim2.new(0, ((i - 1) % 4) * 118, 0, math.floor((i - 1) / 4) * 40), UDim2.new(0, 112, 0, 34), function() rpc:InvokeServer("wpop", o.id) end, Color3.fromRGB(190, 70, 60))
      end
      if s2.over then
        local f = rpc:InvokeServer("wfinish"); if f.result then showResult(f) end
        running = false; task.wait(0.3); views.warden(); return
      end
      task.wait(0.25)
    end
  end)
end
function views.daily()
  clear(); local o = rpc:InvokeServer("offline"); if o.summary then setSummary(o.summary) end
  if o.r then card("오프라인 보상", { string.format("%d분 동안 자리를 비웠습니다: 골드 %d · 강화석 %d", o.r.mins, o.r.gold, o.r.ore) }, {}) end
  local r = rpc:InvokeServer("daily")
  for _, t in ipairs(r.rows) do
    local ready = t.p >= t.n and not t.claimed
    card(string.format("%s (%d/%d)", t.name, t.p, t.n), { "보상: " .. t.text }, { { t.claimed and "수령 완료" or (ready and "받기" or "진행 중"), function() if ready then local e = rpc:InvokeServer("dailyclaim", t.id); if e.summary then setSummary(e.summary) end; views.daily() end end } })
  end
  card("장비 일괄 정리", { "일반~마법 장비 중 강화·사탄이 아닌 것만 처리합니다." }, {
    { "일반 분해", function() local e = rpc:InvokeServer("bulk", { r = 0, mode = "dismantle" }); setSummary(e.summary); msg.Text = e.res.n .. "개 분해"; views.daily() end },
    { "마법까지 분해", function() local e = rpc:InvokeServer("bulk", { r = 2, mode = "dismantle" }); setSummary(e.summary); msg.Text = e.res.n .. "개 분해"; views.daily() end },
    { "마법까지 판매", function() local e = rpc:InvokeServer("bulk", { r = 2, mode = "sell" }); setSummary(e.summary); msg.Text = e.res.n .. "개 판매"; views.daily() end } })
end
function views.quests()
  clear(); local r = rpc:InvokeServer("quests")
  for _, q in ipairs(r.rows) do
    local ready = q.state == "done"
    card(string.format("%s (%d/%d)", q.title, q.p, q.n), { q.desc }, { { q.state == "claimed" and "완료" or (ready and "보상 받기" or "진행 중"), function() if ready then local e = rpc:InvokeServer("questclaim", q.id); if e.summary then setSummary(e.summary) end; views.quests() end end } })
  end
end
function views.runes()
  clear(); local r = rpc:InvokeServer("runes")
  card("보유 룬 " .. #r.runes, { "스킬 카드의 '룬' 버튼으로 끼울 스킬을 고릅니다 (아래 스킬을 먼저 선택)." }, {})
  for _, k in ipairs(r.skills) do
    local btns = {}
    if k.rune then btns[#btns + 1] = { "룬 해제", function() rpc:InvokeServer("runeremove", k.uid); views.runes() end } end
    for _, ru in ipairs(r.runes) do if #btns < 3 then btns[#btns + 1] = { string.sub(ru.name, 1, 9), function() local e = rpc:InvokeServer("runeequip", { skill = k.uid, rune = ru.uid }); msg.Text = e.err or ""; views.runes() end } end end
    card(tostring(k.name or k.id) .. (k.rune and (" [" .. k.rune .. "]") or ""), {}, btns)
  end
end
function views.guild()
  clear(); local r = rpc:InvokeServer("g_view"); if r.summary then setSummary(r.summary) end
  local v = r.view
  if v.none then
    card("길드에 가입하지 않았습니다", { "창설 비용 " .. v.createCost .. "G · 이름은 2~12자" }, { { "창설", function() prompt("길드 이름 (2~12자)", "이름", function(nm) local e = rpc:InvokeServer("g_create", nm); msg.Text = e.err or "창설!"; views.guild() end) end } })
    for _, g in ipairs(v.list) do card(string.format("%s (Lv%d · %d명)", g.name, g.lv, g.members), { "길드장 " .. g.leader }, { { "가입", function() local e = rpc:InvokeServer("g_join", g.id); msg.Text = e.err or "가입!"; views.guild() end } }) end
    return
  end
  card(string.format("%s · Lv%d · %d명 · 코인 %d", v.name, v.lv, v.count, v.coins), { "공지: " .. (v.motd ~= "" and v.motd or "(없음)") }, {
    { "10만 기부", function() local e = rpc:InvokeServer("g_donate", 100000); msg.Text = e.err or "기부 완료"; if e.summary then setSummary(e.summary) end; views.guild() end },
    { "공지", function() prompt("길드 공지", "공지 내용", function(tx) local e = rpc:InvokeServer("g_motd", tx); msg.Text = e.err or ""; views.guild() end) end },
    { "탈퇴", function() rpc:InvokeServer("g_leave"); views.guild() end } })
  local gl = {}; for _, g in ipairs(v.goals) do gl[#gl + 1] = string.format("%s %d / %d%s", g.id == "kill" and "처치" or (g.id == "boss" and "보스" or "클리어"), g.prog, g.goal, g.done and " ✔" or "") end
  card("주간 길드 목표", gl, { { "보상 받기", function() local e = rpc:InvokeServer("g_claim"); msg.Text = e.err or e.msg or ""; if e.summary then setSummary(e.summary) end; views.guild() end } })
  local rk = {}; for i, x in ipairs(v.bossRank) do if i <= 5 then rk[#rk + 1] = string.format("%d위 %s  %s", i, x.name, tostring(math.floor(x.damage))) end end
  card(string.format("길드 보스 (남은 도전 %d · 합계 %s)", v.bossTries, tostring(math.floor(v.bossTotal))), rk, {
    { "도전", function() local e = rpc:InvokeServer("g_boss"); msg.Text = e.err or ("피해 " .. math.floor(e.dmg or 0)); views.guild() end },
    { "지난주 보상", function() local e = rpc:InvokeServer("g_bossclaim"); msg.Text = e.err or e.msg or ""; if e.summary then setSummary(e.summary) end end } })
  for _, it in ipairs(v.shop) do card(it.name .. " — 코인 " .. it.cost .. " (주 " .. it.weekly .. "회)", {}, { { "구매", function() local e = rpc:InvokeServer("g_buy", it.id); msg.Text = e.err or "구매"; if e.summary then setSummary(e.summary) end; views.guild() end } }) end
end
function views.help()
  clear()
  card("시작 안내", {
    "1) 도전 탭 → 스테이지 1~5를 차례로 클리어하세요 (3·5 클리어 시 스킬 칸이 열립니다).",
    "2) 상점에서 스킬을 사고, 장비 탭에서 더 좋은 장비를 장착하세요. 안 쓰는 장비는 판매/분해.",
    "3) 대장간에서 강화·옵션 재굴림, 패시브 탭에서 포인트를 찍습니다 (자동 배분 있음).",
    "4) 스테이지 5를 깨면 '균열'이 열립니다. 100층을 깨면 졸업 → 탑 · 콘텐츠 · 전직 · 참 · 문지기.",
    "5) 일일 탭에서 매일 보상과 오프라인 보상을 받고, 길드에 가입해 주간 목표·보스에 참여하세요." }, {})
  card("베타 안내", { "베타 테스트 중입니다. 진행 데이터는 저장되지만 밸런스·보상은 바뀔 수 있습니다.", "버그나 이상한 점은 게임 설명란/디스코드로 알려 주세요." }, {})
end

-- ── 전투 무대 (전체 화면, 여백 없음) ──
local mainStage
local function makeStage() if mainStage then mainStage:destroy() end; local v = vp(); mainStage = Stage.create(stageHolder, v.X, v.Y, 1) end

-- 그림으로 화면 채우기 (비율 유지, 넘치는 쪽을 자름. 위아래는 아래 기준)
local function cover(parent, art, W, H, z)
  local sw, sh = art.w, art.h
  if art.w / art.h > W / H then sw = art.h * W / H else sh = art.w * H / W end
  return mk("ImageLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ImageContent = art.content, ImageRectOffset = Vector2.new((art.w - sw) / 2, art.h - sh), ImageRectSize = Vector2.new(sw, sh), ZIndex = z or 1 }, parent)
end

-- ── 화면 전환 ──
local screen = "town"
local buildTown, buildMap
local infoCard
local function fitPanel() local v = vp(); panelScale.Scale = math.clamp(math.min((v.X - 24) / 880, (v.Y - INSET - 16) / 540), 0.45, 1.3) end
local function closePanel() panelLayer.Visible = false; clear() end
local function setScreen(name)
  screen = name
  townLayer.Visible = name == "town"; mapLayer.Visible = name == "map"; stageHolder.Visible = name == "battle"
  dock.Visible = name ~= "battle"; statLbl.Visible = name ~= "battle"; infoCard.Visible = false; resultLayer.Visible = false
  for t, b in pairs(dockBtn) do b.BackgroundColor3 = ((t == "마을" and name == "town") or (t == "지도" and name == "map")) and Color3.fromRGB(110, 80, 30) or PANEL end
  if name == "town" then buildTown() elseif name == "map" then buildMap() end
end
root.Active = true   -- 창 안을 눌러도 바깥(닫기)으로 새지 않게
panelLayer.MouseButton1Click:Connect(closePanel)
do local b = button(root, "✕", UDim2.new(1, -56, 0, 10), UDim2.new(0, 42, 0, 36), closePanel, Color3.fromRGB(130, 44, 64)); b.ZIndex = 23; b.TextSize = 20 end
local function openPanel(title, tabs, first)
  fitPanel(); panelTitle.Text = title; panelLayer.Visible = true
  for _, c in ipairs(tabRow:GetChildren()) do if c:IsA("GuiButton") then c:Destroy() end end
  local btns = {}
  local function sel(key)
    for k, b in pairs(btns) do b.BackgroundColor3 = k == key and Color3.fromRGB(160, 116, 40) or Color3.fromRGB(60, 52, 100) end
    clear(); views[key]()
  end
  if #tabs > 1 then for i, t in ipairs(tabs) do local b = button(tabRow, t[1], UDim2.new(), UDim2.new(0, 110, 1, 0), function() sel(t[2]) end); b.LayoutOrder = i; b.ZIndex = 23; b.TextSize = 15; btns[t[2]] = b end end
  sel(first or tabs[1][2])
end

-- ── 전투 시작 → 재생 → 결과 ──
local resBox = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.55, 0), Size = UDim2.new(0, 520, 0, 300), BackgroundColor3 = Color3.fromRGB(24, 20, 44), ZIndex = 26 }, resultLayer)
corner(resBox, 16); stroke(resBox, GOLD, 3); local resScale = mk("UIScale", { Scale = K }, resBox)
local resTitle = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 0, 0, 16), Size = UDim2.new(1, 0, 0, 48), Font = Enum.Font.GothamBlack, TextSize = 40, Text = "", ZIndex = 27 }, resBox)
mk("UIStroke", { Thickness = 3, Color = Color3.fromRGB(30, 10, 40) }, resTitle)
local resText = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 24, 0, 74), Size = UDim2.new(1, -48, 0, 140), Font = Enum.Font.GothamMedium, TextSize = 16, TextWrapped = true, TextYAlignment = Enum.TextYAlignment.Top, TextColor3 = Color3.fromRGB(235, 230, 250), Text = "", ZIndex = 27 }, resBox)
local resBtns = mk("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -18), Size = UDim2.new(1, -32, 0, 46), ZIndex = 27 }, resBox)
mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Center, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, resBtns)
local function resultLines(x)
  local L = { string.format("%.0f초 · 처치 %d · 골드 +%s", x.time or 0, x.kills or 0, n(x.gold)) }
  local ex = {}
  if x.first then ex[#ex + 1] = "최초 클리어!" end
  if x.levelUps then ex[#ex + 1] = "레벨 +" .. x.levelUps end
  if x.items and #x.items > 0 then ex[#ex + 1] = "장비 " .. #x.items .. "개" end
  if type(x.ore) == "number" and x.ore > 0 then ex[#ex + 1] = "강화석 +" .. x.ore end
  if x.skills and #x.skills > 0 then ex[#ex + 1] = "스킬 " .. #x.skills .. "개" end
  if x.charms and #x.charms > 0 then ex[#ex + 1] = "참 " .. #x.charms .. "개" end
  if x.stones and x.stones > 0 then ex[#ex + 1] = "돌 " .. x.stones end
  if x.stonesHi then ex[#ex + 1] = "계시의 돌 1" end
  if x.sockTix then ex[#ex + 1] = "세공의 인장 1" end
  if #ex > 0 then L[#L + 1] = table.concat(ex, " · ") end
  if x.note then L[#L + 1] = x.note end
  if x.notes and x.notes[1] then L[#L + 1] = x.notes[1] end
  return table.concat(L, "\n")
end
local launch
local function showResultPanel(x, spec)
  resultLayer.Visible = true
  resTitle.Text = x.win and "승리!" or "패배"; resTitle.TextColor3 = x.win and Color3.fromRGB(255, 214, 90) or Color3.fromRGB(255, 120, 120)
  resText.Text = (spec.title and (spec.title .. "\n") or "") .. resultLines(x)
  for _, c in ipairs(resBtns:GetChildren()) do if c:IsA("GuiButton") then c:Destroy() end end
  local function rb(i, t, cb, col) local b = button(resBtns, t, UDim2.new(), UDim2.new(0, 108, 1, 0), cb, col); b.LayoutOrder = i; b.ZIndex = 28; b.TextSize = 16 end
  local nxt = spec.nextSpec and spec.nextSpec()
  if nxt then rb(1, "다음 ▶", function() launch(nxt) end, Color3.fromRGB(170, 70, 60)) end
  if not spec.noRetry then rb(2, "다시 도전", function() launch(spec) end) end
  rb(3, "지도", function() setScreen("map") end); rb(4, "마을", function() setScreen("town") end)
end
local busy = false
launch = function(spec)
  if busy then return end
  busy = true; local ok, r = pcall(spec.call); busy = false
  if not ok then toast("요청 실패: " .. tostring(r), Color3.fromRGB(255, 150, 150)); return end
  if r.err then toast(r.err, Color3.fromRGB(255, 160, 160)); return end
  closePanel(); setScreen("battle")
  local x = r.result
  local function done() setSummary(r.summary); showResultPanel(x, spec) end
  if x.replay and x.replay.snaps and #x.replay.snaps > 0 then mainStage:play(x.replay, done, 40) else done() end
end
showResult = function(r) launch({ call = function() return r end, noRetry = true }) end

-- 전투 종류
local stageSpec, riftSpec, towerSpec
stageSpec = function(k) return { title = k == 5 and "스테이지 5 — 들판의 군주 그룸" or ("스테이지 " .. k), call = function() return rpc:InvokeServer("fight", { kind = "stage", n = k }) end,
  nextSpec = function() if k < 5 and summary.cleared >= k then return stageSpec(k + 1) elseif k == 5 and summary.cleared >= 5 then return riftSpec(math.min(100, summary.riftBest + 1)) end end } end
riftSpec = function(f) return { title = "심연의 균열 " .. f .. "층", call = function() return rpc:InvokeServer("fight", { kind = "rift", n = f }) end,
  nextSpec = function() if f < 100 and summary.riftBest >= f then return riftSpec(f + 1) end end } end
towerSpec = function(f) return { title = "솟아난 탑 " .. f .. "층", call = function() return rpc:InvokeServer("battle", f) end,
  nextSpec = function() if f < 100 and summary.best >= f then return towerSpec(f + 1) end end } end
local function playSpec(title, arg) return { title = title, call = function() return rpc:InvokeServer("play", arg) end } end

-- ── 마을 (웹 초원 마을: 건물을 눌러 기능을 연다. 비슷한 기능은 한 건물에 탭으로 묶었다) ──
local BUILD = {
  { key = "b_skill_hall", name = "스킬 정비소", icon = "📘", x = 0.09, row = 1, tabs = { { "스킬", "skills" }, { "룬", "runes" } } },
  { key = "b_forge", name = "제련소", icon = "🔨", x = 0.24, row = 1, tabs = { { "대장간", "forge" }, { "돌", "stones" } } },
  { key = "b_shop", name = "장비 상점", icon = "🛡", x = 0.39, row = 1, tabs = { { "장비", "inv" } } },
  { key = "b_quest_board", name = "퀘스트 게시판", icon = "📜", x = 0.54, row = 1, badge = "quest", tabs = { { "퀘스트", "quests" }, { "일일", "daily" } } },
  { key = "b_skill_shop", name = "스킬 상점", icon = "🔮", x = 0.69, row = 1, tabs = { { "스킬 구매", "shop" } } },
  { key = "b_guild", name = "길드", icon = "🏰", x = 0.2, row = 2, tabs = { { "길드", "guild" } } },
  { key = "b_trainer", name = "훈련소", icon = "⚔", x = 0.42, row = 2, badge = "pass", tabs = { { "패시브", "pass" }, { "전직", "class" }, { "참", "charm" } } },
  { key = "b_notice", name = "안내소", icon = "🔔", x = 0.64, row = 2, tabs = { { "도움말", "help" } } },
}
local townBuilt, badgeDots = false, {}
local function updateBadges()
  task.spawn(function()
    local ok1, q = pcall(function() return rpc:InvokeServer("quests") end); local ok2, d = pcall(function() return rpc:InvokeServer("daily") end); local ok3, p = pcall(function() return rpc:InvokeServer("passives") end)
    local quest = false
    if ok1 and q.rows then for _, x in ipairs(q.rows) do if x.state == "done" then quest = true end end end
    if ok2 and d.rows then for _, t in ipairs(d.rows) do if t.p >= t.n and not t.claimed then quest = true end end end
    if badgeDots.quest then badgeDots.quest.Visible = quest end
    if badgeDots.pass then badgeDots.pass.Visible = ok3 and p.info and p.info.left > 0 or false end
  end)
end
buildTown = function()
  if not townBuilt then
    townBuilt = true; townLayer:ClearAllChildren(); badgeDots = {}
    local v = vp(); local W, H = v.X, v.Y
    local bg = Sprites.art("bg_town")
    if bg then cover(townLayer, bg, W, H, 1) else mk("UIGradient", { Color = ColorSequence.new(Color3.fromRGB(120, 180, 230), Color3.fromRGB(90, 150, 80)), Rotation = 90 }, townLayer) end
    for _, b in ipairs(BUILD) do
      local size = (b.row == 1 and 0.30 or 0.25) * H; local fy = (b.row == 1 and 0.95 or 0.67) * H
      local holder = mk("TextButton", { BackgroundTransparency = 1, Text = "", AutoButtonColor = false, AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0, b.x * W, 0, fy), Size = UDim2.new(0, size, 0, size), ZIndex = b.row == 1 and 4 or 3 }, townLayer)
      local a = Sprites.art(b.key)
      if a then mk("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), ScaleType = Enum.ScaleType.Fit, ImageContent = a.content, ZIndex = holder.ZIndex }, holder)
      else local f = mk("Frame", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, 0), Size = UDim2.new(0.8, 0, 0.8, 0), BackgroundColor3 = Color3.fromRGB(150, 110, 80), ZIndex = holder.ZIndex }, holder); corner(f, 12); stroke(f, Color3.fromRGB(60, 30, 50), 3)
        mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), Text = b.icon, TextScaled = true, Font = Enum.Font.GothamBold, ZIndex = holder.ZIndex }, f) end
      local hs = mk("UIScale", { Scale = 1 }, holder)
      holder.MouseEnter:Connect(function() TweenService:Create(hs, TweenInfo.new(0.12), { Scale = 1.06 }):Play() end)
      holder.MouseLeave:Connect(function() TweenService:Create(hs, TweenInfo.new(0.12), { Scale = 1 }):Play() end)
      holder.MouseButton1Click:Connect(function() openPanel(b.name, b.tabs) end)
      local plate = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 1, -4), Size = UDim2.new(0, 132, 0, 28), BackgroundColor3 = DARK, BackgroundTransparency = 0.08, Text = b.icon .. " " .. b.name, TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = 14, ZIndex = 6 }, holder)
      corner(plate); stroke(plate, GOLD, 1.5); mk("UIScale", { Scale = K }, plate)
      if b.badge then badgeDots[b.badge] = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(1, -2, 0, 2), Size = UDim2.new(0, 14, 0, 14), BackgroundColor3 = Color3.fromRGB(255, 70, 70), Visible = false, ZIndex = 7 }, plate); corner(badgeDots[b.badge]); stroke(badgeDots[b.badge], Color3.new(1, 1, 1), 2) end
    end
    local hero = Sprites.artLabel(townLayer, "warrior", 0.24 * H) or Sprites.label(townLayer, "warrior", 0, false, 0.24 * H)
    hero.Position = UDim2.new(0, 0.85 * W, 0, 0.74 * H); hero.ZIndex = 5
    TweenService:Create(hero, TweenInfo.new(1.1, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Position = UDim2.new(0, 0.85 * W, 0, 0.74 * H - 4 * K) }):Play()
  end
  updateBadges()
end

-- ── 월드맵 (웹 data.js buildMap 과 같은 배치: 초원 마을 → 스테이지 1~5 → 심연의 균열 → 갈래 → 솟아난 탑) ──
local MW, MH = 1800, 1100
local NODES, BYID = {}, {}
local function node(t) NODES[#NODES + 1] = t; BYID[t.id] = t; return t end
-- 위치는 월드맵 그림(map/world.jpg)에 맞춤: 왼쪽 아래 마을 → 길을 따라 스테이지 → 가운데 보라 균열 → 오른쪽 위 화산 고원(탑)
node({ id = "T", name = "초원 마을", icon = "🏠", x = 210, y = 575, col = Color3.fromRGB(230, 200, 140) })
local SPOS = { { 380, 610 }, { 520, 700 }, { 640, 600 }, { 790, 690 }, { 930, 590 } }
for s = 1, 5 do
  node({ id = "S" .. s, stage = s, name = s == 5 and "들판의 군주 그룸" or ("초원 " .. s), icon = s == 5 and "☠" or tostring(s), x = SPOS[s][1], y = SPOS[s][2], col = s == 5 and Color3.fromRGB(190, 50, 70) or Color3.fromRGB(70, 140, 255) })
end
node({ id = "R", name = "심연의 균열", icon = "🌀", x = 1160, y = 480, col = Color3.fromRGB(150, 80, 230) })
node({ id = "RE", name = "무한 균열", icon = "∞", x = 1150, y = 650, col = Color3.fromRGB(60, 190, 230) })
node({ id = "RB", name = "보스 관문", icon = "👑", x = 1330, y = 560, col = Color3.fromRGB(200, 120, 255) })
node({ id = "RG", name = "황금 보물고", icon = "💰", x = 1000, y = 420, col = Color3.fromRGB(230, 180, 40) })
node({ id = "RX", name = "심연의 문", icon = "🚪", x = 1080, y = 300, col = Color3.fromRGB(220, 80, 40) })
node({ id = "RTW", name = "솟아난 탑", icon = "🗼", x = 1560, y = 230, col = Color3.fromRGB(200, 60, 60), tower = true })
node({ id = "RTP", name = "돌의 신전", icon = "⛩", x = 1400, y = 120, col = Color3.fromRGB(230, 200, 100), tower = true })
node({ id = "RR", name = "레이드 던전", icon = "⚔", x = 1650, y = 110, col = Color3.fromRGB(230, 70, 60), tower = true })
node({ id = "RWD", name = "새 문지기", icon = "👁", x = 1720, y = 320, col = Color3.fromRGB(255, 90, 120), tower = true })
node({ id = "RCD", name = "참 던전", icon = "✦", x = 1760, y = 190, col = Color3.fromRGB(255, 150, 220), tower = true })
node({ id = "RTW2", name = "새 탑", icon = "🔺", x = 1520, y = 60, col = Color3.fromRGB(255, 50, 80), tower = true })
local EDGES = { { "T", "S1" }, { "S1", "S2" }, { "S2", "S3" }, { "S3", "S4" }, { "S4", "S5" }, { "S5", "R" }, { "R", "RX" }, { "RX", "RTW" }, { "R", "RE" }, { "R", "RB" }, { "R", "RG" }, { "RTP", "RTW" }, { "RR", "RTW" }, { "RTW", "RWD" }, { "RWD", "RTW2" }, { "RR", "RCD" } }
local U = {}   -- 서버 해금 정보
-- 상태: hidden / locked / open / done, 잠김 안내, 진행 표시
local function nodeState(t)
  local s = summary
  if t.stage then return t.stage <= s.cleared and "done" or (t.stage <= s.cleared + 1 and "open" or "locked"), "이전 스테이지를 클리어하세요" end
  if t.id == "T" then return "open" end
  if t.id == "R" then return s.cleared < 5 and "locked" or (s.riftBest >= 100 and "done" or "open"), "스테이지 5(그룸)를 클리어하면 열립니다", s.cleared >= 5 and (s.riftBest .. "/100") or nil end
  local grad = "균열 100층을 클리어하면 열립니다"
  if t.id == "RE" then return U.endless and "open" or "locked", grad end
  if t.id == "RB" then return U.bosses and "open" or "locked", grad end
  if t.id == "RG" then return U.vault and "open" or "locked", grad end
  if t.id == "RX" then return U.raid and (U.craid and "done" or "open") or "locked", grad end
  if t.tower and not U.craid then return "hidden" end   -- 심연의 문을 처음 깨면 탑이 솟아오른다
  if t.id == "RTW" then return s.best >= 100 and "done" or "open", nil, s.best .. "/100" end
  if t.id == "RTP" then return U.temple and "open" or "locked", "심연의 문을 클리어하면 열립니다" end
  if t.id == "RR" then return "open" end
  if t.id == "RWD" then return U.warden and "open" or "hidden" end
  if t.id == "RCD" then return U.charm and "open" or "hidden" end
  if t.id == "RTW2" then return U.tower2 and "open" or "hidden" end
  return "locked"
end
-- 노드 정보 카드 (지도 아래 가운데)
infoCard = mk("Frame", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -14), Size = UDim2.new(0, 560, 0, 168), BackgroundColor3 = Color3.fromRGB(24, 20, 44), Visible = false, ZIndex = 15 }, hud)
corner(infoCard, 14); stroke(infoCard, GOLD, 2.5); local infoScale = mk("UIScale", { Scale = K }, infoCard)
local function showInfo(t)
  infoCard:ClearAllChildren(); corner(infoCard, 14); stroke(infoCard, GOLD, 2.5); infoScale = mk("UIScale", { Scale = K }, infoCard)
  local st, hint, prog = nodeState(t)
  mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 18, 0, 10), Size = UDim2.new(1, -80, 0, 30), Font = Enum.Font.GothamBlack, TextSize = 22, TextColor3 = Color3.fromRGB(255, 220, 120), TextXAlignment = Enum.TextXAlignment.Left, Text = t.icon .. "  " .. t.name .. (prog and ("   " .. prog) or ""), ZIndex = 16 }, infoCard)
  do local b = button(infoCard, "✕", UDim2.new(1, -50, 0, 10), UDim2.new(0, 36, 0, 32), function() infoCard.Visible = false end, Color3.fromRGB(130, 44, 64)); b.ZIndex = 16 end
  local desc = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 18, 0, 44), Size = UDim2.new(1, -36, 0, 48), Font = Enum.Font.GothamMedium, TextSize = 14, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, TextColor3 = Color3.fromRGB(225, 220, 245), Text = "", ZIndex = 16 }, infoCard)
  local row = mk("Frame", { BackgroundTransparency = 1, Position = UDim2.new(0, 16, 1, -58), Size = UDim2.new(1, -32, 0, 44), ZIndex = 16 }, infoCard)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, VerticalAlignment = Enum.VerticalAlignment.Center, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, row)
  local order = 0
  local function rb(text, cb, col, w) order += 1; local b = button(row, text, UDim2.new(), UDim2.new(0, w or 92, 0, 40), cb, col); b.LayoutOrder = order; b.ZIndex = 17; b.TextSize = 15; return b end
  if st == "locked" then desc.Text = "🔒 " .. (hint or "아직 열리지 않았습니다"); infoCard.Visible = true; return end
  -- 층 선택 (균열 · 탑)
  local function floors(maxN, def, specFn, what)
    local num = def
    local lbl
    rb("−", function() num = math.max(1, num - 1); lbl.Text = num .. "층" end, nil, 40)
    lbl = rb(num .. "층", function() end, Color3.fromRGB(40, 34, 70), 80)
    rb("+", function() num = math.min(maxN, num + 1); lbl.Text = num .. "층" end, nil, 40)
    rb("도전!", function() launch(specFn(num)) end, Color3.fromRGB(170, 60, 60), 110)
    desc.Text = what
  end
  local s = summary
  if t.id == "T" then desc.Text = "마을로 돌아가 장비 · 스킬 · 퀘스트를 정비합니다."; rb("마을로", function() setScreen("town") end, Color3.fromRGB(110, 80, 30), 120)
  elseif t.stage then desc.Text = t.stage == 5 and "초원의 보스. 쓰러뜨리면 심연의 균열이 열립니다." or ("초원 " .. t.stage .. "번째 전투. 권장 레벨 " .. t.stage); rb("도전!", function() launch(stageSpec(t.stage)) end, Color3.fromRGB(170, 60, 60), 120)
  elseif t.id == "R" then floors(math.min(100, s.riftBest + 1), math.min(100, s.riftBest + 1), riftSpec, "층을 깰 때마다 레벨이 1 오릅니다. 100층을 깨면 졸업.")
  elseif t.id == "RTW" then floors(math.min(100, s.best + 1), math.min(100, s.best + 1), towerSpec, "솔로 탑. 100층을 깨면 새 문지기가 열립니다.")
  elseif t.id == "RE" then desc.Text = "하루 3번 · 오래 버틸수록 보상"; rb("입장", function() launch(playSpec("무한 균열", { kind = "endless" })) end, Color3.fromRGB(170, 60, 60))
  elseif t.id == "RG" then desc.Text = "골드 위주 보상 (보석 없음)"; rb("입장", function() launch(playSpec("황금 보물고", { kind = "vault" })) end, Color3.fromRGB(170, 60, 60))
  elseif t.id == "RX" then desc.Text = "문지기 모르가스 레이드. 처음 쓰러뜨리면 붉은 탑이 솟아오릅니다."; rb("도전", function() launch(playSpec("심연의 문", { kind = "raid" })) end, Color3.fromRGB(170, 60, 60))
  elseif t.id == "RB" then
    desc.Text = string.format("공허의 군주 모르가스(열쇠 %d) · 속성 보스 징표: 불씨 %d · 철갑 %d · 뇌전 %d · 서리 %d · 맹독 %d", U.keys or 0, U.keys2 or 0, U.keys3 or 0, U.keys4 or 0, U.keys5 or 0, U.keys6 or 0)
    rb("모르가스", function() launch(playSpec("공허의 군주 모르가스", { kind = "void", vsel = 1 })) end, Color3.fromRGB(110, 60, 160), 84)
    for _, bo in ipairs({ { "화염", "hive" }, { "철갑", "titan" }, { "뇌제", "storm" }, { "서리", "frost" }, { "독니", "poison" } }) do rb(bo[1], function() launch(playSpec(bo[1] .. " 보스", { kind = bo[2], vsel = 1 })) end, nil, 62) end
  elseif t.id == "RTP" then desc.Text = "계시의 돌 · 세공의 인장"; rb("1단계", function() launch(playSpec("돌의 신전 1단계", { kind = "temple", vsel = 1 })) end); rb("2단계", function() launch(playSpec("돌의 신전 2단계", { kind = "temple", vsel = 2 })) end)
  elseif t.id == "RR" then desc.Text = "이지 · 노말 · 하드 최초 클리어마다 전직의 서"
    for i, d in ipairs({ "이지", "노말", "하드" }) do rb(d, function() launch(playSpec("레이드 던전 " .. d, { kind = "craid", diff = i })) end) end
  elseif t.id == "RCD" then desc.Text = "하드 레이드 + 3차 전직 · 참 드랍"; rb("입장", function() launch(playSpec("참 던전", { kind = "craid", diff = 3, charm = true })) end, Color3.fromRGB(170, 60, 60))
  elseif t.id == "RWD" then desc.Text = "공명 구슬이 터지기 전에 직접 눌러 없애는 실시간 전투"; rb("입장", function() infoCard.Visible = false; openPanel("새 문지기", { { "문지기", "warden" } }) end, Color3.fromRGB(170, 60, 60))
  elseif t.id == "RTW2" then desc.Text = "20층 탑"; rb("1층", function() launch({ title = "새 탑", call = function() return rpc:InvokeServer("tower2", 1) end }) end); rb("다음 층", function() launch({ title = "새 탑", call = function() return rpc:InvokeServer("tower2", 99) end }) end, Color3.fromRGB(170, 60, 60))
  end
  infoCard.Visible = true
end
buildMap = function()
  local okU, ru = pcall(function() return rpc:InvokeServer("unlocks") end)
  if okU and ru.u then U = ru.u; setSummary(ru.summary) end
  mapLayer:ClearAllChildren()
  local v = vp(); local ms = math.max(v.X / MW, v.Y / MH) * 1.25
  mapLayer.CanvasSize = UDim2.new(0, MW * ms, 0, MH * ms)
  local world = Sprites.art("bg_world")
  if world then mk("ImageLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ImageContent = world.content, ScaleType = Enum.ScaleType.Stretch, ZIndex = 1 }, mapLayer)
  else mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(70, 110, 70), BorderSizePixel = 0, ZIndex = 1 }, mapLayer) end
  local states = {}
  for _, t in ipairs(NODES) do states[t.id] = nodeState(t) end
  for _, e in ipairs(EDGES) do   -- 길
    local a, b = BYID[e[1]], BYID[e[2]]
    if states[a.id] ~= "hidden" and states[b.id] ~= "hidden" then
      local x1, y1, x2, y2 = a.x * ms, a.y * ms, b.x * ms, b.y * ms
      local open = states[a.id] ~= "locked" and states[b.id] ~= "locked"
      mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, (x1 + x2) / 2, 0, (y1 + y2) / 2), Size = UDim2.new(0, math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2), 0, 5 * K), Rotation = math.deg(math.atan2(y2 - y1, x2 - x1)), BackgroundColor3 = open and Color3.fromRGB(255, 240, 200) or Color3.fromRGB(60, 50, 60), BackgroundTransparency = open and 0.15 or 0.4, BorderSizePixel = 0, ZIndex = 2 }, mapLayer)
    end
  end
  -- 다음 목표: 아직 깨지 않은 가장 앞 스테이지, 없으면 균열
  local target
  for s = 1, 5 do if states["S" .. s] == "open" then target = BYID["S" .. s]; break end end
  if not target and states.R == "open" then target = BYID.R end
  for _, t in ipairs(NODES) do
    local st = states[t.id]
    if st ~= "hidden" then
      local sz = (t.id == "T" and 64 or 52) * K
      local b = mk("TextButton", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, t.x * ms, 0, t.y * ms), Size = UDim2.new(0, sz, 0, sz), BackgroundColor3 = st == "locked" and Color3.fromRGB(80, 74, 92) or t.col, Text = st == "locked" and "🔒" or t.icon, TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBlack, TextSize = math.floor(sz * 0.48), AutoButtonColor = true, ZIndex = 5 }, mapLayer)
      corner(b); local ring = mk("UIStroke", { Color = t == target and Color3.fromRGB(255, 220, 80) or Color3.fromRGB(30, 16, 40), Thickness = t == target and 4 or 3, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
      if t == target then TweenService:Create(ring, TweenInfo.new(0.7, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Thickness = 8 }):Play() end
      if st == "done" then local c = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(1, -4, 0, 4), Size = UDim2.new(0, 20 * K, 0, 20 * K), BackgroundColor3 = Color3.fromRGB(60, 190, 90), Text = "✓", TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBlack, TextSize = math.floor(14 * K), ZIndex = 6 }, b); corner(c) end
      local nm = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0, t.x * ms, 0, t.y * ms + sz / 2 + 2), Size = UDim2.new(0, 160 * K, 0, 20 * K), BackgroundTransparency = 1, Text = t.name, TextColor3 = st == "locked" and Color3.fromRGB(200, 195, 210) or Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = math.floor(14 * K), ZIndex = 5 }, mapLayer)
      mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(20, 10, 30) }, nm)
      b.MouseButton1Click:Connect(function() showInfo(t) end)
    end
  end
  local f = target or BYID.T   -- 다음 목표가 화면 가운데 오게
  mapLayer.CanvasPosition = Vector2.new(math.clamp(f.x * ms - v.X / 2, 0, math.max(0, MW * ms - v.X)), math.clamp(f.y * ms - v.Y / 2, 0, math.max(0, MH * ms - v.Y)))
end

-- 이동 버튼
dockButton(1, "🏠", "마을", function() closePanel(); setScreen("town") end)
dockButton(2, "🗺", "지도", function() closePanel(); setScreen("map") end)
dockButton(3, "🎒", "장비", function() openPanel("장비", { { "장비", "inv" } }) end)

-- 화면 크기가 바뀌면 다시 배치 (전투 재생 중이면 끝난 뒤 반영)
local relayPending = false
local function relayout()
  relayPending = false; calcK()
  pillScale.Scale = K; statScale.Scale = K; dockScale.Scale = K; resScale.Scale = K
  pillRow.Position = UDim2.new(0.5, 0, 0, INSET / 2)
  if mainStage and not mainStage.conn then makeStage() end
  townBuilt = false
  if screen == "town" then buildTown() elseif screen == "map" then buildMap() end
  if panelLayer.Visible then fitPanel() end
end
workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(function() if not relayPending then relayPending = true; task.delay(0.4, relayout) end end)

-- ── 로딩: 세이브 → 그림 → 시작 ──
loadStep("모험 기록을 불러오는 중...", 0.3)
for _ = 1, 120 do local ok, r = pcall(function() return rpc:InvokeServer("state") end); if ok and r and r.summary then setSummary(r.summary); break end; task.wait(0.5) end
do
  local okArt, ARTM = pcall(require, RS.Game.Data:FindFirstChild("ArtMap"))
  local keys = {}; if okArt then for k in pairs(ARTM.ART) do keys[#keys + 1] = k end end; table.sort(keys)
  for i, k in ipairs(keys) do loadStep(string.format("그림을 불러오는 중... (%d/%d)", i, #keys), 0.35 + 0.6 * i / #keys); Sprites.art(k) end
end
makeStage()
loadStep("준비 완료!", 1)
setScreen("town")
task.wait(0.35)
loadBox.Visible = false; for _, m in ipairs(motes) do m.f.Visible = false end
TweenService:Create(loadArt, TweenInfo.new(0.5), { ImageTransparency = 1 }):Play(); TweenService:Create(loadDim, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
local fade = TweenService:Create(loadBg, TweenInfo.new(0.5), { BackgroundTransparency = 1 }); fade:Play(); fade.Completed:Connect(function() loadGui:Destroy() end)
if summary and (summary.cleared or 0) == 0 then toast("오른쪽 아래 [지도]를 눌러 스테이지 1에 도전하세요!", Color3.fromRGB(255, 230, 140)) end

-- 디버그 훅: gui:SetAttribute("Debug", "fight" | "map" | "town" | 메뉴이름) (자동 테스트용)
gui:GetAttributeChangedSignal("Debug"):Connect(function()
  local v = gui:GetAttribute("Debug")
  if v == "fight" then launch(stageSpec(1))
  elseif v == "map" or v == "town" then setScreen(v)
  elseif views[v] then openPanel(v, { { v, v } }) end
end)
