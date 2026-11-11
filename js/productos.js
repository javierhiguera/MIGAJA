// Catálogo. precio 0 = "A confirmar". foto: ruta a tu imagen real.
// venta: { unidad: "kg" | "u", paso: 1, etiqueta: "el kilo" }
const PRODUCTOS = [
  { id: "clasica", categoria: "Clásicas", nombre: "Clásica", descripcion: "Milanesa de pollo casera, lista para freír.",
    foto: "img/clasica.jpg", precio: 6000, venta: { unidad: "kg", paso: 1, etiqueta: "el kilo" }, opciones: ["Con sal", "Sin sal"], disponible: true },
  { id: "crispy", categoria: "Crispy", nombre: "Crispy", descripcion: "Milanesa de pollo crispy, lista para freír.",
    foto: "img/crispy.jpg", precio: 8000, venta: { unidad: "kg", paso: 1, etiqueta: "el kilo" }, opciones: ["Única"], disponible: true },
  { id: "semillas", categoria: "Semillas", nombre: "Semillas saborizadas", descripcion: "Milanesa de pollo con semillas saborizadas, lista para freír.",
    foto: "img/semillas.jpg", precio: 8000, venta: { unidad: "kg", paso: 1, etiqueta: "el kilo" }, opciones: ["Única"], disponible: true },
  { id: "rellena", categoria: "Rellenas", nombre: "Rellena", descripcion: "Milanesa de pollo rellena, lista para freír.",
    foto: "img/rellena_jq.jpg", // Foto por defecto
    fotos_opciones: {
      "De jamón y queso": "img/rellena_jq.jpg",
      "De espinaca y ricota": "img/rellena_er.jpg"
    },
    precio: 10000, venta: { unidad: "kg", paso: 1, etiqueta: "el kilo" }, opciones: ["De jamón y queso", "De espinaca y ricota"], disponible: true }
];

// Combos y promociones. 
const COMBOS = [
  { 
    id: "promo2kg", 
    nombre: "Promo 2 Kilos", 
    descripcion: "Llevá 2 kilos de milanesas (Clásicas o Crispy) y pagá solo $10.000.", 
    foto: "img/clasica.jpg", 
    precio: 10000, 
    activo: true,
    items: [
      { id: "clasica", op: "Con sal", n: 2 }
    ] 
  }
];
