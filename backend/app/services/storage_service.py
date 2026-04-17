from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Final
from urllib.parse import urlparse
from uuid import uuid4

import boto3
from botocore.client import BaseClient
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


MAX_IMAGE_SIZE_BYTES: Final[int] = 5 * 1024 * 1024
ALLOWED_IMAGE_CONTENT_TYPES: Final[dict[str, str]] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
ALLOWED_IMAGE_EXTENSIONS: Final[set[str]] = {".jpg", ".jpeg", ".png", ".webp"}


def _normalize_endpoint_url() -> str:
    endpoint = settings.MINIO_ENDPOINT.rstrip("/")
    if endpoint.startswith("http://") or endpoint.startswith("https://"):
        return endpoint

    scheme = "https" if settings.MINIO_SECURE else "http"
    return f"{scheme}://{endpoint}"


def _get_s3_client() -> BaseClient:
    return boto3.client(
        "s3",
        endpoint_url=_normalize_endpoint_url(),
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
    )


def _build_public_object_url(object_name: str) -> str:
    return f"{_normalize_endpoint_url()}/{settings.MINIO_BUCKET}/{object_name}"


def build_object_name(*, prefix: str, user_id: str, filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension == ".jpeg":
        extension = ".jpg"

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{prefix}/{user_id}/{timestamp}-{uuid4().hex}{extension}"


def ensure_bucket_exists() -> None:
    client = _get_s3_client()

    try:
        client.head_bucket(Bucket=settings.MINIO_BUCKET)
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code not in {"404", "NoSuchBucket"}:
            raise
        client.create_bucket(Bucket=settings.MINIO_BUCKET)

    bucket_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{settings.MINIO_BUCKET}/*"],
            }
        ],
    }
    client.put_bucket_policy(Bucket=settings.MINIO_BUCKET, Policy=json.dumps(bucket_policy))


async def upload_image(file: UploadFile, object_name: str) -> str:
    extension = Path(file.filename or "").suffix.lower()
    if extension == ".jpeg":
        extension = ".jpg"

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only jpg, jpeg, png and webp files are allowed",
        )

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only jpg, jpeg, png and webp files are allowed",
        )

    payload = await file.read()
    if len(payload) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size must be 5MB or less",
        )

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    ensure_bucket_exists()
    client = _get_s3_client()
    client.put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=object_name,
        Body=payload,
        ContentType=content_type,
    )
    return _build_public_object_url(object_name)


def upload_file_bytes(*, payload: bytes, object_name: str, content_type: str) -> str:
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    ensure_bucket_exists()
    client = _get_s3_client()
    client.put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=object_name,
        Body=payload,
        ContentType=content_type,
    )
    return _build_public_object_url(object_name)


def delete_object(object_name: str) -> None:
    client = _get_s3_client()
    client.delete_object(Bucket=settings.MINIO_BUCKET, Key=object_name)


def extract_object_name(url: str | None) -> str | None:
    if not url:
        return None

    parsed_url = urlparse(url)
    bucket_prefix = f"/{settings.MINIO_BUCKET}/"
    if not parsed_url.path.startswith(bucket_prefix):
        return None

    return parsed_url.path[len(bucket_prefix):]
