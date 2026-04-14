from fastapi import HTTPException, status


ALLOWED_PROFILE_GENDERS = {"Мужской", "Женский"}


def normalize_profile_gender(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    if not normalized_value:
        return None

    if normalized_value not in ALLOWED_PROFILE_GENDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gender must be either Мужской or Женский",
        )

    return normalized_value
