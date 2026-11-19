(function(root){
 function damageTypes(types){return {damage:types.find(t=>t.name?.trim().toLowerCase()==='damage'),boss:types.find(t=>t.name?.trim().toLowerCase()==='boss damage')};}
 const classNames=new Set(['mage','pirate','thief','warrior','bowman']);
 function classTypes(types){return types.filter(t=>classNames.has(t.name?.trim().toLowerCase()));}
 function selectedClasses(types,options={}){const all=classTypes(types);return Array.isArray(options.classCandidates)?all.filter(t=>options.classCandidates.includes(t.id)):all.filter(t=>t.target>0);}
 const allowedClassGroups=[['warrior','mage','bowman'],['thief','mage','bowman'],['warrior','pirate','bowman'],['warrior','thief','pirate'],['thief','mage','pirate']];
 function classChoices(types,options={}){const selected=selectedClasses(types,options),byName=new Map(selected.map(t=>[t.name.trim().toLowerCase(),t.id]));return allowedClassGroups.filter(group=>group.every(name=>byName.has(name))).map(group=>group.map(name=>byName.get(name)));}
 function classRuleError(types,options={}){if(!options.classAnyThree)return '';if(selectedClasses(types,options).length<3)return '请至少勾选三个不同的职业技能。';if(!classChoices(types,options).length)return '当前勾选无法组成允许的五种组合，请调整职业技能候选。';return '';}
 function targetTotal(types,options={}){const ids=new Set(classTypes(types).map(t=>t.id));return types.reduce((sum,t)=>sum+(options.classAnyThree&&ids.has(t.id)?0:t.target),0)+(options.classAnyThree?3:0);}
 function variants(types,options={}){
  const {damage,boss}=damageTypes(types);
  let all=(!options.damageEither||!damage||!boss||damage.target<=0||boss.target>0)?[types]:[types,types.map(t=>({...t,target:t.id===damage.id?0:t.id===boss.id?damage.target:t.target}))];
  if(!options.classAnyThree)return all;
  const candidates=selectedClasses(types,options),ids=new Set(classTypes(types).map(t=>t.id));
  const error=classRuleError(types,options);if(error)throw Error(error);
  const choices=classChoices(types,options).map(group=>new Set(group));
  return all.flatMap(v=>choices.map(chosen=>v.map(t=>({...t,target:ids.has(t.id)?(chosen.has(t.id)?1:0):t.target}))));
 }
 function pool(types,options={}){
  if(options.classAnyThree&&classRuleError(types,options)){const ids=new Set(classTypes(types).map(t=>t.id)),selected=new Set(selectedClasses(types,options).map(t=>t.id));return types.filter(t=>ids.has(t.id)?selected.has(t.id):t.target>0);}
  const all=variants(types,options);return types.filter(t=>all.some(v=>v.find(x=>x.id===t.id)?.target>0));
 }
 const api={damageTypes,classTypes,selectedClasses,classChoices,classRuleError,allowedClassGroups,targetTotal,variants,pool};if(typeof module!=='undefined')module.exports=api;else root.ComboRules=api;
})(globalThis);
