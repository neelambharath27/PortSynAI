from fastapi import Depends

from app.core.exceptions import ForbiddenException
from app.dependencies import get_current_user
from app.models.enums import UserRole
from app.models.user import User


def require_role(*allowed_roles: UserRole):
    """FastAPI dependency factory restricting an endpoint to specific roles.

    Usage:
        @router.get("/admin-only")
        def handler(user: User = Depends(require_role(UserRole.ADMINISTRATOR))):
            ...
    """

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(
                f"Role '{current_user.role.value}' is not permitted to access this resource"
            )
        return current_user

    return dependency
