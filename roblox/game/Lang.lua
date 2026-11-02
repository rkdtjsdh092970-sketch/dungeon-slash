-- 언어: 게임 문구의 원문은 영어 (2026-11-03부터). 한국어를 고르면 화면에 나가기 직전에 한국어로 바꾼다 (기본 영어).
-- 번역표: Data.LangKo (lang/ko.tsv → lang/build_ko.py). 찾는 순서: 문장 그대로 → format 틀 → 줄 단위 → " · " 조각 → 여러 낱말 조각 → 한 낱말.
-- 예전 세이브에 한국어로 저장된 글(우편 제목 등)은 영어 화면에서 Data.LangEn(예전 한국어 → 영어 표)으로 바꾼다.
local M = { lang = "en" }
local function load(name) local f = script.Parent.Data:FindFirstChild(name); if not f then return nil end; local ok, D = pcall(require, f); return ok and D or nil end
local function plain(s) return (string.gsub(s, "[%^%$%(%)%%%.%[%]%*%+%-%?]", "%%%0")) end
local function hangul(s) return string.find(s, "[\234-\237]") ~= nil end   -- 한글 UTF-8 첫 바이트(EA~ED)

-- 번역기 하나: exact · fmt 표와 "조각" 규칙
local function maker(D, isFrag, isWord)
  local EXACT, FMT, FRAG = D and D.exact or {}, D and D.fmt or {}, {}
  for k, e in pairs(EXACT) do if isFrag(k) then FRAG[#FRAG + 1] = { k, e } end end
  table.sort(FRAG, function(a, b) return #a[1] > #b[1] end)
  local tr
  local function parts(s, sep, psep) local out = {}; for p in string.gmatch(s .. sep, "(.-)" .. psep) do out[#out + 1] = tr(p) end; return table.concat(out, sep) end
  tr = function(s)
    local r = EXACT[s]; if r then return r end
    for _, f in ipairs(FMT) do   -- format 틀은 여러 줄짜리도 있으므로 줄로 나누기 전에 먼저 본다
      local caps = { string.match(s, f[1]) }
      if #caps > 0 then
        r = string.gsub(f[2], "%%(%d)", function(i) local c = caps[tonumber(i)]; return c and tr(c) or "" end)
        return (string.gsub(r, "%%%%", "%%"))
      end
    end
    if string.find(s, "\n", 1, true) then return parts(s, "\n", "\n") end
    if string.find(s, " · ", 1, true) then return parts(s, " · ", " · ") end
    r = s
    for _, f in ipairs(FRAG) do   -- 이어 붙인 문장에서 아는 부분 (긴 것부터)
      if string.find(r, f[1], 1, true) then r = string.gsub(r, plain(f[1]), (string.gsub(f[2], "%%", "%%%%"))) end
    end
    if isWord then r = string.gsub(r, isWord, function(w) return EXACT[w] or w end) end   -- 남은 낱말 (예: "Rare Sword" 의 "Sword")
    return r
  end
  return tr
end
-- 한국어: 영어 조각은 낱말이 둘 이상인 것만 (짧은 낱말이 다른 낱말 속에서 바뀌지 않게), 남은 낱말은 낱말 단위로
local trKo = maker(load("LangKo"), function(k) return string.find(k, "%a+ %a+") ~= nil and not string.find(k, "\n", 1, true) end, "%a[%a']*")
-- 예전 한국어 글 → 영어
local trEn = maker(load("LangEn"), function(k) local _, nh = string.gsub(k, "[\234-\237]", ""); return nh >= 2 and not string.find(k, "\n", 1, true) end, "[^%s%(%)%[%]]+")

M.changed = Instance.new("BindableEvent")
local cache = { ko = {}, en = {} }
function M.tr(s)
  if type(s) ~= "string" or s == "" then return s end
  local c = cache[M.lang] and cache[M.lang][s]; if c then return c end
  if M.lang == "ko" then c = trKo(s)
  elseif hangul(s) then c = trEn(s)
  else return s end
  cache[M.lang][s] = c; return c
end
function M.set(l) if l ~= M.lang then M.lang = l; M.changed:Fire(l) end end

-- 화면 글자 자동 번역: gui 아래 모든 TextLabel/TextButton 의 Text(와 TextBox 안내 문구)를 바꾼다. 원문은 속성 _src 에 둔다.
-- 번역하지 않을 글자는 속성 NoTr = true.
local function hook(o)
  if not (o:IsA("TextLabel") or o:IsA("TextButton") or o:IsA("TextBox")) then return end
  if o:IsA("TextBox") then
    o:SetAttribute("_psrc", o.PlaceholderText); o.PlaceholderText = M.tr(o.PlaceholderText); return
  end
  local function apply()
    if o:GetAttribute("NoTr") then return end
    local cur = o.Text
    if cur == o:GetAttribute("_tr") then return end
    o:SetAttribute("_src", cur)
    local t = M.tr(cur); o:SetAttribute("_tr", t)
    if t ~= cur then o.Text = t end
  end
  apply(); o:GetPropertyChangedSignal("Text"):Connect(apply)
end
local roots = {}
function M.watch(gui)
  roots[#roots + 1] = gui
  for _, d in ipairs(gui:GetDescendants()) do hook(d) end
  gui.DescendantAdded:Connect(hook)
end
M.changed.Event:Connect(function()   -- 언어를 바꾸면 화면 글자를 원문에서 다시 번역
  for _, g in ipairs(roots) do
    if g.Parent then
      for _, d in ipairs(g:GetDescendants()) do
        local src = d:GetAttribute("_src")
        if src ~= nil and not d:GetAttribute("NoTr") then local t = M.tr(src); d:SetAttribute("_tr", t); d.Text = t end
        local ps = d:GetAttribute("_psrc"); if ps ~= nil then d.PlaceholderText = M.tr(ps) end
      end
    end
  end
end)
return M
