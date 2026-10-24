import assert from 'node:assert/strict';
import {startGame} from './game.js';
let clock=0,frame,finished=0,lastProgress=0;
const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:(()=>{})});
const canvas={parentElement:{clientWidth:393,clientHeight:852},style:{},getContext:()=>ctx,addEventListener(){},removeEventListener(){}};
globalThis.document={getElementById:()=>canvas};globalThis.window={addEventListener(){},removeEventListener(){}};globalThis.Image=class{naturalWidth=0;};globalThis.devicePixelRatio=1;globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};Object.defineProperty(globalThis,'performance',{value:{now:()=>clock}});
const options={mode:'run',color:'#ff8a50',easy:true,calm:true,sound(){},banner(){},progress(_,p){lastProgress=p;},finish(){finished++;}};
let game=startGame(options);
for(let i=1;i<=82;i++){clock=i*500;frame(clock);}
assert.equal(finished,1,'A 2fps runner must finish after about 40 active seconds');assert.ok(lastProgress>=1);game.destroy();
clock=0;finished=0;lastProgress=0;game=startGame(options);
for(let i=1;i<=20;i++){clock=i*500;frame(clock);}game.pause();clock=30000;frame(clock);game.resume();
for(let i=1;i<=40;i++){clock=30000+i*500;frame(clock);}assert.equal(finished,0,'The paused 20 seconds must not count toward round duration');
for(let i=41;i<=62;i++){clock=30000+i*500;frame(clock);}assert.equal(finished,1);game.destroy();
console.log('Timing regression checks passed: 2fps rounds finish on active elapsed time and pauses do not consume play time.');
