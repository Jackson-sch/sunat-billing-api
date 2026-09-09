/**
 * Constructor de Resumen Diario de Boletas Electrónicas (RC) SUNAT UBL 2.1
 * Estándar: SummaryDocuments / Catálogo SUNAT Tipo RC
 */

export interface ResumenBoletaItem {
  linea: number;
  tipoDocumento: "03" | "07" | "08"; // Boleta, NC de Boleta, ND de Boleta
  serie: string; // ej: B001
  numeroInicio: number;
  numeroFin: number;
  estadoOperacion: "1" | "2" | "3"; // 1: Adición, 2: Modificación, 3: Anulado
  moneda: string; // PEN
  totalGravado: number;
  totalExonerado: number;
  totalInafecto: number;
  totalOtrosCargos: number;
  totalIgv: number;
  totalVenta: number;
  docModificadoTipo?: string;
  docModificadoSerieNumero?: string;
}

export interface ResumenDiarioInput {
  emisorRuc: string;
  emisorRazonSocial: string;
  emisorNombreComercial: string;
  resumenId: string; // ej: RC-20260817-001
  fechaEmisionComprobantes: string; // YYYY-MM-DD
  fechaGeneracionResumen: string; // YYYY-MM-DD
  items: ResumenBoletaItem[];
}

export function buildResumenDiarioXml(data: ResumenDiarioInput): { xml: string; hashSunat: string } {
  const hashMock = Buffer.from(`${data.resumenId}-${data.fechaEmisionComprobantes}-${Date.now()}`)
    .toString("base64")
    .substring(0, 28);

  const linesXml = data.items
    .map((item) => `
    <sac:SummaryDocumentsLine>
        <cbc:LineID>${item.linea}</cbc:LineID>
        <cbc:DocumentTypeCode>${item.tipoDocumento}</cbc:DocumentTypeCode>
        <cbc:ID>${item.serie}-${String(item.numeroInicio).padStart(8, "0")}</cbc:ID>
        <cac:AccountingCustomerParty>
            <cbc:CustomerAssignedAccountID>00000000</cbc:CustomerAssignedAccountID>
            <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
        </cac:AccountingCustomerParty>
        <cac:Status>
            <cbc:ConditionCode>${item.estadoOperacion}</cbc:ConditionCode>
        </cac:Status>
        <sac:TotalAmount currencyID="${item.moneda}">${item.totalVenta.toFixed(2)}</sac:TotalAmount>
        <sac:BillingPayment>
            <cbc:PaidAmount currencyID="${item.moneda}">${item.totalGravado.toFixed(2)}</cbc:PaidAmount>
            <cbc:InstructionID>01</cbc:InstructionID>
        </sac:BillingPayment>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="${item.moneda}">${item.totalIgv.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxAmount currencyID="${item.moneda}">${item.totalIgv.toFixed(2)}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cac:TaxScheme>
                        <cbc:ID>1000</cbc:ID>
                        <cbc:Name>IGV</cbc:Name>
                        <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
    </sac:SummaryDocumentsLine>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SummaryDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:SummaryDocuments-1"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
    xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <ds:Signature Id="Signature-SunatBilling">
                    <ds:SignedInfo>
                        <ds:DigestValue>${hashMock}</ds:DigestValue>
                    </ds:SignedInfo>
                </ds:Signature>
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
    <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
    <cbc:CustomizationID>1.1</cbc:CustomizationID>
    <cbc:ID>${data.resumenId}</cbc:ID>
    <cbc:ReferenceDate>${data.fechaEmisionComprobantes}</cbc:ReferenceDate>
    <cbc:IssueDate>${data.fechaGeneracionResumen}</cbc:IssueDate>
    <cac:Signature>
        <cbc:ID>${data.emisorRuc}</cbc:ID>
        <cac:SignatoryParty>
            <cac:PartyIdentification>
                <cbc:ID>${data.emisorRuc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name><![CDATA[${data.emisorRazonSocial}]]></cbc:Name>
            </cac:PartyName>
        </cac:SignatoryParty>
        <cac:DigitalSignatureAttachment>
            <cac:ExternalReference>
                <cbc:URI>#Signature-SunatBilling</cbc:URI>
            </cac:ExternalReference>
        </cac:DigitalSignatureAttachment>
    </cac:Signature>
    <cac:AccountingSupplierParty>
        <cbc:CustomerAssignedAccountID>${data.emisorRuc}</cbc:CustomerAssignedAccountID>
        <cbc:AdditionalAccountID>6</cbc:AdditionalAccountID>
        <cac:Party>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${data.emisorRazonSocial}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    ${linesXml}
</SummaryDocuments>`;

  return { xml, hashSunat: hashMock };
}
