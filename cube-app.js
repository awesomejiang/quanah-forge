import {slots,metrics,availableMetrics} from './cube-engine.js';
const $=id=>document.getElementById(id),badge=document.documentElement.dataset.cubeProfile==='badge',unit=badge?'马牌碎片':'Quanah 水晶',key=badge?'mapae-cube-settings-v1':'quanah-cube-settings-v1',tierNames=['稀有（Rare）','史诗（Epic）','独特（Unique）','传说（Legendary）'];
const fmt=(v,d=2)=>v===null?'超出范围':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:d}).format(v),pct=v=>`${fmt(v*100,6)}%`;
let settings={};try{settings=JSON.parse(localStorage.getItem(key))??{};}catch{}if(!settings||typeof settings!=='object')settings={};
for(const [value,text]of Object.entries(slots))$('slot').add(new Option(text,value));$('slot').value=badge?'heart':slots[settings.slot]?settings.slot:'weapon';
for(const id of ['tier-current','tier-target'])tierNames.forEach((name,i)=>$(id).add(new Option(name,i)));
$('tier-current').value=[0,1,2,3].includes(settings.current)?settings.current:3;$('tier-target').value=[0,1,2,3].includes(settings.target)?Math.max(settings.target,Number($('tier-current').value)):3;
$('cube-level').value=badge?160:[140,150,160,200,250].includes(settings.level)?settings.level:160;
$('cube-budget').value=Number.isSafeInteger(settings.budget)&&settings.budget>=0?settings.budget:1000;$('cube-dmt').checked=settings.dmt===true;
const rows=[];
for(let i=0;i<3;i++){
 const row=document.createElement('div');row.className='condition-row';
 const label=document.createElement('label');label.textContent=i===0?'目标条件':'附加条件（同时满足）';
 const select=document.createElement('select');select.id=`metric-${i}`;select.setAttribute('aria-label',`第${i+1}个目标词条`);label.append(select);
 const valueLabel=document.createElement('label');valueLabel.textContent='至少';const amount=document.createElement('input');Object.assign(amount,{type:'number',min:'0.01',step:'any',value:settings.conditions?.[i]?.amount>0?settings.conditions[i].amount:i===0?23:1});amount.setAttribute('aria-label',`第${i+1}个目标的最低数值`);valueLabel.append(amount);row.append(label,valueLabel);$('conditions').append(row);rows.push({select,amount});
}
let data,last=null,worker;
function options(){return {profile:badge?'badge':'equipment',slot:badge?'heart':$('slot').value,level:badge?160:Number($('cube-level').value),current:Number($('tier-current').value),target:Number($('tier-target').value),budget:Number($('cube-budget').value),dmt:$('cube-dmt').checked,conditions:rows.filter(r=>r.select.value!=='none').map(r=>({metric:r.select.value,amount:Number(r.amount.value)}))};}
function save(){const o=options();o.conditions=rows.map(r=>({metric:r.select.value,amount:Number(r.amount.value)}));try{localStorage.setItem(key,JSON.stringify(o));}catch{}if(last)$('cube-status').textContent='设置已变更，请重新计算';}
function updateMetrics(first=false){
 const allowed=availableMetrics(data,$('slot').value,Number($('tier-target').value),Number($('cube-level').value));
 rows.forEach((r,i)=>{const old=first?settings.conditions?.[i]?.metric??(i===0?'stat':'none'):r.select.value;r.select.replaceChildren(new Option('不限（只升阶）','none'));allowed.forEach(metric=>r.select.add(new Option(metrics[metric],metric)));r.select.value=allowed.includes(old)?old:'none';r.amount.disabled=r.select.value==='none';});
 $('table-help').textContent=allowed.length?'百分比目标填数值，例如23表示合计至少23%；词条数目标填1、2或3。主属性与攻击分别沿用参考模型的STR与ATT代表值。':'此阶级无归档词条表，当前仅计算升阶。';
}
try{const response=await fetch('./black-data.json');if(!response.ok)throw Error();data=await response.json();updateMetrics(true);}catch{$('cube-error').textContent='词条数据加载失败，请刷新后重试。';$('cube-run').disabled=true;}
for(const id of ['slot','cube-level','tier-current','tier-target'])$(id).onchange=()=>{
 if(id==='tier-current'&&Number($('tier-current').value)>Number($('tier-target').value))$('tier-target').value=$('tier-current').value;
 if(id==='tier-target'&&Number($('tier-current').value)>Number($('tier-target').value))$('tier-current').value=$('tier-target').value;
 if(data)updateMetrics();save();
};
for(const row of rows){row.select.onchange=()=>{row.amount.disabled=row.select.value==='none';save();};row.amount.oninput=save;}
$('cube-budget').oninput=save;$('cube-dmt').onchange=save;
$('cube-form').onsubmit=event=>{
 event.preventDefault();const o=options();save();$('cube-error').textContent='';$('cube-run').disabled=true;$('cube-run').textContent='精确计算中…';$('cube-status').textContent='正在枚举词条组合';worker?.terminate();worker=new Worker('./cube-worker.js',{type:'module'});
 const finish=()=>{$('cube-run').disabled=false;$('cube-run').textContent='计算潜能方案';worker.terminate();};
 worker.onmessage=({data:message})=>{finish();if(message.error){$('cube-error').textContent=message.error;$('cube-status').textContent='请检查设置';return;}if(message.result.unreachable){$('cube-error').textContent='在当前词条表中，这组条件无法同时达成。请调整目标条件。';$('cube-status').textContent='目标不可达';$('cube-result').hidden=true;$('cube-empty').hidden=false;last=null;return;}last={options:o,...message.result};render(last);};
 worker.onerror=()=>{finish();$('cube-error').textContent='计算未能完成，请刷新页面后重试。';$('cube-status').textContent='计算失败';};worker.postMessage(o);
};
function tableRow(values){const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}
function render(r){
 $('cube-empty').hidden=true;$('cube-result').hidden=false;$('cube-status').textContent='精确概率 · 无随机模拟';
 $('cube-mean-cost').textContent=fmt(r.meanCost);$('cube-mean-count').textContent=fmt(r.meanCubes);$('cube-chance').textContent=pct(r.chance);$('cube-budget-text').textContent=`在 ${fmt(r.options.budget,0)} ${unit}预算内，完成全部升阶和目标条件的概率。`;$('cube-bar').style.width=`${r.chance*100}%`;$('cube-roll').textContent=r.p===null?'只升阶，不限词条':pct(r.p);$('cube-fee').textContent=`${r.fee} ${unit}`;
 $('cube-percentiles').replaceChildren(...r.percentiles.map(v=>tableRow([`${v.q*100}%`,fmt(v.cubes,0),fmt(v.cost,0)])));
 $('cube-stages').replaceChildren(...r.stages.map(s=>tableRow([s.kind==='tier'?`${tierNames[s.tier]} → ${tierNames[s.tier+1]}`:'目标阶级洗出指定词条',pct(s.p),s.cost,fmt(s.cost/s.p)])));
 if(!r.stages.length)$('cube-stages').append(tableRow(['当前已达到目标阶级，且不限词条','—',0,0]));
 const ns='http://www.w3.org/2000/svg',svg=$('cube-chart');svg.replaceChildren();for(const y of [15,95,175]){const line=document.createElementNS(ns,'path');line.setAttribute('d',`M0 ${y}H600`);line.setAttribute('stroke','#2a3038');svg.append(line);}const path=document.createElementNS(ns,'path');path.setAttribute('d',r.curve.map((v,i)=>`${i?'L':'M'} ${i*30} ${175-v.chance*160}`).join(' '));path.setAttribute('stroke','#e8bf75');path.setAttribute('stroke-width','3');path.setAttribute('fill','none');svg.append(path);$('cube-chart-max').textContent=`${fmt(r.options.budget,0)} ${unit}`;
}
$('cube-export').onclick=()=>{if(!last)return;const rows=[['计算器',badge?'马牌徽章':'普通装备'],['部位',slots[last.options.slot]],['装备等级',last.options.level],['当前阶级',tierNames[last.options.current]],['目标阶级',tierNames[last.options.target]],['平均次数',last.meanCubes],['平均材料',last.meanCost],['材料单位',unit],['预算',last.options.budget],['预算内达成概率',last.chance],['目标词条单次概率',last.p??'仅升阶'],...last.options.conditions.map(c=>['目标条件',metrics[c.metric],c.amount]),['达成概率','次数预算','材料预算'],...last.percentiles.map(v=>[v.q,v.cubes,v.cost])];const text='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=badge?'徽章魔方.csv':'装备魔方.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
