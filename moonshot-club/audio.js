// Layered stadium mix with a locally served CC0 crowd recording. Unlocks on tap.
export class StadiumAudio{
 constructor(){this.enabled=true;this.ctx=null;this.lastPop=0;this.nodes=new Set();this.buffers=new Map();this.paused=false;}
 unlock(){if(!this.enabled)return;try{if(!this.ctx){const ctx=this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=ctx.createGain();this.master.gain.value=.68;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=16;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.18;this.master.connect(limiter).connect(ctx.destination);
 const impulse=ctx.createBuffer(2,ctx.sampleRate*.65,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*.45;}this.reverb=ctx.createConvolver();this.reverb.buffer=impulse;const wet=ctx.createGain();wet.gain.value=.15;this.reverb.connect(wet).connect(this.master);}
 this.paused=false;if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});this.loadCrowd();}catch{this.enabled=false;}}
 loadCrowd(){if(this.loadingCrowd)return;this.loadingCrowd=true;fetch('./audio/crowd-cheer.mp3').then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).then(b=>this.crowdBuffer=b).catch(()=>{});}
 recordedCrowd(mega){if(!this.enabled||!this.ctx||this.paused||!this.crowdBuffer)return false;try{const t=this.ctx.currentTime,s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=this.crowdBuffer;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(mega?.8:.62,t+.18);g.gain.setValueAtTime(mega?.8:.62,t+2);g.gain.exponentialRampToValueAtTime(.0001,t+4);s.connect(g);const clean=this.output(g,0,false);this.track(s,t,t+Math.min(4.1,this.crowdBuffer.duration),clean);return true;}catch{return false;}}
 output(node,pan=0,room=false){let end=node;const chain=[node];if(this.ctx.createStereoPanner){const p=this.ctx.createStereoPanner();p.pan.value=pan;node.connect(p);end=p;chain.push(p);}end.connect(this.master);if(room)end.connect(this.reverb);return ()=>chain.forEach(n=>n.disconnect());}
 track(node,t,end,cleanup){this.nodes.add(node);node.onended=()=>{this.nodes.delete(node);node.disconnect();cleanup?.();};node.start(t);node.stop(end);}
 tone(freq,time=.12,type='sine',vol=.12,delay=0,end=null,pan=0,room=false){if(!this.enabled||!this.ctx||this.paused)return;try{const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+time);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+Math.min(.015,time*.2));g.gain.exponentialRampToValueAtTime(.0001,t+time);o.connect(g);const clean=this.output(g,pan,room);this.track(o,t,t+time+.025,clean);}catch{}}
 noise(duration,volume=.12,filter=2000,delay=0,pan=0,attack=.003,band=false){if(!this.enabled||!this.ctx||this.paused)return;try{const ctx=this.ctx,t=ctx.currentTime+delay,key=Math.ceil(duration*4),frames=Math.ceil(ctx.sampleRate*(key/4));if(!this.buffers.has(key)){const buf=ctx.createBuffer(1,frames,ctx.sampleRate),d=buf.getChannelData(0);let pink=0;for(let i=0;i<d.length;i++){pink=.78*pink+.22*(Math.random()*2-1);d[i]=pink*2;}this.buffers.set(key,buf);}const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();s.buffer=this.buffers.get(key);f.type=band?'bandpass':'lowpass';f.frequency.value=filter;f.Q.value=band?.65:.7;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+Math.min(attack,duration*.35));g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f).connect(g);const clean=this.output(g,pan,true);this.track(s,t,t+duration,()=>{f.disconnect();clean();});}catch{}}
 tap(){this.tone(660,.055,'sine',.055,0,880);}
 pitch(){this.noise(.35,.08,900,0,-.3,.12,true);this.tone(105,.15,'sine',.045,0,75);}
 queue(){this.tone(880,.08,'sine',.065);}
 hit(mega){
  // A dry wooden transient, a low body thump, and a short stereo air tear.
  this.noise(.033,.8,6400);this.noise(.11,.3,1800,.014,.12);this.tone(190,.09,'triangle',.25,0,68);this.tone(1100,.035,'triangle',.09,.004,500);this.noise(.25,.1,3400,.045,-.25,.025,true);
  if(mega){this.tone(57,.48,'sine',.24,.025,32);this.noise(.48,.13,500,.05,0,.08);}
 }
 cheer(mega=false){
  // Independent left/right crowd swells keep the stand sound spacious.
  const recorded=this.recordedCrowd(mega);if(!recorded)for(const side of [-1,1]){this.noise(2.6,mega?.27:.2,800,Math.random()*.08,side*.75,.32,true);this.noise(1.9,.1,2100,.14,side*.5,.3,true);}
  for(let i=0;i<(mega?12:8);i++)this.noise(.045,.06,3200,.18+i*.12,(i%2?1:-1)*.65,.002);
  // Brief fan whistle and a compact stadium brass sting.
  this.tone(1480,.4,'sine',.026,.3,1900,-.45,true);
  const chords=mega?[[196,247,294],[220,277,330],[262,330,392]]:[[196,247,294],[262,330,392]];
  chords.forEach((chord,i)=>chord.forEach(f=>{this.tone(f,.42,'sawtooth',.016,.35+i*.24,null,0,true);this.tone(f*2,.35,'triangle',.02,.35+i*.24,null,0,true);}));
 }
 firework(){if(!this.ctx||this.ctx.currentTime-this.lastPop<.2)return;this.lastPop=this.ctx.currentTime;this.noise(.075,.13,1600);this.tone(68,.2,'sine',.1,0,32);this.noise(.42,.045,4200,.06,.2);}
 reward(){[660,880,1320].forEach((f,i)=>this.tone(f,.25,'triangle',.055,i*.1,null,0,true));}
 pause(){this.paused=true;for(const n of this.nodes)try{n.stop();}catch{}this.nodes.clear();if(this.ctx&&this.ctx.state==='running')this.ctx.suspend().catch(()=>{});}
 resume(){if(this.enabled&&this.ctx){this.paused=false;this.ctx.resume().catch(()=>{});}}
 mute(value){this.enabled=!value;if(value){for(const n of this.nodes)try{n.stop();}catch{}this.nodes.clear();if(this.ctx)this.ctx.suspend().catch(()=>{});}else this.unlock();}
}
