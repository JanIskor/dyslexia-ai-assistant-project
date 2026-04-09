from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student, get_db
from app.models.user import User
from app.schemas.student_profile import StudentProfileResponse, StudentProfileUpdateRequest
from app.services.student_profile_service import (
    get_or_create_student_profile,
    get_student_mode,
    submit_student_profile,
    update_student_profile,
)

router = APIRouter(prefix="/student", tags=["Student"])


def build_student_profile_response(db: Session, profile) -> StudentProfileResponse:
    return StudentProfileResponse.model_validate(
        {
            "id": profile.id,
            "user_id": profile.user_id,
            "student_mode": get_student_mode(db, student_user_id=profile.user_id),
            "full_name": profile.full_name,
            "birth_date": profile.birth_date,
            "gender": profile.gender,
            "grade_label": profile.grade_label,
            "enrollment_date": profile.enrollment_date,
            "quote": profile.quote,
            "avatar_url": profile.avatar_url,
            "profile_status": profile.profile_status,
            "submitted_at": profile.submitted_at,
        }
    )


@router.get("/profile", response_model=StudentProfileResponse)
def read_student_profile(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    profile = get_or_create_student_profile(db, current_student.id)
    return build_student_profile_response(db, profile)


@router.patch("/profile", response_model=StudentProfileResponse)
def patch_student_profile(
    payload: StudentProfileUpdateRequest,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    profile = get_or_create_student_profile(db, current_student.id)
    updated_profile = update_student_profile(
        db,
        profile=profile,
        updates=payload.model_dump(exclude_unset=True),
    )
    return build_student_profile_response(db, updated_profile)


@router.post("/profile/submit", response_model=StudentProfileResponse)
def submit_current_student_profile(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    profile = get_or_create_student_profile(db, current_student.id)
    submitted_profile = submit_student_profile(db, profile=profile)
    return build_student_profile_response(db, submitted_profile)
