-- 최소 클라이언트 화면: 상태 · 탑 도전 · 인벤토리(장착/분해). 그래픽은 나중에 교체한다.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local rpc = RS:WaitForChild("Rpc")
local gui = Instance.new("ScreenGui"); gui.Name = "DungeonUI"; gui.ResetOnSpawn = false; gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

local function label(parent, text, size, pos, sz)
  local l = Instance.new("TextLabel"); l.BackgroundTransparency = 1; l.TextColor3 = Color3.new(1, 1, 1); l.Font = Enum.Font.GothamMedium; l.TextSize = size or 16
  l.TextXAlignment = Enum.TextXAlignment.Left; l.TextWrapped = true; l.Text = text; l.Position = pos; l.Size = sz; l.Parent = parent; return l
end
local function button(parent, text, pos, sz, cb)
  local b = Instance.new("TextButton"); b.Text = text; b.Font = Enum.Font.GothamBold; b.TextSize = 16; b.TextColor3 = Color3.new(1, 1, 1); b.BackgroundColor3 = Color3.fromRGB(70, 60, 120)
  b.Position = pos; b.Size = sz; b.Parent = parent; Instance.new("UICorner", b).CornerRadius = UDim.new(0, 6); b.MouseButton1Click:Connect(cb); return b
end
local root = Instance.new("Frame"); root.Size = UDim2.new(0, 520, 0, 560); root.Position = UDim2.new(0.5, -260, 0.5, -280); root.BackgroundColor3 = Color3.fromRGB(24, 20, 44); root.Parent = gui
Instance.new("UICorner", root).CornerRadius = UDim.new(0, 10)
local top = label(root, "불러오는 중…", 16, UDim2.new(0, 12, 0, 8), UDim2.new(1, -24, 0, 60))
local floorN = 1
local floorLbl = label(root, "도전 층: 1", 18, UDim2.new(0, 12, 0, 74), UDim2.new(0, 160, 0, 30))
local result = label(root, "", 14, UDim2.new(0, 12, 0, 112), UDim2.new(1, -24, 0, 90))
local list = Instance.new("ScrollingFrame"); list.Position = UDim2.new(0, 12, 0, 210); list.Size = UDim2.new(1, -24, 1, -222); list.BackgroundColor3 = Color3.fromRGB(16, 14, 32)
list.CanvasSize = UDim2.new(0, 0, 0, 0); list.AutomaticCanvasSize = Enum.AutomaticSize.Y; list.Parent = root
local layout = Instance.new("UIListLayout"); layout.Padding = UDim.new(0, 4); layout.Parent = list

local summary
local function setSummary(s)
  summary = s
  top.Text = string.format("골드 %s · 강화석 %d · 탑 최고 %d층 · 길드 Lv%d\n체력 %s · 공격 %s · 주문 %s · 방어 %s · 치명 %.0f%%", s.gold, s.ore, s.best, s.guildLv, tostring(math.floor(s.maxHp)), tostring(math.floor(s.atk)), tostring(math.floor(s.mag)), tostring(math.floor(s.def)), s.crit * 100)
  floorN = math.max(1, math.min(floorN, s.best + 1)); floorLbl.Text = "도전 층: " .. floorN
end
local function clear() for _, c in ipairs(list:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end end
local function card(title, lines, btns)
  local f = Instance.new("Frame"); f.BackgroundColor3 = Color3.fromRGB(40, 34, 70); f.AutomaticSize = Enum.AutomaticSize.Y; f.Size = UDim2.new(1, -8, 0, 0); f.Parent = list
  Instance.new("UICorner", f).CornerRadius = UDim.new(0, 6)
  local t = label(f, title .. "\n" .. table.concat(lines, "\n"), 13, UDim2.new(0, 8, 0, 4), UDim2.new(1, -150, 0, 0)); t.AutomaticSize = Enum.AutomaticSize.Y
  for i, b in ipairs(btns) do button(f, b[1], UDim2.new(1, -136 + (i - 1) * 66, 0, 6), UDim2.new(0, 62, 0, 28), b[2]) end
  local pad = Instance.new("UIPadding", f); pad.PaddingBottom = UDim.new(0, 6)
end
local showInv
local function refreshState() local r = rpc:InvokeServer("state"); if r.summary then setSummary(r.summary) end end
function showInv()
  local r = rpc:InvokeServer("inv"); clear()
  for _, it in ipairs(r.inv) do
    card((it.sat and "✦ " or "") .. it.title, it.lines, {
      { "장착", function() local e = rpc:InvokeServer("equip", it.uid); if e.summary then setSummary(e.summary) end; showInv() end },
      { "분해", function() local e = rpc:InvokeServer("dismantle", it.uid); if e.summary then setSummary(e.summary) end; showInv() end },
    })
  end
end
button(root, "−", UDim2.new(0, 176, 0, 74), UDim2.new(0, 34, 0, 30), function() floorN = math.max(1, floorN - 1); floorLbl.Text = "도전 층: " .. floorN end)
button(root, "+", UDim2.new(0, 214, 0, 74), UDim2.new(0, 34, 0, 30), function() floorN = math.min((summary and summary.best or 0) + 1, floorN + 1); floorLbl.Text = "도전 층: " .. floorN end)
local go; go = button(root, "도전!", UDim2.new(0, 258, 0, 74), UDim2.new(0, 90, 0, 30), function()
  go.Text = "전투 중…"; local r = rpc:InvokeServer("battle", floorN); go.Text = "도전!"
  if r.err then result.Text = r.err; return end
  local x = r.result
  result.Text = string.format("%s — %d층 · %.0f초 · 처치 %d · 골드 +%d%s\n드랍: %s", x.win and "승리" or "패배", x.floor, x.time, x.kills, x.gold, x.first and " · 최고 기록 갱신!" or "", #x.items > 0 and (#x.items .. "개") or "없음")
  setSummary(r.summary); showInv()
end)
button(root, "인벤토리", UDim2.new(0, 356, 0, 74), UDim2.new(0, 100, 0, 30), showInv)
refreshState(); showInv()
