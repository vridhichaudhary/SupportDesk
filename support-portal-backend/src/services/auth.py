import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from src.core.exceptions import (
    AuthenticationException,
    ResourceConflictException,
    ValidationException,
)
from src.core.security import (
    create_access_token,
    create_refresh_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    validate_password_complexity,
    verify_password,
)
from src.models import (
    ActionType,
    AuthTokenType,
    Customer,
    Organization,
    User,
    UserRole,
    UserSession,
)
from src.repositories.session import session_repository
from src.repositories.user import user_repository
from src.schemas.auth import CustomerSignupRequest, OwnerSignupRequest
from src.services.audit_log import audit_log_service
from src.services.email import email_service
from src.services.oauth import github_oauth_provider, google_oauth_provider
from src.services.organization import organization_service


class AuthService:
    # ── Owner Signup ────────────────────────────────────────────────────────
    def signup_owner(
        self, db: Session, payload: OwnerSignupRequest
    ) -> Tuple[User, Organization, str, str]:
        # Check existing user email
        existing_user = user_repository.get_by_email(db, payload.email)
        if existing_user:
            raise ResourceConflictException("An account with this email address already exists")

        validate_password_complexity(payload.password)

        # 1. Create Organization (Tenant Root)
        from src.schemas.organization import OrganizationCreate

        org_in = OrganizationCreate(
            name=payload.organization_name,
            industry=payload.industry,
        )
        org = organization_service.create_organization(db, obj_in=org_in)

        # 2. Create Owner User
        hashed_pwd = hash_password(payload.password)
        user = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            email=payload.email.lower().strip(),
            password_hash=hashed_pwd,
            role=UserRole.OWNER,
            first_name=payload.first_name,
            last_name=payload.last_name,
            display_name=f"{payload.first_name} {payload.last_name}",
            is_email_verified=False,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 3. Create Session & Tokens
        session_id = uuid.uuid4()
        raw_refresh, refresh_hash, expire = create_refresh_token(user.id, org.id, session_id)

        user_session = UserSession(
            id=session_id,
            user_id=user.id,
            organization_id=org.id,
            refresh_token_hash=refresh_hash,
            device_info="Web Browser",
            expires_at=expire,
        )
        db.add(user_session)
        db.commit()

        access_token = create_access_token(user.id, org.id, user.role.value)

        # 4. Generate Verification Token & Send Email
        verification_raw = generate_opaque_token()
        ver_hash = hash_token(verification_raw)
        user_repository.create_auth_token(
            db=db,
            user_id=user.id,
            token_hash=ver_hash,
            token_type=AuthTokenType.EMAIL_VERIFICATION,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        email_service.send_verification_email(
            user.email, user.display_name or user.first_name, verification_raw
        )

        # 5. Audit Log
        audit_log_service.log_action(
            db=db,
            organization_id=org.id,
            action_type=ActionType.SIGNUP,
            entity_type="User",
            entity_id=user.id,
            actor_id=user.id,
        )

        return user, org, access_token, raw_refresh

    # ── Customer Signup ──────────────────────────────────────────────────────────
    def signup_customer(
        self, db: Session, payload: CustomerSignupRequest
    ) -> Tuple[User, Organization, str, str]:
        # Grab the default org (for simplicity in this prototype, we'll use the first one)
        org = db.query(Organization).first()
        if not org:
            raise ValidationException("No organization exists to join")

        # Check existing user
        existing_user = user_repository.get_by_email(db, payload.email)
        if existing_user:
            raise ValidationException("Email is already registered")

        hashed_pwd = hash_password(payload.password)

        # 1. Create User
        user = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            email=payload.email.lower().strip(),
            password_hash=hashed_pwd,
            role=UserRole.CUSTOMER,
            first_name=payload.first_name,
            last_name=payload.last_name,
            display_name=f"{payload.first_name} {payload.last_name}",
            is_email_verified=False,
            is_active=True,
        )
        db.add(user)

        # 2. Create Customer record mapping
        customer = Customer(
            id=uuid.uuid4(),
            organization_id=org.id,
            email=payload.email.lower().strip(),
            name=f"{payload.first_name} {payload.last_name}",
            company=payload.company,
        )
        db.add(customer)

        db.commit()
        db.refresh(user)

        # 3. Create Session & Tokens
        session_id = uuid.uuid4()
        raw_refresh, refresh_hash, expire = create_refresh_token(user.id, org.id, session_id)

        user_session = UserSession(
            id=session_id,
            user_id=user.id,
            organization_id=org.id,
            refresh_token_hash=refresh_hash,
            device_info="Web Browser",
            expires_at=expire,
        )
        db.add(user_session)
        db.commit()

        access_token = create_access_token(user.id, org.id, user.role.value)

        # 4. Generate Verification Token & Send Email
        verification_raw = generate_opaque_token()
        ver_hash = hash_token(verification_raw)
        user_repository.create_auth_token(
            db=db,
            user_id=user.id,
            token_hash=ver_hash,
            token_type=AuthTokenType.EMAIL_VERIFICATION,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        email_service.send_verification_email(
            user.email, user.display_name or user.first_name, verification_raw
        )

        return user, org, access_token, raw_refresh

    # ── Login ───────────────────────────────────────────────────────────────
    def login(
        self,
        db: Session,
        email: str,
        password: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        user = user_repository.get_by_email(db, email)
        if not user:
            raise AuthenticationException("Invalid email or password")

        # Check account lock out
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            raise AuthenticationException(
                "Account is temporarily locked due to multiple failed attempts. Please try again later."
            )

        if not user.is_active:
            raise AuthenticationException(
                "Your account has been deactivated. Please contact support."
            )

        if not verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            db.add(user)
            db.commit()
            raise AuthenticationException("Invalid email or password")

        # Reset failed attempts on success
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()

        # Session & Tokens
        session_id = uuid.uuid4()
        raw_refresh, refresh_hash, expire = create_refresh_token(
            user.id, user.organization_id, session_id
        )

        user_session = UserSession(
            id=session_id,
            user_id=user.id,
            organization_id=user.organization_id,
            refresh_token_hash=refresh_hash,
            device_info=user_agent or "Unknown Device",
            ip_address=ip_address,
            expires_at=expire,
        )
        db.add(user_session)
        db.commit()

        access_token = create_access_token(user.id, user.organization_id, user.role.value)

        audit_log_service.log_action(
            db=db,
            organization_id=user.organization_id,
            action_type=ActionType.LOGIN,
            entity_type="User",
            entity_id=user.id,
            actor_id=user.id,
        )

        return user, access_token, raw_refresh

    # ── Refresh Token Rotation ──────────────────────────────────────────────
    def refresh_access_token(self, db: Session, raw_refresh_token: str) -> Tuple[str, str]:
        token_hash = hash_token(raw_refresh_token)
        session = session_repository.get_by_token_hash(db, token_hash)
        if not session:
            raise AuthenticationException("Invalid or revoked refresh token")

        # Revoke old token/session (Rotation)
        session.is_revoked = True
        db.add(session)
        db.commit()

        user = user_repository.get_by_id(db, session.user_id)
        if not user or not user.is_active:
            raise AuthenticationException("User account inactive or not found")

        # Issue new session and refresh token
        new_session_id = uuid.uuid4()
        new_raw_refresh, new_refresh_hash, expire = create_refresh_token(
            user.id, user.organization_id, new_session_id
        )

        new_session = UserSession(
            id=new_session_id,
            user_id=user.id,
            organization_id=user.organization_id,
            refresh_token_hash=new_refresh_hash,
            device_info=session.device_info,
            ip_address=session.ip_address,
            expires_at=expire,
        )
        db.add(new_session)
        db.commit()

        new_access_token = create_access_token(user.id, user.organization_id, user.role.value)
        return new_access_token, new_raw_refresh

    # ── Logout ──────────────────────────────────────────────────────────────
    def logout(self, db: Session, raw_refresh_token: str, user_id: uuid.UUID) -> None:
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            session = session_repository.get_by_token_hash(db, token_hash)
            if session:
                session.is_revoked = True
                db.add(session)
                db.commit()

        user = user_repository.get_by_id(db, user_id)
        if user:
            audit_log_service.log_action(
                db=db,
                organization_id=user.organization_id,
                action_type=ActionType.LOGOUT,
                entity_type="User",
                entity_id=user.id,
                actor_id=user.id,
            )

    def revoke_all_sessions(self, db: Session, user_id: uuid.UUID) -> None:
        session_repository.revoke_all_user_sessions(db, user_id)

    # ── Email Verification ──────────────────────────────────────────────────
    def verify_email(self, db: Session, raw_token: str) -> None:
        token_hash = hash_token(raw_token)
        auth_token = user_repository.get_auth_token(
            db, token_hash, AuthTokenType.EMAIL_VERIFICATION
        )
        if not auth_token:
            raise ValidationException("Invalid or expired email verification token")

        auth_token.is_used = True
        user = user_repository.get_by_id(db, auth_token.user_id)
        if user:
            user.is_email_verified = True
            db.add(user)

        db.add(auth_token)
        db.commit()

    def resend_verification_email(self, db: Session, email: str) -> None:
        user = user_repository.get_by_email(db, email)
        if not user or user.is_email_verified:
            return  # Silent return for security

        verification_raw = generate_opaque_token()
        ver_hash = hash_token(verification_raw)
        user_repository.create_auth_token(
            db=db,
            user_id=user.id,
            token_hash=ver_hash,
            token_type=AuthTokenType.EMAIL_VERIFICATION,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        email_service.send_verification_email(
            user.email, user.display_name or user.first_name, verification_raw
        )

    # ── Password Reset Flow ─────────────────────────────────────────────────
    def forgot_password(self, db: Session, email: str) -> None:
        user = user_repository.get_by_email(db, email)
        if not user:
            return  # Silent return to prevent email enumeration

        reset_raw = generate_opaque_token()
        reset_hash = hash_token(reset_raw)
        user_repository.create_auth_token(
            db=db,
            user_id=user.id,
            token_hash=reset_hash,
            token_type=AuthTokenType.PASSWORD_RESET,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        email_service.send_password_reset_email(
            user.email, user.display_name or user.first_name, reset_raw
        )

    def reset_password(self, db: Session, raw_token: str, new_password: str) -> None:
        token_hash = hash_token(raw_token)
        auth_token = user_repository.get_auth_token(db, token_hash, AuthTokenType.PASSWORD_RESET)
        if not auth_token:
            raise ValidationException("Invalid or expired password reset token")

        validate_password_complexity(new_password)

        user = user_repository.get_by_id(db, auth_token.user_id)
        if not user:
            raise ResourceConflictException("Associated user account not found")

        auth_token.is_used = True
        user.password_hash = hash_password(new_password)
        db.add(auth_token)
        db.add(user)
        db.commit()

        # Revoke all active sessions on password reset
        session_repository.revoke_all_user_sessions(db, user.id)

    # ── OAuth Handler ───────────────────────────────────────────────────────
    async def handle_oauth_login(
        self, db: Session, provider_name: str, code: str
    ) -> Tuple[User, str, str]:
        if provider_name == "google":
            user_info = await google_oauth_provider.get_user_info(code)
        elif provider_name == "github":
            user_info = await github_oauth_provider.get_user_info(code)
        else:
            raise ValidationException(f"Unsupported OAuth provider: {provider_name}")

        user = user_repository.get_by_email(db, user_info.email)
        if not user:
            # Multi-Tenant Rule: User MUST belong to an Organization.
            # Provision new demo/default Organization for OAuth user
            from src.schemas.organization import OrganizationCreate

            org_in = OrganizationCreate(name=f"{user_info.first_name}'s Org", industry="Other")
            org = organization_service.create_organization(db, obj_in=org_in)

            user = User(
                id=uuid.uuid4(),
                organization_id=org.id,
                email=user_info.email.lower().strip(),
                password_hash=hash_password(generate_opaque_token()),
                role=UserRole.OWNER,
                first_name=user_info.first_name,
                last_name=user_info.last_name,
                display_name=f"{user_info.first_name} {user_info.last_name}".strip(),
                avatar_url=user_info.avatar_url,
                is_email_verified=True,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Issue Session & Tokens
        session_id = uuid.uuid4()
        raw_refresh, refresh_hash, expire = create_refresh_token(
            user.id, user.organization_id, session_id
        )

        user_session = UserSession(
            id=session_id,
            user_id=user.id,
            organization_id=user.organization_id,
            refresh_token_hash=refresh_hash,
            device_info=f"OAuth ({provider_name.title()})",
            expires_at=expire,
        )
        db.add(user_session)
        db.commit()

        access_token = create_access_token(user.id, user.organization_id, user.role.value)
        return user, access_token, raw_refresh


auth_service = AuthService()
