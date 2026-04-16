from pydantic import BaseModel


class TeacherAiAssistantMessageRequest(BaseModel):
    message: str


class TeacherAiAssistantMessageResponse(BaseModel):
    reply: str
