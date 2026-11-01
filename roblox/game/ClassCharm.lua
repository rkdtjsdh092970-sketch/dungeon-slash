-- 전직(7개 트리, 속성당 8노드) · 참 (JS class.js 이식)
local Data = script.Parent.Data
local Class = require(Data.Class)
local M = {}
local floor = math.floor

M.NAMES = { "", "각성자", "초월자", "지배자" }
local C_KEYS = { "r", "a1", "a2", "b1", "b2", "c0", "ca", "cb" }
local C_FROM = { r = false, a1 = "r", a2 = "a1", b1 = "r", b2 = "b1", c0 = "r", ca = "a2", cb = "b2" }
M.KEYS = C_KEYS
M.TREES = Class.C_TREES
M.NODES, M.BY_ID = {}, {}
for _, T in ipairs(Class.C_TREES) do
  for _, k in ipairs(C_KEYS) do
    local d = T.n[k]
    if d then
      local id = T.id .. "_" .. k
      local N = { id = id, tree = T.id, k = k, name = d[1], per = d[2], cost = d[3], from = C_FROM[k] and (T.id .. "_" .. C_FROM[k]) or false, desc = d[4] or "" }
      M.NODES[#M.NODES + 1] = N; M.BY_ID[id] = N
    end
  end
end

function M.points(sv) return 2 * math.max(0, math.min(3, sv.cls or 0)) end
function M.spent(sv) local n = 0; for id in pairs(sv.cpass or {}) do if M.BY_ID[id] then n += M.BY_ID[id].cost end end return n end
function M.left(sv) return M.points(sv) - M.spent(sv) end
local function has(sv, id) return sv.cpass and sv.cpass[id] and M.BY_ID[id] ~= nil end
function M.canTake(sv, id) local n = M.BY_ID[id]; return n ~= nil and not has(sv, id) and M.left(sv) >= n.cost and (not n.from or has(sv, n.from)) end
function M.take(sv, id) if not M.canTake(sv, id) then return false end sv.cpass = sv.cpass or {}; sv.cpass[id] = 1; return true end
function M.drop(sv, id)
  if not has(sv, id) then return false end
  for _, n in ipairs(M.NODES) do if n.from == id and has(sv, n.id) then return false end end
  sv.cpass[id] = nil; return true
end
function M.reset(sv) sv.cpass = {} end
function M.advance(sv)
  local n = (sv.cls or 0) + 1
  if n > 3 then return false, "이미 최종 전직입니다" end
  if not sv.cbook or (sv.cbook[n] or 0) <= 0 then return false, n .. "차 전직의 서가 없습니다" end
  sv.cbook[n] -= 1; sv.cls = n; return true, n .. "차 전직 — " .. M.NAMES[n + 1] .. "! 전직 포인트 2점을 얻었습니다"
end
function M.view(sv)
  local trees = {}
  for _, T in ipairs(M.TREES) do
    local nodes = {}
    for _, k in ipairs(C_KEYS) do
      local N = M.BY_ID[T.id .. "_" .. k]
      if N then nodes[#nodes + 1] = { id = N.id, k = k, name = N.name, cost = N.cost, desc = N.desc ~= "" and N.desc or nil, has = has(sv, N.id) or false, can = M.canTake(sv, N.id) } end
    end
    trees[#trees + 1] = { id = T.id, name = T.name, nodes = nodes }
  end
  return { cls = sv.cls or 0, points = M.points(sv), left = M.left(sv), books = sv.cbook or { 0, 0, 0, 0 }, trees = trees }
end

-- ---------- 참 ----------
local CHARM_BY = {}; for _, c in ipairs(Class.CHARMS) do CHARM_BY[c.id] = c end
local BASIC_BY = {}; for _, b in ipairs(Class.CHARM_BASIC) do BASIC_BY[b[1]] = b end
local CHARM_SP = { blood = 2, mana = 1, gold = 2, luck = 2, stone = 1, phoenix = 1, swift = 2, breaker = 2, focus = 1, bulwark = 2, shadow = 2, swarm = 2, hunter = 2, tidy = 1, horn = 2, fang = 2 }
function M.charmUnlocked(sv) return (sv.cls or 0) >= 3 end
function M.genCharm(rng, sv, id)
  local C = id and CHARM_BY[id] or Class.CHARMS[rng:NextInteger(1, #Class.CHARMS)]
  local pool = table.clone(Class.CHARM_BASIC); local b = {}
  for _ = 1, 2 do local k = table.remove(pool, rng:NextInteger(1, #pool)); b[#b + 1] = { k = k[1], r = 0.8 + rng:NextNumber() * 0.4 } end
  local it = { uid = sv.nextUid, sp = C.id, r = 0.85 + rng:NextNumber() * 0.30, b = b }; sv.nextUid += 1
  return it
end
local function rows(it)
  local out = {}
  if it.sp and CHARM_BY[it.sp] then
    local L = CHARM_BY[it.sp].L[CHARM_SP[it.sp]]
    out[1] = { txt = L[1], eff = L[2], fmt = L[3], r = it.r, sp = true }
    for _, x in ipairs(it.b or {}) do local B = BASIC_BY[x.k]; if B then out[#out + 1] = { txt = B[2], eff = { { B[1], B[3] } }, fmt = "p", r = x.r, sp = false } end end
  end
  return out
end
local function fmtVal(R)
  local base = R.eff[1][2]; local v = R.fmt == "f" and base or base * R.r
  if R.fmt == "n" then return tostring(floor(v + 0.5)) end
  if R.fmt == "f" then return tostring(floor(v + 0.5)) end
  return (v < 0.1 and string.format("%.1f", v * 100) or string.format("%.0f", v * 100)) .. "%"
end
function M.lines(it) local o = {}; for _, R in ipairs(rows(it)) do o[#o + 1] = string.gsub(R.txt, "{v}", fmtVal(R)) end return o end
function M.equip(sv, uid, slot)
  if not M.charmUnlocked(sv) then return false, "3차 전직 후에 쓸 수 있습니다" end
  sv.charms = sv.charms or { false, false, false, false }
  local it, idx; for i, x in ipairs(sv.charmInv or {}) do if x.uid == uid then it = x; idx = i end end
  if not it then return false, "없는 참" end
  local s = slot; if not s then for i = 1, 4 do if not sv.charms[i] then s = i; break end end end
  s = s or 1
  local old = sv.charms[s]; sv.charms[s] = it; table.remove(sv.charmInv, idx); if old then sv.charmInv[#sv.charmInv + 1] = old end
  return true
end
function M.unequip(sv, slot) local it = sv.charms and sv.charms[slot]; if not it then return false end sv.charms[slot] = false; sv.charmInv = sv.charmInv or {}; sv.charmInv[#sv.charmInv + 1] = it; return true end
function M.drop_charm(sv, uid) for i, x in ipairs(sv.charmInv or {}) do if x.uid == uid then table.remove(sv.charmInv, i); return true end end return false end
function M.charmView(sv)
  local function card(it) return { uid = it.uid, sp = it.sp, lines = M.lines(it) } end
  local eq, inv = {}, {}
  for i = 1, 4 do local it = sv.charms and sv.charms[i]; eq[i] = it and card(it) or false end
  for _, it in ipairs(sv.charmInv or {}) do inv[#inv + 1] = card(it) end
  return { unlocked = M.charmUnlocked(sv), equipped = eq, inv = inv }
end

return M
