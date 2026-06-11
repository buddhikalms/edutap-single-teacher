export function normalizeNfcUid(value: string | null | undefined) {
  return (value ?? "").trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function reverseHexBytePairs(value: string) {
  const normalized = normalizeNfcUid(value);
  if (!/^[0-9A-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    return normalized;
  }

  return normalized.match(/.{2}/g)?.reverse().join("") ?? normalized;
}

export function nfcUidCandidates(value: string | null | undefined) {
  const normalized = normalizeNfcUid(value);
  const reversed = reverseHexBytePairs(normalized);
  return Array.from(new Set([value?.trim(), normalized, reversed].filter(Boolean) as string[]));
}
