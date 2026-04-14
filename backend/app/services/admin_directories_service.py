from typing import Literal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.teacher_profile import TeacherProfile
from app.models.user import User
from app.schemas.admin_directories import (
    AdminStudentDetailResponse,
    AdminStudentListItem,
    AdminStudentsListResponse,
    AdminStudentsSort,
    AdminTeacherDetailResponse,
    AdminTeacherListItem,
    AdminTeachersListResponse,
    AdminTeachersSort,
)


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
        db.query(TeacherProfile)
        .join(User, User.id == TeacherProfile.user_id)
        .filter(
            User.role == "teacher",
            TeacherProfile.full_name.isnot(None),
        )
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
                id=item.user_id,
                full_name=item.full_name,
                subject_name=item.subject_name,
                work_email=item.work_email,
                avatar_url=item.avatar_url,
            )
            for item in items
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
        db.query(TeacherProfile)
        .join(User, User.id == TeacherProfile.user_id)
        .filter(
            User.role == "teacher",
            TeacherProfile.user_id == teacher_id,
        )
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    return AdminTeacherDetailResponse(
        id=profile.user_id,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        position=profile.position,
        phone=profile.phone,
        work_email=profile.work_email,
        subject_name=profile.subject_name,
        avatar_url=profile.avatar_url,
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
