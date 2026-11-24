
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var money = function (n) {
    return "$" + Math.round(n).toLocaleString("es-AR");
  };

  var ls = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch (e) {
        return d;
      }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }
  };

  var IC = {
    cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  var S = {
    cart: ls.get("mg-cart", []),
    favs: ls.get("mg-favs", []),
    cat: "Todas",
    open: false,
    step: 0,
    done: null,
    busy: false,
    error: "",
    f: {
      nombre: "",
      tel: "",
      email: "",
      modo: "Retiro",
      zona: "",
      calle: "",
      altura: "",
      piso: "",
      ref: "",
      pago: CONFIG.pagos[0],
      obs: ""
    }
  };

  var prod = function (id) {
    return PRODUCTOS.filter(function (p) { return p.id === id; })[0];
  };

  var zona = function () {
    return CONFIG.envio.zonas.filter(function (z) {
      return z.nombre === S.f.zona;
    })[0];
  };

  var save = function () {
    ls.set("mg-cart", S.cart);
  };

  var toast = function (m) {
    var t = $("#toast");
    t.textContent = m;
    t.classList.add("on");
    clearTimeout(toast.h);
    toast.h = setTimeout(function () {
      t.classList.remove("on");
    }, 1600);
  };

  function horarioPedidosAbierto() {
    var cfg = CONFIG.orderHours;
    if (!cfg || !cfg.days) return false;

    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: cfg.timezone || "America/Argentina/Buenos_Aires",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());

    var values = {};
    parts.forEach(function (part) {
      values[part.type] = part.value;
    });

    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var day = days[values.weekday];
    var now = Number(values.hour) * 60 + Number(values.minute);
    var slots = cfg.days[day] || [];

    return slots.some(function (slot) {
      var from = Number(slot.from.slice(0, 2)) * 60 + Number(slot.from.slice(3, 5));
      var to = Number(slot.to.slice(0, 2)) * 60 + Number(slot.to.slice(3, 5));
      return now >= from && now < to;
    });
  }

  function mensajeHorarioPedidos() {
    return "La toma de pedidos está cerrada. Horarios: lunes a viernes de 14:00 a 20:00; sábados de 10:00 a 14:00. Domingos cerrado.";
  }

  var qtxt = function (p, n) {
    return p.venta.unidad === "kg" ? String(n) + " kg" : n + " u.";
  };

  function calcularTotales() {
    var lineas = [];
    var subtotal = 0;

    S.cart.forEach(function (l, idx) {
      var p = prod(l.id);
      if (!p) return;

      var m = p.precio * l.n;
      subtotal += m;

      lineas.push({
        txt: p.nombre + (p.opciones.length > 1 ? " (" + l.op + ")" : ""),
        q: qtxt(p, l.n),
        pu: p.precio,
        m: m,
        ok: true,
        idx: idx
      });
    });

    var envio = 0;

    if (S.f.modo === "Envío" && zona()) {
      envio = zona().costo;
    }

    return {
      L: lineas,
      sub: subtotal,
      env: envio,
      total: subtotal + envio
    };
  }

  function depurar() {
    S.cart = S.cart.filter(function (l) {
      var p = prod(l.id);
      return p &&
        p.disponible !== false &&
        p.opciones.indexOf(l.op) > -1 &&
        l.n > 0 &&
        Number.isInteger(l.n);
    });

    save();
  }

  function line(t, id, op) {
    return S.cart.filter(function (l) {
      return l.t === t && l.id === id && l.op === (op || "");
    })[0];
  }

  function add(t, id, op, d) {
    var p = t === "p" ? prod(id) : null;
    var l = line(t, id, op);

    if (p && p.disponible === false) return;

    var nuevoValor = (l ? l.n : 0) + d;

    if (d < 0 && nuevoValor < 0) return;
    if (!Number.isInteger(nuevoValor)) return;

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

    save();
    refrescar();
  }

  function renderChips() {
    var cats = ["Todas"];

    PRODUCTOS.forEach(function (p) {
      if (cats.indexOf(p.categoria) < 0) cats.push(p.categoria);
    });

    cats.push("Favoritos");

    $("#chips").innerHTML = cats.map(function (c) {
      return '<button type="button" class="chip' +
        (S.cat === c ? " on" : "") +
        '" data-a="cat" data-v="' + esc(c) + '">' +
        esc(c) + "</button>";
    }).join("");
  }

  function foto(src, alt) {
    return '<div class="ph0">' +
      (src ? '<img loading="lazy" src="' + esc(src) + '" alt="' + esc(alt) + '">' : "Foto próximamente") +
      "</div>";
  }

  function renderLista() {
    var v = PRODUCTOS.filter(function (p) {
      var okc = S.cat === "Todas" ||
        (S.cat === "Favoritos" ? S.favs.indexOf(p.id) > -1 : p.categoria === S.cat);
      return okc;
    });

    $("#lista").innerHTML = v.length ? v.map(function (p) {
      var off = p.disponible === false;
      var fav = S.favs.indexOf(p.id) > -1;
      var currentFoto = p.foto;

      if (p.fotos_opciones) {
        var opEnCarrito = S.cart.filter(function (l) {
          return l.id === p.id;
        })[0];

        var opSeleccionada = opEnCarrito ? opEnCarrito.op : p.opciones[0];

        if (p.fotos_opciones[opSeleccionada]) {
          currentFoto = p.fotos_opciones[opSeleccionada];
        }
      }

      var opts = p.opciones.map(function (op) {
        var l = line("p", p.id, op);
        var cant = l ? l.n : 0;

        return '<div class="opt"><span>' +
          esc(p.opciones.length > 1 ? op : "Cantidad") +
          '</span><div class="st"><button type="button" data-a="add" data-t="p" data-id="' +
          esc(p.id) + '" data-op="' + esc(op) + '" data-d="-1" aria-label="Restar"' +
          (off || cant <= 0 ? " disabled" : "") +
          '>−</button><span>' + cant +
          ' kg</span><button type="button" data-a="add" data-t="p" data-id="' +
          esc(p.id) + '" data-op="' + esc(op) + '" data-d="1" aria-label="Sumar"' +
          (off ? " disabled" : "") + ">+</button></div></div>";
      }).join("");

      return '<article class="card">' +
        foto(currentFoto, p.nombre) +
        '<div class="cb"><h3>' + esc(p.nombre) +
        '<button type="button" class="fav' + (fav ? " on" : "") +
        '" data-a="fav" data-id="' + esc(p.id) +
        '" aria-label="Favorito: ' + esc(p.nombre) +
        '" aria-pressed="' + fav + '">' + IC.heart +
        "</button></h3><p>" + esc(p.descripcion) +
        '</p><div class="price">' + money(p.precio) +
        " <small>" + esc(p.venta.etiqueta) + "</small></div>" +
        (off ? '<div class="tag">No disponible</div>' : opts) +
        "</div></article>";
    }).join("") : '<p class="tag">No encontramos ese producto.</p>';
  }

  function renderInfo() {
    var b = [
      ["Cómo comprar", "Elegí tus milanesas, armá el carrito, completá tus datos y confirmá. Se abrirá WhatsApp con el resumen de tu pedido para que puedas enviarlo."],
      ["Entregas y retiros", "Retiro sin cargo en <b>Av. Obispo Jorge Novak 2076</b>.<br><br>Envíos únicamente en <b>La Esmeralda, Villa Vatteone y San Jorge</b>, con un costo de <b>$1.500</b>."],
      ["Medios de pago", "Aceptamos transferencia y efectivo.<br><br><b>Alias:</b> migaja.com.ar<br><b>Titular:</b> Pedro Javier Higuera Marin."],
      ["Horarios para realizar pedidos", "<b>Lunes a viernes:</b> 14:00 a 20:00 hs.<br><b>Sábados:</b> 10:00 a 14:00 hs.<br><b>Domingos:</b> Cerrado."],
      ["Horarios de delivery", "<b>Lunes a Viernes:</b> 14:00 a 20:00 hs."],
      ["Conservación", "Mantené las milanesas refrigeradas hasta el momento de prepararlas. Cocinalas completamente antes de consumirlas."],
      ["Contacto", "Para consultas o pedidos, comunicate con nosotros por WhatsApp.<br><br><a href='https://wa.me/" + CONFIG.whatsapp + "' target='_blank'><b>WhatsApp:</b> " + CONFIG.telefono + "</a>"]
    ];

    $("#infoBody").innerHTML = b.map(function (x) {
      return "<div><h3>" + esc(x[0]) + "</h3><p>" + x[1] + "</p></div>";
    }).join("");
  }

  function renderBar() {
    var c = calcularTotales();
    var n = S.cart.length;

    $("#cnt").textContent = n;
    $("#barCount").textContent = n;
    $("#barTxt").textContent = n > 0 ? money(c.total) : "Carrito";

    $("#barBtn").style.opacity = (n === 0 || S.open) ? "0.5" : "1";
  }

  function refrescar() {
    renderLista();
    renderBar();
    if (S.open) renderPanel();
  }

  var STEPS = ["Tu carrito", "Datos y entrega", "Resumen"];

  function totHtml(c) {
    var h = '<div class="tot"><div class="row"><span>Subtotal</span><span>' +
      money(c.sub) + "</span></div>";

    if (S.f.modo === "Envío" && S.step >= 1 && zona()) {
      h += '<div class="row"><span>Envío</span><span>' + money(c.env) + "</span></div>";
    }

    h += '<div class="row t"><span>Total</span><b>' +
      money(c.total) + "</b></div></div>";

    return h;
  }

  function itemsHtml(c, edit) {
    return c.L.map(function (x, i) {
      return '<div class="row"><span>' + esc(x.txt) + " · " + esc(x.q) +
        "</span>" +
        (edit
          ? '<span><button type="button" class="ib" data-a="line" data-i="' + x.idx +
            '" data-d="-1" aria-label="Restar">−</button> ' +
            '<button type="button" class="ib" data-a="line" data-i="' + x.idx +
            '" data-d="1" aria-label="Sumar">+</button> ' +
            '<button type="button" class="ib" data-a="del" data-i="' + x.idx +
            '" aria-label="Eliminar">' + IC.x + "</button></span>"
          : "<b>" + money(x.m) + "</b>") +
        "</div>";
    }).join("");
  }

  function waUrl(id, c) {
    var f = S.f;

    var t = [
      "*NUEVO PEDIDO · MIGAJA*",
      "*Pedido:* " + id,
      "",
      "*Cliente:* " + f.nombre,
      "*Teléfono:* " + f.tel,
      "",
      "*ENTREGA*",
      "Modalidad: " + f.modo
    ];

    if (f.modo === "Envío") {
      t.push(
        "Dirección: " + f.calle + " " + f.altura +
        (f.piso ? ", " + f.piso : "") +
        " (" + f.zona + ")" +
        (f.ref ? " - " + f.ref : "")
      );
    } else {
      t.push("Dirección: " + CONFIG.direccionRetiro);
    }

    t.push("Horario: A coordinar", "", "*PEDIDO*");

    c.L.forEach(function (x) {
      t.push("• " + x.q + " de " + x.txt + " — " + money(x.m));
    });

    t.push("", "*RESUMEN*", "Subtotal: " + money(c.sub));

    if (f.modo === "Envío") {
      t.push("Envío: " + money(c.env));
    }

    t.push(
      "*TOTAL: " + money(c.total) + "*",
      "",
      "*PAGO*",
      "Método: " + f.pago
    );

    if (f.pago === "Transferencia") {
      t.push(
        "Alias: " + CONFIG.alias,
        "Titular: " + CONFIG.titular,
        "Enviá el comprobante por este medio."
      );
    } else {
      t.push("Abonás en efectivo al retirar o recibir el pedido.");
    }

    t.push(
      "",
      "*ESTADO*",
      "Pedido recibido. Pendiente de coordinación.",
      "",
      "*Gracias por elegir Migaja.*"
    );

    return "https://wa.me/" + CONFIG.whatsapp +
      "?text=" + encodeURIComponent(t.join("\n"));
  }

  function validar(step) {
    var f = S.f;
    var c = calcularTotales();

    if (!horarioPedidosAbierto()) return mensajeHorarioPedidos();
    if (step === 0 && !c.L.length) return "Tu carrito está vacío.";

    if (step === 1) {
      if (!f.nombre.trim()) return "Escribí tu nombre y apellido.";

      if (f.tel.replace(/\D/g, "").length < 8) {
        return "Escribí un teléfono válido.";
      }

      if (f.modo === "Envío") {
        if (!CONFIG.envio.habilitado || !CONFIG.envio.zonas.length) {
          return "Por ahora no hacemos envíos. Elegí retiro.";
        }

        if (!zona()) return "Elegí tu zona de entrega.";

        if (!f.calle.trim() || !f.altura.trim()) {
          return "Completá calle y altura.";
        }
      }
    }

    return "";
  }

  function renderPanel() {
    var pb = $("#pb");
    var f = S.f;
    var c = calcularTotales();
    var h = "";

    $("#pt").textContent = S.done ? "Pedido listo" : STEPS[S.step];

    if (S.done) {
      h = "<p><b>" + esc(S.done.id) + "</b></p>" +
        "<p>El pedido fue registrado en el sistema. Abrí WhatsApp y tocá <b>Enviar</b> para comunicarlo al negocio. La confirmación comercial queda pendiente.</p>" +
        '<a class="btn y" target="_blank" rel="noopener" href="' +
        esc(S.done.url) + '">Abrir WhatsApp</a> ' +
        '<button type="button" class="btn r" data-a="fin">Volver al catálogo</button>';

    } else if (S.step === 0) {
      if (!c.L.length) {
        h = '<p>Tu carrito está vacío.</p>' +
          '<button type="button" class="btn y" data-a="fin">Explorar productos</button>';
      } else {
        h = itemsHtml(c, true) + totHtml(c) +
          '<div class="nav">' +
          '<button type="button" class="btn o" data-a="fin">Seguir comprando</button>' +
          '<button type="button" class="btn r" data-a="next">Finalizar pedido</button>' +
          '</div><button type="button" class="btn o" data-a="vaciar">Vaciar carrito</button>';
      }

    } else if (S.step === 1) {
      h = '<p class="steps">Paso ' + S.step + " de 2</p>";

      h += '<label class="fld">Nombre y apellido<input data-f="nombre" autocomplete="name" value="' +
        esc(f.nombre) + '"></label>';

      h += '<label class="fld">Teléfono<input data-f="tel" type="tel" autocomplete="tel" value="' +
        esc(f.tel) + '"></label>';

      h += '<div class="seg">' +
        '<button type="button" data-a="modo" data-v="Retiro" class="' +
        (f.modo === "Retiro" ? "on" : "") + '">Retiro</button>' +
        '<button type="button" data-a="modo" data-v="Envío" class="' +
        (f.modo === "Envío" ? "on" : "") + '">Envío</button></div>';

      if (f.modo === "Retiro") {
        h += '<div class="box">Retiro en: <b>' +
          esc(CONFIG.direccionRetiro) + "</b><br>" +
          esc(CONFIG.condicionesRetiro) + "</div>";
      } else {
        h += '<label class="fld">Zona de entrega<select data-f="zona">' +
          '<option value="">Elegí tu zona</option>' +
          CONFIG.envio.zonas.map(function (z) {
            return '<option value="' + esc(z.nombre) + '"' +
              (f.zona === z.nombre ? " selected" : "") + ">" +
              esc(z.nombre) + " · Envío " + money(z.costo) +
              "</option>";
          }).join("") +
          '</select></label>';

        h += '<label class="fld">Calle<input data-f="calle" value="' +
          esc(f.calle) + '"></label>';

        h += '<label class="fld">Altura<input data-f="altura" inputmode="numeric" value="' +
          esc(f.altura) + '"></label>';

        h += '<label class="fld">Piso / depto (opcional)<input data-f="piso" value="' +
          esc(f.piso) + '"></label>';

        h += '<label class="fld">Referencias (opcional)<input data-f="ref" value="' +
          esc(f.ref) + '"></label>';
      }

      h += '<div class="box" style="background:#E3DCD3; border:none; margin-top:20px;">' +
        '<b>Horario de entrega</b><br>Una vez confirmado el pedido, te escribimos por WhatsApp para coordinar el día y el horario exacto.</div>';

      h += '<div class="seg">' +
        CONFIG.pagos.map(function (p) {
          return '<button type="button" data-a="pago" data-v="' + esc(p) +
            '" class="' + (f.pago === p ? "on" : "") + '">' +
            esc(p) + "</button>";
        }).join("") + "</div>";

      if (f.pago === "Transferencia") {
        h += '<div class="box">Alias: <b>' + esc(CONFIG.alias) +
          "</b><br>Titular: <b>" + esc(CONFIG.titular) +
          "</b><br>Importe: <b>" + money(c.total) +
          '</b><br>Enviá el comprobante por WhatsApp.</div>';
      } else {
        h += '<div class="box">Pago en efectivo al retirar o recibir el pedido.</div>';
      }

      h += '<label class="fld">Observaciones (opcional)<textarea data-f="obs" rows="3">' +
        esc(f.obs) + "</textarea></label>";

      h += totHtml(c);

      h += '<div class="err" id="err" role="alert"></div>' +
        '<div class="nav">' +
        '<button type="button" class="btn o" data-a="prev">Atrás</button>' +
        '<button type="button" class="btn r" data-a="next">Ver resumen</button>' +
        "</div>";

    } else if (S.step === 2) {
      h = '<p class="steps">Paso ' + S.step + " de 2</p>";

      h += "<p><b>" + esc(f.nombre) + "</b> · " + esc(f.tel) +
        "<br>" + esc(f.modo) +
        (f.modo === "Envío"
          ? ": " + esc(f.calle + " " + f.altura +
            (f.piso ? ", " + f.piso : "") + " (" + f.zona + ")")
          : ": " + esc(CONFIG.direccionRetiro)) +
        "<br>Horario: A coordinar por WhatsApp<br>Pago: " +
        esc(f.pago) + (f.obs ? "<br>Obs.: " + esc(f.obs) : "") +
        "</p>" + itemsHtml(c, false);

      h += totHtml(c);

      h += '<div class="err" id="err" role="alert">' +
        esc(S.error) + "</div>" +
        '<div class="nav">' +
        '<button type="button" class="btn o" data-a="prev">Atrás</button>' +
        '<button type="button" class="btn r" data-a="confirm"' +
        (S.busy ? " disabled" : "") + ">" +
        (S.busy ? "Registrando..." : "Confirmar pedido") +
        "</button></div>";
    }

    if (!horarioPedidosAbierto()) {
      h = '<div class="box" role="status">' +
        esc(mensajeHorarioPedidos()) + "</div>" + h;
    }

    pb.innerHTML = h;
  }

  function abrir(v) {
    S.open = v;
    $("#ov").hidden = !v;

    if (v) {
      renderPanel();
      $("#x").focus();
    }

    renderBar();
  }

  async function confirmar() {
    if (S.busy) return;

    if (!horarioPedidosAbierto()) {
      renderPanel();
      toast(mensajeHorarioPedidos());
      return;
    }

    var c = calcularTotales();

    if (!c.L.length) return;

    var m = validar(1);

    if (m) {
      S.step = 1;
      renderPanel();
      $("#err").textContent = m;
      return;
    }

    S.busy = true;
    S.error = "";
    renderPanel();

    var popup = null;

    try {
      if (typeof window.supabase === "undefined") {
        throw new Error("La librería de Supabase no se cargó.");
      }

      var direccion = null;
      var zonaEntrega = null;

      if (S.f.modo === "Envío") {
        direccion = S.f.calle.trim() + " " + S.f.altura.trim();

        if (S.f.piso.trim()) {
          direccion += ", " + S.f.piso.trim();
        }

        if (S.f.ref.trim()) {
          direccion += ". Referencia: " + S.f.ref.trim();
        }

        zonaEntrega = S.f.zona;
      }

      var detallesArray = S.cart.map(function (l) {
        return {
          producto_id: l.id,
          cantidad: l.n,
          opcion: l.op
        };
      });

      var supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      // La ventana se abre antes de la consulta para evitar bloqueos del navegador.
      popup = window.open("about:blank", "_blank");

      var resultado = await supabase.rpc("crear_pedido_completo", {
        p_cliente_nombre: S.f.nombre.trim(),
        p_cliente_telefono: S.f.tel.trim(),
        p_metodo_pago: S.f.pago,
        p_modalidad: S.f.modo,
        p_observaciones: S.f.obs.trim() || null,
        p_direccion: direccion,
        p_zona: zonaEntrega,
        p_detalles: detallesArray
      });

      if (resultado.error) {
        throw new Error(resultado.error.message);
      }

      var data = resultado.data;

      if (!data || data.exito !== true || !data.pedido_id) {
        throw new Error("Supabase no devolvió una confirmación válida del pedido.");
      }

      // Importes definitivos devueltos por Supabase.
      var id = data.pedido_id;
      c.env = Number(data.costo_envio);
      c.total = Number(data.total);
      c.sub = c.total - c.env;

      if (!Number.isFinite(c.total) || !Number.isFinite(c.env)) {
        throw new Error("Supabase devolvió importes inválidos.");
      }

      var url = waUrl(id, c);

      if (popup && !popup.closed) {
        popup.location.href = url;
      }

      var hist = ls.get("mg-hist", []);

      hist.unshift({
        id: id,
        lines: S.cart.slice()
      });

      ls.set("mg-hist", hist.slice(0, 8));

      S.done = {
        id: id,
        url: url
      };

      S.error = "";
      S.cart = [];
      save();
      refrescar();
      toast("Pedido guardado en Supabase");

    } catch (err) {
      console.error("Error guardando pedido:", err);

      if (popup && !popup.closed) {
        popup.close();
      }

      S.done = null;
      S.error = "No se pudo registrar el pedido: " +
        (err.message || "Error desconocido.");

      // El carrito se conserva para permitir reintentar.
      renderPanel();
      toast("No se pudo registrar el pedido");

    } finally {
      S.busy = false;
      renderPanel();
    }
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-a]");
    if (!b) return;

    var a = b.getAttribute("data-a");
    var v = b.getAttribute("data-v");
    var i = +b.getAttribute("data-i");

    if (a === "cat") {
      S.cat = v;
      renderChips();
      renderLista();

    } else if (a === "add") {
      add(
        b.getAttribute("data-t"),
        b.getAttribute("data-id"),
        b.getAttribute("data-op"),
        +b.getAttribute("data-d")
      );

    } else if (a === "fav") {
      var k = S.favs.indexOf(b.getAttribute("data-id"));

      if (k > -1) {
        S.favs.splice(k, 1);
      } else {
        S.favs.push(b.getAttribute("data-id"));
      }

      ls.set("mg-favs", S.favs);
      renderLista();

    } else if (a === "line") {
      var l = S.cart.filter(function (x) {
        return x.idx === i;
      })[0];

      if (!l) l = S.cart[i];

      if (l) add(l.t, l.id, l.op, +b.getAttribute("data-d"));

    } else if (a === "del") {
      var item = S.cart[i];

      if (item) {
        S.cart.splice(i, 1);
        save();
        refrescar();
        toast("Producto eliminado");
      }

    } else if (a === "vaciar") {
      S.cart = [];
      save();
      refrescar();

    } else if (a === "modo") {
      S.f.modo = v;
      S.error = "";
      renderPanel();

    } else if (a === "pago") {
      S.f.pago = v;
      renderPanel();

    } else if (a === "prev") {
      S.step = Math.max(0, S.step - 1);
      renderPanel();

    } else if (a === "next") {
      var m = validar(S.step);

      if (m) {
        var error = $("#err");
        if (error) error.textContent = m;
        return;
      }

      S.error = "";
      S.step++;
      renderPanel();

    } else if (a === "confirm") {
      confirmar();

    } else if (a === "fin") {
      S.done = null;
      S.error = "";
      S.step = 0;
      abrir(false);
    }
  });

  $("#pb").addEventListener("input", function (e) {
    var k = e.target.getAttribute("data-f");

    if (k && e.target.tagName !== "SELECT") {
      S.f[k] = e.target.value;
    }
  });

  $("#pb").addEventListener("change", function (e) {
    var k = e.target.getAttribute("data-f");

    if (k && e.target.tagName === "SELECT") {
      S.f[k] = e.target.value;
      renderPanel();
    }
  });

  $("#cartBtn").addEventListener("click", function () {
    S.step = 0;
    S.done = null;
    S.error = "";
    abrir(true);
  });

  $("#barBtn").addEventListener("click", function () {
    S.step = 0;
    S.done = null;
    S.error = "";
    abrir(true);
  });

  $("#x").addEventListener("click", function () {
    abrir(false);
  });

  $("#ov").addEventListener("click", function (e) {
    if (e.target === this) abrir(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && S.open) abrir(false);
  });

  $("#ic").innerHTML = IC.cart;
  $("#x").innerHTML = IC.x;

  $("#heroImg").addEventListener("error", function () {
    this.remove();
  });

  depurar();
  renderChips();
  renderInfo();
  refrescar();
})();
