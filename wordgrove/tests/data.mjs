import assert from 'node:assert/strict';
import {tidy,choose,persist,loadState} from '../data.js';
let value;globalThis.localStorage={getItem:()=>value,setItem:(_,v)=>value=v};
assert.deepEqual(tidy(['   SHIP','ship','',null]),['ship']);
let state=loadState();state.lists.push({id:'week',name:'Friday',words:['cat','ship']});state.active='week';assert.ok(persist(state));assert.equal(loadState().active,'week');
value='{ broken';assert.equal(loadState().active,'starter');
for(let n=0;n<20;n++)assert.equal(choose(['cat','dog'],{},['cat']),'dog');
globalThis.localStorage.setItem=()=>{throw Error('quota')};assert.equal(persist(state),false);
console.log('Storage, normalization and practice scheduling passed.');
