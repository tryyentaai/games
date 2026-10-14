// Simulated DOM integration test. This checks event/state/rendering behavior, not browser layout.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as content from './content.js';
import * as model from './model.js';
import * as art from './art.js';
class Element{
 constructor(){this.innerHTML='';this.listeners={};this.open=false;this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:x=>{if(this.classes.has(x)){this.classes.delete(x);return false;}this.classes.add(x);return true;},contains:x=>this.classes.has(x)};this.style={};}
 addEventListener(t,cb){this.listeners[t]=cb;}showModal(){this.open=true;}close(){this.open=false;}querySelector(){return new Element();}setAttribute(){}setCustomValidity(){}reportValidity(){}click(){}
}
const elements=new Map(['#app','#modal','#toast','#confetti'].map(x=>[x,new Element()]));
const mem=new Map();const storage={getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)};
const timeouts=new Map();let timerId=0;
class FakeFormData{constructor(form){this.form=form;}get(key){return this.form.values[key];}}
const window={localStorage:storage,scrollTo(){},addEventListener(){},confirm:()=>true,speechSynthesis:{cancel(){},speak(){}}};
const ctx=vm.createContext({...content,...model,...art,window,speechSynthesis:window.speechSynthesis,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},document:{querySelector:s=>elements.get(s),addEventListener(){},createElement:()=>new Element(),hidden:false},navigator:{},console,FormData:FakeFormData,URL,File:globalThis.File,Blob,setTimeout:(cb,ms)=>{timeouts.set(++timerId,{cb,ms});return timerId;},clearTimeout:id=>timeouts.delete(id),setInterval:()=>1,clearInterval(){},matchMedia:()=>({matches:true})});
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.runInContext(app,ctx);
const run=s=>vm.runInContext(s,ctx),root=elements.get('#app'),modal=elements.get('#modal');
function click(action){const el={dataset:{action},disabled:false};(modal.open?modal:root).listeners.click({target:{closest:()=>el}});}
function submit(id,values){const e={preventDefault(){},target:{id,values}};(modal.open?modal:root).listeners.submit(e);}
function ready(){if(modal.innerHTML.includes('data-action="begin"'))click('begin');if(modal.innerHTML.includes('data-action="try"'))click('try');}
function answer(correct=true){ready();const m=run('profile().activeMission');const q=m.questions[m.step];click('answer:'+q.options.findIndex(x=>correct?x===q.answer:x!==q.answer));}
assert.ok(root.innerHTML.includes('Small adventures.'));assert.ok(root.innerHTML.includes('data-action="mission:pets"'));
click('mission:pets');assert.ok(modal.open);assert.ok(modal.innerHTML.includes('A picnic for Pip'));click('begin');assert.ok(modal.innerHTML.includes('Let’s learn it together.'));click('try');assert.ok(modal.innerHTML.includes('MATH')||modal.innerHTML.includes('READING'));
answer(false);assert.ok(modal.innerHTML.includes('Not quite yet.'));answer();assert.ok(modal.innerHTML.includes('You kept exploring.'));click('next');ready();click('listen');assert.equal(run('profile().activeMission.current.heard'),true);answer();click('next');
for(let i=2;i<6;i++){answer();click('next');}
assert.ok(modal.innerHTML.includes('You made a little magic.'));assert.equal(run('profile().missions'),1);assert.equal(run('profile().coins'),18);assert.equal(run('profile().activeMission.complete'),true);
click('reward-decor');assert.equal(modal.open,false);assert.ok(root.innerHTML.includes('Wildflower patch'));click('buy:flowers');assert.ok(root.innerHTML.includes('data-action="place:0"'));click('place:0');assert.equal(run('profile().placements[0]'),'flowers');assert.equal(run('profile().coins'),6);assert.ok(root.innerHTML.includes('decor-on-map'));
click('nav:friends');assert.ok(root.innerHTML.includes('A name that feels like a friend'));submit('pet-form',{petName:'<script>hi</script>'});assert.ok(root.innerHTML.includes('&lt;script&gt;hi&lt;/script&gt;'));assert.ok(!root.innerHTML.includes('<script>hi</script>'));
click('parents');assert.ok(modal.innerHTML.includes('11 + 7'));submit('gate-form',{gate:'18'});assert.ok(modal.innerHTML.includes('Math level'));assert.ok(modal.innerHTML.includes('Learning notes'));
function settings(math,reading,mode='both',mathSupport='objects',narration='off'){submit('settings-form',{math:String(math),reading:String(reading),mode,narration,mathSupport,adaptive:'false',sound:'false',music:'false'});}
let sessions=0;
for(let math=0;math<3;math++)for(let reading=0;reading<3;reading++)for(const mode of ['both','math','reading'])for(const theme of Object.keys(content.THEMES)){
 settings(math,reading,mode);click('mission:'+theme);ready();for(let i=0;i<6;i++){answer();assert.ok(modal.innerHTML.includes('data-action="next"'));click('next');}assert.ok(modal.innerHTML.includes('You made a little magic.'));click('reward-home');sessions++;
}
assert.equal(run('profile().missions'),82);assert.deepEqual(Array.from(run('profile().unlocked')),['bunny','fox','cat']);
click('nav:friends');click('outfit:star');assert.equal(run('profile().outfit'),'star');const savedName=run('profile().petName');click('pet:fox');click('pet:bunny');assert.equal(run('profile().petName'),savedName,'Pet names survive companion switching');
settings(2,2,'math','hints');click('mission:story');ready();for(let i=0;i<6;i++){const q=run('profile().activeMission.questions[profile().activeMission.step]');if(q.visual.type==='clock')assert.ok(modal.innerHTML.includes('class="clock"'));answer();click('next');ready();}click('reward-home');
// Save/resume behavior and profiles through the actual application handlers.
settings(1,0);click('mission:shop');ready();answer();click('next');click('close');assert.ok(root.innerHTML.includes('data-action="resume"'));click('resume');assert.equal(run('profile().activeMission.step'),1);ready();assert.ok(modal.innerHTML.includes('2 / 6'));
click('close');click('profiles');submit('profile-form',{profileName:'Second explorer'});assert.equal(run('profile().coins'),0);assert.equal(run('profile().missions'),0);assert.equal(run('state.profiles.length'),2);assert.equal(run('state.profiles[0].activeMission.step'),1);assert.ok(model.validState(JSON.parse(mem.get(model.STORE_KEY))));
click('nav:journal');assert.ok(root.innerHTML.includes('Your story is just beginning.'));assert.ok(!root.innerHTML.includes('undefined'));
console.log(`UI simulation passed: all ${sessions} grade/mode/theme adventures, new-skill lesson, wrong/correct feedback, narration marking, reward, decoration placement, companion naming and escaping, parent gate/settings, companion unlocks, essential visuals in hints-only mode, resume, separate profiles, and valid persisted save.`);
