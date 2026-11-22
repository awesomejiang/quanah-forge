// Current GMS normal-equipment probabilities, as documented by starforce.tadeucci.dev.
// Independent fragment-cost model: no meso formulas or discounts are applied.
const success=[.9975,.945,.8925,.8925,.84,.7875,.735,.6825,.63,.5775,.525,.4725,.42,.3675,.315,.315,.315,.1575,.1575,.1575,.315,.1575,.1575,.105,.105,.105,.0735,.0525,.0315,.0105];
const destroy=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.02055,.02055,.0674,.0674,.08425,.10275,.126375,.1685,.179,.179,.179,.1853,.1895,.1937,.1979];
// Community-fitted Quanah formula; low-star bands across levels are assumed.
export function equipmentCosts(level){
 if(!Number.isInteger(level)||level<1||level>300)throw Error('装备等级须为 1–300 的整数。');
 return Array.from({length:30},(_,s)=>equipmentBaseCost(level,s));
}
export function equipmentBaseCost(level,star){return star<15?(Math.floor(star/5)+1)*10:Math.max(1,Math.round(level**3*(star+1)**2.7/200000000));}
export function maxStars(level){return level<95?5:level<108?8:level<118?10:level<128?15:level<138?20:30;}
export const equipment160Costs=[10,10,10,10,10,20,20,20,20,20,30,30,30,30,30,37,43,50,58,67,76,86];
export const defaultCosts=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,4,4,5,6,7,8,9];
const upperCosts={18:[6,12,21,39],19:[7,14,24,45],20:[8,16,28,52],21:[9,18,31,58]};
const upperSuccess={18:[.1575,.126,.105,.084],19:[.1575,.126,.105,.084],20:[.315,.2625,.21,.1575],21:[.1575,.126,.105,.084]};
const modeDestroy={15:[.02055,.0137,.00685,0],16:[.02055,.0137,.00685,0],17:[.0674,.042125,.01685,0],18:[.0674,.0437,.0179,0],19:[.08425,.06118,.0358,0],20:[.10275,.07375,.0395,0],21:[.126375,.0874,.04475,0]};
function baseRate(star,mode=1,safeguard=false){
 if(star<15||star>=22)return {success:success[star],destroy:destroy[star]};
 if(star<=17&&safeguard)return {success:success[star],destroy:0};
 const i=(star<=17?Math.min(mode,3):mode)-1;
 return {success:star>=18?upperSuccess[star][i]:success[star],destroy:modeDestroy[star][i]};
}
export function rate(star,mode=1,safeguard=false,destructionEvent=false){
 const odds=baseRate(star,mode,safeguard);
 return destructionEvent&&star<=21?{...odds,destroy:odds.destroy*.7}:odds;
}
export function attemptCost(star,costs,mode=1,safeguard=false,profile='badge',rounding='nearest'){
 if(profile==='equipment160'||profile==='equipment'){
  const multiplier=star<15||star>=22?1:star<=17?(safeguard?3:[1,1.5,2.5][Math.min(mode,3)-1]):[1,2,3.5,6.5][mode-1];
  const round=rounding==='ceil'?Math.ceil:rounding==='nearest'?Math.round:Math.floor;
  return round(costs[star]*multiplier);
 }
 if(star<15)return costs[star];
 if(star<=17)return Math.round(costs[star]*(safeguard?3:[1,1.5,2.5][Math.min(mode,3)-1]));
 // Preserve the screenshot’s explicit rounded prices, scaling only custom overrides.
 return Math.max(1,Math.round(upperCosts[star][mode-1]*costs[star]/defaultCosts[star]));
}
export function resetStar(star){return star<20?12:star===20?15:star<23?17:star<26?19:20;}
export function planFor(star,options){
 return options.starPlan?.[star] ?? {mode:options.mode??1,safeguard:options.safeguard??false};
}
export function simulate(options,random=Math.random){
 const {current,target,costs,trials,budget,mode=1,safeguard=false}=options;
 if(![1,2,3,4].includes(mode))throw Error("强化模式无效。");
 const slots=options.profile==='equipment'?30:22;
 if(!Number.isInteger(current)||!Number.isInteger(target)||current<0||target>slots||target<=current)throw Error('目标星数须高于当前星数，且不超过此装备的上限。');
 if(!Number.isInteger(trials)||trials<1||trials>50000||!Number.isFinite(budget)||budget<0)throw Error('请输入有效的模拟次数与材料预算。');
 if(costs.length!==slots||costs.some(c=>!Number.isFinite(c)||c<=0||!Number.isInteger(c)))throw Error('每个星级的基础材料费用须为正整数。');
 if(options.starPlan && (options.starPlan.length!==slots || Array.from(options.starPlan).some((p,s)=>!p||!Number.isInteger(p.mode)||p.mode<1||p.mode>(s<15||s>=22?1:s<18?3:4)||typeof p.safeguard!=='boolean'||(p.safeguard&&(s<15||s>17)))))throw Error('逐星强化方案无效。');
 const profile=options.profile??'badge',restorationCost=profile!=='badge'?(options.restorationCost??0):100;
 if(!['badge','equipment160','equipment'].includes(profile)||!Number.isInteger(restorationCost)||restorationCost<0||!['floor','ceil','nearest'].includes(options.rounding??'floor'))throw Error('装备费用设置无效。');
 if(profile==='equipment'&&(!Number.isInteger(options.level)||options.level<1||options.level>300||target>maxStars(options.level)))throw Error('目标超过该装备等级支持的星数上限。');
 if(options.expectationOnly||(options.profile==='equipment'&&target>22))return exactExpectation(options);
 let runs=[],journeys=[],attemptTotal=0,boomTotal=0;
 for(let t=0;t<trials;t++){
  let star=current,cost=0,attempts=0,booms=0;
  while(star<target){
   if(++attempts>1000000)throw Error('模拟超出计算上限，请减少模拟次数。');
   const step=planFor(star,options);
   cost+=attemptCost(star,costs,step.mode,step.safeguard,profile,options.rounding);const r=random(),odds=rate(star,step.mode,step.safeguard,options.destructionEvent);
   if(r<odds.success)star++;
   else if(r>=1-odds.destroy){star=resetStar(star);booms++;if(profile!=='badge')cost+=restorationCost;}
  }
  runs.push(cost);journeys.push({fragments:cost,crystals:booms*restorationCost,booms});attemptTotal+=attempts;boomTotal+=booms;
 }
 runs.sort((a,b)=>a-b);
 const percentile=p=>runs[Math.max(0,Math.ceil(p*trials)-1)];
 return {runs,journeys,crystals:boomTotal/trials*restorationCost,mean:runs.reduce((a,b)=>a+b,0)/trials,median:percentile(.5),p75:percentile(.75),p90:percentile(.9),p95:percentile(.95),attempts:attemptTotal/trials,booms:boomTotal/trials,chance:runs.filter(c=>c<=budget).length/trials};
}


// Exact first-passage expectations: handles rare high-star journeys without truncating samples.
export function exactExpectation(options){
 const {current,target,costs,profile='badge',rounding='nearest'}=options;
 const restorationCost=profile==='badge'?100:(options.restorationCost??0);
 const money=[],taps=[],booms=[];
 for(let s=0;s<target;s++){
  const a=planFor(s,options),r=rate(s,a.mode,a.safeguard,options.destructionEvent),reset=resetStar(s);
  const sum=arr=>r.destroy?arr.slice(reset,s).reduce((x,y)=>x+y,0):0;
  money[s]=(attemptCost(s,costs,a.mode,a.safeguard,profile,rounding)+r.destroy*((profile==='badge'?0:restorationCost)+sum(money)))/r.success;
  taps[s]=(1+r.destroy*sum(taps))/r.success;
  booms[s]=r.destroy*(1+sum(booms))/r.success;
 }
 const sum=arr=>arr.slice(current,target).reduce((x,y)=>x+y,0),boom=sum(booms);
 return {analytic:true,mean:sum(money),attempts:sum(taps),booms:boom,crystals:boom*restorationCost};
}

// UI calculation always uses exact means. Optional samples only supply distributions.
export function calculate(options,random=Math.random){
 const exact=simulate({...options,expectationOnly:true},random);
 if(!options.includeDistribution||options.target>22)return exact;
 const sampled=simulate({...options,expectationOnly:false},random);
 return {...sampled,...exact,analytic:false,sampleMean:sampled.mean};
}

// Keep bulk-fill and saved UI plans within GMS mode/safeguard availability.
export function normalizePlan(plan,bulkMode){
 return plan.map((entry,star)=>{
  const safeguard=star>=15&&star<=17&&entry?.safeguard===true;
  const requested=bulkMode??entry?.mode??1;
  const mode=star<15||star>=22||safeguard?1:Math.max(1,Math.min(star<=17?3:4,Number.isInteger(requested)?requested:1));
  return {mode,safeguard};
 });
}
