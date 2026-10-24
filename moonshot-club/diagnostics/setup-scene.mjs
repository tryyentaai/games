import * as T from '../three.module.min.js';
import {Ballpark,createBallparkGeometry} from '../scene.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export const {createCanvas}=require('@napi-rs/canvas');
export function setupScene(width=390,height=844){
 globalThis.document={createElement:()=>createCanvas(512,512)};globalThis.devicePixelRatio=1;
 const p=Object.create(Ballpark.prototype);p.renderer={capabilities:{getMaxAnisotropy:()=>4},toneMappingExposure:1,render(){},setSize(){}};p.scene=new T.Scene();p.world=new T.Group();p.scene.add(p.world);p.mats=new Map();p.geometries=createBallparkGeometry();p.trail=[];p.history=[];p.flags=[];p.walls=[];p.seats=[];p.leds=[];p.hemi=new T.HemisphereLight();p.sun=new T.DirectionalLight();p.rim=new T.DirectionalLight();p.park=0;p.flight=false;p.swingStart=-10;p.calm=false;p.home=false;p.build();p.setPark(0);p.camera=new T.PerspectiveCamera(58,width/height,.12,430);p.camera.position.set(.6,6.8,24);p.look=new T.Vector3(0,1,-19);p.camera.lookAt(p.look);p.baseFov=58;p.canvas={clientWidth:width,clientHeight:height};p.resize();p.scene.updateMatrixWorld(true);p.camera.updateMatrixWorld();return p;
}
