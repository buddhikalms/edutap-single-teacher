export const FACE_ERROR_MESSAGES = {
  CAMERA_PERMISSION_DENIED: "Camera permission is required to use face attendance.",
  CAMERA_NOT_AVAILABLE: "Camera is not available on this device.",
  QUALITY_FAILED: "Face image quality could not be checked. Try again with a clear camera view.",
  QUALITY_OK: "Face image quality looks good.",
  ENROLLED: "Face profile enrolled successfully.",
  NO_FACE: "No face was detected. Centre your face in the guide.",
  NO_FACE_DETECTED: "No face was detected. Centre your face in the guide.",
  MULTIPLE_FACES: "Only one face should be visible.",
  MULTIPLE_FACES_DETECTED: "Only one face should be visible.",
  FACE_TOO_SMALL: "Move a little closer to the camera.",
  FACE_TOO_LARGE: "Move a little farther from the camera.",
  LOW_LIGHT: "Improve the lighting around your face.",
  IMAGE_BLURRY: "Hold the phone steady so the image is clear.",
  LIVENESS_FAILED: "The liveness check did not pass. Please try again.",
  FACE_NOT_MATCHED: "Your face could not be matched to your registered profile.",
  FACE_MATCH_UNCERTAIN: "This attempt needs teacher review.",
  FACE_MATCH_AMBIGUOUS: "Face match is ambiguous. Confirm manually.",
  FACE_PROFILE_NOT_FOUND: "No active face profile was found.",
  FACE_PROFILE_INACTIVE: "Your face profile is not active.",
  CONSENT_REQUIRED: "Face attendance consent is required before scanning.",
  CONSENT_REVOKED: "Face attendance consent has been revoked.",
  SESSION_NOT_FOUND: "Attendance session was not found.",
  SESSION_NOT_ACTIVE: "This attendance session is not active.",
  SESSION_EXPIRED: "This attendance session has ended.",
  NOT_ENROLLED: "You are not enrolled in this class.",
  ALREADY_MARKED: "Your attendance is already marked for this session.",
  MAX_ATTEMPTS_REACHED: "Maximum face attendance attempts reached.",
  DEVICE_NOT_ALLOWED: "This device is not allowed for face attendance.",
  LOCATION_NOT_ALLOWED: "Your location could not be validated for this class.",
  VERIFICATION_TOKEN_EXPIRED: "Your verification expired. Please scan again.",
  VERIFICATION_TOKEN_REUSED: "This verification was already used.",
  RECOGNITION_SERVICE_UNAVAILABLE: "Face verification service is currently unavailable.",
  MODEL_UNAVAILABLE: "Face recognition model is unavailable. Check the face service setup.",
  INVALID_FACE_SERVICE_PAYLOAD: "Face service received invalid samples. Capture the required frames and try again.",
  NETWORK_ERROR: "Connection was interrupted. Please try again."
} as const;

export type FaceErrorCode = keyof typeof FACE_ERROR_MESSAGES;

export function faceErrorMessage(code?: string | null) {
  return code && code in FACE_ERROR_MESSAGES ? FACE_ERROR_MESSAGES[code as FaceErrorCode] : "Face attendance could not be completed.";
}
