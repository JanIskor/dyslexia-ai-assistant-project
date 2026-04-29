from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import get_current_admin, get_db
from app.models.user import User
from app.schemas.admin_applications import (
    AdminAssignTeacherRequest,
    AdminApplicationDetailResponse,
    AdminApplicationsFiltersResponse,
    AdminApplicationsListResponse,
    AdminTeacherAssignmentOptionsResponse,
    AdminApplicationUpdateRequest,
)
from app.schemas.admin_directories import (
    AdminStudentDetailResponse,
    AdminStudentsListResponse,
    AdminStudentsSort,
    AdminTeacherDetailResponse,
    AdminTeachersListResponse,
    AdminTeachersSort,
)
from app.schemas.auth import UserResponse
from app.schemas.knowledge_documents import (
    KnowledgeBaseRetrieveRequest,
    KnowledgeBaseRetrieveResponse,
    KnowledgeBaseRetrievedChunkResponse,
    KnowledgeDocumentChunksListResponse,
    KnowledgeDocumentControlsUpdateRequest,
    KnowledgeDocumentDeleteResponse,
    KnowledgeDocumentResponse,
    KnowledgeDocumentsListResponse,
)
from app.schemas.student_teacher_removal_requests import (
    AdminStudentRemovalRequestUpdateRequest,
    StudentTeacherRemovalRequestItem,
    StudentTeacherRemovalRequestsListResponse,
)
from app.services.admin_applications_service import (
    approve_admin_application,
    assign_teacher_to_application,
    get_admin_application_detail,
    get_admin_application_status_filters,
    list_admin_teacher_assignment_options,
    list_admin_applications,
    request_admin_application_changes,
    update_admin_application,
)
from app.services.admin_directories_service import (
    get_admin_student_detail,
    get_admin_teacher_detail,
    list_admin_students,
    list_admin_teachers,
)
from app.services.knowledge_base_service import (
    delete_knowledge_document,
    get_knowledge_document,
    get_knowledge_document_chunks,
    list_knowledge_documents,
    reembed_knowledge_document,
    update_knowledge_document_controls,
    upload_knowledge_document,
)
from app.services.retrieval_service import retrieve_relevant_chunks
from app.services.student_teacher_removal_requests_service import (
    list_admin_student_removal_requests,
    resolve_admin_student_removal_request,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/access-check", response_model=UserResponse)
def read_admin_access_check(current_admin: User = Depends(get_current_admin)):
    return UserResponse.model_validate(current_admin)


@router.get("/student-removal-requests", response_model=StudentTeacherRemovalRequestsListResponse)
def read_admin_student_removal_requests(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    return list_admin_student_removal_requests(db)


@router.patch("/student-removal-requests/{request_id}", response_model=StudentTeacherRemovalRequestItem)
def patch_admin_student_removal_request(
    request_id: UUID,
    payload: AdminStudentRemovalRequestUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return resolve_admin_student_removal_request(
        db,
        admin_user_id=current_admin.id,
        request_id=request_id,
        payload=payload,
    )


@router.post("/knowledge-base/documents", response_model=KnowledgeDocumentResponse)
def create_knowledge_document(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return upload_knowledge_document(
        db,
        uploaded_by_user_id=current_admin.id,
        file=file,
    )


@router.get("/knowledge-base/documents", response_model=KnowledgeDocumentsListResponse)
def read_knowledge_documents(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    return list_knowledge_documents(db)


@router.get("/knowledge-base/documents/{document_id}", response_model=KnowledgeDocumentResponse)
def read_knowledge_document_detail(
    document_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    document = get_knowledge_document(db, document_id=document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")
    return document


@router.get(
    "/knowledge-base/documents/{document_id}/chunks",
    response_model=KnowledgeDocumentChunksListResponse,
)
def read_knowledge_document_chunks(
    document_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    chunks = get_knowledge_document_chunks(db, document_id=document_id)
    if chunks is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")
    return chunks


@router.post("/knowledge-base/documents/{document_id}/re-embed", response_model=KnowledgeDocumentResponse)
def reembed_knowledge_document_endpoint(
    document_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    document = reembed_knowledge_document(db, document_id=document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")
    return document


@router.patch("/knowledge-base/documents/{document_id}", response_model=KnowledgeDocumentResponse)
def patch_knowledge_document_controls(
    document_id: UUID,
    payload: KnowledgeDocumentControlsUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    document = update_knowledge_document_controls(
        db,
        document_id=document_id,
        payload=payload,
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")
    return document


@router.delete("/knowledge-base/documents/{document_id}", response_model=KnowledgeDocumentDeleteResponse)
def delete_knowledge_document_endpoint(
    document_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    result = delete_knowledge_document(db, document_id=document_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")
    return result


@router.post("/knowledge-base/retrieve", response_model=KnowledgeBaseRetrieveResponse)
def retrieve_knowledge_base_chunks(
    payload: KnowledgeBaseRetrieveRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    items = retrieve_relevant_chunks(
        db,
        query_text=payload.query,
        top_k=payload.top_k,
        selected_mode=payload.adaptation_mode,
    )
    return KnowledgeBaseRetrieveResponse(
        query=payload.query,
        top_k=payload.top_k,
        items=[
            KnowledgeBaseRetrievedChunkResponse(
                id=item.id,
                document_id=item.document_id,
                document_title=item.document_title,
                chunk_index=item.chunk_index,
                content=item.content,
                distance=item.distance,
                similarity=item.similarity,
            )
            for item in items
        ],
    )


@router.get("/applications", response_model=AdminApplicationsListResponse)
def read_admin_applications(
    search: str | None = Query(default=None),
    status: list[str] | None = Query(default=None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return list_admin_applications(db, search=search, statuses=status)


@router.get("/applications/filters", response_model=AdminApplicationsFiltersResponse)
def read_admin_application_filters(current_admin: User = Depends(get_current_admin)):
    return get_admin_application_status_filters()


@router.get("/teachers/assignment-options", response_model=AdminTeacherAssignmentOptionsResponse)
def read_admin_teacher_assignment_options(
    application_id: UUID | None = Query(default=None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return list_admin_teacher_assignment_options(db, application_id=application_id)


@router.get("/teachers", response_model=AdminTeachersListResponse)
def read_admin_teachers(
    search: str | None = Query(default=None),
    sort: AdminTeachersSort = Query(default="surname_asc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return list_admin_teachers(
        db,
        search=search,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/teachers/{teacher_id}", response_model=AdminTeacherDetailResponse)
def read_admin_teacher_detail(
    teacher_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_admin_teacher_detail(db, teacher_id=teacher_id)


@router.get("/students", response_model=AdminStudentsListResponse)
def read_admin_students(
    search: str | None = Query(default=None),
    sort: AdminStudentsSort = Query(default="surname_asc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return list_admin_students(
        db,
        search=search,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/students/{student_id}", response_model=AdminStudentDetailResponse)
def read_admin_student_detail(
    student_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_admin_student_detail(db, student_id=student_id)


@router.get("/applications/{application_id}", response_model=AdminApplicationDetailResponse)
def read_admin_application_detail(
    application_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_admin_application_detail(db, application_id=application_id)


@router.patch("/applications/{application_id}", response_model=AdminApplicationDetailResponse)
def patch_admin_application(
    application_id: UUID,
    payload: AdminApplicationUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return update_admin_application(db, application_id=application_id, payload=payload)


@router.post("/applications/{application_id}/request-changes", response_model=AdminApplicationDetailResponse)
def request_admin_application_changes_endpoint(
    application_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return request_admin_application_changes(db, application_id=application_id)


@router.post("/applications/{application_id}/approve", response_model=AdminApplicationDetailResponse)
def approve_admin_application_endpoint(
    application_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return approve_admin_application(db, application_id=application_id)


@router.post("/applications/{application_id}/assign-teacher", response_model=AdminApplicationDetailResponse)
def assign_teacher_to_application_endpoint(
    application_id: str,
    payload: AdminAssignTeacherRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        parsed_application_id = UUID(application_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid application id") from exc

    return assign_teacher_to_application(db, application_id=parsed_application_id, payload=payload)
