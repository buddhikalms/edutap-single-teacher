import hashlib


def liveness_score(frames: list[str], challenge_actions: list[str]) -> tuple[float, str | None]:
    if len(set(hashlib.sha256(frame.encode("utf-8")).hexdigest() for frame in frames)) < max(2, len(frames) // 2):
        return 0.0, "LIVENESS_FAILED"
    if len(challenge_actions) < 2:
        return 0.0, "LIVENESS_FAILED"
    return 0.9, None
