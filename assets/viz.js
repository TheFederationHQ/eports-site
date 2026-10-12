/* ePORTS — live tools, every lane: tiny SVG chart kit (no libraries).
   Currency: RVIZ.currency("£", "en-GB") once per page; default $ / en-US.
   Palette = the dataviz reference instance, validated light (run 2026-10-11):
   categorical slots 1-4 adjacent CVD ΔE ≥ 9.1, normal ≥ 22.9; slots 3-4 sit
   under 3:1 on white → every chart ships direct labels AND a table view.
   Slot 5 magenta added for five-part stacks; validated ONLY in the order
   keep(s1) · fee(s2) · shipping(s3) · cost(s4) · s5 (s5 beside s2 fails normal vision).
   Ordinal age ramp 250/400/550/700 validated (monotone, light end 2.11:1).
   Text always wears ink tokens, never the series colour. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var C = {
    s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", s4: "#eda100", s5: "#e87ba4",
    ramp: ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"],
    ink: "#1A1A1A", mut: "#5A5A5A", rule: "#DCD9D2", grid: "#ECEAE4", surface: "#ffffff"
  };

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var a = { x: x, y: y, fill: C.ink, "font-size": 12, "font-family": "Inter, system-ui, sans-serif" };
    for (var k in attrs || {}) a[k] = attrs[k];
    var t = el("text", a, parent);
    t.textContent = s;
    return t;
  }
  var CUR = { sym: "$", loc: "en-US" };
  function currency(sym, loc) { CUR = { sym: sym, loc: loc || CUR.loc }; }
  function money(x) {
    if (!isFinite(x)) return "—";
    var neg = x < 0;
    var s = CUR.sym + Math.abs(x).toLocaleString(CUR.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return neg ? "−" + s : s;
  }
  function money0(x) {
    if (!isFinite(x)) return "—";
    var neg = x < 0;
    var s = CUR.sym + Math.round(Math.abs(x)).toLocaleString(CUR.loc);
    return neg ? "−" + s : s;
  }
  // axis ticks: compact once values reach five figures (£12k, £1.5m), so they fit the margin
  function compact(x) {
    var a = Math.abs(x), neg = x < 0 ? "−" : "";
    if (a >= 1e6) return neg + CUR.sym + (a / 1e6).toFixed(a % 1e6 ? 1 : 0) + "m";
    if (a >= 1e4) return neg + CUR.sym + Math.round(a / 1e3) + "k";
    return money0(x);
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function width(node) { return Math.max(260, Math.min(720, node.clientWidth || 600)); }

  /* ---- a single shared tooltip ---- */
  var tip;
  function showTip(html, x, y) {
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "viz-tip";
      tip.setAttribute("role", "status");
      document.body.appendChild(tip);
    }
    tip.innerHTML = html;
    tip.style.display = "block";
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
    var top = Math.max(8, y - h - 12);
    tip.style.left = (left + window.scrollX) + "px";
    tip.style.top = (top + window.scrollY) + "px";
  }
  function hideTip() { if (tip) tip.style.display = "none"; }

  function legend(node, items) {
    var lg = document.createElement("div");
    lg.className = "viz-legend";
    items.forEach(function (it) {
      var s = document.createElement("span");
      var sw = document.createElement("i");
      sw.style.background = it.dash ? "transparent" : it.color;
      if (it.dash) sw.style.borderTop = "2px dashed " + it.color;
      s.appendChild(sw);
      s.appendChild(document.createTextNode(it.name));
      lg.appendChild(s);
    });
    node.appendChild(lg);
  }

  function table(node, caption, head, rows) {
    var d = document.createElement("details");
    d.className = "viz-table";
    var sm = document.createElement("summary");
    sm.textContent = "Show the numbers as a table";
    d.appendChild(sm);
    var t = document.createElement("table");
    var cap = document.createElement("caption");
    cap.textContent = caption;
    t.appendChild(cap);
    var tr = document.createElement("tr");
    head.forEach(function (h) { var th = document.createElement("th"); th.textContent = h; tr.appendChild(th); });
    t.appendChild(tr);
    rows.forEach(function (r) {
      var tr2 = document.createElement("tr");
      r.forEach(function (c) { var td = document.createElement("td"); td.textContent = c; tr2.appendChild(td); });
      t.appendChild(tr2);
    });
    d.appendChild(t);
    node.appendChild(d);
  }

  /* ---- horizontal stacked bars: rows = [{label, segs:[{name,value,color}], total, totalLabel}] ---- */
  function hstack(node, rows, opt) {
    clear(node);
    var longest = Math.max.apply(null, rows.map(function (r) { return String(r.totalLabel || "").length; }).concat([0]));
    var W = width(node), labW = Math.min(150, W * 0.3), padR = Math.max(70, longest * 7.4 + 14), rowH = 34,
        gap = rows.some(function (r) { return r.mark && r.mark.label; }) ? 30 : 14;
    var H = rows.length * (rowH + gap) + 10;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": opt.title });
    node.appendChild(svg);
    var widest = 0;
    rows.forEach(function (r) { var m = txt(svg, 0, -50, r.label, { "font-weight": 700 }); widest = Math.max(widest, m.getBBox().width); svg.removeChild(m); });
    labW = Math.min(W * 0.45, Math.max(labW * 0.5, widest + 12));
    var max = 0;
    rows.forEach(function (r) { var s = 0; r.segs.forEach(function (g) { s += Math.max(0, g.value); }); max = Math.max(max, s, r.mark ? r.mark.value : 0); });
    var sx = (W - labW - padR) / (max || 1);
    rows.forEach(function (r, i) {
      var y = 6 + i * (rowH + gap), x = labW;
      txt(svg, labW - 8, y + rowH / 2 + 4, r.label, { "text-anchor": "end", "font-weight": 700 });
      r.segs.forEach(function (g, j) {
        var w = Math.max(0, g.value) * sx;
        if (w <= 0) return;
        var last = j === r.segs.length - 1 || r.segs.slice(j + 1).every(function (q) { return q.value <= 0; });
        var rx = last ? 4 : 0;
        var rect = el("rect", { x: x, y: y, width: Math.max(1, w - 2), height: rowH, fill: g.color, rx: rx }, svg);
        rect.addEventListener("mousemove", function (e) {
          showTip("<b>" + r.label + "</b><br>" + g.name + ": " + (opt.fmt || money)(g.value), e.clientX, e.clientY);
        });
        rect.addEventListener("mouseleave", hideTip);
        if (w > 46 && r.segs.length > 1) txt(svg, x + 6, y + rowH / 2 + 4, (opt.fmt || money0)(g.value), { fill: j === 0 ? "#fff" : C.ink, "font-size": 11, "pointer-events": "none" });
        x += w;
      });
      txt(svg, x + 6, y + rowH / 2 + 4, r.totalLabel, { "font-weight": 700 });
      if (r.mark) {
        var mx = labW + r.mark.value * sx;
        el("line", { x1: mx, x2: mx, y1: y - 4, y2: y + rowH + 4, stroke: C.ink, "stroke-width": 2, "stroke-dasharray": "4 3" }, svg);
        if (r.mark.label) txt(svg, mx, y + rowH + 15, r.mark.label, { "text-anchor": "middle", "font-size": 11, fill: C.ink });
      }
    });
    legend(node, opt.legend);
  }

  /* ---- line chart (one y-axis): series=[{name,color,values,dash}], threshold={value,label} ---- */
  function lines(node, xs, series, opt) {
    clear(node);
    var W = width(node), H = opt.height || 240, L = 56, R = 14, T = 14, B = 30;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": opt.title });
    node.appendChild(svg);
    var all = [];
    series.forEach(function (s) { all = all.concat(s.values.filter(isFinite)); });
    if (opt.threshold) all.push(opt.threshold.value);
    var lo = Math.min.apply(null, all.concat([opt.zero ? 0 : Infinity])), hi = Math.max.apply(null, all);
    if (!isFinite(lo)) lo = 0;
    if (hi === lo) hi = lo + 1;
    var pad = (hi - lo) * 0.08; lo -= opt.zero ? 0 : pad; hi += pad;
    // round-number ticks: a step of 1, 2 or 5 × 10^k, about four intervals
    var raw = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), stp = mag;
    [1, 2, 5, 10].some(function (m) { stp = m * mag; return stp >= raw; });
    lo = Math.floor(lo / stp) * stp; hi = Math.ceil(hi / stp) * stp;
    var ticks = []; for (var tv = lo; tv <= hi + stp / 2; tv += stp) ticks.push(tv);
    var X = function (i) { return L + (W - L - R) * (xs.length === 1 ? 0.5 : i / (xs.length - 1)); };
    var Y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    ticks.forEach(function (v) {
      el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: Math.abs(v) < 1e-9 ? C.rule : C.grid, "stroke-width": 1 }, svg);
      var big = Math.max(Math.abs(lo), Math.abs(hi)) >= 1e4 && (!opt.yfmt || opt.yfmt === money0);
      txt(svg, L - 6, Y(v) + 4, big ? compact(v) : (opt.yfmt || money0)(v), { "text-anchor": "end", fill: C.mut, "font-size": 11 });
    });
    xs.forEach(function (x, i) {
      if (xs.length > 12 && i % 2) return;
      txt(svg, X(i), H - 10, x, { "text-anchor": "middle", fill: C.mut, "font-size": 11 });
    });
    if (opt.threshold) {
      el("line", { x1: L, x2: W - R, y1: Y(opt.threshold.value), y2: Y(opt.threshold.value),
        stroke: C.mut, "stroke-width": 1.5, "stroke-dasharray": "5 4" }, svg);
      var left = opt.threshold.side === "left";
      txt(svg, left ? L + 4 : W - R, Y(opt.threshold.value) + (opt.threshold.below ? 14 : -6), opt.threshold.label, { "text-anchor": left ? "start" : "end", fill: C.mut, "font-size": 11 });
    }
    var endYs = [];
    series.forEach(function (s) {
      var d = "";
      s.values.forEach(function (v, i) { if (isFinite(v)) d += (d ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); });
      el("path", { d: d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-dasharray": s.dash ? "6 4" : "",
        "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      if (s.dots !== false) s.values.forEach(function (v, i) {
        if (!isFinite(v)) return;
        el("circle", { cx: X(i), cy: Y(v), r: s.marker || 3.5, fill: s.color, stroke: C.surface, "stroke-width": 2 }, svg);
      });
      var lastI = s.values.length - 1;
      if (opt.endLabels && isFinite(s.values[lastI])) {
        var ey = Y(s.values[lastI]) - 9;
        endYs.forEach(function (p) { if (Math.abs(p - ey) < 14) ey = p + 14; });
        endYs.push(ey);
        txt(svg, X(lastI) - 4, ey, s.name, { "text-anchor": "end", "font-size": 11, "font-weight": 700 });
      }
    });
    if (opt.marker) {
      el("circle", { cx: X(opt.marker.i), cy: Y(opt.marker.v), r: 7, fill: opt.marker.color || C.s2, stroke: C.surface, "stroke-width": 2 }, svg);
      var mx = X(opt.marker.i), anc = mx > W - R - 90 ? "end" : mx < L + 90 ? "start" : "middle";
      txt(svg, anc === "end" ? mx + 6 : anc === "start" ? mx - 6 : mx, Y(opt.marker.v) - 12, opt.marker.label,
        { "text-anchor": anc, "font-weight": 700, "font-size": 12 });
    }
    // crosshair
    var cross = el("line", { y1: T, y2: H - B, stroke: C.mut, "stroke-width": 1, opacity: 0 }, svg);
    var hit = el("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" }, svg);
    hit.addEventListener("mousemove", function (e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width;
      var i = Math.round((px - L) / ((W - L - R) / Math.max(1, xs.length - 1)));
      i = Math.max(0, Math.min(xs.length - 1, i));
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("opacity", 0.5);
      var h = "<b>" + (opt.xname || "") + xs[i] + "</b>";
      series.forEach(function (s) { h += "<br>" + s.name + ": " + (opt.yfmt || money0)(s.values[i]); });
      showTip(h, e.clientX, e.clientY);
    });
    hit.addEventListener("mouseleave", function () { cross.setAttribute("opacity", 0); hideTip(); });
    if (opt.legend) legend(node, opt.legend);
  }

  /* ---- vertical bars with a ceiling line ---- */
  function bars(node, xs, values, opt) {
    clear(node);
    var W = width(node), H = opt.height || 180, L = 44, R = 14, T = 16, B = 30;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": opt.title });
    node.appendChild(svg);
    var hi = Math.max.apply(null, values.concat([opt.ceiling || 0])) * 1.12 || 1;
    var bw = (W - L - R) / xs.length;
    var Y = function (v) { return T + (H - T - B) * (1 - v / hi); };
    for (var g = 0; g <= 3; g++) {
      var v = hi * g / 3;
      el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: C.grid }, svg);
      txt(svg, L - 6, Y(v) + 4, v.toFixed(0), { "text-anchor": "end", fill: C.mut, "font-size": 11 });
    }
    values.forEach(function (v, i) {
      var over = opt.ceiling != null && v > opt.ceiling;
      var x = L + i * bw + bw * 0.18, w = bw * 0.64;
      var r = el("rect", { x: x, y: Y(v), width: w, height: Math.max(0, Y(0) - Y(v)), rx: 4,
        fill: over ? C.s2 : C.s1 }, svg);
      r.addEventListener("mousemove", function (e) {
        showTip("<b>" + (opt.xname || "") + xs[i] + "</b><br>" + v.toFixed(1) + " " + (opt.unit || "") + (over ? " — over the ceiling" : ""), e.clientX, e.clientY);
      });
      r.addEventListener("mouseleave", hideTip);
      txt(svg, x + w / 2, Y(v) - 4, v.toFixed(1), { "text-anchor": "middle", "font-size": 10, fill: C.ink });
      txt(svg, x + w / 2, H - 10, xs[i], { "text-anchor": "middle", "font-size": 11, fill: C.mut });
    });
    if (opt.ceiling != null) {
      el("line", { x1: L, x2: W - R, y1: Y(opt.ceiling), y2: Y(opt.ceiling), stroke: C.mut, "stroke-width": 1.5, "stroke-dasharray": "5 4" }, svg);
      if (opt.ceilingLabel) txt(svg, W - R, Y(opt.ceiling) - 6, opt.ceilingLabel, { "text-anchor": "end", "font-size": 11, fill: C.mut });
    }
    if (opt.legend) legend(node, opt.legend);
  }

  /* ---- dot strip: values on one axis, median + a second reference line ---- */
  function strip(node, values, opt) {
    clear(node);
    var W = width(node), H = 120, L = 20, R = 20;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": opt.title });
    node.appendChild(svg);
    var lo = Math.min.apply(null, values.concat(opt.lines.map(function (l) { return l.value; }))),
        hi = Math.max.apply(null, values.concat(opt.lines.map(function (l) { return l.value; })));
    var span = hi - lo || 10; lo -= span * 0.1; hi += span * 0.1;
    var X = function (v) { return L + (W - L - R) * (v - lo) / (hi - lo); };
    el("line", { x1: L, x2: W - R, y1: 70, y2: 70, stroke: C.rule }, svg);
    for (var g = 0; g <= 4; g++) {
      var v = lo + (hi - lo) * g / 4;
      txt(svg, X(v), 100, money0(v), { "text-anchor": "middle", fill: C.mut, "font-size": 11 });
    }
    opt.lines.forEach(function (l, k) {
      el("line", { x1: X(l.value), x2: X(l.value), y1: 34, y2: 82, stroke: l.color, "stroke-width": 2, "stroke-dasharray": l.dash ? "5 4" : "" }, svg);
      var lx = X(l.value), la = lx < L + 40 ? "start" : lx > W - R - 40 ? "end" : "middle";
      txt(svg, la === "start" ? lx - 4 : la === "end" ? lx + 4 : lx, k ? 30 : 13, l.label, { "text-anchor": la, "font-size": 11, "font-weight": 700 });
    });
    var sorted = values.slice().sort(function (a, b) { return a - b; }), seen = {};
    sorted.forEach(function (v) {
      var key = Math.round(X(v) / 9); seen[key] = (seen[key] || 0) + 1;
      var c = el("circle", { cx: X(v), cy: 70 - (seen[key] - 1) * 11, r: 5.5, fill: C.s1, stroke: C.surface, "stroke-width": 2 }, svg);
      c.addEventListener("mousemove", function (e) { showTip("Sold comp: " + money(v), e.clientX, e.clientY); });
      c.addEventListener("mouseleave", hideTip);
    });
    if (opt.legend) legend(node, opt.legend);
  }

  /* ---- a rotatable 3D shelf: bands=[{name,items,cost,color}] ---- */
  function shelf3d(node, bands, opt) {
    clear(node);
    var W = width(node), H = Math.round(W * 0.72);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": opt.title, tabindex: 0 });
    svg.style.touchAction = "none";
    node.appendChild(svg);
    var g = el("g", {}, svg);
    var state = { yaw: opt.yaw != null ? opt.yaw : -0.55, pitch: 0.42 };
    var SW = 10, SD = 3.2, LEVEL = 2.6, maxPer = 24;
    var avgMax = Math.max.apply(null, bands.map(function (b) { return b.items ? b.cost / b.items : 0; }).concat([1]));
    var cubes = [];
    // shelves: level 0 = bottom = oldest band (heaviest at the bottom)
    var order = bands.slice().reverse();
    order.forEach(function (b, lvl) {
      var y0 = lvl * LEVEL;
      cubes.push({ x: 0, y: y0 - 0.18, z: 0, w: SW, h: 0.18, d: SD, color: "#C9C4B8", shelf: true });
      var n = Math.min(b.items, maxPer);
      var avg = b.items ? b.cost / b.items : 0;
      var s = 0.45 + 0.55 * Math.sqrt(avg / avgMax);   // edge grows with average cost
      s = Math.min(s, 1.15);
      var perRow = Math.max(1, Math.floor((SW - 0.3) / (s + 0.08))), rowsMax = Math.max(1, Math.floor((SD - 0.2) / (s + 0.1)));
      for (var k = 0; k < n; k++) {
        var col = k % perRow, row = Math.floor(k / perRow) % rowsMax, stack = Math.floor(k / (perRow * rowsMax));
        cubes.push({ x: 0.15 + col * (s + 0.08), y: y0 + stack * s, z: 0.1 + row * (s + 0.1), w: s, h: s, d: s,
          color: b.color, band: b });
      }
      b._lvl = lvl;
    });
    // uprights
    [[0, 0], [SW - 0.2, 0], [0, SD - 0.2], [SW - 0.2, SD - 0.2]].forEach(function (p) {
      cubes.push({ x: p[0], y: -0.18, z: p[1], w: 0.2, h: order.length * LEVEL, d: 0.2, color: "#B8B2A4", shelf: true });
    });
    function shade(hex, f) {
      var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, gg = n >> 8 & 255, b = n & 255;
      r = Math.round(Math.min(255, r * f)); gg = Math.round(Math.min(255, gg * f)); b = Math.round(Math.min(255, b * f));
      return "rgb(" + r + "," + gg + "," + b + ")";
    }
    function draw() {
      while (g.firstChild) g.removeChild(g.firstChild);
      var cy = Math.cos(state.yaw), sy = Math.sin(state.yaw), cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
      var cx0 = SW / 2, cz0 = SD / 2, cyy = order.length * LEVEL / 2;
      var narrow = W < 460, ox = narrow ? W * 0.3 : W / 2;
      var scale = Math.min(W * (narrow ? 0.58 : 1) / 13, H / (order.length * LEVEL + 4));
      function P(x, y, z) {
        x -= cx0; z -= cz0; y -= cyy;
        var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        return [ox + x1 * scale, H / 2 - y2 * scale, z2];
      }
      var faces = [];
      cubes.forEach(function (c) {
        var v = [];
        [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]].forEach(function (q) {
          v.push(P(c.x + q[0] * c.w, c.y + q[1] * c.h, c.z + q[2] * c.d));
        });
        [[0,1,2,3,0.86],[5,4,7,6,0.86],[4,0,3,7,0.72],[1,5,6,2,0.72],[3,2,6,7,1.12],[4,5,1,0,0.6]].forEach(function (f) {
          var pts = [v[f[0]], v[f[1]], v[f[2]], v[f[3]]];
          var area = 0;
          for (var i = 0; i < 4; i++) { var a = pts[i], b = pts[(i + 1) % 4]; area += a[0] * b[1] - b[0] * a[1]; }
          if (area >= 0) return;   // back-facing
          var depth = (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4;
          if (c.shelf && c.h < 0.3) depth -= 2.5;   // planks under the boxes that sit on them
          faces.push({ pts: pts, depth: depth, fill: shade(c.color, f[4]), cube: c });
        });
      });
      faces.sort(function (a, b) { return a.depth - b.depth; });
      faces.forEach(function (f) {
        var p = el("polygon", { points: f.pts.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "),
          fill: f.fill, stroke: f.cube.shelf ? "#9C9586" : "rgba(255,255,255,.55)", "stroke-width": 0.8 }, g);
        if (f.cube.band) {
          p.addEventListener("mousemove", function (e) {
            var b = f.cube.band;
            showTip("<b>" + b.name + "</b><br>" + b.items + " items · " + money0(b.cost) + " at cost", e.clientX, e.clientY);
          });
          p.addEventListener("mouseleave", hideTip);
        }
      });
      // shelf labels (words, never colour alone) — in a fixed column right of the drawing, at each shelf's height
      var maxX = 0;
      faces.forEach(function (f) { f.pts.forEach(function (q) { if (q[0] > maxX) maxX = q[0]; }); });
      var small = W < 460, fs = small ? 10 : 12, lx = Math.min(maxX + 8, W - (small ? 112 : 170));
      order.forEach(function (b) {
        var ys = [P(0, b._lvl * LEVEL + 0.5, 0)[1], P(SW, b._lvl * LEVEL + 0.5, SD)[1], P(0, b._lvl * LEVEL + 0.5, SD)[1], P(SW, b._lvl * LEVEL + 0.5, 0)[1]];
        var y = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
        var bg = el("rect", { x: lx - 4, y: y - fs - 2, width: (small ? 110 : 168), height: fs * 2 + 8, rx: 3, fill: "rgba(255,255,255,.88)" }, g);
        txt(g, lx, y, b.name, { "font-size": fs, "font-weight": 700 });
        txt(g, lx, y + fs + 2, b.items + " items · " + money0(b.cost), { "font-size": fs, fill: C.mut });
      });
    }
    draw();
    var drag = null;
    svg.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener("pointermove", function (e) {
      if (!drag) return;
      state.yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
      state.pitch = Math.max(0.05, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * 0.006));
      draw();
    });
    svg.addEventListener("pointerup", function () { drag = null; });
    svg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { state.yaw -= 0.15; draw(); e.preventDefault(); }
      if (e.key === "ArrowRight") { state.yaw += 0.15; draw(); e.preventDefault(); }
      if (e.key === "ArrowUp") { state.pitch = Math.min(1.1, state.pitch + 0.08); draw(); e.preventDefault(); }
      if (e.key === "ArrowDown") { state.pitch = Math.max(0.05, state.pitch - 0.08); draw(); e.preventDefault(); }
    });
    return {
      rotate: function (yaw) { state.yaw = yaw; draw(); },
      state: state
    };
  }

  window.RVIZ = { C: C, currency: currency, money: money, money0: money0, hstack: hstack, lines: lines, bars: bars, strip: strip,
    shelf3d: shelf3d, table: table, legend: legend, hideTip: hideTip };
})();
