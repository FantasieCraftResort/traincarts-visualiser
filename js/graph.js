/* ============================================
   TrainCarts Visualiser — Row 1: timeline graph
   Draws every visible property's eased curve
   plus its strict keyframe points, on an SVG
   time/value grid.
   ============================================ */

(function () {
  const WIDTH = 900;
  const HEIGHT = 320;
  const PAD = { top: 16, right: 16, bottom: 32, left: 40 };

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const propertyColors = {
    x: "#4fd1c5",
    y: "#f2c94c",
    z: "#eb5757",
    yaw: "#9b51e0",
    pitch: "#56ccf2",
    roll: "#f2994a",
  };

  function svgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const key in attrs) el.setAttribute(key, attrs[key]);
    return el;
  }

  function getTimeRange() {
    let maxTime = 0;
    for (const key in TCV.state.properties) {
      const kfs = TCV.state.properties[key].keyframes;
      maxTime = Math.max(maxTime, kfs[kfs.length - 1].time);
    }
    return { min: 0, max: Math.max(maxTime, 1) };
  }

  function getValueRange() {
    let min = 0, max = 1;
    for (const key in TCV.state.properties) {
      TCV.state.properties[key].keyframes.forEach((kf) => {
        min = Math.min(min, kf.value);
        max = Math.max(max, kf.value);
      });
    }
    return { min, max };
  }

  function timeToX(t, range) {
    return PAD.left + ((t - range.min) / (range.max - range.min)) * plotW;
  }
  function valueToY(v, range) {
    return PAD.top + plotH - ((v - range.min) / (range.max - range.min)) * plotH;
  }

  function buildCurvePath(propertyKey, timeRange, valueRange) {
    const SAMPLES = 60;
    const points = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = timeRange.min + (timeRange.max - timeRange.min) * (i / SAMPLES);
      const v = TCV.valueAt(propertyKey, t);
      points.push(`${timeToX(t, timeRange).toFixed(2)},${valueToY(v, valueRange).toFixed(2)}`);
    }
    return "M " + points.join(" L ");
  }

  function renderGraph() {
    const container = document.getElementById("tcv-graph");
    if (!container) return;
    container.innerHTML = "";

    const svg = svgEl("svg", {
      viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
      class: "tcv-graph-svg",
    });

    const timeRange = getTimeRange();
    const valueRange = getValueRange();

    // Gridlines + time axis labels
    const gridSteps = 8;
    for (let i = 0; i <= gridSteps; i++) {
      const t = timeRange.min + (timeRange.max - timeRange.min) * (i / gridSteps);
      const x = timeToX(t, timeRange);
      svg.appendChild(
        svgEl("line", { x1: x, y1: PAD.top, x2: x, y2: PAD.top + plotH, class: "tcv-grid-line" })
      );
      const label = svgEl("text", { x, y: HEIGHT - 10, class: "tcv-axis-label", "text-anchor": "middle" });
      label.textContent = t.toFixed(1) + "s";
      svg.appendChild(label);
    }

    // Curves + points, one per visible property
    for (const key in TCV.state.properties) {
      if (!TCV.state.visibility[key]) continue;
      const color = propertyColors[key] || "#ffffff";

      const path = svgEl("path", { d: buildCurvePath(key, timeRange, valueRange), class: "tcv-curve" });
      path.style.stroke = color;
      svg.appendChild(path);

      TCV.state.properties[key].keyframes.forEach((kf) => {
        const circle = svgEl("circle", {
          cx: timeToX(kf.time, timeRange),
          cy: valueToY(kf.value, valueRange),
          r: 5,
          class: "tcv-point",
        });
        circle.style.stroke = color;
        svg.appendChild(circle);
      });
    }

    container.appendChild(svg);
  }

  // Expose so other rows (toggles, imports) can trigger a redraw later
  TCV.renderGraph = renderGraph;

  // Run immediately: this script tag is placed after #tcv-graph in the
  // HTML, so the element already exists by the time this line runs.
  // (Waiting for DOMContentLoaded is unreliable in WordPress, since some
  // themes/page-builders inject block content after that event fires.)
  renderGraph();
})();