/* ==========================================================================
   ePORTS — Print on Demand calculator engine
   ==========================================================================
   The ONE implementation of the POD Basics tool formulas, shared by the
   /tools/ calculator pages AND tested from Node against the same fixtures the
   spreadsheets use (docs/RESOURCES_MANIFEST-print-on-demand.md). Because the
   XLSX and this file both derive from the book's arithmetic and pass the same
   fixtures, a live calculator and its spreadsheet agree on every tested case.

   Vanilla JS, zero dependencies. Works as a <script> in the browser
   (window.POD) and as a CommonJS module in Node (module.exports).
   ========================================================================== */
(function (root) {
  "use strict";

  var fin = function (x) { return typeof x === "number" && isFinite(x); };
  var money = function (x) {
    return (x === "" || x === null || !isFinite(x)) ? "—"
      : (Number(x) < 0 ? "−" : "") + "£" + Math.abs(Number(x)).toLocaleString("en-GB",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  /* Round UP to the next whole penny. A price FLOOR must never display a value
     below the true minimum: ordinary 2dp rounding can shave a fraction of a
     penny off and show a price that misses the target contribution. Ceiling is
     the only safe rounding for an actionable minimum. */
  var ceilPenny = function (x) { return fin(x) ? Math.ceil(x * 100) / 100 : x; };
  /* A real negative among the inputs. Blank fields are fine (they default to 0);
     a NEGATIVE cost, fee or target is nonsense and must show "—", never a
     falsely inflated contribution. */
  var anyNeg = function () {
    for (var i = 0; i < arguments.length; i++)
      if (fin(arguments[i]) && arguments[i] < 0) return true;
    return false;
  };

  /* P1 — Contribution ("what reaches you"). The buyer pays the item price plus
     any shipping you charge them; the platform fee is taken on that whole
     total. A platform may also charge a small FIXED fee per sale (Etsy's
     listing fee, plus the fixed part of payment processing) — the same fixedFee
     that priceFloor() already accounts for, so the two tools cannot disagree.
     Book anchor: £22 item, £0 charged (absorbed), £9 base, £4.80 you pay, 10%
     fee, £0.50 buffer, £0 fixed -> £5.50 contribution (add a £0.16 listing fee
     and the same sale nets £5.34). */
  function contribution(price, shipCharged, base, shipYouPay, feePct, buffer,
                        fixedFee) {
    if (!fin(price) || price < 0 || !fin(feePct) || feePct < 0
        || anyNeg(shipCharged, base, shipYouPay, buffer, fixedFee))
      return { buyerTotal: "—", fee: "—", contribution: "—", invalid: true };
    shipCharged = fin(shipCharged) ? shipCharged : 0;
    base = fin(base) ? base : 0;
    shipYouPay = fin(shipYouPay) ? shipYouPay : 0;
    buffer = fin(buffer) ? buffer : 0;
    fixedFee = fin(fixedFee) ? fixedFee : 0;
    var buyerTotal = price + shipCharged;
    var fee = (feePct / 100) * buyerTotal;
    var c = buyerTotal - base - shipYouPay - buffer - fixedFee - fee;
    return { buyerTotal: buyerTotal, fee: fee, contribution: c, invalid: false };
  }

  /* P6 — Price floor. Solve for the smallest total a buyer must pay for the
     product to clear a target contribution, given the fee %. Book anchor: £9
     base, £4.80 ship, £0 fixed, £0.50 buffer, £4.50 target, 10% -> £20.89.
     minBuyerTotal is the exact (unrounded) value for round-trip checks;
     minBuyerTotalCeil is what a buyer must actually be charged — rounded UP to
     the next penny so the displayed price never sits below the floor. */
  function priceFloor(base, shipYouPay, fixedFee, buffer, target, feePct) {
    if (!fin(feePct) || feePct < 0 || feePct >= 100
        || anyNeg(base, shipYouPay, fixedFee, buffer, target))
      return { subtotal: "—", minBuyerTotal: "—", minBuyerTotalCeil: "—",
               invalid: true };
    base = fin(base) ? base : 0;
    shipYouPay = fin(shipYouPay) ? shipYouPay : 0;
    fixedFee = fin(fixedFee) ? fixedFee : 0;
    buffer = fin(buffer) ? buffer : 0;
    target = fin(target) ? target : 0;
    var subtotal = base + shipYouPay + fixedFee + buffer + target;
    var minBuyerTotal = subtotal / (1 - feePct / 100);
    return { subtotal: subtotal, minBuyerTotal: minBuyerTotal,
             minBuyerTotalCeil: ceilPenny(minBuyerTotal), invalid: false };
  }

  /* ---- INTERMEDIATE tools (book 2) ------------------------------------- */

  /* I7a — Order composition (the basket / cross-sell lever, contract §7.12).
     A single-item order pays the whole fixed fee; a MULTI-item order pays the
     per-ORDER part (fixed card processing) only ONCE, so per-unit fixed cost
     falls as the basket grows. `lines` is [{unit, qty}], where `unit` is the
     FULL single-item contribution (as contribution() returns it, INCLUDING the
     whole fixed fee). `perOrderFee` is the per-order portion saved on each extra
     item (Etsy UK ~£0.24 processing+VAT). Buying the items separately, every
     unit carries its own perOrderFee (already inside `unit`); dropped into ONE
     basket, only the first order pays it, so we add it back for the rest.
     Book anchor: tee £4.41 + mug £1.59 = £6.00 separate; one basket, £0.24
     processing saved once -> £6.24 (a £0.24 lift, from basket size alone).
     A design's `unit` MAY be negative (a real loss) — that is a valid answer,
     not an error; only a negative qty or perOrderFee is nonsense. */
  function orderContribution(lines, perOrderFee) {
    if (!Array.isArray(lines) || anyNeg(perOrderFee)) return { invalid: true };
    perOrderFee = fin(perOrderFee) ? perOrderFee : 0;
    var items = 0, separate = 0;
    for (var i = 0; i < lines.length; i++) {
      var u = lines[i] && lines[i].unit, q = lines[i] && lines[i].qty;
      q = fin(q) ? q : 0;
      if (!fin(u) || q < 0) return { invalid: true };
      items += q; separate += u * q;
    }
    var saved = perOrderFee * Math.max(0, items - 1);
    return { items: items, separate: separate, saved: saved,
             together: separate + saved, invalid: false };
  }

  /* I7b — Coupon margin check (the ch10 guard). A flat % coupon comes off the
     PRICE the buyer pays — but the platform's percentage fee is charged on that
     LOWER price too, so the fee falls with it. The hit to contribution is the
     discount MINUS the fee you no longer pay on it: discount x (1 - fee%).
     (Your base, shipping, buffer and fixed fee don't move.) On a thin design a
     modest coupon can still gut the margin. Book anchor: a 10% coupon on the £16
     mug is £1.60 off, but ~13% of that (£0.21) is fee you save, so contribution
     falls by ~£1.39 — from £1.59 to about £0.20 (not a loss, but almost nothing
     left); the same 10% off the £38 hoodie leaves ~£5.92, comfortable. A deeper
     coupon on the mug DOES turn negative — which is why a blanket coupon needs a
     minimum-basket floor. */
  function couponImpact(price, contribution, pctOff, feePct) {
    if (!fin(price) || price < 0 || !fin(contribution) || !fin(pctOff)
        || pctOff < 0 || pctOff >= 100 || !fin(feePct) || feePct < 0
        || feePct >= 100) return { invalid: true };
    var discount = (pctOff / 100) * price;
    var feeSaved = (feePct / 100) * discount;
    var drop = discount - feeSaved;         // net cut to contribution
    var after = contribution - drop;
    return { discount: discount, feeSaved: feeSaved, drop: drop, after: after,
             losesMoney: after < 0, invalid: false };
  }

  /* I7c — The funnel read (ch7). Per LISTING, Etsy Stats give views, favourites
     and orders — engagement signals, NOT a strict staircase, and DIFFERENT from
     the shop-level conversion Etsy also reports (orders / VISITS). Given a fair
     window, name the LIKELIEST place to look, never a proven verdict. Tiny
     samples prove nothing (evidence discipline), so under a few hundred views
     the honest read is "not enough data — a discovery question." Thresholds are
     illustrative starting points, not rules. Book scenarios: 600/45/12 working;
     600/2/0 listing not landing; 40/3/0 discovery gap; 300/12/0 ambiguous
     (favourites, no orders -> friction at the till, investigate). */
  function funnel(views, faves, orders, minViews) {
    if (anyNeg(views, faves, orders) || !fin(views)) return { invalid: true };
    faves = fin(faves) ? faves : 0;
    orders = fin(orders) ? orders : 0;
    minViews = fin(minViews) && minViews > 0 ? minViews : 200;
    var favRate = views > 0 ? faves / views : null;      // engagement
    var convRate = views > 0 ? orders / views : null;    // view->order (listing)
    var enoughData = views >= minViews;
    var code, diagnosis;
    if (!enoughData) {
      code = "discovery";
      diagnosis = "Too few views for a verdict — this is a DISCOVERY question "
        + "(get it seen), not a judgement on the design. Fix findability, then "
        + "look again.";
    } else if (orders > 0) {
      code = "working";
      diagnosis = "It is selling — leave it alone. Read again next window.";
    } else if (favRate < 0.015) {
      code = "listing";
      diagnosis = "Real traffic, almost no favourites — the LISTING isn't "
        + "landing. First suspects: the design/offer, the main photo, the "
        + "title, the price.";
    } else {
      code = "friction";
      diagnosis = "Favourites but no orders — likely FRICTION at the till "
        + "(price, shipping, thin reviews, delivery time). Investigate; it is "
        + "not yet a verdict.";
    }
    return { favRate: favRate, convRate: convRate, enoughData: enoughData,
             code: code, diagnosis: diagnosis, invalid: false };
  }

  /* ---- ADVANCED tools (book 3) ----------------------------------------- */

  /* A2 — Fully-burdened (loaded) contribution (ch2). Start from the UNIT
     contribution contribution() returns (product costs + platform fees out),
     then take the four business burdens DOWN to the design: ads, returns beyond
     the buffer, overhead share, and an honest cost for the owner's own time.
     `loaded` counts ads (post-acquisition — for ranking what a design earns);
     `loadedPreAd` leaves ads OUT (the pot you have to spend winning a buyer —
     the ONLY figure a CAC is ever judged against). Book anchors: hoodie
     9.23 -ads2.40 -ret0.50 -ovh0.67 -time3.00 -> 2.66 loaded, 5.06 pre-ad;
     ad-tee 4.41,3.00,0.40,0.50,0.50 -> 0.01 loaded, 3.01 pre-ad; premium
     27.83,0,1.00,0.67,3.33 -> 22.83 (ads £0, organic). A loaded figure MAY be
     negative — a real loss, a valid answer; only a negative burden is nonsense. */
  function loadedContribution(unit, ads, returns_, overhead, time) {
    if (!fin(unit) || anyNeg(ads, returns_, overhead, time))
      return { loaded: "—", loadedPreAd: "—", invalid: true };
    ads = fin(ads) ? ads : 0; returns_ = fin(returns_) ? returns_ : 0;
    overhead = fin(overhead) ? overhead : 0; time = fin(time) ? time : 0;
    var preAd = unit - returns_ - overhead - time;
    return { loaded: preAd - ads, loadedPreAd: preAd, invalid: false };
  }

  /* A6a — CAC ceiling (ch6). The most you may pay to win a buyer and still keep
     the profit you require: ceiling = loaded-pre-ad contribution - required
     profit. Judge CAC against loaded PRE-AD contribution, NEVER revenue, and
     count the ad once. Works on a single sale (strict) or a proven cohort
     (generous). A ceiling <= 0 is a real answer: the product cannot be won by
     paid acquisition at that profit requirement. Book: premium 22.83 - 12.00 ->
     10.83; tee 3.01 - 1.50 -> 1.51 (no real channel hits £1.50 cold). */
  function cacCeiling(preAdContribution, requiredProfit) {
    if (!fin(preAdContribution) || anyNeg(requiredProfit))
      return { maxCac: "—", advertisable: null, invalid: true };
    requiredProfit = fin(requiredProfit) ? requiredProfit : 0;
    var maxCac = preAdContribution - requiredProfit;
    return { maxCac: maxCac, advertisable: maxCac > 0, invalid: false };
  }

  /* A6b — Break-even ROAS (ch6). Platforms report ROAS as revenue / ad spend and
     cheer a "3x". Convert it to YOUR product: you break even on the first sale
     when the ad cost equals the loaded pre-ad contribution, so break-even ROAS =
     revenue / pre-ad. Anything the dashboard shows below this is a loss. Book:
     premium 68 / 22.83 -> ~3.0x; tee 22 / 3.01 -> ~7.3x (so a "3x" on the tee is
     a bleed). If pre-ad <= 0 the sale loses money at ANY ROAS -> Infinity. */
  function roasBreakeven(revenue, preAdContribution) {
    if (!fin(revenue) || revenue <= 0 || !fin(preAdContribution))
      return { breakevenRoas: "—", invalid: true };
    var roas = preAdContribution <= 0 ? Infinity : revenue / preAdContribution;
    return { breakevenRoas: roas, invalid: false };
  }

  var pct = function (x) {
    return (x === null || !isFinite(x)) ? "—"
      : (Number(x) * 100).toLocaleString("en-GB",
          { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  };

  var POD = { contribution: contribution, priceFloor: priceFloor,
              orderContribution: orderContribution, couponImpact: couponImpact,
              funnel: funnel, loadedContribution: loadedContribution,
              cacCeiling: cacCeiling, roasBreakeven: roasBreakeven,
              money: money, pct: pct, ceilPenny: ceilPenny };
  if (typeof module !== "undefined" && module.exports) module.exports = POD;
  root.POD = POD;
})(typeof window !== "undefined" ? window : this);
