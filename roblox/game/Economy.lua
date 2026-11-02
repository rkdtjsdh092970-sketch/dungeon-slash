-- 초반 경제: 스킬 상점 · 스킬 레벨업(연마석) · 스킬 장착 · 패시브 트리 · 대장간 강화 (JS state.js / data4.js 이식)
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local Skills = require(Data.Skills)
local Items = require(Data.Items)
local Passives = require(Data.Passives).PASSIVES
local Loot = require(script.Parent.Loot)

local M = {}
local floor = math.floor
local SKILL_BY = {}; for _, d in ipairs(Skills.SKILLS) do SKILL_BY[d.id] = d end
local PASS_BY = {}; for _, p in ipairs(Passives) do PASS_BY[p.id] = p end
M.SKILL_MAX_LV = 20
local HONE_RMUL = { 1, 2, 4, 8, 16, 32 }
local ENH_RATE = { 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3 }
local ENH_DROP = { 0, 0, 0, 0, 0, 0, 0, 0.3, 0.4, 0.5 }

-- ---------- 스킬 상점 ----------
local SHOP_BOSS = { execute = true, smite = true, firemark = true, frostmark = true, stormmark = true }
local function isSpecial(d) return d.voidOnly or (d.slot == "passive" and (d.pt or 0) > 0) or d.mythOnly or (d.bonus and (d.bonus.boss or 0) >= 0.8 and not SHOP_BOSS[d.id]) end
local function skillPrice(d, rarity)
  if d.slot == "passive" then return 300 * ({ 1, 3, 10, 30, 90, 300 })[rarity + 1] end
  return floor(70 * 1.55 ^ (d.unlock - 1) * ({ 1, 3.5, 12, 40, 130, 500 })[rarity + 1] * (d.slot == "basic" and 0.6 or 1) + 0.5)
end
M.skillPrice = skillPrice
function M.skillAct(sv) return math.max(1, math.min(8, 2 + floor(sv.level / 6))) end   -- 소환 풀 단계: 처음부터 2단계, 6레벨마다 +1 (새 계정이 같은 2~3종만 뽑지 않게, 2026-11-02)
function M.shopStock(sv)
  local out = {}
  for _, d in ipairs(Skills.SKILLS) do
    if not isSpecial(d) and d.id ~= "p_none" and (d.unlock or 1) <= M.skillAct(sv) then out[#out + 1] = d end
  end
  table.sort(out, function(a, b) local ba, bb = a.slot == "basic" and 0 or 1, b.slot == "basic" and 0 or 1; if ba ~= bb then return ba < bb end return (a.unlock or 0) < (b.unlock or 0) end)
  local rows = {}; for _, d in ipairs(out) do rows[#rows + 1] = { id = d.id, name = d.name, slot = d.slot, kind = d.kind, price = skillPrice(d, 0), desc = d.desc, dtype = d.dtype, elem = d.elem } end
  return rows
end
function M.buySkill(sv, id)
  local d = SKILL_BY[id]; if not d or isSpecial(d) then return false, "살 수 없는 아르카나" end
  if (d.unlock or 1) > M.skillAct(sv) then return false, "아직 해금되지 않았습니다" end
  local price = skillPrice(d, 0); if sv.gold < price then return false, "골드가 부족합니다" end
  sv.gold -= price; local g = M.grantSkill(sv, id); local inst; for _, k in ipairs(sv.skills) do if k.uid == g.uid then inst = k end end
  return true, inst
end
local function findSkill(sv, uid) for _, k in ipairs(sv.skills) do if k.uid == uid then return k end end end
function M.honeCost(lvl, rarity) return floor((3 + 2 * lvl) * (HONE_RMUL[(rarity or 0) + 1] or 1) + 0.5) end
function M.levelUpSkill(sv, uid)
  local k = findSkill(sv, uid); if not k then return false, "없는 아르카나" end
  local lvl = k.lvl or 1; if lvl >= M.SKILL_MAX_LV then return false, "최대 레벨입니다" end
  local c = M.honeCost(lvl, k.rarity); if (sv.hone or 0) < c then return false, "연마석이 부족합니다" end
  sv.hone -= c; k.lvl = lvl + 1; return true
end
-- 장착: slotIdx 는 1~sv.slots. 이미 다른 칸에 있으면 그 칸을 비운다
function M.equipSkill(sv, slotIdx, uid, rule)
  if slotIdx < 1 or slotIdx > sv.slots then return false, "열리지 않은 칸입니다" end
  local k = findSkill(sv, uid); if not k then return false, "없는 아르카나" end
  local d = SKILL_BY[k.id]; if d.slot == "passive" then sv.passive = uid; return true end
  for i, l in ipairs(sv.loadout) do if l and l.uid == uid then sv.loadout[i] = false end end
  sv.loadout[slotIdx] = { uid = uid, rule = rule or "front" }; return true
end
function M.unequipSkill(sv, slotIdx) sv.loadout[slotIdx] = false; return true end
M.SKILL_DIS_ARC = { 1, 2, 5, 15, 40 }   -- 스킬 분해 → 아르카나 조각: 일반 · 희귀 · 전설 · 신화 · 사탄 (레벨마다 +25%). 연마석은 없앴다 (2026-11-02)
-- 아르카나 조각 (스킬 소환 전용): 전투 · 과제 보상으로 준다
function M.addArcana(sv, n) n = math.max(0, math.floor(n or 0)); sv.arcana = (sv.arcana or 0) + n; return n end
function M.sellSkill(sv, uid)
  local k = findSkill(sv, uid); if not k then return false, "없는 아르카나" end
  if sv.passive == uid then return false, "장착 중입니다" end
  for _, l in ipairs(sv.loadout) do if l and l.uid == uid then return false, "장착 중입니다" end end
  local v = floor(M.SKILL_DIS_ARC[math.min(5, (k.rarity or 0) + 1)] * (1 + 0.25 * ((k.lvl or 1) - 1)) + 0.5)   -- 분해: 아르카나 조각
  sv.arcana = (sv.arcana or 0) + v; table.remove(sv.skills, table.find(sv.skills, k)); return true, v
end
function M.skillList(sv)
  local rows = {}
  for _, k in ipairs(sv.skills) do
    local d = SKILL_BY[k.id]; local slot, rule = 0, nil
    for i, l in ipairs(sv.loadout) do if l and l.uid == k.uid then slot = i; rule = l.rule end end
    rows[#rows + 1] = { uid = k.uid, id = k.id, rune = k.rune, rule = rule, name = d.name, lvl = k.lvl or 1, rarity = k.rarity or 0, slot = slot, passive = sv.passive == k.uid, honeCost = nil, maxLv = M.SKILL_MAX_LV, dtype = d.dtype, desc = d.desc, kind = d.kind }
  end
  return rows
end

-- ---------- 패시브 트리 ----------
function M.passivePoints(sv) return math.max(0, sv.level - 1) * CFG.PASSIVE_PER_LV end
function M.passiveSpent(sv) local n = 0; for id in pairs(sv.pass or {}) do if PASS_BY[id] then n += PASS_BY[id].cost end end return n end
function M.passiveLeft(sv) return M.passivePoints(sv) - M.passiveSpent(sv) end
local function has(sv, id) return sv.pass and sv.pass[id] and PASS_BY[id] ~= nil end
local function linked(sv, p) for _, q in ipairs(p.links) do if q == "C" or has(sv, q) then return true end end return false end
-- 가장 싼 경로 (JS passivePath)
function M.passivePath(sv, id)
  local T = PASS_BY[id]; if not T or has(sv, id) then return nil end
  local dist, prev, todo = {}, {}, {}
  for _, p in ipairs(Passives) do if not has(sv, p.id) and linked(sv, p) then dist[p.id] = p.cost; prev[p.id] = false; todo[p.id] = true end end
  while next(todo) do
    local cur; for k in pairs(todo) do if cur == nil or dist[k] < dist[cur] then cur = k end end
    todo[cur] = nil
    if cur == id then break end
    for _, q in ipairs(PASS_BY[cur].links) do
      if q ~= "C" and not has(sv, q) then
        local nd = dist[cur] + PASS_BY[q].cost
        if dist[q] == nil or nd < dist[q] then dist[q] = nd; prev[q] = cur; todo[q] = true end
      end
    end
  end
  if dist[id] == nil then return nil end
  local path = {}; local c = id; while c do table.insert(path, 1, c); c = prev[c] or nil end
  return { ids = path, cost = dist[id] }
end
function M.addPassivePath(sv, id)
  local P = M.passivePath(sv, id); if not P or P.cost > M.passiveLeft(sv) then return 0 end
  for _, k in ipairs(P.ids) do sv.pass[k] = 1 end; return #P.ids
end
function M.resetPassives(sv) sv.pass = {} end
-- 찍은 노드 하나 빼기 (포인트 돌려받음). 빼도 나머지가 모두 가운데와 이어져 있을 때만 (끝 노드부터)
function M.dropPassive(sv, id)
  if not has(sv, id) then return false, "찍지 않은 노드입니다" end
  sv.pass[id] = nil
  local seen, todo = {}, {}
  for k in pairs(sv.pass) do if PASS_BY[k] and table.find(PASS_BY[k].links, "C") then seen[k] = true; todo[#todo + 1] = k end end
  while #todo > 0 do
    local k = table.remove(todo)
    for _, q in ipairs(PASS_BY[k].links) do if q ~= "C" and has(sv, q) and not seen[q] then seen[q] = true; todo[#todo + 1] = q end end
    for q in pairs(sv.pass) do if not seen[q] and PASS_BY[q] and table.find(PASS_BY[q].links, k) then seen[q] = true; todo[#todo + 1] = q end end
  end
  for k in pairs(sv.pass) do if PASS_BY[k] and not seen[k] then sv.pass[id] = 1; return false, "이 노드 뒤로 이어진 노드가 있어 뺄 수 없습니다 (끝 노드부터 빼세요)" end end
  return true
end
-- 자동 배분: 키별 가중치로 점수/비용이 높은 경로를 포인트가 다할 때까지 찍는다 (직접 트리를 고르는 화면이 생기기 전까지의 대체)
local W = { atkPct = 3, magPct = 3, hpPct = 2, defPct = 1.5, allDmg = 4, physDmg = 2.5, magDmg = 2.5, critChance = 2, critDmg = 2, cdr = 3, lifesteal = 2, atkFlat = 0.02, hpFlat = 0.005, dmgTaken = -3, boss = 1, elite = 1, aoeDmg = 1.5, dodge = 1.5, ignoreDef = 2, ignoreRes = 2, fireDmg = 2, coldDmg = 2, lightDmg = 2, voidDmg = 2, atkMore = 8, magMore = 8, hpMore = 6, manaPct = 1, manaRegen = 0.5 }
W.spellCrit = 2; W.elemDmg = 2.5; W.penElem = 1.5; W.magMore = 3; W.atkMore = 3; W.hpMore = 2
-- 계열에 맞는 노드만 (검 = 물리, 지팡이 = 마법): 다른 계열 공격 노드는 점수 0
local OFF = { phys = { magPct = 1, magDmg = 1, spellCrit = 1, elemDmg = 1, penElem = 1, magMore = 1, magFlat = 1 }, mag = { atkPct = 1, physDmg = 1, critChance = 1, atkMore = 1, atkFlat = 1, ignoreDef = 1, shredDef = 1, bleedChance = 1 } }
local function nodeScore(p, fam) local s = 0; for k, v in pairs(p.per) do if not (fam and OFF[fam][k]) then local m = k:sub(-4) == "More" and (v - 1) * 10 or (v > 0 and v or -v); s += (W[k] or 0.2) * m end end return s end
function M.autoPassives(sv)
  local w = sv.equipped and sv.equipped.weapon; local fam = (w and w.wt == "staff") and "mag" or "phys"
  local added = 0
  for _ = 1, 200 do
    local left = M.passiveLeft(sv); if left <= 0 then break end
    local bestId, bestR
    for _, p in ipairs(Passives) do
      if not has(sv, p.id) and linked(sv, p) and p.cost <= left then local r = nodeScore(p, fam) / p.cost; if bestR == nil or r > bestR then bestR = r; bestId = p.id end end
    end
    if not bestId then break end
    sv.pass[bestId] = 1; added += 1
  end
  return added
end

-- ---------- 대장간 강화 ----------
local function gGold(ilvl) return Items.TIER_SCALE[math.max(1, math.min(6, ilvl))] ^ 0.8 end
function M.enhCost(it) return { gold = floor(40 * gGold(it.ilvl) * (1 + (it.enh or 0) * 0.6) + 0.5), ore = 2 + (it.enh or 0) } end
function M.enhance(sv, it, rng)
  if (it.enh or 0) >= 10 then return false, "최대 강화입니다" end
  local c = M.enhCost(it); if sv.gold < c.gold or sv.ore < c.ore then return false, "재료가 부족합니다" end
  sv.gold -= c.gold; local rate = ENH_RATE[(it.enh or 0) + 1]
  if rng:NextNumber() < rate then sv.ore -= c.ore; it.enh = (it.enh or 0) + 1; return true, "+" .. it.enh .. " 강화 성공!" end
  sv.ore -= math.ceil(c.ore / 2)
  if (it.enh or 0) > 0 and rng:NextNumber() < ENH_DROP[(it.enh or 0) + 1] then it.enh -= 1; return true, "강화 실패 — +" .. (it.enh + 1) .. "에서 +" .. it.enh .. "로 하락" end
  return true, "강화 실패 (강화석 일부만 소모)"
end


-- ---------- 대장간: 옵션 재굴림 · 혼돈 구슬(옵션 추가) · 신성한 구슬(수치 재굴림) ----------
local REROLL_COST = { { 150, 2 }, { 500, 3 }, { 1200, 4 }, { 14000, 8 }, { 35000, 12 }, { 80000, 16 } }
function M.rerollCost(it) local c = REROLL_COST[math.max(1, math.min(6, it.ilvl or 1))]; return { gold = c[1], ore = c[2] } end
function M.rerollLocked(it, idx) return it.rrIdx ~= nil and it.rrIdx ~= idx end
local function wpickAff(rng, pool) local t = 0; for _, a in ipairs(pool) do t += a.w end; local r = rng:NextNumber() * t; for _, a in ipairs(pool) do r -= a.w; if r <= 0 then return a end end return pool[#pool] end
function M.rerollAffix(sv, it, idx, rng)   -- idx 는 0부터 (JS 와 같다)
  if M.rerollLocked(it, idx) then return false, "다른 줄을 이미 굴렸습니다 (한 장비에서 한 줄만 굴릴 수 있습니다)" end
  local c = M.rerollCost(it); if sv.gold < c.gold or sv.ore < c.ore then return false, "재료가 부족합니다" end
  local old = it.affixes[idx + 1]; if not old then return false, "없는 줄" end
  local pool = Loot.affixPool(it, idx); if #pool == 0 then return false, "붙일 수 있는 옵션이 없습니다" end
  it.affixes[idx + 1] = Loot.mkAff(rng, wpickAff(rng, pool), it.ilvl, it.rarity); it.rr = (it.rr or 0) + 1; it.rrIdx = idx
  sv.gold -= c.gold; sv.ore -= c.ore; return true
end
-- 혼돈 구슬: 장비 옵션의 수치를 (같은 옵션 · 같은 티어 안에서) 다시 굴린다. 예전 신성 구슬 효과 — 신성 구슬은 폐지 (2026-11-02)
function M.addAffix(sv, it, rng)
  if it.uniq or #it.affixes == 0 or (sv.orbC or 0) < 1 then return false, (sv.orbC or 0) < 1 and "혼돈 구슬이 없습니다" or "옵션이 없는 장비입니다" end
  local by = {}; for _, a in ipairs(Items.AFFIXES) do by[a.k] = a end
  for i, a in ipairs(it.affixes) do it.affixes[i] = Loot.mkAff(rng, by[a.k], it.ilvl, it.rarity, a.t) end
  sv.orbC -= 1; return true
end
M.divine = M.addAffix   -- 예전 요청 이름 호환

-- ---------- 돌 (원초의 돌 → 확인 → 소켓) ----------
local STONE_CAP = 100
local function riftRegion(f) return math.max(1, math.min(10, math.ceil(math.max(1, f) / 10))) end
function M.stoneRevealCost(sv) return floor(120 * 1.45 ^ (riftRegion(math.max(1, sv.rift and sv.rift.best or 1)) - 1) + 0.5) end
function M.addStone(sv, hi)
  sv.stones = sv.stones or {}
  local n = 0; for _, x in ipairs(sv.stones) do if not x.rev and ((x.hi and 1 or 0) == (hi and 1 or 0)) then n += 1 end end
  local st = { uid = sv.nextUid, hi = hi and 1 or 0 }; sv.nextUid += 1
  if n >= STONE_CAP then local g = floor(M.stoneRevealCost(sv) * 0.2 + 0.5); sv.gold += g; return g end
  sv.stones[#sv.stones + 1] = st; return 0
end
function M.revealStone(sv, uid, rng)
  local st; for _, x in ipairs(sv.stones or {}) do if x.uid == uid then st = x end end
  if not st or st.rev then return false, "확인할 수 없는 돌" end
  local c = M.stoneRevealCost(sv); if sv.gold < c then return false, "골드가 부족합니다" end
  sv.gold -= c; local p = Items.STONE_POOL[rng:NextInteger(1, #Items.STONE_POOL)]
  st.rev = { k = p.k, v = p.v >= 1 and floor(p.v + 0.5) or tonumber(string.format("%.4f", p.v)) }; return true, st.rev
end
function M.socketUsable(it, k)
  for _, a in ipairs(it.affixes or {}) do if a.k == k then return false end end
  for _, s2 in ipairs(it.sock or {}) do if s2 and s2.k == k then return false end end
  return true
end
function M.socketStone(sv, itemUid, stoneUid, idx)   -- idx 는 1부터
  local it
  for _, slot in ipairs(Items.EQ_SLOTS) do if sv.equipped[slot] and sv.equipped[slot].uid == itemUid then it = sv.equipped[slot] end end
  if not it then for _, x in ipairs(sv.inv) do if x.uid == itemUid then it = x end end end
  local st, si; for i, x in ipairs(sv.stones or {}) do if x.uid == stoneUid then st = x; si = i end end
  if not it or not it.sock or not st or not st.rev then return false, "끼울 수 없습니다" end
  if idx < 1 or idx > #it.sock then return false, "소켓이 없습니다" end
  local cur = it.sock[idx]
  if not M.socketUsable(it, st.rev.k) and not (cur and cur.k == st.rev.k) then return false, "이미 같은 옵션이 있어 끼울 수 없습니다" end
  it.sock[idx] = st.rev.hi and { k = st.rev.k, v = st.rev.v, hi = 1 } or { k = st.rev.k, v = st.rev.v }; table.remove(sv.stones, si); return true
end
function M.stoneList(sv)
  local out = {}; for _, x in ipairs(sv.stones or {}) do out[#out + 1] = { uid = x.uid, rev = x.rev, hi = x.hi } end return out
end


-- ---------- 스킬 뽑기 (스킬 상점 대체). 숫자는 여기서만 고친다 ----------
M.GACHA = {
  RATES = { 70, 24, 5, 0.9, 0.1 },   -- 등급별 확률(%): 일반 · 희귀 · 전설 · 신화 · 사탄
  PITY10 = 1,                        -- 10연차: 희귀(1) 이상 1개 보장
  PITY_HARD = 80, PITY_HARD_R = 2,   -- 80회 안에 전설(2) 이상 보장 (카운터는 전설 이상이 나오면 초기화)
  GEM1 = 30, GEM10 = 270,            -- 보석 가격
  ARC1 = 10, ARC10 = 90,             -- 아르카나 조각 가격 (소환 전용 재화, 레벨과 관계없이 고정)
  DUP_ARC = { 1, 2, 5, 15, 40 },     -- 중복인데 이미 최대 레벨이면 아르카나 조각으로 돌려준다
}
function M.gachaGold(sv) return floor(300 * 1.55 ^ (M.skillAct(sv) - 1) + 0.5) end
-- fam = "phys" | "mag" | nil(전체): 계열 소환은 그 계열 공격 스킬 + 계열 없는 스킬(버프 · 치유 · 패시브)만
-- 아르카나 등급은 아르카나마다 고정 (2026-11-03): 같은 아르카나가 더 높은 등급으로 나오지 않고, 등급마다 다른 아르카나가 있다
--   일반 = 1~3단계 · 희귀 = 4~5단계 · 전설 = 6~8단계 · 신화 = 심연 전용(11) · 사탄 = 신화 전용(12) · 패시브는 정해진 등급(pt)
function M.skillTier(d)
  if type(d) == "string" then d = SKILL_BY[d] end
  if not d then return 0 end
  if d.tier then return d.tier end
  if Skills.GACHA_TIER and Skills.GACHA_TIER[d.id] then return Skills.GACHA_TIER[d.id] end
  if d.slot == "passive" then return d.pt or 0 end
  local u = d.unlock or 1
  if d.mythOnly or u >= 12 then return 4 elseif d.voidOnly or u >= 11 then return 3 elseif u >= 6 then return 2 elseif u >= 4 then return 1 end
  return 0
end
-- 아르카나 얻기: 처음이면 새로, 이미 있으면 레벨 +1 (최대 레벨이면 아르카나 조각)
function M.grantSkill(sv, id)
  local r = M.skillTier(id); local res = { id = id, name = SKILL_BY[id] and SKILL_BY[id].name or id, rarity = r }
  local have; for _, k in ipairs(sv.skills) do if k.id == id then have = k; break end end
  if have then
    have.rarity = r
    if (have.lvl or 1) < M.SKILL_MAX_LV then have.lvl = (have.lvl or 1) + 1; res.lvlUp = have.lvl
    else local a = M.GACHA.DUP_ARC[r + 1] or 1; sv.arcana = (sv.arcana or 0) + a; res.dupArc = a end
    res.uid = have.uid
  else
    local k = { uid = sv.nextUid, id = id, rarity = r }; sv.nextUid += 1; sv.skills[#sv.skills + 1] = k; res.new = true; res.uid = k.uid
  end
  return res
end
-- 예전 세이브: 같은 아르카나 여러 장(등급만 다른)을 한 장으로 합친다 (남는 장수만큼 레벨 +, 룬은 돌려줌, 칸 · 프리셋은 남는 장으로)
function M.migrateSkillTiers(sv)
  if (sv.skVer or 1) >= 2 then return end
  local inLo = {}; for _, l in ipairs(sv.loadout or {}) do if l then inLo[l.uid] = true end end
  local keep, remap, out = {}, {}, {}
  for _, k in ipairs(sv.skills or {}) do
    local K = keep[k.id]
    if not K then keep[k.id] = k; out[#out + 1] = k
    else
      local main, other = K, k
      if inLo[k.uid] and not inLo[K.uid] then   -- 칸에 낀 쪽을 남긴다
        main, other = k, K; keep[k.id] = k
        for i, x in ipairs(out) do if x == K then out[i] = k end end
      end
      main.lvl = math.min(M.SKILL_MAX_LV, math.max(main.lvl or 1, other.lvl or 1) + 1)
      if other.rune then if main.rune then local ok, Ex = pcall(require, script.Parent.Extras); if ok then Ex.addRune(sv, other.rune) end else main.rune = other.rune end end
      remap[other.uid] = main.uid
    end
  end
  for _, k in ipairs(out) do k.rarity = M.skillTier(k.id) end
  sv.skills = out
  local function fixLo(lo)
    local seen = {}
    for i, l in ipairs(lo or {}) do if l then l.uid = remap[l.uid] or l.uid; if seen[l.uid] then lo[i] = false else seen[l.uid] = true end end end
  end
  fixLo(sv.loadout); for _, p in ipairs(sv.presets or {}) do if p then fixLo(p.loadout) end end
  sv.skVer = 2
end
local function famOk(d, fam) if not fam then return true end; if d.dtype == "phys" or d.dtype == "mag" then return d.dtype == fam end; return true end
local function gachaPool(sv, fam)
  local out = {}
  local seen = {}
  for _, d in ipairs(Skills.SKILLS) do if Skills.GACHA_TIER and Skills.GACHA_TIER[d.id] and not seen[d.id] and famOk(d, fam) then seen[d.id] = true; out[#out + 1] = d end end
  return out   -- 소환 등급표(data/SkillsEvo.lua GACHA)에 있는 것만, 단계 잠금 없음 (나머지는 보스 · 레이드에서)
end
local function rollRarity(rng, minR)
  local G = M.GACHA; local tot = 0
  for r = (minR or 0), #G.RATES - 1 do tot += G.RATES[r + 1] end
  local x = rng:NextNumber() * tot
  for r = (minR or 0), #G.RATES - 1 do x -= G.RATES[r + 1]; if x <= 0 then return r end end
  return #G.RATES - 1
end
function M.gachaView(sv)
  local G = M.GACHA
  local lv = {}; for _, k in ipairs(sv.skills) do lv[k.id] = math.max(lv[k.id] or 0, k.lvl or 1) end
  local list = {}
  for _, d in ipairs(gachaPool(sv)) do list[#list + 1] = { id = d.id, unlock = d.unlock or 1, tier = M.skillTier(d), own = lv[d.id] and M.skillTier(d) or nil, lvl = lv[d.id] } end
  return { arc1 = G.ARC1, arc10 = G.ARC10, arcana = sv.arcana or 0, gem1 = G.GEM1, gem10 = G.GEM10, rates = G.RATES, pity = sv.gachaPity or 0, pityMax = G.PITY_HARD, gems = sv.gems or 0, pool = #gachaPool(sv), act = M.skillAct(sv), list = list }
end
-- n = 1 | 10, pay = "gold" | "gem"
function M.gachaPull(sv, n, pay, rng, fam)
  if fam ~= "phys" and fam ~= "mag" then fam = nil end
  local G = M.GACHA; n = (n == 10) and 10 or 1
  if pay == "gem" then local c = n == 10 and G.GEM10 or G.GEM1; if (sv.gems or 0) < c then return nil, "보석이 부족합니다" end; sv.gems -= c
  else local c = n == 10 and G.ARC10 or G.ARC1; if (sv.arcana or 0) < c then return nil, "아르카나 조각이 부족합니다" end; sv.arcana -= c end
  local pool = gachaPool(sv, fam); if #pool == 0 then return nil, "뽑을 아르카나가 없습니다" end
  local out, gotHigh = {}, false
  for i = 1, n do
    sv.gachaPity = (sv.gachaPity or 0) + 1
    local minR = 0
    if sv.gachaPity >= G.PITY_HARD then minR = G.PITY_HARD_R end
    if n == 10 and i == 10 and not gotHigh then minR = math.max(minR, G.PITY10) end
    local r = rollRarity(rng, minR)
    if r >= G.PITY10 then gotHigh = true end
    if r >= G.PITY_HARD_R then sv.gachaPity = 0 end
    local tp = {}   -- 굴린 등급의 아르카나들 (그 등급에 고를 것이 없으면 한 단계 아래)
    for rr = r, 0, -1 do for _, d in ipairs(pool) do if M.skillTier(d) == rr then tp[#tp + 1] = d end end; if #tp > 0 then break end end
    if #tp == 0 then tp = pool end
    local dd = tp[rng:NextInteger(1, #tp)]
    out[#out + 1] = M.grantSkill(sv, dd.id)
  end
  return out
end

return M
