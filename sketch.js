/* =========================================================================
   Silvertrace — a drawing toy.

   The core idea: in analog mode the stylus is ALWAYS touching the powder.
   You never click. The pointer is a target, and the stylus chases it with
   easing, so the line lags behind and swoops through corners the way it does
   when you are cranking two knobs at once.

   How the drawing is stored: not as pixels, but as a list of line segments in
   NORMALIZED coordinates (0..1 of the screen box). The canvas is a cache we
   can throw away — on any resize we resize the backing store and replay the
   list. That is what keeps a resize from wiping the picture.
   ========================================================================= */
'use strict';

/* --- DOM handles --------------------------------------------------------- */
const toy         = document.getElementById('toy');
const screenEl    = document.getElementById('screen');
const canvas      = document.getElementById('board');
const ctx         = canvas.getContext('2d');
const hudValue    = document.getElementById('thicknessValue');
const modeButton  = document.getElementById('modeButton');
const shakeButton = document.getElementById('shakeButton');
const knobLeft    = document.getElementById('knobLeft');
const knobRight   = document.getElementById('knobRight');

/* --- Tuning --------------------------------------------------------------
   The one number that defines the feel. Higher = tighter and more pen-like,
   lower = looser and more mechanical. 0.15 lands where the line still keeps
   up with a fast scribble but visibly overshoots on a hard turn. */
const ANALOG_EASE = 0.15;

/* Below this much movement in a frame we do not record anything. It keeps
   thousands of sub-pixel segments out of the list while the stylus is
   settling onto a stationary pointer. */
const MIN_MOVE = 0.08;

/* --- State ---------------------------------------------------------------
   One object so it is obvious what the program remembers. */
const state = {
  mode: 'analog',      // 'analog' (stylus always down, eased) | 'free' (click-drag)
  thickness: 6,        // stroke width in CSS pixels, 1–40
  drawing: false,      // free mode only: is the pointer currently held down?

  // Where the stylus actually is, and where it is being pulled toward.
  // Both in CSS pixels relative to the screen element.
  stylus: { x: 0, y: 0 },
  target: { x: 0, y: 0 },

  // Every segment ever drawn. { ax, ay, bx, by, w } with a/b normalized 0..1
  // and w in CSS pixels.
  segments: [],
};

/* Measured size of the screen element in CSS pixels. Kept in a variable
   because we need the OLD size when a resize arrives, to carry the stylus
   across to the same relative spot. */
const view = { w: 0, h: 0 };

/* Read the line color out of the palette so CSS stays the single source of
   truth for color. */
const INK = getComputedStyle(document.documentElement)
  .getPropertyValue('--ink').trim() || '#2b2b2e';

/* --- Sizing --------------------------------------------------------------
   Match the canvas backing store to the screen element and the device pixel
   ratio, then repaint from state.segments.

   Note the order: assigning canvas.width/height clears the canvas AND resets
   the transform, so the transform and stroke settings have to be applied
   after, not before. */
function fitCanvas() {
  const rect = screenEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Nothing to do if the box did not actually change size (ResizeObserver can
  // fire for other reasons, and rebuilding is not free).
  if (Math.round(rect.width) === view.w && Math.round(rect.height) === view.h) return;

  const prev = { w: view.w, h: view.h };
  view.w = Math.round(rect.width);
  view.h = Math.round(rect.height);

  canvas.width  = Math.round(view.w * dpr);
  canvas.height = Math.round(view.h * dpr);

  // Work in CSS pixels from here on; the DPR scale is baked into the transform.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;

  if (prev.w > 0 && prev.h > 0) {
    // Keep the stylus where it was relative to the screen, so the line does
    // not jump across the picture on the next frame.
    rescalePoint(state.stylus, prev);
    rescalePoint(state.target, prev);
  } else {
    // First run: the stylus starts dead center, like the real toy.
    state.stylus.x = state.target.x = view.w / 2;
    state.stylus.y = state.target.y = view.h / 2;
  }

  redrawAll();
}

// Move a CSS-pixel point from the old screen size to the new one.
function rescalePoint(point, prev) {
  point.x = (point.x / prev.w) * view.w;
  point.y = (point.y / prev.h) * view.h;
}

/* --- Painting ------------------------------------------------------------
   Replay the whole segment list. Consecutive segments that share a width and
   join end-to-end are stroked as one path — a continuous line is the normal
   case here, so this collapses thousands of stroke() calls into a handful. */
function redrawAll() {
  ctx.clearRect(0, 0, view.w, view.h);

  const segs = state.segments;
  let i = 0;

  while (i < segs.length) {
    const width = segs[i].w;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(segs[i].ax * view.w, segs[i].ay * view.h);

    // Extend the path while the next segment continues this one at the same
    // width. (In free mode a pen-up breaks the chain, which is the point.)
    let j = i;
    while (
      j < segs.length &&
      segs[j].w === width &&
      (j === i || (segs[j].ax === segs[j - 1].bx && segs[j].ay === segs[j - 1].by))
    ) {
      ctx.lineTo(segs[j].bx * view.w, segs[j].by * view.h);
      j++;
    }

    ctx.stroke();
    i = j;
  }
}

/* Record one segment and paint just that segment, so drawing stays cheap —
   a full redraw only happens on resize. */
function addSegment(fromX, fromY, toX, toY) {
  state.segments.push({
    ax: fromX / view.w,
    ay: fromY / view.h,
    bx: toX / view.w,
    by: toY / view.h,
    w: state.thickness,
  });

  ctx.lineWidth = state.thickness;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

/* --- The loop ------------------------------------------------------------
   Ease the stylus toward the target, and lay down the distance it covered
   this frame. In free mode there is no easing: the stylus IS the pointer, and
   whether it draws depends on the button being held. */
function tick() {
  const fromX = state.stylus.x;
  const fromY = state.stylus.y;

  const ease = state.mode === 'analog' ? ANALOG_EASE : 1;
  state.stylus.x += (state.target.x - state.stylus.x) * ease;
  state.stylus.y += (state.target.y - state.stylus.y) * ease;

  // Analog: the stylus is always down. Free: only while the pointer is held.
  const down = state.mode === 'analog' ? true : state.drawing;
  const moved = Math.hypot(state.stylus.x - fromX, state.stylus.y - fromY);

  if (down && moved > MIN_MOVE) {
    addSegment(fromX, fromY, state.stylus.x, state.stylus.y);
  }

  // TODO(knobs): drive the two knob tick marks from state.stylus here.
  // TODO(thickness): draw the size-preview dot at state.stylus here.

  requestAnimationFrame(tick);
}

/* --- Input ---------------------------------------------------------------
   Pointer events only, so mouse, touch, and stylus all take the same path.
   We listen on the window rather than the canvas: in analog mode the knobs
   keep working when the pointer wanders off the screen, so the target is just
   clamped to the edges instead of being lost. */
function onPointerMove(event) {
  const rect = screenEl.getBoundingClientRect();
  state.target.x = clamp(event.clientX - rect.left, 0, view.w);
  state.target.y = clamp(event.clientY - rect.top,  0, view.h);
}

function onPointerDown(event) {
  if (state.mode !== 'free') return;
  onPointerMove(event);

  // Put the stylus exactly under the pointer before the first frame, so
  // clicking somewhere new does not drag a line across from the last spot.
  state.stylus.x = state.target.x;
  state.stylus.y = state.target.y;
  state.drawing = true;
}

function onPointerUp() {
  state.drawing = false;
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/* --- Mode ---------------------------------------------------------------- */
function setMode(next) {
  state.mode = next;
  state.drawing = false;

  // In analog mode the stylus is already down, so it should not be lagging a
  // stale target when we switch back into it.
  if (next === 'analog') {
    state.target.x = state.stylus.x;
    state.target.y = state.stylus.y;
  }

  modeButton.textContent = next === 'analog' ? 'Mode: Analog' : 'Mode: Free';
  canvas.style.cursor = next === 'analog' ? 'crosshair' : 'cell';
}

function onKeyDown(event) {
  if (event.key === 'f' || event.key === 'F') {
    event.preventDefault();
    setMode(state.mode === 'analog' ? 'free' : 'analog');
  }
  // Thickness, erase, and save keys are handled on their own branches.
}

/* --- TODO: feature branches ---------------------------------------------
   Each of these is specified in the README and owned by a teammate. They are
   intentionally not implemented here — one feature branch and PR each.

   TODO(thickness): ArrowUp/ArrowDown adjust state.thickness within 1..40.
     Hold to accelerate: on keydown start a repeat timer whose step grows with
     how long the key has been held, clear it on keyup. Write the value into
     #thicknessValue and draw a filled dot of that diameter at the stylus so
     the size is visible before you commit to a stroke. The dot has to be
     cleared and repainted every frame, so it cannot live in state.segments —
     put it on a second overlay canvas above #board.

   TODO(erase): Space, E, the Shake button, and a shaken mouse all call the
     same erase(). Mouse shake = track the sign of pointer dx in onPointerMove
     and count direction reversals in a rolling ~600 ms window; 6+ triggers it.
     Erase adds a .shaking class to #toy for the frame animation (keyframes go
     in style.css) and fades the drawing out over ~600 ms — simplest is a CSS
     opacity transition on #board — then empties state.segments, clears the
     canvas, and restores the opacity. Drop the .pending class off the Shake
     button and the legend entries when it lands.

   TODO(save): S exports the drawing. canvas.toDataURL('image/png') into a
     temporary <a download="silvertrace.png">, click it, revoke. The canvas holds
     only the ink — the powder color comes from CSS — so composite onto an
     offscreen canvas filled with --screen first, or the PNG is transparent.

   TODO(knobs): the two knobs rotate as the stylus moves — left tracks x,
     right tracks y. Map the normalized stylus position to a rotation range
     (roughly -140deg..140deg) and set transform: rotate() on the inner <i>
     tick mark of knobLeft and knobRight, at the marker left in tick().
   ------------------------------------------------------------------------ */

/* --- Wiring -------------------------------------------------------------- */
window.addEventListener('pointermove', onPointerMove, { passive: true });
window.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);
window.addEventListener('keydown', onKeyDown);

modeButton.addEventListener('click', () => {
  setMode(state.mode === 'analog' ? 'free' : 'analog');
  modeButton.blur();   // so a later Space/Enter does not re-trigger the button
});

// ResizeObserver rather than window.onresize: the screen box also changes when
// the bezel padding changes at a breakpoint, which a window resize event does
// not necessarily describe.
new ResizeObserver(fitCanvas).observe(screenEl);

hudValue.textContent = state.thickness;
fitCanvas();
setMode(state.mode);
requestAnimationFrame(tick);
