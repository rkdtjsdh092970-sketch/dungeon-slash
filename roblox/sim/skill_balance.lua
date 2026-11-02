-- 스킬 역할별 기준선 계산 (Studio 플레이 → 서버에서 실행). 결과를 data/SkillBalance.lua 에 붙여 넣는다. 먼저 sim/measure_tm.lua 로 SkillTM 을 새로 잰다.
local SK = require(game.ReplicatedStorage.Game.Data.Skills); local TM = require(game.ReplicatedStorage.Game.Data.SkillTM)
local SQ = { orbit = 1, aura = 1, zone2 = 1, hole = 1 }
local function role(d)
  if d.slot == "basic" then return "basic" end
  if d.bonus and (d.bonus.boss or 0) >= 0.8 then return "boss" end
  local k = d.kind
  if k == "single" then return "single" end
  if k == "pierce" or k == "chain" or k == "bounce" or k == "boomer" or k == "spray" then return "line" end
  if k == "nova" then return "screen" end
  if k == "zone" or k == "zone2" or k == "aura" or k == "orbit" or k == "hole" or k == "shuri" or k == "summon" then return "persist" end
  return "area"
end
local function era(u) u = u or 1; return u <= 2 and 1 or (u <= 4 and 2 or (u <= 6 and 3 or 4)) end
local groups, seen = {}, {}
for _, d in ipairs(SK.SKILLS) do
  if not seen[d.id] and d.dtype ~= "buff" and d.dtype ~= "heal" and d.slot ~= "passive" and TM[d.id] and not d.voidOnly and not d.mythOnly then
    seen[d.id] = true
    local key = role(d) .. "|" .. era(d.unlock); groups[key] = groups[key] or {}
    table.insert(groups[key], { d = d, val = TM[d.id] / math.max(0.2, d.cd or 1) })
  end
end
local fac = {}
for _, g in pairs(groups) do
  table.sort(g, function(a, b) return a.val > b.val end); local top = g[1].val
  for _, x in ipairs(g) do
    local d = x.d
    local dot = (d.poison or 0) >= 0.3 or (d.bleed or 0) >= 0.3 or (d.ignite or 0) >= 0.3
    if x.val < top * 0.85 and not dot then local f = math.min(2.5, top * 0.85 / x.val); if SQ[d.kind] then f = math.sqrt(f) end; fac[#fac + 1] = string.format("%s = %.3f", d.id, f) end
  end
end
table.sort(fac); print("return { " .. table.concat(fac, ", ") .. " }")
