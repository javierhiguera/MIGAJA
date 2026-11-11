// Datos del negocio y reglas de entrega. Editá solo este archivo.
const CONFIG = {
  nombre: "La Migaja",
  whatsapp: "5491173537313",          // Formato internacional, sin + ni espacios
  telefono: "11 7353-7313",
  horarioTxt: "Lun a Vie: 10:00–14:00 y 17:00–20:30 | Sáb: 10:00–14:00 | Dom: Cerrado",
  direccionRetiro: "Av. Obispo Jorge Novak 2076",
  condicionesRetiro: "Retiro sin cargo. Coordiná el horario al confirmar el pedido.",
  alias: "lamigaja",
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
        { desde: "17:00", hasta: "20:30" }
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
