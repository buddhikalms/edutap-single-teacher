import assert from "node:assert/strict";
import { AttendanceStatus } from "@prisma/client";
import { FACE_ERROR_MESSAGES, faceErrorMessage } from "../lib/face-error-messages";
import { statusFromTiming } from "../lib/face-attendance";
import { parseVerificationToken } from "../lib/verification-token";

process.env.FACE_VERIFICATION_TOKEN_SECRET = "test-secret-that-is-long-enough-for-hmac";

const base = new Date("2026-07-21T08:00:00.000Z");
assert.equal(statusFromTiming(base, new Date("2026-07-21T08:15:00.000Z")), AttendanceStatus.PRESENT);
assert.equal(statusFromTiming(new Date("2026-07-21T08:16:00.000Z"), new Date("2026-07-21T08:15:00.000Z")), AttendanceStatus.LATE);
assert.equal(faceErrorMessage("FACE_NOT_MATCHED"), FACE_ERROR_MESSAGES.FACE_NOT_MATCHED);
assert.equal(faceErrorMessage("UNKNOWN"), "Face attendance could not be completed.");
assert.equal(parseVerificationToken("not-a-token"), null);

console.log("face-attendance unit checks passed");
