import {build} from 'esbuild';
import {copyFileSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
await build({entryPoints:['vendor-entry.js'],bundle:true,minify:true,format:'esm',target:['safari16'],outfile:'dist/vendor/three.js'});
copyFileSync('node_modules/three/LICENSE','dist/vendor/THREE-LICENSE.txt');
const assets=['index.html','style.css','game.js','simulation.js','world.js','software-renderer.js','audio.js','vendor/three.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
const hash=createHash('sha256');for(const p of assets)hash.update(readFileSync('dist/'+p));const version=hash.digest('hex').slice(0,12);
writeFileSync('dist/sw.js',`const CACHE='pocket-rally64-${version}';\nconst ASSETS=${JSON.stringify(['./',...assets.map(p=>'./'+p)])};\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));\n// Wait until old game windows close. Never interrupt a race.\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pocket-rally64-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});\n`);
console.log('Static game ready in dist/. Cache version '+version);
