-- 길드 화면 (Menus 에서 분리: 스크립트 길이 한도). Menus 가 require(GuildUI)(M, 도우미) 로 붙인다
return function(M, h)
local mk, corner, stroke, txt, area, box, pbar, n = h.mk, h.corner, h.stroke, h.txt, h.area, h.box, h.pbar, h.n
local C = setmetatable({}, { __index = function(_, k) return h.C()[k] end })
-- ───────── 길드 (v2): 길드가 없으면 찾기 · 초대 · 창설 / 있으면 홈 · 길드원 · 콘텐츠 · 연구 · 상점 · 관리 ─────────
local G_SYM = { "⚔️", "👑", "☠️", "⭐", "🌙", "🐺", "❖", "🔥" }   -- Roblox 가 그려 주는 기호만 (♛ ✦ 같은 기호는 빈칸으로 나온다)
local G_COL = { Color3.fromRGB(170, 40, 40), Color3.fromRGB(190, 120, 30), Color3.fromRGB(200, 170, 60), Color3.fromRGB(50, 130, 70), Color3.fromRGB(40, 110, 170), Color3.fromRGB(110, 60, 170), Color3.fromRGB(150, 150, 160), Color3.fromRGB(40, 36, 44) }
function M.emblem(parent, e, size)   -- 길드 문양: 색 방패 + 금테 + 문양
  e = e or { s = 1, c = 1 }
  local col = G_COL[e.c] or G_COL[1]
  local f = mk("Frame", { Size = UDim2.new(0, size, 0, size), BackgroundColor3 = Color3.new(1, 1, 1) }, parent); corner(f, math.floor(size * 0.22))
  mk("UIGradient", { Rotation = 90, Color = ColorSequence.new(col:Lerp(Color3.new(1, 1, 1), 0.25), col:Lerp(Color3.new(0, 0, 0), 0.45)) }, f)
  mk("UIStroke", { Color = Color3.fromRGB(225, 180, 90), Thickness = math.max(1.5, size / 24) }, f)
  local t = mk("TextLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, Text = G_SYM[e.s] or G_SYM[1], TextScaled = true, Font = Enum.Font.GothamBold, TextColor3 = Color3.fromRGB(255, 240, 210) }, f)
  t:SetAttribute("NoTr", true); mk("UIStroke", { Thickness = 1.5, Color = Color3.new(0, 0, 0) }, t); mk("UIPadding", { PaddingTop = UDim.new(0.15, 0), PaddingBottom = UDim.new(0.15, 0) }, t)
  return f
end
local gTab, gNoTab, gSort, gQuery = "home", "find", "lv", ""
local gDraft = { name = "", emblem = { s = 1, c = 1 }, desc = "", join = "open", minLv = 1 }
local ROLE = { leader = "Leader", officer = "Officer", member = "Members" }
local ROLE_COL = { leader = Color3.fromRGB(255, 205, 90), officer = Color3.fromRGB(150, 200, 255), member = Color3.fromRGB(200, 190, 175) }
local function gcall(action, arg, after)
  local e = C.rpc:InvokeServer(action, arg); if e.summary then C.setSummary(e.summary) end
  C.msg.Text = tostring(e.err or e.msg or ""); if after then after(e) end; M.guild(); return e
end
local function subTabs(parent, list, cur, onPick)
  local bar = mk("Frame", { Size = UDim2.new(1, 0, 0, 34), BackgroundTransparency = 1 }, parent)
  mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Center, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, bar)
  for i, t in ipairs(list) do local b = M.btn(bar, t[2], UDim2.new(0, 112, 1, 0), cur == t[1] and M.BTN.gold or M.BTN.gray, function() onPick(t[1]) end); b.LayoutOrder = i; b.TextSize = 14 end
  return bar
end
local function input(parent, pos, size, text, ph, onDone)
  local tb = mk("TextBox", { Position = pos, Size = size, BackgroundColor3 = Color3.fromRGB(14, 10, 9), Text = text or "", PlaceholderText = ph or "", ClearTextOnFocus = false, TextColor3 = Color3.new(1, 1, 1),
    PlaceholderColor3 = Color3.fromRGB(130, 120, 110), Font = M.FONT, TextSize = 15, TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = true }, parent)
  corner(tb, 6); stroke(tb, Color3.fromRGB(120, 92, 48), 1.2); mk("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }, tb)
  if onDone then tb.FocusLost:Connect(function() onDone(tb.Text) end) end
  return tb
end
local function scrollList(parent, pos, size)
  local sc = mk("ScrollingFrame", { Position = pos, Size = size, BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, parent)
  mk("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, sc); return sc
end
local function row(parent, h, order)
  local f = mk("Frame", { Size = UDim2.new(1, -8, 0, h), BackgroundColor3 = Color3.new(1, 1, 1), LayoutOrder = order or 0 }, parent); corner(f, 8)
  mk("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.fromRGB(36, 26, 22), Color3.fromRGB(20, 14, 12)) }, f); stroke(f, Color3.fromRGB(100, 76, 42), 1.2)
  return f
end
-- 길드가 없을 때
local function guildNone(v)
  local A = area(392)
  local nInv = #(v.invites or {})
  subTabs(A, { { "find", "Find Guild" }, { "inv", nInv > 0 and string.format("Invites (%d)", nInv) or "Invites" }, { "make", "Create Guild" } }, gNoTab, function(k) gNoTab = k; M.guild() end)
  local B = box(A, UDim2.new(0, 0, 0, 42), UDim2.new(1, 0, 1, -42))
  if gNoTab == "find" then
    local q = input(B, UDim2.new(0, 12, 0, 10), UDim2.new(0, 260, 0, 32), gQuery, "Search guild name", function(t) gQuery = t; M.guild() end)
    local sb = mk("Frame", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -12, 0, 10), Size = UDim2.new(0, 330, 0, 32), BackgroundTransparency = 1 }, B)
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, sb)
    for i, s in ipairs({ { "lv", "Level" }, { "power", "By Power" }, { "members", "By Members" } }) do local b = M.btn(sb, s[2], UDim2.new(0, 104, 1, 0), gSort == s[1] and M.BTN.gold or M.BTN.gray, function() gSort = s[1]; M.guild() end); b.LayoutOrder = i; b.TextSize = 13 end
    local sc = scrollList(B, UDim2.new(0, 10, 0, 52), UDim2.new(1, -20, 1, -60))
    local list = C.rpc:InvokeServer("g_search", { q = gQuery, sort = gSort }).list or {}
    if #list == 0 then txt(sc, gQuery ~= "" and "No results." or "No guilds yet. Create the first one in [Create Guild]!", 14, UDim2.new(), UDim2.new(1, 0, 0, 30), Color3.fromRGB(200, 185, 165)) end
    for i, g in ipairs(list) do
      local f = row(sc, 70, i)
      local rk = txt(f, "#" .. g.rank, 16, UDim2.new(0, 10, 0, 0), UDim2.new(0, 40, 1, 0), g.rank <= 3 and Color3.fromRGB(255, 210, 100) or Color3.fromRGB(180, 170, 150), M.FONT); rk.TextYAlignment = Enum.TextYAlignment.Center; rk:SetAttribute("NoTr", true)
      local em = M.emblem(f, g.emblem, 50); em.Position = UDim2.new(0, 52, 0.5, -25)
      local nm = txt(f, string.format("%s  Lv %d", g.name, g.lv), 17, UDim2.new(0, 112, 0, 8), UDim2.new(0.5, -112, 0, 22), Color3.fromRGB(255, 225, 160), M.FONT); nm:SetAttribute("NoTr", true)
      local ds = txt(f, g.desc ~= "" and g.desc or "No intro", 12, UDim2.new(0, 112, 0, 32), UDim2.new(0.5, -112, 0, 30), Color3.fromRGB(190, 180, 165)); ds.TextWrapped = true; ds.TextTruncate = Enum.TextTruncate.AtEnd
      if g.desc ~= "" then ds:SetAttribute("NoTr", true) end
      txt(f, string.format("Members %d / %d   ·   Power %s\n%s   ·   Lv %d+", g.members, 30, n(g.power), (v.joinTypes or {})[g.join] or g.join, g.minLv), 13, UDim2.new(0.5, 0, 0, 12), UDim2.new(0.5, -150, 0, 44), Color3.fromRGB(215, 205, 190)).TextWrapped = true
      local b = M.btn(f, g.join == "apply" and "Apply" or (g.join == "closed" and "Invite Only" or "Join"), UDim2.new(0, 120, 0, 38), g.join == "closed" and M.BTN.gray or M.BTN.green, function() if g.join ~= "closed" then gcall("g_join", g.id) end end)
      b.AnchorPoint = Vector2.new(1, 0.5); b.Position = UDim2.new(1, -12, 0.5, 0)
    end
  elseif gNoTab == "inv" then
    local sc = scrollList(B, UDim2.new(0, 10, 0, 10), UDim2.new(1, -20, 1, -20))
    if nInv == 0 then txt(sc, "No invites. When a guild leader or officer invites you by name, it shows up here.", 14, UDim2.new(), UDim2.new(1, 0, 0, 40), Color3.fromRGB(200, 185, 165)).TextWrapped = true end
    for i, x in ipairs(v.invites or {}) do
      local f = row(sc, 64, i)
      local em = M.emblem(f, x.emblem, 46); em.Position = UDim2.new(0, 10, 0.5, -23)
      local nm = txt(f, string.format("%s  Lv %d  ·  %d members", x.name, x.lv, x.members), 17, UDim2.new(0, 68, 0, 10), UDim2.new(0.6, 0, 0, 22), Color3.fromRGB(255, 225, 160), M.FONT); nm:SetAttribute("NoTr", true)
      txt(f, tostring(x.from) .. "'s invite", 13, UDim2.new(0, 68, 0, 34), UDim2.new(0.6, 0, 0, 18), Color3.fromRGB(200, 190, 175))
      local a = M.btn(f, "Accept", UDim2.new(0, 90, 0, 36), M.BTN.green, function() gcall("g_inv", { id = x.id, ok = true }) end); a.AnchorPoint = Vector2.new(1, 0.5); a.Position = UDim2.new(1, -110, 0.5, 0)
      local d = M.btn(f, "Decline", UDim2.new(0, 90, 0, 36), M.BTN.gray, function() gcall("g_inv", { id = x.id, ok = false }) end); d.AnchorPoint = Vector2.new(1, 0.5); d.Position = UDim2.new(1, -12, 0.5, 0)
    end
  else   -- 창설: 이름 · 문양(문양 8 × 색 8) · 소개 · 가입 방식 · 최소 레벨 · 미리 보기
    local L = mk("Frame", { Position = UDim2.new(0, 14, 0, 12), Size = UDim2.new(0.55, -20, 1, -24), BackgroundTransparency = 1 }, B)
    txt(L, "Guild Name (2~12 characters)", 13, UDim2.new(), UDim2.new(1, 0, 0, 16), Color3.fromRGB(220, 200, 160), M.FONT)
    input(L, UDim2.new(0, 0, 0, 18), UDim2.new(1, 0, 0, 32), gDraft.name, "Name", function(t) gDraft.name = t; M.guild() end)
    txt(L, "Emblem", 13, UDim2.new(0, 0, 0, 58), UDim2.new(1, 0, 0, 16), Color3.fromRGB(220, 200, 160), M.FONT)
    local sg = mk("Frame", { Position = UDim2.new(0, 0, 0, 76), Size = UDim2.new(1, 0, 0, 36), BackgroundTransparency = 1 }, L)
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 5), SortOrder = Enum.SortOrder.LayoutOrder }, sg)
    for i = 1, #G_SYM do local e = M.emblem(sg, { s = i, c = gDraft.emblem.c }, 34); e.LayoutOrder = i; if i == gDraft.emblem.s then e:FindFirstChildOfClass("UIStroke").Thickness = 3; e:FindFirstChildOfClass("UIStroke").Color = Color3.new(1, 1, 1) end
      local hit = mk("TextButton", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, Text = "" }, e); hit.MouseButton1Click:Connect(function() gDraft.emblem.s = i; M.guild() end) end
    txt(L, "Color", 13, UDim2.new(0, 0, 0, 118), UDim2.new(1, 0, 0, 16), Color3.fromRGB(220, 200, 160), M.FONT)
    local cg = mk("Frame", { Position = UDim2.new(0, 0, 0, 136), Size = UDim2.new(1, 0, 0, 28), BackgroundTransparency = 1 }, L)
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 5), SortOrder = Enum.SortOrder.LayoutOrder }, cg)
    for i, c in ipairs(G_COL) do local b = mk("TextButton", { Size = UDim2.new(0, 34, 1, 0), BackgroundColor3 = c, Text = "", AutoButtonColor = false, LayoutOrder = i }, cg); corner(b, 6)
      stroke(b, i == gDraft.emblem.c and Color3.new(1, 1, 1) or Color3.fromRGB(60, 50, 40), i == gDraft.emblem.c and 3 or 1.5); b.MouseButton1Click:Connect(function() gDraft.emblem.c = i; M.guild() end) end
    txt(L, "Intro (60 chars)", 13, UDim2.new(0, 0, 0, 172), UDim2.new(1, 0, 0, 16), Color3.fromRGB(220, 200, 160), M.FONT)
    input(L, UDim2.new(0, 0, 0, 190), UDim2.new(1, 0, 0, 52), gDraft.desc, "e.g. Daily rift runs together! Beginners welcome", function(t) gDraft.desc = t end)
    txt(L, "Join Type", 13, UDim2.new(0, 0, 0, 250), UDim2.new(0.5, 0, 0, 16), Color3.fromRGB(220, 200, 160), M.FONT)
    local jb = mk("Frame", { Position = UDim2.new(0, 0, 0, 268), Size = UDim2.new(1, 0, 0, 32), BackgroundTransparency = 1 }, L)
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, jb)
    for i, j in ipairs({ "open", "apply", "closed" }) do local b = M.btn(jb, (v.joinTypes or {})[j] or j, UDim2.new(0.333, -3, 1, 0), gDraft.join == j and M.BTN.gold or M.BTN.gray, function() gDraft.join = j; M.guild() end); b.LayoutOrder = i; b.TextSize = 13 end
    txt(L, string.format("Min Level  %d", gDraft.minLv), 13, UDim2.new(0, 0, 0, 308), UDim2.new(0.5, 0, 0, 28), Color3.fromRGB(220, 200, 160), M.FONT).TextYAlignment = Enum.TextYAlignment.Center
    for i, d in ipairs({ { -10, "−10" }, { -1, "−1" }, { 1, "+1" }, { 10, "+10" } }) do local b = M.btn(L, d[2], UDim2.new(0, 46, 0, 28), M.BTN.gray, function() gDraft.minLv = math.clamp(gDraft.minLv + d[1], 1, 100); M.guild() end); b.Position = UDim2.new(0.5, (i - 1) * 50 - 40, 0, 308); b.TextSize = 13 end
    -- 오른쪽: 미리 보기 + 창설
    local R = mk("Frame", { Position = UDim2.new(0.55, 0, 0, 12), Size = UDim2.new(0.45, -14, 1, -24), BackgroundColor3 = Color3.fromRGB(14, 10, 9), BackgroundTransparency = 0.3 }, B); corner(R, 10)
    local em = M.emblem(R, gDraft.emblem, 110); em.AnchorPoint = Vector2.new(0.5, 0); em.Position = UDim2.new(0.5, 0, 0, 24)
    local pn = txt(R, gDraft.name ~= "" and gDraft.name or "Guild Name", 24, UDim2.new(0, 10, 0, 144), UDim2.new(1, -20, 0, 30), Color3.fromRGB(255, 225, 160), M.FONT, Enum.TextXAlignment.Center); pn:SetAttribute("NoTr", gDraft.name ~= "")
    local pd = txt(R, gDraft.desc ~= "" and gDraft.desc or "", 13, UDim2.new(0, 16, 0, 178), UDim2.new(1, -32, 0, 50), Color3.fromRGB(200, 190, 175), nil, Enum.TextXAlignment.Center); pd.TextWrapped = true; pd:SetAttribute("NoTr", true)
    local s = C.summary() or {}
    local ok = (s.gold or 0) >= (v.createCost or 0)
    local b = M.btn(R, string.format("Create  (gold %s)", n(v.createCost or 0)), UDim2.new(1, -40, 0, 46), ok and M.BTN.green or M.BTN.gray, function()
      if not ok then C.msg.Text = "Not enough Gold"; return end
      gcall("g_create", { name = gDraft.name, emblem = gDraft.emblem, desc = gDraft.desc, join = gDraft.join, minLv = gDraft.minLv }, function(e) if not e.err then gTab = "home" end end)
    end); b.AnchorPoint = Vector2.new(0.5, 1); b.Position = UDim2.new(0.5, 0, 1, -16)
  end
end
-- 길드가 있을 때
local function guildHome(v)
  local A = area(392)
  local manage = v.role == "leader" or v.role == "officer"
  local tabs = { { "home", "Home" }, { "members", "Members" }, { "content", "Content" }, { "research", "Research" }, { "shop", "Shop" } }
  if manage then tabs[#tabs + 1] = { "manage", #(v.apps or {}) > 0 and string.format("Manage (%d)", #v.apps) or "Manage" } end
  subTabs(A, tabs, gTab, function(k) gTab = k; M.guild() end)
  local B = box(A, UDim2.new(0, 0, 0, 42), UDim2.new(1, 0, 1, -42))
  local s = C.summary() or {}
  if gTab == "home" then
    -- 왼쪽: 문양 · 이름 · 레벨 · 기여도 막대 · 순위
    local L = mk("Frame", { Position = UDim2.new(0, 12, 0, 12), Size = UDim2.new(0.42, -18, 1, -24), BackgroundColor3 = Color3.fromRGB(14, 10, 9), BackgroundTransparency = 0.3 }, B); corner(L, 10)
    local em = M.emblem(L, v.emblem, 100); em.AnchorPoint = Vector2.new(0.5, 0); em.Position = UDim2.new(0.5, 0, 0, 16)
    local nm = txt(L, v.name, 24, UDim2.new(0, 10, 0, 122), UDim2.new(1, -20, 0, 30), Color3.fromRGB(255, 225, 160), M.FONT, Enum.TextXAlignment.Center); nm:SetAttribute("NoTr", true); mk("UIStroke", { Thickness = 2, Color = Color3.new(0, 0, 0) }, nm)
    txt(L, string.format("Guild Level %d   ·   Rank #%s", v.lv, tostring(v.rank or "-")), 15, UDim2.new(0, 10, 0, 154), UDim2.new(1, -20, 0, 20), Color3.fromRGB(230, 210, 170), M.FONT, Enum.TextXAlignment.Center)
    local frac = (v.expNext > v.expCur) and (v.exp - v.expCur) / (v.expNext - v.expCur) or 1
    pbar(L, UDim2.new(0, 20, 0, 182), UDim2.new(1, -40, 0, 14), frac, Color3.fromRGB(230, 170, 60))
    txt(L, string.format("Contribution %s / %s", n(v.exp), n(v.expNext)), 12, UDim2.new(0, 20, 0, 198), UDim2.new(1, -40, 0, 16), Color3.fromRGB(200, 185, 160), nil, Enum.TextXAlignment.Center)
    local st = { { "Members", string.format("%d / %d", v.count, v.max) }, { "Guild Power", n(v.power) }, { "Guild Coins", n(v.coins) }, { "My Role", ROLE[v.role] or "" } }
    for i, kv in ipairs(st) do
      local y = 222 + (i - 1) * 24
      txt(L, kv[1], 13, UDim2.new(0, 22, 0, y), UDim2.new(0.5, -22, 0, 20), Color3.fromRGB(190, 175, 155))
      local vl = txt(L, kv[2], 14, UDim2.new(0.5, 0, 0, y), UDim2.new(0.5, -22, 0, 20), Color3.new(1, 1, 1), M.FONT, Enum.TextXAlignment.Right); vl:SetAttribute("NoTr", i < 4)
    end
    -- 오른쪽: 공지 · 소개 · 기부 · 레벨 효과
    local R = mk("Frame", { Position = UDim2.new(0.42, 0, 0, 12), Size = UDim2.new(0.58, -12, 1, -24), BackgroundTransparency = 1 }, B)
    local nb = row(R, 70, 0); nb.Size = UDim2.new(1, 0, 0, 70)
    txt(nb, "📜 Notice", 14, UDim2.new(0, 12, 0, 6), UDim2.new(1, -24, 0, 18), Color3.fromRGB(255, 210, 120), M.FONT)
    local mt = txt(nb, v.motd ~= "" and v.motd or "No notice", 13, UDim2.new(0, 12, 0, 26), UDim2.new(1, -24, 0, 40), Color3.fromRGB(225, 215, 200)); mt.TextWrapped = true; mt:SetAttribute("NoTr", v.motd ~= "")
    local db = row(R, 96, 0); db.Position = UDim2.new(0, 0, 0, 78); db.Size = UDim2.new(1, 0, 0, 96)
    txt(db, "💰 Gold Donation  ·  up to 100K gold per day · 1,000 gold = 20 contribution + 1 guild coin", 13, UDim2.new(0, 12, 0, 8), UDim2.new(1, -24, 0, 18), Color3.fromRGB(255, 210, 120), M.FONT)
    local dr = mk("Frame", { Position = UDim2.new(0, 12, 0, 40), Size = UDim2.new(1, -24, 0, 40), BackgroundTransparency = 1 }, db)
    mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, dr)
    for i, amt in ipairs({ 10000, 50000, 100000 }) do local b = M.btn(dr, n(amt) .. " Donate", UDim2.new(0.333, -4, 1, 0), (s.gold or 0) >= amt and M.BTN.gold or M.BTN.gray, function() gcall("g_donate", amt) end); b.LayoutOrder = i end
    local fx = row(R, 110, 0); fx.Position = UDim2.new(0, 0, 0, 182); fx.Size = UDim2.new(1, 0, 1, -182)
    txt(fx, "✨ Guild Effects (all members)", 14, UDim2.new(0, 12, 0, 6), UDim2.new(1, -24, 0, 18), Color3.fromRGB(255, 210, 120), M.FONT)
    local lines = {}
    for _, gp in ipairs(require(script.Parent.Data.Config).GUILD_PASSIVES or {}) do lines[#lines + 1] = (v.lv >= gp.lv and "✔ " or "🔒 ") .. string.format("Lv %d  %s", gp.lv, require(script.Parent.Lang).tr(gp.text)) end   -- 효과 글을 따로 번역 (합친 줄은 사전에 없다)
    local ef = txt(fx, table.concat(lines, "\n"), 12, UDim2.new(0, 14, 0, 28), UDim2.new(1, -28, 1, -32), Color3.fromRGB(215, 205, 190)); ef.TextWrapped = true; ef.TextYAlignment = Enum.TextYAlignment.Top
  elseif gTab == "members" then
    if manage then
      local inv = input(B, UDim2.new(0, 12, 0, 10), UDim2.new(0, 260, 0, 32), "", "Player name to invite")
      local ib = M.btn(B, "Invite", UDim2.new(0, 90, 0, 32), M.BTN.green, function() if inv.Text ~= "" then gcall("g_invite", inv.Text) end end); ib.Position = UDim2.new(0, 280, 0, 10)
    end
    txt(B, string.format("Members %d / %d", v.count, v.max), 14, UDim2.new(1, -220, 0, 16), UDim2.new(0, 200, 0, 20), Color3.fromRGB(230, 210, 170), M.FONT, Enum.TextXAlignment.Right)
    local sc = scrollList(B, UDim2.new(0, 10, 0, 52), UDim2.new(1, -20, 1, -60))
    for i, m in ipairs(v.members) do
      local f = row(sc, 46, i)
      local rb = mk("TextLabel", { Position = UDim2.new(0, 10, 0.5, -11), Size = UDim2.new(0, 76, 0, 22), BackgroundColor3 = Color3.fromRGB(10, 8, 6), Text = ROLE[m.role], Font = M.FONT, TextSize = 12, TextColor3 = ROLE_COL[m.role] }, f); corner(rb, 11)
      local nm = txt(f, m.name .. (m.me and (require(script.Parent.Lang).lang == "en" and "  (me)" or "  (나)") or ""), 15, UDim2.new(0, 96, 0, 0), UDim2.new(0.3, 0, 1, 0), Color3.new(1, 1, 1), M.FONT); nm.TextYAlignment = Enum.TextYAlignment.Center; nm:SetAttribute("NoTr", true)
      local pw = txt(f, "Power " .. n(m.power), 13, UDim2.new(0.42, 0, 0, 0), UDim2.new(0.18, 0, 1, 0), Color3.fromRGB(255, 205, 110), M.FONT); pw.TextYAlignment = Enum.TextYAlignment.Center
      local ct = txt(f, "Contribution " .. n(m.contrib), 13, UDim2.new(0.6, 0, 0, 0), UDim2.new(0.16, 0, 1, 0), Color3.fromRGB(190, 220, 170), M.FONT); ct.TextYAlignment = Enum.TextYAlignment.Center
      if v.role == "leader" and not m.me then
        local acts = mk("Frame", { AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -8, 0.5, 0), Size = UDim2.new(0, 200, 0, 30), BackgroundTransparency = 1 }, f)
        mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, acts)
        local up = m.role == "officer" and { "member", "Demote" } or { "officer", "Officer" }
        M.btn(acts, up[2], UDim2.new(0, 70, 1, 0), M.BTN.blue, function() gcall("g_role", { uid = m.uid, role = up[1] }) end).LayoutOrder = 1
        M.btn(acts, "Kick", UDim2.new(0, 56, 1, 0), M.BTN.red, function() C.prompt(m.name .. ": kick from the guild? Type 'kick'.", "Kick", function(t) if t == "Kick" or t:lower() == "kick" then gcall("g_role", { uid = m.uid, role = "kick" }) end end) end).LayoutOrder = 2
        M.btn(acts, "Transfer", UDim2.new(0, 56, 1, 0), M.BTN.gray, function() C.prompt(m.name .. ": transfer guild leadership? Type 'transfer'.", "Transfer", function(t) if t == "Transfer" or t:lower() == "transfer" then gcall("g_role", { uid = m.uid, role = "leader" }) end end) end).LayoutOrder = 3
      end
    end
  elseif gTab == "content" then
    local sc = scrollList(B, UDim2.new(0, 10, 0, 10), UDim2.new(1, -20, 1, -20))
    local f = row(sc, 150, 1)
    txt(f, "🎯 Weekly Guild Goals  ·  complete together for individual rewards + contribution", 15, UDim2.new(0, 14, 0, 8), UDim2.new(1, -170, 0, 20), Color3.fromRGB(255, 210, 120), M.FONT)
    for i, g in ipairs(v.goals) do
      local y = 36 + (i - 1) * 34
      txt(f, (g.id == "kill" and "Monster Kills" or (g.id == "boss" and "Boss Kills" or "Battle Clears")) .. (g.done and "  ✔" or ""), 13, UDim2.new(0, 14, 0, y), UDim2.new(0, 140, 0, 18), g.done and Color3.fromRGB(150, 230, 150) or Color3.fromRGB(220, 210, 195))
      pbar(f, UDim2.new(0, 160, 0, y + 2), UDim2.new(1, -400, 0, 12), g.goal > 0 and g.prog / g.goal or 0, g.done and Color3.fromRGB(240, 190, 70) or Color3.fromRGB(90, 200, 110))
      local pv = txt(f, string.format("%s / %s", n(g.prog), n(g.goal)), 12, UDim2.new(1, -232, 0, y), UDim2.new(0, 0, 0, 18), Color3.fromRGB(200, 190, 175)); pv.AutomaticSize = Enum.AutomaticSize.X; pv:SetAttribute("NoTr", true)
    end
    local anyDone = false; for _, g in ipairs(v.goals) do if g.done then anyDone = true end end   -- 달성한 목표가 없으면 회색
    local cb = M.btn(f, "Claim Reward", UDim2.new(0, 140, 0, 40), anyDone and M.BTN.green or M.BTN.gray, function() gcall("g_claim") end); cb.AnchorPoint = Vector2.new(1, 0); cb.Position = UDim2.new(1, -12, 0, 10)
    local b2 = row(sc, 190, 2)
    txt(b2, string.format("👹 Guild Boss  ·  max damage in 60s  ·  tries left this week %d  ·  guild total %s", v.bossTries, n(v.bossTotal)), 14, UDim2.new(0, 14, 0, 8), UDim2.new(1, -170, 0, 20), Color3.fromRGB(255, 210, 120), M.FONT)
    local rl = {}; for i, x in ipairs(v.bossRank) do if i <= 5 then rl[#rl + 1] = string.format(require(script.Parent.Lang).lang == "en" and "#%d  %s   %s" or "%d위  %s   %s", i, x.name, n(x.damage)) end end
    local rt = txt(b2, #rl > 0 and table.concat(rl, "\n") or "No records this week", 13, UDim2.new(0, 14, 0, 36), UDim2.new(1, -180, 1, -44), Color3.fromRGB(220, 210, 195)); rt.TextYAlignment = Enum.TextYAlignment.Top; rt:SetAttribute("NoTr", #rl > 0)
    local bb = M.btn(b2, "Challenge", UDim2.new(0, 140, 0, 40), v.bossTries > 0 and M.BTN.red or M.BTN.gray, function() gcall("g_boss") end); bb.AnchorPoint = Vector2.new(1, 0); bb.Position = UDim2.new(1, -12, 0, 10)
    local pb = M.btn(b2, "Last Week Rewards", UDim2.new(0, 140, 0, 36), M.BTN.gold, function() gcall("g_bossclaim") end); pb.AnchorPoint = Vector2.new(1, 0); pb.Position = UDim2.new(1, -12, 0, 58); pb.TextSize = 13
    txt(b2, "1st: 40 Enhance Stones · 3 Chaos Orbs / 2nd: 25 · 2 / 3rd: 15 · 1 / others: 8 Enhance Stones", 11, UDim2.new(1, -330, 1, -24), UDim2.new(0, 318, 0, 16), Color3.fromRGB(180, 170, 155), nil, Enum.TextXAlignment.Right)
  elseif gTab == "research" then
    txt(B, string.format("Guild Coins %s  ·  research can go up to guild level (%d)  ·  leader and officers only", n(v.coins), v.lv), 13, UDim2.new(0, 14, 0, 10), UDim2.new(1, -28, 0, 18), Color3.fromRGB(230, 210, 170), M.FONT)
    local g = mk("Frame", { Position = UDim2.new(0, 12, 0, 36), Size = UDim2.new(1, -24, 1, -44), BackgroundTransparency = 1 }, B)
    mk("UIGridLayout", { CellSize = UDim2.new(0.5, -6, 0.5, -6), CellPadding = UDim2.new(0, 12, 0, 12), SortOrder = Enum.SortOrder.LayoutOrder }, g)
    for i, r in ipairs(v.research or {}) do
      local f = row(g, 0, i)
      txt(f, string.format("%s  Lv %d / %d", r.name, r.lv, v.lv), 17, UDim2.new(0, 14, 0, 10), UDim2.new(1, -28, 0, 22), Color3.fromRGB(255, 220, 150), M.FONT)
      txt(f, "Now: " .. string.format(r.text, r.lv * r.per), 14, UDim2.new(0, 14, 0, 40), UDim2.new(1, -28, 0, 18), Color3.fromRGB(150, 230, 150))
      txt(f, "Next: " .. string.format(r.text, (r.lv + 1) * r.per), 13, UDim2.new(0, 14, 0, 62), UDim2.new(1, -28, 0, 18), Color3.fromRGB(200, 190, 175))
      local can = manage and r.lv < v.lv and v.coins >= r.cost
      local b = M.btn(f, r.lv >= v.lv and "Needs Guild Level" or string.format("Research  (coins %s)", n(r.cost)), UDim2.new(1, -28, 0, 36), can and M.BTN.purple or M.BTN.gray, function() if can then gcall("g_research", r.id) end end)
      b.AnchorPoint = Vector2.new(0.5, 1); b.Position = UDim2.new(0.5, 0, 1, -10)
    end
  elseif gTab == "shop" then
    txt(B, string.format("Guild Coins %s  ·  earned from goals and donations  ·  purchase limits reset weekly", n(v.coins)), 13, UDim2.new(0, 14, 0, 10), UDim2.new(1, -28, 0, 18), Color3.fromRGB(230, 210, 170), M.FONT)
    local g = mk("ScrollingFrame", { Position = UDim2.new(0, 12, 0, 36), Size = UDim2.new(1, -24, 1, -44), BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 5 }, B)
    mk("UIGridLayout", { CellSize = UDim2.new(0.333, -8, 0, 140), CellPadding = UDim2.new(0, 10, 0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, g)
    for i, it in ipairs(v.shop or {}) do
      local f = row(g, 0, i)
      local lock = v.lv < (it.lv or 1)
      local ia = it.icon and C.Sprites.art(it.icon); if ia then mk("ImageLabel", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 10), Size = UDim2.new(0, 48, 0, 48), BackgroundTransparency = 1, ImageContent = ia.content, ScaleType = Enum.ScaleType.Fit, ImageTransparency = lock and 0.6 or 0 }, f) end
      txt(f, it.name, 15, UDim2.new(0, 8, 0, 62), UDim2.new(1, -16, 0, 20), lock and Color3.fromRGB(140, 130, 120) or Color3.fromRGB(255, 225, 160), M.FONT, Enum.TextXAlignment.Center)
      txt(f, string.format("%d per week", it.weekly), 12, UDim2.new(0, 8, 0, 82), UDim2.new(1, -16, 0, 16), Color3.fromRGB(190, 180, 165), nil, Enum.TextXAlignment.Center)
      local b = M.btn(f, lock and string.format("Guild Lv %d", it.lv) or string.format("Coins %d", it.cost), UDim2.new(1, -20, 0, 32), (not lock and v.coins >= it.cost) and M.BTN.green or M.BTN.gray, function() if not lock then gcall("g_buy", it.id) end end)
      b.AnchorPoint = Vector2.new(0.5, 1); b.Position = UDim2.new(0.5, 0, 1, -8); b.TextSize = 14
    end
  elseif gTab == "manage" then
    local sc = scrollList(B, UDim2.new(0, 10, 0, 10), UDim2.new(1, -20, 1, -20))
    local ap = row(sc, 40 + math.max(1, #v.apps) * 44, 1)
    txt(ap, string.format("Applications: %d", #v.apps), 15, UDim2.new(0, 14, 0, 8), UDim2.new(1, -28, 0, 20), Color3.fromRGB(255, 210, 120), M.FONT)
    if #v.apps == 0 then txt(ap, "No applications.", 13, UDim2.new(0, 14, 0, 36), UDim2.new(1, -28, 0, 20), Color3.fromRGB(190, 180, 165)) end
    for i, a in ipairs(v.apps) do
      local y = 34 + (i - 1) * 44
      local nm = txt(ap, string.format("%s   Lv %d   Power %s", a.name, a.lv or 1, n(a.power or 0)), 14, UDim2.new(0, 14, 0, y + 8), UDim2.new(0.6, 0, 0, 20), Color3.new(1, 1, 1), M.FONT); nm:SetAttribute("NoTr", true)
      local ok = M.btn(ap, "Accept", UDim2.new(0, 80, 0, 34), M.BTN.green, function() gcall("g_app", { uid = a.uid, ok = true }) end); ok.Position = UDim2.new(1, -184, 0, y)
      local no = M.btn(ap, "Decline", UDim2.new(0, 80, 0, 34), M.BTN.gray, function() gcall("g_app", { uid = a.uid, ok = false }) end); no.Position = UDim2.new(1, -96, 0, y)
    end
    if v.role == "leader" then
      local st = row(sc, 300, 2)
      txt(st, "Guild Settings", 15, UDim2.new(0, 14, 0, 8), UDim2.new(1, -28, 0, 20), Color3.fromRGB(255, 210, 120), M.FONT)
      local set = { emblem = table.clone(v.emblem), desc = v.desc, join = v.join, minLv = v.minLv }
      local em = M.emblem(st, set.emblem, 64); em.Position = UDim2.new(0, 14, 0, 36)
      for i = 1, #G_SYM do   -- 문양 · 색을 바로 고른다 (창설 화면과 같은 칸)
        local e = M.emblem(st, { s = i, c = set.emblem.c }, 30); e.Position = UDim2.new(0, 90 + (i - 1) * 35, 0, 36)
        if i == set.emblem.s then e:FindFirstChildOfClass("UIStroke").Thickness = 3; e:FindFirstChildOfClass("UIStroke").Color = Color3.new(1, 1, 1) end
        mk("TextButton", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, Text = "" }, e).MouseButton1Click:Connect(function() set.emblem.s = i; gcall("g_set", set) end)
      end
      for i, c in ipairs(G_COL) do
        local b = mk("TextButton", { Position = UDim2.new(0, 90 + (i - 1) * 35, 0, 72), Size = UDim2.new(0, 30, 0, 26), BackgroundColor3 = c, Text = "", AutoButtonColor = false }, st); corner(b, 6)
        stroke(b, i == set.emblem.c and Color3.new(1, 1, 1) or Color3.fromRGB(60, 50, 40), i == set.emblem.c and 3 or 1.5); b.MouseButton1Click:Connect(function() set.emblem.c = i; gcall("g_set", set) end)
      end
      txt(st, "Intro", 13, UDim2.new(0, 14, 0, 110), UDim2.new(1, -28, 0, 16), Color3.fromRGB(220, 200, 160), M.FONT)
      input(st, UDim2.new(0, 14, 0, 128), UDim2.new(1, -28, 0, 40), set.desc, "Guild intro", function(t) if t ~= set.desc then set.desc = t; gcall("g_set", set) end end)
      txt(st, "Notice", 13, UDim2.new(0, 14, 0, 174), UDim2.new(1, -28, 0, 16), Color3.fromRGB(220, 200, 160), M.FONT)
      input(st, UDim2.new(0, 14, 0, 192), UDim2.new(1, -28, 0, 32), v.motd, "Notice shown to members", function(t) if t ~= v.motd then gcall("g_motd", t) end end)
      local jb = mk("Frame", { Position = UDim2.new(0, 14, 0, 236), Size = UDim2.new(0.6, 0, 0, 32), BackgroundTransparency = 1 }, st)
      mk("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, jb)
      for i, j in ipairs({ "open", "apply", "closed" }) do local b = M.btn(jb, (v.joinTypes or {})[j] or j, UDim2.new(0.333, -3, 1, 0), set.join == j and M.BTN.gold or M.BTN.gray, function() set.join = j; gcall("g_set", set) end); b.LayoutOrder = i; b.TextSize = 13 end
      local ml = txt(st, string.format("Min Level %d", set.minLv), 13, UDim2.new(0.62, 10, 0, 236), UDim2.new(0, 100, 0, 32), Color3.fromRGB(220, 200, 160), M.FONT); ml.TextYAlignment = Enum.TextYAlignment.Center
      for i, d in ipairs({ { -5, "−5" }, { 5, "+5" } }) do local b = M.btn(st, d[2], UDim2.new(0, 44, 0, 30), M.BTN.gray, function() set.minLv = math.clamp(set.minLv + d[1], 1, 100); gcall("g_set", set) end); b.Position = UDim2.new(0.62, 110 + (i - 1) * 48, 0, 237) end
    end
    local lv = row(sc, 56, 3)
    local lb = M.btn(lv, "Leave Guild", UDim2.new(0, 140, 0, 36), M.BTN.red, function() C.prompt("Really leave? Type 'leave'.", "Leave", function(t) if t == "Leave" or t:lower() == "leave" then gcall("g_leave") end end) end)
    lb.AnchorPoint = Vector2.new(1, 0.5); lb.Position = UDim2.new(1, -12, 0.5, 0)
    txt(lv, "If the leader leaves, the strongest member becomes leader.", 12, UDim2.new(0, 14, 0, 0), UDim2.new(1, -170, 1, 0), Color3.fromRGB(190, 180, 165)).TextYAlignment = Enum.TextYAlignment.Center
  end
  if gTab ~= "manage" then   -- 길드원은 관리 탭이 없으므로 탈퇴는 홈 아래에
    if not manage and gTab == "home" then
      local lb = M.btn(B, "Leave Guild", UDim2.new(0, 110, 0, 30), M.BTN.gray, function() C.prompt("Really leave? Type 'leave'.", "Leave", function(t) if t == "Leave" or t:lower() == "leave" then gcall("g_leave") end end) end)
      lb.AnchorPoint = Vector2.new(0, 1); lb.Position = UDim2.new(0, 22, 1, -18); lb.TextSize = 13
    end
  end
end
function M.guild()
  C.clear()
  local r = C.rpc:InvokeServer("g_view"); if r.summary then C.setSummary(r.summary) end
  local v = r.view; if not v then C.msg.Text = tostring(r.err or "Could not load guild info"); return end
  if v.none then guildNone(v) else guildHome(v) end
end


end
