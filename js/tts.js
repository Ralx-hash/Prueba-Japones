window.App = window.App || {};

App.TTS = (function () {
  var voices = [];
  var selectedVoice = null;
  var readyCallbacks = [];
  var ready = false;

  function notifyReady() {
    ready = true;
    var callbacks = readyCallbacks;
    readyCallbacks = [];
    callbacks.forEach(function (cb) {
      cb();
    });
  }

  function refreshVoices() {
    voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (voices.length > 0) {
      notifyReady();
    }
  }

  function initVoices() {
    if (!window.speechSynthesis) {
      notifyReady();
      return;
    }
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    // Algunos navegadores nunca disparan voiceschanged si ya había voces
    // o si no hay ninguna instalada: forzar resolución tras un tiempo corto.
    setTimeout(function () {
      if (!ready) notifyReady();
    }, 1000);
  }

  function onVoicesReady(callback) {
    if (ready) callback();
    else readyCallbacks.push(callback);
  }

  function getJapaneseVoices() {
    return voices.filter(function (v) {
      return v.lang && v.lang.toLowerCase().indexOf("ja") === 0;
    });
  }

  function pickVoice(preferenceList) {
    var jaVoices = getJapaneseVoices();
    if (preferenceList && preferenceList.length) {
      for (var i = 0; i < preferenceList.length; i++) {
        var pref = preferenceList[i];
        var match = jaVoices.find(function (v) {
          return v.name.indexOf(pref) !== -1;
        });
        if (match) {
          selectedVoice = match;
          return selectedVoice;
        }
      }
    }
    selectedVoice = jaVoices.length ? jaVoices[0] : null;
    return selectedVoice;
  }

  function setVoice(voice) {
    selectedVoice = voice || null;
  }

  function getSelectedVoice() {
    return selectedVoice;
  }

  function isDegraded() {
    return !selectedVoice;
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!window.speechSynthesis) {
      if (opts.onEnd) opts.onEnd();
      return;
    }
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = opts.rate || 1;
    if (opts.onEnd) utterance.addEventListener("end", opts.onEnd);
    if (opts.onStart) utterance.addEventListener("start", opts.onStart);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return {
    initVoices: initVoices,
    onVoicesReady: onVoicesReady,
    getJapaneseVoices: getJapaneseVoices,
    pickVoice: pickVoice,
    setVoice: setVoice,
    getSelectedVoice: getSelectedVoice,
    isDegraded: isDegraded,
    speak: speak,
  };
})();
