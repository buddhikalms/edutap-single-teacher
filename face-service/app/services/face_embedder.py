import hashlib
import numpy as np
from .quality import decode_frame
from ..config import settings

_face_app = None


def _insightface_app():
    global _face_app
    if _face_app is not None:
        return _face_app

    try:
        from insightface.app import FaceAnalysis
    except Exception:
        return None

    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(640, 640))
    _face_app = app
    return _face_app


def embedding_from_frames(frames: list[str]) -> list[float]:
    app = _insightface_app()
    if app is not None:
        embeddings = []
        for frame in frames:
            image = decode_frame(frame)
            if image is None:
                raise ValueError("QUALITY_FAILED")
            faces = app.get(image)
            if len(faces) != 1:
                raise ValueError("MULTIPLE_FACES" if len(faces) > 1 else "NO_FACE")
            embeddings.append(np.asarray(faces[0].normed_embedding, dtype=np.float32))

        vector = np.mean(np.stack(embeddings), axis=0)
        norm = np.linalg.norm(vector) or 1.0
        return (vector / norm).astype(float).tolist()

    if not settings.mock_face_service:
        raise RuntimeError("InsightFace model is not available. Set MOCK_FACE_SERVICE=true only for non-production tests.")

    digest = hashlib.sha512("".join(frame[:4096] for frame in frames).encode("utf-8")).digest()
    vector = np.frombuffer(digest, dtype=np.uint8).astype(np.float32)
    vector = np.resize(vector, 512)
    vector = vector - np.mean(vector)
    norm = np.linalg.norm(vector) or 1.0
    return (vector / norm).astype(float).tolist()
