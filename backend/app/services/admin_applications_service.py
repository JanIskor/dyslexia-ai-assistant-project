from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from sqlalchemy.orm import Session, object_session
from uuid import UUID

from app.models.student_profile import StudentProfile
from app.models.student_profile_update_request import StudentProfileUpdateRequest
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_profile_update_request import TeacherProfileUpdateRequest
from app.models.teacher_student import TeacherStudent
from app.models.teacher_student_rejection import TeacherStudentRejection
from app.models.user import User
from app.schemas.admin_applications import (
    AdminAssignTeacherRequest,
    AdminApplicationDetailResponse,
    AdminApplicationListItem,
    AdminApplicationsFiltersResponse,
    AdminApplicationStatusFilterOption,
    AdminApplicationsListResponse,
    AdminApplicationUpdateRequest,
    AdminTeacherAssignmentOption,
    AdminTeacherAssignmentOptionsResponse,
)
from app.services.notifications_service import create_notification
from app.services.student_profile_update_requests_service import (
    approve_student_profile_update_request,
    request_student_profile_update_changes,
)
from app.services.teacher_profile_update_requests_service import (
    approve_teacher_profile_update_request,
    request_teacher_profile_update_changes,
)


PROFILE_STATUS_TO_APPLICATION_STATUS = {
    "submitted": "Новая",
    "in_review": "На рассмотрении",
    "needs_completion": "На доработке",
    "approved": "Подтверждена",
    "needs_assignment": "NEEDS_ASSIGNMENT",
    "teacher_accepted": "Принята преподавателем",
    "teacher_rejected": "Отклонена преподавателем",
    "draft": "Черновик",
    "rejected": "Отклонена",
}

APPLICATION_STATUS_TO_PROFILE_STATUSES = {
    "Новая": ("submitted",),
    "На рассмотрении": ("in_review",),
    "На доработке": ("needs_completion",),
    "Подтверждена": ("approved",),
    "NEEDS_ASSIGNMENT": ("needs_assignment",),
    "Принята преподавателем": ("teacher_accepted",),
    "Отклонена преподавателем": ("teacher_rejected",),
}

VISIBLE_APPLICATION_STATUSES = (
    "submitted",
    "in_review",
    "needs_completion",
    "approved",
    "needs_assignment",
    "teacher_accepted",
    "teacher_rejected",
)
VISIBLE_UPDATE_REQUEST_STATUSES = (
    "submitted",
    "in_review",
    "revision_requested",
)
VISIBLE_TEACHER_UPDATE_REQUEST_STATUSES = VISIBLE_UPDATE_REQUEST_STATUSES
REVIEWABLE_APPLICATION_STATUSES = {"submitted", "in_review"}
ASSIGNABLE_APPLICATION_STATUSES = {"submitted", "in_review", "approved", "needs_assignment", "teacher_rejected"}
TEACHER_ASSIGNMENT_CAPACITY = 15
TEACHER_REVIEW_STATUS_LABELS = {
    "pending": "Ожидает решения преподавателя",
    "accepted": "Принята преподавателем",
    "rejected": "Отклонена преподавателем",
}
UPDATE_REQUEST_STATUS_TO_APPLICATION_STATUS = {
    "submitted": "Новая",
    "in_review": "На рассмотрении",
    "revision_requested": "На доработке",
    "approved": "Подтверждена",
    "draft": "Черновик",
}

REQUEST_KIND_INITIAL_PROFILE = "initial_profile"
REQUEST_KIND_STUDENT_PROFILE_UPDATE = "profile_update"
REQUEST_KIND_TEACHER_PROFILE_UPDATE = "teacher_profile_update"
REQUEST_KIND_SYSTEM_ASSIGNMENT_EVENT = "system_assignment_event"


def map_application_status(profile_status: str) -> str:
    return PROFILE_STATUS_TO_APPLICATION_STATUS.get(profile_status, "На рассмотрении")


def map_update_request_status(status_value: str) -> str:
    return UPDATE_REQUEST_STATUS_TO_APPLICATION_STATUS.get(status_value, "На рассмотрении")


def map_teacher_review_status(review_status: str | None) -> str | None:
    if review_status is None:
        return None

    return TEACHER_REVIEW_STATUS_LABELS.get(review_status, review_status)


def get_admin_application_status_filters() -> AdminApplicationsFiltersResponse:
    return AdminApplicationsFiltersResponse(
        statuses=[
            AdminApplicationStatusFilterOption(
                value=status_label,
                label="Требует назначения" if status_label == "NEEDS_ASSIGNMENT" else status_label,
            )
            for status_label in APPLICATION_STATUS_TO_PROFILE_STATUSES
        ]
    )


def list_admin_teacher_assignment_options(
    db: Session,
    *,
    application_id: UUID | None = None,
) -> AdminTeacherAssignmentOptionsResponse:
    rejected_teacher_ids: set[UUID] = set()
    if application_id is not None:
        profile = _get_student_profile_for_assignment_or_404(db, application_id)
        rejected_teacher_ids = {
            row.teacher_user_id
            for row in db.query(TeacherStudentRejection.teacher_user_id)
            .filter(TeacherStudentRejection.student_user_id == profile.user_id)
            .all()
        }

    teacher_rows = (
        db.query(
            TeacherProfile.user_id.label("teacher_user_id"),
            TeacherProfile.full_name,
            TeacherProfile.subject_name,
            func.count(TeacherStudent.id).label("student_count"),
        )
        .join(User, User.id == TeacherProfile.user_id)
        .outerjoin(TeacherStudent, TeacherStudent.teacher_user_id == TeacherProfile.user_id)
        .filter(
            User.role == "teacher",
            User.is_active.is_(True),
        )
        .group_by(TeacherProfile.user_id, TeacherProfile.full_name, TeacherProfile.subject_name)
        .order_by(TeacherProfile.full_name.asc())
        .all()
    )

    return AdminTeacherAssignmentOptionsResponse(
        items=[
            AdminTeacherAssignmentOption(
                teacher_user_id=row.teacher_user_id,
                full_name=row.full_name,
                subject_name=row.subject_name,
                student_count=row.student_count,
                capacity=TEACHER_ASSIGNMENT_CAPACITY,
                is_available=(
                    row.student_count < TEACHER_ASSIGNMENT_CAPACITY
                    and row.teacher_user_id not in rejected_teacher_ids
                ),
                unavailable_reason=(
                    "full_capacity"
                    if row.student_count >= TEACHER_ASSIGNMENT_CAPACITY
                    else "already_rejected_this_student"
                    if row.teacher_user_id in rejected_teacher_ids
                    else None
                ),
            )
            for row in teacher_rows
        ]
    )


def _build_surname_prefix_search_filter(search: str):
    return StudentProfile.full_name.ilike(f"{search.strip()}%")


def list_admin_applications(
    db: Session,
    *,
    search: str | None = None,
    statuses: list[str] | None = None,
) -> AdminApplicationsListResponse:
    profile_query = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            User.role == "student",
            User.is_active.is_(True),
            StudentProfile.full_name.isnot(None),
            func.length(func.trim(StudentProfile.full_name)) > 0,
            StudentProfile.profile_status.in_(VISIBLE_APPLICATION_STATUSES),
        )
        .order_by(StudentProfile.full_name.asc())
    )

    if search and search.strip():
        profile_query = profile_query.filter(_build_surname_prefix_search_filter(search))

    if statuses:
        allowed_profile_statuses = {
            profile_status
            for status_label in statuses
            for profile_status in APPLICATION_STATUS_TO_PROFILE_STATUSES.get(status_label, ())
        }
        allowed_update_request_statuses = {
            status_value
            for status_label in statuses
            for status_value, mapped_label in UPDATE_REQUEST_STATUS_TO_APPLICATION_STATUS.items()
            if mapped_label == status_label
        }
        if allowed_profile_statuses:
            profile_query = profile_query.filter(StudentProfile.profile_status.in_(sorted(allowed_profile_statuses)))
        else:
            profile_query = profile_query.filter(False)
    else:
        allowed_update_request_statuses = set(VISIBLE_UPDATE_REQUEST_STATUSES)

    profiles = profile_query.all()

    update_query = (
        db.query(StudentProfileUpdateRequest, StudentProfile)
        .join(StudentProfile, StudentProfile.user_id == StudentProfileUpdateRequest.student_user_id)
        .join(User, User.id == StudentProfileUpdateRequest.student_user_id)
        .filter(
            User.role == "student",
            User.is_active.is_(True),
            StudentProfileUpdateRequest.status.in_(VISIBLE_UPDATE_REQUEST_STATUSES),
        )
        .order_by(StudentProfileUpdateRequest.full_name.asc())
    )

    if search and search.strip():
        update_query = update_query.filter(StudentProfileUpdateRequest.full_name.ilike(f"{search.strip()}%"))

    if statuses:
        if allowed_update_request_statuses:
            update_query = update_query.filter(
                StudentProfileUpdateRequest.status.in_(sorted(allowed_update_request_statuses))
            )
        else:
            update_query = update_query.filter(False)

    update_requests = update_query.all()
    update_request_student_ids = {update_request.student_user_id for update_request, _ in update_requests}

    teacher_update_query = (
        db.query(TeacherProfileUpdateRequest, TeacherProfile)
        .join(TeacherProfile, TeacherProfile.user_id == TeacherProfileUpdateRequest.teacher_user_id)
        .join(User, User.id == TeacherProfileUpdateRequest.teacher_user_id)
        .filter(
            User.role == "teacher",
            TeacherProfileUpdateRequest.status.in_(VISIBLE_TEACHER_UPDATE_REQUEST_STATUSES),
        )
        .order_by(TeacherProfileUpdateRequest.full_name.asc())
    )

    if search and search.strip():
        teacher_update_query = teacher_update_query.filter(
            TeacherProfileUpdateRequest.full_name.ilike(f"{search.strip()}%")
        )

    if statuses:
        if allowed_update_request_statuses:
            teacher_update_query = teacher_update_query.filter(
                TeacherProfileUpdateRequest.status.in_(sorted(allowed_update_request_statuses))
            )
        else:
            teacher_update_query = teacher_update_query.filter(False)

    teacher_update_requests = teacher_update_query.all()

    items = [
            AdminApplicationListItem(
                id=profile.id,
                full_name=profile.full_name,
                status=map_application_status(profile.profile_status),
            request_kind=(
                REQUEST_KIND_SYSTEM_ASSIGNMENT_EVENT
                if profile.profile_status == "needs_assignment"
                else REQUEST_KIND_INITIAL_PROFILE
            ),
            request_kind_label=(
                "Системное событие"
                if profile.profile_status == "needs_assignment"
                else "Первичная заявка"
            ),
            current_teacher_user_id=profile.current_teacher_user_id,
            teacher_review_status=map_teacher_review_status(profile.teacher_review_status),
            can_assign_teacher=True,
        )
        for profile in profiles
        if profile.user_id not in update_request_student_ids
    ] + [
        AdminApplicationListItem(
            id=update_request.id,
            full_name=update_request.full_name or profile.full_name or "Без имени",
            status=map_update_request_status(update_request.status),
            request_kind=REQUEST_KIND_STUDENT_PROFILE_UPDATE,
            request_kind_label="Обновление профиля",
            current_teacher_user_id=profile.current_teacher_user_id,
            teacher_review_status=map_teacher_review_status(profile.teacher_review_status),
            can_assign_teacher=False,
        )
        for update_request, profile in update_requests
    ] + [
        AdminApplicationListItem(
            id=update_request.id,
            full_name=update_request.full_name or profile.full_name or "Без имени",
            status=map_update_request_status(update_request.status),
            request_kind=REQUEST_KIND_TEACHER_PROFILE_UPDATE,
            request_kind_label="Обновление профиля преподавателя",
            current_teacher_user_id=None,
            teacher_review_status=None,
            can_assign_teacher=False,
        )
        for update_request, profile in teacher_update_requests
    ]

    items.sort(key=lambda item: item.full_name.lower())

    return AdminApplicationsListResponse(items=items)


def _build_admin_application_detail(profile: StudentProfile) -> AdminApplicationDetailResponse:
    db = object_session(profile)
    current_teacher = None
    if db is not None and profile.current_teacher_user_id is not None:
        current_teacher = (
            db.query(TeacherProfile)
            .filter(TeacherProfile.user_id == profile.current_teacher_user_id)
            .first()
        )

    return AdminApplicationDetailResponse(
        id=profile.id,
        request_kind=(
            REQUEST_KIND_SYSTEM_ASSIGNMENT_EVENT
            if profile.profile_status == "needs_assignment"
            else REQUEST_KIND_INITIAL_PROFILE
        ),
        request_kind_label=(
            "Системное событие"
            if profile.profile_status == "needs_assignment"
            else "Первичная заявка"
        ),
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        quote=profile.quote,
        avatar_url=profile.avatar_url,
        status=map_application_status(profile.profile_status),
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
        current_teacher_user_id=profile.current_teacher_user_id,
        current_teacher_full_name=current_teacher.full_name if current_teacher is not None else None,
        current_teacher_subject_name=current_teacher.subject_name if current_teacher is not None else None,
        teacher_review_status=map_teacher_review_status(profile.teacher_review_status),
        can_edit_admin_fields=True,
        can_assign_teacher=True,
    )


def _build_admin_profile_update_detail(
    profile: StudentProfile,
    update_request: StudentProfileUpdateRequest,
) -> AdminApplicationDetailResponse:
    db = object_session(profile)
    current_teacher = None
    if db is not None and profile.current_teacher_user_id is not None:
        current_teacher = (
            db.query(TeacherProfile)
            .filter(TeacherProfile.user_id == profile.current_teacher_user_id)
            .first()
        )

    return AdminApplicationDetailResponse(
        id=update_request.id,
        request_kind=REQUEST_KIND_STUDENT_PROFILE_UPDATE,
        request_kind_label="Обновление профиля",
        full_name=update_request.full_name or profile.full_name,
        birth_date=update_request.birth_date,
        gender=update_request.gender,
        quote=update_request.quote,
        avatar_url=update_request.avatar_url,
        status=map_update_request_status(update_request.status),
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
        current_teacher_user_id=profile.current_teacher_user_id,
        current_teacher_full_name=current_teacher.full_name if current_teacher is not None else None,
        current_teacher_subject_name=current_teacher.subject_name if current_teacher is not None else None,
        teacher_review_status=map_teacher_review_status(profile.teacher_review_status),
        current_profile_full_name=profile.full_name,
        current_profile_birth_date=profile.birth_date,
        current_profile_gender=profile.gender,
        current_profile_quote=profile.quote,
        can_edit_admin_fields=False,
        can_assign_teacher=False,
    )


def _build_admin_teacher_profile_update_detail(
    profile: TeacherProfile,
    update_request: TeacherProfileUpdateRequest,
) -> AdminApplicationDetailResponse:
    return AdminApplicationDetailResponse(
        id=update_request.id,
        request_kind=REQUEST_KIND_TEACHER_PROFILE_UPDATE,
        request_kind_label="Обновление профиля преподавателя",
        full_name=update_request.full_name or profile.full_name,
        birth_date=update_request.birth_date,
        gender=update_request.gender,
        avatar_url=update_request.avatar_url,
        position=update_request.position,
        phone=update_request.phone,
        work_email=update_request.work_email,
        subject_name=update_request.subject_name,
        status=map_update_request_status(update_request.status),
        current_profile_full_name=profile.full_name,
        current_profile_birth_date=profile.birth_date,
        current_profile_gender=profile.gender,
        current_profile_position=profile.position,
        current_profile_phone=profile.phone,
        current_profile_work_email=profile.work_email,
        current_profile_subject_name=profile.subject_name,
        can_edit_admin_fields=False,
        can_assign_teacher=False,
    )


def _get_admin_application_or_404(db: Session, application_id) -> StudentProfile:
    profile = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            StudentProfile.id == application_id,
            User.role == "student",
            User.is_active.is_(True),
            StudentProfile.profile_status.in_(VISIBLE_APPLICATION_STATUSES),
        )
        .first()
    )

    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    return profile


def _get_student_profile_for_assignment_or_404(db: Session, application_id: UUID) -> StudentProfile:
    profile = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            StudentProfile.id == application_id,
            User.role == "student",
            User.is_active.is_(True),
        )
        .first()
    )

    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    return profile


def _get_profile_update_request_or_none(
    db: Session,
    application_id: UUID,
) -> tuple[StudentProfileUpdateRequest, StudentProfile] | None:
    update_request = (
        db.query(StudentProfileUpdateRequest)
        .join(StudentProfile, StudentProfile.user_id == StudentProfileUpdateRequest.student_user_id)
        .join(User, User.id == StudentProfileUpdateRequest.student_user_id)
        .filter(
            StudentProfileUpdateRequest.id == application_id,
            User.role == "student",
            User.is_active.is_(True),
        )
        .first()
    )
    if update_request is None:
        return None

    profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.user_id == update_request.student_user_id)
        .first()
    )
    if profile is None:
        return None

    return update_request, profile


def _get_teacher_profile_update_request_or_none(
    db: Session,
    application_id: UUID,
) -> tuple[TeacherProfileUpdateRequest, TeacherProfile] | None:
    update_request = (
        db.query(TeacherProfileUpdateRequest)
        .join(TeacherProfile, TeacherProfile.user_id == TeacherProfileUpdateRequest.teacher_user_id)
        .join(User, User.id == TeacherProfileUpdateRequest.teacher_user_id)
        .filter(
            TeacherProfileUpdateRequest.id == application_id,
            User.role == "teacher",
        )
        .first()
    )
    if update_request is None:
        return None

    profile = (
        db.query(TeacherProfile)
        .filter(TeacherProfile.user_id == update_request.teacher_user_id)
        .first()
    )
    if profile is None:
        return None

    return update_request, profile


def _is_student_profile_status_constraint_error(exc: IntegrityError) -> bool:
    orig = getattr(exc, "orig", None)
    diag = getattr(orig, "diag", None)
    constraint_name = getattr(diag, "constraint_name", None)

    if constraint_name == "ck_student_profiles_status":
        return True

    return "ck_student_profiles_status" in str(orig)


def _is_student_profile_complete_for_assignment(profile: StudentProfile) -> bool:
    required_string_fields = (
        profile.full_name,
        profile.gender,
        profile.grade_label,
    )

    if any(value is None or not value.strip() for value in required_string_fields):
        return False

    return profile.birth_date is not None and profile.enrollment_date is not None


def _has_teacher_rejected_student(
    db: Session,
    *,
    teacher_user_id: UUID,
    student_user_id: UUID,
) -> bool:
    return (
        db.query(TeacherStudentRejection)
        .filter(
            TeacherStudentRejection.teacher_user_id == teacher_user_id,
            TeacherStudentRejection.student_user_id == student_user_id,
        )
        .first()
        is not None
    )


def get_admin_application_detail(db: Session, *, application_id) -> AdminApplicationDetailResponse:
    teacher_update_request_entry = _get_teacher_profile_update_request_or_none(db, application_id)
    if teacher_update_request_entry is not None:
        update_request, profile = teacher_update_request_entry

        if update_request.status == "submitted":
            update_request.status = "in_review"
            db.commit()
            db.refresh(update_request)

        return _build_admin_teacher_profile_update_detail(profile, update_request)

    update_request_entry = _get_profile_update_request_or_none(db, application_id)
    if update_request_entry is not None:
        update_request, profile = update_request_entry

        if update_request.status == "submitted":
            update_request.status = "in_review"
            db.commit()
            db.refresh(update_request)

        return _build_admin_profile_update_detail(profile, update_request)

    profile = _get_admin_application_or_404(db, application_id)

    if profile.profile_status == "submitted":
        profile.profile_status = "in_review"
        try:
            db.commit()
            db.refresh(profile)
        except IntegrityError:
            db.rollback()
            profile = _get_admin_application_or_404(db, application_id)

    return _build_admin_application_detail(profile)


def update_admin_application(
    db: Session,
    *,
    application_id,
    payload: AdminApplicationUpdateRequest,
) -> AdminApplicationDetailResponse:
    teacher_update_request_entry = _get_teacher_profile_update_request_or_none(db, application_id)
    if teacher_update_request_entry is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile update request does not support admin fields editing",
        )

    update_request_entry = _get_profile_update_request_or_none(db, application_id)
    if update_request_entry is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile update request does not support admin fields editing",
        )

    profile = _get_admin_application_or_404(db, application_id)

    if payload.grade_label is not None:
        profile.grade_label = payload.grade_label.strip() or None
    if payload.enrollment_date is not None:
        profile.enrollment_date = payload.enrollment_date

    db.commit()
    db.refresh(profile)
    return _build_admin_application_detail(profile)


def request_admin_application_changes(
    db: Session,
    *,
    application_id,
) -> AdminApplicationDetailResponse:
    teacher_update_request_entry = _get_teacher_profile_update_request_or_none(db, application_id)
    if teacher_update_request_entry is not None:
        update_request, profile = teacher_update_request_entry

        if update_request.status not in REVIEWABLE_APPLICATION_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application cannot be sent for revision",
            )

        request_teacher_profile_update_changes(
            db,
            teacher_profile=profile,
            update_request=update_request,
        )
        db.refresh(update_request)
        return _build_admin_teacher_profile_update_detail(profile, update_request)

    update_request_entry = _get_profile_update_request_or_none(db, application_id)
    if update_request_entry is not None:
        update_request, profile = update_request_entry

        if update_request.status not in REVIEWABLE_APPLICATION_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application cannot be sent for revision",
            )

        request_student_profile_update_changes(
            db,
            student_profile=profile,
            update_request=update_request,
        )
        db.refresh(update_request)
        return _build_admin_profile_update_detail(profile, update_request)

    profile = _get_admin_application_or_404(db, application_id)

    if profile.profile_status not in REVIEWABLE_APPLICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be sent for revision")

    profile.profile_status = "needs_completion"
    create_notification(
        db,
        user_id=profile.user_id,
        role="student",
        type="student_revision_requested",
        title="Профиль отправлен на доработку",
        message="Администратор попросил обновить профиль и повторно отправить его на модерацию.",
        target_view="student_profile_edit",
        action_key="open_tab",
    )
    try:
        db.commit()
        db.refresh(profile)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Application status transition is not supported by the current database schema",
        ) from exc
    return _build_admin_application_detail(profile)


def approve_admin_application(
    db: Session,
    *,
    application_id,
) -> AdminApplicationDetailResponse:
    teacher_update_request_entry = _get_teacher_profile_update_request_or_none(db, application_id)
    if teacher_update_request_entry is not None:
        update_request, profile = teacher_update_request_entry

        if update_request.status not in REVIEWABLE_APPLICATION_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be approved")

        approve_teacher_profile_update_request(
            db,
            teacher_profile=profile,
            update_request=update_request,
        )
        db.refresh(profile)
        db.refresh(update_request)
        return _build_admin_teacher_profile_update_detail(profile, update_request)

    update_request_entry = _get_profile_update_request_or_none(db, application_id)
    if update_request_entry is not None:
        update_request, profile = update_request_entry

        if update_request.status not in REVIEWABLE_APPLICATION_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be approved")

        approve_student_profile_update_request(
            db,
            student_profile=profile,
            update_request=update_request,
        )
        db.refresh(profile)
        db.refresh(update_request)
        return _build_admin_profile_update_detail(profile, update_request)

    profile = _get_admin_application_or_404(db, application_id)

    if profile.profile_status not in REVIEWABLE_APPLICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be approved")

    profile.profile_status = "approved"
    profile.current_teacher_user_id = None
    profile.teacher_review_status = None
    create_notification(
        db,
        user_id=profile.user_id,
        role="student",
        type="student_profile_approved",
        title="Профиль подтверждён",
        message="Администратор подтвердил профиль. Ожидайте дальнейших действий в системе.",
        target_view="student_profile",
        action_key="open_tab",
    )
    try:
        db.commit()
        db.refresh(profile)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Application status transition is not supported by the current database schema",
        ) from exc
    return _build_admin_application_detail(profile)


def assign_teacher_to_application(
    db: Session,
    *,
    application_id: UUID,
    payload: AdminAssignTeacherRequest,
) -> AdminApplicationDetailResponse:
    profile = _get_student_profile_for_assignment_or_404(db, application_id)

    if not _is_student_profile_complete_for_assignment(profile):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student profile is incomplete",
        )

    if profile.profile_status == "needs_completion":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is in needs completion state",
        )

    teacher_profile = (
        db.query(TeacherProfile)
        .join(User, User.id == TeacherProfile.user_id)
        .filter(
            TeacherProfile.user_id == payload.teacher_user_id,
            User.role == "teacher",
        )
        .first()
    )

    if teacher_profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    existing_assignment = (
        db.query(TeacherStudent)
        .filter(TeacherStudent.student_user_id == profile.user_id)
        .first()
    )
    if existing_assignment is not None:
        if existing_assignment.teacher_user_id == payload.teacher_user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student is already assigned to this teacher",
            )

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student already assigned")

    if profile.profile_status not in ASSIGNABLE_APPLICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be assigned")

    student_count = (
        db.query(func.count(TeacherStudent.id))
        .filter(TeacherStudent.teacher_user_id == payload.teacher_user_id)
        .scalar()
        or 0
    )

    if student_count >= TEACHER_ASSIGNMENT_CAPACITY:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Teacher is at full capacity")

    if _has_teacher_rejected_student(
        db,
        teacher_user_id=payload.teacher_user_id,
        student_user_id=profile.user_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Teacher already rejected this student",
        )

    db.add(
        TeacherStudent(
            teacher_user_id=payload.teacher_user_id,
            student_user_id=profile.user_id,
        )
    )
    profile.profile_status = "approved"
    profile.current_teacher_user_id = payload.teacher_user_id
    profile.teacher_review_status = "pending"
    create_notification(
        db,
        user_id=profile.user_id,
        role="student",
        type="student_assigned_to_teacher",
        title="Вам назначен преподаватель",
        message=f"Администратор назначил преподавателя {teacher_profile.full_name}.",
        target_view="student_profile",
        action_key="open_tab",
    )
    create_notification(
        db,
        user_id=teacher_profile.user_id,
        role="teacher",
        type="teacher_new_student_assigned",
        title="Назначен новый ученик",
        message=f"Администратор назначил вам ученика {profile.full_name}.",
        target_view="teacher_incoming_students",
        action_key="open_detail",
        target_id=profile.user_id,
    )

    try:
        db.commit()
        db.refresh(profile)
    except IntegrityError as exc:
        db.rollback()
        detail = "Student already assigned"
        if _is_student_profile_status_constraint_error(exc):
            detail = "Application status transition is not supported by the current database schema"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        ) from exc

    return _build_admin_application_detail(profile)
