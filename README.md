# 🌍 Learning Islands — 3D Adventure World

A colorful, kid-friendly **3D educational game world** built with [Three.js](https://threejs.org/).
Kids walk around a floating archipelago, step into glowing **teleport portals**, and play
learning games and fun mini-games. Everything is bilingual — **English 🇬🇧 / Russian 🇷🇺** —
and teachers get their own island with fun "admin abuse" powers, announcements, and house points.

No build step, no server, no external assets — just open it in a browser.

## ▶ How to run

Because it uses ES modules, open it through a tiny local web server (not `file://`):

```bash
# from the project folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

Three.js loads from a CDN, so an internet connection is needed the first time.

## 🎮 Controls

| Action | Keys |
|--------|------|
| Move forward / back | `W` `S` or ↑ ↓ |
| Turn left / right | `A` `D` or ← → |
| Jump | `Space` |
| Play a game (at a portal) | `E` |
| Open world map / fast-travel | `M` |
| Menu | ☰ button (top-right) |

On touch screens an on-screen joystick and jump button appear automatically.

## 🏝 The Islands

- **➗ Math Island** — Addition, Subtraction, **Multiplication**, **Division**, and Mixed. Earn ⭐ for correct answers.
- **🔤 English Island** — Emoji vocabulary quiz (learn English words).
- **🪆 Russian Island** — Emoji vocabulary quiz (learn Russian words).
- **❓ Quiz Tower** — A mixed quiz of math + words.
- **🐤 Flappy Bird Cove** — Classic flap-through-the-pipes. Every 5 points = ⭐.
- **⛏ Block World** — A Minecraft-style 3D voxel builder. Place/remove colored blocks and build anything.
- **🔴 Dodgeball Arena** — **3D dodgeball that needs 2+ players.** Play **2-players on one keyboard** or with **bots** filling the teams.
- **🌲 Hide & Seek Forest** — You're the seeker! Find all hidden friends before time runs out.
- **🍎 Teachers' Island** — Teacher-only control panel (see below).

## ⭐ Stars & 🏆 House Points

- Kids earn **stars** by playing learning games.
- **30 ⭐ stars = 1 🏆 house point** (converted automatically).
- Progress is saved per player name in the browser (`localStorage`).
- There are no groups — every child collects their own stars and points.

## 🍎 Teacher Mode

Choose **"I am a Teacher"** and enter the code **`teach123`**. Teachers get:

- **Fun Powers ("Admin Abuse")** — make everyone Giant/Tiny, Super Jump, Speed Boost,
  Low Gravity, Rainbow Sky, Disco Party, 🎆 Fireworks (+2⭐) and 🌟 Star Rain (+5⭐).
- **Announcements** — type a message that flashes across everyone's screen with a chime.
- **Give House Points** — award a house point to any student by name.

## 🔊 Audio

All music and sound effects are **synthesized live with the Web Audio API** — no audio files.
Toggle sound from the ☰ menu.

## 🌐 Language

The very first screen lets you choose **English** or **Русский**. The entire interface,
prompts, quizzes and teacher panel switch to the chosen language.

## 📝 Note on real-time multiplayer

This runs entirely in one browser with **local multiplayer** (Dodgeball 2-player / bots) and
friendly AI classmates in the hub. True cross-device online play (many kids in the same world at
once) would require adding a small multiplayer server (e.g. WebSocket) — the game is structured so
that could be added later. Everything here works offline in a single browser.

## 🗂 Project structure

```
index.html      Entry page + menus + HUD
styles.css      All styling
js/i18n.js      English & Russian text
js/core.js      State, stars/points, save/load, helpers
js/audio.js     Web-Audio synthesized music & SFX
js/world.js     3D hub world: islands, portals, player, effects
js/games.js     All mini-games (quizzes, flappy, block world, dodgeball, hide & seek)
js/teacher.js   Teacher control panel
js/main.js      Bootstrap & wiring
```
