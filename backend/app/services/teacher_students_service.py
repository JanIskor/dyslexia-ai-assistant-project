from typing import Literal
from uuid import UUID

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.teacher_student import TeacherStudent
from app.schemas.teacher_students import (
    TeacherStudentDetail,
    TeacherStudentListItem,
    TeacherStudentsListResponse,
)


TeacherStudentsSortBy = Literal["full_name", "grade_label"]
TeacherStudentsSortOrder = Literal["asc", "desc"]


def _build_surname_search_filter(search: str):
    surname_expression = func.split_part(StudentProfile.full_name, " ", 1)
    return surname_expression.ilike(f"{search.strip()}%")


def _build_grade_sort_expressions(sort_order: TeacherStudentsSortOrder):
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

    if sort_order == "desc":
        return (
            grade_number_expression.desc(),
            grade_letter_expression.desc(),
            StudentProfile.full_name.desc(),
        )

    return (
        grade_number_expression.asc(),
        grade_letter_expression.asc(),
        StudentProfile.full_name.asc(),
    )


def _build_full_name_sort_expression(sort_order: TeacherStudentsSortOrder):
    if sort_order == "desc":
        return StudentProfile.full_name.desc()

    return StudentProfile.full_name.asc()


def list_teacher_students(
    db: Session,
    teacher_user_id: UUID,
    *,
    search: str | None = None,
    sort_by: TeacherStudentsSortBy = "full_name",
    sort_order: TeacherStudentsSortOrder = "asc",
    page: int = 1,
    page_size: int = 9,
) -> TeacherStudentsListResponse:
    query = (
        db.query(StudentProfile)
        .join(TeacherStudent, TeacherStudent.student_user_id == StudentProfile.user_id)
        .filter(TeacherStudent.teacher_user_id == teacher_user_id)
    )

    if search and search.strip():
        query = query.filter(_build_surname_search_filter(search))

    if sort_by == "grade_label":
        query = query.order_by(*_build_grade_sort_expressions(sort_order))
    else:
        query = query.order_by(_build_full_name_sort_expression(sort_order))

    total = query.count()
    pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    profiles = query.offset(offset).limit(page_size).all()

    return TeacherStudentsListResponse(
        items=[
            TeacherStudentListItem(
                id=profile.user_id,
                full_name=profile.full_name,
                grade_label=profile.grade_label,
                avatar_url=profile.avatar_url,
            )
            for profile in profiles
        ],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def get_teacher_student(
    db: Session, teacher_user_id: UUID, student_user_id: UUID
) -> TeacherStudentDetail | None:
    profile = (
        db.query(StudentProfile)
        .join(TeacherStudent, TeacherStudent.student_user_id == StudentProfile.user_id)
        .filter(
            TeacherStudent.teacher_user_id == teacher_user_id,
            StudentProfile.user_id == student_user_id,
        )
        .first()
    )

    if profile is None:
        return None

    return TeacherStudentDetail(
        id=profile.user_id,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
        quote=profile.quote,
        avatar_url=profile.avatar_url,
    )
