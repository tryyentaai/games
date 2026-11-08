import assert from 'node:assert/strict';
import {playArcade} from '../arcade.js';
class Elem {
  constructor(tag){this.tag=tag; this.children=[];this.handlers={};this.attrs={};this.style={setProperty(){}};this.textContent='';this.className='';this.classList={add:(...c)=>{this.className+=' '+c.join(' ')},remove:(...c)=>{this.className=this.className.split(' ').filter(k=>!c.includes(k)).join(' ')}}}
  append(...els){this.children.push(...els)}
  prepend(...els){this.children.unshift(...els)}
  setAttribute(k,v){this.attrs[k]=v}
  addEventListener(k,fn){this.handlers[k]=fn}
  replaceChildren(...els){this.children=els}
  click(){if(!this.disabled)this.handlers.click({detail:1})}
  *walk(){yield this;for(const c of this.children)yield* c.walk()}
  cls(name){return [...this.walk()].filter(e=>e.className.split(' ').includes(name))}
}
globalThis.document={createElement:t=>new Elem(t),createElementNS:(_,t)=>new Elem(t)};
const later=ms=>new Promise(r=>setTimeout(r,ms));
async function check(id,target){
const el=new Elem('div');
const wins=[],sounds=[];
const stop=playArcade(id,{el,target,sound:v=>sounds.push(v),speak(){},win:w=>wins.push(w)});
if(id==='catch'){
for(const l of target){const buttons=el.cls('ga-acorn');buttons.find(b=>b.textContent!==l).click();buttons.find(b=>b.textContent===l).click()}
}
if(id==='missing'){
for(let i=0;i<3 && el.cls('ga-hole').length;i++){
const a=target[el.cls('ga-letter').indexOf(el.cls('ga-hole')[0])];
el.cls('ga-key').find(b=>b.textContent!==a).click();
el.cls('ga-key').find(b=>b.textContent===a).click();
}
}
if(id==='train'){
let built='';
while(built!==target){
const cars=el.cls('ga-car');
const right=cars.filter(c=>target.slice(built.length).startsWith(c.textContent));
// Prefix pieces can overlap; rely on the game feedback to identify the expected piece.
let added=false;
for(const car of right){car.click();if(!el.cls('ga-car').includes(car)){built+=car.textContent;added=true;break}}
assert.ok(added,'can complete train '+target)
}
}
if(id==='pairs'){
const cards=el.cls('ga-card'),remembered=new Map();
while(cards.some(k=>!k.disabled)){
const available=cards.filter(k=>!k.disabled);
let first=available.find(k=>!remembered.has(k));
if(!first) first=available[0];
first.click();remembered.set(first,first.textContent);
const other=available.filter(k=>k!==first);
const second=other.find(k=>remembered.get(k)===first.textContent)||other.find(k=>!remembered.has(k))||other[0];
second.click();remembered.set(second,second.textContent);
if(!second.disabled)await later(960);
}
}
await later(375);assert.deepEqual(wins,[target]);stop();
}
await Promise.all(['a','sh','apple','banana','counterrevolutionary'].flatMap(w=>['catch','missing','pairs','train'].map(id=>check(id,w))));
const el=new Elem('div'),wins=[];const stop=playArcade('catch',{el,target:'a',win:w=>wins.push(w)});el.cls('ga-acorn').find(b=>b.textContent==='a').click();stop();await later(400);assert.equal(wins.length,0);
console.log('PASS 20 playthroughs (4 modes × 5 word shapes), wrong responses, delayed cleanup');
