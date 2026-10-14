/* ==========================================================================
   Before You Sell Anything Online — companion tools
   ==========================================================================
   Everything here runs in the visitor's browser. Nothing typed on the page is
   sent anywhere or stored between visits (the privacy page says so; keep it
   true — no localStorage, no analytics, no network calls).

   1. The five-models map: ranges from the book's comparison table, drawn as
      zones (never as points — they are ranges and working guidance). Picking
      a constraint lights the models chapter 9 maps it to.
   2. Change list: "checked N days ago", and a stale flag past ~3 months.
   3. Three questions: claim tester + print-the-card.
   4. Three lines: print with answers + a calendar reminder (.ics) for the
      judge-by date.
   The page works without this script: every tool has a static fallback.
   ========================================================================== */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";

  /* ---------------------------------------------------------------- data */
  // Working guidance from the book's "five models on one page" table.
  var MODELS = [
    { id: "drop", name: "Dropshipping", money: [100, 300], months: [3, 6], owner: "you",
      hard: "buying attention profitably",
      week: "Leave the store for later. Shortlist three products that would still leave $15 before advertising (chapter 2's budget for finding one customer), and get a sample of the strongest one in your hands." },
    { id: "digital", name: "Digital products", money: [0, 50], months: [2, 6], owner: "you",
      hard: "getting found at all",
      week: "Describe the product on a single page and put it in front of five people who really have the problem it solves. Their reaction to the price tells you more than their compliments." },
    { id: "pod", name: "Print on demand", money: [0, 50], months: [3, 9], owner: "the marketplace",
      hard: "thin margins per item",
      week: "Choose a smaller audience than feels comfortable and draw one original design for them. Put it on a single product, publish it, and buy one so you see what a customer gets." },
    { id: "market", name: "Marketplace selling", money: [50, 200], months: [2, 6], owner: "the marketplace",
      hard: "fees and rule changes",
      week: "Read the fee page first, then get one item listed — anything you could realistically sell. Going live once answers questions no tutorial gets to." },
    { id: "audience", name: "Audience first", money: [0, 0], months: [6, 18], owner: "you",
      hard: "doing it before it pays",
      week: "Already have people? Ask them what they would buy, and build that. Starting from zero? Write one honest piece on something you have actually done, and put a place to collect emails at the end." }
  ];
  // Chapter 9: your dominant constraint decides the model.
  var CONSTRAINTS = {
    money:  { label: "Money is short", picks: ["pod", "digital"], avoid: "drop",
              why: "Spend time, not cash: both of these reward hours you put in. Dropshipping is the trap here — the store is cheap to open, but selling it usually takes an ad budget." },
    time:   { label: "Time is short", picks: ["market"],
              why: "Your spare hours are what is in short supply, and free traffic swallows them. Let a marketplace bring the buyers; its fee is a fair price for the evenings you get back." },
    novice: { label: "I've never done it", picks: ["market", "digital"],
              why: "Aim for something live before the week is out: one marketplace listing, or a single-page digital product. That first live item is proof you started, not a paycheck." },
    people: { label: "I already have people", picks: ["audience"],
              why: "Attracting strangers is a large part of the work in the other models, and you have already done it. Your shortcut is to ask the people who listen what they would pay for." }
  };

  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  /* ------------------------------------------------------- 1. the map */
  function buildMap() {
    var host = document.getElementById("map-chart");
    if (!host) return;
    document.getElementById("map-live").hidden = false;   // must be visible before measuring its width
    // Drawn at the width it actually has, so 12–13px text stays 12–13px on a phone.
    var W = Math.round(Math.min(760, Math.max(320, (host.clientWidth || 760) - 10)));
    var narrow = W < 520, H = narrow ? 320 : 400, L = narrow ? 60 : 64, R = 18, T = 18, B = 54;
    var xMax = 18, yMax = 320;
    function x(m) { return L + (m / xMax) * (W - L - R); }
    function y(p) { return H - B - Math.sqrt(p / yMax) * (H - T - B); }   // sqrt: room for the $0–$50 models
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-labelledby": "map-title map-desc", class: "mapsvg" });
    svg.appendChild(el("title", { id: "map-title" }, "The five models by money to start and months to real money"));
    svg.appendChild(el("desc", { id: "map-desc" },
      "Each model is a shaded zone covering its range. Audience first starts at no cost but takes 6 to 18 months; " +
      "dropshipping needs $100 to $300 and takes 3 to 6 months; digital products and print on demand start under $50; " +
      "marketplace selling needs $50 to $200. Dashed outlines mark models where the marketplace owns the customer."));
    var g = el("g", { class: "grid" });
    (narrow ? [0, 6, 12, 18] : [0, 3, 6, 9, 12, 15, 18]).forEach(function (m) {
      g.appendChild(el("line", { x1: x(m), x2: x(m), y1: T, y2: H - B }));
      g.appendChild(el("text", { x: x(m), y: H - B + 18, "text-anchor": "middle" }, m + (m === 18 ? " mo" : "")));
    });
    (narrow ? [0, 50, 100, 300] : [0, 25, 50, 100, 200, 300]).forEach(function (p) {
      g.appendChild(el("line", { x1: L, x2: W - R, y1: y(p), y2: y(p) }));
      g.appendChild(el("text", { x: L - 8, y: y(p) + 4, "text-anchor": "end" }, "$" + p));
    });
    g.appendChild(el("text", { x: (L + W - R) / 2, y: H - 10, "text-anchor": "middle", class: "axis" },
      "Months until it pays properly →"));
    var yl = el("text", { x: 13, y: (T + H - B) / 2, "text-anchor": "middle", class: "axis",
      transform: "rotate(-90 13 " + (T + H - B) / 2 + ")" }, "Money to start →");
    g.appendChild(yl);
    svg.appendChild(g);

    var zones = el("g", {});
    // [x months, y $, anchor] — each label sits inside its own zone, in a part no other zone covers
    var narrowPos = { drop: [6.4, 250], market: [6.4, 150], digital: [9.5, 38], pod: [9.5, 14] };
    var labelPos = { drop: [3.25, 262, "start"], digital: [2.15, 36, "start"], pod: [8.85, 6, "end"],
                     market: [2.15, 182, "start"], audience: [12, 0, "middle"] };
    MODELS.forEach(function (mo) {
      var y0 = y(mo.money[1]), y1 = y(mo.money[0]);
      if (y1 - y0 < 14) { y0 -= 7; y1 += 7; }     // a single value ($0) still needs a visible band
      var r = el("rect", { x: x(mo.months[0]), y: y0, width: x(mo.months[1]) - x(mo.months[0]),
        height: y1 - y0, rx: 6, class: "zone " + (mo.owner === "you" ? "own" : "rent"),
        "data-id": mo.id, tabindex: "0", role: "button",
        "aria-label": mo.name + ": " + "$" + mo.money[0] + (mo.money[1] !== mo.money[0] ? "–$" + mo.money[1] : "") +
          " to start, " + mo.months[0] + "–" + mo.months[1] + " months to real money; hardest part: " + mo.hard +
          "; " + (mo.owner === "you" ? "you own the customer" : "the marketplace owns the customer") });
      zones.appendChild(r);
      var lp = labelPos[mo.id];
      if (narrow && narrowPos[mo.id]) {
        // Phone: the label sits to the right of the zone, level with a part of it, with a leader line.
        var np = narrowPos[mo.id], ly = y(np[1]);
        zones.appendChild(el("line", { x1: x(mo.months[1]), x2: x(np[0]) - 3, y1: ly, y2: ly,
          class: "leader", "data-id": mo.id }));
        zones.appendChild(el("text", { x: x(np[0]), y: ly + 4, "text-anchor": "start",
          class: "zlabel", "data-id": mo.id }, mo.name));
        return;
      }
      zones.appendChild(el("text", { x: x(lp[0]), y: y(lp[1]) + (mo.id === "audience" ? -12 : 4), "text-anchor": lp[2],
        class: "zlabel", "data-id": mo.id }, mo.name));
    });
    svg.appendChild(zones);
    host.appendChild(svg);

    var info = document.getElementById("map-info");
    function show(id) {
      var mo = MODELS.filter(function (m) { return m.id === id; })[0];
      if (!mo || !info) return;
      info.innerHTML = "";
      var h = document.createElement("h3"); h.textContent = mo.name; info.appendChild(h);
      var dl = document.createElement("dl");
      [["To start", "$" + mo.money[0] + (mo.money[1] !== mo.money[0] ? "–$" + mo.money[1] : "")],
       ["Until it pays properly", mo.months[0] + "–" + mo.months[1] + " months"],
       ["Hardest part", mo.hard],
       ["Who owns the customer", mo.owner]].forEach(function (row) {
        var dt = document.createElement("dt"); dt.textContent = row[0];
        var dd = document.createElement("dd"); dd.textContent = row[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      info.appendChild(dl);
      var p = document.createElement("p"); p.className = "week";
      var b = document.createElement("b"); b.textContent = "Your first week: ";
      p.appendChild(b); p.appendChild(document.createTextNode(mo.week)); info.appendChild(p);
    }
    svg.addEventListener("click", function (e) {
      var id = e.target.getAttribute && e.target.getAttribute("data-id"); if (id) show(id);
    });
    svg.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.getAttribute("data-id")) {
        e.preventDefault(); show(e.target.getAttribute("data-id"));
      }
    });

    var verdict = document.getElementById("map-verdict");
    var buttons = document.querySelectorAll("[data-constraint]");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-constraint"), c = CONSTRAINTS[key];
        Array.prototype.forEach.call(buttons, function (b2) { b2.setAttribute("aria-pressed", b2 === btn ? "true" : "false"); });
        svg.classList.add("picked");
        Array.prototype.forEach.call(svg.querySelectorAll("[data-id]"), function (z) {
          var id = z.getAttribute("data-id");
          z.classList.toggle("lit", c.picks.indexOf(id) > -1);
          z.classList.toggle("avoid", c.avoid === id);
        });
        var names = c.picks.map(function (id) { return MODELS.filter(function (m) { return m.id === id; })[0].name; });
        verdict.innerHTML = "";
        var s = document.createElement("p"); s.className = "pick";
        s.textContent = (names.length > 1 ? names.slice(0, -1).join(", ") + " or " + names[names.length - 1] : names[0]) + ".";
        var w = document.createElement("p"); w.textContent = c.why;
        var n = document.createElement("p"); n.className = "next";
        n.textContent = "Tap a lit zone for its first week. Then write your three lines below — and stop reading about the others.";
        verdict.appendChild(s); verdict.appendChild(w); verdict.appendChild(n);
        show(c.picks[0]);
        var l1 = document.getElementById("l1"), l2 = document.getElementById("l2");
        if (l2 && !l2.value) l2.value = c.label.replace("I've never done it", "never having done it")
                                              .replace("I already have people", "already having an audience").toLowerCase();
        if (l1 && !l1.value) l1.placeholder = "for you, probably: " + names.join(" or ").toLowerCase();
      });
    });
    document.getElementById("map-fallback") && (document.getElementById("map-fallback").hidden = true);
    document.getElementById("map-live").hidden = false;
  }

  /* ------------------------------------------------ 2. change-list ages */
  function ageChanges() {
    var today = new Date();
    Array.prototype.forEach.call(document.querySelectorAll(".tracker li[data-checked]"), function (li) {
      var d = new Date(li.getAttribute("data-checked") + "T00:00:00");
      if (isNaN(d)) return;
      var days = Math.max(0, Math.floor((today - d) / 864e5));
      var tag = document.createElement("span");
      tag.className = "age" + (days > 92 ? " stale" : "");
      tag.textContent = days > 92
        ? "Over three months since we checked — open the source before you rely on it"
        : (days === 0 ? "Checked today" : "Checked " + days + " day" + (days === 1 ? "" : "s") + " ago");
      var meta = li.querySelector(".meta"); if (meta) meta.appendChild(tag);
    });
  }

  /* ---------------------------------------------- 3. claim tester, card */
  function claimTester() {
    var form = document.getElementById("claim");
    if (!form) return;
    var out = document.getElementById("claim-out");
    function update() {
      var answered = 0, passed = 0;
      ["q1", "q2", "q3"].forEach(function (q) {
        var v = form.querySelector("input[name=" + q + "]:checked");
        if (v) { answered++; if (v.value === "pass") passed++; }
      });
      out.className = "claim-out";
      if (answered < 3) { out.textContent = "Answer all three to get a verdict."; return; }
      if (passed === 3) { out.className += " ok"; out.textContent = "Checkable. You know who's paid, when it was true, and where the source is — now go and read that source yourself."; }
      else if (passed === 0) { out.className += " bad"; out.textContent = "Fails all three. Not necessarily wrong — but unverified. Treat it as a rumor until you've checked it yourself."; }
      else { out.className += " mid"; out.textContent = "Passes " + passed + " of 3. Find the missing answer before you spend money on it."; }
    }
    form.addEventListener("change", update);
    update();
  }

  // Print one tool alone: copy it into a print-only container and hide everything else
  // (display:none, not visibility — hidden content still takes pages and prints blanks).
  function printOnly(selector, card) {
    var src = document.querySelector(selector); if (!src) return;
    var area = document.createElement("div"); area.id = "print-area";
    if (card) area.className = "card-size";
    var copy = src.cloneNode(true);
    // a clone loses typed values — carry the worksheet answers across
    var ins = src.querySelectorAll("input"), outs = copy.querySelectorAll("input");
    Array.prototype.forEach.call(ins, function (inp, i) { outs[i].setAttribute("value", inp.value); });
    Array.prototype.forEach.call(copy.querySelectorAll("[id]"), function (e) { e.removeAttribute("id"); });
    copy.removeAttribute("id");
    area.appendChild(copy); document.body.appendChild(area);
    document.body.classList.add("printing");
    var cleaned = false;
    function done() {
      if (cleaned) return; cleaned = true;
      document.body.classList.remove("printing"); area.remove();
      window.removeEventListener("afterprint", done);
    }
    window.addEventListener("afterprint", done);
    window.print();
    setTimeout(done, 2000);
  }

  /* --------------------------------------------- 4. three lines: ics */
  function threeLines() {
    var pc = document.getElementById("print-card");
    if (pc) pc.addEventListener("click", function () { printOnly("#qcard", true); });
    var pm = document.getElementById("print-map");
    if (pm) pm.addEventListener("click", function () { printOnly("#one-page"); });
    var pl = document.getElementById("print-lines");
    if (pl) pl.addEventListener("click", function () { printOnly("#decision .card"); });
    var ics = document.getElementById("ics");
    if (!ics) return;
    ics.addEventListener("click", function () {
      var date = document.getElementById("l3date").value;
      var msg = document.getElementById("ics-msg");
      if (!date) { msg.textContent = "Pick a date first — the line only works with a real one."; return; }
      var model = (document.getElementById("l1").value || "my model").replace(/[\r\n,;\\]/g, " ");
      var measure = (document.getElementById("l3").value || "the measure I set").replace(/[\r\n,;\\]/g, " ");
      var d = date.replace(/-/g, ""), next = new Date(date + "T00:00:00");
      next.setDate(next.getDate() + 1);
      // local calendar date, not toISOString(): in BST, local midnight is the previous day in UTC
      var d2 = next.getFullYear() + String(next.getMonth() + 1).padStart(2, "0") + String(next.getDate()).padStart(2, "0");
      var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
      var body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ePORTS//three lines//EN", "BEGIN:VEVENT",
        "UID:" + stamp + "-threelines@eports.global", "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + d, "DTEND;VALUE=DATE:" + d2,
        "SUMMARY:Is " + model + " working?",
        "DESCRIPTION:Judge it by: " + measure + ". Slow means small numbers moving the right way - continue. Wrong means nothing moving - change one thing\\, not the model.",
        "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
      a.download = "three-lines-check-date.ics";
      document.body.appendChild(a); a.click(); a.remove();
      msg.textContent = "Saved — open the file to add it to your calendar.";
    });
  }

  function init() {
    document.documentElement.classList.add("js");
    try { buildMap(); } catch (e) { /* static fallback stays visible */ }
    ageChanges(); claimTester(); threeLines();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
