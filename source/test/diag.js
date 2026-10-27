const A = require('./simlib.js'); Object.assign(A.CFG,{H0:3.1});
const node=(act,stage)=>({kind:stage===10?'boss':'stage',act,stage,level:(act-1)*10+stage});
const sv=A.newSave();
for(let s=0;s<3;s++){const b=A.createBattle(sv,{kind:'tutorial',act:1,stage:1,step:s});b.noFx=true;while(!b.over)A.stepBattle(b,0.05);A.finishBattle(sv,b);}
const run=(nd)=>{const b=A.createBattle(sv,nd);b.noFx=true;while(!b.over)A.stepBattle(b,0.05);A.finishBattle(sv,b);return b;};
let fails=0;
for(let act=1;act<=3;act++)for(let st=1;st<=10;st++){let tries=0,ok=false;while(!ok&&tries<25){A.botEquip(sv);const b=run(node(act,st));tries++;if(b.win)ok=true;else{fails++; if(act===3){const s=b.stats;console.log('FAIL act',act,'st',st,'lv',sv.level,'t',Math.round(b.time),'kills',b.kills,'mana',Math.round(b.mana),'/',Math.round(b.maxMana),'mix',s.mix.toFixed(2),'atk',Math.round(s.atk),'mag',Math.round(s.mag),'hp',Math.round(s.maxHp),'cc',s.critChance.toFixed(2),'sc',s.spellCrit.toFixed(2),'sk',b.skills.map(k=>k&&k.id).join(','));}}}}
console.log('fails',fails);
