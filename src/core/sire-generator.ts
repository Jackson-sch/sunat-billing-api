/**
 * Generador Oficial de Archivos Planos SUNAT SIRE / PLE
 * Estándar: Sistema Integrado de Registros Electrónicos (SIRE)
 * - RVIE Formato 14.1: Registro de Ventas e Ingresos Electrónico
 * - RCE Formato 8.1: Registro de Compras Electrónico
 */

export interface SireVentaRecord {
  periodo: string; // YYYYMM00
  cuo: string; // Código Único de Operación
  correlativoAsiento: string; // M00001
  fechaEmision: string; // DD/MM/YYYY
  fechaVencimiento?: string; // DD/MM/YYYY
  tipoComprobante: "01" | "03" | "07" | "08"; // 01 Factura, 03 Boleta, 07 NC
  serie: string;
  numero: string;
  numeroFinal?: string;
  tipoDocIdentidad: "0" | "1" | "6" | "4" | "7"; // 1: DNI, 6: RUC, 0: Varios
  numDocIdentidad: string;
  razonSocialCliente: string;
  valorExportacion?: number;
  baseImponibleGravada: number;
  descuentoBase?: number;
  igv: number;
  descuentoIgv?: number;
  montoExonerado?: number;
  montoInafecto?: number;
  isc?: number;
  icbper?: number;
  otrosTributos?: number;
  totalComprobante: number;
  moneda: "PEN" | "USD";
  tipoCambio?: number;
  docModificadoFecha?: string;
  docModificadoTipo?: string;
  docModificadoSerie?: string;
  docModificadoNumero?: string;
  estadoOperacion: "1" | "2" | "8" | "9"; // 1: Emitido en plazo, 2: Anulado, 8: Declarado en periodo anterior
}

export interface SireCompraRecord {
  periodo: string;
  cuo: string;
  correlativoAsiento: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  tipoComprobante: "01" | "03" | "07" | "08" | "14";
  serie: string;
  añoEmisionDua?: string;
  numero: string;
  numeroFinal?: string;
  tipoDocProveedor: "6" | "1";
  numDocProveedor: string;
  razonSocialProveedor: string;
  baseImponibleGravada: number;
  igv: number;
  baseGravadaNoCreditoFiscal?: number;
  igvNoCreditoFiscal?: number;
  montoExonerado?: number;
  montoInafecto?: number;
  isc?: number;
  icbper?: number;
  otrosTributos?: number;
  totalComprobante: number;
  moneda: "PEN" | "USD";
  tipoCambio?: number;
  docModificadoFecha?: string;
  docModificadoTipo?: string;
  docModificadoSerie?: string;
  docModificadoNumero?: string;
  detraccionFecha?: string;
  detraccionNumero?: string;
  estadoOperacion: "1" | "6" | "7" | "9";
}

/**
 * Genera el nombre de archivo oficial SUNAT SIRE 14.1 (Ventas)
 * Formato: LE[RUC][AÑO][MES]00140100001111.TXT
 */
export function buildSireVentasFilename(ruc: string, año: string, mes: string): string {
  const mesPad = mes.padStart(2, "0");
  return `LE${ruc}${año}${mesPad}00140100001111.TXT`;
}

/**
 * Genera el nombre de archivo oficial SUNAT SIRE 8.1 (Compras)
 * Formato: LE[RUC][AÑO][MES]00080100001111.TXT
 */
export function buildSireComprasFilename(ruc: string, año: string, mes: string): string {
  const mesPad = mes.padStart(2, "0");
  return `LE${ruc}${año}${mesPad}00080100001111.TXT`;
}

/**
 * Genera el archivo plano TXT delimitado por Pipes (|) para SIRE 14.1 (Ventas)
 */
export function generateSireVentasTxt(records: SireVentaRecord[]): string {
  return records
    .map((r) => {
      const fields = [
        r.periodo,
        r.cuo,
        r.correlativoAsiento,
        r.fechaEmision,
        r.fechaVencimiento || "",
        r.tipoComprobante,
        r.serie,
        r.numero,
        r.numeroFinal || "",
        r.tipoDocIdentidad,
        r.numDocIdentidad,
        r.razonSocialCliente.replace(/\|/g, " "),
        (r.valorExportacion || 0).toFixed(2),
        r.baseImponibleGravada.toFixed(2),
        (r.descuentoBase || 0).toFixed(2),
        r.igv.toFixed(2),
        (r.descuentoIgv || 0).toFixed(2),
        (r.montoExonerado || 0).toFixed(2),
        (r.montoInafecto || 0).toFixed(2),
        (r.isc || 0).toFixed(2),
        "0.00", // Base arroz pilado
        (r.icbper || 0).toFixed(2),
        (r.otrosTributos || 0).toFixed(2),
        r.totalComprobante.toFixed(2),
        r.moneda,
        (r.tipoCambio || 1.0).toFixed(3),
        r.docModificadoFecha || "",
        r.docModificadoTipo || "",
        r.docModificadoSerie || "",
        r.docModificadoNumero || "",
        "", // Identificador Contrato
        "", // Error tipo 1
        "", // Indicador medio de pago
        r.estadoOperacion,
        "", // Libre
      ];
      return fields.join("|") + "|";
    })
    .join("\r\n");
}

/**
 * Genera el archivo plano TXT delimitado por Pipes (|) para SIRE 8.1 (Compras)
 */
export function generateSireComprasTxt(records: SireCompraRecord[]): string {
  return records
    .map((r) => {
      const fields = [
        r.periodo,
        r.cuo,
        r.correlativoAsiento,
        r.fechaEmision,
        r.fechaVencimiento || "",
        r.tipoComprobante,
        r.serie,
        r.añoEmisionDua || "",
        r.numero,
        r.numeroFinal || "",
        r.tipoDocProveedor,
        r.numDocProveedor,
        r.razonSocialProveedor.replace(/\|/g, " "),
        r.baseImponibleGravada.toFixed(2),
        r.igv.toFixed(2),
        (r.baseGravadaNoCreditoFiscal || 0).toFixed(2),
        (r.igvNoCreditoFiscal || 0).toFixed(2),
        (r.montoExonerado || 0).toFixed(2),
        (r.montoInafecto || 0).toFixed(2),
        (r.isc || 0).toFixed(2),
        (r.icbper || 0).toFixed(2),
        (r.otrosTributos || 0).toFixed(2),
        r.totalComprobante.toFixed(2),
        r.moneda,
        (r.tipoCambio || 1.0).toFixed(3),
        r.docModificadoFecha || "",
        r.docModificadoTipo || "",
        r.docModificadoSerie || "",
        "", // Código DUA
        r.docModificadoNumero || "",
        r.detraccionFecha || "",
        r.detraccionNumero || "",
        "", // Retención
        "", // Clasificación bienes
        "", // Identificación Contrato
        "", // Error tipo 1
        "", // Error tipo 2
        "", // Error tipo 3
        "", // Error tipo 4
        "", // Indicador comprobante cancelado
        r.estadoOperacion,
        "", // Libre
      ];
      return fields.join("|") + "|";
    })
    .join("\r\n");
}
