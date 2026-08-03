from abc import ABC, abstractmethod
from typing import Optional

import structlog

logger = structlog.get_logger()


class BaseEmailProvider(ABC):
    @abstractmethod
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Sends an email to the recipient."""
        pass


class ConsoleEmailProvider(BaseEmailProvider):
    """
    Development email provider that logs emails to console/structlog.
    """

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        logger.info(
            "Sending Email (Development Mode)",
            to=to_email,
            subject=subject,
            preview=(text_content or html_content)[:120],
        )
        print("\n" + "=" * 60)
        print(f"📧 EMAIL SENT TO: {to_email}")
        print(f"📌 SUBJECT: {subject}")
        print("-" * 60)
        print(text_content or html_content)
        print("=" * 60 + "\n")
        return True


class EmailService:
    def __init__(self, provider: Optional[BaseEmailProvider] = None) -> None:
        self.provider = provider or ConsoleEmailProvider()

    def send_verification_email(
        self, to_email: str, user_name: str, verification_token: str
    ) -> bool:
        subject = "Verify your SupportDesk AI Account"
        link = f"http://localhost:3000/verify-email?token={verification_token}"
        html = f"""
        <h2>Welcome to SupportDesk AI, {user_name}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="{link}" style="padding:10px 20px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:5px;">Verify Email Address</a></p>
        <p>If you didn't create an account, you can safely ignore this message.</p>
        """
        text = f"Welcome to SupportDesk AI, {user_name}!\nVerify your email: {link}"
        return self.provider.send_email(to_email, subject, html, text)

    def send_password_reset_email(self, to_email: str, user_name: str, reset_token: str) -> bool:
        subject = "Reset your SupportDesk AI Password"
        link = f"http://localhost:3000/reset-password?token={reset_token}"
        html = f"""
        <h2>Password Reset Request</h2>
        <p>Hello {user_name},</p>
        <p>We received a request to reset your SupportDesk AI password. Click the link below to choose a new password:</p>
        <p><a href="{link}" style="padding:10px 20px; background:#DC2626; color:#fff; text-decoration:none; border-radius:5px;">Reset Password</a></p>
        <p>This link expires in 1 hour.</p>
        """
        text = f"Hello {user_name},\nReset your password: {link}"
        return self.provider.send_email(to_email, subject, html, text)

    def send_welcome_email(self, to_email: str, user_name: str, org_name: str) -> bool:
        subject = f"Welcome to {org_name} on SupportDesk AI"
        html = f"""
        <h2>Your workspace is ready!</h2>
        <p>Hi {user_name},</p>
        <p>Congratulations! Your organization <strong>{org_name}</strong> has been successfully setup on SupportDesk AI.</p>
        """
        text = f"Hi {user_name},\nYour organization {org_name} is ready on SupportDesk AI!"
        return self.provider.send_email(to_email, subject, html, text)


email_service = EmailService()
