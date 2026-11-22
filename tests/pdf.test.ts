import { describe, expect, it } from "bun:test";
import app from "../src/index";
import { parseUblXmlToPdfData } from "../src/core/pdf-generator";

describe("PDF Generation Tests", () => {
  it("POST /api/v1/cpe/emitir debe retornar pdfBase64 en la respuesta", async () => {
    const res = await app.fetch(
      new Request("http://localhost:3001/api/v1/cpe/emitir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "novamarket_secret_api_key_2026",
        },
        body: JSON.stringify({
          tipoComprobante: "01",
          serie: "F001",
          numero: 10,
          moneda: "PEN",
          cliente: {
            tipoDoc: "6",
            numDoc: "20555555555",
            nombre: "EMPRESA CLIENTE S.A.C.",
          },
          items: [
            {
              sku: "PROD-1",
              descripcion: "DESARROLLO DE SOFTWARE",
              cantidad: 1,
              precioUnitario: 100,
              tipoAfectacionIgv: "10",
            },
          ],
          formatoPdf: "a4",
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pdfBase64).toBeDefined();

    const pdfBuffer = Buffer.from(data.pdfBase64, "base64");
    expect(pdfBuffer.toString("utf-8", 0, 5)).toBe("%PDF-");

    const xml = Buffer.from(data.xmlBase64, "base64").toString("utf-8");
    const parsedPdf = parseUblXmlToPdfData(xml);
    expect(parsedPdf.tipoComprobante).toBe("01");
    expect(parsedPdf.emisor.ruc).toBe("20000000001");
    expect(parsedPdf.cliente.numDoc).toBe("20555555555");
    expect(parsedPdf.items[0]?.cantidad).toBe(1);
    expect(parsedPdf.items[0]?.total).toBe(100);
    expect(parsedPdf.totales.total).toBe(100);
    expect(parsedPdf.totales.igv).toBeGreaterThan(0);
  });

  it("GET /api/v1/cpe/F001-10/pdf debe responder 200 con Content-Type application/pdf en A4", async () => {
    const res = await app.fetch(
      new Request("http://localhost:3001/api/v1/cpe/F001-10/pdf?format=a4&apiKey=novamarket_secret_api_key_2026")
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.toString("utf-8", 0, 5)).toBe("%PDF-");
  });

  it("GET /api/v1/cpe/F001-10/pdf debe responder 200 con formato Ticket 80mm", async () => {
    const res = await app.fetch(
      new Request("http://localhost:3001/api/v1/cpe/F001-10/pdf?format=ticket&apiKey=novamarket_secret_api_key_2026")
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.toString("utf-8", 0, 5)).toBe("%PDF-");
  });
});
