/* ==========================================================================
   game.js — Sterren-systeem + "Snake-woordhapper" als beloningsspel
   Volledig los van app.js (leest alleen de woordenlijst `goals` uit).
   ========================================================================== */
(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     Instellingen
     --------------------------------------------------------------------- */
  var STORE_KEY = "woordenschat-sterren-v1";
  var HISCORE_KEY = "woordenschat-snake-highscore-v1";
  var UNLOCK_AT = 50; // sterren die je per speelbeurt betaalt (drempel = kosten)
  var POINTS_CORRECT = 10;
  var STREAK_BONUS = 5; // extra vanaf 3 goed op rij

  /* ----------------------------------------------------------------------
     Sterren-opslag
     --------------------------------------------------------------------- */
  function load(key) {
    try { return parseInt(localStorage.getItem(key) || "0", 10) || 0; } catch (e) { return 0; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (e) {}
  }

  var stars = load(STORE_KEY);
  var highscore = load(HISCORE_KEY);
  var streak = 0;

  /* ----------------------------------------------------------------------
     Woorden ophalen uit de bestaande lijst (met veilige terugval)
     --------------------------------------------------------------------- */
  function getWords() {
    var out = [];
    try {
      // `goals` staat als globale const in app.js (zelfde pagina-scope).
      if (typeof goals !== "undefined" && Array.isArray(goals)) {
        goals.forEach(function (g) {
          (g.words || []).forEach(function (w) {
            if (!w) return;
            // goals is genormaliseerd naar objecten {word, meaning, example}.
            var word = w.word != null ? w.word : w[0];
            var meaning = w.meaning != null ? w.meaning : w[1];
            if (word && meaning) out.push({ word: word, meaning: meaning });
          });
        });
      }
    } catch (e) {}
    if (!out.length) {
      out = [
        { word: "de fiets", meaning: "een voertuig met twee wielen dat je zelf trapt" },
        { word: "de klok", meaning: "een ding dat laat zien hoe laat het is" },
        { word: "het raam", meaning: "een opening in de muur met glas erin" },
        { word: "de tas", meaning: "iets waarin je je spullen meeneemt" },
        { word: "de boom", meaning: "een grote plant met een stam en takken" },
      ];
    }
    // ontdubbelen op woord
    var seen = {}, uniq = [];
    out.forEach(function (o) { if (!seen[o.word]) { seen[o.word] = 1; uniq.push(o); } });
    return uniq;
  }
  var WORDS = getWords();

  function sample(arr, n, exclude) {
    var pool = arr.filter(function (x) { return !exclude || x.word !== exclude.word; });
    var picked = [];
    while (picked.length < n && pool.length) {
      var i = (Math.random() * pool.length) | 0;
      picked.push(pool.splice(i, 1)[0]);
    }
    return picked;
  }

  /* ----------------------------------------------------------------------
     HUD: sterren-teller + speelknop (rechtsonder)
     --------------------------------------------------------------------- */
  var hud, starsEl, playBtn;

  function buildHud() {
    hud = document.createElement("div");
    hud.id = "starHud";
    hud.innerHTML =
      '<div class="star-pill" id="starPill"><span class="star-ico">⭐</span>' +
      '<span id="starCount">0</span></div>' +
      '<button class="play-fab" id="playFab" type="button"></button>';
    document.body.appendChild(hud);
    starsEl = hud.querySelector("#starCount");
    playBtn = hud.querySelector("#playFab");
    playBtn.addEventListener("click", function () {
      if (stars < UNLOCK_AT) {
        bumpLocked();
        return;
      }
      // Spelen kost sterren: trek de speelbeurt af en speel.
      addStars(-UNLOCK_AT);
      hud.dataset.celebrated = ""; // melding "je kunt weer spelen" mag terugkomen
      gameToast("−" + UNLOCK_AT + " ⭐ · veel speelplezier!", 2200);
      openGame();
    });
    updateHud();
  }

  function bumpLocked() {
    playBtn.classList.remove("nudge");
    void playBtn.offsetWidth;
    playBtn.classList.add("nudge");
  }

  function updateHud(animate) {
    if (!hud) return;
    starsEl.textContent = stars;
    var unlocked = stars >= UNLOCK_AT;
    playBtn.classList.toggle("locked", !unlocked);
    if (unlocked) {
      playBtn.innerHTML = "🎮";
      playBtn.title = "Spelen (kost " + UNLOCK_AT + " sterren)";
      playBtn.setAttribute("aria-label", playBtn.title);
    } else {
      playBtn.innerHTML = '🔒<small>nog ' + (UNLOCK_AT - stars) + "</small>";
      playBtn.title = "Nog " + (UNLOCK_AT - stars) + " sterren om te spelen";
      playBtn.setAttribute("aria-label", playBtn.title);
    }
    if (animate) {
      var pill = hud.querySelector("#starPill");
      pill.classList.remove("pop");
      void pill.offsetWidth;
      pill.classList.add("pop");
      if (unlocked && !hud.dataset.celebrated) {
        hud.dataset.celebrated = "1";
        celebrateUnlock();
      }
    }
  }

  function addStars(n) {
    stars += n;
    save(STORE_KEY, stars);
    updateHud(true);
  }

  function gameToast(html, ms) {
    var toast = document.createElement("div");
    toast.className = "unlock-toast";
    toast.innerHTML = html;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add("show"); }, 30);
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.remove(); }, 400);
    }, ms || 3600);
  }

  function celebrateUnlock() {
    gameToast("🎉 Je hebt genoeg sterren! Klik op 🎮 (kost " + UNLOCK_AT + " ⭐)");
  }

  /* ----------------------------------------------------------------------
     Sterren verdienen bij goede quiz-antwoorden
     --------------------------------------------------------------------- */
  function watchQuiz() {
    var grid = document.getElementById("answerGrid");
    if (!grid) return;
    var awardedCorrect = false;
    var countedWrong = false;

    function check() {
      var hasCorrect = !!grid.querySelector("button.correct");
      var hasWrong = !!grid.querySelector("button.wrong");
      if (hasCorrect && !awardedCorrect) {
        awardedCorrect = true;
        streak += 1;
        var gain = POINTS_CORRECT + (streak >= 3 ? STREAK_BONUS : 0);
        addStars(gain);
      } else if (hasWrong && !hasCorrect && !countedWrong) {
        countedWrong = true;
        streak = 0;
      } else if (!hasCorrect && !hasWrong) {
        // nieuwe vraag
        awardedCorrect = false;
        countedWrong = false;
      }
    }
    new MutationObserver(check).observe(grid, {
      attributes: true, attributeFilter: ["class"], childList: true, subtree: true,
    });
  }

  /* ======================================================================
     SNAKE-WOORDHAPPER
     ====================================================================== */
  var overlay, canvas, ctx, clueEl, scoreEl, hiEl, livesEl, msgEl, dpad;
  var COLS = 17, ROWS = 17, CELL = 26;
  var snake, dir, nextDir, foods, target, score, lives, running, paused, tickMs, loopTimer, growBy;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.id = "gameOverlay";
    overlay.className = "hidden";
    overlay.innerHTML =
      '<div class="game-card">' +
        '<div class="game-top">' +
          '<div class="game-title"><span>🐍</span> Snake-woordhapper</div>' +
          '<button class="game-close" id="gameClose" type="button" aria-label="Sluiten">✕</button>' +
        '</div>' +
        '<div class="game-clue" id="gameClue"></div>' +
        '<div class="game-stats">' +
          '<span id="gameScore">Score: 0</span>' +
          '<span id="gameLives">❤️❤️❤️</span>' +
          '<span id="gameHi">Record: 0</span>' +
        '</div>' +
        '<div class="game-stage">' +
          '<canvas id="gameCanvas"></canvas>' +
          '<div class="game-message hidden" id="gameMessage"></div>' +
        '</div>' +
        '<div class="game-controls">' +
          '<div class="dpad" id="dpad">' +
            '<button data-dir="up" aria-label="Omhoog">▲</button>' +
            '<button data-dir="left" aria-label="Links">◀</button>' +
            '<button data-dir="down" aria-label="Omlaag">▼</button>' +
            '<button data-dir="right" aria-label="Rechts">▶</button>' +
          '</div>' +
          '<p class="game-hint">Pijltjes, WASD of swipe · eet het juiste woord!</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    canvas = overlay.querySelector("#gameCanvas");
    ctx = canvas.getContext("2d");
    clueEl = overlay.querySelector("#gameClue");
    scoreEl = overlay.querySelector("#gameScore");
    hiEl = overlay.querySelector("#gameHi");
    livesEl = overlay.querySelector("#gameLives");
    msgEl = overlay.querySelector("#gameMessage");
    dpad = overlay.querySelector("#dpad");

    overlay.querySelector("#gameClose").addEventListener("click", closeGame);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeGame(); });
    dpad.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dir]");
      if (b) setDir(b.dataset.dir);
    });

    // Swipe op het canvas
    var sx = 0, sy = 0;
    canvas.addEventListener("touchstart", function (e) {
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    canvas.addEventListener("touchmove", function (e) {
      if (!sx && !sy) return;
      var t = e.touches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "right" : "left");
      else setDir(dy > 0 ? "down" : "up");
      sx = 0; sy = 0;
      e.preventDefault();
    }, { passive: false });
  }

  function sizeCanvas() {
    var stage = overlay.querySelector(".game-stage");
    var avail = Math.min(stage.clientWidth, window.innerHeight * 0.5);
    avail = Math.max(260, Math.min(avail, 460));
    CELL = Math.floor(avail / COLS);
    var size = CELL * COLS;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onKey(e) {
    if (overlay.classList.contains("hidden")) return;
    var map = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right",
    };
    if (map[e.key]) { setDir(map[e.key]); e.preventDefault(); }
    else if (e.key === "Escape") closeGame();
  }

  function setDir(d) {
    var opposite = { up: "down", down: "up", left: "right", right: "left" };
    if (!dir) { nextDir = d; return; }
    if (d === opposite[dir]) return; // niet omkeren
    nextDir = d;
  }

  function openGame() {
    if (!overlay) buildOverlay();
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    sizeCanvas();
    window.addEventListener("keydown", onKey);
    startGame();
  }

  function closeGame() {
    stopLoop();
    if (overlay) overlay.classList.add("hidden");
    document.body.style.overflow = "";
    window.removeEventListener("keydown", onKey);
  }

  function stopLoop() {
    running = false;
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  }

  function startGame() {
    snake = [{ x: 3, y: (ROWS / 2) | 0 }, { x: 2, y: (ROWS / 2) | 0 }, { x: 1, y: (ROWS / 2) | 0 }];
    dir = "right"; nextDir = "right";
    score = 0; lives = 3; tickMs = 170; growBy = 0;
    running = true; paused = false;
    msgEl.classList.add("hidden");
    updateStats();
    newRound();
    draw();
    scheduleTick();
  }

  function updateStats() {
    scoreEl.textContent = "Score: " + score;
    hiEl.textContent = "Record: " + highscore;
    livesEl.textContent = "❤️".repeat(lives) + "🤍".repeat(Math.max(0, 3 - lives));
  }

  // Bereken hoeveel cellen een woord-pil breed is
  function pillCells(text) {
    ctx.font = "700 " + Math.max(11, CELL * 0.52) + "px -apple-system, system-ui, sans-serif";
    var w = ctx.measureText(text).width + CELL * 0.8;
    return Math.max(1, Math.min(COLS, Math.ceil(w / CELL)));
  }

  function occupied() {
    var occ = {};
    snake.forEach(function (s) { occ[s.x + "," + s.y] = true; });
    (foods || []).forEach(function (f) {
      for (var i = 0; i < f.cells; i++) occ[(f.x + i) + "," + f.y] = true;
    });
    return occ;
  }

  function placeFood(text, correct) {
    var cells = pillCells(text);
    var occ = occupied();
    for (var tries = 0; tries < 200; tries++) {
      var y = (Math.random() * ROWS) | 0;
      var x = (Math.random() * (COLS - cells)) | 0;
      var ok = true;
      // 1 cel marge rondom
      for (var i = -1; i <= cells; i++) {
        if (occ[(x + i) + "," + y] || occ[(x + i) + "," + (y - 1)] || occ[(x + i) + "," + (y + 1)]) { ok = false; break; }
      }
      if (ok) return { x: x, y: y, cells: cells, word: text, correct: correct };
    }
    return null;
  }

  function newRound() {
    target = WORDS[(Math.random() * WORDS.length) | 0];
    var distractors = sample(WORDS, 2, target);
    clueEl.innerHTML = 'Eet het woord dat past bij: <strong>' + escapeHtml(target.meaning) + "</strong>";
    foods = [];
    var items = [{ w: target.word, c: true }].concat(distractors.map(function (d) { return { w: d.word, c: false }; }));
    items.sort(function () { return Math.random() - 0.5; });
    items.forEach(function (it) {
      var f = placeFood(it.w, it.c);
      if (f) foods.push(f);
    });
    // veiligheidsnet: als het goede woord niet geplaatst kon worden, opnieuw
    if (!foods.some(function (f) { return f.correct; })) {
      var f2 = placeFood(target.word, true);
      if (f2) foods.push(f2);
    }
  }

  function scheduleTick() {
    if (!running) return;
    loopTimer = setTimeout(function () {
      if (running && !paused) step();
      scheduleTick();
    }, tickMs);
  }

  function step() {
    if (nextDir) dir = nextDir;
    var head = { x: snake[0].x, y: snake[0].y };
    if (dir === "up") head.y--;
    else if (dir === "down") head.y++;
    else if (dir === "left") head.x--;
    else if (dir === "right") head.x++;

    // muur
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return crash();
    // jezelf
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) return crash();
    }

    snake.unshift(head);

    // eten?
    var eaten = -1;
    for (var f = 0; f < foods.length; f++) {
      var fd = foods[f];
      if (head.y === fd.y && head.x >= fd.x && head.x < fd.x + fd.cells) { eaten = f; break; }
    }

    if (eaten >= 0) {
      var food = foods[eaten];
      if (food.correct) {
        score += 1;
        growBy += 2;
        if (tickMs > 95) tickMs -= 4;
        if (score > highscore) { highscore = score; save(HISCORE_KEY, highscore); }
        flash("good");
        updateStats();
        newRound();
      } else {
        foods.splice(eaten, 1);
        lives -= 1;
        flash("bad");
        updateStats();
        if (lives <= 0) return gameOver();
      }
    }

    if (growBy > 0) growBy--;
    else snake.pop();

    draw();
  }

  function crash() {
    lives -= 1;
    flash("bad");
    updateStats();
    if (lives <= 0) return gameOver();
    // herstart de slang op dezelfde ronde
    snake = [{ x: 3, y: (ROWS / 2) | 0 }, { x: 2, y: (ROWS / 2) | 0 }, { x: 1, y: (ROWS / 2) | 0 }];
    dir = "right"; nextDir = "right"; growBy = 0;
    draw();
  }

  var flashState = null;
  function flash(type) {
    flashState = { type: type, t: 6 };
  }

  function gameOver() {
    stopLoop();
    var msg = score >= 5 ? "🏆 Knap gespeeld!" : "🌱 Goed geprobeerd!";
    msgEl.innerHTML =
      '<strong>' + msg + "</strong>" +
      "<span>Je at " + score + " goede woorden op.</span>" +
      '<button class="game-again" id="gameAgain" type="button">Nog een keer</button>';
    msgEl.classList.remove("hidden");
    msgEl.querySelector("#gameAgain").addEventListener("click", startGame);
  }

  /* ----------------------------------------------------------------------
     Tekenen
     --------------------------------------------------------------------- */
  function draw() {
    var size = CELL * COLS;
    ctx.clearRect(0, 0, size, size);

    // achtergrond + raster
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(79, 70, 229,0.08)";
    ctx.lineWidth = 1;
    for (var i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(size, i * CELL); ctx.stroke();
    }

    // woord-pillen
    (foods || []).forEach(function (fd) {
      var x = fd.x * CELL, y = fd.y * CELL, w = fd.cells * CELL, h = CELL;
      roundRect(x + 2, y + 2, w - 4, h - 4, 9);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(79, 70, 229,0.55)";
      ctx.stroke();
      ctx.fillStyle = "#1e2a5a";
      ctx.font = "700 " + Math.max(11, CELL * 0.5) + "px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fd.word, x + w / 2, y + h / 2 + 1);
    });

    // slang
    for (var s = snake.length - 1; s >= 0; s--) {
      var seg = snake[s];
      var t = s / Math.max(1, snake.length);
      roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 8);
      ctx.fillStyle = s === 0 ? "#4338ca" : mix("#4f46e5", "#0e9f9e", t);
      ctx.fill();
    }
    // ogen op de kop
    var head = snake[0];
    ctx.fillStyle = "#fff";
    var ex = head.x * CELL, ey = head.y * CELL;
    var eo = CELL * 0.28, er = Math.max(2, CELL * 0.09);
    dot(ex + CELL / 2 - eo, ey + CELL / 2 - eo, er);
    dot(ex + CELL / 2 + eo, ey + CELL / 2 - eo, er);

    // flits bij eten
    if (flashState && flashState.t > 0) {
      ctx.fillStyle = flashState.type === "good"
        ? "rgba(40,168,120," + (flashState.t / 24) + ")"
        : "rgba(224,90,80," + (flashState.t / 18) + ")";
      ctx.fillRect(0, 0, size, size);
      flashState.t--;
    }
  }

  function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function mix(a, b, t) {
    function h2(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    var ca = h2(a), cb = h2(b);
    var r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
    var g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
    var bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ----------------------------------------------------------------------
     Start
     --------------------------------------------------------------------- */
  function start() {
    buildHud();
    watchQuiz();
    window.addEventListener("resize", function () {
      if (overlay && !overlay.classList.contains("hidden")) { sizeCanvas(); draw(); }
    });
    // Pauzeer automatisch als het kind wegklikt of het tabblad verbergt.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) paused = true;
    });

    window.WoordSpel = {
      addStars: addStars,
      getStars: function () { return stars; },
      open: openGame,
      setStars: function (n) { stars = n; save(STORE_KEY, stars); updateHud(true); },
      pause: function () { paused = true; },
      resume: function () { paused = false; },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
