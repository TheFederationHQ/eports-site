/* "Was this page useful?" on every page (Femi, "Do it for me" on team-feedback-loop, 30 Oct 2026).
   - The answers go to Umami Cloud as events, the same cookie-free counter as assets/stats.js, so there is no
     new company, no cookie and no form service. Events: "page-useful" {answer, page} and "page-suggestion"
     {answer, page, text}. They show in Umami under Events, per page.
   - Someone who switched counting off (/privacy/, Do Not Track, Global Privacy Control) has no Umami here, so
     nothing is sent: the box offers an email instead.
   - The box ships hidden and only appears when this script runs, so it never shows a dead button. */
(function () {
  var box = document.getElementById("ep-fb");
  if (!box) return;
  var MAX = 400;  // Umami keeps text values up to 500 characters
  var page = location.pathname;
  var answer = "";
  var $ = function (sel) { return box.querySelector(sel); };
  function on() { return !!(window.umami && typeof window.umami.track === "function"); }
  function send(name, data) {
    if (!on()) return false;
    try { window.umami.track(name, data); return true; } catch (e) { return false; }
  }
  function mail(text) {
    var body = "Page: " + location.href + "\n" + (answer ? "Useful: " + answer + "\n" : "") + "\n" + (text || "");
    return "mailto:hello@eports.global?subject=" + encodeURIComponent("Suggestion for ePORTS") +
      "&body=" + encodeURIComponent(body);
  }
  box.hidden = false;
  var ask = $(".ep-fb-ask"), more = $(".ep-fb-more"), done = $(".ep-fb-done"), txt = $("textarea"), left = $(".ep-fb-left");
  function step(el) { [ask, more, done].forEach(function (x) { x.hidden = x !== el; }); }
  box.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("button,a") : null;
    if (!b || !box.contains(b)) return;
    var act = b.getAttribute("data-fb");
    if (act === "yes" || act === "no") {
      answer = act;
      send("page-useful", { answer: act, page: page });
      $(".ep-fb-thanks").textContent = act === "yes" ? "Glad it helped." : "Sorry it missed the mark.";
      $(".ep-fb-q").textContent = act === "yes" ? "Anything that would make it even better?" : "What were you looking for, or what should we fix?";
      var join = $(".ep-fb-join");
      if (join) join.hidden = act !== "yes";
      step(more);
      txt.focus();
    } else if (act === "suggest") {
      step(more);
      txt.focus();
    } else if (act === "send") {
      var t = txt.value.trim().slice(0, MAX);
      if (!t) { txt.focus(); return; }
      if (send("page-suggestion", { answer: answer || "none", page: page, text: t })) {
        $(".ep-fb-sent").textContent = "Thank you. We read every suggestion.";
        $(".ep-fb-mail").hidden = true;
      } else {
        $(".ep-fb-sent").textContent = "Counting is switched off in this browser, so we can't receive this here.";
        var m = $(".ep-fb-mail");
        m.href = mail(t);
        m.hidden = false;
      }
      step(done);
    }
  });
  txt.setAttribute("maxlength", MAX);
  txt.addEventListener("input", function () { left.textContent = (MAX - txt.value.length) + " characters left"; });
})();
