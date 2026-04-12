from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.teacher_student import TeacherStudent
from app.models.teacher_student_message import TeacherStudentMessage
from app.schemas.teacher_student_messages import (
    TeacherStudentMessageCreateRequest,
    TeacherStudentMessageItem,
    TeacherStudentMessagesListResponse,
)
from app.services.notifications_service import create_notification


def _build_message_item(message: TeacherStudentMessage) -> TeacherStudentMessageItem:
    return TeacherStudentMessageItem(
        id=message.id,
        teacher_user_id=message.teacher_user_id,
        student_user_id=message.student_user_id,
        title=message.title,
        body=message.body,
        is_read_by_student=message.is_read_by_student,
        created_at=message.created_at,
    )


def create_teacher_student_message(
    db: Session,
    *,
    teacher_user_id: UUID,
    student_user_id: UUID,
    payload: TeacherStudentMessageCreateRequest,
) -> TeacherStudentMessageItem:
    link = (
        db.query(TeacherStudent)
        .filter(
            TeacherStudent.teacher_user_id == teacher_user_id,
            TeacherStudent.student_user_id == student_user_id,
        )
        .first()
    )
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    message = TeacherStudentMessage(
        teacher_user_id=teacher_user_id,
        student_user_id=student_user_id,
        title=payload.title.strip(),
        body=payload.body.strip(),
    )
    db.add(message)
    db.flush()

    create_notification(
        db,
        user_id=student_user_id,
        role="student",
        type="teacher_message_received",
        title="Новое сообщение от преподавателя",
        message="Преподаватель отправил вам новое сообщение.",
        target_view="student_messages",
        action_key="open_detail",
        target_id=message.id,
    )

    db.commit()
    db.refresh(message)
    return _build_message_item(message)


def list_student_messages(
    db: Session,
    *,
    student_user_id: UUID,
) -> TeacherStudentMessagesListResponse:
    messages = (
        db.query(TeacherStudentMessage)
        .filter(TeacherStudentMessage.student_user_id == student_user_id)
        .order_by(TeacherStudentMessage.created_at.desc())
        .all()
    )
    return TeacherStudentMessagesListResponse(items=[_build_message_item(message) for message in messages])


def get_student_message(
    db: Session,
    *,
    student_user_id: UUID,
    message_id: UUID,
) -> TeacherStudentMessageItem | None:
    message = (
        db.query(TeacherStudentMessage)
        .filter(
            TeacherStudentMessage.id == message_id,
            TeacherStudentMessage.student_user_id == student_user_id,
        )
        .first()
    )
    if message is None:
        return None

    return _build_message_item(message)


def mark_student_message_as_read(
    db: Session,
    *,
    student_user_id: UUID,
    message_id: UUID,
) -> TeacherStudentMessageItem:
    message = (
        db.query(TeacherStudentMessage)
        .filter(
            TeacherStudentMessage.id == message_id,
            TeacherStudentMessage.student_user_id == student_user_id,
        )
        .first()
    )
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    message.is_read_by_student = True
    db.commit()
    db.refresh(message)
    return _build_message_item(message)
