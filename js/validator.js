window.App = window.App || {};

App.Validator = (function () {
  var VALID_TYPES = [
    "listen_choose",
    "listen_dictation",
    "listen_fill",
    "minimal_pair",
    "speak",
    "read_choose",
  ];

  function collectAudioTexts(q) {
    var texts = [];
    if (q.audio) texts.push({ label: "audio.text", value: q.audio.text });
    if (q.pair) {
      if (q.pair.a) texts.push({ label: "pair.a.text", value: q.pair.a.text });
      if (q.pair.b) texts.push({ label: "pair.b.text", value: q.pair.b.text });
    }
    if (q.model_audio) texts.push({ label: "model_audio.text", value: q.model_audio.text });
    return texts;
  }

  function errorsForQuestion(q, sectionId) {
    var errors = [];
    var ref = "sección \"" + sectionId + "\", pregunta " + (q && q.id ? "\"" + q.id + "\"" : "(sin id)");

    if (!q.id) {
      errors.push(ref + ": falta \"id\".");
    }
    if (!q.type || VALID_TYPES.indexOf(q.type) === -1) {
      errors.push(ref + ": \"type\" inválido o ausente (" + q.type + ").");
      return errors; // sin type válido no podemos validar reglas específicas
    }
    if (!q.prompt) {
      errors.push(ref + ": falta \"prompt\".");
    }

    if (["listen_choose", "listen_fill", "read_choose"].indexOf(q.type) !== -1) {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(ref + ": \"options\" debe tener al menos 2 elementos.");
      }
      if (
        typeof q.answer !== "number" ||
        !Array.isArray(q.options) ||
        q.answer < 0 ||
        q.answer >= q.options.length
      ) {
        errors.push(ref + ": \"answer\" no es un índice válido dentro de \"options\".");
      }
    }

    if (q.type === "listen_dictation") {
      if (!q.answer || !q.answer.kana) {
        errors.push(ref + ": falta \"answer.kana\".");
      }
    }

    if (q.type === "minimal_pair") {
      if (!q.pair || !q.pair.a || !q.pair.a.text) {
        errors.push(ref + ": falta \"pair.a.text\".");
      }
      if (!q.pair || !q.pair.b || !q.pair.b.text) {
        errors.push(ref + ": falta \"pair.b.text\".");
      }
      if (q.answer !== "a" && q.answer !== "b") {
        errors.push(ref + ": \"answer\" debe ser \"a\" o \"b\".");
      }
    }

    if (q.type === "speak") {
      if (!q.expected || !q.expected.kana) {
        errors.push(ref + ": falta \"expected.kana\".");
      }
      if (!q.model_audio || !q.model_audio.text) {
        errors.push(ref + ": falta \"model_audio.text\".");
      }
    }

    collectAudioTexts(q).forEach(function (item) {
      if (!item.value) {
        errors.push(ref + ": \"" + item.label + "\" no puede estar vacío.");
      }
    });

    return errors;
  }

  function validateTest(data) {
    var errors = [];

    if (!data || typeof data !== "object") {
      return { valid: false, errors: ["El archivo no contiene un objeto JSON válido."] };
    }
    if (!data.meta || !data.meta.id) {
      errors.push("Falta \"meta.id\".");
    }
    if (!data.meta || !data.meta.title) {
      errors.push("Falta \"meta.title\".");
    }
    if (!Array.isArray(data.sections) || data.sections.length === 0) {
      errors.push("\"sections\" debe ser un array con al menos una sección.");
      return { valid: errors.length === 0, errors: errors };
    }

    var seenIds = {};
    data.sections.forEach(function (section) {
      var sectionId = section.id || "(sin id)";
      if (!Array.isArray(section.questions)) {
        errors.push("Sección \"" + sectionId + "\": falta \"questions\" (array).");
        return;
      }
      section.questions.forEach(function (q) {
        if (q.id) {
          if (seenIds[q.id]) {
            errors.push("id de pregunta duplicado: \"" + q.id + "\".");
          }
          seenIds[q.id] = true;
        }
        errors = errors.concat(errorsForQuestion(q, sectionId));
      });
    });

    return { valid: errors.length === 0, errors: errors };
  }

  return {
    validateTest: validateTest,
    VALID_TYPES: VALID_TYPES,
  };
})();
