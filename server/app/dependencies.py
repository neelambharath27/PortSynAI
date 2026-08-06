from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import CredentialsException
from app.core.security import decode_token
from app.database.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise CredentialsException(str(exc)) from exc

    if payload.get("type") != "access":
        raise CredentialsException("Expected an access token")

    user_id = payload.get("sub")
    if not user_id:
        raise CredentialsException()

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise CredentialsException("User not found or inactive")

    return user
