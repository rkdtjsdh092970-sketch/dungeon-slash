// Dungeon Slash 서버 (Cloudflare Worker + D1). 지인 테스트용: 보안은 느슨함.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,x-name,x-pass", "access-control-allow-methods": "GET,POST,OPTIONS" };
const J = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json", ...CORS } });
const now = () => Date.now();
const GAME_RAW = "https://raw.githubusercontent.com/rkdtjsdh092970-sketch/dungeon-slash/main/";   // 게임 파일(index.html, ver.txt)이 올라가는 저장소
const rawUrl = (f) => GAME_RAW + f + "?t=" + Math.floor(Date.now() / 30000);   // 30초마다 새 주소로 받아 GitHub 캐시를 피한다
const FEE = 0.05, MAX_LISTINGS = 5, EXPIRE_MS = 3 * 86400000, GUILD_COST = 20000, NAME_RE = /^[0-9A-Za-z가-힣_]{2,12}$/;
async function hash(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ds1|" + s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
// 균열 탑 10층마다 우편 보상: 이터널 고유(10층 단위) · 소버린 고유(30층 단위) · 엔젤릭 고유(100층 단위), 교환 불가. 같은 층은 한 번만 (ref 유일)
const riftTierOf = (f) => (f % 100 === 0 ? 4 : f % 30 === 0 ? 3 : 2), RIFT_TN = { 2: "이터널", 3: "소버린", 4: "엔젤릭" };
async function riftMails(DB, name, best) {
  best = best | 0; if (best < 10) return 0; const need = Math.floor(best / 10);
  const have = await DB.prepare("SELECT COUNT(*) c FROM mail WHERE name=? AND ref LIKE 'rift:%'").bind(name).first(); if (have && have.c >= need) return 0;
  let n = 0; for (let f = 10; f <= need * 10; f += 10) { const t = riftTierOf(f);
    const r = await DB.prepare("INSERT OR IGNORE INTO mail(name,title,body,gold,ore,created,claimed,ref,reward) VALUES(?,?,?,?,?,?,0,?,?)").bind(name, `균열 ${f}층 돌파 보상`, `심연의 균열 ${f}층 돌파 기념! ${RIFT_TN[t]} 고유 장비를 받으세요. (교환 불가)`, 0, 0, now(), "rift:" + f, JSON.stringify({ t, f })).run(); n += r.meta && r.meta.changes ? 1 : 0; }
  return n;
}
const guildLevel = (exp) => Math.min(10, 1 + Math.floor(Math.sqrt(exp / 50000)));

// 운영자 회수: revoked 표에 이름이 있으면 엔젤릭(고유 4등급) 장비를 저장·로그인 때마다 걸러 낸다
const ANGELIC_IDS = new Set("halo judgment hellcrown apex eternity abyssalcrown voidheart pyrelordcrown plaguebearer angelstep dimshoes godhand hellverdict everarmor startear soulpact".split(" "));
const isAngelic = (it) => !!it && (it.utier === 4 || ANGELIC_IDS.has(it.uniq));
function stripAngelic(s) { let n = 0; if (Array.isArray(s.inv)) { const k = s.inv.length; s.inv = s.inv.filter((it) => !isAngelic(it)); n += k - s.inv.length; } if (s.equipped) for (const k of Object.keys(s.equipped)) if (isAngelic(s.equipped[k])) { delete s.equipped[k]; n++; } return n; }
async function isRevoked(DB, name) { try { return !!(await DB.prepare("SELECT 1 FROM revoked WHERE name=?").bind(name).first()); } catch (e) { return false; } }
async function auth(req, env) {
  let name = ""; try { name = decodeURIComponent(req.headers.get("x-name") || "").trim(); } catch (e) {} let pass = ""; try { pass = decodeURIComponent(req.headers.get("x-pass") || ""); } catch (e) {}
  if (!NAME_RE.test(name) || pass.length < 2) return null;
  const row = await env.DB.prepare("SELECT * FROM players WHERE name=?").bind(name).first();
  if (!row || row.pass !== (await hash(name + pass))) return null;
  return row;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, ""), DB = env.DB;
    try {
      if ((path === "" || path === "/index.html") && req.method === "GET") {   // 게임 본체: 주소창에 바로 입력해서 접속
        const r = await fetch(rawUrl("index.html"), { cf: { cacheTtl: 20 } }); if (!r.ok) return new Response("게임 파일을 불러오지 못했습니다", { status: 502 });
        return new Response(r.body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      }
      if (path === "/api/ping") return J({ ok: true, t: now() });
      if (path === "/api/ver") {   // 서비스 중인 index.html 안의 BUILD_ID를 그대로 읽는다 (게임 본체와 항상 같은 값)
        let v = ""; try { const t = await (await fetch(rawUrl("index.html"), { cf: { cacheTtl: 20 } })).text(); const m = t.match(/const BUILD_ID = "([^"]+)"/); v = m ? m[1] : ""; } catch (e) {}
        return new Response(JSON.stringify({ ver: v }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
      }
      let body = {}; if (req.method === "POST") { try { body = await req.json(); } catch (e) {} }

      // ---- 로그인 / 가입 ----
      if (path === "/api/login") {
        const name = String(body.name || "").trim(), pass = String(body.pass || "");
        if (!NAME_RE.test(name)) return J({ err: "닉네임은 2~12자 (한글/영문/숫자/_)" }, 400);
        if (pass.length < 2) return J({ err: "비밀번호는 2자 이상" }, 400);
        const h = await hash(name + pass), row = await DB.prepare("SELECT * FROM players WHERE name=?").bind(name).first();
        if (!row) { await DB.prepare("INSERT INTO players(name,pass,created,updated) VALUES(?,?,?,?)").bind(name, h, now(), now()).run(); return J({ ok: true, created: true, save: null, pending: 0, guild: 0 }); }
        if (row.pass !== h) return J({ err: "비밀번호가 다릅니다" }, 403);
        try { await riftMails(DB, name, row.rift); } catch (e) {}
        let sv = row.save ? JSON.parse(row.save) : null, revoked = 0;
        if (sv && await isRevoked(DB, name)) { revoked = stripAngelic(sv); if (revoked) await DB.prepare("UPDATE players SET save=? WHERE name=?").bind(JSON.stringify(sv), name).run(); }
        return J({ ok: true, created: false, save: sv, pending: row.gold_pending, guild: row.guild, revoked, revokeOn: await isRevoked(DB, name) });
      }
      const me = await auth(req, env); if (!me) return J({ err: "로그인이 필요합니다" }, 401);

      if (path === "/api/save") {
        const s = body.save; if (!s || typeof s !== "object") return J({ err: "bad save" }, 400);
        let stripped = 0; if (await isRevoked(DB, me.name)) stripped = stripAngelic(s);
        const txt = JSON.stringify(s); if (txt.length > 900000) return J({ err: "세이브가 너무 큽니다" }, 400);
        { const nb = (s.rift && s.rift.best) | 0; if (nb > (me.rift | 0)) { try { await riftMails(DB, me.name, nb); } catch (e) {} } }
        await DB.prepare("UPDATE players SET save=?, level=?, rift=?, endless=?, updated=? WHERE name=?").bind(txt, s.level | 0, ((s.rift && s.rift.best) | 0), ((s.endless && s.endless.best) | 0), now(), me.name).run();
        return J({ ok: true, stripped });
      }
      if (path === "/api/claim") {   // 판매 완료 확인 + 대금 수령
        const sold = await DB.prepare("SELECT id,item,price FROM auctions WHERE seller=? AND status='sold' AND claimed=0").bind(me.name).all();
        await DB.prepare("UPDATE auctions SET claimed=1 WHERE seller=? AND status='sold' AND claimed=0").bind(me.name).run();
        await DB.prepare("UPDATE players SET gold_pending=0 WHERE name=?").bind(me.name).run();
        return J({ ok: true, gold: me.gold_pending, sold: sold.results.map((r) => ({ id: r.id, price: r.price, item: JSON.parse(r.item) })) });
      }
      if (path === "/api/rank") {
        const kind = url.searchParams.get("k") === "endless" ? "endless" : url.searchParams.get("k") === "level" ? "level" : "rift";
        const rows = await DB.prepare("SELECT p.name, p.level, p.rift, p.endless, g.name AS guild FROM players p LEFT JOIN guilds g ON g.id=p.guild ORDER BY p." + kind + " DESC, p.level DESC LIMIT 30").all();
        return J({ rows: rows.results });
      }

      // ---- 우편함 (운영 보상 등) ----
      if (path === "/api/mail/list") {
        const rows = await DB.prepare("SELECT id,title,body,gold,ore,created,claimed,ref,reward FROM mail WHERE name=? ORDER BY claimed ASC, id DESC LIMIT 60").bind(me.name).all();
        return J({ rows: rows.results });
      }
      if (path === "/api/mail/claim") {   // 한 번만 수령 (UPDATE ... WHERE claimed=0 이 원자적으로 중복 수령을 막는다)
        const a = await DB.prepare("UPDATE mail SET claimed=1 WHERE id=? AND name=? AND claimed=0 RETURNING gold,ore,reward").bind(+body.id, me.name).first();
        if (!a) return J({ err: "이미 받았거나 없는 우편입니다" }, 400); return J({ ok: true, gold: a.gold, ore: a.ore, rewards: a.reward ? [JSON.parse(a.reward)] : [] });
      }
      if (path === "/api/mail/claimall") {
        const a = await DB.prepare("UPDATE mail SET claimed=1 WHERE name=? AND claimed=0 RETURNING gold,ore,reward").bind(me.name).all();
        const rs = a.results || []; if (!rs.length) return J({ err: "받을 우편이 없습니다" }, 400);
        return J({ ok: true, n: rs.length, gold: rs.reduce((x, r) => x + (r.gold || 0), 0), ore: rs.reduce((x, r) => x + (r.ore || 0), 0), rewards: rs.filter((r) => r.reward).map((r) => JSON.parse(r.reward)) });
      }

      // ---- 경매장 ----
      if (path === "/api/ah/list") {
        const q = url.searchParams, slot = q.get("slot") || "", minR = +q.get("minr") || 0, uniq = q.get("uniq") === "1", sort = q.get("sort") === "new" ? "id DESC" : "price ASC";
        await DB.prepare("UPDATE auctions SET status='expired' WHERE status='open' AND expires<?").bind(now()).run();
        let sql = "SELECT id,seller,item,slot,rarity,uniq,ilvl,price,created FROM auctions WHERE status='open'", args = [];
        if (slot) { sql += " AND slot=?"; args.push(slot); } if (minR) { sql += " AND rarity>=?"; args.push(minR); } if (uniq) sql += " AND uniq IS NOT NULL AND uniq!=''";
        sql += " ORDER BY " + sort + " LIMIT 60";
        const rows = await DB.prepare(sql).bind(...args).all();
        return J({ rows: rows.results.map((r) => ({ ...r, item: JSON.parse(r.item) })) });
      }
      if (path === "/api/ah/mine") {
        const rows = await DB.prepare("SELECT id,item,price,status,buyer,created,expires FROM auctions WHERE seller=? AND status IN ('open','expired') ORDER BY id DESC LIMIT 30").bind(me.name).all();
        const sold = await DB.prepare("SELECT COUNT(*) c FROM auctions WHERE seller=? AND status='sold' AND claimed=0").bind(me.name).first();
        return J({ rows: rows.results.map((r) => ({ ...r, item: JSON.parse(r.item) })), sold: sold.c, pending: me.gold_pending, max: MAX_LISTINGS });
      }
      if (path === "/api/ah/post") {
        const it = body.item, price = Math.floor(+body.price); if (it && it.bound) return J({ err: "교환 불가 장비입니다" }, 400); if (!it || !(price >= 1 && price <= 1e12)) return J({ err: "가격 오류" }, 400);
        const c = await DB.prepare("SELECT COUNT(*) c FROM auctions WHERE seller=? AND status='open'").bind(me.name).first();
        if (c.c >= MAX_LISTINGS) return J({ err: "등록은 최대 " + MAX_LISTINGS + "개입니다" }, 400);
        const r = await DB.prepare("INSERT INTO auctions(seller,item,slot,rarity,uniq,ilvl,price,created,expires) VALUES(?,?,?,?,?,?,?,?,?)").bind(me.name, JSON.stringify(it), it.slot || "", it.rarity | 0, it.uniq || "", it.ilvl | 0, price, now(), now() + EXPIRE_MS).run();
        return J({ ok: true, id: r.meta.last_row_id });
      }
      if (path === "/api/ah/cancel") {   // 취소/만료 회수
        const a = await DB.prepare("UPDATE auctions SET status='cancelled' WHERE id=? AND seller=? AND status IN ('open','expired') RETURNING item").bind(+body.id, me.name).first();
        if (!a) return J({ err: "회수할 수 없습니다" }, 400); return J({ ok: true, item: JSON.parse(a.item) });
      }
      if (path === "/api/ah/buy") {
        const a = await DB.prepare("UPDATE auctions SET status='sold', buyer=? WHERE id=? AND status='open' AND seller!=? AND expires>? RETURNING item,price,seller").bind(me.name, +body.id, me.name, now()).first();
        if (!a) return J({ err: "이미 팔렸거나 살 수 없는 물품입니다" }, 400);
        await DB.prepare("UPDATE players SET gold_pending=gold_pending+? WHERE name=?").bind(Math.floor(a.price * (1 - FEE)), a.seller).run();
        return J({ ok: true, item: JSON.parse(a.item), price: a.price });
      }
      if (path === "/api/ah/refund") return J({ ok: true });   // 구매 실패 시 되돌림은 클라이언트가 처리 (느슨한 보안)

      // ---- 길드 ----
      const gInfo = async (id) => {
        const g = await DB.prepare("SELECT * FROM guilds WHERE id=?").bind(id).first(); if (!g) return null;
        const mem = await DB.prepare("SELECT name,level,rift FROM players WHERE guild=? ORDER BY rift DESC, level DESC").bind(id).all();
        return { id: g.id, name: g.name, leader: g.leader, exp: g.exp, level: guildLevel(g.exp), motd: g.motd, members: mem.results };
      };
      if (path === "/api/guild/me") { return J({ guild: me.guild ? await gInfo(me.guild) : null }); }
      if (path === "/api/guild/list") {
        const rows = await DB.prepare("SELECT g.id,g.name,g.leader,g.exp,(SELECT COUNT(*) FROM players WHERE guild=g.id) AS members FROM guilds g ORDER BY g.exp DESC LIMIT 30").all();
        return J({ rows: rows.results.map((r) => ({ ...r, level: guildLevel(r.exp) })), cost: GUILD_COST });
      }
      if (path === "/api/guild/create") {
        if (me.guild) return J({ err: "이미 길드에 가입해 있습니다" }, 400);
        const nm = String(body.name || "").trim(); if (!NAME_RE.test(nm)) return J({ err: "길드 이름은 2~12자" }, 400);
        try { const r = await DB.prepare("INSERT INTO guilds(name,leader,created) VALUES(?,?,?)").bind(nm, me.name, now()).run(); await DB.prepare("UPDATE players SET guild=? WHERE name=?").bind(r.meta.last_row_id, me.name).run(); return J({ ok: true, cost: GUILD_COST, guild: await gInfo(r.meta.last_row_id) }); }
        catch (e) { return J({ err: "이미 있는 길드 이름입니다" }, 400); }
      }
      if (path === "/api/guild/join") {
        if (me.guild) return J({ err: "이미 길드에 가입해 있습니다" }, 400);
        const g = await DB.prepare("SELECT id FROM guilds WHERE id=?").bind(+body.id).first(); if (!g) return J({ err: "없는 길드" }, 400);
        const c = await DB.prepare("SELECT COUNT(*) c FROM players WHERE guild=?").bind(g.id).first(); if (c.c >= 30) return J({ err: "길드가 가득 찼습니다(30명)" }, 400);
        await DB.prepare("UPDATE players SET guild=? WHERE name=?").bind(g.id, me.name).run(); return J({ ok: true, guild: await gInfo(g.id) });
      }
      if (path === "/api/guild/leave") {
        if (!me.guild) return J({ err: "길드가 없습니다" }, 400);
        const g = await DB.prepare("SELECT * FROM guilds WHERE id=?").bind(me.guild).first();
        await DB.prepare("UPDATE players SET guild=0 WHERE name=?").bind(me.name).run();
        if (g && g.leader === me.name) {   // 길마가 나가면 다음 멤버에게 위임, 없으면 해산
          const nx = await DB.prepare("SELECT name FROM players WHERE guild=? ORDER BY rift DESC LIMIT 1").bind(g.id).first();
          if (nx) await DB.prepare("UPDATE guilds SET leader=? WHERE id=?").bind(nx.name, g.id).run(); else { await DB.prepare("DELETE FROM guilds WHERE id=?").bind(g.id).run(); await DB.prepare("DELETE FROM chat WHERE guild=?").bind(g.id).run(); }
        }
        return J({ ok: true });
      }
      if (path === "/api/guild/donate") {
        if (!me.guild) return J({ err: "길드가 없습니다" }, 400); const gold = Math.floor(+body.gold); if (!(gold >= 100)) return J({ err: "최소 100G" }, 400);
        await DB.prepare("UPDATE guilds SET exp=exp+? WHERE id=?").bind(gold, me.guild).run(); return J({ ok: true, guild: await gInfo(me.guild) });
      }
      if (path === "/api/guild/motd") {
        const g = await DB.prepare("SELECT leader FROM guilds WHERE id=?").bind(me.guild).first(); if (!g || g.leader !== me.name) return J({ err: "길드장만 가능" }, 403);
        await DB.prepare("UPDATE guilds SET motd=? WHERE id=?").bind(String(body.motd || "").slice(0, 60), me.guild).run(); return J({ ok: true });
      }
      if (path === "/api/guild/chat") {
        if (!me.guild) return J({ rows: [] });
        if (req.method === "POST") { const m = String(body.msg || "").trim().slice(0, 80); if (m) await DB.prepare("INSERT INTO chat(guild,name,msg,ts) VALUES(?,?,?,?)").bind(me.guild, me.name, m, now()).run(); }
        const rows = await DB.prepare("SELECT name,msg,ts FROM chat WHERE guild=? ORDER BY id DESC LIMIT 40").bind(me.guild).all();
        return J({ rows: rows.results.reverse() });
      }
      return J({ err: "not found" }, 404);
    } catch (e) { return J({ err: "서버 오류: " + String(e.message || e).slice(0, 120) }, 500); }
  },
};
