const SUPABASE_URL = "https://ynncndundoooinkdrtiw.supabase.co";
const SUPABASE_KEY = "sb_publishable_kSu1cHcql8zIEd-oxqOngA_CI908kyy";

const CONFIG = {
  brandName: "La Migaja",
  whatsapp: "5491173537313",
  phone: "11 7353-7313",
  hoursText: "Lun a Vie: 10:00–14:00 y 17:00–20:00 | Sáb: 10:00–14:00 | Dom: Cerrado",
  pickupAddress: "Av. Obispo Jorge Novak 2076",
  pickupConditions: "Retiro sin cargo. Coordiná el horario al confirmar el pedido.",
  alias: "migaja.com.ar",
  accountHolder: "Pedro Javier Higuera Marin",
  paymentMethods: ["Transferencia", "Efectivo"],
  storageNote: "Mantené las milanesas refrigeradas y freílas bien antes de consumir.",
  delivery: {
    enabled: true,
    zones: [{ name: "Barrio La Esmeralda", cost: 1500, minAmount: 0 }]
  },
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
