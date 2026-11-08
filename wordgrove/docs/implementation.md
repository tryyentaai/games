# Implementation notes

The app combines a generated woodland scene, hand-authored illustrated game badges and a shared forest, paper and honey palette. The camera opens with one prominent capture action. Recognition is reviewed in editable rows with individual audio buttons. Each game returns to a common three-round rhythm with persistent stars and an immediate exit. The scheduler gives unseen and less recently practiced words priority. It records practice completions, not demonstrated mastery.

Browser-native modules and CSS suit these small turn-based boards. A canvas game engine would require rebuilding semantic button interaction and screen-reader names. No external framework is needed for the shell. The offline OCR worker and bundled Apache-licensed engine are described in scanner.md. The single original cover artwork and derived fox icons were generated for the project. All eleven game emblems are original vector artwork. No remote art or font requests occur at runtime.

Interaction references: Anki (https://apps.ankiweb.net/) for recall; Wordscapes (https://peoplefun.helpshift.com/hc/en/6-wordscapes/faq/267-game-overview/) for visible partial word completion; Duolingo (https://en.duolingo.com/nojs/splash) for short exercises and immediate feedback. Wordgrove has its own content, interface and reward loop.

Installable web app features use a manifest, service worker, speech synthesis and camera capture hint. Physical camera picker and voices depend on the device. Apple's install guide: https://support.apple.com/guide/iphone/iphea86e5236/ios .
