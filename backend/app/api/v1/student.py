from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student, get_db
from app.models.user import User
from app.schemas.profile_avatar import ProfileAvatarUploadResponse
from app.schemas.student_profile_edit import StudentProfileEditRequest, StudentProfileEditResponse
from app.schemas.student_profile import StudentProfileResponse, StudentProfileUpdateRequest
from app.schemas.teacher_student_messages import TeacherStudentMessageItem, TeacherStudentMessagesListResponse
from app.services.student_profile_service import (
    get_or_create_student_profile,
    get_student_mode,
    submit_student_profile,
    upload_student_avatar,
    update_student_profile,
)
from app.services.student_profile_update_requests_service import (
    get_student_profile_edit_state,
    save_student_profile_edit_draft,
    submit_student_profile_edit_request,
    upload_student_profile_edit_avatar,
)
from app.services.teacher_student_messages_service import (
    get_student_message,
    list_student_messages,
    mark_student_message_as_read,
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


@router.get("/profile-edit", response_model=StudentProfileEditResponse)
def read_student_profile_edit_state(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return get_student_profile_edit_state(db, student_user_id=current_student.id)


@router.put("/profile-edit", response_model=StudentProfileEditResponse)
def put_student_profile_edit_state(
    payload: StudentProfileEditRequest,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return save_student_profile_edit_draft(
        db,
        student_user_id=current_student.id,
        payload=payload,
    )


@router.post("/profile-edit/submit", response_model=StudentProfileEditResponse)
def submit_student_profile_edit_state(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return submit_student_profile_edit_request(db, student_user_id=current_student.id)


@router.post("/profile/avatar", response_model=ProfileAvatarUploadResponse)
async def upload_student_profile_avatar(
    file: UploadFile = File(...),
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_mode = get_student_mode(db, student_user_id=current_student.id)

    if student_mode == "regular":
        avatar_url = await upload_student_profile_edit_avatar(
            db,
            student_user_id=current_student.id,
            file=file,
        )
    else:
        avatar_url = await upload_student_avatar(
            db,
            student_user_id=current_student.id,
            file=file,
        )

    return ProfileAvatarUploadResponse(avatar_url=avatar_url)


@router.get("/messages", response_model=TeacherStudentMessagesListResponse)
def read_student_messages(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return list_student_messages(db, student_user_id=current_student.id)


@router.get("/messages/{message_id}", response_model=TeacherStudentMessageItem)
def read_student_message(
    message_id: UUID,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    message = get_student_message(db, student_user_id=current_student.id, message_id=message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.post("/messages/{message_id}/read", response_model=TeacherStudentMessageItem)
def read_student_message_as_read(
    message_id: UUID,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return mark_student_message_as_read(db, student_user_id=current_student.id, message_id=message_id)
