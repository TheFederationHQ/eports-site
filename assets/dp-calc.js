/* ==========================================================================
   ePORTS — Digital Products calculator engine
   ==========================================================================
   The ONE JavaScript implementation of the tool formulas, shared by every
   /tools/ calculator page AND tested from Node against the same fixtures the
   spreadsheets use (docs/RESOURCES_FORMULA_SPEC-digital-products.md). Because
   the spreadsheet XLSX and this file both derive from that spec and pass the
   same fixtures, a live calculator can never disagree with its download.

   Vanilla JS, zero dependencies. Works as a <script> in the browser (globals
   on window.DPCalc) and as a CommonJS module in Node (module.exports).
   ========================================================================== */
(function (root) {
  "use strict";

  var money = function (x) {
    return (x === "" || x === null || !isFinite(x)) ? "—"
      : (Number(x) < 0 ? "−" : "") + "£" + Math.abs(Number(x)).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  var pct = function (x) {
    return (x === "" || x === null || !isFinite(x)) ? "—"
      : (Number(x) * 100).toFixed(1) + "%";
  };

  var fin = function (x) { return typeof x === "number" && isFinite(x); };

  /* B4 — pricing sum. c=0 blanks ONLY visitors; kept + sales still compute. */
  function pricing(P, f, T, c) {
    if (!fin(P) || !fin(f) || P < 0 || f < 0) return { K: "—", N: "—", V: "—", invalid: true };
    var K = P * (1 - f / 100);
    if (!(K > 0)) return { K: K, N: "—", V: "—", invalid: true };
    var N = (fin(T) && T >= 0) ? Math.ceil(T / K) : "—";
    var V = (N !== "—" && fin(c) && c > 0) ? Math.ceil(N / (c / 100)) : "—";
    return { K: K, N: N, V: V, invalid: false };
  }

  /* Fee — what you keep after platform + payment fees.
     fees = P*(f/100) + Fix ; keep = P - fees ; pct = keep/P (a fraction, so
     DPCalc.pct renders it). Guard P<=0 → "—". A missing/negative f or Fix is
     treated as 0. */
  function fee(P, f, Fix) {
    if (!fin(P) || P <= 0) return { fees: "—", keep: "—", pct: "—", invalid: true };
    f = (fin(f) && f >= 0) ? f : 0;
    Fix = (fin(Fix) && Fix >= 0) ? Fix : 0;
    var fees = P * (f / 100) + Fix;
    var keep = P - fees;
    return { fees: fees, keep: keep, pct: keep / P, invalid: false };
  }

  /* I4 — seven-number scorecard */
  function scorecard(Vi, O, R, Bu, Rb, Rf, f) {
    var aov = O > 0 ? R / O : "";
    var contrib = aov === "" ? "" : aov * (1 - f / 100);
    var conv = Vi > 0 ? O / Vi : "";
    return {
      visitors: Vi,
      conversion: conv,
      rpv: Vi > 0 ? R / Vi : "",
      aov: aov,
      repeat: Bu > 0 ? Rb / Bu : "",       /* buyers, not orders */
      refund: O > 0 ? Rf / O : "",
      contribution: contrib,
      contributionPerVisitor: (contrib === "" || conv === "") ? "" : contrib * conv
    };
  }

  /* A1 — cohort / lifetime value / payback.
     Payback is expressed in ORDERS (cumulative contribution >= CAC), because a
     precise months figure needs a cohort cadence the tool does not have; and it
     is capped by whether the customer buys enough over their life (LTV) to ever
     repay CAC. Matches the book's "recouped in the first order" and its
     cumulative-contribution definition. */
  function lifetime(AOV, f, L, CAC) {
    if (!fin(AOV) || !fin(f) || AOV < 0 || f < 0) return { contribution: "—", ltv: "—", payback: "—" };
    var contrib = AOV * (1 - f / 100);
    L = fin(L) ? L : 0; CAC = fin(CAC) ? CAC : 0;
    var ltv = contrib * L;
    var payback;
    if (!(contrib > 0)) payback = "no positive contribution";
    else if (contrib >= CAC) payback = "recouped in the first order";
    else if (ltv >= CAC) payback = "recouped after " + Math.ceil(CAC / contrib) + " orders";
    else payback = "does not pay back over their life";
    return { contribution: contrib, ltv: ltv, payback: payback };
  }

  /* A3 — CAC ceiling + scaling gate */
  function cacCeiling(AOV, f, k, cpv, c) {
    if (!fin(AOV) || !fin(f) || AOV < 0 || f < 0 || !fin(k) || k < 0)
      return { contribution: "—", breakeven: "—", ceiling: "—", cac: null, verdict: "—" };
    var contrib = AOV * (1 - f / 100);
    var breakeven = contrib;
    var ceiling = (k / 100) * contrib;
    var cac = c > 0 ? cpv / (c / 100) : null;
    var verdict;
    if (cac === null) verdict = "enter a conversion rate";
    else if (cac <= ceiling) verdict = "within safe ceiling";
    else if (cac <= breakeven) verdict = "past safe ceiling — burning the buffer";
    else verdict = "losing money on the first order";
    return { contribution: contrib, breakeven: breakeven, ceiling: ceiling, cac: cac, verdict: verdict };
  }

  var DPCalc = { pricing: pricing, fee: fee, scorecard: scorecard, lifetime: lifetime,
                 cacCeiling: cacCeiling, money: money, pct: pct };

  if (typeof module !== "undefined" && module.exports) module.exports = DPCalc;
  root.DPCalc = DPCalc;
})(typeof window !== "undefined" ? window : this);
