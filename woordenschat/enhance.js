/* ==========================================================================
   enhance.js — invliegende beelden + speelse confetti
   Volledig additief: raakt de logica in app.js niet aan. Werkt als
   "progressive enhancement" — zonder dit bestand blijft de site gewoon werken.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------
     1. Invliegende beelden (reveal)
     --------------------------------------------------------------------- */

  // Animeer de directe kinderen van een container gefaseerd in beeld.
  function revealChildren(container, opts) {
    if (!container) return;
    opts = opts || {};
    var step = opts.step != null ? opts.step : 80; // ms tussen elementen
    var base = opts.base != null ? opts.base : 0; // begin-vertraging
    var children = opts.selector
      ? container.querySelectorAll(opts.selector)
      : container.children;

    Array.prototype.forEach.call(children, function (el, i) {
      // herstart de animatie netjes bij opnieuw tonen
      el.classList.remove("reveal-in");
      el.classList.add("reveal-init");
      // reflow forceren zodat de animatie opnieuw start
      void el.offsetWidth;
      el.style.animationDelay = base + i * step + "ms";
      el.classList.add("reveal-in");
    });
  }

  // Toon-status van een sectie afleiden (zichtbaar = niet .hidden en in beeld)
  function isVisible(el) {
    return el && !el.classList.contains("hidden") && el.offsetParent !== null;
  }

  // De hoofdschermen die we bij binnenkomst laten invliegen.
  var VIEW_IDS = [
    "menuView",
    "stepStrip",
    "groupMenu",
    "studyView",
    "quizView",
    "teacherView",
  ];

  function revealView(id) {
    var view = document.getElementById(id);
    if (!view) return;
    revealChildren(view, { step: 90 });
  }

  // Bij eerste laden: alles wat al zichtbaar is netjes laten invliegen.
  function initialReveal() {
    VIEW_IDS.forEach(function (id) {
      var view = document.getElementById(id);
      if (isVisible(view)) revealView(id);
    });
  }

  // Reageer op schermwisselingen: zodra een sectie van .hidden af gaat,
  // laten we de inhoud opnieuw invliegen (zo voelt elke stap fris).
  function watchViewSwitches() {
    VIEW_IDS.forEach(function (id) {
      var view = document.getElementById(id);
      if (!view) return;
      var wasHidden = view.classList.contains("hidden");
      var mo = new MutationObserver(function () {
        var hiddenNow = view.classList.contains("hidden");
        if (wasHidden && !hiddenNow) {
          // net zichtbaar geworden
          requestAnimationFrame(function () {
            revealView(id);
          });
        }
        wasHidden = hiddenNow;
      });
      mo.observe(view, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // Dynamisch gevulde lijsten (groepenmenu, woordenlijst) gefaseerd tonen
  // zodra app.js ze opbouwt.
  function watchDynamicLists() {
    var groupMenu = document.getElementById("groupMenu");
    if (groupMenu) {
      var t1;
      var mo1 = new MutationObserver(function () {
        clearTimeout(t1);
        t1 = setTimeout(function () {
          if (isVisible(groupMenu)) revealChildren(groupMenu, { step: 70 });
        }, 30);
      });
      mo1.observe(groupMenu, { childList: true });
    }
  }

  /* ----------------------------------------------------------------------
     2. Scroll-reveal voor losse kaarten die in beeld scrollen
     --------------------------------------------------------------------- */
  function setupScrollReveal() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    // Observeer woordrijen en lijstkaarten wanneer ze later worden toegevoegd.
    var wordList = document.getElementById("wordList");
    if (wordList) {
      var mo = new MutationObserver(function () {
        Array.prototype.forEach.call(wordList.children, function (row) {
          if (!row.dataset.revealBound) {
            row.dataset.revealBound = "1";
            row.classList.add("reveal-init");
            io.observe(row);
          }
        });
      });
      mo.observe(wordList, { childList: true });
    }
  }

  /* ----------------------------------------------------------------------
     3. Confetti 🎉 (canvas-gebaseerd, lichtgewicht)
     --------------------------------------------------------------------- */
  var confetti = (function () {
    if (reduceMotion) {
      return { burst: function () {} };
    }

    var canvas, ctx, dpr, particles = [], rafId = null;
    var COLORS = ["#8d6be8", "#3a9d7b", "#ffb340", "#ff9f1c", "#ff7eb6", "#ffffff"];

    function ensureCanvas() {
      if (canvas) return;
      canvas = document.createElement("canvas");
      canvas.id = "confettiCanvas";
      document.body.appendChild(canvas);
      ctx = canvas.getContext("2d");
      resize();
      window.addEventListener("resize", resize);
    }

    function resize() {
      dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(x, y, amount) {
      for (var i = 0; i < amount; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 4 + Math.random() * 7;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          size: 6 + Math.random() * 7,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          life: 1,
          decay: 0.008 + Math.random() * 0.01,
        });
      }
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    function tick() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.vy += 0.22; // zwaartekracht
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > window.innerHeight + 40) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (particles.length > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        rafId = null;
      }
    }

    return {
      burst: function (centerX, centerY, amount) {
        ensureCanvas();
        var x = centerX != null ? centerX : window.innerWidth / 2;
        var y = centerY != null ? centerY : window.innerHeight / 2.6;
        spawn(x, y, amount || 90);
      },
    };
  })();

  // Korte toast bovenaan voor een viering (bijv. nieuw groei-niveau).
  function showToast(message) {
    var toast = document.getElementById("woordToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "woordToast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove("show");
    void toast.offsetWidth; // herstart de animatie
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2600);
  }

  // Vier-functie voor de rest van de site (bijv. een nieuw medaille-niveau).
  window.WoordVier = function (message) {
    if (message) showToast(message);
    confetti.burst(window.innerWidth / 2, window.innerHeight / 3.2, 110);
  };

  // Vier een goed antwoord: confetti vanuit de gekozen knop.
  // Robuust: werkt zowel als de app een klasse toevoegt als wanneer hij de
  // antwoordknoppen opnieuw opbouwt.
  function watchCorrectAnswers() {
    var grid = document.getElementById("answerGrid");
    if (!grid) return;
    var celebrated = false;

    function check() {
      var correct = grid.querySelector("button.correct");
      if (correct && !celebrated) {
        celebrated = true;
        var r = correct.getBoundingClientRect();
        confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 75);
      } else if (!correct) {
        // nieuwe vraag: klaar om opnieuw te vieren
        celebrated = false;
      }
    }

    var mo = new MutationObserver(check);
    mo.observe(grid, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
  }

  // Vier het afronden van een toets/oefenronde.
  function watchResult() {
    var result = document.getElementById("resultCard");
    if (!result) return;
    var wasHidden = result.classList.contains("hidden");
    var mo = new MutationObserver(function () {
      var hiddenNow = result.classList.contains("hidden");
      if (wasHidden && !hiddenNow) {
        confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 140);
      }
      wasHidden = hiddenNow;
    });
    mo.observe(result, { attributes: true, attributeFilter: ["class"] });
  }

  /* ----------------------------------------------------------------------
     Start
     --------------------------------------------------------------------- */
  function start() {
    initialReveal();
    watchViewSwitches();
    watchDynamicLists();
    setupScrollReveal();
    watchCorrectAnswers();
    watchResult();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

/* ==========================================================================
   Voorlezen (Web Speech API) — leest woorden, voorbeeldzinnen en quizvragen
   hardop voor met een Nederlandse stem. Volledig additief.
   ========================================================================== */
(function () {
  "use strict";
  if (!("speechSynthesis" in window)) return;

  function pickVoice() {
    var voices = window.speechSynthesis.getVoices() || [];
    return (
      voices.find(function (v) { return /^nl/i.test(v.lang); }) ||
      voices.find(function (v) { return /nederl|dutch/i.test(v.name || ""); }) ||
      null
    );
  }

  function speak(text) {
    if (!text) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "nl-NL";
    u.rate = 0.95;
    var v = pickVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }
  // Beschikbaar maken voor andere onderdelen (bijv. de quiz-knop).
  window.WoordVoorlezen = { speak: speak };

  function text(id) {
    var el = document.getElementById(id);
    return el ? (el.textContent || "").trim() : "";
  }

  // Lees voor wat er op de kaart staat (voorkant óf achterkant + voorbeeldzin).
  function flashcardText() {
    var card = document.getElementById("flashcard");
    if (!card) return "";
    var flipped = card.classList.contains("is-flipped");
    var main = flipped ? text("backText") : text("frontText");
    var example = flipped ? text("exampleText") : "";
    return [main, example].filter(Boolean).join(". ");
  }

  function makeButton(id, label) {
    var btn = document.createElement("button");
    btn.id = id;
    btn.type = "button";
    btn.className = "secondary-button speak-button";
    btn.innerHTML = '<span aria-hidden="true">🔊</span> ' + label;
    btn.setAttribute("aria-label", "Voorlezen");
    return btn;
  }

  function addFlashcardButton() {
    var controls = document.querySelector("#studyView .controls");
    if (!controls || document.getElementById("speakCardButton")) return;
    var btn = makeButton("speakCardButton", "Voorlezen");
    btn.addEventListener("click", function () { speak(flashcardText()); });
    controls.appendChild(btn);
  }

  // Leest de quizvraag voor.
  function addQuizButton() {
    var prompt = document.getElementById("quizPrompt");
    if (!prompt || document.getElementById("speakQuizButton")) return;
    var btn = makeButton("speakQuizButton", "Lees de vraag");
    btn.classList.add("quiz-speak");
    btn.addEventListener("click", function () { speak(text("quizPrompt")); });
    prompt.insertAdjacentElement("afterend", btn);
  }

  // Stop met praten zodra je het oefen- of quizscherm verlaat.
  function stopOnLeave() {
    ["studyView", "quizView"].forEach(function (id) {
      var view = document.getElementById(id);
      if (!view) return;
      new MutationObserver(function () {
        if (view.classList.contains("hidden")) window.speechSynthesis.cancel();
      }).observe(view, { attributes: true, attributeFilter: ["class"] });
    });
  }

  function start() {
    addFlashcardButton();
    addQuizButton();
    stopOnLeave();
    // Stemmen laden soms asynchroon; triggeren zodat pickVoice later werkt.
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.getVoices();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
