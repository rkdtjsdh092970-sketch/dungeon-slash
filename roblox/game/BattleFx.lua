-- 전투 이펙트 (Stage 가 부른다): 스킬마다 계열 · 원소 · 종류에 맞는 연출
--   물리: 영웅이 힘껏 내지르거나(돌진) 뛰어올라 내려찍고, 큰 베기 궤적 · 할퀴기 · 충격파 · 불꽃 튐 · 히트스톱 · 화면 흔들림
--   마법: 발밑 마법진 → 지팡이 끝 빛 → 원소별 투사체(화염구 · 얼음 파편 · 공허 구체) · 하늘에서 벼락 · 유성 · 폭발 · 화면 섬광
-- 그림은 art/fx (gen_fx.py): 흰 바탕 + 알파라 ImageColor3 로 색을 입힌다. 겹치면 가운데는 하얗게(흰 심 한 겹 더)
local TweenService = game:GetService("TweenService")
local Sprites = require(script.Parent.Sprites)
local okS, SK = pcall(require, script.Parent.Data.Skills)
local M = {}
local BY = {}; if okS then for _, d in ipairs(SK.SKILLS) do BY[d.id] = d end end
local function mk(c, p, par) local o = Instance.new(c); for k, v in pairs(p) do o[k] = v end; o.Parent = par; return o end
local function hex(h) local ok, c = pcall(Color3.fromHex, h or "#ffffff"); return ok and c or Color3.new(1, 1, 1) end
local WHITE = Color3.new(1, 1, 1)
local ELEM = { fire = Color3.fromRGB(255, 120, 40), cold = Color3.fromRGB(120, 210, 255), light = Color3.fromRGB(255, 235, 120), void = Color3.fromRGB(180, 90, 255) }
local HEAVY = { smash = true, execute = true, titanfist = true, verdict = true, gut = true, crush = true, smite = false }
local MAX_FX = 160   -- 동시에 떠 있는 이펙트 수 상한 (배속 · 몹이 많을 때 끊기지 않게)

local function count(S) S.fxN = S.fxN or 0; return S.fxN end
local function img(S, key, p)
  local a = Sprites.art(key); if not a or count(S) > MAX_FX then return nil end
  p.BackgroundTransparency = 1; p.ImageContent = a.content; p.AnchorPoint = p.AnchorPoint or Vector2.new(0.5, 0.5); p.ZIndex = p.ZIndex or 13
  local o = mk("ImageLabel", p, S.layer); S.fxN += 1
  o.Destroying:Connect(function() S.fxN -= 1 end)
  return o, a
end
local function tw(o, t, goal, style, kill)
  if not o then return end
  local x = TweenService:Create(o, TweenInfo.new(t, style or Enum.EasingStyle.Quad, Enum.EasingDirection.Out), goal); x:Play()
  if kill ~= false then x.Completed:Connect(function() if o.Parent then o:Destroy() end end) end
  return x
end
local function sz(w, h) return UDim2.new(0, w, 0, h or w) end
local function at(x, y) return UDim2.new(0, x, 0, y) end

-- ── 기본 조각 ──
function M.glow(S, x, y, r, col, t, tr)
  local o = img(S, "fx_glow", { Position = at(x, y), Size = sz(r * 0.5), ImageColor3 = col, ImageTransparency = tr or 0.15, ZIndex = 12 })
  tw(o, t or 0.35, { Size = sz(r * 2), ImageTransparency = 1 })
end
function M.ring(S, x, y, r, col, t, flat)
  local f = flat or 0.45   -- 바닥에 눕힌 고리 (원근)
  local o = img(S, "fx_ring", { Position = at(x, y), Size = sz(r * 0.2, r * 0.2 * f), ImageColor3 = col, ImageTransparency = 0 })
  tw(o, t or 0.45, { Size = sz(r * 2, r * 2 * f), ImageTransparency = 1 })
end
function M.sparks(S, x, y, col, n, spread)
  for _ = 1, n do
    local a = math.random() * math.pi * 2; local d = (spread or 50) * S.u * (0.5 + math.random())
    local s = (6 + math.random() * 8) * S.u
    local o = img(S, "fx_spark", { Position = at(x, y), Size = sz(s), ImageColor3 = math.random() < 0.4 and WHITE or col, Rotation = math.random(0, 90), ZIndex = 14 })
    tw(o, 0.3 + math.random() * 0.2, { Position = at(x + math.cos(a) * d, y + math.sin(a) * d * 0.7), Size = sz(s * 0.3), ImageTransparency = 1 })
  end
end
function M.slash(S, x, y, w, col, rot, t)
  local o = img(S, "fx_slash", { Position = at(x, y), Size = sz(w * 0.7, w * 0.35), ImageColor3 = col, Rotation = rot - 25, ZIndex = 14 })
  tw(o, t or 0.28, { Size = sz(w * 1.15, w * 0.58), Rotation = rot + 20, ImageTransparency = 1 })
  local c = img(S, "fx_slash", { Position = at(x, y), Size = sz(w * 0.6, w * 0.22), ImageColor3 = WHITE, Rotation = rot - 25, ZIndex = 15 })   -- 흰 심
  tw(c, (t or 0.28) * 0.8, { Size = sz(w * 1.0, w * 0.36), Rotation = rot + 20, ImageTransparency = 1 })
end
function M.claw(S, x, y, w, col)
  local o = img(S, "fx_claw", { Position = at(x, y), Size = sz(w * 0.6), ImageColor3 = col, ZIndex = 14 })
  tw(o, 0.32, { Size = sz(w * 1.1), ImageTransparency = 1 })
end
function M.burst(S, x, y, r, col, t)   -- 폭발 8프레임 + 흰 섬광
  local o, a = img(S, "fx_burst", { Position = at(x, y), Size = sz(r * 2), ImageColor3 = col, ImageRectSize = Vector2.new(128, 128), ZIndex = 14 })
  if o then
    local dur = t or 0.5
    task.spawn(function() for f = 0, 7 do if not o.Parent then return end; o.ImageRectOffset = Vector2.new(f * 128, 0); task.wait(dur / 8) end; o:Destroy() end)
  end
  M.glow(S, x, y, r * 0.9, WHITE, 0.18, 0.1)
  M.glow(S, x, y, r * 1.6, col, 0.45, 0.35)
end
function M.bolt(S, x1, y1, x2, y2, col, t)   -- 번개: 두 점 사이를 늘려 그리고 깜빡인다
  local len = math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2); if len < 4 then return end
  local ang = math.deg(math.atan2(y2 - y1, x2 - x1)) - 90
  local w = math.max(28 * S.u, len * 0.22)
  local o = img(S, "fx_bolt", { Position = at((x1 + x2) / 2, (y1 + y2) / 2), Size = sz(w, len), Rotation = ang, ImageColor3 = col, ImageRectSize = Vector2.new(96, 256), ZIndex = 14 })
  local c = img(S, "fx_bolt", { Position = at((x1 + x2) / 2, (y1 + y2) / 2), Size = sz(w * 0.6, len), Rotation = ang, ImageColor3 = WHITE, ImageRectSize = Vector2.new(96, 256), ZIndex = 15 })
  if o then
    task.spawn(function()
      for i = 0, 4 do if not o.Parent then return end; local f = (i + math.random(0, 3)) % 4; o.ImageRectOffset = Vector2.new(f * 96, 0); if c and c.Parent then c.ImageRectOffset = o.ImageRectOffset end; task.wait((t or 0.25) / 5) end
      tw(o, 0.12, { ImageTransparency = 1 }); if c and c.Parent then tw(c, 0.1, { ImageTransparency = 1 }) end
    end)
  end
end
function M.beam(S, x1, y, x2, h, col)   -- 한 줄을 꿰뚫는 광선
  local o = img(S, "fx_beam", { AnchorPoint = Vector2.new(0, 0.5), Position = at(x1, y), Size = sz(0, h), ImageColor3 = col, ZIndex = 14 })
  local c = img(S, "fx_beam", { AnchorPoint = Vector2.new(0, 0.5), Position = at(x1, y), Size = sz(0, h * 0.4), ImageColor3 = WHITE, ZIndex = 15 })
  if o then tw(o, 0.12, { Size = sz(x2 - x1, h) }, nil, false).Completed:Connect(function() tw(o, 0.25, { Size = sz(x2 - x1, h * 0.1), ImageTransparency = 1 }) end) end
  if c then tw(c, 0.12, { Size = sz(x2 - x1, h * 0.4) }, nil, false).Completed:Connect(function() tw(c, 0.2, { ImageTransparency = 1 }) end) end
end
function M.circle(S, x, y, r, col, t)   -- 바닥 마법진: 펼쳐지며 돈다
  local o = img(S, "fx_circle", { Position = at(x, y), Size = sz(r * 0.3, r * 0.3 * 0.38), ImageColor3 = col, ImageTransparency = 0.1, ZIndex = 4 })
  if not o then return end
  tw(o, 0.18, { Size = sz(r * 2, r * 2 * 0.38) }, nil, false)
  task.delay(t or 0.5, function() if o.Parent then tw(o, 0.25, { ImageTransparency = 1, Size = sz(r * 2.3, r * 2.3 * 0.38) }) end end)
end
function M.screen(S, col, tr, t)   -- 화면 섬광
  if count(S) > MAX_FX then return end
  local f = mk("Frame", { Size = UDim2.new(1, 0, 1, 0), BackgroundColor3 = col, BackgroundTransparency = tr or 0.7, BorderSizePixel = 0, ZIndex = 18 }, S.layer)
  tw(f, t or 0.25, { BackgroundTransparency = 1 })
end
-- 투사체: 빛 덩어리(+흰 심)가 날아가며 꼬리를 남긴다. 도착하면 onHit
function M.proj(S, x1, y1, x2, y2, col, t, kind, onHit)
  local r = (kind == "big" and 46 or 26) * S.u
  local key = kind == "shard" and "fx_shard" or "fx_glow"
  local rot = math.deg(math.atan2(y2 - y1, x2 - x1)) + (kind == "shard" and 90 or 0)
  local o = img(S, key, { Position = at(x1, y1), Size = kind == "shard" and sz(r * 0.5, r) or sz(r * 1.6), Rotation = rot, ImageColor3 = col, ZIndex = 14 })
  local c = kind ~= "shard" and img(S, "fx_glow", { Position = at(x1, y1), Size = sz(r * 0.7), ImageColor3 = WHITE, ZIndex = 15 }) or nil
  if not o then if onHit then onHit() end; return end
  local dur = t or 0.22
  tw(o, dur, { Position = at(x2, y2) }, Enum.EasingStyle.Linear, false)
  if c then tw(c, dur, { Position = at(x2, y2) }, Enum.EasingStyle.Linear, false) end
  task.spawn(function()   -- 꼬리
    local t0 = os.clock()
    while o.Parent and os.clock() - t0 < dur do
      local p = o.Position; local g = img(S, "fx_glow", { Position = p, Size = sz(r * 0.9), ImageColor3 = col, ImageTransparency = 0.45, ZIndex = 13 })
      tw(g, 0.22, { Size = sz(r * 0.2), ImageTransparency = 1 }); task.wait(0.03)
    end
  end)
  task.delay(dur, function() if o.Parent then o:Destroy() end; if c and c.Parent then c:Destroy() end; if onHit then onHit() end end)
end
function M.fall(S, x, y, col, kind, onHit)   -- 하늘에서 떨어지는 유성 · 얼음 덩이
  local sx, sy = x + 140 * S.u, -40 * S.u
  M.proj(S, sx, sy, x, y, col, 0.32, kind == "shard" and "shard" or "big", onHit)
end

-- ── 영웅 위치 · 대상 ──
local function heroTip(S) return S.plX + 34 * S.u, S.plY - 62 * S.u end
local function uy(u) return (u.ty or u.y) - u.size * 0.45 end

-- 스킬 연출: c = { id, color, elem, kind }, hits = 이번에 피해를 받은 몹들(가까운 순), first = 가장 가까운 몹
function M.cast(S, c, hits, first)
  local d = BY[c[1]] or {}
  local col = hex(c[2]); local elem = c[3] or d.elem; local kind = c[4] or d.kind
  local u = S.u
  local tg = first or hits[1]
  local tx, ty = tg and tg.tx or (S.W * 0.7), tg and uy(tg) or (S.plY - 50 * u)
  local list = (#hits > 0) and hits or (tg and { tg } or {})
  local mag = d.dtype == "mag"
  local big = (d.cd or 0) >= 8 or (d.mult or 0) >= 6
  if d.dtype == "buff" or d.dtype == "heal" or kind == "buff" or kind == "heal" then   -- 버프 · 치유: 영웅 둘레 빛 기둥
    M.ring(S, S.plX, S.plY, 90 * u, col, 0.6); M.glow(S, S.plX, S.plY - 50 * u, 120 * u, col, 0.6, 0.3)
    for i = 1, 6 do task.delay(i * 0.05, function() M.sparks(S, S.plX + math.random(-30, 30) * u, S.plY - math.random(0, 80) * u, col, 1, 30) end) end
    S:heroPose("cast"); return
  end
  if mag then
    -- 시전: 발밑 마법진 + 지팡이 끝 빛
    local hx, hy = heroTip(S)
    M.circle(S, S.plX, S.plY + 4 * u, (big and 90 or 60) * u, col, big and 0.7 or 0.4)
    M.glow(S, hx, hy, (big and 70 or 40) * u, col, 0.3, 0.1)
    S:heroPose("cast", big)
    if big then M.screen(S, col, 0.82, 0.35) end
    local function boom(x, y, r) M.burst(S, x, y, r, col); M.sparks(S, x, y, col, 4, 40) end
    if elem == "light" then
      if kind == "chain" then   -- 지팡이 → 첫 대상 → 다음 대상... 번개가 이어진다
        local px, py = hx, hy
        for i, h in ipairs(list) do
          if i > 7 then break end
          local qx, qy = h.tx, uy(h)
          task.delay((i - 1) * 0.06, function() M.bolt(S, px, py, qx, qy, col, 0.25); M.glow(S, qx, qy, 40 * u, col, 0.25) end)
          px, py = qx, qy
        end
      elseif kind == "pierce" then M.beam(S, hx, hy, S.W, 40 * u, col); for _, h in ipairs(list) do boom(h.tx, uy(h), 30 * u) end
      elseif kind == "spray" then for i, h in ipairs(list) do if i > 8 then break end; task.delay(i * 0.04, function() M.proj(S, hx, hy, h.tx, uy(h), col, 0.18, "orb", function() boom(h.tx, uy(h), 22 * u) end) end) end
      else   -- 하늘에서 벼락 (낙뢰 · 뇌우 · 처형): 화면이 번쩍
        M.screen(S, WHITE, big and 0.55 or 0.8, 0.2)
        for i, h in ipairs(list) do
          if i > 8 then break end
          task.delay((kind == "rain" and i * 0.09 or 0), function()
            local x, y = h.tx, h.ty or h.y
            M.bolt(S, x + math.random(-20, 20) * u, -10 * u, x, y - 10 * u, col, 0.3)
            M.ring(S, x, y, 60 * u, col, 0.4); M.glow(S, x, y - 20 * u, 70 * u, WHITE, 0.25, 0.2); M.sparks(S, x, y - 10 * u, col, 5, 50)
          end)
        end
        S.shake = math.max(S.shake or 0, big and 0.3 or 0.15)
      end
    elseif elem == "cold" then
      if kind == "nova" then M.ring(S, S.plX, S.plY, 380 * u, col, 0.55); M.ring(S, S.plX, S.plY, 260 * u, WHITE, 0.45); for _, h in ipairs(list) do M.sparks(S, h.tx, uy(h), col, 3, 30) end
      elseif kind == "zone2" or kind == "rain" then for i, h in ipairs(list) do if i > 8 then break end; task.delay(i * 0.07, function() M.fall(S, h.tx, uy(h), col, "shard", function() M.ring(S, h.tx, h.ty or h.y, 40 * u, col, 0.3); M.sparks(S, h.tx, uy(h), WHITE, 3, 30) end) end) end
      elseif big then   -- 빙하 낙하 · 절대영도: 거대한 얼음 덩이가 떨어진다
        M.fall(S, tx, ty, col, "shard", function() M.burst(S, tx, ty, 90 * u, col); M.ring(S, tx, tg and tg.ty or ty, 140 * u, WHITE, 0.5); S.shake = math.max(S.shake or 0, 0.3); S.hitstop = 0.07 end)
      else
        local n = kind == "spray" and math.min(7, #list) or 1
        for i = 1, math.max(1, n) do local h = list[i] or tg; if h then task.delay(i * 0.035, function() M.proj(S, hx, hy, h.tx, uy(h), col, 0.2, "shard", function() M.sparks(S, h.tx, uy(h), col, 4, 34); M.glow(S, h.tx, uy(h), 36 * u, col, 0.25) end) end) end end
      end
    elseif kind == "meteor" or (kind == "rain" and elem ~= "light") then   -- 유성 · 용암 낙하 · 종말의 비
      for i, h in ipairs(list) do
        if i > 8 then break end
        task.delay(i * 0.1, function() M.fall(S, h.tx, uy(h), col, "big", function() M.burst(S, h.tx, uy(h), 70 * u, col); M.ring(S, h.tx, h.ty or h.y, 100 * u, col, 0.45); S.shake = math.max(S.shake or 0, 0.22) end) end)
      end
    elseif kind == "hole" then   -- 공허의 심연: 마법진이 돌며 안으로 빨려 든다
      M.circle(S, tx, tg and tg.ty or ty, 110 * u, col, 0.9)
      for k = 0, 3 do task.delay(k * 0.15, function() local o = img(S, "fx_ring", { Position = at(tx, ty), Size = sz(240 * u, 240 * u * 0.5), ImageColor3 = col, ImageTransparency = 0.2 }); tw(o, 0.4, { Size = sz(10 * u), ImageTransparency = 1 }) end) end
    elseif kind == "zone" or kind == "zone2" then   -- 화염 벽 · 화염 폭풍 · 불바다 · 역병: 구역마다 폭발이 이어진다
      for i, h in ipairs(list) do if i > 9 then break end; task.delay(i * 0.05, function() boom(h.tx, uy(h), 40 * u) end) end
    elseif kind == "pierce" then M.beam(S, hx, hy, S.W, 46 * u, col); for _, h in ipairs(list) do boom(h.tx, uy(h), 30 * u) end
    elseif kind == "multi" or kind == "nova" then   -- 폭열탄 · 화염: 큰 화염구가 날아가 터진다
      M.proj(S, hx, hy, tx, ty, col, 0.24, "big", function() M.burst(S, tx, ty, (big and 110 or 80) * u, col); M.ring(S, tx, tg and tg.ty or ty, 120 * u, col, 0.4); for _, h in ipairs(list) do M.sparks(S, h.tx, uy(h), col, 2, 30) end; S.shake = math.max(S.shake or 0, 0.15) end)
    elseif kind == "spray" then for i, h in ipairs(list) do if i > 8 then break end; task.delay(i * 0.04, function() M.proj(S, hx, hy, h.tx, uy(h), col, 0.18, "orb", function() boom(h.tx, uy(h), 22 * u) end) end) end
    elseif kind == "orbit" or kind == "summon" then for i, h in ipairs(list) do if i > 6 then break end; task.delay(i * 0.05, function() M.proj(S, S.plX, S.plY - 40 * u, h.tx, uy(h), col, 0.2, "orb", function() boom(h.tx, uy(h), 24 * u) end) end) end
    else   -- 단일 마법탄 (불씨 · 공허 탄 · 낙인 · 응축탄): 크면 거대한 구체 + 큰 폭발
      local n = math.min(#list, 1)
      M.proj(S, hx, hy, tx, ty, col, big and 0.3 or 0.18, big and "big" or "orb", function()
        boom(tx, ty, (big and 100 or 42) * u)
        if big then M.ring(S, tx, tg and tg.ty or ty, 150 * u, col, 0.5); M.screen(S, col, 0.75, 0.3); S.shake = math.max(S.shake or 0, 0.3); S.hitstop = 0.08 end
      end)
      local _ = n
    end
    return
  end
  -- ── 물리: 몸으로 친다 ──
  local heavy = HEAVY[c[1]] or (d.mult or 0) >= 6
  if kind == "spray" or kind == "bounce" or kind == "boomer" or d.proj then   -- 화살 비 · 독침 · 수리검 · 회전 도끼: 던지기
    S:heroPose("throw")
    local hx, hy = heroTip(S)
    for i, h in ipairs(list) do if i > 10 then break end; task.delay(i * 0.035, function() M.proj(S, hx, hy, h.tx, uy(h), col, 0.16, "orb", function() M.sparks(S, h.tx, uy(h), col, 3, 26); M.claw(S, h.tx, uy(h), 50 * u, col) end) end) end
    return
  end
  if kind == "pierce" then   -- 관통: 내지르며 한 줄을 가르는 섬광
    S:heroPose("lunge", tx)
    task.delay(0.08, function()
      M.beam(S, S.plX + 40 * u, ty, S.W, (big and 60 or 40) * u, col)
      for _, h in ipairs(list) do M.slash(S, h.tx, uy(h), 90 * u, col, 0); M.sparks(S, h.tx, uy(h), col, 3, 40) end
      S.shake = math.max(S.shake or 0, 0.12); S.hitstop = 0.05
    end)
    return
  end
  if kind == "aura" or kind == "summon" or kind == "shuri" or kind == "trap" then   -- 회오리 · 소환 · 지뢰: 앞 몹들에 연속 베기
    for i, h in ipairs(list) do if i > 6 then break end; task.delay(i * 0.05, function() M.slash(S, h.tx, uy(h), 80 * u, col, math.random(-60, 60)); M.sparks(S, h.tx, uy(h), col, 2, 26) end) end
    if kind == "trap" then M.burst(S, tx, ty, 90 * u, col); S.shake = math.max(S.shake or 0, 0.2) end
    return
  end
  if heavy then   -- 강타 · 처형 · 거신의 주먹: 뛰어올라 내려찍기 → 충격파 · 큰 베기 · 히트스톱
    S:heroPose("slam", tx)
    task.delay(0.16, function()
      M.slash(S, tx, ty, (big and 200 or 160) * u, col, 70)
      M.ring(S, tx, tg and (tg.ty or tg.y) or ty, 170 * u, col, 0.45); M.ring(S, tx, tg and (tg.ty or tg.y) or ty, 110 * u, WHITE, 0.35)
      M.glow(S, tx, ty, 100 * u, WHITE, 0.2, 0.1); M.sparks(S, tx, ty, col, 10, 70)
      S.shake = math.max(S.shake or 0, 0.35); S.hitstop = 0.09
      if big then M.screen(S, WHITE, 0.8, 0.15) end
    end)
    return
  end
  -- 일반 베기 · 부채꼴 · 3x3: 힘껏 돌진하며 크게 벤다
  S:heroPose("lunge", tx)
  task.delay(0.08, function()
    local wide = kind == "cone" or kind == "multi"
    if wide then
      M.slash(S, tx - 10 * u, ty, 220 * u, col, -10)
      for _, h in ipairs(list) do M.claw(S, h.tx, uy(h), 70 * u, col); M.sparks(S, h.tx, uy(h), col, 2, 30) end
      S.shake = math.max(S.shake or 0, 0.14)
    else
      M.slash(S, tx, ty, 130 * u, col, math.random(-25, 25)); M.sparks(S, tx, ty, col, 5, 44)
      S.shake = math.max(S.shake or 0, 0.08)
    end
    S.hitstop = wide and 0.05 or 0.035
  end)
end

-- 몹 공격: 원거리면 화살 · 구체가 영웅에게 날아오고, 근접이면 영웅 앞에 할퀴기
function M.enemyHit(S, unit, ranged)
  local u = S.u
  local x, y = unit.x, (unit.y or 0) - unit.size * 0.5
  if ranged then M.proj(S, x - 20 * u, y, S.plX + 10 * u, S.plY - 50 * u, Color3.fromRGB(255, 120, 90), 0.25, "orb", function() M.sparks(S, S.plX, S.plY - 50 * u, Color3.fromRGB(255, 120, 90), 3, 24) end)
  else M.claw(S, S.plX + 20 * u, S.plY - 50 * u, 60 * u, Color3.fromRGB(255, 80, 70)) end
end
-- 몹이 맞을 때 작은 불꽃 (스킬 연출과 별개로 모든 타격에)
function M.hit(S, unit)
  local u = S.u
  M.sparks(S, unit.x - unit.size * 0.2, (unit.y or 0) - unit.size * 0.5, Color3.fromRGB(255, 230, 180), 2, 22)
end
-- 몹이 쓰러질 때: 빛이 터지고 흩어진다
function M.death(S, unit)
  local u = S.u
  local x, y = unit.x, (unit.y or 0) - unit.size * 0.45
  M.glow(S, x, y, unit.size * 0.8, Color3.fromRGB(255, 140, 90), 0.35, 0.3)
  M.sparks(S, x, y, Color3.fromRGB(255, 120, 80), unit.boss and 16 or 5, unit.boss and 120 or 46)
  if unit.boss then M.ring(S, x, unit.y, unit.size * 1.2, Color3.fromRGB(255, 150, 90), 0.6); M.screen(S, WHITE, 0.6, 0.4) end
end
return M
