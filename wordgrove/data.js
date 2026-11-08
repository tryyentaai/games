export const games = [
 ['search','Word Search','Find the hidden words','Puzzles','#e1efcf'],
 ['cross','Crossword Creek','Solve the crossing clues','Puzzles','#cfe5e8'],
 ['scramble','Tile Tumble','Put the letters in order','Letters','#f9dfae'],
 ['catch','Acorn Catch','Catch the next letter','Arcade','#f2d3aa'],
 ['pairs','Forest Pairs','Flip and find a match','Arcade','#edd8df'],
 ['train','Word Express','Join the word pieces','Letters','#d3e5ed'],
 ['path','Letter Trail','Follow the spelling path','Puzzles','#d7e6bd'],
 ['spell','Echo Hollow','Listen, then spell','Letters','#dee0f2'],
 ['missing','Missing Leaf','Fill the empty space','Letters','#e4ebbf'],
 ['ladder','Memory Climb','Remember every letter','Arcade','#f2ddbd'],
 ['detective','Spelling Sleuth','Spot the right spelling','Puzzles','#e5daef']
];
export const starter=['fox','sun','nest','leaf','frog','pond','twig','bird'];
const key='wordgrove.camp.v1';
export function tidy(arr){return [...new Set((Array.isArray(arr)?arr:[]).filter(w=>typeof w==='string').map(w=>w.trim().toLowerCase()).filter(w=>/^[a-z]{1,24}$/.test(w)))].slice(0,60)}
export function loadState(){
 let a={};try{a=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
 let lists=(Array.isArray(a.lists)?a.lists:[]).filter(l=>l&&typeof l.id==='string'&&typeof l.name==='string'&&tidy(l.words).length).map(l=>({...l,words:tidy(l.words)}));
 if(!lists.some(l=>l.id==='starter'))lists.unshift({id:'starter',name:'Woodland words',words:starter});
 return {lists,active:lists.some(l=>l.id===a.active)?a.active:'starter',sounds:a.sounds!==false,stats:a.stats&&typeof a.stats==='object'?a.stats:{},runs:Number(a.runs)||0};
}
export function persist(s){try{localStorage.setItem(key,JSON.stringify(s));return true}catch{return false}}
export function choose(words,stats,recent=[]){
 let pool=words.filter(w=>!recent.includes(w));if(!pool.length)pool=words;
 const now=Date.now();
 const score=w=>{const s=stats[w];return !s||!Number.isFinite(s.last)?2:Math.min(1.5,(now-s.last)/(86400000*Math.pow(2,Math.min(Number(s.count)||0,5))))};
 return pool.map(w=>[w,score(w)+Math.random()*.45]).sort((a,b)=>b[1]-a[1])[0][0];
}
