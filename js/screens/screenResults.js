window.App = window.App || {};
App.Screens = App.Screens || {};

App.Screens.Results = (function () {
  var Utils = App.Utils;
  var Furigana = App.Furigana;

  function buildTable(headers, rows) {
    var table = Utils.el("table", { class: "results-table" });
    var thead = Utils.el("thead");
    var headerRow = Utils.el("tr");
    headers.forEach(function (h) {
      headerRow.appendChild(Utils.el("th", { text: h }));
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    var tbody = Utils.el("tbody");
    rows.forEach(function (row) {
      var tr = Utils.el("tr");
      row.forEach(function (cell) {
        tr.appendChild(Utils.el("td", { text: cell }));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  function mount(container, test, resultObject, callbacks) {
    Utils.clear(container);
    var meta = test.meta;

    container.appendChild(Utils.el("h1", { text: "Resultados" }));
    container.appendChild(
      Utils.el("p", {
        class: "score-summary",
        text:
          resultObject.score.points +
          " / " +
          resultObject.score.max +
          " puntos (" +
          resultObject.score.pct +
          "%) — " +
          (resultObject.score.passed ? "Aprobado" : "No aprobado"),
      })
    );

    container.appendChild(Utils.el("h2", { text: "Por sección" }));
    container.appendChild(
      buildTable(
        ["Sección", "Correctas", "Total", "%"],
        Object.keys(resultObject.by_section).map(function (k) {
          var s = resultObject.by_section[k];
          return [k, String(s.correct), String(s.total), s.pct + "%"];
        })
      )
    );

    container.appendChild(Utils.el("h2", { text: "Por etiqueta (de peor a mejor)" }));
    var tagEntries = App.Scoring.sortedTagEntries(resultObject.by_tag);
    container.appendChild(
      buildTable(
        ["Etiqueta", "Correctas", "Total", "%"],
        tagEntries.map(function (e) {
          return [e.tag, String(e.stats.correct), String(e.stats.total), e.stats.pct + "%"];
        })
      )
    );

    container.appendChild(Utils.el("h2", { text: "Preguntas falladas" }));
    var failed = resultObject.answers.filter(function (a) {
      return !a.correct;
    });
    var questionsById = {};
    test.sections.forEach(function (s) {
      s.questions.forEach(function (q) {
        questionsById[q.id] = q;
      });
    });

    if (!failed.length) {
      container.appendChild(Utils.el("p", { text: "¡Ninguna! Buen trabajo." }));
    } else {
      var failedList = Utils.el("div", { class: "failed-list" });
      failed.forEach(function (a) {
        var q = questionsById[a.id];
        var item = Utils.el("div", { class: "failed-item" });
        var promptEl = Utils.el("p", { class: "failed-prompt" });
        Furigana.renderFuriganaInto(promptEl, q ? q.prompt : a.id, { bold: true });
        item.appendChild(promptEl);
        if (q && q.explanation) {
          var explEl = Utils.el("p", { class: "failed-explanation" });
          Furigana.renderFuriganaInto(explEl, q.explanation, { bold: true });
          item.appendChild(explEl);
        }
        if (q && q.source) {
          item.appendChild(Utils.el("p", { class: "failed-source", text: "Fuente: " + q.source }));
        }
        failedList.appendChild(item);
      });
      container.appendChild(failedList);
    }

    var actions = Utils.el("div", { class: "results-actions" });
    var copyBtn = Utils.el("button", { type: "button", text: "Copiar resultados (JSON)" });
    var downloadBtn = Utils.el("button", { type: "button", text: "Descargar resultados (.json)" });
    var retryBtn = Utils.el("button", {
      type: "button",
      text: "Repetir solo las falladas",
      disabled: !failed.length,
    });
    var homeBtn = Utils.el("button", { type: "button", text: "Volver al inicio" });

    copyBtn.addEventListener("click", function () {
      var text = JSON.stringify(resultObject, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    });
    downloadBtn.addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(resultObject, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = Utils.el("a", { href: url, download: (meta.id || "resultados") + ".json" });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    retryBtn.addEventListener("click", function () {
      if (!failed.length) return;
      var failedIds = {};
      failed.forEach(function (a) {
        failedIds[a.id] = true;
      });
      var failedQuestions = [];
      test.sections.forEach(function (s) {
        s.questions.forEach(function (q) {
          if (failedIds[q.id]) failedQuestions.push(q);
        });
      });
      var retryMeta = {};
      Object.keys(meta).forEach(function (k) {
        retryMeta[k] = meta[k];
      });
      retryMeta.id = meta.id + ":retry:" + Date.now();
      var retryTest = {
        meta: retryMeta,
        sections: [
          {
            id: "retry",
            title: "Repaso de falladas",
            intro: "Repite solo las preguntas que fallaste.",
            questions: failedQuestions,
          },
        ],
      };
      callbacks.onRetryFailed(retryTest);
    });
    homeBtn.addEventListener("click", function () {
      callbacks.onRestart();
    });

    actions.appendChild(copyBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(retryBtn);
    actions.appendChild(homeBtn);
    container.appendChild(actions);
  }

  return { mount: mount };
})();
