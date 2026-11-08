// Datos del negocio y reglas de entrega. Editá solo este archivo.
const CONFIG = {
  nombre: "Migaja",
  whatsapp: "5491122790690",          // formato internacional, sin + ni espacios
  telefono: "11 2279-0690",
  horarioTxt: "Lunes a viernes de 10 a 20 h",
  direccionRetiro: "[BARRIO / DIRECCIÓN]",
  condicionesRetiro: "",              // opcional
  alias: "[TU.ALIAS]",
  titular: "[NOMBRE DEL TITULAR]",
  pagos: ["Efectivo", "Transferencia"],
  conservacion: "",                   // completá solo con datos confirmados; si queda vacío no se muestra
  envio: {
    habilitado: true,
    // costo: null muestra "A confirmar". dias: 0=domingo ... 6=sábado (opcional, pisa los días generales)
    zonas: [{ nombre: "[ZONA / BARRIO]", costo: null, minimo: 0 }]
  },
  agenda: {
    retiro: { dias: [1, 2, 3, 4, 5], desde: "10:00", hasta: "20:00", bloque: 60 },
    envio:  { dias: [1, 2, 3, 4, 5], desde: "10:00", hasta: "20:00", bloque: 120 },
    anticipacionHoras: 24,
    diasAdelante: 14,
    bloqueadas: []                    // fechas sin atención, ej: ["2026-12-25"]
  }
};
