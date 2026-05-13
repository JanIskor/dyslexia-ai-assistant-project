from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, StringConstraints

from app.services.adaptation_prompt_builder import AdaptationGenre, AdaptationMode
from app.services.adaptation_rationale_service import AdaptationIntensity
from app.services.factual_consistency_service import FactualIssueSeverity, FactualIssueType, FactualSummaryStatus


AssistantMaterialSourceType = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
LearningMaterialKind = Literal["draft", "adapted"]


class TeacherLearningMaterialCreateRequest(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    original_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    adapted_text: str | None = None
    source_type: AssistantMaterialSourceType | None = None
    source_material_id: UUID | None = None
    source_filename: str | None = None
    adaptation_mode: AdaptationMode | None = None
    adaptation_genre: AdaptationGenre | None = None
    adaptation_rationale: dict[str, object] | None = None
    factual_consistency_report: dict[str, object] | None = None


class AdaptationRationaleResponse(BaseModel):
    mode: AdaptationMode | None = None
    genre: AdaptationGenre | None = None
    adaptation_strategy: str
    applied_transformations: list[str]
    semantic_preservation_notes: list[str]
    methodology_references: list[str]
    adaptation_intensity: AdaptationIntensity
    warnings: list[str]
    is_fallback: bool = False


class FactualConsistencyIssueResponse(BaseModel):
    type: FactualIssueType
    severity: FactualIssueSeverity
    source_value: str | None = None
    adapted_value: str | None = None
    message: str


class FactualConsistencyReportResponse(BaseModel):
    summary_status: FactualSummaryStatus
    summary_message: str
    strict_mode: bool
    issues: list[FactualConsistencyIssueResponse]


class LearningMaterialResponse(BaseModel):
    id: UUID
    title: str
    original_text: str
    adapted_text: str | None = None
    material_kind: LearningMaterialKind
    material_type: str
    status: str
    source_type: str | None = None
    source_material_id: UUID | None = None
    source_filename: str | None = None
    adaptation_mode: AdaptationMode | None = None
    adaptation_genre: AdaptationGenre | None = None
    adaptation_rationale: AdaptationRationaleResponse | None = None
    factual_consistency_report: FactualConsistencyReportResponse | None = None
    adaptation_group_key: str | None = None
    created_at: datetime
    updated_at: datetime


class TeacherLearningMaterialsListResponse(BaseModel):
    items: list[LearningMaterialResponse]


class AdaptedMaterialSourceInfo(BaseModel):
    source_type: str
    source_material_id: UUID | None = None
    source_material_title: str | None = None
    source_filename: str | None = None
    adaptation_group_key: str


class AdaptationVersionSummary(BaseModel):
    id: UUID
    title: str
    adaptation_mode: AdaptationMode | None = None
    created_at: datetime
    updated_at: datetime
    is_current: bool


class AdaptedLearningMaterialDetailResponse(LearningMaterialResponse):
    source_info: AdaptedMaterialSourceInfo | None = None
    available_adaptation_versions: list[AdaptationVersionSummary] = []


class TeacherLearningMaterialCompareResponse(BaseModel):
    material_id: UUID
    title: str
    original_text: str
    current_adapted_text: str | None = None
    current_adaptation_mode: AdaptationMode | None = None
    available_adaptation_versions: list[AdaptationVersionSummary] = []
    source_info: AdaptedMaterialSourceInfo | None = None


class TeacherAdaptationVersionsResponse(BaseModel):
    material_id: UUID
    items: list[AdaptationVersionSummary]


class TeacherLearningMaterialAssignRequest(BaseModel):
    student_user_id: UUID


class TeacherLearningMaterialAssignmentResponse(BaseModel):
    id: UUID
    student_user_id: UUID
    learning_material_id: UUID
    assigned_by_teacher_user_id: UUID
    created_at: datetime


class TeacherLearningMaterialDeleteResponse(BaseModel):
    detail: str
