if(typeof importScripts==='function')importScripts('rules.js');
const rules=typeof module!=='undefined'?require('./rules.js'):ComboRules;
function solveOne(items, types, slots) {
 const targets=types.map(t=>t.target), total=targets.reduce((a,b)=>a+b,0);
 // Compare capped target matches, then class / unique / stat matches, then stars.
 const classIds=new Set(['t4','t5','t6','t7','t8']), uniqueIds=new Set(['t0','t1','t2']), statIds=new Set(['t3','t9']);
 const rank=(counts,stars)=>{const r=[0,0,0,0,stars];types.forEach((t,i)=>{const n=Math.min(targets[i],counts[i]);r[0]+=n;if(classIds.has(t.id))r[1]+=n;else if(uniqueIds.has(t.id))r[2]+=n;else if((statIds.has(t.id)||['damage','boss damage'].includes(t.name?.trim().toLowerCase())))r[3]+=n;});return r;};
 const compare=(a,b)=>{for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]-b[i];}return 0;};
 const groups=slots.map(s=>items.filter(x=>x.slot===s&&!x.excluded)).filter(g=>g.length).sort((a,b)=>a.length-b.length);
 const vector=x=>types.map(t=>x.lines.filter(l=>l===t.id).length);
 const gs=groups.map(g=>g.map(x=>({x,v:vector(x)})).sort((a,b)=>b.x.stars-a.x.stars));
 const upper=Array(gs.length+1).fill(null).map(()=>targets.map(()=>0)),starUpper=Array(gs.length+1).fill(0);
 for(let d=gs.length-1;d>=0;d--){targets.forEach((_,i)=>upper[d][i]=upper[d+1][i]+Math.max(...gs[d].map(x=>x.v[i])));starUpper[d]=starUpper[d+1]+Math.max(...gs[d].map(x=>x.x.stars));}
 let bestRank=[-1,-1,-1,-1,-1],best={score:-1,stars:-1,chosen:[],counts:targets.map(()=>0)}, visited=0;const memo=gs.map(()=>new Map());
 function dfs(d,counts,stars,chosen){visited++;
 const bound=rank(counts.map((c,i)=>c+upper[d][i]),stars+starUpper[d]);
 if(compare(bound,bestRank)<=0)return;
 if(d===gs.length){const r=rank(counts,stars);if(compare(r,bestRank)>0){bestRank=r;best={score:r[0],stars,chosen:[...chosen],counts:[...counts]};}return;}
 const key=counts.map((c,i)=>Math.min(c,targets[i])).join(',');if((memo[d].get(key)??-1)>=stars)return;memo[d].set(key,stars);
 for(const o of gs[d])dfs(d+1,counts.map((c,i)=>c+o.v[i]),stars+o.x.stars,[...chosen,o.x]);
 }dfs(0,targets.map(()=>0),0,[]);return {...best,total,visited,rank:bestRank,targets:targets};
}
function solve(items,types,slots,options={}){
 const results=rules.variants(types,options).map(v=>solveOne(items,v,slots));
 results.sort((a,b)=>{for(let i=0;i<a.rank.length;i++)if(a.rank[i]!==b.rank[i])return b.rank[i]-a.rank[i];return 0;});
 const best=results[0];if(options.damageEither){const {damage,boss}=rules.damageTypes(types);if(damage&&boss&&damage.target>0&&boss.target===0)best.damageChoice=best.targets[types.indexOf(boss)]>0?boss.name:damage.name;}if(options.classAnyThree)best.classChoice=rules.classTypes(types).filter(t=>best.targets[types.indexOf(t)]>0).map(t=>t.name);return best;
}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=e=>self.postMessage(solve(...e.data));
if(typeof module!=='undefined')module.exports=solve;
