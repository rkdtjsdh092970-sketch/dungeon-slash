-- 엔드게임 난이도 보정 (Studio 플레이 → 서버): 테스터 기준표의 장비 구성으로 만든 기준 빌드(레벨 100, 물리 · 마법)가
-- 이기는 가장 높은 난이도(tier)를 콘텐츠마다 잰다. 결과로 Content.GATE_TIERS · SPIRE.TAB · TEMPLE.TIERS · CRAID.TIERS 를 정한다.
local G = game.ReplicatedStorage.Game
local REF = require(game.ServerStorage.SimRef)
local Battle = require(G.Battle)
local C = {}
local function avgMax(spec, nodeOf, lo, hi)
  local sum = 0
  for _, fam in ipairs({ "phys", "mag" }) do
    local s = table.clone(spec); s.fam = fam; s.level = 100; s.ilvl = 5; s.late = true; s.skR = s.skR or { 2, 2, 3, 3 }; s.skL = 10
    sum += REF.maxTier(REF.build(s), nodeOf, lo, hi)
  end
  return sum / 2
end
-- 탑: 기준표 층 구간별 장비 (사탄 옵션 수 포함)
C.TOWER = { { 21, { 1, 1, 1, 2, 2 }, 0 }, { 39, { 1, 1, 2, 2, 2 }, 1 }, { 59, { 1, 1, 2, 2, 2 }, 2 }, { 79, { 1, 1, 2, 2, 2 }, 3 }, { 99, { 1, 1, 2, 2, 2 }, 4 }, { 100, { 1, 1, 1, 2, 2 }, 5 } }
function C.tower()
  local out = {}
  for _, t in ipairs(C.TOWER) do out[#out + 1] = { t[1], avgMax({ tiers = t[2], sat = t[3] }, function(x) return { act = 10, floor = t[1], tier = x, tw = 1 } end, 60, 220) }; task.wait() end
  return out
end
C.GATE = { { 1, 2, 2, 3, 3 }, { 1, 2, 2, 2, 3 }, { 1, 1, 2, 2, 2 }, { 1, 1, 1, 2, 2 } }
function C.gate()
  local out = {}
  for i, tiers in ipairs(C.GATE) do out[i] = avgMax({ tiers = tiers }, function(x) return { kind = "void", act = 10, tier = x, vsel = i } end, 60, 220); task.wait() end
  return out
end
-- 레이드: 탑 30층 · 70층 · 100층 장비 + 계시의 돌 6 · 12 · 18
C.RAID = { { { 1, 1, 2, 2, 2 }, 1, 6 }, { { 1, 1, 2, 2, 2 }, 3, 12 }, { { 1, 1, 1, 2, 2 }, 5, 18 } }
function C.raid()
  local out = {}
  for d, r in ipairs(C.RAID) do out[d] = avgMax({ tiers = r[1], sat = r[2], stones = r[3] }, function(x) return { kind = "craid", act = 10, diff = d, tier = x } end, 60, 240); task.wait() end
  return out
end
return C
