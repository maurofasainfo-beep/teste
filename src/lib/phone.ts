const VALID_BRAZILIAN_DDDS = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
]);

export function normalizeBrazilianPhone(input: string) {
  const value = String(input ?? "").trim();

  if (!value) {
    throw new Error("Informe um telefone.");
  }

  if (/[a-z]/i.test(value)) {
    throw new Error("Telefone nao pode conter letras.");
  }

  const digits = value.replace(/\D/g, "");
  const localDigits =
    digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
      ? digits.slice(2)
      : digits;

  if (localDigits.length < 10) {
    throw new Error("Telefone muito curto. Informe DDD e numero.");
  }

  if (localDigits.length > 11) {
    throw new Error("Telefone muito longo. Use DDD e numero.");
  }

  const ddd = localDigits.slice(0, 2);

  if (!VALID_BRAZILIAN_DDDS.has(ddd)) {
    throw new Error("DDD invalido.");
  }

  return `55${localDigits}`;
}

export function formatBrazilianPhone(input: string | null | undefined) {
  const normalized = normalizeBrazilianPhone(input ?? "");
  const localDigits = normalized.slice(2);
  const prefix =
    localDigits.length === 11
      ? localDigits.slice(2, 7)
      : localDigits.slice(2, 6);
  const suffix =
    localDigits.length === 11 ? localDigits.slice(7) : localDigits.slice(6);

  return `(${localDigits.slice(0, 2)}) ${prefix}-${suffix}`;
}

export function maskBrazilianPhone(input: string | null | undefined) {
  try {
    const normalized = normalizeBrazilianPhone(input ?? "");
    const localDigits = normalized.slice(2);

    return `(${localDigits.slice(0, 2)}) *****-${localDigits.slice(-4)}`;
  } catch {
    return "*****";
  }
}
