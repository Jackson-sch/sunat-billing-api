/**
 * Especificación OpenAPI 3.1.0 completa para Scalar UI (/docs) y clientes integradores
 */
export function buildOpenApiSpec(origin: string, port: number) {
  return {
    openapi: "3.1.0",
    info: {
      title: "SUNAT Electronic Billing API (Perú)",
      version: "1.0.0",
      description:
        "Microservicio y API REST para emisión de comprobantes electrónicos (UBL 2.1), PDF A4/Ticket, guías de remisión (GRE), resúmenes diarios (RC), bajas (RA), libros SIRE, consultas RUC/DNI y autogestión de Certificado Digital Tributario (.pfx) ante SUNAT.",
      contact: {
        name: "Soporte Técnico de Facturación",
        email: "facturacion@novamarket.pe",
      },
    },
    servers: [
      { url: origin, description: "Servidor Activo" },
      { url: "https://sunat-billing-api.vercel.app", description: "Producción (Vercel)" },
      { url: `http://localhost:${port}`, description: "Desarrollo Local (Bun)" },
    ],
    tags: [
      { name: "Comprobantes (CPE)", description: "Facturas (01), Boletas (03), Notas de Crédito (07), Notas de Débito (08) y PDFs" },
      { name: "Mi Empresa / CDT", description: "Autogestión de Certificado Digital Tributario (.pfx) y credenciales SOL del cliente" },
      { name: "Guías de Remisión (GRE)", description: "Guía de Remisión Remitente Electrónica (09)" },
      { name: "Resúmenes y Bajas", description: "Resumen Diario de Boletas (RC), Comunicación de Bajas (RA) y tickets" },
      { name: "Consultas RUC/DNI", description: "Validación de RUC y padrón DNI" },
      { name: "SIRE", description: "Archivos planos RVIE 14.1 y RCE 8.1" },
      { name: "Sistema", description: "Salud y telemetría del servicio" },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API Key del cliente (sk_live_...) o Master API Key",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
      schemas: {
        Emisor: {
          type: "object",
          description: "Opcional. Si se omite, la API toma los datos de la empresa autenticada por x-api-key o del .env.",
          required: ["ruc", "razonSocial"],
          properties: {
            ruc: { type: "string", minLength: 11, maxLength: 11, example: "20601234567" },
            razonSocial: { type: "string", minLength: 3, example: "MI EMPRESA S.A.C." },
            nombreComercial: { type: "string", default: "", example: "MI NEGOCIO" },
            direccion: { type: "string", default: "", example: "AV. LARCO 123, MIRAFLORES" },
            ubigeo: { type: "string", default: "150101", example: "150122" },
            departamento: { type: "string", default: "LIMA" },
            provincia: { type: "string", default: "LIMA" },
            distrito: { type: "string", default: "LIMA" },
            usuarioSol: { type: "string", description: "Usuario secundario SOL (ej. MODDATOS en Beta)" },
            claveSol: { type: "string", description: "Clave SOL" },
            isBeta: { type: "boolean", default: true, description: "true = Beta SUNAT, false = Producción" },
          },
        },
        Cliente: {
          type: "object",
          required: ["nombre"],
          properties: {
            tipoDoc: {
              type: "string",
              enum: ["1", "6", "4", "7", "0", "dni", "ruc", "ce", "pasaporte"],
              default: "0",
              description: "1=DNI, 6=RUC, 4=Carnet Extranjería, 7=Pasaporte, 0=Sin documento",
            },
            numDoc: { type: "string", default: "00000000", example: "20555555555" },
            nombre: { type: "string", example: "CLIENTE EJEMPLO S.A.C." },
            direccion: { type: "string", example: "JR. UNION 456, LIMA" },
            email: { type: "string", format: "email", example: "cliente@empresa.pe" },
          },
        },
        CpeItem: {
          type: "object",
          required: ["descripcion", "cantidad", "precioUnitario"],
          properties: {
            id: { type: "string" },
            sku: { type: "string", default: "ITEM-001" },
            descripcion: { type: "string", example: "DESARROLLO DE SOFTWARE" },
            unidadMedida: { type: "string", default: "NIU", description: "Catálogo 03 SUNAT (NIU, KGM, ZZ, etc.)" },
            cantidad: { type: "number", exclusiveMinimum: 0, example: 2 },
            precioUnitario: { type: "number", minimum: 0, description: "Precio unitario CON IGV", example: 59.0 },
            valorUnitario: { type: "number", description: "Opcional. Valor unitario SIN IGV (se calcula automático si se omite)" },
            tipoAfectacionIgv: {
              type: "string",
              enum: ["10", "20", "30"],
              default: "10",
              description: "10=Gravado (18%), 20=Exonerado, 30=Inafecto",
            },
            igv: { type: "number" },
            total: { type: "number" },
          },
        },
        EmitCpeRequest: {
          type: "object",
          required: ["tipoComprobante", "serie", "numero", "cliente", "items"],
          properties: {
            tipoComprobante: {
              type: "string",
              enum: ["01", "03", "07", "08"],
              description: "01=Factura, 03=Boleta, 07=Nota de Crédito, 08=Nota de Débito",
            },
            serie: { type: "string", minLength: 4, maxLength: 4, example: "F001", description: "4 caracteres (F001, B001, FC01, BC01)" },
            numero: { type: "integer", minimum: 1, example: 1 },
            fechaEmision: { type: "string", example: "2026-11-24", description: "Opcional (YYYY-MM-DD). Por defecto hoy (hora Perú)" },
            horaEmision: { type: "string", example: "14:30:00", description: "Opcional (HH:mm:ss)" },
            moneda: { type: "string", enum: ["PEN", "USD"], default: "PEN" },
            emisor: { $ref: "#/components/schemas/Emisor" },
            cliente: { $ref: "#/components/schemas/Cliente" },
            items: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/CpeItem" } },
            medioPago: {
              type: "string",
              enum: ["efectivo", "tarjeta", "yape", "plin", "transferencia", "credito", "mixto"],
              default: "efectivo",
            },
            certificado: {
              type: "object",
              description: "Opcional. Sobrescribe el certificado guardado de la empresa para esta petición.",
              properties: {
                base64: { type: "string", description: "Archivo .pfx/.p12 codificado en Base64" },
                password: { type: "string", description: "Contraseña del certificado .pfx" },
                path: { type: "string" },
              },
            },
            documentoModificado: {
              type: "object",
              description: "Obligatorio solo para Notas de Crédito (07) y Débito (08).",
              required: ["tipoDoc", "serieNumero", "motivoCodigo", "motivoDescripcion"],
              properties: {
                tipoDoc: { type: "string", enum: ["01", "03"] },
                serieNumero: { type: "string", example: "F001-00000001" },
                motivoCodigo: { type: "string", enum: ["01", "02", "06", "07", "04"] },
                motivoDescripcion: { type: "string", example: "Anulación de la operación" },
              },
            },
            formatoPdf: { type: "string", enum: ["a4", "ticket", "ticket58"], default: "a4" },
            enviarASunat: { type: "boolean", default: false, description: "true=Envía vía SOAP a SUNAT/OSE; false=Solo genera y firma XML+PDF" },
          },
        },
        EmitGreRequest: {
          type: "object",
          required: ["fechaInicioTraslado", "pesoBrutoTotal", "partida", "llegada", "destinatario", "items"],
          properties: {
            serie: { type: "string", default: "T001", example: "T001" },
            numero: { type: "integer", minimum: 1, example: 1 },
            fechaEmision: { type: "string", example: "2026-11-24" },
            fechaInicioTraslado: { type: "string", example: "2026-11-25" },
            motivoTraslado: { type: "string", enum: ["04", "01", "02", "13"], default: "04" },
            motivoDescripcion: { type: "string", default: "Traslado interno entre sucursales" },
            modalidadTransporte: { type: "string", enum: ["01", "02"], default: "02", description: "01=Público, 02=Privado" },
            pesoBrutoTotal: { type: "number", exclusiveMinimum: 0, example: 12.5 },
            unidadPeso: { type: "string", enum: ["KGM"], default: "KGM" },
            totalBultos: { type: "integer", minimum: 1, default: 1 },
            partida: {
              type: "object",
              required: ["ubigeo", "direccion"],
              properties: {
                ubigeo: { type: "string", minLength: 6, maxLength: 6, example: "150101" },
                direccion: { type: "string", example: "AV. ARGENTINA 123, LIMA" },
              },
            },
            llegada: {
              type: "object",
              required: ["ubigeo", "direccion"],
              properties: {
                ubigeo: { type: "string", minLength: 6, maxLength: 6, example: "150122" },
                direccion: { type: "string", example: "AV. PARDO 456, MIRAFLORES" },
              },
            },
            remitente: { $ref: "#/components/schemas/Emisor" },
            destinatario: { $ref: "#/components/schemas/Cliente" },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["descripcion", "cantidad"],
                properties: {
                  sku: { type: "string", default: "ITEM-001" },
                  descripcion: { type: "string", example: "CAJA DE LIBROS" },
                  cantidad: { type: "number", exclusiveMinimum: 0, example: 5 },
                  unidadMedida: { type: "string", default: "NIU" },
                },
              },
            },
            enviarASunat: { type: "boolean", default: false },
          },
        },
        ResumenDiarioRequest: {
          type: "object",
          required: ["fechaEmisionComprobantes", "items"],
          properties: {
            emisor: { $ref: "#/components/schemas/Emisor" },
            correlativo: { type: "integer", default: 1 },
            fechaEmisionComprobantes: { type: "string", example: "2026-11-24" },
            fechaGeneracionResumen: { type: "string", example: "2026-11-24" },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["linea", "tipoDocumento", "serie", "numeroInicio", "numeroFin", "totalGravado", "totalIgv", "totalVenta"],
                properties: {
                  linea: { type: "integer", example: 1 },
                  tipoDocumento: { type: "string", enum: ["03", "07", "08"] },
                  serie: { type: "string", example: "B001" },
                  numeroInicio: { type: "integer", example: 1 },
                  numeroFin: { type: "integer", example: 25 },
                  estadoOperacion: { type: "string", enum: ["1", "2", "3"], default: "1" },
                  moneda: { type: "string", enum: ["PEN", "USD"], default: "PEN" },
                  totalGravado: { type: "number", example: 100 },
                  totalExonerado: { type: "number", default: 0 },
                  totalInafecto: { type: "number", default: 0 },
                  totalOtrosCargos: { type: "number", default: 0 },
                  totalIgv: { type: "number", example: 18 },
                  totalVenta: { type: "number", example: 118 },
                },
              },
            },
            enviarASunat: { type: "boolean", default: false },
          },
        },
        ComunicacionBajaRequest: {
          type: "object",
          required: ["fechaEmisionDocumentos", "items"],
          properties: {
            emisor: { $ref: "#/components/schemas/Emisor" },
            correlativo: { type: "integer", default: 1 },
            fechaEmisionDocumentos: { type: "string", example: "2026-11-24" },
            fechaGeneracionBaja: { type: "string", example: "2026-11-24" },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["linea", "tipoDocumento", "serie", "numero", "motivoBaja"],
                properties: {
                  linea: { type: "integer", example: 1 },
                  tipoDocumento: { type: "string", enum: ["01", "07", "08"] },
                  serie: { type: "string", example: "F001" },
                  numero: { type: "integer", example: 12 },
                  motivoBaja: { type: "string", example: "Error en datos del cliente" },
                },
              },
            },
            enviarASunat: { type: "boolean", default: false },
          },
        },
        ConsultaRucRequest: {
          type: "object",
          required: ["ruc"],
          properties: {
            ruc: { type: "string", minLength: 11, maxLength: 11, example: "20608945123" },
          },
        },
        ConsultaDniRequest: {
          type: "object",
          required: ["dni"],
          properties: {
            dni: { type: "string", minLength: 8, maxLength: 8, example: "72345678" },
          },
        },
        SireRequest: {
          type: "object",
          required: ["ruc", "año", "mes", "registros"],
          properties: {
            ruc: { type: "string", example: "20601234567" },
            año: { type: "string", example: "2026" },
            mes: { type: "string", example: "11" },
            registros: { type: "array", items: { type: "object" } },
          },
        },
        CertificadoEmpresaRequest: {
          type: "object",
          required: ["certificadoPfx"],
          properties: {
            certificadoPfx: { type: "string", description: "Contenido del archivo .pfx / .p12 en Base64" },
            certificadoPassword: { type: "string", description: "Contraseña del archivo .pfx" },
          },
        },
        CredencialesEmpresaRequest: {
          type: "object",
          properties: {
            usuarioSol: { type: "string", example: "USUARIO01" },
            claveSol: { type: "string", example: "MiClaveSol2026" },
            isBeta: { type: "boolean", example: false },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      "/api/v1/health": {
        get: {
          tags: ["Sistema"],
          summary: "Estado y telemetría de SUNAT",
          description: "Verifica el estado del servicio y la latencia con los servidores SOAP de SUNAT.",
          responses: { "200": { description: "Servicio saludable" } },
        },
      },
      "/api/v1/cpe/emitir": {
        post: {
          tags: ["Comprobantes (CPE)"],
          summary: "Emisión de Factura, Boleta o Nota de Crédito/Débito (UBL 2.1)",
          description:
            "Genera el XML firmado con XMLDSig, genera el PDF (A4/Ticket) en Base64, código QR canónico y opcionalmente envía el comprobante a SUNAT vía SOAP/OSE.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmitCpeRequest" },
                example: {
                  tipoComprobante: "01",
                  serie: "F001",
                  numero: 1,
                  moneda: "PEN",
                  cliente: {
                    tipoDoc: "6",
                    numDoc: "20555555555",
                    nombre: "EMPRESA CLIENTE S.A.C.",
                    direccion: "AV. AREQUIPA 123, LIMA",
                  },
                  items: [
                    {
                      sku: "PROD-001",
                      descripcion: "SERVICIO DE CONSULTORÍA TI",
                      unidadMedida: "NIU",
                      cantidad: 2,
                      precioUnitario: 59.0,
                      tipoAfectacionIgv: "10",
                    },
                  ],
                  medioPago: "efectivo",
                  formatoPdf: "a4",
                  enviarASunat: false,
                },
              },
            },
          },
          responses: {
            "200": { description: "Comprobante emitido con éxito (incluye xmlBase64, pdfBase64, hashSunat, qrString y respuesta SUNAT)" },
            "400": { description: "Error de validación Zod en el payload" },
            "401": { description: "API Key faltante o inválida" },
          },
        },
      },
      "/api/v1/cpe/{id}/pdf": {
        get: {
          tags: ["Comprobantes (CPE)"],
          summary: "Descargar PDF de un comprobante emitido",
          description: "Genera y descarga el PDF oficial (A4 o Ticket) a partir del ID UUID o serie-correlativo (ej. F001-1). Acepta ?apiKey=... en URL o header x-api-key.",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" }, example: "F001-1" },
            { name: "format", in: "query", required: false, schema: { type: "string", enum: ["a4", "ticket", "ticket58"], default: "a4" } },
            { name: "apiKey", in: "query", required: false, schema: { type: "string" }, description: "Alternativa al header x-api-key para descarga directa desde navegador" },
          ],
          responses: {
            "200": { description: "Archivo PDF binario (application/pdf)" },
            "404": { description: "Comprobante no encontrado" },
          },
        },
      },
      "/api/v1/gre/emitir": {
        post: {
          tags: ["Guías de Remisión (GRE)"],
          summary: "Emisión de Guía de Remisión Electrónica (GRE 09)",
          description: "Genera y firma la Guía de Remisión Remitente UBL 2.1 con datos de chofer, vehículo o transportista.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmitGreRequest" },
              },
            },
          },
          responses: { "200": { description: "Guía de remisión emitida" } },
        },
      },
      "/api/v1/resumenes/rc": {
        post: {
          tags: ["Resúmenes y Bajas"],
          summary: "Envío de Resumen Diario de Boletas (RC)",
          description: "Genera el paquete XML de boletas y retorna el número de Ticket de SUNAT.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ResumenDiarioRequest" },
              },
            },
          },
          responses: { "200": { description: "Ticket generado" } },
        },
      },
      "/api/v1/resumenes/ra": {
        post: {
          tags: ["Resúmenes y Bajas"],
          summary: "Comunicación de Bajas (RA)",
          description: "Anula formalmente facturas o notas de crédito electrónicas.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ComunicacionBajaRequest" },
              },
            },
          },
          responses: { "200": { description: "Baja generada" } },
        },
      },
      "/api/v1/resumenes/status/{ticket}": {
        get: {
          tags: ["Resúmenes y Bajas"],
          summary: "Consulta de estado de ticket RC/RA",
          description: "Consulta el estado de procesamiento del ticket en SUNAT y obtiene el CDR.",
          parameters: [
            { name: "ticket", in: "path", required: true, schema: { type: "string" }, example: "1690000012345" },
          ],
          responses: { "200": { description: "Estado de procesamiento" } },
        },
      },
      "/api/v1/consultas/ruc": {
        post: {
          tags: ["Consultas RUC/DNI"],
          summary: "Consulta de RUC en SUNAT",
          description: "Valida algoritmo Módulo 11 y retorna razón social, estado y condición fiscal.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConsultaRucRequest" },
                example: { ruc: "20608945123" },
              },
            },
          },
          responses: { "200": { description: "Datos del contribuyente" } },
        },
      },
      "/api/v1/consultas/dni": {
        post: {
          tags: ["Consultas RUC/DNI"],
          summary: "Consulta de DNI (Padrón / RENIEC)",
          description: "Retorna nombres y apellidos completos asociados al DNI.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConsultaDniRequest" },
                example: { dni: "72345678" },
              },
            },
          },
          responses: { "200": { description: "Datos de la persona" } },
        },
      },
      "/api/v1/sire/ventas": {
        post: {
          tags: ["SIRE"],
          summary: "Generación de archivo plano SIRE 14.1 (RVIE)",
          description: "Genera el archivo TXT estructurado con la nomenclatura oficial de SUNAT.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SireRequest" },
              },
            },
          },
          responses: { "200": { description: "TXT generado en Base64" } },
        },
      },
      "/api/v1/sire/compras": {
        post: {
          tags: ["SIRE"],
          summary: "Generación de archivo plano SIRE 8.1 (RCE)",
          description: "Genera el archivo TXT oficial de compras para el SIRE.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SireRequest" },
              },
            },
          },
          responses: { "200": { description: "TXT generado en Base64" } },
        },
      },
      "/api/v1/empresa/me": {
        get: {
          tags: ["Mi Empresa / CDT"],
          summary: "Consultar estado de la empresa autenticada",
          description: "Retorna RUC, razón social, ambiente (Beta/Producción) y si tiene Certificado Digital (.pfx) configurado.",
          responses: { "200": { description: "Datos de la empresa" } },
        },
      },
      "/api/v1/empresa/certificado": {
        put: {
          tags: ["Mi Empresa / CDT"],
          summary: "Subir o renovar Certificado Digital Tributario (.pfx/.p12)",
          description: "Permite al cliente autenticado con su API Key (sk_live_...) cargar y validar su propio certificado .pfx y contraseña.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CertificadoEmpresaRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Certificado actualizado y validado" },
            "400": { description: "Archivo .pfx inválido o contraseña incorrecta" },
          },
        },
        delete: {
          tags: ["Mi Empresa / CDT"],
          summary: "Eliminar Certificado Digital guardado",
          description: "Remueve el .pfx guardado de la empresa autenticada.",
          responses: { "200": { description: "Certificado eliminado" } },
        },
      },
      "/api/v1/empresa/credenciales": {
        put: {
          tags: ["Mi Empresa / CDT"],
          summary: "Actualizar Usuario/Clave SOL y ambiente (Beta/Producción)",
          description: "Permite al cliente actualizar sus credenciales SOL y cambiar entre Beta y Producción.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CredencialesEmpresaRequest" },
              },
            },
          },
          responses: { "200": { description: "Credenciales actualizadas" } },
        },
      },
    },
  };
}
