from django.core.files.storage import Storage
from supabase import create_client
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

class SupabaseStorage(Storage):
    def __init__(self, bucket_name='research-files'):
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ImproperlyConfigured("Supabase credentials not configured")
        
        self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.bucket_name = bucket_name
    
    def _save(self, name, content):
        """Save file to Supabase Storage"""
        try:
            content.seek(0)
            file_data = content.read()
            
            self.client.storage.from_(self.bucket_name).upload(
                name,
                file_data,
                file_options={
                    "content-type": getattr(content, 'content_type', 'application/octet-stream')
                }
            )
            return name
        except Exception as e:
            raise Exception(f"Error uploading to Supabase: {str(e)}")
    
    def exists(self, name):
        """Check if file exists in Supabase Storage"""
        try:
            files = self.client.storage.from_(self.bucket_name).list()
            return any(f['name'] == name for f in files)
        except:
            return False
    
    def url(self, name):
        """Get public URL for file"""
        return self.client.storage.from_(self.bucket_name).get_public_url(name)
    
    def delete(self, name):
        """Delete file from Supabase Storage"""
        try:
            self.client.storage.from_(self.bucket_name).remove([name])
        except Exception as e:
            raise Exception(f"Error deleting from Supabase: {str(e)}")
    
    def size(self, name):
        """Get file size - implement if needed"""
        return 0