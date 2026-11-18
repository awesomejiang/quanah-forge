(function(root){
 function damageTypes(types){return {damage:types.find(t=>t.name?.trim().toLowerCase()==='damage'),boss:types.find(t=>t.name?.trim().toLowerCase()==='boss damage')};}
 function variants(types,options={}){
  const {damage,boss}=damageTypes(types);
  if(!options.damageEither||!damage||!boss||damage.target<=0||boss.target>0)return [types];
  return [types,types.map(t=>({...t,target:t.id===damage.id?0:t.id===boss.id?damage.target:t.target}))];
 }
 function pool(types,options={}){const all=variants(types,options);return types.filter(t=>all.some(v=>v.find(x=>x.id===t.id)?.target>0));}
 const api={damageTypes,variants,pool};if(typeof module!=='undefined')module.exports=api;else root.ComboRules=api;
})(globalThis);
