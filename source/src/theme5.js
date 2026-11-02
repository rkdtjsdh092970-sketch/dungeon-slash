// =========================================================
// 5.0 UI 테마 (로블록스판 Skin.lua 와 같은 UI 키트): 창 틀 · 그림 버튼 · 탭 · 닫기 · 제목 띠 · 구분선 · 상단 메뉴 아이콘
// 그림은 webart/ui_*.png (roblox/art/ui 원본). 9-slice = CSS border-image
// =========================================================
(function theme5() {
  const U = (k) => `url("${ART_BASE}ui_${k}.png")`;
  const css = `
  #mbox{background:${U("panel")} center/100% 100% no-repeat, #120c10 !important;border:18px solid transparent !important;border-image:${U("panel")} 120 fill / 18px stretch !important;border-radius:0 !important;padding:6px 10px !important;box-shadow:0 10px 40px #000 !important}
  #mbox h2{font-family:Georgia,"Times New Roman",serif;color:#f0d08a !important;letter-spacing:1px;text-shadow:0 2px 0 #000,0 0 10px #c08a3a66;background:${U("header")} center/100% 100% no-repeat;padding:6px 40px 8px;margin:-4px auto 8px !important;max-width:520px}
  .btn{background:transparent !important;border:10px solid transparent !important;border-image:${U("btn_gray")} 36 fill / 10px stretch !important;border-radius:0 !important;box-shadow:none !important;color:#f5e8cd !important;text-shadow:0 1px 2px #000;padding:2px 8px !important}
  .btn.pri{border-image:${U("btn_red")} 36 fill / 10px stretch !important}
  .btn.big{padding:6px 14px !important}
  .btn:hover:not([disabled]){filter:brightness(1.18)}
  .btn[disabled]{filter:grayscale(.7) brightness(.7)}
  .btn.xs{border-width:7px !important;border-image-width:7px !important;padding:0 5px !important}
  .tab{background:transparent !important;border:8px solid transparent !important;border-image:${U("tab")} 30 fill / 8px stretch !important;border-radius:0 !important;color:#d8c8a8 !important}
  .tab.on{border-image:${U("tab_on")} 30 fill / 8px stretch !important;color:#fff4d8 !important}
  #mbox > .x{width:30px;height:30px;font-size:0 !important;background:${U("close")} center/contain no-repeat !important;border:0 !important;top:-6px !important;right:-6px !important;z-index:5}
  #top{background:linear-gradient(#1c0e0ef4,#0e0808e8) !important;border-bottom:2px solid #8a6a38 !important;box-shadow:0 2px 0 #000,0 4px 14px #0008}
  #top .btn{border-width:6px !important;border-image-width:6px !important;padding:1px 3px !important;font-size:12px !important;margin:0 !important}
  #top .btn .mi{width:18px;height:18px;vertical-align:-4px;margin-right:1px}
  .tabs .tab,.itabs .tab{margin:1px}
  .skdet,.sks,.skg,.sumc,.advb,.rs-chip,.rs-stat,.shopcard{background-color:#1a1012 !important;border-color:#6a4a2a !important}
  .sks.cursel,.skg.picked{border-color:#f0c060 !important}
  .tile{background-color:#1c1214 !important;border-color:#5a4030}
  select,input[type=text],input[type=number]{background:#1a1012 !important;color:#f0e0c8 !important;border:1px solid #7a5a34 !important;border-radius:3px}
  #mbox h3{color:#e8c47a}
  #mappanel{background:linear-gradient(#1c1010f0,#100808f0) !important;border:2px solid #8a6a38 !important}
  #guide,#tutBox{background:#160c0cf2 !important;border-color:#c09048 !important}
  .col,.c2,.c1,.c3{background-color:#140c0e !important;border-color:#5a4028 !important}
  `;
  // 예전 보라색 계열 색을 로블록스판 검붉은 · 갈색 계열로 바꾼다 (스타일시트의 배경 · 테두리 색)
  const warm = (hex) => {
    let h = hex.slice(1); if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join(""); const a = hex.length === 9 ? hex.slice(7) : hex.length === 5 ? hex[4] + hex[4] : "";
    let r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, B = parseInt(h.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, B), mn = Math.min(r, g, B), l = (mx + mn) / 2, d = mx - mn; if (d < 0.04) return hex;
    let hu = mx === r ? ((g - B) / d) % 6 : mx === g ? (B - r) / d + 2 : (r - g) / d + 4; hu *= 60; if (hu < 0) hu += 360;
    if (hu < 205 || hu > 300) return hex;   // 보라 · 남색만
    const s = d / (1 - Math.abs(2 * l - 1)), ns = Math.min(0.45, s * 0.55), nh = l < 0.35 ? 355 : 30;   // 어두운 것 = 검붉은, 밝은 것(테두리) = 금갈색
    const C = (1 - Math.abs(2 * l - 1)) * ns, X = C * (1 - Math.abs(((nh / 60) % 2) - 1)), m = l - C / 2;
    const [rr, gg, bb] = nh < 60 ? [C, X, 0] : [C, 0, X], hx = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
    return "#" + hx(rr) + hx(gg) + hx(bb) + a;
  };
  for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; }
    for (const r of rules) { if (!r.style || (r.selectorText || "").includes("rk") || /\.(r[0-9]|rsat|t[0-9])/.test(r.selectorText || "")) continue;
      for (const p of ["background", "background-color", "background-image", "border-color", "border-top-color", "border-bottom-color", "border-left-color", "border-right-color", "box-shadow", "outline-color"]) {
        const v = r.style.getPropertyValue(p); if (!v) continue;
        const nv = v.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)(,\s*[\d.]+)?\)/g, (all, a1, b1, c1, al) => { const hx = "#" + [a1, b1, c1].map((x) => (+x).toString(16).padStart(2, "0")).join(""), w = warm(hx); if (w === hx) return all; const q = (i) => parseInt(w.slice(1 + i * 2, 3 + i * 2), 16); return `rgba(${q(0)},${q(1)},${q(2)}${al || ",1"})`; }).replace(/#[0-9a-fA-F]{3,8}/g, warm);
        if (nv !== v) r.style.setProperty(p, nv, r.style.getPropertyPriority(p));
      } } }
  const st = document.createElement("style"); st.id = "theme5"; st.textContent = css; document.head.appendChild(st);
  // 상단 메뉴 버튼: 로블록스판 메뉴 아이콘
  const MI = { "b-map": "m_map", "b-inv": "m_bag", "b-pass": "m_passive", "b-stat": "m_stats", "b-skill": "m_skill", "b-quest": "m_quest", "b-opt": "m_settings", "b-daily": "m_mail", "b-codex": "m_gacha" };
  const put = () => { for (const id in MI) { const b = document.getElementById(id), u = typeof artURL === "function" && artURL(MI[id]); if (!b || !u || b.querySelector(".mi")) continue; const t = b.firstChild; if (t && t.nodeType === 3) t.textContent = t.textContent.replace(/^[^\w가-힣]+\s*/, ""); const im = document.createElement("img"); im.className = "mi"; im.src = u; b.insertBefore(im, b.firstChild); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", put); else put();
})();
