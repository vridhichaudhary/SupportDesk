import structlog
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db
from src.core.exceptions import ValidationException
from src.core.responses import ErrorResponse, SuccessResponse
from src.models import User
from src.schemas.user import (
    UserPreferencesUpdateRequest,
    UserProfileResponse,
    UserUpdateProfileRequest,
)
from src.services.user import user_service

logger = structlog.get_logger()

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
    },
)


@router.patch(
    "/me",
    response_model=SuccessResponse[UserProfileResponse],
    summary="Update current user profile",
)
def update_profile(
    payload: UserUpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse[UserProfileResponse]:
    updated_user = user_service.update_profile(db, current_user, payload)
    return SuccessResponse(data=UserProfileResponse.model_validate(updated_user))


@router.patch(
    "/me/preferences",
    response_model=SuccessResponse[UserProfileResponse],
    summary="Update current user preferences",
)
def update_preferences(
    payload: UserPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse[UserProfileResponse]:
    updated_user = user_service.update_preferences(db, current_user, payload)
    return SuccessResponse(data=UserProfileResponse.model_validate(updated_user))


@router.post(
    "/avatar",
    response_model=SuccessResponse[UserProfileResponse],
    summary="Upload user avatar image",
)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse[UserProfileResponse]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise ValidationException(
            "Only image files (JPEG, PNG, WebP) are allowed for avatar upload"
        )

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise ValidationException("Avatar image size must be less than 5MB")

    updated_user = user_service.upload_avatar(
        db, current_user, contents, file.filename or "avatar.jpg", file.content_type
    )
    return SuccessResponse(data=UserProfileResponse.model_validate(updated_user))


@router.delete(
    "/me",
    response_model=SuccessResponse[dict],
    summary="Delete / Deactivate current user account",
)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse[dict]:
    user_service.delete_account(db, current_user)
    return SuccessResponse(
        data={"message": "Account deactivated successfully", "user_id": str(current_user.id)}
    )
