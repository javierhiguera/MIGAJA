const SUPABASE_URL = "https://ynncndundoooinkdrtiw.supabase.co";
const SUPABASE_KEY = "sb_publishable_kSu1cHcql8zIEd-oxqOngA_CI908kyy";

// BUSINESS INFO
const CONFIG = {
  nombre: "La Migaja",
  whatsapp: "5491173537313",
  telefono: "11 7353-7313",
  horarioTxt: "Lun a Vie: 10:00–14:00 y 17:00–20:30 | Sáb: 10:00–14:00 | Dom: Cerrado",
  direccionRetiro: "Av. Obispo Jorge Novak 2076",
  condicionesRetiro: "Retiro sin cargo. Coordiná el horario al confirmar el pedido.",
  alias: "migaja.com.ar",
  titular: "Pedro Javier Higuera Marin",
  pagos: ["Transferencia", "Efectivo"],
  conservacion: "Mantené las milanesas refrigeradas y freílas bien antes de consumir.",
  envio: {
    habilitado: true,
    zonas: [{ nombre: "Barrio La Esmeralda", costo: 1500, minimo: 0 }]
  },
  agenda: {
    retiro: { 
      dias: [1, 2, 3, 4, 5, 6],
      franjas: [
        { desde: "10:00", hasta: "14:00" },
        { desde: "17:00", hasta: "20:00" }
      ]
    },
    envio: { 
      dias: [1, 2, 3, 4, 5, 6],
      franjas: [
        { desde: "10:00", hasta: "14:00" },
        { desde: "17:00", hasta: "20:30" }
      ]
    },
    anticipacionHoras: 2,
    diasAdelante: 14,
    bloqueadas: []
  }
};

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
