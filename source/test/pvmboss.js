const A = require('./simlib.js'); const { make, BUILDS } = require('./pvm.js');
if (process.env.MULTS) for (const [id, m] of Object.entries(JSON.parse(process.env.MULTS))) A.SKILLS.find((x) => x.id === id).mult = m;
const BOSSVAR = { '물리': ['execute'], '마법(번개)': ['judgment'], '마법(화염)': ['sunbrand'], '마나 주문': ['manaburst'], '마나+방어': ['manaburst'] };
function withBossSkill(sv, id) { const k = A.genSkill(sv, id, 2); k.lvl = 20; sv.skills.push(k); sv.loadout[3] = { uid: k.uid, rule: 'boss' }; return sv; }
function fight(sv, node) { const b = A.createBattle(sv, node); b.noFx = true; let t = 0, hm = b.maxHp, tk = null; while (!b.over && t < 400) { A.stepBattle(b, 0.05); t += 0.05; hm = Math.min(hm, b.hp); if (tk == null && b.bossKills > 0) tk = b.time; }
  return { tk: tk == null ? '-' : Math.round(tk) + 's', win: b.win ? 'WIN ' : 'lose', total: Math.round(b.time) + 's', minHP: Math.round(Math.max(0, hm) / b.maxHp * 100) + '%' }; }
// 순수 보스 DPS 비교: 플레이어를 불사로 두고 보스 처치까지 걸린 시간만 잰다 (잡몹 포함, 보스에게 +% 적용)
function race(sv, node) { if (process.env.ALLBOSS) sv.loadout.forEach((l) => l && (l.rule = 'boss')); const b = A.createBattle(sv, node); b.noFx = true; b.hp = b.maxHp = 1e18; b.inv = 1e9; let t = 0; while (!b.over && t < 900) { A.stepBattle(b, 0.05); t += 0.05; if (b.bossKills > 0) break; } const bo = b.bossRef; return b.bossKills > 0 ? Math.round(b.time) + 's' : '>' + Math.round(b.time) + 's(' + Math.round(Math.max(0, bo.hp) / bo.maxHp * 100) + '%남음)'; }
const nodes = { '공허 4단계(114)': { kind: 'void', act: 10, tier: 30, vsel: 4, name: 'v' } };
const mode = process.env.BOSSVAR ? '보스 전용기 1개 포함(4번 칸 교체)' : '기본 스킬 구성';
console.log('== 보스 처치 시간 (플레이어 불사, 낮을수록 강함) —', mode);
for (const name of Object.keys(BUILDS)) { const row = []; for (const [nn, node] of Object.entries(nodes)) { let sv = make(name, 16); if (process.env.BOSSVAR) sv = withBossSkill(sv, BOSSVAR[name][0]); { const N = +process.env.N || 1, ts = []; for (let i = 0; i < N; i++) { let v = make(name, 16); if (process.env.BOSSVAR) v = withBossSkill(v, BOSSVAR[name][0]); const r = race(v, node); ts.push(r.startsWith('>') ? 900 : parseInt(r)); } row.push(`${nn}: 평균 ${Math.round(ts.reduce((a, b) => a + b, 0) / N)}s [${ts.join(',')}]`); } } console.log(name.padEnd(8), row.join(' | ')); }
