const fs = require('fs');
const order = ['util','data','data2','data3','data4','data5','data6','satan','class','state','battle','battle2'];
const src = order.map(f => fs.readFileSync(`/home/claude/rkdtjsdh092970-sketch/dungeon-slash/source/src/${f}.js`, 'utf8')).join('\n');
const names = ['CFG','AFFIXES','SKILLS','SKILL_RARITY','RUNES','ENEMIES','BOSSES','SAT_DEFS','C_TREES','CHARMS','CHARM_BASIC','PASSIVES','AT','TIER_SCALE','WTYPES','ITEM_RARITY','STONE_POOL','SLOTS','EQ_SLOTS','ELEMS','ELEM_NAME','UNIQUES','EB','ACT_SPECIAL','WARPS','ACT_ELEM','ENEMY_DEF','TRAIT_DEF','SINGLE_HITS','SINGLE_HIT_BONUS','GUILD_PASSIVES','GUILD_BOUNTIES','SLOT_BASE','SLOT_NAME'];
const body = src + '\nconst __o={};' + names.map(n => `try{__o.${n}=${n};}catch(e){}`).join('') + 'return __o;';
const A = new Function(body)();
const idRe = /^[A-Za-z_][A-Za-z0-9_]*$/;
const kw = new Set(['and','break','do','else','elseif','end','false','for','function','if','in','local','nil','not','or','repeat','return','then','true','until','while','continue','type','export']);
function ser(v, d) {
  if (v === null || v === undefined) return 'nil';
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : String(+v.toPrecision(10))) : 'math.huge';
  if (t === 'boolean') return String(v);
  if (t === 'string') return JSON.stringify(v).replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => '\\u{' + h + '}');
  if (t === 'function' || t === 'symbol') return 'nil';
  if (v instanceof Set) return ser([...v], d);
  if (Array.isArray(v)) return '{' + v.map(x => ser(x, d + 1)).join(',') + '}';
  const ks = Object.keys(v).filter(k => typeof v[k] !== 'function'); if (!ks.length) return '{}';
  return '{' + ks.map(k => (idRe.test(k) && !kw.has(k) ? k : '[' + JSON.stringify(k) + ']') + '=' + ser(v[k], d + 1)).join(',') + '}';
}
const out = {}; let total = 0;
for (const n of names) { if (A[n] === undefined) { console.log('missing', n); continue; } const s = ser(A[n], 0); out[n] = s; total += s.length; console.log(n, s.length); }
fs.writeFileSync('/tmp/rbx/data.json', JSON.stringify(out)); console.log('total', total);
