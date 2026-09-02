/* =========================================================================
   Powder — skeleton.

   Step 1 of the build: the shape of the program only. State, DOM handles,
   and empty function bodies with a note about what each one will do, so the
   "build" commit is a readable diff of behavior instead of a wall of new
   code. Nothing draws yet.
   ========================================================================= */
'use strict';

/* --- DOM handles --------------------------------------------------------- */
const toy            = document.getElementById('toy');
const screenEl       = document.getElementById('screen');
const canvas         = document.getElementById('board');
const ctx            = canvas.getContext('2d');
const hudValue       = document.getElementById('thicknessValue');
const modeButton     = document.getElementById('modeButton');
const shakeButton    = document.getElementById('shakeButton');
const knobLeft       = document.getElementById('knobLeft');
const knobRight      = document.getElementById('knobRight');

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

  // Every segment ever drawn, so a resize can rebuild the picture instead of
  // losing it. Coordinates are normalized 0..1 against the screen size.
  segments: [],
};

/* --- Sizing --------------------------------------------------------------
   Match the canvas backing store to the screen element and the device pixel
   ratio, then repaint from state.segments. */
function fitCanvas() {
  // build step
}

/* --- Painting ------------------------------------------------------------ */
function redrawAll() {
  // build step
}

/* --- The loop ------------------------------------------------------------
   requestAnimationFrame: ease the stylus toward the target, and in analog
   mode lay down a segment for the distance it moved this frame. */
function tick() {
  // build step
  requestAnimationFrame(tick);
}

/* --- Input --------------------------------------------------------------- */
function onPointerMove(event) {
  // build step
}

function setMode(next) {
  // build step
}

/* --- TODO: feature branches ---------------------------------------------
   Each of these is specified in the README and owned by a teammate. They are
   intentionally not implemented here — one feature branch and PR each.

   TODO(thickness): ArrowUp/ArrowDown adjust state.thickness within 1..40.
     Hold to accelerate: on keydown start a repeat timer whose step grows with
     how long the key has been held, clear it on keyup. Write the value into
     #thicknessValue and draw a filled dot of that diameter at the stylus so
     the size is visible before you commit to a stroke.

   TODO(erase): Space, E, the Shake button, and a shaken mouse all call the
     same erase(). Mouse shake = track the sign of pointer dx and count
     direction reversals in a rolling ~600 ms window; 6+ triggers it. Erase
     adds a shake class to #toy for the frame animation and fades the drawing
     out over ~600 ms (animate ctx.globalAlpha across a rAF ramp, or fade a
     CSS opacity on the canvas), then empties state.segments and clears.

   TODO(save): S exports the drawing. canvas.toDataURL('image/png') into a
     temporary <a download="powder.png">, click it, revoke. Composite the
     screen color underneath first so the PNG is not transparent.

   TODO(knobs): the two knobs rotate as the stylus moves — left tracks x,
     right tracks y. Map the normalized stylus position to a rotation range
     (roughly -140deg..140deg) and set transform: rotate() on each knob's
     inner tick mark each frame in tick().
   ------------------------------------------------------------------------ */

/* --- Wiring -------------------------------------------------------------- */
// build step
