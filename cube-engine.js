// Independent calculator using MathBro's archived Black Cube probability data.
export const tiers=['rare','epic','unique','legendary'];
export const tierRates=[.17,.11,.05];
export const slots={weapon:'武器',secondary:'副手',emblem:'纹章',hat:'帽子',top:'上衣',overall:'套服',bottom:'裤子',shoes:'鞋子',gloves:'手套',cape:'披风',belt:'腰带',shoulder:'肩饰',ring:'饰品（戒指／脸饰／眼饰／耳环／项链）',heart:'机械心脏'};
export const metrics={stat:'主属性合计（含全属性）%',statLines:'主属性词条数（含全属性）',all:'全属性合计%',xenon:'尖兵等效全属性%',hp:'HP合计%',hpLines:'HP词条数',attack:'攻击／魔攻合计%',attackLines:'攻击／魔攻词条数',boss:'Boss伤害合计%',bossLines:'Boss伤害词条数',ied:'无视防御词条数',crit:'暴击伤害词条数',cooldown:'冷却缩减合计（秒）',meso:'金币获得词条数',drop:'掉落率词条数',mesoDrop:'金币或掉落词条总数',attBoss:'攻击或Boss词条总数',wse:'攻击／Boss／无视词条总数'};
const labels={stat:['STR %','All Stats %'],statLines:['STR %','All Stats %'],all:['All Stats %'],xenon:['All Stats %','STR %','DEX %','LUK %'],hp:['Max HP %'],hpLines:['Max HP %'],attack:['ATT %'],attackLines:['ATT %'],boss:['Boss Damage'],bossLines:['Boss Damage'],ied:['Ignore Enemy Defense %'],crit:['Critical Damage %'],cooldown:['Skill Cooldown Reduction'],meso:['Meso Amount %'],drop:['Item Drop Rate %'],mesoDrop:['Meso Amount %','Item Drop Rate %'],attBoss:['ATT %','Boss Damage'],wse:['ATT %','Boss Damage','Ignore Enemy Defense %']};
// Matches the category limits used by the reference, including its 3-line boss/IED/drop allowance.
const limits={'Decent Skill':1,'Increase invincibility time after being hit':1,'Ignore Enemy Defense %':3,'Boss Damage':3,'Item Drop Rate %':3,'Chance to ignore % damage when hit':2,'Chance of being invincible for seconds when hit':2};
const adjusted=new Set(['STR %','DEX %','INT %','LUK %','All Stats %','ATT %','MATT %','Max HP %']);
export function poolsFor(data,slot,tier,level){
 const pool=data[slot]?.[tiers[tier]];if(!pool)throw Error('该阶级没有Black Cube词条表，可选择「只升阶」。');
 return ['first_line','second_line','third_line'].map(key=>pool[key].map(([cat,value,prob])=>[cat,level>=160&&adjusted.has(cat)?value+1:value,prob]));
}
export function valueFor(outcome,metric){
 const categories=labels[metric];let v=0;
 for(const [cat,val] of outcome){if(!categories.includes(cat))continue;if(['stat','all','hp','attack','boss','cooldown'].includes(metric))v+=Number(val);else if(metric==='xenon')v+=cat==='All Stats %'?Number(val):Number(val)/3;else v++;}
 return v;
}
export function probability(data,{slot,target,level,conditions}){
 if(!conditions.length)return 1;
 // Repeated metrics request additional value, rather than reusing the same line.
 const totals=new Map();
 for(const {metric,amount} of conditions)totals.set(metric,(totals.get(metric)??0)+amount);
 conditions=Array.from(totals,([metric,amount])=>({metric,amount}));
 const useful=new Set(conditions.flatMap(c=>labels[c.metric]??[]));const pools=poolsFor(data,slot,target,level).map(pool=>{
  let junk=0;const kept=[];for(const line of pool)if(useful.has(line[0])||limits[line[0]])kept.push(line);else junk+=line[2];if(junk)kept.push(['Junk',0,junk]);return kept;
 });
 let total=0;
 function walk(i,lines,chance,counts){
  if(i===3){if(conditions.every(c=>valueFor(lines,c.metric)+1e-10>=c.amount))total+=chance;return;}
  const excluded=new Set(Object.keys(limits).filter(cat=>(counts[cat]??0)>=limits[cat]));
  const denominator=100-pools[i].filter(l=>excluded.has(l[0])).reduce((s,l)=>s+l[2],0);
  for(const line of pools[i]){if(excluded.has(line[0]))continue;const next={...counts};if(limits[line[0]])next[line[0]]=(next[line[0]]??0)+1;walk(i+1,[...lines,line],chance*line[2]/denominator,next);}
 }
 walk(0,[],1,{});return Math.max(0,Math.min(1,total));
}
const gcd=(a,b)=>b?gcd(b,a%b):a;
// Exact phase-type distribution. Each material unit is a time step; countdown states
// account for different costs at each tier. Matrix powers avoid a budget-sized array.
export function distribution(stages){
 if(!stages.length)return {cdf:()=>1,quantile:()=>0};
 const quantum=stages.map(s=>s.cost).reduce(gcd),costs=stages.map(s=>s.cost/quantum),offsets=[];let n=0;for(const cost of costs){offsets.push(n);n+=cost;}
 const start=offsets[0]+costs[0]-1;
 let matrix=Array.from({length:n},()=>new Float64Array(n));
 stages.forEach((s,i)=>{const off=offsets[i];for(let k=1;k<costs[i];k++)matrix[off+k][off+k-1]=1;matrix[off][off+costs[i]-1]+=1-s.p;if(i+1<stages.length)matrix[off][offsets[i+1]+costs[i+1]-1]+=s.p;});
 const powers=[matrix];
 function square(a){const out=Array.from({length:n},()=>new Float64Array(n));for(let i=0;i<n;i++)for(let k=0;k<n;k++)if(a[i][k])for(let j=0;j<n;j++)out[i][j]+=a[i][k]*a[k][j];return out;}
 function cdf(budget){let steps=Math.floor(budget/quantum);if(steps<0)return 0;let v=new Float64Array(n);v[start]=1;let bit=0;while(steps>0){if(!powers[bit])powers.push(square(powers.at(-1)));if(steps%2){const out=new Float64Array(n);for(let i=0;i<n;i++)if(v[i])for(let j=0;j<n;j++)out[j]+=v[i]*powers[bit][i][j];v=out;}steps=Math.floor(steps/2);bit++;}return Math.max(0,Math.min(1,1-v.reduce((a,b)=>a+b,0)));}
 function quantile(q){let hi=1;while(cdf(hi*quantum)<q&&hi<2**48)hi*=2;if(hi>=2**48&&cdf(hi*quantum)<q)return null;let lo=0;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(cdf(mid*quantum)>=q)hi=mid;else lo=mid+1;}return lo*quantum;}
 return {cdf,quantile};
}
export function calculateCube(data,o){
 if(!['badge','equipment'].includes(o.profile)||![0,1,2,3].includes(o.current)||![0,1,2,3].includes(o.target)||o.target<o.current)throw Error('目标潜能阶级不能低于当前阶级。');
 if(![140,150,160,200,250].includes(o.level)||!Number.isSafeInteger(o.budget)||o.budget<0)throw Error('请检查装备等级与材料预算。');
 if(o.profile==='badge'&&(o.slot!=='heart'||o.level!==160))throw Error('Mapea 吧唧固定为160级，使用心脏词条池。');
 if(!slots[o.slot])throw Error('请选择有效装备部位。');
 if(!Array.isArray(o.conditions)||o.conditions.length>3||o.conditions.some(c=>!metrics[c.metric]||!Number.isFinite(c.amount)||c.amount<=0))throw Error('请检查目标条件。');
 const p=o.conditions.length?probability(data,o):1;
 if(!p)return {unreachable:true};
 const fee=t=>o.profile==='badge'?[1,1,2,4][t]:20,stages=[];
 for(let t=o.current;t<o.target;t++)stages.push({tier:t,p:Math.min(1,tierRates[t]*(o.dmt?2:1)),cost:fee(t),kind:'tier'});
 if(o.conditions.length)stages.push({tier:o.target,p,cost:fee(o.target),kind:'roll'});
 const meanCubes=stages.reduce((sum,s)=>sum+1/s.p,0),meanCost=stages.reduce((sum,s)=>sum+s.cost/s.p,0);
 const material=distribution(stages),cubes=distribution(stages.map(s=>({...s,cost:1})));
 const percentiles=[.5,.75,.9,.95].map(q=>({q,cubes:cubes.quantile(q),cost:material.quantile(q)}));
 return {p:o.conditions.length?p:null,meanCubes,meanCost,stages,percentiles,chance:material.cdf(o.budget),fee:fee(o.target),curve:Array.from({length:21},(_,i)=>{const cost=Math.floor(o.budget*i/20);return {cost,chance:material.cdf(cost)};})};
}
export function availableMetrics(data,slot,tier,level){
 if(!data[slot]?.[tiers[tier]])return [];
 const categories=new Set(poolsFor(data,slot,tier,level).flat().map(l=>l[0]));
 return Object.keys(metrics).filter(metric=>labels[metric].some(cat=>categories.has(cat)));
}
