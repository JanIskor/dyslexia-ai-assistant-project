from fastapi import HTTPException, status


TEACHER_GENDER_NOT_SPECIFIED = "not_specified"
TEACHER_GENDER_MALE = "male"
TEACHER_GENDER_FEMALE = "female"

TEACHER_GENDER_LABELS = {
    TEACHER_GENDER_NOT_SPECIFIED: "Не указан",
    TEACHER_GENDER_MALE: "Мужской",
    TEACHER_GENDER_FEMALE: "Женский",
    "Не указан": "Не указан",
    "Мужской": "Мужской",
    "Женский": "Женский",
}

TEACHER_GENDER_VALUE_ALIASES = {
    TEACHER_GENDER_NOT_SPECIFIED: TEACHER_GENDER_NOT_SPECIFIED,
    TEACHER_GENDER_MALE: TEACHER_GENDER_MALE,
    TEACHER_GENDER_FEMALE: TEACHER_GENDER_FEMALE,
    "Не указан": TEACHER_GENDER_NOT_SPECIFIED,
    "Мужской": TEACHER_GENDER_MALE,
    "Женский": TEACHER_GENDER_FEMALE,
}


def normalize_teacher_gender(value: str | None) -> str:
    if value is None:
        return TEACHER_GENDER_NOT_SPECIFIED

    normalized_value = value.strip()
    if not normalized_value:
        return TEACHER_GENDER_NOT_SPECIFIED

    teacher_gender = TEACHER_GENDER_VALUE_ALIASES.get(normalized_value)
    if teacher_gender is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher gender must be one of not_specified, male or female",
        )

    return teacher_gender
