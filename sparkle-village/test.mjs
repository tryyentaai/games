import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {THEMES,DEFAULT_SETTINGS,DECORATIONS,READING_COUNTS,mathQuestion,readingQuestion,buildMission} from './content.js';
import {initialState,newProfile,startMission,gradeAnswer,recordStep,finishMission,buyDecoration,placeDecoration,validState,loadState,saveState} from './model.js';
let generated=0;
for(let level=0;level<3;level++)for(let seed=0;seed<60;seed++)for(let index=0;index<30;index++){
 const q=mathQuestion(level,index,seed,seed%3,'pets');generated++;
 assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.options.includes(q.answer));assert.ok(q.explain&&q.example);assert.ok(!q.prompt.includes('undefined'));
 const v=q.visual;const actual=Number(q.answer);
 if(v.type==='count')assert.equal(actual,v.n);
 if(v.type==='add')assert.equal(actual,v.a+v.b);
 if(v.type==='subtract')assert.equal(actual,v.a-v.b);
 if(v.type==='compare')assert.equal(actual,Math.max(v.a,v.b));
 if(v.type==='place')assert.equal(actual,(v.hundreds||0)*100+v.tens*10+v.ones);
 if(v.type==='length')assert.equal(actual,v.a-v.b);
 if(v.type==='clock')assert.equal(q.answer,`${v.h}:${String(v.m).padStart(2,'0')}`);
 if(v.type==='coins')assert.equal(actual,v.quarters*25+v.dimes*10+v.pennies);
 if(level===0)assert.ok(actual<=10);
 if(q.skill==='Add within twenty'||q.skill==='Subtract within twenty')assert.ok(actual<=20);
 if(q.skill==='Add within one hundred'||q.skill==='Subtract within one hundred')assert.ok(actual<=100);
 if(v.type==='equation'){const nums=v.text.match(/\d+/g).map(Number);const expected=v.text.includes('−')?(nums.length===3?nums[0]-nums[1]+nums[2]:nums[0]-nums[1]):nums[0]+nums[1];assert.equal(actual,expected);}
}
for(let l=0;l<3;l++)for(let i=0;i<READING_COUNTS[l];i++){const q=readingQuestion(l,i,42);assert.equal(new Set(q.options).size,4);assert.ok(q.options.includes(q.answer));assert.ok(q.example&&q.explain);}
for(let math=0;math<3;math++)for(let reading=0;reading<3;reading++)for(const mode of ['both','math','reading'])for(const theme of Object.keys(THEMES)){
 const m=buildMission(theme,{...DEFAULT_SETTINGS,math,reading,mode},0,0,13);assert.equal(m.questions.length,6);assert.equal(m.theme,theme);
 if(mode!=='both')assert.ok(m.questions.every(q=>q.subject===mode));else assert.equal(m.questions.filter(q=>q.subject==='math').length,3);
}
const p=newProfile('Test','test');startMission(p,'pets',1);const m=p.activeMission;m.phase='question';
assert.equal(recordStep(p),false,'Cannot advance before answering');
assert.equal(gradeAnswer(m,m.questions[0].answer),true);assert.equal(gradeAnswer(m,m.questions[0].answer),false,'No duplicate answers');assert.equal(recordStep(p),true);
m.current.heard=true;assert.equal(gradeAnswer(m,m.questions[1].answer),true);recordStep(p);
const bad=m.questions[2].options.find(x=>x!==m.questions[2].answer);assert.equal(gradeAnswer(m,bad),false);assert.equal(gradeAnswer(m,m.questions[2].answer),true);recordStep(p);
m.current.hint=true;gradeAnswer(m,m.questions[3].answer);recordStep(p);
recordStep(p,true);gradeAnswer(m,m.questions[5].answer);recordStep(p);assert.equal(m.step,6);
const reward=finishMission(p);assert.equal(reward.independent,2);assert.equal(reward.solved,5);assert.equal(reward.reward,16);assert.equal(p.missions,1);assert.equal(finishMission(p),null,'Completion is idempotent');assert.equal(p.coins,16);assert.equal(p.tier,0);
const stats=Object.values(p.skills);assert.equal(stats.reduce((s,x)=>s+x.independent,0),2);assert.equal(stats.reduce((s,x)=>s+x.assisted,0),3);assert.equal(stats.reduce((s,x)=>s+x.listened,0),1);assert.equal(stats.reduce((s,x)=>s+x.skipped,0),1);
assert.equal(buyDecoration(p,'flowers'),true);assert.equal(p.coins,4);assert.equal(buyDecoration(p,'flowers'),false);assert.equal(buyDecoration(p,'tree'),false);assert.equal(placeDecoration(p,'tree',0),false);assert.equal(placeDecoration(p,'flowers',7),false);assert.equal(placeDecoration(p,'flowers',0),true);assert.equal(placeDecoration(p,'flowers',2),true);assert.deepEqual(p.placements,{2:'flowers'});
const state={version:1,active:'test',profiles:[p]};assert.equal(validState(state),true);const mem=new Map();const storage={getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)};assert.equal(saveState(storage,state),true);assert.deepEqual(loadState(storage),state);
state.profiles.push(newProfile('Other','other'));assert.equal(state.profiles[1].coins,0);state.profiles[1].settings.math=2;assert.equal(state.profiles[0].settings.math,0);assert.equal(validState(state),true);
assert.equal(saveState({setItem(){throw Error('quota');}},state),false);assert.deepEqual(loadState({getItem(){return'{bad';}}),initialState());
const malicious=structuredClone(state);malicious.profiles[0].activeMission.questions[0].visual={type:'count',n:999999999};assert.equal(validState(malicious),false);const dup=structuredClone(state);dup.profiles.push(dup.profiles[0]);assert.equal(validState(dup),false);
// Different grade selections really change the content and data, not only labels.
assert.notEqual(mathQuestion(0,0,1).skill,mathQuestion(1,0,1).skill);assert.notEqual(mathQuestion(1,0,1).skill,mathQuestion(2,0,1).skill);assert.notEqual(readingQuestion(0,0,1).skill,readingQuestion(1,0,1).skill);assert.notEqual(readingQuestion(1,0,1).skill,readingQuestion(2,0,1).skill);
// Resumable partial mission and stable independent evidence across completed sessions.
const adapt=newProfile('Adaptive','adaptive');adapt.settings={...DEFAULT_SETTINGS,adaptive:true};startMission(adapt,'pets',100);adapt.activeMission.phase='question';gradeAnswer(adapt.activeMission,adapt.activeMission.questions[0].answer);recordStep(adapt);assert.equal(adapt.tier,0);const partial={version:1,active:'adaptive',profiles:[adapt]};assert.ok(validState(partial));assert.equal(JSON.parse(JSON.stringify(partial)).profiles[0].activeMission.step,1);
function completeIndependently(p,seed){startMission(p,'pets',seed);p.activeMission.phase='question';for(let i=0;i<6;i++){gradeAnswer(p.activeMission,p.activeMission.questions[i].answer);recordStep(p);}finishMission(p);}
for(let i=0;i<20;i++)completeIndependently(adapt,1000+i);assert.ok(adapt.tier>0&&adapt.tier<=2);assert.equal(adapt.settings.math,0,'Adaptive never changes selected grade');
const listener=newProfile('Reader','reader');listener.settings={...DEFAULT_SETTINGS,adaptive:true,mode:'reading'};for(let i=0;i<20;i++)completeIndependently(listener,2000+i);assert.equal(listener.tier,0,'Reading mastery cannot increase math difficulty');
// Assets cached for standalone offline operation have no external dependencies.
const sw=readFileSync(new URL('./sw.js',import.meta.url),'utf8');const assetSection=sw.match(/const ASSETS=\[([^\]]+)\]/)[1];for(const [,file] of assetSection.matchAll(/'([^']+)'/g)){if(file==='./')continue;assert.ok(existsSync(new URL(file,import.meta.url)),`Cached asset exists: ${file}`);}
for(const file of ['app.js','art.js','content.js','model.js','style.css','index.html'])assert.ok(!readFileSync(new URL(file,import.meta.url),'utf8').match(/https?:\/\//),`${file} has no external requests`);
console.log(`${generated} generated math questions checked; 32 authored reading tasks checked; 81 grade/mode/theme combinations checked.`);
console.log('Passed: independent/listened/hinted/error/skip scoring; completion idempotence; currencies; ownership and placement; profile isolation; save/restore; partial resumption; invalid imports; grade changes; offline asset coverage.');
