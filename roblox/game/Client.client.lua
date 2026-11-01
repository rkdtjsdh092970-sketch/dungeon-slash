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
local root = Instance.new("Frame"); root.Size = UDim2.new(0, 600, 0, 640); root.Position = UDim2.new(0.5, -300, 0.5, -320); root.BackgroundColor3 = Color3.fromRGB(24, 20, 44); root.Parent = gui
Instance.new("UICorner", root).CornerRadius = UDim.new(0, 10)
local top = label(root, "불러오는 중…", 13, UDim2.new(0, 12, 0, 4), UDim2.new(1, -24, 0, 36))
local msg = label(root, "", 13, UDim2.new(0, 12, 0, 40), UDim2.new(1, -24, 0, 38))
local list = Instance.new("ScrollingFrame"); list.Position = UDim2.new(0, 12, 0, 178); list.Size = UDim2.new(1, -24, 1, -190); list.BackgroundColor3 = Color3.fromRGB(16, 14, 32)
list.CanvasSize = UDim2.new(0, 0, 0, 0); list.AutomaticCanvasSize = Enum.AutomaticSize.Y; list.Parent = root
Instance.new("UIListLayout", list).Padding = UDim.new(0, 4)
local ctl = Instance.new("Frame"); ctl.BackgroundTransparency = 1; ctl.Position = UDim2.new(0, 12, 0, 140); ctl.Size = UDim2.new(1, -24, 0, 34); ctl.Parent = root

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
      { "판매", function() local e = rpc:InvokeServer("sell", it.uid); setSummary(e.summary); views.inv() end },
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
  clear(); local r = rpc:InvokeServer("forge"); setSummary(r.summary)
  for _, row in ipairs(r.rows) do
    local f = Instance.new("Frame"); f.BackgroundColor3 = Color3.fromRGB(40, 34, 70); f.AutomaticSize = Enum.AutomaticSize.Y; f.Size = UDim2.new(1, -8, 0, 0); f.Parent = list
    Instance.new("UICorner", f).CornerRadius = UDim.new(0, 6)
    local lay = Instance.new("UIListLayout", f); lay.Padding = UDim.new(0, 3); Instance.new("UIPadding", f).PaddingBottom = UDim.new(0, 6)
    local t = label(f, string.format("%s  (강화 +%d)", row.title, row.enh), 14, UDim2.new(0, 8, 0, 0), UDim2.new(1, -16, 0, 20)); t.AutomaticSize = Enum.AutomaticSize.Y
    for i, a in ipairs(row.affixes) do
      local line = Instance.new("Frame"); line.BackgroundTransparency = 1; line.Size = UDim2.new(1, 0, 0, 24); line.Parent = f
      label(line, a.text, 12, UDim2.new(0, 10, 0, 0), UDim2.new(1, -120, 1, 0))
      button(line, a.locked and "잠김" or string.format("굴림 %dG/%d", row.rerollGold, row.rerollOre), UDim2.new(1, -112, 0, 0), UDim2.new(0, 104, 1, 0), function()
        local e = rpc:InvokeServer("reroll", { uid = row.uid, idx = i - 1 }); msg.Text = e.ok and "옵션을 다시 굴렸습니다" or tostring(e.err); setSummary(e.summary); views.forge()
      end, a.locked and Color3.fromRGB(60, 60, 60) or nil)
    end
    for i, sk in ipairs(row.sockets) do label(f, "◆ 소켓 " .. i .. ": " .. (sk or "비어 있음"), 12, UDim2.new(0, 10, 0, 0), UDim2.new(1, -16, 0, 18)) end
    local br = Instance.new("Frame"); br.BackgroundTransparency = 1; br.Size = UDim2.new(1, 0, 0, 30); br.Parent = f
    button(br, string.format("강화 %dG/%d", row.enhGold, row.enhOre), UDim2.new(0, 8, 0, 0), UDim2.new(0, 120, 1, 0), function() local e = rpc:InvokeServer("enhance", row.uid); msg.Text = tostring(e.msg or e.err); setSummary(e.summary); views.forge() end)
    button(br, "혼돈 구슬(옵션+)", UDim2.new(0, 134, 0, 0), UDim2.new(0, 130, 1, 0), function() local e = rpc:InvokeServer("chaos", row.uid); msg.Text = e.ok and "옵션이 하나 추가되었습니다" or tostring(e.err); setSummary(e.summary); views.forge() end)
    button(br, "신성한 구슬", UDim2.new(0, 270, 0, 0), UDim2.new(0, 110, 1, 0), function() local e = rpc:InvokeServer("divine", row.uid); msg.Text = e.ok and "수치를 다시 굴렸습니다" or tostring(e.err); setSummary(e.summary); views.forge() end)
  end
end
function views.stones()
  clear(); local r = rpc:InvokeServer("stones"); setSummary(r.summary)
  card("돌 보관함", { "확인하면 옵션이 정해지고, 장비 소켓에 끼울 수 있습니다. 장비 소켓은 [대장간] 탭에서 확인하세요." }, {})
  for _, st in ipairs(r.rows) do
    if not st.rev then card("미확인의 돌" .. (st.hi == 1 and " (계시)" or ""), {}, { { "확인", function() local e = rpc:InvokeServer("reveal", st.uid); msg.Text = e.ok and ("확인: " .. tostring(e.label)) or tostring(e.err); setSummary(e.summary); views.stones() end } })
    else
      local btns = {}
      for _, it in ipairs(r.items) do for si, sk in ipairs(it.sockets) do if not sk then btns[#btns + 1] = { string.sub(it.slot, 1, 4) .. si, function() local e = rpc:InvokeServer("socket", { item = it.uid, stone = st.uid, idx = si }); msg.Text = e.ok and "소켓에 끼웠습니다" or tostring(e.err); setSummary(e.summary); views.stones() end } end end end
      card(st.label or "확인된 돌", { #btns > 0 and "끼울 소켓을 고르세요 →" or "빈 소켓이 없습니다" }, { btns[1], btns[2] })
    end
  end
end
local function showResult(r)
  if r.err then msg.Text = r.err; return false end
  local x = r.result; setSummary(r.summary)
  local extra = {}
  if x.skills and #x.skills > 0 then extra[#extra + 1] = "스킬 " .. #x.skills .. "개" end
  if x.charms and #x.charms > 0 then extra[#extra + 1] = "참 " .. #x.charms .. "개" end
  if x.stones and x.stones > 0 then extra[#extra + 1] = "돌 " .. x.stones end
  if x.stonesHi then extra[#extra + 1] = "계시의 돌 1" end
  if x.sockTix then extra[#extra + 1] = "세공의 인장 1" end
  msg.Text = string.format("%s — %.0f초 · 처치 %d · 골드 +%d · 장비 %d개%s%s", x.win and "승리" or "패배", x.time, x.kills or 0, x.gold or 0, #(x.items or {}), #extra > 0 and (" · " .. table.concat(extra, " · ")) or "", (x.notes and x.notes[1]) and ("\n" .. x.notes[1]) or "")
  return true
end
function views.content()
  clear(); local u = rpc:InvokeServer("unlocks").u
  local function entry(title, lines, locked, btns) card(title .. (locked and "  [잠김]" or ""), lines, locked and {} or btns) end
  local function play(spec) return function() showResult(rpc:InvokeServer("play", spec)); views.content() end end
  entry("공허의 군주 모르가스", { "열쇠 1개 · 1~4단계 · 스킬 드랍", "열쇠 " .. u.keys }, not u.void, { { "1단계", play({ kind = "void", vsel = 1 }) }, { "2단계", play({ kind = "void", vsel = 2 }) } })
  entry("속성 보스 (화염 · 철갑 · 뇌제 · 서리 · 독니)", { "각 보스의 징표 1개 · 1단계", string.format("징표 불씨 %d · 철갑 %d · 뇌전 %d · 서리 %d · 맹독 %d", u.keys2, u.keys3, u.keys4, u.keys5, u.keys6) }, not u.bosses, { { "화염", play({ kind = "hive", vsel = 1 }) }, { "철갑", play({ kind = "titan", vsel = 1 }) } })
  entry("속성 보스 (이어서)", {}, not u.bosses, { { "뇌제", play({ kind = "storm", vsel = 1 }) }, { "서리", play({ kind = "frost", vsel = 1 }) } })
  entry("속성 보스 (이어서)", {}, not u.bosses, { { "독니", play({ kind = "poison", vsel = 1 }) } })
  entry("심연의 문 — 문지기 모르가스 (레이드)", { "처음 쓰러뜨리면 붉은 탑이 솟아오릅니다." }, not u.raid, { { "도전", play({ kind = "raid" }) } })
  entry("황금 보물고", { "골드 위주 (보석 없음)" }, not u.vault, { { "입장", play({ kind = "vault" }) } })
  entry("무한 균열", { "하루 3번 · 오래 버틸수록 보상" }, not u.endless, { { "입장", play({ kind = "endless" }) } })
  entry("돌의 신전", { "계시의 돌 · 세공의 인장 (문지기 처치 후)" }, not u.temple, { { "1단계", play({ kind = "temple", vsel = 1 }) }, { "2단계", play({ kind = "temple", vsel = 2 }) } })
  entry("레이드 던전 — 전직의 서", { "이지 · 노말 · 하드 최초 클리어마다 전직의 서" }, not u.craid, { { "이지", play({ kind = "craid", diff = 1 }) }, { "노말", play({ kind = "craid", diff = 2 }) }, { "하드", play({ kind = "craid", diff = 3 }) } })
  entry("참 던전", { "하드 레이드 + 3차 전직" }, not u.charm, { { "입장", play({ kind = "craid", diff = 3, charm = true }) } })
  entry("새 탑 (20층)", { "문지기 + 최종 전직 후" }, not u.tower2, { { "1층", function() showResult(rpc:InvokeServer("tower2", 1)) end }, { "다음", function() showResult(rpc:InvokeServer("tower2", 99)) end } })
end
function views.class()
  clear(); local r = rpc:InvokeServer("class"); setSummary(r.summary); local v = r.view
  card(string.format("전직 %d차 · 포인트 %d / %d · 전직의 서 %d/%d/%d", v.cls, v.left, v.points, v.books[1], v.books[2], v.books[3]), { "노드를 눌러 찍고, 다시 누르면 해제합니다 (후속 노드가 있으면 불가)." }, {
    { "전직", function() local e = rpc:InvokeServer("classadvance"); msg.Text = tostring(e.msg or ""); views.class() end },
    { "초기화", function() rpc:InvokeServer("classreset"); views.class() end } })
  for _, T in ipairs(v.trees) do
    local lines = {}
    for _, n in ipairs(T.nodes) do lines[#lines + 1] = string.format("%s %s (%d점)%s", n.has and "●" or (n.can and "○" or "·"), n.name, n.cost, n.desc and (" — " .. n.desc) or "") end
    local btns = {}
    for _, n in ipairs(T.nodes) do if n.can or n.has then btns[#btns + 1] = { (n.has and "해제 " or "찍기 ") .. string.sub(n.name, 1, 4), function() rpc:InvokeServer(n.has and "classdrop" or "classtake", n.id); views.class() end } end end
    card(T.name, lines, { btns[1], btns[2] })
    if #btns > 2 then card(T.name .. " (이어서)", {}, { btns[3], btns[4] }) end
  end
end
function views.charm()
  clear(); local r = rpc:InvokeServer("charms"); setSummary(r.summary); local v = r.view
  if not v.unlocked then card("참", { "3차 전직 후에 장착할 수 있습니다." }, {}); return end
  for i = 1, 4 do local c = v.equipped[i]; if c then card("장착 " .. i, c.lines, { { "해제", function() rpc:InvokeServer("charmoff", i); views.charm() end } }) else card("빈 칸 " .. i, {}, {}) end end
  for _, c in ipairs(v.inv) do card("보관", c.lines, { { "장착", function() local e = rpc:InvokeServer("charmequip", { uid = c.uid }); msg.Text = e.err or ""; views.charm() end }, { "버리기", function() rpc:InvokeServer("charmdrop", c.uid); views.charm() end } }) end
end
function views.warden()
  clear(); local u = rpc:InvokeServer("unlocks").u
  if not u.warden then card("새 문지기", { "솟아난 탑 100층을 클리어하면 열립니다." }, {}); return end
  local st = rpc:InvokeServer("wstate").st
  if not st then
    card("새 문지기 — 공명 구슬", { "구슬이 터지기 전에 직접 눌러 없애야 합니다 (스킬은 통하지 않음).", "터진 구슬은 큰 피해를 주고 문지기를 회복시킵니다." }, { { "도전", function() local e = rpc:InvokeServer("wstart"); msg.Text = e.err or "시작!"; views.warden() end } })
    return
  end
  local info = card
  local box = Instance.new("Frame"); box.BackgroundColor3 = Color3.fromRGB(40, 34, 70); box.AutomaticSize = Enum.AutomaticSize.Y; box.Size = UDim2.new(1, -8, 0, 0); box.Parent = list
  local lbl = label(box, "", 14, UDim2.new(0, 8, 0, 4), UDim2.new(1, -16, 0, 40)); lbl.AutomaticSize = Enum.AutomaticSize.Y
  local grid = Instance.new("Frame"); grid.BackgroundTransparency = 1; grid.Size = UDim2.new(1, -16, 0, 150); grid.Position = UDim2.new(0, 8, 0, 56); grid.Parent = box
  local running = true
  task.spawn(function()
    while running and box.Parent do
      local s2 = rpc:InvokeServer("wstate").st
      if not s2 then break end
      lbl.Text = string.format("%.0f초 · 내 체력 %.0f%% · 문지기 %.1f%% · 구슬 처치 %d / 폭발 %d", s2.time, s2.hp * 100, s2.bossHp * 100, s2.pop, s2.boom)
      for _, c in ipairs(grid:GetChildren()) do c:Destroy() end
      for i, o in ipairs(s2.orbs) do
        local b = button(grid, string.format("구슬 %.1f초", o.fuse), UDim2.new(0, ((i - 1) % 4) * 118, 0, math.floor((i - 1) / 4) * 40), UDim2.new(0, 112, 0, 34), function() rpc:InvokeServer("wpop", o.id) end, Color3.fromRGB(190, 70, 60))
      end
      if s2.over then
        local f = rpc:InvokeServer("wfinish"); if f.result then showResult(f) end
        running = false; task.wait(0.3); views.warden(); return
      end
      task.wait(0.25)
    end
  end)
end
function views.daily()
  clear(); local o = rpc:InvokeServer("offline"); if o.summary then setSummary(o.summary) end
  if o.r then card("오프라인 보상", { string.format("%d분 동안 자리를 비웠습니다: 골드 %d · 강화석 %d", o.r.mins, o.r.gold, o.r.ore) }, {}) end
  local r = rpc:InvokeServer("daily")
  for _, t in ipairs(r.rows) do
    local ready = t.p >= t.n and not t.claimed
    card(string.format("%s (%d/%d)", t.name, t.p, t.n), { "보상: " .. t.text }, { { t.claimed and "수령 완료" or (ready and "받기" or "진행 중"), function() if ready then local e = rpc:InvokeServer("dailyclaim", t.id); if e.summary then setSummary(e.summary) end; views.daily() end end } })
  end
  card("장비 일괄 정리", { "일반~마법 장비 중 강화·사탄이 아닌 것만 처리합니다." }, {
    { "일반 분해", function() local e = rpc:InvokeServer("bulk", { r = 0, mode = "dismantle" }); setSummary(e.summary); msg.Text = e.res.n .. "개 분해"; views.daily() end },
    { "마법까지 분해", function() local e = rpc:InvokeServer("bulk", { r = 2, mode = "dismantle" }); setSummary(e.summary); msg.Text = e.res.n .. "개 분해"; views.daily() end },
    { "마법까지 판매", function() local e = rpc:InvokeServer("bulk", { r = 2, mode = "sell" }); setSummary(e.summary); msg.Text = e.res.n .. "개 판매"; views.daily() end } })
end
function views.quests()
  clear(); local r = rpc:InvokeServer("quests")
  for _, q in ipairs(r.rows) do
    local ready = q.state == "done"
    card(string.format("%s (%d/%d)", q.title, q.p, q.n), { q.desc }, { { q.state == "claimed" and "완료" or (ready and "보상 받기" or "진행 중"), function() if ready then local e = rpc:InvokeServer("questclaim", q.id); if e.summary then setSummary(e.summary) end; views.quests() end end } })
  end
end
function views.runes()
  clear(); local r = rpc:InvokeServer("runes")
  card("보유 룬 " .. #r.runes, { "스킬 카드의 '룬' 버튼으로 끼울 스킬을 고릅니다 (아래 스킬을 먼저 선택)." }, {})
  for _, k in ipairs(r.skills) do
    local btns = {}
    if k.rune then btns[#btns + 1] = { "룬 해제", function() rpc:InvokeServer("runeremove", k.uid); views.runes() end } end
    for _, ru in ipairs(r.runes) do if #btns < 3 then btns[#btns + 1] = { string.sub(ru.name, 1, 9), function() local e = rpc:InvokeServer("runeequip", { skill = k.uid, rune = ru.uid }); msg.Text = e.err or ""; views.runes() end } end end
    card(tostring(k.name or k.id) .. (k.rune and (" [" .. k.rune .. "]") or ""), {}, btns)
  end
end
function views.guild()
  clear(); local r = rpc:InvokeServer("g_view"); if r.summary then setSummary(r.summary) end
  local v = r.view
  if v.none then
    card("길드에 가입하지 않았습니다", { "창설 비용 " .. v.createCost .. "G · 이름은 2~12자" }, { { "창설", function() local e = rpc:InvokeServer("g_create", "길드" .. math.random(100, 999)); msg.Text = e.err or "창설!"; views.guild() end } })
    for _, g in ipairs(v.list) do card(string.format("%s (Lv%d · %d명)", g.name, g.lv, g.members), { "길드장 " .. g.leader }, { { "가입", function() local e = rpc:InvokeServer("g_join", g.id); msg.Text = e.err or "가입!"; views.guild() end } }) end
    return
  end
  card(string.format("%s · Lv%d · %d명 · 코인 %d", v.name, v.lv, v.count, v.coins), { "공지: " .. (v.motd ~= "" and v.motd or "(없음)") }, {
    { "10만 기부", function() local e = rpc:InvokeServer("g_donate", 100000); msg.Text = e.err or "기부 완료"; if e.summary then setSummary(e.summary) end; views.guild() end },
    { "탈퇴", function() rpc:InvokeServer("g_leave"); views.guild() end } })
  local gl = {}; for _, g in ipairs(v.goals) do gl[#gl + 1] = string.format("%s %d / %d%s", g.id == "kill" and "처치" or (g.id == "boss" and "보스" or "클리어"), g.prog, g.goal, g.done and " ✔" or "") end
  card("주간 길드 목표", gl, { { "보상 받기", function() local e = rpc:InvokeServer("g_claim"); msg.Text = e.err or e.msg or ""; if e.summary then setSummary(e.summary) end; views.guild() end } })
  local rk = {}; for i, x in ipairs(v.bossRank) do if i <= 5 then rk[#rk + 1] = string.format("%d위 %s  %s", i, x.name, tostring(math.floor(x.damage))) end end
  card(string.format("길드 보스 (남은 도전 %d · 합계 %s)", v.bossTries, tostring(math.floor(v.bossTotal))), rk, {
    { "도전", function() local e = rpc:InvokeServer("g_boss"); msg.Text = e.err or ("피해 " .. math.floor(e.dmg or 0)); views.guild() end },
    { "지난주 보상", function() local e = rpc:InvokeServer("g_bossclaim"); msg.Text = e.err or e.msg or ""; if e.summary then setSummary(e.summary) end end } })
  for _, it in ipairs(v.shop) do card(it.name .. " — 코인 " .. it.cost .. " (주 " .. it.weekly .. "회)", {}, { { "구매", function() local e = rpc:InvokeServer("g_buy", it.id); msg.Text = e.err or "구매"; if e.summary then setSummary(e.summary) end; views.guild() end } }) end
end
local tabs = { { "도전", "fight" }, { "장비", "inv" }, { "스킬", "skills" }, { "상점", "shop" }, { "패시브", "pass" }, { "대장간", "forge" }, { "돌", "stones" }, { "콘텐츠", "content" }, { "전직", "class" }, { "참", "charm" }, { "문지기", "warden" }, { "일일", "daily" }, { "퀘스트", "quests" }, { "룬", "runes" }, { "길드", "guild" } }
local tabRow = Instance.new("Frame"); tabRow.BackgroundTransparency = 1; tabRow.Position = UDim2.new(0, 12, 0, 78); tabRow.Size = UDim2.new(1, -24, 0, 56); tabRow.Parent = root
for i, t in ipairs(tabs) do button(tabRow, t[1], UDim2.new(0, ((i - 1) % 8) * 66, 0, math.floor((i - 1) / 8) * 28), UDim2.new(0, 62, 0, 26), function() views[t[2]]() end) end
refresh(); views.fight()
