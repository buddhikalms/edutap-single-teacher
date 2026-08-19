from fastapi import Header, HTTPException
from .config import settings


def require_service_key(x_face_service_key: str | None = Header(default=None)):
    if not x_face_service_key or x_face_service_key != settings.face_service_api_key:
        raise HTTPException(status_code=401, detail="Invalid service key")
