from django.core.files.storage import Storage
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

class SupabaseStorage(Storage):
    def __init__(self, bucket_name='research-files'):
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            if settings.DEBUG:
                # Development fallback - use local storage
                from django.core.files.storage import FileSystemStorage
                self._use_local = True
                self._local_storage = FileSystemStorage()
                return
            else:
                raise ImproperlyConfigured("Supabase credentials not configured")
        
        self._use_local = False
        from supabase import create_client
        self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.bucket_name = bucket_name
    
    def _save(self, name, content):
        """Save file to Supabase Storage"""
        if self._use_local:
            return self._local_storage._save(name, content)
        
        try:
            content.seek(0)
            file_data = content.read()
            
            self.client.storage.from_(self.bucket_name).upload(
                name,
                file_data,
                file_options={
                    "content-type": getattr(content, 'content_type', 'application/pdf')
                }
            )
            return name
        except Exception as e:
            raise Exception(f"Error uploading to Supabase: {str(e)}")
    
    def exists(self, name):
        """Check if file exists"""
        if self._use_local:
            return self._local_storage.exists(name)
        
        try:
            files = self.client.storage.from_(self.bucket_name).list()
            return any(f['name'] == name for f in files)
        except:
            return False
    
    def url(self, name):
        """Get URL - returns Django view URL that serves the file"""
        if self._use_local:
            return self._local_storage.url(name)
        
        from django.urls import reverse
        # Return URL to Django view that will serve the file
        return reverse('research:serve_pdf', kwargs={'path': name})
    
    def delete(self, name):
        """Delete file from Supabase Storage"""
        if self._use_local:
            return self._local_storage.delete(name)
        
        try:
            self.client.storage.from_(self.bucket_name).remove([name])
        except Exception as e:
            raise Exception(f"Error deleting from Supabase: {str(e)}")
    
    def size(self, name):
        """Get file size"""
        if self._use_local:
            return self._local_storage.size(name)
        return 0
    
    def get_file_content(self, name):
        """Download file content from Supabase (used by serve_pdf view)"""
        if self._use_local:
            with self._local_storage.open(name, 'rb') as f:
                return f.read()
        
        try:
            response = self.client.storage.from_(self.bucket_name).download(name)
            return response
        except Exception as e:
            raise Exception(f"Error downloading from Supabase: {str(e)}")