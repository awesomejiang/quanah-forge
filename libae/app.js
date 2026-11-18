const $=id=>document.getElementById(id),slots=['Hat','Cape','Top','Gloves','Bottom','Shoes'],icons=['♧','◈','♜','♧','Ⅱ','♧'];
const slotNames={Hat:'帽子',Cape:'披风',Top:'上衣',Gloves:'手套',Bottom:'裤子',Shoes:'鞋子'};
const slotName=s=>slotNames[s]||s;
function itemName(x){
 if(!x.name||x.name==='Libae '+x.slot)return slotName(x.slot);
 if(x.name==='Alternative '+x.slot)return '备选'+slotName(x.slot);
 const m=x.name.match(/^(Hat|Cape|Top|Gloves|Bottom|Shoes) #(\d+)$/);
 return m?slotName(m[1])+' #'+m[2]:x.name;
}

const defaults=()=>['Dimensional Leap','White Hole','Registry','ATK','Mage','Pirate','Thief','Warrior','Bowman','Crit DMG','Damage','Boss Damage'].map((name,i)=>({id:'t'+i,name,target:i<4?3:i>=10?0:1,color:['#b4a2ef','#afc7cf','#86cbb0','#efa18e','#9cbced','#d4b286','#c6a3e1','#e58d91','#afd084','#e6a7ce','#e2b876','#e28b76'][i]}));
let state={types:defaults(),items:[],damageEither:true,classAnyThree:false},slot='Hat',selected=[],editing=null,worker=null,chosenIds=new Set();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensureDamage(s){
 for(const name of ['Damage','Boss Damage'])if(!s.types.some(t=>t.name.trim().toLowerCase()===name.toLowerCase())){
  const t=defaults().find(t=>t.name===name);if(s.types.some(x=>x.id===t.id))t.id=crypto.randomUUID();s.types.push(t);
 }
 const {boss}=ComboRules.damageTypes(s.types);s.damageEither=typeof s.damageEither==='boolean'?s.damageEither:true;
 if(boss.target>0)s.damageEither=false;
 s.classAnyThree=s.classAnyThree===true;const classes=ComboRules.classTypes(s.types),ids=new Set(classes.map(t=>t.id));s.classCandidates=Array.isArray(s.classCandidates)?[...new Set(s.classCandidates.filter(id=>ids.has(id)))]:classes.filter(t=>t.target>0).map(t=>t.id);
 return s;
}
function validate(s){if(!s||!Array.isArray(s.types)||!Array.isArray(s.items)||s.types.length>32||s.items.length>3000)throw Error('Invalid backup');let ids=new Set;for(const t of s.types){if(!t||typeof t.id!=='string'||ids.has(t.id)||t.id==='other'||typeof t.name!=='string'||!t.name.trim()||!Number.isInteger(t.target)||t.target<0||t.target>6||!/^#[\da-f]{6}$/i.test(t.color))throw Error('Invalid target');ids.add(t.id)}let itemids=new Set;for(const x of s.items){if(!x||(x.excluded!==undefined&&typeof x.excluded!=='boolean')||typeof x.id!=='string'||itemids.has(x.id)||typeof x.name!=='string'||!slots.includes(x.slot)||!Number.isInteger(x.stars)||x.stars<0||x.stars>30||!Array.isArray(x.lines)||x.lines.length!==3||x.lines.some(l=>l!=='other'&&!ids.has(l))||new Set(x.lines.filter(l=>l!=='other')).size!==x.lines.filter(l=>l!=='other').length)throw Error('Invalid equipment');itemids.add(x.id)}return ensureDamage(s)}
try{let s=localStorage.getItem('libae-lab-v1');if(s)state=validate(JSON.parse(s))}catch(e){toast('无法读取已保存的数据，请导入备份恢复。')}
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3200)}
function save(){try{localStorage.setItem('libae-lab-v1',JSON.stringify(state));$('saved').textContent='● 已保存在本设备'}catch(e){$('saved').textContent='本地存储不可用，请导出备份';toast('无法保存到本设备，请导出库存备份。')}}
const type=id=>state.types.find(t=>t.id===id)||{name:'Other',color:'#8b9799'};
const tag=id=>`<span class="tag" style="--c:${type(id).color}">${esc(type(id).name)}</span>`;
function renderTargets(){const {damage,boss}=ComboRules.damageTypes(state.types);$('damage-either').checked=state.damageEither;const sum=ComboRules.targetTotal(state.types,state),classes=ComboRules.classTypes(state.types),classIds=new Set(classes.map(t=>t.id));$('class-any-three').checked=state.classAnyThree;$('class-candidates').hidden=!state.classAnyThree;$('class-candidates').innerHTML=classes.map(t=>`<label class="class-candidate"><input type="checkbox" data-class="${esc(t.id)}" ${(state.classCandidates||classes.filter(t=>t.target>0).map(t=>t.id)).includes(t.id)?'checked':''}>${esc(t.name)}</label>`).join('')+(state.classAnyThree?'<p class="hint">职业技能目标：候选中任意3种，每种至少1条；其他属性目标不变。</p>':'');$('targets').innerHTML=state.types.filter(t=>!(state.damageEither&&t.id===boss?.id)&&!(state.classAnyThree&&classIds.has(t.id))).map(t=>`<div class="targetrow"><span class="targetname"><i class="dot" style="--c:${t.color}"></i>${esc(state.damageEither&&t.id===damage?.id?'Damage 或 Boss Damage':t.name)}</span><div class="counter"><button data-dec="${esc(t.id)}" aria-label="减少 ${esc(t.name)}">−</button><input type="number" min="0" max="6" value="${t.target}" data-target="${esc(t.id)}" aria-label="${esc(t.name)} 目标数量"><button data-inc="${esc(t.id)}" aria-label="增加 ${esc(t.name)}">+</button></div></div>`).join('');$('total').innerHTML=`${sum} <small>/ 18</small>`;$('capacity').textContent=state.classAnyThree&&ComboRules.selectedClasses(state.types,state).length<3?'请至少勾选三个不同的职业技能。':sum>18?'目标总数超过六件装备可提供的 18 条词条。':sum===0?'请先设置至少一种目标属性。':''}
function renderLineGroups(){
 const {damage,boss}=ComboRules.damageTypes(state.types);const damageId=damage?.id,bossId=boss?.id;
 const groups=[['t0','t1','t2'],['t4','t5','t6','t7','t8'],['t9','t3',...(damageId?[damageId]:[]),...(bossId?[bossId]:[]),'other']];
 const standard=new Set(groups.flat());
 groups[2].push(...state.types.filter(t=>!standard.has(t.id)).map(t=>t.id));
 const labels=['专属技能词条','职业技能词条','属性及其他词条'];
 return groups.map((ids,i)=>`<div class="line-group" role="group" aria-label="${labels[i]}">${ids.map(id=>{
 const t=id==='other'?{id,name:'Other',color:'#8b9799'}:state.types.find(t=>t.id===id);if(!t)return '';
 const chosen=selected.includes(id),count=selected.filter(x=>x===id).length;
 return `<button type="button" style="--c:${t.color}" data-line="${esc(id)}" class="${chosen?'chosen':''}" aria-pressed="${chosen}" ${selected.length===3&&!chosen?'disabled':''}><span class="line-option-label">${esc(t.name)}${id==='other'&&count?' ×'+count:''}</span><span class="line-check" aria-hidden="true">${chosen?'✓':''}</span></button>`;
 }).join('')}</div>`).join('');
}
function renderForm(){ $('slots').innerHTML=['Hat','Top','Bottom','Gloves','Cape','Shoes'].map(s=>`<button type="button" class="${s===slot?'active':''}" data-slot="${s}"><span class="sloticon">${icons[slots.indexOf(s)]}</span>${slotName(s)}</button>`).join('');$('linechoices').innerHTML=renderLineGroups();$('draft').innerHTML=selected.map((id,i)=>`<button type="button" class="tag" style="--c:${type(id).color}" data-remove="${i}" title="移除此词条">${esc(type(id).name)} ×</button>`).join('');$('selectedcount').textContent=`已选 ${selected.length} / 3 条`;$('addgear').disabled=selected.length!==3;$('addgear').textContent=editing?'保存修改':'加入库存 +';$('formtitle').textContent=editing?'编辑装备':'添加装备';$('cancel').hidden=!editing;}
function orderedLines(lines){
 const {damage,boss}=ComboRules.damageTypes(state.types);
 const ids=['t0','t1','t2','t4','t5','t6','t7','t8','t9','t3',damage?.id,boss?.id,...state.types.map(t=>t.id),'other'].filter(Boolean);
 const order=[...new Set(ids)];return [...lines].sort((a,b)=>order.indexOf(a)-order.indexOf(b));
}
function lineSignature(x){return orderedLines(x.lines).join('|');}
function compareEquipment(a,b){
 const aa=orderedLines(a.lines),bb=orderedLines(b.lines);
 const ids=orderedLines([...new Set(state.types.map(t=>t.id).concat('other'))]);
 for(let i=0;i<3;i++){const d=ids.indexOf(aa[i])-ids.indexOf(bb[i]);if(d)return d;}return 0;
}
function inventoryGroup(s){
 const items=state.items.filter(x=>x.slot===s).sort(compareEquipment),paused=items.filter(x=>x.excluded).length;
 const copies=new Map();items.forEach(x=>copies.set(lineSignature(x),(copies.get(lineSignature(x))||0)+1));
 return `<section class="inventory-group" aria-label="${slotName(s)}库存"><div class="group-heading"><h3>${slotName(s)}</h3><span>${items.length} 件${paused?` · 暂停 ${paused} 件`:''}</span></div>${items.length?items.map((x,i)=>`<div class="inventory-row ${chosenIds.has(x.id)?'recommended':''} ${x.excluded?'excluded':''}"><span class="row-number">#${i+1}</span><div class="row-content"><div class="tags">${orderedLines(x.lines).map(tag).join('')}</div>${copies.get(lineSignature(x))>1?`<span class="duplicate-note">同词条 ×${copies.get(lineSignature(x))}</span>`:''}${x.name&&!/^(Libae |Alternative |Hat #|Cape #|Top #|Gloves #|Bottom #|Shoes #)/.test(x.name)?`<span class="row-name">${esc(x.name)}</span>`:''}</div>${x.stars?`<span class="row-stars">★ ${x.stars}</span>`:''}<div class="actions"><label class="include-item" title="关闭后暂不参与配装和补齐估算"><input type="checkbox" data-include="${esc(x.id)}" ${x.excluded?'':'checked'} aria-label="${slotName(s)} #${i+1} 参与计算"><span>${x.excluded?'已暂停':'参与'}</span></label><button data-edit="${esc(x.id)}" aria-label="编辑${slotName(s)} #${i+1}" title="编辑${slotName(s)} #${i+1}">编辑</button><button data-delete="${esc(x.id)}" aria-label="删除${slotName(s)} #${i+1}" title="删除${slotName(s)} #${i+1}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></div></div>`).join(''):'<p class="group-empty">暂无装备</p>'}</section>`;
}
function renderInventory(){
 const f=$('filter').value||'All slots';$('invcount').textContent=state.items.length+' 件（参与 '+state.items.filter(x=>!x.excluded).length+' 件）';
 const columns=f==='All slots'?[['Hat','Top','Bottom'],['Cape','Gloves','Shoes']]:[[f]];
 $('inventory').className=f==='All slots'?'inventory-grid':'inventory-grid filtered';
 $('inventory').innerHTML=columns.map(col=>`<div class="inventory-column">${col.map(inventoryGroup).join('')}</div>`).join('');
}

function extraLineDetails(r,resultTypes=state.types){
 const actual=new Map();for(const x of r.chosen)for(const id of x.lines)actual.set(id,(actual.get(id)||0)+1);
 return [...actual].map(([id,count])=>{const t=type(id),target=resultTypes.find(t=>t.id===id)?.target||0;return {id,name:t.name,count,target,extra:Math.max(0,count-target),locations:r.chosen.filter(x=>x.lines.includes(id)).map(x=>itemName(x))};}).filter(x=>x.extra>0);
}
function renderLineNotice(r,extras,resultTypes=state.types){
 if(r.score>=r.total||!r.total)return '';
 const missing=resultTypes.map((t,i)=>({name:t.name,n:Math.max(0,t.target-r.counts[i])})).filter(x=>x.n>0);
 return `<div class="line-notice"><div class="notice-heading">缺少的目标词条</div><p>${missing.map(x=>`${esc(x.name)} <strong>−${x.n}</strong>`).join(' · ')}</p>${extras.length?`<div class="notice-heading">超出目标的词条</div>${extras.map(x=>`<div class="extra-detail"><span><strong>${esc(x.name)} +${x.extra}</strong> <span class="muted">(${x.count} / 目标 ${x.target})</span></span><span class="extra-locations">${x.locations.map(esc).join(' · ')}</span></div>`).join('')}<p class="notice-help">下方带提示标记的属性已超出目标，额外词条不能抵扣缺少的词条。</p>`:''}</div>`;
}
function resultTag(id,extras){
 const x=extras.find(x=>x.id===id);if(!x)return tag(id);
 return `<span class="tag extra-tag" style="--c:${type(id).color}" title="${esc(type(id).name)}: 共 ${x.count} 条，目标 ${x.target} 条，多出 ${x.extra} 条">${esc(type(id).name)}<span class="extra-marker" aria-label="超出目标">!</span></span>`;
}
function renderResult(r){const resultTypes=state.types.map((t,i)=>({...t,target:r.targets?.[i]??t.target}));chosenIds=new Set(r.chosen.map(x=>x.id));renderInventory();const complete=r.score===r.total&&r.total>0,counts=resultTypes.map((t,i)=>({t,c:r.counts[i]})),extras=r.score<r.total?extraLineDetails(r,resultTypes):[];$('result').innerHTML=`<div class="score">${r.score}<span>/ ${r.total}</span></div><div class="resultlabel">${complete?'已达成目标组合':r.total===0?'尚未设置目标':'还差 '+(r.total-r.score)+' 条目标词条'}</div><div class="progress"><div style="width:${r.total?r.score/r.total*100:0}%"></div></div><div class="summary"><span>已选 ${r.chosen.length} / 6 个部位</span><strong>总星数 ★ ${r.stars}</strong></div>${counts.filter(({t})=>t.target>0).map(({t,c})=>`<div class="breakrow"><span><i class="dot" style="--c:${t.color}"></i>${esc(t.name)}</span><span class="${c>=t.target?'achieved':'missing'}">${c} / ${t.target} ${c>=t.target?'✓':''}</span></div>`).join('')}${r.classChoice?`<p class="damage-choice">职业技能方案：${r.classChoice.map(esc).join('、')}（三种不同职业技能）</p>`:''}${r.damageChoice?`<p class="damage-choice">整组方案：${esc(r.damageChoice)}（不可混搭）</p>`:''}${renderLineNotice(r,extras,resultTypes)}<h3>推荐穿戴装备</h3>${r.chosen.length?slots.map(s=>{const x=r.chosen.find(x=>x.slot===s);return `<div class="chosenitem"><div class="slotlabel">${slotName(s)}</div>${x?`<div class="itemtop"><span class="itemname">${esc(itemName(x))}</span><span>★ ${x.stars}</span></div><div class="tags">${x.lines.map(id=>resultTag(id,extras)).join('')}</div>`:'<span class="muted">尚未添加装备</span>'}</div>`}).join(''):'<div class="empty">添加装备后即可计算最优套装。</div>'}<p class="hint">优先匹配目标词条。同分依次比较：职业技能 → 专属技能 → 属性 → 总星数。超过目标的词条不参与同分比较。</p>`;}
function calculate(){estimateReady();chosenIds.clear();if(state.classAnyThree&&ComboRules.selectedClasses(state.types,state).length<3){if(worker)worker.terminate();renderInventory();$('result').innerHTML='<p class="hint">请至少勾选三个不同的职业技能。</p>';return;}renderInventory();if(worker)worker.terminate();$('result').innerHTML='<div class="empty">正在计算最优组合…</div>';worker=new Worker('solver.js');worker.onmessage=e=>renderResult(e.data);worker.onerror=()=>{$('result').innerHTML='<p>无法启动配装计算，请刷新页面重试。</p>'};worker.postMessage([state.items,state.types,slots,{damageEither:state.damageEither,classAnyThree:state.classAnyThree,classCandidates:state.classCandidates}]);}
function refresh(){renderTargets();renderForm();renderInventory();calculate();}
function changeTarget(id,n){const t=state.types.find(t=>t.id===id);t.target=Math.max(0,Math.min(6,Math.round(Number(n)||0)));save();renderTargets();calculate();}
$('targets').onclick=e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.inc||b.dataset.dec,t=state.types.find(t=>t.id===id);if(t)changeTarget(id,t.target+(b.dataset.inc?1:-1))};$('targets').onchange=e=>{if(e.target.dataset.target)changeTarget(e.target.dataset.target,e.target.value)};
$('class-any-three').onchange=e=>{state.classAnyThree=e.target.checked;if(!Array.isArray(state.classCandidates))state.classCandidates=ComboRules.classTypes(state.types).filter(t=>t.target>0).map(t=>t.id);save();renderTargets();calculate();};
$('class-candidates').onchange=e=>{const id=e.target.dataset.class;if(!id)return;const selected=new Set(state.classCandidates);if(e.target.checked)selected.add(id);else selected.delete(id);state.classCandidates=[...selected];save();renderTargets();calculate();};
$('damage-either').onchange=e=>{
 state.damageEither=e.target.checked;const {damage,boss}=ComboRules.damageTypes(state.types);
 if(state.damageEither&&boss.target>0){damage.target=Math.max(damage.target,boss.target);boss.target=0;toast('已改为整组二选一，请确认目标数量');}
 save();renderTargets();calculate();
};
$('reset').onclick=()=>{const ds=defaults();state.types.forEach(t=>t.target=ds.find(d=>d.id===t.id)?.target||0);save();renderTargets();calculate();toast('已恢复初始目标')};
$('addtype').onclick=()=>{const name=$('custom').value.trim();if(!name)return;if(state.types.length>=32)return toast('最多支持 32 种属性');if(state.types.some(t=>t.name.toLowerCase()===name.toLowerCase())||name.toLowerCase()==='other')return toast('该属性已存在');state.types.push({id:crypto.randomUUID(),name,target:0,color:'#a7c99b'});$('custom').value='';save();refresh()};$('custom').onkeydown=e=>{if(e.key==='Enter')$('addtype').click()};
$('slots').onclick=e=>{const b=e.target.closest('[data-slot]');if(b){slot=b.dataset.slot;renderForm()}};$('linechoices').onclick=e=>{const b=e.target.closest('[data-line]');if(!b)return;const id=b.dataset.line;if(id!=='other'&&selected.includes(id))selected=selected.filter(x=>x!==id);else if(selected.length<3)selected.push(id);else if(id==='other')selected.splice(selected.lastIndexOf('other'),1);renderForm()};$('draft').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){selected.splice(+b.dataset.remove,1);renderForm()}};
function clearForm(){editing=null;selected=[];$('name').value='';$('stars').value=0;renderForm()}
$('cancel').onclick=clearForm;$('gearform').onsubmit=e=>{e.preventDefault();if(selected.length!==3)return;const previous=state.items.find(o=>o.id===editing);const x={...(previous||{}),id:editing||crypto.randomUUID(),name:$('name').value.trim(),slot,stars:Number($('stars').value),lines:[...selected]};if(editing)state.items=state.items.map(o=>o.id===editing?x:o);else state.items.push(x);clearForm();save();renderInventory();calculate();toast('装备已保存')};
$('inventory').onchange=e=>{
 const id=e.target.dataset.include;if(!id)return;const x=state.items.find(x=>x.id===id);if(!x)return;
 x.excluded=!e.target.checked;save();calculate();toast(x.excluded?'装备已暂停参与计算':'装备已恢复参与计算');
};
$('inventory').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.edit){const x=state.items.find(x=>x.id===b.dataset.edit);editing=x.id;slot=x.slot;selected=[...x.lines];$('name').value=x.name;$('stars').value=x.stars;renderForm();$('gearform').scrollIntoView({behavior:'smooth',block:'center'})}if(b.dataset.delete){const x=state.items.find(x=>x.id===b.dataset.delete);state.items=state.items.filter(o=>o!==x);if(editing===x.id)clearForm();save();renderInventory();calculate();toast('装备已移除')}};
$('filter').innerHTML=['All slots',...slots].map(s=>`<option value="${s}">${s==='All slots'?'全部部位':slotName(s)}</option>`).join('');$('filter').onchange=renderInventory;
$('demo').onclick=()=>{if(state.items.length&&!confirm('要用示例装备替换当前库存吗？如需保留，请先导出备份。'))return;state={types:defaults(),items:[],damageEither:true,classAnyThree:false};const lines=[['t0','t1','t4'],['t2','t3','t5'],['t0','t2','t6'],['t1','t3','t7'],['t0','t2','t8'],['t1','t3','t9']];slots.forEach((s,i)=>{state.items.push({id:crypto.randomUUID(),name:slotName(s),slot:s,stars:15+i,lines:lines[i]});state.items.push({id:crypto.randomUUID(),name:'备选'+slotName(s),slot:s,stars:22,lines:['t0','t3','other']})});clearForm();save();refresh();toast('已载入示例库存')};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,...state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='libae-combo-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>5000000)throw Error();const s=validate(JSON.parse(await f.text()));if(state.items.length&&!confirm('要用此备份替换当前库存和目标设置吗？'))return;state={types:s.types,items:s.items,damageEither:s.damageEither,classAnyThree:s.classAnyThree,classCandidates:s.classCandidates};clearForm();save();refresh();toast('备份导入成功')}catch(e){toast('备份文件无效，已保留当前库存。')}finally{$('file').value=''}};
let estimateWorker=null,estimateLast=null;
function estimateReady(){
 if(estimateWorker){estimateWorker.terminate();estimateWorker=null;}
 const total=ComboRules.targetTotal(state.types,state),valid=total>0&&total<=18&&(!state.classAnyThree||ComboRules.selectedClasses(state.types,state).length>=3),active=ComboRules.pool(state.types,state);
 $('estimate-pool').innerHTML=active.length?active.map(t=>tag(t.id)).join(''):'<span class="muted">请先设置目标词条</span>';
 $('estimate-start').disabled=!valid;$('estimate-start').textContent='开始估算';$('estimate-stop').hidden=true;
 $('estimate-trials').disabled=false;$('estimate-cap').disabled=false;$('estimate-progress').hidden=true;
 $('estimate-results').innerHTML='';$('estimate-status').textContent=valid?(estimateLast?'目标或库存已更新，请重新估算。':'准备就绪：将比较从零开始与现有库存两个场景。'):'请确认目标为1–18条，且任意三种模式下至少勾选三种职业技能。';estimateLast=null;
}
function estimateCard(title,s,extra){
 const num=n=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:1}),q=n=>n===null?'超过 '+num(s.cap):num(n);
 return `<article class="estimate-card"><h3>${title}</h3><div class="estimate-number">${s.censored?'≥ ':''}${num(s.mean)}<span> 件</span></div><div class="estimate-metric-label">${s.censored?'平均刷取数下界':'平均需要的有效胚子数'}</div>${!s.censored?`<p class="estimate-ci">平均值的约 95% 置信区间：${num(Math.max(0,s.mean-s.ci95))}–${num(s.mean+s.ci95)} 件</p>`:''}<dl><div><dt>50% 完成（中位数）</dt><dd>${q(s.median)} 件</dd></div><div><dt>90% 完成</dt><dd>${q(s.p90)} 件</dd></div></dl>${s.censored?`<p class="estimate-censor">${s.censored} / ${s.n} 次在 ${num(s.cap)} 件内未完成；未完成样本按上限计数，均值仅为下界。可提高刷取上限重算。</p>`:''}${extra?`<p class="estimate-card-note">${extra}</p>`:''}</article>`;
}
function displayEstimate(data,finished=false){
 estimateLast=data;
 $('estimate-results').innerHTML=`<div class="estimate-cards">${estimateCard('从零凑齐整套',data.baseline,'从空库存开始累计的有效胚子总数。')}${estimateCard('基于当前库存还需',data.additional,data.inventoryComplete?'参与计算的库存已满足全部目标，额外需求为 0。':'使用 '+state.items.filter(x=>!x.excluded).length+' 件参与计算的库存，统计新增有效胚子；暂停装备不计入。')}</div>`;
 $('estimate-progress').hidden=false;$('estimate-bar').style.width=(data.completed/data.trials*100)+'%';
 $('estimate-status').textContent=(finished?'估算完成':'正在模拟')+'：'+data.completed.toLocaleString('zh-CN')+' / '+data.trials.toLocaleString('zh-CN')+' 次 · '+data.poolSize+' 种有效词条 · '+data.combinations+' 种三词条组合';
}
function finishEstimate(){
 if(estimateWorker){estimateWorker.terminate();estimateWorker=null;}
 $('estimate-start').disabled=false;$('estimate-start').textContent='重新估算';$('estimate-stop').hidden=true;$('estimate-trials').disabled=false;$('estimate-cap').disabled=false;
}
$('estimate-start').onclick=()=>{
 if(estimateWorker)estimateWorker.terminate();estimateLast=null;$('estimate-results').innerHTML='';
 $('estimate-start').disabled=true;$('estimate-stop').hidden=false;$('estimate-trials').disabled=true;$('estimate-cap').disabled=true;
 $('estimate-status').textContent='正在模拟，每次掉落后重新搜索可完成的整套搭配…';$('estimate-progress').hidden=false;$('estimate-bar').style.width='0%';
 estimateWorker=new Worker('estimate.js');
 estimateWorker.onmessage=e=>{const data=e.data;if(data.kind==='error'){finishEstimate();$('estimate-status').textContent=data.message;return;}displayEstimate(data,data.kind==='done');if(data.kind==='done')finishEstimate();};
 estimateWorker.onerror=()=>{finishEstimate();$('estimate-status').textContent='模拟未能完成，请重新尝试。';};
 estimateWorker.postMessage({types:state.types,items:state.items,slots,damageEither:state.damageEither,classAnyThree:state.classAnyThree,classCandidates:state.classCandidates,trials:Number($('estimate-trials').value),cap:Number($('estimate-cap').value),seed:246813579});
};
$('estimate-stop').onclick=()=>{finishEstimate();$('estimate-status').textContent=estimateLast?'已停止：显示已完成的 '+estimateLast.completed+' 次模拟结果，可重新估算。':'已停止，尚无完整模拟结果。';};
$('estimate-trials').onchange=$('estimate-cap').onchange=()=>{estimateReady();};

refresh();
