from pydantic import BaseModel, Field


class EnrolRequest(BaseModel):
    frames: list[str] = Field(min_length=5, max_length=10)


class QualityRequest(BaseModel):
    frames: list[str] = Field(min_length=1, max_length=10)


class VerifyThresholds(BaseModel):
    match: float
    manualReview: float
    liveness: float


class VerifyRequest(BaseModel):
    frames: list[str] = Field(min_length=3, max_length=12)
    registeredEmbedding: list[float]
    challengeActions: list[str] = Field(min_length=2, max_length=3)
    thresholds: VerifyThresholds


class IdentifyCandidate(BaseModel):
    id: str
    embedding: list[float]


class IdentifyRequest(BaseModel):
    frames: list[str] = Field(min_length=3, max_length=12)
    candidates: list[IdentifyCandidate] = Field(min_length=1, max_length=5000)
    challengeActions: list[str] = Field(min_length=2, max_length=3)
    thresholds: VerifyThresholds


class FaceResponse(BaseModel):
    success: bool
    faceDetected: bool = False
    singleFace: bool = False
    qualityScore: float | None = None
    livenessPassed: bool | None = None
    livenessScore: float | None = None
    matchPassed: bool | None = None
    similarityScore: float | None = None
    embedding: list[float] | None = None
    candidateId: str | None = None
    secondCandidateId: str | None = None
    secondSimilarityScore: float | None = None
    model: str
    modelVersion: str
    reasonCode: str
    message: str | None = None
