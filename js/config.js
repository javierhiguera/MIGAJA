
const SUPABASE_URL = "https://ynncndundoooinkdrtiw.supabase.co";
const SUPABASE_KEY = "sb_publishable_kSu1cHcql8zIEd-oxqOngA_CI908kyy";

const CONFIG = {
  brandName: "La Migaja",
  whatsapp: "5491173537313",
  telefono: "11 7353-7313",
  phone: "11 7353-7313",

  pagos: ["Transferencia", "Efectivo"],
  paymentMethods: ["Transferencia", "Efectivo"],

  alias: "migaja.com.ar",
  titular: "Pedro Javier Higuera Marin",

  direccionRetiro: "Av. Obispo Jorge Novak 2076",
  condicionesRetiro: "Retiro sin cargo. Coordiná el horario al confirmar el pedido.",

  envio: {
    habilitado: true,
    zonas: [
      {
        nombre: "Barrio La Esmeralda",
        costo: 1500,
        minAmount: 0
      }
    ]
  },

  hoursText: "Lun a Vie: 10:00–14:00 y 17:00–20:00 | Sáb: 10:00–14:00 | Dom: Cerrado",
  storageNote: "Mantené las milanesas refrigeradas y freílas bien antes de consumirlas.",

  schedule: {
    pickup: {
      days: [1, 2, 3, 4, 5, 6],
      slots: [
        { from: "10:00", to: "14:00" },
        { from: "17:00", to: "20:00" }
      ]
    },
    delivery: {
      days: [1, 2, 3, 4, 5, 6],
      slots: [
        { from: "14:00", to: "20:00" }
      ]
    },
    leadHours: 2,
    daysAhead: 14,
    blocked: []
  }
};

const PRODUCTOS = [
  {
    id: "clasica",
    nombre: "Clásica",
    categoria: "Clásicas",
    descripcion: "Milanesa de pollo casera, lista para freír.",
    precio: 6000,
    foto: "assets/img/clasica.jpg",
    venta: {
      unidad: "kg",
      etiqueta: "el kilo"
    },
    opciones: ["Con sal", "Sin sal"],
    disponible: true
  },
  {
    id: "crispy",
    nombre: "Crispy",
    categoria: "Crispy",
    descripcion: "Milanesa de pollo crispy, lista para freír.",
    precio: 8000,
    foto: "assets/img/crispy.jpg",
    venta: {
      unidad: "kg",
      etiqueta: "el kilo"
    },
    opciones: ["Única"],
    disponible: true
  },
  {
    id: "semillas",
    nombre: "Semillas saborizadas",
    categoria: "Semillas",
    descripcion: "Milanesa de pollo con semillas saborizadas, lista para freír.",
    precio: 8000,
    foto: "assets/img/semillas.jpg",
    venta: {
      unidad: "kg",
      etiqueta: "el kilo"
    },
    opciones: ["Única"],
    disponible: true
  },
  {
    id: "rellena",
    nombre: "Rellena",
    categoria: "Rellenas",
    descripcion: "Milanesa de pollo rellena, lista para freír.",
    precio: 10000,
    foto: "assets/img/rellena-jq.jpg",
    fotos_opciones: {
      "De jamón y queso": "assets/img/rellena-jq.jpg",
      "De espinaca y ricota": "assets/img/rellena-er.jpg"
    },
    venta: {
      unidad: "kg",
      etiqueta: "el kilo"
    },
    opciones: [
      "De jamón y queso",
      "De espinaca y ricota"
    ],
    disponible: true
  }
];

// Promoción desactivada hasta definir su precio.
// No se aplican descuentos sin una promoción confirmada.
const PROMO = {
  elegibles: [],
  kilosRequeridos: 2,
  precio: 0
};
