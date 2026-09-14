window.App = window.App || {};

App.STT = (function () {
  function getRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function isAvailable() {
    return !!getRecognitionCtor();
  }

  // opts: { onResult(alternatives: string[]), onError(err), onEnd() }
  function createRecognizer(opts) {
    opts = opts || {};
    var Ctor = getRecognitionCtor();
    if (!Ctor) return null;

    var recognizer = new Ctor();
    recognizer.lang = "ja-JP";
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 3;

    recognizer.addEventListener("result", function (event) {
      var result = event.results[0];
      var alternatives = [];
      for (var i = 0; i < result.length; i++) {
        alternatives.push(result[i].transcript);
      }
      if (opts.onResult) opts.onResult(alternatives);
    });
    recognizer.addEventListener("error", function (event) {
      if (opts.onError) opts.onError(event.error);
    });
    recognizer.addEventListener("end", function () {
      if (opts.onEnd) opts.onEnd();
    });

    return {
      start: function () {
        recognizer.start();
      },
      stop: function () {
        recognizer.stop();
      },
    };
  }

  return {
    isAvailable: isAvailable,
    createRecognizer: createRecognizer,
  };
})();
