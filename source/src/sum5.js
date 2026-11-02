// =========================================================
// 5.0 아르카나 소환 (로블록스판 Menus.gacha · revealResults)
//  왼쪽: 소환 제단 그림 · 떠 있는 카드 덱 · 등급 확률 · 전설 이상 천장 막대
//  오른쪽: 계열 고르기 (물리 · 마법 · 전체) · 아르카나 조각으로 1회 / 10회
//  뽑으면 덱에서 카드가 날아와 줄을 서고 차례로 뒤집힌다 (신화 이상은 화면 앞으로 크게) · 누르면 한 번에 · 다 보면 누르면 닫힘
// =========================================================
function openSummon() {
  const fam = G.sumFam = G.sumFam || (save.equipped.weapon && save.equipped.weapon.wt === "staff" ? "mag" : "phys");
  const rates = GACHA.RATES.map((p, r) => `<div class="sr5"><i style="background:${SK_RCOL5[r]}"></i><b style="color:${SK_RCOL5[r]}">${SKILL_RARITY[r].name}</b><span>${p}%</span></div>`).join("");
  const pity = save.gachaPity || 0, pmax = GACHA.PITY_HARD;
  const L = `<div class="sl5"><img class="salt5" src="${artURL("summon_altar") || ""}" alt=""><div class="sgl5"></div><img class="sdk5" src="${artURL("summon_deck") || artURL("cardback") || ""}" alt=""><b class="sh5">아르카나 덱</b>
    <div class="srb5">${rates}<div class="spt5">전설 이상 보장 ${pity} / ${pmax}</div><div class="spb5"><i style="width:${(pity / pmax) * 100}%"></i></div></div></div>`;
  const btn = (n, cost, col, sub) => { const ok = save.hone >= cost; return `<button class="btn ${ok ? col : ""} sb5" data-a="spull" data-n="${n}" ${ok ? "" : 'data-no="1"'}><b>${n}회 소환</b><span><img src="${artURL("i_arcana") || ""}" alt=""><em style="color:${ok ? "#ffebc8" : "#ff786e"}">${cost}</em></span>${sub ? `<small>${sub}</small>` : ""}</button>`; };
  const R = `<div class="box5 sr5b"><div class="sfb5"><b>소환 계열 — 물리 아르카나와 마법 아르카나는 따로 뽑습니다</b><div>${[["phys", "물리 · 전사"], ["mag", "마법 · 마법사"], ["all", "전체"]].map(([k, n]) => `<button class="btn ${fam === k ? "gold on" : ""}" data-a="sfam" data-f="${k}" style="flex:${k === "all" ? 1 : 2}">${n}</button>`).join("")}</div></div>
    <div class="sgh5"><img src="${artURL("i_arcana") || ""}" alt=""><b>아르카나 조각  ·  보유 ${fmtN(save.hone)}</b></div><div class="sbr5">${btn(1, GACHA.ARC1, "blue")}${btn(10, GACHA.ARC10, "gold", "희귀 이상 1장 보장")}</div>
    <div class="sft5">아르카나 조각: 전투 승리 · 보스 · 첫 클리어 · 일일 목표 · 퀘스트 · 아르카나 분해<br>같은 아르카나가 또 나오면 레벨이 오릅니다 (다음 레벨까지 현재 레벨만큼).</div></div>`;
  Modal.open(`<h2>아르카나 소환</h2><div class="sum5">${L}${R}</div>`, { cls: "wide", on: {
    sfam: (el) => { G.sumFam = el.dataset.f; openSummon(); },
    spull: (el) => { if (el.dataset.no) { toast("아르카나 조각이 부족합니다", "bad"); snd("error"); return; }
      const deck = $("#mbox .sdk5"), dr = deck && deck.getBoundingClientRect();
      const r = gachaPull(save, +el.dataset.n, fam === "all" ? null : fam); if (!r) return snd("error");
      snd(r.some((x) => x.rarity >= 2) ? "legend" : "buy"); saveGame(); refreshTop(); openSummon();
      sum5Reveal(r, dr ? { x: dr.left + dr.width / 2, y: dr.top + dr.height / 2 } : null); },
  } });
}
function sum5Reveal(res, from) {
  const app = $("#app").getBoundingClientRect(), ov = document.createElement("div"); ov.className = "srv5"; $("#app").appendChild(ov);
  const n0 = res.length, VH = app.height, VW = app.width, H = n0 === 1 ? VH * 0.5 : VH * 0.3, W = H * 2 / 3, gap = W * 0.12, rows = Math.ceil(n0 / 5);
  const slot = (i) => { const r0 = Math.floor(i / 5), c0 = i % 5, inRow = Math.min(5, n0 - r0 * 5); return [VW / 2 + (c0 - (inRow - 1) / 2) * (W + gap), VH / 2 + (r0 - (rows - 1) / 2) * (H + gap) - VH * 0.03]; };
  const sx = from ? from.x - app.left : VW * 0.25, sy = from ? from.y - app.top : VH * 0.5;
  const lab = (g) => g.new ? "NEW" : g.lvlUp ? `Lv.${g.lvlUp}!` : g.dupProg ? `${g.dupProg[0]}/${g.dupProg[1]}` : `+${g.dupHone}`;
  const hint = document.createElement("div"); hint.className = "srh5"; hint.textContent = "누르면 한 번에 모두 뒤집습니다"; ov.appendChild(hint);
  let skip = false, done = false; const cards = [], T = [];
  const later = (ms, f) => { const t = setTimeout(f, skip ? 0 : ms); T.push(t); return t; };
  res.forEach((g, i) => { const [x, y] = slot(i), c = document.createElement("div"); c.className = "src5"; c.style.cssText = `left:${sx}px;top:${sy}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%) scale(.35) rotate(-30deg)`;
    c.innerHTML = `<div class="sbk5"><img src="${artURL("cardback") || ""}" alt=""></div><div class="sfc5">${arcCard(g.id, g.rarity, { badge: lab(g) })}</div>`; ov.appendChild(c); cards.push(c);
    later(30 + i * (n0 === 1 ? 50 : 80), () => { c.style.left = x + "px"; c.style.top = y + "px"; c.style.transform = "translate(-50%,-50%)"; }); });
  const flip = (i) => { const c = cards[i]; if (!c || c.classList.contains("open")) return; c.classList.add("open"); const g = res[i], col = SK_RCOL5[g.rarity];
    if (g.rarity >= 2) { c.style.setProperty("--c", col); c.classList.add("rare"); }
    if (g.rarity >= 3 && !skip) { c.classList.add("big"); ov.classList.add("dim" + g.rarity); const st = document.createElement("div"); st.className = "sst5"; st.style.color = col; st.textContent = SKILL_RARITY[g.rarity].name; ov.appendChild(st); toast(`${SKILL_RARITY[g.rarity].name}! ${SKILLS.find((d) => d.id === g.id).name}`, "ok"); snd("legend");
      later(g.rarity >= 4 ? 2200 : 1700, () => { c.classList.remove("big"); ov.classList.remove("dim3", "dim4"); st.remove(); }); } };
  let t = 30 + n0 * (n0 === 1 ? 50 : 80) + 450;
  res.forEach((g, i) => { later(t, () => flip(i)); t += g.rarity >= 3 ? (g.rarity >= 4 ? 2600 : 2100) : 140; });
  later(t + 300, () => { done = true; hint.textContent = "누르면 닫힙니다"; });
  ov.onclick = () => { if (done) { ov.classList.add("out"); setTimeout(() => ov.remove(), 200); if (typeof tutEvent === "function") tutEvent("pulled"); return; }
    skip = true; T.forEach(clearTimeout); cards.forEach((c, i) => { const [x, y] = slot(i); c.style.transition = "none"; c.style.left = x + "px"; c.style.top = y + "px"; c.style.transform = "translate(-50%,-50%)"; c.classList.remove("big"); flip(i); });
    ov.classList.remove("dim3", "dim4"); ov.querySelectorAll(".sst5").forEach((e) => e.remove()); done = true; hint.textContent = "누르면 닫힙니다"; };
}
