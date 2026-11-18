const assert=require('assert'),rules=require('../rules.js'),solve=require('../solver.js'),estimate=require('../estimate.js');
const slots=['Hat','Cape','Top','Gloves','Bottom','Shoes'];
const types=['Dimensional Leap','White Hole','Registry','ATK','Mage','Pirate','Thief','Warrior','Bowman','Crit DMG','Damage','Boss Damage'].map((name,i)=>({id:'t'+i,name,target:i<4?3:i<10?1:0,color:'#abcdef'}));
const options={classAnyThree:true,classCandidates:['t4','t5','t6','t7']};
assert.equal(rules.variants(types,options).length,4);assert.equal(rules.targetTotal(types,options),16);assert.equal(rules.variants(types,{}).length,1);
for(const v of rules.variants(types,options)){assert.equal(v.filter(t=>['t4','t5','t6','t7'].includes(t.id)&&t.target===1).length,3);assert.equal(v.find(t=>t.id==='t8').target,0)}
assert.throws(()=>rules.variants(types,{...options,classCandidates:['t4','t5']}),/三个/);
const reduced=types.map(t=>({...t,target:['t0','t1','t2'].includes(t.id)?1:0}));
const item=(i,lines)=>({id:'i'+i,slot:slots[i],name:slots[i],stars:0,lines});
const good=[item(0,['t4','t0','t1']),item(1,['t5','t0','t2']),item(2,['t6','t1','t2']),item(3,['t4','t0','t1']),item(4,['t5','t1','t2']),item(5,['t6','t0','t2'])];
const duplicate=good.map(x=>({...x,lines:x.lines.map(l=>l==='t6'?'t4':l)}));
const outside=good.map(x=>({...x,lines:x.lines.map(l=>l==='t6'?'t8':l)}));
assert.equal(solve(good,reduced,slots,options).score,6);assert.equal(new Set(solve(good,reduced,slots,options).classChoice).size,3);
assert.equal(solve(duplicate,reduced,slots,options).score,5);assert.equal(solve(outside,reduced,slots,options).score,5);
const pool=rules.pool(reduced,options);assert(pool.some(t=>t.id==='t7'));assert(!pool.some(t=>t.id==='t8'));
const models=rules.variants(reduced,options).map(v=>estimate.createModel(v,slots,pool));const completes=items=>models.some(m=>estimate.canComplete(m,estimate.inventoryGroups(m,items)));
assert(completes(good));assert(!completes(duplicate));assert(!completes(outside));assert(!completes(good.slice(0,5)));
assert.equal(estimate.simulate({types:reduced,slots,items:good,...options,trials:2,cap:100}).additional.mean,0);
let seed=58;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
for(let test=0;test<100;test++){
 const items=slots.flatMap(slot=>Array.from({length:rand(4)},(_,i)=>({id:slot+i,slot,name:slot,stars:rand(31),lines:models[0].triples[rand(models[0].triples.length)].v.map(j=>pool[j].id)})));
 const result=solve(items,reduced,slots,options);assert.equal(completes(items),result.chosen.length===6&&result.score===result.total);
}
// Both group choices compose, rather than dropping one option.
const withDamage=reduced.map(t=>({...t,target:t.id==='t10'?3:t.target}));assert.equal(rules.variants(withDamage,{...options,damageEither:true}).length,8);
console.log('Selected candidates only; three distinct classes; duplicate/outside rejection; persistence-compatible options; 100 randomized solver/estimator checks passed.');
