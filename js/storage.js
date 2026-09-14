window.App = window.App || {};

App.Storage = (function () {
  function progressKey(testId) {
    return "progress:" + testId;
  }

  function saveProgress(testId, state) {
    try {
      localStorage.setItem(progressKey(testId), JSON.stringify(state));
    } catch (e) {
      // localStorage puede no estar disponible (modo privado, cuota, etc.)
    }
  }

  function loadProgress(testId) {
    try {
      var raw = localStorage.getItem(progressKey(testId));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearProgress(testId) {
    try {
      localStorage.removeItem(progressKey(testId));
    } catch (e) {
      // ignorar
    }
  }

  function resultKeyPrefix(testId) {
    return "results:" + testId + ":";
  }

  function resultKey(testId, timestamp) {
    return resultKeyPrefix(testId) + timestamp;
  }

  function saveResult(testId, resultObject) {
    var timestamp = resultObject.finished_at || new Date().toISOString();
    var key = resultKey(testId, timestamp);
    try {
      localStorage.setItem(key, JSON.stringify(resultObject));
    } catch (e) {
      // ignorar
    }
    return key;
  }

  function listResults(testId) {
    var prefix = resultKeyPrefix(testId);
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(prefix) === 0) {
          try {
            var data = JSON.parse(localStorage.getItem(key));
            out.push({
              key: key,
              finished_at: data.finished_at,
              pct: data.score ? data.score.pct : null,
              passed: data.score ? data.score.passed : null,
            });
          } catch (e) {
            // entrada corrupta, ignorar
          }
        }
      }
    } catch (e) {
      // localStorage no disponible
    }
    out.sort(function (a, b) {
      return (a.finished_at || "") < (b.finished_at || "") ? 1 : -1;
    });
    return out;
  }

  return {
    saveProgress: saveProgress,
    loadProgress: loadProgress,
    clearProgress: clearProgress,
    saveResult: saveResult,
    listResults: listResults,
  };
})();
