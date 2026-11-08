# Camera and recognition
The scanner uses the HTML image file input (`capture="environment"` as the rear-camera hint), a separate gallery input, an in-memory downscaled canvas, and an isolated web worker. No image leaves the browser. Only reviewed A–Z words, up to 18 letters and 36 entries, reach the application's save callback. Printed English lists work best. A child can hear, change, remove, or add individual words before playing. Type and paste work without OCR.

The four runtime files in `dist/vendor/ocr` are self-hosted. The library uses explicit same-origin worker, core, and language paths. A single portable non-SIMD LSTM build avoids a second, SIMD-specific binary. The reader loads on photo selection. Native Live Text, keyboard dictation, and third-party APIs are unnecessary.

| Dependency | Version and source | License |
| --- | --- | --- |
| Tesseract.js browser ESM and worker | npm tesseract.js 6.0.1, https://github.com/naptha/tesseract.js | Apache-2.0, with distribution notices alongside the files |
| Core, JS wrapper and embedded WASM | npm tesseract.js-core 6.1.2, https://github.com/naptha/tesseract.js-core | Apache-2.0 |
| English LSTM data | locally installed packaged tessdata_fast, https://github.com/tesseract-ocr/tessdata_fast | Apache-2.0 |

The camera hint is device-dependent. Some browsers show their image picker and offer a camera there. Gallery selection and typed entry remain available. Blurry, dark, handwritten and multi-column pages may yield imperfect results. A retry, manual entry and editable review preserve the user's route to gameplay.

Runtime cache requirements are tesseract.esm.min.js, worker.min.js, tesseract-core-lstm.wasm.js and eng.traineddata.gz. Engine/model files total roughly 5.9 MiB on disk. No analytics or remote API keys are used.
