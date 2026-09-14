window.App = window.App || {};

App.Utils = (function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === undefined || value === null || value === false) return;
      if (key === "class") {
        node.className = value;
      } else if (key === "text") {
        node.textContent = value;
      } else if (key === "html") {
        node.innerHTML = value;
      } else if (key.indexOf("on") === 0 && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === "dataset") {
        Object.keys(value).forEach(function (dk) {
          node.dataset[dk] = value[dk];
        });
      } else {
        node.setAttribute(key, value);
      }
    });
    (children || []).forEach(function (child) {
      if (child === undefined || child === null) return;
      if (typeof child === "string") {
        node.appendChild(document.createTextNode(child));
      } else {
        node.appendChild(child);
      }
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Fisher-Yates. Devuelve { items, originalIndexOf } donde
  // originalIndexOf[posicionMezclada] = posicionOriginal.
  function shuffleArray(arr) {
    var items = arr.slice();
    var originalIndexOf = items.map(function (_, i) {
      return i;
    });
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmpItem = items[i];
      items[i] = items[j];
      items[j] = tmpItem;
      var tmpIdx = originalIndexOf[i];
      originalIndexOf[i] = originalIndexOf[j];
      originalIndexOf[j] = tmpIdx;
    }
    return { items: items, originalIndexOf: originalIndexOf };
  }

  var uidCounter = 0;
  function uid(prefix) {
    uidCounter += 1;
    return (prefix || "id") + "-" + uidCounter;
  }

  // Convierte **negritas** simples a <strong>. Escapa el resto del texto.
  function renderBoldMarkdownEscaped(str) {
    var parts = String(str).split(/(\*\*[^*]+\*\*)/g);
    return parts
      .map(function (part) {
        var match = /^\*\*([^*]+)\*\*$/.exec(part);
        if (match) {
          return "<strong>" + escapeHtml(match[1]) + "</strong>";
        }
        return escapeHtml(part);
      })
      .join("");
  }

  return {
    qs: qs,
    qsa: qsa,
    el: el,
    clear: clear,
    escapeHtml: escapeHtml,
    shuffleArray: shuffleArray,
    uid: uid,
    renderBoldMarkdownEscaped: renderBoldMarkdownEscaped,
  };
})();
