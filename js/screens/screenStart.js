window.App = window.App || {};
App.Screens = App.Screens || {};

App.Screens.Start = (function () {
  var Utils = App.Utils;

  function mount(container, callbacks) {
    Utils.clear(container);

    container.appendChild(Utils.el("h1", { text: "Pruebas de japonés auditivo" }));

    var dropZone = Utils.el("div", { class: "drop-zone" });
    dropZone.appendChild(
      Utils.el("p", { text: "Arrastra aquí el archivo JSON de la prueba, o:" })
    );
    var fileInput = Utils.el("input", { type: "file", accept: ".json,application/json" });
    dropZone.appendChild(fileInput);
    container.appendChild(dropZone);

    var errorsEl = Utils.el("div", { class: "errors" });
    container.appendChild(errorsEl);

    var summaryEl = Utils.el("div", { class: "test-summary hidden" });
    container.appendChild(summaryEl);

    var voiceSection = Utils.el("div", { class: "voice-section hidden" });
    container.appendChild(voiceSection);

    var micSection = Utils.el("div", { class: "mic-section hidden" });
    container.appendChild(micSection);

    var progressSection = Utils.el("div", { class: "progress-section hidden" });
    container.appendChild(progressSection);

    var startBtn = Utils.el("button", {
      type: "button",
      text: "Comenzar",
      disabled: true,
      class: "btn-start",
    });
    container.appendChild(startBtn);

    function handleFile(file) {
      var reader = new FileReader();
      reader.onload = function () {
        var json;
        try {
          json = JSON.parse(reader.result);
        } catch (e) {
          showErrors(["El archivo no es JSON válido: " + e.message]);
          return;
        }
        var result = App.Validator.validateTest(json);
        if (!result.valid) {
          showErrors(result.errors);
          return;
        }
        loadTest(json);
      };
      reader.onerror = function () {
        showErrors(["No se pudo leer el archivo."]);
      };
      reader.readAsText(file);
    }

    function showErrors(errors) {
      Utils.clear(errorsEl);
      summaryEl.classList.add("hidden");
      voiceSection.classList.add("hidden");
      micSection.classList.add("hidden");
      progressSection.classList.add("hidden");
      startBtn.disabled = true;
      var list = Utils.el("ul", { class: "error-list" });
      errors.forEach(function (e) {
        list.appendChild(Utils.el("li", { text: e }));
      });
      errorsEl.appendChild(list);
    }

    function loadTest(test) {
      Utils.clear(errorsEl);
      renderSummary(test);
      setupVoice(test);
      setupMic();
      setupProgress(test);
    }

    function renderSummary(test) {
      Utils.clear(summaryEl);
      summaryEl.classList.remove("hidden");
      var totalQuestions = 0;
      var totalPoints = 0;
      test.sections.forEach(function (s) {
        s.questions.forEach(function (q) {
          totalQuestions += 1;
          totalPoints += typeof q.points === "number" ? q.points : 1;
        });
      });
      summaryEl.appendChild(Utils.el("h2", { text: test.meta.title }));
      if (test.meta.description) {
        summaryEl.appendChild(Utils.el("p", { text: test.meta.description }));
      }
      summaryEl.appendChild(
        Utils.el("p", {
          text:
            test.sections.length +
            " secciones, " +
            totalQuestions +
            " preguntas, puntaje máximo " +
            totalPoints,
        })
      );

      var results = App.Storage.listResults(test.meta.id);
      if (results.length) {
        summaryEl.appendChild(Utils.el("h3", { text: "Intentos previos" }));
        var list = Utils.el("ul", { class: "previous-results" });
        results.forEach(function (r) {
          list.appendChild(
            Utils.el("li", {
              text:
                (r.finished_at || "") +
                " — " +
                r.pct +
                "% " +
                (r.passed ? "(aprobado)" : "(no aprobado)"),
            })
          );
        });
        summaryEl.appendChild(list);
      }
    }

    function setupVoice(test) {
      Utils.clear(voiceSection);
      voiceSection.classList.remove("hidden");
      var label = Utils.el("label", { text: "Voz japonesa: " });
      var select = Utils.el("select");
      var testBtn = Utils.el("button", { type: "button", text: "Probar voz" });
      var warning = Utils.el("p", {
        class: "voice-warning hidden",
        text: "No hay voz en japonés instalada. Instala una voz ja-JP en el sistema. La prueba seguirá funcionando mostrando el texto en lugar del audio.",
      });

      function populate() {
        Utils.clear(select);
        var voices = App.TTS.getJapaneseVoices();
        if (!voices.length) {
          warning.classList.remove("hidden");
          testBtn.disabled = true;
          return;
        }
        warning.classList.add("hidden");
        testBtn.disabled = false;
        voices.forEach(function (v, i) {
          select.appendChild(Utils.el("option", { value: String(i), text: v.name + " (" + v.lang + ")" }));
        });
        var picked = App.TTS.pickVoice(test.meta.voice_preference);
        var pickedIndex = voices.indexOf(picked);
        if (pickedIndex >= 0) select.value = String(pickedIndex);
        select.addEventListener("change", function () {
          App.TTS.setVoice(voices[Number(select.value)]);
        });
      }

      App.TTS.onVoicesReady(populate);
      testBtn.addEventListener("click", function () {
        App.TTS.speak("こんにちは", { rate: test.meta.default_rate || 1 });
      });

      voiceSection.appendChild(label);
      voiceSection.appendChild(select);
      voiceSection.appendChild(testBtn);
      voiceSection.appendChild(warning);
    }

    function setupMic() {
      Utils.clear(micSection);
      micSection.classList.remove("hidden");
      var available = App.STT.isAvailable();
      micSection.appendChild(
        Utils.el("span", {
          text: available
            ? "Micrófono disponible."
            : "Reconocimiento de voz no disponible en este navegador: se usará autocalificación.",
        })
      );
      if (available) {
        var testMicBtn = Utils.el("button", { type: "button", text: "Probar micrófono" });
        var resultEl = Utils.el("span", { class: "mic-test-result" });
        testMicBtn.addEventListener("click", function () {
          resultEl.textContent = " Escuchando...";
          var recognizer = App.STT.createRecognizer({
            onResult: function (alts) {
              resultEl.textContent = " Se entendió: " + alts.join(" / ");
            },
            onError: function (err) {
              resultEl.textContent = " Error: " + err;
            },
          });
          recognizer.start();
        });
        micSection.appendChild(testMicBtn);
        micSection.appendChild(resultEl);
      }
    }

    function setupProgress(test) {
      Utils.clear(progressSection);
      var progress = App.Storage.loadProgress(test.meta.id);
      startBtn.disabled = false;
      if (!progress) {
        progressSection.classList.add("hidden");
        startBtn.textContent = "Comenzar";
        startBtn.onclick = function () {
          callbacks.onStart(test, {});
        };
        return;
      }
      progressSection.classList.remove("hidden");
      progressSection.appendChild(Utils.el("p", { text: "Hay un intento en curso para esta prueba." }));
      var continueBtn = Utils.el("button", { type: "button", text: "Continuar" });
      var restartBtn = Utils.el("button", { type: "button", text: "Empezar de nuevo" });
      continueBtn.addEventListener("click", function () {
        callbacks.onStart(test, { resume: true });
      });
      restartBtn.addEventListener("click", function () {
        App.Storage.clearProgress(test.meta.id);
        setupProgress(test);
      });
      progressSection.appendChild(continueBtn);
      progressSection.appendChild(restartBtn);
      startBtn.textContent = "Comenzar de todos modos";
      startBtn.onclick = function () {
        callbacks.onStart(test, {});
      };
    }

    fileInput.addEventListener("change", function () {
      if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });
    dropZone.addEventListener("dragover", function (e) {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", function () {
      dropZone.classList.remove("dragover");
    });
    dropZone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  }

  return { mount: mount };
})();
