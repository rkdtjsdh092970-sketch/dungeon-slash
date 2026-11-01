-- UI 테마: 글꼴 · 공통 색. 화풍을 바꿀 때 이 파일만 고친다.
local M = {}
M.FONT = Enum.Font.Oswald        -- 제목 · 버튼 · 숫자 (각지고 진지한 글꼴. 이전: FredokaOne)
M.BODY = Enum.Font.GothamMedium  -- 본문
M.GOLD = Color3.fromRGB(196, 158, 82)      -- 테두리 · 강조 (채도 낮춘 금색)
M.DARK = Color3.fromRGB(16, 13, 22)
M.PANEL = Color3.fromRGB(30, 27, 38)
M.EDGE = Color3.fromRGB(10, 8, 14)
-- 버튼 색 (덜 알록달록하게)
M.BTN = { green = Color3.fromRGB(58, 118, 70), gold = Color3.fromRGB(160, 118, 46), blue = Color3.fromRGB(52, 86, 150), red = Color3.fromRGB(140, 48, 48), purple = Color3.fromRGB(76, 64, 112), gray = Color3.fromRGB(58, 56, 68) }
return M
