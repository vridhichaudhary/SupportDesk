import os
import uuid
from abc import ABC, abstractmethod


class BaseStorageProvider(ABC):
    @abstractmethod
    def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        """Uploads file content and returns public URL string."""
        pass

    @abstractmethod
    def delete_file(self, file_url: str) -> bool:
        """Deletes file by public URL."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    def __init__(
        self, upload_dir: str = "static/uploads/avatars", base_url: str = "/static/uploads/avatars"
    ) -> None:
        self.upload_dir = upload_dir
        self.base_url = base_url
        os.makedirs(self.upload_dir, exist_ok=True)

    def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        ext = os.path.splitext(filename)[1] or ".jpg"
        unique_name = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(self.upload_dir, unique_name)
        with open(filepath, "wb") as f:
            f.write(file_content)
        return f"{self.base_url}/{unique_name}"

    def delete_file(self, file_url: str) -> bool:
        if not file_url.startswith(self.base_url):
            return False
        filename = file_url.replace(f"{self.base_url}/", "")
        filepath = os.path.join(self.upload_dir, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False


class CloudinaryStorageProvider(BaseStorageProvider):
    """Stub for Cloudinary CDN Integration."""

    def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        # In production: return cloudinary.uploader.upload(...)['secure_url']
        ext = os.path.splitext(filename)[1] or ".jpg"
        return f"https://res.cloudinary.com/demo/image/upload/v123456789/{uuid.uuid4()}{ext}"

    def delete_file(self, file_url: str) -> bool:
        return True


# Default storage service instance using LocalStorageProvider
storage_provider: BaseStorageProvider = LocalStorageProvider()
