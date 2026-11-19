// CATALOG
const PRODUCTOS = [
  { id: "clasica", categoria: "Clásicas", nombre: "Clásica", descripcion: "Milanesa de pollo casera, lista para freír.",
    foto: "assets/img/clasica.jpg", precio: 6000, venta: { unidad: "kg", paso: 1, etiqueta: "el kilo" }, opciones: ["Con sal", "Sin sal"], disponible: true },
  { id: "crispy", categoria: "Crispy", nombre: "Crispy", descripcion: "Milanesa de pollo crispy, lista para freír.",
    foto: "assets/img/crispy.jpg", precio: 8000, venta: { unidad: "kg", paso: 1, etiqueta: "el kilo" }, opciones: ["Única"], disponible: true },
  { id: "semillas", categoria: "Semillas", nombre: "Semillas saborizadas", descripcion: "Milanesa de pollo con semillas saborizadas, lista para freír.",
    foto: "assets/img/semillas.jpg", precio: 8000, venta: { unidad: "kg", paso: 1, etiqueta: "el kilo" }, opciones: ["Única"], disponible: true },
  { id: "rellena", categoria: "Rellenas", nombre: "Rellena", descripcion: "Milanesa de pollo rellena, lista para freír.",
    foto: "assets/img/rellena-jq.jpg",
    fotos_opciones: {
      "De jamón y queso": "assets/img/rellena-jq.jpg",
      "De espinaca y ricota": "assets/img/rellena-er.jpg"
    },
    precio: 10000, venta: { unidad: "kg", paso: 1, etiqueta: "el kilo" }, opciones: ["De jamón y queso", "De espinaca y ricota"], disponible: true }
];

// PROMO
const PROMO = {
  id: "promo2kg",
  nombre: "Promo 2 Kilos",
  descripcion: "Llevá 2 kg de milanesas Clásicas o Crispy y pagá solo $10.000.",
  precio: 10000,
  kilosRequeridos: 2,
  elegibles: ["clasica", "crispy"]
};
