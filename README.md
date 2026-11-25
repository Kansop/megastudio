# ✨ MegaStudio

**An all-in-one productivity + creativity studio that runs entirely in your browser.**
Notes, kanban boards, calendar, spreadsheets, paint, a music studio, a code playground, an arcade, a file manager and more — offline-capable, installable, no account, no server.

### ▶ Live app: https://kansop.github.io/megastudio/

## Apps
| | App | Highlights |
|---|---|---|
| 🏠 | Dashboard | Greeting & clock, jump back in, agenda, boards, today's focus & habits, arcade bests, grouped app launcher, onboarding tour |
| 📝 | Notes | Markdown with live preview, `[[wikilinks]]`, #tags, tasks, templates, daily notes, images, print/PDF |
| ✍️ | Writer | Rich-text word processor: templates (MLA essay, letter, résumé, lab report), tables, images, find/replace, outline, readability, focus mode, DOC/PDF/HTML/MD export |
| 📋 | Boards | Multiple kanban boards, drag & drop, labels, due dates, checklists |
| 📅 | Calendar | Month / week / agenda, recurring events, board due dates, `.ics` import/export |
| 📊 | Sheets | Formula engine (50+ functions), tabs, formatting, CSV, charts, undo, fill-down, sort |
| ⏱ | Focus & Habits | Pomodoro timer, focus stats, habit streaks + 16-week heatmap |
| 🗃 | Flashcards | Spaced repetition (SM-2), quiz mode, CSV import/export |
| ⌨️ | Typing Tutor | Speed tests (words/quotes/code), 14 finger-guided lessons, history chart, error heatmap + drills, Word Rain game |
| 🍳 | Recipes | Recipe box with servings scaling, full-screen cook mode with step timers, weekly meal planner with auto-fill, aisle-grouped shopping list that merges units, text import |
| 💰 | Money | Income/expense tracker, category donut, 6-month trend, budgets, CSV |
| 🗃 | Database | Typed fields, grid/gallery/board/chart views, formulas, filters, CSV, templates |
| 💬 | Bot Chat | 7 offline bots (studio assistant, ELIZA, trivia, text adventure, roast bot, story weaver, coach) + group chats |
| 📈 | Projects | Gantt timeline, dependencies with auto-shift, milestones, critical path, CSV/calendar export |
| 📬 | Inbox | Local email client: folders, labels, threads, snooze, drafts, attachments, bot replies |
| 🎨 | Paint | Layers, brushes, shapes, flood fill, text, eyedropper, symmetry, PNG export |
| 🎹 | Music Studio | Drum machine + lead + bass sequencer, mixer, live recording, Web MIDI, Euclidean rhythms, WAV & MIDI export |
| 🎸 | Music Tools | Chromatic tuner (mic pitch detection), metronome with tap tempo & subdivisions, piano chord/scale explorer with diatonic chords, 40 guitar chord diagrams, circle of fifths, interval ear training |
| 🧠 | Whiteboard | Infinite canvas mind maps & flows, connectors, pen, auto-arrange, SVG/PNG export |
| 🎤 | Slides | Markdown decks, 6 themes, presenting, speaker notes, HTML/PDF export |
| 👾 | Pixel Studio | Pixel art + animation, onion skin, palettes, spritesheet & GIF export |
| 🧊 | Voxel 3D | WebGL block builder, orbit camera, mirror mode, generators, OBJ/PNG export |
| 🌀 | Fractals | GPU Mandelbrot/Julia/Burning Ship/Newton explorer, palettes, bookmarks, PNG |
| 🎬 | Video Editor | Timeline trim/split, title cards, Ken Burns photos, filters, fades, text overlays, music, WebM export |
| 🖼 | Photo Lab | Adjustments, filters, crop/rotate, PNG/JPEG export |
| 🎙 | Recorder | Voice memos with live waveform, saved to Files |
| 💻 | Code Lab | HTML/CSS/JS playground with live preview, console, templates |
| 🔌 | Logic Lab | Digital circuit simulator: gates, switches, clocks, flip-flops, LEDs, 7-segment, truth tables, examples |
| ⌨ | Terminal | mega-sh shell with files, pipes and redirects |
| 🗺 | Maps | OpenStreetMap, search, saved places, multi-stop routing with turn-by-turn, GPX export |
| ⛅ | Weather | Open-Meteo forecasts, 48h chart, 10-day outlook, air quality, sun & moon |
| 🪐 | Solar System | 3D orrery from real JPL orbital elements, Moon, Pluto, Halley's comet, asteroid belt, time travel, facts & light-time |
| ⚛️ | Periodic Table | 118 elements, color modes, electron configs, Bohr model, molar-mass calculator, quiz |
| 📈 | Graphing Calc | Explicit/implicit/polar/parametric plots, inequalities, sliders, derivatives, roots/extrema/intersections, integrals, tables, share links |
| 🧰 | Toolbox | 15 utilities: calculator, QR codes, units, JSON, regex, colors, encoders, hashes, passwords, diff… |
| 🗂 | Files | IndexedDB file system with folders, previews, editing |
| 🧪 | Physics Lab | Verlet sandbox: balls, boxes, ropes, cloth, ragdolls, wheels, blasts |
| 🕹 | Arcade | 27 games: Snake, 2048, Blocks, Minesweeper, Breakout, Memory, Flappy, Pong, Sudoku, Connect Four, Word Guess, Tic-Tac-Toe, Chess, Asteroids, Space Invaders, Solitaire, Reversi, Checkers, Simon, Turbo Racer, Pixel Quest, Tower Defense, Gem Swap, Mini Golf, Battleship… |
| ⚙️ | Settings | 7 themes, accent color, text size, full backup/restore |

## Power features
- **Command palette** (`Ctrl/⌘ K`) searches apps, commands, notes, cards, events and files — and does math (`=sqrt(2)*10`)
- **Keyboard shortcuts** everywhere (`?` to list them)
- **Onboarding tour** on first visit (replay with “Take the tour”)
- **Installable PWA** with an offline service worker
- Everything is stored locally in **IndexedDB**; export a single JSON backup any time

## Run locally
It's static files — serve the folder with anything:
```
python3 -m http.server 8000
```
