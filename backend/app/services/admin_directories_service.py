from datetime import date, datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.models.teacher_student import TeacherStudent
from app.models.student_profile import StudentProfile
from app.models.student_teacher_removal_request import StudentTeacherRemovalRequest
from app.models.teacher_profile import TeacherProfile
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.schemas.admin_directories import (
    AdminTeacherCreateRequest,
    AdminTeacherDeleteResponse,
    AdminStudentDetailResponse,
    AdminStudentListItem,
    AdminUnassignedStudentListItem,
    AdminUnassignedStudentsListResponse,
    AdminStudentsListResponse,
    AdminStudentsSort,
    AdminTeacherDetailResponse,
    AdminTeacherListItem,
    AdminTeachersListResponse,
    AdminTeachersSort,
)
from app.services.auth_service import create_user, get_user_by_email, normalize_email
from app.services.admin_applications_service import ASSIGNABLE_APPLICATION_STATUSES, TEACHER_ASSIGNMENT_CAPACITY


DEFAULT_TEACHER_BIRTH_DATE = date(1970, 1, 1)
DEFAULT_TEACHER_GENDER = "Не указан"
DEFAULT_TEACHER_POSITION = "Преподаватель"
DEFAULT_TEACHER_PHONE = "Не указан"
DEFAULT_TEACHER_SUBJECT = "Не указан"


def _build_teacher_surname_search_filter(search: str):
    surname_expression = func.split_part(TeacherProfile.full_name, " ", 1)
    return surname_expression.ilike(f"{search.strip()}%")


def _build_student_surname_search_filter(search: str):
    surname_expression = func.split_part(StudentProfile.full_name, " ", 1)
    return surname_expression.ilike(f"{search.strip()}%")


def _build_teacher_surname_sort_expressions(sort: AdminTeachersSort):
    surname_expression = func.lower(func.split_part(TeacherProfile.full_name, " ", 1))

    if sort == "surname_desc":
        return (
            surname_expression.desc(),
            TeacherProfile.full_name.desc(),
        )

    return (
        surname_expression.asc(),
        TeacherProfile.full_name.asc(),
    )


def _build_student_surname_sort_expressions(sort: Literal["surname_asc", "surname_desc"]):
    surname_expression = func.lower(func.split_part(StudentProfile.full_name, " ", 1))

    if sort == "surname_desc":
        return (
            surname_expression.desc(),
            StudentProfile.full_name.desc(),
        )

    return (
        surname_expression.asc(),
        StudentProfile.full_name.asc(),
    )


def _build_student_grade_sort_expressions(sort: Literal["grade_asc", "grade_desc"]):
    grade_number_expression = cast(
        func.nullif(func.substring(StudentProfile.grade_label, r"^\s*(\d+)"), ""),
        Integer,
    )
    grade_letter_expression = func.lower(
        func.coalesce(
            func.substring(StudentProfile.grade_label, r"^\s*\d+\s*([A-Za-zА-Яа-яЁё])"),
            "",
        )
    )

    if sort == "grade_desc":
        return (
            grade_number_expression.desc().nullslast(),
            grade_letter_expression.desc(),
            StudentProfile.full_name.asc(),
        )

    return (
        grade_number_expression.asc().nullslast(),
        grade_letter_expression.asc(),
        StudentProfile.full_name.asc(),
    )


def list_admin_teachers(
    db: Session,
    *,
    search: str | None = None,
    sort: AdminTeachersSort = "surname_asc",
    page: int = 1,
    page_size: int = 10,
) -> AdminTeachersListResponse:
    query = (
        db.query(
            TeacherProfile,
            func.count(TeacherStudent.id).label("current_students_count"),
        )
        .join(User, User.id == TeacherProfile.user_id)
        .outerjoin(TeacherStudent, TeacherStudent.teacher_user_id == TeacherProfile.user_id)
        .filter(
            User.role == "teacher",
            User.is_active.is_(True),
            TeacherProfile.full_name.isnot(None),
        )
        .group_by(TeacherProfile.id)
    )

    if search and search.strip():
        query = query.filter(_build_teacher_surname_search_filter(search))

    query = query.order_by(*_build_teacher_surname_sort_expressions(sort))

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return AdminTeachersListResponse(
        items=[
            AdminTeacherListItem(
                id=profile.user_id,
                full_name=profile.full_name,
                subject_name=profile.subject_name,
                work_email=profile.work_email,
                avatar_url=profile.avatar_url,
                current_students_count=current_students_count,
                capacity_limit=TEACHER_ASSIGNMENT_CAPACITY,
                available_slots=max(0, TEACHER_ASSIGNMENT_CAPACITY - current_students_count),
            )
            for profile, current_students_count in items
        ],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


def get_admin_teacher_detail(
    db: Session,
    *,
    teacher_id: UUID,
) -> AdminTeacherDetailResponse:
    profile = (
        db.query(
            TeacherProfile,
            func.count(TeacherStudent.id).label("current_students_count"),
        )
        .join(User, User.id == TeacherProfile.user_id)
        .outerjoin(TeacherStudent, TeacherStudent.teacher_user_id == TeacherProfile.user_id)
        .filter(
            User.role == "teacher",
            User.is_active.is_(True),
            TeacherProfile.user_id == teacher_id,
        )
        .group_by(TeacherProfile.id)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    teacher_profile, current_students_count = profile

    return AdminTeacherDetailResponse(
        id=teacher_profile.user_id,
        full_name=teacher_profile.full_name,
        birth_date=teacher_profile.birth_date,
        gender=teacher_profile.gender,
        position=teacher_profile.position,
        phone=teacher_profile.phone,
        work_email=teacher_profile.work_email,
        subject_name=teacher_profile.subject_name,
        avatar_url=teacher_profile.avatar_url,
        current_students_count=current_students_count,
        capacity_limit=TEACHER_ASSIGNMENT_CAPACITY,
    )


def list_admin_students(
    db: Session,
    *,
    search: str | None = None,
    sort: AdminStudentsSort = "surname_asc",
    page: int = 1,
    page_size: int = 10,
) -> AdminStudentsListResponse:
    query = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            User.role == "student",
            StudentProfile.full_name.isnot(None),
            func.length(func.trim(StudentProfile.full_name)) > 0,
        )
    )

    if search and search.strip():
        query = query.filter(_build_student_surname_search_filter(search))

    if sort in {"grade_asc", "grade_desc"}:
        query = query.order_by(*_build_student_grade_sort_expressions(sort))
    else:
        query = query.order_by(*_build_student_surname_sort_expressions(sort))

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return AdminStudentsListResponse(
        items=[
            AdminStudentListItem(
                id=item.user_id,
                full_name=item.full_name,
                grade_label=item.grade_label,
                avatar_url=item.avatar_url,
            )
            for item in items
        ],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


def get_admin_student_detail(
    db: Session,
    *,
    student_id: UUID,
) -> AdminStudentDetailResponse:
    profile = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            User.role == "student",
            StudentProfile.user_id == student_id,
        )
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    return AdminStudentDetailResponse(
        id=profile.user_id,
        full_name=profile.full_name or "Без имени",
        birth_date=profile.birth_date,
        gender=profile.gender,
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
        quote=profile.quote,
        avatar_url=profile.avatar_url,
    )


def create_admin_teacher(
    db: Session,
    *,
    payload: AdminTeacherCreateRequest,
) -> AdminTeacherListItem:
    existing_user = get_user_by_email(db, payload.email)
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    teacher_user = create_user(
        db,
        RegisterRequest(
            email=normalize_email(payload.email),
            password=payload.password,
        ),
    )

    user = db.query(User).filter(User.id == teacher_user.id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Teacher creation failed")

    user.role = "teacher"
    full_name = f"{payload.last_name.strip()} {payload.first_name.strip()}".strip()
    work_email = str(payload.work_email).strip() if payload.work_email is not None else normalize_email(payload.email)
    profile = TeacherProfile(
        user_id=user.id,
        full_name=full_name,
        birth_date=payload.birth_date or DEFAULT_TEACHER_BIRTH_DATE,
        gender=(payload.gender or DEFAULT_TEACHER_GENDER).strip(),
        position=(payload.position or DEFAULT_TEACHER_POSITION).strip(),
        phone=(payload.phone or DEFAULT_TEACHER_PHONE).strip(),
        work_email=work_email,
        subject_name=(payload.subject_name or DEFAULT_TEACHER_SUBJECT).strip(),
        avatar_url=None,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return AdminTeacherListItem(
        id=profile.user_id,
        full_name=profile.full_name,
        subject_name=profile.subject_name,
        work_email=profile.work_email,
        avatar_url=profile.avatar_url,
        current_students_count=0,
        capacity_limit=TEACHER_ASSIGNMENT_CAPACITY,
        available_slots=TEACHER_ASSIGNMENT_CAPACITY,
    )


def delete_admin_teacher(
    db: Session,
    *,
    teacher_user_id: UUID,
) -> AdminTeacherDeleteResponse:
    user = (
        db.query(User)
        .filter(
            User.id == teacher_user_id,
            User.role == "teacher",
            User.is_active.is_(True),
        )
        .first()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    teacher_profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == teacher_user_id).first()
    if teacher_profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    assignments = (
        db.query(TeacherStudent)
        .filter(TeacherStudent.teacher_user_id == teacher_user_id)
        .all()
    )
    released_student_ids = {assignment.student_user_id for assignment in assignments}
    released_students_count = len(released_student_ids)

    if released_student_ids:
        student_profiles = (
            db.query(StudentProfile)
            .filter(StudentProfile.user_id.in_(released_student_ids))
            .all()
        )
        for student_profile in student_profiles:
            student_profile.profile_status = "approved"
            student_profile.current_teacher_user_id = None
            student_profile.teacher_review_status = None

    for assignment in assignments:
        db.delete(assignment)

    pending_removal_requests = (
        db.query(StudentTeacherRemovalRequest)
        .filter(
            StudentTeacherRemovalRequest.teacher_user_id == teacher_user_id,
            StudentTeacherRemovalRequest.status == "pending",
        )
        .all()
    )
    resolved_at = datetime.now(timezone.utc)
    for request in pending_removal_requests:
        request.status = "approved"
        request.admin_comment = "Автоматически закрыто при удалении преподавателя."
        request.resolved_at = resolved_at
        request.resolved_by_admin_user_id = None

    user.is_active = False
    db.commit()

    return AdminTeacherDeleteResponse(
        detail="Teacher deleted",
        teacher_user_id=teacher_user_id,
        released_students_count=released_students_count,
    )


def list_admin_unassigned_students(
    db: Session,
) -> AdminUnassignedStudentsListResponse:
    rows = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .outerjoin(TeacherStudent, TeacherStudent.student_user_id == StudentProfile.user_id)
        .filter(
            User.role == "student",
            StudentProfile.full_name.isnot(None),
            func.length(func.trim(StudentProfile.full_name)) > 0,
            TeacherStudent.id.is_(None),
            StudentProfile.profile_status.in_(ASSIGNABLE_APPLICATION_STATUSES),
        )
        .order_by(StudentProfile.full_name.asc())
        .all()
    )

    return AdminUnassignedStudentsListResponse(
        items=[
            AdminUnassignedStudentListItem(
                application_id=row.id,
                user_id=row.user_id,
                full_name=row.full_name,
                grade_label=row.grade_label,
                avatar_url=row.avatar_url,
                profile_status=row.profile_status,
            )
            for row in rows
        ]
    )
