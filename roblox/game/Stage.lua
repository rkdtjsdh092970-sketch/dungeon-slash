-- 2D 전투 무대: 서버가 기록한 타임라인(result.replay)을 재생한다. 클라이언트 전용.
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Sprites = require(script.Parent.Sprites)
local Theme = require(script.Parent.Theme)
local Ambient = require(script.Parent.Ambient)   -- 불씨 · 안개 · 일렁이는 빛 · 배경 흔들림
local Fx = require(script.Parent.BattleFx)
local Skin = require(script.Parent.Skin)
-- 체력 · 마나 막대 (깔끔하게): 어두운 홈 + 금속 테두리, 3단 그라데이션, 위쪽 광택, 피해 잔상, 눈금
local function fancyBar(parent, pos, size, cTop, cMid, cBot, z, ticks, rad)
  local bg = Instance.new("Frame"); bg.Position = pos; bg.Size = size; bg.BackgroundColor3 = Color3.fromRGB(8, 5, 6); bg.BorderSizePixel = 0; bg.ZIndex = z; bg.Parent = parent
  local c = Instance.new("UICorner", bg); c.CornerRadius = UDim.new(0, rad or 3)
  local st = Instance.new("UIStroke", bg); st.Color = Color3.fromRGB(150, 115, 60); st.Thickness = 1.5; st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
  local inner = Instance.new("Frame"); inner.Position = UDim2.new(0, 1, 0, 1); inner.Size = UDim2.new(1, -2, 1, -2); inner.BackgroundTransparency = 1; inner.ClipsDescendants = true; inner.ZIndex = z; inner.Parent = bg
  local trail = Instance.new("Frame"); trail.Size = UDim2.new(1, 0, 1, 0); trail.BackgroundColor3 = Color3.fromRGB(255, 240, 220); trail.BorderSizePixel = 0; trail.ZIndex = z + 1; trail.Parent = inner
  local fill = Instance.new("Frame"); fill.Size = UDim2.new(1, 0, 1, 0); fill.BackgroundColor3 = Color3.new(1, 1, 1); fill.BorderSizePixel = 0; fill.ZIndex = z + 2; fill.Parent = inner
  local g = Instance.new("UIGradient", fill); g.Rotation = 90
  g.Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, cTop), ColorSequenceKeypoint.new(0.45, cMid), ColorSequenceKeypoint.new(1, cBot) })
  local gloss = Instance.new("Frame"); gloss.Size = UDim2.new(1, 0, 0.42, 0); gloss.BackgroundColor3 = Color3.new(1, 1, 1); gloss.BackgroundTransparency = 0.78; gloss.BorderSizePixel = 0; gloss.ZIndex = z + 3; gloss.Parent = fill
  local gg = Instance.new("UIGradient", gloss); gg.Rotation = 90; gg.Transparency = NumberSequence.new(0.2, 1)
  for i = 1, (ticks or 0) - 1 do   -- 눈금 (10% 단위 등)
    local t = Instance.new("Frame"); t.AnchorPoint = Vector2.new(0.5, 0); t.Position = UDim2.new(i / ticks, 0, 0, 0); t.Size = UDim2.new(0, 1, 1, 0); t.BackgroundColor3 = Color3.new(0, 0, 0); t.BackgroundTransparency = 0.55; t.BorderSizePixel = 0; t.ZIndex = z + 4; t.Parent = inner
  end
  return { bg = bg, fill = fill, trail = trail, z = z, v = 1, tv = 1, hold = 0 }
end
-- 값 바꾸기: 막대는 바로, 잔상은 잠깐 머문 뒤 따라 줄어든다 (매 프레임 barTick)
local function setBar(B, v)
  v = math.clamp(v or 0, 0, 1)
  if v < B.v then B.hold = 0.35 end
  B.v = v; B.fill.Size = UDim2.new(v, 0, 1, 0)
  if v > B.tv then B.tv = v; B.trail.Size = UDim2.new(v, 0, 1, 0) end
end
local function barTick(B, dt)
  if B.tv <= B.v then return end
  if B.hold > 0 then B.hold -= dt; return end
  B.tv = math.max(B.v, B.tv - dt * 1.2); B.trail.Size = UDim2.new(B.tv, 0, 1, 0)
end   -- 버튼 · 판 그림 (마을 · 창과 같은 질감)   -- 스킬 · 타격 이펙트
local M = {}

local function mk(class, props, parent) local o = Instance.new(class); for k, v in pairs(props) do o[k] = v end; o.Parent = parent; return o end
local function fmt(n) n = math.floor(n); if n >= 1e9 then return string.format("%.1fB", n / 1e9) elseif n >= 1e6 then return string.format("%.1fM", n / 1e6) elseif n >= 1e4 then return string.format("%.1fK", n / 1e3) end return tostring(n) end

-- 지역별 팔레트: { 하늘 위, 하늘 아래, 실루엣, 바닥, 달/창문 }
M.PAL = {
  { Color3.fromRGB(70, 110, 190), Color3.fromRGB(180, 190, 220), Color3.fromRGB(50, 80, 90), Color3.fromRGB(86, 120, 70), Color3.fromRGB(255, 244, 200) },
  { Color3.fromRGB(40, 70, 70), Color3.fromRGB(110, 150, 110), Color3.fromRGB(30, 54, 50), Color3.fromRGB(60, 90, 56), Color3.fromRGB(240, 255, 200) },
  { Color3.fromRGB(34, 30, 52), Color3.fromRGB(88, 76, 100), Color3.fromRGB(34, 30, 44), Color3.fromRGB(70, 62, 70), Color3.fromRGB(255, 210, 140) },
  { Color3.fromRGB(150, 90, 50), Color3.fromRGB(240, 190, 120), Color3.fromRGB(120, 80, 50), Color3.fromRGB(190, 150, 90), Color3.fromRGB(255, 240, 200) },
  { Color3.fromRGB(30, 54, 44), Color3.fromRGB(80, 110, 80), Color3.fromRGB(24, 40, 34), Color3.fromRGB(50, 70, 50), Color3.fromRGB(220, 255, 180) },
  { Color3.fromRGB(80, 110, 160), Color3.fromRGB(210, 230, 250), Color3.fromRGB(110, 140, 170), Color3.fromRGB(200, 215, 230), Color3.fromRGB(255, 255, 255) },
  { Color3.fromRGB(60, 20, 20), Color3.fromRGB(190, 70, 40), Color3.fromRGB(50, 20, 20), Color3.fromRGB(90, 40, 30), Color3.fromRGB(255, 190, 90) },
  { Color3.fromRGB(20, 12, 40), Color3.fromRGB(70, 36, 100), Color3.fromRGB(26, 16, 44), Color3.fromRGB(44, 28, 64), Color3.fromRGB(200, 140, 255) },
  { Color3.fromRGB(80, 120, 200), Color3.fromRGB(230, 220, 250), Color3.fromRGB(150, 150, 200), Color3.fromRGB(210, 200, 230), Color3.fromRGB(255, 250, 220) },
  { Color3.fromRGB(40, 8, 24), Color3.fromRGB(140, 30, 60), Color3.fromRGB(36, 10, 26), Color3.fromRGB(70, 20, 40), Color3.fromRGB(255, 120, 120) },
}
M.HERO = "warrior"   -- 클라이언트가 정한다: 지팡이를 끼면 "mage"
function M.heroKey() if M.HERO ~= "warrior" and Sprites.art(M.HERO) then return M.HERO end; return "warrior" end
function M.create(parent, W, H, replayAct)
  -- 웹 게임 좌표(높이 540)를 화면 높이에 꽉 맞추고, 가로는 화면 비율대로 늘린다 (여백 없음. u = 가상 1픽셀의 실제 크기)
  -- 16:9 에서는 가로 960 으로 웹과 같고, 더 넓거나 좁은 화면은 몬스터 칸 간격(cw)이 늘거나 준다
  local u = H / 540
  local S = { W = W, H = H, u = u, ox = 0, oy = 22 * u, cw = math.max(70, (W / u - 216) / 6), f = u * 540 / 260, units = {}, t = 0, idx = 0, spd = 1, alive = true }   -- oy: 레인을 웹보다 60 아래로 (배경 그림의 땅 높이에 맞춤)
  local root = mk("Frame", { Size = UDim2.new(0, W, 0, H), BackgroundColor3 = Color3.fromRGB(40, 30, 70), BorderSizePixel = 0, ClipsDescendants = true }, parent)
  local bg = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 1 }, root)
  local function buildBg(act)
    bg:ClearAllChildren()
    local art = Sprites.art("bg" .. (act or 1))   -- 일러스트 배경이 있으면 그것만 쓴다
    if art then   -- 화면을 꽉 채우도록 자르되(좌우는 가운데, 위아래는 아래 기준) 비율은 유지한다
      local sw, sh = art.w, art.h
      if art.w / art.h > W / H then sw = art.h * W / H else sh = art.w * H / W end
      mk("ImageLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ScaleType = Enum.ScaleType.Stretch, ImageContent = art.content, ImageRectOffset = Vector2.new((art.w - sw) / 2, art.h - sh), ImageRectSize = Vector2.new(sw, sh), ZIndex = 1 }, bg); return
    end
    local P = M.PAL[((act or 1) - 1) % #M.PAL + 1]
    local sky = mk("Frame", { Size = UDim2.new(1, 0, 0.56, 0), BackgroundColor3 = P[1], BorderSizePixel = 0 }, bg)
    mk("UIGradient", { Color = ColorSequence.new(P[1], P[2]), Rotation = 90 }, sky)
    math.randomseed(7)
    for i = 1, 26 do   -- 별 / 먼지
      mk("Frame", { Position = UDim2.new(math.random(), 0, math.random() * 0.4, 0), Size = UDim2.new(0, 2, 0, 2), BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 0.4 + math.random() * 0.4, BorderSizePixel = 0 }, bg)
    end
    local moon = mk("Frame", { Position = UDim2.new(0.8, 0, 0.08, 0), Size = UDim2.new(0, 46, 0, 46), BackgroundColor3 = P[5], BackgroundTransparency = 0.1, BorderSizePixel = 0 }, bg); mk("UICorner", { CornerRadius = UDim.new(1, 0) }, moon)
    local halo = mk("Frame", { Position = UDim2.new(0.8, -22, 0.08, -22), Size = UDim2.new(0, 90, 0, 90), BackgroundColor3 = P[5], BackgroundTransparency = 0.82, BorderSizePixel = 0 }, bg); mk("UICorner", { CornerRadius = UDim.new(1, 0) }, halo)
    local x = 0   -- 지평선 실루엣
    while x < W do
      local w = 18 + math.random() * 34; local h = 14 + math.random() * 60
      mk("Frame", { Position = UDim2.new(0, x, 0, H * 0.52 - h), Size = UDim2.new(0, w, 0, h + 2), BackgroundColor3 = P[3], BorderSizePixel = 0, ZIndex = 1 }, bg)
      if math.random() < 0.45 then mk("Frame", { Position = UDim2.new(0, x + w / 2 - 2, 0, H * 0.52 - h + 8), Size = UDim2.new(0, 4, 0, 6), BackgroundColor3 = P[5], BackgroundTransparency = 0.2, BorderSizePixel = 0, ZIndex = 1 }, bg) end
      x += w + math.random() * 6
    end
    local ground = mk("Frame", { Position = UDim2.new(0, 0, 0.52, 0), Size = UDim2.new(1, 0, 0.48, 0), BackgroundColor3 = P[4], BorderSizePixel = 0, ZIndex = 2 }, bg)
    mk("UIGradient", { Color = ColorSequence.new(P[4], P[3]), Rotation = 90 }, ground)
    for i = 1, 3 do mk("Frame", { Position = UDim2.new(0, 0, 0.52 + i * 0.12, 0), Size = UDim2.new(1, 0, 0, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.7, BorderSizePixel = 0, ZIndex = 2 }, bg) end
    for _, tx in ipairs({ 0.05, 0.97 }) do   -- 횃불 불빛
      local g = mk("Frame", { Position = UDim2.new(tx, -30, 0.5, -30), Size = UDim2.new(0, 60, 0, 60), BackgroundColor3 = Color3.fromRGB(255, 160, 70), BackgroundTransparency = 0.8, BorderSizePixel = 0, ZIndex = 2 }, bg); mk("UICorner", { CornerRadius = UDim.new(1, 0) }, g)
      mk("Frame", { Position = UDim2.new(tx, -3, 0.5, -8), Size = UDim2.new(0, 6, 0, 16), BackgroundColor3 = Color3.fromRGB(255, 200, 110), BorderSizePixel = 0, ZIndex = 2 }, bg)
    end

  end
  S.buildBg = function(act) if S.act ~= act then S.act = act; buildBg(act) end end
  S.buildBg(replayAct or 1)
  Ambient.attach(root, { z = 2, embers = 24, fog = true, clouds = { 0.03, 0.16, 3 }, birds = true })
  S.root = root; S.layer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 3 }, root)
  -- 플레이어
  S.plX, S.plY = S.ox + 150 * u, S.oy + 336 * u   -- 웹 PLAYER_POS 보다 앞으로 (영웅 · 몹 사이가 비어 보이지 않게, 2026-11-03)
  S.pl = Sprites.artLabel(S.layer, M.heroKey(), 138 * u); S.plArt = S.pl ~= nil
  if not S.plArt then S.pl, S.plInfo = Sprites.label(S.layer, "warrior", 0, false, 128 * u) end
  S.pl.Position = UDim2.new(0, S.plX, 0, S.plY); S.pl.ZIndex = 5
  -- 상태 바
  -- ── 전투 HUD (웹 battleHudBuild 구성): 로블록스 상단 버튼 줄(M.TOP) 아래부터. 크기는 Client 의 HUD 배율 M.HUD ──
  local TOP, k = M.TOP, M.HUD
  local FONT, GOLD, EDGE = Theme.FONT, Color3.fromRGB(214, 168, 70), Color3.fromRGB(20, 10, 30)
  local function outl(o, t) mk("UIStroke", { Thickness = t or 2, Color = EDGE }, o); return o end
  -- 왼쪽 위: 가죽 · 철 상태판(hud_plate) + 왕관 장식 초상화 고리(hud_portrait) + 장식 틀 안 체력바(hud_bar) + 마나 · 처치
  local L = mk("Frame", { Position = UDim2.new(0, 10, 0, TOP + 4 * k), Size = UDim2.new(0, 352 * k, 0, 110 * k), BackgroundTransparency = 1, ZIndex = 8 }, root)
  local function art(key, props, parent) local a = Sprites.art(key); if not a then return nil end; props.BackgroundTransparency = 1; props.ImageContent = a.content; props.ScaleType = props.ScaleType or Enum.ScaleType.Stretch; return mk("ImageLabel", props, parent) end
  if not art("hud_plate", { Position = UDim2.new(0, 22 * k, 0, 6 * k), Size = UDim2.new(0, 330 * k, 0, 100 * k), ZIndex = 8 }, L) then
    local f = mk("Frame", { Position = UDim2.new(0, 22 * k, 0, 6 * k), Size = UDim2.new(0, 330 * k, 0, 100 * k), BackgroundColor3 = Color3.fromRGB(22, 16, 14), BackgroundTransparency = 0.1, ZIndex = 8 }, L); mk("UICorner", { CornerRadius = UDim.new(0, 10 * k) }, f)
  end
  -- 초상화: 판의 반원 홈 위에 (안쪽 원 지름 = 고리 크기의 64%)
  local PS = 112 * k
  local face = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, 52 * k, 0, 57 * k), Size = UDim2.new(0, PS * 0.66, 0, PS * 0.66), BackgroundColor3 = Color3.fromRGB(26, 10, 12), ClipsDescendants = true, ZIndex = 9 }, L)
  mk("UICorner", { CornerRadius = UDim.new(1, 0) }, face)
  mk("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.fromRGB(120, 30, 30), Color3.fromRGB(20, 6, 8)) }, face)
  local fa = Sprites.art(M.heroKey())
  if fa then mk("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.new(1.15, 0, 1.15, 0), AnchorPoint = Vector2.new(0.5, 0.4), Position = UDim2.new(0.5, 0, 0.5, 0), ImageContent = fa.content, ScaleType = Enum.ScaleType.Fit, ZIndex = 10 }, face) end
  art("hud_portrait", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, 52 * k, 0, 55 * k), Size = UDim2.new(0, PS, 0, PS), ScaleType = Enum.ScaleType.Fit, ZIndex = 11 }, L)
  -- 레벨: 초상화 아래 마름모 보석 배지
  local gem = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, 52 * k, 0, 100 * k), Size = UDim2.new(0, 24 * k, 0, 24 * k), Rotation = 45, BackgroundColor3 = Color3.new(1, 1, 1), ZIndex = 12 }, L)
  mk("UIGradient", { Rotation = 45, Color = ColorSequence.new(Color3.fromRGB(255, 220, 130), Color3.fromRGB(150, 90, 25)) }, gem); mk("UIStroke", { Color = Color3.fromRGB(40, 20, 6), Thickness = 2 }, gem); mk("UICorner", { CornerRadius = UDim.new(0, 4 * k) }, gem)
  S.lvLbl = outl(mk("TextLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, 52 * k, 0, 100 * k), Size = UDim2.new(0, 30 * k, 0, 20 * k), BackgroundTransparency = 1, Text = "1", TextColor3 = Color3.new(1, 1, 1), Font = FONT, TextSize = math.floor(14 * k), ZIndex = 13 }, L))
  -- 체력: 장식 틀(hud_bar)의 빈 칸(가로 11.5%~92.4%, 세로 45%~73%)에 막대를 맞춘다
  local FX, FY, FW, FH = 104 * k, 2 * k, 246 * k, 56 * k
  art("hud_bar", { Position = UDim2.new(0, FX, 0, FY), Size = UDim2.new(0, FW, 0, FH), ZIndex = 14 }, L)
  S.hpB = fancyBar(L, UDim2.new(0, FX + FW * 0.115, 0, FY + FH * 0.453), UDim2.new(0, FW * 0.81, 0, FH * 0.28), Color3.fromRGB(255, 140, 120), Color3.fromRGB(215, 45, 45), Color3.fromRGB(120, 15, 25), 9, 10, 2)
  S.hpB.bg:FindFirstChildOfClass("UIStroke").Enabled = false   -- 틀 그림이 테두리
  S.hpTxt = outl(mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), Text = "", TextColor3 = Color3.new(1, 1, 1), Font = FONT, TextSize = math.floor(14 * k), ZIndex = 15 }, S.hpB.bg), 1.5)
  -- 마나: 체력 아래 얇게
  S.mpB = fancyBar(L, UDim2.new(0, FX + FW * 0.115, 0, 58 * k), UDim2.new(0, FW * 0.81, 0, 9 * k), Color3.fromRGB(150, 200, 255), Color3.fromRGB(60, 110, 230), Color3.fromRGB(25, 40, 120), 9, 0, 2)
  S.mpTxt = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(0, 0, 0, 0), Text = "", Visible = false }, S.mpB.bg)   -- (마나 숫자는 숨김: 막대만)
  -- 처치 수: 해골 표식이 있는 작은 알약
  local kp = mk("Frame", { Position = UDim2.new(0, FX + FW * 0.115, 0, 74 * k), Size = UDim2.new(0, 120 * k, 0, 22 * k), BackgroundColor3 = Color3.fromRGB(10, 6, 6), BackgroundTransparency = 0.2, ZIndex = 10 }, L)
  mk("UICorner", { CornerRadius = UDim.new(1, 0) }, kp); mk("UIStroke", { Color = Color3.fromRGB(150, 110, 60), Thickness = 1 }, kp)
  S.killLbl = outl(mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 8 * k, 0, 0), Size = UDim2.new(1, -16 * k, 1, 0), Text = "", TextColor3 = Color3.fromRGB(255, 225, 160), Font = FONT, TextSize = math.floor(13 * k), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 11 }, kp), 1.5)
  -- 위 가운데: 단계 이름 + 보스 체력
  S.titleLbl = outl(mk("TextLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, TOP + 4 * k), Size = UDim2.new(0, 520 * k, 0, 30 * k), Text = "", TextColor3 = Color3.fromRGB(255, 225, 140), Font = FONT, TextSize = math.floor(24 * k), ZIndex = 9 }, root), 3)
  S.boss = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, TOP + 38 * k), Size = UDim2.new(0, 460 * k, 0, 48 * k), BackgroundTransparency = 1, Visible = false, ZIndex = 9 }, root)
  S.bossName = outl(mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 20 * k), Text = "", TextColor3 = Color3.fromRGB(255, 160, 150), Font = FONT, TextSize = math.floor(17 * k), ZIndex = 10 }, S.boss), 2)
  do
    local BW, BH = 460 * k / 0.784, 22 * k / 0.219   -- 틀 크기 (빈 칸이 460 x 22 가 되게)
    local bx, by = (460 * k - BW) / 2, 22 * k - BH * 0.396
    local ba = Sprites.art("hud_boss")
    S.bossB = fancyBar(S.boss, UDim2.new(0, 0, 0, 22 * k), UDim2.new(1, 0, 0, 22 * k), Color3.fromRGB(255, 130, 90), Color3.fromRGB(200, 30, 30), Color3.fromRGB(90, 8, 14), 10, 10, 2)
    if ba then
      S.bossB.bg:FindFirstChildOfClass("UIStroke").Enabled = false
      mk("ImageLabel", { Position = UDim2.new(0, bx, 0, by), Size = UDim2.new(0, BW, 0, BH), BackgroundTransparency = 1, ImageContent = ba.content, ScaleType = Enum.ScaleType.Stretch, ZIndex = 15 }, S.boss)
    end
  end
  S.bossPct = outl(mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), Text = "", TextColor3 = Color3.new(1, 1, 1), Font = FONT, TextSize = math.floor(14 * k), ZIndex = 17 }, S.bossB.bg), 1.5)
  -- 오른쪽 위: 건너뛰기 · 배속(누르면 x1~x4 가 아래로 펼쳐짐, x4 는 게임패스)
  S.ctrl = mk("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -12, 0, TOP + 6 * k), Size = UDim2.new(0, 236, 0, 40), Visible = false, ZIndex = 30 }, root)
  mk("UIScale", { Scale = k }, S.ctrl)
  local function cbtn(parent, text, pos, size, color)
    local b = mk("TextButton", { Text = text, Position = pos, Size = size, BackgroundColor3 = color, TextColor3 = Color3.new(1, 1, 1), Font = FONT, TextSize = 17, AutoButtonColor = true, ZIndex = 31 }, parent)
    mk("UICorner", { CornerRadius = UDim.new(0, 10) }, b); mk("UIStroke", { Color = GOLD, Thickness = 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
    mk("UIGradient", { Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(170, 170, 170)), Rotation = 90 }, b); outl(b, 1.5)
    task.defer(function() if b.Parent then Skin.button(b) end end)   -- 질감 있는 버튼 그림
    return b
  end
  cbtn(S.ctrl, "Skip ▶▶", UDim2.new(0, 0, 0, 0), UDim2.new(0, 120, 0, 40), Color3.fromRGB(65, 62, 80)).MouseButton1Click:Connect(function() S:skip() end)
  S.spdBtn = cbtn(S.ctrl, "x1 ▼", UDim2.new(0, 128, 0, 0), UDim2.new(0, 108, 0, 40), Color3.fromRGB(200, 140, 40))
  S.spdBtn:SetAttribute("NoTr", true)
  S.spdList = mk("Frame", { Position = UDim2.new(0, 128, 0, 44), Size = UDim2.new(0, 108, 0, 0), BackgroundTransparency = 1, ClipsDescendants = true, ZIndex = 31 }, S.ctrl)
  mk("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, S.spdList)
  S.spdOpts = {}
  for i = 1, 4 do
    local b = cbtn(S.spdList, "x" .. i, UDim2.new(), UDim2.new(1, 0, 0, 36), Color3.fromRGB(65, 62, 80)); b.LayoutOrder = i; b:SetAttribute("NoTr", true)
    b.MouseButton1Click:Connect(function() S:pickSpeed(i) end); S.spdOpts[i] = b
  end
  S.spdOpen = false
  S.spdBtn.MouseButton1Click:Connect(function() S:speedMenu(not S.spdOpen) end)
  S.timeLbl = outl(mk("TextLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -16, 0, TOP + 50 * k), Size = UDim2.new(0, 120 * k, 0, 20 * k), Text = "", TextColor3 = Color3.new(1, 1, 1), Font = FONT, TextSize = math.floor(14 * k), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 9 }, root), 1.5)
  -- 아래 가운데: 장착 스킬 (쓰면 쿨타임 표시)
  S.skillBar = mk("Frame", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -12 * k), Size = UDim2.new(0, 0, 0, 74 * k), AutomaticSize = Enum.AutomaticSize.X, BackgroundColor3 = Color3.fromRGB(22, 16, 40), BackgroundTransparency = 0.15, Visible = false, ZIndex = 8 }, root)
  mk("UICorner", { CornerRadius = UDim.new(0, 14 * k) }, S.skillBar); mk("UIStroke", { Color = GOLD, Thickness = 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, S.skillBar)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, VerticalAlignment = Enum.VerticalAlignment.Center, Padding = UDim.new(0, 8 * k), SortOrder = Enum.SortOrder.LayoutOrder }, S.skillBar)
  mk("UIPadding", { PaddingLeft = UDim.new(0, 8 * k), PaddingRight = UDim.new(0, 8 * k) }, S.skillBar)
  S.skillCells = {}
  S.plAnim = { name = "idle", t = 0 }
  S.idleConn = RunService.RenderStepped:Connect(function(dt) if S.conn or not S.alive then return end
    S.plAnim.t += dt; S.idleT = (S.idleT or 0) + dt; if S.plArt then M.artPose(S) end
    local row, frame, done = Sprites.anim("warrior", "idle", S.plAnim.t); if S.plInfo then Sprites.setFrame(S.pl, S.plInfo, row, frame) end end)
  return setmetatable(S, { __index = M })
end

-- 일러스트 영웅의 코드 애니메이션: 숨쉬기 / 공격 돌진 / 피격 붉은 번쩍임
-- 영웅 동작을 정한다 (BattleFx 가 스킬마다 부른다): lunge = 대상 쪽으로 힘껏 돌진, slam = 뛰어올라 내려찍기, cast = 지팡이를 치켜드는 시전, throw = 짧게 던지기
function M:heroPose(name, arg)
  local tx = type(arg) == "number" and arg or nil
  local reach = tx and math.clamp((tx - self.plX) * 0.22, 30 * self.u, 100 * self.u) or 45 * self.u   -- 짧게 내딛어 벤다 (멀리 날아가지 않게, 2026-11-03)
  self.plAnim = { name = name, t = 0, reach = reach, big = arg == true }
  if (name == "lunge" or name == "slam") and self.plArt then   -- 잔상: 돌진 길에 흐릿한 그림자가 남는다
    for i = 1, 3 do
      task.delay(0.06 + i * 0.025, function()
        if not self.pl.Parent then return end
        local g = self.pl:Clone(); g.ZIndex = self.pl.ZIndex - 1; g.ImageTransparency = 0.45 + i * 0.1; g.ImageColor3 = Color3.fromRGB(255, 200, 160); g.Parent = self.layer
        for _, ch in ipairs(g:GetChildren()) do ch:Destroy() end
        local t = TweenService:Create(g, TweenInfo.new(0.22), { ImageTransparency = 1 }); t:Play(); t.Completed:Connect(function() g:Destroy() end)
      end)
    end
  end
end
-- 동작 그림: 영웅이 실제로 칼을 젖히고 · 베어 내리고 · 치켜들고, 마법사는 지팡이를 치켜들고 · 내뻗는다 (art/hero/<영웅>_<동작>.png, 없으면 기본 그림)
local function setPose(S, pk)
  if S.poseK == pk then return end
  S.poseK = pk
  local base = M.heroKey()
  local a = (pk and Sprites.art(base .. "_" .. pk)) or Sprites.art(base); if not a then return end
  S.pl.ImageContent = a.content; S.pl.AnchorPoint = Vector2.new(0.5, a.foot)
end
-- 일러스트 영웅의 코드 애니메이션 (묵직하게: 짧게 모았다가 강하게 내지르고 천천히 돌아온다)
function M.artPose(S)
  local a = S.plAnim; local dx, dy, rot = 0, 0, 0; local u = S.u; local t = a.t
  local R = a.reach or 60 * u
  if a.name == "attack" or a.name == "throw" then
    if t < 0.08 then local k = t / 0.08; dx = -8 * u * k; rot = -4 * k
    elseif t < 0.15 then local k = (t - 0.08) / 0.07; dx = -8 * u + 34 * u * k; rot = -4 + 12 * k
    elseif t < 0.40 then local k = (t - 0.15) / 0.25; dx = 26 * u * (1 - k) ^ 2; rot = 8 * (1 - k)
    else S.plAnim = { name = "idle", t = 0 } end
  elseif a.name == "lunge" then   -- 움츠렸다 → 대상 쪽으로 번개처럼 돌진 → 베고 → 무겁게 돌아옴
    if t < 0.07 then local k = t / 0.07; dx = -14 * u * k; dy = 3 * u * k; rot = -8 * k
    elseif t < 0.13 then local k = (t - 0.07) / 0.06; dx = -14 * u + (R + 14 * u) * k; dy = 3 * u * (1 - k); rot = -8 + 22 * k
    elseif t < 0.22 then dx = R; rot = 14 - 6 * (t - 0.13) / 0.09
    elseif t < 0.50 then local k = (t - 0.22) / 0.28; dx = R * (1 - k) ^ 2; rot = 8 * (1 - k)
    else S.plAnim = { name = "idle", t = 0 } end
  elseif a.name == "slam" then   -- 뛰어올라 대상 앞으로 → 내려찍기 → 착지 반동
    if t < 0.08 then local k = t / 0.08; dy = 6 * u * k; rot = -6 * k   -- 웅크림
    elseif t < 0.17 then local k = (t - 0.08) / 0.09; dx = R * k; dy = 6 * u - (70 * u) * math.sin(k * math.pi * 0.5); rot = -6 - 14 * k
    elseif t < 0.22 then local k = (t - 0.17) / 0.05; dx = R; dy = -64 * u + 70 * u * k; rot = -20 + 45 * k
    elseif t < 0.32 then dx = R; dy = 6 * u * (1 - (t - 0.22) / 0.1); rot = 25 - 10 * (t - 0.22) / 0.1
    elseif t < 0.62 then local k = (t - 0.32) / 0.3; dx = R * (1 - k) ^ 2; rot = 15 * (1 - k)
    else S.plAnim = { name = "idle", t = 0 } end
  elseif a.name == "cast" then   -- 지팡이를 치켜들며 몸을 뒤로 젖혔다가, 주문을 내뿜으며 앞으로
    local hold = a.big and 0.22 or 0.12
    if t < hold then local k = t / hold; dx = -6 * u * k; dy = -(a.big and 10 or 5) * u * k; rot = -7 * k
    elseif t < hold + 0.08 then local k = (t - hold) / 0.08; dx = -6 * u + 18 * u * k; dy = -(a.big and 10 or 5) * u * (1 - k); rot = -7 + 13 * k
    elseif t < hold + 0.4 then local k = (t - hold - 0.08) / 0.32; dx = 12 * u * (1 - k) ^ 2; rot = 6 * (1 - k)
    else S.plAnim = { name = "idle", t = 0 } end
  elseif a.name == "hurt" then
    local k = math.clamp(t / 0.22, 0, 1); dx = -12 * u * (1 - k); dy = math.sin(t * 70) * 2 * u * (1 - k); rot = -4 * (1 - k)
    if t > 0.22 then S.plAnim = { name = "idle", t = 0 } end
  else   -- 서 있을 때: 아주 느리게 숨쉬듯 (몸이 살짝 오르내림)
    dy = math.sin((S.idleT or 0) * 2.2) * 1.2 * u
  end
  -- 단계별 동작 그림 (전사: 젖힘 → 베기 / 뛰어올라 치켜듦 → 베기, 마법사: 치켜듦 → 내뻗음)
  local pk
  if a.name == "attack" or a.name == "throw" then pk = t < 0.08 and "windup" or (t < 0.3 and "slash" or nil)
  elseif a.name == "lunge" then pk = t < 0.07 and "windup" or (t < 0.32 and "slash" or nil)
  elseif a.name == "slam" then pk = t < 0.17 and "overhead" or (t < 0.42 and "slash" or nil)
  elseif a.name == "cast" then local hold = a.big and 0.22 or 0.12; pk = t < hold and "raise" or (t < hold + 0.3 and "cast" or nil) end
  if M.heroKey() == "mage" then if pk == "windup" or pk == "overhead" then pk = "raise" elseif pk == "slash" then pk = "cast" end
  elseif pk == "raise" then pk = "windup" elseif pk == "cast" then pk = "slash" end
  setPose(S, pk)
  rot *= pk and 0.4 or 1   -- 그림이 동작을 보여 주니 기울기는 조금만
  S.pl.Position = UDim2.new(0, S.plX + dx, 0, S.plY + dy); S.pl.Rotation = rot
  local hurt = a.name == "hurt" or (S.plHurt or 0) > 0
  S.pl.ImageColor3 = hurt and Color3.new(1, 1 - 0.55 * M.OPT.flash, 1 - 0.55 * M.OPT.flash) or Color3.new(1, 1, 1)
end

M.TOP, M.HUD = 58, 1   -- 로블록스 상단 버튼 줄 높이 / HUD 배율 (Client 가 화면에 맞춰 갱신)
M.OPT = { dmg = true, flash = 1 }   -- 그래픽 설정: 피해 숫자 표시 · 피격 반짝임(0 끄기 · 0.5 약하게 · 1 보통)
-- 레인/칸: 웹 battle.js 의 LAY{x0=196,cw=124,cy=292} · laneH(3레인까지 116, 4레인 88) 와 같은 값
-- 레인 길 (웹 drawRoads): 레인마다 어두운 길 띠 + 가장자리 + 칸 자리 발판. 몬스터는 이 길을 따라 오른쪽에서 걸어 들어온다
function M:buildLanes(lanes)
  if self.roads then self.roads:Destroy() end
  -- 칸 너비: 뒤 줄은 오른쪽으로 밀려 그려지므로(laneShift), 맨 뒤 줄 6번째 칸까지 화면 안에 들어오게 줄 수만큼 좁힌다 (예전엔 오른쪽 끝 밖에 몹이 겹쳐 쌓여 보였다)
  self.cw = math.max(56, (self.W / self.u - 236) / (6 + 0.3 * ((lanes or 2) - 1)))
  local u = self.u
  local R = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 2 }, self.root); self.roads = R
  for l = 0, (lanes or 2) - 1 do
    local x0 = self.ox + (196 - 70 + self:laneShift(l, lanes)) * u
    local cy, lh = self:laneY(l, lanes)
    local yc = cy + lh * 0.3                       -- 몬스터 발이 놓이는 높이 (applySnap 과 같은 위치)
    local hh = lh * 0.3
    -- 다져진 흙길: 가운데가 밝고 위아래로 갈수록 어두워지며 바닥에 스며든다 (둥근 끝 없음, 왼쪽은 흐려지며 시작)
    local band = mk("Frame", { Position = UDim2.new(0, x0, 0, yc - hh), Size = UDim2.new(1, -x0, 0, hh * 2), BackgroundColor3 = Color3.new(1, 1, 1), BorderSizePixel = 0, ZIndex = 2 }, R)
    mk("UIGradient", { Rotation = 90, Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(20, 14, 12)), ColorSequenceKeypoint.new(0.5, Color3.fromRGB(70, 56, 44)), ColorSequenceKeypoint.new(1, Color3.fromRGB(20, 14, 12)) }),
      Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.85), NumberSequenceKeypoint.new(0.18, 0.5), NumberSequenceKeypoint.new(0.5, 0.42), NumberSequenceKeypoint.new(0.82, 0.5), NumberSequenceKeypoint.new(1, 0.85) }) }, band)
    for _, ey in ipairs({ 0.1, 0.9 }) do   -- 길 가장자리 자국
      mk("Frame", { Position = UDim2.new(0, 0, ey, 0), Size = UDim2.new(1, 0, 0, math.max(1, 2 * u)), BackgroundColor3 = Color3.fromRGB(10, 6, 6), BackgroundTransparency = 0.55, BorderSizePixel = 0, ZIndex = 2 }, band)
    end
    for c = 1, 6 do   -- 칸 자리 발판
      local pad = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, self:colX(c, l, lanes), 0, yc), Size = UDim2.new(0, self.cw * u * 0.62, 0, hh * 0.9), BackgroundColor3 = Color3.fromRGB(0, 0, 0), BackgroundTransparency = 0.82, BorderSizePixel = 0, ZIndex = 2 }, R)
      mk("UICorner", { CornerRadius = UDim.new(1, 0) }, pad)
    end
  end
end
-- 2.5D 원근 배치: 레인 간격을 좁히고, 뒤(위) 레인일수록 오른쪽으로 밀고(사선) 작게 그린다. 앞 레인이 뒤 레인을 가린다
function M:laneY(l, lanes) lanes = lanes or 2; local lh = (lanes <= 3 and 116 or 88) * 0.68; local top = 338 - lh * lanes / 2; return self.oy + (top + (l + 0.5) * lh) * self.u, lh * self.u end
function M:laneShift(l, lanes) lanes = lanes or 2; return (lanes - 1 - (l or 0)) * self.cw * 0.3 end
function M:depth(l, lanes) lanes = lanes or 2; return 1 - 0.09 * (lanes - 1 - (l or 0)) end
function M:colX(c, l, lanes) return self.ox + (196 + (c - 0.5) * self.cw + self:laneShift(l, lanes)) * self.u end

function M:floatText(text, x, y, color, size)
  if not M.OPT.dmg then return end
  local ts = math.floor((size or 16) * self.u * 1.4)   -- 큰 피해 숫자
  local t = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(0, ts * 6, 0, ts + 6), AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0, x, 0, y), Text = text, TextColor3 = color or Color3.new(1, 1, 0.8), Font = Enum.Font.GothamBlack, TextSize = ts, ZIndex = 20 }, self.layer)
  local st = mk("UIStroke", { Thickness = 2.5, Color = Color3.fromRGB(20, 10, 30) }, t)
  local tw = TweenService:Create(t, TweenInfo.new(0.7), { Position = UDim2.new(0, x, 0, y - 40 * self.u), TextTransparency = 1 }); tw:Play(); TweenService:Create(st, TweenInfo.new(0.7), { Transparency = 1 }):Play(); tw.Completed:Connect(function() t:Destroy() end)
end

local function unitFor(S, e, lanes)
  local dep = e.bs and 1 or S:depth(e.l, lanes)
  local u = S.units[e.id]; if u then return u end
  local boss = e.bs ~= nil
  local key, hue = e.sp, e.hu
  local size = (boss and math.min(290, 84 * (e.scl or 3)) or (e.tier == "elite" and 124 or 86)) * S.u * dep   -- 웹보다 약 1.33배 크게 (일반 86 · 정예 124 · 보스 sc*84, 2026-11-03)
  local lab, info
  if boss then lab = Sprites.artLabel(S.layer, "boss" .. (e.bs or 0), size)   -- 보스 그림 (있으면 색조와 상관없이)
  else
    if e.ar then lab = Sprites.artLabel(S.layer, e.ar, size) end   -- 지역별 몬스터 그림
    if not lab and key and (hue or 0) == 0 then lab = Sprites.artLabel(S.layer, key, size) end   -- 1지역 그림 (색조 변형은 도트)
  end
  local art = lab ~= nil
  if art then -- 일러스트 사용
  elseif boss then lab, info = Sprites.label(S.layer, "bosses", e.bh or 0, true, size); Sprites.setBoss(lab, info, e.bs)
  else lab, info = Sprites.label(S.layer, key or "ghoul", hue or 0, true, size) end
  lab.ZIndex = 5 + (e.l or 0) * 2
  local shadow = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.new(0, size * 0.55, 0, size * 0.13), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.55, BorderSizePixel = 0, ZIndex = 4 + (e.l or 0) * 2 }, S.layer)
  mk("UICorner", { CornerRadius = UDim.new(1, 0) }, shadow)
  local cT, cM, cB
  if boss then cT, cM, cB = Color3.fromRGB(255, 140, 100), Color3.fromRGB(210, 50, 40), Color3.fromRGB(110, 15, 15)
  elseif e.tier == "elite" then cT, cM, cB = Color3.fromRGB(255, 230, 130), Color3.fromRGB(230, 160, 40), Color3.fromRGB(130, 70, 10)
  else cT, cM, cB = Color3.fromRGB(255, 130, 110), Color3.fromRGB(200, 50, 45), Color3.fromRGB(100, 15, 15) end
  local MB = fancyBar(S.layer, UDim2.new(), UDim2.new(0, size * (e.tier == "normal" and 0.55 or 0.75), 0, math.max(5, (e.tier == "normal" and 5 or 7) * S.u)), cT, cM, cB, 15, e.tier == "normal" and 0 or 5, 2)
  MB.bg.AnchorPoint = Vector2.new(0.5, 1); MB.bg.Visible = e.tier ~= "normal"   -- 일반 몹은 맞은 뒤부터 보인다
  local bar = MB.bg
  u = { lab = lab, info = info, art = art, shadow = shadow, bar = bar, MB = MB, boss = boss, key = key, size = size, x = S.W + 40, y = 0, t = math.random() * 3, dying = nil }
  if boss and art then u.idleArt = Sprites.art("boss" .. (e.bs or 0)); u.atkArt = Sprites.art("boss" .. (e.bs or 0) .. "_atk") end   -- 보스 공격 자세 그림
  S.units[e.id] = u; return u
end

function M:applySnap(s, lanes)
  setBar(self.hpB, s.hp); setBar(self.mpB, s.mp or 0)
  local H = self.hud or {}
  self.hpTxt.Text = H.maxHp and (fmt(math.max(0, s.hp) * H.maxHp) .. " / " .. fmt(H.maxHp)) or (math.floor(s.hp * 100) .. "%")
  self.mpTxt.Text = math.floor(math.clamp(s.mp or 0, 0, 1) * 100) .. "%"
  local boss
  for _, e in ipairs(s.e) do if e.tier == "boss" and not e.dead then boss = e end end
  self.boss.Visible = boss ~= nil
  if boss then self.bossName.Text = "☠ " .. tostring(boss.n or ""); setBar(self.bossB, boss.hp); self.bossPct.Text = math.floor(boss.hp * 100) .. "%" end
  if s.c then for _, c in ipairs(s.c) do local cell = self.skillCells[c[1]]; if cell then cell.left = cell.cd end end end
  local seen = {}
  local py = self.plY
  local hits = {}
  -- 같은 칸에 몹이 여럿이면 칸 안에서 고르게 펼친다 (예전엔 3자리뿐이라 오른쪽 칸에 겹쳐 쌓여 보였다)
  local cellN, cellK = {}, {}
  for _, e in ipairs(s.e) do if e.tier == "normal" and not e.dead then local key = e.l .. ":" .. e.c; cellN[key] = (cellN[key] or 0) + 1; cellK[e.id] = cellN[key] end end
  for _, e in ipairs(s.e) do
    seen[e.id] = true
    local u = unitFor(self, e, lanes)
    local cy, lh = self:laneY(e.l, lanes); local cw = (self.W - 150) / 6
    local x = self:colX(e.c + ((e.w or 1) - 1) / 2, e.l + ((e.h or 1) - 1) / 2, lanes); local y = cy + ((e.h or 1) - 1) * lh / 2 + lh * 0.3
    if not u.boss and e.tier == "normal" then
      local cnt, kk = cellN[e.l .. ":" .. e.c] or 1, cellK[e.id] or 1
      if cnt > 1 then   -- 칸 너비의 70% 안에서 지그재그로 (앞뒤로 살짝 엇갈려 겹쳐도 보이게)
        local span = self.cw * self.u * 0.7
        x += ((kk - 1) / (cnt - 1) - 0.5) * span
        y += ((kk % 2 == 0) and 1 or -1) * 6 * self.u
      end
    end
    if not u.placed then u.placed = true; u.x = self.W + u.size * 0.6; u.y = y end   -- 오른쪽 끝에서 길을 따라 걸어 들어온다
    u.tx, u.ty = x, y; u.hp = e.hp
    if e.dead and not u.dying then u.dying = 0; Fx.death(self, u); if e.tier ~= "normal" then self.shake = math.max(self.shake or 0, 0.3) end; self.kills += 1; self.killLbl.Text = string.format("☠  Kills %d", self.kills) end
    if e.d and e.d > 0 then self:floatText(fmt(e.d), x, y - u.size * 0.8, e.tier == "boss" and Color3.fromRGB(255, 190, 120) or Color3.fromRGB(255, 244, 200), e.d > 0 and 15 or 13); u.hit = 0.16; hits[#hits + 1] = u; if #hits <= 6 then Fx.hit(self, u) end end
    if u.wind and not e.wind and not e.dead then u.atk = 0; Fx.enemyHit(self, u, e.ranged) end   -- 모았던 공격을 내지른다
    u.wind = e.wind
    if u.atkArt then local pose = (e.wind or u.atk) and "atk" or "idle"; if pose ~= u.pose then u.pose = pose; u.lab.ImageContent = (pose == "atk" and u.atkArt or u.idleArt).content end end   -- 공격을 모으거나 내지를 때 공격 자세
  end
  for id, u in pairs(self.units) do if not seen[id] and not u.dying then u.dying = 0; Fx.death(self, u); self.kills += 1; self.killLbl.Text = string.format("☠  Kills %d", self.kills) end end
  if s.ph and s.ph > 0 then self.shake = math.max(self.shake or 0, 0.18) end
  if s.ph then self:floatText("-" .. fmt(s.ph), self.plX, py - 100 * self.u, Color3.fromRGB(255, 100, 110), 16); local an = self.plAnim and self.plAnim.name; if an == "idle" or an == "hurt" or an == nil then self.plAnim = { name = "hurt", t = 0 } else self.plHurt = 0.2 end end   -- 공격 동작 중에 맞으면 동작은 끝까지, 붉은 번쩍임만
  if s.c then   -- 스킬 연출 (계열 · 원소 · 종류별, BattleFx)
    local tgt; for _, u in pairs(self.units) do if not u.dying and u.tx and (not tgt or u.tx < tgt.tx) then tgt = u end end
    table.sort(hits, function(a, b) return (a.tx or 0) < (b.tx or 0) end)
    for i, c in ipairs(s.c) do if i <= 3 then Fx.cast(self, c, hits, tgt) end end
  end
end

-- replay = { snaps, lanes, win, total }, onDone(): 재생이 끝났을 때. maxSec: 최대 재생 시간(길면 배속)
-- 전투 HUD 정보: { title, level, maxHp, skills = { {id, name, cd, color, icon} }, speed, owns4, onSpeed(n), onBuy4() }
function M:setHud(h)
  self.hud = h or {}
  self.titleLbl.Text = h and h.title or ""; self.lvLbl.Text = tostring(h and h.level or 1)
  self.userSpd = math.clamp((h and h.speed) or 1, 1, 4); if self.userSpd == 4 and not (h and h.owns4) then self.userSpd = 3 end
  self.spdBtn.Text = "x" .. self.userSpd .. " ▼"; self.spdOpts[4].Text = (h and h.owns4) and "x4" or "x4 🔒"
  for i = 1, 4 do self.spdOpts[i].BackgroundColor3 = i == self.userSpd and Color3.fromRGB(200, 140, 40) or Color3.fromRGB(65, 62, 80) end
  for _, c in ipairs(self.skillBar:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end
  self.skillCells = {}
  local k = M.HUD
  for i, sk in ipairs((h and h.skills) or {}) do
    local col = sk.color or Color3.fromRGB(200, 200, 220)
    local f = mk("Frame", { Size = UDim2.new(0, 58 * k, 0, 58 * k), BackgroundColor3 = Color3.fromRGB(30, 22, 52), LayoutOrder = i, ZIndex = 9 }, self.skillBar)
    mk("UICorner", { CornerRadius = UDim.new(0, 10 * k) }, f); mk("UIStroke", { Color = col, Thickness = 2.5 }, f)
    mk("UIGradient", { Color = ColorSequence.new(col:Lerp(Color3.new(0, 0, 0), 0.5), Color3.fromRGB(22, 16, 36)), Rotation = 90 }, f)
    mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0.7, 0), Text = sk.icon or "✦", TextScaled = true, Font = Theme.FONT, TextColor3 = col, ZIndex = 10 }, f)
    local nm = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(0, 0, 0.66, 0), Size = UDim2.new(1, 0, 0.34, 0), Text = sk.name or "", TextScaled = true, Font = Theme.FONT, TextColor3 = Color3.new(1, 1, 1), ZIndex = 10 }, f)
    mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, nm)
    local ov = mk("Frame", { AnchorPoint = Vector2.new(0, 1), Position = UDim2.new(0, 0, 1, 0), Size = UDim2.new(1, 0, 0, 0), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.4, BorderSizePixel = 0, ZIndex = 11 }, f)
    mk("UICorner", { CornerRadius = UDim.new(0, 10 * k) }, ov)
    self.skillCells[sk.id] = { cd = math.max(0.3, sk.cd or 1), left = 0, ov = ov }
  end
end
function M:speedMenu(open)
  self.spdOpen = open
  TweenService:Create(self.spdList, TweenInfo.new(0.22, Enum.EasingStyle.Quad), { Size = UDim2.new(0, 108, 0, open and 156 or 0) }):Play()
end
function M:pickSpeed(i)
  local H = self.hud or {}
  self:speedMenu(false)
  if i == 4 and not H.owns4 then if H.onBuy4 then H.onBuy4() end; return end
  self.userSpd = i; self.spdBtn.Text = "x" .. i .. " ▼"
  for j = 1, 4 do self.spdOpts[j].BackgroundColor3 = j == i and Color3.fromRGB(200, 140, 40) or Color3.fromRGB(65, 62, 80) end
  if H.onSpeed then H.onSpeed(i) end
end
function M:play(replay, onDone, maxSec, hud)
  for id, u in pairs(self.units) do u.lab:Destroy(); u.bar:Destroy(); if u.shadow then u.shadow:Destroy() end end; self.units = {}
  self.buildBg(replay.act or 1); self:buildLanes(replay.lanes or 2)
  if hud then self:setHud(hud) end
  self.kills = 0; self.killLbl.Text = string.format("☠  Kills %d", 0); self.boss.Visible = false; self.skillBar.Visible = next(self.skillCells) ~= nil
  self.replay = replay; self.t = 0; self.idx = 0; self.onDone = onDone; self.ctrl.Visible = true
  local total = (replay.snaps[#replay.snaps] or { t = 1 }).t
  self.spd = math.max(1, total / (maxSec or 40)); self.userSpd = self.userSpd or 1
  if self.conn then self.conn:Disconnect() end
  local lanes = replay.lanes or 2
  self.conn = RunService.RenderStepped:Connect(function(dt)
    if not self.alive then return end
    barTick(self.hpB, dt); barTick(self.mpB, dt); barTick(self.bossB, dt)
    local slow = 1; if self.hitstop and self.hitstop > 0 then self.hitstop -= dt; slow = 0.12 end   -- 히트스톱: 큰 타격 순간 잠깐 멈칫
    self.t += dt * self.spd * self.userSpd * slow; self.idleT = (self.idleT or 0) + dt
    local sn = replay.snaps
    while self.idx < #sn and sn[self.idx + 1].t <= self.t do self.idx += 1; self:applySnap(sn[self.idx], lanes) end
    self.timeLbl.Text = string.format("%.0f / %.0fs", math.min(self.t, total), total)
    for _, cell in pairs(self.skillCells) do if cell.left > 0 then cell.left = math.max(0, cell.left - dt * self.spd * self.userSpd); cell.ov.Size = UDim2.new(1, 0, cell.left / cell.cd, 0) end end
    if self.shake and self.shake > 0 then   -- 화면 흔들림 (그래픽 설정의 반짝임 세기를 따른다)
      self.shake -= dt; local m = 7 * self.u * M.OPT.flash * math.clamp(self.shake / 0.3, 0, 1)
      self.layer.Position = UDim2.new(0, (math.random() - 0.5) * m, 0, (math.random() - 0.5) * m)
    elseif self.layer.Position ~= UDim2.new() then self.layer.Position = UDim2.new() end
    -- 유닛 이동/애니메이션
    local k = math.min(1, dt * 9)
    for id, u in pairs(self.units) do
      u.t += dt
      if u.tx then local dx = (u.tx - u.x) * k; local cap = 420 * self.u * dt * self.spd * (self.userSpd or 1); u.x += math.clamp(dx, -cap, cap); u.y += (u.ty - u.y) * k end   -- 걷는 속도 상한
      u.lab.Position = UDim2.new(0, u.x, 0, u.y)
      u.shadow.Position = UDim2.new(0, u.x, 0, u.y); u.shadow.BackgroundTransparency = u.dying and math.min(1, 0.55 + u.dying) or 0.55
      u.bar.Position = UDim2.new(0, u.x, 0, u.y - u.size * 0.95); setBar(u.MB, u.hp or 1); barTick(u.MB, dt); if (u.hp or 1) < 0.999 and not u.dying then u.bar.Visible = true end
      if u.art then   -- 일러스트: 걸을 때 발걸음마다 들썩 · 서 있을 땐 숨쉬기 · 공격 직전 움츠렸다 확 덤벼듦 · 맞으면 크게 밀려남 · 쓰러질 땐 날아가며 넘어짐
        local ox, oy, rot = 0, 0, 0
        local uu = self.u
        if u.dying then
          local k = math.clamp(u.dying / 0.6, 0, 1)
          ox = (u.boss and 10 or 34) * uu * (1 - (1 - k) ^ 2); oy = -18 * uu * math.sin(k * math.pi) + 8 * uu * k
          rot = (u.boss and 25 or 85) * k * k
          local c = 1 - 0.75 * k; u.lab.ImageColor3 = Color3.new(c, c * 0.9, c * 0.9); u.lab.ImageTransparency = math.clamp((u.dying - 0.6) / 0.5, 0, 1)
        else
          local walking = u.tx and math.abs(u.tx - u.x) > 3
          if walking then local ph = u.t * 9 + (u.lab.LayoutOrder or 0); oy = -math.abs(math.sin(ph)) * 7 * uu; rot = math.sin(ph) * 4
          else oy = math.sin(u.t * 2.4) * 1.5 * uu end
          if u.wind then local k = math.min(1, u.t % 0.6 / 0.6); ox = 10 * uu * k; rot = 6 * k; oy -= 3 * uu * k end   -- 힘을 모은다 (뒤로 젖힘)
          if u.atk then   -- 덤벼든다
            u.atk += dt; local k = u.atk
            if k < 0.08 then ox = -38 * uu * (k / 0.08); rot = -10 elseif k < 0.3 then ox = -38 * uu * (1 - (k - 0.08) / 0.22); rot = -10 * (1 - (k - 0.08) / 0.22) else u.atk = nil end
          end
        end
        if u.hit and u.hit > 0 and not u.dying then ox += (u.boss and 6 or 16) * uu * u.hit / 0.16 + math.sin(u.t * 80) * 2.5 * uu; rot += (u.boss and 2 or 7) * u.hit / 0.16 end
        u.lab.Rotation = rot; u.lab.Position = UDim2.new(0, u.x + ox, 0, u.y + oy)
      elseif not u.boss and u.info then
        local anim = "idle"; if u.dying then anim = "death" elseif u.wind then anim = "attack" elseif math.abs((u.tx or u.x) - u.x) > 3 then anim = "walk" end
        local row, frame = Sprites.anim(u.key, anim, anim == "death" and u.dying or u.t); Sprites.setFrame(u.lab, u.info, row, frame)
      elseif u.boss and u.dying then u.lab.ImageTransparency = math.min(1, u.dying) end
      if u.hit and u.hit > 0 then u.hit -= dt; if not u.dying then u.lab.ImageColor3 = Color3.new(1, 1 - 0.5 * M.OPT.flash, 1 - 0.5 * M.OPT.flash) end elseif not u.dying then u.lab.ImageColor3 = Color3.new(1, 1, 1) end
      if u.dying then u.dying += dt; u.bar.Visible = false; if u.dying > 1.1 then u.lab:Destroy(); u.bar:Destroy(); u.shadow:Destroy(); self.units[id] = nil end end
    end
    if self.plArt then self.plAnim.t += dt * slow; if self.plHurt then self.plHurt -= dt end; M.artPose(self)
    elseif self.plInfo then
      local a = self.plAnim; a.t += dt
      local row, frame, done = Sprites.anim("warrior", a.name, a.t); if done then self.plAnim = { name = "idle", t = 0 } end
      Sprites.setFrame(self.pl, self.plInfo, row, frame)
    end
    if self.idx >= #sn and self.t >= total + 0.8 then self.conn:Disconnect(); self.conn = nil; self:hudOff(); if self.onDone then local f = self.onDone; self.onDone = nil; f() end end
  end)
end
function M:hudOff() self.ctrl.Visible = false; self.skillBar.Visible = false; self.boss.Visible = false; self:speedMenu(false) end
function M:skip() self:hudOff(); if self.conn then self.conn:Disconnect(); self.conn = nil end; if self.onDone then local f = self.onDone; self.onDone = nil; f() end end
function M:destroy() self.alive = false; if self.idleConn then self.idleConn:Disconnect() end; if self.conn then self.conn:Disconnect() end; self.root:Destroy() end
return M
