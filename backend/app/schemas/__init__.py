from app.schemas.auth import LoginRequest, RegisterRequest, Token, TokenData, UserResponse
from app.schemas.learning_materials import (
    LearningMaterialResponse,
    TeacherLearningMaterialAssignmentResponse,
    TeacherLearningMaterialAssignRequest,
    TeacherLearningMaterialCreateRequest,
    TeacherLearningMaterialsListResponse,
)
from app.schemas.knowledge_documents import (
    KnowledgeDocumentChunkResponse,
    KnowledgeDocumentChunksListResponse,
    KnowledgeDocumentResponse,
    KnowledgeDocumentsListResponse,
)
from app.schemas.student_learning_materials import (
    StudentLearningMaterialDetailResponse,
    StudentLearningMaterialListItem,
    StudentLearningMaterialsListResponse,
)
from app.schemas.teacher_ai_assistant import (
    TeacherAiAssistantMessageRequest,
    TeacherAiAssistantMessageResponse,
)
from app.schemas.teacher_students import TeacherStudentDetail, TeacherStudentListItem

__all__ = [
    "RegisterRequest",
    "LoginRequest",
    "Token",
    "TokenData",
    "UserResponse",
    "TeacherLearningMaterialCreateRequest",
    "LearningMaterialResponse",
    "TeacherLearningMaterialsListResponse",
    "KnowledgeDocumentResponse",
    "KnowledgeDocumentsListResponse",
    "KnowledgeDocumentChunkResponse",
    "KnowledgeDocumentChunksListResponse",
    "TeacherLearningMaterialAssignRequest",
    "TeacherLearningMaterialAssignmentResponse",
    "StudentLearningMaterialListItem",
    "StudentLearningMaterialsListResponse",
    "StudentLearningMaterialDetailResponse",
    "TeacherAiAssistantMessageRequest",
    "TeacherAiAssistantMessageResponse",
    "TeacherStudentListItem",
    "TeacherStudentDetail",
]
