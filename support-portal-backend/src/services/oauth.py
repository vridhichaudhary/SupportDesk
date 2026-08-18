import os
from typing import Optional

import httpx
import structlog

from src.core.config import settings
from src.core.exceptions import ValidationException

logger = structlog.get_logger()


class OAuthUserInfo:
    def __init__(
        self,
        provider: str,
        provider_id: str,
        email: str,
        first_name: str,
        last_name: str,
        avatar_url: Optional[str] = None,
    ):
        self.provider = provider
        self.provider_id = provider_id
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.avatar_url = avatar_url


class GoogleOAuthProvider:
    def __init__(self) -> None:
        self.client_id = os.getenv("GOOGLE_CLIENT_ID", "mock-google-client-id")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "mock-google-client-secret")
        self.redirect_uri = os.getenv(
            "GOOGLE_REDIRECT_URI", f"{settings.FRONTEND_URL}/auth/callback/google"
        )

    def get_authorization_url(self, state: str) -> str:
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        params = (
            f"?response_type=code&client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}&scope=openid%20email%20profile"
            f"&state={state}"
        )
        return f"{base_url}{params}"

    async def get_user_info(self, code: str) -> OAuthUserInfo:
        # Mock / Development mode fallback if no valid real secrets
        if self.client_id == "mock-google-client-id":
            return OAuthUserInfo(
                provider="google",
                provider_id="google-mock-12345",
                email="google.user@example.com",
                first_name="Google",
                last_name="User",
                avatar_url="https://lh3.googleusercontent.com/a/default-user",
            )

        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                raise ValidationException("Failed to exchange Google OAuth code")
            token_data = token_resp.json()
            access_token = token_data.get("access_token")

            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_resp.status_code != 200:
                raise ValidationException("Failed to fetch Google user profile")
            user_data = user_resp.json()

            return OAuthUserInfo(
                provider="google",
                provider_id=user_data.get("id", ""),
                email=user_data.get("email", ""),
                first_name=user_data.get("given_name", "Google"),
                last_name=user_data.get("family_name", "User"),
                avatar_url=user_data.get("picture"),
            )


class GitHubOAuthProvider:
    def __init__(self) -> None:
        self.client_id = os.getenv("GITHUB_CLIENT_ID", "mock-github-client-id")
        self.client_secret = os.getenv("GITHUB_CLIENT_SECRET", "mock-github-client-secret")
        self.redirect_uri = os.getenv(
            "GITHUB_REDIRECT_URI", f"{settings.FRONTEND_URL}/auth/callback/github"
        )

    def get_authorization_url(self, state: str) -> str:
        base_url = "https://github.com/login/oauth/authorize"
        params = f"?client_id={self.client_id}&redirect_uri={self.redirect_uri}&scope=user:email&state={state}"
        return f"{base_url}{params}"

    async def get_user_info(self, code: str) -> OAuthUserInfo:
        if self.client_id == "mock-github-client-id":
            return OAuthUserInfo(
                provider="github",
                provider_id="github-mock-67890",
                email="github.user@example.com",
                first_name="GitHub",
                last_name="User",
                avatar_url="https://avatars.githubusercontent.com/u/9919?v=4",
            )

        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                },
            )
            if token_resp.status_code != 200:
                raise ValidationException("Failed to exchange GitHub OAuth code")
            token_data = token_resp.json()
            access_token = token_data.get("access_token")

            user_resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"token {access_token}",
                    "User-Agent": "SupportDesk-AI",
                },
            )
            if user_resp.status_code != 200:
                raise ValidationException("Failed to fetch GitHub user profile")
            user_data = user_resp.json()

            # Handle primary email fetch
            emails_resp = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"token {access_token}",
                    "User-Agent": "SupportDesk-AI",
                },
            )
            email = user_data.get("email")
            if not email and emails_resp.status_code == 200:
                emails = emails_resp.json()
                for e in emails:
                    if e.get("primary"):
                        email = e.get("email")
                        break

            name_parts = (user_data.get("name") or "GitHub User").split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            return OAuthUserInfo(
                provider="github",
                provider_id=str(user_data.get("id")),
                email=email or "github.user@example.com",
                first_name=first_name,
                last_name=last_name,
                avatar_url=user_data.get("avatar_url"),
            )


google_oauth_provider = GoogleOAuthProvider()
github_oauth_provider = GitHubOAuthProvider()
