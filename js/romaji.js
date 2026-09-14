window.App = window.App || {};

// Conversión rōmaji (Hepburn) <-> hiragana, katakana -> hiragana, y comparación
// normalizada de respuestas (spec §5).
App.Romaji = (function () {
  // Tabla de moras, de más larga a más corta (maximal munch).
  var SYLLABLES_3 = {
    kya: "きゃ", kyu: "きゅ", kyo: "きょ",
    gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
    sha: "しゃ", shu: "しゅ", sho: "しょ",
    sya: "しゃ", syu: "しゅ", syo: "しょ",
    jya: "じゃ", jyu: "じゅ", jyo: "じょ",
    zya: "じゃ", zyu: "じゅ", zyo: "じょ",
    cha: "ちゃ", chu: "ちゅ", cho: "ちょ",
    tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
    nya: "にゃ", nyu: "にゅ", nyo: "にょ",
    hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
    bya: "びゃ", byu: "びゅ", byo: "びょ",
    pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
    mya: "みゃ", myu: "みゅ", myo: "みょ",
    rya: "りゃ", ryu: "りゅ", ryo: "りょ",
    dya: "ぢゃ", dyu: "ぢゅ", dyo: "ぢょ",
  };

  var SYLLABLES_2 = {
    ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
    ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
    sa: "さ", shi: "し", su: "す", se: "せ", so: "そ", si: "し",
    za: "ざ", ji: "じ", zu: "ず", ze: "ぜ", zo: "ぞ", zi: "じ",
    ta: "た", chi: "ち", tsu: "つ", te: "て", to: "と", ti: "ち", tu: "つ",
    da: "だ", di: "ぢ", du: "づ", de: "で", "do": "ど",
    na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
    ha: "は", hi: "ひ", fu: "ふ", he: "へ", ho: "ほ", hu: "ふ",
    ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
    pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
    ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
    ya: "や", yu: "ゆ", yo: "よ",
    ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
    wa: "わ", wo: "を",
    ja: "じゃ", ju: "じゅ", jo: "じょ",
  };

  var SYLLABLES_1 = {
    a: "あ", i: "い", u: "う", e: "え", o: "お",
    n: "ん",
  };

  var CONSONANTS = "bcdfghjkmprstwyz"; // sin 'n' (se maneja aparte)

  var MACRON_VARIANTS = {
    "ō": ["ou", "oo"],
    "ū": ["uu"],
    "ā": ["aa"],
    "ī": ["ii"],
    "ē": ["ee", "ei"],
  };

  function katakanaToHiragana(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code >= 0x30a1 && code <= 0x30f6) {
        out += String.fromCharCode(code - 0x60);
      } else {
        out += str[i];
      }
    }
    return out;
  }

  function expandMacronVariants(str) {
    var results = [""];
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var repls = MACRON_VARIANTS[ch];
      if (repls) {
        var next = [];
        results.forEach(function (prefix) {
          repls.forEach(function (r) {
            next.push(prefix + r);
          });
        });
        results = next;
      } else {
        results = results.map(function (prefix) {
          return prefix + ch;
        });
      }
    }
    return results;
  }

  // Convierte una cadena de rōmaji plano (sin macrones, minúsculas) a hiragana.
  function convertPlainRomajiToHiragana(str) {
    var out = "";
    var i = 0;
    while (i < str.length) {
      var ch = str[i];

      if (ch === "'" || ch === "-") {
        i += 1;
        continue;
      }

      // Sokuon por consonante duplicada (excepto n).
      if (
        CONSONANTS.indexOf(ch) !== -1 &&
        str[i + 1] === ch
      ) {
        out += "っ";
        i += 1;
        continue;
      }
      // Caso especial "tch" -> っち
      if (str.substr(i, 3) === "tch") {
        out += "っ";
        i += 1;
        continue;
      }

      var three = str.substr(i, 3);
      if (SYLLABLES_3[three]) {
        out += SYLLABLES_3[three];
        i += 3;
        continue;
      }
      var two = str.substr(i, 2);
      if (SYLLABLES_2[two]) {
        out += SYLLABLES_2[two];
        i += 2;
        continue;
      }
      var one = str[i];
      if (SYLLABLES_1[one]) {
        out += SYLLABLES_1[one];
        i += 1;
        continue;
      }
      // Carácter desconocido (espacio, dígito, etc.): se descarta.
      i += 1;
    }
    return out;
  }

  function romajiToHiraganaVariants(str) {
    var macronVariants = expandMacronVariants(String(str || "").toLowerCase());
    var seen = {};
    var out = [];
    macronVariants.forEach(function (variant) {
      var kana = convertPlainRomajiToHiragana(variant);
      if (!seen[kana]) {
        seen[kana] = true;
        out.push(kana);
      }
    });
    return out;
  }

  function stripPunctuationKeepRomajiMarks(str) {
    // Quita puntuación española/japonesa y espacios, pero conserva ' y -
    // porque el conversor de rōmaji los necesita (ん explícito / vocal larga).
    return String(str || "").replace(/[。、！？!?.,「」"\s]/g, "");
  }

  function hasLatinLetters(str) {
    return /[a-z]/i.test(str);
  }

  // Devuelve un array de variantes normalizadas (kana) listas para comparar.
  function normalizeForCompare(str) {
    var reading = App.Furigana.toReading(str);
    var cleaned = stripPunctuationKeepRomajiMarks(reading).toLowerCase();
    if (hasLatinLetters(cleaned)) {
      return romajiToHiraganaVariants(cleaned);
    }
    return [katakanaToHiragana(cleaned)];
  }

  function levenshtein(a, b) {
    var m = a.length;
    var n = b.length;
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp.push([i]);
    }
    for (var j = 0; j <= n; j++) {
      dp[0][j] = j;
    }
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  // Función pública de alto nivel usada por listen_dictation y speak.
  function matchesAnswer(userInput, canonicalKana, acceptList, opts) {
    opts = opts || {};
    var tolerance = opts.tolerance || 0;
    var userVariants = normalizeForCompare(userInput);
    var expectedRaw = [canonicalKana].concat(acceptList || []);
    var expectedVariants = expectedRaw.reduce(function (acc, item) {
      return acc.concat(normalizeForCompare(item));
    }, []);

    for (var u = 0; u < userVariants.length; u++) {
      for (var e = 0; e < expectedVariants.length; e++) {
        if (tolerance <= 0) {
          if (userVariants[u] === expectedVariants[e]) return true;
        } else if (levenshtein(userVariants[u], expectedVariants[e]) <= tolerance) {
          return true;
        }
      }
    }
    return false;
  }

  return {
    katakanaToHiragana: katakanaToHiragana,
    romajiToHiraganaVariants: romajiToHiraganaVariants,
    normalizeForCompare: normalizeForCompare,
    matchesAnswer: matchesAnswer,
    levenshtein: levenshtein,
  };
})();
