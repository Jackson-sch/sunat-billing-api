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
    expect(xml).toContain('<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature-SunatBilling">');
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
});
