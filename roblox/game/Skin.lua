-- UI 스킨: Codex 로 그린 UI 키트(art/ui/*.png → ArtMap 의 ui_*)를 9-slice 로 입힌다. 그림이 없으면 아무것도 바꾸지 않는다.
-- 버튼은 자식이 부모 위에 그려지므로(Sibling) 글자를 자식 TextLabel 로 옮기고, 원래 Text 가 바뀌면 따라 바꾼다.
local Sprites = require(script.Parent.Sprites)
local M = {}
local function mk(c, p, par) local o = Instance.new(c); for k, v in pairs(p) do o[k] = v end; o.Parent = par; return o end
local function plain(o) for _, c in ipairs(o:GetChildren()) do if c:IsA("UICorner") or c:IsA("UIStroke") or c:IsA("UIGradient") then c:Destroy() end end end
-- 9-slice 이미지 (가장자리 비율 e: 모서리 장식 크기)
local function slice(par, key, z, e, scale)
  local a = Sprites.art(key); if not a then return nil end
  e = e or 0.3
  return mk("ImageLabel", { Name = "Skin", BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), ImageContent = a.content, ScaleType = Enum.ScaleType.Slice,
    SliceCenter = Rect.new(a.w * e, a.h * e, a.w * (1 - e), a.h * (1 - e)), SliceScale = scale or 0.5, ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = 0 }, par)
end
M.slice = slice
-- 버튼 색 → 그림 (가까운 색으로)
local KEYS = { { "gold", Color3.fromRGB(180, 130, 50) }, { "red", Color3.fromRGB(150, 50, 50) }, { "blue", Color3.fromRGB(55, 90, 150) }, { "gray", Color3.fromRGB(65, 62, 80) },
  { "purple", Color3.fromRGB(110, 60, 160) }, { "green", Color3.fromRGB(60, 150, 80) } }
local FALLBACK = { purple = "blue", green = "gold" }   -- 그림이 없으면 비슷한 색으로
local function keyFor(c)
  local best, bd = "gray", 1e9
  for _, k in ipairs(KEYS) do local d = (c.R - k[2].R) ^ 2 + (c.G - k[2].G) ^ 2 + (c.B - k[2].B) ^ 2; if d < bd then best, bd = k[1], d end end
  if c.G > c.R and c.G > c.B then best = "green" end   -- 초록(확인 · 받기)
  if not Sprites.art("ui_btn_" .. best) then best = FALLBACK[best] or "gray" end
  return best
end
-- 버튼 종류: SkinTab 속성 = 탭(금색이면 선택됨), SkinClose 속성 = 닫기(X 그림), 그 외 = 색에 맞는 버튼
local function pick(b)
  if b:GetAttribute("SkinClose") then return "ui_close" end
  if b:GetAttribute("SkinTab") then return keyFor(b.BackgroundColor3) == "gold" and "ui_tab_on" or "ui_tab" end
  return "ui_btn_" .. keyFor(b.BackgroundColor3)
end
function M.button(b)
  if b:GetAttribute("Skinned") then return end
  local key = pick(b)
  local img = slice(b, key, b.ZIndex, 0.3, 0.5); if not img then return end
  b:SetAttribute("Skinned", true); plain(b)
  b.BackgroundTransparency = 1
  -- 글자: 버튼 안쪽 여백 안에서, 넘치면 저절로 작아진다 (삐져나오지 않게). 최대 크기 = 원래 TextSize
  local lbl = mk("TextLabel", { Name = "SkinText", BackgroundTransparency = 1, Size = UDim2.new(1, -14, 1, -6), Position = UDim2.new(0, 7, 0, 3), Text = b.Text, Font = b.Font, TextSize = b.TextSize,
    TextColor3 = Color3.fromRGB(245, 232, 205), TextWrapped = string.find(b.Text, string.char(10), 1, true) ~= nil, ZIndex = 1 }, b)
  -- 원래 글자 크기로 그리되, 칸을 넘치면 넘치지 않을 때까지 1씩 줄인다 (삐져나오지 않게, 필요 없이 작아지지도 않게)
  local fitting = false
  local function fit()
    if fitting then return end; fitting = true
    task.defer(function()
      lbl.TextSize = b.TextSize
      for _ = 1, 24 do
        if not lbl.Parent then break end
        local over = lbl.TextBounds.X > lbl.AbsoluteSize.X + 1 or lbl.TextBounds.Y > lbl.AbsoluteSize.Y + 1
        if not over or lbl.TextSize <= 8 then break end
        lbl.TextSize -= 1; game:GetService("RunService").Heartbeat:Wait()
      end
      fitting = false
    end)
  end
  fit(); lbl:GetPropertyChangedSignal("AbsoluteSize"):Connect(fit)
  lbl:SetAttribute("NoTr", true)
  mk("UIStroke", { Thickness = 1.5, Color = Color3.fromRGB(10, 6, 8) }, lbl)
  b.TextTransparency = 1
  if b:GetAttribute("SkinClose") then lbl.Visible = false end   -- 그림에 X 가 있다
  b:GetPropertyChangedSignal("Text"):Connect(function() lbl.Text = b.Text; lbl.TextWrapped = string.find(b.Text, string.char(10), 1, true) ~= nil; fit() end)
  b:GetPropertyChangedSignal("TextSize"):Connect(fit)
  b:GetPropertyChangedSignal("BackgroundColor3"):Connect(function()   -- 선택 표시 등으로 색이 바뀌면 그림도 바꾼다
    local a = Sprites.art(pick(b)); if a then img.ImageContent = a.content end
    b.BackgroundTransparency = 1
  end)
  b.MouseEnter:Connect(function() img.ImageColor3 = Color3.fromRGB(255, 240, 210) end)
  b.MouseLeave:Connect(function() img.ImageColor3 = Color3.new(1, 1, 1) end)
end
-- 창 · 상자 · 슬롯 · 자원 틀: 배경을 그림으로
function M.frame(f, key, e, scale)
  if f:GetAttribute("Skinned") then return end
  local img = slice(f, key, f.ZIndex, e, scale); if not img then return end
  f:SetAttribute("Skinned", true); plain(f); f.BackgroundTransparency = 1
  return img
end
return M
