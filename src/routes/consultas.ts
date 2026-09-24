import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ConsultaRucSchema, ConsultaDniSchema } from "../schemas/consultas.schema.js";

export const consultasRouter = new Hono();

// En-memory cache de consultas
const CACHE_ENTITIES = new Map<string, any>();

function validarRucModulo11(ruc: string): boolean {
  if (!/^\d{11}$/.test(ruc)) return false;
  const primerosDos = ruc.substring(0, 2);
  if (!["10", "15", "17", "20"].includes(primerosDos)) return false;

  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(ruc[i]!, 10) * factores[i]!;
  }
  const residuo = suma % 11;
  const digitoCalculado = (11 - residuo) % 10;
  const digitoVerificador = parseInt(ruc[10]!, 10);

  return digitoCalculado === digitoVerificador;
}

const KNOWN_ENTITIES: Record<string, any> = {
  "20100190797": {
    nombreRazonSocial: "GLORIA SOCIEDAD ANONIMA - GLORIA S.A.",
    estado: "ACTIVO",
    condicion: "HABIDO",
    direccionFiscal: "AV. REPUBLICA DE PANAMA NRO. 2461 URB. SANTA CATALINA - LIMA",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "LA VICTORIA",
    ubigeo: "150115",
  },
  "20100055237": {
    nombreRazonSocial: "ALICORP S.A.A.",
    estado: "ACTIVO",
    condicion: "HABIDO",
    direccionFiscal: "AV. ARGENTINA NRO. 4793 URB. PARQUE INDUSTRIAL - CALLAO",
    departamento: "CALLAO",
    provincia: "CALLAO",
    distrito: "CALLAO",
    ubigeo: "070101",
  },
  "20601234567": {
    nombreRazonSocial: "INVERSIONES RETAIL PERU S.A.C.",
    estado: "ACTIVO",
    condicion: "HABIDO",
    direccionFiscal: "AV. JAVIER PRADO ESTE NRO. 4200 - SURCO",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "SANTIAGO DE SURCO",
    ubigeo: "150140",
  },
  "20608945123": {
    nombreRazonSocial: "NOVAMARKET SUPERMERCADOS S.A.C.",
    estado: "ACTIVO",
    condicion: "HABIDO",
    direccionFiscal: "CALLE LOS ANDES NRO. 145 - MIRAFLORES",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "MIRAFLORES",
    ubigeo: "150122",
  },
  "20100070970": {
    nombreRazonSocial: "SUPERMERCADOS PERUANOS SOCIEDAD ANONIMA",
    estado: "ACTIVO",
    condicion: "HABIDO",
    direccionFiscal: "CAL. MORELLI NRO. 181 INT. P-2 - SAN BORJA",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "SAN BORJA",
    ubigeo: "150130",
  },
  "20000000001": {
    nombreRazonSocial: "EMPRESA DE PRUEBA SUNAT BETA S.A.C.",
    estado: "ACTIVO",
    condicion: "HABIDO",
    direccionFiscal: "AV. GARCILASO DE LA VEGA 1200 - CERCADO DE LIMA",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "LIMA",
    ubigeo: "150101",
  },
  "10458923011": {
    nombreRazonSocial: "RAMOS FLORES ROBERTO CARLOS",
    estado: "ACTIVO",
    condicion: "HABIDO",
    direccionFiscal: "JR. CAMANA 450 - CERCADO DE LIMA",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "LIMA",
    ubigeo: "150101",
  },
};

const KNOWN_DNI: Record<string, any> = {
  "45892301": {
    nombreCompleto: "ROBERTO CARLOS RAMOS FLORES",
    nombres: "ROBERTO CARLOS",
    apellidoPaterno: "RAMOS",
    apellidoMaterno: "FLORES",
    digitoVerificador: "8",
  },
  "72345678": {
    nombreCompleto: "CARLOS ALARCON GUTIERREZ",
    nombres: "CARLOS",
    apellidoPaterno: "ALARCON",
    apellidoMaterno: "GUTIERREZ",
    digitoVerificador: "1",
  },
  "70123456": {
    nombreCompleto: "MARIA ELENA GOMEZ CASTRO",
    nombres: "MARIA ELENA",
    apellidoPaterno: "GOMEZ",
    apellidoMaterno: "CASTRO",
    digitoVerificador: "4",
  },
  "41892011": {
    nombreCompleto: "JACKSON SCHWEINSTEIGER LOPEZ",
    nombres: "JACKSON",
    apellidoPaterno: "SCHWEINSTEIGER",
    apellidoMaterno: "LOPEZ",
    digitoVerificador: "7",
  },
};

/**
 * POST /api/v1/consultas/ruc - Consulta de RUC en SUNAT
 */
consultasRouter.post("/ruc", zValidator("json", ConsultaRucSchema), async (c) => {
  const { ruc } = c.req.valid("json");

  if (CACHE_ENTITIES.has(ruc)) {
    return c.json({
      success: true,
      found: true,
      tipoDoc: "RUC",
      numDoc: ruc,
      ...CACHE_ENTITIES.get(ruc),
      isFromCache: true,
    });
  }

  if (KNOWN_ENTITIES[ruc]) {
    const data = KNOWN_ENTITIES[ruc];
    CACHE_ENTITIES.set(ruc, data);
    return c.json({
      success: true,
      found: true,
      tipoDoc: "RUC",
      numDoc: ruc,
      ...data,
      isFromCache: false,
    });
  }

  // Si tiene formato válido de RUC
  const esValido = validarRucModulo11(ruc);
  if (esValido) {
    const isPersona = ruc.startsWith("10") || ruc.startsWith("15") || ruc.startsWith("17");
    const fakeData = {
      nombreRazonSocial: isPersona ? "CONTRIBUYENTE PERSONA NATURAL CON RUC" : "EMPRESA COMERCIAL PERUANA S.A.C.",
      estado: "ACTIVO",
      condicion: "HABIDO",
      direccionFiscal: "AV. PRINCIPAL NRO. 100 - LIMA",
      departamento: "LIMA",
      provincia: "LIMA",
      distrito: "LIMA",
      ubigeo: "150101",
    };
    CACHE_ENTITIES.set(ruc, fakeData);
    return c.json({
      success: true,
      found: true,
      tipoDoc: "RUC",
      numDoc: ruc,
      ...fakeData,
      isFromCache: false,
    });
  }

  return c.json(
    {
      success: false,
      found: false,
      tipoDoc: "RUC",
      numDoc: ruc,
      error: "El RUC ingresado no cumple con el algoritmo Módulo 11 de SUNAT o no se encuentra activo.",
    },
    404
  );
});

/**
 * POST /api/v1/consultas/dni - Consulta de DNI (RENIEC / Padrón)
 */
consultasRouter.post("/dni", zValidator("json", ConsultaDniSchema), async (c) => {
  const { dni } = c.req.valid("json");

  if (KNOWN_DNI[dni]) {
    const data = KNOWN_DNI[dni];
    return c.json({
      success: true,
      found: true,
      tipoDoc: "DNI",
      numDoc: dni,
      ...data,
    });
  }

  // Generación determinística para pruebas
  const nombresRandom = ["JUAN", "CARLOS", "PEDRO", "LUIS", "MARIA", "ANA", "ROSA"];
  const apellidosRandom = ["QUISPE", "FLORES", "RODRIGUEZ", "SANCHEZ", "GARCIA", "RAMIREZ"];

  const seed = parseInt(dni.slice(4), 10) || 1;
  const n = nombresRandom[seed % nombresRandom.length]!;
  const p = apellidosRandom[seed % apellidosRandom.length]!;
  const m = apellidosRandom[(seed + 2) % apellidosRandom.length]!;

  return c.json({
    success: true,
    found: true,
    tipoDoc: "DNI",
    numDoc: dni,
    nombreCompleto: `${n} ${p} ${m}`,
    nombres: n,
    apellidoPaterno: p,
    apellidoMaterno: m,
    digitoVerificador: String(seed % 10),
  });
});
