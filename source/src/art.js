// =========================================================
// 일러스트 그림 (로블록스판과 같은 그림, webart/*.webp). 없거나 아직 안 받았으면 기존 도트로 그린다.
// ART_KEYS 는 build.py 가 webart 폴더를 보고 넣는다.
// =========================================================
const ART_BASE = location.protocol === "file:" ? "../../webart/" : "https://raw.githubusercontent.com/rkdtjsdh092970-sketch/dungeon-slash/main/webart/";
const ART_SET = new Set(typeof ART_KEYS !== "undefined" ? ART_KEYS : []);
const ART = {};
function artGet(k) {
  if (!k || !ART_SET.has(k)) return null;
  let im = ART[k];
  if (!im) { im = new Image(); im.onload = () => { im.ok = true; }; im.onerror = () => { ART_SET.delete(k); }; im.src = ART_BASE + k + ".webp?v=" + (typeof BUILD_ID === "string" ? BUILD_ID : ""); ART[k] = im; }
  return im.ok ? im : null;
}
function artPreload(keys) { for (const k of keys) artGet(k); }
const _artTint = document.createElement("canvas"), _artTintG = _artTint.getContext("2d");
// (x, y) = 발밑 가운데. h = 화면 높이. opt: alpha, tint(색), sx · sy(늘이기), rot(라디안), flip
function drawArt(ctx, im, x, y, h, opt) {
  opt = opt || {}; const w = h * im.width / im.height;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); if (opt.rot) ctx.rotate(opt.rot);
  ctx.scale((opt.flip ? -1 : 1) * (opt.sx || 1), opt.sy || 1);
  if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
  ctx.drawImage(im, -w / 2, -h, w, h);
  if (opt.tint) {   // 맞으면 번쩍 · 감전 · 빙결 색: 그림 모양대로만 색을 덮는다
    const tw = Math.ceil(w), th = Math.ceil(h);
    if (_artTint.width < tw || _artTint.height < th) { _artTint.width = Math.max(_artTint.width, tw); _artTint.height = Math.max(_artTint.height, th); }
    _artTintG.clearRect(0, 0, tw, th); _artTintG.globalCompositeOperation = "source-over"; _artTintG.drawImage(im, 0, 0, tw, th);
    _artTintG.globalCompositeOperation = "source-atop"; _artTintG.fillStyle = opt.tint; _artTintG.fillRect(0, 0, tw, th); _artTintG.globalCompositeOperation = "source-over";
    ctx.drawImage(_artTint, 0, 0, tw, th, -w / 2, -h, w, h);
  }
  ctx.restore();
}
// 일반 · 정예 몬스터 그림: 지역(1~10) × 역할. 1지역은 옛 그림(c_*) 이름
function mobArtKey(b, e) {
  if (e.type && /warp$/.test(e.type)) return null;
  const va = e.va != null ? e.va : Math.min(10, b.act) - 1; if (va > 9) return null;
  const role = e.type === "sniper" ? "archer" : e.type; if (ROLE_IDX[role] == null) return null;
  const k = "a" + (va + 1) + "_" + role; if (ART_SET.has(k)) return k;
  const r = ROSTER[va][ROLE_IDX[role]]; if (r && !(r[1]) && ART_SET.has(r[0])) return r[0];
  return null;
}
// 보스 그림 (공격 준비 중이면 공격 자세)
function bossArtImg(idx, atk) { return (atk && artGet("boss" + idx + "_atk")) || artGet("boss" + idx); }
// 전투 배경 그림이 있는 지역
function battleBgArt(b) {
  if (b.raid) return null;
  const k = b.kind === "hell" || b.kind === "spire" || b.kind === "craid" || b.kind === "warden" ? null : RIFTLIKE[b.kind] ? "bg8" : "bg" + Math.min(10, b.act);   // 균열 계열 = 심연 배경 (로블록스판과 같게)
  return artGet(k);
}
function drawCover(ctx, im, W, H) { const s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s; ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); ctx.restore(); }
