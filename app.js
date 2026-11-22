import {rate,defaultCosts,equipmentCosts,maxStars,attemptCost,normalizePlan} from './engine.js?v=destruction-event-1';
const equipment=!!document.documentElement.dataset.profile,slots=equipment?30:22;
const settingsKey=equipment?'quanah-equipment-settings-v1':'mapae-badge-settings-v1';
let preferences={};try{const stored=JSON.parse(localStorage.getItem(settingsKey));if(stored&&typeof stored==='object'&&!Array.isArray(stored))preferences=stored;}catch{}
let level=equipment&&[140,150,160,200,250].includes(preferences.level)?preferences.level:160,defaults=equipment?equipmentCosts(level):defaultCosts;
let unit=equipment?'Quanah 水晶':'Mapea 碎片',costKey=equipment?`quanah-equipment-costs-${level}-v3`:'mapae-costs-v2',planKey=equipment?'quanah-plan-v3':'mapae-plan-v1';
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('zh-CN',{maximumFractionDigits:1}).format(n);
let starPlan=Array.from({length:slots},()=>({mode:1,safeguard:false}));
try{let plan=JSON.parse(localStorage.getItem(planKey));if(equipment&&!plan){const old=JSON.parse(localStorage.getItem('quanah160-plan-v1'));if(Array.isArray(old)&&old.length===22)plan=[...old,...Array.from({length:8},()=>({mode:1,safeguard:false}))];}if(Array.isArray(plan)&&plan.length===slots)starPlan=normalizePlan(plan);}catch{}
let saved;try{saved=JSON.parse(localStorage.getItem(costKey));if(equipment&&level===160&&!saved){const old=JSON.parse(localStorage.getItem('quanah-equipment-costs-160-v2'));if(Array.isArray(old)&&old.length===22)saved=[...old,...defaults.slice(22)];}}catch{}
let costs=Array.isArray(saved)&&saved.length===slots&&saved.every(c=>Number.isInteger(c)&&c>0)?saved:[...defaults],last=null,worker=null;
for(let s=0;s<slots;s++){
 $('current').add(new Option(`${s} ★`,s));$('target').add(new Option(`${s+1} ★`,s+1));
 const label=document.createElement('label');label.textContent=`${s} → ${s+1} ★`;
 const input=document.createElement('input');Object.assign(input,{type:'number',min:'1',step:'1',value:costs[s],required:true});input.setAttribute('aria-label',`材料费用： ${s} → ${s+1} 星`);
 input.addEventListener('input',()=>{costs[s]=input.value===''?NaN:Number(input.value);persist();stale();});label.append(input);$('costs').append(label);

}
const rangeKey=equipment?'quanah-equipment-range-v1':'mapae-badge-range-v1';
$('current').value='0';$('target').value=String(equipment?Math.min(22,maxStars(level)):22);
try{
 const savedRange=JSON.parse(localStorage.getItem(rangeKey));
 if(savedRange&&Number.isInteger(savedRange.current)&&Number.isInteger(savedRange.target)&&savedRange.current>=0&&savedRange.current<savedRange.target&&savedRange.target<=(equipment?maxStars(level):22)){
  $('current').value=String(savedRange.current);$('target').value=String(savedRange.target);
 }
}catch{}
function saveRange(){try{localStorage.setItem(rangeKey,JSON.stringify({current:Number($('current').value),target:Number($('target').value)}));}catch{}}
for(const id of ['current','target'])$(id).addEventListener('change',saveRange);
function renderRates(){
 $('rates').replaceChildren();
 for(let s=0;s<slots;s++){const {mode,safeguard:sg}=starPlan[s],r=rate(s,mode,sg,$('destruction-event').checked),tr=document.createElement('tr');for(const value of [`${s} → ${s+1} ★`,`${(r.success*100).toFixed(3)}%`,`${((1-r.success-r.destroy)*100).toFixed(3)}%`,`${(r.destroy*100).toFixed(3)}%`,fmt(attemptCost(s,costs,mode,sg,equipment?'equipment':'badge','nearest'))]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('rates').append(tr);}
}
function renderStrategy(){
 $('strategy').replaceChildren();
 for(let s=15;s<slots;s++){
  const tr=document.createElement('tr'),step=starPlan[s],odds=rate(s,step.mode,step.safeguard,$('destruction-event').checked);
  const label=document.createElement('td');label.textContent=`${s}→${s+1}★`;if(s<Number($('current').value)){label.title='爆炸修复后重新爬星时使用';label.className='reclimb';}tr.append(label);
  const modeCell=document.createElement('td'),select=document.createElement('select');select.setAttribute('aria-label',`强化模式： ${s} → ${s+1} 星`);
  for(let m=1;m<=(s>=22?1:s<18?3:4);m++)select.add(new Option(`模式${m}`,m));select.value=step.mode;select.disabled=step.safeguard||s>=22;
  select.onchange=()=>{step.mode=Number(select.value);savePlan();stale();};modeCell.append(select);tr.append(modeCell);
  const sgCell=document.createElement('td');if(s<=17){const box=document.createElement('input');box.type='checkbox';box.checked=step.safeguard;box.setAttribute('aria-label',`保护 ${s} → ${s+1} 星`);box.onchange=()=>{step.safeguard=box.checked;if(box.checked)step.mode=1;savePlan();stale();};sgCell.append(box);}else sgCell.textContent='—';tr.append(sgCell);
  for(const text of [fmt(attemptCost(s,costs,step.mode,step.safeguard,equipment?'equipment':'badge','nearest')),`${(odds.destroy*100).toFixed(2)}%`]){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('strategy').append(tr);
 }
}
function savePlan(){syncSafeguard();saveSettings();try{localStorage.setItem(planKey,JSON.stringify(starPlan));}catch{}}
$('fill-plan').onclick=()=>{const mode=Number($('mode').value);starPlan=normalizePlan(starPlan,mode);savePlan();stale();};
$('safeguard').onchange=()=>{for(let s=15;s<=17;s++){starPlan[s].safeguard=$('safeguard').checked;if(starPlan[s].safeguard)starPlan[s].mode=1;}savePlan();stale();};
if(equipment){
 $('level').addEventListener('change',()=>{
 const next=Number($('level').value);if(![140,150,160,200,250].includes(next)){$('error').textContent='请选择140、150、160、200或250级装备。';return;}
 level=next;defaults=equipmentCosts(level);costKey=`quanah-equipment-costs-${level}-v3`;
 let stored;try{stored=JSON.parse(localStorage.getItem(costKey));}catch{}
 costs=Array.isArray(stored)&&stored.length===slots&&stored.every(c=>Number.isInteger(c)&&c>0)?stored:[...defaults];
 [...$('costs').querySelectorAll('input')].forEach((input,s)=>input.value=costs[s]);
 const cap=maxStars(level);for(const option of $('target').options)option.disabled=Number(option.value)>cap;
 for(const option of $('current').options)option.disabled=Number(option.value)>=cap;
 if(Number($('target').value)>cap)$('target').value=cap;
 if(Number($('current').value)>=cap)$('current').value=cap-1;
 $('item-name').textContent=`${level} 级装备`;$('item-limit').textContent=`普通装备 · 最高 ${cap} 星`;
 $('error').textContent='';saveRange();stale();
 });
 }
// Restore ordinary controls after level-dependent costs and star range are loaded.
if(equipment){
 $('level').value=String(level);const cap=maxStars(level);
 for(const option of $('target').options)option.disabled=Number(option.value)>cap;
 for(const option of $('current').options)option.disabled=Number(option.value)>=cap;
 $('item-name').textContent=`${level} 级装备`;$('item-limit').textContent=`普通装备 · 最高 ${cap} 星`;
}
for(const [id,key,valid] of [
 ['budget','budget',v=>Number.isFinite(v)&&v>=0],
 ['mode','mode',v=>[1,2,3,4].includes(v)],
 ['trials','trials',v=>[1000,10000,50000].includes(v)],
 ['flat','flat',v=>Number.isInteger(v)&&v>0]
])if(valid(preferences[key]))$(id).value=String(preferences[key]);
if(typeof preferences.destructionEvent==='boolean')$('destruction-event').checked=preferences.destructionEvent;
if(typeof preferences.includeDistribution==='boolean')$('include-distribution').checked=preferences.includeDistribution;
function syncSafeguard(){
 const count=[15,16,17].filter(s=>starPlan[s].safeguard).length;
 $('safeguard').checked=count===3;$('safeguard').indeterminate=count>0&&count<3;
}
syncSafeguard();
function saveSettings(){try{localStorage.setItem(settingsKey,JSON.stringify({destructionEvent:$('destruction-event').checked,level,budget:Number($('budget').value),mode:Number($('mode').value),trials:Number($('trials').value),flat:Number($('flat').value),includeDistribution:$('include-distribution').checked,strategyOpen:$('strategy-editor').open,costOpen:$('cost-editor').open,ratesOpen:document.querySelector('.rates-details').open}));}catch{}}
for(const id of ['budget','mode','trials','flat','include-distribution','destruction-event']){
 $(id).addEventListener('input',saveSettings);$(id).addEventListener('change',saveSettings);
}
if(equipment)$('level').addEventListener('change',saveSettings);
for(const [element,key] of [[$('strategy-editor'),'strategyOpen'],[$('cost-editor'),'costOpen'],[document.querySelector('.rates-details'),'ratesOpen']]){
 if(typeof preferences[key]==='boolean')element.open=preferences[key];
 element.addEventListener('toggle',saveSettings);
}
renderRates();renderStrategy();
$('reset-costs').onclick=()=>{costs=[...defaults];[...$('costs').querySelectorAll('input')].forEach((input,s)=>input.value=costs[s]);persist();stale();};
function persist(){try{localStorage.setItem(costKey,JSON.stringify(costs));}catch{}}
function stale(){renderRates();renderStrategy();if(last)$('status').textContent='设置已变更 · 请重新计算';}
for(const id of ['current','target','budget','trials','include-distribution','destruction-event'])$(id).addEventListener('change',stale);
$('apply').onclick=()=>{const value=Number($('flat').value);if(!Number.isInteger(value)||value<1){$('error').textContent='材料费用须为正整数。';return;}costs.fill(value);[...$('costs').querySelectorAll('input')].forEach(i=>i.value=value);persist();stale();$('error').textContent='';};
$('form').onsubmit=e=>{
 e.preventDefault();$('error').textContent='';if(costs.some(c=>!Number.isInteger(c)||c<1)){$('error').textContent='请为每个星级填写正整数费用。';$('cost-editor').open=true;return;}
 const options={destructionEvent:$('destruction-event').checked,includeDistribution:$('include-distribution').checked,current:Number($('current').value),target:Number($('target').value),budget:Number($('budget').value),trials:Number($('trials').value),costs:[...costs],mode:Number($('mode').value),safeguard:$('safeguard').checked,profile:equipment?'equipment':'badge',level,rounding:'nearest',restorationCost:equipment?0:100,starPlan:starPlan.map(p=>({...p}))};
 $('run').disabled=true;$('run').textContent='计算中…';$('status').textContent='正在计算';document.querySelector('.results').setAttribute('aria-busy','true');
 if(worker)worker.terminate();worker=new Worker('./worker.js?v=destruction-event-1',{type:'module'});
 function finish(){worker.terminate();$('run').disabled=false;$('run').innerHTML='开始计算 <span>↗</span>';document.querySelector('.results').setAttribute('aria-busy','false');}
 worker.onerror=()=>{finish();$('error').textContent='无法启动计算，请刷新后重试。';$('status').textContent='计算失败';};
 worker.onmessage=({data})=>{finish();if(data.error){$('error').textContent=data.error;$('status').textContent='请检查输入';return;}last={options,...data.result};render(last);};worker.postMessage(options);
};
function render(r){
 $('empty').hidden=true;$('result').hidden=false;
 for(const id of ['distribution','percentile-section'])$(id).hidden=!!r.analytic;
 $('median').textContent=r.analytic?'不适用':fmt(r.median);
 $('chance').textContent=r.analytic?'未计算':`${fmt(r.chance*100)}%`;
 if(r.analytic){
  $('status').textContent='精确期望 · 无抽样误差';
  for(const key of ['mean','attempts','booms','crystals'])$(key).textContent=fmt(r[key]);
  $('budget-text').textContent=r.options.target>22?'23–30★仅提供精确期望，不计算中位数、百分位和预算成功率。平均成本不代表保证达成的预算。':'当前只计算精确期望。如需预算成功率、中位数和费用分布，请勾选「补充模拟费用分布」后重新计算。';$('chance-bar').style.width='0%';return;
 }
 $('status').textContent=`${fmt(r.options.trials)} 次分布模拟 · 均值为精确期望 · ${r.options.current} → ${r.options.target} ★`;
 for(const key of ['mean','median','p75','p90','p95','attempts','booms','crystals'])$(key).textContent=fmt(r[key]);
 $('chance').textContent=`${fmt(r.chance*100)}%`;$('budget-text').textContent=`${fmt(r.options.trials)} 次模拟中，${fmt(r.runs.filter(c=>c<=r.options.budget).length)} 次在 ${fmt(r.options.budget)} ${unit}预算内达到 ${r.options.target}★。`;$('chance-bar').style.width=`${r.chance*100}%`;
 const min=r.runs[0],max=r.runs.at(-1),count=30,bins=Array(count).fill(0),span=Math.max(1,max-min);
 r.runs.forEach(c=>bins[Math.min(count-1,Math.floor((c-min)/span*count))]++);
 const peak=Math.max(...bins),ns='http://www.w3.org/2000/svg';$('chart').replaceChildren();
 for(let y of [30,75,120,150]){let line=document.createElementNS(ns,'path');line.setAttribute('d',`M0 ${y}H600`);line.setAttribute('stroke','#29313b');$('chart').append(line);}
 bins.forEach((n,i)=>{let bar=document.createElementNS(ns,'rect'),h=n/peak*135;Object.entries({x:i*20+2,y:150-h,width:15,height:h,rx:3,fill:'#d9b573',opacity:.45+(i/count)*.5}).forEach(([k,v])=>bar.setAttribute(k,v));const title=document.createElementNS(ns,'title');title.textContent=`${fmt(min+i/count*span)}–${fmt(min+(i+1)/count*span)} ${unit}：${n} 次`;bar.append(title);$('chart').append(bar);});
 $('min-cost').textContent=fmt(min);$('max-cost').textContent=fmt(max);
}
$('export').onclick=()=>{if(!last)return;
 if(last.analytic){const csv='\ufeff装备等级,当前星数,目标星数,预期材料总成本,预期尝试次数,预期爆炸次数,预期修复水晶\n'+[last.options.level,last.options.current,last.options.target,last.mean,last.attempts,last.booms,last.crystals].join(',');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='星力期望.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
 const text=`# 装备类型 ${last.options.profile==='equipment'?'普通装备':'Mapea 吧唧'}; 等级 ${last.options.level}; 单次修复 ${last.options.restorationCost} 水晶; 取整 ${last.options.rounding==='floor'?'向下':last.options.rounding==='ceil'?'向上':'四舍五入'}; 逐星方案\n# 周日降爆30%,${last.options.destructionEvent?'开启':'关闭'}\n# 精确期望材料成本,${last.mean}\n# 精确期望尝试次数,${last.attempts}\n# 精确期望爆炸次数,${last.booms}\n# 精确期望修复水晶,${last.crystals}\n# 分布数据为模拟样本\n# 逐星模式,${last.options.starPlan.map(p=>p.mode).join(',')}\n# 逐星保护,${last.options.starPlan.map(p=>p.safeguard).join(',')}\n# 星数范围,${last.options.current},${last.options.target}\n# 按当前星数的基础费用,${last.options.costs.join(',')}\n序号,材料总成本,修复水晶,爆炸次数\n`+last.journeys.map((v,i)=>`${i+1},${v.fragments},${v.crystals},${v.booms}`).join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='mapae-simulation.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
