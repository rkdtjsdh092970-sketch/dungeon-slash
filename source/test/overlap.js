const sim=require('./simlib.js'); const R={small:8,notable:12,key:16,bridge:8,filler:5.5};
let bad=[]; const P=sim.PASSIVES;
for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const a=P[i],b=P[j];const d=Math.hypot(a.x-b.x,a.y-b.y);const need=(R[a.kind]||8)+(R[b.kind]||8)+10;if(d<need)bad.push([a.id,b.id,d.toFixed(1),need].join(' '));}
console.log('passive overlaps:',bad.length,bad.slice(0,10));
const M=sim.MAP; const nodes=M.nodes||M; let mb=[];
for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];if(a.x==null)continue;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<56)mb.push([a.id||a.name,b.id||b.name,d.toFixed(1)].join(' '));}
console.log('map overlaps(<46px):',mb.length,mb.slice(0,10));
