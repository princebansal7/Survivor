from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    round_id: int
    user_id: int
    author_username: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
