from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_teacher, get_db
from app.models.user import User
from app.schemas.teacher_students import TeacherStudentDetail, TeacherStudentListItem
from app.services.teacher_students_service import get_teacher_student, list_teacher_students

router = APIRouter(prefix="/teacher", tags=["Teacher"])


@router.get("/students", response_model=list[TeacherStudentListItem])
def read_teacher_students(
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return list_teacher_students(db, current_teacher.id)


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
