import {calculateCube} from './cube-engine.js';
let data;onmessage=async({data:options})=>{try{data??=await fetch('./black-data.json').then(r=>{if(!r.ok)throw Error('无法读取词条数据。');return r.json();});postMessage({result:calculateCube(data,options)});}catch(e){postMessage({error:e.message});}};
