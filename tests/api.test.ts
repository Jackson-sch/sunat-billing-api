import { describe, expect, it } from "bun:test";
import app from "../src/index";

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
});
