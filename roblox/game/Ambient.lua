-- 배경 분위기 효과: 떠오르는 불씨 · 흐르는 안개 · 횃불처럼 깜빡이는 빛 · 배경 그림의 느린 흔들림 (마을 · 전투 공용)
-- M.attach(부모, { z = ZIndex, embers = 개수, sway = function() return 배경 ImageLabel end })
local RunService = game:GetService("RunService")
local M = {}
local function mk(c, p, par) local o = Instance.new(c); for k, v in pairs(p) do o[k] = v end; o.Parent = par; return o end

function M.attach(parent, o)
  o = o or {}
  local fx = mk("Frame", { Name = "Ambient", Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ClipsDescendants = true, ZIndex = o.z or 1 }, parent)
  -- 안개 띠 2줄: 화면보다 넓게 만들어 천천히 옆으로 흐른다
  local fogs = {}
  for i, y in ipairs({ 0.58, 0.74 }) do
    local f = mk("Frame", { Position = UDim2.new(0, 0, y, 0), Size = UDim2.new(2, 0, 0.2, 0), BackgroundColor3 = Color3.fromRGB(70, 40, 40), BorderSizePixel = 0, ZIndex = fx.ZIndex }, fx)
    mk("UIGradient", { Rotation = 0, Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.2, 0.82), NumberSequenceKeypoint.new(0.35, 0.9), NumberSequenceKeypoint.new(0.55, 0.8), NumberSequenceKeypoint.new(0.75, 0.88), NumberSequenceKeypoint.new(1, 1) }) }, f)
    fogs[i] = { f = f, sp = i == 1 and 0.012 or -0.018, y = y }
  end
  -- 횃불 빛: 아래쪽이 따뜻하게 일렁인다
  local glow = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(255, 130, 50), BackgroundTransparency = 0.9, BorderSizePixel = 0, ZIndex = fx.ZIndex }, fx)
  mk("UIGradient", { Rotation = 90, Transparency = NumberSequence.new(1, 0) }, glow)
  -- 불씨 (네모 도트): 아래에서 떠올라 흔들리며 사그라든다
  local embers = {}
  for i = 1, o.embers or 40 do
    local s = math.random(2, 4)
    local e = mk("Frame", { Size = UDim2.new(0, s, 0, s), BorderSizePixel = 0, ZIndex = fx.ZIndex,
      BackgroundColor3 = (i % 4 == 0) and Color3.fromRGB(255, 225, 130) or (i % 2 == 0 and Color3.fromRGB(255, 130, 40) or Color3.fromRGB(230, 60, 30)) }, fx)
    embers[i] = { f = e, x = math.random(), y = math.random(), sp = 0.02 + math.random() * 0.05, ph = math.random() * 6.28 }
  end
  local t0 = os.clock()
  local conn; conn = RunService.RenderStepped:Connect(function(dt)
    if not fx.Parent then conn:Disconnect(); return end
    if fx.AbsoluteSize.X < 1 or not parent:IsA("GuiObject") or not parent.Visible then return end
    local t = os.clock() - t0
    for _, e in ipairs(embers) do
      e.y -= e.sp * dt; if e.y < -0.03 then e.y = 1.03; e.x = math.random() end
      e.f.Position = UDim2.new(e.x + math.sin(t * 0.9 + e.ph) * 0.012, 0, e.y, 0)
      e.f.BackgroundTransparency = math.clamp(0.05 + 0.5 * (0.5 + 0.5 * math.sin(t * 3 + e.ph)) + (1 - e.y) * 0.45, 0, 1)
    end
    for _, g in ipairs(fogs) do g.f.Position = UDim2.new(-0.5 + math.sin(t * g.sp * 5) * 0.45, 0, g.y + math.sin(t * 0.3) * 0.01, 0) end   -- 천천히 왔다 갔다
    glow.BackgroundTransparency = 0.88 + 0.04 * math.sin(t * 7.3) * math.sin(t * 3.1)
    local art = o.sway and o.sway()
    if art then   -- 배경 그림을 살짝 크게 두고 아주 천천히 흔든다 (가만히 있는 그림 같지 않게)
      art.Size = UDim2.new(1.04, 0, 1.04, 0)
      art.Position = UDim2.new(-0.02 + math.sin(t * 0.11) * 0.015, 0, -0.03 + math.cos(t * 0.09) * 0.008, 0)
    end
  end)
  return fx
end
return M
