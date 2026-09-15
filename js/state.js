/* ============================================
   TrainCarts Visualiser — shared state & math
   Every row reads/writes this one object, so
   rows stay in sync without talking to each
   other directly.
   ============================================ */

const TCV = {}; // single global namespace, avoids polluting `window`

/**
 * One property's animation = an ordered list of keyframes.
 * Each keyframe (except the first) carries the easing curve
 * used to get there FROM the previous keyframe.
 *
 * easing: [x1, y1, x2, y2]  -> TrainCarts' 4 easing parameters
 *         (control points of a cubic bezier from (0,0) to (1,1))
 */
TCV.state = {
  properties: {
    x: {
      keyframes: [
        { time: 0, value: 0 },
        { time: 4, value: 3, easing: [0.12, 0, 0.39, 0] }, // sin_in
      ],
    },
    y: {
      keyframes: [
        { time: 0, value: 0 },
        { time: 2.5, value: 1.5, easing: [0.61, 1, 0.88, 1] }, // sin_out
      ],
    },
  },
  visibility: { x: true, y: true, z: false, yaw: false, pitch: false, roll: false },
};

/* ---------- Cubic bezier easing math ---------- */

/**
 * Evaluate a cubic bezier component at parameter u, given the two
 * interior control points' coordinate on that axis (start=0, end=1).
 */
function bezierComponent(u, c1, c2) {
  const mu = 1 - u;
  return 3 * mu * mu * u * c1 + 3 * mu * u * u * c2 + u * u * u;
}

function bezierComponentDerivative(u, c1, c2) {
  const mu = 1 - u;
  return 3 * mu * mu * c1 + 6 * mu * u * (c2 - c1) + 3 * u * u * (1 - c2);
}

/**
 * Given progress along TIME (x, 0..1) and the easing control points,
 * solve for the bezier parameter u, then return progress along VALUE (y).
 * This is the same problem browsers solve for CSS cubic-bezier() timing.
 */
TCV.solveEasingY = function (x, easing) {
  const [x1, y1, x2, y2] = easing;

  // Newton-Raphson, falls back to bisection if the derivative is ~0
  let u = x; // decent starting guess
  for (let i = 0; i < 8; i++) {
    const currentX = bezierComponent(u, x1, x2) - x;
    const derivative = bezierComponentDerivative(u, x1, x2);
    if (Math.abs(derivative) < 1e-6) break;
    u -= currentX / derivative;
    u = Math.min(1, Math.max(0, u));
  }
  return bezierComponent(u, y1, y2);
};

/** Value of a property at an arbitrary time, following its keyframes. */
TCV.valueAt = function (propertyKey, time) {
  const kfs = TCV.state.properties[propertyKey].keyframes;
  if (time <= kfs[0].time) return kfs[0].value;
  for (let i = 1; i < kfs.length; i++) {
    if (time <= kfs[i].time) {
      const prev = kfs[i - 1];
      const cur = kfs[i];
      const x = (time - prev.time) / (cur.time - prev.time);
      const progress = cur.easing ? TCV.solveEasingY(x, cur.easing) : x;
      return prev.value + (cur.value - prev.value) * progress;
    }
  }
  return kfs[kfs.length - 1].value;
};