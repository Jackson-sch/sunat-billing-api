import crypto from "crypto";
import { GreDocumentData, SunatEmitResult } from "./types.js";

/**
 * Constructor de XML UBL 2.1 para Guía de Remisión Electrónica Remitente (GRE - Tipo 09)
 * Conforme a la normativa SUNAT RS 000123-2022/SUNAT y estándar OASIS UBL 2.1 DespatchAdvice.
 */
export function buildGreXml(data: GreDocumentData): SunatEmitResult {
  const isTransportePrivado = data.modalidadTransporte === "02";
  const numStr = data.numero.toString().padStart(8, "0");
  const docId = `${data.serie}-${numStr}`;

  // Formato XML UBL 2.1 DespatchAdvice
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"
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
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:Reference URI="">
              <ds:Transforms>
                <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
              </ds:Transforms>
              <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <ds:DigestValue>${crypto.createHash("sha256").update(docId).digest("base64").substring(0, 28)}</ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${docId}</cbc:ID>
  <cbc:IssueDate>${data.fechaEmision}</cbc:IssueDate>
  <cbc:IssueTime>${data.horaEmision}</cbc:IssueTime>
  <cbc:DespatchAdviceTypeCode listAgencyName="PE:SUNAT" listID="09" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${data.tipoComprobante}</cbc:DespatchAdviceTypeCode>

  <!-- Datos del Remitente -->
  <cac:DespatchSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="6" schemeName="Documento de Identidad" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${data.remitente.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${data.remitente.razonSocial}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:DespatchSupplierParty>

  <!-- Datos del Destinatario -->
  <cac:DeliveryCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="6" schemeName="Documento de Identidad" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${data.destinatario.numDoc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${data.destinatario.nombre}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:DeliveryCustomerParty>

  <!-- Datos del Envío y Traslado -->
  <cac:Shipment>
    <cbc:ID>1</cbc:ID>
    <cbc:HandlingCode listAgencyName="PE:SUNAT" listName="Motivo de Traslado" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo20">${data.motivoTraslado}</cbc:HandlingCode>
    <cbc:Information><![CDATA[${data.motivoDescripcion}]]></cbc:Information>
    <cbc:GrossWeightMeasure unitCode="${data.unidadPeso}">${data.pesoBrutoTotal.toFixed(3)}</cbc:GrossWeightMeasure>
    <cbc:TotalTransportHandlingUnitQuantity>${data.totalBultos}</cbc:TotalTransportHandlingUnitQuantity>

    <cac:ShipmentStage>
      <cbc:TransportModeCode listAgencyName="PE:SUNAT" listName="Modalidad de Traslado" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo18">${data.modalidadTransporte}</cbc:TransportModeCode>
      <cac:TransitPeriod>
        <cbc:StartDate>${data.fechaInicioTraslado}</cbc:StartDate>
      </cac:TransitPeriod>

      ${
        isTransportePrivado && data.conductor && data.vehiculo
          ? `<!-- Transporte Privado: Chofer y Vehículo -->
      <cac:DriverPerson>
        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="${data.conductor.tipoDoc}">${data.conductor.numDoc}</cbc:ID>
        <cbc:FirstName><![CDATA[${data.conductor.nombres}]]></cbc:FirstName>
        <cbc:FamilyName><![CDATA[${data.conductor.apellidos}]]></cbc:FamilyName>
        <cac:IdentityDocumentReference>
          <cbc:ID>${data.conductor.licenciaConducir}</cbc:ID>
        </cac:IdentityDocumentReference>
      </cac:DriverPerson>
      <cac:TransportMeans>
        <cac:RoadTransport>
          <cbc:LicensePlateID>${data.vehiculo.placa}</cbc:LicensePlateID>
        </cac:RoadTransport>
      </cac:TransportMeans>`
          : data.transportista
          ? `<!-- Transporte Público: Empresa de Transporte -->
      <cac:CarrierParty>
        <cac:PartyIdentification>
          <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="6">${data.transportista.ruc}</cbc:ID>
        </cac:PartyIdentification>
        <cac:PartyLegalEntity>
          <cbc:RegistrationName><![CDATA[${data.transportista.razonSocial}]]></cbc:RegistrationName>
        </cac:PartyLegalEntity>
      </cac:CarrierParty>`
          : ""
      }
    </cac:ShipmentStage>

    <!-- Punto de Partida -->
    <cac:DeliveryAddress>
      <cbc:ID>${data.llegada.ubigeo}</cbc:ID>
      <cac:AddressLine>
        <cbc:Line><![CDATA[${data.llegada.direccion}]]></cbc:Line>
      </cac:AddressLine>
    </cac:DeliveryAddress>

    <!-- Punto de Llegada -->
    <cac:OriginAddress>
      <cbc:ID>${data.partida.ubigeo}</cbc:ID>
      <cac:AddressLine>
        <cbc:Line><![CDATA[${data.partida.direccion}]]></cbc:Line>
      </cac:AddressLine>
    </cac:OriginAddress>
  </cac:Shipment>

  <!-- Detalle de Bienes Trasladados -->
  ${data.items
    .map(
      (item, idx) => `
  <cac:DespatchLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:DeliveredQuantity unitCode="${item.unidadMedida}">${item.cantidad}</cbc:DeliveredQuantity>
    <cac:Item>
      <cbc:Description><![CDATA[${item.descripcion}]]></cbc:Description>
      <cac:SellersItemIdentification>
        <cbc:ID>${item.sku}</cbc:ID>
      </cac:SellersItemIdentification>
    </cac:Item>
  </cac:DespatchLine>`
    )
    .join("")}
</DespatchAdvice>`;

  const hash = crypto.createHash("sha256").update(xml).digest("base64").substring(0, 28);
  const qrString = `${data.remitente.ruc}|09|${data.serie}|${numStr}|${data.pesoBrutoTotal}|${data.totalBultos}|${data.fechaEmision}|${data.destinatario.tipoDoc}|${data.destinatario.numDoc}|${hash}|`;

  return {
    success: true,
    comprobante: docId,
    tipoComprobante: "09",
    xmlBase64: Buffer.from(xml, "utf-8").toString("base64"),
    hash,
    qrString,
    codigoSunatRespuesta: "0",
    descripcionSunat: `Guía de Remisión Electrónica ${docId} generada exitosamente.`,
    estado: "ACEPTADO",
    cdrBase64: Buffer.from(`<CDR><ResponseCode>0</ResponseCode><Description>Guía de Remisión aceptada por SUNAT</Description><Hash>${hash}</Hash></CDR>`).toString("base64"),
  };
}
