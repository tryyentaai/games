// Node-only interaction tests with a small DOM stand-in for these isolated modules.
import test from "node:test";
import assert from "node:assert/strict";
import { playPractice } from "../practice.js";
class Element {
  constructor(tag, text = "") {
    this.tag = tag;
    this.children = [];
    this.ownText = text;
    this.className = "";
    this.dataset = {};
    this.attrs = {};
    this.events = {};
    this.value = "";
    this.style = {setProperty() {}};
    this.classList = {add: name => this.className += " " + name};
  }
  set textContent(text) { this.ownText = text; this.children = []; }
  get textContent() { return this.ownText + this.children.map(c => c.textContent).join(""); }
  get firstChild() { return this.children[0]; }
  get lastChild() { return this.children.at(-1); }
  setAttribute(key, val) {this.attrs[key] = val;}
  append(...nodes) {this.children.push(...nodes);}
  replaceChildren(...nodes) {this.ownText = ""; this.children = nodes;}
  insertBefore(node, before) {this.children.splice(this.children.indexOf(before), 0, node);}
  addEventListener(event, fn) {this.events[event] = fn;}
  fire(event) { if (!this.disabled) this.events[event]?.({preventDefault() {}}); }
  focus() {} blur() {}
  all(predicate) {return [this, ...this.children.flatMap(c => c.all(predicate))].filter(predicate);}
  byClass(cls) {return this.all(e => e.className.split(" ").includes(cls));}
}
globalThis.document = {
  createElement: tag => new Element(tag),
  createElementNS: (_, tag) => new Element(tag),
  createTextNode: text => new Element("text", text)
};
function start(id, target) {
  const el = new Element("main"), wins = [], sounds = [], spoken = [];
  const cleanup = playPractice(id, {el,target,words:[target],win:w => wins.push(w),sound:b => sounds.push(b),speak:w=>spoken.push(w)});
  return {el,wins,sounds,spoken,cleanup};
}
const waitWin = () => new Promise(r => setTimeout(r,375));
test("listening, visual clues, incorrect and case-insensitive correct entry",async () => {
  const {el,wins,sounds,spoken,cleanup} = start("spell","Tree");
  assert.deepEqual(spoken, ["Tree"]);
  el.byClass("pr-chip").find(e => e.textContent.includes("Peek")).fire("click");
  assert.equal(el.byClass("pr-peek")[0].hidden,false);
  const form = el.byClass("pr-form")[0], input = el.byClass("pr-input")[0];
  input.value="trp";form.fire("submit");
  assert.deepEqual(sounds,[false]);
  assert.ok(el.byClass("pr-feedback")[0].textContent.includes("tr"));
  input.value=" tree ";form.fire("submit");form.fire("submit");
  await waitWin();
  assert.deepEqual(wins,["Tree"]);cleanup();
});
test("scramble keeps a correctly spelled prefix after a miss and supports undo, duplicate letters",async () => {
  const {el,wins,cleanup} = start("scramble","see");
  const tap = char => el.byClass("pr-tile").find(e=>!e.disabled&&e.textContent===char).fire("click");
  tap("e");tap("s");tap("e");assert.equal(el.byClass("pr-filled").length,0);
  tap("s");tap("e");el.byClass("pr-chip").find(e=>e.textContent==="Undo").fire("click");
  assert.equal(el.byClass("pr-filled").length,1);
  tap("e");tap("e");await waitWin();assert.deepEqual(wins,["see"]);cleanup();
});
test("each ladder rung can be climbed, with early exit cancelling the win callback", async()=>{
  const {el,wins,cleanup}=start("ladder","at");
  for(let i=0;i<3;i++){
    el.byClass("pr-action")[0].fire("click");
    const visible = el.byClass("pr-ladder-word")[0].textContent;
    assert.equal(visible,["at","a·","··"][i]);
    for(const ch of ["a","t"]) el.byClass("pr-tile").find(e=>e.textContent===ch).fire("click");
  }
  cleanup();await waitWin();assert.deepEqual(wins,[]);
});
test("detective always supplies three unique options for one-letter, accented, repeating and hyphenated words",async ()=>{
  const all=["a","été","zzz","re-read"].map(target=>{
    const g=start("detective",target);
    const cards=g.el.byClass("pr-card"), words=g.el.byClass("pr-card-word").map(e=>e.textContent);
    assert.equal(new Set(words).size,3);
    const miss=cards[words.findIndex(w=>w!==target)];miss.fire("click");assert.equal(miss.disabled,true);
    cards[words.indexOf(target)].fire("click");return {g,target};
  });
  await waitWin();for(const {g,target} of all){assert.deepEqual(g.wins,[target]);g.cleanup();}
});
