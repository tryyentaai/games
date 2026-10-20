import assert from 'node:assert/strict';import {fresh,sanitize,finish,segmentDistance} from './core.mjs';
assert.equal(sanitize({version:2,stars:99}).stars,0);
assert.equal(sanitize({version:1,stars:10,scarf:'dragon'}).scarf,'sunrise');
assert.deepEqual(sanitize({version:1,stickers:['star','bad','star']}).stickers,['star']);
let s=fresh();for(const mode of ['run','throw','pop'])s=finish(s,mode,12).state;
assert.equal(s.rounds,3);assert.equal(s.stars,36);assert.equal(s.best.throw,12);assert.equal(s.stickers.length,3);
for(let i=0;i<30;i++)s=finish(s,'throw',12).state;assert.ok(s.stars>=100);assert.equal(s.stickers.length,12);
assert.throws(()=>finish(fresh(),'unknown',12));assert.equal(segmentDistance(5,3,0,0,10,0),3);assert.equal(segmentDistance(3,4,0,0,0,0),5);
console.log('Core model checks passed.');
