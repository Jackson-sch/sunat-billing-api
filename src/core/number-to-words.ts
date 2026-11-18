/**
 * Conversor oficial de montos numéricos a letras en español
 * Formato SUNAT: "SON: [MONTO EN LETRAS] Y [CENTAVOS]/100 [MONEDA]"
 */

const UNIDADES = [
  "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE",
  "DIECIOCHO", "DIECINUEVE", "VEINTE"
];

const DECENAS = [
  "", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"
];

const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"
];

function convertirGrupo(n: number): string {
  let salida = "";

  if (n === 100) {
    return "CIEN";
  }

  if (n >= 100) {
    salida += CENTENAS[Math.floor(n / 100)] + " ";
    n = n % 100;
  }

  if (n <= 20) {
    salida += UNIDADES[n];
  } else if (n < 30) {
    salida += "VEINTI" + UNIDADES[n - 20];
  } else {
    salida += DECENAS[Math.floor(n / 10)];
    if (n % 10 > 0) {
      salida += " Y " + UNIDADES[n % 10];
    }
  }

  return salida.trim();
}

export function numeroALetras(monto: number, moneda: string = "PEN"): string {
  if (isNaN(monto) || monto < 0) return "CERO Y 00/100 SOLES";

  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const centavosStr = String(centavos).padStart(2, "0") + "/100";

  let monedaNombre = "SOLES";
  if (moneda === "USD") {
    monedaNombre = entero === 1 ? "DÓLAR AMERICANO" : "DÓLARES AMERICANOS";
  } else {
    monedaNombre = entero === 1 ? "SOL" : "SOLES";
  }

  if (entero === 0) {
    return `CERO Y ${centavosStr} ${monedaNombre}`;
  }

  let letras = "";

  // Millones (hasta 999 millones)
  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;

  if (millones > 0) {
    if (millones === 1) {
      letras += "UN MILLON ";
    } else {
      letras += convertirGrupo(millones) + " MILLONES ";
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      letras += "MIL ";
    } else {
      letras += convertirGrupo(miles) + " MIL ";
    }
  }

  if (resto > 0) {
    letras += convertirGrupo(resto);
  }

  letras = letras.trim();
  return `SON: ${letras} Y ${centavosStr} ${monedaNombre}`;
}
