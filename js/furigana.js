window.App = window.App || {};

// Motor de furigana. Markup: {漢字|ふりがな} -> <ruby>漢字<rt>ふりがな</rt></ruby>
// Este es el UNICO módulo que debe producir HTML a partir de texto con markup;
// todo prompt/display/options/explanation debe pasar por renderFuriganaHTML.
App.Furigana = (function () {
  var FURIGANA_RE = /\{([^{}|]+)\|([^{}|]+)\}/g;

  function parseFurigana(str) {
    str = String(str || "");
    var tokens = [];
    var lastIndex = 0;
    var match;
    FURIGANA_RE.lastIndex = 0;
    while ((match = FURIGANA_RE.exec(str))) {
      if (match.index > lastIndex) {
        tokens.push({ type: "text", value: str.slice(lastIndex, match.index) });
      }
      tokens.push({ type: "ruby", kanji: match[1], reading: match[2] });
      lastIndex = FURIGANA_RE.lastIndex;
    }
    if (lastIndex < str.length) {
      tokens.push({ type: "text", value: str.slice(lastIndex) });
    }
    return tokens;
  }

  // opts.bold = true -> procesa **negritas** dentro de los segmentos de texto plano.
  function renderFuriganaHTML(str, opts) {
    opts = opts || {};
    var tokens = parseFurigana(str);
    return tokens
      .map(function (tok) {
        if (tok.type === "ruby") {
          return (
            "<ruby>" +
            App.Utils.escapeHtml(tok.kanji) +
            "<rt>" +
            App.Utils.escapeHtml(tok.reading) +
            "</rt></ruby>"
          );
        }
        return opts.bold
          ? App.Utils.renderBoldMarkdownEscaped(tok.value)
          : App.Utils.escapeHtml(tok.value);
      })
      .join("");
  }

  function renderFuriganaInto(node, str, opts) {
    node.innerHTML = renderFuriganaHTML(str, opts);
  }

  // Quita el markup dejando la parte ANTES de "|" (el kanji/texto visible).
  function stripFurigana(str) {
    return String(str || "").replace(FURIGANA_RE, "$1");
  }

  // Quita el markup dejando la parte DESPUÉS de "|" (la lectura). Usado para
  // normalizar respuestas antes de comparar (spec §5.1).
  function toReading(str) {
    return String(str || "").replace(FURIGANA_RE, "$2");
  }

  return {
    parseFurigana: parseFurigana,
    renderFuriganaHTML: renderFuriganaHTML,
    renderFuriganaInto: renderFuriganaInto,
    stripFurigana: stripFurigana,
    toReading: toReading,
  };
})();
