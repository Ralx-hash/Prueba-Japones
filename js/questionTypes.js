window.App = window.App || {};

// Registro extensible de handlers por tipo de pregunta.
// Cada handler implementa: render(question, container, ctx),
// collectAnswer(container, ctx) -> rawAnswer,
// grade(question, rawAnswer, ctx) -> { correct, expectedForResults,
//   userForResults, expectedDisplay, extra }
App.QuestionTypes = (function () {
  var registry = {};

  function register(type, handler) {
    registry[type] = handler;
  }

  function get(type) {
    return registry[type];
  }

  var Utils = App.Utils;
  var Furigana = App.Furigana;

  // ---- Helpers compartidos para preguntas de elección ----

  function renderChoiceQuestion(question, container, ctx, opts) {
    opts = opts || {};
    container.__selectedPos = null;

    var promptEl = Utils.el("p", { class: "question-prompt" });
    Furigana.renderFuriganaInto(promptEl, question.prompt, { bold: true });
    container.appendChild(promptEl);

    if (opts.display) {
      var displayEl = Utils.el("p", { class: "question-display" });
      Furigana.renderFuriganaInto(displayEl, opts.display);
      container.appendChild(displayEl);
    }

    if (opts.audio) {
      ctx.renderAudioControls(container, opts.audio);
    }

    var shuffle = !!(ctx.meta.shuffle_options && !opts.noShuffle);
    var items = question.options.map(function (text, i) {
      return { text: text, originalIndex: i };
    });
    var order = items;
    if (shuffle) {
      order = Utils.shuffleArray(items).items;
    }
    container.__originalIndexOf = order.map(function (it) {
      return it.originalIndex;
    });

    var optionsWrap = Utils.el("div", { class: "options-list" });
    order.forEach(function (item, pos) {
      var btn = Utils.el("button", {
        class: "option-btn",
        type: "button",
        dataset: { optionIndex: String(pos) },
      });
      Furigana.renderFuriganaInto(btn, item.text);
      btn.addEventListener("click", function () {
        Utils.qsa(".option-btn", optionsWrap).forEach(function (b) {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
        container.__selectedPos = pos;
        ctx.onSelectionChange(true);
      });
      optionsWrap.appendChild(btn);
    });
    container.appendChild(optionsWrap);
  }

  function collectChoiceAnswer(container) {
    if (container.__selectedPos === null || container.__selectedPos === undefined) {
      return null;
    }
    return container.__originalIndexOf[container.__selectedPos];
  }

  function gradeChoiceAnswer(question, userAnswer) {
    var correct = userAnswer === question.answer;
    return {
      correct: correct,
      expectedForResults: String(question.answer),
      userForResults:
        userAnswer === null || userAnswer === undefined ? "" : String(userAnswer),
      expectedDisplay: question.options[question.answer],
    };
  }

  // ---- read_choose ----
  register("read_choose", {
    render: function (question, container, ctx) {
      renderChoiceQuestion(question, container, ctx, { display: question.display });
    },
    collectAnswer: collectChoiceAnswer,
    grade: gradeChoiceAnswer,
  });

  // ---- listen_choose ----
  register("listen_choose", {
    render: function (question, container, ctx) {
      renderChoiceQuestion(question, container, ctx, { audio: question.audio });
    },
    collectAnswer: collectChoiceAnswer,
    grade: gradeChoiceAnswer,
  });

  // ---- listen_fill ----
  register("listen_fill", {
    render: function (question, container, ctx) {
      renderChoiceQuestion(question, container, ctx, {
        display: question.display,
        audio: question.audio,
      });
    },
    collectAnswer: collectChoiceAnswer,
    grade: gradeChoiceAnswer,
  });

  // ---- minimal_pair ----
  register("minimal_pair", {
    render: function (question, container, ctx) {
      container.__selected = null;

      var promptEl = Utils.el("p", { class: "question-prompt" });
      Furigana.renderFuriganaInto(promptEl, question.prompt, { bold: true });
      container.appendChild(promptEl);

      var pairWrap = Utils.el("div", { class: "pair-wrap" });
      ["a", "b"].forEach(function (key) {
        var block = Utils.el("div", { class: "pair-item" });
        block.appendChild(Utils.el("p", { class: "pair-label", text: key.toUpperCase() }));
        ctx.renderAudioControls(block, question.pair[key]);
        pairWrap.appendChild(block);
      });
      container.appendChild(pairWrap);

      var answerWrap = Utils.el("div", { class: "options-list" });
      ["a", "b"].forEach(function (key) {
        var btn = Utils.el("button", {
          class: "option-btn",
          type: "button",
          text: "Es " + key.toUpperCase(),
        });
        btn.addEventListener("click", function () {
          Utils.qsa(".option-btn", answerWrap).forEach(function (b) {
            b.classList.remove("selected");
          });
          btn.classList.add("selected");
          container.__selected = key;
          ctx.onSelectionChange(true);
        });
        answerWrap.appendChild(btn);
      });
      container.appendChild(answerWrap);
    },
    collectAnswer: function (container) {
      return container.__selected;
    },
    grade: function (question, userAnswer) {
      var correct = userAnswer === question.answer;
      var correctText = question.pair[question.answer].text;
      return {
        correct: correct,
        expectedForResults: question.answer,
        userForResults: userAnswer || "",
        expectedDisplay:
          question.answer.toUpperCase() + " (" + Furigana.stripFurigana(correctText) + ")",
      };
    },
  });

  // ---- listen_dictation ----
  register("listen_dictation", {
    render: function (question, container, ctx) {
      var promptEl = Utils.el("p", { class: "question-prompt" });
      Furigana.renderFuriganaInto(promptEl, question.prompt, { bold: true });
      container.appendChild(promptEl);

      ctx.renderAudioControls(container, question.audio);

      var input = Utils.el("input", {
        type: "text",
        lang: "ja",
        autocomplete: "off",
        class: "dictation-input",
      });
      input.addEventListener("input", function () {
        ctx.onSelectionChange(input.value.trim().length > 0);
      });
      container.appendChild(input);
      container.__input = input;
      // Foco automático para agilizar el dictado.
      setTimeout(function () {
        input.focus();
      }, 0);
    },
    collectAnswer: function (container) {
      return container.__input.value;
    },
    grade: function (question, userAnswer, ctx) {
      var tolerance = (ctx.meta && ctx.meta.dictation_tolerance) || 0;
      var correct = App.Romaji.matchesAnswer(
        userAnswer,
        question.answer.kana,
        question.answer.accept || [],
        { tolerance: tolerance }
      );
      return {
        correct: correct,
        expectedForResults: question.answer.kana,
        userForResults: userAnswer,
        expectedDisplay: question.answer.kana,
      };
    },
  });

  // ---- speak ----
  register("speak", {
    render: function (question, container, ctx) {
      container.__attempts = 0;
      container.__correct = null;
      container.__gradedBy = null;
      container.__alternatives = [];
      container.__transcription = "";

      var promptEl = Utils.el("p", { class: "question-prompt" });
      Furigana.renderFuriganaInto(promptEl, question.prompt, { bold: true });
      container.appendChild(promptEl);

      if (question.audio) {
        ctx.renderAudioControls(container, question.audio);
      }

      var micWrap = Utils.el("div", { class: "speak-controls" });
      var statusEl = Utils.el("p", { class: "speak-status" });
      var transcriptionEl = Utils.el("p", { class: "speak-transcription" });
      var revealWrap = Utils.el("div", { class: "speak-reveal hidden" });
      var maxAttempts = (ctx.meta && ctx.meta.speak_attempts) || 3;

      function reveal() {
        revealWrap.classList.remove("hidden");
        Utils.clear(revealWrap);

        var expectedEl = Utils.el("p", { class: "speak-expected" });
        Furigana.renderFuriganaInto(expectedEl, question.expected.display || question.expected.kana);
        revealWrap.appendChild(expectedEl);

        var modelWrap = Utils.el("div");
        revealWrap.appendChild(modelWrap);
        ctx.renderAudioControls(modelWrap, question.model_audio);

        var selfGradeWrap = Utils.el("div", { class: "self-grade" });
        var okBtn = Utils.el("button", { type: "button", class: "btn-self-ok", text: "✔ Lo dije bien" });
        var badBtn = Utils.el("button", { type: "button", class: "btn-self-bad", text: "✘ Lo dije mal" });
        okBtn.addEventListener("click", function () {
          container.__correct = true;
          container.__gradedBy = "self";
          okBtn.classList.add("selected");
          badBtn.classList.remove("selected");
          ctx.onSelectionChange(true);
        });
        badBtn.addEventListener("click", function () {
          container.__correct = false;
          container.__gradedBy = "self";
          badBtn.classList.add("selected");
          okBtn.classList.remove("selected");
          ctx.onSelectionChange(true);
        });
        selfGradeWrap.appendChild(okBtn);
        selfGradeWrap.appendChild(badBtn);
        revealWrap.appendChild(selfGradeWrap);

        if (container.__attempts < maxAttempts && App.STT.isAvailable()) {
          var retryBtn = Utils.el("button", {
            type: "button",
            class: "btn-retry",
            text: "Intentar de nuevo (" + (maxAttempts - container.__attempts) + " restantes)",
          });
          retryBtn.addEventListener("click", function () {
            revealWrap.classList.add("hidden");
            statusEl.textContent = "";
            transcriptionEl.textContent = "";
            ctx.onSelectionChange(container.__correct !== null);
          });
          revealWrap.appendChild(retryBtn);
        }
      }

      if (App.STT.isAvailable()) {
        var micBtn = Utils.el("button", {
          type: "button",
          class: "btn-mic",
          text: "🎤 Mantener para hablar",
        });
        var recognizer = null;
        var startListening = function () {
          if (container.__attempts >= maxAttempts) return;
          statusEl.textContent = "Escuchando...";
          recognizer = App.STT.createRecognizer({
            onResult: function (alternatives) {
              container.__attempts += 1;
              container.__alternatives = alternatives;
              container.__transcription = alternatives[0] || "";
              transcriptionEl.textContent = "Se entendió: " + alternatives.join(" / ");
              var matched = alternatives.some(function (alt) {
                return App.Romaji.matchesAnswer(alt, question.expected.kana, question.expected.accept || []);
              });
              container.__correct = matched;
              container.__gradedBy = "auto";
              statusEl.textContent = "";
              reveal();
            },
            onError: function () {
              statusEl.textContent = "No se pudo escuchar. Puedes autocalificarte.";
              container.__attempts += 1;
              reveal();
            },
            onEnd: function () {},
          });
          if (recognizer) recognizer.start();
        };
        var stopListening = function () {
          if (recognizer) recognizer.stop();
        };
        micBtn.addEventListener("pointerdown", startListening);
        micBtn.addEventListener("pointerup", stopListening);
        micBtn.addEventListener("pointercancel", stopListening);
        micWrap.appendChild(micBtn);
      } else {
        statusEl.textContent = "Di la frase en voz alta y luego califícate.";
        reveal();
      }

      container.appendChild(micWrap);
      container.appendChild(statusEl);
      container.appendChild(transcriptionEl);
      container.appendChild(revealWrap);
    },
    collectAnswer: function (container) {
      return {
        correct: container.__correct,
        gradedBy: container.__gradedBy,
        alternatives: container.__alternatives,
        transcription: container.__transcription,
        attempts: container.__attempts,
      };
    },
    grade: function (question, userAnswer) {
      return {
        correct: !!userAnswer.correct,
        expectedForResults: question.expected.kana,
        userForResults: userAnswer.transcription || "",
        expectedDisplay: question.expected.display || question.expected.kana,
        extra: {
          stt_alternatives: userAnswer.alternatives,
          graded_by: userAnswer.gradedBy || "self",
          attempts: userAnswer.attempts,
        },
      };
    },
  });

  return {
    register: register,
    get: get,
  };
})();
