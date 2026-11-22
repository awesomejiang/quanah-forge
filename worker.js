import {calculate} from './engine.js?v=destruction-event-1';
onmessage=({data})=>{try{postMessage({result:calculate(data)});}catch(e){postMessage({error:e.message});}};
