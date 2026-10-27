const A=require('./simlib.js');const sv=A.newSave();
for(const ilvl of [1,4,8,12]){console.log('--- ilvl',ilvl);for(const slot of ['weapon','helm','ring']){const it=A.genItem(sv,ilvl,3,slot);console.log(slot, it.affixes.map(a=>a.k+':'+(a.v>5?Math.round(a.v):a.v.toFixed(3))).join(' '));}}
// MF effect
for(const mf of [0,1,3,6,10,20]) console.log('mf',mf,'eff',A.mfEff(mf).toFixed(2),'uniqMul',Math.pow(1+A.mfEff(mf),A.CFG.UNIQ_MF_EXP).toFixed(2));
