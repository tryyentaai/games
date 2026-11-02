export const TAU=Math.PI*2;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const mod=(a,b)=>((a%b)+b)%b;
export const COURSES=[
 {id:'cove',name:'SUNSHINE COVE',tag:'Sea breeze. Big boosts.',label:'Coastal circuit',sky:0xaadfed,fog:0xc0e9eb,water:0x48b5ca,ground:0x8fc976,road:0x526b77,accent:'#ffcb51',length:1220,shape:[[0,0],[90,0],[150,65],[130,150],[40,200],[-75,160],[-120,80],[-80,10]],hills:2},
 {id:'mesa',name:'CANYON RUN',tag:'Red rocks. Golden hour.',label:'Desert switchbacks',sky:0xffd1a0,fog:0xffd7b0,water:0xdb986b,ground:0xe8b37d,road:0x856d69,accent:'#ff9470',length:1370,shape:[[0,0],[100,-15],[165,50],[100,115],[150,195],[50,235],[-60,180],[-130,100],[-85,25]],hills:7},
 {id:'aurora',name:'STARLIGHT SUMMIT',tag:'Cool air. Electric corners.',label:'Alpine night race',sky:0x182c54,fog:0x314a73,water:0x294064,ground:0xafcddd,road:0x596a8b,accent:'#99f5d4',length:1300,shape:[[0,0],[100,10],[150,90],[100,150],[20,140],[-40,215],[-115,140],[-140,45],[-60,-15]],hills:10}
];
export const DRIVERS=[{name:'KIP',kind:'fox',color:0xf47b42,hex:'#ff9252',caption:'Tiny fox. Big ambitions.'},{name:'MOSS',kind:'frog',color:0x5bbd89,hex:'#91d5a3',caption:'Cool head. Fast feet.'},{name:'BOLT',kind:'robot',color:0x6ea8e5,hex:'#8dbdff',caption:'Built for the next boost.'},{name:'POPPY',kind:'bear',color:0xd084b3,hex:'#efabd2',caption:'Sweet smile. Serious speed.'}];
export const ITEMS=['boost','shield','rocket','bubble'];
export function loadSave(raw){try{const o=JSON.parse(raw);return {v:1,sound:o.sound!==false,motion:o.motion!==false,assist:o.assist!==false,difficulty:['easy','normal','fast'].includes(o.difficulty)?o.difficulty:'easy',records:Object.fromEntries(Object.entries(o.records||{}).filter(([k,v])=>/^(cove|mesa|aurora)-(easy|normal|fast)-(assist|manual)$/.test(k)&&Number.isFinite(v)&&v>10&&v<3600))};}catch{return {v:1,sound:true,motion:true,assist:true,difficulty:'easy',records:{}}}}
export function createRace({length=1220,difficulty='easy',assist=true,driver=0,seed=123}={}){return {phase:'countdown',countdown:3.4,time:0,length,difficulty,assist,seed,player:driver,item:null,itemCooldown:0,event:null,events:[],hazards:[],projectiles:[],finished:[],racers:Array.from({length:6},(_,i)=>({id:i,driver:i===0?driver:(driver+i)%4,distance:-i*4,lane:(i%2?1:-1)*3,speed:0,boost:0,shield:0,stun:0,charge:0,drifting:false,lap:1,coins:0,done:false,finishTime:null,aiTimer:5+i*2}))}}
function rand(r){r.seed=(Math.imul(1664525,r.seed)+1013904223)>>>0;return r.seed/4294967296}
export function rank(r){return [...r.racers].sort((a,b)=>(a.done&&b.done?a.finishTime-b.finishTime:a.done?-1:b.done?1:b.distance-a.distance));}
export function emit(r,type,data={}){r.events.push({type,...data});if(r.events.length>40)r.events.shift();}
export function useItem(r,id=0,type=r.item){const p=r.racers[id];if(!type||r.phase!=='racing'||p.done)return false;
 if(id===0)r.item=null;
 if(type==='boost')p.boost=Math.max(p.boost,2.6);
 if(type==='shield')p.shield=6;
 if(type==='rocket'){let target=rank(r).filter(x=>x.id!==id&&!x.done&&x.distance>p.distance&&x.distance-p.distance<180).sort((a,b)=>a.distance-b.distance)[0];if(target)r.projectiles.push({owner:id,target:target.id,distance:p.distance+3,lane:p.lane,life:5});else p.boost=1.8;}
 if(type==='bubble')r.hazards.push({distance:mod(p.distance-8,r.length),lane:p.lane,owner:id,life:12});
 emit(r,'item',{id,item:type});return true;}
export function pickup(r,id=0){if(r.phase!=='racing'||id!==0||r.item||r.itemCooldown>0)return false;r.item=ITEMS[Math.floor(rand(r)*ITEMS.length)];r.itemCooldown=2;emit(r,'pickup',{item:r.item});return true;}
function hit(r,p){if(p.shield>0){p.shield=0;emit(r,'block',{id:p.id});return;}p.stun=0.85;p.speed*=0.55;emit(r,'hit',{id:p.id});}
export function step(r,input={},dt=1/60){dt=clamp(dt,0,1/30);if(r.phase==='paused'||r.phase==='finished')return;
 if(r.phase==='countdown'){r.countdown-=dt;if(r.countdown<=0){r.phase='racing';emit(r,'go');}return;}
 r.time+=dt;r.itemCooldown=Math.max(0,r.itemCooldown-dt);
 const base={easy:47,normal:53,fast:61}[r.difficulty];
 for(const p of r.racers){if(p.done)continue;for(const key of ['boost','shield','stun'])p[key]=Math.max(0,p[key]-dt);
 let steer=p.id===0?clamp(input.steer||0,-1,1):clamp((Math.sin(p.distance*0.019+p.id)*3.8-p.lane)*0.7,-1,1);
 p.steer=steer;
 const drift=p.id===0&&!!input.drift&&Math.abs(steer)>.15&&p.speed>20&&p.stun<=0;
 if(drift)p.charge=Math.min(2.4,p.charge+dt);else if(p.drifting){if(p.charge>.65){p.boost=p.charge>1.5?2:1.15;emit(r,'drift',{tier:p.charge>1.5?2:1});}p.charge=0;}
 p.drifting=drift;
 p.lane+=steer*dt*(drift?12:9)*(p.speed/base);
 if(p.id===0){p.lane-=(input.curve||0)*p.speed*dt*(drift?17:11);if(r.assist&&Math.abs(p.lane)>7.7)p.lane-=Math.sign(p.lane)*(Math.abs(p.lane)-7.7)*dt*3;}
 p.lane=clamp(p.lane,-12.5,12.5);
 const off=Math.abs(p.lane)>9;
 const aiFactor=p.id===0?1:({easy:.87,normal:.965,fast:1.015}[r.difficulty]+Math.sin(p.id*2.7)*.035);
 const target=base*aiFactor*(off?.57:1)*(p.boost>0?1.48:1)*(p.stun>0?.36:1)*(p.id===0&&input.brake?.55:1);
 p.speed+=(target-p.speed)*Math.min(1,dt*(target>p.speed?1.4:4));
 const old=p.distance;p.distance+=p.speed*dt;p.lap=Math.min(3,Math.max(1,Math.floor(Math.max(0,p.distance)/r.length)+1));
 if(p.id===0&&Math.floor(Math.max(0,old)/r.length)<Math.floor(p.distance/r.length)&&p.distance<r.length*3)emit(r,'lap',{lap:p.lap});
 if(p.distance>=r.length*3){p.done=true;p.finishTime=r.time-(p.distance-r.length*3)/Math.max(p.speed,1);p.distance=r.length*3;r.finished.push(p.id);emit(r,'finish',{id:p.id});if(p.id===0)r.phase='finished';}
 if(p.id!==0){p.aiTimer-=dt;if(p.aiTimer<=0){p.aiTimer=8+rand(r)*7;useItem(r,p.id,ITEMS[Math.floor(rand(r)*4)]);}}
 }
 for(let i=0;i<r.racers.length;i++)for(let j=i+1;j<r.racers.length;j++){const a=r.racers[i],b=r.racers[j];if(!a.done&&!b.done&&Math.abs(a.distance-b.distance)<2.7&&Math.abs(a.lane-b.lane)<2){let sign=a.lane>=b.lane?1:-1;a.lane+=sign*dt*4;b.lane-=sign*dt*4;}}
 for(const h of r.hazards){h.life-=dt;for(const p of r.racers){if(p.id!==h.owner&&Math.abs(mod(p.distance-h.distance+r.length/2,r.length)-r.length/2)<2&&Math.abs(p.lane-h.lane)<2&&h.life>0){hit(r,p);h.life=0;}}}r.hazards=r.hazards.filter(h=>h.life>0).slice(-16);
 for(const q of r.projectiles){q.life-=dt;if(q.life<=0)continue;q.distance+=90*dt;const p=r.racers[q.target];q.lane+=(p.lane-q.lane)*dt*5;if(q.distance>=p.distance){hit(r,p);q.life=0;}}r.projectiles=r.projectiles.filter(q=>q.life>0).slice(-12);
}
