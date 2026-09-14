window.App = window.App || {};
App.Screens = App.Screens || {};

App.Screens.Test = (function () {
  var Utils = App.Utils;
  var Furigana = App.Furigana;

  function mount(container, test, opts, callbacks) {
    opts = opts || {};
    Utils.clear(container);
    var meta = test.meta;

    var sections = test.sections.slice();
    if (meta.shuffle_sections) sections = Utils.shuffleArray(sections).items;

    var flat = [];
    sections.forEach(function (section) {
      var questions = section.questions.slice();
      if (meta.shuffle_questions) questions = Utils.shuffleArray(questions).items;
      questions.forEach(function (q) {
        flat.push({
          question: q,
          sectionId: section.id,
          sectionTitle: section.title,
          sectionIntro: section.intro,
        });
      });
    });

    var currentIndex = 0;
    var records = [];
    var startedAt = new Date().toISOString();
    var introShown = {};

    if (opts.resume) {
      var saved = App.Storage.loadProgress(meta.id);
      if (saved && Array.isArray(saved.order)) {
        var byId = {};
        flat.forEach(function (item) {
          byId[item.question.id] = item;
        });
        var restored = saved.order.map(function (id) {
          return byId[id];
        });
        if (restored.every(Boolean) && restored.length === flat.length) {
          flat = restored;
          currentIndex = saved.currentIndex || 0;
          records = saved.records || [];
          startedAt = saved.startedAt || startedAt;
          records.forEach(function (r) {
            introShown[r.sectionId] = true;
          });
        }
      }
    }

    var order = flat.map(function (item) {
      return item.question.id;
    });

    var header = Utils.el("div", { class: "test-header" });
    var progressLabel = Utils.el("span", { class: "progress-label" });
    header.appendChild(progressLabel);
    container.appendChild(header);

    var introEl = Utils.el("div", { class: "section-intro hidden" });
    container.appendChild(introEl);

    var questionContainer = Utils.el("div", { class: "question-container" });
    container.appendChild(questionContainer);

    var explanationEl = Utils.el("div", { class: "explanation hidden" });
    container.appendChild(explanationEl);

    var footer = Utils.el("div", { class: "test-footer" });
    var answerBtn = Utils.el("button", {
      type: "button",
      text: "Responder",
      disabled: true,
      class: "btn-answer",
    });
    var nextBtn = Utils.el("button", { type: "button", text: "Siguiente", class: "btn-next hidden" });
    footer.appendChild(answerBtn);
    footer.appendChild(nextBtn);
    container.appendChild(footer);

    var questionStartTime = null;
    var currentHandler = null;
    var currentQuestionContainer = null;
    var answered = false;

    var ctx = {
      meta: meta,
      state: null,
      onSelectionChange: function (hasAnswer) {
        answerBtn.disabled = !hasAnswer;
      },
      renderAudioControls: function (containerEl, audioObj) {
        return renderAudioControls(containerEl, audioObj);
      },
    };

    function renderAudioControls(containerEl, audioObj) {
      var wrap = Utils.el("div", { class: "audio-block" });
      if (audioObj.hidden === false) {
        var textEl = Utils.el("p", { class: "audio-visible-text" });
        Furigana.renderFuriganaInto(textEl, audioObj.display || audioObj.text);
        wrap.appendChild(textEl);
      }
      var controls = Utils.el("div", { class: "audio-buttons" });
      var playBtn = Utils.el("button", { type: "button", class: "btn-play", text: "▶ Reproducir" });
      var slowBtn = Utils.el("button", { type: "button", class: "btn-slow", text: "🐢 Lento" });
      var counter = Utils.el("span", { class: "audio-counter" });

      function updateCounter() {
        counter.textContent =
          ctx.state.replays +
          " reproducciones" +
          (ctx.state.slowReplays ? " (" + ctx.state.slowReplays + " lentas)" : "");
      }
      updateCounter();

      playBtn.addEventListener("click", function () {
        ctx.state.replays += 1;
        updateCounter();
        App.TTS.speak(Furigana.stripFurigana(audioObj.text), {
          rate: audioObj.rate || meta.default_rate || 1,
        });
      });
      slowBtn.addEventListener("click", function () {
        ctx.state.replays += 1;
        ctx.state.slowReplays += 1;
        updateCounter();
        App.TTS.speak(Furigana.stripFurigana(audioObj.text), {
          rate: meta.slow_rate || 0.6,
        });
      });

      controls.appendChild(playBtn);
      controls.appendChild(slowBtn);
      controls.appendChild(counter);
      wrap.appendChild(controls);
      containerEl.appendChild(wrap);

      if (!ctx.state.firstPlayBtn) ctx.state.firstPlayBtn = playBtn;
      if (!ctx.state.firstSlowBtn) ctx.state.firstSlowBtn = slowBtn;
      return { playBtn: playBtn, slowBtn: slowBtn };
    }

    function persistProgress() {
      App.Storage.saveProgress(meta.id, {
        order: order,
        currentIndex: currentIndex,
        records: records,
        startedAt: startedAt,
      });
    }

    function renderQuestion() {
      answered = false;
      Utils.clear(explanationEl);
      explanationEl.classList.add("hidden");
      nextBtn.classList.add("hidden");
      answerBtn.classList.remove("hidden");
      answerBtn.disabled = true;

      var item = flat[currentIndex];
      progressLabel.textContent = currentIndex + 1 + " / " + flat.length + " — " + item.sectionTitle;

      if (item.sectionIntro && !introShown[item.sectionId]) {
        introShown[item.sectionId] = true;
        Utils.clear(introEl);
        introEl.classList.remove("hidden");
        introEl.appendChild(Utils.el("p", { text: item.sectionIntro }));
      } else {
        introEl.classList.add("hidden");
      }

      Utils.clear(questionContainer);
      currentQuestionContainer = Utils.el("div", { class: "question" });
      questionContainer.appendChild(currentQuestionContainer);

      ctx.state = { replays: 0, slowReplays: 0, firstPlayBtn: null, firstSlowBtn: null };
      currentHandler = App.QuestionTypes.get(item.question.type);
      currentHandler.render(item.question, currentQuestionContainer, ctx);

      questionStartTime = Date.now();
    }

    function showExplanation(gradeResult, question) {
      if (meta.show_explanation !== "after_each") return;
      explanationEl.classList.remove("hidden");
      Utils.clear(explanationEl);

      explanationEl.appendChild(
        Utils.el("p", {
          class: gradeResult.correct ? "verdict correct" : "verdict incorrect",
          text: gradeResult.correct ? "✔ Correcto" : "✘ Incorrecto",
        })
      );

      if (!gradeResult.correct && gradeResult.expectedDisplay !== undefined) {
        var expectedEl = Utils.el("p", { class: "expected-answer" });
        expectedEl.appendChild(document.createTextNode("Respuesta correcta: "));
        var span = Utils.el("span");
        Furigana.renderFuriganaInto(span, String(gradeResult.expectedDisplay));
        expectedEl.appendChild(span);
        explanationEl.appendChild(expectedEl);
      }

      if (question.explanation) {
        var explEl = Utils.el("p", { class: "explanation-text" });
        Furigana.renderFuriganaInto(explEl, question.explanation, { bold: true });
        explanationEl.appendChild(explEl);
      }
      if (question.source) {
        explanationEl.appendChild(Utils.el("p", { class: "source-text", text: "Fuente: " + question.source }));
      }
    }

    function answerCurrent() {
      if (answered || answerBtn.disabled) return;
      answered = true;

      var item = flat[currentIndex];
      var raw = currentHandler.collectAnswer(currentQuestionContainer, ctx);
      var gradeResult = currentHandler.grade(item.question, raw, ctx);
      var timeMs = Date.now() - questionStartTime;

      records.push({
        id: item.question.id,
        question: item.question,
        sectionId: item.sectionId,
        correct: gradeResult.correct,
        expectedForResults: gradeResult.expectedForResults,
        userForResults: gradeResult.userForResults,
        replays: ctx.state.replays,
        slow_replays: ctx.state.slowReplays,
        time_ms: timeMs,
        extra: gradeResult.extra,
      });

      showExplanation(gradeResult, item.question);

      answerBtn.classList.add("hidden");
      nextBtn.classList.remove("hidden");
      persistProgress();

      if (meta.show_explanation !== "after_each") {
        goNext();
      }
    }

    function goNext() {
      currentIndex += 1;
      if (currentIndex >= flat.length) {
        finish();
        return;
      }
      persistProgress();
      renderQuestion();
    }

    function finish() {
      var finishedAt = new Date().toISOString();
      var environment = {
        tts_voice: App.TTS.getSelectedVoice() ? App.TTS.getSelectedVoice().name : null,
        stt_available: App.STT.isAvailable(),
        user_agent: navigator.userAgent,
      };
      var resultObject = App.Scoring.buildResultObject({
        meta: meta,
        records: records,
        startedAt: startedAt,
        finishedAt: finishedAt,
        environment: environment,
      });
      document.removeEventListener("keydown", keyHandler);
      callbacks.onFinished(resultObject);
    }

    function keyHandler(e) {
      var tag = document.activeElement && document.activeElement.tagName;
      var isTextInput = tag === "INPUT" || tag === "TEXTAREA";

      if (e.key === "Enter") {
        if (!nextBtn.classList.contains("hidden")) {
          nextBtn.click();
          e.preventDefault();
        } else if (!answerBtn.classList.contains("hidden") && !answerBtn.disabled) {
          answerBtn.click();
          e.preventDefault();
        }
        return;
      }
      if (isTextInput) return;

      if (e.code === "Space") {
        if (ctx.state && ctx.state.firstPlayBtn) {
          ctx.state.firstPlayBtn.click();
          e.preventDefault();
        }
        return;
      }
      if (e.key === "s" || e.key === "S") {
        if (ctx.state && ctx.state.firstSlowBtn) ctx.state.firstSlowBtn.click();
        return;
      }
      if (/^[1-6]$/.test(e.key)) {
        var idx = Number(e.key) - 1;
        var btns = Utils.qsa(".option-btn", currentQuestionContainer);
        if (btns[idx]) btns[idx].click();
        return;
      }
      if (e.key === "m" || e.key === "M") {
        var micBtn = Utils.qs(".btn-mic", currentQuestionContainer);
        if (micBtn) {
          micBtn.dispatchEvent(new PointerEvent("pointerdown"));
          setTimeout(function () {
            micBtn.dispatchEvent(new PointerEvent("pointerup"));
          }, 2000);
        }
      }
    }

    answerBtn.addEventListener("click", answerCurrent);
    nextBtn.addEventListener("click", goNext);
    document.addEventListener("keydown", keyHandler);

    renderQuestion();
  }

  return { mount: mount };
})();
