-- 클라이언트 스프라이트 로더 (2D 도트). 시트 소스 우선순위: SpriteMap.SHEETS[key].id (업로드한 이미지) → 서버가 전달한 raw 픽셀(개발용).
-- 색조 변환(hue)·좌우 반전은 픽셀 단위로 한 번만 계산해 캐시한다.
local AssetService = game:GetService("AssetService")
local SPM = require(script.Parent.Data.SpriteMap)
local M = {}
local cache, raw = {}, {}   -- cache[key:hue:flip] = { content, w, h, cell }

local function hsl(r, g, b)
  local mx, mn = math.max(r, g, b), math.min(r, g, b); local l = (mx + mn) / 2; local h, s = 0, 0
  if mx ~= mn then
    local d = mx - mn; s = l > 0.5 and d / (2 - mx - mn) or d / (mx + mn)
    if mx == r then h = (g - b) / d + (g < b and 6 or 0) elseif mx == g then h = (b - r) / d + 2 else h = (r - g) / d + 4 end
    h /= 6
  end
  return h, s, l
end
local function hue2rgb(p, q, t)
  if t < 0 then t += 1 end; if t > 1 then t -= 1 end
  if t < 1 / 6 then return p + (q - p) * 6 * t elseif t < 1 / 2 then return q elseif t < 2 / 3 then return p + (q - p) * (2 / 3 - t) * 6 end
  return p
end
local function shift(buf, w, h, deg)
  local out = buffer.create(w * h * 4); buffer.copy(out, 0, buf, 0, w * h * 4)
  for i = 0, w * h - 1 do
    local o = i * 4
    if buffer.readu8(out, o + 3) > 0 then
      local r, g, b = buffer.readu8(out, o) / 255, buffer.readu8(out, o + 1) / 255, buffer.readu8(out, o + 2) / 255
      local hh, s, l = hsl(r, g, b)
      if s >= 0.12 then
        hh = (hh + deg / 360 + 1) % 1
        local q = l < 0.5 and l * (1 + s) or l + s - l * s; local p = 2 * l - q
        buffer.writeu8(out, o, math.floor(hue2rgb(p, q, hh + 1 / 3) * 255 + 0.5)); buffer.writeu8(out, o + 1, math.floor(hue2rgb(p, q, hh) * 255 + 0.5)); buffer.writeu8(out, o + 2, math.floor(hue2rgb(p, q, hh - 1 / 3) * 255 + 0.5))
      end
    end
  end
  return out
end
local function flipCells(buf, w, h, cell)   -- 칸마다 좌우 반전
  local out = buffer.create(w * h * 4)
  for y = 0, h - 1 do for cx = 0, w // cell - 1 do for x = 0, cell - 1 do
    buffer.copy(out, (y * w + cx * cell + x) * 4, buf, (y * w + cx * cell + (cell - 1 - x)) * 4, 4)
  end end end
  return out
end

function M.init(rpc) M.rpc = rpc end
-- 픽셀 → EditableImage. 체험 설정에서 이미지 API 가 꺼져 있으면 실패하므로 nil 을 돌려 화면이 멈추지 않게 한다
local editableOff = false
function M.editable(w, h, buf)
  if editableOff then return nil end
  local ok, img = pcall(function() local i = AssetService:CreateEditableImage({ Size = Vector2.new(w, h) }); i:WritePixelsBuffer(Vector2.zero, Vector2.new(w, h), buf); return i end)
  if ok then return img end
  editableOff = true; warn("EditableImage 사용 불가 → 그림 없이 진행:", img); return nil
end
-- 반환: { content, w, h, cell } 또는 nil
function M.get(key, hue, flip)
  hue = hue or 0; flip = flip and true or false
  local ck = key .. ":" .. hue .. ":" .. tostring(flip)
  if cache[ck] then return cache[ck] end
  local meta = SPM.SHEETS[key]; if not meta then return nil end
  local info = { w = meta.w, h = meta.h, cell = meta.cell }
  if meta.id and hue == 0 and not flip then   -- 업로드한 이미지: 색조/반전 변형은 아직 없으므로 원본만
    info.content = Content.fromAssetId(tonumber(string.match(meta.id, "%d+"))); cache[ck] = info; return info
  end
  if not raw[key] then
    local ok, r = pcall(function() return M.rpc:InvokeServer("sheet", key) end)
    if not ok or not r or not r.buf then warn("sheet", key, ok and r and r.err or r); return nil end
    raw[key] = r.buf
  end
  local buf = raw[key]
  if hue ~= 0 then buf = shift(buf, meta.w, meta.h, hue) end
  if flip then buf = flipCells(buf, meta.w, meta.h, meta.cell) end
  local img = M.editable(meta.w, meta.h, buf); if not img then return nil end
  info.content = Content.fromObject(img); info.img = img
  cache[ck] = info; return info
end

-- 일러스트(정적 한 장, ArtMap). 없거나 못 받으면 nil → 호출 쪽이 도트로 대체
local okArt, ARTM = pcall(require, script.Parent.Data:FindFirstChild("ArtMap"))
local ART = okArt and ARTM.ART or {}
local artCache = {}
function M.art(key)
  if artCache[key] ~= nil then return artCache[key] or nil end
  local meta = ART[key]; if not meta then artCache[key] = false; return nil end
  local info = { w = meta.w, h = meta.h, foot = meta.foot or 0.92 }
  if meta.id then info.content = Content.fromAssetId(tonumber(string.match(meta.id, "%d+")))
  else
    local ok, r = pcall(function() return M.rpc:InvokeServer("sheet", "art/" .. key) end)
    if not ok or not r or not r.buf then warn("art", key, ok and r and r.err or r); artCache[key] = false; return nil end
    local img = M.editable(meta.w, meta.h, r.buf); if not img then artCache[key] = false; return nil end
    info.content = Content.fromObject(img); info.img = img
  end
  artCache[key] = info; return info
end
-- 일러스트 ImageLabel. 발밑(ArtMap.foot, 그림마다 측정)이 Position 에 오도록 기준점을 잡는다.
function M.artLabel(parent, key, size)
  local info = M.art(key); if not info then return nil end
  local l = Instance.new("ImageLabel"); l.BackgroundTransparency = 1; l.Size = UDim2.new(0, size, 0, size); l.AnchorPoint = Vector2.new(0.5, info.foot)
  l.ScaleType = Enum.ScaleType.Fit; l.ImageContent = info.content; l.Parent = parent
  return l
end

-- 애니메이션 프레임 계산 (웹 animFrame)
function M.anim(key, anim, t)
  local rows = key == "warrior" and SPM.ROWS.warrior or SPM.ROWS.std
  local R = rows[anim]; if not R then return 0, 0, true end
  local idx = math.floor(t * R[3])
  return R[1], (R[4] and (idx % R[2]) or math.min(R[2] - 1, idx)), (not R[4]) and idx >= R[2]
end

-- ImageLabel 을 만들어 돌려준다. 발밑 중앙이 (0.5, 1) 기준.
function M.label(parent, key, hue, flip, size)
  local info = M.get(key, hue, flip)
  local l = Instance.new("ImageLabel"); l.BackgroundTransparency = 1; l.Size = UDim2.new(0, size, 0, size); l.AnchorPoint = Vector2.new(0.5, 1)
  l.ResampleMode = Enum.ResamplerMode.Pixelated; l.ScaleType = Enum.ScaleType.Stretch
  if info then l.ImageContent = info.content; l.ImageRectSize = Vector2.new(info.cell, info.cell) end
  l.Parent = parent
  return l, info
end
function M.setFrame(l, info, row, frame, flipped)
  if not info then return end
  l.ImageRectOffset = Vector2.new(frame * info.cell, row * info.cell)
end
-- 보스 시트(96칸, 5열): idx 번째
function M.setBoss(l, info, idx)
  if not info then return end
  l.ImageRectSize = Vector2.new(info.cell, info.cell); l.ImageRectOffset = Vector2.new((idx % 5) * info.cell, (idx // 5) * info.cell)
end
return M
