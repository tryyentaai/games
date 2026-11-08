import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const src=await readFile(new URL('../puzzles.js', import.meta.url),'utf8');
const {makeSearch,makeCross,makePath}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const lists=[['a'],['bee','see','tree','leaf'],['chalk','black','block','clock','click'],['mom','dad'],['supercalifragilisticexpialidocious','spelling','super','class']];
let seed=81;
const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
let tested=0;
for(let round=0;round<125;round++)for(const list of lists)for(const target of list){
  const search=makeSearch(target,rnd), path=makePath(target,rnd);
  for(const puzzle of [search,path]){
    assert.equal(puzzle.route.map(([r,c])=>puzzle.grid[r][c]).join(''),target);
    assert.equal(new Set(puzzle.route.map(p=>p.join(','))).size,target.length);
  }
  for(let n=1;n<path.route.length;n++){
    const [r,c]=path.route[n], [prevR,prevC]=path.route[n-1];
    assert.equal(Math.abs(r-prevR)+Math.abs(c-prevC),1);
  }
  const {grid,entries}=makeCross(target,list,rnd);
  assert.equal(entries[0].word,target);
  const occupied=new Map();
  for(const [i,e] of entries.entries()) {
    const coords=[...e.word].map((ch,j)=>[e.r+e.dr*j,e.c+e.dc*j]);
    assert.equal(coords.map(([r,c])=>grid[r][c]).join(''),e.word);
    if(i>0)assert.ok(coords.some(p=>occupied.has(p.join(','))));
    for(const p of coords)occupied.set(p.join(','),true);
  }
  for(const expected of ['bee','chalk'])if(target===expected)assert.ok(entries.length>1);
  tested++;
}
console.log(tested+' randomized sets passed search, path and crossword invariants.');
