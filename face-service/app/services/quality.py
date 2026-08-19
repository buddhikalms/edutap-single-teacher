import base64
import cv2
import numpy as np
from ..config import settings


def decode_frame(data_url: str):
    try:
        _, encoded = data_url.split(",", 1)
        data = base64.b64decode(encoded, validate=True)
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        return image
    except Exception:
        return None


def quality_score(frames: list[str]) -> tuple[float, str | None]:
    scores: list[float] = []
    brightness_values: list[float] = []
    for frame in frames:
        image = decode_frame(frame)
        if image is None:
            return 0.0, "QUALITY_FAILED"
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray)) / 255.0
        blur = min(float(cv2.Laplacian(gray, cv2.CV_64F).var()) / 220.0, 1.0)
        brightness_values.append(brightness)
        scores.append((brightness * 0.55) + (blur * 0.45))

    if not scores:
        return 0.0, "QUALITY_FAILED"

    # Use the stronger samples so one shaky capture does not reject a whole set.
    keep_count = max(1, int(np.ceil(len(scores) * 0.6)))
    score = float(np.mean(sorted(scores, reverse=True)[:keep_count]))
    brightness_score = float(np.mean(sorted(brightness_values, reverse=True)[:keep_count]))
    if score < settings.quality_min_score:
        return score, "LOW_LIGHT" if brightness_score < settings.low_light_threshold else "IMAGE_BLURRY"
    return score, None
