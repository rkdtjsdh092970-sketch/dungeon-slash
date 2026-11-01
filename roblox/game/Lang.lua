-- 언어: 게임 문구는 한국어로 쓰여 있고, 화면에 나가기 직전에 고른 언어로 바꾼다 (기본 영어).
-- 번역표는 Data.LangEn (lang/en.tsv → lang/build_lang.py 로 생성). 찾는 순서: 문장 그대로 → 줄 단위 → format 틀 → " · " 조각 → 단어 조각 치환.
local M = { lang = "en" }
local ok, D = pcall(require, script.Parent.Data:FindFirstChild("LangEn"))
local EXACT, FMT, FRAG = {}, {}, {}
if ok and D then
  EXACT, FMT = D.exact, D.fmt
  -- 조각: 한글 2자 이상 · 한 줄짜리 문장을 긴 것부터 (이어 붙인 문장에서 아는 부분을 찾아 바꾼다)
  for k, e in pairs(EXACT) do
    local _, nh = string.gsub(k, "[\234-\237]", "")
    if nh >= 2 and not string.find(k, "\n", 1, true) then FRAG[#FRAG + 1] = { k, e } end
  end
  table.sort(FRAG, function(a, b) return #a[1] > #b[1] end)
end
M.changed = Instance.new("BindableEvent")
local cache = {}
local function hangul(s) return string.find(s, "[\234-\237]") ~= nil end   -- 한글 UTF-8 첫 바이트(EA~ED)
local function plain(s) return (string.gsub(s, "[%^%$%(%)%%%.%[%]%*%+%-%?]", "%%%0")) end

local tr
local function parts(s, sep, psep)   -- 구분자로 나눠 조각마다 번역
  local out = {}; for p in string.gmatch(s .. sep, "(.-)" .. psep) do out[#out + 1] = tr(p) end
  return table.concat(out, sep)
end
tr = function(s)
  local r = EXACT[s]; if r then return r end
  if string.find(s, "\n", 1, true) then return parts(s, "\n", "\n") end
  for _, f in ipairs(FMT) do
    local caps = { string.match(s, f[1]) }
    if #caps > 0 then
      r = string.gsub(f[2], "%%(%d)", function(i) local c = caps[tonumber(i)]; return c and tr(c) or "" end)
      return (string.gsub(r, "%%%%", "%%"))
    end
  end
  if string.find(s, " · ", 1, true) then return parts(s, " · ", " · ") end
  r = s
  for _, f in ipairs(FRAG) do
    if not hangul(r) then break end
    if string.find(r, f[1], 1, true) then r = string.gsub(r, plain(f[1]), (string.gsub(f[2], "%%", "%%%%"))) end
  end
  return r
end

function M.tr(s)
  if M.lang ~= "en" or type(s) ~= "string" or not hangul(s) then return s end
  local c = cache[s]; if c then return c end
  c = tr(s); cache[s] = c; return c
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
