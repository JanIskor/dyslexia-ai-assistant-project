from uuid import UUID

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_teacher, get_db
from app.models.user import User
from app.schemas.teacher_incoming_students import (
    TeacherIncomingStudentDetail,
    TeacherIncomingStudentsListResponse,
)
from app.schemas.teacher_students import TeacherStudentDetail, TeacherStudentsListResponse
from app.services.teacher_incoming_students_service import (
    accept_teacher_incoming_student,
    get_teacher_incoming_student,
    list_teacher_incoming_students,
    reject_teacher_incoming_student,
)
from app.services.teacher_students_service import get_teacher_student, list_teacher_students

router = APIRouter(prefix="/teacher", tags=["Teacher"])


@router.get("/students", response_model=TeacherStudentsListResponse)
def read_teacher_students(
    search: str | None = Query(default=None),
    sort_by: Literal["full_name", "grade_label"] = Query(default="full_name"),
    sort_order: Literal["asc", "desc"] = Query(default="asc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=9, ge=1),
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return list_teacher_students(
        db,
        current_teacher.id,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/students/{student_id}", response_model=TeacherStudentDetail)
def read_teacher_student(
    student_id: UUID,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    student = get_teacher_student(db, current_teacher.id, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.get("/incoming-students", response_model=TeacherIncomingStudentsListResponse)
def read_teacher_incoming_students(
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return list_teacher_incoming_students(db, current_teacher.id)


@router.get("/incoming-students/{student_id}", response_model=TeacherIncomingStudentDetail)
def read_teacher_incoming_student(
    student_id: UUID,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    student = get_teacher_incoming_student(db, current_teacher.id, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Incoming student not found")
    return student


@router.post("/incoming-students/{student_id}/accept", response_model=TeacherIncomingStudentDetail)
def accept_teacher_incoming_student_endpoint(
    student_id: UUID,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return accept_teacher_incoming_student(
        db,
        teacher_user_id=current_teacher.id,
        student_user_id=student_id,
    )


@router.post("/incoming-students/{student_id}/reject", response_model=TeacherIncomingStudentDetail)
def reject_teacher_incoming_student_endpoint(
    student_id: UUID,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return reject_teacher_incoming_student(
        db,
        teacher_user_id=current_teacher.id,
        student_user_id=student_id,
    )
