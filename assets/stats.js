/* Visitor and click counting (Femi chose option A, 28 Oct 2026; panel GPT + Gemini + Grok).
   - Umami Cloud counts page views and the clicks out to Amazon, Etsy and the Payhip shop. No cookies, no
     fingerprinting; it only runs on eports.global (data-domains), never on previews.
   - Cloudflare Web Analytics is added by Cloudflare Pages itself, not here.
   - Outbound links are never rewritten or redirected, so Amazon Attribution tags reach Amazon untouched.
   - Anyone can switch counting off on /privacy/ ("umami.disabled" in this browser, Umami's own opt-out), and a
     Do Not Track or Global Privacy Control signal switches it off too. */
(function () {
  var ID = "b90dbacc-2eb3-4763-98f3-c54f574f764c";
  try { if (localStorage.getItem("umami.disabled")) return; } catch (e) {}
  // a browser's "Do Not Track" or Global Privacy Control signal also switches counting off
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;
  var s = document.createElement("script");
  s.defer = true;
  s.src = "https://cloud.umami.is/script.js";
  s.setAttribute("data-website-id", ID);
  s.setAttribute("data-domains", "eports.global,www.eports.global");
  document.head.appendChild(s);

  // which stores count as "a click towards a sale"
  var STORES = [[/(^|\.)amazon\.[a-z.]+$|(^|\.)amzn\.to$/, "amazon"], [/(^|\.)etsy\.com$/, "etsy"],
                [/^shop\.eports\.global$|(^|\.)payhip\.com$/, "payhip"]];
  function storeOf(host) {
    for (var i = 0; i < STORES.length; i++) if (STORES[i][0].test(host)) return STORES[i][1];
    return null;
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a || !a.hostname || a.hostname === location.hostname) return;
    var store = storeOf(a.hostname.toLowerCase());
    if (!store || !window.umami || typeof window.umami.track !== "function") return;
    try { window.umami.track("store-click", { store: store, from: location.pathname, to: a.hostname + a.pathname }); } catch (e) {}
  }, true);
})();
