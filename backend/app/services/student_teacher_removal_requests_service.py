from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.student_teacher_removal_request import StudentTeacherRemovalRequest
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_student import TeacherStudent
from app.schemas.student_teacher_removal_requests import (
    AdminStudentRemovalRequestUpdateRequest,
    StudentTeacherRemovalRequestItem,
    StudentTeacherRemovalRequestStudentInfo,
    StudentTeacherRemovalRequestTeacherInfo,
    StudentTeacherRemovalRequestsListResponse,
    TeacherStudentRemovalRequestCreateRequest,
)
from app.services.notifications_service import create_notification, create_notifications_for_role


ACTIVE_TEACHER_STUDENT_STATUS = "teacher_accepted"


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def _get_active_teacher_student_profile(
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
            StudentProfile.profile_status == ACTIVE_TEACHER_STUDENT_STATUS,
        )
        .first()
    )


def _build_removal_request_item(
    request: StudentTeacherRemovalRequest,
    *,
    teacher_full_name: str,
    student_full_name: str,
    student_grade_label: str | None,
) -> StudentTeacherRemovalRequestItem:
    return StudentTeacherRemovalRequestItem(
        id=request.id,
        teacher=StudentTeacherRemovalRequestTeacherInfo(
            user_id=request.teacher_user_id,
            full_name=teacher_full_name,
        ),
        student=StudentTeacherRemovalRequestStudentInfo(
            user_id=request.student_user_id,
            full_name=student_full_name,
            grade_label=student_grade_label,
        ),
        status=request.status,
        reason=request.reason,
        admin_comment=request.admin_comment,
        created_at=request.created_at,
        resolved_at=request.resolved_at,
        resolved_by_admin_user_id=request.resolved_by_admin_user_id,
    )


def create_teacher_student_removal_request(
    db: Session,
    *,
    teacher_user_id: UUID,
    payload: TeacherStudentRemovalRequestCreateRequest,
    student_user_id: UUID,
) -> StudentTeacherRemovalRequestItem:
    profile = _get_active_teacher_student_profile(
        db,
        teacher_user_id=teacher_user_id,
        student_user_id=student_user_id,
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher student not found")

    existing_pending_request = (
        db.query(StudentTeacherRemovalRequest)
        .filter(
            StudentTeacherRemovalRequest.teacher_user_id == teacher_user_id,
            StudentTeacherRemovalRequest.student_user_id == student_user_id,
            StudentTeacherRemovalRequest.status == "pending",
        )
        .first()
    )
    if existing_pending_request is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Removal request already exists",
        )

    teacher_profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == teacher_user_id).first()
    teacher_full_name = teacher_profile.full_name if teacher_profile is not None else "Преподаватель"

    request = StudentTeacherRemovalRequest(
        teacher_user_id=teacher_user_id,
        student_user_id=student_user_id,
        status="pending",
        reason=_normalize_optional_text(payload.reason),
    )
    db.add(request)
    create_notifications_for_role(
        db,
        role="admin",
        type="student_removal_request_created",
        title="Запрос на открепление ученика",
        message=f"Преподаватель {teacher_full_name} запросил открепление ученика {profile.full_name}.",
        target_view="admin_student_removal_requests",
        action_key="open_tab",
        target_id=request.id,
    )
    db.commit()
    db.refresh(request)

    return _build_removal_request_item(
        request,
        teacher_full_name=teacher_full_name,
        student_full_name=profile.full_name,
        student_grade_label=profile.grade_label,
    )


def list_admin_student_removal_requests(
    db: Session,
) -> StudentTeacherRemovalRequestsListResponse:
    rows = (
        db.query(
            StudentTeacherRemovalRequest,
            TeacherProfile.full_name.label("teacher_full_name"),
            StudentProfile.full_name.label("student_full_name"),
            StudentProfile.grade_label.label("student_grade_label"),
        )
        .join(TeacherProfile, TeacherProfile.user_id == StudentTeacherRemovalRequest.teacher_user_id)
        .join(StudentProfile, StudentProfile.user_id == StudentTeacherRemovalRequest.student_user_id)
        .order_by(
            StudentTeacherRemovalRequest.created_at.desc(),
            StudentTeacherRemovalRequest.id.desc(),
        )
        .all()
    )

    return StudentTeacherRemovalRequestsListResponse(
        items=[
            _build_removal_request_item(
                request,
                teacher_full_name=teacher_full_name,
                student_full_name=student_full_name,
                student_grade_label=student_grade_label,
            )
            for request, teacher_full_name, student_full_name, student_grade_label in rows
        ]
    )


def resolve_admin_student_removal_request(
    db: Session,
    *,
    admin_user_id: UUID,
    request_id: UUID,
    payload: AdminStudentRemovalRequestUpdateRequest,
) -> StudentTeacherRemovalRequestItem:
    request = db.query(StudentTeacherRemovalRequest).filter(StudentTeacherRemovalRequest.id == request_id).first()
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Removal request not found")

    teacher_profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == request.teacher_user_id).first()
    student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == request.student_user_id).first()
    if teacher_profile is None or student_profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Removal request not found")

    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Removal request already resolved",
        )

    admin_comment = _normalize_optional_text(payload.admin_comment)

    if payload.action == "approve":
        assignment = (
            db.query(TeacherStudent)
            .filter(
                TeacherStudent.teacher_user_id == request.teacher_user_id,
                TeacherStudent.student_user_id == request.student_user_id,
            )
            .first()
        )
        if assignment is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teacher student relation not found",
            )

        db.delete(assignment)
        student_profile.profile_status = "approved"
        student_profile.current_teacher_user_id = None
        student_profile.teacher_review_status = None
        request.status = "approved"
        request.admin_comment = admin_comment
        request.resolved_at = datetime.now(timezone.utc)
        request.resolved_by_admin_user_id = admin_user_id
        create_notification(
            db,
            user_id=request.teacher_user_id,
            role="teacher",
            type="student_removal_request_approved",
            title="Открепление ученика подтверждено",
            message=(
                f"Администратор подтвердил открепление ученика {student_profile.full_name}."
                + (f" Комментарий: {admin_comment}" if admin_comment else "")
            ),
            target_view="teacher_students",
            action_key="open_tab",
            target_id=request.student_user_id,
        )
    else:
        request.status = "rejected"
        request.admin_comment = admin_comment
        request.resolved_at = datetime.now(timezone.utc)
        request.resolved_by_admin_user_id = admin_user_id
        create_notification(
            db,
            user_id=request.teacher_user_id,
            role="teacher",
            type="student_removal_request_rejected",
            title="Открепление ученика отклонено",
            message=(
                f"Администратор отклонил открепление ученика {student_profile.full_name}."
                + (f" Комментарий: {admin_comment}" if admin_comment else "")
            ),
            target_view="teacher_students",
            action_key="open_tab",
            target_id=request.student_user_id,
        )

    db.commit()
    db.refresh(request)
    db.refresh(student_profile)

    return _build_removal_request_item(
        request,
        teacher_full_name=teacher_profile.full_name,
        student_full_name=student_profile.full_name,
        student_grade_label=student_profile.grade_label,
    )
