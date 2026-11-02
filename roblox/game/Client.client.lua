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
local Lang = require(RS:WaitForChild("Game"):WaitForChild("Lang"))   -- 화면 글자 번역 (기본 영어, 한국어 전환 가능)
Lang.watch(loadGui)
local loadBg = Instance.new("Frame"); loadBg.Size = UDim2.new(1, 0, 1, 0); loadBg.BackgroundColor3 = Color3.new(1, 1, 1); loadBg.BorderSizePixel = 0; loadBg.Parent = loadGui
loadGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
local loadGrad = Instance.new("UIGradient"); loadGrad.Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(120, 24, 18)), ColorSequenceKeypoint.new(0.5, Color3.fromRGB(34, 10, 10)), ColorSequenceKeypoint.new(1, Color3.fromRGB(70, 16, 12)) }); loadGrad.Rotation = 90; loadGrad.Parent = loadBg
-- 시작화면: 흐르는 그라데이션 + 떠오르는 불씨, 시작 그림(bg_title)이 오면 천천히 흐르게 깔고 위에 로고(ui_logo)
local loadArt = Instance.new("ImageLabel"); loadArt.BackgroundTransparency = 1; loadArt.ImageTransparency = 1; loadArt.ScaleType = Enum.ScaleType.Crop; loadArt.Size = UDim2.new(1.08, 0, 1.08, 0); loadArt.Position = UDim2.new(0, 0, 0, 0); loadArt.ZIndex = 1; loadArt.Parent = loadBg
local loadDim = Instance.new("Frame"); loadDim.Size = UDim2.new(1, 0, 1, 0); loadDim.BackgroundColor3 = Color3.fromRGB(8, 2, 2); loadDim.BackgroundTransparency = 1; loadDim.BorderSizePixel = 0; loadDim.ZIndex = 2; loadDim.Parent = loadBg
local motes = {}
do   -- 아래쪽을 어둡게 (로딩 글자가 잘 보이게)
  local f = Instance.new("Frame"); f.Size = UDim2.new(1, 0, 0.45, 0); f.Position = UDim2.new(0, 0, 0.55, 0); f.BackgroundColor3 = Color3.new(0, 0, 0); f.BorderSizePixel = 0; f.ZIndex = 2; f.Parent = loadBg
  local g = Instance.new("UIGradient"); g.Rotation = 90; g.Transparency = NumberSequence.new(1, 0.25); g.Parent = f
end
for i = 1, 48 do   -- 불씨 (네모 도트)
  local m = Instance.new("Frame"); local s = math.random(2, 5); m.Size = UDim2.new(0, s, 0, s); m.BorderSizePixel = 0; m.ZIndex = 3
  m.BackgroundColor3 = (i % 4 == 0) and Color3.fromRGB(255, 220, 120) or (i % 2 == 0 and Color3.fromRGB(255, 120, 40) or Color3.fromRGB(220, 50, 30)); m.Parent = loadBg
  motes[i] = { f = m, x = math.random(), y = math.random(), sp = 0.03 + math.random() * 0.06, ph = math.random() * 6.28 }
end
local loadBox = Instance.new("Frame"); loadBox.BackgroundTransparency = 1; loadBox.AnchorPoint = Vector2.new(0.5, 0.5); loadBox.Position = UDim2.new(0.5, 0, 0.5, 0); loadBox.Size = UDim2.new(0, 560, 0, 300); loadBox.Parent = loadBg
-- 로고 그림 (오면 글자 로고를 대신한다)
local loadLogo = Instance.new("ImageLabel"); loadLogo.BackgroundTransparency = 1; loadLogo.ImageTransparency = 1; loadLogo.ScaleType = Enum.ScaleType.Fit   -- 부드럽게 늘림 (도트 확대는 움직일 때 계단처럼 떨린다)
loadLogo.AnchorPoint = Vector2.new(0.5, 0); loadLogo.Size = UDim2.new(0, 600, 0, 225); loadLogo.Position = UDim2.new(0.5, 0, 0, -40); loadLogo.ZIndex = 6; loadLogo.Parent = loadBox
local logoGlow   -- 로고 뒤 붉은 빛 (숨쉬기, 로고 그림이 오면 만든다)
do local sc = Instance.new("UIScale"); sc.Parent = loadBox; local function f() local vp = workspace.CurrentCamera.ViewportSize; sc.Scale = math.clamp(math.min(vp.X / 640, vp.Y / 420), 0.5, 1.6) end; f(); workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(f) end
local function logoText(t, y, size, color)
  local l = Instance.new("TextLabel"); l.BackgroundTransparency = 1; l.Size = UDim2.new(1, 0, 0, size + 8); l.Position = UDim2.new(0, 0, 0, y); l.Text = t; l.Font = Enum.Font.GothamBlack; l.TextSize = size; l.TextColor3 = color; l.Parent = loadBox
  local s = Instance.new("UIStroke"); s.Thickness = 3; s.Color = Color3.fromRGB(12, 4, 4); s.Parent = l; return l
end
local logoTxt = { logoText("ARCANA", 10, 64, Color3.fromRGB(255, 214, 90)), logoText("SLAYER", 80, 72, Color3.fromRGB(255, 120, 90)) }; logoText("자동 전투 핵 앤 슬래시", 186, 20, Color3.fromRGB(235, 215, 200))
local loadBarBg = Instance.new("Frame"); loadBarBg.Size = UDim2.new(0.8, 0, 0, 14); loadBarBg.Position = UDim2.new(0.1, 0, 0, 226); loadBarBg.BackgroundColor3 = Color3.fromRGB(30, 12, 10); loadBarBg.Parent = loadBox
Instance.new("UICorner", loadBarBg).CornerRadius = UDim.new(1, 0); do local s = Instance.new("UIStroke"); s.Color = Color3.fromRGB(214, 168, 70); s.Thickness = 2; s.Parent = loadBarBg end
local loadBar = Instance.new("Frame"); loadBar.Size = UDim2.new(0, 0, 1, 0); loadBar.BackgroundColor3 = Color3.new(1, 1, 1); loadBar.BorderSizePixel = 0; loadBar.Parent = loadBarBg; Instance.new("UICorner", loadBar).CornerRadius = UDim.new(1, 0)
local loadShine = Instance.new("UIGradient"); loadShine.Parent = loadBar   -- 금빛 채움 + 지나가는 반짝임
loadShine.Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(190, 90, 30)), ColorSequenceKeypoint.new(0.42, Color3.fromRGB(255, 190, 80)), ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 245, 200)), ColorSequenceKeypoint.new(0.58, Color3.fromRGB(255, 190, 80)), ColorSequenceKeypoint.new(1, Color3.fromRGB(190, 90, 30)) })
local loadTarget, loadShown = 0, 0   -- 막대는 목표값을 매 프레임 부드럽게 따라간다 (단계마다 끊겨 뛰지 않게)
local loadTxt = logoText("서버에 연결하는 중...", 250, 16, Color3.fromRGB(235, 225, 215)); loadTxt.Font = Enum.Font.GothamMedium
local function loadStep(text, p) loadTxt.Text = text; loadTarget = math.clamp(p, 0, 1) end
loadBox.ZIndex = 5
do   -- 입자 · 그라데이션 흐름 · 배경 그림 천천히 이동
  local t0 = os.clock()
  local conn; conn = game:GetService("RunService").RenderStepped:Connect(function(dt)
    if not loadGui.Parent then conn:Disconnect(); return end
    local t = os.clock() - t0
    loadGrad.Offset = Vector2.new(0, math.sin(t * 0.4) * 0.25); loadGrad.Rotation = 90 + math.sin(t * 0.25) * 20
    for _, m in ipairs(motes) do
      m.y -= m.sp * dt; if m.y < -0.05 then m.y = 1.05; m.x = math.random() end
      m.f.Position = UDim2.new(m.x + math.sin(t * 0.8 + m.ph) * 0.015, 0, m.y, 0); m.f.BackgroundTransparency = math.clamp(0.1 + 0.6 * (0.5 + 0.5 * math.sin(t * 3 + m.ph)) + (1 - m.y) * 0.3, 0, 1)   -- 위로 갈수록 사그라든다
    end
    loadArt.Position = UDim2.new(-0.04, 0, -0.04, 0)   -- 배경도 고정 (느린 이동은 1픽셀씩 끊겨 보인다)
    -- 로고는 움직이지 않는다 (픽셀 단위로 움직이면 계단처럼 끊겨 렉처럼 보임). 대신 뒤의 빛이 숨쉬듯 밝아진다
    if logoGlow then logoGlow.ImageTransparency = 0.55 + 0.2 * math.sin(t * 1.6) end
    loadShown += (loadTarget - loadShown) * math.min(1, dt * 5); loadBar.Size = UDim2.new(loadShown, 0, 1, 0)
    loadShine.Offset = Vector2.new(((t * 0.6) % 2) - 1, 0)
  end)
end

-- 로블록스 기본 UI 중 이 게임에 필요 없는 것 숨김 (순위표 · 가방 · 모바일 이동 조작). 채팅과 메뉴 버튼은 그대로 둔다.
pcall(function() StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.PlayerList, false) end)
pcall(function() StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false) end)
pcall(function() GuiService.TouchControlsEnabled = false end)

-- 서버 요청은 한 줄로 세워 보낸다: 서버가 0.08초보다 빠른 연속 요청을 거절하므로 간격을 지키고, 거절되면 다시 보낸다
local rawRpc = RS:WaitForChild("Rpc")
local rpcLock, rpcLast = false, 0
local FREE = { sheet = true, wstate = true, wpop = true }   -- 서버가 속도 제한을 걸지 않는 요청
local rpc = { InvokeServer = function(_, action, arg)
  if FREE[action] then return rawRpc:InvokeServer(action, arg) end
  while rpcLock do task.wait() end
  rpcLock = true
  local ok, r = pcall(function()
    for _ = 1, 5 do
      local w = 0.1 - (os.clock() - rpcLast); if w > 0 then task.wait(w) end
      local res = rawRpc:InvokeServer(action, arg); rpcLast = os.clock()
      if not (type(res) == "table" and res.err == "너무 빠른 요청입니다") then return res end
    end
    return { err = "너무 빠른 요청입니다" }
  end)
  rpcLock = false
  if not ok then error(r) end
  return r
end }
loadStep("게임 데이터를 준비하는 중...", 0.15)
local Stage = require(RS:WaitForChild("Game"):WaitForChild("Stage"))
local Sprites = require(RS.Game.Sprites); Sprites.init(rpc)
local Theme = require(RS.Game.Theme)   -- 글꼴 · 색
Theme.watch(loadGui)
local Menus = require(RS.Game.Menus)   -- 장비 · 스킬 · 패시브 트리 화면
local Ambient = require(RS.Game.Ambient)   -- 배경 움직임 (불씨 · 안개 · 빛)
local Skin = require(RS.Game.Skin)   -- UI 키트 그림 (없으면 기존 모양)
task.spawn(function()   -- 시작 그림 · 로고가 오면 서서히 깐다 (시작 그림이 없으면 전투 배경)
  local a = Sprites.art("bg_title") or Sprites.art("bg1"); if not a or not loadGui.Parent then return end
  loadArt.ImageContent = a.content
  TweenService:Create(loadArt, TweenInfo.new(1.2), { ImageTransparency = 0 }):Play(); TweenService:Create(loadDim, TweenInfo.new(1.2), { BackgroundTransparency = 0.85 }):Play()
  local l = Sprites.art("ui_logo"); if not l or not loadGui.Parent then return end
  loadLogo.ImageContent = l.content; for _, t in ipairs(logoTxt) do t.Visible = false end
  local ga = Sprites.art("fx_glow")
  if ga and not logoGlow then logoGlow = Instance.new("ImageLabel"); logoGlow.BackgroundTransparency = 1; logoGlow.ImageContent = ga.content; logoGlow.ImageColor3 = Color3.fromRGB(255, 70, 40)
    logoGlow.AnchorPoint = Vector2.new(0.5, 0.5); logoGlow.Position = UDim2.new(0.5, 0, 0, 72); logoGlow.Size = UDim2.new(0, 720, 0, 300); logoGlow.ImageTransparency = 0.6; logoGlow.ZIndex = 5; logoGlow.Parent = loadBox end
  TweenService:Create(loadLogo, TweenInfo.new(0.8), { ImageTransparency = 0 }):Play()
end)

local gui = Instance.new("ScreenGui"); gui.Name = "DungeonUI"; gui.ResetOnSpawn = false; gui.IgnoreGuiInset = true; gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling; gui.Parent = PG
Lang.watch(gui); Theme.watch(gui)
local INSET = math.max(36, GuiService:GetGuiInset().Y)   -- 로블록스 상단 버튼 줄 높이
local function vp() return workspace.CurrentCamera.ViewportSize end
local K = 1   -- HUD 배율 (화면 높이 720 기준)
-- 설정 (서버에 저장): UI 크기 · 피해 숫자 · 피격 반짝임 · 볼륨(전체/배경음악/효과음) · 음소거
local OPT = { ui = 1, dmg = true, flash = 1, master = 0.8, music = 0.5, sfx = 0.8, mute = false, speed = 1, auto = 0, ar1 = 0, ar2 = 0, ar3 = 0, ar4 = 0, sr1 = 0, sr2 = 0, sr3 = 0, sbest = true }
local function calcK() K = math.clamp(vp().Y / 720, 0.6, 1.4) * OPT.ui; Stage.TOP = INSET; Stage.HUD = K end
calcK()

local function mk(class, props, parent) local o = Instance.new(class); for k, v in pairs(props) do o[k] = v end; o.Parent = parent; return o end
local function corner(o, r) mk("UICorner", { CornerRadius = r and UDim.new(0, r) or UDim.new(1, 0) }, o) end
local function stroke(o, c, t) mk("UIStroke", { Color = c or Color3.fromRGB(214, 168, 70), Thickness = t or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, o) end
local GOLD, DARK, PANEL = Theme.GOLD, Theme.DARK, Theme.PANEL
local function label(parent, text, size, pos, sz)
  local l = Instance.new("TextLabel"); l.BackgroundTransparency = 1; l.TextColor3 = Color3.new(1, 1, 1); l.Font = Enum.Font.GothamMedium; l.TextSize = size or 16
  l.TextXAlignment = Enum.TextXAlignment.Left; l.TextWrapped = true; l.Text = text; l.Position = pos; l.Size = sz; l.Parent = parent; return l
end
local function button(parent, text, pos, sz, cb, color)
  local b = Instance.new("TextButton"); b.Text = text; b.Font = Theme.FONT; b.TextSize = 15; b.TextColor3 = Color3.new(1, 1, 1); b.BackgroundColor3 = color or Color3.fromRGB(95, 80, 160)
  b.Position = pos; b.Size = sz; b.Parent = parent; Instance.new("UICorner", b).CornerRadius = UDim.new(0, 8)
  local g = Instance.new("UIGradient"); g.Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(170, 170, 170)); g.Rotation = 90; g.Parent = b
  local s1 = Instance.new("UIStroke"); s1.Color = Color3.fromRGB(20, 10, 30); s1.Thickness = 2; s1.ApplyStrokeMode = Enum.ApplyStrokeMode.Border; s1.Parent = b
  local s2 = Instance.new("UIStroke"); s2.Color = Color3.fromRGB(20, 10, 30); s2.Thickness = 1.5; s2.Parent = b
  b.MouseButton1Click:Connect(cb); task.defer(Skin.button, b); return b
end
local function n(x)   -- 큰 수 줄임: 유효 숫자 3자리 (9999 · 12.3K · 123K · 1.23M · … · T) — 칸 밖으로 안 나가게
  x = math.floor(x or 0); if math.abs(x) < 1e4 then return tostring(x) end
  for _, u in ipairs({ { 1e12, "T" }, { 1e9, "B" }, { 1e6, "M" }, { 1e3, "K" } }) do
    if math.abs(x) >= u[1] then local v = x / u[1]; return (v >= 100 and string.format("%.0f", v) or v >= 10 and string.format("%.1f", v) or string.format("%.2f", v)) .. u[2] end
  end
  return tostring(x)
end

-- ── 층 구성 (아래 → 위): 전투 무대 · 마을 · 지도 · HUD · 창 · 결과 · 알림 ──
local stageHolder = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 1 }, gui)
local townLayer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(90, 150, 90), BorderSizePixel = 0, ZIndex = 2, Visible = false }, gui)
local mapDragged = false   -- 지도를 끌었으면 노드 클릭 무시
local mapLayer = mk("ScrollingFrame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(60, 50, 40), BorderSizePixel = 0, ZIndex = 3, Visible = false, ScrollBarThickness = 0, ScrollingDirection = Enum.ScrollingDirection.XY, ElasticBehavior = Enum.ElasticBehavior.Never }, gui)
local hud = mk("Frame", { Name = "Hud", Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 10 }, gui)
local panelLayer = mk("TextButton", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, Text = "", AutoButtonColor = false, ZIndex = 20, Visible = false }, gui)
local resultLayer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.5, ZIndex = 25, Visible = false }, gui)
local toastLayer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 30 }, gui)

-- 왼쪽 위 캐릭터 카드 (마을 · 지도에서): 초상화(Lv) | 능력치 5칸 (이름 위 · 숫자 가운데) / 진행도 띠 — 칸을 나눠 배치
local statLbl = mk("Frame", { Active = true, BackgroundColor3 = Color3.fromRGB(16, 11, 10), BackgroundTransparency = 0.08, Position = UDim2.new(0, 12, 0, INSET + 8), Size = UDim2.new(0, 400, 0, 92), ZIndex = 11 }, hud)
corner(statLbl, 8); stroke(statLbl, GOLD, 2); local statScale = mk("UIScale", { Scale = K }, statLbl)
local statVal, statProg, statLv, statGold, statFace, statPow = {}, nil, nil, nil, nil, nil
local statArc, openPanelFn   -- 아르카나 조각 표시 · 창 열기 (아래에서 정함)
local heroChanged   -- 지팡이 ⇄ 검: 모습이 바뀌면 (아래에서 정함)
local passNoticed = false
local startShown, showStartPick, tutorial, tutSignal = false, nil, nil, nil   -- 새 계정: 시작 직업 고르기 창 · 튜토리얼 (아래에서 정함)
do
  local CELL, EDGE = Color3.fromRGB(28, 20, 17), Color3.fromRGB(110, 84, 44)
  -- 초상화 칸 + 아래 Lv 띠
  local pf = mk("Frame", { Position = UDim2.new(0, 8, 0, 8), Size = UDim2.new(0, 76, 0, 76), BackgroundColor3 = CELL, ClipsDescendants = true, ZIndex = 12 }, statLbl); corner(pf, 6); stroke(pf, EDGE, 1.5)
  local wa = Sprites.art("warrior")
  if wa then statFace = mk("ImageLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ImageContent = wa.content, ImageRectOffset = Vector2.new(wa.w * 0.3, wa.h * 0.14), ImageRectSize = Vector2.new(wa.w * 0.5, wa.h * 0.5), ScaleType = Enum.ScaleType.Stretch, ZIndex = 13 }, pf) end
  statLv = mk("TextLabel", { AnchorPoint = Vector2.new(0, 1), Position = UDim2.new(0, 0, 1, 0), Size = UDim2.new(1, 0, 0, 20), BackgroundColor3 = Color3.fromRGB(10, 6, 6), BackgroundTransparency = 0.15, Text = "", Font = Theme.FONT, TextSize = 14, TextColor3 = Color3.fromRGB(255, 214, 110), ZIndex = 14 }, pf)
  -- 능력치 5칸: 칸마다 테두리, 이름은 위 가운데, 숫자는 남은 공간 가운데 (길면 자동으로 줄어듦)
  local STATS = { { "hp", "체력", Color3.fromRGB(235, 90, 80) }, { "atk", "공격력", Color3.fromRGB(240, 170, 80) }, { "mag", "주문력", Color3.fromRGB(150, 140, 255) }, { "def", "방어력", Color3.fromRGB(140, 190, 230) }, { "crit", "치명", Color3.fromRGB(255, 220, 110) } }
  local row = mk("Frame", { Position = UDim2.new(0, 92, 0, 8), Size = UDim2.new(1, -100, 0, 50), BackgroundTransparency = 1, ZIndex = 12 }, statLbl)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, row)
  for i, st in ipairs(STATS) do
    local c = mk("Frame", { Size = UDim2.new(0.2, -4, 1, 0), BackgroundColor3 = CELL, LayoutOrder = i, ZIndex = 12, ClipsDescendants = true }, row); corner(c, 5); stroke(c, EDGE, 1)
    mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 2, 0, 3), Size = UDim2.new(1, -4, 0, 14), Text = st[2], Font = Theme.FONT, TextSize = 13, TextColor3 = Color3.fromRGB(185, 170, 150), ZIndex = 13 }, c)
    local v = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 3, 0, 18), Size = UDim2.new(1, -6, 1, -21), Text = "", Font = Theme.FONT, TextScaled = true, TextColor3 = st[3],
      TextXAlignment = Enum.TextXAlignment.Center, TextYAlignment = Enum.TextYAlignment.Center, ZIndex = 13 }, c)
    mk("UITextSizeConstraint", { MaxTextSize = 22, MinTextSize = 6 }, v); mk("UIStroke", { Thickness = 1.5, Color = Color3.fromRGB(10, 6, 8) }, v)
    statVal[st[1]] = v
  end
  -- 진행도 띠
  local pb = mk("Frame", { Position = UDim2.new(0, 92, 0, 62), Size = UDim2.new(1, -100, 0, 22), BackgroundColor3 = CELL, ZIndex = 12 }, statLbl); corner(pb, 5); stroke(pb, EDGE, 1)
  -- 전투력: 작은 이름표 + 큰 금빛 숫자 (금속 느낌 그라데이션)
  local pl = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(0, 46, 1, 0), Position = UDim2.new(0, 6, 0, 0), Text = "전투력", Font = Theme.FONT, TextSize = 12, TextColor3 = Color3.fromRGB(190, 160, 110), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 13 }, pb)
  statPow = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(0.5, -52, 1, 2), Position = UDim2.new(0, 52, 0, -1), Text = "", Font = Theme.FONT, TextScaled = true, TextColor3 = Color3.new(1, 1, 1), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 13 }, pb)
  mk("UITextSizeConstraint", { MaxTextSize = 20, MinTextSize = 8 }, statPow)
  mk("UIGradient", { Rotation = 90, Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 244, 200)), ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 200, 80)), ColorSequenceKeypoint.new(1, Color3.fromRGB(200, 120, 30)) }) }, statPow)
  mk("UIStroke", { Thickness = 1.5, Color = Color3.fromRGB(20, 8, 4) }, statPow)
  statProg = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(0.55, -8, 1, 0), Position = UDim2.new(0.45, 0, 0, 0), Text = "", Font = Theme.FONT, TextScaled = true, TextColor3 = Color3.fromRGB(200, 190, 180), TextXAlignment = Enum.TextXAlignment.Right, ZIndex = 13 }, pb)
  mk("UITextSizeConstraint", { MaxTextSize = 12, MinTextSize = 6 }, statProg)
  -- 골드: 카드 아래 금빛 판
  local gp = mk("Frame", { Position = UDim2.new(0, 0, 1, 8), Size = UDim2.new(0, 200, 0, 40), BackgroundColor3 = Color3.fromRGB(40, 28, 14), ZIndex = 11 }, statLbl); corner(gp, 8); stroke(gp, GOLD, 2)
  Skin.frame(gp, "ui_pill", 0.3, 0.5)
  local ga = Sprites.art("i_gold")
  if ga then mk("ImageLabel", { Position = UDim2.new(0, 4, 0.5, -20), Size = UDim2.new(0, 40, 0, 40), BackgroundTransparency = 1, ImageContent = ga.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 13 }, gp) end
  statGold = mk("TextLabel", { Position = UDim2.new(0, 48, 0, 0), Size = UDim2.new(1, -58, 1, 0), BackgroundTransparency = 1, Text = "", Font = Theme.FONT, TextScaled = true, TextColor3 = Color3.fromRGB(255, 210, 90), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 13 }, gp)
  mk("UITextSizeConstraint", { MaxTextSize = 22, MinTextSize = 8 }, statGold)
  mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(30, 16, 4) }, statGold)
  -- 아르카나 조각 (아르카나 소환에 쓰는 귀한 재화): 골드 바로 옆 보랏빛 판, 누르면 소환 창
  local ap = mk("TextButton", { Position = UDim2.new(0, 208, 1, 8), Size = UDim2.new(0, 170, 0, 40), BackgroundColor3 = Color3.fromRGB(34, 16, 44), Text = "", AutoButtonColor = false, ZIndex = 11 }, statLbl); corner(ap, 8); stroke(ap, Color3.fromRGB(200, 120, 255), 2)
  Skin.frame(ap, "ui_pill", 0.3, 0.5)
  local aa = Sprites.art("i_arcana")
  if aa then mk("ImageLabel", { Position = UDim2.new(0, 4, 0.5, -20), Size = UDim2.new(0, 40, 0, 40), BackgroundTransparency = 1, ImageContent = aa.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 13 }, ap)
  else local dot = mk("Frame", { Position = UDim2.new(0, 12, 0.5, -10), Size = UDim2.new(0, 20, 0, 20), BackgroundColor3 = Color3.fromRGB(230, 140, 255), Rotation = 45, ZIndex = 13 }, ap); corner(dot, 3) end
  statArc = mk("TextLabel", { Position = UDim2.new(0, 48, 0, 0), Size = UDim2.new(1, -56, 1, 0), BackgroundTransparency = 1, Text = "", Font = Theme.FONT, TextScaled = true, TextColor3 = Color3.fromRGB(240, 190, 255), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 13 }, ap)
  mk("UITextSizeConstraint", { MaxTextSize = 22, MinTextSize = 8 }, statArc); mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(24, 6, 30) }, statArc)
  ap.MouseButton1Click:Connect(function() if openPanelFn then openPanelFn("아르카나 소환", { { "아르카나 소환", "gacha" }, { "아르카나 목록", "gachalist" } }) end end)
end
-- 오른쪽 아래: 지도 ⇄ 마을 큰 버튼 (마을에선 지도, 지도에선 마을)
local dock = mk("TextButton", { Name = "MapBtn", AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -16, 1, -16), Size = UDim2.new(0, 230, 0, 76), BackgroundColor3 = Color3.fromRGB(20, 14, 12), Text = "", AutoButtonColor = false, ZIndex = 11 }, hud)
corner(dock, 10); stroke(dock, GOLD, 2.5); local dockScale = mk("UIScale", { Scale = K }, dock)
Skin.frame(dock, "ui_panel", 0.2, 0.5)   -- 주황 버튼 대신 어두운 판 (마을 · 지도 그림과 어울리게)
local dockIcon = mk("ImageLabel", { Position = UDim2.new(0, 10, 0.5, -34), Size = UDim2.new(0, 68, 0, 68), BackgroundTransparency = 1, ScaleType = Enum.ScaleType.Fit, ZIndex = 13 }, dock)
local dockEmoji = mk("TextLabel", { Position = UDim2.new(0, 10, 0, 0), Size = UDim2.new(0, 68, 1, 0), BackgroundTransparency = 1, TextSize = 36, Font = Enum.Font.GothamBold, TextColor3 = Color3.new(1, 1, 1), Text = "", ZIndex = 13 }, dock)
local dockText = mk("TextLabel", { Position = UDim2.new(0, 82, 0, 0), Size = UDim2.new(1, -92, 1, 0), BackgroundTransparency = 1, TextSize = 32, Font = Theme.FONT, TextColor3 = Color3.new(1, 1, 1), Text = "", ZIndex = 13 }, dock)
mk("UIGradient", { Rotation = 90, Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 240, 200)), ColorSequenceKeypoint.new(0.55, Color3.fromRGB(240, 190, 100)), ColorSequenceKeypoint.new(1, Color3.fromRGB(180, 110, 40)) }) }, dockText)
mk("UIStroke", { Thickness = 2.5, Color = Color3.fromRGB(30, 14, 6) }, dockText)
dock.MouseEnter:Connect(function() dock.Size = UDim2.new(0, 238, 0, 80) end); dock.MouseLeave:Connect(function() dock.Size = UDim2.new(0, 230, 0, 76) end)
local function dockSet(toMap)
  local a = Sprites.art(toMap and "m_map" or "m_town")
  dockIcon.ImageContent = a and a.content or Content.none; dockEmoji.Text = a and "" or (toMap and "🗺" or "🏠")
  dockText.Text = toMap and "지도" or "마을"
end

-- 오른쪽 위: 메뉴 아이콘 줄 (마을 · 지도에서)
local topBar = mk("Frame", { Name = "TopBar", BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -12, 0, INSET + 8), Size = UDim2.new(0, 8 * 66 + 7 * 6, 0, 80), ZIndex = 11 }, hud)
local topScale = mk("UIScale", { Scale = K }, topBar)
mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, topBar)
local function topButton(i, key, emoji, text, cb)
  local b = mk("TextButton", { Name = key, Size = UDim2.new(0, 66, 0, 80), BackgroundTransparency = 1, Text = "", LayoutOrder = i, ZIndex = 11 }, topBar)
  local fr = mk("Frame", { Size = UDim2.new(0, 62, 0, 62), Position = UDim2.new(0.5, -31, 0, 0), BackgroundColor3 = PANEL, ZIndex = 11 }, b); corner(fr, 10); stroke(fr, GOLD, 2)
  Skin.frame(fr, "ui_slot", 0.3, 0.45)
  local a = Sprites.art(key)
  local ic = a and mk("ImageLabel", { Size = UDim2.new(1, -8, 1, -8), Position = UDim2.new(0, 4, 0, 4), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 12 }, fr)
    or mk("TextLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, Text = emoji, TextSize = 30, Font = Enum.Font.GothamBold, TextColor3 = Color3.new(1, 1, 1), ZIndex = 12 }, fr)
  local l = mk("TextLabel", { Position = UDim2.new(0, -4, 0, 60), Size = UDim2.new(1, 8, 0, 20), BackgroundTransparency = 1, Text = text, TextSize = 14, Font = Theme.FONT, TextColor3 = Color3.fromRGB(255, 235, 200), ZIndex = 12 }, b)
  mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(10, 6, 8) }, l)
  b.MouseEnter:Connect(function() fr.Position = UDim2.new(0.5, -31, 0, -3) end); b.MouseLeave:Connect(function() fr.Position = UDim2.new(0.5, -31, 0, 0) end)
  b.MouseButton1Click:Connect(cb); return b
end

-- 알림 (상단 자원 아래 가운데)
local function toast(text, color)
  local t = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, INSET + 10), Size = UDim2.new(0, 520, 0, 40), BackgroundColor3 = DARK, BackgroundTransparency = 0.1, TextColor3 = color or Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = 15, TextWrapped = true, Text = text, ZIndex = 31 }, toastLayer)
  corner(t, 10); stroke(t, GOLD, 1.5); mk("UIScale", { Scale = K }, t)
  task.delay(2.4, function() local tw = TweenService:Create(t, TweenInfo.new(0.4), { TextTransparency = 1, BackgroundTransparency = 1 }); tw:Play(); tw.Completed:Wait(); t:Destroy() end)
end

local summary
-- 전투력 변화 알림: 강화 · 재굴림 · 패시브 · 장착 등 무엇이든 전투력이 바뀌면 화면 위 가운데에 "전투력 ▲ +N" 이 떠올랐다 사라진다
local powPop
local function showPowerChange(old, new)
  if powPop then powPop:Destroy() end
  local up = new > old
  local f = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, INSET + 70), Size = UDim2.new(0, 0, 0, 44), AutomaticSize = Enum.AutomaticSize.X, BackgroundColor3 = Color3.fromRGB(14, 9, 8), BackgroundTransparency = 0.1, ZIndex = 70 }, gui)
  corner(f, 10); stroke(f, up and Color3.fromRGB(120, 230, 130) or Color3.fromRGB(240, 110, 100), 2); mk("UIScale", { Scale = K }, f); powPop = f
  mk("UIPadding", { PaddingLeft = UDim.new(0, 18), PaddingRight = UDim.new(0, 18) }, f)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, VerticalAlignment = Enum.VerticalAlignment.Center, Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, f)
  local a = mk("TextLabel", { Size = UDim2.new(0, 0, 1, 0), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1, Text = "전투력 " .. n(new), Font = Theme.FONT, TextSize = 22, TextColor3 = Color3.fromRGB(255, 225, 150), LayoutOrder = 1, ZIndex = 71 }, f)
  local b = mk("TextLabel", { Size = UDim2.new(0, 0, 1, 0), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1, Text = string.format("%s %s%s", up and "▲" or "▼", up and "+" or "−", n(math.abs(new - old))), Font = Theme.FONT, TextSize = 24, TextColor3 = up and Color3.fromRGB(130, 255, 140) or Color3.fromRGB(255, 120, 110), LayoutOrder = 2, ZIndex = 71 }, f)
  b:SetAttribute("NoTr", true)
  for _, l in ipairs({ a, b }) do mk("UIStroke", { Thickness = 2, Color = Color3.new(0, 0, 0) }, l) end
  task.delay(1.8, function() if f.Parent then local t = TweenService:Create(f, TweenInfo.new(0.4), { BackgroundTransparency = 1, Position = f.Position - UDim2.new(0, 0, 0, 16) }); t:Play(); for _, l in ipairs({ a, b }) do TweenService:Create(l, TweenInfo.new(0.4), { TextTransparency = 1 }):Play() end; t.Completed:Wait(); f:Destroy() end end)
end
local function setSummary(s)
  if not s then return end
  if summary and (summary.power or 0) > 0 and s.power and s.power ~= summary.power then showPowerChange(summary.power, s.power); if tutSignal then task.defer(tutSignal, "power") end end
  summary = s
  statLv.Text = "Lv " .. tostring(s.level); statGold.Text = n(s.gold); if statArc then statArc.Text = n(s.arcana or 0) end
  if s.needStart and not startShown then startShown = true; task.defer(function() if showStartPick then showStartPick() end end) end
  if not s.needStart and s.tut and s.tut < 3 and not startShown then startShown = true; task.delay(1, function() if tutorial then tutorial(0) end end) end   -- 튜토리얼 도중에 나갔다 오면 처음부터 짧게
  if s.passNotice and not passNoticed then passNoticed = true; task.delay(2, function() toast("패시브 트리가 새로 바뀌었습니다! 찍었던 포인트를 모두 돌려드렸어요.", Color3.fromRGB(255, 220, 120)) end) end
  local hk = s.hero or "warrior"
  if hk ~= Stage.HERO then Stage.HERO = hk; local a = Sprites.art(Stage.heroKey()); if statFace and a then statFace.ImageContent = a.content end; if heroChanged then task.defer(heroChanged) end end
  statVal.hp.Text = n(s.maxHp); statVal.atk.Text = n(s.atk); statVal.mag.Text = n(s.mag); statVal.def.Text = n(s.def); statVal.crit.Text = string.format("%.0f%%", s.crit * 100)
  statPow.Text = n(s.power or 0); statProg.Text = string.format("균열 %d · 탑 %d", s.riftBest, s.best)
end

-- ── 가운데 창 (건물 · 장비 · 문지기 등): 제목 + 탭 + 내용 목록 + 메시지 ──
local root = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, INSET / 2), Size = UDim2.new(0, 880, 0, 540), BackgroundColor3 = Color3.fromRGB(24, 20, 44), ZIndex = 21 }, panelLayer)
corner(root, 14); Skin.frame(root, "ui_panel", 0.2, 0.6)   -- 노란 테두리 없이 장식 틀만
local panelScale = mk("UIScale", { Scale = 1 }, root)
local titleBand = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, -16), Size = UDim2.new(0, 400, 0, 62), BackgroundColor3 = Color3.fromRGB(40, 16, 14), ZIndex = 24 }, root)
corner(titleBand, 10); Skin.frame(titleBand, "ui_title", 0.3, 0.5)   -- 창 위 가장자리에 걸친 이름 띠
local panelTitle = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 20, 0, 0), Size = UDim2.new(1, -40, 1, 0), Font = Theme.FONT, TextScaled = true, TextColor3 = Color3.fromRGB(255, 225, 150), Text = "", ZIndex = 25 }, titleBand)
mk("UITextSizeConstraint", { MaxTextSize = 30, MinTextSize = 14 }, panelTitle); mk("UIStroke", { Thickness = 2.5, Color = Color3.fromRGB(20, 6, 4) }, panelTitle)
-- 머리 띠: 다마스크 무늬 그림(ui_header) + 아래 보석 구분선(ui_divider) — 위쪽이 밋밋하지 않게, 본문과 다른 색
local headStrip = mk("ImageLabel", { Position = UDim2.new(0, 14, 0, 22), Size = UDim2.new(1, -28, 0, 72), BackgroundTransparency = 1, ScaleType = Enum.ScaleType.Stretch, ZIndex = 21 }, root)
local headDiv = mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0, 94), Size = UDim2.new(0.9, 0, 0, 30), BackgroundTransparency = 1, ScaleType = Enum.ScaleType.Stretch, ZIndex = 23 }, root)
local tabRow = mk("Frame", { BackgroundTransparency = 1, Position = UDim2.new(0, 16, 0, 52), Size = UDim2.new(1, -32, 0, 34), ZIndex = 22 }, root)
mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Center, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, tabRow)   -- 탭은 가운데
local list = mk("ScrollingFrame", { Position = UDim2.new(0, 16, 0, 96), Size = UDim2.new(1, -32, 1, -112), BackgroundColor3 = Color3.fromRGB(12, 9, 9), BackgroundTransparency = 0.35, BorderSizePixel = 0, CanvasSize = UDim2.new(0, 0, 0, 0), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 8, ZIndex = 22 }, root)
corner(list, 8); mk("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, list); mk("UIPadding", { PaddingTop = UDim.new(0, 6), PaddingLeft = UDim.new(0, 6) }, list)
local msg = label(root, "", 14, UDim2.new(0.5, 0, 1, -22), UDim2.new(0, 0, 0, 28)); msg.ZIndex = 30; msg.TextColor3 = Color3.fromRGB(255, 230, 150)
msg.AnchorPoint = Vector2.new(0.5, 1); msg.AutomaticSize = Enum.AutomaticSize.X; msg.BackgroundColor3 = Color3.fromRGB(16, 10, 8); msg.BackgroundTransparency = 1; corner(msg, 8)
mk("UIPadding", { PaddingLeft = UDim.new(0, 14), PaddingRight = UDim.new(0, 14) }, msg)
msg:GetPropertyChangedSignal("Text"):Connect(function() msg.BackgroundTransparency = msg.Text == "" and 1 or 0.1 end)   -- 알림이 있을 때만 띠가 보인다
-- 창 내용 지우기: 옛 내용은 바로 지우지 않고, 새 내용이 들어오는 순간 바꿔치기한다 (서버 응답을 기다리는 동안 화면이 비어 깜빡이지 않게)
local pendingOld = {}
local swapNew, swapLast, swapStart   -- (아래 깜빡임 없는 다시 그리기)
local function swapNow()   -- 예전 화면을 지우고 새 화면을 보인다 (한 프레임 안에)
  if not swapNew or #swapNew == 0 then return end
  for o in pairs(pendingOld) do o:Destroy() end; pendingOld = {}
  for _, f in ipairs(swapNew) do if f.Parent then f.Visible = true end end; swapNew = {}
end
local function clear(hard)
  msg.Text = ""
  for _, c in ipairs(list:GetChildren()) do if c:IsA("Frame") then if hard then c:Destroy() else pendingOld[c] = true end end end
  if hard then pendingOld = {}; swapNew = {} end
end
-- 깜빡임 없는 다시 그리기: 새 화면은 숨긴 채로 다 채운 뒤(새 요소가 더 붙지 않고 0.06초 지나면, 길어도 1.2초) 예전 화면과 한 번에 바꾼다
swapNew, swapLast, swapStart = {}, 0, 0
list.DescendantAdded:Connect(function() swapLast = os.clock() end)
list.ChildAdded:Connect(function(c)
  if not c:IsA("Frame") or pendingOld[c] or not next(pendingOld) then return end
  c.Visible = false; swapNew[#swapNew + 1] = c
  if #swapNew > 1 then return end
  swapStart = os.clock(); swapLast = os.clock()
  task.spawn(function()   -- 창 함수가 끝났다는 신호(buildDone)가 오면 바로, 신호가 없는 화면은 0.3초 동안 새 요소가 없을 때(길어도 1.5초)
    while #swapNew > 0 and os.clock() - swapLast < 0.3 and os.clock() - swapStart < 1.5 do game:GetService("RunService").Heartbeat:Wait() end
    swapNow()
  end)
end)
local function card(title, lines, btns)
  local f = Instance.new("Frame"); f.BackgroundColor3 = Color3.fromRGB(20, 15, 15); f.AutomaticSize = Enum.AutomaticSize.Y; f.Size = UDim2.new(1, -16, 0, 0); f.Parent = list
  Instance.new("UICorner", f).CornerRadius = UDim.new(0, 6); stroke(f, Color3.fromRGB(110, 84, 44), 1.2)   -- 글이 많은 카드는 그림 틀(가운데 금줄이 글자 위로 지나감) 대신 깔끔한 판
  local cg = Instance.new("UIGradient"); cg.Rotation = 90; cg.Color = ColorSequence.new(Color3.fromRGB(34, 24, 20), Color3.fromRGB(18, 13, 12)); cg.Parent = f; f.BackgroundColor3 = Color3.new(1, 1, 1)
  local acc = Instance.new("Frame"); acc.Size = UDim2.new(0, 3, 1, -12); acc.Position = UDim2.new(0, 4, 0, 6); acc.BackgroundColor3 = Color3.fromRGB(200, 150, 70); acc.BorderSizePixel = 0; acc.Parent = f   -- 왼쪽 금빛 표시줄
  local bw = math.max(1, #(btns or {})) * 72 + 10
  local tb = Instance.new("Frame"); tb.BackgroundTransparency = 1; tb.Position = UDim2.new(0, 18, 0, 10); tb.Size = UDim2.new(1, -bw - 14, 0, 0); tb.AutomaticSize = Enum.AutomaticSize.Y; tb.Parent = f
  local ll = Instance.new("UIListLayout"); ll.Padding = UDim.new(0, 2); ll.SortOrder = Enum.SortOrder.LayoutOrder; ll.Parent = tb
  local tt = label(tb, title, 15, UDim2.new(), UDim2.new(1, 0, 0, 0)); tt.Font = Theme.FONT; tt.TextColor3 = Color3.fromRGB(255, 225, 140); tt.AutomaticSize = Enum.AutomaticSize.Y; tt.LayoutOrder = 1
  if #lines > 0 then local t = label(tb, table.concat(lines, "\n"), 13, UDim2.new(), UDim2.new(1, 0, 0, 0)); t.TextColor3 = Color3.fromRGB(225, 220, 245); t.AutomaticSize = Enum.AutomaticSize.Y; t.LayoutOrder = 2 end
  for i, b in ipairs(btns or {}) do button(f, b[1], UDim2.new(1, -bw + (i - 1) * 72, 0, 8), UDim2.new(0, 68, 0, 32), b[2]) end
  Instance.new("UIPadding", f).PaddingBottom = UDim.new(0, 10)
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
local cancelAutoFn   -- 자동 반복 대기 취소 (메뉴를 열면 멈춘다)
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
    card("새 문지기 — 공명 구슬", { "구슬이 터지기 전에 직접 눌러 없애야 합니다 (아르카나는 통하지 않음).", "터진 구슬은 큰 피해를 주고 문지기를 회복시킵니다." }, { { "도전", function() local e = rpc:InvokeServer("wstart"); msg.Text = e.err or "시작!"; views.warden() end } })
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
  card("보유 룬 " .. #r.runes, { "아르카나 카드의 '룬' 버튼으로 끼울 아르카나를 고릅니다 (아래 아르카나를 먼저 선택)." }, {})
  for _, k in ipairs(r.skills) do
    local btns = {}
    if k.rune then btns[#btns + 1] = { "룬 해제", function() rpc:InvokeServer("runeremove", k.uid); views.runes() end } end
    for _, ru in ipairs(r.runes) do if #btns < 3 then btns[#btns + 1] = { string.sub(ru.name, 1, 9), function() local e = rpc:InvokeServer("runeequip", { skill = k.uid, rune = ru.uid }); msg.Text = e.err or ""; views.runes() end } end end
    card(tostring(k.name or k.id) .. (k.rune and (" [" .. k.rune .. "]") or ""), {}, btns)
  end
end
function views.help()
  clear()
  card("게임의 흐름", {
    "캐릭터는 자동으로 싸웁니다. 여러분은 아르카나 · 장비 · 패시브로 강해지고, 더 높은 곳에 도전합니다.",
    "초원 1~5 → 심연의 균열 1~100층(층을 처음 깰 때마다 레벨 +1) → 균열 100층 졸업 → 보스 관문 · 무한 균열 · 보물고 · 심연의 문 → 솟아난 탑 · 돌의 신전 · 레이드 → 전직 · 참." }, {})
  card("전투력 올리는 법 (중요한 순서)", {
    "1) 장비: 가방의 [자동 장착]. 초록 ▲가 붙은 장비는 지금보다 좋습니다. 무기 · 장갑 · 목걸이가 특히 중요해요.",
    "2) 아르카나: 같은 계열(물리 또는 마법)로 4칸을 채우세요. 같은 아르카나를 또 뽑으면 레벨이 오르고, 높은 등급일수록 강합니다.",
    "3) 패시브: 레벨마다 1점. 내 무기 계열 갈래(물리 · 마법)부터 찍고, 고민되면 [자동 배분].",
    "4) 강화: 제련소에서 장비 강화 · 옵션 재굴림. 좋은 옵션(공격력 · 주문력 · 내 계열 피해 · 치명타)을 남기세요.",
    "5) 레벨: 균열 층을 처음 깨면 레벨이 오릅니다. 막히면 아래층을 돌며 장비를 모으세요." }, {})
  card("막혔을 때", {
    "지도 창의 [권장 전투력]과 내 전투력을 비교하세요. 내 전투력이 낮으면 위의 순서대로 올리면 됩니다.",
    "원거리 몹에게 많이 맞으면 사거리가 긴 아르카나를, 몹이 많으면 범위 아르카나를 섞어 보세요.",
    "자동 반복(결과 화면)을 켜 두면 같은 층을 계속 돌며 장비와 조각을 모읍니다." }, {})
  card("재화", {
    "골드: 강화 · 상점. 강화석: 장비 강화. 아르카나 조각: 아르카나 소환(1회 10개 · 10회 90개).",
    "안 쓰는 장비는 분해하면 강화석, 안 쓰는 아르카나는 분해하면 아르카나 조각이 됩니다. 가방의 [자동 분해] 설정으로 전투마다 알아서 정리할 수 있어요." }, {})
  card("매일 할 일", { "퀘스트 게시판의 일일 과제와 우편함 보상을 챙기세요. 무한 균열은 하루 입장 횟수가 정해져 있습니다." }, {})
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
local shopBtn   -- 왼쪽 상점 버튼 (아래에서 만든다)
local buildTown, buildMap
local infoCard
local function fitPanel() local v = vp(); panelScale.Scale = math.clamp(math.min((v.X - 24) / 880, (v.Y - INSET - 16) / 540), 0.45, 1.3) end
local function hudShow(on) local v = on and screen ~= "battle"; dock.Visible = v; topBar.Visible = v; statLbl.Visible = v; if shopBtn then shopBtn.Visible = v end end   -- 창이 열려 있으면 위쪽 HUD 를 숨긴다 (창 뒤로 반쯤 잘려 보이지 않게)
local function closePanel() panelLayer.Visible = false; hudShow(true); clear(true); if screen == "battle" and mainStage and not mainStage.conn then resultLayer.Visible = true end end
local function setScreen(name)
  screen = name
  if name == "battle" and tutSignal then task.defer(tutSignal, "battle") end
  townLayer.Visible = name == "town"; mapLayer.Visible = name == "map"; stageHolder.Visible = name == "battle"
  dock.Visible = name ~= "battle"; topBar.Visible = name ~= "battle"; if shopBtn then shopBtn.Visible = name ~= "battle" end; statLbl.Visible = name ~= "battle"; infoCard.Visible = false; resultLayer.Visible = false
  dockSet(name ~= "map")
  if name == "town" then buildTown() elseif name == "map" then buildMap() end
end
root.Active = true   -- 창 안을 눌러도 바깥(닫기)으로 새지 않게
-- 창 바깥(어두운 바탕)을 눌러도 닫히지 않는다: 닫기는 X 버튼으로만 (실수로 나가지 않게)
do local b = button(root, "X", UDim2.new(1, -56, 0, 10), UDim2.new(0, 42, 0, 36), closePanel, Color3.fromRGB(130, 44, 64)); b.ZIndex = 23; b.TextSize = 20; b:SetAttribute("SkinClose", true) end
local openPanel
openPanel = function(title, tabs, first)
  fitPanel(); panelTitle.Text = title; panelLayer.Visible = true; hudShow(false); resultLayer.Visible = false; if cancelAutoFn then cancelAutoFn() end
  for _, c in ipairs(tabRow:GetChildren()) do if c:IsA("GuiButton") then c:Destroy() end end
  local btns = {}
  local function sel(key)
    for k, b in pairs(btns) do b.BackgroundColor3 = k == key and Color3.fromRGB(160, 116, 40) or Color3.fromRGB(60, 52, 100) end
    clear(); views[key](); swapNow()   -- 다 그렸으면 바로 보이기
  end
  if #tabs > 1 then for i, t in ipairs(tabs) do local b = button(tabRow, t[1], UDim2.new(), UDim2.new(0, 120, 1, 0), function() sel(t[2]) end); b.LayoutOrder = i; b.ZIndex = 23; b.TextSize = 15; b:SetAttribute("SkinTab", true); btns[t[2]] = b end end
  local top = #tabs > 1 and 104 or 70; list.Position = UDim2.new(0, 16, 0, top); list.Size = UDim2.new(1, -32, 1, -top - 16)
  headStrip.Size = UDim2.new(1, -28, 0, top - 30); headDiv.Position = UDim2.new(0.5, 0, 0, top - 8)   -- 탭이 없으면 머리 띠도 얇게
  if not headStrip:GetAttribute("Art") then headStrip:SetAttribute("Art", true); local ha = Sprites.art("ui_header"); if ha then headStrip.ImageContent = ha.content end; local hd = Sprites.art("ui_divider"); if hd then headDiv.ImageContent = hd.content end end
  sel(first or tabs[1][2])
end
openPanelFn = openPanel

-- ── 설정 창: 일반(언어) · 그래픽 · 소리 · 베타 관리(게임 주인만) ──
local SoundService = game:GetService("SoundService")
local SND = {}   -- 소리 묶음: 나중에 넣는 소리는 SoundGroup 을 Music / SFX 로 지정하면 볼륨 설정을 따른다
for _, nm in ipairs({ "Music", "SFX" }) do SND[nm] = SoundService:FindFirstChild(nm) or Instance.new("SoundGroup"); SND[nm].Name = nm; SND[nm].Parent = SoundService end
local relayout
local function applyOpt()
  Stage.OPT.dmg = OPT.dmg; Stage.OPT.flash = OPT.flash
  local m = OPT.mute and 0 or OPT.master
  SND.Music.Volume = m * OPT.music; SND.SFX.Volume = m * OPT.sfx
end
local function setOpt(k, v)
  local uiChanged = k == "ui" and OPT.ui ~= v
  OPT[k] = v; applyOpt(); pcall(function() rpc:InvokeServer("setopt", { [k] = v }) end)
  if uiChanged and relayout then relayout() end
end
local SEL = Color3.fromRGB(160, 116, 40)
local function optRow(title, value, btns)   -- 한 줄: 제목 · (값) · 선택 버튼들
  local f = Instance.new("Frame"); f.BackgroundColor3 = Color3.fromRGB(24, 18, 15); f.Size = UDim2.new(1, -16, 0, 52); f.Parent = list; corner(f, 6); stroke(f, Color3.fromRGB(110, 84, 44), 1.2)
  local tl = label(f, title, 15, UDim2.new(0, 18, 0, 0), UDim2.new(0.42, 0, 1, 0)); tl.TextColor3 = Color3.fromRGB(240, 225, 200); tl.Font = Theme.FONT; tl.TextWrapped = true
  local row = mk("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -8, 0.5, 0), Size = UDim2.new(0.58, 0, 0, 36) }, f)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, VerticalAlignment = Enum.VerticalAlignment.Center, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, row)
  local order = 0
  for _, b in ipairs(btns) do
    order += 1
    if b.value then local l = label(row, b.value, 15, UDim2.new(), UDim2.new(0, b.w or 70, 1, 0)); l.TextXAlignment = Enum.TextXAlignment.Center; l.LayoutOrder = order
    else local x = button(row, b[1], UDim2.new(), UDim2.new(0, b.w or 96, 1, 0), b[2], b[3] and SEL or nil); x.LayoutOrder = order; if b.notr then x:SetAttribute("NoTr", true) end end
  end
end
local function pct(v) return math.floor(v * 100 + 0.5) .. "%" end
function views.set_general()
  clear()
  local function setLang(l) Lang.set(l); pcall(function() rpc:InvokeServer("setlang", l) end); views.set_general() end
  optRow("언어", nil, { { "English", function() setLang("en") end, Lang.lang == "en", notr = true }, { "한국어", function() setLang("ko") end, Lang.lang == "ko", notr = true } })
end
function views.set_graphics()
  clear()
  local function pick(k, v) setOpt(k, v); views.set_graphics() end
  optRow("화면 글자 · 버튼 크기", nil, { { "작게", function() pick("ui", 0.85) end, OPT.ui == 0.85 }, { "보통", function() pick("ui", 1) end, OPT.ui == 1 }, { "크게", function() pick("ui", 1.15) end, OPT.ui == 1.15 } })
  optRow("피해 숫자 표시", nil, { { "켜기", function() pick("dmg", true) end, OPT.dmg }, { "끄기", function() pick("dmg", false) end, not OPT.dmg } })
  optRow("피격 시 반짝임", nil, { { "끄기", function() pick("flash", 0) end, OPT.flash == 0 }, { "약하게", function() pick("flash", 0.5) end, OPT.flash == 0.5 }, { "보통", function() pick("flash", 1) end, OPT.flash == 1 } })
end
function views.set_sound()
  clear()
  local function vol(k, title)
    optRow(title, nil, { { "−", function() setOpt(k, math.max(0, math.floor(OPT[k] * 10 + 0.5) / 10 - 0.1)); views.set_sound() end, false, w = 44 }, { value = pct(OPT[k]) },
      { "+", function() setOpt(k, math.min(1, math.floor(OPT[k] * 10 + 0.5) / 10 + 0.1)); views.set_sound() end, false, w = 44 } })
  end
  vol("master", "전체 볼륨"); vol("music", "배경음악"); vol("sfx", "효과음")
  optRow("음소거", nil, { { "켜기", function() setOpt("mute", true); views.set_sound() end, OPT.mute }, { "끄기", function() setOpt("mute", false); views.set_sound() end, not OPT.mute } })
end
local isOwner = false
function views.set_beta()
  clear()
  local ok, r = pcall(function() return rpc:InvokeServer("beta", { op = "view" }) end)
  if not ok or r.err then card("게임 주인만 사용할 수 있습니다", {}, {}); return end
  local v = r.view
  local function op(o, val) local r2 = rpc:InvokeServer("beta", { op = o, v = val }); views.set_beta(); msg.Text = r2.msg or r2.err or "" end
  optRow("베타 입장", nil, { { "초대 전용", function() op("close") end, not v.open, w = 110 }, { "누구나", function() op("open") end, v.open, w = 110 } })
  card(string.format("테스터 %d명", #v.list), { "로블록스 닉네임으로 추가합니다. 게임 주인은 항상 입장할 수 있습니다." }, { { "추가", function() prompt("추가할 테스터의 로블록스 닉네임", "닉네임", function(nm) if nm ~= "" then op("add", nm) end end) end } })
  for _, x in ipairs(v.list) do card(x.name, { "UserId " .. x.id }, { { "삭제", function() op("remove", tostring(x.id)) end } }) end
  card("전체 우편 보내기", { "모든 플레이어의 우편함에 공지와 보상을 보냅니다. 보상 형식 예: gold=5000, ore=20 (gold · ore · hone · orbC · orbD · keys)" }, { { "보내기", function()
    prompt("우편 제목", "제목", function(title) if title == "" then return end
      prompt("내용", "내용", function(body)
        prompt("보상 (비우면 없음)", "gold=5000, ore=20", function(rw)
          local reward = {}; for k, val in string.gmatch(rw or "", "(%a+)%s*=%s*(%d+)") do reward[k] = tonumber(val) end
          local e = rpc:InvokeServer("mailsend", { title = title, body = body, reward = reward }); msg.Text = e.err and tostring(e.err) or "우편을 보냈습니다"
        end)
      end)
    end)
  end } })
end
function views.set_auto()
  clear()
  local function pick(k, v) setOpt(k, v); views.set_auto() end
  optRow("전투 후 자동 반복", nil, { { "끔", function() pick("auto", 0) end, OPT.auto == 0 }, { "같은 단계", function() pick("auto", 1) end, OPT.auto == 1 }, { "다음 단계", function() pick("auto", 2) end, OPT.auto == 2 } })
  optRow("장비 자동 분해", nil, { { "설정 열기", function() openPanel("장비", { { "장비", "inv" }, { "창고", "stash" } }); Menus.openAuto() end, false, w = 110 } })
  for i, nm in ipairs({ "일반", "희귀", "전설" }) do
    local k = "sr" .. i
    optRow(string.format("%s 아르카나", nm), nil, { { "유지", function() pick(k, 0) end, OPT[k] == 0 }, { "분해", function() pick(k, 1) end, OPT[k] == 1 } })
  end
  optRow("같은 아르카나 가장 좋은 1개는 유지", nil, { { "켜기", function() pick("sbest", true) end, OPT.sbest }, { "끄기", function() pick("sbest", false) end, not OPT.sbest } })
  card("자동 정리", { "장비는 가방의 [자동 분해] 설정대로 전투가 끝날 때마다 정리하고, 아르카나는 자동 반복 중에 위 규칙으로 정리합니다. 강화한 장비·사탄 장비, 장착·프리셋·룬·레벨업한 아르카나는 건드리지 않습니다." }, {})
end
local function openSettings()
  local tabs = { { "언어", "set_general" }, { "그래픽", "set_graphics" }, { "소리", "set_sound" } }
  table.insert(tabs, 3, { "자동 전투", "set_auto" })
  if isOwner then tabs[#tabs + 1] = { "베타 관리", "set_beta" } end
  openPanel("설정", tabs)
end

-- 새 메뉴 화면 연결 (장비 · 스킬 · 패시브 트리는 Menus 모듈)
local TAB_TITLE = { daily = "일일", forge = "대장간", inv = "장비", skills = "아르카나", pass = "패시브", stones = "돌", shop = "아르카나 상점", quests = "퀘스트" }
Menus.init({ rpc = rpc, list = list, msg = msg, clear = clear, done = function() swapNow() end, scale = function() return panelScale.Scale end, setSummary = setSummary, summary = function() return summary end, toast = toast, prompt = prompt, Sprites = Sprites,
  openTab = function(key) if key == "forge" or key == "stones" then openPanel("제련소", { { "대장간", "forge" }, { "돌", "stones" } }, key) else openPanel(TAB_TITLE[key] or key, { { TAB_TITLE[key] or key, key } }) end end, opt = function() return OPT end, setOpt = setOpt })
views.inv = Menus.inv; views.skills = Menus.skills; views.pass = Menus.pass
views.forge = Menus.forge; views.stones = Menus.stones; views.shop = Menus.shop; views.quests = Menus.quests; views.daily = Menus.daily
views.guild = Menus.guild; views.runes = Menus.runes; views.class = Menus.class; views.charm = Menus.charm; views.stats = Menus.stats; views.stash = Menus.stash; views.records = Menus.records; views.codex = Menus.codex; views.dummy = Menus.dummy; views.ranking = Menus.ranking; views.mail = Menus.mail; views.gacha = Menus.gacha; views.gachalist = Menus.gachalist; views.shop = Menus.gacha

-- ── 전투 시작 → 재생 → 결과 ──
-- 결과 창: 장식 틀 · 위 가장자리에 걸친 큰 승리/패배 띠(빛) · 전투 이름 · 시간·처치 줄 · 보상은 아이콘 칩 · 버튼
local resBox = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.55, 0), Size = UDim2.new(0, 660, 0, 360), BackgroundColor3 = Color3.fromRGB(16, 11, 10), ZIndex = 26 }, resultLayer)
corner(resBox, 14); Skin.frame(resBox, "ui_panel", 0.2, 0.55); local resScale = mk("UIScale", { Scale = K }, resBox)
local resGlow = mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0, 10), Size = UDim2.new(0, 520, 0, 170), BackgroundTransparency = 1, ImageTransparency = 0.35, ZIndex = 26 }, resBox)
local resBand = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0, 6), Size = UDim2.new(0, 340, 0, 70), BackgroundColor3 = Color3.fromRGB(40, 16, 14), ZIndex = 27 }, resBox)
corner(resBand, 10); Skin.frame(resBand, "ui_title", 0.3, 0.55)
local resTitle = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), Font = Theme.FONT, TextSize = 44, Text = "", ZIndex = 28 }, resBand)
mk("UIStroke", { Thickness = 3, Color = Color3.fromRGB(20, 6, 4) }, resTitle)
local resSub = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 20, 0, 50), Size = UDim2.new(1, -40, 0, 24), Font = Theme.FONT, TextSize = 18, TextColor3 = Color3.fromRGB(230, 215, 190), Text = "", ZIndex = 27 }, resBox)
local resStat = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 80), Size = UDim2.new(0, 0, 0, 30), AutomaticSize = Enum.AutomaticSize.X, BackgroundColor3 = Color3.fromRGB(8, 5, 4), BackgroundTransparency = 0.3, ZIndex = 27 }, resBox)
corner(resStat, 15); mk("UIPadding", { PaddingLeft = UDim.new(0, 16), PaddingRight = UDim.new(0, 16) }, resStat)
mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, VerticalAlignment = Enum.VerticalAlignment.Center, Padding = UDim.new(0, 18), SortOrder = Enum.SortOrder.LayoutOrder }, resStat)
local resText = mk("Frame", { Position = UDim2.new(0, 28, 0, 122), Size = UDim2.new(1, -56, 0, 128), BackgroundTransparency = 1, ZIndex = 27 }, resBox)   -- 보상 칩
mk("UIGridLayout", { CellSize = UDim2.new(0, 192, 0, 36), CellPadding = UDim2.new(0, 8, 0, 6), HorizontalAlignment = Enum.HorizontalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }, resText)
local resCount = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 24, 1, -96), Size = UDim2.new(1, -48, 0, 22), Font = Theme.FONT, TextSize = 16, TextColor3 = Color3.fromRGB(140, 255, 160), Text = "", ZIndex = 27 }, resBox)
local resBtns = mk("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -20), Size = UDim2.new(1, -40, 0, 46), ZIndex = 27 }, resBox)
mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Center, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, resBtns)
local function resChip(order, art, text, col)
  local f = mk("Frame", { BackgroundColor3 = Color3.fromRGB(26, 18, 14), LayoutOrder = order, ZIndex = 27 }, resText); corner(f, 8)
  mk("UIStroke", { Color = (col or Color3.fromRGB(200, 160, 90)):Lerp(Color3.new(0, 0, 0), 0.4), Thickness = 1.5 }, f)
  local a = art and Sprites.art(art)
  if a then mk("ImageLabel", { Position = UDim2.new(0, 6, 0.5, -13), Size = UDim2.new(0, 26, 0, 26), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 28 }, f) end
  local l = mk("TextLabel", { Position = UDim2.new(0, a and 38 or 10, 0, 0), Size = UDim2.new(1, a and -44 or -16, 1, 0), BackgroundTransparency = 1, Text = text, Font = Theme.FONT, TextScaled = true, TextColor3 = col or Color3.fromRGB(245, 232, 205), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 28 }, f)
  mk("UITextSizeConstraint", { MaxTextSize = 17, MinTextSize = 9 }, l)
end
local launch
local autoJob
local function cancelAuto() if autoJob then task.cancel(autoJob); autoJob = nil end end
cancelAutoFn = cancelAuto
local showResultPanel, tutAfterStage
showResultPanel = function(x, spec)
  resultLayer.Visible = true
  resTitle.Text = x.win and "승리" or "패배"; resTitle.TextColor3 = x.win and Color3.fromRGB(255, 220, 120) or Color3.fromRGB(255, 120, 110)
  do local ga = Sprites.art("fx_glow"); if ga then resGlow.ImageContent = ga.content; resGlow.ImageColor3 = x.win and Color3.fromRGB(255, 190, 90) or Color3.fromRGB(200, 40, 40) end end
  resBand.Size = UDim2.new(0, 260, 0, 54); TweenService:Create(resBand, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Size = UDim2.new(0, 340, 0, 70) }):Play()
  resSub.Text = spec.title or ""
  for _, c in ipairs(resStat:GetChildren()) do if c:IsA("TextLabel") then c:Destroy() end end
  for i, t in ipairs({ string.format("⏱ %.0f초", x.time or 0), string.format("☠ 처치 %d", x.kills or 0) }) do
    local l = mk("TextLabel", { Size = UDim2.new(0, 0, 1, 0), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1, Text = t, Font = Theme.FONT, TextSize = 16, TextColor3 = Color3.fromRGB(220, 205, 185), LayoutOrder = i, ZIndex = 28 }, resStat)
  end
  for _, c in ipairs(resText:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end
  local o = 0; local function chip(art, t, col) o += 1; resChip(o, art, t, col) end
  if x.first then chip(nil, "★ 최초 클리어!", Color3.fromRGB(255, 220, 120)) end
  if x.levelUps then chip(nil, "레벨 +" .. x.levelUps, Color3.fromRGB(150, 230, 255)) end
  if (x.gold or 0) > 0 then chip("i_gold", "골드 +" .. n(x.gold), Color3.fromRGB(255, 215, 110)) end
  if type(x.arcana) == "number" and x.arcana > 0 then chip("i_arcana", "아르카나 조각 +" .. x.arcana, Color3.fromRGB(240, 170, 255)) end
  if type(x.ore) == "number" and x.ore > 0 then chip("i_ore", "강화석 +" .. x.ore, Color3.fromRGB(170, 210, 255)) end
  if (x.orbC or 0) > 0 then chip("i_chaos", "혼돈 구슬 +" .. x.orbC, Color3.fromRGB(240, 120, 110)) end
  if x.items and #x.items > 0 then   -- 장비: 등급별 개수 (사탄 · 전설 · 레어 · 매직 · 일반)
    local cnt = {}; for _, it in ipairs(x.items) do local key = it.sat and 4 or (it.rarity or 0); cnt[key] = (cnt[key] or 0) + 1 end
    local NM = { [0] = "일반", "매직", "레어", "전설", "사탄" }
    local COL = { [0] = Color3.fromRGB(205, 205, 215), Color3.fromRGB(110, 160, 255), Color3.fromRGB(255, 214, 70), Color3.fromRGB(255, 150, 40), Color3.fromRGB(255, 70, 60) }
    for r = 4, 0, -1 do if cnt[r] then chip("i_weapon", string.format("%s 장비 %d개", NM[r], cnt[r]), COL[r]) end end
  end
  if x.skills and #x.skills > 0 then chip("i_arcana", "아르카나 " .. #x.skills .. "장", Color3.fromRGB(240, 170, 255)) end
  if x.stones and x.stones > 0 then chip("i_stone", "돌 +" .. x.stones, Color3.fromRGB(160, 220, 255)) end
  if x.charms and #x.charms > 0 then chip(nil, "참 " .. #x.charms .. "개", Color3.fromRGB(255, 190, 230)) end
  if x.stonesHi then chip("i_stone", "계시의 돌 +1", Color3.fromRGB(255, 220, 140)) end
  if x.sockTix then chip(nil, "세공의 인장 +1", Color3.fromRGB(200, 170, 255)) end
  if o == 0 then chip(nil, x.win and "보상 없음" or "다시 도전해 보세요 · 장비 · 아르카나 · 패시브를 강화하면 이길 수 있어요", Color3.fromRGB(200, 190, 180)) end
  local note = x.note or (x.notes and x.notes[1]); if note then chip(nil, tostring(note), Color3.fromRGB(200, 190, 180)) end
  for _, c in ipairs(resBtns:GetChildren()) do if c:IsA("GuiButton") then c:Destroy() end end
  cancelAuto(); resCount.Text = ""
  if x.win and spec.stage and tutAfterStage then task.delay(0.6, function() tutAfterStage(spec.stage) end) end
  local function rb(i, t, cb, col) local b = button(resBtns, t, UDim2.new(), UDim2.new(0, 112, 1, 0), function() cancelAuto(); cb() end, col); b.LayoutOrder = i; b.ZIndex = 28; b.TextSize = 16; return b end
  local nxt = spec.nextSpec and spec.nextSpec()
  if nxt then rb(1, "다음 ▶", function() launch(nxt) end, Color3.fromRGB(200, 140, 40)) end
  if not spec.noRetry then rb(2, "다시 도전", function() launch(spec) end, Color3.fromRGB(60, 110, 210)) end
  rb(3, "지도", function() setScreen("map") end); rb(4, "마을", function() setScreen("town") end)
  local AUTO_TXT = { [0] = "자동 반복: 끔", "자동: 같은 단계", "자동: 다음 단계" }
  if not spec.noRetry then rb(5, AUTO_TXT[OPT.auto] or AUTO_TXT[0], function() setOpt("auto", (OPT.auto + 1) % 3); showResultPanel(x, spec) end, OPT.auto > 0 and Color3.fromRGB(60, 165, 80) or Color3.fromRGB(70, 66, 90)) end
  -- 자동 분해: 전투가 끝날 때마다 가방에 규칙 적용 (가방 · 설정에서 정함)
  do
    task.spawn(function()
      local ok, e = pcall(function() return rpc:InvokeServer("autoclean", { after = true }) end)
      if ok and e.res and e.res.n > 0 then setSummary(e.summary); toast(string.format("자동 정리: 장비 %d개 · 골드 +%s · 강화석 +%s", e.res.n, n(e.res.gold), n(e.res.ore))) end
    end)
  end
  -- 자동 반복 (웹 autoNext): 이기면 3초 뒤 같은/다음 단계를 다시 시작, 끝날 때마다 자동 정리 규칙 적용. 지면 멈춘다
  if OPT.auto > 0 and not spec.noRetry then
    if not x.win then resCount.Text = "패배해서 자동 반복을 멈췄습니다"; return end
    local target = (OPT.auto == 2 and nxt) or spec
    autoJob = task.spawn(function()
      for i = 3, 1, -1 do resCount.Text = string.format("자동 반복: %d초 후 시작", i); task.wait(1) end
      autoJob = nil
      if OPT.sr1 + OPT.sr2 + OPT.sr3 > 0 then
        local ok, e = pcall(function() return rpc:InvokeServer("skillclean", { rules = { OPT.sr1, OPT.sr2, OPT.sr3 }, best = OPT.sbest }) end)
        if ok and e.res and e.res.sold > 0 then setSummary(e.summary); toast(string.format("아르카나 정리: %d개 분해 · 아르카나 조각 +%s", e.res.sold, n(e.res.arcana or 0))) end
      end
      launch(target)
    end)
  end
end
-- x4 배속 게임패스 (4x Speed, 한 번 사면 영구)
local SPEED4_ID = 2063961736
local owns4 = false
local MPS = game:GetService("MarketplaceService")
local function buy4() pcall(function() MPS:PromptGamePassPurchase(player, SPEED4_ID) end) end
MPS.PromptGamePassPurchaseFinished:Connect(function(p, id, bought)
  if p == player and id == SPEED4_ID and bought then
    owns4 = true; toast("x4 배속을 쓸 수 있습니다!", Color3.fromRGB(140, 255, 160))
    if mainStage and mainStage.hud then mainStage.hud.owns4 = true; mainStage.spdOpts[4].Text = "x4" end
  end
end)
-- ── 상점 (로벅스): 마을 왼쪽 [상점] 버튼. 개발자 상품 · 게임패스 ID 를 채우면 판매가 열린다 ──
local SHOP = {
  { kind = "pass", id = SPEED4_ID, name = "x4 배속", desc = "전투 재생을 x4 배속으로 볼 수 있습니다 (x1~x3 은 무료). 한 번 사면 영구.", owned = function() return owns4 end },
  { kind = "product", id = 0, name = "보석 꾸러미", desc = "아르카나 소환에 쓰는 보석." },
  { kind = "pass", id = 0, name = "가방 확장", desc = "가방 · 창고 +100칸 (영구)." },
  { kind = "pass", id = 0, name = "골드 +50%", desc = "전투에서 얻는 골드 1.5배 (영구)." },
}
function views.robux()
  clear()
  for _, it in ipairs(SHOP) do
    local btn
    if it.owned and it.owned() then btn = { "보유 중", function() end }
    elseif it.id ~= 0 then
      local price = "구매"
      local ok, info = pcall(function() return MPS:GetProductInfo(it.id, it.kind == "pass" and Enum.InfoType.GamePass or Enum.InfoType.Product) end)
      if ok and info and info.PriceInRobux then price = tostring(info.PriceInRobux) .. " R$" end
      btn = { price, function() pcall(function() if it.kind == "pass" then MPS:PromptGamePassPurchase(player, it.id) else MPS:PromptProductPurchase(player, it.id) end end) end }
    else btn = { "준비 중", function() toast("곧 판매할 예정입니다") end } end
    card(it.name, { it.desc }, { btn })
  end
end
local function hudInfo(spec)
  local sk = {}
  local ok, r = pcall(function() return rpc:InvokeServer("skills") end)
  if ok and r.rows then
    table.sort(r.rows, function(a, b) return a.slot < b.slot end)
    for _, k in ipairs(r.rows) do if k.slot > 0 then local col, icon, d = Menus.skStyle(k.id); sk[#sk + 1] = { id = k.id, name = k.name, cd = d and d.cd, color = col, icon = icon } end end
  end
  return { title = spec.title, level = summary and summary.level, maxHp = summary and summary.maxHp, skills = sk, speed = OPT.speed, owns4 = owns4,
    onSpeed = function(i) setOpt("speed", i) end, onBuy4 = buy4 }
end
local busy = false
launch = function(spec)
  if busy then return end
  busy = true; local ok, r = pcall(spec.call); busy = false
  if not ok then toast("요청 실패: " .. tostring(r), Color3.fromRGB(255, 150, 150)); return end
  if r.err then toast(r.err, Color3.fromRGB(255, 160, 160)); return end
  closePanel(); setScreen("battle")
  local x = r.result
  local function done()
    if x.kills and mainStage.killLbl then mainStage.killLbl.Text = string.format("☠  처치 %d", x.kills) end   -- 화면에 나오기 전에 죽은 몹까지 서버 수치로 맞춘다
    setSummary(r.summary); showResultPanel(x, spec)
  end
  if x.replay and x.replay.snaps and #x.replay.snaps > 0 then mainStage:play(x.replay, done, 40, hudInfo(spec)) else done() end
end
showResult = function(r) launch({ call = function() return r end, noRetry = true }) end

-- 전투 종류
local stageSpec, riftSpec, towerSpec
stageSpec = function(k) return { stage = k, title = k == 5 and "스테이지 5 — 들판의 군주 그룸" or ("스테이지 " .. k), call = function() return rpc:InvokeServer("fight", { kind = "stage", n = k }) end,
  nextSpec = function() if k < 5 and summary.cleared >= k then return stageSpec(k + 1) elseif k == 5 and summary.cleared >= 5 then return riftSpec(math.min(100, summary.riftBest + 1)) end end } end
riftSpec = function(f) return { title = "심연의 균열 " .. f .. "층", call = function() return rpc:InvokeServer("fight", { kind = "rift", n = f }) end,
  nextSpec = function() if f < 100 and summary.riftBest >= f then return riftSpec(f + 1) end end } end
towerSpec = function(f) return { title = "솟아난 탑 " .. f .. "층", call = function() return rpc:InvokeServer("battle", f) end,
  nextSpec = function() if f < 100 and summary.best >= f then return towerSpec(f + 1) end end } end
local function playSpec(title, arg) return { title = title, call = function() return rpc:InvokeServer("play", arg) end } end

-- ── 마을 (웹 초원 마을: 건물을 눌러 기능을 연다. 비슷한 기능은 한 건물에 탭으로 묶었다) ──
local BUILD = {   -- 건물은 배경 그림(bg/town.jpg)에 함께 그려져 있다. box = 그림 기준 영역(x0, y0, x1, y1), 이름은 영역 아래쪽에
  { key = "b_guild", name = "길드", box = { 0.206, 0.17, 0.434, 0.47 }, tabs = { { "길드", "guild" }, { "랭킹", "ranking" } } },
  { key = "b_skill_shop", name = "아르카나 소환", box = { 0.455, 0.06, 0.635, 0.50 }, tabs = { { "아르카나 소환", "gacha" }, { "아르카나 목록", "gachalist" } } },
  { key = "b_notice", name = "안내소", box = { 0.67, 0.20, 0.815, 0.51 }, tabs = { { "우편함", "mail" }, { "도움말", "help" }, { "도감", "codex" }, { "기록", "records" } } },
  { key = "b_trainer", name = "훈련소", box = { 0.0, 0.38, 0.25, 0.59 }, badge = "pass", tabs = { { "패시브", "pass" }, { "허수아비", "dummy" }, { "전직", "class" }, { "참", "charm" } } },
  { key = "b_quest_board", name = "퀘스트 게시판", box = { 0.83, 0.38, 0.99, 0.65 }, badge = "quest", tabs = { { "퀘스트", "quests" }, { "일일", "daily" } } },
  { key = "b_skill_hall", name = "아르카나 정비소", box = { 0.06, 0.53, 0.335, 0.85 }, tabs = { { "아르카나", "skills" }, { "룬", "runes" } } },
  { key = "b_forge", name = "제련소", box = { 0.338, 0.53, 0.553, 0.87 }, smoke = { 0.375, 0.0 }, tabs = { { "대장간", "forge" }, { "돌", "stones" } } },
  { key = "b_shop", name = "창고", box = { 0.565, 0.60, 0.837, 0.885 }, tabs = { { "창고", "stash" }, { "장비", "inv" } } },   -- 장비 보관 (가방 아이콘과 같은 창, 창고 먼저)
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
    if bg then cover(townLayer, bg, W, H, 1) end
    if bg then   -- 마을 생동감: 그림 속 화로 · 횃불 · 창문 자리(그림 기준 비율)를 화면 좌표로 옮겨 불 · 빛을 얹는다
      local sw, sh = bg.w, bg.h; if bg.w / bg.h > W / H then sw = bg.h * W / H else sh = bg.w * H / W end
      local ox, oy = (bg.w - sw) / 2, bg.h - sh
      local function P(u, v) return (u * bg.w - ox) / sw, (v * bg.h - oy) / sh end
      local function L(u, v, r) local x, y = P(u, v); return { x, y, r * bg.h / sh } end
      -- 불: 배경에 그려진 불을 그대로 일렁이게 하는 패치(ArtMap.PATCHES) + 화로 둘레 은은한 빛 (따로 그린 불꽃은 쓰지 않는다)
      local patches = {}
      local okP, AM = pcall(require, RS.Game.Data.ArtMap)
      for _, pt in ipairs(okP and AM.PATCHES and AM.PATCHES.bg_town or {}) do
        local x0, y0 = P(pt.x, pt.y); local x1, y1 = P(pt.x + pt.w, pt.y + pt.h)
        patches[#patches + 1] = { key = pt.key, x = x0, y = y0, w = x1 - x0, h = y1 - y0 }
      end
      local lights = {}
      for _, l in ipairs({ { 0.027, 0.73, 0.05 }, { 0.051, 0.50, 0.035 }, { 0.323, 0.37, 0.035 }, { 0.628, 0.385, 0.035 }, { 0.212, 0.44, 0.03 }, { 0.419, 0.77, 0.06 }, { 0.057, 0.38, 0.03 }, { 0.877, 0.375, 0.03 }, { 0.53, 0.33, 0.06 } }) do lights[#lights + 1] = L(l[1], l[2], l[3]) end
      local _, cy0 = P(0, 0.0); local _, cy1 = P(0, 0.12)
      Ambient.attach(townLayer, { z = 2, patches = patches, lights = lights, clouds = { math.max(cy0, 0.01), cy1, 3 }, birds = true, embers = 10 })
    else mk("UIGradient", { Color = ColorSequence.new(Color3.fromRGB(120, 180, 230), Color3.fromRGB(90, 150, 80)), Rotation = 90 }, townLayer) end
    -- 건물: 배경 속 건물 위에 보이지 않는 누름 영역. 마우스를 올리면 그 건물에 은은한 빛, 이름 글씨가 또렷해진다 (상자 · 테두리 없음)
    local sw, sh = bg and bg.w or W, bg and bg.h or H
    if bg then if bg.w / bg.h > W / H then sw = bg.h * W / H else sh = bg.w * H / W end end
    local ox, oy = bg and (bg.w - sw) / 2 or 0, bg and (bg.h - sh) or 0
    local function SP(u, v) if not bg then return u * W, v * H end; return (u * bg.w - ox) / sw * W, (v * bg.h - oy) / sh * H end
    local glowArt = Sprites.art("fx_glow")
    for _, b in ipairs(BUILD) do
      local x0, y0 = SP(b.box[1], b.box[2]); local x1, y1 = SP(b.box[3], b.box[4])
      local bw, bh = x1 - x0, y1 - y0
      local glow = glowArt and mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, (x0 + x1) / 2, 0, (y0 + y1) / 2), Size = UDim2.new(0, bw * 1.25, 0, bh * 1.15), BackgroundTransparency = 1,
        ImageContent = glowArt.content, ImageColor3 = Color3.fromRGB(255, 200, 140), ImageTransparency = 1, ZIndex = 3 }, townLayer)
      local hit = mk("TextButton", { Position = UDim2.new(0, x0, 0, y0), Size = UDim2.new(0, bw, 0, bh), BackgroundTransparency = 1, Text = "", AutoButtonColor = false, ZIndex = 4 }, townLayer)
      local nm = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, (x0 + x1) / 2, 0, y1 - 6), Size = UDim2.new(0, 220, 0, 28), BackgroundTransparency = 1, Text = b.name,
        Font = Theme.FONT, TextSize = 20, TextColor3 = Color3.fromRGB(240, 222, 196), TextTransparency = 0.15, ZIndex = 6 }, townLayer)
      local ns = mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(12, 6, 4), Transparency = 0.1 }, nm); mk("UIScale", { Scale = K }, nm)
      local function hover(on)
        if glow then TweenService:Create(glow, TweenInfo.new(0.18), { ImageTransparency = on and 0.72 or 1 }):Play() end
        TweenService:Create(nm, TweenInfo.new(0.18), { TextTransparency = on and 0 or 0.15, TextColor3 = on and Color3.fromRGB(255, 236, 190) or Color3.fromRGB(240, 222, 196), TextSize = on and 23 or 20 }):Play()
      end
      hit.MouseEnter:Connect(function() hover(true) end); hit.MouseLeave:Connect(function() hover(false) end)
      hit:SetAttribute("Key", b.key); hit.MouseButton1Click:Connect(function() openPanel(b.name, b.tabs) end)
      if b.smoke then Ambient.smoke(hit, b.smoke[1], b.smoke[2]) end   -- 대장간 굴뚝 연기
      -- 알림: 이름 옆 작은 붉은 불씨
      if b.badge then
        local d = mk("Frame", { AnchorPoint = Vector2.new(0, 0.5), Position = UDim2.new(1, 8, 0.5, 0), Size = UDim2.new(0, 10, 0, 10), BackgroundColor3 = Color3.fromRGB(255, 80, 60), Visible = false, ZIndex = 7 }, nm); corner(d)
        mk("UIStroke", { Thickness = 1.5, Color = Color3.fromRGB(60, 10, 6) }, d)
        badgeDots[b.badge] = d
        nm.Size = UDim2.new(0, 0, 0, 28); nm.AutomaticSize = Enum.AutomaticSize.X
      end
    end
  end
  updateBadges()
end

-- ── 월드맵 (웹 data.js buildMap 과 같은 배치: 초원 마을 → 스테이지 1~5 → 심연의 균열 → 갈래 → 솟아난 탑) ──
local MW, MH = 1800, 1100
local MAPICON = { T = "mi_town", R = "mi_rift", RE = "mi_endless", RB = "mi_bossgate", RG = "mi_vault", RX = "mi_abyssdoor", RTW = "mi_tower", RTP = "mi_temple", RR = "mi_raid", RWD = "mi_warden", RCD = "mi_truedungeon", RTW2 = "mi_newtower" }   -- 지도 아이콘 그림 (art/mapicon)
local NODES, BYID = {}, {}
local mapTarget   -- 지도에서 다음 목표 지점 버튼 (튜토리얼이 짚는다)
local function node(t) NODES[#NODES + 1] = t; BYID[t.id] = t; return t end
-- 위치는 월드맵 그림(map/world.jpg)에 맞춤: 왼쪽 아래 마을 → 길을 따라 스테이지 → 가운데 보라 균열 → 오른쪽 위 화산 고원(탑)
node({ id = "T", name = "초원 마을", icon = "🏠", x = 250, y = 790, col = Color3.fromRGB(230, 200, 140) })
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
local HUB = { { "void", "공허의 군주 모르가스", "keys", "공허의 열쇠" }, { "hive", "화염 정령왕 아스카", "keys2", "불씨의 징표" }, { "titan", "철갑의 투사 그라크", "keys3", "철갑의 징표" },
  { "storm", "뇌제 라이곤", "keys4", "뇌전의 징표" }, { "frost", "서리 여왕 글라시아", "keys5", "서리의 징표" }, { "poison", "독니의 군주 베노크", "keys6", "맹독의 징표" } }
-- 지도 전용 창: 지점을 누르면 화면 가운데 큰 창. 층이 있는 곳(균열 · 탑)은 왼쪽에 층 목록, 보스 관문은 보스 목록, 나머지는 설명 · 난이도 · 입장
infoCard = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.53, 0), Size = UDim2.new(0, 820, 0, 470), BackgroundColor3 = Color3.fromRGB(16, 11, 10), Visible = false, ZIndex = 15 }, hud)
local infoScale = mk("UIScale", { Scale = K }, infoCard)
local MP = {   -- 지점별 소개 글
  T = "마을로 돌아가 장비 · 아르카나 · 퀘스트를 정비합니다.",
  R = "끝없이 이어지는 심연의 균열. 층을 처음 깰 때마다 레벨이 오르고, 5층마다 보스가 지킵니다. 10층부터는 층마다 정해진 변형이 붙습니다. 100층을 깨면 졸업하고 새 콘텐츠가 열립니다.",
  RTW = "심연의 문지기를 쓰러뜨리자 솟아난 붉은 탑. 20층마다 벽이 있어 장비를 갖춰야 넘을 수 있습니다. 벽 층을 처음 넘으면 사탄 장비 1개가 확정으로 나옵니다.",
  RE = "쉬지 않고 몰려오는 적을 상대로 오래 버틸수록 보상이 커집니다. 하루 입장 횟수가 정해져 있습니다.",
  RG = "금화와 보따리가 쏟아지는 보물고. 골드 위주 보상입니다. 운이 좋으면 거대 보물상자가 나타납니다.",
  RX = "심연의 문지기 모르가스와의 레이드. 결계석을 부숴 가며 싸워야 합니다. 처음 쓰러뜨리면 붉은 탑이 솟아오릅니다.",
  RB = "6명의 군주가 기다리는 관문. 열쇠 1개로 입장하며 단계가 높을수록 강하고 보상이 좋습니다. 처치하면 보스 전용 아르카나가 나옵니다.",
  RTP = "계시의 돌과 세공의 인장을 얻는 신전. 솟아난 탑을 높이 오를수록 더 깊은 단계가 열립니다.",
  RR = "탑에서 내려온 붉은 군단의 본거지. 난이도마다 처음 깨면 전직의 서를 얻습니다.",
  RCD = "하드 레이드를 깨고 3차 전직을 마친 사람만 들어올 수 있습니다. 참이 나옵니다.",
  RWD = "문지기가 공명 구슬을 계속 만들어 냅니다. 구슬은 아르카나가 통하지 않아 직접 눌러 터뜨려야 합니다.",
  RTW2 = "20층까지 이어지는 새 탑입니다.",
}
local BOSSCOL = { void = Color3.fromRGB(200, 120, 255), hive = Color3.fromRGB(255, 160, 90), titan = Color3.fromRGB(220, 205, 180), storm = Color3.fromRGB(255, 230, 90), frost = Color3.fromRGB(150, 225, 255), poison = Color3.fromRGB(140, 255, 110) }
local mpSel = {}   -- 창마다 고른 층 · 보스 · 단계 (다시 열어도 유지)
local function showInfo(t)
  infoCard:ClearAllChildren(); infoCard:SetAttribute("Skinned", nil); infoCard.BackgroundTransparency = 0
  corner(infoCard, 12); Skin.frame(infoCard, "ui_panel", 0.2, 0.5)   -- 노란 테두리 없이 장식 틀만; infoScale = mk("UIScale", { Scale = K }, infoCard)
  local st, hint, prog = nodeState(t)
  local s = summary; local my = s.power or 0
  local okP, PW = pcall(require, RS.Game.Power)
  local CF = require(RS.Game.Data.Config).CFG
  local function L(parent, text, size, pos, sz, col, xa, wrap)
    local l = mk("TextLabel", { BackgroundTransparency = 1, Position = pos, Size = sz, Text = text, Font = Theme.FONT, TextSize = size, TextColor3 = col or Color3.fromRGB(230, 220, 205),
      TextXAlignment = xa or Enum.TextXAlignment.Left, TextYAlignment = wrap and Enum.TextYAlignment.Top or Enum.TextYAlignment.Center, TextWrapped = wrap or false, ZIndex = 17 }, parent)
    return l
  end
  -- 머리: 지도 아이콘 · 이름 · 진행
  local ic = Sprites.art(st == "locked" and "mi_lock" or MAPICON[t.id] or (t.stage and (t.stage == 5 and "mi_boss" or "mi_stage")) or "")
  if ic then mk("ImageLabel", { Position = UDim2.new(0, 22, 0, 14), Size = UDim2.new(0, 64, 0, 64), BackgroundTransparency = 1, ImageContent = ic.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 17 }, infoCard) end
  local tl = L(infoCard, t.name, 30, UDim2.new(0, 98, 0, 16), UDim2.new(1, -200, 0, 36), Color3.fromRGB(255, 222, 150)); mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(12, 6, 4) }, tl)
  L(infoCard, prog and ("기록 " .. prog) or (st == "done" and "클리어 ✓" or ""), 15, UDim2.new(0, 100, 0, 52), UDim2.new(1, -200, 0, 20), Color3.fromRGB(190, 175, 150))
  do local b = button(infoCard, "X", UDim2.new(1, -58, 0, 16), UDim2.new(0, 40, 0, 40), function() infoCard.Visible = false end, Color3.fromRGB(130, 44, 64)); b.ZIndex = 18; b:SetAttribute("SkinClose", true) end
  mk("Frame", { Position = UDim2.new(0, 22, 0, 88), Size = UDim2.new(1, -44, 0, 2), BackgroundColor3 = Color3.fromRGB(120, 92, 48), BorderSizePixel = 0, ZIndex = 17 }, infoCard)
  local body = mk("Frame", { Position = UDim2.new(0, 22, 0, 100), Size = UDim2.new(1, -44, 1, -120), BackgroundTransparency = 1, ZIndex = 16 }, infoCard)
  if st == "locked" then
    L(body, MP[t.id] or "", 17, UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 0, 120), nil, nil, true)
    L(body, "🔒 " .. (hint or "아직 열리지 않았습니다"), 20, UDim2.new(0, 0, 1, -40), UDim2.new(1, 0, 0, 36), Color3.fromRGB(255, 140, 120), Enum.TextXAlignment.Center)
    infoCard.Visible = true; return
  end
  -- 오른쪽(또는 전체) 정보 칸: refresh 로 내용만 다시 채운다
  local hasList = t.id == "R" or t.id == "RTW" or t.id == "RB"
  local left = hasList and mk("ScrollingFrame", { Size = UDim2.new(0, 230, 1, 0), BackgroundColor3 = Color3.fromRGB(12, 8, 7), BackgroundTransparency = 0.2, BorderSizePixel = 0, ScrollBarThickness = 5,
    ScrollBarImageColor3 = Color3.fromRGB(150, 115, 60), CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ZIndex = 17 }, body)
  if left then corner(left, 8); stroke(left, Color3.fromRGB(90, 68, 36), 1.5); mk("UIListLayout", { Padding = UDim.new(0, 3), SortOrder = Enum.SortOrder.LayoutOrder }, left); mk("UIPadding", { PaddingTop = UDim.new(0, 6), PaddingLeft = UDim.new(0, 6), PaddingRight = UDim.new(0, 10), PaddingBottom = UDim.new(0, 6) }, left) end
  local R = mk("Frame", { Position = UDim2.new(0, hasList and 250 or 0, 0, 0), Size = UDim2.new(1, hasList and -250 or 0, 1, 0), BackgroundTransparency = 1, ZIndex = 17 }, body)
  local function clearR() for _, c in ipairs(R:GetChildren()) do c:Destroy() end end
  local y
  local function line(text, size, col, h) local l = L(R, text, size or 16, UDim2.new(0, 0, 0, y), UDim2.new(1, 0, 0, h or 24), col, nil, (h or 24) > 26); y += (h or 24) + 4; return l end
  local function recLine(rec)   -- 권장 전투력 · 내 전투력 (넘으면 초록)
    if not rec then return end
    local ok = my >= rec
    line(string.format("권장 전투력  %s", n(rec)), 18, Color3.fromRGB(255, 205, 110))
    line(string.format("내 전투력  %s   %s", n(my), ok and "✓ 충분합니다" or "▼ 부족합니다"), 16, ok and Color3.fromRGB(140, 235, 140) or Color3.fromRGB(255, 130, 110))
  end
  local function tabs(list, cur, onPick)   -- 난이도 · 단계 고르기
    local f = mk("Frame", { Position = UDim2.new(0, 0, 0, y), Size = UDim2.new(1, 0, 0, 40), BackgroundTransparency = 1, ZIndex = 17 }, R); y += 48
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, f)
    for i, it in ipairs(list) do
      local b = button(f, it.text, UDim2.new(), UDim2.new(0, it.w or 110, 1, 0), function() if it.ok ~= false then onPick(i) end end, i == cur and Color3.fromRGB(200, 150, 60) or Color3.fromRGB(70, 66, 70))
      b.LayoutOrder = i; b.ZIndex = 18; b.TextSize = 15; if it.ok == false then b.AutoButtonColor = false; b.TextTransparency = 0.5 end
    end
  end
  local function go(text, cb)   -- 입장 버튼 (오른쪽 아래)
    local b = button(R, text, UDim2.new(1, -230, 1, -54), UDim2.new(0, 230, 0, 54), cb, Color3.fromRGB(170, 60, 60)); b.ZIndex = 18; b.TextSize = 20
  end
  -- 층 목록 (균열 · 탑): 깬 층 ✓ · 보스 층 · 벽 층 표시, 고르면 목록은 그대로 두고 색만 바꾼다
  local rows = {}
  local function floorList(maxN, best, cur, mark, onPick)
    local shown = math.min(100, maxN + 3)
    for f = 1, shown do
      local lock = f > maxN
      local b = mk("TextButton", { Size = UDim2.new(1, 0, 0, 34), BackgroundColor3 = Color3.fromRGB(30, 22, 18), AutoButtonColor = false, Text = "", LayoutOrder = -f, ZIndex = 18 }, left); corner(b, 6)
      local sk = mk("UIStroke", { Color = Color3.fromRGB(70, 52, 30), Thickness = 1, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
      local tag, tcol = mark(f)
      L(b, string.format("%d층", f), 17, UDim2.new(0, 10, 0, 0), UDim2.new(0.5, 0, 1, 0), lock and Color3.fromRGB(110, 100, 95) or (f <= best and Color3.fromRGB(170, 160, 145) or Color3.fromRGB(245, 232, 205))).ZIndex = 19
      L(b, (f <= best and "✓ " or "") .. (tag or ""), 14, UDim2.new(0.45, 0, 0, 0), UDim2.new(0.55, -8, 1, 0), tcol or Color3.fromRGB(140, 220, 140), Enum.TextXAlignment.Right).ZIndex = 19
      rows[f] = { b = b, sk = sk }
      if not lock then b.MouseButton1Click:Connect(function() onPick(f) end) end
    end
    local function paint(c) for f, r in pairs(rows) do r.b.BackgroundColor3 = f == c and Color3.fromRGB(90, 60, 26) or Color3.fromRGB(30, 22, 18); r.sk.Color = f == c and GOLD or Color3.fromRGB(70, 52, 30); r.sk.Thickness = f == c and 2 or 1 end end
    paint(cur)
    task.defer(function() local r = rows[cur]; if r and left.Parent then left.CanvasPosition = Vector2.new(0, math.max(0, r.b.AbsolutePosition.Y - left.AbsolutePosition.Y + left.CanvasPosition.Y - left.AbsoluteSize.Y / 2)) end end)
    return paint
  end
  if t.id == "R" or t.id == "RTW" then
    local isR = t.id == "R"
    local best = isR and s.riftBest or s.best
    local maxN = math.min(100, best + 1)
    local cur = math.clamp(mpSel[t.id] or maxN, 1, maxN)
    local paint
    local function refresh()
      clearR(); y = 0; mpSel[t.id] = cur; if paint then paint(cur) end
      local tt = L(R, string.format("%d층", cur), 34, UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 0, 40), Color3.fromRGB(255, 225, 160)); mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(12, 6, 4) }, tt); y = 46
      if isR then
        recLine(okP and PW.recRift(cur) or nil)
        local okM, mods = pcall(function() return require(RS.Game.Battle).riftMods(cur) end)
        if okM and #mods > 0 then for _, m in ipairs(mods) do line(string.format("변형 · %s: %s", m.name, m.text), 14, Color3.fromRGB(215, 160, 255), 40) end end
        line(string.format("드랍: 장비 T%d · 아르카나 조각 · 골드%s", math.min(5, math.floor(cur / 20) + 1), cur % 5 == 0 and " · 보스 보상" or ""), 15, Color3.fromRGB(150, 210, 255))
        if cur > best then line("처음 깨면 레벨이 1 오릅니다.", 15, Color3.fromRGB(200, 190, 175)) end
      else
        recLine(okP and CF.SPIRE and PW.recTier(CF.SPIRE.TAB[cur], true) or nil)
        local wall = cur % 20 == 0
        line(wall and "🧱 벽 층: 처음 넘으면 사탄 장비 1개 확정" or string.format("다음 벽 %d층", math.min(100, math.ceil(cur / 20) * 20)), 15, wall and Color3.fromRGB(255, 150, 120) or Color3.fromRGB(200, 190, 175))
        line("드랍: 장비(전설 비중 높음) · 사탄 장비 확률 · 구슬 · 조각 · 골드", 15, Color3.fromRGB(150, 210, 255), 40)
      end
      if y <= 350 - 130 then L(R, MP[t.id], 14, UDim2.new(0, 0, 1, -130), UDim2.new(1, 0, 0, 70), Color3.fromRGB(175, 165, 150), nil, true) end   -- 정보가 길면 소개 글은 생략 (겹치지 않게)
      go(string.format("%d층 도전", cur), function() launch(isR and riftSpec(cur) or towerSpec(cur)) end)
      -- 위 · 아래 한 층씩
      local up = button(R, "▲", UDim2.new(1, -330, 1, -54), UDim2.new(0, 44, 0, 54), function() if cur < maxN then cur += 1; refresh() end end, Color3.fromRGB(70, 66, 70)); up.ZIndex = 18
      local dn = button(R, "▼", UDim2.new(1, -282, 1, -54), UDim2.new(0, 44, 0, 54), function() if cur > 1 then cur -= 1; refresh() end end, Color3.fromRGB(70, 66, 70)); dn.ZIndex = 18
    end
    paint = floorList(maxN, best, cur, function(f)
      if isR then if f % 5 == 0 then return "보스", Color3.fromRGB(255, 120, 100) end
      else if f % 20 == 0 then return "벽", Color3.fromRGB(255, 150, 120) end end
    end, function(f) cur = f; refresh() end)
    refresh()
  elseif t.id == "RB" then
    local okM, Mon = pcall(require, RS.Game.Data.Monsters)
    local cur = mpSel.RB or 1; local stage = mpSel.RBs or 1; local upper = mpSel.RBu or false
    local brow = {}
    local function refresh()
      clearR(); y = 0; mpSel.RB, mpSel.RBs, mpSel.RBu = cur, stage, upper
      for i, r in ipairs(brow) do r.b.BackgroundColor3 = i == cur and Color3.fromRGB(90, 60, 26) or Color3.fromRGB(30, 22, 18); r.sk.Color = i == cur and GOLD or Color3.fromRGB(70, 52, 30) end
      local hb = HUB[cur]; local col = BOSSCOL[hb[1]] or Color3.new(1, 1, 1)
      local tt = L(R, hb[2], 28, UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 0, 36), col); mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(12, 6, 4) }, tt); y = 42
      local desc
      if okM then
        if Mon.EB[hb[1]] then desc = Mon.EB[hb[1]].boss.desc else for _, bd in ipairs(Mon.BOSSES) do if bd.id == "void" then desc = bd.desc end end end
      end
      if desc then line(desc, 14, Color3.fromRGB(205, 195, 180), 40) end
      tabs({ { text = "관문", w = 90 }, { text = "상위 관문", w = 120, ok = U.up } }, upper and 2 or 1, function(i) upper = i == 2; refresh() end)
      tabs({ { text = "1단계", w = 84 }, { text = "2단계", w = 84 }, { text = "3단계", w = 84 }, { text = "4단계", w = 84 } }, stage, function(i) stage = i; refresh() end)
      local tiers = upper and U.upTiers or U.gateTiers
      recLine(okP and tiers and PW.recTier(tiers[stage]) or nil)
      local have, need = U[hb[3]] or 0, upper and 5 or 1
      line(string.format("%s  %d개 (입장에 %d개)", hb[4], have, need), 16, have >= need and Color3.fromRGB(255, 220, 140) or Color3.fromRGB(255, 130, 110))
      if upper and not U.up then line("상위 관문은 노말 레이드를 깬 뒤 열립니다.", 14, Color3.fromRGB(255, 140, 120)) end
      go(string.format("%d단계 입장", stage), function() launch(playSpec(string.format("%s %d단계", hb[2], stage), { kind = hb[1], vsel = stage, upper = upper or nil })) end)
    end
    for i, hb in ipairs(HUB) do
      local b = mk("TextButton", { Size = UDim2.new(1, 0, 0, 52), BackgroundColor3 = Color3.fromRGB(30, 22, 18), AutoButtonColor = false, Text = "", LayoutOrder = i, ZIndex = 18 }, left); corner(b, 6)
      local sk = mk("UIStroke", { Color = Color3.fromRGB(70, 52, 30), Thickness = 1.5, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
      L(b, hb[2], 15, UDim2.new(0, 10, 0, 4), UDim2.new(1, -16, 0, 24), BOSSCOL[hb[1]]).ZIndex = 19
      L(b, string.format("%s %d개", hb[4], U[hb[3]] or 0), 13, UDim2.new(0, 10, 0, 26), UDim2.new(1, -16, 0, 20), Color3.fromRGB(180, 170, 155)).ZIndex = 19
      brow[i] = { b = b, sk = sk }
      b.MouseButton1Click:Connect(function() cur = i; refresh() end)
    end
    refresh()
  else
    y = 0
    local function refresh(fn) clearR(); y = 0; fn() end
    local function intro() line(MP[t.id] or "", 17, Color3.fromRGB(225, 215, 200), 80) end
    if t.id == "T" then intro(); go("마을로", function() infoCard.Visible = false; setScreen("town") end)
    elseif t.stage then
      line(t.stage == 5 and "초원의 보스, 들판의 군주 그룸. 쓰러뜨리면 심연의 균열이 열립니다." or string.format("초원 %d번째 전투. 몬스터를 모두 쓰러뜨리세요.", t.stage), 17, Color3.fromRGB(225, 215, 200), 60)
      line(string.format("권장 레벨 %d", t.stage), 17, Color3.fromRGB(255, 205, 110))
      go("도전", function() launch(stageSpec(t.stage)) end)
    elseif t.id == "RE" then intro(); line(string.format("오늘 남은 입장  %d회", U.endlessLeft or 0), 18, Color3.fromRGB(255, 205, 110)); go("입장", function() launch(playSpec("무한 균열", { kind = "endless" })) end)
    elseif t.id == "RG" then intro(); go("입장", function() launch(playSpec("황금 보물고", { kind = "vault" })) end)
    elseif t.id == "RX" then intro(); recLine(okP and PW.recTier(CF.RIFT_END) or nil); go("도전", function() launch(playSpec("심연의 문", { kind = "raid" })) end)
    elseif t.id == "RTP" then
      local open = 0; for _, need in ipairs(CF.TEMPLE.NEED) do if need == 0 or (U.spireBest or 0) >= need then open += 1 end end
      local cur = math.clamp(mpSel.RTP or open, 1, math.max(1, open))
      local function draw()
        refresh(function()
          intro()
          local list = {}; for i = 1, #CF.TEMPLE.TIERS do list[i] = { text = string.format("%d단계", i), w = 96, ok = i <= open } end
          tabs(list, cur, function(i) cur = i; mpSel.RTP = i; draw() end)
          recLine(okP and PW.recTier(CF.TEMPLE.TIERS[cur], true) or nil)
          if open < #CF.TEMPLE.TIERS then line(string.format("다음 단계: 솟아난 탑 %d층", CF.TEMPLE.NEED[open + 1]), 15, Color3.fromRGB(200, 190, 175)) end
          go(string.format("%d단계 입장", cur), function() launch(playSpec("돌의 신전 " .. cur .. "단계", { kind = "temple", vsel = cur })) end)
        end)
      end
      draw()
    elseif t.id == "RR" then
      local names = { "이지", "노말", "하드" }
      local open = 1 + ((U.craidDone and U.craidDone[1]) and 1 or 0) + ((U.craidDone and U.craidDone[1] and U.craidDone[2]) and 1 or 0)
      local cur = math.clamp(mpSel.RR or open, 1, open)
      local function draw()
        refresh(function()
          intro()
          local list = {}; for i = 1, 3 do list[i] = { text = names[i] .. ((U.craidDone and U.craidDone[i]) and " ✓" or ""), w = 110, ok = i <= open } end
          tabs(list, cur, function(i) cur = i; mpSel.RR = i; draw() end)
          recLine(okP and PW.recTier(CF.CRAID.TIERS[cur + 1], true) or nil)
          line(string.format("처음 깨면 %d차 전직의 서", cur), 15, Color3.fromRGB(255, 220, 140))
          go("레이드 " .. names[cur] .. " 입장", function() launch(playSpec("레이드 던전 " .. names[cur], { kind = "craid", diff = cur })) end)
        end)
      end
      draw()
    elseif t.id == "RCD" then intro(); recLine(okP and PW.recTier(CF.CRAID.TIERS[4], true) or nil); go("입장", function() launch(playSpec("참 던전", { kind = "craid", diff = 3, charm = true })) end)
    elseif t.id == "RWD" then intro(); go("입장", function() infoCard.Visible = false; openPanel("새 문지기", { { "문지기", "warden" } }) end)
    elseif t.id == "RTW2" then intro()
      local b2 = button(R, "1층부터", UDim2.new(1, -420, 1, -54), UDim2.new(0, 170, 0, 54), function() launch({ title = "새 탑", call = function() return rpc:InvokeServer("tower2", 1) end }) end, Color3.fromRGB(70, 66, 70)); b2.ZIndex = 18
      go("다음 층 도전", function() launch({ title = "새 탑", call = function() return rpc:InvokeServer("tower2", 99) end }) end)
    end
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
  -- 지도 생동감: 균열 협곡의 보랏빛 · 용암 빛이 숨쉬듯 밝아지고, 불씨가 피어오르고, 구름 · 까마귀가 지나간다
  local RIFTC, LAVAC = Color3.fromRGB(200, 60, 255), Color3.fromRGB(255, 90, 30)
  Ambient.attach(mapLayer, { z = 2, clouds = { 0.0, 0.18 }, birds = true, embers = 60,
    lights = { { 0.50, 0.40, 0.10, RIFTC }, { 0.47, 0.70, 0.09, RIFTC }, { 0.44, 0.20, 0.07, RIFTC }, { 0.56, 0.85, 0.07, RIFTC },
      { 0.80, 0.30, 0.07, LAVAC }, { 0.92, 0.55, 0.07, LAVAC }, { 0.72, 0.62, 0.06, LAVAC }, { 0.95, 0.12, 0.08, LAVAC }, { 0.66, 0.08, 0.06, LAVAC } },
    -- 협곡 안개: 보랏빛 · 분홍 안개가 협곡을 따라 피어오른다
    mists = { { 0.40, 0.56, 0.15, 0.95, Color3.fromRGB(235, 90, 200), 14 }, { 0.42, 0.54, 0.25, 0.9, Color3.fromRGB(170, 70, 255), 10 } } })
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
      do   -- 지도 아이콘 그림 (잠긴 곳은 자물쇠): 원형 메달이라 바탕 · 글자를 감춘다
        local mi = Sprites.art(st == "locked" and "mi_lock" or MAPICON[t.id] or (t.stage and (t.stage == 5 and "mi_boss" or "mi_stage")) or "")
        if mi then b.BackgroundTransparency = 1; b.TextTransparency = 1; ring.Transparency = t == target and 0 or 1
          mk("ImageLabel", { Size = UDim2.new(1.25, 0, 1.25, 0), AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), BackgroundTransparency = 1, ImageContent = mi.content, ScaleType = Enum.ScaleType.Fit,
            ImageColor3 = st == "locked" and Color3.fromRGB(150, 140, 140) or Color3.new(1, 1, 1), ZIndex = b.ZIndex }, b)
          if t.stage and t.stage < 5 then local nn = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(0.6, 0, 0.6, 0), BackgroundTransparency = 1, Text = tostring(t.stage), TextScaled = true, Font = Theme.FONT, TextColor3 = Color3.fromRGB(255, 240, 210), ZIndex = b.ZIndex + 1 }, b); mk("UIStroke", { Thickness = 2.5, Color = Color3.new(0, 0, 0) }, nn) end
        end
      end
      ring.Transparency = 1   -- 노란 테두리는 쓰지 않는다
      if t == target then mapTarget = b end
      if t == target then   -- 다음 목표: 금빛 빛무리 + 위에서 까딱이는 표식
        local ga = Sprites.art("fx_glow")
        if ga then local g = mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, t.x * ms, 0, t.y * ms), Size = UDim2.new(0, sz * 3, 0, sz * 3), BackgroundTransparency = 1, ImageContent = ga.content, ImageColor3 = Color3.fromRGB(255, 210, 120), ImageTransparency = 0.35, ZIndex = 4 }, mapLayer)
          TweenService:Create(g, TweenInfo.new(0.9, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { ImageTransparency = 0.7, Size = UDim2.new(0, sz * 2.4, 0, sz * 2.4) }):Play() end
        local ar = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0, t.x * ms, 0, t.y * ms - sz * 0.6), Size = UDim2.new(0, 30 * K, 0, 26 * K), BackgroundTransparency = 1, Text = "▼", TextScaled = true, Font = Theme.FONT, TextColor3 = Color3.fromRGB(255, 220, 130), ZIndex = 7 }, mapLayer)
        mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(30, 12, 4) }, ar)
        TweenService:Create(ar, TweenInfo.new(0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Position = ar.Position - UDim2.new(0, 0, 0, 8 * K) }):Play()
      end
      if st ~= "locked" then local ga = Sprites.art("fx_glow")   -- 열린 지점 뒤 빛 (숨쉬기)
        if ga then local g = mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, t.x * ms, 0, t.y * ms), Size = UDim2.new(0, sz * 2.4, 0, sz * 2.4), BackgroundTransparency = 1, ImageContent = ga.content, ImageColor3 = t.col, ImageTransparency = 0.55, ZIndex = 4 }, mapLayer)
          TweenService:Create(g, TweenInfo.new(1.4 + math.random() * 0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { ImageTransparency = 0.85, Size = UDim2.new(0, sz * 2.0, 0, sz * 2.0) }):Play() end
      end
      if st == "done" then local c = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(1, -4, 0, 4), Size = UDim2.new(0, 20 * K, 0, 20 * K), BackgroundColor3 = Color3.fromRGB(60, 190, 90), Text = "✓", TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBlack, TextSize = math.floor(14 * K), ZIndex = 6 }, b); corner(c) end
      local nm = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0, t.x * ms, 0, t.y * ms + sz / 2 + 2), Size = UDim2.new(0, 160 * K, 0, 20 * K), BackgroundTransparency = 1, Text = t.name, TextColor3 = st == "locked" and Color3.fromRGB(200, 195, 210) or Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = math.floor(14 * K), ZIndex = 5 }, mapLayer)
      mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(20, 10, 30) }, nm)
      b.MouseButton1Click:Connect(function() if not mapDragged then showInfo(t) end end)
    end
  end
  local f = target or BYID.T   -- 다음 목표가 화면 가운데 오게
  mapLayer.CanvasPosition = Vector2.new(math.clamp(f.x * ms - v.X / 2, 0, math.max(0, MW * ms - v.X)), math.clamp(f.y * ms - v.Y / 2, 0, math.max(0, MH * ms - v.Y)))
end

-- 보스 관문: 보스 6종 × 1~4단계 (상위 관문은 열쇠 5개, 노말 레이드 클리어 후) — 서버 Content.play 가 단계·열쇠를 확인한다
local function hubView(upper)
  clear()
  local okU, ru = pcall(function() return rpc:InvokeServer("unlocks") end); if okU and ru.u then U = ru.u end
  card(upper and "상위 보스 관문" or "보스 관문", { upper and "열쇠 5개 · 노말 레이드를 클리어해야 열립니다. 더 높은 등급의 아르카나가 나옵니다." or "열쇠 1개로 입장합니다. 단계가 높을수록 강하고 보상이 좋습니다." }, {})
  for _, b in ipairs(HUB) do
    local have = U[b[3]] or 0
    local btns = {}
    for st = 1, 4 do btns[st] = { string.format("%d단계", st), function() launch(playSpec(string.format("%s %d단계", b[2], st), { kind = b[1], vsel = st, upper = upper or nil })) end } end
    card(b[2], { string.format("%s %d개", b[4], have) }, btns)
  end
end
function views.bosshub() hubView(false) end
function views.bosshub_up() hubView(true) end

-- 지도 끌어서 이동 (PC 마우스: ScrollingFrame 은 마우스 끌기를 지원하지 않는다. 터치는 기본 스크롤 사용)
do
  local UIS = game:GetService("UserInputService")
  local drag
  mapLayer.InputBegan:Connect(function(io)
    if io.UserInputType == Enum.UserInputType.MouseButton1 then drag = { start = io.Position, canvas = mapLayer.CanvasPosition }; mapDragged = false end
  end)
  UIS.InputChanged:Connect(function(io)
    if drag and io.UserInputType == Enum.UserInputType.MouseMovement then
      local d = io.Position - drag.start
      if d.Magnitude > 6 then mapDragged = true end
      local maxX = math.max(0, mapLayer.AbsoluteCanvasSize.X - mapLayer.AbsoluteWindowSize.X)
      local maxY = math.max(0, mapLayer.AbsoluteCanvasSize.Y - mapLayer.AbsoluteWindowSize.Y)
      mapLayer.CanvasPosition = Vector2.new(math.clamp(drag.canvas.X - d.X, 0, maxX), math.clamp(drag.canvas.Y - d.Y, 0, maxY))
    end
  end)
  UIS.InputEnded:Connect(function(io)
    if io.UserInputType == Enum.UserInputType.MouseButton1 and drag then drag = nil; task.defer(function() mapDragged = false end) end
  end)
end

-- 이동 버튼
dock.MouseButton1Click:Connect(function() closePanel(); setScreen(screen == "map" and "town" or "map") end)
-- 메뉴 아이콘 (오른쪽 위)
topButton(1, "m_bag", "🎒", "가방", function() openPanel("장비", { { "장비", "inv" }, { "창고", "stash" } }) end)
topButton(2, "m_skill", "📘", "아르카나", function() openPanel("아르카나", { { "아르카나", "skills" }, { "룬", "runes" } }) end)
topButton(3, "m_passive", "✦", "패시브", function() openPanel("패시브", { { "패시브", "pass" } }) end)
topButton(3.5, "m_stats", "📊", "스탯", function() openPanel("스탯", { { "스탯", "stats" } }) end)
shopBtn = mk("TextButton", { Name = "ShopBtn", Position = UDim2.new(0, 12, 0, INSET + 8 + 158 * K), Size = UDim2.new(0, 150, 0, 60), BackgroundColor3 = Color3.fromRGB(150, 50, 50), Text = "", AutoButtonColor = false, ZIndex = 11 }, hud)
corner(shopBtn, 10); stroke(shopBtn, GOLD, 2); local shopScale = mk("UIScale", { Scale = K }, shopBtn); Skin.frame(shopBtn, "ui_btn_red", 0.3, 0.5)
do
  local a = Sprites.art("m_shop")
  if a then mk("ImageLabel", { Position = UDim2.new(0, 6, 0.5, -26), Size = UDim2.new(0, 52, 0, 52), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 13 }, shopBtn)
  else mk("TextLabel", { Position = UDim2.new(0, 6, 0, 0), Size = UDim2.new(0, 52, 1, 0), BackgroundTransparency = 1, Text = "💎", TextSize = 30, ZIndex = 13 }, shopBtn) end
  local l = mk("TextLabel", { Position = UDim2.new(0, 60, 0, 0), Size = UDim2.new(1, -66, 1, 0), BackgroundTransparency = 1, Text = "상점", TextSize = 26, Font = Theme.FONT, TextColor3 = Color3.fromRGB(255, 235, 200), ZIndex = 13 }, shopBtn)
  mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(20, 6, 6) }, l)
end
shopBtn.MouseButton1Click:Connect(function() openPanel("상점", { { "상점", "robux" } }) end)
statLbl.InputBegan:Connect(function(io) if io.UserInputType == Enum.UserInputType.MouseButton1 or io.UserInputType == Enum.UserInputType.Touch then openPanel("스탯", { { "스탯", "stats" } }) end end)
topButton(4, "m_quest", "📜", "퀘스트", function() openPanel("퀘스트", { { "퀘스트", "quests" }, { "일일", "daily" } }) end)
topButton(5, "m_gacha", "🔮", "소환", function() openPanel("아르카나 소환", { { "아르카나 소환", "gacha" }, { "아르카나 목록", "gachalist" } }) end)
topButton(6, "m_mail", "✉", "우편", function() openPanel("우편함", { { "우편함", "mail" } }) end)
topButton(7, "m_settings", "⚙", "설정", function() openSettings() end)

-- 시작 직업 고르기 (새 계정 첫 접속): 전사(검) / 마법사(지팡이) → 무기 · 스타터 스킬 3개 · 아르카나 조각
-- 튜토리얼 (새 계정): 직업 선택 → 스킬 소환 → 스킬 칸 → 스테이지 1. 스테이지 1~4를 처음 깰 때마다 한 가지씩 알려 주고, 나머지는 [안내소 → 도움말]로 넘긴다
local coachBox, coachHl
local function coachClose() if coachBox then coachBox:Destroy(); coachBox = nil end; if coachHl then coachHl:Destroy(); coachHl = nil end; if coachShade then coachShade:Destroy(); coachShade = nil end end
local coach_hl
local coachShade
coach_hl = function(target)   -- 눌러야 할 곳: 둥근 금빛 테두리(빛이 테두리를 따라 돎) + 숨쉬는 바깥 빛 + 통통 튀는 화살표, 나머지 화면은 어둡게 덮어 누를 수 없게
    if coachShade then coachShade:Destroy() end
    coachShade = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 44 }, gui)
    local sides = {}
    for i = 1, 4 do sides[i] = mk("TextButton", { BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, BorderSizePixel = 0, Text = "", AutoButtonColor = false, ZIndex = 44 }, coachShade) end
    local shade = coachShade
    coachHl = mk("Frame", { BackgroundTransparency = 1, ZIndex = 45 }, gui)
    local hl = coachHl
    local glow = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(1, 10, 1, 10), BackgroundTransparency = 1, ZIndex = 45 }, hl)
    corner(glow, 18); local gs = mk("UIStroke", { Color = Color3.fromRGB(255, 190, 90), Thickness = 10, Transparency = 0.75 }, glow)
    TweenService:Create(glow, TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Size = UDim2.new(1, 22, 1, 22) }):Play()
    TweenService:Create(gs, TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Transparency = 0.92 }):Play()
    local ring = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 46 }, hl)
    corner(ring, 14); local rs = mk("UIStroke", { Color = Color3.new(1, 1, 1), Thickness = 2, Transparency = 0.25 }, ring)
    local grad = mk("UIGradient", { Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(150, 90, 30)), ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 240, 190)), ColorSequenceKeypoint.new(1, Color3.fromRGB(150, 90, 30)) }) }, rs)
    TweenService:Create(grad, TweenInfo.new(2.2, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut, -1), { Rotation = 360 }):Play()
    -- 금빛 고딕 모서리 장식 4개 (art/ui/tut_corner.png 를 돌려 네 귀퉁이에)
    local corners = {}
    local ca = Sprites.art("tut_corner")
    for i = 1, 4 do
      local c = mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), BackgroundTransparency = 1, Rotation = (i - 1) * 90, ZIndex = 47, ScaleType = Enum.ScaleType.Fit }, gui)
      if ca then c.ImageContent = ca.content end
      corners[i] = c
    end
    -- 가리키는 화살표 (art/ui/tut_arrow.png, 없으면 글자)
    local aa = Sprites.art("tut_arrow")
    local arrow = mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.new(0, 92, 0, 92), BackgroundTransparency = 1, ZIndex = 47, ScaleType = Enum.ScaleType.Fit }, gui)
    if aa then arrow.ImageContent = aa.content else local t = mk("TextLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, Text = "▼", TextScaled = true, TextColor3 = Color3.fromRGB(255, 215, 120), ZIndex = 47 }, arrow); t:SetAttribute("NoTr", true) end
    -- 테두리를 따라 흩날리는 불티
    local sparks = {}
    for i = 1, 10 do local sp = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.new(0, 4, 0, 4), BackgroundColor3 = Color3.fromRGB(255, 200, 110), BorderSizePixel = 0, ZIndex = 47 }, gui); corner(sp, 2); sparks[i] = { f = sp, ph = i / 10, sp = 0.18 + (i % 3) * 0.05 } end
    local t0 = os.clock()
    local conn; conn = game:GetService("RunService").RenderStepped:Connect(function()
      if not hl.Parent or not target.Parent then
        conn:Disconnect(); if hl.Parent then hl:Destroy() end; if shade.Parent then shade:Destroy() end; arrow:Destroy()
        for _, c in ipairs(corners) do c:Destroy() end; for _, x in ipairs(sparks) do x.f:Destroy() end; return
      end
      local o = gui.AbsolutePosition   -- 화면 좌표 → 이 화면(안전 영역 기준) 좌표: 이 차이를 빼지 않으면 위로 밀린다
      local p, z = target.AbsolutePosition - o, target.AbsoluteSize
      hl.Position = UDim2.new(0, p.X - 6, 0, p.Y - 6); hl.Size = UDim2.new(0, z.X + 12, 0, z.Y + 12)
      local bob = math.abs(math.sin((os.clock() - t0) * 4)) * 10
      local below = target.AbsolutePosition.Y - o.Y < 90   -- 화면 위쪽 버튼이면 아래에서 위로 가리킨다
      arrow.Rotation = below and 180 or 0
      arrow.Position = below and UDim2.new(0, p.X + z.X / 2, 0, p.Y + z.Y + 52 + bob) or UDim2.new(0, p.X + z.X / 2, 0, p.Y - 52 - bob)
      local tm = os.clock() - t0
      local cs = math.clamp(math.min(z.X, z.Y) * 0.95, 64, 110); local br = 6 + math.abs(math.sin(tm * 3)) * 5   -- 모서리가 안팎으로 숨쉰다
      local cx = { p.X - br, p.X + z.X + br, p.X + z.X + br, p.X - br }; local cy = { p.Y - br, p.Y - br, p.Y + z.Y + br, p.Y + z.Y + br }
      local sx, sy = { 1, -1, -1, 1 }, { 1, 1, -1, -1 }   -- 그림 속 꺾인 꼭짓점이 그림 가장자리에서 16% 안쪽이므로 중심을 그만큼 대상 쪽으로
      for i, c in ipairs(corners) do c.Size = UDim2.new(0, cs, 0, cs); c.Position = UDim2.new(0, cx[i] + sx[i] * cs * 0.34, 0, cy[i] + sy[i] * cs * 0.34) end
      local per = 2 * (z.X + z.Y + 24)
      for _, x in ipairs(sparks) do   -- 테두리 둘레를 돌며 깜빡이는 불티
        local d = ((tm * x.sp + x.ph) % 1) * per; local px, py
        local W, Hh = z.X + 12, z.Y + 12
        if d < W then px, py = p.X - 6 + d, p.Y - 6 elseif d < W + Hh then px, py = p.X + z.X + 6, p.Y - 6 + (d - W) elseif d < 2 * W + Hh then px, py = p.X + z.X + 6 - (d - W - Hh), p.Y + z.Y + 6 else px, py = p.X - 6, p.Y + z.Y + 6 - (d - 2 * W - Hh) end
        x.f.Position = UDim2.new(0, px, 0, py); x.f.BackgroundTransparency = 0.2 + 0.6 * math.abs(math.sin(tm * 6 + x.ph * 9))
      end
      local x0, y0, x1, y1 = p.X - 4, p.Y - 4, p.X + z.X + 4, p.Y + z.Y + 4
      sides[1].Position = UDim2.new(0, 0, 0, 0); sides[1].Size = UDim2.new(1, 0, 0, math.max(0, y0))                    -- 위
      sides[2].Position = UDim2.new(0, 0, 0, y1); sides[2].Size = UDim2.new(1, 0, 1, -y1)                               -- 아래
      sides[3].Position = UDim2.new(0, 0, 0, y0); sides[3].Size = UDim2.new(0, math.max(0, x0), 0, y1 - y0)              -- 왼쪽
      sides[4].Position = UDim2.new(0, x1, 0, y0); sides[4].Size = UDim2.new(1, -x1, 0, y1 - y0)                         -- 오른쪽
    end)
end
local function coach(title, text, btns, target)
  coachClose()
  coachBox = mk("Frame", { AnchorPoint = Vector2.new(0, 1), Position = UDim2.new(0, 12, 1, -12),   -- 화면 아래 (열린 창의 버튼을 가리지 않게)
    Size = UDim2.new(0, 460, 0, 200), BackgroundColor3 = Color3.fromRGB(16, 11, 10), ZIndex = 46 }, gui)
  corner(coachBox, 10); stroke(coachBox, GOLD, 2.5); mk("UIScale", { Scale = K }, coachBox); Skin.frame(coachBox, "ui_panel", 0.2, 0.5)
  local tl = mk("TextLabel", { Position = UDim2.new(0, 30, 0, 16), Size = UDim2.new(1, -60, 0, 30), BackgroundTransparency = 1, Text = title, TextSize = 22, Font = Theme.FONT, TextColor3 = Color3.fromRGB(255, 220, 140), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 47 }, coachBox)
  mk("UIStroke", { Thickness = 2, Color = Color3.new(0, 0, 0) }, tl)
  mk("TextLabel", { Position = UDim2.new(0, 30, 0, 50), Size = UDim2.new(1, -60, 0, 96), BackgroundTransparency = 1, Text = text, TextSize = 16, TextWrapped = true, Font = Theme.FONT, TextColor3 = Color3.fromRGB(230, 220, 205), TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 47 }, coachBox)
  local row = mk("Frame", { AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -30, 1, -18), Size = UDim2.new(1, -32, 0, 40), BackgroundTransparency = 1, ZIndex = 47 }, coachBox)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, row)
  for i, bt in ipairs(btns) do local b = button(row, bt[1], UDim2.new(), UDim2.new(0, bt[3] or 130, 1, 0), bt[2], bt[4] or Color3.fromRGB(200, 150, 60)); b.LayoutOrder = i; b.ZIndex = 48; b.TextSize = 16 end
  if target then coach_hl(target) end
end
local function tutSet(n) task.spawn(function() local ok, e = pcall(function() return rpc:InvokeServer("tut", n) end); if ok and e and e.summary then setSummary(e.summary) end end) end
-- 따라 하기 튜토리얼: 짚어 준 곳을 실제로 눌러야 다음으로 넘어간다 (버튼은 "튜토리얼 건너뛰기"뿐)
-- guide(제목, 글, 찾기 함수, 완료 신호): 찾기 함수가 지금 눌러야 할 버튼을 돌려주면 금빛 테두리가 따라간다 (창이 바뀌면 다시 찾음)
local tutStep, tutWait, tutNext
local function findBtn(pred) for _, d in ipairs(gui:GetDescendants()) do if d:IsA("GuiButton") and d.Visible and pred(d) then return d end end end
local function hasText(d, t)
  if d.Text and string.find(d:GetAttribute("_src") or d.Text, t, 1, true) then return true end
  for _, l in ipairs(d:GetDescendants()) do if l:IsA("TextLabel") and string.find(l:GetAttribute("_src") or l.Text, t, 1, true) then return true end end
  return false
end
local function skipAll() coachClose(); tutStep, tutWait, tutNext = nil, nil, nil; tutSet(99) end
local function guide(title, text, finder, waitFor, nextFn)
  coach(title, text, { { "튜토리얼 건너뛰기", skipAll, 170, Color3.fromRGB(70, 66, 70) } })
  tutWait, tutNext = waitFor, nextFn
  local box = coachBox
  task.spawn(function()   -- 눌러야 할 곳을 계속 다시 찾아 테두리를 옮긴다
    local cur
    while coachBox == box and box.Parent do
      local t = finder and finder() or nil
      if t ~= cur then cur = t; if coachHl then coachHl:Destroy(); coachHl = nil end; if coachShade then coachShade:Destroy(); coachShade = nil end; if t then coach_hl(t) end end
      task.wait(0.3)
    end
  end)
end
Menus.onPulled = function() if tutSignal then tutSignal("pulled") end end
tutSignal = function(ev)   -- 소환을 닫음(pulled) · 전투력이 바뀜(power) · 전투 시작(battle) 이 오면 다음 단계
  if tutWait and ev == tutWait then local f = tutNext; tutWait, tutNext = nil, nil; coachClose(); if f then task.delay(0.4, f) end end
end
local function closeBtn() for _, c in ipairs(root:GetChildren()) do if c:IsA("TextButton") and c:GetAttribute("SkinClose") then return c end end end
local function topBtn(name) local b = topBar:FindFirstChild(name); return b and b.Visible and b or nil end
tutorial = function(step)
  tutStep = step
  local cls = summary and summary.hero == "mage" and "마법사" or "전사"
  if step == 0 then
    coach("환영합니다, " .. cls .. "!", "Arcana Slayer는 자동 전투 게임입니다. 캐릭터는 알아서 싸우고, 여러분은 아르카나 · 장비 · 패시브로 캐릭터를 강하게 만듭니다. 빛나는 곳을 차례로 눌러 보세요!",
      { { "건너뛰기", skipAll, 110, Color3.fromRGB(70, 66, 70) }, { "시작", function() tutorial(1) end } })
  elseif step == 1 then
    guide("아르카나 소환", "시작 선물로 아르카나 조각 90개를 드렸어요. 위 메뉴의 [소환]을 열고 빛나는 [10회 소환]을 눌러 카드 10장을 뽑으세요. 다 보고 화면을 누르면 다음으로 넘어갑니다.",
      function() if panelLayer.Visible then return findBtn(function(d) return d.AbsoluteSize.Y > 40 and hasText(d, "10회 소환") end) end; return topBtn("m_gacha") end,
      "pulled", function() tutorial(2) end)
  elseif step == 2 then
    guide("아르카나 칸", "전투에서는 위쪽 칸에 넣은 아르카나만 씁니다. [아르카나]를 열고 빛나는 새 카드를 누른 뒤 [N번 칸에]를 누르세요.",
      function()
        local pt = panelTitle:GetAttribute("_src") or panelTitle.Text
        if not panelLayer.Visible then return topBtn("m_skill") end
        if pt ~= "아르카나" then return closeBtn() end
        return findBtn(function(d) return hasText(d, "번 칸에") end) or findBtn(function(d) return d.AbsoluteSize.X > 50 and d.AbsoluteSize.X < 70 and d.AbsoluteSize.Y > 80 end)
      end,
      "power", function() tutorial(3) end)
  elseif step == 3 then
    tutSet(3)
    guide("첫 전투", "창을 닫고 오른쪽 아래 [지도]를 누른 뒤, 금빛 ▼ 표시가 있는 [초원 1]을 누르고 [도전]하세요. 전투는 자동으로 진행됩니다.",
      function()
        if panelLayer.Visible then return closeBtn() end
        if screen ~= "map" then return dock end
        if infoCard.Visible then return findBtn(function(d) return d:IsDescendantOf(infoCard) and d.AbsoluteSize.X > 150 end) end
        return mapTarget
      end,
      "battle", nil)
  end
end
-- 초원 1~3 을 처음 깼을 때: 장비 → 패시브 → 강화 를 직접 해 보게 (전투력이 바뀌면 다음), 4 는 안내만
local function leaveBattleBtn() return findBtn(function(d) return d:IsDescendantOf(resultLayer) and hasText(d, "마을") end) end
local TUT_STAGE = {
  { "장비 장착", "전투에서 장비를 얻었어요! 마을로 나가 위 메뉴 [가방]을 열고 [자동 장착]을 누르세요. 초록 ▲ 는 지금보다 좋은 장비입니다.",
    function() if screen == "battle" then return leaveBattleBtn() end; if not panelLayer.Visible then return topBtn("m_bag") end; return findBtn(function(d) return hasText(d, "자동 장착") end) end },
  { "패시브", "레벨이 올라 패시브 포인트가 생겼어요. 위 메뉴 [패시브]를 열고 [자동 배분]을 누르세요. 나중에는 노드를 직접 눌러 찍을 수도 있어요.",
    function() if screen == "battle" then return leaveBattleBtn() end; if not panelLayer.Visible then return topBtn("m_passive") end; return findBtn(function(d) return hasText(d, "자동 배분") end) end },
  { "장비 강화", "마을 [제련소]에서 장비를 강화하면 전투력이 오릅니다. 무기를 골라 빛나는 [강화] 버튼을 눌러 보세요.",
    function()
      if screen == "battle" then return leaveBattleBtn() end
      if not panelLayer.Visible then if screen == "town" then local b; for _, d in ipairs(townLayer:GetChildren()) do if d:IsA("TextButton") and d:GetAttribute("Key") == "b_forge" then b = d end end; return b end; return dock end
      return findBtn(function(d) return hasText(d, "강화") and d.AbsoluteSize.X < 200 and d.AbsoluteSize.Y > 30 end)
    end },
}
tutAfterStage = function(k)
  local tt = summary and summary.tut
  if not tt or tt >= 99 or tt >= 3 + k then return end
  if k == 4 then tutSet(99)
    coach("보스와 그 너머", "다음은 들판의 군주 그룸! 왼쪽 위 전투력을 지도 창의 권장 전투력과 비교해 보세요. 그룸을 쓰러뜨리면 심연의 균열이 열립니다. 막히면 마을 [안내소 → 도움말]을 보세요.",
      { { "알겠어요", function() coachClose() end, 110 }, { "도움말 보기", function() coachClose(); openPanel("안내소", { { "도움말", "help" } }) end, 150 } }); return
  end
  local T = TUT_STAGE[k]; if not T then return end
  tutSet(3 + k)
  guide(T[1], T[2], T[3], "power", nil)
end
showStartPick = function()
  local ov = mk("TextButton", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(6, 3, 3), BackgroundTransparency = 0.08, Text = "", AutoButtonColor = false, ZIndex = 40 }, gui)
  local t = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0.04, 0), Size = UDim2.new(0.8, 0, 0.08, 0), BackgroundTransparency = 1, Text = "길을 고르세요", TextScaled = true, Font = Theme.FONT, TextColor3 = Color3.fromRGB(255, 220, 140), ZIndex = 42 }, ov)
  mk("UIStroke", { Thickness = 3, Color = Color3.new(0, 0, 0) }, t)
  local sub = mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0.12, 0), Size = UDim2.new(0.8, 0, 0.04, 0), BackgroundTransparency = 1, Text = "처음 무기와 아르카나 3개가 정해집니다. 나중에 무기를 바꾸면 다른 길로도 갈 수 있습니다.", TextScaled = true, Font = Theme.FONT, TextColor3 = Color3.fromRGB(200, 185, 165), ZIndex = 42 }, ov)
  for i, c in ipairs({ { "warrior", "warrior", "전사", "검을 든 근접 전사", "단단한 체력과 강한 물리 공격", "아르카나: 일격 · 찢기(범위) · 강타", Color3.fromRGB(235, 110, 80) },
                       { "mage", "mage", "마법사", "지팡이를 든 원소 마법사", "멀리서 화면을 쓸어버리는 마법", "아르카나: 불씨 · 체인 라이트닝 · 폭열탄", Color3.fromRGB(150, 130, 255) } }) do
    local card = mk("TextButton", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(i == 1 and 0.28 or 0.72, 0, 0.19, 0), Size = UDim2.new(0.38, 0, 0.74, 0), BackgroundColor3 = Color3.fromRGB(22, 15, 13), Text = "", AutoButtonColor = false, ZIndex = 42 }, ov)
    corner(card, 12); local cs = mk("UIStroke", { Color = Color3.fromRGB(120, 92, 48), Thickness = 3, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, card)
    Skin.frame(card, "ui_panel", 0.2, 0.5)
    local glowA = Sprites.art("fx_glow")
    local gl = glowA and mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.36, 0), Size = UDim2.new(0.9, 0, 0.6, 0), BackgroundTransparency = 1, ImageContent = glowA.content, ImageColor3 = c[7], ImageTransparency = 0.7, ZIndex = 43 }, card)
    local a = Sprites.art(c[2])
    local img = a and mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.36, 0), Size = UDim2.new(0.85, 0, 0.6, 0), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 44 }, card)
    local nm = mk("TextLabel", { Position = UDim2.new(0, 0, 0.665, 0), Size = UDim2.new(1, 0, 0.09, 0), BackgroundTransparency = 1, Text = c[3], TextScaled = true, Font = Theme.FONT, TextColor3 = c[7], ZIndex = 44 }, card)
    mk("UIStroke", { Thickness = 3, Color = Color3.new(0, 0, 0) }, nm)
    for j, line in ipairs({ c[4], c[5], c[6] }) do
      local l = mk("TextLabel", { Position = UDim2.new(0.06, 0, 0.765 + (j - 1) * 0.055, 0), Size = UDim2.new(0.88, 0, 0.045, 0), BackgroundTransparency = 1, Text = line, TextScaled = true, Font = Theme.FONT, TextColor3 = j == 3 and Color3.fromRGB(255, 220, 150) or Color3.fromRGB(220, 210, 195), ZIndex = 44 }, card)
      mk("UITextSizeConstraint", { MaxTextSize = 24 }, l)
    end
    card.MouseEnter:Connect(function() cs.Color = GOLD; if gl then TweenService:Create(gl, TweenInfo.new(0.2), { ImageTransparency = 0.35 }):Play() end; if img then TweenService:Create(img, TweenInfo.new(0.2), { Size = UDim2.new(0.92, 0, 0.65, 0) }):Play() end end)
    card.MouseLeave:Connect(function() cs.Color = Color3.fromRGB(120, 92, 48); if gl then TweenService:Create(gl, TweenInfo.new(0.2), { ImageTransparency = 0.7 }):Play() end; if img then TweenService:Create(img, TweenInfo.new(0.2), { Size = UDim2.new(0.85, 0, 0.6, 0) }):Play() end end)
    card.MouseButton1Click:Connect(function()
      local e = rpc:InvokeServer("pickstart", c[1]); if e and e.summary then setSummary(e.summary) end
      if e and e.ok then ov:Destroy(); task.delay(0.3, function() if tutorial then tutorial(0) end end) end
    end)
  end
end
heroChanged = function()   -- 전투 중이 아니면 마을 · 전투 무대의 영웅을 새 모습으로
  townBuilt = false; if screen == "town" then buildTown() end
  if mainStage and not mainStage.conn then makeStage() end
end
-- 화면 크기가 바뀌면 다시 배치 (전투 재생 중이면 끝난 뒤 반영)
local relayPending = false
relayout = function()
  relayPending = false; calcK()
  topScale.Scale = K; statScale.Scale = K; dockScale.Scale = K; resScale.Scale = K
  if shopBtn then shopBtn.Position = UDim2.new(0, 12, 0, INSET + 8 + 158 * K); shopBtn:FindFirstChildOfClass("UIScale").Scale = K end
  if mainStage and not mainStage.conn then makeStage() end
  townBuilt = false
  if screen == "town" then buildTown() elseif screen == "map" then buildMap() end
  if panelLayer.Visible then fitPanel() end
end
workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(function() if not relayPending then relayPending = true; task.delay(0.4, relayout) end end)

-- ── 로딩: 세이브 → 그림 → 시작 ──
loadStep("모험 기록을 불러오는 중...", 0.3)
for _ = 1, 120 do local ok, r = pcall(function() return rpc:InvokeServer("state") end); if ok and r and r.summary then setSummary(r.summary); Lang.set(r.summary.lang or "en"); for k, v in pairs(r.summary.set or {}) do if OPT[k] ~= nil then OPT[k] = v end end; calcK(); applyOpt(); break end; task.wait(0.5) end
do
  local okArt, ARTM = pcall(require, RS.Game.Data:FindFirstChild("ArtMap"))
  local keys = {}; if okArt then for k in pairs(ARTM.ART) do if k:sub(1, 7) ~= "card_s_" then keys[#keys + 1] = k end end end; table.sort(keys)   -- 스킬 카드는 처음 볼 때 받는다
  for i, k in ipairs(keys) do loadStep(string.format("그림을 불러오는 중... (%d/%d)", i, #keys), 0.35 + 0.6 * i / #keys); Sprites.art(k); task.wait() end   -- 한 장마다 한 프레임 쉬어 화면(로고 · 막대)이 멈추지 않게
end
pcall(function() isOwner = rpc:InvokeServer("isowner").owner == true end)
pcall(function() owns4 = rpc:InvokeServer("speedpass").owns == true end)
makeStage()
relayout()   -- 로딩 중(그림을 받는 동안) 화면 크기가 바뀌었을 수 있으므로 배치를 한 번 다시 계산
loadStep("준비 완료!", 1)
setScreen("town")
task.wait(0.35)
do   -- 시작화면: 눌러야 들어간다
  loadBarBg.Visible = false; loadTxt.Text = "화면을 눌러 시작"; loadTxt.TextSize = 30; loadTxt.Font = Theme.FONT; loadTxt.TextColor3 = Color3.fromRGB(255, 225, 160)
  local pressed = false
  local tw = TweenService:Create(loadTxt, TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { TextTransparency = 0.7 }); tw:Play()
  local hit = Instance.new("TextButton"); hit.Size = UDim2.new(1, 0, 1, 0); hit.BackgroundTransparency = 1; hit.Text = ""; hit.ZIndex = 50; hit.Parent = loadBg
  hit.MouseButton1Click:Connect(function() pressed = true end)
  while not pressed do task.wait() end
  tw:Cancel(); hit:Destroy()
  local fl = Instance.new("Frame"); fl.Size = UDim2.new(1, 0, 1, 0); fl.BackgroundColor3 = Color3.fromRGB(255, 230, 200); fl.BorderSizePixel = 0; fl.ZIndex = 60; fl.Parent = loadBg   -- 번쩍
  TweenService:Create(fl, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
end
loadBox.Visible = false; for _, m in ipairs(motes) do m.f.Visible = false end
TweenService:Create(loadArt, TweenInfo.new(0.5), { ImageTransparency = 1 }):Play(); TweenService:Create(loadDim, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
local fade = TweenService:Create(loadBg, TweenInfo.new(0.5), { BackgroundTransparency = 1 }); fade:Play(); fade.Completed:Connect(function() loadGui:Destroy() end)
if summary and (summary.cleared or 0) == 0 and not (summary.tut and summary.tut < 99) then toast("오른쪽 아래 [지도]를 눌러 스테이지 1에 도전하세요!", Color3.fromRGB(255, 230, 140)) end

-- 디버그 훅: gui:SetAttribute("Debug", "fight" | "map" | "town" | 메뉴이름) (자동 테스트용)
gui:GetAttributeChangedSignal("Debug"):Connect(function()
  local v = gui:GetAttribute("Debug")
  if v == "fight" then launch(stageSpec(1))
  elseif v == "map" or v == "town" then setScreen(v)
  elseif v == "start" then showStartPick()   -- 시험: 직업 고르기 화면 (이미 시작한 계정은 서버가 거절해 바뀌지 않음)
  elseif v == "tut" then tutorial(0)          -- 시험: 튜토리얼 (기존 계정은 진행이 저장되지 않음)
  elseif v == "tutst" then tutAfterStage(1)
  elseif v == "gachafx" then   -- 소환 연출 시험 (가짜 결과, 재화 소모 없음)
    openPanel("아르카나 소환", { { "아르카나 소환", "gacha" }, { "아르카나 목록", "gachalist" } })
    local R = {}; for i, r in ipairs({ 0, 1, 0, 2, 0, 1, 3, 0, 1, 4 }) do R[i] = { id = i % 2 == 0 and "rapid" or "strike", name = i % 2 == 0 and "연사" or "일격", rarity = r, dup = (r == 0) and 2 or nil, new = r > 0 or nil } end
    Menus.revealResults(R)
  elseif views[v] then openPanel(v, { { v, v } }) end
end)

-- 서버 알림 (베타 명단 명령 결과 등)
task.spawn(function() local ev = RS:WaitForChild("Notice", 30); if ev then ev.OnClientEvent:Connect(function(t) toast(tostring(t)) end) end end)
