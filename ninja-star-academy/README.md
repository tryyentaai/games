# Ninja Star Academy

A child-friendly iPhone web app with Sky Run, Star Throw, and Lantern Pop. Stars unlock scarves and stickers. No ads, purchases, game accounts, analytics, or child data collection. Browser-local progress can be exported and restored.

## Run

Serve this directory from an HTTPS static host. No build step, external fonts, CDN, or install needed. ES modules, Canvas 2D, Web Audio, Pointer Events, and a scoped service worker are browser-native. Files resolve relative to this directory, so the app can coexist with sibling games on GitHub Pages. Add the HTTPS app to the iPhone Home Screen from Safari. Clearing browser data removes local progress; different devices and origins have independent saves.

## Verification status

This is a recovery build reconstructed after the development workspace and browser connection failed. The earlier Phaser-based draft passed six model/worker tests, but this recovery build is a distinct implementation. Its core reward/validation math and JavaScript syntax were checked in the available JavaScript runtime. Browser play-testing, physical iPhone testing, performance measurement, and standalone/offline installation are not certified. Do not describe this version as a fully QA-verified paid-app release.

The recovery runtime uses browser-native Canvas instead of an unavailable local Phaser dependency and code-native vector artwork instead of inaccessible generated artwork. Phaser/PixiJS remain candidates for a later verified refinement. No known missing asset references are intentionally left in this version.

## Controls

Sky Run: tap the screen or Jump button to jump; tap twice for a double jump. Bumps spring you upward and never cost lives. Round ends at 15 stars or 40 seconds. Star Throw: tap a wooden target or use Throw; 12 hits finish. Lantern Pop: swipe/tap lanterns or use Pop; 12 finish. Pause preserves the current run; leaving the app pauses it. Completing any round earns stars and a collection sticker. Settings includes gentler difficulty, mute, calmer motion, and backups.
