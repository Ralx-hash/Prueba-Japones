(function () {
  function showScreen(name) {
    ["start", "test", "results"].forEach(function (n) {
      var el = document.getElementById("screen-" + n);
      if (n === name) el.classList.remove("hidden");
      else el.classList.add("hidden");
    });
  }

  function mountStart() {
    showScreen("start");
    App.Screens.Start.mount(document.getElementById("screen-start"), {
      onStart: startTest,
    });
  }

  function startTest(test, opts) {
    showScreen("test");
    App.Screens.Test.mount(document.getElementById("screen-test"), test, opts, {
      onFinished: function (resultObject) {
        App.Storage.clearProgress(test.meta.id);
        App.Storage.saveResult(test.meta.id, resultObject);
        showResults(test, resultObject);
      },
    });
  }

  function showResults(test, resultObject) {
    showScreen("results");
    App.Screens.Results.mount(document.getElementById("screen-results"), test, resultObject, {
      onRestart: mountStart,
      onRetryFailed: function (retryTest) {
        startTest(retryTest, {});
      },
    });
  }

  function init() {
    App.TTS.initVoices();
    mountStart();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
