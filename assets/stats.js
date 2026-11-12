/* Visitor and click counting (Femi chose option A, 28 Oct 2026; panel GPT + Gemini + Grok).
   - Umami Cloud counts page views and the clicks out to Amazon, Etsy and the Payhip shop. No cookies, no
     fingerprinting; it only runs on eports.global (data-domains), never on previews.
   - Cloudflare Web Analytics is added by Cloudflare Pages itself, not here.
   - Outbound links are never rewritten or redirected, so Amazon Attribution tags reach Amazon untouched.
   - Anyone can switch counting off on /privacy/ ("umami.disabled" in this browser, Umami's own opt-out), and a
     Do Not Track or Global Privacy Control signal switches it off too. */
/* Google Analytics 4 in Consent Mode v2 (Femi: "Do it for me" on team-analytics-install, 30 Oct 2026; panel r1 in
   research/TRACKING-2026-10/ga4-consent/). Ad networks such as Mediavine read GA history when we apply.
   - Nothing loads until GA_ID is set (the GA4 web stream for eports.global).
   - Same switches as Umami: a "Do Not Track" or Global Privacy Control signal, or "Don't count my visits" on
     /privacy/, means Google Analytics never loads.
   - Visitors in the EEA, UK and Switzerland start with analytics storage DENIED (Google applies this by location)
     until they press "Allow" on the small banner; everyone else starts with it granted. Ad storage, ad user data
     and ad personalisation are always denied: there are no ads.
   - The banner shows only to browsers on a European time zone; a choice is remembered in this browser
     ("eports.analytics") and can be changed on /privacy/. A certified consent tool replaces this before any ads. */
(function () {
  var GA_ID = "G-L23V07S03M";
  if (!GA_ID) return;
  try { if (localStorage.getItem("umami.disabled")) return; } catch (e) {}
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;
  var choice = null; try { choice = localStorage.getItem("eports.analytics"); } catch (e) {}
  if (choice === "denied") return;
  var EU = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL",
            "PT","RO","SK","SI","ES","SE","IS","LI","NO","GB","CH"];
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  var NO_ADS = {ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"};
  gtag("consent", "default", Object.assign({analytics_storage: "denied", region: EU, wait_for_update: 500}, NO_ADS));
  gtag("consent", "default", Object.assign({analytics_storage: "granted"}, NO_ADS));
  if (choice === "granted") gtag("consent", "update", {analytics_storage: "granted"});
  gtag("js", new Date());
  gtag("config", GA_ID);
  var g = document.createElement("script");
  g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(g);

  var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  if (choice || !/^(Europe\/|Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe)|Arctic\/)/.test(tz)) return;
  function save(v) {
    try { localStorage.setItem("eports.analytics", v); } catch (e) {}
    gtag("consent", "update", {analytics_storage: v});
    bar.remove();
  }
  var bar = document.createElement("div");
  bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Analytics choice");
  bar.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:50;max-width:40rem;margin:0 auto;" +
    "background:#16302D;color:#fff;border-radius:12px;padding:12px 14px;font:14px/1.45 system-ui,sans-serif;" +
    "display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;box-shadow:0 4px 18px rgba(0,0,0,.25)";
  var p = document.createElement("p"); p.style.cssText = "margin:0;flex:1 1 16rem";
  p.innerHTML = 'May we use Google Analytics cookies to count visits? No ads, no selling. <a href="/privacy/#counting" style="color:#9fe3d6">Details</a>';
  function btn(t, v, solid) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = t;
    b.style.cssText = "font:600 14px system-ui,sans-serif;border-radius:8px;padding:7px 12px;cursor:pointer;border:1px solid #9fe3d6;" +
      (solid ? "background:#9fe3d6;color:#16302D" : "background:transparent;color:#fff");
    b.addEventListener("click", function () { save(v); });
    return b;
  }
  bar.append(p, btn("No thanks", "denied", false), btn("Allow", "granted", true));
  (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener("DOMContentLoaded", r); }))
    .then(function () { document.body.appendChild(bar); });
})();

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
