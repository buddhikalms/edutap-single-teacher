from fastapi import Depends, FastAPI
from .config import settings
from .schemas import EnrolRequest, FaceResponse, IdentifyRequest, QualityRequest, VerifyRequest
from .security import require_service_key
from .services.face_embedder import embedding_from_frames
from .services.face_matcher import cosine_similarity
from .services.liveness import liveness_score
from .services.quality import quality_score

app = FastAPI(title="EduTap Face Recognition Service", version=settings.model_version)


@app.get("/health")
def health():
    return {"ok": True, "model": settings.model_name, "modelVersion": settings.model_version}


@app.post("/v1/face/quality", response_model=FaceResponse, dependencies=[Depends(require_service_key)])
def quality(payload: QualityRequest):
    score, reason = quality_score(payload.frames)
    return FaceResponse(
        success=reason is None,
        faceDetected=reason is None,
        singleFace=reason is None,
        qualityScore=score,
        model=settings.model_name,
        modelVersion=settings.model_version,
        reasonCode=reason or "QUALITY_OK",
    )


@app.post("/v1/face/enrol", response_model=FaceResponse, dependencies=[Depends(require_service_key)])
def enrol(payload: EnrolRequest):
    score, reason = quality_score(payload.frames)
    if reason:
        return FaceResponse(success=False, qualityScore=score, model=settings.model_name, modelVersion=settings.model_version, reasonCode=reason)
    try:
        embedding = embedding_from_frames(payload.frames)
    except ValueError as error:
        return FaceResponse(success=False, qualityScore=score, model=settings.model_name, modelVersion=settings.model_version, reasonCode=str(error))
    except Exception:
        return FaceResponse(success=False, qualityScore=score, model=settings.model_name, modelVersion=settings.model_version, reasonCode="MODEL_UNAVAILABLE", message="Face recognition model is unavailable.")
    return FaceResponse(
        success=True,
        faceDetected=True,
        singleFace=True,
        qualityScore=score,
        embedding=embedding,
        model=settings.model_name,
        modelVersion=settings.model_version,
        reasonCode="ENROLLED",
    )


@app.post("/v1/face/liveness", response_model=FaceResponse, dependencies=[Depends(require_service_key)])
def liveness(payload: VerifyRequest):
    score, reason = liveness_score(payload.frames, payload.challengeActions)
    return FaceResponse(
        success=reason is None,
        livenessPassed=reason is None and score >= payload.thresholds.liveness,
        livenessScore=score,
        model=settings.model_name,
        modelVersion=settings.model_version,
        reasonCode=reason or "LIVENESS_OK",
    )


@app.post("/v1/face/verify", response_model=FaceResponse, dependencies=[Depends(require_service_key)])
def verify(payload: VerifyRequest):
    quality, quality_reason = quality_score(payload.frames)
    if quality_reason:
        return FaceResponse(success=False, qualityScore=quality, model=settings.model_name, modelVersion=settings.model_version, reasonCode=quality_reason)
    live_score, live_reason = liveness_score(payload.frames, payload.challengeActions)
    if live_reason or live_score < payload.thresholds.liveness:
        return FaceResponse(success=True, qualityScore=quality, livenessPassed=False, livenessScore=live_score, model=settings.model_name, modelVersion=settings.model_version, reasonCode="LIVENESS_FAILED")
    try:
        live_embedding = embedding_from_frames(payload.frames)
    except ValueError as error:
        return FaceResponse(success=False, qualityScore=quality, model=settings.model_name, modelVersion=settings.model_version, reasonCode=str(error))
    except Exception:
        return FaceResponse(success=False, qualityScore=quality, model=settings.model_name, modelVersion=settings.model_version, reasonCode="MODEL_UNAVAILABLE", message="Face recognition model is unavailable.")
    similarity = cosine_similarity(live_embedding, payload.registeredEmbedding)
    return FaceResponse(
        success=True,
        faceDetected=True,
        singleFace=True,
        qualityScore=quality,
        livenessPassed=True,
        livenessScore=live_score,
        matchPassed=similarity >= payload.thresholds.match,
        similarityScore=similarity,
        model=settings.model_name,
        modelVersion=settings.model_version,
        reasonCode="VERIFIED" if similarity >= payload.thresholds.match else "FACE_MATCH_UNCERTAIN" if similarity >= payload.thresholds.manualReview else "FACE_NOT_MATCHED",
    )


@app.post("/v1/face/identify", response_model=FaceResponse, dependencies=[Depends(require_service_key)])
def identify(payload: IdentifyRequest):
    quality, quality_reason = quality_score(payload.frames)
    if quality_reason:
        return FaceResponse(success=False, qualityScore=quality, model=settings.model_name, modelVersion=settings.model_version, reasonCode=quality_reason)

    live_score, live_reason = liveness_score(payload.frames, payload.challengeActions)
    if live_reason or live_score < payload.thresholds.liveness:
        return FaceResponse(success=True, qualityScore=quality, livenessPassed=False, livenessScore=live_score, model=settings.model_name, modelVersion=settings.model_version, reasonCode="LIVENESS_FAILED")

    try:
        live_embedding = embedding_from_frames(payload.frames)
    except ValueError as error:
        return FaceResponse(success=False, qualityScore=quality, model=settings.model_name, modelVersion=settings.model_version, reasonCode=str(error))
    except Exception:
        return FaceResponse(success=False, qualityScore=quality, model=settings.model_name, modelVersion=settings.model_version, reasonCode="MODEL_UNAVAILABLE", message="Face recognition model is unavailable.")
    ranked = sorted(
        ((candidate.id, cosine_similarity(live_embedding, candidate.embedding)) for candidate in payload.candidates),
        key=lambda item: item[1],
        reverse=True,
    )
    best_id, best_score = ranked[0]
    second_id, second_score = ranked[1] if len(ranked) > 1 else (None, None)
    ambiguous = second_score is not None and best_score - second_score < (payload.thresholds.match - payload.thresholds.manualReview)
    passed = best_score >= payload.thresholds.match and not ambiguous

    return FaceResponse(
        success=True,
        faceDetected=True,
        singleFace=True,
        qualityScore=quality,
        livenessPassed=True,
        livenessScore=live_score,
        matchPassed=passed,
        similarityScore=best_score,
        candidateId=best_id,
        secondCandidateId=second_id,
        secondSimilarityScore=second_score,
        model=settings.model_name,
        modelVersion=settings.model_version,
        reasonCode="VERIFIED" if passed else "FACE_MATCH_AMBIGUOUS" if ambiguous else "FACE_MATCH_UNCERTAIN" if best_score >= payload.thresholds.manualReview else "FACE_NOT_MATCHED",
    )
