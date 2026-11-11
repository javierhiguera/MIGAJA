(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var money = function (n) { return "$" + Math.round(n).toLocaleString("es-AR"); };
  var ls = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var IC = {
    cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  var S = { cart: ls.get("mg-cart", []), favs: ls.get("mg-favs", []), cat: "Todas", q: "", open: false, step: 0, done: null, busy: false,
    f: { nombre: "", tel: "", email: "", modo: "Retiro", zona: "", calle: "", altura: "", piso: "", ref: "", fecha: "", hora: "", pago: CONFIG.pagos[0], obs: "" } };

  var prod = function (id) { return PRODUCTOS.filter(function (p) { return p.id === id; })[0]; };
  var iso = function (d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  var qtxt = function (p, n) { return p.venta.unidad === "kg" ? String(n) + " kg" : n + " u."; };
  var zona = function () { return CONFIG.envio.zonas.filter(function (z) { return z.nombre === S.f.zona; })[0]; };
  var save = function () { ls.set("mg-cart", S.cart); };
  var toast = function (m) { var t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove("on"); }, 1600); };

  // --- MOTOR DE PRECIOS CON PROMO OPTIMIZADA ---
  function calcularTotales() {
    var lineas = [], subtotalRegular = 0, totalPromo = 0, kilosElegibles = 0;
    var elegiblesCart = []; // { index, precio, kg, prodId, op }

    // 1. Procesar carrito
    S.cart.forEach(function (l, idx) {
      var p = prod(l.id); if (!p) return;
      var m = p.precio * l.n;
      subtotalRegular += m;
      lineas.push({ txt: p.nombre + (p.opciones.length > 1 ? " (" + l.op + ")" : ""), q: qtxt(p, l.n), pu: p.precio, m: m, ok: true, idx: idx });

      // Si es elegible para promo, acumular kilos
      if (PROMO.elegibles.indexOf(l.id) > -1) {
        kilosElegibles += l.n;
        for (var k = 0; k < l.n; k++) {
          elegiblesCart.push({ precio: p.precio, prodId: l.id, op: l.op, idx: idx });
        }
      }
    });

    // 2. Calcular bloques de promo (2kg = $10.000)
    var bloques = Math.floor(kilosElegibles / PROMO.kilosRequeridos);
    var descuentoTotal = 0;
    var detallePromos = [];

    if (bloques > 0) {
      // Ordenar elegibles de mayor a menor precio para maximizar descuento
      elegiblesCart.sort(function(a, b) { return b.precio - a.precio; });

      var promocionados = elegiblesCart.slice(0, bloques * PROMO.kilosRequeridos);
      var noPromocionados = elegiblesCart.slice(bloques * PROMO.kilosRequeridos);

      // Calcular valor regular de los promocionados
      var valorRegularPromo = promocionados.reduce(function(acc, x) { return acc + x.precio; }, 0);
      var valorPromo = bloques * PROMO.precio;
      
      descuentoTotal = valorRegularPromo - valorPromo;
      
      // Agrupar para mostrar en el resumen (simplificado)
      detallePromos.push({
        nombre: "Promo " + bloques + " x 2 kg",
        descripcion: bloques * 2 + " kg elegibles (Clásica/Crispy)",
        valorRegular: valorRegularPromo,
        valorFinal: valorPromo,
        ahorro: descuentoTotal
      });
    }

    // 3. Envío
    var envio = 0;
    if (S.f.modo === "Envío" && zona()) {
      envio = zona().costo;
    }

    var totalFinal = subtotalRegular - descuentoTotal + envio;

    return {
      L: lineas,
      sub: subtotalRegular,
      desc: descuentoTotal,
      env: envio,
      total: totalFinal,
      promos: detallePromos,
      kilosElegibles: kilosElegibles,
      bloques: bloques
    };
  }

  function depurar() {
    S.cart = S.cart.filter(function (l) {
      var p = prod(l.id); return p && p.disponible !== false && p.opciones.indexOf(l.op) > -1 && l.n > 0 && Number.isInteger(l.n);
    });
    save();
  }

  function line(t, id, op) { return S.cart.filter(function (l) { return l.t === t && l.id === id && l.op === (op || ""); })[0]; }
  
  function add(t, id, op, d) {
    var p = t === "p" ? prod(id) : null, paso = p ? p.venta.paso : 1, l = line(t, id, op);
    if (p && p.disponible === false) return;
    
    var nuevoValor = (l ? l.n : 0) + d;
    
    // Validación estricta: solo enteros positivos
    if (d < 0 && nuevoValor < 0) return; // No bajar de 0
    if (!Number.isInteger(nuevoValor)) return; // Solo enteros

    if (nuevoValor <= 0) {
      S.cart = S.cart.filter(function (x) { return x !== l; });
      if (l) toast("Producto eliminado");
    } else if (l) {
      l.n = nuevoValor;
      toast("Cantidad actualizada");
    } else {
      S.cart.push({ t: t, id: id, op: op || "", n: nuevoValor });
      toast("Agregado al carrito");
    }
    save(); refrescar();
  }

  // --- RENDERIZADO ---
  function renderChips() {
    var cats = ["Todas"]; PRODUCTOS.forEach(function (p) { if (cats.indexOf(p.categoria) < 0) cats.push(p.categoria); }); cats.push("Favoritos");
    $("#chips").innerHTML = cats.map(function (c) { return '<button type="button" class="chip' + (S.cat === c ? " on" : "") + '" data-a="cat" data-v="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");
  }
  
  function foto(src, alt) { return '<div class="ph0">' + (src ? '<img loading="lazy" src="' + esc(src) + '" alt="' + esc(alt) + '">' : "Foto próximamente") + "</div>"; }
  
  function renderLista() {
    var q = S.q.trim().toLowerCase();
    var v = PRODUCTOS.filter(function (p) {
      var okc = S.cat === "Todas" || (S.cat === "Favoritos" ? S.favs.indexOf(p.id) > -1 : p.categoria === S.cat);
      return okc && (!q || (p.nombre + " " + p.categoria + " " + p.descripcion).toLowerCase().indexOf(q) > -1);
    });
    $("#lista").innerHTML = v.length ? v.map(function (p) {
      var off = p.disponible === false, fav = S.favs.indexOf(p.id) > -1;
      
      var currentFoto = p.foto;
      if (p.fotos_opciones) {
        var opEnCarrito = S.cart.filter(function(l){ return l.id === p.id; })[0];
        var opSeleccionada = opEnCarrito ? opEnCarrito.op : p.opciones[0];
        if (p.fotos_opciones[opSeleccionada]) currentFoto = p.fotos_opciones[opSeleccionada];
      }

      var opts = p.opciones.map(function (op) {
        var l = line("p", p.id, op);
        var cant = l ? l.n : 0;
        return '<div class="opt"><span>' + esc(p.opciones.length > 1 ? op : "Cantidad") + '</span><div class="st"><button type="button" data-a="add" data-t="p" data-id="' + esc(p.id) + '" data-op="' + esc(op) + '" data-d="-1" aria-label="Restar"' + (off || cant <= 0 ? " disabled" : "") + '>−</button><span>' + cant + ' kg</span><button type="button" data-a="add" data-t="p" data-id="' + esc(p.id) + '" data-op="' + esc(op) + '" data-d="1" aria-label="Sumar"' + (off ? " disabled" : "") + ">+</button></div></div>";
      }).join("");
      
      return '<article class="card">' + foto(currentFoto, p.nombre) + '<div class="cb"><h3>' + esc(p.nombre) + '<button type="button" class="fav' + (fav ? " on" : "") + '" data-a="fav" data-id="' + esc(p.id) + '" aria-label="Favorito: ' + esc(p.nombre) + '" aria-pressed="' + fav + '">' + IC.heart + "</button></h3><p>" + esc(p.descripcion) + '</p><div class="price">' + money(p.precio) + " <small>" + esc(p.venta.etiqueta) + "</small></div>" + (off ? '<div class="tag">No disponible</div>' : opts) + "</div></article>";
    }).join("") : '<p class="tag">No encontramos ese producto.</p>';
  }
  
  function renderInfo() {
    var b = [["Cómo comprar", "Elegí tus milanesas, armá el carrito, completá tus datos y confirmá. Te abrimos WhatsApp con el resumen para enviarlo."],
      ["Entrega", "Retiro en " + CONFIG.direccionRetiro + " sin cargo. Envío únicamente en Barrio La Esmeralda con costo de " + money(CONFIG.envio.zonas[0].costo) + "."],
      ["Pagos", CONFIG.pagos.join(" · ") + ". Transferencia: Alias " + CONFIG.alias + " (" + CONFIG.titular + ")."],
      ["Horarios", CONFIG.horarioTxt]];
    if (CONFIG.conservacion) b.push(["Conservación", CONFIG.conservacion]);
    b.push(["Contacto", "WhatsApp " + CONFIG.telefono]);
    $("#infoBody").innerHTML = b.map(function (x) { return "<div><h3>" + esc(x[0]) + "</h3><p>" + esc(x[1]) + "</p></div>"; }).join("");
  }
  
  function renderBar() {
    var c = calcularTotales(), n = S.cart.length;
    $("#cnt").textContent = n; $("#bar").hidden = n === 0 || S.open;
    $("#barBtn").textContent = "Ver carrito · " + n + (n === 1 ? " producto" : " productos") + " · " + money(c.total);
  }
  
  function refrescar() { renderLista(); renderBar(); if (S.open) renderPanel(); }

  // --- AGENDA (Franjas horarias) ---
  function getFranjasDisponibles(cfg, fechaISO) {
    // Retorna array de strings "HH:MM a HH:MM"
    var fecha = new Date(fechaISO + "T00:00:00");
    var diaSemana = fecha.getDay(); // 0=Dom, 1=Lun...
    if (cfg.dias.indexOf(diaSemana) < 0) return [];
    
    var ahora = new Date();
    var minTime = ahora.getTime() + CONFIG.agenda.anticipacionHoras * 3600000;
    
    var franjas = [];
    cfg.franjas.forEach(function(f) {
      var partesD = f.desde.split(":").map(Number);
      var partesH = f.hasta.split(":").map(Number);
      var inicio = new Date(fecha); inicio.setHours(partesD[0], partesD[1], 0, 0);
      var fin = new Date(fecha); fin.setHours(partesH[0], partesH[1], 0, 0);
      
      if (inicio.getTime() >= minTime) {
        franjas.push(f.desde + " a " + f.hasta);
      }
    });
    return franjas;
  }

  function diasDisponibles() {
    var env = S.f.modo === "Envío", cfg = env ? CONFIG.agenda.envio : CONFIG.agenda.retiro;
    var out = [];
    for (var i = 0; i <= CONFIG.agenda.diasAdelante; i++) {
      var d = new Date(); d.setDate(d.getDate() + i);
      var isoStr = iso(d);
      if (CONFIG.agenda.bloqueadas.indexOf(isoStr) > -1) continue;
      
      var franjas = getFranjasDisponibles(cfg, isoStr);
      if (franjas.length) {
        out.push({ 
          iso: isoStr, 
          label: d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }), 
          franjas: franjas 
        });
      }
    }
    return out;
  }

  // --- PANEL / CHECKOUT ---
  var STEPS = ["Tu carrito", "Tus datos", "Entrega", "Fecha y horario", "Pago", "Resumen"];
  
  function totHtml(c) {
    var h = '<div class="tot"><div class="row"><span>Subtotal</span><span>' + money(c.sub) + "</span></div>";
    if (c.desc > 0) h += '<div class="row"><span>Descuento Promo</span><span>-' + money(c.desc) + "</span></div>";
    if (S.f.modo === "Envío" && S.step >= 2 && zona()) h += '<div class="row"><span>Envío</span><span>' + money(c.env) + "</span></div>";
    h += '<div class="row t"><span>Total</span><b>' + money(c.total) + "</b></div></div>";
    return h;
  }
  
  function itemsHtml(c, edit) {
    return c.L.map(function (x, i) {
      var l = S.cart[i];
      return '<div class="row"><span>' + esc(x.txt) + " · " + esc(x.q) + "</span>" + (edit ? '<span><button type="button" class="ib" data-a="line" data-i="' + i + '" data-d="-1" aria-label="Restar">−</button> <button type="button" class="ib" data-a="line" data-i="' + i + '" data-d="1" aria-label="Sumar">+</button> <button type="button" class="ib" data-a="del" data-i="' + i + '" aria-label="Eliminar">' + IC.x + "</button></span>" : "<b>" + money(x.m) + "</b>") + "</div>";
    }).join("");
  }
  
  function waUrl(id, c) {
    var f = S.f, d = diasDisponibles().filter(function (x) { return x.iso === f.fecha; })[0];
    var t = ["*LA MIGAJA | NUEVO PEDIDO*", "", "PEDIDO: " + id, "", "*CLIENTE*", "Nombre: " + f.nombre, "Teléfono: " + f.tel, "", "*ENTREGA*", "Modalidad: " + f.modo];
    
    if (f.modo === "Envío") {
      t.push("Dirección: " + f.calle + " " + f.altura + (f.piso ? ", " + f.piso : "") + " (" + f.zona + ")" + (f.ref ? " - " + f.ref : ""));
    } else {
      t.push("Retiro en: " + CONFIG.direccionRetiro);
    }
    
    t.push("Fecha: " + (d ? d.label : f.fecha), "Franja: " + f.hora, "", "*DETALLE DEL PEDIDO*");
    
    c.L.forEach(function (x) { 
      t.push("• " + x.txt + " — " + x.q + " — " + money(x.m)); 
    });
    
    if (c.promos.length > 0) {
      t.push("", "*PROMOCIONES*");
      c.promos.forEach(function(p) {
        t.push(p.nombre + ": " + p.descripcion);
      });
      t.push("Ahorro: " + money(c.desc));
    }
    
    t.push("", "*RESUMEN*", "Subtotal: " + money(c.sub), "Descuentos: -" + money(c.desc), "Envío: " + (f.modo === "Envío" ? money(c.env) : "—"), "*TOTAL: " + money(c.total) + "*", "", "*PAGO*", "Medio: " + f.pago);
    
    if (f.pago === "Transferencia") {
      t.push("Alias: " + CONFIG.alias, "Titular: " + CONFIG.titular, "Comprobante: pendiente de validación.");
    } else {
      t.push("Pago al retirar o recibir.");
    }
    
    t.push("", "Estado: PENDIENTE DE CONFIRMACIÓN.");
    
    if (f.obs) t.push("", "*OBSERVACIONES*", f.obs);
    
    return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(t.join("\n"));
  }
  
  function validar(step) {
    var f = S.f, c = calcularTotales();
    if (step === 0 && !c.L.length) return "Tu carrito está vacío.";
    if (step === 1) { 
      if (!f.nombre.trim()) return "Escribí tu nombre y apellido."; 
      if (f.tel.replace(/\D/g, "").length < 8) return "Escribí un teléfono válido."; 
    }
    if (step === 2 && f.modo === "Envío") {
      if (!CONFIG.envio.habilitado || !CONFIG.envio.zonas.length) return "Por ahora no hacemos envíos. Elegí retiro.";
      var z = zona(); if (!z) return "Elegí tu zona de entrega.";
      if (!f.calle.trim() || !f.altura.trim()) return "Completá calle y altura.";
    }
    if (step === 3) { 
      var ds = diasDisponibles();
      var d = ds.filter(function (x) { return x.iso === f.fecha; })[0]; 
      if (!d) return "Elegí una fecha válida."; 
      if (!d.franjas.includes(f.hora)) return "Elegí una franja horaria disponible."; 
    }
    if (step === 4 && CONFIG.pagos.indexOf(f.pago) < 0) return "Elegí un método de pago.";
    return "";
  }
  
  function renderPanel() {
    var pb = $("#pb"), f = S.f, c = calcularTotales(), h = "";
    $("#pt").textContent = S.done ? "Pedido listo" : STEPS[S.step];
    
    if (S.done) {
      h = "<p><b>" + esc(S.done.id) + "</b></p><p>Se abrió WhatsApp con tu pedido. Tocá <b>Enviar</b> para que le llegue al negocio. Hasta que el negocio lo confirme, el pedido no está confirmado.</p><p class=\"tag\">El pedido quedó guardado en este dispositivo para que puedas repetirlo.</p><a class=\"btn y\" target=\"_blank\" rel=\"noopener\" href=\"" + esc(S.done.url) + "\">Abrir WhatsApp de nuevo</a> <button type=\"button\" class=\"btn r\" data-a=\"fin\">Volver al catálogo</button>";
    } else if (S.step === 0) {
      if (!c.L.length) {
        h = "<p>Tu carrito está vacío.</p><button type=\"button\" class=\"btn y\" data-a=\"fin\">Explorar productos</button>";
      } else {
        h = itemsHtml(c, true) + totHtml(c) + '<div class="nav"><button type="button" class="btn o" data-a="fin">Seguir comprando</button><button type="button" class="btn r" data-a="next">Ir al checkout</button></div><button type="button" class="btn o" data-a="vaciar">Vaciar carrito</button>';
      }
    } else {
      h = '<p class="steps">Paso ' + S.step + " de 5</p>";
      
      if (S.step === 1) {
        h += '<label class="fld">Nombre y apellido<input data-f="nombre" autocomplete="name" value="' + esc(f.nombre) + '"></label><label class="fld">Teléfono<input data-f="tel" type="tel" autocomplete="tel" value="' + esc(f.tel) + '"></label>';
      }
      
      if (S.step === 2) {
        h += '<div class="seg"><button type="button" data-a="modo" data-v="Retiro" class="' + (f.modo === "Retiro" ? "on" : "") + '">Retiro</button><button type="button" data-a="modo" data-v="Envío" class="' + (f.modo === "Envío" ? "on" : "") + '">Envío</button></div>';
        if (f.modo === "Retiro") {
          h += '<div class="box">Retiro en: <b>' + esc(CONFIG.direccionRetiro) + "</b><br>" + esc(CONFIG.condicionesRetiro) + "</div>";
        } else {
          h += '<label class="fld">Zona de entrega<select data-f="zona"><option value="">Elegí tu zona</option>' + CONFIG.envio.zonas.map(function (z) { return '<option value="' + esc(z.nombre) + '"' + (f.zona === z.nombre ? " selected" : "") + ">" + esc(z.nombre) + " · Envío " + money(z.costo) + "</option>"; }).join("") + '</select></label><label class="fld">Calle<input data-f="calle" value="' + esc(f.calle) + '"></label><label class="fld">Altura<input data-f="altura" inputmode="numeric" value="' + esc(f.altura) + '"></label><label class="fld">Piso / depto (opcional)<input data-f="piso" value="' + esc(f.piso) + '"></label><label class="fld">Referencias (opcional)<input data-f="ref" value="' + esc(f.ref) + '"></label>';
        }
      }
      
      if (S.step === 3) {
        var ds = diasDisponibles(), cur = ds.filter(function (x) { return x.iso === f.fecha; })[0];
        h += ds.length ? '<label class="fld">Fecha<select data-f="fecha"><option value="">Elegí una fecha</option>' + ds.map(function (d) { return '<option value="' + d.iso + '"' + (f.fecha === d.iso ? " selected" : "") + ">" + esc(d.label) + "</option>"; }).join("") + "</select></label>" + (cur ? '<label class="fld">Franja horaria<select data-f="hora"><option value="">Elegí una franja</option>' + cur.franjas.map(function (s) { return '<option value="' + esc(s) + '"' + (f.hora === s ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + "</select></label>" : "") : '<p class="err">No hay fechas disponibles por ahora.</p>';
      }
      
      if (S.step === 4) {
        h += '<div class="seg">' + CONFIG.pagos.map(function (p) { return '<button type="button" data-a="pago" data-v="' + esc(p) + '" class="' + (f.pago === p ? "on" : "") + '">' + esc(p) + "</button>"; }).join("") + "</div>";
        if (f.pago === "Transferencia") {
          h += '<div class="box">Alias: <b>' + esc(CONFIG.alias) + "</b><br>Titular: <b>" + esc(CONFIG.titular) + "</b><br>Importe: <b>" + money(c.total) + '</b><br>Enviá el comprobante por WhatsApp. El pago se confirma cuando el negocio lo verifica.</div>';
        } else {
          h += '<div class="box">Pago en efectivo al retirar o recibir el pedido.</div>';
        }
        h += '<label class="fld">Observaciones (opcional)<textarea data-f="obs" rows="3">' + esc(f.obs) + "</textarea></label>";
      }
      
      if (S.step === 5) {
        var d2 = diasDisponibles().filter(function (x) { return x.iso === f.fecha; })[0];
        h += "<p><b>" + esc(f.nombre) + "</b> · " + esc(f.tel) + "<br>" + esc(f.modo) + (f.modo === "Envío" ? ": " + esc(f.calle + " " + f.altura + (f.piso ? ", " + f.piso : "") + " (" + f.zona + ")") : ": " + esc(CONFIG.direccionRetiro)) + "<br>" + esc((d2 ? d2.label : f.fecha) + " · " + f.hora) + "<br>Pago: " + esc(f.pago) + (f.obs ? "<br>Obs.: " + esc(f.obs) : "") + "</p>" + itemsHtml(c, false);
      }
      
      if (S.step >= 2) h += totHtml(c);
      
      h += '<div class="err" id="err" role="alert"></div><div class="nav"><button type="button" class="btn o" data-a="prev">Atrás</button><button type="button" class="btn r" data-a="' + (S.step === 5 ? "confirm" : "next") + '"' + (S.busy ? " disabled" : "") + ">" + (S.step === 5 ? "Confirmar pedido" : "Siguiente") + "</button></div>";
    }
    pb.innerHTML = h;
  }
  
  function abrir(v) { S.open = v; $("#ov").hidden = !v; if (v) { renderPanel(); $("#x").focus(); } renderBar(); }
  
  function confirmar() {
    if (S.busy) return; var c = calcularTotales(); if (!c.L.length) return;
    for (var s = 1; s <= 4; s++) { var m = validar(s); if (m) { S.step = s; renderPanel(); $("#err").textContent = m; return; } }
    S.busy = true; setTimeout(function () { S.busy = false; }, 3000);
    
    // ID determinista pero único (no garantiza unicidad global sin backend)
    var id = "MGA-" + iso(new Date()).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    var url = waUrl(id, c), hist = ls.get("mg-hist", []);
    hist.unshift({ id: id, lines: S.cart.slice() }); ls.set("mg-hist", hist.slice(0, 8));
    window.open(url, "_blank", "noopener");
    S.done = { id: id, url: url }; S.cart = []; save(); refrescar(); toast("Pedido registrado");
  }

  // --- EVENTOS ---
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-a]"); if (!b) return; var a = b.getAttribute("data-a"), v = b.getAttribute("data-v"), i = +b.getAttribute("data-i");
    if (a === "cat") { S.cat = v; renderChips(); renderLista(); }
    else if (a === "add") add(b.getAttribute("data-t"), b.getAttribute("data-id"), b.getAttribute("data-op"), +b.getAttribute("data-d"));
    else if (a === "fav") { var k = S.favs.indexOf(b.getAttribute("data-id")); if (k > -1) S.favs.splice(k, 1); else S.favs.push(b.getAttribute("data-id")); ls.set("mg-favs", S.favs); renderLista(); }
    else if (a === "line") { var l = S.cart[i]; if (l) add(l.t, l.id, l.op, +b.getAttribute("data-d")); }
    else if (a === "del") { S.cart.splice(i, 1); save(); refrescar(); toast("Producto eliminado"); }
    else if (a === "vaciar") { S.cart = []; save(); refrescar(); }
    else if (a === "modo") { S.f.modo = v; S.f.fecha = ""; S.f.hora = ""; renderPanel(); }
    else if (a === "pago") { S.f.pago = v; renderPanel(); }
    else if (a === "prev") { S.step = Math.max(0, S.step - 1); renderPanel(); }
    else if (a === "next") { var m = validar(S.step); if (m) { if (S.step === 0) toast(m); else $("#err").textContent = m; return; } S.step++; renderPanel(); }
    else if (a === "confirm") confirmar();
    else if (a === "fin") { S.done = null; S.step = 0; abrir(false); }
  });
  
  $("#pb").addEventListener("input", function (e) { var k = e.target.getAttribute("data-f"); if (k && e.target.tagName !== "SELECT") S.f[k] = e.target.value; });
  $("#pb").addEventListener("change", function (e) { var k = e.target.getAttribute("data-f"); if (k && e.target.tagName === "SELECT") { S.f[k] = e.target.value; if (k === "fecha") S.f.hora = ""; renderPanel(); } });
  $("#q").addEventListener("input", function (e) { S.q = e.target.value; renderLista(); });
  $("#cartBtn").addEventListener("click", function () { S.step = 0; S.done = null; abrir(true); });
  $("#barBtn").addEventListener("click", function () { S.step = 0; S.done = null; abrir(true); });
  $("#x").addEventListener("click", function () { abrir(false); });
  $("#ov").addEventListener("click", function (e) { if (e.target === this) abrir(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && S.open) abrir(false); });

  // Tema
  var tema = ls.get("mg-tema", null) || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", tema);
  $("#tema").addEventListener("click", function () { tema = tema === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", tema); ls.set("mg-tema", tema); });

  // Inicio
  $("#ic").innerHTML = IC.cart; $("#x").innerHTML = IC.x;
  $("#heroImg").addEventListener("error", function () { this.remove(); });
  depurar(); renderChips(); renderInfo(); refrescar();
})();
