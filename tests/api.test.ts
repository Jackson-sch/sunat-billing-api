import { describe, expect, it } from "bun:test";
import forge from "node-forge";
import app from "../src/index";

function createTestPfxBase64(commonName: string, password: string): { pfxBase64: string; certBase64: string } {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "02";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  const attrs = [
    { name: "commonName", value: commonName },
    { name: "countryName", value: "PE" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const certBase64 = Buffer.from(certDer, "binary").toString("base64");
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const p12Bytes = forge.asn1.toDer(p12Asn1).getBytes();
  return {
    pfxBase64: Buffer.from(p12Bytes, "binary").toString("base64"),
    certBase64,
  };
}

describe("SUNAT Billing API Tests", () => {
  it("GET /api/v1/health debe responder 200 con status de servicio", async () => {
    const res = await app.fetch(new Request("http://localhost:3001/api/v1/health"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.service).toBe("sunat-billing-api");
    expect(data.runtime).toBe("Bun");
  });

  it("POST /api/v1/cpe/emitir sin API Key debe responder 401 Unauthorized", async () => {
    const res = await app.fetch(
      new Request("http://localhost:3001/api/v1/cpe/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/cpe/emitir con API Key debe emitir Boleta UBL 2.1 correctamente", async () => {
    const res = await app.fetch(
      new Request("http://localhost:3001/api/v1/cpe/emitir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "novamarket_secret_api_key_2026",
        },
        body: JSON.stringify({
          tipoComprobante: "03",
          serie: "B001",
          numero: 101,
          moneda: "PEN",
          cliente: {
            tipoDoc: "1",
            numDoc: "72345678",
            nombre: "CARLOS ALARCON GUTIERREZ",
          },
          items: [
            {
              sku: "PROD-001",
              descripcion: "ARROZ COSTENO EXTRA 1KG",
              cantidad: 3,
              precioUnitario: 5.20,
              tipoAfectacionIgv: "10",
            },
          ],
          medioPago: "efectivo",
          enviarASunat: false,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.comprobante).toBe("B001-101");
    expect(data.tipoComprobante).toBe("03");
    expect(data.hashSunat).toBeDefined();
    expect(data.qrString).toBeDefined();
    expect(data.xmlBase64).toBeDefined();
    expect(data.totales.total).toBe(15.60);
  });

  it("POST /api/v1/consultas/ruc debe consultar RUC en el padrón", async () => {
    const res = await app.fetch(
      new Request("http://localhost:3001/api/v1/consultas/ruc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "novamarket_secret_api_key_2026",
        },
        body: JSON.stringify({
          ruc: "20608945123",
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.found).toBe(true);
    expect(data.nombreRazonSocial).toContain("NOVAMARKET");
  });

  it("Admin + Multi-tenant: debe rechazar PFX con contraseña incorrecta y firmar CPE con el PFX guardado por empresa", async () => {
    const { pfxBase64, certBase64 } = createTestPfxBase64("EMPRESA TEST PFX SAC", "clave_secreta_pfx");
    const testRuc = "20609998887";

    // 1. Rechazar PFX con contraseña incorrecta
    const badRes = await app.fetch(
      new Request("http://localhost:3001/api/v1/admin/empresas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "novamarket_secret_api_key_2026",
        },
        body: JSON.stringify({
          ruc: testRuc,
          razonSocial: "EMPRESA TEST PFX SAC",
          certificadoPfx: pfxBase64,
          certificadoPassword: "password_equivocado",
        }),
      })
    );
    expect(badRes.status).toBe(400);

    // 2. Crear empresa con PFX y contraseña correctos
    const createRes = await app.fetch(
      new Request("http://localhost:3001/api/v1/admin/empresas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "novamarket_secret_api_key_2026",
        },
        body: JSON.stringify({
          ruc: testRuc,
          razonSocial: "EMPRESA TEST PFX SAC",
          usuarioSol: "USERPROD",
          claveSol: "PASSPROD",
          isBeta: false,
          certificadoPfx: pfxBase64,
          certificadoPassword: "clave_secreta_pfx",
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.success).toBe(true);
    expect(created.empresa.tiene_certificado).toBeTruthy();
    const empresaId = created.empresa.id;
    const empresaApiKey = created.empresa.api_key;

    try {
      // 3. Emitir comprobante usando la API Key de la empresa (sin enviar certificado en el payload)
      const emitRes = await app.fetch(
        new Request("http://localhost:3001/api/v1/cpe/emitir", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": empresaApiKey,
          },
          body: JSON.stringify({
            tipoComprobante: "01",
            serie: "F001",
            numero: 55,
            moneda: "PEN",
            cliente: {
              tipoDoc: "6",
              numDoc: "20555555555",
              nombre: "CLIENTE TEST S.A.C.",
            },
            items: [
              {
                sku: "SERV-1",
                descripcion: "SERVICIO DE PRUEBA",
                cantidad: 1,
                precioUnitario: 118,
                tipoAfectacionIgv: "10",
              },
            ],
            enviarASunat: false,
          }),
        })
      );
      expect(emitRes.status).toBe(200);
      const emitted = await emitRes.json();
      expect(emitted.success).toBe(true);

      const signedXml = Buffer.from(emitted.xmlBase64, "base64").toString("utf-8");
      expect(signedXml).toContain(certBase64);
    } finally {
      // Limpiar empresa de prueba
      await app.fetch(
        new Request(`http://localhost:3001/api/v1/admin/empresas/${empresaId}`, {
          method: "DELETE",
          headers: { "x-api-key": "novamarket_secret_api_key_2026" },
        })
      );
    }
  });
});
