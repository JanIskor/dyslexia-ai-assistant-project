from pydantic import BaseModel


class ProfileAvatarUploadResponse(BaseModel):
    avatar_url: str
