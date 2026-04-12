from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from sqlalchemy.orm import Session, object_session
from uuid import UUID

from app.models.student_profile import StudentProfile
from app.models.teacher_profile import TeacherProfile
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


PROFILE_STATUS_TO_APPLICATION_STATUS = {
    "submitted": "Новая",
    "in_review": "На рассмотрении",
    "needs_completion": "На доработке",
    "approved": "Подтверждена",
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
    "Принята преподавателем": ("teacher_accepted",),
    "Отклонена преподавателем": ("teacher_rejected",),
}

VISIBLE_APPLICATION_STATUSES = (
    "submitted",
    "in_review",
    "needs_completion",
    "approved",
    "teacher_accepted",
    "teacher_rejected",
)
REVIEWABLE_APPLICATION_STATUSES = {"submitted", "in_review"}
ASSIGNABLE_APPLICATION_STATUSES = {"submitted", "in_review", "teacher_rejected"}
TEACHER_ASSIGNMENT_CAPACITY = 15
TEACHER_REVIEW_STATUS_LABELS = {
    "pending": "Ожидает решения преподавателя",
    "accepted": "Принята преподавателем",
    "rejected": "Отклонена преподавателем",
}


def map_application_status(profile_status: str) -> str:
    return PROFILE_STATUS_TO_APPLICATION_STATUS.get(profile_status, "На рассмотрении")


def map_teacher_review_status(review_status: str | None) -> str | None:
    if review_status is None:
        return None

    return TEACHER_REVIEW_STATUS_LABELS.get(review_status, review_status)


def get_admin_application_status_filters() -> AdminApplicationsFiltersResponse:
    return AdminApplicationsFiltersResponse(
        statuses=[
            AdminApplicationStatusFilterOption(value=status_label, label=status_label)
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
        .filter(User.role == "teacher")
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
    query = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            User.role == "student",
            StudentProfile.full_name.isnot(None),
            func.length(func.trim(StudentProfile.full_name)) > 0,
            StudentProfile.profile_status.in_(VISIBLE_APPLICATION_STATUSES),
        )
        .order_by(StudentProfile.full_name.asc())
    )

    if search and search.strip():
        query = query.filter(_build_surname_prefix_search_filter(search))

    if statuses:
        allowed_profile_statuses = sorted(
            {
                profile_status
                for status_label in statuses
                for profile_status in APPLICATION_STATUS_TO_PROFILE_STATUSES.get(status_label, ())
            }
        )
        if allowed_profile_statuses:
            query = query.filter(StudentProfile.profile_status.in_(allowed_profile_statuses))
        else:
            return AdminApplicationsListResponse(items=[])

    profiles = query.all()

    return AdminApplicationsListResponse(
        items=[
            AdminApplicationListItem(
                id=profile.id,
                full_name=profile.full_name,
                status=map_application_status(profile.profile_status),
            )
            for profile in profiles
        ]
    )


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
    )


def _get_admin_application_or_404(db: Session, application_id) -> StudentProfile:
    profile = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            StudentProfile.id == application_id,
            User.role == "student",
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
        )
        .first()
    )

    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    return profile


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
    profile = _get_admin_application_or_404(db, application_id)

    if profile.profile_status not in REVIEWABLE_APPLICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be sent for revision")

    profile.profile_status = "needs_completion"
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
    profile = _get_admin_application_or_404(db, application_id)

    if profile.profile_status not in REVIEWABLE_APPLICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be approved")

    profile.profile_status = "approved"
    profile.current_teacher_user_id = None
    profile.teacher_review_status = None
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
