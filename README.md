# ✨ MegaStudio

**An all-in-one productivity + creativity studio that runs entirely in your browser.**
Notes, kanban boards, calendar, spreadsheets, paint, a music studio, a code playground, an arcade, a file manager and more — offline-capable, installable, no account, no server.

### ▶ Live app: https://kansop.github.io/megastudio/

## Apps
| | App | Highlights |
|---|---|---|
| 🏠 | Dashboard | Greeting & clock, agenda, board progress, recent notes, quick capture, stats |
| 📝 | Notes | Markdown with live preview, `[[wikilinks]]`, #tags, task checkboxes, templates, daily notes, images, print/PDF |
| 📋 | Boards | Multiple kanban boards, drag & drop, labels, due dates, checklists |
| 📅 | Calendar | Month / week / agenda, recurring events, board due dates, `.ics` import/export |
| 📊 | Sheets | Formula engine (50+ functions), multiple tabs, formatting, CSV, charts, undo, fill-down, sort |
| 🎨 | Paint | Layers, brushes, shapes, flood fill, text, eyedropper, symmetry, zoom, PNG export |
| 🎹 | Music Studio | Drum machine + lead + bass sequencer, live keyboard synth, 4 patterns + song chain, WAV export |
| 💻 | Code Lab | HTML/CSS/JS playground with syntax highlighting, live preview, console, templates |
| 🕹 | Arcade | Snake, 2048, Blocks, Minesweeper, Breakout, Memory, Flappy, Pong — with best scores |
| 🗂 | Files | IndexedDB file system: folders, drag-drop upload, previews, in-place text editing |
| ⚙️ | Settings | 7 themes, accent color, text size, full backup/restore |

## Power features
- **Command palette** (`Ctrl/⌘ K`) searches apps, commands, notes, cards, events and files — and does math (`=sqrt(2)*10`)
- **Keyboard shortcuts** everywhere (`?` to list them)
- **Installable PWA** with an offline service worker
- Everything is stored locally in **IndexedDB**; export a single JSON backup any time

## Run locally
It's static files — serve the folder with anything:
```
python3 -m http.server 8000
```
