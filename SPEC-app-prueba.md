# Especificación — App de pruebas de japonés auditivo

Aplicación web de una sola página que **carga un archivo JSON y genera una prueba interactiva**. Sin framework, sin backend, sin cuenta: HTML + CSS + JavaScript vanilla, funciona abriendo el `.html` directo o desde un servidor estático.

---

## 1. Objetivo y restricciones pedagógicas

El estudiante aprende japonés **de oído y hablado**, no escrito. Por eso:

- **Nunca se pide escribir kanji.** Prohibido.
- **Sí se pide escuchar**: el navegador pronuncia japonés con voz sintética (`speechSynthesis`) y el estudiante responde.
- **Sí se pide hablar**: el navegador escucha al estudiante (`SpeechRecognition`) y compara. Si el reconocimiento falla o no está disponible, el estudiante se autocalifica viendo la respuesta.
- **Sí se puede leer kana** (hiragana/katakana) y **kanji con furigana**. El texto japonés visible siempre lleva furigana sobre los kanji.
- **Sí se puede tipear kana o rōmaji** (dictado). Nunca kanji.

Idioma de la interfaz: **español**.

---

## 2. Stack y compatibilidad

- Un solo `index.html` (puede tener `app.js` y `style.css` separados, pero sin bundler ni dependencias npm).
- Sin frameworks. Sin CDN obligatorio. Debe funcionar **offline** una vez abierto.
- Navegador objetivo: **Chrome / Edge de escritorio** (son los que tienen `SpeechRecognition`). En otros navegadores la app debe funcionar igual, desactivando el reconocimiento de voz y usando autocalificación.
- Carga del JSON: botón "Abrir prueba" (`<input type="file">`) **y** arrastrar-soltar el archivo sobre la página.

### APIs del navegador que se usan

| API | Para qué | Notas |
|---|---|---|
| `window.speechSynthesis` | Pronunciar japonés (TTS) | Voces cargan asíncronas: escuchar `voiceschanged`. Elegir una voz `ja-JP`. Solo se puede reproducir tras un gesto del usuario. |
| `window.SpeechRecognition` / `webkitSpeechRecognition` | Escuchar al estudiante (STT) | `lang = "ja-JP"`, `interimResults = false`, `maxAlternatives = 3`. Requiere permiso de micrófono. Puede no existir → degradar. |
| `localStorage` | Guardar progreso de la prueba en curso y el historial de resultados | Clave por `meta.id`. |

### Selección de voz

1. Filtrar `speechSynthesis.getVoices()` por `lang` que empiece con `ja`.
2. Si `meta.voice_preference` lista nombres, intentar esos en orden (coincidencia parcial de `voice.name`).
3. Si no hay ninguna voz `ja`, mostrar aviso visible: *"No hay voz en japonés instalada. Instala una voz ja-JP en el sistema."* La prueba sigue, pero las preguntas de audio muestran el texto en su lugar (modo degradado, marcado en los resultados).

Un selector de voz en la pantalla de inicio permite cambiarla manualmente.

---

## 3. Formato del JSON de prueba

```json
{
  "meta": {
    "id": "prueba-01",
    "title": "Prueba 01 — COLORS + 嘘",
    "description": "Cobertura: sesiones 01 y 02.",
    "lang": "ja-JP",
    "voice_preference": ["Google 日本語", "Microsoft Nanami", "Kyoko"],
    "default_rate": 0.85,
    "slow_rate": 0.6,
    "shuffle_sections": false,
    "shuffle_questions": true,
    "shuffle_options": true,
    "show_explanation": "after_each",
    "passing_pct": 70
  },
  "sections": [
    {
      "id": "escucha",
      "title": "Comprensión auditiva",
      "intro": "Vas a oír frases de las canciones. Puedes repetir el audio las veces que quieras.",
      "questions": [ ]
    }
  ]
}
```

### `meta`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único. Clave de `localStorage`. |
| `title`, `description` | string | Se muestran en la pantalla de inicio. |
| `lang` | string | Idioma de TTS/STT. Siempre `"ja-JP"`. |
| `voice_preference` | string[] | Nombres de voz preferidos, en orden. Opcional. |
| `default_rate` | number | Velocidad TTS normal (0.1–2). Sugerido 0.85. |
| `slow_rate` | number | Velocidad del botón "lento". Sugerido 0.6. |
| `shuffle_sections` | bool | Mezclar el orden de secciones. |
| `shuffle_questions` | bool | Mezclar preguntas dentro de cada sección. |
| `shuffle_options` | bool | Mezclar opciones en preguntas de elección. **Nunca** mezclar en `minimal_pair`. |
| `show_explanation` | `"after_each"` \| `"at_end"` \| `"never"` | Cuándo mostrar la explicación de cada pregunta. |
| `passing_pct` | number | Umbral de aprobación (solo informativo). |

### Campos comunes a toda pregunta

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Único en la prueba. Va en los resultados. |
| `type` | string | Uno de los tipos de §4. |
| `points` | number | Valor. Default 1. |
| `tags` | string[] | Categorías para el desglose de resultados (ej. `"particulas"`, `"registro"`, `"rendaku"`). |
| `source` | string | De dónde sale (ej. `"COLORS L26"`, `"嘘 L46"`). Se muestra junto a la explicación. |
| `prompt` | string | Instrucción o pregunta en español. Admite markup de furigana. |
| `explanation` | string | Se muestra según `meta.show_explanation`. Admite markup de furigana y **negritas** markdown simples (`**…**`). |

### Objeto `audio`

Aparece en preguntas que hablan. **El texto que pronuncia el TTS y el texto que se muestra son cosas distintas.**

```json
"audio": {
  "text": "ちぎり",
  "rate": 0.85,
  "hidden": true
}
```

| Campo | Descripción |
|---|---|
| `text` | **Lo que el TTS pronuncia.** Puede ser kanji, kana o mezcla. Se usa kana cuando el kanji es ambiguo (千切り → el TTS diría *sengiri*; se pasa ちぎり). |
| `rate` | Velocidad. Si falta, `meta.default_rate`. |
| `hidden` | `true` = no mostrar el texto (pregunta puramente auditiva). `false` = mostrar `display` (o `text`) con furigana. Default `true`. |
| `display` | Opcional. Texto a mostrar si `hidden` es `false`. Admite markup de furigana. |

**Controles de audio obligatorios en toda pregunta con `audio`:** botón ▶ Reproducir, botón 🐢 Lento (usa `meta.slow_rate`), y contador de reproducciones (se guarda en resultados). Nunca reproducir automáticamente al cargar la pregunta: siempre requiere clic.

### Markup de furigana

En cualquier string mostrable: `{漢字|ふりがな}` → renderizar como `<ruby>漢字<rt>ふりがな</rt></ruby>`.

Ejemplo: `"{茜色|あかねいろ}の{空|そら}を"` → 茜色 con あかねいろ encima, 空 con そら encima.

El markup **se elimina** antes de pasar texto al TTS (si `display` y `text` coinciden, usar `text` limpio).

---

## 4. Tipos de pregunta

### 4.1 `listen_choose` — escuchar y elegir

El estudiante oye un audio y elige una opción. Sirve para: significado, registro (formal/informal), partícula oída, estructura gramatical oída.

```json
{
  "id": "q001",
  "type": "listen_choose",
  "tags": ["vocabulario", "N5"],
  "source": "COLORS L23",
  "audio": { "text": "光が射した", "hidden": true },
  "prompt": "¿Qué significa lo que oíste?",
  "options": [
    "Entró la luz",
    "Se apagó la luz",
    "Busqué la luz",
    "La luz se fue"
  ],
  "answer": 0,
  "explanation": "{光|ひかり}が{射|さ}した — が marca información nueva: la luz **aparece**."
}
```

- `options`: 2–6 strings. Pueden ser español o japonés con furigana.
- `answer`: índice (0-based) en el array **original**, antes de mezclar.
- Pregunta de registro: `options: ["Formal (です/ます)", "Informal (forma llana)", "Muy informal", "Literario"]`.
- Pregunta de partícula: `options: ["は", "が", "を", "に"]`, `prompt: "¿Qué partícula oíste después de 瞬間?"`.

### 4.2 `listen_dictation` — escuchar y transcribir en kana

El estudiante oye una palabra o frase corta y la tipea en **hiragana o rōmaji** (nunca kanji). Entrena: moras, rendaku, vocales largas, っ, ん.

```json
{
  "id": "q010",
  "type": "listen_dictation",
  "tags": ["rendaku", "dictado"],
  "source": "COLORS L26",
  "audio": { "text": "大空", "hidden": true },
  "prompt": "Escribe lo que oíste en hiragana o rōmaji.",
  "answer": {
    "kana": "おおぞら",
    "accept": ["oozora", "ōzora", "oozora"]
  },
  "explanation": "{大空|おおぞら} — rendaku: そら → **ぞ**ら."
}
```

- `answer.kana`: la respuesta canónica en hiragana.
- `answer.accept`: variantes adicionales aceptadas (rōmaji, otras grafías). Opcional.
- **Comparación:** normalizar la entrada del usuario y `answer.kana` a hiragana (ver §5) y comparar. Si no coincide, comparar la entrada normalizada a rōmaji contra `accept`.
- Campo de texto con `lang="ja"` y `autocomplete="off"`. Botón "Comprobar". Enter también comprueba.

### 4.3 `listen_fill` — completar el hueco

Se muestra la frase con un hueco `___` (con furigana en el resto), se oye la frase **completa**, y el estudiante elige qué llenaba el hueco.

```json
{
  "id": "q020",
  "type": "listen_fill",
  "tags": ["gramatica", "nagara"],
  "source": "COLORS L14",
  "audio": { "text": "迷いながら悩みながら", "hidden": true },
  "display": "{迷|まよ}い___ {悩|なや}み___",
  "prompt": "¿Qué va en los huecos?",
  "options": ["ながら", "ければ", "そうに", "ことを"],
  "answer": 0,
  "explanation": "〜ながら = mientras. Raíz ます + ながら."
}
```

- `display`: frase con uno o más `___`. Se muestra siempre (no es `hidden`).
- El resto igual que `listen_choose`.

### 4.4 `minimal_pair` — par mínimo

Dos audios A y B que difieren en poco (una vocal, una partícula). El estudiante elige cuál corresponde al significado dado.

```json
{
  "id": "q030",
  "type": "minimal_pair",
  "tags": ["potencial", "par-minimo"],
  "source": "嘘 L52",
  "prompt": "¿Cuál de los dos significa «no PODEMOS volver»?",
  "pair": {
    "a": { "text": "戻らない" },
    "b": { "text": "戻れない" }
  },
  "answer": "b",
  "explanation": "{戻|もど}**れ**ない = potencial negativo (fila え). {戻|もど}**ら**ない = simple negativo (fila あ)."
}
```

- `pair.a` y `pair.b`: objetos `audio` (mismas reglas; `hidden` siempre `true`).
- Dos botones grandes "▶ A" y "▶ B", cada uno con su botón 🐢. Luego dos botones de respuesta "Es A" / "Es B".
- **No mezclar A/B** aunque `shuffle_options` esté activo.

### 4.5 `speak` — hablar

El estudiante debe **decir** algo en japonés. Sirve para: traducir del español, pasar de informal a formal (o al revés), repetir lo oído, responder una pregunta.

```json
{
  "id": "q040",
  "type": "speak",
  "tags": ["registro", "produccion"],
  "source": "COLORS L28",
  "prompt": "Oirás una frase informal. Dila en forma **formal** (です/ます).",
  "audio": { "text": "窓を開くことを決めた", "hidden": false, "display": "{窓|まど}を{開|ひら}くことを{決|き}めた" },
  "expected": {
    "kana": "まどをひらくことをきめました",
    "accept": ["まどをひらくことをきめました。", "窓を開くことを決めました"],
    "display": "{窓|まど}を{開|ひら}くことを{決|き}め**ました**"
  },
  "model_audio": { "text": "窓を開くことを決めました" },
  "explanation": "Solo cambia el verbo final: 決めた → 決め**ました**. Lo interno (relativa, こと) queda llano."
}
```

- `audio`: opcional. Si existe, el estudiante puede oír el estímulo.
- `expected.kana`: respuesta canónica en kana. `expected.accept`: variantes (pueden incluir kanji, porque el STT devuelve kanji). `expected.display`: cómo mostrar la respuesta correcta.
- `model_audio`: audio de la respuesta correcta, para que el estudiante la oiga después de responder. **Obligatorio** en este tipo.

**Flujo de la pregunta:**
1. Botón 🎤 **Mantener para hablar** (press-and-hold; o toggle si el dispositivo no soporta hold). Mientras está activo, `SpeechRecognition` escucha con `lang = "ja-JP"`.
2. Al soltar, se muestra la **transcripción** obtenida (y las alternativas si `maxAlternatives > 1`).
3. La app compara cada alternativa normalizada (§5) contra `expected.kana` y `expected.accept`. Si alguna coincide → marcar **correcto** automáticamente.
4. **Siempre** se muestra la respuesta esperada (`expected.display`) y el botón ▶ de `model_audio`.
5. **Siempre** hay botones de autocalificación: "✔ Lo dije bien" / "✘ Lo dije mal". Estos **sobreescriben** la calificación automática. En resultados se registra `graded_by: "auto" | "self"`.
6. Botón "Intentar de nuevo" (máximo `meta.speak_attempts`, default 3).
7. Si `SpeechRecognition` no existe o el usuario niega el micrófono: se salta el paso 1–3, se muestra "Di la frase en voz alta y luego califícate" y queda solo la autocalificación. En resultados: `stt_available: false`.

### 4.6 `read_choose` — leer y elegir

Se muestra texto japonés (kana o kanji con furigana) **sin audio** y se elige una opción. Uso liviano: reconocer una estructura o una palabra al verla.

```json
{
  "id": "q050",
  "type": "read_choose",
  "tags": ["lectura", "kanji-reconocimiento"],
  "source": "嘘 L8/L49",
  "display": "{約束|やくそく} {千切|ちぎ}り {初夏|しょか}の{風|かぜ}に{消|き}えた",
  "prompt": "En esta línea, 千切り es…",
  "options": ["un sustantivo (juramento)", "un verbo (rompiendo)", "un adjetivo", "una partícula"],
  "answer": 1,
  "explanation": "Raíz ます de {千切|ちぎ}る como conector. Su homófono {契|ちぎ}り sí es sustantivo."
}
```

---

## 5. Normalización de respuestas escritas y habladas

Antes de comparar, **ambos lados** (entrada del usuario y respuesta esperada) pasan por:

1. Quitar el markup de furigana `{…|…}` dejando solo la parte **antes** de `|`... **No:** para comparar se usa la parte **después** de `|` (la lectura). Implementar una función `toReading(str)` que reemplace `{A|B}` por `B`.
2. Quitar espacios, puntuación japonesa y latina (。、！？!?.,「」" '), y guiones.
3. Katakana → hiragana (desplazar cada carácter de U+30A1–U+30F6 en −0x60).
4. Rōmaji → hiragana con una tabla estándar (Hepburn). Cubrir: sílabas básicas, combinaciones con ゃゅょ, consonante doble → っ, `n`/`nn`/`n'` → ん, vocales largas `ō`/`ū`/`ou`/`oo` → おう/おお según corresponda (aceptar ambas: se generan las dos variantes y se acepta si alguna coincide), `-` como prolongación.
5. Pasar todo a minúsculas antes de la tabla.

Coincidencia = igualdad exacta tras normalizar, **o** igualdad con alguna variante de `accept` normalizada. Para `speak`, comparar contra cada alternativa del STT.

**Tolerancia opcional** (`meta.dictation_tolerance`, default 0): permitir N caracteres de diferencia (distancia de Levenshtein) en dictado. Para partículas y pares mínimos siempre 0.

---

## 6. Flujo de la aplicación

### Pantalla 1 — Inicio
- Zona para cargar el JSON (botón + arrastrar).
- Al cargar: validar estructura (§8). Mostrar `meta.title`, `meta.description`, número de secciones y preguntas, puntaje máximo.
- Selector de voz japonesa + botón "Probar voz" (dice こんにちは).
- Indicador de si `SpeechRecognition` está disponible y botón "Probar micrófono".
- Si hay un intento en curso en `localStorage` para ese `meta.id`: ofrecer "Continuar" o "Empezar de nuevo".
- Botón "Comenzar".

### Pantalla 2 — Prueba
- Una pregunta por pantalla. Cabecera: sección actual, progreso "7 / 40", puntos acumulados **no visibles** (para no sesgar).
- Al inicio de cada sección, mostrar `section.intro` una vez.
- Cada pregunta según su tipo (§4). Botón "Responder" bloquea la respuesta.
- Si `show_explanation == "after_each"`: tras responder, mostrar correcto/incorrecto, la respuesta correcta, `explanation` y `source`. Botón "Siguiente".
- Navegación solo hacia adelante. No se puede volver a una pregunta respondida.
- Atajos de teclado: `Espacio` = reproducir audio, `S` = lento, `1–6` = elegir opción, `Enter` = responder/siguiente, `M` = mantener para hablar.
- Guardar estado en `localStorage` después de cada respuesta.

### Pantalla 3 — Resultados
- Puntaje total, porcentaje, aprobado/no según `passing_pct`.
- Tabla por **sección**: correctas / total / %.
- Tabla por **tag**: correctas / total / %, ordenada de peor a mejor. **Esta es la tabla más importante.**
- Lista de preguntas falladas con su explicación.
- Botón **"Copiar resultados (JSON)"** → copia al portapapeles el objeto de §7. Botón "Descargar resultados (.json)".
- Botón "Repetir solo las falladas" (genera una sub-prueba en memoria con las preguntas incorrectas).
- Botón "Volver al inicio".
- Guardar el resultado en `localStorage` bajo `results:<meta.id>:<timestamp>`; la pantalla de inicio lista los intentos previos con su %.

---

## 7. Formato del JSON de resultados

Este es el objeto que el estudiante entrega al tutor para que analice qué reforzar.

```json
{
  "test_id": "prueba-01",
  "test_title": "Prueba 01 — COLORS + 嘘",
  "started_at": "2026-09-14T20:11:03Z",
  "finished_at": "2026-09-14T20:38:40Z",
  "environment": {
    "tts_voice": "Google 日本語",
    "stt_available": true,
    "user_agent": "…"
  },
  "score": { "points": 34, "max": 40, "pct": 85, "passed": true },
  "by_section": {
    "escucha": { "correct": 12, "total": 14, "pct": 86 },
    "habla":   { "correct": 5,  "total": 8,  "pct": 63 }
  },
  "by_tag": {
    "particulas": { "correct": 3, "total": 6, "pct": 50 },
    "registro":   { "correct": 7, "total": 8, "pct": 88 }
  },
  "answers": [
    {
      "id": "q001",
      "type": "listen_choose",
      "tags": ["vocabulario", "N5"],
      "correct": true,
      "expected": "0",
      "user": "0",
      "replays": 2,
      "slow_replays": 0,
      "time_ms": 14200
    },
    {
      "id": "q040",
      "type": "speak",
      "tags": ["registro", "produccion"],
      "correct": false,
      "expected": "まどをひらくことをきめました",
      "user": "まどをひらくことをきめた",
      "stt_alternatives": ["窓を開くことを決めた", "窓を開くこと決めた"],
      "graded_by": "self",
      "attempts": 2,
      "replays": 1,
      "time_ms": 41000
    }
  ]
}
```

- `user`: para elección, el índice elegido (en el array original); para dictado, la entrada cruda del usuario; para `speak`, la mejor transcripción normalizada.
- `replays` / `slow_replays`: cuántas veces reprodujo el audio normal / lento. **Importante para diagnóstico**: muchas reproducciones con acierto = reconoce pero lento.
- `time_ms`: desde que se mostró la pregunta hasta que respondió.

---

## 8. Validación del JSON de entrada

Al cargar, verificar y mostrar errores claros (en español, con el `id` de la pregunta):

- `meta.id` y `meta.title` presentes.
- Cada pregunta tiene `id` único, `type` válido, `prompt`.
- `listen_choose`, `listen_fill`, `read_choose`: `options` con ≥2 elementos, `answer` es índice válido.
- `listen_dictation`: `answer.kana` presente.
- `minimal_pair`: `pair.a.text`, `pair.b.text`, `answer` ∈ {"a","b"}.
- `speak`: `expected.kana`, `model_audio.text` presentes.
- Todo `audio.text` no vacío.

Si hay errores, no iniciar la prueba; listar los errores.

---

## 9. UX / accesibilidad

- Texto japonés grande (mínimo 1.5 em) con furigana legible. Fuente que renderice kanji: `font-family: "Noto Sans JP", "Yu Gothic", "Meiryo", "Hiragino Sans", sans-serif`.
- Botones de audio grandes y con estado (reproduciendo / listo).
- Nunca revelar la respuesta antes de que el estudiante responda (ni en el DOM: no incluir `answer` en atributos visibles; mantenerlo en memoria JS).
- Funciona con teclado completo.
- Responsive: usable a 400 px de ancho.
- Sin sonidos de acierto/error estridentes; un color y un ícono bastan.

---

## 10. JSON de ejemplo mínimo (para desarrollar)

```json
{
  "meta": {
    "id": "demo",
    "title": "Demo",
    "lang": "ja-JP",
    "default_rate": 0.85,
    "slow_rate": 0.6,
    "shuffle_questions": false,
    "shuffle_options": true,
    "show_explanation": "after_each",
    "passing_pct": 70
  },
  "sections": [
    {
      "id": "demo",
      "title": "Demo de todos los tipos",
      "intro": "Una pregunta de cada tipo.",
      "questions": [
        {
          "id": "d1", "type": "listen_choose", "tags": ["vocabulario"], "source": "COLORS",
          "audio": { "text": "いつも" },
          "prompt": "¿Qué significa?",
          "options": ["siempre", "ahora", "aquí", "ya"],
          "answer": 0,
          "explanation": "いつも = siempre (N5)."
        },
        {
          "id": "d2", "type": "listen_dictation", "tags": ["rendaku"], "source": "嘘",
          "audio": { "text": "笑顔" },
          "prompt": "Escribe lo que oíste (hiragana o rōmaji).",
          "answer": { "kana": "えがお", "accept": ["egao"] },
          "explanation": "{笑顔|えがお} — rendaku: かお → **が**お."
        },
        {
          "id": "d3", "type": "listen_fill", "tags": ["gramatica"], "source": "COLORS",
          "audio": { "text": "決めればいいさ" },
          "display": "{決|き}め___いいさ",
          "prompt": "¿Qué va en el hueco?",
          "options": ["れば", "たら", "ても", "ながら"],
          "answer": 0,
          "explanation": "〜ばいい = basta con…"
        },
        {
          "id": "d4", "type": "minimal_pair", "tags": ["particulas"], "source": "COLORS",
          "prompt": "¿Cuál significa «SIENTO el instante» (瞬間 como objeto)?",
          "pair": { "a": { "text": "瞬間は" }, "b": { "text": "瞬間を" } },
          "answer": "b",
          "explanation": "を = objeto directo. は = tema."
        },
        {
          "id": "d5", "type": "speak", "tags": ["registro"], "source": "嘘",
          "prompt": "Di en japonés **informal**: «¿te acuerdas?»",
          "expected": { "kana": "おぼえてる", "accept": ["おぼえている", "覚えてる", "覚えている"], "display": "{覚|おぼ}えてる？" },
          "model_audio": { "text": "覚えてる？" },
          "explanation": "Informal: 覚えてる (contracción de 覚えている). Formal: 覚えていますか."
        },
        {
          "id": "d6", "type": "read_choose", "tags": ["lectura"], "source": "嘘",
          "display": "{君|きみ}は{憶|おぼ}えていますか",
          "prompt": "¿Qué registro tiene esta frase?",
          "options": ["Formal (ます)", "Informal", "Literario"],
          "answer": 0,
          "explanation": "〜ていますか = cortés."
        }
      ]
    }
  ]
}
```

---

## 11. Criterios de aceptación

- [ ] Abre un JSON válido por botón y por arrastre; rechaza uno inválido con errores legibles.
- [ ] Reproduce audio japonés con una voz `ja-JP`; botón lento funciona; contador de reproducciones.
- [ ] Los seis tipos de pregunta se renderizan y califican correctamente.
- [ ] Furigana `{漢字|かな}` se renderiza como `<ruby>` en prompt, display, opciones y explicación.
- [ ] Dictado acepta hiragana, katakana y rōmaji (Hepburn) como equivalentes.
- [ ] `speak` usa el micrófono si está disponible y siempre permite autocalificación.
- [ ] En Firefox/Safari (sin STT) la prueba se completa igual, con autocalificación.
- [ ] Resultados por sección y por tag; exportar JSON al portapapeles y como archivo.
- [ ] Progreso persiste al recargar la página.
- [ ] "Repetir solo las falladas" funciona.
- [ ] Funciona abriendo `index.html` directo desde el disco (sin servidor).
