const assert=require('assert'),fs=require('fs'),vm=require('vm');const root=require('path').join(__dirname,'../'),rules=require(root+'rules.js'),solve=require(root+'solver.js'),{createModel,inventoryGroups,canComplete,simulate}=require(root+'estimate.js');
const slots=['Hat','Cape','Top','Gloves','Bottom','Shoes'],names=['Dimensional Leap','White Hole','Registry','ATK','Mage','Pirate','Thief','Warrior','Bowman','Crit DMG','Damage','Boss Damage'];
const types=names.map((name,i)=>({id:'t'+i,name,target:[0,1,2,3,9,10].includes(i)?3:0,color:'#abcdef'})),keys=['t0','t1','t2','t3','t9','t10'];
const dmg=slots.map((slot,i)=>({id:'i'+i,slot,stars:0,name:slot,lines:[keys[i],keys[(i+1)%6],keys[(i+2)%6]]}));
const boss=dmg.map(x=>({...x,lines:x.lines.map(l=>l==='t10'?'t11':l)}));let replaced=false;const mixed=dmg.map(x=>({...x,lines:x.lines.map(l=>{if(l==='t10'&&!replaced){replaced=true;return 't11'}return l})}));
const opts={damageEither:true};
assert.equal(solve(dmg,types,slots,opts).score,18);const b=solve(boss,types,slots,opts);assert.equal(b.score,18);assert.equal(b.damageChoice,'Boss Damage');assert.equal(b.targets[10],0);assert.equal(b.targets[11],3);assert.equal(solve(mixed,types,slots,opts).score,17);assert.equal(solve(boss,types,slots).score,15);
const pool=rules.pool(types,opts);assert.equal(pool.length,7);assert(!pool.some(t=>t.id==='t4'));const models=rules.variants(types,opts).map(v=>createModel(v,slots,pool));assert.equal(models[0].triples.length,35);
const completes=items=>models.some(m=>canComplete(m,inventoryGroups(m,items)));assert(completes(dmg));assert(completes(boss));assert(!completes(mixed));
const ready=simulate({types,slots,items:boss,...opts,trials:100});assert.equal(ready.additional.mean,0);const notReady=simulate({types,slots,items:mixed,...opts,trials:200});assert(!notReady.inventoryComplete);assert(notReady.additional.mean>0);assert.equal(notReady.poolSize,7);
console.log('3 Damage and 3 Boss Damage accepted; 2+1 rejected by optimizer and simulation. Alternative pool includes both, excludes zero-target classes.');
// Cross-check either/or solver against two independent target optimizations.
let seed=11;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
for(let t=0;t<100;t++){
 const items=slots.flatMap(slot=>Array.from({length:rand(5)},(_,i)=>{const tri=models[0].triples[rand(35)];return {id:slot+i,slot,stars:rand(31),lines:tri.v.map(j=>pool[j].id)}}));
 const actual=solve(items,types,slots,opts),all=rules.variants(types,opts).map(v=>solve(items,v,slots));const sorted=all.sort((a,b)=>{for(let i=0;i<a.rank.length;i++)if(a.rank[i]!==b.rank[i])return b.rank[i]-a.rank[i];return 0});assert.deepStrictEqual(actual.rank,sorted[0].rank);
 const exists=all.some(r=>r.score===18);assert.equal(models.some(m=>canComplete(m,inventoryGroups(m,items))),exists);
}
console.log('100 randomized either/or completion checks passed.');
