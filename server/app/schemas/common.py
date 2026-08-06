from pydantic import BaseModel


class Message(BaseModel):
    detail: str


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
