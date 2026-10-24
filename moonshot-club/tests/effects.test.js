import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CelebrationFX} from '../fx.js';
import {createCanvas} from '../diagnostics/setup-scene.mjs';

test('fireworks stay bounded over repeated home runs and respect pause/gentle mode',()=>{globalThis.devicePixelRatio=1;const canvas=createCanvas(390,844);canvas.clientWidth=390;canvas.clientHeight=844;const fx=new CelebrationFX(canvas,{firework(){}});let peak=0;for(let i=0;i<6000;i++){if(i%360===0)fx.celebrate(i%720===0);fx.update(1/60);peak=Math.max(peak,fx.items.length);}assert.ok(peak<=650);const time=fx.time;fx.update(0);assert.equal(fx.time,time);fx.calm=true;fx.update(1/60);assert.equal(fx.items.filter(p=>['rocket','confetti','spark'].includes(p.type)).length,0);fx.clear();assert.equal(fx.items.length,0);assert.equal(fx.schedule.length,0);});
