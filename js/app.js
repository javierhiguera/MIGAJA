(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var state = { cart: {}, modo: "Retiro", pago: "Efectivo", cat: "Todas", q: "" };

  function precioTxt(n) {
    return CONFIG.moneda + Math.round(n).toLocaleString("es-AR");
  }
  function kilosTxt(k) {
    return String(k).replace(".", ",") + " kg";
  }
  function key(id, op) { return id + "|" + op; }

  /* Tema claro / oscuro */
  function aplicarTema(t) { document.documentElement.setAttribute("data-theme", t); }
  (function initTema() {
    var t = null;
    try { t = localStorage.getItem("migaja-tema"); } catch (e) {}
    if (!t) t = (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    aplicarTema(t);
  })();
  $("#themeBtn").addEventListener("click", function () {
    var nuevo = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    aplicarTema(nuevo);
    try { localStorage.setItem("migaja-tema", nuevo); } catch (e) {}
  });

  /* Datos del negocio en pantalla */
  $("#logo").textContent = CONFIG.nombre;
  $("#slogan").textContent = CONFIG.slogan;
  $("#infoHorario").textContent = CONFIG.horario;
  $("#infoRetiro").textContent = "Retiro: " + CONFIG.direccionRetiro;
  $("#waTop").href = "https://wa.me/" + CONFIG.whatsapp;
  $("#aliasTxt").textContent = CONFIG.alias;
  $("#titularTxt").textContent = CONFIG.titular;

  /* Categorías */
  function renderChips() {
    var cats = ["Todas"];
    PRODUCTOS.forEach(function (p) { if (cats.indexOf(p.categoria) === -1) cats.push(p.categoria); });
    var cont = $("#chips");
    cont.innerHTML = "";
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.cat === c ? " on" : "");
      b.textContent = c;
      b.addEventListener("click", function () { state.cat = c; renderChips(); renderLista(); });
      cont.appendChild(b);
    });
  }

  /* Lista de productos */
  function renderLista() {
    var cont = $("#lista");
    cont.innerHTML = "";
    var q = state.q.trim().toLowerCase();
    var visibles = PRODUCTOS.filter(function (p) {
      var okCat = state.cat === "Todas" || p.categoria === state.cat;
      var okQ = !q || (p.nombre + " " + p.descripcion + " " + p.opciones.join(" ")).toLowerCase().indexOf(q) !== -1;
      return okCat && okQ;
    });
    if (!visibles.length) {
      var v = document.createElement("div");
      v.className = "vacio";
      v.textContent = "No encontramos ese sabor.";
      cont.appendChild(v);
      return;
    }
    visibles.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "card";

      var h = document.createElement("h3"); h.textContent = p.nombre; card.appendChild(h);
      var d = document.createElement("p"); d.textContent = p.descripcion; card.appendChild(d);

      var pr = document.createElement("div");
      pr.className = "price";
      if (p.precioKilo > 0) {
        pr.textContent = precioTxt(p.precioKilo) + " ";
        var s = document.createElement("small"); s.textContent = "el kilo"; pr.appendChild(s);
      } else {
        pr.textContent = "A confirmar";
      }
      card.appendChild(pr);

      p.opciones.forEach(function (op) {
        var row = document.createElement("div");
        row.className = "opt";
        var lab = document.createElement("span");
        lab.textContent = p.opciones.length > 1 ? op : "Kilos";
        row.appendChild(lab);

        var step = document.createElement("div");
        step.className = "step";
        var menos = document.createElement("button");
        menos.type = "button"; menos.textContent = "−";
        menos.setAttribute("aria-label", "Restar medio kilo de " + p.nombre + " " + op);
        var qty = document.createElement("span");
        qty.className = "qty";
        var mas = document.createElement("button");
        mas.type = "button"; mas.textContent = "+";
        mas.setAttribute("aria-label", "Sumar medio kilo de " + p.nombre + " " + op);

        function pintar() {
          var it = state.cart[key(p.id, op)];
          qty.textContent = it ? kilosTxt(it.kilos) : "0 kg";
        }
        menos.addEventListener("click", function () { cambiar(p, op, -0.5); pintar(); });
        mas.addEventListener("click", function () { cambiar(p, op, 0.5); pintar(); });
        pintar();

        step.appendChild(menos); step.appendChild(qty); step.appendChild(mas);
        row.appendChild(step);
        card.appendChild(row);
      });
      cont.appendChild(card);
    });
  }

  /* Carrito */
  function cambiar(p, op, delta) {
    var k = key(p.id, op);
    var actual = state.cart[k] ? state.cart[k].kilos : 0;
    var nuevo = Math.max(0, Math.round((actual + delta) * 2) / 2);
    if (nuevo === 0) delete state.cart[k];
    else state.cart[k] = { prod: p, opcion: op, kilos: nuevo };
    renderBar();
  }
  function items() { return Object.keys(state.cart).map(function (k) { return state.cart[k]; }); }
  function kilosTotal() { return items().reduce(function (a, i) { return a + i.kilos; }, 0); }
  function precioConocido() { return items().every(function (i) { return i.prod.precioKilo > 0; }); }
  function totalPlata() { return items().reduce(function (a, i) { return a + i.kilos * i.prod.precioKilo; }, 0); }
  function totalTxt() { return precioConocido() ? precioTxt(totalPlata()) : "A confirmar"; }

  function renderBar() {
    var bar = $("#bar");
    var n = kilosTotal();
    if (n === 0) { bar.hidden = true; return; }
    bar.hidden = false;
    $("#verPedido").textContent = "Ver pedido · " + kilosTxt(n) + " · " + totalTxt();
  }

  function etiqueta(i) {
    return i.prod.nombre + (i.prod.opciones.length > 1 ? " (" + i.opcion + ")" : "");
  }

  function renderPanel() {
    var cont = $("#items");
    cont.innerHTML = "";
    items().forEach(function (i) {
      var row = document.createElement("div");
      row.className = "item";
      var a = document.createElement("span"); a.textContent = etiqueta(i) + " · " + kilosTxt(i.kilos);
      var b = document.createElement("strong");
      b.textContent = i.prod.precioKilo > 0 ? precioTxt(i.kilos * i.prod.precioKilo) : "A confirmar";
      row.appendChild(a); row.appendChild(b);
      cont.appendChild(row);
    });
    $("#total").textContent = totalTxt();
    $("#campoDir").hidden = state.modo !== "Envío";
    $("#aliasBox").hidden = state.pago !== "Transferencia";
    $("#error").textContent = "";
  }

  /* Abrir y cerrar */
  $("#verPedido").addEventListener("click", function () { renderPanel(); $("#overlay").hidden = false; });
  $("#cerrar").addEventListener("click", function () { $("#overlay").hidden = true; });
  $("#overlay").addEventListener("click", function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("#overlay").hidden = true; });

  /* Retiro / Envío y forma de pago */
  $$("[data-modo]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.modo = b.getAttribute("data-modo");
      $$("[data-modo]").forEach(function (x) { x.classList.toggle("on", x === b); });
      renderPanel();
    });
  });
  $$("[data-pago]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.pago = b.getAttribute("data-pago");
      $$("[data-pago]").forEach(function (x) { x.classList.toggle("on", x === b); });
      renderPanel();
    });
  });

  /* Buscador */
  $("#buscar").addEventListener("input", function (e) { state.q = e.target.value; renderLista(); });

  /* Copiar alias */
  $("#copiar").addEventListener("click", function () {
    var msg = $("#copiado");
    function ok() { msg.textContent = "Alias copiado"; }
    function mal() { msg.textContent = "No se pudo copiar, copialo a mano."; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(CONFIG.alias).then(ok, mal);
    } else { mal(); }
  });

  /* Armar y enviar el mensaje */
  function armarMensaje() {
    var l = [];
    l.push("*Pedido " + CONFIG.nombre + "*");
    l.push("Nombre: " + $("#nombre").value.trim());
    l.push(state.modo === "Envío" ? "Envío a: " + $("#direccion").value.trim() : "Retiro en: " + CONFIG.direccionRetiro);
    l.push("");
    items().forEach(function (i) {
      var precio = i.prod.precioKilo > 0 ? " - " + precioTxt(i.kilos * i.prod.precioKilo) : "";
      l.push("• " + etiqueta(i) + ": " + kilosTxt(i.kilos) + precio);
    });
    l.push("");
    l.push("Total: " + totalTxt());
    l.push("Pago: " + state.pago + (state.pago === "Transferencia" ? " (te mando el comprobante por acá)" : ""));
    var n = $("#notas").value.trim();
    if (n) l.push("Notas: " + n);
    return l.join("\n");
  }

  $("#enviar").addEventListener("click", function () {
    var err = $("#error");
    if (kilosTotal() === 0) { err.textContent = "Sumá al menos medio kilo."; return; }
    if (!$("#nombre").value.trim()) { err.textContent = "Escribí tu nombre."; return; }
    if (state.modo === "Envío" && !$("#direccion").value.trim()) { err.textContent = "Escribí la dirección de entrega."; return; }
    err.textContent = "";
    var url = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(armarMensaje());
    window.open(url, "_blank", "noopener");
  });

  renderChips();
  renderLista();
  renderBar();
})();
