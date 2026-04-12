from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.teacher_student import TeacherStudent
from app.models.teacher_student_rejection import TeacherStudentRejection
from app.schemas.teacher_incoming_students import (
    TeacherIncomingStudentDetail,
    TeacherIncomingStudentListItem,
    TeacherIncomingStudentsListResponse,
)
from app.services.notifications_service import create_notification, create_notifications_for_role


INCOMING_STUDENT_STATUS = "approved"
ACCEPTED_STUDENT_STATUS = "teacher_accepted"
REJECTED_STUDENT_STATUS = "teacher_rejected"


def list_teacher_incoming_students(
    db: Session,
    teacher_user_id: UUID,
) -> TeacherIncomingStudentsListResponse:
    profiles = (
        db.query(StudentProfile)
        .join(TeacherStudent, TeacherStudent.student_user_id == StudentProfile.user_id)
        .filter(
            TeacherStudent.teacher_user_id == teacher_user_id,
            StudentProfile.profile_status == INCOMING_STUDENT_STATUS,
        )
        .order_by(StudentProfile.full_name.asc())
        .all()
    )

    return TeacherIncomingStudentsListResponse(
        items=[
            TeacherIncomingStudentListItem(
                id=profile.user_id,
                full_name=profile.full_name,
                grade_label=profile.grade_label,
                birth_date=profile.birth_date,
                gender=profile.gender,
                enrollment_date=profile.enrollment_date,
                avatar_url=profile.avatar_url,
            )
            for profile in profiles
        ]
    )


def _get_teacher_incoming_student_profile(
    db: Session,
    *,
    teacher_user_id: UUID,
    student_user_id: UUID,
) -> StudentProfile | None:
    return (
        db.query(StudentProfile)
        .join(TeacherStudent, TeacherStudent.student_user_id == StudentProfile.user_id)
        .filter(
            TeacherStudent.teacher_user_id == teacher_user_id,
            StudentProfile.user_id == student_user_id,
            StudentProfile.profile_status == INCOMING_STUDENT_STATUS,
        )
        .first()
    )


def get_teacher_incoming_student(
    db: Session,
    teacher_user_id: UUID,
    student_user_id: UUID,
) -> TeacherIncomingStudentDetail | None:
    profile = _get_teacher_incoming_student_profile(
        db,
        teacher_user_id=teacher_user_id,
        student_user_id=student_user_id,
    )
    if profile is None:
        return None

    return TeacherIncomingStudentDetail(
        id=profile.user_id,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
        quote=profile.quote,
        avatar_url=profile.avatar_url,
    )


def accept_teacher_incoming_student(
    db: Session,
    *,
    teacher_user_id: UUID,
    student_user_id: UUID,
) -> TeacherIncomingStudentDetail:
    profile = _get_teacher_incoming_student_profile(
        db,
        teacher_user_id=teacher_user_id,
        student_user_id=student_user_id,
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incoming student not found")

    profile.profile_status = ACCEPTED_STUDENT_STATUS
    profile.teacher_review_status = "accepted"
    create_notifications_for_role(
        db,
        role="admin",
        type="teacher_accepted_student",
        title="Преподаватель принял ученика",
        message=f"Преподаватель принял ученика {profile.full_name}.",
        target_view="admin_applications",
        action_key="open_detail",
        target_id=profile.id,
    )
    db.commit()
    db.refresh(profile)

    return TeacherIncomingStudentDetail(
        id=profile.user_id,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
        quote=profile.quote,
        avatar_url=profile.avatar_url,
    )


def reject_teacher_incoming_student(
    db: Session,
    *,
    teacher_user_id: UUID,
    student_user_id: UUID,
) -> TeacherIncomingStudentDetail:
    profile = _get_teacher_incoming_student_profile(
        db,
        teacher_user_id=teacher_user_id,
        student_user_id=student_user_id,
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incoming student not found")

    assignment = (
        db.query(TeacherStudent)
        .filter(
            TeacherStudent.teacher_user_id == teacher_user_id,
            TeacherStudent.student_user_id == student_user_id,
        )
        .first()
    )
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incoming student not found")

    profile.profile_status = REJECTED_STUDENT_STATUS
    profile.teacher_review_status = "rejected"
    db.add(
        TeacherStudentRejection(
            teacher_user_id=teacher_user_id,
            student_user_id=student_user_id,
        )
    )
    create_notifications_for_role(
        db,
        role="admin",
        type="teacher_rejected_student",
        title="Преподаватель отклонил ученика",
        message=f"Преподаватель отклонил ученика {profile.full_name}.",
        target_view="admin_applications",
        action_key="open_detail",
        target_id=profile.id,
    )
    create_notification(
        db,
        user_id=profile.user_id,
        role="student",
        type="teacher_rejected_student",
        title="Преподаватель отклонил назначение",
        message="Назначенный преподаватель отклонил сопровождение. Администратор подберёт другого преподавателя.",
        target_view="student_profile",
        action_key="open_tab",
    )
    db.delete(assignment)
    db.commit()
    db.refresh(profile)

    return TeacherIncomingStudentDetail(
        id=profile.user_id,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
        quote=profile.quote,
        avatar_url=profile.avatar_url,
    )
