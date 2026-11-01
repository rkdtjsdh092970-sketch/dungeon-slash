-- 메뉴 화면 (장비 · 스킬 · 패시브 트리) — 웹 버전 ui3.js 의 openItems / openSkills / openPassives 를 로블록스용으로.
-- 클라이언트가 M.init(ctx) 로 창(list · msg · rpc 등)을 넘겨준다. 글자는 한국어로 쓰고 Lang 이 자동 번역한다.
local TweenService = game:GetService("TweenService")
local UIS = game:GetService("UserInputService")
local RS = game:GetService("ReplicatedStorage")
local Data = RS.Game.Data
local Skills = require(Data.Skills)
local Passives = require(Data.Passives)
local Items = require(Data.Items)
local M = {}
local C   -- ctx: rpc, list, msg, clear, setSummary, summary(), toast, prompt, Sprites

local function mk(class, props, parent) local o = Instance.new(class); for k, v in pairs(props) do o[k] = v end; o.Parent = parent; return o end
local function corner(o, r) mk("UICorner", { CornerRadius = r and UDim.new(0, r) or UDim.new(1, 0) }, o) end
local function stroke(o, c, t) return mk("UIStroke", { Color = c, Thickness = t or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, o) end
local function hex(h) local ok, c = pcall(Color3.fromHex, h or "#ffffff"); return ok and c or Color3.new(1, 1, 1) end
local function n(x) x = math.floor(x or 0); if x >= 1e6 then return string.format("%.1fM", x / 1e6) elseif x >= 1e4 then return string.format("%.1fK", x / 1e3) end return tostring(x) end

M.FONT, M.BODY = Enum.Font.FredokaOne, Enum.Font.GothamMedium
M.GOLD, M.DARK, M.PANEL = Color3.fromRGB(214, 168, 70), Color3.fromRGB(20, 14, 38), Color3.fromRGB(36, 30, 64)
-- 등급 색: 일반 · 매직 · 레어 · 전설 (사탄 장비는 보라)
M.RAR = { Color3.fromRGB(205, 205, 215), Color3.fromRGB(90, 150, 255), Color3.fromRGB(255, 214, 70), Color3.fromRGB(255, 140, 40) }
M.SAT = Color3.fromRGB(200, 90, 255)
M.BTN = { green = Color3.fromRGB(60, 165, 80), gold = Color3.fromRGB(215, 155, 40), blue = Color3.fromRGB(60, 110, 210), red = Color3.fromRGB(185, 60, 60), purple = Color3.fromRGB(95, 80, 160), gray = Color3.fromRGB(70, 66, 90) }
local SLOT_ART = { weapon = "i_weapon", helm = "i_helm", armor = "i_armor", gloves = "i_gloves", boots = "i_boots", ring = "i_ring", ring2 = "i_ring", neck = "i_neck" }
local SLOT_EMOJI = { weapon = "⚔", helm = "⛑", armor = "🛡", gloves = "🧤", boots = "👢", ring = "💍", ring2 = "💍", neck = "📿" }
local ELEM = { fire = Color3.fromRGB(255, 120, 50), cold = Color3.fromRGB(110, 200, 255), light = Color3.fromRGB(255, 225, 80), void = Color3.fromRGB(170, 100, 255), phys = Color3.fromRGB(210, 210, 220) }
local SK_BY = {}; for _, d in ipairs(Skills.SKILLS) do SK_BY[d.id] = d end
M.SK_BY = SK_BY

function M.init(ctx) C = ctx end

-- 게임 버튼: 색 + 위아래 밝기 차 + 테두리 + 굵은 글꼴
function M.btn(parent, text, size, color, cb)
  local b = mk("TextButton", { Size = size, BackgroundColor3 = color or M.BTN.purple, Text = text, TextColor3 = Color3.new(1, 1, 1), Font = M.FONT, TextSize = 16, AutoButtonColor = true }, parent)
  corner(b, 8); stroke(b, Color3.fromRGB(20, 10, 30), 2)
  mk("UIGradient", { Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(170, 170, 170)), Rotation = 90 }, b)
  mk("UIStroke", { Thickness = 1.5, Color = Color3.fromRGB(20, 10, 30), ApplyStrokeMode = Enum.ApplyStrokeMode.Contextual }, b)
  if cb then b.MouseButton1Click:Connect(cb) end
  return b
end
local function txt(parent, text, size, pos, sz, color, font, xa)
  return mk("TextLabel", { BackgroundTransparency = 1, Position = pos, Size = sz, Text = text, TextColor3 = color or Color3.new(1, 1, 1), Font = font or M.BODY, TextSize = size, TextWrapped = true,
    TextXAlignment = xa or Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top }, parent)
end
-- 아이콘 타일: 등급 테두리 · 아이콘(그림 없으면 이모지/글자) · 왼쪽 위/오른쪽 아래 작은 글자
function M.tile(parent, size, o)
  local col = o.color or M.RAR[(o.rarity or 0) + 1] or M.RAR[1]
  local b = mk("TextButton", { Size = UDim2.new(0, size, 0, size), BackgroundColor3 = Color3.fromRGB(26, 20, 44), Text = "", AutoButtonColor = false, LayoutOrder = o.order or 0 }, parent)
  corner(b, 10); local st = stroke(b, col, o.selected and 4 or 2.5)
  mk("UIGradient", { Color = ColorSequence.new(col:Lerp(Color3.new(0, 0, 0), 0.55), Color3.fromRGB(22, 16, 36)), Rotation = 90 }, b)
  local a = o.art and C.Sprites.art(o.art)
  if a then mk("ImageLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0), Size = UDim2.new(0.78, 0, 0.78, 0), ScaleType = Enum.ScaleType.Fit, ImageContent = a.content, ImageTransparency = o.dim and 0.6 or 0 }, b)
  elseif o.emoji then mk("TextLabel", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 1, 0), Text = o.emoji, TextScaled = true, Font = M.FONT, TextColor3 = col, TextTransparency = o.dim and 0.6 or 0 }, b) end
  if o.label then local l = txt(b, o.label, 11, UDim2.new(0, 2, 1, -28), UDim2.new(1, -4, 0, 26), Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Center); l.TextYAlignment = Enum.TextYAlignment.Bottom; mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, l) end
  if o.tl then local l = txt(b, o.tl, 12, UDim2.new(0, 5, 0, 3), UDim2.new(1, -8, 0, 16), Color3.fromRGB(255, 240, 200), M.FONT); mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, l) end
  if o.br then local l = txt(b, o.br, 13, UDim2.new(0, 2, 1, -18), UDim2.new(1, -6, 0, 16), Color3.fromRGB(120, 255, 140), M.FONT, Enum.TextXAlignment.Right); mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, l) end
  if o.check then local c = mk("TextLabel", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -3, 0, 3), Size = UDim2.new(0, 20, 0, 20), BackgroundColor3 = Color3.fromRGB(60, 190, 90), Text = "✓", TextColor3 = Color3.new(1, 1, 1), Font = M.FONT, TextSize = 14 }, b); corner(c) end
  b.MouseEnter:Connect(function() st.Thickness = 4 end); b.MouseLeave:Connect(function() st.Thickness = o.selected and 4 or 2.5 end)
  if o.click then b.MouseButton1Click:Connect(o.click) end
  return b
end
-- 화면 영역: 창의 내용 목록 안에 고정 높이 판을 하나 만든다
local function area(h) return mk("Frame", { Size = UDim2.new(1, -16, 0, h or 392), BackgroundTransparency = 1 }, C.list) end
local function box(parent, pos, size, title)
  local f = mk("Frame", { Position = pos, Size = size, BackgroundColor3 = M.PANEL }, parent); corner(f, 10); stroke(f, Color3.fromRGB(80, 66, 130), 1.5)
  if title then local t = txt(f, title, 15, UDim2.new(0, 10, 0, 6), UDim2.new(1, -20, 0, 20), Color3.fromRGB(255, 220, 120), M.FONT) end
  return f
end
local function grid(parent, pos, size, cell)
  local sf = mk("ScrollingFrame", { Position = pos, Size = size, BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6 }, parent)
  mk("UIGridLayout", { CellSize = UDim2.new(0, cell, 0, cell), CellPadding = UDim2.new(0, 6, 0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, sf)
  mk("UIPadding", { PaddingTop = UDim.new(0, 4), PaddingLeft = UDim.new(0, 4) }, sf)
  return sf
end
-- 마우스로 끌어서 스크롤 (ScrollingFrame 은 PC 마우스 끌기를 지원하지 않는다)
function M.dragScroll(sf)
  local drag
  sf.InputBegan:Connect(function(io) if io.UserInputType == Enum.UserInputType.MouseButton1 then drag = { s = io.Position, c = sf.CanvasPosition, moved = false } end end)
  UIS.InputChanged:Connect(function(io)
    if drag and io.UserInputType == Enum.UserInputType.MouseMovement then
      local d = io.Position - drag.s; if d.Magnitude > 6 then drag.moved = true end
      sf.CanvasPosition = Vector2.new(math.clamp(drag.c.X - d.X, 0, math.max(0, sf.AbsoluteCanvasSize.X - sf.AbsoluteWindowSize.X)), math.clamp(drag.c.Y - d.Y, 0, math.max(0, sf.AbsoluteCanvasSize.Y - sf.AbsoluteWindowSize.Y)))
    end
  end)
  UIS.InputEnded:Connect(function(io) if io.UserInputType == Enum.UserInputType.MouseButton1 then drag = nil end end)
  return function() return drag and drag.moved end
end

-- ───────── 장비 ─────────
local invSel, invMulti, invPick = nil, false, {}
local function itemColor(it) return it.sat and M.SAT or M.RAR[(it.rarity or 0) + 1] end
function M.inv()
  C.clear()
  local r = C.rpc:InvokeServer("inv"); local st = C.rpc:InvokeServer("state"); if st.summary then C.setSummary(st.summary) end
  if r.err or st.err then C.msg.Text = tostring(r.err or st.err); return end
  local inv, eq = r.inv or {}, st.equipped or {}
  local bySlot = {}; for _, e in ipairs(eq) do bySlot[e.slot] = e end
  local byUid = {}; for _, it in ipairs(inv) do byUid[it.uid] = it end
  for _, e in ipairs(eq) do byUid[e.uid] = e; e.equipped = true end
  local A = area(392)
  -- 왼쪽: 착용 중 (8칸) + 능력치
  local L = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(0, 232, 1, 0), "착용 중")
  local eg = mk("Frame", { Position = UDim2.new(0, 10, 0, 32), Size = UDim2.new(1, -20, 0, 300), BackgroundTransparency = 1 }, L)
  mk("UIGridLayout", { CellSize = UDim2.new(0, 64, 0, 64), CellPadding = UDim2.new(0, 8, 0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, eg)
  for i, slot in ipairs(Items.EQ_SLOTS) do
    local e = bySlot[slot]
    M.tile(eg, 64, { order = i, art = SLOT_ART[slot], emoji = SLOT_EMOJI[slot], rarity = e and e.rarity or 0, color = e and itemColor(e) or Color3.fromRGB(70, 66, 90), dim = not e,
      tl = e and (e.enh > 0 and ("+" .. e.enh) or nil), label = not e and Items.SLOT_NAME[slot] or nil, selected = e and invSel == e.uid,
      click = function() if e then invSel = e.uid; M.inv() end end })
  end
  local s = C.summary()
  if s then txt(L, string.format("체력 %s · 공격 %s · 주문 %s\n방어 %s · 치명 %.0f%%", n(s.maxHp), n(s.atk), n(s.mag), n(s.def), (s.crit or 0) * 100), 12, UDim2.new(0, 10, 1, -48), UDim2.new(1, -20, 0, 44), Color3.fromRGB(220, 215, 240)) end
  -- 가운데: 가방
  local B = box(A, UDim2.new(0, 240, 0, 0), UDim2.new(1, -240 - 300, 1, 0), string.format("가방 %d개", #inv))
  local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -78), 62)
  for i, it in ipairs(inv) do
    M.tile(g, 62, { order = i, art = SLOT_ART[it.slot], emoji = SLOT_EMOJI[it.slot], rarity = it.rarity, color = itemColor(it), tl = it.enh > 0 and ("+" .. it.enh) or nil, br = it.ilvl and ("i" .. it.ilvl) or nil,
      selected = (not invMulti and invSel == it.uid) or (invMulti and invPick[it.uid]), check = invMulti and invPick[it.uid] or nil,
      click = function() if invMulti then invPick[it.uid] = not invPick[it.uid] or nil else invSel = it.uid end; M.inv() end })
  end
  local bar = mk("Frame", { Position = UDim2.new(0, 6, 1, -44), Size = UDim2.new(1, -12, 0, 38), BackgroundTransparency = 1 }, B)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, bar)
  local function bulkDo(mode)
    local cnt, gold, ore = 0, 0, 0
    for uid in pairs(invPick) do local e = C.rpc:InvokeServer(mode, uid); if e.summary then C.setSummary(e.summary) end; if e.ok ~= false then cnt += 1 end end
    invPick = {}; invMulti = false; M.inv(); C.msg.Text = mode == "sell" and string.format("%d개 판매", cnt) or string.format("%d개 분해", cnt)
  end
  if invMulti then
    local k = 0; for _ in pairs(invPick) do k += 1 end
    M.btn(bar, string.format("판매 %d", k), UDim2.new(0, 84, 1, 0), M.BTN.gold, function() bulkDo("sell") end).LayoutOrder = 1
    M.btn(bar, string.format("분해 %d", k), UDim2.new(0, 84, 1, 0), M.BTN.red, function() bulkDo("dismantle") end).LayoutOrder = 2
    M.btn(bar, "취소", UDim2.new(0, 60, 1, 0), M.BTN.gray, function() invMulti = false; invPick = {}; M.inv() end).LayoutOrder = 3
  else
    M.btn(bar, "여러 개 선택", UDim2.new(0, 120, 1, 0), M.BTN.purple, function() invMulti = true; invPick = {}; M.inv() end).LayoutOrder = 1
    M.btn(bar, "일괄 정리", UDim2.new(0, 100, 1, 0), M.BTN.blue, function() C.openTab("daily") end).LayoutOrder = 2
  end
  -- 오른쪽: 선택한 장비 상세 + 착용 중인 같은 부위와 비교
  local D = box(A, UDim2.new(1, -292, 0, 0), UDim2.new(0, 292, 1, 0), "장비 정보")
  local it = invSel and byUid[invSel]
  if not it then txt(D, "가방이나 착용 칸의 장비를 누르면 여기에 자세히 나옵니다.", 13, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 60), Color3.fromRGB(190, 185, 210)); return end
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 8, 0, 30), Size = UDim2.new(1, -16, 1, -82), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, D)
  mk("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  local t1 = txt(sc, it.title, 15, UDim2.new(), UDim2.new(1, -6, 0, 0), itemColor(it), M.FONT); t1.AutomaticSize = Enum.AutomaticSize.Y; t1.LayoutOrder = 1
  local t2 = txt(sc, table.concat(it.lines or {}, "\n"), 13, UDim2.new(), UDim2.new(1, -6, 0, 0), Color3.fromRGB(230, 225, 245)); t2.AutomaticSize = Enum.AutomaticSize.Y; t2.LayoutOrder = 2
  local cur = not it.equipped and (bySlot[it.slot] or (it.slot == "ring" and bySlot.ring2))
  if cur then
    local h = txt(sc, string.format("— 착용 중 —\n%s", cur.title), 13, UDim2.new(), UDim2.new(1, -6, 0, 0), itemColor(cur), M.FONT); h.AutomaticSize = Enum.AutomaticSize.Y; h.LayoutOrder = 3
    local h2 = txt(sc, table.concat(cur.lines or {}, "\n"), 12, UDim2.new(), UDim2.new(1, -6, 0, 0), Color3.fromRGB(170, 165, 190)); h2.AutomaticSize = Enum.AutomaticSize.Y; h2.LayoutOrder = 4
  end
  local ab = mk("Frame", { Position = UDim2.new(0, 8, 1, -46), Size = UDim2.new(1, -16, 0, 38), BackgroundTransparency = 1 }, D)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, ab)
  local function act(name) local e = C.rpc:InvokeServer(name, it.uid); if e.summary then C.setSummary(e.summary) end; C.msg.Text = e.err and tostring(e.err) or ""; if name ~= "equip" then invSel = nil end; M.inv() end
  if not it.equipped then
    M.btn(ab, "장착", UDim2.new(0, 84, 1, 0), M.BTN.green, function() act("equip") end).LayoutOrder = 1
    M.btn(ab, "판매", UDim2.new(0, 84, 1, 0), M.BTN.gold, function() act("sell") end).LayoutOrder = 2
    M.btn(ab, "분해", UDim2.new(0, 84, 1, 0), M.BTN.red, function() act("dismantle") end).LayoutOrder = 3
  else
    M.btn(ab, "강화하러 가기", UDim2.new(0, 160, 1, 0), M.BTN.blue, function() C.openTab("forge") end).LayoutOrder = 1
  end
end

-- ───────── 스킬 ─────────
local skSel
local function skColor(d) return d and (ELEM[d.elem or ""] or hex(d.color)) or M.RAR[1] end
local ELEM_EMOJI = { fire = "🔥", cold = "❄", light = "⚡", void = "🌀" }
local function skIcon(d) if not d then return "?" end; if d.slot == "basic" then return "👊" end; return ELEM_EMOJI[d.elem or ""] or "⚔" end
function M.skStyle(id) local d = SK_BY[id]; return skColor(d), skIcon(d), d end
function M.skills()
  C.clear()
  local r = C.rpc:InvokeServer("skills"); if r.summary then C.setSummary(r.summary) end
  if r.err then C.msg.Text = tostring(r.err); return end
  local rows, slots = r.rows or {}, r.slots or 1
  local byUid, inSlot = {}, {}
  for _, k in ipairs(rows) do byUid[k.uid] = k; if k.slot > 0 then inSlot[k.slot] = k end end
  local A = area(392)
  -- 위: 장착 칸
  local T = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, -300, 0, 128), string.format("장착 칸 (%d)", slots))
  local row = mk("Frame", { Position = UDim2.new(0, 10, 0, 30), Size = UDim2.new(1, -20, 0, 90), BackgroundTransparency = 1 }, T)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, row)
  for i = 1, slots do
    local k = inSlot[i]; local d = k and SK_BY[k.id]
    M.tile(row, 86, { order = i, color = k and skColor(d) or Color3.fromRGB(70, 66, 90), emoji = k and skIcon(d) or tostring(i), dim = not k,
      label = k and k.name or "빈 칸", tl = k and ("Lv" .. k.lvl) or nil, selected = k and skSel == k.uid, click = function() if k then skSel = k.uid; M.skills() end end })
  end
  -- 아래: 보유 스킬
  local B = box(A, UDim2.new(0, 0, 0, 136), UDim2.new(1, -300, 1, -136), string.format("보유 스킬 %d개", #rows))
  local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -36), 76)
  for i, k in ipairs(rows) do
    local d = SK_BY[k.id]
    M.tile(g, 76, { order = i, color = skColor(d), emoji = skIcon(d), label = k.name, tl = "Lv" .. k.lvl, br = k.slot > 0 and ("#" .. k.slot) or nil, selected = skSel == k.uid, click = function() skSel = k.uid; M.skills() end })
  end
  -- 오른쪽: 상세
  local D = box(A, UDim2.new(1, -292, 0, 0), UDim2.new(0, 292, 1, 0), "스킬 정보")
  local k = skSel and byUid[skSel]
  if not k then txt(D, "스킬을 누르면 설명과 레벨업 · 장착 버튼이 나옵니다.\n새 스킬은 마을의 [스킬 상점]에서 삽니다.", 13, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 80), Color3.fromRGB(190, 185, 210)); return end
  local d = SK_BY[k.id] or {}
  txt(D, k.name .. "  Lv" .. k.lvl, 18, UDim2.new(0, 12, 0, 32), UDim2.new(1, -24, 0, 24), skColor(d), M.FONT)
  local info = {}
  if d.slot == "basic" then info[#info + 1] = "기본 공격" end
  if d.cd then info[#info + 1] = string.format("쿨타임 %.1f초", d.cd) end
  if d.mult then info[#info + 1] = string.format("위력 %d%%", math.floor(d.mult * 100)) end
  txt(D, table.concat(info, " · "), 13, UDim2.new(0, 12, 0, 60), UDim2.new(1, -24, 0, 18), Color3.fromRGB(200, 195, 225))
  local ds = txt(D, k.rune and string.format("%s\n룬: %s", d.desc or "", tostring(k.rune)) or (d.desc or ""), 14, UDim2.new(0, 12, 0, 84), UDim2.new(1, -24, 0, 140), Color3.fromRGB(235, 230, 250))
  local ab = mk("Frame", { Position = UDim2.new(0, 10, 1, -96), Size = UDim2.new(1, -20, 0, 86), BackgroundTransparency = 1 }, D)
  mk("UIGridLayout", { CellSize = UDim2.new(0, 84, 0, 38), CellPadding = UDim2.new(0, 6, 0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, ab)
  local function res(e) if e.summary then C.setSummary(e.summary) end; C.msg.Text = e.err and tostring(e.err) or ""; M.skills() end
  if k.honeCost then M.btn(ab, "레벨업\n" .. k.honeCost, UDim2.new(), M.BTN.green, function() res(C.rpc:InvokeServer("levelup", k.uid)) end).LayoutOrder = 1 end
  for i = 1, slots do if k.slot ~= i then M.btn(ab, string.format("%d번 칸에", i), UDim2.new(), M.BTN.blue, function() res(C.rpc:InvokeServer("equipskill", { slot = i, uid = k.uid })) end).LayoutOrder = 1 + i end end
  if k.slot == 0 then M.btn(ab, "판매", UDim2.new(), M.BTN.red, function() skSel = nil; res(C.rpc:InvokeServer("sellskill", k.uid)) end).LayoutOrder = 20 end
end

-- ───────── 패시브 트리 ─────────
local ARM = { phys = Color3.fromRGB(240, 110, 90), mag = Color3.fromRGB(120, 150, 255), def = Color3.fromRGB(150, 200, 120), elem = Color3.fromRGB(255, 180, 70), mana = Color3.fromRGB(90, 200, 230), skill = Color3.fromRGB(220, 130, 255), util = Color3.fromRGB(230, 230, 150), pierce = Color3.fromRGB(255, 120, 190), bridge = Color3.fromRGB(180, 180, 190) }
local SIZE = { small = 16, filler = 12, notable = 24, key = 34, bridge = 14 }
local passSel, passCanvas
function M.pass()
  C.clear()
  local r = C.rpc:InvokeServer("passview"); if r.summary then C.setSummary(r.summary) end
  if r.err or not r.view then C.msg.Text = tostring(r.err); return end
  local v = r.view; local taken = {}; for _, id in ipairs(v.taken or {}) do taken[id] = true end
  local A = area(392)
  local head = mk("Frame", { Size = UDim2.new(1, 0, 0, 40), BackgroundTransparency = 1 }, A)
  txt(head, string.format("남은 포인트 %d / %d", v.left, v.points), 18, UDim2.new(0, 4, 0, 8), UDim2.new(0.5, 0, 0, 26), Color3.fromRGB(255, 220, 120), M.FONT)
  local hb = mk("Frame", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 2), Size = UDim2.new(0, 260, 0, 36), BackgroundTransparency = 1 }, head)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 6) }, hb)
  M.btn(hb, "자동 배분", UDim2.new(0, 110, 1, 0), M.BTN.green, function() local e = C.rpc:InvokeServer("autopass"); C.setSummary(e.summary); M.pass() end)
  M.btn(hb, "초기화", UDim2.new(0, 90, 1, 0), M.BTN.red, function() local e = C.rpc:InvokeServer("resetpass"); C.setSummary(e.summary); passSel = nil; M.pass() end)
  local frame = box(A, UDim2.new(0, 0, 0, 44), UDim2.new(1, 0, 1, -44))
  frame.ClipsDescendants = true
  local S, PAD = 0.1, 40
  local sf = mk("ScrollingFrame", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(0, 7400 * S + PAD * 2, 0, 7400 * S + PAD * 2), ScrollingDirection = Enum.ScrollingDirection.XY, ScrollBarThickness = 6 }, frame)
  local moved = M.dragScroll(sf)
  local function P(x, y) return 3700 * S + PAD + x * S, 3700 * S + PAD + y * S end
  local BY = {}; for _, d in ipairs(Passives.PASSIVES) do BY[d.id] = d end
  local function avail(d) if taken[d.id] then return false end; for _, l in ipairs(d.links or {}) do if l == "C" or taken[l] then return true end end; return false end
  -- 연결선 (한 쌍에 한 번)
  local drawn = {}
  for _, d in ipairs(Passives.PASSIVES) do
    for _, l in ipairs(d.links or {}) do
      local o = l == "C" and { x = 0, y = 0, id = "C" } or BY[l]
      local key = d.id < (o and o.id or "") and (d.id .. "|" .. l) or (l .. "|" .. d.id)
      if o and not drawn[key] then
        drawn[key] = true
        local x1, y1 = P(d.x, d.y); local x2, y2 = P(o.x, o.y)
        local on = taken[d.id] and (o.id == "C" or taken[o.id])
        mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, (x1 + x2) / 2, 0, (y1 + y2) / 2), Size = UDim2.new(0, math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2), 0, on and 4 or 2), Rotation = math.deg(math.atan2(y2 - y1, x2 - x1)), BackgroundColor3 = on and M.GOLD or Color3.fromRGB(90, 80, 120), BorderSizePixel = 0, ZIndex = 2 }, sf)
      end
    end
  end
  local cx, cy = P(0, 0); local c0 = mk("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, cx, 0, cy), Size = UDim2.new(0, 30, 0, 30), BackgroundColor3 = M.GOLD, ZIndex = 4 }, sf); corner(c0); stroke(c0, Color3.new(1, 1, 1), 2)
  for _, d in ipairs(Passives.PASSIVES) do
    local x, y = P(d.x, d.y); local sz = SIZE[d.kind] or 16
    local col = taken[d.id] and M.GOLD or (avail(d) and (ARM[d.arm] or Color3.new(1, 1, 1)) or Color3.fromRGB(70, 64, 92))
    local b = mk("TextButton", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0, x, 0, y), Size = UDim2.new(0, sz, 0, sz), BackgroundColor3 = col, Text = "", AutoButtonColor = true, ZIndex = 5 }, sf)
    corner(b); stroke(b, passSel == d.id and Color3.new(1, 1, 1) or Color3.fromRGB(20, 10, 30), passSel == d.id and 3 or 1.5)
    b.MouseButton1Click:Connect(function() if moved() then return end; passSel = d.id; passCanvas = sf.CanvasPosition; M.pass() end)
  end
  if passCanvas then sf.CanvasPosition = passCanvas else sf.CanvasPosition = Vector2.new(cx - 400, cy - 160) end
  -- 선택한 노드 정보
  local d = passSel and BY[passSel]
  if d then
    local I = box(frame, UDim2.new(0, 8, 1, -112), UDim2.new(0, 360, 0, 104)); I.ZIndex = 10
    local t = txt(I, string.format("%s  (%d점)", d.name, d.cost or 1), 16, UDim2.new(0, 10, 0, 8), UDim2.new(1, -120, 0, 20), ARM[d.arm] or Color3.new(1, 1, 1), M.FONT); t.ZIndex = 11
    local t2 = txt(I, d.text or "", 13, UDim2.new(0, 10, 0, 32), UDim2.new(1, -120, 0, 64), Color3.fromRGB(235, 230, 250)); t2.ZIndex = 11
    if taken[d.id] then local l = txt(I, "찍음", 15, UDim2.new(1, -100, 0, 36), UDim2.new(0, 90, 0, 30), M.GOLD, M.FONT, Enum.TextXAlignment.Center); l.ZIndex = 11
    else
      local b = M.btn(I, "찍기", UDim2.new(0, 96, 0, 40), M.BTN.green, function()
        local e = C.rpc:InvokeServer("passtake", d.id); C.setSummary(e.summary); passCanvas = sf.CanvasPosition
        C.toast((e.n or 0) > 0 and string.format("노드 %d개를 찍었습니다", e.n) or "포인트가 부족하거나 이어진 길이 없습니다"); M.pass()
      end); b.Position = UDim2.new(1, -106, 0, 32); b.ZIndex = 11
    end
  end
end

-- ───────── 공통: 재화 표시 줄 · 진행 바 ─────────
local function cost(parent, items, pos)   -- items = { {"i_gold", 120}, {"i_ore", 3} }
  local f = mk("Frame", { Position = pos or UDim2.new(), Size = UDim2.new(0, 0, 0, 24), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1 }, parent)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, VerticalAlignment = Enum.VerticalAlignment.Center, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, f)
  for i, c in ipairs(items) do
    local a = C.Sprites.art(c[1])
    if a then mk("ImageLabel", { Size = UDim2.new(0, 22, 0, 22), BackgroundTransparency = 1, ImageContent = a.content, ScaleType = Enum.ScaleType.Fit, LayoutOrder = i * 2 }, f) end
    local l = mk("TextLabel", { Size = UDim2.new(0, 0, 1, 0), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1, Text = n(c[2]), TextColor3 = c[3] or Color3.new(1, 1, 1), Font = M.FONT, TextSize = 16, LayoutOrder = i * 2 + 1 }, f)
    mk("UIPadding", { PaddingRight = UDim.new(0, 8) }, l)
  end
  return f
end
M.cost = cost
local function pbar(parent, pos, size, frac, color)
  local bg = mk("Frame", { Position = pos, Size = size, BackgroundColor3 = Color3.fromRGB(12, 8, 22) }, parent); corner(bg, 6); stroke(bg, Color3.fromRGB(20, 10, 30), 1.5)
  local f = mk("Frame", { Size = UDim2.new(math.clamp(frac, 0, 1), 0, 1, 0), BackgroundColor3 = color or Color3.fromRGB(90, 200, 110) }, bg); corner(f, 6)
  return bg
end
-- 한 줄 카드 (아이콘 · 제목 · 설명 · 진행 바 · 오른쪽 버튼)
local function rowCard(o)
  local f = mk("Frame", { Size = UDim2.new(1, -16, 0, o.h or 74), BackgroundColor3 = o.done and Color3.fromRGB(34, 52, 44) or M.PANEL }, C.list); corner(f, 10); stroke(f, o.ready and M.GOLD or Color3.fromRGB(80, 66, 130), o.ready and 2.5 or 1.5)
  local x = 12
  if o.emoji or o.art then local t = M.tile(f, 52, { art = o.art, emoji = o.emoji, color = o.color or M.GOLD }); t.Position = UDim2.new(0, 10, 0.5, -26); x = 72 end
  txt(f, o.title, 16, UDim2.new(0, x, 0, 8), UDim2.new(1, -x - 150, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT)
  if o.desc then txt(f, o.desc, 13, UDim2.new(0, x, 0, 30), UDim2.new(1, -x - 150, 0, 18), Color3.fromRGB(215, 210, 235)) end
  if o.frac then pbar(f, UDim2.new(0, x, 1, -18), UDim2.new(1, -x - 160, 0, 10), o.frac, o.done and Color3.fromRGB(120, 120, 140) or nil) end
  if o.btn then local b = M.btn(f, o.btn, UDim2.new(0, 128, 0, 40), o.btnColor or M.BTN.green, o.click); b.AnchorPoint = Vector2.new(1, 0.5); b.Position = UDim2.new(1, -12, 0.5, 0); b.Active = o.click ~= nil; b.AutoButtonColor = o.click ~= nil end
  return f
end

-- ───────── 대장간 (강화 · 옵션 재굴림 · 혼돈/신성 구슬 · 소켓) ─────────
local forgeSel
function M.forge()
  C.clear()
  local r = C.rpc:InvokeServer("forge"); if r.summary then C.setSummary(r.summary) end
  if r.err then C.msg.Text = tostring(r.err); return end
  local rows = r.rows or {}; local s = C.summary() or {}
  local A = area(392)
  local L = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(0, 232, 1, 0), "착용 장비")
  local g = grid(L, UDim2.new(0, 8, 0, 30), UDim2.new(1, -16, 1, -36), 64)
  if #rows == 0 then txt(L, "착용한 장비가 없습니다. 먼저 [장비]에서 장착하세요.", 13, UDim2.new(0, 10, 0, 40), UDim2.new(1, -20, 0, 60), Color3.fromRGB(190, 185, 210)); return end
  local sel
  for i, it in ipairs(rows) do
    if not forgeSel then forgeSel = it.uid end
    if it.uid == forgeSel then sel = it end
    M.tile(g, 64, { order = i, art = SLOT_ART[it.slot], emoji = SLOT_EMOJI[it.slot], color = itemColor(it), tl = it.enh > 0 and ("+" .. it.enh) or nil, selected = it.uid == forgeSel, click = function() forgeSel = it.uid; M.forge() end })
  end
  sel = sel or rows[1]; forgeSel = sel.uid
  local R = box(A, UDim2.new(0, 240, 0, 0), UDim2.new(1, -240, 1, 0))
  txt(R, sel.title, 18, UDim2.new(0, 14, 0, 10), UDim2.new(1, -28, 0, 24), itemColor(sel), M.FONT)
  local function res(e) if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.msg or e.err or ""); M.forge() end
  -- 강화
  local E = mk("Frame", { Position = UDim2.new(0, 12, 0, 40), Size = UDim2.new(1, -24, 0, 56), BackgroundColor3 = Color3.fromRGB(28, 22, 50) }, R); corner(E, 8)
  txt(E, string.format("강화 +%d", sel.enh), 22, UDim2.new(0, 12, 0, 14), UDim2.new(0, 140, 0, 28), Color3.fromRGB(255, 220, 120), M.FONT)
  cost(E, { { "i_gold", sel.enhGold, (s.gold or 0) >= sel.enhGold and Color3.new(1, 1, 1) or Color3.fromRGB(255, 120, 120) }, { "i_ore", sel.enhOre, (s.ore or 0) >= sel.enhOre and Color3.new(1, 1, 1) or Color3.fromRGB(255, 120, 120) } }, UDim2.new(0, 150, 0, 16))
  local eb = M.btn(E, string.format("+%d 강화", sel.enh + 1), UDim2.new(0, 130, 0, 40), M.BTN.green, function() res(C.rpc:InvokeServer("enhance", sel.uid)) end); eb.AnchorPoint = Vector2.new(1, 0.5); eb.Position = UDim2.new(1, -8, 0.5, 0)
  -- 옵션 (재굴림)
  txt(R, "옵션", 15, UDim2.new(0, 14, 0, 104), UDim2.new(0, 200, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT)
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 12, 0, 126), Size = UDim2.new(1, -24, 0, 150), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, R)
  mk("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  for i, a in ipairs(sel.affixes or {}) do
    local row = mk("Frame", { Size = UDim2.new(1, -8, 0, 34), BackgroundColor3 = Color3.fromRGB(28, 22, 50), LayoutOrder = i }, sc); corner(row, 6)
    txt(row, a.text, 14, UDim2.new(0, 10, 0, 8), UDim2.new(1, -230, 0, 20), Color3.fromRGB(230, 225, 250))
    if a.locked then txt(row, "🔒 잠김", 14, UDim2.new(1, -110, 0, 8), UDim2.new(0, 100, 0, 20), Color3.fromRGB(170, 165, 190), M.FONT)
    else
      cost(row, { { "i_gold", sel.rerollGold }, { "i_ore", sel.rerollOre } }, UDim2.new(1, -220, 0, 5))
      local b = M.btn(row, "재굴림", UDim2.new(0, 84, 0, 28), M.BTN.blue, function() res(C.rpc:InvokeServer("reroll", { uid = sel.uid, idx = i - 1 })) end); b.Position = UDim2.new(1, -90, 0, 3)
    end
  end
  -- 구슬 · 소켓
  local O = mk("Frame", { Position = UDim2.new(0, 12, 1, -104), Size = UDim2.new(1, -24, 0, 44), BackgroundTransparency = 1 }, R)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center }, O)
  local b1 = M.btn(O, string.format("혼돈 구슬 (%d) · 옵션 추가", s.orbC or 0), UDim2.new(0, 230, 0, 40), M.BTN.purple, function() res(C.rpc:InvokeServer("chaos", sel.uid)) end); b1.LayoutOrder = 1
  local b2 = M.btn(O, string.format("신성한 구슬 (%d) · 수치 다시", s.orbD or 0), UDim2.new(0, 240, 0, 40), M.BTN.gold, function() res(C.rpc:InvokeServer("divine", sel.uid)) end); b2.LayoutOrder = 2
  local So = mk("Frame", { Position = UDim2.new(0, 12, 1, -54), Size = UDim2.new(1, -24, 0, 44), BackgroundTransparency = 1 }, R)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center }, So)
  local sl = txt(So, string.format("소켓 %d개", #(sel.sockets or {})), 15, UDim2.new(), UDim2.new(0, 80, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT); sl.LayoutOrder = 0
  for i, sk in ipairs(sel.sockets or {}) do
    local t = M.tile(So, 40, { order = i, art = sk and "i_stone" or nil, emoji = sk and nil or "◇", color = sk and Color3.fromRGB(160, 220, 255) or Color3.fromRGB(80, 74, 100), dim = not sk })
    if sk then t.MouseEnter:Connect(function() C.msg.Text = tostring(sk) end) end
  end
  local gb = M.btn(So, "돌 끼우기", UDim2.new(0, 110, 0, 38), M.BTN.blue, function() C.openTab("stones") end); gb.LayoutOrder = 99
end

-- ───────── 돌 (확인 · 소켓에 끼우기) ─────────
local stoneSel
function M.stones()
  C.clear()
  local r = C.rpc:InvokeServer("stones"); if r.summary then C.setSummary(r.summary) end
  if r.err then C.msg.Text = tostring(r.err); return end
  local rows, items = r.rows or {}, r.items or {}
  local A = area(392)
  local B = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, -300, 1, 0), string.format("돌 보관함 %d개", #rows))
  local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -36), 64)
  local sel
  for i, st in ipairs(rows) do
    if st.uid == stoneSel then sel = st end
    M.tile(g, 64, { order = i, art = "i_stone", color = st.rev and Color3.fromRGB(160, 220, 255) or (st.hi == 1 and Color3.fromRGB(255, 200, 90) or Color3.fromRGB(150, 150, 170)), tl = st.rev and nil or "?", dim = not st.rev,
      selected = st.uid == stoneSel, click = function() stoneSel = st.uid; M.stones() end })
  end
  local D = box(A, UDim2.new(1, -292, 0, 0), UDim2.new(0, 292, 1, 0), "돌 정보")
  if not sel then txt(D, "돌을 누르세요. 확인하지 않은 돌(?)은 먼저 확인해야 옵션이 정해지고, 확인된 돌은 장비의 빈 소켓에 끼울 수 있습니다.", 13, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 90), Color3.fromRGB(190, 185, 210)); return end
  local function res(e) if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.stones() end
  if not sel.rev then
    txt(D, sel.hi == 1 and "계시의 돌 (확인 전)" or "미확인의 돌", 17, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 24), Color3.fromRGB(255, 225, 140), M.FONT)
    local b = M.btn(D, "확인하기", UDim2.new(0, 150, 0, 42), M.BTN.green, function() local e = C.rpc:InvokeServer("reveal", sel.uid); if e.ok then C.toast("확인: " .. tostring(e.label)) end; res(e) end); b.Position = UDim2.new(0, 12, 0, 74)
    return
  end
  txt(D, tostring(sel.label or "확인된 돌"), 17, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 44), Color3.fromRGB(160, 220, 255), M.FONT)
  txt(D, "끼울 장비의 빈 소켓:", 14, UDim2.new(0, 12, 0, 86), UDim2.new(1, -24, 0, 20), Color3.fromRGB(255, 225, 140), M.FONT)
  local sc = mk("ScrollingFrame", { Position = UDim2.new(0, 10, 0, 110), Size = UDim2.new(1, -20, 1, -118), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, D)
  mk("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, sc)
  local any = false
  for _, it in ipairs(items) do
    for si, sk in ipairs(it.sockets or {}) do
      if not sk then
        any = true
        local b = M.btn(sc, string.format("%s · 소켓 %d", Items.SLOT_NAME[it.slot] or it.slot, si), UDim2.new(1, -8, 0, 36), M.BTN.blue, function() res(C.rpc:InvokeServer("socket", { item = it.uid, stone = sel.uid, idx = si })); stoneSel = nil end)
      end
    end
  end
  if not any then txt(sc, "빈 소켓이 있는 착용 장비가 없습니다.", 13, UDim2.new(), UDim2.new(1, -8, 0, 40), Color3.fromRGB(190, 185, 210)) end
end

-- ───────── 스킬 상점 ─────────
local shopSel
function M.shop()
  C.clear()
  local r = C.rpc:InvokeServer("shop"); if r.summary then C.setSummary(r.summary) end
  if r.err then C.msg.Text = tostring(r.err); return end
  local rows = r.rows or {}; local s = C.summary() or {}
  local A = area(392)
  local B = box(A, UDim2.new(0, 0, 0, 0), UDim2.new(1, -300, 1, 0), string.format("판매 중인 스킬 %d개", #rows))
  local g = grid(B, UDim2.new(0, 6, 0, 30), UDim2.new(1, -12, 1, -36), 84)
  local sel
  for i, row in ipairs(rows) do
    if row.id == shopSel then sel = row end
    local col, icon = M.skStyle(row.id)
    M.tile(g, 84, { order = i, color = col, emoji = icon, label = row.name, br = n(row.price), selected = row.id == shopSel, click = function() shopSel = row.id; M.shop() end })
  end
  local D = box(A, UDim2.new(1, -292, 0, 0), UDim2.new(0, 292, 1, 0), "스킬 정보")
  if not sel then txt(D, "스킬을 눌러 설명을 보고 골드로 구매하세요. 산 스킬은 [스킬 정비소]에서 장착합니다.", 13, UDim2.new(0, 12, 0, 36), UDim2.new(1, -24, 0, 80), Color3.fromRGB(190, 185, 210)); return end
  local col = M.skStyle(sel.id); local d = SK_BY[sel.id] or {}
  txt(D, sel.name, 19, UDim2.new(0, 12, 0, 34), UDim2.new(1, -24, 0, 26), col, M.FONT)
  local info = {}
  if sel.slot == "basic" then info[#info + 1] = "기본 공격" end
  if d.cd then info[#info + 1] = string.format("쿨타임 %.1f초", d.cd) end
  txt(D, table.concat(info, " · "), 13, UDim2.new(0, 12, 0, 62), UDim2.new(1, -24, 0, 18), Color3.fromRGB(200, 195, 225))
  txt(D, sel.desc or "", 14, UDim2.new(0, 12, 0, 86), UDim2.new(1, -24, 0, 160), Color3.fromRGB(235, 230, 250))
  cost(D, { { "i_gold", sel.price, (s.gold or 0) >= sel.price and Color3.new(1, 1, 1) or Color3.fromRGB(255, 120, 120) } }, UDim2.new(0, 12, 1, -92))
  local b = M.btn(D, "구매", UDim2.new(1, -24, 0, 44), M.BTN.blue, function()
    local e = C.rpc:InvokeServer("buy", sel.id); if e.summary then C.setSummary(e.summary) end
    if e.ok then C.toast(string.format("%s 구매!", sel.name)) else C.msg.Text = tostring(e.err) end; M.shop()
  end); b.Position = UDim2.new(0, 12, 1, -56)
end

-- ───────── 퀘스트 · 일일 ─────────
function M.quests()
  C.clear()
  local r = C.rpc:InvokeServer("quests"); if r.err then C.msg.Text = tostring(r.err); return end
  for _, q in ipairs(r.rows or {}) do
    local ready, done = q.state == "done", q.state == "claimed"
    rowCard({ emoji = done and "✓" or "📜", color = ready and M.GOLD or (done and Color3.fromRGB(110, 200, 130) or Color3.fromRGB(150, 140, 190)), title = string.format("%s (%d/%d)", q.title, math.min(q.p, q.n), q.n), desc = q.desc, frac = q.n > 0 and q.p / q.n or 0, ready = ready, done = done,
      btn = done and "완료" or (ready and "보상 받기" or "진행 중"), btnColor = ready and M.BTN.green or M.BTN.gray,
      click = ready and function() local e = C.rpc:InvokeServer("questclaim", q.id); if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.quests() end or nil })
  end
end
function M.daily()
  C.clear()
  local o = C.rpc:InvokeServer("offline"); if o.summary then C.setSummary(o.summary) end
  if o.r then rowCard({ emoji = "💤", title = "오프라인 보상", desc = string.format("%d분 동안 자리를 비웠습니다: 골드 %s · 강화석 %s", o.r.mins, n(o.r.gold), n(o.r.ore)), color = Color3.fromRGB(140, 200, 255), done = true }) end
  local r = C.rpc:InvokeServer("daily"); if r.err then C.msg.Text = tostring(r.err); return end
  for _, t in ipairs(r.rows or {}) do
    local ready = t.p >= t.n and not t.claimed
    rowCard({ emoji = t.claimed and "✓" or "📅", color = ready and M.GOLD or Color3.fromRGB(150, 140, 190), title = string.format("%s (%d/%d)", t.name, t.p, t.n), desc = "보상: " .. tostring(t.text), frac = t.n > 0 and t.p / t.n or 0, ready = ready, done = t.claimed,
      btn = t.claimed and "수령 완료" or (ready and "받기" or "진행 중"), btnColor = ready and M.BTN.green or M.BTN.gray,
      click = ready and function() local e = C.rpc:InvokeServer("dailyclaim", t.id); if e.summary then C.setSummary(e.summary) end; C.msg.Text = tostring(e.err or ""); M.daily() end or nil })
  end
  -- 일괄 정리 (강화·사탄 장비 제외)
  local f = rowCard({ emoji = "🧹", title = "장비 일괄 정리", desc = "강화했거나 사탄 장비는 건드리지 않습니다.", color = Color3.fromRGB(150, 140, 190), h = 112 })
  local bar = mk("Frame", { Position = UDim2.new(0, 72, 1, -48), Size = UDim2.new(1, -84, 0, 40), BackgroundTransparency = 1 }, f)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, bar)
  local function bulk(rr, mode) local e = C.rpc:InvokeServer("bulk", { r = rr, mode = mode }); if e.summary then C.setSummary(e.summary) end; C.msg.Text = e.res and (mode == "sell" and string.format("%d개 판매", e.res.n) or string.format("%d개 분해", e.res.n)) or tostring(e.err); M.daily() end
  M.btn(bar, "일반 분해", UDim2.new(0, 120, 1, 0), M.BTN.red, function() bulk(0, "dismantle") end).LayoutOrder = 1
  M.btn(bar, "매직까지 분해", UDim2.new(0, 140, 1, 0), M.BTN.red, function() bulk(1, "dismantle") end).LayoutOrder = 2
  M.btn(bar, "매직까지 판매", UDim2.new(0, 140, 1, 0), M.BTN.gold, function() bulk(1, "sell") end).LayoutOrder = 3
end

return M
