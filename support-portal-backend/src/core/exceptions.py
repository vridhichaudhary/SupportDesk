from typing import Any, Dict, Optional


class SupportDeskException(Exception):
    """Base exception for all custom business logic errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "BAD_REQUEST",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundException(SupportDeskException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=404, code="NOT_FOUND")


class ResourceNotFoundException(NotFoundException):
    pass


class ValidationException(SupportDeskException):
    def __init__(self, message: str = "Validation error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=422, code="VALIDATION_ERROR", details=details)


class AuthenticationException(SupportDeskException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message=message, status_code=401, code="UNAUTHORIZED")


class AuthorizationException(SupportDeskException):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message=message, status_code=403, code="FORBIDDEN")


class ResourceConflictException(SupportDeskException):
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message=message, status_code=409, code="CONFLICT")


# Convenient alias used throughout the codebase
ConflictException = ResourceConflictException
