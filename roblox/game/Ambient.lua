-- 배경 생동감 (마을 · 전투 공용). 배경 그림은 고정하고, 그 위에서 불 · 빛 · 구름 · 새 · 불씨 · 안개 · 연기가 움직인다.
-- M.attach(부모, o): 좌표는 부모 기준 비율(0~1), 크기는 부모 높이 비율
--   o.z, o.patches = { {key, x, y, w, h} } (배경에서 잘라 만든 불 8프레임, 배경과 같은 자리), o.fires = { {x, y(불꽃 밑), h} }, o.lights = { {x, y, r} }, o.clouds = { y0, y1, n }, o.birds = true, o.embers = n, o.fog = true
-- M.smoke(부모, x, y): 굴뚝 연기
local RunService = game:GetService("RunService")
local Sprites = require(script.Parent.Sprites)
local M = {}
local function mk(c, p, par) local o = Instance.new(c); for k, v in pairs(p) do o[k] = v end; o.Parent = par; return o end
local FIRE_COLOR, LIGHT_COLOR = Color3.fromRGB(255, 140, 50), Color3.fromRGB(255, 175, 90)

local function loop(fx, parent, fn)
  local t0 = os.clock()
  local conn; conn = RunService.RenderStepped:Connect(function(dt)
    if not fx.Parent then conn:Disconnect(); return end
    if fx.AbsoluteSize.X < 1 or (parent:IsA("GuiObject") and not parent.Visible) then return end
    fn(os.clock() - t0, dt, fx.AbsoluteSize)
  end)
end

function M.attach(parent, o)
  o = o or {}
  local z = o.z or 1
  local fx = mk("Frame", { Name = "Ambient", Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ClipsDescendants = true, ZIndex = z }, parent)
  local glowArt, fireArt, crowArt = Sprites.art("fx_glow"), Sprites.art("fx_fire"), Sprites.art("fx_crow")
  local function glow(x, y, r, col)
    if not glowArt then return nil end
    return mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(x, 0, y, 0), Size = UDim2.new(r * 2, 0, r * 2, 0), SizeConstraint = Enum.SizeConstraint.RelativeYY,
      BackgroundTransparency = 1, ImageContent = glowArt.content, ImageColor3 = col, ImageTransparency = 0.5, ZIndex = z }, fx)
  end
  -- 구름 (위쪽 하늘 띠에서 천천히 흘러간다)
  local clouds = {}
  if o.clouds then
    -- 두 겹(먼 구름: 작고 느리고 흐림 / 가까운 구름: 크고 빠름), 겹마다 같은 간격으로 3개씩 → 화면에 늘 구름이 지나간다
    local y0, y1 = o.clouds[1], o.clouds[2]
    for layer = 1, 2 do
      local far = layer == 1
      for j = 1, 3 do
        local a = Sprites.art("fx_cloud" .. ((j + layer) % 3 + 1))
        if a then
          local c = mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.new((far and 0.3 or 0.48) + math.random() * 0.08, 0, 0, 0), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Stretch,
            ImageTransparency = far and 0.55 or 0.35, ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = z }, fx)
          clouds[#clouds + 1] = { f = c, x = -0.3 + (j - 1) / 3 * 1.6 + (far and 0.27 or 0), y = far and (y0 + (y1 - y0) * 0.25) or (y0 + (y1 - y0) * (0.55 + 0.3 * math.random())), sp = far and 0.007 or 0.012 }
        end
      end
    end
  end
  -- 안개 띠 (전투 들판)
  local fogs = {}
  if o.fog then
    for i, y in ipairs({ 0.58, 0.74 }) do
      local f = mk("Frame", { Position = UDim2.new(0, 0, y, 0), Size = UDim2.new(2, 0, 0.2, 0), BackgroundColor3 = Color3.fromRGB(70, 40, 40), BorderSizePixel = 0, ZIndex = z }, fx)
      mk("UIGradient", { Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.2, 0.82), NumberSequenceKeypoint.new(0.35, 0.9), NumberSequenceKeypoint.new(0.55, 0.8), NumberSequenceKeypoint.new(0.75, 0.88), NumberSequenceKeypoint.new(1, 1) }) }, f)
      fogs[i] = { f = f, sp = i == 1 and 0.012 or -0.018, y = y }
    end
  end
  -- 창문 · 랜턴 불빛 (은은하게 깜빡)
  local lights = {}
  for _, l in ipairs(o.lights or {}) do local g = glow(l[1], l[2], l[3], LIGHT_COLOR); if g then lights[#lights + 1] = { g = g, ph = math.random() * 6.28 } end end
  -- 불 (화로 · 횃불): 빛무리 + 타오르는 불꽃 + 튀는 불씨
  local fires, sparks = {}, {}
  for _, f in ipairs(o.fires or {}) do
    local g = glow(f[1], f[2] - f[3] * 0.4, f[3] * 2.2, FIRE_COLOR)
    local fl = fireArt and mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(f[1], 0, f[2], 0), Size = UDim2.new(f[3] * 64 / 96, 0, f[3], 0), SizeConstraint = Enum.SizeConstraint.RelativeYY,
      BackgroundTransparency = 1, ImageContent = fireArt.content, ImageRectSize = Vector2.new(fireArt.w / 8, fireArt.h), ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = z }, fx)
    fires[#fires + 1] = { g = g, fl = fl, ph = math.random() * 8, sp = 9 + math.random() * 3 }
    for _ = 1, 3 do
      local s = mk("Frame", { Size = UDim2.new(0, 2, 0, 2), BackgroundColor3 = Color3.fromRGB(255, 200, 90), BorderSizePixel = 0, ZIndex = z }, fx)
      sparks[#sparks + 1] = { f = s, x0 = f[1], y0 = f[2] - f[3] * 0.6, h = f[3], life = math.random(), sp = 0.6 + math.random() * 0.6, dx = (math.random() - 0.5) * 0.02 }
    end
  end
  -- 배경 불 패치: 배경에 그려진 불을 그대로 일렁이게 (fire_anim.py)
  local patches = {}
  for _, p in ipairs(o.patches or {}) do
    local a = Sprites.art(p.key)
    if a then patches[#patches + 1] = { f = mk("ImageLabel", { Position = UDim2.new(p.x, 0, p.y, 0), Size = UDim2.new(p.w, 0, p.h, 0), BackgroundTransparency = 1, ImageContent = a.content,
      ImageRectSize = Vector2.new(a.w / 8, a.h), ScaleType = Enum.ScaleType.Stretch, ZIndex = z }, fx), fw = a.w / 8, ph = math.random() * 8, sp = 8 + math.random() * 3 } end
  end
  -- 떠다니는 불씨 (화면 전체)
  local embers = {}
  for i = 1, o.embers or 0 do
    local s = math.random(2, 4)
    local e = mk("Frame", { Size = UDim2.new(0, s, 0, s), BorderSizePixel = 0, ZIndex = z,
      BackgroundColor3 = (i % 4 == 0) and Color3.fromRGB(255, 225, 130) or (i % 2 == 0 and Color3.fromRGB(255, 130, 40) or Color3.fromRGB(230, 60, 30)) }, fx)
    embers[i] = { f = e, x = math.random(), y = math.random(), sp = 0.02 + math.random() * 0.05, ph = math.random() * 6.28 }
  end
  -- 새 (까마귀 떼가 가끔 하늘을 가로지른다)
  local birds, nextFlock = {}, 3 + math.random() * 5
  local function flock(t)
    if not crowArt then return end
    local y = (o.clouds and o.clouds[1] or 0.05) + 0.03 + math.random() * 0.12
    for i = 1, math.random(1, 4) do
      local b = mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.new(0.05, 0, 0.0375, 0), SizeConstraint = Enum.SizeConstraint.RelativeYY, BackgroundTransparency = 1,
        ImageContent = crowArt.content, ImageRectSize = Vector2.new(crowArt.w / 4, crowArt.h), ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = z }, fx)
      birds[#birds + 1] = { f = b, x = -0.05 - i * 0.04 - math.random() * 0.03, y = y + (math.random() - 0.5) * 0.05, sp = 0.07 + math.random() * 0.03, ph = math.random() * 4, t0 = t }
    end
  end
  loop(fx, parent, function(t, dt)
    for _, c in ipairs(clouds) do
      c.x += c.sp * dt; if c.x > 1.3 then c.x = -0.3 end
      c.f.Position = UDim2.new(c.x, 0, c.y, 0); c.f.Size = UDim2.new(c.f.Size.X.Scale, 0, 0, c.f.AbsoluteSize.X * 160 / 512)
    end
    for _, g in ipairs(fogs) do g.f.Position = UDim2.new(-0.5 + math.sin(t * g.sp * 5) * 0.45, 0, g.y + math.sin(t * 0.3) * 0.01, 0) end
    for _, l in ipairs(lights) do l.g.ImageTransparency = 0.68 + 0.1 * math.sin(t * 2.3 + l.ph) + 0.05 * math.sin(t * 7.1 + l.ph) end
    for _, f in ipairs(fires) do
      if f.fl then local i = math.floor(t * f.sp + f.ph) % 8; f.fl.ImageRectOffset = Vector2.new(i * f.fl.ImageRectSize.X, 0) end
      if f.g then f.g.ImageTransparency = 0.42 + 0.1 * math.sin(t * 8.3 + f.ph) * math.sin(t * 3.7 + f.ph * 2) end
    end
    for _, p in ipairs(patches) do p.f.ImageRectOffset = Vector2.new((math.floor(t * p.sp + p.ph) % 8) * p.fw, 0) end
    for _, s in ipairs(sparks) do
      s.life += dt * s.sp; if s.life > 1 then s.life = 0; s.dx = (math.random() - 0.5) * 0.02 end
      s.f.Position = UDim2.new(s.x0 + s.dx * s.life + math.sin(t * 5 + s.x0 * 40) * 0.003, 0, s.y0 - s.h * 1.6 * s.life, 0); s.f.BackgroundTransparency = s.life
    end
    for _, e in ipairs(embers) do
      e.y -= e.sp * dt; if e.y < -0.03 then e.y = 1.03; e.x = math.random() end
      e.f.Position = UDim2.new(e.x + math.sin(t * 0.9 + e.ph) * 0.012, 0, e.y, 0)
      e.f.BackgroundTransparency = math.clamp(0.05 + 0.5 * (0.5 + 0.5 * math.sin(t * 3 + e.ph)) + (1 - e.y) * 0.45, 0, 1)
    end
    if o.birds then
      nextFlock -= dt; if nextFlock <= 0 then nextFlock = 9 + math.random() * 10; flock(t) end
      for i = #birds, 1, -1 do
        local b = birds[i]
        b.x += b.sp * dt
        if b.x > 1.1 then b.f:Destroy(); table.remove(birds, i)
        else
          b.f.Position = UDim2.new(b.x, 0, b.y + math.sin(t * 2 + b.ph) * 0.01, 0)
          b.f.ImageRectOffset = Vector2.new((math.floor(t * 8 + b.ph) % 4) * b.f.ImageRectSize.X, 0)
        end
      end
    end
  end)
  return fx
end

-- 굴뚝 연기: 회색 덩어리가 피어올라 커지며 흐려진다
function M.smoke(parent, x, y)
  local fx = mk("Frame", { Name = "Smoke", Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = parent.ZIndex }, parent)
  local puffs = {}
  for i = 1, 7 do
    local p = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), BackgroundColor3 = Color3.fromRGB(70, 64, 66), BorderSizePixel = 0, ZIndex = parent.ZIndex }, fx)
    mk("UICorner", { CornerRadius = UDim.new(1, 0) }, p)
    puffs[i] = { f = p, life = (i - 1) / 7 }
  end
  loop(fx, parent, function(t, dt)
    for _, p in ipairs(puffs) do
      p.life += dt * 0.22; if p.life > 1 then p.life -= 1 end
      local l = p.life
      p.f.Position = UDim2.new(x + l * 0.12 + math.sin(t * 0.8 + l * 6) * 0.02, 0, y - l * 0.45, 0)
      p.f.Size = UDim2.new(0.06 + l * 0.16, 0, 0.06 + l * 0.16, 0)
      p.f.BackgroundTransparency = 0.45 + l * 0.55
    end
  end)
  return fx
end
return M
