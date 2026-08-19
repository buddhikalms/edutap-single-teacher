import { z } from "zod";

const scoreSchema = z.object({
  success: z.boolean(),
  faceDetected: z.boolean().nullable().optional(),
  singleFace: z.boolean().nullable().optional(),
  qualityScore: z.number().nullable().optional(),
  livenessPassed: z.boolean().nullable().optional(),
  livenessScore: z.number().nullable().optional(),
  matchPassed: z.boolean().nullable().optional(),
  similarityScore: z.number().nullable().optional(),
  candidateId: z.string().nullable().optional(),
  secondCandidateId: z.string().nullable().optional(),
  secondSimilarityScore: z.number().nullable().optional(),
  embedding: z.array(z.number()).nullable().optional(),
  model: z.string().nullable().optional(),
  modelVersion: z.string().nullable().optional(),
  reasonCode: z.string().nullable().optional(),
  message: z.string().nullable().optional()
});

export type FaceServiceResponse = z.infer<typeof scoreSchema>;

function faceServiceConfig() {
  const baseUrl = process.env.FACE_SERVICE_INTERNAL_URL || process.env.FACE_SERVICE_URL;
  const apiKey = process.env.FACE_SERVICE_API_KEY || process.env.FACE_SERVICE_TOKEN;
  if (!baseUrl || !apiKey) {
    throw new Error("FACE_SERVICE_INTERNAL_URL/FACE_SERVICE_URL and FACE_SERVICE_API_KEY/FACE_SERVICE_TOKEN are required when face attendance is enabled.");
  }
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    timeoutMs: Number.parseInt(process.env.FACE_SERVICE_TIMEOUT_MS || "15000", 10)
  };
}

async function postFaceService(path: string, payload: unknown): Promise<FaceServiceResponse> {
  const config = faceServiceConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-face-service-key": config.apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json) {
      const detail =
        typeof json?.detail === "string"
          ? json.detail
          : Array.isArray(json?.detail)
            ? json.detail
                .map((item: unknown) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : null))
                .filter(Boolean)
                .join(" ")
            : null;
      return {
        success: false,
        reasonCode: typeof json?.reasonCode === "string" ? json.reasonCode : response.status === 422 ? "INVALID_FACE_SERVICE_PAYLOAD" : "RECOGNITION_SERVICE_UNAVAILABLE",
        message: typeof json?.message === "string" ? json.message : detail ?? "Face service request failed.",
        model: typeof json?.model === "string" ? json.model : null,
        modelVersion: typeof json?.modelVersion === "string" ? json.modelVersion : null
      };
    }
    return scoreSchema.parse(json);
  } catch {
    return { success: false, reasonCode: "RECOGNITION_SERVICE_UNAVAILABLE", message: "Face service is unavailable." };
  } finally {
    clearTimeout(timeout);
  }
}

export function enrolFaceTemplate(frames: string[]) {
  return postFaceService("/v1/face/enrol", { frames });
}

export function qualityFaceTemplate(frames: string[]) {
  return postFaceService("/v1/face/quality", { frames });
}

export function verifyFaceTemplate(input: {
  frames: string[];
  registeredEmbedding: number[];
  challengeActions: string[];
  thresholds: {
    match: number;
    manualReview: number;
    liveness: number;
  };
}) {
  return postFaceService("/v1/face/verify", input);
}

export function identifyFaceTemplate(input: {
  frames: string[];
  candidates: Array<{ id: string; embedding: number[] }>;
  challengeActions: string[];
  thresholds: {
    match: number;
    manualReview: number;
    liveness: number;
  };
}) {
  return postFaceService("/v1/face/identify", input);
}

export async function faceServiceHealth() {
  const config = faceServiceConfig();
  try {
    const response = await fetch(`${config.baseUrl}/health`, {
      headers: { "x-face-service-key": config.apiKey },
      signal: AbortSignal.timeout(config.timeoutMs)
    });
    const json = await response.json().catch(() => null);
    return response.ok && json?.ok
      ? { ok: true as const, model: String(json.model ?? ""), modelVersion: String(json.modelVersion ?? "") }
      : { ok: false as const, message: "Face service health check failed." };
  } catch {
    return { ok: false as const, message: "Face service is unavailable." };
  }
}
