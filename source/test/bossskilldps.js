// 보스 전용기 단독 DPS 비교: 같은 장비 품질에서 [일격 + 해당 스킬] 만 장착하고 보스에게 입힌 피해를 잰다
const A = require('./simlib.js'); const { make } = require('./pvm.js');
if (process.env.MULTS) for (const [id, m] of Object.entries(JSON.parse(process.env.MULTS))) A.SKILLS.find((x) => x.id === id).mult = m;
const SK = { '처형(물리)': ['execute', '물리'], '심장 도려내기(출혈)': ['gut', '물리'], '맹독 주입(중독)': ['toxin', '물리'], '처형자 소환(소환)': ['reaper', '물리'], '태양의 낙인(점화)': ['sunbrand', '마법(화염)'], '절대영도(냉기)': ['zerofrost', '마법(화염)'], '벼락 처형(번개)': ['judgment', '마법(번개)'], '마력 응축탄(마나)': ['manaburst', '마나+방어'] };
function dps(id, build) { const sv = make(build, 16); sv.skills = []; sv.loadout = [null, null, null, null]; [['strike', 0], [id, 2]].forEach(([sid, r], i) => { const k = A.genSkill(sv, sid, r); k.lvl = 20; sv.skills.push(k); sv.loadout[i] = { uid: k.uid, rule: 'boss' }; });
  const b = A.createBattle(sv, { kind: 'void', act: 10, tier: 30, vsel: 4, name: 'v' }); b.noFx = true; b.hp = b.maxHp = 1e18; b.inv = 1e9; b.mana = b.maxMana = 1e12; let t = 0; while (t < 60) { A.stepBattle(b, 0.05); t += 0.05; b.mana = b.maxMana; } return (b.dmgBy[id] || 0) / 60; }
const N = +process.env.N || 1; const rows = Object.entries(SK).map(([nm, [id, build]]) => { let t = 0; for (let i = 0; i < N; i++) t += dps(id, build); return [nm, t / N]; }); const ex = rows[0][1];
for (const [nm, v] of rows) console.log(nm.padEnd(18), (v / 1e6).toFixed(2) + 'M/s', ' (처형 대비 ' + (v / ex).toFixed(2) + '×)');
