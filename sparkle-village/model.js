import {DEFAULT_SETTINGS,DECORATIONS,buildMission} from './content.js';
export const STORE_KEY='sparkle-village-v1';
export function newProfile(name='Explorer',id=String(Date.now())){return{id,name,pet:'bunny',petName:'Pip',petNames:{bunny:'Pip',fox:'Clover',cat:'Luna'},outfit:'cream',coins:0,stars:0,missions:0,owned:[],placements:{},settings:{...DEFAULT_SETTINGS},skills:{},history:[],activeMission:null,completedIds:[],unlocked:['bunny'],tier:0};}
export function initialState(){return{version:1,active:'explorer',profiles:[newProfile('Explorer','explorer')]};}
export function startMission(p,theme,seed=Date.now()){p.activeMission=buildMission(theme,p.settings,p.missions,p.settings.adaptive?p.tier:0,seed);return p.activeMission;}
export function gradeAnswer(m,answer){if(m.phase==='feedback'||m.complete)return false;const q=m.questions[m.step];m.current.attempts++;if(answer===q.answer){m.phase='feedback';return true;}m.current.hint=true;return false;}
export function recordStep(p,skip=false){const m=p.activeMission;if(!m||m.complete||m.step>=m.questions.length)return false;if(!skip&&m.phase!=='feedback')return false;
 const q=m.questions[m.step];const level=p.settings[q.subject];const key=`${q.subject}:${level}:${q.skill}`;const independent=!skip&&m.current.attempts===1&&!m.current.hint&&!m.current.heard;
 const stat=p.skills[key]||{subject:q.subject,level,skill:q.skill,total:0,independent:0,assisted:0,skipped:0,listened:0,sessions:[]};
 stat.total++;stat.independent+=Number(independent);stat.assisted+=Number(!skip&&!independent);stat.skipped+=Number(skip);stat.listened+=Number(m.current.heard);if(independent&&!stat.sessions.includes(m.id))stat.sessions.push(m.id);stat.sessions=stat.sessions.slice(-12);p.skills[key]=stat;
 m.responses.push({subject:q.subject,skill:q.skill,independent,skip,heard:m.current.heard,hint:m.current.hint,attempts:m.current.attempts});m.step++;m.current={attempts:0,hint:false,heard:false};m.phase='question';return true;
}
export function finishMission(p){const m=p.activeMission;if(!m||m.step!==m.questions.length||p.completedIds.includes(m.id))return null;
 const solved=m.responses.filter(r=>!r.skip).length;const reward=6+solved*2;p.coins+=reward;p.stars+=solved;p.missions++;
 p.completedIds.push(m.id);p.completedIds=p.completedIds.slice(-100);m.complete=true;m.phase='complete';m.reward=reward;
 p.history.unshift({id:m.id,theme:m.theme,at:Date.now(),solved,independent:m.responses.filter(r=>r.independent).length,total:m.questions.length});p.history=p.history.slice(0,50);
 if(p.missions>=2&&!p.unlocked.includes('fox'))p.unlocked.push('fox');if(p.missions>=4&&!p.unlocked.includes('cat'))p.unlocked.push('cat');
 // Evidence must include distinct completed sessions. Grade selections never change automatically.
 const completed=new Set(p.completedIds);const stable=Object.values(p.skills).filter(s=>s.subject==='math'&&s.level===p.settings.math&&s.independent>=5&&s.sessions.filter(id=>completed.has(id)).length>=2);
 if(p.settings.adaptive&&stable.length>=2)p.tier=Math.min(2,Math.floor(stable.length/2));
 return{reward,solved,independent:m.responses.filter(r=>r.independent).length};
}
export function buyDecoration(p,id){const item=DECORATIONS.find(d=>d.id===id);if(!item||p.owned.includes(id)||p.coins<item.cost)return false;p.coins-=item.cost;p.owned.push(id);return true;}
export function placeDecoration(p,id,slot){if(!p.owned.includes(id)||!Number.isInteger(slot)||slot<0||slot>5)return false;for(const k of Object.keys(p.placements))if(p.placements[k]===id)delete p.placements[k];p.placements[slot]=id;return true;}
function validVisual(v){
 if(!v||typeof v!=='object')return false;
 const nums=(keys,max=100)=>keys.every(k=>Number.isInteger(v[k])&&v[k]>=0&&v[k]<=max);
 switch(v.type){case'book':return true;case'count':return nums(['n'],20);case'add':case'subtract':case'compare':case'length':return nums(['a','b'],25);case'line':return nums(['max'],100);case'equation':return typeof v.text==='string'&&v.text.length<80;case'shape':return ['triangle','square','hexagon'].includes(v.shape);case'clock':return nums(['h'],12)&&v.h>=1&&[0,15,30,45].includes(v.m);case'coins':return nums(['quarters','dimes','pennies'],9);case'place':return nums(['tens','ones'],9)&&(v.hundreds===undefined||nums(['hundreds'],9));default:return false;}
}
export function validState(v){
 if(!v||v.version!==1||!Array.isArray(v.profiles)||!v.profiles.length||v.profiles.length>6)return false;
 const ids=new Set();for(const p of v.profiles){if(!p||typeof p.id!=='string'||!/^[-a-zA-Z0-9]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||p.name.length>24||!['bunny','fox','cat'].includes(p.pet)||typeof p.petName!=='string'||p.petName.length>20)return false;ids.add(p.id);
 for(const k of ['coins','stars','missions','tier'])if(!Number.isSafeInteger(p[k])||p[k]<0||p[k]>1000000)return false;
 if(!p.settings||![0,1,2].includes(p.settings.math)||![0,1,2].includes(p.settings.reading)||!['both','math','reading'].includes(p.settings.mode)||!['tap','auto','off'].includes(p.settings.narration)||!['objects','line','hints'].includes(p.settings.mathSupport))return false;
 if(!Array.isArray(p.owned)||p.owned.some(id=>!DECORATIONS.some(d=>d.id===id))||!Array.isArray(p.history)||!Array.isArray(p.completedIds)||!Array.isArray(p.unlocked)||!p.skills||typeof p.skills!=='object'||Array.isArray(p.skills)||!p.placements||typeof p.placements!=='object')return false;
 if(p.activeMission){const m=p.activeMission;if(!['pets','shop','story'].includes(m.theme)||!Array.isArray(m.questions)||m.questions.length!==6||!Number.isInteger(m.step)||m.step<0||m.step>6||!Array.isArray(m.responses)||!m.current||!['intro','question','feedback','complete'].includes(m.phase))return false;for(const q of m.questions)if(!q||!['math','reading'].includes(q.subject)||typeof q.answer!=='string'||!Array.isArray(q.options)||q.options.length!==4||!q.options.every(x=>typeof x==='string')||!q.options.includes(q.answer)||!['prompt','skill','explain','example'].every(k=>typeof q[k]==='string')||!q.visual||typeof q.visual.type!=='string')return false;}
 for(const s of Object.values(p.skills))if(!s||typeof s.skill!=='string'||!Array.isArray(s.sessions)||!['total','independent','assisted','skipped','listened'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0))return false;
 if(p.outfit!==undefined&&!['cream','lilac','mint','star'].includes(p.outfit))return false;if(p.petNames!==undefined&&(!p.petNames||typeof p.petNames!=='object'||!Object.values(p.petNames).every(n=>typeof n==='string'&&n.length<=20)))return false;
 if(p.owned.length>6||new Set(p.owned).size!==p.owned.length||p.history.length>50||p.completedIds.length>100||p.unlocked.some(id=>!['bunny','fox','cat'].includes(id))||!p.unlocked.includes(p.pet))return false;
 if(!Object.entries(p.placements).every(([slot,id])=>/^[0-5]$/.test(slot)&&p.owned.includes(id)))return false;
 if(!p.history.every(h=>h&&['pets','shop','story'].includes(h.theme)&&Number.isSafeInteger(h.at)&&Number.isInteger(h.solved)&&h.solved>=0&&h.solved<=6))return false;
 if(p.activeMission){const m=p.activeMission;if(typeof m.id!=='string'||m.responses.length!==m.step||!Number.isSafeInteger(m.current.attempts)||m.current.attempts<0||typeof m.current.heard!=='boolean'||typeof m.current.hint!=='boolean')return false;
 for(const q of m.questions)if(!validVisual(q.visual)||new Set(q.options).size!==4||q.prompt.length>2000||q.answer.length>500)return false;
 if(m.responses.some(r=>!r||typeof r.independent!=='boolean'||typeof r.skip!=='boolean'))return false;
 }
 }return ids.has(v.active);
}
export function loadState(storage){try{const raw=storage.getItem(STORE_KEY);if(raw){const parsed=JSON.parse(raw);if(validState(parsed))return parsed;}}catch{}return initialState();}
export function saveState(storage,state){try{storage.setItem(STORE_KEY,JSON.stringify(state));return true;}catch{return false;}}
