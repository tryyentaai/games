import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('./sw.js',import.meta.url),'utf8');
const events={},added=[],deleted=[],messages=[];let online=false,pending,claimed=false;
const scope='https://example.test/games/ninja-star-academy/';
const caches={open:async()=>({addAll:async list=>added.push(...list)}),keys:async()=>['other-app','ninja-star-%2Fgames%2Fninja-star-academy%2F-old','ninja-star-%2Fgames%2Fsibling%2F-old'],delete:async key=>deleted.push(key),match:async req=>String(req).endsWith('index.html')?'offline shell':'cached asset'};
vm.runInNewContext(code,{URL,encodeURIComponent,caches,fetch:async()=>{if(!online)throw Error('offline');return 'fresh online page';},self:{location:{href:scope+'sw.js'},addEventListener:(n,f)=>events[n]=f,clients:{claim:async()=>claimed=true,matchAll:async()=>[{postMessage:m=>messages.push(m)}]}}});
events.install({waitUntil:p=>pending=p});await pending;
for(const url of added){assert.ok(url.startsWith(scope));await access(new URL('./'+url.slice(scope.length),import.meta.url));}
assert.equal(added.length,10);assert.ok(!code.includes('skipWaiting'));
events.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['ninja-star-%2Fgames%2Fninja-star-academy%2F-old']);assert.equal(claimed,true);assert.equal(messages[0].type,'OFFLINE_READY');
events.fetch({request:{url:scope,method:'GET',mode:'navigate'},respondWith:p=>pending=p});assert.equal(await pending,'offline shell');
online=true;events.fetch({request:{url:scope,method:'GET',mode:'navigate'},respondWith:p=>pending=p});assert.equal(await pending,'fresh online page');
for(const request of [{url:'https://example.test/games/sibling/private',method:'GET'},{url:scope+'private',method:'POST'},{url:'https://another.test/private',method:'GET'}]){let intercepted=false;events.fetch({request,respondWith:()=>intercepted=true});assert.equal(intercepted,false);}
console.log('Offline checks passed: every cached file exists, offline navigation works, online navigation stays fresh, safe updates preserve sibling caches, and unrelated requests are untouched.');
