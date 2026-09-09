/**
 * Constructor de Comunicación de Bajas (RA) SUNAT UBL 2.1
 * Estándar: VoidedDocuments / Catálogo SUNAT Tipo RA
 * Permite anular formalmente Facturas Electrónicas (01) y Notas de Crédito (07).
 */

export interface BajaDocumentoItem {
  linea: number;
  tipoDocumento: "01" | "07" | "08"; // Factura, NC Factura, ND Factura
  serie: string; // ej: F001
  numero: number;
  motivoBaja: string; // ej: Error en RUC del cliente
}

export interface ComunicacionBajaInput {
  emisorRuc: string;
  emisorRazonSocial: string;
  bajaId: string; // ej: RA-20260817-001
  fechaEmisionDocumentos: string; // YYYY-MM-DD
  fechaGeneracionBaja: string; // YYYY-MM-DD
  items: BajaDocumentoItem[];
}

export function buildComunicacionBajasXml(data: ComunicacionBajaInput): { xml: string; hashSunat: string } {
  const hashMock = Buffer.from(`${data.bajaId}-${data.fechaEmisionDocumentos}-${Date.now()}`)
    .toString("base64")
    .substring(0, 28);

  const linesXml = data.items
    .map((item) => `
    <sac:VoidedDocumentsLine>
        <cbc:LineID>${item.linea}</cbc:LineID>
        <cbc:DocumentTypeCode>${item.tipoDocumento}</cbc:DocumentTypeCode>
        <sac:DocumentSerialID>${item.serie}</sac:DocumentSerialID>
        <sac:DocumentNumberID>${item.numero}</sac:DocumentNumberID>
        <sac:VoidReasonDescription><![CDATA[${item.motivoBaja}]]></sac:VoidReasonDescription>
    </sac:VoidedDocumentsLine>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<VoidedDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:VoidedDocuments-1"
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
    <cbc:CustomizationID>1.0</cbc:CustomizationID>
    <cbc:ID>${data.bajaId}</cbc:ID>
    <cbc:ReferenceDate>${data.fechaEmisionDocumentos}</cbc:ReferenceDate>
    <cbc:IssueDate>${data.fechaGeneracionBaja}</cbc:IssueDate>
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
</VoidedDocuments>`;

  return { xml, hashSunat: hashMock };
}
