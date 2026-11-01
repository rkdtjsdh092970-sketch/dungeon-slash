-- 2D 전투 무대: 서버가 기록한 타임라인(result.replay)을 재생한다. 클라이언트 전용.
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Sprites = require(script.Parent.Sprites)
local M = {}

local function mk(class, props, parent) local o = Instance.new(class); for k, v in pairs(props) do o[k] = v end; o.Parent = parent; return o end
local function hex(h) local ok, c = pcall(Color3.fromHex, h or "#ffffff"); return ok and c or Color3.new(1, 1, 1) end
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
function M.create(parent, W, H, replayAct)
  -- 웹 게임 좌표(높이 540)를 화면 높이에 꽉 맞추고, 가로는 화면 비율대로 늘린다 (여백 없음. u = 가상 1픽셀의 실제 크기)
  -- 16:9 에서는 가로 960 으로 웹과 같고, 더 넓거나 좁은 화면은 몬스터 칸 간격(cw)이 늘거나 준다
  local u = H / 540
  local S = { W = W, H = H, u = u, ox = 0, oy = 60 * u, cw = math.max(70, (W / u - 216) / 6), f = u * 540 / 260, units = {}, t = 0, idx = 0, spd = 1, alive = true }   -- oy: 레인을 웹보다 60 아래로 (배경 그림의 땅 높이에 맞춤)
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
  S.root = root; S.layer = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, ZIndex = 3 }, root)
  -- 플레이어
  S.plX, S.plY = S.ox + 104 * u, S.oy + 336 * u   -- 웹 PLAYER_POS
  S.pl = Sprites.artLabel(S.layer, "warrior", 104 * u); S.plArt = S.pl ~= nil
  if not S.plArt then S.pl, S.plInfo = Sprites.label(S.layer, "warrior", 0, false, 96 * u) end
  S.pl.Position = UDim2.new(0, S.plX, 0, S.plY); S.pl.ZIndex = 5
  -- 상태 바
  -- HUD: 로블록스 상단 버튼 줄(M.TOP) 아래. 왼쪽 위 체력/마나, 오른쪽 위 배속/건너뛰기 (HUD 크기는 Client 의 UIScale 값 M.HUD 를 따른다)
  local TOP, k = M.TOP, M.HUD
  local function bar(y, h, color) local bg = mk("Frame", { Position = UDim2.new(0, 16, 0, TOP + y * k), Size = UDim2.new(0, 240 * k, 0, h * k), BackgroundColor3 = Color3.fromRGB(18, 14, 30), BackgroundTransparency = 0.15, ZIndex = 8 }, root); mk("UICorner", { CornerRadius = UDim.new(1, 0) }, bg); mk("UIStroke", { Color = Color3.fromRGB(20, 10, 30), Thickness = 2 }, bg)
    local f = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = color, ZIndex = 9 }, bg); mk("UICorner", { CornerRadius = UDim.new(1, 0) }, f); return f end
  S.hpBar = bar(8, 16, Color3.fromRGB(230, 70, 80)); S.mpBar = bar(28, 10, Color3.fromRGB(80, 150, 240))
  S.timeLbl = mk("TextLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -16, 0, TOP + 44 * k), Size = UDim2.new(0, 180 * k, 0, 20 * k), Text = "", TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = math.floor(14 * k), TextXAlignment = Enum.TextXAlignment.Right, ZIndex = 9 }, root)
  mk("UIStroke", { Thickness = 1.5, Color = Color3.fromRGB(20, 10, 30) }, S.timeLbl)
  S.plAnim = { name = "idle", t = 0 }
  S.ctrl = mk("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0), Size = UDim2.new(0, 186, 0, 32), Position = UDim2.new(1, -16, 0, TOP + 6 * k), Visible = false, ZIndex = 30 }, root)
  mk("UIScale", { Scale = k }, S.ctrl)
  local function sb(txt, x, cb) local b = mk("TextButton", { Text = txt, Size = UDim2.new(0, 88, 0, 32), Position = UDim2.new(0, x, 0, 0), BackgroundColor3 = Color3.fromRGB(30, 20, 50), BackgroundTransparency = 0.15, TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBold, TextSize = 14, ZIndex = 30 }, S.ctrl); mk("UICorner", { CornerRadius = UDim.new(0, 8) }, b); mk("UIStroke", { Color = Color3.fromRGB(214, 168, 70), Thickness = 1.5, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b); b.MouseButton1Click:Connect(cb) end
  sb("배속", 0, function() S:faster() end); sb("건너뛰기", 98, function() S:skip() end)
  S.idleConn = RunService.RenderStepped:Connect(function(dt) if S.conn or not S.alive then return end
    S.plAnim.t += dt; if S.plArt then M.artPose(S) end
    local row, frame, done = Sprites.anim("warrior", "idle", S.plAnim.t); if S.plInfo then Sprites.setFrame(S.pl, S.plInfo, row, frame) end end)
  return setmetatable(S, { __index = M })
end

-- 일러스트 영웅의 코드 애니메이션: 숨쉬기 / 공격 돌진 / 피격 붉은 번쩍임
function M.artPose(S)
  local a = S.plAnim; local dx, rot = 0, 0
  local dy = math.sin(os.clock() * 3) * 2 * S.f
  if a.name == "attack" then local k = math.clamp(a.t / 0.3, 0, 1); dx = math.sin(k * math.pi) * 18 * S.f; rot = math.sin(k * math.pi) * 8; if a.t > 0.3 then S.plAnim = { name = "idle", t = 0 } end
  elseif a.name == "hurt" then dx = -4 * S.f; if a.t > 0.18 then S.plAnim = { name = "idle", t = 0 } end end
  S.pl.Position = UDim2.new(0, S.plX + dx, 0, S.plY + dy); S.pl.Rotation = rot
  S.pl.ImageColor3 = a.name == "hurt" and Color3.new(1, 0.55, 0.55) or Color3.new(1, 1, 1)
end

M.TOP, M.HUD = 58, 1   -- 로블록스 상단 버튼 줄 높이 / HUD 배율 (Client 가 화면에 맞춰 갱신)
-- 레인/칸: 웹 battle.js 의 LAY{x0=196,cw=124,cy=292} · laneH(3레인까지 116, 4레인 88) 와 같은 값
function M:laneY(l, lanes) lanes = lanes or 2; local lh = lanes <= 3 and 116 or 88; local top = 292 - lh * lanes / 2; return self.oy + (top + (l + 0.5) * lh) * self.u, lh * self.u end
function M:colX(c) return self.ox + (196 + (c - 0.5) * self.cw) * self.u end

function M:floatText(text, x, y, color, size)
  local ts = math.floor((size or 16) * self.u * 1.4)   -- 큰 피해 숫자
  local t = mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(0, ts * 6, 0, ts + 6), AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0, x, 0, y), Text = text, TextColor3 = color or Color3.new(1, 1, 0.8), Font = Enum.Font.GothamBlack, TextSize = ts, ZIndex = 20 }, self.layer)
  local st = mk("UIStroke", { Thickness = 2.5, Color = Color3.fromRGB(20, 10, 30) }, t)
  local tw = TweenService:Create(t, TweenInfo.new(0.7), { Position = UDim2.new(0, x, 0, y - 40 * self.u), TextTransparency = 1 }); tw:Play(); TweenService:Create(st, TweenInfo.new(0.7), { Transparency = 1 }):Play(); tw.Completed:Connect(function() t:Destroy() end)
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
  local size = (boss and math.min(224, 64 * (e.scl or 3)) or (e.tier == "elite" and 96 or 64)) * S.u   -- 웹과 같은 비율 (일반 64 · 정예 96 · 보스 sc*64)
  local lab, info
  if boss then if (e.bh or 0) == 0 then lab = Sprites.artLabel(S.layer, "boss" .. (e.bs or 0), size) end
  elseif key and (hue or 0) == 0 then lab = Sprites.artLabel(S.layer, key, size) end   -- 일러스트(색조 변형은 아직 도트)
  local art = lab ~= nil
  if art then -- 일러스트 사용
  elseif boss then lab, info = Sprites.label(S.layer, "bosses", e.bh or 0, true, size); Sprites.setBoss(lab, info, e.bs)
  else lab, info = Sprites.label(S.layer, key or "ghoul", hue or 0, true, size) end
  lab.ZIndex = 4 + (e.l or 0)
  local bar = mk("Frame", { Size = UDim2.new(0, size * 0.7, 0, math.max(4, 5 * S.u)), AnchorPoint = Vector2.new(0.5, 1), BackgroundColor3 = Color3.fromRGB(18, 14, 30), ZIndex = 15 }, S.layer)
  local fill = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = boss and Color3.fromRGB(230, 90, 60) or (e.tier == "elite" and Color3.fromRGB(240, 190, 60) or Color3.fromRGB(110, 210, 110)), ZIndex = 16 }, bar)
  u = { lab = lab, info = info, art = art, bar = bar, fill = fill, boss = boss, key = key, size = size, x = S.W + 40, y = 0, t = math.random() * 3, dying = nil }
  S.units[e.id] = u; return u
end

function M:applySnap(s, lanes)
  self.hpBar.Size = UDim2.new(math.clamp(s.hp, 0, 1), 0, 1, 0); self.mpBar.Size = UDim2.new(math.clamp(s.mp or 0, 0, 1), 0, 1, 0)
  local seen = {}
  local py = self.plY
  for _, e in ipairs(s.e) do
    seen[e.id] = true
    local u = unitFor(self, e, lanes)
    local cy, lh = self:laneY(e.l, lanes); local cw = (self.W - 150) / 6
    local x = self:colX(e.c + ((e.w or 1) - 1) / 2); local y = cy + ((e.h or 1) - 1) * lh / 2 + lh * 0.3
    if not u.boss and e.tier == "normal" then local n = (e.id % 3) - 1; x += n * 14 * self.u; y += n * 5 * self.u end
    if not u.placed then u.placed = true; u.x = x + 70 * self.u; u.y = y end
    u.tx, u.ty = x, y; u.hp = e.hp
    if e.dead and not u.dying then u.dying = 0 end
    if e.d and e.d > 0 then self:floatText(fmt(e.d), x, y - u.size * 0.8, e.tier == "boss" and Color3.fromRGB(255, 190, 120) or Color3.fromRGB(255, 244, 200), e.d > 0 and 15 or 13); u.hit = 0.12 end
    u.wind = e.wind
  end
  for id, u in pairs(self.units) do if not seen[id] and not u.dying then u.dying = 0 end end
  if s.ph then self:floatText("-" .. fmt(s.ph), self.plX, py - 100 * self.u, Color3.fromRGB(255, 100, 110), 16); self.plAnim = { name = "hurt", t = 0 } end
  if s.c then
    local tgt; for _, u in pairs(self.units) do if not u.dying and u.tx and (not tgt or u.tx < tgt.tx) then tgt = u end end
    for _, c in ipairs(s.c) do
      local u = self.u; local sx, sy = self.plX + 30 * u, py - 50 * u   -- 영웅 칼끝에서 나간다
      local col = hex(c[2]); local x2, y2 = (tgt and tgt.tx or self.W - 80 * u), (tgt and tgt.ty - 30 * u or sy)
      self:flash(col, sx, sy, x2, y2)
      if c[4] ~= "single" then self:flash(col, sx, sy, x2 + 20 * u, y2 + 24 * u); self:flash(col, sx, sy, x2 + 20 * u, y2 - 24 * u) end
    end
    self.plAnim = { name = "attack", t = 0 }
  end
end

-- replay = { snaps, lanes, win, total }, onDone(): 재생이 끝났을 때. maxSec: 최대 재생 시간(길면 배속)
function M:play(replay, onDone, maxSec)
  for id, u in pairs(self.units) do u.lab:Destroy(); u.bar:Destroy() end; self.units = {}
  self.buildBg(replay.act or 1)
  self.replay = replay; self.t = 0; self.idx = 0; self.onDone = onDone; self.ctrl.Visible = true
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
      if u.art then   -- 일러스트: 둥실거림 / 이동 시 통통 / 공격 시 앞으로 / 사망 시 뒤로 쓰러지며 사라짐
        local ox, oy = 0, math.sin(u.t * 3) * 1.5 * self.f
        if u.dying then u.lab.Rotation = math.min(80, u.dying * 160); u.lab.ImageTransparency = math.clamp((u.dying - 0.4) / 0.7, 0, 1)
        elseif u.wind then ox = -math.abs(math.sin(u.t * 12)) * 8 * self.f
        elseif math.abs((u.tx or u.x) - u.x) > 3 then oy = -math.abs(math.sin(u.t * 10)) * 4 * self.f end
        u.lab.Position = UDim2.new(0, u.x + ox, 0, u.y + oy)
      elseif not u.boss and u.info then
        local anim = "idle"; if u.dying then anim = "death" elseif u.wind then anim = "attack" elseif math.abs((u.tx or u.x) - u.x) > 3 then anim = "walk" end
        local row, frame = Sprites.anim(u.key, anim, anim == "death" and u.dying or u.t); Sprites.setFrame(u.lab, u.info, row, frame)
      elseif u.boss and u.dying then u.lab.ImageTransparency = math.min(1, u.dying) end
      if u.hit and u.hit > 0 then u.hit -= dt; u.lab.ImageColor3 = Color3.new(1, 0.7, 0.7) else u.lab.ImageColor3 = Color3.new(1, 1, 1) end
      if u.dying then u.dying += dt; u.bar.Visible = false; if u.dying > 1.1 then u.lab:Destroy(); u.bar:Destroy(); self.units[id] = nil end end
    end
    if self.plArt then self.plAnim.t += dt; M.artPose(self)
    elseif self.plInfo then
      local a = self.plAnim; a.t += dt
      local row, frame, done = Sprites.anim("warrior", a.name, a.t); if done then self.plAnim = { name = "idle", t = 0 } end
      Sprites.setFrame(self.pl, self.plInfo, row, frame)
    end
    if self.idx >= #sn and self.t >= total + 0.8 then self.conn:Disconnect(); self.conn = nil; self.ctrl.Visible = false; if self.onDone then local f = self.onDone; self.onDone = nil; f() end end
  end)
end
function M:skip() self.ctrl.Visible = false; if self.conn then self.conn:Disconnect(); self.conn = nil end; if self.onDone then local f = self.onDone; self.onDone = nil; f() end end
function M:faster() self.userSpd = self.userSpd >= 4 and 1 or self.userSpd * 2 end
function M:destroy() self.alive = false; if self.idleConn then self.idleConn:Disconnect() end; if self.conn then self.conn:Disconnect() end; self.root:Destroy() end
return M
