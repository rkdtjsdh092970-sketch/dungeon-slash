// =========================================================
// UI 확장: 가이드 / 월드 버프 / 스킬 상점 / 패시브 / 심연 각인 / 고유 획득 연출
// =========================================================
function setGuide(html) { const g = $("#guide"); if (!html) { g.classList.add("hidden"); return; } g.innerHTML = html; g.classList.remove("hidden"); }

function updateWorld() {
  const el = $("#t-world"); if (!el) return;
  if (!save || !save.endgame) { el.innerHTML = ""; return; }
  const now = Date.now(), ws = worldSlot(now);
  if (G.wslot !== ws) { if (G.wslot >= 0) { toast("월드 버프와 지옥 스테이지가 바뀌었습니다!", "ok"); snd("quest"); if (G.screen === "map") mapPanel(); } G.wslot = ws; }
  el.innerHTML = worldBuffs(now).map((w) => `<span class="wb" title="${w.name}: ${w.text}">${iconImg(w.ico, 1)} ${w.text}</span>`).join("") + `<span class="wt">갱신 ${fmtTime(worldLeft(now))}</span>`;
}

// ---------- 스킬 상점 ----------
const SHOP_TABS = [["all", "전체"], ["basic", "기본 공격"], ["single", "단일"], ["aoe", "범위"], ["boss", "보스"], ["support", "지원·소환"], ["passive", "패시브"]];
const shopTabOf = (d) => d.slot === "basic" ? "basic" : d.slot === "passive" ? "passive" : d.bonus && d.bonus.boss >= 0.8 ? "boss" : ["buff", "heal", "summon"].includes(d.kind) ? "support" : d.kind === "single" ? "single" : "aoe";
let SHOP_TAB = "all";
function openSkillShop() {
  const stock = shopStock(save), cnt = {}; stock.forEach((o) => { const t = shopTabOf(SKILLS.find((x) => x.id === o.id)); cnt[t] = (cnt[t] || 0) + 1; });
  const tabs = SHOP_TABS.map(([k, n]) => `<button class="btn xs ${SHOP_TAB === k ? "pri" : ""}" data-a="stab" data-n="${k}">${n} ${k === "all" ? stock.length : cnt[k] || 0}</button>`).join(" ");
  const cards = stock.map((o, i) => {
    if (SHOP_TAB !== "all" && shopTabOf(SKILLS.find((x) => x.id === o.id)) !== SHOP_TAB) return "";
    const d = SKILLS.find((x) => x.id === o.id), R = SKILL_RARITY[o.rarity], bought = false, can = save.gold >= o.price;
    return `<div class="shopcard ${bought ? "sold" : ""}"><div class="sc-h">${skIcon(d.id, 3)}<div><div class="${R.cls}"><b>${R.name} ${d.name}</b></div><small class="dim">${d.slot === "basic" ? "기본 공격" : "액티브"} · 쿨 ${(d.cd * R.cdMul).toFixed(1)}s · 피해 ${Math.round(d.mult * R.mult * 100)}%</small></div></div>
      <div class="dim sc-d">${d.desc}</div><div>${skillAreaHtml(skillOf({ id: d.id, rarity: o.rarity, uid: 0 }), 10)}</div><div class="dim" style="font-size:11px">${skillDescFull(skillOf({ id: d.id, rarity: o.rarity, uid: 0 }))}</div>${bought ? `<button class="btn" disabled>구매 완료</button>` : `<button class="btn pri" data-a="buy" data-n="${i}" ${can ? "" : "disabled"}>${iconImg("gold", 1)} ${fmtN(o.price)}</button>`}</div>`;
  }).join("");
  Modal.open(`<h2>스킬 상점</h2><div class="res">${iconImg("gold", 1)} ${fmtN(save.gold)}</div><div class="dim center">일반 등급 스킬을 전부 판매합니다 · 원하는 스킬을 골라 구매하세요 (같은 스킬 여러 개 구매 가능) · 높은 등급은 100층 졸업 후 보스에게서</div><div class="center" style="margin:6px 0">${tabs}</div><div class="shopgrid">${cards || '<div class="dim center pad" style="grid-column:1/-1">이 분류에는 판매 중인 스킬이 없습니다</div>'}</div>`, { cls: "wide", on: {
    stab: (el) => { SHOP_TAB = el.dataset.n; openSkillShop(); },
    buy: (el) => { if (buySkill(save, +el.dataset.n)) { snd("buy"); toast("스킬을 구매했습니다", "ok"); saveGame(); refreshTop(); } else snd("error"); openSkillShop(); },
  } });
}

// ---------- 훈련소 (패시브 트리) ----------

// ---------- 심연 각인 (엔드게임 재화 트리) ----------
function openAtlas() {
  const rows = ATLAS.map((n) => {
    const r = (save.atlas[n.id] || 0), cost = r < n.max ? atlasCost(n, r) : 0;
    return `<div class="arow"><div class="ai"><b>${n.name}</b> <span class="dim">${r}/${n.max}</span><div class="dim">${n.text} · 현재 +${Math.round(r * n.per * (n.unit === "%" ? 100 : 1))}${n.unit}</div><div class="bar"><i style="width:${(r / n.max) * 100}%"></i></div></div>
      <button class="btn xs" data-a="abuy" data-n="${n.id}" ${r >= n.max || save.shards < cost ? "disabled" : ""}>${r >= n.max ? "최대" : `${iconImg("shard", 1)} ${cost}`}</button></div>`;
  }).join("");
  Modal.open(`<h2>심연 각인</h2><div class="res">${iconImg("shard", 1)} ${fmtN(save.shards)}</div><div class="dim center">균열 조각으로 영구 보너스를 새깁니다. 한 단계는 작지만 모두 새기면 큽니다.</div><div class="qlist">${rows}</div>`, { cls: "wide", on: {
    abuy: (el) => { if (buyAtlas(save, el.dataset.n)) { snd("legend"); toast("각인을 새겼습니다", "ok"); saveGame(); refreshTop(); } else snd("error"); openAtlas(); },
  } });
}

// ---------- 고유 장비 획득 연출 (등급마다 다른 연출) ----------
function showUniqueFx(items, done, idx) {
  idx = idx || 0; const el = $("#unique");
  if (idx >= items.length) { el.classList.add("hidden"); el.innerHTML = ""; return done(); }
  const it = items[idx], U = UNIQUE_BY_ID[it.uniq] || { name: "고유 장비", mods: [], flavor: "", pool: "common", tier: 1 }, TI = tierOfItem(it), TC = U_TIERS[TI].color;
  el.classList.remove("hidden");
  el.innerHTML = `<canvas id="ufx" width="960" height="540"></canvas><div class="utxt"><div class="u1"><span class="tn${TI}">✦ ${U_TIERS[TI].name} 고유 획득 ✦</span></div><div class="u2">${UNIQUE_BY_ID[it.uniq] ? uniqueIconImg(it.uniq, 8) : iconImg(it.slot, 8)}</div><div class="u3"><span class="tn${TI}">${U.name}</span></div><div class="u4">${SLOT_NAME[it.slot]} · Lv.${it.ilvl}${items.length > 1 ? ` · ${idx + 1}/${items.length}` : ""}</div><div class="u5">${uniqueLines(U, it.umods).map((t) => `<div>${t}</div>`).join("")}</div><div class="u6">“${U.flavor}”</div><div class="u7">클릭하여 계속 · 잠시 후 자동으로 닫힙니다</div></div>`;
  snd(TI >= 3 ? "unique2" : "unique");
  const app = $("#app"); app.classList.remove("shake"); if (TI >= 2) { void app.offsetWidth; app.classList.add("shake"); setTimeout(() => app.classList.remove("shake"), TI === 4 ? 1400 : 700); }
  const cv = $("#ufx"), g = cv.getContext("2d"), r = seeded(it.uid * 7 + 3), W = 960, H = 540, cx = W / 2, cy = 215, P = [];
  const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }, [cr, cg, cb] = rgb(TC), col = (a) => `rgba(${cr},${cg},${cb},${a})`;
  // 등급별 입자 초기화
  if (TI === 1) for (let i = 0; i < 70; i++) P.push({ x: r() * W, y: H + r() * 80, vx: (r() - 0.5) * 20, vy: -30 - r() * 70, s: 2 + (r() * 4 | 0), life: 3 + r() * 3, t: r() * 3, c: r() < 0.5 ? "#cfe8ff" : "#8ec5ff" });
  if (TI === 2) for (let i = 0; i < 130; i++) { const a = r() * 6.283, d = 420 + r() * 200; P.push({ a, d, sp: 0.8 + r() * 0.6, s: 3 + (r() * 3 | 0), c: r() < 0.4 ? "#fff" : r() < 0.7 ? "#c58bff" : "#8a4aff", burst: false, vx: 0, vy: 0, x: 0, y: 0, life: 0 }); }
  if (TI === 3) for (let i = 0; i < 90; i++) P.push({ x: cx + (r() - 0.5) * 500, y: -r() * 400, vy: 140 + r() * 260, vx: (r() - 0.5) * 60, s: 4 + (r() * 3 | 0), c: r() < 0.5 ? "#ffe27a" : "#ffb020", bounce: 0, rot: r() * 6 });
  if (TI === 4) { for (let i = 0; i < 70; i++) P.push({ x: r() * W, y: -r() * 500, vy: 50 + r() * 90, vx: (r() - 0.5) * 40, l: 10 + r() * 14, w: 3 + r() * 3, ph: r() * 6, c: "#ffffff", f: true }); for (let i = 0; i < 160; i++) { const a = r() * 6.283, sp = 100 + r() * 700; P.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 3 + (r() * 5 | 0), life: 1.5 + r() * 2.5, t: 0, c: ["#fff", "#ff8a8a", "#8aff9a", "#8ad8ff", "#c58bff", "#ffe27a"][(r() * 6) | 0] }); } }
  let t = 0, last = performance.now(), ready = false, closed = false, raf = 0, autoT = 0;
  const rays = (n, speed, alpha, len, tint) => { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + t * speed, w = 0.05 + 0.03 * Math.sin(t * 2 + i); g.fillStyle = tint ? tint(i) : col(alpha); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len); g.lineTo(cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len); g.fill(); } };
  const glow = (a, rad) => { const rg = g.createRadialGradient(cx, cy, 10, cx, cy, rad); rg.addColorStop(0, col(a)); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H); };
  const ring = (t0, speed, w, c) => { const k = t - t0; if (k > 0 && k < 1.6) { g.strokeStyle = c(1 - k / 1.6); g.lineWidth = w * (1 - k / 1.6) + 1; g.beginPath(); g.arc(cx, cy, k * speed, 0, 7); g.stroke(); } };
  const frame = (ms) => {
    if (closed) return; const dt = Math.min(0.05, (ms - last) / 1000); last = ms; t += dt; g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(6,2,14,${Math.min(0.8, t * 2)})`; g.fillRect(0, 0, W, H);
    if (TI === 1) {   // 미스틱: 푸른 안개와 잔잔한 파동
      glow(0.4 * Math.min(1, t * 1.5), 480); rays(10, 0.15, 0.1 * Math.min(1, t), 800);
      for (let i = 0; i < 6; i++) { const mx = (i * 190 + t * 24) % 1100 - 70, my = 330 + Math.sin(t + i) * 30; const mg = g.createRadialGradient(mx, my, 10, mx, my, 150); mg.addColorStop(0, "rgba(140,190,255,.10)"); mg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = mg; g.fillRect(mx - 150, my - 150, 300, 300); }
      ring(0.1, 520, 5, (a) => `rgba(160,210,255,${a})`); ring(0.5, 520, 3, (a) => `rgba(160,210,255,${a * 0.7})`);
      for (const p of P) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y < -10) { p.y = H + 10; p.x = r() * W; } g.globalAlpha = 0.6; g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, p.s, p.s); } g.globalAlpha = 1;
    } else if (TI === 2) {   // 이터널: 보랏빛 소용돌이가 모였다가 폭발
      const conv = Math.min(1, t / 1.2);
      glow(0.25 + 0.4 * conv, 520);
      for (const p of P) { if (!p.burst) { p.a += dt * (2 + 4 * conv) * p.sp; const d = p.d * (1 - conv * 0.98); g.fillStyle = p.c; g.globalAlpha = 0.5 + 0.5 * conv; g.fillRect((cx + Math.cos(p.a) * d) | 0, (cy + Math.sin(p.a) * d * 0.6) | 0, p.s, p.s); if (t > 1.2) { p.burst = true; const a = r() * 6.283, sp = 120 + r() * 520; p.x = cx; p.y = cy; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = 1.4 + r() * 2; p.t = 0; } } else { p.t += dt; if (p.t < p.life) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, p.s, p.s); } } } g.globalAlpha = 1;
      if (t > 1.2) { rays(14, 0.35, 0.18, 900); ring(1.2, 700, 9, (a) => `rgba(220,170,255,${a})`); ring(1.4, 700, 5, (a) => `rgba(255,200,255,${a * 0.8})`); if (t < 1.4) { g.fillStyle = `rgba(230,200,255,${(1.4 - t) / 0.2 * 0.7})`; g.fillRect(0, 0, W, H); } }
    } else if (TI === 3) {   // 소버린: 황금 빛기둥, 왕관, 쏟아지는 금화
      const bw = 40 + Math.min(1, t * 2) * 110; const bg = g.createLinearGradient(cx - bw, 0, cx + bw, 0); bg.addColorStop(0, "rgba(255,200,60,0)"); bg.addColorStop(0.5, `rgba(255,236,160,${0.55 * Math.min(1, t * 3)})`); bg.addColorStop(1, "rgba(255,200,60,0)"); g.fillStyle = bg; g.fillRect(cx - bw, 0, bw * 2, cy + 40);
      glow(0.55, 540); rays(24, 0.4, 0.17, 950);
      if (t < 0.8) { g.fillStyle = `rgba(255,240,180,${(0.8 - t) / 0.8})`; g.fillRect(0, 0, W, H); }
      ring(0.1, 700, 10, (a) => `rgba(255,226,122,${a})`); ring(0.35, 700, 6, (a) => `rgba(255,180,40,${a})`); ring(0.6, 700, 3, (a) => `rgba(255,255,200,${a})`);
      g.font = "bold 70px sans-serif"; g.textAlign = "center"; g.fillStyle = `rgba(255,226,122,${Math.max(0, 1 - Math.abs(t - 0.7) * 1.6)})`; g.fillText("♛", cx, 95);
      for (const p of P) { p.y += p.vy * dt; p.x += p.vx * dt; p.vy += 520 * dt; if (p.y > H - 14 && p.bounce < 2) { p.y = H - 14; p.vy *= -0.45; p.bounce++; } if (p.y > H + 20) { p.y = -20 - r() * 200; p.vy = 140 + r() * 200; p.bounce = 0; p.x = cx + (r() - 0.5) * 700; } g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, p.s, p.s * 1.3); }
    } else {   // 엔젤릭: 눈부신 백색 섬광, 무지개 광선, 후광, 깃털
      const fl = Math.max(0, 1 - t / 1.0); glow(0.7, 600);
      rays(30, 0.28, 0, 1000, (i) => `hsla(${(i * 12 + t * 80) % 360},90%,75%,${0.22 * Math.min(1, t * 2)})`);
      for (let k = 0; k < 4; k++) { const rr0 = 150 + k * 50 + Math.sin(t * 2 + k) * 8; g.strokeStyle = `hsla(${(t * 90 + k * 70) % 360},90%,80%,${0.6 - k * 0.1})`; g.lineWidth = 5 - k; g.beginPath(); g.ellipse(cx, cy - 20, rr0, rr0 * 0.28, 0, 0, 7); g.stroke(); }
      ring(0.1, 800, 12, (a) => `rgba(255,255,255,${a})`); ring(0.5, 800, 8, (a) => `rgba(255,230,160,${a})`); ring(0.9, 800, 5, (a) => `rgba(160,220,255,${a})`);
      if (fl > 0) { g.fillStyle = `rgba(255,255,255,${fl})`; g.fillRect(0, 0, W, H); }
      for (const p of P) { if (p.f) { p.y += p.vy * dt; p.x += Math.sin(t * 2 + p.ph) * 40 * dt; if (p.y > H + 20) { p.y = -20; p.x = r() * W; } g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(t * 2 + p.ph) * 0.6); g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(-p.w / 2, 0, p.w, p.l); g.fillStyle = "rgba(255,230,200,.9)"; g.fillRect(-1, 0, 2, p.l); g.restore(); } else { p.t += dt; if (p.t > p.life) { if (t < 7) { p.t = 0; p.x = r() * W; p.y = H + 10; p.vx = (r() - 0.5) * 40; p.vy = -60 - r() * 120; p.life = 2 + r() * 2; } continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy = p.vy * 0.985 - 18 * dt; g.globalAlpha = Math.max(0, 1 - p.t / p.life); g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, p.s, p.s); g.globalAlpha = 1; } }
      for (let i = 0; i < 24; i++) { const sx = (i * 97) % W, sy = (i * 53) % 260; g.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(t * 3 + i))})`; g.fillRect(sx, sy, 3, 3); }
    }
    if (!ready && t > (TI === 4 ? 2.2 : TI === 1 ? 1.2 : 1.6)) { ready = true; el.classList.add("ready"); autoT = setTimeout(close, (save && save.auto && save.auto.on ? 2 : 3.5) * 1000); }   // 몇 초 뒤 저절로 닫힌다 (자동 반복이 멈추지 않게)
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame); el.classList.remove("ready");
  const close = () => { if (!ready || closed) return; closed = true; clearTimeout(autoT); cancelAnimationFrame(raf); el.removeEventListener("click", close); document.removeEventListener("keydown", kd); snd("click"); showUniqueFx(items, done, idx + 1); };
  const kd = (e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") close(); };
  el.addEventListener("click", close); document.addEventListener("keydown", kd);
}
