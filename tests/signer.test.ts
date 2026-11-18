import { describe, expect, it } from "bun:test";
import { buildUblXml, buildGreXml, buildResumenDiarioXml, buildComunicacionBajasXml } from "../src/core/index";
import crypto from "crypto";

describe("XMLDSig Digital Signer Tests", () => {
  it("Debe generar XML de Factura/Boleta UBL 2.1 con Firma Digital XMLDSig válida", () => {
    const result = buildUblXml({
      tipoComprobante: "01",
      serie: "F001",
      numero: 1,
      fechaEmision: "2026-11-07",
      horaEmision: "10:00:00",
      moneda: "PEN",
      emisor: {
        ruc: "20600000001",
        razonSocial: "EMPRESA DEMO S.A.C.",
        nombreComercial: "DEMO SAC",
        direccion: "AV LIMA 123",
        ubigeo: "150101",
        departamento: "LIMA",
        provincia: "LIMA",
        distrito: "LIMA",
      },
      cliente: {
        tipoDoc: "6",
        numDoc: "20555555555",
        nombre: "CLIENTE VIP S.A.C.",
      },
      items: [
        {
          sku: "SERV-01",
          descripcion: "CONSULTORIA TI MENSUAL",
          unidadMedida: "NIU",
          cantidad: 1,
          precioUnitario: 118,
          valorUnitario: 100,
          tipoAfectacionIgv: "10",
          igv: 18,
          total: 118,
        },
      ],
      totalGravadas: 100,
      totalExoneradas: 0,
      totalInafectas: 0,
      totalIgv: 18,
      totalVenta: 118,
      medioPago: "transferencia",
    });

    const xml = Buffer.from(result.xmlBase64, "base64").toString("utf-8");

    // Validar presencia de tags de firma W3C / SUNAT
    expect(xml).toContain('<ds:Signature');
    expect(xml).toContain('Id="Signature-SunatBilling"');
    expect(xml).toContain('xmlns:ds="http://www.w3.org/2000/09/xmldsig#"');
    expect(xml).toContain('<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>');
    expect(xml).toContain('<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>');
    expect(xml).toContain('<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>');
    expect(xml).toContain(`<ds:DigestValue>${result.hash}</ds:DigestValue>`);
    expect(xml).toContain("<ds:SignatureValue>");
    expect(xml).toContain("<ds:X509Certificate>");

    // Validar formato del QR
    expect(result.qrString).toBe(
      `20600000001|01|F001|1|18.00|118.00|2026-11-07|6|20555555555|${result.hash}|`
    );
  });

  it("Debe generar Resumen Diario (RC) firmado digitalmente", () => {
    const rc = buildResumenDiarioXml({
      emisorRuc: "20600000001",
      emisorRazonSocial: "EMPRESA DEMO S.A.C.",
      emisorNombreComercial: "DEMO SAC",
      resumenId: "RC-20261107-001",
      fechaEmisionComprobantes: "2026-11-07",
      fechaGeneracionResumen: "2026-11-07",
      items: [
        {
          linea: 1,
          tipoDocumento: "03",
          serie: "B001",
          numeroInicio: 1,
          numeroFin: 10,
          estadoOperacion: "1",
          moneda: "PEN",
          totalGravado: 100,
          totalExonerado: 0,
          totalInafecto: 0,
          totalOtrosCargos: 0,
          totalIgv: 18,
          totalVenta: 118,
        },
      ],
    });

    expect(rc.xml).toContain("<ds:Signature");
    expect(rc.xml).toContain(rc.hashSunat);
    expect(rc.xml).toContain("<ds:SignatureValue>");
    expect(rc.xml).toContain("<ds:X509Certificate>");
  });

  it("Debe generar Comunicación de Bajas (RA) firmada digitalmente", () => {
    const ra = buildComunicacionBajasXml({
      emisorRuc: "20600000001",
      emisorRazonSocial: "EMPRESA DEMO S.A.C.",
      bajaId: "RA-20261107-001",
      fechaEmisionDocumentos: "2026-11-07",
      fechaGeneracionBaja: "2026-11-07",
      items: [
        {
          linea: 1,
          tipoDocumento: "01",
          serie: "F001",
          numero: 1,
          motivoBaja: "Error en monto digitado",
        },
      ],
    });

    expect(ra.xml).toContain("<ds:Signature");
    expect(ra.xml).toContain(ra.hashSunat);
    expect(ra.xml).toContain("<ds:SignatureValue>");
    expect(ra.xml).toContain("<ds:X509Certificate>");
  });

  it("Debe generar Guía de Remisión (GRE) firmada digitalmente", () => {
    const gre = buildGreXml({
      tipoComprobante: "09",
      serie: "T001",
      numero: 1,
      fechaEmision: "2026-11-07",
      horaEmision: "10:30:00",
      remitente: {
        ruc: "20600000001",
        razonSocial: "EMPRESA DEMO S.A.C.",
      },
      destinatario: {
        tipoDoc: "6",
        numDoc: "20555555555",
        nombre: "CLIENTE DESTINO S.A.C.",
      },
      motivoTraslado: "01",
      motivoDescripcion: "VENTA NACIONAL",
      modalidadTransporte: "02",
      pesoBrutoTotal: 50.5,
      unidadPeso: "KGM",
      totalBultos: 5,
      fechaInicioTraslado: "2026-11-07",
      partida: {
        ubigeo: "150101",
        direccion: "Almacen Central 1",
      },
      llegada: {
        ubigeo: "150102",
        direccion: "Sucursal Norte 2",
      },
      conductor: {
        tipoDoc: "1",
        numDoc: "44444444",
        nombres: "Juan Perez",
        licencia: "Q44444444",
      },
      vehiculo: {
        placa: "ABC-123",
      },
      items: [
        {
          sku: "PROD-1",
          descripcion: "CAJA DE MERCADERIA",
          unidadMedida: "NIU",
          cantidad: 5,
        },
      ],
    });

    const greXml = Buffer.from(gre.xmlBase64, "base64").toString("utf-8");
    expect(greXml).toContain("<ds:Signature");
    expect(greXml).toContain(gre.hash);
    expect(greXml).toContain("<ds:SignatureValue>");
    expect(greXml).toContain("<ds:X509Certificate>");
  });

  it("Debe ser validado exitosamente por un verificador estándar W3C XMLDSig (C14N y Enveloped)", () => {
    const result = buildUblXml({
      tipoComprobante: "03",
      serie: "B001",
      numero: 99,
      fechaEmision: "2026-11-18",
      horaEmision: "12:00:00",
      moneda: "PEN",
      emisor: {
        ruc: "20600000001",
        razonSocial: "EMPRESA PRUEBA S.A.C.",
        nombreComercial: "DEMO SAC",
        direccion: "AV LIMA 123",
        ubigeo: "150101",
        departamento: "LIMA",
        provincia: "LIMA",
        distrito: "LIMA",
      },
      cliente: {
        tipoDoc: "1",
        numDoc: "44444444",
        nombre: "JUAN PEREZ",
      },
      items: [
        {
          sku: "PROD-1",
          descripcion: "PRODUCTO PRUEBA",
          unidadMedida: "NIU",
          cantidad: 1,
          precioUnitario: 50,
          valorUnitario: 42.37,
          tipoAfectacionIgv: "10",
          igv: 7.63,
          total: 50,
        },
      ],
      totalGravadas: 42.37,
      totalExoneradas: 0,
      totalInafectas: 0,
      totalIgv: 7.63,
      totalVenta: 50,
      medioPago: "efectivo",
    });

    const xml = Buffer.from(result.xmlBase64, "base64").toString("utf-8");

    // Extraer certificado X.509
    const certMatch = xml.match(/<ds:X509Certificate>([^<]+)<\/ds:X509Certificate>/i);
    expect(certMatch).toBeTruthy();
    const certBase64 = certMatch![1];
    const certPem = `-----BEGIN CERTIFICATE-----\n${certBase64.match(/.{1,64}/g)?.join("\n")}\n-----END CERTIFICATE-----`;

    // Parsear DOM
    const { DOMParser } = require("@xmldom/xmldom");
    const { SignedXml } = require("xml-crypto");

    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const sigNode = doc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "Signature")[0] || doc.getElementsByTagName("ds:Signature")[0];
    expect(sigNode).toBeTruthy();

    const verifier = new SignedXml({ publicCert: certPem });
    verifier.loadSignature(sigNode);
    const isValid = verifier.checkSignature(xml);
    expect(isValid).toBe(true);
  });
});
