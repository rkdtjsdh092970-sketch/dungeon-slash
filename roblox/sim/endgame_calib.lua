-- 엔드게임 난이도 보정 (Studio 플레이 → 서버): 테스터 기준표의 장비 구성으로 만든 기준 빌드(레벨 100)가
-- 이기는 가장 높은 난이도(tier)를 콘텐츠마다 잰다. 표본: 장비 운 3종(빌드 시드) × 물리 · 마법 × 전투 4판 = 난이도 하나당 24판,
-- 승률 60% 이상인 가장 높은 tier (이분 탐색). 결과로 Content.GATE_TIERS · SPIRE.TAB · TEMPLE.TIERS · CRAID.TIERS 를 정한다.
local G = game.ReplicatedStorage.Game
local REF = require(game.ServerStorage.SimRef)
local Battle = require(G.Battle)
local C = { BUILDS = 3, FIGHTS = 4, WIN = 0.6 }
local function builds(spec)
  local out = {}
  for _, fam in ipairs({ "phys", "mag" }) do
    for b = 1, C.BUILDS do
      local s = table.clone(spec); s.fam = fam; s.level = 100; s.ilvl = 5; s.late = true; s.skL = s.skL or 3; s.seed = b * 101
      out[#out + 1] = REF.build(s)
    end
  end
  return out
end
local function winRate(svs, node)
  local w, n = 0, 0
  for _, sv in ipairs(svs) do for f = 1, C.FIGHTS do n += 1; if Battle.run(sv, node, f * 7919, 0.05, 900).win then w += 1 end end; task.wait() end
  return w / n
end
local function maxTier(spec, nodeOf, lo, hi)
  local svs = builds(spec)
  local function ok(t) return winRate(svs, nodeOf(t)) >= C.WIN end
  if not ok(lo) then return lo - 1 end
  local a, b = lo, hi
  while b - a > 1 do local m = math.floor((a + b) / 2); if ok(m) then a = m else b = m end end
  return a
end
C.maxTier = maxTier
C.TOWER = { { 21, { 1, 1, 1, 2, 2 }, 0 }, { 39, { 1, 1, 2, 2, 2 }, 1 }, { 59, { 1, 1, 2, 2, 2 }, 2 }, { 79, { 1, 1, 2, 2, 2 }, 3 }, { 99, { 1, 1, 2, 2, 2 }, 4 }, { 100, { 1, 1, 1, 2, 2 }, 5 } }
C.GATE = { { 1, 2, 2, 3, 3 }, { 1, 2, 2, 2, 3 }, { 1, 1, 2, 2, 2 }, { 1, 1, 1, 2, 2 } }
C.RAID = { { { 1, 1, 2, 2, 2 }, 1, 6 }, { { 1, 1, 2, 2, 2 }, 3, 12 }, { { 1, 1, 1, 2, 2 }, 5, 18 } }
-- 결과는 ServerStorage 속성(Calib_*)에 쌓아 둔다 (MCP 시간 초과로 끊겨도 남게)
function C.runAll()
  local SS = game.ServerStorage
  for _, t in ipairs(C.TOWER) do SS:SetAttribute("Calib_tower" .. t[1], maxTier({ tiers = t[2], sat = t[3] }, function(x) return { act = 10, floor = t[1], tier = x, tw = 1 } end, 60, 220)) end
  for i, tiers in ipairs(C.GATE) do SS:SetAttribute("Calib_gate" .. i, maxTier({ tiers = tiers }, function(x) return { kind = "void", act = 10, tier = x, vsel = i } end, 60, 220)) end
  for d, r in ipairs(C.RAID) do SS:SetAttribute("Calib_raid" .. d, maxTier({ tiers = r[1], sat = r[2], stones = r[3] }, function(x) return { kind = "craid", act = 10, diff = d, tier = x } end, 60, 240)) end
  -- 모르가스(심연의 문): 기준표 T5 1등급3 · 2등급2 + 전설 2 · 신화 2 (결계석은 자동 공격으로 부순다)
  SS:SetAttribute("Calib_morgath", maxTier({ tiers = { 1, 1, 1, 2, 2 } }, function(x) return { kind = "raid", act = 10, tier = x } end, 60, 160))
  SS:SetAttribute("Calib_done", true)
end
return C
