-- 2D 전투 무대: 서버가 기록한 타임라인(result.replay)을 재생한다. 클라이언트 전용.
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Sprites = require(script.Parent.Sprites)
local M = {}

local function mk(class, props, parent) local o = Instance.new(class); for k, v in pairs(props) do o[k] = v end; o.Parent = parent; return o end
local function hex(h) local ok, c = pcall(Color3.fromHex, h or "#ffffff"); return ok and c or Color3.new(1, 1, 1) end
local function fmt(n) n = math.floor(n); if n >= 1e9 then return string.format("%.1fB", n / 1e9) elseif n >= 1e6 then return string.format("%.1fM", n / 1e6) elseif n >= 1e4 then return string.format("%.1fK", n / 1e3) end return tostring(n) end

function M.create(parent, W, H)
  local S = { W = W, H = H, units = {}, t = 0, idx = 0, spd = 1, alive = true }
  local root = mk("Frame", { Size = UDim2.new(0, W, 0, H), BackgroundColor3 = Color3.fromRGB(40, 30, 70), ClipsDescendants = true }, parent)
  mk("UICorner", { CornerRadius = UDim.new(0, 8) }, root)
  local sky = mk("Frame", { Size = UDim2.new(1, 0, 0.55, 0), BackgroundColor3 = Color3.fromRGB(70, 50, 120), BorderSizePixel = 0 }, root)
  mk("UIGradient", { Color = ColorSequence.new(Color3.fromRGB(32, 24, 66), Color3.fromRGB(120, 78, 150)), Rotation = 90 }, sky)
  local ground = mk("Frame", { Position = UDim2.new(0, 0, 0.5, 0), Size = UDim2.new(1, 0, 0.5, 0), BackgroundColor3 = Color3.fromRGB(58, 44, 82), BorderSizePixel = 0 }, root)
  mk("UIGradient", { Color = ColorSequence.new(Color3.fromRGB(92, 70, 112), Color3.fromRGB(34, 26, 52)), Rotation = 90 }, ground)
  for i = 1, 5 do   -- 먼 산
    mk("Frame", { Position = UDim2.new((i - 1) / 5, 0, 0.32, 0), Size = UDim2.new(0.28, 0, 0.2, 0), Rotation = 45, BackgroundColor3 = Color3.fromRGB(56, 40, 92), BorderSizePixel = 0, ZIndex = 1 }, root)
  end
  S.root = root; S.layer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 3 }, root)
  -- 플레이어
  S.pl, S.plInfo = Sprites.label(S.layer, "warrior", 0, false, 72)
  S.pl.Position = UDim2.new(0, 56, 0, H * 0.72); S.pl.ZIndex = 5
  -- 상태 바
  local function bar(y, color) local bg = mk("Frame", { Position = UDim2.new(0, 10, 1, y), Size = UDim2.new(0, 160, 0, 10), BackgroundColor3 = Color3.fromRGB(18, 14, 30), ZIndex = 8 }, root); mk("UICorner", { CornerRadius = UDim.new(0, 5) }, bg)
    local f = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = color, ZIndex = 9 }, bg); mk("UICorner", { CornerRadius = UDim.new(0, 5) }, f); return f end
  S.hpBar = bar(-34, Color3.fromRGB(220, 70, 80)); S.mpBar = bar(-20, Color3.fromRGB(80, 140, 230))
  S.timeLbl = mk("TextLabel", { BackgroundTransparency = 1, Position = UDim2.new(1, -110, 0, 6), Size = UDim2.new(0, 100, 0, 20), Text = "", TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = 13, TextXAlignment = Enum.TextXAlignment.Right, ZIndex = 9 }, root)
  S.plAnim = { name = "idle", t = 0 }
  return setmetatable(S, { __index = M })
end

function M:laneY(l, lanes) local top, bot = self.H * 0.5, self.H * 0.92; local lh = (bot - top) / math.max(1, lanes); return top + (l + 0.5) * lh, lh end
function M:colX(c) return 120 + (c - 0.5) * ((self.W - 150) / 6) end

function M:floatText(text, x, y, color, size)
  local t = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(0, 100, 0, 22), AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0, x, 0, y), Text = text, TextColor3 = color or Color3.new(1, 1, 0.8), Font = Enum.Font.GothamBlack, TextSize = size or 16, ZIndex = 20 }, self.layer)
  mk("UIStroke", { Thickness = 2, Color = Color3.fromRGB(20, 10, 30) }, t)
  local tw = TweenService:Create(t, TweenInfo.new(0.7), { Position = UDim2.new(0, x, 0, y - 34), TextTransparency = 1 }); tw:Play(); tw.Completed:Connect(function() t:Destroy() end)
end
function M:flash(color, x1, y1, x2, y2)
  local len = math.max(8, math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2)); local ang = math.deg(math.atan2(y2 - y1, x2 - x1))
  local f = mk("Frame", { AnchorPoint = Vector2.new(0, 0.5), Position = UDim2.new(0, x1, 0, y1), Size = UDim2.new(0, len, 0, 5), Rotation = ang, BackgroundColor3 = color, BorderSizePixel = 0, ZIndex = 12 }, self.layer)
  mk("UIGradient", { Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(1, 0) }) }, f)
  local tw = TweenService:Create(f, TweenInfo.new(0.22), { BackgroundTransparency = 1, Size = UDim2.new(0, len, 0, 1) }); tw:Play(); tw.Completed:Connect(function() f:Destroy() end)
end

local function unitFor(S, e, lanes)
  local u = S.units[e.id]; if u then return u end
  local boss = e.bs ~= nil
  local key, hue = e.sp, e.hu
  local size = boss and math.min(150, 110 * (e.scl or 3) / 3 + 20) or (e.tier == "elite" and 84 or 58)
  local lab, info
  if boss then lab, info = Sprites.label(S.layer, "bosses", e.bh or 0, true, size); Sprites.setBoss(lab, info, e.bs)
  else lab, info = Sprites.label(S.layer, key or "ghoul", hue or 0, true, size) end
  lab.ZIndex = 4 + (e.l or 0)
  local bar = mk("Frame", { Size = UDim2.new(0, size * 0.7, 0, 5), AnchorPoint = Vector2.new(0.5, 1), BackgroundColor3 = Color3.fromRGB(18, 14, 30), ZIndex = 15 }, S.layer)
  local fill = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = boss and Color3.fromRGB(230, 90, 60) or (e.tier == "elite" and Color3.fromRGB(240, 190, 60) or Color3.fromRGB(110, 210, 110)), ZIndex = 16 }, bar)
  u = { lab = lab, info = info, bar = bar, fill = fill, boss = boss, key = key, size = size, x = S.W + 40, y = 0, t = math.random() * 3, dying = nil }
  S.units[e.id] = u; return u
end

function M:applySnap(s, lanes)
  self.hpBar.Size = UDim2.new(math.clamp(s.hp, 0, 1), 0, 1, 0); self.mpBar.Size = UDim2.new(math.clamp(s.mp or 0, 0, 1), 0, 1, 0)
  local seen = {}
  local py = self.pl.Position.Y.Offset
  for _, e in ipairs(s.e) do
    seen[e.id] = true
    local u = unitFor(self, e, lanes)
    local cy, lh = self:laneY(e.l, lanes); local cw = (self.W - 150) / 6
    local x = self:colX(e.c + ((e.w or 1) - 1) / 2); local y = cy + ((e.h or 1) - 1) * lh / 2 + lh * 0.3
    if not u.boss and e.tier == "normal" then local n = (e.id % 3) - 1; x += n * 14; y += n * 5 end
    u.tx, u.ty = x, y; u.hp = e.hp
    if e.dead and not u.dying then u.dying = 0 end
    if e.d and e.d > 0 then self:floatText(fmt(e.d), x, y - u.size * 0.8, e.tier == "boss" and Color3.fromRGB(255, 190, 120) or Color3.fromRGB(255, 244, 200), e.d > 0 and 15 or 13); u.hit = 0.12 end
    u.wind = e.wind
  end
  for id, u in pairs(self.units) do if not seen[id] and not u.dying then u.dying = 0 end end
  if s.ph then self:floatText("-" .. fmt(s.ph), 60, py - 70, Color3.fromRGB(255, 100, 110), 16); self.plAnim = { name = "hurt", t = 0 } end
  if s.c then
    local tgt; for _, u in pairs(self.units) do if not u.dying and u.tx and (not tgt or u.tx < tgt.tx) then tgt = u end end
    for _, c in ipairs(s.c) do
      local col = hex(c[2]); local x2, y2 = (tgt and tgt.tx or self.W - 80), (tgt and tgt.ty - 30 or py - 30)
      self:flash(col, 80, py - 30, x2, y2)
      if c[4] ~= "single" then self:flash(col, 80, py - 30, x2 + 20, y2 + 24); self:flash(col, 80, py - 30, x2 + 20, y2 - 24) end
    end
    self.plAnim = { name = "attack", t = 0 }
  end
end

-- replay = { snaps, lanes, win, total }, onDone(): 재생이 끝났을 때. maxSec: 최대 재생 시간(길면 배속)
function M:play(replay, onDone, maxSec)
  self.replay = replay; self.t = 0; self.idx = 0; self.onDone = onDone
  local total = (replay.snaps[#replay.snaps] or { t = 1 }).t
  self.spd = math.max(1, total / (maxSec or 40)); self.userSpd = 1
  if self.conn then self.conn:Disconnect() end
  local lanes = replay.lanes or 2
  self.conn = RunService.RenderStepped:Connect(function(dt)
    if not self.alive then return end
    self.t += dt * self.spd * self.userSpd
    local sn = replay.snaps
    while self.idx < #sn and sn[self.idx + 1].t <= self.t do self.idx += 1; self:applySnap(sn[self.idx], lanes) end
    self.timeLbl.Text = string.format("%.0f / %.0f초  x%.1f", math.min(self.t, total), total, self.spd * self.userSpd)
    -- 유닛 이동/애니메이션
    local k = math.min(1, dt * 9)
    for id, u in pairs(self.units) do
      u.t += dt
      if u.tx then u.x += (u.tx - u.x) * k; u.y += (u.ty - u.y) * k end
      u.lab.Position = UDim2.new(0, u.x, 0, u.y)
      u.bar.Position = UDim2.new(0, u.x, 0, u.y - u.size * 0.95); u.fill.Size = UDim2.new(math.clamp(u.hp or 1, 0, 1), 0, 1, 0)
      if not u.boss and u.info then
        local anim = "idle"; if u.dying then anim = "death" elseif u.wind then anim = "attack" elseif math.abs((u.tx or u.x) - u.x) > 3 then anim = "walk" end
        local row, frame = Sprites.anim(u.key, anim, anim == "death" and u.dying or u.t); Sprites.setFrame(u.lab, u.info, row, frame)
      elseif u.boss and u.dying then u.lab.ImageTransparency = math.min(1, u.dying) end
      if u.hit and u.hit > 0 then u.hit -= dt; u.lab.ImageColor3 = Color3.new(1, 0.7, 0.7) else u.lab.ImageColor3 = Color3.new(1, 1, 1) end
      if u.dying then u.dying += dt; u.bar.Visible = false; if u.dying > 1.1 then u.lab:Destroy(); u.bar:Destroy(); self.units[id] = nil end end
    end
    if self.plInfo then
      local a = self.plAnim; a.t += dt
      local row, frame, done = Sprites.anim("warrior", a.name, a.t); if done then self.plAnim = { name = "idle", t = 0 } end
      Sprites.setFrame(self.pl, self.plInfo, row, frame)
    end
    if self.idx >= #sn and self.t >= total + 0.8 then self.conn:Disconnect(); self.conn = nil; if self.onDone then self.onDone() end end
  end)
end
function M:skip() if self.conn then self.conn:Disconnect(); self.conn = nil end; if self.onDone then local f = self.onDone; self.onDone = nil; f() end end
function M:faster() self.userSpd = self.userSpd >= 4 and 1 or self.userSpd * 2 end
function M:destroy() self.alive = false; if self.conn then self.conn:Disconnect() end; self.root:Destroy() end
return M
