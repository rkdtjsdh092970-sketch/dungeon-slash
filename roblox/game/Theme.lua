-- UI 테마: 글꼴 · 공통 색. 화풍을 바꿀 때 이 파일만 고친다.
local M = {}
M.FONT = Enum.Font.Oswald        -- 제목 · 버튼 · 숫자 (각지고 진지한 글꼴. 이전: FredokaOne)
M.BODY = Enum.Font.GothamMedium  -- 본문
-- 실제로 보이는 글꼴: Balthazar (Enum.Font 에 없어서 FontFace 로 입힌다. 한글은 로블록스 기본 한글 글꼴로 대체됨)
M.FAMILY = "rbxasset://fonts/families/Balthazar.json"
M.GOLD = Color3.fromRGB(196, 158, 82)      -- 테두리 · 강조 (채도 낮춘 금색)
M.DARK = Color3.fromRGB(16, 13, 22)
M.PANEL = Color3.fromRGB(30, 27, 38)
M.EDGE = Color3.fromRGB(10, 8, 14)
-- 버튼 색 (덜 알록달록하게)
M.BTN = { green = Color3.fromRGB(58, 118, 70), gold = Color3.fromRGB(160, 118, 46), blue = Color3.fromRGB(52, 86, 150), red = Color3.fromRGB(140, 48, 48), purple = Color3.fromRGB(76, 64, 112), gray = Color3.fromRGB(58, 56, 68) }

-- gui 안의 모든 글자에 테마 글꼴을 입힌다 (나중에 생기는 글자 · 코드가 Font 를 바꾼 경우 포함). 굵기는 원래 글꼴 것을 따른다.
local function apply(o)
  if not (o:IsA("TextLabel") or o:IsA("TextButton") or o:IsA("TextBox")) then return end
  local function set()
    local f = o.FontFace
    if f.Family ~= M.FAMILY then o.FontFace = Font.new(M.FAMILY, f.Weight.Value >= 600 and Enum.FontWeight.Bold or Enum.FontWeight.Regular, f.Style) end
  end
  set(); o:GetPropertyChangedSignal("FontFace"):Connect(set)
end
function M.watch(gui)
  for _, d in ipairs(gui:GetDescendants()) do apply(d) end
  gui.DescendantAdded:Connect(apply)
end
return M
