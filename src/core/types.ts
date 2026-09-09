export interface SunatCompany {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

export interface SunatCustomer {
  tipoDoc: "1" | "6" | "4" | "7" | "0" | "dni" | "ruc" | "ce" | "pasaporte"; // 1=DNI, 6=RUC, 4=CE, 0=Sin Doc
  numDoc: string;
  nombre: string;
  direccion?: string;
  email?: string;
}

export interface SunatItem {
  id: string;
  sku: string;
  descripcion: string;
  unidadMedida: string; // NIU=Unidad, KGM=Kilogramos
  cantidad: number;
  precioUnitario: number; // Con IGV
  valorUnitario: number; // Sin IGV (precioUnitario / 1.18)
  tipoAfectacionIgv: "10" | "20" | "30"; // 10=Gravado - Operación Onerosa, 20=Exonerado, 30=Inafecto
  igv: number;
  total: number;
}

export interface SunatDocumentData {
  tipoComprobante: "01" | "03" | "07" | "08"; // 01=Factura, 03=Boleta, 07=Nota de Crédito, 08=Nota de Débito
  serie: string; // B001, F001, BC01, FC01, BD01, FD01
  numero: number;
  fechaEmision: string; // YYYY-MM-DD
  horaEmision: string; // HH:mm:ss
  moneda: "PEN" | "USD";
  emisor: SunatCompany;
  cliente: SunatCustomer;
  items: SunatItem[];
  totalGravadas: number;
  totalExoneradas: number;
  totalInafectas: number;
  totalIgv: number;
  totalVenta: number;
  medioPago: "efectivo" | "tarjeta" | "yape" | "plin" | "transferencia" | "credito" | "mixto";
  documentoModificado?: {
    tipoDoc: "01" | "03";
    serieNumero: string;
    motivoCodigo: "01" | "02" | "06" | "07" | "04"; // 01=Anulación total, 06=Devolución total, 07=Devolución por ítem, 04=Descuento global
    motivoDescripcion: string;
  };
}

export interface SunatEmitResult {
  success: boolean;
  comprobante: string;
  tipoComprobante: string;
  xmlBase64: string;
  hash: string;
  qrString: string;
  codigoSunatRespuesta: string;
  descripcionSunat: string;
  estado: "ACEPTADO" | "RECHAZADO" | "OBSERVADO" | "EN_COLA";
  cdrBase64?: string;
  observaciones?: string[];
}

// ── Guía de Remisión Electrónica (GRE - SUNAT Tipo 09) ──
export interface GreCarrier {
  ruc: string;
  razonSocial: string;
  numeroRegistroMtc?: string;
}

export interface GreDriver {
  tipoDoc: "1" | "4" | "7"; // 1=DNI, 4=CE
  numDoc: string;
  nombres: string;
  apellidos: string;
  licenciaConducir: string;
}

export interface GreVehicle {
  placa: string;
  marca?: string;
}

export interface GreItem {
  id: string;
  sku: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string; // NIU=Unidad, KGM=Kilogramos
  pesoKgm?: number;
}

export interface GreDocumentData {
  tipoComprobante: "09"; // 09 = Guía de Remisión Electrónica Remitente
  serie: string; // T001, T002
  numero: number;
  fechaEmision: string; // YYYY-MM-DD
  horaEmision: string; // HH:mm:ss
  fechaInicioTraslado: string; // YYYY-MM-DD
  motivoTraslado: "04" | "01" | "02" | "13"; // 04=Traslado entre establecimientos de la misma empresa
  motivoDescripcion: string;
  modalidadTransporte: "01" | "02"; // 01=Público, 02=Privado
  pesoBrutoTotal: number;
  unidadPeso: "KGM";
  totalBultos: number;
  partida: {
    ubigeo: string;
    direccion: string;
  };
  llegada: {
    ubigeo: string;
    direccion: string;
  };
  remitente: SunatCompany;
  destinatario: SunatCustomer;
  transportista?: GreCarrier;
  conductor?: GreDriver;
  vehiculo?: GreVehicle;
  items: GreItem[];
}
