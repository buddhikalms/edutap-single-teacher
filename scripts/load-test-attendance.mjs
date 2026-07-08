import autocannon from "autocannon";
import crypto from "node:crypto";

const mode = process.argv[2] === "qr" ? "qr" : "nfc";
const baseUrl = process.env.LOAD_TEST_BASE_URL ?? "http://localhost:3000";
const classGroupId = process.env.LOAD_TEST_CLASS_GROUP_ID;
const tokenList = (mode === "qr" ? process.env.LOAD_TEST_QR_TOKENS : process.env.LOAD_TEST_NFC_UIDS)?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];

if (!classGroupId || tokenList.length === 0) {
  console.error(`Set LOAD_TEST_CLASS_GROUP_ID and ${mode === "qr" ? "LOAD_TEST_QR_TOKENS" : "LOAD_TEST_NFC_UIDS"} before running this load test.`);
  process.exit(1);
}

function payload() {
  const value = tokenList[Math.floor(Math.random() * tokenList.length)];
  const invalidEvery = Number.parseInt(process.env.LOAD_TEST_INVALID_EVERY ?? "0", 10);
  const useInvalid = invalidEvery > 0 && Math.floor(Math.random() * invalidEvery) === 0;
  const scannedValue = useInvalid ? `invalid-${crypto.randomUUID()}` : value;

  return JSON.stringify({
    classGroupId,
    scanId: crypto.randomUUID(),
    deviceId: process.env.LOAD_TEST_DEVICE_ID ?? `${mode}-load-reader-1`,
    scanType: mode.toUpperCase(),
    scannedValue,
    timestamp: new Date().toISOString(),
    status: "PRESENT",
    ...(mode === "qr" ? { token: scannedValue } : { nfcUid: scannedValue })
  });
}

const scenarios = [
  { title: "50 concurrent scans", connections: 50, amount: 50 },
  { title: "100 concurrent scans", connections: 100, amount: 100 },
  { title: "500 scans in 1 minute", connections: 25, duration: 60 }
];

for (const scenario of scenarios) {
  console.log(`\n${scenario.title}`);
  const result = await autocannon({
    url: `${baseUrl}/api/attendance/${mode}`,
    method: "POST",
    connections: scenario.connections,
    amount: scenario.amount,
    duration: scenario.duration,
    headers: { "content-type": "application/json" },
    requests: [{ setupRequest: (request) => ({ ...request, body: payload() }) }]
  });
  autocannon.printResult(result);
}

console.log("\nDuplicate scan burst");
const duplicateValue = tokenList[0];
const duplicateScanId = crypto.randomUUID();
const duplicateBody = JSON.stringify({
  classGroupId,
  scanId: duplicateScanId,
  deviceId: process.env.LOAD_TEST_DEVICE_ID ?? `${mode}-load-reader-1`,
  scanType: mode.toUpperCase(),
  scannedValue: duplicateValue,
  timestamp: new Date().toISOString(),
  status: "PRESENT",
  ...(mode === "qr" ? { token: duplicateValue } : { nfcUid: duplicateValue })
});

autocannon.printResult(
  await autocannon({
    url: `${baseUrl}/api/attendance/${mode}`,
    method: "POST",
    connections: 20,
    amount: 20,
    headers: { "content-type": "application/json" },
    body: duplicateBody
  })
);
