const engineRoot = new URL('./vendor/ocr/', import.meta.url);
const assets = file => new URL(file, engineRoot).href;
const limit = 36;
const maxLength = 18;
const headings = /^(?:(?:week|unit|lesson|list|grade|day)\s+(?:\d{1,3}|[a-z])|(?:my |weekly |first grade |this week.s )?(?:spelling(?:\s+(?:word\s+)?list|\s+words?|\s+test)?|words?(?:\s+(?:list|to learn|of the week|to practice))?|bonus words?|challenge words?|review words?|sight words?|tricky words?|high.frequency words?)|(?:name|date)\s*)[:.!\s]*$/i;

export function readWordCandidates(text, fromPhoto = false) {
  const result = [];
  for (let line of String(text).replace(/\r/g, '').split('\n')) {
    line = line.trim();
    if (fromPhoto && headings.test(line)) continue;
    if (fromPhoto) line = line.replace(/^(?:spelling (?:words?|list)|challenge words?|bonus words?|sight words?|words to learn)\s*:\s*/i, '');
    for (const token of line.split(/[\s,;|/]+/)) {
      const word = token.toLowerCase().replace(/^[\d()\[\].:•*-]+|[()\[\].:!?*-]+$/g, '');
      if (/^[a-z]+$/.test(word) && word.length <= maxLength && !result.includes(word)) {
        result.push(word);
      }
    }
  }
  return result;
}

const svg = {
  camera:'<rect x="2.5" y="6" width="19" height="14" rx="3"/><path d="m7 6 1.7-3h6.6L17 6"/><circle cx="12" cy="13" r="3.6"/>',
  album:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 3-3 5 5"/>',
  type:'<path d="M3 5h13v3M3 8V5m6.5 0v14M6 19h7m2-8h6m-3 0v8"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  plus:'<path d="M5 12h14M12 5v14"/>',
  back:'<path d="m14 5-7 7 7 7"/>',
  close:'<path d="m7 7 10 10m0-10L7 17"/>',
  sound:'<path d="m3 9 4 0 5-4v14l-5-4H3zm13 0c2 1 2 5 0 6m3-9c4 3 4 9 0 12"/>',
  leaf:'<path d="M19 4C11 3 4 6 5 13c.7 5 6 7 10 3 3-3 4-7 4-12ZM5 20c1-6 4-9 9-12"/>'
};
function icon(name) {
  return '<svg width="23" height="23" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+svg[name]+'</svg>';
}
function button(label, shape, cls, action) {
  const b = document.createElement('button');
  b.type='button'; b.className='scan-button '+cls;
  if (shape) b.innerHTML=icon(shape);
  b.append(document.createTextNode(label)); b.addEventListener('click', action);
  return b;
}
function piece(tag, cls, value) {
  const node=document.createElement(tag); node.className=cls;
  if(value !== undefined) node.textContent=value;
  return node;
}
async function photoCanvas(url) {
  const photo = new Image();
  await new Promise((resolve,reject) => { photo.onload=resolve; photo.onerror=reject; photo.src=url; });
  const scale=Math.min(1,2200 / Math.max(photo.naturalWidth, photo.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(photo.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(photo.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(photo,0,0,canvas.width,canvas.height);
  return canvas;
}

export function showScan(el,{save,close,speak}) {
  let revision=0, worker=null, photoUrl='', active=true, timer=null;
  let edited=[], mode='choose';
  const page=piece('section','wg-scan');
  el.replaceChildren(page);
  function cancel() {
    revision++;
    clearTimeout(timer);
    if(worker){ worker.terminate().catch(()=>{}); worker=null; }
    if(photoUrl){URL.revokeObjectURL(photoUrl); photoUrl='';}
  }
  function header(label, subtitle, back) {
    page.replaceChildren();
    const nav=piece('div','scan-nav');
    const b=button('', 'back','scan-back', back);
    b.setAttribute('aria-label',mode==='choose'?'Back to home':'Back to photo options');
    nav.append(b,piece('span','scan-label','Word camera'));
    const guide=button('', 'sound','scan-icon scan-guide',()=>speak?.(label+'. '+subtitle));
    guide.setAttribute('aria-label','Read these instructions');nav.append(guide);
    page.append(nav);
    const title=piece('h1','scan-title',label);
    title.tabIndex=-1;
    page.append(title,piece('p','scan-intro',subtitle));
    return title;
  }
  function choose() {
    cancel(); mode='choose';
    header('Snap your words','Put your spelling list on a table and take a picture.',close);
    const art=piece('div','scan-frame');
    art.innerHTML='<i></i><i></i><i></i><i></i><div class="scan-sheet" aria-hidden="true"><b></b><span>cat</span><span>sun</span><span>map</span></div>';
    art.setAttribute('aria-hidden','true');page.append(art);
    const controls=piece('div','scan-actions');
    function picker(camera) {
      const input=document.createElement('input'); input.type='file';input.accept='image/*';
      if(camera) input.setAttribute('capture','environment');
      input.hidden=true; input.setAttribute('aria-label', camera?'Camera photo':'Photo library');
      input.addEventListener('change',()=>{if(input.files?.[0]) process(input.files[0]);});
      controls.append(button(camera?'Take a picture':'Choose a photo',camera?'camera':'album',camera?'scan-primary':'scan-secondary',()=>input.click()),input);
    }
    picker(true);picker(false);
    controls.append(button('Type my words','type','scan-link',()=>manual('')));
    page.append(controls,piece('p','scan-foot','Your picture stays on this device.'));
  }
  function manual(message, seeded='') {
    cancel(); mode='manual';header('Type your words','Put a space, comma, or new line between each word.',choose);
    if(message) { const n=piece('p','scan-note',message);n.setAttribute('role','status');page.append(n); }
    const area=piece('textarea','scan-text');area.setAttribute('aria-label','Your spelling words');area.setAttribute('autocapitalize','none');area.spellcheck=false;area.placeholder='cat, sun, map';area.rows=5;area.value=seeded;
    page.append(area);
    const status=piece('p','scan-warning');status.setAttribute('role','status');
    page.append(status,button('Check my words','arrow','scan-primary',()=>{
      const words=readWordCandidates(area.value);
      const tokens=area.value.trim().split(/[\s,;|/]+/).filter(Boolean);
      if(tokens.some(t=>!new RegExp('^[a-zA-Z]{1,'+maxLength+'}$').test(t))) {status.textContent='Use letters A–Z, up to '+maxLength+' letters per word.';return;}
      if(!words.length){status.textContent='Add a word to get started.';area.focus();return;}
      if(words.length>limit){status.textContent='Pick up to '+limit+' words for one list.';return;}
      review(words,'Change any word before you play.');
    }));
  }
  function review(words, message) {
    cancel();mode='review';edited=[...words];
    header('Check your words',message,choose);
    const list=piece('div','scan-words'), count=piece('p','scan-count');
    const warning=piece('p','scan-warning');warning.setAttribute('role','status');
    const add=button('Add a word','plus','scan-link',()=>{if(edited.length<limit){edited.push('');draw();list.querySelector('.scan-row:last-child input')?.focus();}});
    function draw() {
      list.replaceChildren(); count.textContent=edited.length+' '+(edited.length===1?'word':'words');add.disabled=edited.length>=limit;
      edited.forEach((value,i)=>{
        const row=piece('div','scan-row'), field=piece('input','scan-word-input');
        field.value=value;field.maxLength=maxLength;field.setAttribute('aria-label','Word '+(i+1));field.spellcheck=false;field.autocapitalize='none';field.autocomplete='off';
        field.addEventListener('input',()=>{edited[i]=field.value;warning.textContent='';});
        const speakWord=button('','sound','scan-icon',()=>{if(field.value.trim())speak?.(field.value.trim());});
        speakWord.setAttribute('aria-label','Read word '+(i+1));
        const remove=button('','close','scan-icon',()=>{edited.splice(i,1);draw();});
        remove.setAttribute('aria-label','Remove word '+(i+1));
        row.append(piece('span','scan-number',String(i+1)),field,speakWord,remove);list.append(row);
      });
    }
    const footer=piece('div','scan-save');
    footer.append(warning,button('Play with these words','arrow','scan-primary',()=>{
      const clean=edited.map(word=>word.trim().toLowerCase()).filter(Boolean);
      if(!clean.length){warning.textContent='Add a word to start playing.';return;}
      const invalid=edited.findIndex(v=>v.trim()&&!/^[a-z]+$/i.test(v.trim()));
      if(invalid>=0){warning.textContent='Use letters A–Z in word '+(invalid+1)+'.';list.querySelectorAll('input')[invalid].focus();return;}
      save([...new Set(clean)]);
    }));
    draw();page.append(count,list,add,footer);
  }
  async function process(file) {
    cancel();mode='reading';
    const version=revision;
    const current=()=>active&&revision===version;
    header('Reading your list','Look for your words on the next screen.',choose);
    const stage=piece('div','scan-reading');
    const img=new Image();img.alt='Your spelling list';photoUrl=URL.createObjectURL(file);img.src=photoUrl;stage.append(img,piece('div','scan-beam'));page.append(stage);
    const progress=piece('progress','scan-progress');progress.max=100;progress.value=5;progress.setAttribute('aria-label','Reading progress');
    const status=piece('p','scan-foot','Getting the word reader ready…');status.setAttribute('role','status');
    page.append(progress,status,button('Type my words instead','type','scan-link',()=>manual('')));
    timer=setTimeout(()=>{if(current()) manual('The picture took a while to read. Type your words or go back to try another photo.');},90000);
    try {
      const canvas=await photoCanvas(photoUrl);
      if(!current())return;
      const {default:engine}=await import('./vendor/ocr/tesseract.esm.min.js');
      if(!current())return;
      const started=await engine.createWorker('eng',engine.OEM.LSTM_ONLY,{
        workerPath:assets('worker.min.js'),corePath:assets('tesseract-core-lstm.wasm.js'),langPath:engineRoot.href,workerBlobURL:false,cacheMethod:'none',
        logger(event){if(current()&&event.status==='recognizing text'){status.textContent='Finding your spelling words…';progress.value=20+78*event.progress;}},
        errorHandler(){if(current())manual('The reader could not open this picture. Type the words or try another photo.');}
      });
      if(!current()){await started.terminate();return;}
      worker=started;
      await worker.setParameters({tessedit_pageseg_mode:engine.PSM.SPARSE_TEXT});
      if(!current())return;
      const {data}=await worker.recognize(canvas);
      if(!current())return;
      const words=readWordCandidates(data.text,true);
      const skippedForms=/[a-z]['’\-][a-z]|[a-z]{19}/i.test(data.text);
      if(words.length){review(words.slice(0,limit),words.length>limit?'Here are the first '+limit+' words. Remove any you don’t need.':skippedForms?'Only A–Z words up to 18 letters are included. Check your list before playing.':'Read each word. Tap a word to fix it, or × to remove it.');}
      else manual('No words showed up. Try a brighter picture or type them here.');
    } catch {
      if(current())manual('The picture was hard to read. Try a brighter photo or type the words here.');
    }
  }
  choose();
  return ()=>{active=false;cancel();};
}
