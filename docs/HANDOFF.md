# Silvertrace — teammate handoff

The core of the toy is built and on `main`: the analog stylus, the continuous
line, non-destructive resize, and the `F` / Mode-button switch to free mode.

Three things are left. Each one is a `TODO(...)` comment in `sketch.js` that
says where to put the code and what the approach is. Pick one, take the whole
ticket, and don't edit someone else's section — that is what keeps the merges
clean.

**What works today:** pointer drawing in analog mode, `F`, the Mode button.
**What is dead on purpose:** `↑` `↓`, `Space`, `E`, `S`, the Shake button, and
knob rotation. Those are these three tickets. They are dimmed in the on-screen
legend; un-dim them (remove `class="pending"`) as you land them.

---

## Ticket 1 — Thickness keys

**Marker:** `TODO(thickness)` in `sketch.js`, plus the one inside `tick()`.
**Files:** `sketch.js`, `index.html`, `style.css`.
**Branch:** `feature/thickness`

`ArrowUp` / `ArrowDown` change `state.thickness`, clamped to 1–40, accelerating
while the key is held.

- **Do not rely on the OS key-repeat.** Its initial delay is a system setting,
  so the acceleration would feel different on every machine. Ignore events
  where `event.repeat` is true, and run your own timer: on `keydown` start an
  interval, on `keyup` clear it. Grow the step with how long the key has been
  held — 1 px per tick for the first ~400 ms, then ramp to 3–4.
- Write the value into `#thicknessValue` (the HUD in the corner of the screen).
- **The preview dot needs its own canvas.** `#board` is the drawing cache —
  clearing it to repaint a dot would wipe the picture. Add a second
  `<canvas id="preview">` inside `.screen`, absolutely positioned over `#board`
  with `pointer-events: none`, size it in `fitCanvas()` the same way, and in
  `tick()` clear it and fill a circle of radius `state.thickness / 2` at
  `state.stylus`.

**Done when:** holding `↑` climbs and visibly accelerates, stops dead at 40 and
at 1; the line you draw afterwards is thicker; the preview dot matches the line
width you then get; older strokes keep the width they were drawn at (they will —
each segment stores its own `w`); resizing still redraws a picture with mixed
widths correctly.

---

## Ticket 2 — Erase

**Marker:** `TODO(erase)` in `sketch.js`.
**Files:** `sketch.js`, `style.css`, `index.html`.
**Branch:** `feature/erase`

One `erase()` function, four ways to trigger it: `Space`, `E`, the Shake button,
and physically shaking the mouse.

- **Mouse shake:** in `onPointerMove`, compare the new x against the last one
  and track the sign of the movement. When the sign flips, push a timestamp
  into an array; drop entries older than 600 ms; 6 or more reversals in that
  window fires the erase. Ignore movements under ~2 px or pointer jitter will
  trigger it constantly.
- **The animation is the point — do not just clear the canvas.** Add a
  `.shaking` class to `#toy` for a ~450 ms keyframe shake (small translate plus
  a fraction of a degree of rotate), and fade the drawing out over ~600 ms. The
  simplest fade is a CSS `opacity` transition on `#board`. When it finishes:
  empty `state.segments`, `clearRect` the canvas, remove the class, and put the
  opacity back to 1.
- **Guard against re-entry.** Hold an `isErasing` flag and return early if it is
  set, or mashing Space mid-animation leaves the canvas stuck at opacity 0.
- `Space` scrolls the page and also activates a focused button — call
  `event.preventDefault()` on it.
- Remove `class="pending"` from the Shake button and the two legend entries.

**Done when:** all four triggers work; the frame shakes and the drawing fades
rather than snapping; you can draw again immediately afterwards; shaking the
mouse in normal use does not fire it by accident.

---

## Ticket 3 — Save PNG + knob rotation

**Markers:** `TODO(save)` and `TODO(knobs)` in `sketch.js`.
**Files:** `sketch.js`, `index.html`.
**Branch:** `feature/save-and-knobs`

Two small ones, bundled so the tickets come out even.

**Save (`S`).** The canvas holds *only the ink* — the warm gray comes from CSS —
so exporting `#board` directly gives you a PNG with a transparent background.
Draw onto an offscreen canvas first: same pixel size, fill it with the
`--screen` color, `drawImage` the board on top, then export. Prefer
`canvas.toBlob()` + `URL.createObjectURL()` over `toDataURL()` and remember to
`URL.revokeObjectURL()` afterwards. Trigger it with a temporary
`<a download="silvertrace.png">` that you click and remove.

**Knobs.** In `tick()`, at the `TODO(knobs)` marker: the left knob tracks x, the
right tracks y. Normalize `state.stylus.x / view.w` to 0–1, map that to roughly
`-140deg … 140deg`, and set `transform: rotate(...)` on the inner `<i>` tick
mark of each knob. Its `transform-origin` is already set to the knob center.
**Cache the two `<i>` elements in variables outside `tick()`** — a
`querySelector` every frame is wasteful.

**Done when:** `S` downloads `silvertrace.png` and the file has a warm gray
background, not a transparent one; both knobs counter-rotate smoothly as you
move the pointer and hit their limits at the edges of the screen.

---

# Working in the repo

## 1. Get access (owner does this once)

On GitHub: **Settings → Collaborators and teams → Add people**, enter each
teammate's GitHub username. They get an email invite and have to accept it
before they can push.

## 2. Get the code

```bash
git clone https://github.com/SteveElias78/CRCP-6330-Creative-Coding-for-the-Web.git
cd CRCP-6330-Creative-Coding-for-the-Web
```

Open `index.html` in a browser to run it. No server, no install, no build step.

## 3a. Committing straight to `main`

Fine for small stuff, but four people pushing to one branch will collide.

```bash
git pull --rebase origin main      # ALWAYS do this first
# ...make your changes...
git add -A
git commit -m "build: thickness keys with accelerating repeat"
git pull --rebase origin main      # again — someone may have pushed meanwhile
git push origin main
```

**If the push is rejected** with "Updates were rejected because the remote
contains work that you do not have locally" — that just means someone pushed
first. It is not a broken repo:

```bash
git pull --rebase origin main
# fix any conflict, then:  git add <file> && git rebase --continue
git push origin main
```

`--rebase` replays your commits on top of theirs instead of creating a merge
commit, which keeps the history a straight readable line.

## 3b. Working on a branch (do this instead)

Use this if you are not ready to put your work on `main`, or you want it
reviewed first. **This is also what the assignment's stretch goal asks for**, so
prefer it.

```bash
git switch -c feature/thickness     # branch off main, named for your ticket
# ...work, commit as many times as you like...
git add -A
git commit -m "build: thickness keys with accelerating repeat"
git push -u origin feature/thickness
```

Your branch is now on GitHub and **`main` is untouched**. You can keep pushing
to it (`git push` on its own from here on) for as long as you want.

When it is ready, on GitHub: the repo page shows a **"Compare & pull request"**
button for your branch. Click it, write what you built and how you tested it,
request a teammate as reviewer, and once they approve, **Merge pull request**.

Then get back in sync locally:

```bash
git switch main
git pull origin main
git branch -d feature/thickness     # delete the branch, it is merged now
```

If `main` has moved ahead while you were working and the PR shows conflicts:

```bash
git switch feature/thickness
git pull --rebase origin main
# resolve, then
git push --force-with-lease
```

`--force-with-lease` (not plain `--force`) refuses to overwrite anything you
have not seen — it is the safe version.

## 4. Undoing something already on `main`

```bash
git revert <commit-sha>
git push origin main
```

That makes a *new* commit undoing the old one, so nobody's history breaks.
Never `git reset --hard` a branch other people have pulled.

## 5. Commit message convention

Prefix every message with the stage of the loop it belongs to:

- `spec+plan:` — deciding what to build and writing it down
- `build:` — implementing against the spec
- `review:` — changes that came out of reading a diff
- `fix:` — corrections found by running and inspecting the app

## 6. Before you open the PR

Actually run the thing and check your feature works — the assignment is graded
on evidence that the app was run and inspected, not just that code was pushed.
Open the browser console (F12) and confirm there are no errors, then put a
screenshot or a short note of what you tested in the PR description.
