import * as T from './three.module.min.js';

// Three.js (MIT). Native instancing and one tightly bounded shadow map keep
// the stadium inexpensive enough for phones without sacrificing field detail.
const PARKS = [
 {top:0x051224,horizon:0x293c5b,fog:0x142b40,wall:0x0c3544,seat:0x153a51,accent:0xb9f658,skyLight:0xbadfff,sun:0xe3f3ff,exposure:1.08},
 {top:0x151b38,horizon:0xbc746f,fog:0x4b4e67,wall:0x254e60,seat:0x465071,accent:0xffa477,skyLight:0xe4c4ee,sun:0xffe2ba,exposure:1.14},
 {top:0x03081d,horizon:0x24365c,fog:0x182540,wall:0x232951,seat:0x272e52,accent:0xbba8ff,skyLight:0xb9caff,sun:0xd4deff,exposure:1.05}
];
const V = (x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const seed=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);};

// Exported separately so geometry counts, UVs and finite coordinates can be
// checked without a browser or a WebGL context.
export function createBallparkGeometry(){
 return {
  field:new T.CircleGeometry(105,96),
  box:new T.BoxGeometry(1,1,1),
  seat:new T.BoxGeometry(.66,.22,.68),
  spectator:new T.CapsuleGeometry(.18,.38,2,5),
  head:new T.SphereGeometry(.18,6,4),
  ball:new T.SphereGeometry(.33,24,16),
  athlete:new T.SphereGeometry(1,20,14)
 };
}

export class Ballpark {
 constructor(canvas){
  this.canvas=canvas;
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.65));
  this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.toneMapping=T.ACESFilmicToneMapping;
  this.renderer.shadowMap.enabled=true;
  this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene=new T.Scene();this.world=new T.Group();this.scene.add(this.world);
  this.camera=new T.PerspectiveCamera(54,1,.12,430);
  this.camera.position.set(.6,6.8,24);
  this.look=V(0,1,-19);this.camera.lookAt(this.look);
  this.mats=new Map();this.geometries=createBallparkGeometry();
  this.hemi=new T.HemisphereLight(0xbadfff,0x203a27,1.65);this.scene.add(this.hemi);
  this.sun=new T.DirectionalLight(0xe3f3ff,3.4);this.sun.position.set(-16,33,19);
  this.sun.target.position.set(0,0,-2);this.scene.add(this.sun,this.sun.target);
  this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
  Object.assign(this.sun.shadow.camera,{left:-15,right:15,top:16,bottom:-16,near:.5,far:85});
  this.sun.shadow.camera.updateProjectionMatrix();
  this.sun.shadow.bias=-.00035;this.sun.shadow.normalBias=.035;this.sun.shadow.radius=3;
  const rim=new T.DirectionalLight(0x50d8ff,1.9);rim.position.set(15,12,-24);this.scene.add(rim);
  this.rim=rim;this.park=0;this.flight=false;this.swingStart=-10;this.calm=false;this.home=true;
  this.trail=[];this.history=[];this.flags=[];this.walls=[];this.seats=[];this.leds=[];
  this.build();this.setPark(0);this.resize();
 }
 mat(color,roughness=.8,metalness=0){
  const key=`${color}/${roughness}/${metalness}`;
  if(!this.mats.has(key))this.mats.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));
  return this.mats.get(key);
 }
 mesh(geometry,material,x=0,y=0,z=0,parent=this.world){
  const o=new T.Mesh(geometry,typeof material==='number'?this.mat(material):material);
  o.position.set(x,y,z);parent.add(o);return o;
 }
 box(w,h,d,c,x=0,y=0,z=0,parent=this.world){const o=this.mesh(this.geometries.box,c,x,y,z,parent);o.scale.set(w,h,d);return o;}
 ellipsoid(x,y,z,sx,sy,sz,color,parent=this.world){const o=this.mesh(this.geometries.athlete,color,x,y,z,parent);o.scale.set(sx,sy,sz);return o;}
 cyl(rt,rb,h,c,x=0,y=0,z=0,parent=this.world,detail=16){return this.mesh(new T.CylinderGeometry(rt,rb,h,detail),c,x,y,z,parent);}
 rod(a,b,r,c,parent=this.world){const mid=a.clone().add(b).multiplyScalar(.5);const o=this.cyl(r,r,a.distanceTo(b),c,mid.x,mid.y,mid.z,parent,12);o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return o;}
 ground(w,h,c,x,z,y=.02){const m=this.mesh(new T.PlaneGeometry(w,h),c,x,y,z);m.rotation.x=-Math.PI/2;m.receiveShadow=true;return m;}
 line(points,color=0xf4eee0){const l=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>V(...p))),new T.LineBasicMaterial({color}));this.world.add(l);return l;}
 texture(kind){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  const base=kind==='grass'?[47,100,47]:[157,105,70];const image=x.createImageData(512,512);
  for(let i=0;i<512*512;i++){const n=(seed(i)*2-1)*(kind==='grass'?13:23);for(let j=0;j<3;j++)image.data[i*4+j]=base[j]+n;image.data[i*4+3]=255;}
  x.putImageData(image,0,0);
  if(kind==='grass'){x.strokeStyle='#7da35328';x.lineWidth=1;for(let i=0;i<5000;i++){const px=seed(i+1)*512,py=seed(i+9000)*512;x.beginPath();x.moveTo(px,py);x.lineTo(px+.5,py+2+seed(i)*3);x.stroke();}}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='grass'?23:5,kind==='grass'?23:5);t.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());return t;
 }
 glowTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.08,'rgba(225,247,255,.95)');g.addColorStop(.24,'rgba(126,213,255,.25)');g.addColorStop(1,'rgba(87,187,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);
 }
 sign(text,w,h,x,y,z,bg='#071925',fg='#b9f658',font=80,parent=this.world){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.max(64,Math.round(1024*h/w));
  const ctx=canvas.getContext('2d');const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,toneMapped:false}));mesh.position.set(x,y,z);parent.add(mesh);
  const data={mesh,ctx,tex,canvas,bg,fg,font};this.paintSign(data,text);return data;
 }
 paintSign(data,text){const {ctx,canvas,tex,bg,fg,font}=data;ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${font}px Arial,sans-serif`;ctx.fillText(text,512,canvas.height/2,960);ctx.fillStyle='rgba(255,255,255,.045)';for(let y=0;y<canvas.height;y+=4)ctx.fillRect(0,y,1024,1);tex.needsUpdate=true;}
 arcBox(radius,a,w,h,d,color,y,parent=this.world){const o=this.box(w,h,d,color,Math.sin(a)*radius,y,7-Math.cos(a)*radius,parent);o.rotation.y=-a;return o;}
 compact(group,skip=new Set()){
  const batches=new Map();for(const o of [...group.children]){if(!o.isMesh||o.isInstancedMesh||skip.has(o)||!o.material.isMaterial)continue;const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);}
  for(const [material,list] of batches){if(list.length<2)continue;const pos=[],normal=[],uv=[];let shadows=false;for(const o of list){o.updateMatrix();const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix);pos.push(...g.attributes.position.array);normal.push(...g.attributes.normal.array);if(g.attributes.uv)uv.push(...g.attributes.uv.array);else for(let i=0;i<g.attributes.position.count;i++)uv.push(0,0);shadows ||= o.receiveShadow;g.dispose();group.remove(o);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));const merged=new T.Mesh(g,material);merged.receiveShadow=shadows;group.add(merged);}
 }
 build(){
  this.buildSky();this.buildField();this.buildStadium();this.buildPlayer();this.buildPitcher();this.buildBall();
  this.decor=new T.Group();this.world.add(this.decor);
  for(const list of [this.walls,this.seats]){const group=new T.Group();this.world.add(group);for(const m of list){this.world.remove(m);group.add(m);}this.compact(group);list.splice(0,list.length,...group.children);}
  this.compact(this.world,new Set([this.grass,this.infieldGrass,this.dirt,this.ballShadow,this.target,...this.flags]));
 }
 buildSky(){
  this.skyUniforms={top:{value:new T.Color(PARKS[0].top)},bottom:{value:new T.Color(PARKS[0].horizon)}};
  const mat=new T.ShaderMaterial({uniforms:this.skyUniforms,side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 vP;void main(){float h=clamp(normalize(vP).y*.9+.06,0.,1.);gl_FragColor=vec4(mix(bottom,top,pow(h,.55)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
  const sky=new T.Mesh(new T.SphereGeometry(350,32,16),mat);this.scene.add(sky);
  const stars=[],colors=[];for(let i=0;i<180;i++){stars.push((seed(i)-.5)*460,35+seed(i+10)*170,-140-seed(i+44)*70);colors.push(.7,.85,1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(stars,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));this.stars=new T.Points(g,new T.PointsMaterial({size:.45,color:0xcce6ff,sizeAttenuation:true,transparent:true,opacity:.65}));this.scene.add(this.stars);
  const tex=this.glowTexture();this.lightGlow=tex;
  this.moon=new T.Sprite(new T.SpriteMaterial({map:tex,color:0xb9d8ff,transparent:true,depthWrite:false,toneMapped:false}));this.moon.position.set(-72,76,-180);this.moon.scale.set(25,25,1);this.scene.add(this.moon);
  const moonDisc=this.mesh(new T.SphereGeometry(6,24,16),new T.MeshBasicMaterial({color:0xf0e9dc}),-72,76,-181,this.scene);this.moonDisc=moonDisc;
 }
 buildField(){
  this.grassMap=this.texture('grass');this.dirtMap=this.texture('dirt');
  const turf=new T.MeshStandardMaterial({map:this.grassMap,roughness:1,color:0xbcd3a2});
  this.grass=this.mesh(this.geometries.field,turf,0,-.08,-7);this.grass.rotation.x=-Math.PI/2;this.grass.receiveShadow=true;
  // Long straight alternating mow strips, clipped to the playable fan.
  this.stripes=[];for(let i=-6;i<=6;i++){const x=i*11;const len=Math.sqrt(92*92-x*x)+14;const s=this.ground(5.4,len,new T.MeshStandardMaterial({map:this.grassMap,color:0xa5bc8c,roughness:1}),x,7-len/2,-.069);this.stripes.push(s);}
  const dirtMat=new T.MeshStandardMaterial({map:this.dirtMap,roughness:1,color:0xe5c1a2});
  this.dirt=this.box(23,.08,23,dirtMat,0,0,-9);this.dirt.rotation.y=Math.PI/4;this.dirt.receiveShadow=true;
  this.infieldGrass=this.box(16,.09,16,turf,0,.025,-9);this.infieldGrass.rotation.y=Math.PI/4;this.infieldGrass.receiveShadow=true;
  const plateDirt=this.mesh(new T.CircleGeometry(5,48),dirtMat,0,.09,7);plateDirt.rotation.x=-Math.PI/2;plateDirt.receiveShadow=true;
  const mound=this.cyl(2.5,3.1,.48,dirtMat,0,.18,-16, this.world,48);mound.receiveShadow=true;
  this.box(1.25,.05,.28,0xf5e9d8,0,.45,-16);
  [[16,-9],[0,-25],[-16,-9]].forEach(([x,z])=>{const b=this.box(1.15,.14,1.15,0xf5ecdf,x,.15,z);b.rotation.y=Math.PI/4;b.receiveShadow=true;});
  const homeShape=new T.Shape();homeShape.moveTo(-.65,.48);homeShape.lineTo(.65,.48);homeShape.lineTo(.65,-.15);homeShape.lineTo(0,-.72);homeShape.lineTo(-.65,-.15);homeShape.closePath();const plate=this.mesh(new T.ShapeGeometry(homeShape),this.mat(0xf6eee4),0,.15,7);plate.rotation.x=-Math.PI/2;
  // Chalk uses physical strips, remaining crisp on mobile WebGL where line widths are ignored.
  for(const s of [-1,1]){const chalk=this.ground(.14,87,0xf0e8d9,s*30.8,7-30.8,.07);chalk.rotation.z=s*Math.PI/4;}
  [-2.45,2.45].forEach(x=>{this.ground(.09,3.8,0xf0e8d9,x-1,7,.14);this.ground(.09,3.8,0xf0e8d9,x+1,7,.14);this.ground(2,.09,0xf0e8d9,x,5.1,.14);this.ground(2,.09,0xf0e8d9,x,8.9,.14);});
  // Backstop-side warning track and outfield edge.
  const track=this.mesh(new T.RingGeometry(66,70,100,1,Math.PI*.02,Math.PI*.96),dirtMat,0,.01,7);track.rotation.x=-Math.PI/2;
  // Soft grounding in addition to the live player shadow.
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(0,0,0,.6)');r.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=r;x.fillRect(0,0,64,64);this.shadowTexture=new T.CanvasTexture(c);
  const contact=this.mesh(new T.PlaneGeometry(4.2,3.1),new T.MeshBasicMaterial({map:this.shadowTexture,transparent:true,depthWrite:false,opacity:.65}),-2.7,.18,7);contact.rotation.x=-Math.PI/2;
 }
 buildStadium(){
  const concrete=this.mat(0x374858),dark=this.mat(0x0b1b2d),silver=this.mat(0x506374,.55,.5);
  const suiteMat=new T.MeshStandardMaterial({color:0x38566c,emissive:0x365673,emissiveIntensity:.2,roughness:.2,metalness:.4});
  const stands=new T.Group();this.world.add(stands);this.standGroup=stands;
  for(let sector=0;sector<48;sector++){
   const a=-1.63+sector/47*3.26;
   const wall=this.arcBox(69,a,4.95,4.3,1,0x0c3544,2.05);this.walls.push(wall);
   this.arcBox(68.5,a,4.95,.13,.5,0xb9f658,4.25);
   for(let tier=0;tier<3;tier++){
    const r=74+tier*8.2,y=5+tier*7.3;
    this.arcBox(r,a,5.5+tier*.45,2,8,concrete,y-1,stands);
    for(let row=0;row<6;row++)this.arcBox(r-3+row*1.12,a,5.5+tier*.45,.45,1.5,dark,y+row*.64,stands);
    const fascia=this.arcBox(r-3.7,a,5.5+tier*.45,.9,.35,0x133c50,y-.12);this.seats.push(fascia);
    this.arcBox(r+3,a,5.8+tier*.45,.14,.22,silver,y+4.2,stands);
   }
   // Corporate suite windows between grandstand decks.
   if(sector%2===0){const win=this.arcBox(81.5,a,4.8,1.3,.16,suiteMat,13.5,stands);}
  }
  this.compact(stands);
  // Thousands of real individual spectators in just three draw calls.
  const total=3000,dummy=new T.Object3D();
  const crowd=new T.InstancedMesh(this.geometries.spectator,this.mat(0xffffff),total);
  const heads=new T.InstancedMesh(this.geometries.head,this.mat(0xffffff),total);
  const chairs=new T.InstancedMesh(this.geometries.seat,this.mat(0x204763),total);
  const shirt=[0x5eaabf,0xddddce,0xd3b765,0xc76c65,0x466a93,0x85ab87,0x2f4e6c];
  for(let i=0;i<total;i++){
   const tier=Math.floor(i/1000),within=i%1000,row=Math.floor(within/167),j=within%167;
   const a=-1.61+j/166*3.22,r=71.2+tier*8.2+row*1.12,y=5+tier*7.3+row*.64;
   const px=Math.sin(a)*r,pz=7-Math.cos(a)*r;
   dummy.position.set(px,y+.55,pz);dummy.rotation.set(0,-a,0);dummy.scale.set(.95,.9+seed(i)*.28,.9);dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);crowd.setColorAt(i,new T.Color(shirt[Math.floor(seed(i+8)*shirt.length)]));
   dummy.position.y=y+1.15;dummy.scale.setScalar(.9+seed(i+20)*.2);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new T.Color().setHSL(.06+seed(i)*.05,.24,.32+seed(i+6)*.38));
   dummy.position.y=y+.18;dummy.scale.set(1,1,1);dummy.updateMatrix();chairs.setMatrixAt(i,dummy.matrix);
  }
  this.crowd=crowd;this.crowdGroup=new T.Group();this.crowdGroup.add(crowd,heads);this.world.add(this.crowdGroup,chairs);
  const ledMat=new T.MeshBasicMaterial({color:0x95e6ff,toneMapped:false});this.ledMaterial=ledMat;
  for(let i=0;i<32;i++){const a=-1.63+i/31*3.26;const m=this.arcBox(77.8,a,8.1,.32,.16,ledMat,12.5);this.leds.push(m);}
  const roofGroup=new T.Group();this.world.add(roofGroup);
  for(let i=0;i<32;i++){const a=-1.66+i/31*3.32;this.arcBox(92.5,a,9.8,.4,6,0x15283b,26.6,roofGroup);this.arcBox(92.5,a,.22,7,.22,silver,23,roofGroup);}
  this.compact(roofGroup);
  // Four high-output stadium light rigs with luminous sprite falloff.
  const lampMat=new T.MeshBasicMaterial({color:0xeaf8ff,toneMapped:false});
  this.floodGlows=[];for(const [x,z] of [[-56,-26],[56,-26],[-24,-70],[24,-70]]){
   this.cyl(.28,.55,35,silver,x,17,z);this.box(13,4,.7,0x102638,x,35,z);
   for(let j=0;j<12;j++){const lamp=this.box(.8,.65,.25,lampMat,x-5.1+(j%6)*2.04,34.1+Math.floor(j/6)*1.8,z+.6);}
   const glow=new T.Sprite(new T.SpriteMaterial({map:this.lightGlow,color:0xbdedff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.85}));glow.position.set(x,35,z+1);glow.scale.set(22,14,1);this.world.add(glow);this.floodGlows.push(glow);
  }
  // Outfield scoreboard, ribbon screens and the recognizable baseball details.
  this.box(1.4,16,1.6,silver,-10,14,-77);this.box(1.4,16,1.6,silver,10,14,-77);
  this.box(30,14,1.3,0x091621,0,22,-75);
  this.sign('MOONSHOT  /  CLUB',27,2.4,0,27.2,-74.25,'#071925','#c0f660',70);
  this.scoreboard=this.sign('THE BIG LEAGUES',27,7.2,0,21.6,-74.2,'#071925','#f3f8e9',86);
  this.sign('HOME  00     ★     AWAY  00',27,1.4,0,16.6,-74.2,'#17333f','#7ddfff',48);
  this.sign('400',3.6,1.8,0,2.2,-67.9,'#0d3542','#f3f6e8',100);
  for(const [i,x] of [-43,43].entries()){this.cyl(.13,.13,25,0xf4ce61,x,12,-47);const pole=this.box(.09,8,.09,0xf4ce61,x+(i?-.6:.6),20.4,-47);this.box(1.2,.08,.09,0xf4ce61,x+(i?-.6:.6),24.3,-47);}
  for(let i=0;i<7;i++){const a=-1.25+i*.416;const label=['PLAY BIG','LITTLE LEGENDS','MOONSHOT','MAKE SOME NOISE','GO BIG','DREAM BIG','PLAY BALL'][i];const sign=this.sign(label,11,2,Math.sin(a)*68.1,2.15,7-Math.cos(a)*68.1,'#0d3542',i%2?'#d8ece9':'#b9f658',62);sign.mesh.rotation.y=-a;}
  for(let i=0;i<18;i++){const x=(i-8.5)*10,h=8+seed(i)*18;this.box(6,h,6,0x1c3045,x,h/2,-112-seed(i+9)*12);}
  for(const x of [-24,24]){this.cyl(.09,.09,15,0x7e97a8,x,25,-81);const f=this.box(4.3,2.4,.04,0xb9f658,x+2.1,31,-81);this.flags.push(f);}
 }
 buildPlayer(){
  this.batter=new T.Group();this.batter.position.set(-2.6,.13,7);this.world.add(this.batter);
  const skin=this.mat(0xd59c77,.65),white=this.mat(0xe8ede7,.87),navy=this.mat(0x102840,.48),lime=this.mat(0xb9ed57,.5),shoe=this.mat(0x152235,.55);
  const b=this.batter;
  // Athletic proportions and a planted batting stance, instead of a toy capsule.
  this.hips=new T.Group();this.hips.position.set(0,1.48,0);b.add(this.hips);
  this.ellipsoid(0,0,0,.62,.34,.37,white,this.hips);
  const upper=this.ellipsoid(-.45,-.55,.05,.25,.59,.27,white,this.hips);upper.rotation.z=-.22;
  const upper2=this.ellipsoid(.46,-.55,-.13,.25,.59,.27,white,this.hips);upper2.rotation.z=.22;
  this.ellipsoid(-.57,-1.03,.12,.2,.44,.21,navy,this.hips);this.ellipsoid(.57,-1.03,-.15,.2,.44,.21,navy,this.hips);
  this.ellipsoid(-.57,-1.26,.32,.3,.18,.47,shoe,this.hips);this.ellipsoid(.57,-1.26,.02,.3,.18,.47,shoe,this.hips);
  [-.57,.57].forEach(x=>{this.box(.45,.035,.6,0xeff0df,x,.075,x<0?.28:-.02,b);});
  this.torso=new T.Group();this.torso.position.set(0,1.65,0);b.add(this.torso);
  this.ellipsoid(0,.67,0,.66,.86,.39,white,this.torso);
  this.ellipsoid(0,.02,0,.66,.12,.405,navy,this.torso);
  this.ellipsoid(0,1.39,0,.18,.21,.18,skin,this.torso);
  // Face looks down the barrel toward the pitcher; the number is on the back.
  this.head=new T.Group();this.head.position.set(.07,1.78,0);this.head.rotation.y=-.55;this.torso.add(this.head);
  this.ellipsoid(0,0,0,.44,.53,.42,skin,this.head);
  this.ellipsoid(0,.3,-.03,.51,.4,.5,navy,this.head);
  this.ellipsoid(.23,.2,-.39,.48,.07,.41,navy,this.head);
  this.ellipsoid(-.42,-.03,.02,.13,.22,.15,navy,this.head);
  this.ellipsoid(.23,-.03,-.39,.09,.105,.1,skin,this.head);
  this.ellipsoid(.3,.08,-.34,.035,.035,.035,0x1a1d22,this.head);
  this.box(.13,.31,.02,lime,-.03,.42,.43,this.head);
  this.sign('7',.57,.72,.03,.7,.395,'#e8ede7','#173245',105,this.torso);
  this.sign('MOONSHOT',.9,.18,0,1.17,.39,'#e8ede7','#173245',95,this.torso);
  this.arms=new T.Group();this.arms.position.set(.5,.93,0);this.torso.add(this.arms);
  this.ellipsoid(-.13,0,0,.31,.33,.35,navy,this.arms);
  this.rod(V(-.18,-.03,.02),V(.36,-.27,.32),.16,skin,this.arms);
  this.rod(V(.36,-.27,.32),V(.84,.28,.13),.14,skin,this.arms);
  this.rod(V(-.9,-.02,0),V(-.22,-.2,.56),.17,skin,this.arms);
  this.rod(V(-.22,-.2,.56),V(.76,.25,.15),.14,skin,this.arms);
  this.ellipsoid(.8,.3,.13,.2,.22,.2,white,this.arms);
  this.batPivot=new T.Group();this.batPivot.position.set(.83,.3,.13);this.batPivot.rotation.set(-.35,0,-.45);this.arms.add(this.batPivot);
  this.batHandle=this.cyl(.075,.09,1.1,navy,0,.45,0,this.batPivot);
  this.batBarrel=this.cyl(.2,.09,1.85,this.mat(0xedc477,.38,.15),0,1.83,0,this.batPivot,24);
  this.batCap=this.ellipsoid(0,2.76,0,.2,.09,.2,this.mat(0xedc477,.38,.15),this.batPivot);
  for(let i=0;i<8;i++)this.cyl(.081,.081,.025,0x8996a2,0,.12+i*.1,0,this.batPivot);
  this.batRest=this.batPivot.quaternion.clone();this.batContact=this.batRest.clone();this.batFollow=new T.Quaternion().setFromEuler(new T.Euler(.12,0,-2.8));
  for(const group of [this.hips,this.head,this.arms,this.torso,this.batPivot,b])this.compact(group,new Set([this.batBarrel,this.batCap]));
  b.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  // Transparent bat-speed sweep appears briefly at impact.
  const sweep=new T.RingGeometry(1.5,2.35,32,1,0,Math.PI*1.25);
  this.swingArc=new T.Mesh(sweep,new T.MeshBasicMaterial({color:0xc4fb69,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
  this.swingArc.rotation.x=-Math.PI/2;this.swingArc.position.set(-.1,2.15,7);this.scene.add(this.swingArc);
 }
 buildPitcher(){
  this.pitcher=new T.Group();this.pitcher.position.set(0,.48,-16);this.world.add(this.pitcher);
  const white=this.mat(0xd6e1dd),navy=this.mat(0x17364b,.45,.2);
  this.cyl(.68,.9,1.25,navy,0,.95,0,this.pitcher);
  this.ellipsoid(0,1.75,0,.82,.54,.68,white,this.pitcher);
  this.box(1.13,.29,.08,new T.MeshBasicMaterial({color:0x9df3f2,toneMapped:false}),0,1.79,.64,this.pitcher);
  this.cyl(.24,.3,.5,navy,-.5,.28,0,this.pitcher);this.cyl(.24,.3,.5,navy,.5,.28,0,this.pitcher);
  const nozzle=this.cyl(.28,.36,.75,navy,0,1.65,.79,this.pitcher);nozzle.rotation.x=Math.PI/2;
  const rim=this.mesh(new T.TorusGeometry(.28,.045,8,20),new T.MeshBasicMaterial({color:0xb9f658,toneMapped:false}),0,1.65,1.17,this.pitcher);
  this.pitcher.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 }
 buildBall(){
  this.ball=new T.Group();this.mesh(this.geometries.ball,this.mat(0xfff9e9,.5),0,0,0,this.ball);
  for(const side of [-1,1]){
   const points=[];for(let j=0;j<=48;j++){const a=j/48*Math.PI*2;points.push(V(Math.cos(a)*.26,Math.sin(a)*.32,side*.13+Math.cos(a*2)*.035));}
   const curve=new T.CatmullRomCurve3(points,true);this.mesh(new T.TubeGeometry(curve,48,.012,4,true),this.mat(0xbc332c),0,0,0,this.ball);
  }
  this.ball.visible=false;this.scene.add(this.ball);
  this.ballHalo=new T.Sprite(new T.SpriteMaterial({map:this.lightGlow,color:0xffefbc,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.6}));this.ballHalo.scale.set(2.1,2.1,1);this.ball.add(this.ballHalo);
  this.ballShadow=this.mesh(new T.PlaneGeometry(1.4,1.4),new T.MeshBasicMaterial({map:this.shadowTexture,transparent:true,depthWrite:false,opacity:.45}),0,.2,0);this.ballShadow.rotation.x=-Math.PI/2;this.ballShadow.visible=false;
  this.target=this.mesh(new T.TorusGeometry(.84,.025,6,48),new T.MeshBasicMaterial({color:0xb9f658,transparent:true,opacity:.65,toneMapped:false}),0,2.05,7);this.target.visible=false;
  const g=new T.SphereGeometry(.16,6,4);for(let i=0;i<32;i++){const m=new T.Mesh(g,new T.MeshBasicMaterial({color:0xc4fb69,transparent:true,opacity:(1-i/32)*.85,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));m.visible=false;this.scene.add(m);this.trail.push(m);}
 }
 setPark(index){
  this.park=clamp(index,0,2);const p=PARKS[this.park];this.scene.background=new T.Color(p.top);this.scene.fog=new T.Fog(p.fog,110,280);
  this.skyUniforms.top.value.set(p.top);this.skyUniforms.bottom.value.set(p.horizon);
  this.renderer.toneMappingExposure=p.exposure;this.hemi.color.set(p.skyLight);this.sun.color.set(p.sun);this.sun.intensity=this.park===1?3.2:3.6;
  this.rim.color.set(this.park===1?0xff9d86:0x6edbff);this.walls.forEach(m=>m.material=this.mat(p.wall));this.seats.forEach(m=>m.material=this.mat(p.seat));this.ledMaterial.color.set(p.accent);
  this.stars.material.opacity=this.park===1?.12:.65;this.moon.visible=this.moonDisc.visible=this.park!==1;
  this.decor?.traverse(o=>{if(o.geometry&&!Object.values(this.geometries).includes(o.geometry))o.geometry.dispose();});this.decor?.clear();
  if(this.decor&&this.park===1){for(const side of [-1,1])for(let i=0;i<4;i++){const x=side*(71+i*5),z=-45-i*9;this.cyl(.3,.55,17,0x846f60,x,8,z,this.decor);for(let j=0;j<6;j++){const leaf=this.ellipsoid(x+Math.cos(j)*2,16,z+Math.sin(j)*2,4.5,.13,.7,0x547c63,this.decor);leaf.rotation.y=-j;leaf.rotation.z=.1;}}}
  if(this.decor&&this.park===2){for(let i=0;i<3;i++){const r=4+i*1.2;const orbit=this.mesh(new T.TorusGeometry(r,.04,6,64),new T.MeshBasicMaterial({color:0xa5b9fa,transparent:true,opacity:.6}),-38,44,-110,this.decor);orbit.rotation.set(.5+i*.4,.2,0);}this.ellipsoid(-38,44,-110,2.8,2.8,2.8,0x8289b6,this.decor);}
  this.compact(this.decor);
 }
 setBat(color){this.batBarrel.material=this.mat(color,.35,.15);this.batCap.material=this.batBarrel.material;}
 scoreboardText(text){this.paintSign(this.scoreboard,text);}
 resize(){const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight);this.w=w;this.h=h;this.camera.aspect=w/h;this.baseFov=w/h>1.4?48:w/h<.65?58:53;this.camera.fov=this.baseFov;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 pitch(p){
  this.ball.visible=true;this.target.visible=true;this.ballShadow.visible=true;
  this.ball.position.set(Math.sin(p*Math.PI)*.12,1.68+Math.sin(p*Math.PI)*.58,Math.min(7.15,-14.7+26.14458*Math.min(p,1.13)));
  this.ball.scale.setScalar(1+p*.12);this.ball.rotation.x+=.12;this.ball.rotation.y+=.05;
  this.ballHalo.material.opacity=.24+clamp(p)*.25;this.ballShadow.position.set(this.ball.position.x,.2,this.ball.position.z);
  this.target.scale.setScalar(1+(1-clamp(p))*1.4);this.target.material.color.set(p>.58?0xb9f658:0x8cd9ec);this.target.material.opacity=p>.58?.8:.3;
  this.pitcher.rotation.x=-Math.sin(clamp(p)*Math.PI)*.08;
 }
 swing(t){
  this.swingStart=t;
  this.torso.rotation.set(0,0,0);this.arms.rotation.set(0,0,0);this.hips.rotation.y=-.12;
  this.scene.updateMatrixWorld(true);
  const local=this.arms.worldToLocal(V(0,2.05,7)).sub(this.batPivot.position).normalize();
  this.batContact.setFromUnitVectors(V(0,1,0),local);
 }
 launch(result,t){
  this.launchFrom=this.ball.visible?this.ball.position.clone():V(0,2.05,7);
  this.celebrating=false;this.flight=true;this.flightStart=t;this.result=result;
  this.endX=(Math.random()-.5)*72;
  const distance=clamp(Number(result.distance)||450,300,1000);
  this.shotStyle=['laser','tower','upperdeck','rainbow'].includes(result.style)?result.style:(result.mega?'tower':'upperdeck');
  const arcs={laser:[13,.035,1.65],tower:[31,.065,1.9],upperdeck:[23,.047,1.8],rainbow:[26,.053,1.85]};
  const [base,rise,power]=arcs[this.shotStyle];
  this.height=base+distance*rise+(result.mega?10:0);
  // A 330-foot shot just clears the fence; a 700-foot drive reaches the skyline.
  this.endZ=-distance*.25;this.travelPower=power;
  this.duration=Number.isFinite(result.flightDuration)?clamp(result.flightDuration,3.5,6):result.mega?5.2:4.5;
  this.ball.visible=true;this.target.visible=false;this.history=[];
  const labels={laser:'LINE DRIVE HOME RUN',tower:'SKY-HIGH HOME RUN',upperdeck:'UPPER DECK',rainbow:'RAINBOW HOME RUN'};
  this.scoreboardText(result.mega?'ABSOLUTE MOONSHOT':labels[this.shotStyle]);
 }
 celebrate(result,t){
  this.flight=false;this.celebrating=true;this.celebrationStart=t;this.result=result;
  this.celebrationStyle=['laser','tower','upperdeck','rainbow'].indexOf(result.style);
  if(this.celebrationStyle<0)this.celebrationStyle=Math.floor(Number(result.distance)||0)%4;
  this.ball.visible=false;this.ballShadow.visible=false;this.target.visible=false;
  this.trail.forEach(m=>m.visible=false);this.history=[];
  // Broadcast-style hard cut to our hitter; a slow orbit then lets the victory breathe.
  this.camera.position.set(3.8,4.4,17.2);this.look.set(-2.5,2.15,7);this.camera.lookAt(this.look);
  this.scoreboardText(['WHAT A SHOT!','YOU CRUSHED IT!','TAKE A BOW!','PURE MAGIC!'][this.celebrationStyle]);
 }
 reset(){
  this.flight=false;this.celebrating=false;this.ball.visible=false;this.ballShadow.visible=false;this.target.visible=false;
  this.trail.forEach(m=>m.visible=false);this.history=[];this.pitcher.rotation.x=0;
  this.batter.position.y=.13;this.batter.rotation.set(0,0,0);this.torso.position.y=1.65;this.arms.rotation.set(0,0,0);
  this.torso.rotation.set(0,.12,0);this.hips.rotation.set(0,0,0);this.batPivot.quaternion.copy(this.batRest);
  if(this.crowdGroup)this.crowdGroup.position.y=0;
  this.ledMaterial.color.set(PARKS[this.park||0].accent);
 }
 update(t,dt,gameState){
  if(dt<=0){this.renderer.render(this.scene,this.camera);return;}
  const age=t-this.swingStart;
  if(age>=0&&age<.95){
   const contact=smooth(age/.10),follow=smooth((age-.10)/.55),recover=smooth((age-.68)/.27);
   this.torso.rotation.set(0,(.12*(1-contact)-.8*follow)*(1-recover),-.06*Math.sin(follow*Math.PI));
   this.arms.rotation.y=(.08*(1-contact)-.55*follow)*(1-recover);this.hips.rotation.y=(-.12*contact-.45*follow)*(1-recover);
   this.batPivot.quaternion.copy(this.batRest).slerp(this.batContact,contact).slerp(this.batFollow,follow).slerp(this.batRest,recover);
  }else{
   const breathe=this.calm?0:Math.sin(t*2.2)*.025;this.torso.rotation.set(0,.12+breathe,0);this.arms.rotation.y=.08;this.batPivot.quaternion.copy(this.batRest);this.hips.rotation.y=0;
  }
  this.swingArc.material.opacity=!this.calm&&age>.055&&age<.3?Math.sin((age-.055)/.245*Math.PI)*.4:0;
  this.swingArc.rotation.z=-Math.max(0,age)*5;
  this.flags.forEach((f,i)=>f.rotation.y=this.calm?0:Math.sin(t*2.4+i)*.13);
  let cx=.6,cy=6.8,cz=24,tx=0,ty=1,tz=-19,fov=this.baseFov;
  if(this.home){cx=Math.sin(t*.08)*2;cy=8;cz=28;ty=2;tz=-26;}
  if(this.flight){
   const elapsed=t-this.flightStart,p=clamp(elapsed/this.duration),v=1-(1-p)**1.35;
   // A short contact hold makes the swing readable before the camera chases it.
   const travel=clamp((elapsed-.1)/(this.duration-.1));const q=1-(1-travel)**this.travelPower;
   if(elapsed<.1)this.ball.position.copy(this.launchFrom).lerp(V(0,2.05,7),smooth(elapsed/.1));
   else this.ball.position.set(this.endX*q+(this.shotStyle==='rainbow'?Math.sin(q*Math.PI)*12:0),2.05+Math.sin(q*Math.PI)*this.height,7+this.endZ*q);
   this.ball.rotation.x+=dt*16;this.ball.rotation.z+=dt*7;this.ball.scale.setScalar(this.result.mega?1.5:1.2);this.ballHalo.material.opacity=.72;
   this.ballShadow.position.set(this.ball.position.x,.2,this.ball.position.z);this.ballShadow.material.opacity=.4*(1-Math.sin(q*Math.PI));
   this.history.unshift(this.ball.position.clone());if(this.history.length>32)this.history.pop();
   this.trail.forEach((m,i)=>{m.visible=!!this.history[i]&&!this.calm;if(this.history[i])m.position.copy(this.history[i]);m.scale.setScalar((1-i/33)*(this.result.mega?2.1:1.35));if(this.shotStyle==='rainbow')m.material.color.setHSL((t*.1+i/32)%1,.92,.67);else m.material.color.set(this.result.mega?(i%3===0?0xffffff:0xffcf64):this.shotStyle==='laser'?0x91e9ff:this.shotStyle==='tower'?0xf8d572:0xc4fc76);});
   if(!this.calm){
    const chase=smooth((elapsed-.08)/.4),b=this.ball.position;
    const wide=smooth((elapsed-this.duration*.62)/(this.duration*.22));
    cx=T.MathUtils.lerp(.6,b.x*.7+8, chase);cy=T.MathUtils.lerp(6.8,b.y+5,chase);cz=T.MathUtils.lerp(24,b.z+25,chase);
    tx=b.x;ty=b.y-1.5;tz=b.z;
    cx=T.MathUtils.lerp(cx,this.endX*.55+20,wide);cy=T.MathUtils.lerp(cy,39,wide);cz=T.MathUtils.lerp(cz,-16,wide);tx=b.x;ty=b.y-1.5;tz=b.z;
    fov=this.baseFov-5*chase+3*wide;
   }
  }
  if(this.celebrating){
   const e=Math.max(0,t-this.celebrationStart),v=this.celebrationStyle;
   const intro=smooth(e/.32),beat=this.calm?0:Math.sin(e*7),hop=this.calm?0:Math.max(0,Math.sin(e*(v===1?7:5.5)));
   this.batter.position.y=.13+((v===1||v===3)?hop*hop*(v===1?.55:.28):0);
   this.batter.rotation.y=Math.sin(e*1.3)*.12;
   this.hips.rotation.y=v===2?beat*.2:0;
   this.torso.rotation.set(v===2?Math.sin(e*3)*.06:0,v===2?beat*.3:-.12,(v===2?.13*beat:v===0?-.08:0)*intro);
   this.arms.rotation.set(0,(v===2?Math.sin(e*4)*.45:0),(v===0?.65:v===1?1.05:v===2?.35:1.25)*intro);
   this.batPivot.quaternion.copy(this.batRest);
   this.batPivot.rotation.z+=(v===0?.3:v===1?.6:v===2?.2:.85)*intro;
   if(v===0)this.batPivot.rotation.x+=Math.sin(e*2.5)*.18;
   if(v===3)this.batPivot.rotation.y+=Math.sin(e*3)*.3;
   this.crowdGroup.position.y=this.calm?0:.14*Math.max(0,Math.sin(e*8))**2;
   this.ledMaterial.color.set(PARKS[this.park||0].accent).lerp(new T.Color(0xffffff),this.calm?.1:.14+.3*(.5+.5*Math.sin(e*9)));
   const orbit=this.calm?0:Math.sin(e*.35)*1.3;
   cx=3.5+orbit;cy=4.5;cz=17.2;tx=-2.45;ty=2.15;tz=7;fov=this.baseFov-5;
  }else{
   this.batter.position.y=.13;this.batter.rotation.y=0;
   if(this.crowdGroup)this.crowdGroup.position.y=0;
  }
  const a=1-Math.exp(-dt*(this.flight?7:3));this.camera.position.lerp(V(cx,cy,cz),a);this.look.lerp(V(tx,ty,tz),this.flight?1-Math.exp(-dt*22):a);this.camera.lookAt(this.look);
  if(Math.abs(this.camera.fov-fov)>.02){this.camera.fov=T.MathUtils.lerp(this.camera.fov,fov,a);this.camera.updateProjectionMatrix();}
  this.renderer.render(this.scene,this.camera);
 }
 destroy(){const seen=new Set();this.scene.traverse(o=>{if(o.geometry&&!seen.has(o.geometry)){o.geometry.dispose();seen.add(o.geometry);}const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m&&!seen.has(m)){for(const v of Object.values(m))if(v?.isTexture&&!seen.has(v)){v.dispose();seen.add(v);}m.dispose();seen.add(m);}});this.renderer.dispose();}
}
