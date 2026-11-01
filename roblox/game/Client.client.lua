-- 최소 클라이언트 화면: 도전(스테이지/균열/탑) · 인벤토리 · 스킬 · 상점 · 패시브 · 대장간. 그래픽은 나중에 교체한다.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local rpc = RS:WaitForChild("Rpc")
local gui = Instance.new("ScreenGui"); gui.Name = "DungeonUI"; gui.ResetOnSpawn = false; gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

local function label(parent, text, size, pos, sz)
  local l = Instance.new("TextLabel"); l.BackgroundTransparency = 1; l.TextColor3 = Color3.new(1, 1, 1); l.Font = Enum.Font.GothamMedium; l.TextSize = size or 16
  l.TextXAlignment = Enum.TextXAlignment.Left; l.TextWrapped = true; l.Text = text; l.Position = pos; l.Size = sz; l.Parent = parent; return l
end
local function button(parent, text, pos, sz, cb, color)
  local b = Instance.new("TextButton"); b.Text = text; b.Font = Enum.Font.GothamBold; b.TextSize = 14; b.TextColor3 = Color3.new(1, 1, 1); b.BackgroundColor3 = color or Color3.fromRGB(70, 60, 120)
  b.Position = pos; b.Size = sz; b.Parent = parent; Instance.new("UICorner", b).CornerRadius = UDim.new(0, 6); b.MouseButton1Click:Connect(cb); return b
end
local root = Instance.new("Frame"); root.Size = UDim2.new(0, 560, 0, 600); root.Position = UDim2.new(0.5, -280, 0.5, -300); root.BackgroundColor3 = Color3.fromRGB(24, 20, 44); root.Parent = gui
Instance.new("UICorner", root).CornerRadius = UDim.new(0, 10)
local top = label(root, "불러오는 중…", 13, UDim2.new(0, 12, 0, 4), UDim2.new(1, -24, 0, 36))
local msg = label(root, "", 13, UDim2.new(0, 12, 0, 40), UDim2.new(1, -24, 0, 38))
local list = Instance.new("ScrollingFrame"); list.Position = UDim2.new(0, 12, 0, 150); list.Size = UDim2.new(1, -24, 1, -162); list.BackgroundColor3 = Color3.fromRGB(16, 14, 32)
list.CanvasSize = UDim2.new(0, 0, 0, 0); list.AutomaticCanvasSize = Enum.AutomaticSize.Y; list.Parent = root
Instance.new("UIListLayout", list).Padding = UDim.new(0, 4)
local ctl = Instance.new("Frame"); ctl.BackgroundTransparency = 1; ctl.Position = UDim2.new(0, 12, 0, 110); ctl.Size = UDim2.new(1, -24, 0, 34); ctl.Parent = root

local summary; local mode = "stage"; local num = 1
local function setSummary(s)
  if not s then return end
  summary = s
  top.Text = string.format("Lv%d · 골드 %s · 강화석 %d · 연마석 %d · 혼돈구슬 %d · 스킬칸 %d\n체력 %.0f · 공격 %.0f · 주문 %.0f · 방어 %.0f · 치명 %.0f%% · 스테이지 %d/5 · 균열 %d/100 · 탑 %d/100", s.level, tostring(s.gold), s.ore, s.hone, s.orbC, s.slots or 0, s.maxHp, s.atk, s.mag, s.def, s.crit * 100, s.cleared, s.riftBest, s.best)
end
local function clear() for _, c in ipairs(list:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end for _, c in ipairs(ctl:GetChildren()) do c:Destroy() end end
local function card(title, lines, btns)
  local f = Instance.new("Frame"); f.BackgroundColor3 = Color3.fromRGB(40, 34, 70); f.AutomaticSize = Enum.AutomaticSize.Y; f.Size = UDim2.new(1, -8, 0, 0); f.Parent = list
  Instance.new("UICorner", f).CornerRadius = UDim.new(0, 6)
  local t = label(f, title .. (#lines > 0 and ("\n" .. table.concat(lines, "\n")) or ""), 13, UDim2.new(0, 8, 0, 4), UDim2.new(1, -150, 0, 0)); t.AutomaticSize = Enum.AutomaticSize.Y
  for i, b in ipairs(btns or {}) do button(f, b[1], UDim2.new(1, -136 + (i - 1) * 66, 0, 6), UDim2.new(0, 62, 0, 28), b[2]) end
  Instance.new("UIPadding", f).PaddingBottom = UDim.new(0, 6)
end
local views = {}
local function refresh() local r = rpc:InvokeServer("state"); setSummary(r.summary) end

function views.fight()
  clear()
  local lbl = label(ctl, "", 16, UDim2.new(0, 0, 0, 2), UDim2.new(0, 200, 0, 28))
  local function upd() local maxN = mode == "stage" and math.min(5, (summary.cleared or 0) + 1) or (mode == "rift" and math.min(100, summary.riftBest + 1) or math.min(100, summary.best + 1)); num = math.max(1, math.min(num, maxN)); lbl.Text = ({ stage = "스테이지", rift = "균열", tower = "탑" })[mode] .. " " .. num .. "층/번" end
  upd()
  button(ctl, "종류", UDim2.new(0, 204, 0, 2), UDim2.new(0, 54, 0, 28), function() mode = mode == "stage" and "rift" or (mode == "rift" and "tower" or "stage"); num = 1; upd() end)
  button(ctl, "−", UDim2.new(0, 262, 0, 2), UDim2.new(0, 30, 0, 28), function() num -= 1; upd() end)
  button(ctl, "+", UDim2.new(0, 296, 0, 2), UDim2.new(0, 30, 0, 28), function() num += 1; upd() end)
  button(ctl, "도전!", UDim2.new(0, 332, 0, 2), UDim2.new(0, 80, 0, 28), function()
    local r = mode == "tower" and rpc:InvokeServer("battle", num) or rpc:InvokeServer("fight", { kind = mode, n = num })
    if r.err then msg.Text = r.err; return end
    local x = r.result
    msg.Text = string.format("%s — %.0f초 · 처치 %d · 골드 +%d%s%s\n드랍 %d개%s%s", x.win and "승리" or "패배", x.time, x.kills, x.gold, x.first and " · 최초 클리어!" or "", x.levelUps and (" · 레벨 +" .. x.levelUps) or "", #x.items, x.ore and (" · 강화석 +" .. x.ore) or "", x.note and ("\n" .. x.note) or "")
    setSummary(r.summary); upd()
  end, Color3.fromRGB(150, 60, 60))
  card("전투", { "스테이지 1~4 → 보스(5) → 균열 1~100 → 솔로 탑.", "'종류'로 바꾸고 −/+ 로 번호를 고른 뒤 도전하세요." }, {})
end
function views.inv()
  clear(); local r = rpc:InvokeServer("inv")
  for _, it in ipairs(r.inv) do
    card((it.sat and "✦ " or "") .. it.title, it.lines, {
      { "장착", function() local e = rpc:InvokeServer("equip", it.uid); setSummary(e.summary); views.inv() end },
      { "분해", function() local e = rpc:InvokeServer("dismantle", it.uid); setSummary(e.summary); views.inv() end },
    })
  end
end
function views.skills()
  clear(); local r = rpc:InvokeServer("skills"); setSummary(r.summary)
  for _, k in ipairs(r.rows) do
    local tag = k.passive and " [패시브 장착]" or (k.slot > 0 and (" [" .. k.slot .. "번 칸]") or "")
    local btns = {}
    if k.honeCost then btns[#btns + 1] = { "레벨업\n" .. k.honeCost, function() local e = rpc:InvokeServer("levelup", k.uid); if e.err then msg.Text = e.err end; views.skills() end } end
    btns[#btns + 1] = { "장착", function() local slot = 1; for i = 1, r.slots do slot = i; local used = false; for _, o in ipairs(r.rows) do if o.slot == i then used = true end end; if not used then break end end; rpc:InvokeServer("equipskill", { slot = slot, uid = k.uid }); views.skills() end }
    card(string.format("%s Lv%d%s", k.name, k.lvl, tag), { k.desc or "" }, btns)
  end
end
function views.shop()
  clear(); local r = rpc:InvokeServer("shop"); setSummary(r.summary)
  for _, row in ipairs(r.rows) do card(string.format("%s — %d G", row.name, row.price), { row.desc or "" }, { { "구매", function() local e = rpc:InvokeServer("buy", row.id); msg.Text = e.ok and (row.name .. " 구매") or tostring(e.err); setSummary(e.summary); views.shop() end } }) end
end
function views.pass()
  clear(); local r = rpc:InvokeServer("passives"); setSummary(r.summary)
  card(string.format("패시브 포인트 %d / %d (찍은 노드 %d개)", r.info.left, r.info.points, r.info.taken), { "레벨 1당 2포인트. 직접 트리를 고르는 화면은 아직 없어서 '자동' 으로 효율 좋은 노드부터 찍습니다." }, {
    { "자동", function() local e = rpc:InvokeServer("autopass"); msg.Text = "패시브 " .. e.added .. "개 배분"; setSummary(e.summary); views.pass() end },
    { "초기화", function() local e = rpc:InvokeServer("resetpass"); setSummary(e.summary); views.pass() end },
  })
end
function views.forge()
  clear(); local r = rpc:InvokeServer("enhlist"); setSummary(r.summary)
  for _, row in ipairs(r.rows) do
    card(string.format("%s +%d", row.slot, row.enh), { string.format("비용 %d G · 강화석 %d", row.gold, row.ore) }, { { "강화", function() local e = rpc:InvokeServer("enhance", row.uid); msg.Text = tostring(e.msg or e.err); setSummary(e.summary); views.forge() end } })
  end
end
local tabs = { { "도전", "fight" }, { "장비", "inv" }, { "스킬", "skills" }, { "상점", "shop" }, { "패시브", "pass" }, { "대장간", "forge" } }
local tabRow = Instance.new("Frame"); tabRow.BackgroundTransparency = 1; tabRow.Position = UDim2.new(0, 12, 0, 80); tabRow.Size = UDim2.new(1, -24, 0, 28); tabRow.Parent = root
for i, t in ipairs(tabs) do button(tabRow, t[1], UDim2.new(0, (i - 1) * 90, 0, 0), UDim2.new(0, 86, 0, 26), function() views[t[2]]() end) end
refresh(); views.fight()
