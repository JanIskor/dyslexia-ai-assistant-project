from uuid import UUID

from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_teacher, get_db
from app.models.user import User
from app.schemas.learning_materials import (
    AdaptedLearningMaterialDetailResponse,
    LearningMaterialResponse,
    TeacherAdaptationVersionsResponse,
    TeacherLearningMaterialCompareResponse,
    TeacherLearningMaterialAssignmentResponse,
    TeacherLearningMaterialAssignRequest,
    TeacherLearningMaterialCreateRequest,
    TeacherLearningMaterialDeleteResponse,
    TeacherLearningMaterialsListResponse,
)
from app.schemas.profile_avatar import ProfileAvatarUploadResponse
from app.schemas.teacher_ai_assistant import (
    TeacherAiAssistantMessageRequest,
    TeacherAiAssistantMessageResponse,
    TeacherAiAssistantParsedFileResponse,
    TeacherAiAssistantSaveMaterialRequest,
    TeacherAiAssistantSaveMaterialResponse,
    TeacherAiAssistantSourceStatusRequest,
    TeacherAiAssistantSourceStatusResponse,
)
from app.schemas.teacher_incoming_students import (
    TeacherIncomingStudentDetail,
    TeacherIncomingStudentsListResponse,
)
from app.schemas.teacher_profile_edit import TeacherProfileEditRequest, TeacherProfileEditResponse
from app.schemas.teacher_profile import TeacherProfileResponse
from app.schemas.student_teacher_removal_requests import (
    StudentTeacherRemovalRequestItem,
    TeacherStudentRemovalRequestCreateRequest,
)
from app.schemas.teacher_student_messages import TeacherStudentMessageCreateRequest, TeacherStudentMessageItem
from app.schemas.teacher_students import TeacherStudentDetail, TeacherStudentsListResponse
from app.services.teacher_profile_service import get_teacher_profile
from app.services.learning_materials_service import (
    assign_learning_material_to_student,
    create_learning_material,
    get_teacher_learning_material_compare_ready_detail,
    get_teacher_learning_material,
    list_teacher_learning_materials,
    soft_delete_learning_material,
)
from app.services.teacher_profile_update_requests_service import (
    get_teacher_profile_edit_state,
    save_teacher_profile_edit_draft,
    submit_teacher_profile_edit_request,
    upload_teacher_profile_edit_avatar,
)
from app.services.teacher_incoming_students_service import (
    accept_teacher_incoming_student,
    get_teacher_incoming_student,
    list_teacher_incoming_students,
    reject_teacher_incoming_student,
)
from app.services.teacher_ai_assistant_service import (
    create_teacher_ai_assistant_reply,
    get_teacher_ai_assistant_source_status,
    parse_teacher_ai_assistant_input_file,
    save_teacher_ai_assistant_material,
)
from app.services.llm_service import LlmProviderConfigurationError, LlmProviderRequestError
from app.services.student_teacher_removal_requests_service import create_teacher_student_removal_request
from app.services.teacher_student_messages_service import create_teacher_student_message
from app.services.teacher_students_service import get_teacher_student, list_teacher_students

router = APIRouter(prefix="/teacher", tags=["Teacher"])


@router.post("/ai-assistant/messages", response_model=TeacherAiAssistantMessageResponse)
def create_teacher_ai_assistant_message(
    payload: TeacherAiAssistantMessageRequest,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    _ = current_teacher

    try:
        return create_teacher_ai_assistant_reply(db, payload)
    except LlmProviderConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LlmProviderRequestError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/ai-assistant/save-material", response_model=TeacherAiAssistantSaveMaterialResponse)
def save_teacher_ai_assistant_material_endpoint(
    payload: TeacherAiAssistantSaveMaterialRequest,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return save_teacher_ai_assistant_material(
        db,
        teacher_user_id=current_teacher.id,
        payload=payload,
    )


@router.post("/ai-assistant/source-status", response_model=TeacherAiAssistantSourceStatusResponse)
def get_teacher_ai_assistant_source_status_endpoint(
    payload: TeacherAiAssistantSourceStatusRequest,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return get_teacher_ai_assistant_source_status(
        db,
        teacher_user_id=current_teacher.id,
        payload=payload,
    )


@router.post("/ai-assistant/parse-file", response_model=TeacherAiAssistantParsedFileResponse)
def parse_teacher_ai_assistant_file_endpoint(
    file: UploadFile = File(...),
    current_teacher: User = Depends(get_current_teacher),
):
    _ = current_teacher
    return parse_teacher_ai_assistant_input_file(file=file)


@router.post("/materials", response_model=LearningMaterialResponse)
def create_teacher_material(
    payload: TeacherLearningMaterialCreateRequest,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return create_learning_material(
        db,
        teacher_user_id=current_teacher.id,
        payload=payload,
    )


@router.get("/materials", response_model=TeacherLearningMaterialsListResponse)
def read_teacher_materials(
    kind: Literal["all", "draft", "adapted"] = Query(default="all"),
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return list_teacher_learning_materials(
        db,
        teacher_user_id=current_teacher.id,
        kind=kind,
    )


@router.get("/materials/{material_id}", response_model=AdaptedLearningMaterialDetailResponse)
def read_teacher_material_detail(
    material_id: UUID,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    material = get_teacher_learning_material_compare_ready_detail(
        db,
        teacher_user_id=current_teacher.id,
        material_id=material_id,
    )
    if material is None:
        raise HTTPException(status_code=404, detail="Learning material not found")
    return material


@router.get("/materials/{material_id}/compare", response_model=TeacherLearningMaterialCompareResponse)
def read_teacher_material_compare(
    material_id: UUID,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    material = get_teacher_learning_material_compare_ready_detail(
        db,
        teacher_user_id=current_teacher.id,
        material_id=material_id,
    )
    if material is None:
        raise HTTPException(status_code=404, detail="Learning material not found")

    return TeacherLearningMaterialCompareResponse(
        material_id=material.id,
        title=material.title,
        original_text=material.original_text,
        current_adapted_text=material.adapted_text,
        current_adaptation_mode=material.adaptation_mode,
        available_adaptation_versions=material.available_adaptation_versions,
        source_info=material.source_info,
    )


@router.get("/materials/{material_id}/adaptation-versions", response_model=TeacherAdaptationVersionsResponse)
def read_teacher_material_adaptation_versions(
    material_id: UUID,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    material = get_teacher_learning_material_compare_ready_detail(
        db,
        teacher_user_id=current_teacher.id,
        material_id=material_id,
    )
    if material is None:
        raise HTTPException(status_code=404, detail="Learning material not found")

    return TeacherAdaptationVersionsResponse(
        material_id=material.id,
        items=material.available_adaptation_versions,
    )


@router.post("/materials/{material_id}/assign", response_model=TeacherLearningMaterialAssignmentResponse)
def assign_teacher_material_to_student(
    material_id: UUID,
    payload: TeacherLearningMaterialAssignRequest,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return assign_learning_material_to_student(
        db,
        teacher_user_id=current_teacher.id,
        material_id=material_id,
        payload=payload,
    )


@router.delete("/materials/{material_id}", response_model=TeacherLearningMaterialDeleteResponse)
def delete_teacher_material(
    material_id: UUID,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return soft_delete_learning_material(
        db,
        teacher_user_id=current_teacher.id,
        material_id=material_id,
    )


@router.get("/profile", response_model=TeacherProfileResponse)
def read_teacher_profile(
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    profile = get_teacher_profile(db, current_teacher.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return profile


@router.get("/profile-edit", response_model=TeacherProfileEditResponse)
def read_teacher_profile_edit(
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return get_teacher_profile_edit_state(db, teacher_user_id=current_teacher.id)


@router.put("/profile-edit", response_model=TeacherProfileEditResponse)
def update_teacher_profile_edit(
    payload: TeacherProfileEditRequest,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return save_teacher_profile_edit_draft(
        db,
        teacher_user_id=current_teacher.id,
        payload=payload,
    )


@router.post("/profile-edit/submit", response_model=TeacherProfileEditResponse)
def submit_teacher_profile_edit(
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return submit_teacher_profile_edit_request(
        db,
        teacher_user_id=current_teacher.id,
    )


@router.post("/profile/avatar", response_model=ProfileAvatarUploadResponse)
async def upload_teacher_profile_avatar(
    file: UploadFile = File(...),
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    avatar_url = await upload_teacher_profile_edit_avatar(
        db,
        teacher_user_id=current_teacher.id,
        file=file,
    )
    return ProfileAvatarUploadResponse(avatar_url=avatar_url)


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


@router.post("/students/{student_id}/removal-requests", response_model=StudentTeacherRemovalRequestItem)
def create_teacher_student_removal_request_endpoint(
    student_id: UUID,
    payload: TeacherStudentRemovalRequestCreateRequest,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return create_teacher_student_removal_request(
        db,
        teacher_user_id=current_teacher.id,
        payload=payload,
        student_user_id=student_id,
    )


@router.post("/students/{student_id}/messages", response_model=TeacherStudentMessageItem)
def create_teacher_student_message_endpoint(
    student_id: UUID,
    payload: TeacherStudentMessageCreateRequest,
    current_teacher: User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    return create_teacher_student_message(
        db,
        teacher_user_id=current_teacher.id,
        student_user_id=student_id,
        payload=payload,
    )


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
