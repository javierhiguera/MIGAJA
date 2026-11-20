(function () {
  "use strict";
  var $ = function (selector) { return document.querySelector(selector); };
  var escapeHtml = function (value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  };
  var formatMoney = function (amount) { return "$" + Math.round(amount).toLocaleString("es-AR"); };
  var storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {}
    }
  };
  var ICONS = {
    cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  var state = {
    cart: storage.get("mg-cart", []),
    favorites: storage.get("mg-favs", []),
    category: "Todas",
    isOpen: false,
    step: 0,
    completedOrder: null,
    isSubmitting: false,
    form: {
      name: "",
      phone: "",
      email: "",
      mode: "Retiro",
      zone: "",
      street: "",
      number: "",
      floor: "",
      reference: "",
      payment: CONFIG.paymentMethods[0],
      notes: ""
    }
  };

  var findProduct = function (id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; };
  var formatDateKey = function (date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  };
  var formatQty = function (product, qty) {
    return product.sale.unit === "kg" ? String(qty) + " kg" : qty + " u.";
  };
  var getSelectedZone = function () {
    return CONFIG.delivery.zones.filter(function (z) { return z.name === state.form.zone; })[0];
  };
  var saveCart = function () { storage.set("mg-cart", state.cart); };
  var showToast = function (msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { el.classList.remove("on"); }, 1600);
  };

  function calculateTotals() {
    var lines = [], regularSubtotal = 0, eligibleKilos = 0;
    var eligibleItems = [];

    state.cart.forEach(function (item, idx) {
      var product = findProduct(item.id);
      if (!product) return;
      var lineTotal = product.price * item.qty;
      regularSubtotal += lineTotal;
      lines.push({
        label: product.name + (product.options.length > 1 ? " (" + item.option + ")" : ""),
        qtyText: formatQty(product, item.qty),
        unitPrice: product.price,
        total: lineTotal,
        ok: true,
        index: idx
      });

      if (PROMO.eligibleIds.indexOf(item.id) > -1) {
        eligibleKilos += item.qty;
        for (var k = 0; k < item.qty; k++) {
          eligibleItems.push({ price: product.price, productId: item.id, option: item.option, index: idx });
        }
      }
    });

    var promoBlocks = Math.floor(eligibleKilos / PROMO.requiredKilos);
    var totalDiscount = 0;
    var promoDetails = [];

    if (promoBlocks > 0) {
      eligibleItems.sort(function (a, b) { return b.price - a.price; });
      var selectedForPromo = eligibleItems.slice(0, promoBlocks * PROMO.requiredKilos);
      var regularPromoValue = selectedForPromo.reduce(function (acc, item) { return acc + item.price; }, 0);
      var promoValue = promoBlocks * PROMO.price;
      totalDiscount = regularPromoValue - promoValue;

      promoDetails.push({
        name: "Promo " + promoBlocks + " x 2 kg",
        description: promoBlocks * 2 + " kg elegibles (Clásica/Crispy)",
        regularValue: regularPromoValue,
        finalValue: promoValue,
        savings: totalDiscount
      });
    }

    var shippingCost = 0;
    if (state.form.mode === "Envío" && getSelectedZone()) {
      shippingCost = getSelectedZone().cost;
    }

    var finalTotal = regularSubtotal - totalDiscount + shippingCost;

    return {
      lines: lines,
      subtotal: regularSubtotal,
      discount: totalDiscount,
      shipping: shippingCost,
      total: finalTotal,
      promos: promoDetails
    };
  }

  function sanitizeCart() {
    state.cart = state.cart.filter(function (item) {
      var product = findProduct(item.id);
      return product && product.available !== false && product.options.indexOf(item.option) > -1 && item.qty > 0 && Number.isInteger(item.qty);
    });
    saveCart();
  }

  function findCartLine(type, id, option) {
    return state.cart.filter(function (item) {
      return item.type === type && item.id === id && item.option === (option || "");
    })[0];
  }

  function updateCartItem(type, id, option, delta) {
    var product = type === "product" ? findProduct(id) : null;
    var line = findCartLine(type, id, option);
    if (product && product.available === false) return;

    var nextQty = (line ? line.qty : 0) + delta;
    if (delta < 0 && nextQty < 0) return;
    if (!Number.isInteger(nextQty)) return;

    if (nextQty <= 0) {
      state.cart = state.cart.filter(function (x) { return x !== line; });
      if (line) showToast("Producto eliminado");
    } else if (line) {
      line.qty = nextQty;
      showToast("Cantidad actualizada");
    } else {
      state.cart.push({ type: type, id: id, option: option || "", qty: nextQty });
      showToast("Agregado al carrito");
    }
    saveCart();
    refreshUI();
  }

  function renderChips() {
    var categories = ["Todas"];
    PRODUCTS.forEach(function (p) {
      if (categories.indexOf(p.category) < 0) categories.push(p.category);
    });
    categories.push("Favoritos");
    $("#chips").innerHTML = categories.map(function (cat) {
      return '<button type="button" class="chip' + (state.category === cat ? " on" : "") + '" data-action="category" data-value="' + escapeHtml(cat) + '">' + escapeHtml(cat) + "</button>";
    }).join("");
  }

  function renderPhoto(src, alt) {
    return '<div class="ph0">' + (src ? '<img loading="lazy" src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '">' : "Foto próximamente") + "</div>";
  }

  function renderProductList() {
    var filtered = PRODUCTS.filter(function (p) {
      return state.category === "Todas" || (state.category === "Favoritos" ? state.favorites.indexOf(p.id) > -1 : p.category === state.category);
    });
    $("#productList").innerHTML = filtered.length ? filtered.map(function (p) {
      var unavailable = p.available === false;
      var isFav = state.favorites.indexOf(p.id) > -1;

      var currentPhoto = p.photo;
      if (p.optionPhotos) {
        var inCart = state.cart.filter(function (item) { return item.id === p.id; })[0];
        var selectedOption = inCart ? inCart.option : p.options[0];
        if (p.optionPhotos[selectedOption]) currentPhoto = p.optionPhotos[selectedOption];
      }

      var optionsHtml = p.options.map(function (opt) {
        var line = findCartLine("product", p.id, opt);
        var qty = line ? line.qty : 0;
        return '<div class="opt"><span>' + escapeHtml(p.options.length > 1 ? opt : "Cantidad") + '</span><div class="st"><button type="button" data-action="adjust" data-type="product" data-id="' + escapeHtml(p.id) + '" data-option="' + escapeHtml(opt) + '" data-delta="-1" aria-label="Restar"' + (unavailable || qty <= 0 ? " disabled" : "") + '>−</button><span>' + qty + ' kg</span><button type="button" data-action="adjust" data-type="product" data-id="' + escapeHtml(p.id) + '" data-option="' + escapeHtml(opt) + '" data-delta="1" aria-label="Sumar"' + (unavailable ? " disabled" : "") + ">+</button></div></div>";
      }).join("");

      return '<article class="card">' + renderPhoto(currentPhoto, p.name) + '<div class="cb"><h3>' + escapeHtml(p.name) + '<button type="button" class="fav' + (isFav ? " on" : "") + '" data-action="favorite" data-id="' + escapeHtml(p.id) + '" aria-label="Favorito: ' + escapeHtml(p.name) + '" aria-pressed="' + isFav + '">' + ICONS.heart + "</button></h3><p>" + escapeHtml(p.description) + '</p><div class="price">' + formatMoney(p.price) + " <small>" + escapeHtml(p.sale.label) + "</small></div>" + (unavailable ? '<div class="tag">No disponible</div>' : optionsHtml) + "</div></article>";
    }).join("") : '<p class="tag">No encontramos ese producto.</p>';
  }

  function renderInfo() {
    var blocks = [
      ["Cómo comprar", "Elegí tus milanesas, armá el carrito, completá tus datos y confirmá. Se abrirá WhatsApp con el resumen de tu pedido para que puedas enviarlo."],
      ["Entregas y retiros", "Retiro sin cargo en <b>Av. Obispo Jorge Novak 2076</b>.<br><br>Envíos únicamente en <b>Barrio La Esmeralda</b>, con un costo de <b>$1.500</b>."],
      ["Medios de pago", "Aceptamos transferencia y efectivo.<br><br><b>Alias:</b> migaja.com.ar<br><b>Titular:</b> Pedro Javier Higuera Marin."],
      ["Horarios de atención", "<b>Lunes a viernes:</b> 10:00 a 14:00 y 17:00 a 20:00 hs.<br><b>Sábados:</b> 10:00 a 14:00 hs.<br><b>Domingos:</b> Cerrado."],
      ["Horarios de delivery", "<b>Lunes a Viernes:</b> 14:00 a 20:00 hs."],
      ["Conservación", "Mantené las milanesas refrigeradas hasta el momento de prepararlas. Cocinalas completamente antes de consumirlas."],
      ["Contacto", "Para consultas o pedidos, comunicate con nosotros por WhatsApp.<br><br><a href='https://wa.me/" + CONFIG.whatsapp + "' target='_blank'><b>WhatsApp:</b> " + CONFIG.phone + "</a>"]
    ];

    $("#infoBody").innerHTML = blocks.map(function (entry) {
      return "<div><h3>" + escapeHtml(entry[0]) + "</h3><p>" + entry[1] + "</p></div>";
    }).join("");
  }

  function renderBar() {
    var totals = calculateTotals();
    var count = state.cart.length;
    $("#cnt").textContent = count;
    $("#barCount").textContent = count;
    $("#barTxt").textContent = count > 0 ? formatMoney(totals.total) : "Carrito";
    $("#barBtn").style.opacity = (count === 0 || state.isOpen) ? "0.5" : "1";
  }

  function refreshUI() {
    renderProductList();
    renderBar();
    if (state.isOpen) renderPanel();
  }

  var STEPS = ["Tu carrito", "Datos y entrega", "Resumen"];

  function renderTotalsHtml(totals) {
    var html = '<div class="tot"><div class="row"><span>Subtotal</span><span>' + formatMoney(totals.subtotal) + "</span></div>";
    if (totals.discount > 0) html += '<div class="row"><span>Descuento Promo</span><span>-' + formatMoney(totals.discount) + "</span></div>";
    if (state.form.mode === "Envío" && state.step >= 1 && getSelectedZone()) html += '<div class="row"><span>Envío</span><span>' + formatMoney(totals.shipping) + "</span></div>";
    html += '<div class="row t"><span>Total</span><b>' + formatMoney(totals.total) + "</b></div></div>";
    return html;
  }

  function renderItemsHtml(totals, editable) {
    return totals.lines.map(function (line, i) {
      return '<div class="row"><span>' + escapeHtml(line.label) + " · " + escapeHtml(line.qtyText) + "</span>" + (editable ? '<span><button type="button" class="ib" data-action="line" data-index="' + i + '" data-delta="-1" aria-label="Restar">−</button> <button type="button" class="ib" data-action="line" data-index="' + i + '" data-delta="1" aria-label="Sumar">+</button> <button type="button" class="ib" data-action="remove" data-index="' + i + '" data-delta="0" aria-label="Eliminar">' + ICONS.close + "</button></span>" : "<b>" + formatMoney(line.total) + "</b>") + "</div>";
    }).join("");
  }

  function buildWhatsAppUrl(orderId, totals) {
    var f = state.form;
    var lines = [
      "*** NUEVO PEDIDO - LA MIGAJA ***",
      "Pedido: " + orderId,
      "----------------------------------",
      "Cliente: " + f.name,
      "Teléfono: " + f.phone,
      "",
      "--- ENTREGA ---",
      "Modalidad: " + f.mode
    ];

    if (f.mode === "Envío") {
      lines.push("Dirección: " + f.street + " " + f.number + (f.floor ? ", " + f.floor : "") + " (" + f.zone + ")" + (f.reference ? " - Ref: " + f.reference : ""));
    } else {
      lines.push("Retiro en: " + CONFIG.pickupAddress);
    }

    lines.push("Horario: A coordinar por WhatsApp");
    lines.push("");
    lines.push("--- TU PEDIDO ---");
    totals.lines.forEach(function (l) {
      lines.push("- " + l.qtyText + " de " + l.label + " - " + formatMoney(l.total));
    });

    if (totals.promos.length > 0) {
      lines.push("");
      lines.push("--- PROMOS APLICADAS ---");
      totals.promos.forEach(function (promo) {
        lines.push(promo.name + ": " + promo.description + " (Ahorrás " + formatMoney(promo.savings) + ")");
      });
    }

    lines.push("");
    lines.push("--- RESUMEN ---");
    lines.push("Subtotal: " + formatMoney(totals.subtotal));
    if (totals.discount > 0) lines.push("Descuento: -" + formatMoney(totals.discount));
    if (f.mode === "Envío") lines.push("Envío: " + formatMoney(totals.shipping));
    lines.push("TOTAL A PAGAR: " + formatMoney(totals.total));
    lines.push("");
    lines.push("--- PAGO ---");
    lines.push("Método: " + f.payment);
    if (f.payment === "Transferencia") {
      lines.push("Alias: " + CONFIG.alias);
      lines.push("Titular: " + CONFIG.accountHolder);
      lines.push(">> Enviá el comprobante por acá para confirmar tu pedido.");
    } else {
      lines.push(">> Abonás en efectivo al retirar o recibir.");
    }

    if (f.notes) {
      lines.push("");
      lines.push("NOTA: " + f.notes);
    }

    lines.push("");
    lines.push("Gracias por elegir La Migaja.");
    return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  function validateStep(step) {
    var f = state.form;
    var totals = calculateTotals();
    if (step === 0 && !totals.lines.length) return "Tu carrito está vacío.";
    if (step === 1) {
      if (!f.name.trim()) return "Escribí tu nombre y apellido.";
      if (f.phone.replace(/\D/g, "").length < 8) return "Escribí un teléfono válido.";
      if (f.mode === "Envío") {
        if (!CONFIG.delivery.enabled || !CONFIG.delivery.zones.length) return "Por ahora no hacemos envíos. Elegí retiro.";
        var zone = getSelectedZone();
        if (!zone) return "Elegí tu zona de entrega.";
        if (!f.street.trim() || !f.number.trim()) return "Completá calle y altura.";
      }
    }
    return "";
  }

  function renderPanel() {
    var panelBody = $("#pb");
    var f = state.form;
    var totals = calculateTotals();
    var html = "";
    $("#pt").textContent = state.completedOrder ? "Pedido listo" : STEPS[state.step];

    if (state.completedOrder) {
      html = "<p><b>" + escapeHtml(state.completedOrder.id) + "</b></p><p>Se abrió WhatsApp con tu pedido. Tocá <b>Enviar</b> para que le llegue al negocio. Hasta que el negocio lo confirme, el pedido no está confirmado.</p><a class=\"btn y\" target=\"_blank\" rel=\"noopener\" href=\"" + escapeHtml(state.completedOrder.url) + "\">Abrir WhatsApp de nuevo</a> <button type=\"button\" class=\"btn r\" data-action=\"finish\">Volver al catálogo</button>";
    } else if (state.step === 0) {
      if (!totals.lines.length) {
        html = "<p>Tu carrito está vacío.</p><button type=\"button\" class=\"btn y\" data-action=\"finish\">Explorar productos</button>";
      } else {
        html = renderItemsHtml(totals, true) + renderTotalsHtml(totals) + '<div class="nav"><button type="button" class="btn o" data-action="finish">Seguir comprando</button><button type="button" class="btn r" data-action="next">Ir al checkout</button></div><button type="button" class="btn o" data-action="clear">Vaciar carrito</button>';
      }
    } else if (state.step === 1) {
      html = '<p class="steps">Paso ' + state.step + " de 2</p>";
      html += '<label class="fld">Nombre y apellido<input data-field="name" autocomplete="name" value="' + escapeHtml(f.name) + '"></label><label class="fld">Teléfono<input data-field="phone" type="tel" autocomplete="tel" value="' + escapeHtml(f.phone) + '"></label>';
      html += '<div class="seg"><button type="button" data-action="mode" data-value="Retiro" class="' + (f.mode === "Retiro" ? "on" : "") + '">Retiro</button><button type="button" data-action="mode" data-value="Envío" class="' + (f.mode === "Envío" ? "on" : "") + '">Envío</button></div>';

      if (f.mode === "Retiro") {
        html += '<div class="box">Retiro en: <b>' + escapeHtml(CONFIG.pickupAddress) + "</b><br>" + escapeHtml(CONFIG.pickupConditions) + "</div>";
      } else {
        html += '<label class="fld">Zona de entrega<select data-field="zone"><option value="">Elegí tu zona</option>' + CONFIG.delivery.zones.map(function (z) {
          return '<option value="' + escapeHtml(z.name) + '"' + (f.zone === z.name ? " selected" : "") + ">" + escapeHtml(z.name) + " · Envío " + formatMoney(z.cost) + "</option>";
        }).join("") + '</select></label><label class="fld">Calle<input data-field="street" value="' + escapeHtml(f.street) + '"></label><label class="fld">Altura<input data-field="number" inputmode="numeric" value="' + escapeHtml(f.number) + '"></label><label class="fld">Piso / depto (opcional)<input data-field="floor" value="' + escapeHtml(f.floor) + '"></label><label class="fld">Referencias (opcional)<input data-field="reference" value="' + escapeHtml(f.reference) + '"></label>';
      }

      html += '<div class="box" style="background:#E3DCD3; border:none; margin-top:20px;"><b>Horario de entrega</b><br>Una vez confirmado el pedido, te escribimos por WhatsApp para coordinar el día y el horario exacto.</div>';

      html += '<div class="seg">' + CONFIG.paymentMethods.map(function (pay) {
        return '<button type="button" data-action="payment" data-value="' + escapeHtml(pay) + '" class="' + (f.payment === pay ? "on" : "") + '">' + escapeHtml(pay) + "</button>";
      }).join("") + "</div>";

      if (f.payment === "Transferencia") {
        html += '<div class="box">Alias: <b>' + escapeHtml(CONFIG.alias) + "</b><br>Titular: <b>" + escapeHtml(CONFIG.accountHolder) + "</b><br>Importe: <b>" + formatMoney(totals.total) + '</b><br>Enviá el comprobante por WhatsApp.</div>';
      } else {
        html += '<div class="box">Pago en efectivo al retirar o recibir el pedido.</div>';
      }

      html += '<label class="fld">Observaciones (opcional)<textarea data-field="notes" rows="3">' + escapeHtml(f.notes) + "</textarea></label>";
      html += renderTotalsHtml(totals);
      html += '<div class="err" id="err" role="alert"></div><div class="nav"><button type="button" class="btn o" data-action="prev">Atrás</button><button type="button" class="btn r" data-action="next">Ver resumen</button></div>';
    } else if (state.step === 2) {
      html = '<p class="steps">Paso ' + state.step + " de 2</p>";
      html += "<p><b>" + escapeHtml(f.name) + "</b> · " + escapeHtml(f.phone) + "<br>" + escapeHtml(f.mode) + (f.mode === "Envío" ? ": " + escapeHtml(f.street + " " + f.number + (f.floor ? ", " + f.floor : "") + " (" + f.zone + ")") : ": " + escapeHtml(CONFIG.pickupAddress)) + "<br>Horario: A coordinar por WhatsApp<br>Pago: " + escapeHtml(f.payment) + (f.notes ? "<br>Obs.: " + escapeHtml(f.notes) : "") + "</p>" + renderItemsHtml(totals, false);
      html += renderTotalsHtml(totals);
      html += '<div class="err" id="err" role="alert"></div><div class="nav"><button type="button" class="btn o" data-action="prev">Atrás</button><button type="button" class="btn r" data-action="confirm"' + (state.isSubmitting ? " disabled" : "") + ">Confirmar pedido</button></div>";
    }

    panelBody.innerHTML = html;
  }

  function setPanelOpen(open) {
    state.isOpen = open;
    $("#ov").hidden = !open;
    if (open) {
      renderPanel();
      $("#x").focus();
    }
    renderBar();
  }

  async function submitOrder() {
    if (state.isSubmitting) return;
    var totals = calculateTotals();
    if (!totals.lines.length) return;
    var validationError = validateStep(1);
    if (validationError) {
      state.step = 1;
      renderPanel();
      $("#err").textContent = validationError;
      return;
    }
    state.isSubmitting = true;

    var orderId = "MGA-" + formatDateKey(new Date()).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    var waLink = buildWhatsAppUrl(orderId, totals);

    try {
      if (typeof window.supabase !== "undefined") {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        const orderDetails = state.cart.map(function (item) {
          var product = findProduct(item.id);
          return {
            producto_id: item.id,
            producto_nombre: product.name,
            cantidad: item.qty,
            precio_unitario: product.price,
            subtotal: product.price * item.qty
          };
        });

        const { error } = await supabase.rpc("crear_pedido_completo", {
          p_cliente_nombre: state.form.name,
          p_cliente_telefono: state.form.phone,
          p_metodo_pago: state.form.payment,
          p_modalidad: state.form.mode,
          p_total: totals.total,
          p_observaciones: state.form.notes,
          p_detalles: orderDetails
        });

        if (error) {
          console.error("Error guardando pedido en Supabase:", error.message);
        }
      }
    } catch (err) {
      console.error("Error al procesar pedido:", err);
    }

    window.open(waLink, "_blank", "noopener");
    var history = storage.get("mg-hist", []);
    history.unshift({ id: orderId, lines: state.cart.slice() });
    storage.set("mg-hist", history.slice(0, 8));
    state.completedOrder = { id: orderId, url: waLink };
    state.cart = [];
    saveCart();
    refreshUI();
    showToast("Pedido listo para enviar");
    state.isSubmitting = false;
  }

  document.addEventListener("click", function (e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");
    var value = target.getAttribute("data-value");
    var index = +target.getAttribute("data-index");

    if (action === "category") {
      state.category = value;
      renderChips();
      renderProductList();
    } else if (action === "adjust") {
      updateCartItem(target.getAttribute("data-type"), target.getAttribute("data-id"), target.getAttribute("data-option"), +target.getAttribute("data-delta"));
    } else if (action === "favorite") {
      var prodId = target.getAttribute("data-id");
      var idx = state.favorites.indexOf(prodId);
      if (idx > -1) state.favorites.splice(idx, 1);
      else state.favorites.push(prodId);
      storage.set("mg-favs", state.favorites);
      renderProductList();
    } else if (action === "line") {
      var line = state.cart[index];
      if (line) updateCartItem(line.type, line.id, line.option, +target.getAttribute("data-delta"));
    } else if (action === "remove") {
      state.cart.splice(index, 1);
      saveCart();
      refreshUI();
      showToast("Producto eliminado");
    } else if (action === "clear") {
      state.cart = [];
      saveCart();
      refreshUI();
    } else if (action === "mode") {
      state.form.mode = value;
      renderPanel();
    } else if (action === "payment") {
      state.form.payment = value;
      renderPanel();
    } else if (action === "prev") {
      state.step = Math.max(0, state.step - 1);
      renderPanel();
    } else if (action === "next") {
      var errMsg = validateStep(state.step);
      if (errMsg) {
        $("#err").textContent = errMsg;
        return;
      }
      state.step++;
      renderPanel();
    } else if (action === "confirm") {
      submitOrder();
    } else if (action === "finish") {
      state.completedOrder = null;
      state.step = 0;
      setPanelOpen(false);
    }
  });

  $("#pb").addEventListener("input", function (e) {
    var field = e.target.getAttribute("data-field");
    if (field && e.target.tagName !== "SELECT") state.form[field] = e.target.value;
  });
  $("#pb").addEventListener("change", function (e) {
    var field = e.target.getAttribute("data-field");
    if (field && e.target.tagName === "SELECT") {
      state.form[field] = e.target.value;
      renderPanel();
    }
  });
  $("#cartBtn").addEventListener("click", function () { state.step = 0; state.completedOrder = null; setPanelOpen(true); });
  $("#barBtn").addEventListener("click", function () { state.step = 0; state.completedOrder = null; setPanelOpen(true); });
  $("#x").addEventListener("click", function () { setPanelOpen(false); });
  $("#ov").addEventListener("click", function (e) { if (e.target === this) setPanelOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.isOpen) setPanelOpen(false); });

  $("#ic").innerHTML = ICONS.cart;
  $("#x").innerHTML = ICONS.close;
  $("#heroImg").addEventListener("error", function () { this.remove(); });
  sanitizeCart();
  renderChips();
  renderInfo();
  refreshUI();
})();
