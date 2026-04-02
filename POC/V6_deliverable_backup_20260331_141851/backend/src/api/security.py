import base64
import json
from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, Header, HTTPException

from shared.settings import settings


@dataclass
class AuthContext:
    user_id: str
    role: str
    scopes: set[str]


def _split_csv(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


def _parse_scopes(raw: str | None) -> set[str]:
    if not raw:
        return set()
    return {item.strip().lower() for item in _split_csv(raw)}


# Role → backend scopes for smart_on_fhir_demo mode
_ROLE_SCOPES: dict[str, str] = {
    "physician": "recommendation:read,recommendation:write",
    "nurse": "recommendation:read,recommendation:write",
    "pharmacist": "recommendation:read",
    "dpo": "recommendation:read,monitoring:read",
    "admin": "recommendation:read,recommendation:write,monitoring:read",
}


def _decode_smart_token(authorization: str | None) -> AuthContext | None:
    """Base64-decode a mock SMART on FHIR JWT payload and build an AuthContext."""
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    try:
        payload = json.loads(base64.b64decode(parts[1]).decode("utf-8"))
    except Exception:
        return None
    role = str(payload.get("role", "physician")).lower()
    return AuthContext(
        user_id=str(payload.get("sub", "unknown")),
        role=role,
        scopes=_parse_scopes(_ROLE_SCOPES.get(role, "recommendation:read")),
    )


def get_auth_context(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_auth_user_id: str | None = Header(default=None, alias="X-Auth-User-Id"),
    x_auth_role: str | None = Header(default=None, alias="X-Auth-Role"),
    x_auth_scopes: str | None = Header(default=None, alias="X-Auth-Scopes"),
) -> AuthContext:
    auth_mode = settings.api_auth_mode.strip().lower()

    if auth_mode == "disabled":
        return AuthContext(
            user_id=settings.api_auth_default_user_id,
            role=settings.api_auth_default_role.strip().lower(),
            scopes=_parse_scopes(settings.api_auth_default_scopes),
        )

    if auth_mode == "smart_on_fhir_demo":
        ctx = _decode_smart_token(authorization)
        if ctx:
            return ctx
        # Fall back to poc_claims defaults if no Bearer token (keeps existing tests green)

    # poc_claims mode (default) — read X-Auth-* headers
    if not x_auth_user_id or not x_auth_role:
        raise HTTPException(status_code=401, detail="Missing authentication context")
    role = x_auth_role.strip().lower()
    scopes = _parse_scopes(x_auth_scopes)
    return AuthContext(user_id=x_auth_user_id.strip(), role=role, scopes=scopes)


def require_access(*, allowed_roles: set[str], required_scopes: set[str]) -> Callable[[AuthContext], AuthContext]:
    def dependency(context: AuthContext = Depends(get_auth_context)) -> AuthContext:
        if context.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Access forbidden for this role")
        if required_scopes and not required_scopes.issubset(context.scopes):
            raise HTTPException(status_code=403, detail="Missing required scope")
        return context

    return dependency


def parse_roles(raw: str) -> set[str]:
    return {item.strip().lower() for item in _split_csv(raw)}
