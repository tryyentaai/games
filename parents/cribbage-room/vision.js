/* The Cribbage Room — on-device card recognition.
   A YOLO11s playing-card detector (52 classes, corner pips) runs in the browser with onnxruntime-web.
   Nothing is uploaded: the photo is read on the device and the model is cached after the first download. */
(function () {
  const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.wasm.min.js';
  const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
  const MODEL_URL = 'https://huggingface.co/sroot/lgd-cards-gen3/resolve/main/model.onnx';
  const CLASSES_URL = 'https://huggingface.co/sroot/lgd-cards-gen3/resolve/main/model.classes.json';
  const DEFAULT_CLASSES = ['10C', '10D', '10H', '10S', '2C', '2D', '2H', '2S', '3C', '3D', '3H', '3S', '4C', '4D', '4H', '4S', '5C', '5D', '5H', '5S',
    '6C', '6D', '6H', '6S', '7C', '7D', '7H', '7S', '8C', '8D', '8H', '8S', '9C', '9D', '9H', '9S',
    'AC', 'AD', 'AH', 'AS', 'JC', 'JD', 'JH', 'JS', 'KC', 'KD', 'KH', 'KS', 'QC', 'QD', 'QH', 'QS'];
  const CACHE = 'crib-vision-v1';
  const SIZE = 640;

  let session = null, classes = DEFAULT_CLASSES, loading = null;

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (window.ort) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load the card reader. Check your connection and try again.'));
      document.head.appendChild(s);
    });
  }

  async function fetchCached(url, onProgress) {
    let cache = null;
    try { cache = await caches.open(CACHE); const hit = await cache.match(url); if (hit) { onProgress && onProgress(1); return hit.arrayBuffer(); } } catch (e) {}
    const res = await fetch(url);
    if (!res.ok) throw new Error('Could not download the card reader (' + res.status + ').');
    const total = +res.headers.get('content-length') || 0;
    let buf;
    if (res.body && res.body.getReader && total) {
      const reader = res.body.getReader(), parts = []; let got = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress && onProgress(got / total); }
      const out = new Uint8Array(got); let o = 0; parts.forEach((p) => { out.set(p, o); o += p.length; });
      buf = out.buffer;
    } else { buf = await res.arrayBuffer(); onProgress && onProgress(1); }
    try { if (cache) await cache.put(url, new Response(buf.slice(0), { headers: { 'content-type': 'application/octet-stream' } })); } catch (e) {}
    return buf;
  }

  async function isCached() {
    try { const c = await caches.open(CACHE); return !!(await c.match(MODEL_URL)); } catch (e) { return false; }
  }

  function load(onProgress) {
    if (session) return Promise.resolve(session);
    if (loading) return loading;
    loading = (async () => {
      await loadScript(ORT_URL);
      window.ort.env.wasm.wasmPaths = ORT_WASM;
      window.ort.env.wasm.numThreads = 1; // GitHub Pages can't enable cross-origin isolation, so no threads
      try { classes = JSON.parse(new TextDecoder().decode(await fetchCached(CLASSES_URL))); if (!Array.isArray(classes)) classes = Object.values(classes); } catch (e) { classes = DEFAULT_CLASSES; }
      const model = await fetchCached(MODEL_URL, onProgress);
      session = await window.ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      return session;
    })();
    loading.catch(() => { loading = null; });
    return loading;
  }

  function fileToImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => res({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That photo could not be opened.')); };
      img.src = url;
    });
  }

  // Letterbox to 640x640, gray padding, RGB 0-1, CHW.
  function preprocess(img) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const scale = Math.min(SIZE / w, SIZE / h), nw = Math.round(w * scale), nh = Math.round(h * scale);
    const cv = document.createElement('canvas'); cv.width = SIZE; cv.height = SIZE;
    const g = cv.getContext('2d'); g.fillStyle = 'rgb(114,114,114)'; g.fillRect(0, 0, SIZE, SIZE);
    g.drawImage(img, (SIZE - nw) / 2, (SIZE - nh) / 2, nw, nh);
    const px = g.getImageData(0, 0, SIZE, SIZE).data, n = SIZE * SIZE, f = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { f[i] = px[i * 4] / 255; f[n + i] = px[i * 4 + 1] / 255; f[2 * n + i] = px[i * 4 + 2] / 255; }
    return f;
  }

  /**
   * Parse raw YOLO output into unique cards.
   * Accepts [1, 4+K, N] (Ultralytics default) or [1, N, 4+K]. Each card shows two corner pips,
   * and a real deck has one of each card, so the best box per class is the card.
   */
  function parse(data, dims, names, thr) {
    thr = thr || 0.35;
    const K = names.length;
    let C = dims[1], N = dims[2], transposed = false;
    if (C !== 4 + K && dims[2] === 4 + K) { transposed = true; C = dims[2]; N = dims[1]; }
    const at = transposed ? (ch, i) => data[i * C + ch] : (ch, i) => data[ch * N + i];
    const best = new Map();
    for (let i = 0; i < N; i++) {
      let bc = -1, bs = 0;
      for (let k = 0; k < K; k++) { const sc = at(4 + k, i); if (sc > bs) { bs = sc; bc = k; } }
      if (bs < thr) continue;
      const prev = best.get(bc);
      if (!prev || bs > prev.conf) best.set(bc, { code: names[bc], conf: bs, x: at(0, i), y: at(1, i) });
    }
    return Array.from(best.values()).sort((a, b) => b.conf - a.conf);
  }

  async function detect(file, onProgress) {
    const sess = await load(onProgress);
    const { img, url } = await fileToImage(file);
    try {
      const input = new window.ort.Tensor('float32', preprocess(img), [1, 3, SIZE, SIZE]);
      const out = await sess.run({ [sess.inputNames[0]]: input });
      const t = out[sess.outputNames[0]];
      return { url, found: parse(t.data, t.dims, classes, 0.35) };
    } catch (e) { URL.revokeObjectURL(url); throw e; }
  }

  window.VISION = { load, detect, parse, isCached, DEFAULT_CLASSES };
})();
