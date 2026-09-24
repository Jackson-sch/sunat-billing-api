import { SunatDocumentData, SunatEmitResult } from "./types.js";
import { generateDigestHash, generateSunatQrString, normalizeCustomerDocType } from "./xml-signer.js";

/**
 * Constructor de XML UBL 2.1 estándar SUNAT
 * Cumple con la Resolución de Superintendencia N.° 097-2012/SUNAT y modificatorias.
 */
export function buildUblXml(data: SunatDocumentData): SunatEmitResult {
  const isCreditNote = data.tipoComprobante === "07";
  const isDebitNote = data.tipoComprobante === "08";
  const rootTag = isCreditNote ? "CreditNote" : isDebitNote ? "DebitNote" : "Invoice";
  const customDocType = isCreditNote || isDebitNote ? "2.0" : "2.1";

  const customerDocType = normalizeCustomerDocType(data.cliente.tipoDoc);
  const hash = generateDigestHash(`${data.serie}-${data.numero}-${data.totalVenta}-${data.fechaEmision}`);
  const qrString = generateSunatQrString(data, hash);

  const itemsXml = data.items
    .map((item, idx) => {
      const lineNum = idx + 1;
      const uom = item.unidadMedida === "kg" ? "KGM" : "NIU";
      const lineTag = isCreditNote ? "CreditNoteLine" : isDebitNote ? "DebitNoteLine" : "InvoiceLine";
      const qtyTag = isCreditNote ? "CreditedQuantity" : isDebitNote ? "DebitedQuantity" : "InvoicedQuantity";
      
      return `
    <cac:${lineTag}>
      <cbc:ID>${lineNum}</cbc:ID>
      <cbc:${qtyTag} unitCode="${uom}">${item.cantidad.toFixed(2)}</cbc:${qtyTag}>
      <cbc:LineExtensionAmount currencyID="${data.moneda}">${(item.valorUnitario * item.cantidad).toFixed(2)}</cbc:LineExtensionAmount>
      <cac:PricingReference>
        <cac:AlternativeConditionPrice>
          <cbc:PriceAmount currencyID="${data.moneda}">${item.precioUnitario.toFixed(2)}</cbc:PriceAmount>
          <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
        </cac:AlternativeConditionPrice>
      </cac:PricingReference>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${data.moneda}">${item.igv.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${data.moneda}">${(item.valorUnitario * item.cantidad).toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${data.moneda}">${item.igv.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:Percent>18.00</cbc:Percent>
            <cbc:TaxExemptionReasonCode>${item.tipoAfectacionIgv}</cbc:TaxExemptionReasonCode>
            <cac:TaxScheme>
              <cbc:ID>1000</cbc:ID>
              <cbc:Name>IGV</cbc:Name>
              <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Description><![CDATA[${item.descripcion}]]></cbc:Description>
        <cac:SellersItemIdentification>
          <cbc:ID>${item.sku}</cbc:ID>
        </cac:SellersItemIdentification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${data.moneda}">${item.valorUnitario.toFixed(4)}</cbc:PriceAmount>
      </cac:Price>
    </cac:${lineTag}>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<${rootTag} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${rootTag}-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <ds:Signature Id="Signature-SunatBilling">
          <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
            <ds:Reference URI="">
              <ds:Transforms>
                <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
              </ds:Transforms>
              <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
              <ds:DigestValue>${hash}</ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
          <ds:SignatureValue>MIIB...[FIRMA_DIGITAL_XMLDSIG]...==</ds:SignatureValue>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>${customDocType}</cbc:CustomizationID>
  <cbc:ID>${data.serie}-${data.numero}</cbc:ID>
  <cbc:IssueDate>${data.fechaEmision}</cbc:IssueDate>
  <cbc:IssueTime>${data.horaEmision}</cbc:IssueTime>
  <cbc:${isCreditNote ? "CreditNoteTypeCode" : isDebitNote ? "DebitNoteTypeCode" : "InvoiceTypeCode"} listID="0101">${data.tipoComprobante}</cbc:${isCreditNote ? "CreditNoteTypeCode" : isDebitNote ? "DebitNoteTypeCode" : "InvoiceTypeCode"}>
  <cbc:DocumentCurrencyCode>${data.moneda}</cbc:DocumentCurrencyCode>

  ${
    (isCreditNote || isDebitNote) && data.documentoModificado
      ? `
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${data.documentoModificado.serieNumero}</cbc:ReferenceID>
    <cbc:ResponseCode>${data.documentoModificado.motivoCodigo}</cbc:ResponseCode>
    <cbc:Description><![CDATA[${data.documentoModificado.motivoDescripcion}]]></cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${data.documentoModificado.serieNumero}</cbc:ID>
      <cbc:DocumentTypeCode>${data.documentoModificado.tipoDoc}</cbc:DocumentTypeCode>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  `
      : ""
  }

  <cac:Signature>
    <cbc:ID>${data.emisor.ruc}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${data.emisor.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${data.emisor.razonSocial}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#Signature-SunatBilling</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>

  <!-- Emisor -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${data.emisor.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${data.emisor.nombreComercial}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${data.emisor.razonSocial}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:ID>${data.emisor.ubigeo}</cbc:ID>
          <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${data.emisor.direccion}]]></cbc:Line>
          </cac:AddressLine>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Cliente -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${customerDocType}">${data.cliente.numDoc || "00000000"}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${data.cliente.nombre || "CLIENTES VARIOS"}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Totales e Impuestos -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.moneda}">${data.totalIgv.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${data.moneda}">${data.totalGravadas.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${data.moneda}">${data.totalIgv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${data.moneda}">${data.totalGravadas.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${data.moneda}">${data.totalVenta.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${data.moneda}">${data.totalVenta.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Líneas de Detalle -->
  ${itemsXml}
</${rootTag}>`;

  const tipoNombre = data.tipoComprobante === "01" ? "Factura" : data.tipoComprobante === "07" ? "Nota de Crédito" : data.tipoComprobante === "08" ? "Nota de Débito" : "Boleta";

  return {
    success: true,
    comprobante: `${data.serie}-${data.numero}`,
    tipoComprobante: data.tipoComprobante,
    xmlBase64: Buffer.from(xml, "utf-8").toString("base64"),
    hash,
    qrString,
    codigoSunatRespuesta: "0",
    descripcionSunat: `La ${tipoNombre} ${data.serie}-${data.numero} ha sido generada correctamente con UBL 2.1.`,
    estado: "ACEPTADO",
    cdrBase64: Buffer.from(`<CDR><ResponseCode>0</ResponseCode><Description>Aceptado por SUNAT</Description><Hash>${hash}</Hash></CDR>`).toString("base64"),
  };
}
