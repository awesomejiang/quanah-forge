if(typeof importScripts==='function')importScripts('rules.js');
const estimateRules=typeof module!=='undefined'?require('./rules.js'):ComboRules;
/* All counts are conditional on a drop having three distinct, in-scope lines. */
function createModel(types,slots,pool=null){
 const active=pool?pool.map(t=>types.find(x=>x.id===t.id)):types.filter(t=>t.target>0),targets=active.map(t=>t.target);
 if(targets.reduce((a,b)=>a+b,0)!==18||slots.length!==6)throw Error('请先将目标总数设为 18 条。');
 if(active.length<3||targets.some(n=>!Number.isInteger(n)||n>6))throw Error('目标无法由六件不重复三词条装备组成。');
 const ids=new Map(active.map((t,i)=>[t.id,i])),triples=[],index=new Map(),radix=[];let product=1;
 targets.forEach(n=>{radix.push(product);product*=n+1});
 for(let a=0;a<active.length;a++)for(let b=a+1;b<active.length;b++)for(let c=b+1;c<active.length;c++){
  const v=[a,b,c];index.set(v.join(','),triples.length);triples.push({v,delta:radix[a]+radix[b]+radix[c]});
 }
 return {active,targets,ids,triples,index,radix,slots,code:targets.reduce((s,n,i)=>s+n*radix[i],0)};
}
function inventoryGroups(model,items){
 const groups=model.slots.map(()=>new Set());
 for(const item of items){if(item.excluded)continue;const s=model.slots.indexOf(item.slot);if(s<0||item.lines.length!==3)continue;
 const v=item.lines.map(id=>model.ids.get(id));if(v.some(i=>i===undefined)||new Set(v).size!==3)continue;
 const t=model.index.get(v.sort((a,b)=>a-b).join(','));if(t!==undefined)groups[s].add(t);
 }return groups.map(s=>[...s]);
}
// Exact completion test: choose one item per slot and match all 18 target counts.
function canComplete(model,groups,fixedSlot=-1,fixedTriple=-1){
 const remaining=[...model.targets],triples=model.triples,failed=new Set();let code=model.code,mask=63;
 if(fixedSlot>=0){const t=triples[fixedTriple];for(const i of t.v)if(--remaining[i]<0)return false;code-=t.delta;mask^=1<<fixedSlot;}
 function search(mask,code,depth){
  if(!mask)return code===0;
  for(const n of remaining)if(n>depth)return false;
  const key=code*64+mask;if(failed.has(key))return false;
  let choice=-1,candidates=null;
  for(let s=0;s<6;s++){if(!(mask&(1<<s)))continue;const fits=[];
   for(const id of groups[s]){const v=triples[id].v;if(remaining[v[0]]&&remaining[v[1]]&&remaining[v[2]])fits.push(id);}
   if(!fits.length){failed.add(key);return false;}
   if(!candidates||fits.length<candidates.length){choice=s;candidates=fits;}
  }
  // Every required line must occur in enough of the unfilled slots.
  for(let i=0;i<remaining.length;i++){if(!remaining[i])continue;let count=0;
   for(let s=0;s<6;s++)if(mask&(1<<s)){
    if(groups[s].some(id=>triples[id].v.includes(i)&&triples[id].v.every(j=>remaining[j]>0)))count++;
   }
   if(count<remaining[i]){failed.add(key);return false;}
  }
  for(const id of candidates){const t=triples[id];for(const i of t.v)remaining[i]--;
   const success=search(mask^(1<<choice),code-t.delta,depth-1);for(const i of t.v)remaining[i]++;
   if(success)return true;
  }failed.add(key);return false;
 }return search(mask,code,fixedSlot<0?6:5);
}
function summarize(samples,cap){
 const values=samples.map(x=>x===null?cap:x).sort((a,b)=>a-b),n=values.length;
 if(!n)return null;const censored=samples.filter(x=>x===null).length,mean=values.reduce((a,b)=>a+b,0)/n;
 const variance=n>1?values.reduce((s,x)=>s+(x-mean)**2,0)/(n-1):0;
 const quantile=p=>{const k=Math.max(0,Math.ceil(n*p)-1);return k>=n-censored?null:values[k]};
 return {n,mean,ci95:1.96*Math.sqrt(variance/n),median:quantile(.5),p90:quantile(.9),censored,cap};
}
function simulate(options,progress=()=>{}){
 const {types,slots,items}=options,pool=estimateRules.pool(types,options),models=estimateRules.variants(types,options).map(v=>createModel(v,slots,pool)),model=models[0],initial=inventoryGroups(model,items);
 const trials=Math.max(1,Math.min(5000,Math.floor(options.trials||500))),cap=Math.max(1,Math.min(100000,Math.floor(options.cap||5000)));
 let seed=(options.seed??123456789)>>>0;const random=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
 const baseline=[],additional=[],hasSet=models.some(m=>canComplete(m,initial));const initialSeen=initial.map(g=>new Set(g));
 for(let run=0;run<trials;run++){
  const groups=[slots.map(()=>[]),initial.map(g=>[...g])],seen=[slots.map(()=>new Set()),initialSeen.map(s=>new Set(s))];
  const done=[null,hasSet?0:null];
  for(let n=1;n<=cap&&(done[0]===null||done[1]===null);n++){
   const s=Math.floor(random()*6),id=Math.floor(random()*model.triples.length);
   for(let mode=0;mode<2;mode++)if(done[mode]===null&&!seen[mode][s].has(id)){
    seen[mode][s].add(id);groups[mode][s].push(id);
    if(models.some(m=>canComplete(m,groups[mode],s,id)))done[mode]=n;
   }
  }baseline.push(done[0]);additional.push(done[1]);
  if((run+1)%10===0||run===trials-1)progress({completed:run+1,trials,baseline:summarize(baseline,cap),additional:summarize(additional,cap),poolSize:model.active.length,combinations:model.triples.length,inventoryComplete:hasSet});
 }return {completed:trials,trials,baseline:summarize(baseline,cap),additional:summarize(additional,cap),poolSize:model.active.length,combinations:model.triples.length,inventoryComplete:hasSet};
}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=e=>{
 try{const result=simulate(e.data,data=>self.postMessage({kind:'progress',...data}));self.postMessage({kind:'done',...result});}
 catch(error){self.postMessage({kind:'error',message:error.message});}
};
if(typeof module!=='undefined')module.exports={createModel,inventoryGroups,canComplete,summarize,simulate};
