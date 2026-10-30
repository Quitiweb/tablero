(function () {
  "use strict";

  // Los datos viven en /datos como JSON estático:
  //   datos/indice.json            lista de entradas (la genera scripts/indice.py)
  //   datos/tablero.json           mapa de hilos
  //   datos/entradas/<fecha>.json  una entrada por mañana
  //   datos/respuestas/<fecha>.json la respuesta de Rafael, si la hay

  var MS_DIA = 86400000;
  var ESTADOS_HILO = { "abierto": "abierto", "en pausa": "en-pausa", "cerrado": "cerrado" };
  var ESTADOS_PIEZA = { "por comprobar": "por-comprobar", "candidata": "candidata", "tiene precedentes": "tiene-precedentes", "descartada": "descartada" };

  var estado = {
    entradas: [],
    respuestas: {},
    tablero: null,
    filtro: "todas",
    abiertas: new Set(),
    primeraVez: true
  };

  var $lista = document.getElementById("entradas");
  var $tablero = document.getElementById("tablero");
  var $marco = document.getElementById("tablero-marco");
  var $cuenta = document.getElementById("cuenta");
  var $hilos = document.getElementById("hilos");
  var $hiloDesc = document.getElementById("hilo-desc");
  var $aviso = document.getElementById("aviso");

  if (window.marked && typeof marked.setOptions === "function") {
    marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });
  }
  if (window.DOMPurify && typeof DOMPurify.addHook === "function") {
    DOMPurify.addHook("afterSanitizeAttributes", function (n) {
      if (n.tagName === "A") {
        var h = n.getAttribute("href") || "";
        if (h && h.charAt(0) !== "#") {
          n.setAttribute("target", "_blank");
          n.setAttribute("rel", "noopener noreferrer");
        }
      }
    });
  }

  // ---------- utilidades ----------
  function escapar(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function md(t) {
    if (!t) return "";
    if (window.marked && window.DOMPurify) {
      try { return DOMPurify.sanitize(marked.parse(String(t))); } catch (e) { /* texto plano abajo */ }
    }
    return "<p>" + escapar(t).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") + "</p>";
  }
  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function aUTC(f) {
    var p = String(f).split("-");
    return Date.UTC(+p[0], (+p[1]) - 1, +p[2]);
  }
  function deUTC(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  function hoy() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fechaLarga(f) {
    if (!f) return "";
    try {
      return new Date(aUTC(f)).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    } catch (e) { return String(f); }
  }
  function hilosDe(e) {
    var s = [];
    if (e.hilo) s.push(e.hilo);
    if (Array.isArray(e.hilos)) e.hilos.forEach(function (h) { if (s.indexOf(h) < 0) s.push(h); });
    return s;
  }
  function tienePieza(e) { return !!(e.pieza && e.pieza.texto); }
  function estadoPieza(e) { return (e.pieza && e.pieza.estado) || "por comprobar"; }
  function pasaFiltro(e) {
    if (estado.filtro === "todas") return true;
    if (estado.filtro === "piezas") return tienePieza(e);
    return hilosDe(e).indexOf(estado.filtro) >= 0;
  }
  function avisar(t) { $aviso.textContent = t || ""; $aviso.hidden = !t; }
  function vacio(t) { return el("p", "vacio", t); }
  function json(ruta) {
    return fetch(ruta, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(ruta + ": " + r.status);
      return r.json();
    });
  }

  // ---------- tablero de mañanas ----------
  function pintarTablero() {
    var porFecha = {};
    estado.entradas.forEach(function (e) { if (e.fecha) porFecha[e.fecha] = e; });
    var hoyS = hoy();
    var hoyMs = aUTC(hoyS);
    var claves = Object.keys(porFecha).sort();
    var inicioMs = claves.length ? Math.min(aUTC(claves[0]), hoyMs) : hoyMs;
    var finMs = claves.length ? Math.max(aUTC(claves[claves.length - 1]), hoyMs) : hoyMs;
    var lunes = inicioMs - ((new Date(inicioMs).getUTCDay() + 6) % 7) * MS_DIA;
    var necesarias = Math.floor((finMs - lunes) / (7 * MS_DIA)) + 1;
    var semanas = Math.max(8, necesarias + 1);

    var frag = document.createDocumentFragment();
    for (var w = 0; w < semanas; w++) {
      for (var r = 0; r < 7; r++) {
        var ms = lunes + (w * 7 + r) * MS_DIA;
        var f = deUTC(ms);
        var e = porFecha[f];
        var c;
        if (e) {
          c = el("a", "casilla llena");
          c.href = "#e-" + e.id;
          c.setAttribute("aria-label", fechaLarga(f) + ": " + (e.titulo || "entrada"));
          c.title = fechaLarga(f) + (e.titulo ? " · " + e.titulo : "");
        } else {
          c = el("span", "casilla");
          c.setAttribute("aria-hidden", "true");
          if (ms < inicioMs) c.classList.add("antes");
          else if (ms > hoyMs) c.classList.add((w + r) % 2 ? "oscura" : "clara");
          else c.classList.add("sin");
        }
        if (f === hoyS) c.classList.add("hoy");
        frag.appendChild(c);
      }
    }
    $tablero.replaceChildren(frag);
    $marco.scrollLeft = $marco.scrollWidth;
  }

  // ---------- hilos ----------
  function listaHilos() {
    if (estado.tablero && Array.isArray(estado.tablero.hilos) && estado.tablero.hilos.length) {
      return estado.tablero.hilos.filter(function (h) { return h && h.nombre; });
    }
    var vistos = [];
    estado.entradas.forEach(function (e) {
      hilosDe(e).forEach(function (h) { if (vistos.indexOf(h) < 0) vistos.push(h); });
    });
    return vistos.map(function (n) { return { nombre: n, estado: "abierto" }; });
  }
  function chip(valor, texto, est) {
    var b = el("button", "chip");
    b.type = "button";
    b.setAttribute("aria-pressed", String(estado.filtro === valor));
    if (est) {
      var p = el("span", "punto " + (ESTADOS_HILO[est] || "abierto"));
      p.setAttribute("aria-hidden", "true");
      b.appendChild(p);
    }
    b.appendChild(document.createTextNode(texto));
    if (est && est !== "abierto") b.appendChild(el("span", "chip-estado", est));
    b.addEventListener("click", function () {
      estado.filtro = (estado.filtro === valor && valor !== "todas") ? "todas" : valor;
      pintarHilos();
      pintarEntradas();
    });
    return b;
  }
  function pintarHilos() {
    var hilos = listaHilos();
    var frag = document.createDocumentFragment();
    frag.appendChild(chip("todas", "Todas"));
    frag.appendChild(chip("piezas", "Con pieza"));
    hilos.forEach(function (h) { frag.appendChild(chip(h.nombre, h.nombre, h.estado || "abierto")); });
    $hilos.replaceChildren(frag);
    var sel = null;
    hilos.forEach(function (h) { if (h.nombre === estado.filtro) sel = h; });
    if (sel) {
      $hiloDesc.textContent = (sel.descripcion || "") + (sel.ultima ? " Última vez: " + fechaLarga(sel.ultima) + "." : "");
      $hiloDesc.hidden = !$hiloDesc.textContent;
    } else {
      $hiloDesc.textContent = "";
      $hiloDesc.hidden = true;
    }
  }

  function pintarCuenta() {
    var n = estado.entradas.length;
    var abiertos = listaHilos().filter(function (h) { return (h.estado || "abierto") === "abierto"; }).length;
    var pend = estado.entradas.filter(function (e) { return tienePieza(e) && estadoPieza(e) === "por comprobar"; }).length;
    var cand = estado.entradas.filter(function (e) { return tienePieza(e) && estadoPieza(e) === "candidata"; }).length;
    var partes = [
      n + (n === 1 ? " mañana escrita" : " mañanas escritas"),
      abiertos + (abiertos === 1 ? " hilo abierto" : " hilos abiertos")
    ];
    if (pend) partes.push(pend + (pend === 1 ? " pieza por comprobar" : " piezas por comprobar"));
    if (cand) partes.push(cand + (cand === 1 ? " pieza candidata" : " piezas candidatas"));
    $cuenta.textContent = partes.join(" · ");
  }

  // ---------- entradas ----------
  function bloque(cls, etiqueta) {
    var b = el("section", "bloque " + cls);
    if (etiqueta) b.appendChild(el("span", "etiqueta", etiqueta));
    return b;
  }
  function prosa(texto, cls) {
    var d = el("div", "prose" + (cls ? " " + cls : ""));
    d.innerHTML = md(texto);
    return d;
  }
  function crearEntrada(e) {
    var art = el("article", "entrada");
    art.id = "e-" + e.id;
    var det = el("details");
    det.open = estado.abiertas.has(e.id);
    det.addEventListener("toggle", function () {
      if (det.open) estado.abiertas.add(e.id); else estado.abiertas.delete(e.id);
    });

    var sum = el("summary");
    var meta = el("div", "meta");
    meta.appendChild(el("span", "num", "Entrada " + (e.numero != null ? e.numero : "")));
    var t = el("time", null, fechaLarga(e.fecha));
    if (e.fecha) t.setAttribute("datetime", e.fecha);
    meta.appendChild(t);
    if (e.hilo) meta.appendChild(el("span", null, e.hilo));
    if (tienePieza(e)) {
      var ep = estadoPieza(e);
      meta.appendChild(el("span", "pill " + (ESTADOS_PIEZA[ep] || "por-comprobar"), "Pieza: " + ep));
    }
    meta.appendChild(el("span", "plegar"));
    sum.appendChild(meta);
    sum.appendChild(el("h2", null, e.titulo || "Sin título"));
    if (e.resumen) sum.appendChild(el("p", "resumen", e.resumen));
    det.appendChild(sum);

    var cuerpo = el("div", "cuerpo");
    if (e.cuerpo) cuerpo.appendChild(prosa(e.cuerpo));

    if (tienePieza(e)) {
      var pz = el("section", "bloque pieza");
      var cab = el("div", "pieza-cab");
      cab.appendChild(el("span", "etiqueta", "Pieza para el tablero"));
      var est = estadoPieza(e);
      cab.appendChild(el("span", "pill " + (ESTADOS_PIEZA[est] || "por-comprobar"), est));
      pz.appendChild(cab);
      pz.appendChild(prosa(e.pieza.texto));
      if (e.pieza.precedentes) {
        pz.appendChild(el("span", "etiqueta sub", "Precedentes"));
        pz.appendChild(prosa(e.pieza.precedentes));
      }
      cuerpo.appendChild(pz);
    }

    if (e.a_flote) {
      var af = bloque("flote", "Para mantenerse a flote");
      af.appendChild(prosa(e.a_flote));
      cuerpo.appendChild(af);
    }

    var q = bloque("pregunta", "Pregunta para Rafael");
    if (e.pregunta) q.appendChild(el("p", "preg", e.pregunta));
    var resp = estado.respuestas[e.id];
    if (resp && resp.texto) {
      q.appendChild(el("span", "etiqueta sub", "Respuesta de Rafael"));
      q.appendChild(prosa(resp.texto, "respuesta"));
    } else {
      q.appendChild(el("p", "sin-respuesta", "Rafael aún no ha respondido."));
    }
    cuerpo.appendChild(q);

    if (e.rumbo) {
      var rb = bloque("rumbo", "Rumbo para mañana");
      rb.appendChild(el("p", null, e.rumbo));
      cuerpo.appendChild(rb);
    }

    if (Array.isArray(e.fuentes) && e.fuentes.length) {
      var fu = bloque("fuentes", "Fuentes");
      var ol = el("ol");
      e.fuentes.forEach(function (f) {
        if (!f || !f.url) return;
        var li = el("li");
        var u = String(f.url);
        var a = el("a", null, f.titulo || u);
        if (/^https?:\/\//i.test(u)) {
          a.href = u;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        li.appendChild(a);
        ol.appendChild(li);
      });
      fu.appendChild(ol);
      cuerpo.appendChild(fu);
    }

    det.appendChild(cuerpo);
    art.appendChild(det);
    return art;
  }

  function pintarEntradas() {
    if (!estado.entradas.length) {
      $lista.replaceChildren(vacio("Todavía no hay entradas. La primera llegará mañana a primera hora."));
      return;
    }
    if (estado.primeraVez) {
      estado.primeraVez = false;
      var h = location.hash.indexOf("#e-") === 0 ? location.hash.slice(3) : "";
      var existe = estado.entradas.some(function (e) { return e.id === h; });
      estado.abiertas.add(existe ? h : estado.entradas[0].id);
    }
    var visibles = estado.entradas.filter(pasaFiltro);
    if (!visibles.length) {
      $lista.replaceChildren(vacio("Ninguna entrada con este filtro todavía."));
      return;
    }
    $lista.replaceChildren.apply($lista, visibles.map(crearEntrada));
  }

  function pintarTodo() {
    pintarTablero();
    pintarHilos();
    pintarEntradas();
    pintarCuenta();
  }

  function irAHash() {
    var h = location.hash;
    if (h.indexOf("#e-") !== 0) return;
    var id = h.slice(3);
    var entrada = null;
    estado.entradas.forEach(function (e) { if (e.id === id) entrada = e; });
    if (!entrada) return;
    if (!pasaFiltro(entrada)) { estado.filtro = "todas"; pintarHilos(); }
    estado.abiertas.add(id);
    pintarEntradas();
    var n = document.getElementById("e-" + id);
    if (n) {
      var suave = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
      n.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
    }
  }
  window.addEventListener("hashchange", irAHash);

  // ---------- arranque ----------
  pintarTablero();
  pintarHilos();

  Promise.all([
    json("datos/indice.json"),
    json("datos/tablero.json").catch(function () { return null; })
  ]).then(function (r) {
    var indice = r[0];
    estado.tablero = r[1];
    var lista = Array.isArray(indice.entradas) ? indice.entradas : [];
    return Promise.all(lista.map(function (item) {
      var entrada = json("datos/entradas/" + item.id + ".json").then(function (d) {
        d.id = item.id;
        return d;
      });
      var respuesta = item.respuesta
        ? json("datos/respuestas/" + item.id + ".json").catch(function () { return null; })
        : Promise.resolve(null);
      return Promise.all([entrada, respuesta]);
    }));
  }).then(function (pares) {
    estado.entradas = pares.map(function (p) {
      if (p[1]) estado.respuestas[p[0].id] = p[1];
      return p[0];
    }).sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
    pintarTodo();
    if (location.hash.indexOf("#e-") === 0) irAHash();
  }).catch(function () {
    $cuenta.textContent = "No se pudo abrir el cuaderno";
    $lista.replaceChildren();
    avisar("No se pudieron cargar las entradas. Recarga la página en un momento.");
  });
})();
