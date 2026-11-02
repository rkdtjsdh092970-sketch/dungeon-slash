-- 졸업 후 콘텐츠 진행 · 보상: 공허의 군주 · 속성 보스 · 심연의 문(레이드) · 레이드 던전 · 돌의 신전 · 보물고 · 무한 균열 · 새 탑
local Data = script.Parent.Data
local CFG = require(Data.Config).CFG
local Items = require(Data.Items)
local SK = require(Data.Skills)
local Mon = require(Data.Monsters)
local Battle = require(script.Parent.Battle)
local Loot = require(script.Parent.Loot)
local Econ = require(script.Parent.Economy)

local M = {}
local floor, max, min = math.floor, math.max, math.min
local UP_TIERS, UP_KEYS = { 196, 203, 210, 217 }, 5
local BOSS_SKILL_RW = { { 12, 42, 42, 4, 0, 0 }, { 8, 28, 55, 9, 0, 0 }, { 6, 18, 67, 9, 0, 0 }, { 5, 12, 70, 13, 0, 0 } }
local BOSS_SKILL_CH = { 0.12, 0.18, 0.28, 0.45 }
local UP_SKILL_RW = { { 0, 0, 0, 0, 90, 10 }, { 0, 0, 0, 0, 80, 20 }, { 0, 0, 0, 0, 68, 32 }, { 0, 0, 0, 0, 55, 45 } }
local UP_SKILL_CH = { 0.15, 0.22, 0.32, 0.50 }
local SRC_BOSS = { void = "void", fire = "hive", phys = "titan", light = "storm", cold = "frost", poison = "poison" }
local MYTH_BOSS = { angelfall = "void", verdict = "void", dragonbreath = "hive", starfall = "storm", skysword = "titan", quake = "titan" }

local function graduated(sv) return sv.rift and sv.rift.best >= CFG.RIFT_END end
M.graduated = graduated
local function wpick(rng, list, wf) local t = 0; for _, x in ipairs(list) do t += wf(x) end; local r = rng:NextNumber() * t; for _, x in ipairs(list) do r -= wf(x); if r <= 0 then return x end end return list[#list] end
local function dayKey() return floor(os.time() / 86400) end

local function bossOfSkill(d)
  if d.slot == "passive" then return nil end
  if d.src then return SRC_BOSS[d.src] or "void" end
  if d.mythOnly then return MYTH_BOSS[d.id] or "void" end
  if d.elem == "fire" or (d.ignite or 0) >= 0.35 then return "hive" end
  if d.elem == "light" or d.shock then return "storm" end
  if d.elem == "cold" then return "frost" end
  if d.elem == "void" then return "void" end
  if d.dtype == "buff" or d.dtype == "heal" or d.kind == "summon" then return "void" end
  if d.dtype == "mag" then return "void" end
  if (d.poison or 0) >= 0.3 then return "poison" end
  if d.kind == "pierce" or d.kind == "spray" or d.kind == "bounce" or d.kind == "shuri" or d.kind == "boomer" then return "storm" end
  return "titan"
end
local function bossSkillList(kind) local o = {}; for _, d in ipairs(SK.SKILLS) do if d.slot ~= "passive" and bossOfSkill(d) == kind then o[#o + 1] = d end end return o end
function M.rollBossSkills(rng, sv, kind, K, upper)
  local out = {}; if not graduated(sv) then return out end
  K = max(1, min(4, floor(K or 1)))
  if rng:NextNumber() >= (upper and UP_SKILL_CH or BOSS_SKILL_CH)[K] then return out end
  local w = (upper and UP_SKILL_RW or BOSS_SKILL_RW)[K]
  local rl = {}; for i = 0, 5 do if (w[i + 1] or 0) > 0 then rl[#rl + 1] = i end end
  local r = wpick(rng, rl, function(i) return w[i + 1] end)
  if rng:NextNumber() < 0.3 then
    local ps = {}; for _, d in ipairs(SK.SKILLS) do if d.slot == "passive" and (d.pt or 0) >= max(1, r - 1) and (d.pt or 0) <= r then ps[#ps + 1] = d end end
    if #ps > 0 then local d = ps[rng:NextInteger(1, #ps)]; out[#out + 1] = { uid = sv.nextUid, id = d.id, rarity = d.pt }; sv.nextUid += 1; return out end
  end
  local all = bossSkillList(kind); local myth, reg = {}, {}
  for _, d in ipairs(all) do if d.mythOnly then myth[#myth + 1] = d else reg[#reg + 1] = d end end
  local pool = (r >= 3 and #myth > 0 and rng:NextNumber() < 0.4) and myth or reg
  if #pool == 0 then return out end
  out[#out + 1] = { uid = sv.nextUid, id = pool[rng:NextInteger(1, #pool)].id, rarity = r }; sv.nextUid += 1
  return out
end

-- 늦은 콘텐츠 장비 드랍
local function lateItems(rng, sv, node, kind, boss, extra)
  local ilvl = ((kind == "craid" and node.diff == 3) or kind == "warden") and 6 or 5
  local n
  if kind == "raid" then n = 8
  elseif kind == "craid" then n = 6 + 2 * (node.diff or 1)
  elseif kind == "void" then n = 2 + max(1, node.vsel or 1)
  elseif Mon.EB[kind] then n = 3 + 2 * (node.vsel or 1)
  elseif kind == "endless" then n = 4 + floor((extra.waves or 0) * 1.2)
  else n = 2 end
  local items = {}
  for _ = 1, max(1, n) do
    if kind == "craid" and rng:NextNumber() < (0.08 + 0.03 * (node.diff or 1)) then items[#items + 1] = Loot.genSatan(rng, sv, ilvl)
    else
      local wts = kind == "craid" and { 10, 25, 35, 30 } or { 30, 40, 25, 5 }
      items[#items + 1] = Loot.genItem(rng, sv, ilvl, wpick(rng, { 0, 1, 2, 3 }, function(x) return wts[x + 1] end))
    end
  end
  return items
end
local OC = { raid = 6, vault = 0.15, craid = nil }
local function orbs(kind, node, waves)
  local v = node.vsel or 1
  local t = { raid = 6, vault = 0.15, hive = 1.5 * v, titan = 1.5 * v, storm = 1.5 * v, frost = 1.5 * v, poison = 1.5 * v, void = 1.5 * v, endless = 3 + waves * 1.4, craid = 3 + 2 * (node.diff or 1) }
  return t[kind] or 0.03
end

-- 입장 · 보상 · 기록까지 한 번에. spec = { kind, vsel, upper, diff, charm }
function M.play(sv, spec, seed)
  local kind = spec.kind
  local EBk = Mon.EB[kind]
  sv.keys = sv.keys or 0; sv.stats = sv.stats or { kills = 0, clears = 0 }
  local node
  local keyField, cost = nil, 0
  if kind == "void" or EBk then
    if not graduated(sv) then return nil, "균열 100층을 졸업해야 합니다" end
    local vs = max(1, min(4, spec.vsel or 1))
    if spec.upper and not (sv.craid and sv.craid[2]) then return nil, "상위 관문은 노말 레이드 클리어 후 열립니다" end
    keyField = kind == "void" and "keys" or EBk.key; cost = spec.upper and UP_KEYS or 1
    if (sv[keyField] or 0) < cost then return nil, "열쇠가 부족합니다 (" .. cost .. "개 필요)" end
    node = { kind = kind, act = 10, tier = spec.upper and UP_TIERS[vs] or 100, vsel = vs, upper = spec.upper and 1 or nil }
  elseif kind == "raid" then
    if not graduated(sv) then return nil, "균열 100층을 졸업해야 합니다" end
    node = { kind = "raid", act = 10, tier = CFG.RIFT_END }
  elseif kind == "temple" then
    if not (sv.raid and sv.raid.cleared > 0) then return nil, "심연의 문지기를 먼저 쓰러뜨려야 합니다" end
    local open = 0; for _, need in ipairs(CFG.TEMPLE.NEED) do if need == 0 or ((sv.spire and sv.spire.best or 0) >= need) then open += 1 end end
    local vs = max(1, min(open, spec.vsel or 1)); node = { kind = "temple", act = 10, tier = CFG.TEMPLE.TIERS[vs], vsel = vs }
  elseif kind == "vault" then
    if not graduated(sv) then return nil, "균열 100층을 졸업해야 합니다" end
    node = { kind = "vault", act = 10 }
  elseif kind == "endless" then
    if not graduated(sv) then return nil, "균열 100층을 졸업해야 합니다" end
    sv.endless = sv.endless or { day = 0, used = 0, best = 0, bestKills = 0 }
    if sv.endless.day ~= dayKey() then sv.endless.day = dayKey(); sv.endless.used = 0 end
    if sv.endless.used >= CFG.ENDLESS_DAILY + Econ.atlasVal(sv, "endless") then return nil, "오늘의 무한 균열 입장 횟수를 모두 썼습니다" end
    sv.endless.used += 1
    node = { kind = "endless", act = 10, tier = max(1, sv.rift.best - 2) }
  elseif kind == "craid" then
    if not (sv.raid and sv.raid.tower) then return nil, "탑이 솟은 뒤에 열립니다" end
    local open = 1 + ((sv.craid and sv.craid[1] == 1) and 1 or 0) + ((sv.craid and sv.craid[1] == 1 and sv.craid[2] == 1) and 1 or 0)
    local d = max(1, min(open, spec.diff or 1))
    if spec.charm then
      if not (sv.craid and sv.craid[3] == 1 and (sv.cls or 0) >= 3) then return nil, "하드 레이드 클리어 + 3차 전직 후에 열립니다" end
      d = 3
    end
    node = { kind = "craid", act = 10, diff = d, tier = CFG.CRAID.TIERS[d + 1], charm = spec.charm }
  else return nil, "알 수 없는 콘텐츠" end

  if keyField then sv[keyField] -= cost end
  local rng = Random.new((seed or os.time()) + (sv.nextUid or 1))
  local b = Battle.run(sv, node, rng:NextInteger(1, 2 ^ 30), 0.05, 2400)
  local endless = kind == "endless"
  local win = b.win or endless
  local waves = endless and floor(b.ddt / 30) or 0
  local res = { win = win, time = b.time, kills = b.kills, kind = kind, items = {}, skills = {}, gold = floor(b.gold) * (win and 1 or 0.5) // 1, notes = {} }
  sv.gold += res.gold; sv.stats.kills += b.kills
  -- 열쇠 몹
  local function keyGain(field, n) if n and n > 0 then sv[field] = (sv[field] or 0) + n; res[field] = n end end
  keyGain("keys", b.keys); keyGain("keys2", b.keys2); keyGain("keys3", b.keys3); keyGain("keys4", b.keys4); keyGain("keys5", b.keys5); keyGain("keys6", b.keys6)
  if not win then return res end
  sv.stats.clears += 1
  if endless then
    local E = sv.endless; if b.time > E.best then E.best = floor(b.time) end; if b.kills > E.bestKills then E.bestKills = b.kills end
    res.waves = waves; res.notes[#res.notes + 1] = string.format("무한 균열: %d초 생존, %d마리 처치 (%d웨이브)", floor(b.time), b.kills, waves)
  end
  if kind == "raid" then
    sv.raid = sv.raid or { cleared = 0, best = 0 }; local first = (sv.raid.cleared or 0) == 0; sv.raid.cleared += 1
    if sv.raid.best == 0 or b.time < sv.raid.best then sv.raid.best = floor(b.time) end
    if first then sv.raid.tower = 1; res.notes[#res.notes + 1] = "🏆 심연의 문지기를 처음으로 쓰러뜨렸습니다! 붉은 탑이 솟아오릅니다." end
    res.first = first
  end
  if kind == "craid" and not spec.charm then
    sv.craid = sv.craid or { 0, 0, 0, 0 }; sv.cbook = sv.cbook or { 0, 0, 0, 0 }
    if sv.craid[node.diff] ~= 1 then sv.craid[node.diff] = 1; sv.cbook[node.diff] += 1; res.first = true; res.notes[#res.notes + 1] = "📜 " .. node.diff .. "차 전직의 서를 얻었습니다! (레이드 " .. CFG.CRAID.NAMES[node.diff + 1] .. " 최초 클리어)" end
  end
  -- 드랍
  if kind == "craid" and spec.charm then
    res.charms = {}
    local ok, Class = pcall(function() return require(script.Parent.ClassCharm) end)
    if ok then for _ = 1, (rng:NextNumber() < 0.4) and 2 or 1 do local c = Class.genCharm(rng, sv); sv.charmInv = sv.charmInv or {}; sv.charmInv[#sv.charmInv + 1] = c; res.charms[#res.charms + 1] = c end end
    return res
  end
  if kind ~= "vault" then
    local boss = true
    for _, it in ipairs(lateItems(rng, sv, node, kind, boss, { waves = waves })) do if #sv.inv < 200 then sv.inv[#sv.inv + 1] = it; res.items[#res.items + 1] = { title = it.sat and "사탄 장비" or "장비" } else res.full = true end end
  end
  if kind == "void" or EBk then for _, k in ipairs(M.rollBossSkills(rng, sv, kind, node.vsel or 1, node.upper)) do sv.skills[#sv.skills + 1] = k; res.skills[#res.skills + 1] = k.id end end
  if kind == "raid" then
    local ks = { "void", "hive", "titan", "storm", "frost", "poison" }
    local got = M.rollBossSkills(rng, sv, ks[rng:NextInteger(1, #ks)], 4)
    for i = 1, 30 do if #got > 0 or not res.first then break end; got = M.rollBossSkills(rng, sv, ks[rng:NextInteger(1, #ks)], 4) end
    for _, k in ipairs(got) do sv.skills[#sv.skills + 1] = k; res.skills[#res.skills + 1] = k.id end
  end
  if kind == "temple" then
    local ch = min(0.5, CFG.TEMPLE.HI[node.vsel])
    if rng:NextNumber() < ch then Econ.addStone(sv, true); res.stonesHi = 1 end
    if rng:NextNumber() < ch then sv.sockTix = (sv.sockTix or 0) + 1; res.sockTix = 1 end
    res.items = {}
    return res
  end
  -- 재화
  local ore = floor(rng:NextInteger(1, 2) + 4 + floor((node.tier or 0) / 3) + waves * 2 + 0.5)
  sv.ore += ore; res.ore = ore
  local shards = floor((1 + floor((node.tier or 1) / 6) + 3 + waves + (kind == "void" and 2 * (node.vsel or 1) or 0)) * (1 + Econ.atlasVal(sv, "shard")) + 0.5)
  sv.shards = (sv.shards or 0) + shards; res.shards = shards
  local oc = orbs(kind, node, waves)
  local c = floor(oc) + (rng:NextNumber() < oc - floor(oc) and 1 or 0); sv.orbC = (sv.orbC or 0) + c; res.orbC = c
  local od = oc * 0.05; local d = floor(od) + (rng:NextNumber() < od - floor(od) and 1 or 0); sv.orbD = (sv.orbD or 0) + d
  -- 원초의 돌
  if kind == "void" or EBk or kind == "endless" or kind == "raid" then
    local chance = kind == "raid" and 2.0 or 1.2; local cnt = 0
    for _ = 1, 1 + (chance > 1 and 1 or 0) do if rng:NextNumber() < min(1, chance) then cnt += 1 end end
    for _ = 1, cnt do Econ.addStone(sv, false) end; res.stones = cnt
  end
  return res
end

-- ---------- 새 문지기 (실시간: 서버가 단계를 진행하고 클라이언트가 구슬을 누른다) ----------
local sessions = {}
function M.wardenOpen(sv) return sv.spire ~= nil and sv.spire.best >= 100 end
function M.wardenStart(sv, uid, seed)
  if not M.wardenOpen(sv) then return nil, "탑 100층을 클리어해야 합니다" end
  if sessions[uid] then return nil, "이미 도전 중입니다" end
  local node = { kind = "warden", act = 10, tier = CFG.WARDEN.TIER }
  local b = Battle.new(sv, node, (seed or os.time()) + (sv.nextUid or 1))
  sessions[uid] = { b = b, sv = sv, t = os.clock() }
  return true
end
function M.wardenState(uid)
  local S = sessions[uid]; if not S then return nil end
  local b = S.b; local boss = b.bossRef
  return { over = b.over, win = b.win, time = b.time, hp = b.hp / b.maxHp, bossHp = boss and boss.hp / boss.maxHp or 0, orbs = Battle.orbView(b), pop = b.wPop, boom = b.wBoom, limit = CFG.WARDEN.LIMIT }
end
function M.wardenPop(uid, id) local S = sessions[uid]; return S and Battle.pop(S.b, id) or false end
function M.wardenTickAll(dt)   -- 서버가 주기적으로 호출 (0.05초)
  for uid, S in pairs(sessions) do if not S.b.over then Battle.step(S.b, dt) end end
end
function M.wardenFinish(sv, uid, seed)
  local S = sessions[uid]; if not S or not S.b.over then return nil, "아직 진행 중입니다" end
  local b = S.b; sessions[uid] = nil
  local res = { win = b.win, time = b.time, kills = b.kills, items = {}, notes = {}, pop = b.wPop, boom = b.wBoom, gold = 0 }
  res.gold = floor(b.gold * (b.win and 1 or 0.5)); sv.gold += res.gold
  if not b.win then return res end
  sv.warden = sv.warden or { clears = 0, best = 0, pops = 0 }
  sv.warden.clears += 1; sv.warden.pops += b.wPop
  if sv.warden.best == 0 or b.time < sv.warden.best then sv.warden.best = floor(b.time) end
  res.notes[#res.notes + 1] = string.format("문지기 처치! %d초 (구슬 %d개 처치, 폭발 %d회)", floor(b.time), b.wPop, b.wBoom)
  local rng = Random.new((seed or os.time()) + (sv.nextUid or 1))
  for _ = 1, 10 do
    local it
    if rng:NextNumber() < 0.30 then it = Loot.genSatan(rng, sv, 6)
    else it = Loot.genItem(rng, sv, 6, wpick(rng, { 0, 1, 2, 3 }, function(x) return ({ 0, 10, 40, 50 })[x + 1] end)) end
    if #sv.inv < 200 then sv.inv[#sv.inv + 1] = it; res.items[#res.items + 1] = { title = it.sat and "사탄 장비" or "장비" } else res.full = true end
  end
  sv.ore += 8; sv.orbC = (sv.orbC or 0) + 8; res.orbC = 8
  return res
end
function M.wardenAbort(uid) sessions[uid] = nil end

-- ---------- 새 탑 (T6 사탄 · 20층) ----------
function M.tower2Open(sv) return sv.warden ~= nil and sv.warden.best > 0 and (sv.cls or 0) >= 3 end
function M.tower2(sv, floorN, seed)
  if not M.tower2Open(sv) then return nil, "새 탑은 문지기를 넘고 최종 전직을 마친 뒤에 열립니다" end
  sv.spire2 = sv.spire2 or { best = 0 }
  floorN = floor(floorN or 1)
  if floorN < 1 or floorN > CFG.SPIRE.END2 or floorN > sv.spire2.best + 1 then return nil, "도전할 수 없는 층입니다" end
  local node = { kind = "spire", act = 10, floor = floorN, tier = Battle.spireTier(floorN, 2), tw = 2 }
  local rng = Random.new((seed or os.time()) + (sv.nextUid or 1))
  local b = Battle.run(sv, node, rng:NextInteger(1, 2 ^ 30), 0.05, 700)
  local res = { win = b.win, time = b.time, floor = floorN, kills = b.kills, items = {}, gold = 0 }
  if b.win then
    res.gold = floor(b.gold); sv.gold += res.gold; sv.stats.kills += b.kills
    local first = floorN > sv.spire2.best; if first then sv.spire2.best = floorN; res.first = true end
    for _, it in ipairs(Loot.spireDrops(rng, sv, node, floorN % 5 == 0, first)) do if #sv.inv < 200 then sv.inv[#sv.inv + 1] = it; res.items[#res.items + 1] = { title = it.sat and "사탄 장비" or "장비" } else res.full = true end end
  else res.gold = floor(b.gold * 0.5); sv.gold += res.gold end
  return res
end

M.UP_TIERS = UP_TIERS; M.UP_KEYS = UP_KEYS
return M
