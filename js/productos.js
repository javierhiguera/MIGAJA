// Catálogo. precio 0 = "A confirmar". foto: ruta a tu imagen real.
// venta: { unidad: "kg" | "u", paso: 0.5, etiqueta: "el kilo" }
const PRODUCTOS = [
  { id: "clasica", categoria: "Clásicas", nombre: "Clásica", descripcion: "Milanesa de pollo casera, lista para freír.",
    foto: "img/clasica.jpg", precio: 0, venta: { unidad: "kg", paso: 0.5, etiqueta: "el kilo" }, opciones: ["Con sal", "Sin sal"], disponible: true },
  { id: "crispy", categoria: "Crispy", nombre: "Crispy", descripcion: "Milanesa de pollo crispy, lista para freír.",
    foto: "img/crispy.jpg", precio: 0, venta: { unidad: "kg", paso: 0.5, etiqueta: "el kilo" }, opciones: ["Única"], disponible: true },
  { id: "semillas", categoria: "Semillas", nombre: "Semillas saborizadas", descripcion: "Milanesa de pollo con semillas saborizadas, lista para freír.",
    foto: "img/semillas.jpg", precio: 0, venta: { unidad: "kg", paso: 0.5, etiqueta: "el kilo" }, opciones: ["Única"], disponible: true },
  { id: "rellena", categoria: "Rellenas", nombre: "Rellena", descripcion: "Milanesa de pollo rellena, lista para freír.",
    foto: "img/rellena.jpg", precio: 0, venta: { unidad: "kg", paso: 0.5, etiqueta: "el kilo" }, opciones: ["De verdura", "De jamón y queso"], disponible: true }
];

// Combos y promociones. Vacío = no se muestra ninguna. Ejemplo (borrá las // para usarlo):
// { id: "combo1", nombre: "Combo 1", descripcion: "…", foto: "img/combo1.jpg", precio: 0, activo: true,
//   desde: "2026-11-10", hasta: "2026-11-30", items: [{ id: "clasica", op: "Con sal", n: 1 }] }
const COMBOS = [];
