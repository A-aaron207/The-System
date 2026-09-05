# THE SYSTEM

A solo-leveling inspired in-browser productivity tracker and gamified habit/quest manager.

This repository contains a single-page Progressive Web App (PWA) built with plain HTML, CSS and vanilla JavaScript. It stores all user data locally (localStorage) and is designed to be installed on mobile/devices via the web manifest.

## Features

- Gamified quest system ("quests") with difficulties (E/D/C/B/A/S) and categories (Strength, Intelligence, Discipline, Focus, Creativity, Social).
- Level, XP, stat points and ranks with unlockable themes and features.
- Decision engine that computes daily score and applies rewards or penalties.
- Repeating quests, penalty generation, and adaptive quest generation to target weak categories.
- Achievements (30+), streaks, analytics and a system log.
- Notifications (browser Notification API) and PWA manifest for installability.
- Export / import backup as JSON.
- Optional Firebase account registry, cloud profile sync and global leaderboard.

## Files

- index.html — the complete application (UI, styles, and app logic).
- manifest.json — PWA manifest.
- icons/ — app icons (icon-192.png, icon-512.png).

## How to use

1. Open index.html in a modern browser (Chrome/Edge/Firefox). For full PWA behavior, serve the folder over HTTP (e.g. using `npx http-server` or `python -m http.server`) and open over `http://localhost`.
2. Add quests on the QUESTS page and use the app normally.
3. The app stores data in localStorage under the key `system_v4` (migrates older keys if present).
4. Use the SETTINGS page to Export/Import backups and toggle modes (Hardcore, notifications, etc.).
5. Grant notifications to receive reminders and daily evaluation messages.

## Developer notes

- Primary source: `index.html`. The UI, CSS and all JavaScript logic are contained in that file.
- Key constants and behavior visible in the code:
  - XP by difficulty: E=5, D=10, C=20, B=35, A=50, S=80 (XP_DIFF)
  - Penalty, SP, and level XP formula: `XPneeded(level) = Math.floor(100 * level^1.5)`
  - Local storage key: `system_v4`. Old keys checked: `system_v3`, `sl_v2`, `sl_system`.
  - Unlocks and achievements are defined in the app (LEVEL_UNLOCKS, ACHIEVES arrays).
  - Notification use via the browser Notification API (requires permission).

## Notes & limitations

- No backend — all data is local to the browser. There is no user authentication.
- Cloud competition is optional and requires a Firebase Web App config plus Firestore rules; without it, the app remains fully functional in local mode.
- The app is designed as a single-file app; editing functionality and extensions should be done by modifying `index.html`.
- No license is included in this repository. If you want to reuse or distribute this project, add a LICENSE file (MIT or similar recommended).

## Contributing

Feel free to open issues or pull requests. Suggested improvements:
- Split JavaScript from `index.html` into separate files (e.g. `app.js`, `styles.css`).
- Add automated tests or a build system.
- Add internationalization and accessibility improvements.

## Attribution

Inspired by the Solo Leveling theme and gamified habit-tracking concepts. Icons included in `icons/`.

---

If you'd like, I can:
- add a LICENSE file (MIT recommended),
- split the large `index.html` into `index.html`, `app.js`, and `styles.css`, or
- create a small README badge or demo screenshot — tell me which you'd prefer and I'll make the changes.