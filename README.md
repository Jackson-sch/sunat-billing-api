# ⚡ SUNAT Electronic Billing API (Perú)

Microservicio y API RESTful de alta velocidad construido con **Bun** y **Hono** para emisión y gestión de comprobantes de pago electrónicos conforme a la normativa de **SUNAT** (Perú).

---

## 🌟 Características

* ⚡ **Motor UBL 2.1 Ultra Rápido:** Emisión de Facturas (`01`), Boletas (`03`), Notas de Crédito (`07`) y Débito (`08`).
* 🚚 **Guías de Remisión Electrónica (GRE `09`):** Modalidad transporte privado y público con datos de transportista y chofer.
* 📦 **Resúmenes Diarios (RC) y Bajas (RA):** Envío masivo y anulación de comprobantes con consulta asíncrona de ticket y descarga de CDR.
* 📊 **Libros Electrónicos SIRE:** Generador automático de archivos planos para **RVIE 14.1 (Ventas)** y **RCE 8.1 (Compras)**.
* 🔍 **Consultas en Línea:** Validación de RUC (algoritmo Módulo 11) y DNI con caché en memoria.
* 🛡️ **Firma Digital XMLDSig:** Digest SHA-256 y generación canónica del código QR tributario.
* 🌐 **Cliente SOAP / OSE:** Conexión directa a SUNAT Beta y Producción con compresión ZIP y parsing de respuestas CDR.
* 📖 **Documentación OpenAPI / Swagger:** UI interactiva en `/docs` vía Scalar.
* 🏢 **Soporte Multi-Tenant:** Capacidad de enviar credenciales SOL y RUC por petición o usar los globales de entorno.

---

## 🚀 Requisitos e Instalación

### Requisitos:
* [Bun](https://bun.sh/) 1.1 o superior.

### Instalación:
```bash
cd sunat-billing-api
bun install
```

### Ejecución en desarrollo:
```bash
bun run --hot src/index.ts
```

Servidor disponible en: `http://localhost:3001`  
Documentación Swagger: `http://localhost:3001/docs`

---

## 🔐 Autenticación

Todas las rutas (excepto `/docs` y `/api/v1/health`) requieren una clave de API:

```http
x-api-key: novamarket_secret_api_key_2026
```
o
```http
Authorization: Bearer novamarket_secret_api_key_2026
```

---

## 📋 Endpoints de la API

### 1. Emisión de Comprobantes (Factura / Boleta / Nota)
* `POST /api/v1/cpe/emitir`

#### Ejemplo cURL:
```bash
curl -X POST http://localhost:3001/api/v1/cpe/emitir \
  -H "Content-Type: application/json" \
  -H "x-api-key: novamarket_secret_api_key_2026" \
  -d '{
    "tipoComprobante": "03",
    "serie": "B001",
    "numero": 124,
    "moneda": "PEN",
    "cliente": {
      "tipoDoc": "1",
      "numDoc": "72345678",
      "nombre": "CARLOS ALARCON"
    },
    "items": [
      {
        "sku": "PROD-001",
        "descripcion": "LECHE GLORIA ENTERA 400G",
        "unidadMedida": "NIU",
        "cantidad": 2,
        "precioUnitario": 4.50,
        "tipoAfectacionIgv": "10"
      }
    ],
    "medioPago": "efectivo",
    "enviarASunat": false
  }'
```

---

### 2. Guía de Remisión Electrónica (GRE 09)
* `POST /api/v1/gre/emitir`

---

### 3. Resúmenes Diarios de Boletas (RC)
* `POST /api/v1/resumenes/rc`

---

### 4. Comunicación de Bajas (RA)
* `POST /api/v1/resumenes/ra`

---

### 5. Consulta de Estado de Ticket SUNAT
* `GET /api/v1/resumenes/status/:ticket`

---

### 6. Consultas de RUC y DNI
* `POST /api/v1/consultas/ruc`
* `POST /api/v1/consultas/dni`

---

### 7. Libros Electrónicos SIRE
* `POST /api/v1/sire/ventas` (RVIE 14.1)
* `POST /api/v1/sire/compras` (RCE 8.1)

---

### 8. Salud y Telemetría
* `GET /api/v1/health`
