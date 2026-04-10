from uuid import UUID

from pydantic import BaseModel


class AdminApplicationListItem(BaseModel):
    id: UUID
    full_name: str
    status: str


class AdminApplicationsListResponse(BaseModel):
    items: list[AdminApplicationListItem]


class AdminApplicationStatusFilterOption(BaseModel):
    value: str
    label: str


class AdminApplicationsFiltersResponse(BaseModel):
    statuses: list[AdminApplicationStatusFilterOption]
